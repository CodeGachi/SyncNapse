import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  Document,
  VectorStoreIndex,
  Settings,
  TextNode,
  MetadataMode,
  BaseEmbedding,
} from 'llamaindex';
import { PrismaService } from '../../db/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ChatMode, Citation } from '../dto/chat.dto';
import { PDFParse } from 'pdf-parse';
import { HybridSearchService } from './hybrid-search.service';

/**
 * Gemini Embedding 구현체
 * @google/generative-ai를 사용하여 text-embedding-004 모델로 임베딩 생성
 */
class GeminiEmbedding extends BaseEmbedding {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model = 'text-embedding-004') {
    super();
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    const embeddingModel = this.genAI.getGenerativeModel({ model: this.model });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  getTextEmbeddings = async (texts: string[]): Promise<number[][]> => {
    const embeddingModel = this.genAI.getGenerativeModel({ model: this.model });
    const results = await Promise.all(
      texts.map(async (text) => {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
      }),
    );
    return results;
  };
}

// RAG 설정 상수
const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 50;
const TOP_K = 5; // 검색할 상위 K개 청크

@Injectable()
export class RagEngineService {
  private readonly logger = new Logger(RagEngineService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly geminiModel: GenerativeModel;
  private readonly apiKey: string;

  // 인덱스 캐시 추가
  private indexCache = new Map<string, {
    index: VectorStoreIndex;
    createdAt: number;
  }>();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1시간

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly hybridSearchService: HybridSearchService,
  ) {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not set - AI features will not work');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-lite';
    this.geminiModel = this.genAI.getGenerativeModel({ model: modelName });

    // LlamaIndex 글로벌 설정
    this.initializeLlamaIndex();
  }

  private initializeLlamaIndex() {
    try {
      // Gemini Embedding 모델 설정
      Settings.embedModel = new GeminiEmbedding(this.apiKey, 'text-embedding-004');

      // LlamaIndex 기본 설정
      Settings.chunkSize = CHUNK_SIZE;
      Settings.chunkOverlap = CHUNK_OVERLAP;

      this.logger.log('LlamaIndex initialized with Gemini embedding');
    } catch (error) {
      this.logger.error('Failed to initialize LlamaIndex', error);
    }
  }

