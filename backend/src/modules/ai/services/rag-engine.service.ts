import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  Document,
  VectorStoreIndex,
  Settings,
  TextNode,
  MetadataMode,
} from 'llamaindex';
import { PrismaService } from '../../db/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { ChatMode, Citation } from '../dto/chat.dto';
const pdfParse = require('pdf-parse');

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not set - AI features will not work');
    }

    this.genAI = new GoogleGenerativeAI(this.apiKey);
    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash';
    this.geminiModel = this.genAI.getGenerativeModel({ model: modelName });

    // LlamaIndex 글로벌 설정
    this.initializeLlamaIndex();
  }

  private initializeLlamaIndex() {
    try {
      // LlamaIndex 기본 설정
      Settings.chunkSize = CHUNK_SIZE;
      Settings.chunkOverlap = CHUNK_OVERLAP;

      this.logger.log('LlamaIndex initialized');
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
        
        // PDF 텍스트 추출
        const pdfData = await pdfParse(pdfBuffer);
        const pdfText = pdfData.text;

        if (pdfText && pdfText.trim().length > 0) {
          // 페이지별로 분리 (pdfData.numpages 사용)
          const totalPages = pdfData.numpages;
          const avgCharsPerPage = Math.ceil(pdfText.length / totalPages);
          
          // 간단한 페이지 분할 (정확하지 않을 수 있지만 근사치)
          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const startIdx = (pageNum - 1) * avgCharsPerPage;
            const endIdx = Math.min(pageNum * avgCharsPerPage, pdfText.length);
            const pageText = pdfText.substring(startIdx, endIdx).trim();
            
            if (pageText.length > 0) {
              const doc = new Document({
                text: pageText,
                metadata: {
                  noteId: lectureNoteId,
                  type: 'pdf_content',
                  fileId: file.id,
                  fileName: file.fileName,
                  pageNumber: pageNum,
                  totalPages: totalPages,
                },
              });
              documents.push(doc);
            }
          }
          
          this.logger.debug(`Extracted ${totalPages} pages from ${file.fileName}`);
        }
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
      // 1. 노트의 documents 가져오기
      const documents = await this.fetchNoteDocuments(lectureNoteId);

      // 2. VectorStoreIndex 생성
      const index = await VectorStoreIndex.fromDocuments(documents);

      // 3. QueryEngine 생성
      const queryEngine = index.asQueryEngine({
        similarityTopK: TOP_K,
      });

      // 4. 모드에 따른 프롬프트 생성
      const prompt = this.buildPrompt(question, mode);

      // 5. 질의 수행
      const response = await queryEngine.query({ query: prompt });

      // 6. Citations 추출
      const citations: Citation[] = [];
      if (response.sourceNodes) {
        for (const node of response.sourceNodes) {
          const metadata = node.node.metadata;
          citations.push({
            score: node.score,
            pageNumber: metadata.pageNumber,
            startSec: metadata.startTime,
            endSec: metadata.endTime,
            text: node.node.getContent(MetadataMode.NONE).substring(0, 200), // 처음 200자만
          });
        }
      }

      this.logger.debug(
        `RAG query completed, found ${citations.length} citations`
      );

      return {
        answer: response.response || '답변을 생성할 수 없습니다.',
        citations,
      };
    } catch (error) {
      this.logger.error('RAG query failed', error);
      
      // LlamaIndex embedding 에러 발생시 fallback: Gemini 직접 사용
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('Cannot find Embedding')) {
        this.logger.warn('Embedding model not available, using direct Gemini fallback');
        
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
        return `다음 강의 노트의 내용을 바탕으로 학습을 점검할 수 있는 퀴즈 문제들을 만들어주세요. 각 문제는 4지선다형으로 작성하고, 정답과 간단한 해설을 포함해주세요.\n\n${question || '5개의 퀴즈 문제를 만들어주세요.'}`;

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