  /**
   * 노트의 텍스트 데이터를 수집하여 Document 배열로 생성
   */
  async fetchNoteDocuments(lectureNoteId: string): Promise<Document[]> {
    this.logger.debug(`Fetching documents for note ${lectureNoteId}`);

    // 노트 존재 확인
    const note = await this.prisma.lectureNote.findUnique({
      where: { id: lectureNoteId },
    });

    if (!note) {
      throw new NotFoundException(`Lecture note ${lectureNoteId} not found`);
    }

    const documents: Document[] = [];

    // 1. PDF 파일 텍스트 추출
    const files = await this.prisma.file.findMany({
      where: { 
        noteId: lectureNoteId,
        deletedAt: null,
        fileType: { contains: 'pdf' }, // PDF 파일만
      },
    });

    for (const file of files) {
      try {
        this.logger.debug(`Extracting text from PDF: ${file.fileName}`);
        
        // Storage에서 PDF 파일 다운로드
        const fileStream = await this.storageService.getFileStream(file.storageKey);
        const pdfBuffer = Buffer.isBuffer(fileStream.body) 
          ? fileStream.body 
          : Buffer.from(await fileStream.body.transformToByteArray());
        
        // PDF 텍스트 추출 (pdf-parse v2 API)
        const pdfParser = new PDFParse({ data: pdfBuffer });
        const textResult = await pdfParser.getText();
        const totalPages = textResult.total;

        for (const pageResult of textResult.pages) {
          const pageText = pageResult.text?.trim() || '';

          if (pageText.length > 0) {
            const doc = new Document({
              text: pageText,
              metadata: {
                noteId: lectureNoteId,
                type: 'pdf_content',
                fileId: file.id,
                fileName: file.fileName,
                pageNumber: pageResult.num,
                totalPages: totalPages,
              },
            });
            documents.push(doc);
          }
        }

        // 리소스 해제
        await pdfParser.destroy();

        this.logger.debug(`Extracted ${totalPages} pages from ${file.fileName}`);
      } catch (error) {
        this.logger.warn(`Failed to extract text from PDF ${file.fileName}:`, error);
        // PDF 추출 실패해도 계속 진행
      }
    }

    // 2. Transcription sessions와 segments 가져오기
    const transcriptionSessions = await this.prisma.transcriptionSession.findMany({
      where: { noteId: lectureNoteId },
      include: {
        segments: {
          where: { isPartial: false },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    for (const session of transcriptionSessions) {
      for (const segment of session.segments) {
        const doc = new Document({
          text: segment.text,
          metadata: {
            noteId: lectureNoteId,
            type: 'transcription',
            sessionId: session.id,
            segmentId: segment.id,
            startTime: parseFloat(segment.startTime.toString()),
            endTime: parseFloat(segment.endTime.toString()),
            confidence: parseFloat(segment.confidence.toString()),
          },
        });
        documents.push(doc);
      }
    }

    // 3. Page contents 가져오기
    const pageContents = await this.prisma.notePageContent.findMany({
      where: { noteId: lectureNoteId },
      orderBy: { pageNumber: 'asc' },
    });

    for (const pageContent of pageContents) {
      try {
        // JSON content에서 텍스트 추출
        const content = pageContent.content as any;
        let text = '';

        if (typeof content === 'object' && content.blocks) {
          // BlockNote 형식
          text = this.extractTextFromBlocks(content.blocks);
        } else if (typeof content === 'string') {
          text = content;
        }

        if (text.trim().length > 0) {
          const doc = new Document({
            text,
            metadata: {
              noteId: lectureNoteId,
              type: 'page_content',
              pageId: pageContent.id,
              pageNumber: pageContent.pageNumber,
              fileId: pageContent.fileId,
            },
          });
          documents.push(doc);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse page content ${pageContent.id}`,
          error
        );
      }
    }

    // 4. Note-level content 가져오기
    const noteContent = await this.prisma.noteContent.findUnique({
      where: { noteId: lectureNoteId },
    });

    if (noteContent) {
      try {
        const content = noteContent.content as any;
        let text = '';

        if (typeof content === 'object' && content.pages) {
          // 각 페이지의 blocks 추출
          for (const pageKey of Object.keys(content.pages)) {
            const pageData = content.pages[pageKey];
            if (pageData && pageData.blocks) {
              text += this.extractTextFromBlocks(pageData.blocks) + '\n\n';
            }
          }
        }

        if (text.trim().length > 0) {
          const doc = new Document({
            text,
            metadata: {
              noteId: lectureNoteId,
              type: 'note_content',
              contentId: noteContent.id,
            },
          });
          documents.push(doc);
        }
      } catch (error) {
        this.logger.warn('Failed to parse note content', error);
      }
    }

    this.logger.debug(`Fetched ${documents.length} documents for note ${lectureNoteId}`);

    if (documents.length === 0) {
      throw new NotFoundException(`No content found for note ${lectureNoteId}`);
    }

    return documents;
  }

  /**
   * 캐시에서 인덱스 가져오기 또는 새로 생성
   */
  private async getOrCreateIndex(lectureNoteId: string): Promise<VectorStoreIndex> {
    // 1. 캐시 확인
    const cached = this.indexCache.get(lectureNoteId);
    const now = Date.now();

    if (cached && now - cached.createdAt < this.CACHE_TTL) {
      this.logger.debug(`[Cache HIT] Using cached index for note ${lectureNoteId}`);
      return cached.index;
    }

    // 2. 캐시 미스 - 새로 생성
    this.logger.debug(`[Cache MISS] Creating new index for note ${lectureNoteId}`);
    
    const documents = await this.fetchNoteDocuments(lectureNoteId);
    const index = await VectorStoreIndex.fromDocuments(documents);

    // 3. 캐시에 저장
    this.indexCache.set(lectureNoteId, {
      index,
      createdAt: now,
    });

    this.logger.log(`Index created and cached for note ${lectureNoteId} (${documents.length} documents)`);

    return index;
  }

  /**
   * BlockNote blocks에서 텍스트 추출
   */
  private extractTextFromBlocks(blocks: any[]): string {
    if (!Array.isArray(blocks)) return '';

    return blocks
      .map((block) => {
        if (block.content && Array.isArray(block.content)) {
          return block.content
            .map((item: any) => item.text || '')
            .join('')
            .trim();
        }
        if (block.text) {
          return block.text.trim();
        }
        return '';
      })
      .filter((text) => text.length > 0)
      .join('\n');
  }

  /**
   * RAG 기반 질문 응답 생성
   */
  async queryWithRag(
    lectureNoteId: string,
    question: string,
    mode: ChatMode = ChatMode.QUESTION
  ): Promise<{ answer: string; citations: Citation[] }> {
    this.logger.debug(
      `RAG query for note ${lectureNoteId}, mode: ${mode}, question: ${question}`
    );

    try {
      // 1. 캐시에서 인덱스 가져오기 또는 생성
      const index = await this.getOrCreateIndex(lectureNoteId);
      const documents = await this.fetchNoteDocuments(lectureNoteId);

      // 2. 벡터 검색 수행 (더 많이 가져옴)
      const retriever = index.asRetriever({
        similarityTopK: TOP_K * 2, // 하이브리드를 위해 10개 가져옴
      });
      const vectorResults = await retriever.retrieve({ query: question });

      // 3. 하이브리드 검색으로 최종 결과 선택
      const vectorResultsWithScore = vectorResults.map(r => ({
        node: r.node,
        score: r.score ?? 0, // undefined 방지
      }));

      const hybridResults = this.hybridSearchService.combineResults(
        question,
        documents,
        vectorResultsWithScore,
        TOP_K, // 최종 5개만
      );

      // 4. 하이브리드 결과로 컨텍스트 생성
      const contextText = hybridResults
        .map((result, idx) => {
          const meta = result.metadata;
          const source = meta.type === 'pdf_content'
            ? `PDF ${meta.fileName}, Page ${meta.pageNumber}`
            : meta.type === 'transcription'
            ? `음성 전사 (${meta.startTime}초-${meta.endTime}초)`
            : `노트 내용`;
          return `[${idx + 1}] (출처: ${source})\n${result.document.getText()}`;
        })
        .join('\n\n---\n\n');

      // 5. 모드에 따른 프롬프트 생성
      const prompt = this.buildPrompt(question, mode);
      const fullPrompt = `${prompt}\n\n검색된 관련 내용:\n\n${contextText}`;

      // 6. Gemini로 답변 생성
      const result = await this.geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      const answer = response.text();

      // 7. Citations 생성 (하이브리드 점수 포함)
      const citations: Citation[] = hybridResults.map((result) => {
        const meta = result.metadata;
        return {
          score: result.score, // 하이브리드 점수
          pageNumber: meta.pageNumber,
          startSec: meta.startTime,
          endSec: meta.endTime,
          text: result.document.getText().substring(0, 200),
        };
      });

      this.logger.debug(
        `RAG query completed, found ${citations.length} citations (hybrid)`
      );

      return {
        answer: answer || '답변을 생성할 수 없습니다.',
        citations,
      };
    } catch (error) {
      this.logger.error('RAG query failed', error);
      
      // LlamaIndex 설정 에러 발생시 fallback: Gemini 직접 사용
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('Cannot find Embedding') || errorMessage.includes('Cannot find LLM')) {
        this.logger.warn('LlamaIndex model not available, using direct Gemini fallback');

        // 문서들을 하나의 컨텍스트로 합치기
        const documents = await this.fetchNoteDocuments(lectureNoteId);
        const context = documents.map(doc => doc.getText()).join('\n\n');

        const answer = await this.queryWithoutRag(question, context, mode);
        return {
          answer,
          citations: [],
        };
      }

      throw new Error('Failed to generate answer: ' + (error as Error).message);
    }
  }

  /**
   * 모드에 따른 프롬프트 구성
   */
  private buildPrompt(question: string, mode: ChatMode): string {
    switch (mode) {
      case ChatMode.SUMMARY:
        return `다음 강의 노트의 내용을 상세하게 요약해주세요. 주요 개념, 핵심 포인트, 그리고 중요한 세부사항을 포함해주세요.\n\n${question || '전체 내용을 요약해주세요.'}`;

      case ChatMode.QUIZ:
        return `다음 강의 노트의 내용을 바탕으로 학습을 점검할 수 있는 퀴즈 문제 5개를 만들어주세요.

반드시 아래 JSON 형식으로만 응답해주세요. 다른 텍스트 없이 JSON만 출력하세요:
{
  "questions": [
    {
      "id": "q1",
      "question": "문제 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correctIndex": 0,
      "explanation": "정답 해설"
    }
  ]
}

규칙:
- correctIndex는 0부터 시작하는 정답 인덱스입니다 (0=첫번째, 1=두번째, 2=세번째, 3=네번째)
- 각 문제는 4개의 선택지를 가져야 합니다
- 해설은 왜 그 답이 정답인지 간단히 설명해주세요
- ${question || '5개의 퀴즈 문제를 만들어주세요.'}`;

      case ChatMode.QUESTION:
      default:
        return `다음은 강의 노트에 대한 질문입니다. 노트의 내용을 바탕으로 정확하고 상세하게 답변해주세요.\n\n질문: ${question}`;
    }
  }

  /**
   * Gemini API를 직접 사용한 간단한 질의 (fallback)
   */
  async queryWithoutRag(
    question: string,
    context: string,
    mode: ChatMode = ChatMode.QUESTION
  ): Promise<string> {
    try {
      const prompt = this.buildPrompt(question, mode);
      const fullPrompt = `${prompt}\n\n컨텍스트:\n${context}`;

      const result = await this.geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Gemini query failed', error);
      throw new Error('Failed to generate answer');
    }
  }
}

