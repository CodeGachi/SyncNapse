# AI 기능 구현 가이드

> 실제 코드 구현을 위한 단계별 가이드

## 🎯 Priority 1: Whisper 통합 (음성 인식 개선)

### 예상 작업 시간: 1-2주

### 1단계: OpenAI SDK 설치

```bash
cd backend
npm install openai
npm install @types/node --save-dev
```

### 2단계: Whisper Service 생성

**파일**: `backend/src/modules/transcription/whisper.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { Readable } from 'stream';

export interface WhisperTranscriptionResult {
  text: string;
  segments: WhisperSegment[];
  language: string;
  duration: number;
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words?: WhisperWord[];
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set - Whisper features will not work');
    }
    this.openai = new OpenAI({ apiKey: apiKey || 'sk-placeholder' });
  }

  /**
   * 오디오 파일 전사 (전체 파일)
   */
  async transcribeFile(
    audioBuffer: Buffer,
    options?: {
      language?: string;
      prompt?: string; // 전문 용어 힌트
      temperature?: number;
    },
  ): Promise<WhisperTranscriptionResult> {
    try {
      this.logger.log('Transcribing audio file with Whisper...');

      // Buffer를 File 객체로 변환
      const file = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });

      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: options?.language || 'ko',
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment'],
        prompt: options?.prompt,
        temperature: options?.temperature || 0,
      });

      return {
        text: response.text,
        segments: response.segments?.map((seg) => ({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          words: seg.words?.map((w) => ({
            word: w.word,
            start: w.start,
            end: w.end,
          })),
        })) || [],
        language: response.language || 'ko',
        duration: response.duration || 0,
      };
    } catch (error) {
      this.logger.error('Whisper transcription failed', error);
      throw error;
    }
  }

  /**
   * 실시간 스트리밍 전사 (청크 단위)
   */
  async transcribeChunk(
    audioChunk: Buffer,
    previousContext?: string,
  ): Promise<string> {
    try {
      const file = new File([audioChunk], 'chunk.mp3', { type: 'audio/mpeg' });

      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'ko',
        prompt: previousContext, // 이전 문맥 제공
      });

      return response.text;
    } catch (error) {
      this.logger.error('Chunk transcription failed', error);
      return '';
    }
  }

  /**
   * 전문 용어 커스터마이징을 위한 프롬프트 생성
   */
  generateCustomPrompt(subject: string, keywords: string[]): string {
    // 전문 용어를 프롬프트에 포함시켜 인식률 향상
    const keywordStr = keywords.join(', ');
    return `This is a ${subject} lecture. Key terms: ${keywordStr}`;
  }
}
```

### 3단계: Audio Processor 개선

**파일**: `backend/src/modules/queue/processors/audio.processor.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionService } from '../../transcription/transcription.service';
import { WhisperService } from '../../transcription/whisper.service';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class AudioProcessor {
  private readonly logger = new Logger(AudioProcessor.name);

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly whisperService: WhisperService,
    private readonly storageService: StorageService,
  ) {}

  async process(name: string, data: any): Promise<any> {
    this.logger.log(`Processing job of type ${name}...`);

    if (name === 'transcribe') {
      return this.handleWhisperTranscription(data);
    }

    this.logger.warn(`Unknown job name: ${name}`);
    return { result: 'skipped' };
  }

  private async handleWhisperTranscription(data: {
    sessionId: string;
    audioUrl: string;
    storageKey: string;
    subject?: string;
    keywords?: string[];
  }): Promise<any> {
    const { sessionId, storageKey, subject, keywords } = data;

    this.logger.log(`[Whisper] Starting transcription for session: ${sessionId}`);

    try {
      // 1. Storage에서 오디오 파일 다운로드
      const fileStream = await this.storageService.getFileStream(storageKey);
      const audioBuffer = Buffer.isBuffer(fileStream.body)
        ? fileStream.body
        : Buffer.from(await fileStream.body.transformToByteArray());

      // 2. 전문 용어 프롬프트 생성 (옵션)
      const prompt = keywords
        ? this.whisperService.generateCustomPrompt(subject || 'general', keywords)
        : undefined;

      // 3. Whisper로 전사
      const result = await this.whisperService.transcribeFile(audioBuffer, {
        language: 'ko',
        prompt,
      });

      // 4. DB에 저장
      await this.transcriptionService.saveWhisperResult(sessionId, result);

      this.logger.log(`[Whisper] Transcription completed for session: ${sessionId}`);
      return { result: 'success', sessionId, segmentCount: result.segments.length };
    } catch (error) {
      this.logger.error(`[Whisper] Transcription failed for session: ${sessionId}`, error);
      throw error;
    }
  }
}
```

### 4단계: TranscriptionService에 Whisper 결과 저장 메서드 추가

**파일**: `backend/src/modules/transcription/transcription.service.ts`에 추가

```typescript
import { WhisperTranscriptionResult } from './whisper.service';

// ... existing code ...

async saveWhisperResult(
  sessionId: string,
  result: WhisperTranscriptionResult,
): Promise<void> {
  // 세그먼트를 TranscriptionSegment로 변환하여 저장
  for (const segment of result.segments) {
    await this.prisma.transcriptionSegment.create({
      data: {
        sessionId: sessionId,
        startTime: segment.start,
        endTime: segment.end,
        text: segment.text,
        confidence: 0.95, // Whisper는 confidence를 제공하지 않으므로 기본값
        language: result.language,
        words: segment.words
          ? {
              create: segment.words.map((word, index) => ({
                word: word.word,
                startTime: word.start,
                endTime: word.end,
                confidence: 0.95,
              })),
            }
          : undefined,
      },
    });
  }

  // 세션 상태 업데이트
  await this.prisma.transcriptionSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      duration: result.duration,
      language: result.language,
    },
  });
}
```

### 5단계: 환경 변수 추가

```bash
# .env.dev에 추가
OPENAI_API_KEY=sk-your-key-here
```

### 6단계: 테스트

```typescript
// backend/src/modules/transcription/whisper.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WhisperService } from './whisper.service';
import * as fs from 'fs';
import * as path from 'path';

describe('WhisperService', () => {
  let service: WhisperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WhisperService],
    }).compile();

    service = module.get<WhisperService>(WhisperService);
  });

  it('should transcribe audio file', async () => {
    // 테스트용 오디오 파일 로드
    const audioPath = path.join(__dirname, '../../../test/fixtures/sample.mp3');
    const audioBuffer = fs.readFileSync(audioPath);

    const result = await service.transcribeFile(audioBuffer, {
      language: 'ko',
    });

    expect(result.text).toBeDefined();
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.language).toBe('ko');
  });
});
```

---

## 🎯 Priority 2: 하이브리드 검색 구현

### 예상 작업 시간: 2-3주

### 1단계: 필요한 패키지 설치

```bash
cd backend
npm install natural stopword
```

### 2단계: BM25 Search Service 생성

**파일**: `backend/src/modules/ai/services/bm25-search.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as natural from 'natural';
import * as stopword from 'stopword';

export interface BM25Document {
  id: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface BM25Result {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class BM25SearchService {
  private readonly logger = new Logger(BM25SearchService.name);
  private readonly tokenizer = new natural.WordTokenizer();
  
  // BM25 파라미터
  private readonly k1 = 1.5;
  private readonly b = 0.75;

  /**
   * BM25 알고리즘을 사용한 키워드 검색
   */
  search(
    query: string,
    documents: BM25Document[],
    topK: number = 5,
  ): BM25Result[] {
    // 1. 쿼리 토큰화 및 불용어 제거
    const queryTokens = this.preprocessText(query);
    
    if (queryTokens.length === 0) {
      return [];
    }

    // 2. 문서 토큰화 및 전처리
    const docTokens = documents.map(doc => this.preprocessText(doc.text));
    
    // 3. 평균 문서 길이 계산
    const avgDocLen = docTokens.reduce((sum, tokens) => sum + tokens.length, 0) / docTokens.length;
    
    // 4. IDF 계산
    const idf = this.calculateIDF(queryTokens, docTokens);
    
    // 5. 각 문서에 대한 BM25 스코어 계산
    const scores = documents.map((doc, idx) => {
      const score = this.calculateBM25Score(
        queryTokens,
        docTokens[idx],
        avgDocLen,
        idf,
      );
      
      return {
        id: doc.id,
        score,
        metadata: doc.metadata,
      };
    });
    
    // 6. 스코어 기준 정렬 및 상위 K개 반환
    return scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * 텍스트 전처리: 토큰화 + 불용어 제거 + 소문자 변환
   */
  private preprocessText(text: string): string[] {
    // 토큰화
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    
    if (!tokens) return [];
    
    // 한국어 + 영어 불용어 제거
    const filtered = stopword.removeStopwords(tokens, [
      ...stopword.ko,
      ...stopword.en,
    ]);
    
    return filtered;
  }

  /**
   * IDF (Inverse Document Frequency) 계산
   */
  private calculateIDF(
    queryTokens: string[],
    docTokens: string[][],
  ): Map<string, number> {
    const idf = new Map<string, number>();
    const N = docTokens.length;
    
    for (const token of queryTokens) {
      // 해당 토큰을 포함한 문서 개수
      const df = docTokens.filter(tokens => tokens.includes(token)).length;
      
      // IDF 계산: log((N - df + 0.5) / (df + 0.5))
      idf.set(token, Math.log((N - df + 0.5) / (df + 0.5)));
    }
    
    return idf;
  }

  /**
   * BM25 스코어 계산
   */
  private calculateBM25Score(
    queryTokens: string[],
    docTokens: string[],
    avgDocLen: number,
    idf: Map<string, number>,
  ): number {
    const docLen = docTokens.length;
    let score = 0;
    
    for (const token of queryTokens) {
      // 문서 내 토큰 빈도
      const tf = docTokens.filter(t => t === token).length;
      
      // IDF 값
      const idfValue = idf.get(token) || 0;
      
      // BM25 공식
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / avgDocLen));
      
      score += idfValue * (numerator / denominator);
    }
    
    return score;
  }
}
```

### 3단계: Hybrid Search Service 생성

**파일**: `backend/src/modules/ai/services/hybrid-search.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BM25SearchService, BM25Document, BM25Result } from './bm25-search.service';
import { Document } from 'llamaindex';

export interface HybridSearchResult {
  document: Document;
  score: number;
  vectorScore: number;
  keywordScore: number;
  metadata: Record<string, any>;
}

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);

  // 하이브리드 가중치
  private readonly VECTOR_WEIGHT = 0.6;
  private readonly KEYWORD_WEIGHT = 0.4;

  constructor(private readonly bm25Service: BM25SearchService) {}

  /**
   * 벡터 검색 결과와 키워드 검색 결과를 결합
   */
  async combineResults(
    query: string,
    documents: Document[],
    vectorResults: Array<{ node: any; score: number }>,
    topK: number = 5,
  ): Promise<HybridSearchResult[]> {
    // 1. BM25 키워드 검색 수행
    const bm25Docs: BM25Document[] = documents.map((doc, idx) => ({
      id: idx.toString(),
      text: doc.getText(),
      metadata: doc.metadata,
    }));

    const keywordResults = this.bm25Service.search(query, bm25Docs, topK * 2);

    // 2. 벡터 검색 결과 정규화
    const vectorScoreMap = new Map<string, number>();
    const maxVectorScore = Math.max(...vectorResults.map(r => r.score), 1);
    
    vectorResults.forEach((result) => {
      const text = result.node.node?.text || result.node.text;
      vectorScoreMap.set(text, result.score / maxVectorScore);
    });

    // 3. 키워드 검색 결과 정규화
    const keywordScoreMap = new Map<string, number>();
    const maxKeywordScore = Math.max(...keywordResults.map(r => r.score), 1);
    
    keywordResults.forEach((result) => {
      const doc = documents[parseInt(result.id)];
      keywordScoreMap.set(doc.getText(), result.score / maxKeywordScore);
    });

    // 4. 하이브리드 스코어 계산
    const combinedResults: HybridSearchResult[] = [];
    const seenTexts = new Set<string>();

    // 벡터 검색 결과 처리
    for (const result of vectorResults) {
      const text = result.node.node?.text || result.node.text;
      if (seenTexts.has(text)) continue;
      seenTexts.add(text);

      const vectorScore = vectorScoreMap.get(text) || 0;
      const keywordScore = keywordScoreMap.get(text) || 0;
      const hybridScore = 
        this.VECTOR_WEIGHT * vectorScore + 
        this.KEYWORD_WEIGHT * keywordScore;

      const doc = documents.find(d => d.getText() === text);
      if (doc) {
        combinedResults.push({
          document: doc,
          score: hybridScore,
          vectorScore,
          keywordScore,
          metadata: doc.metadata,
        });
      }
    }

    // 키워드 검색에서만 나온 결과 추가
    for (const result of keywordResults) {
      const doc = documents[parseInt(result.id)];
      const text = doc.getText();
      
      if (seenTexts.has(text)) continue;
      seenTexts.add(text);

      const vectorScore = vectorScoreMap.get(text) || 0;
      const keywordScore = keywordScoreMap.get(text) || 0;
      const hybridScore = 
        this.VECTOR_WEIGHT * vectorScore + 
        this.KEYWORD_WEIGHT * keywordScore;

      combinedResults.push({
        document: doc,
        score: hybridScore,
        vectorScore,
        keywordScore,
        metadata: doc.metadata,
      });
    }

    // 5. 하이브리드 스코어 기준 정렬 및 상위 K개 반환
    return combinedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * 쿼리 유형에 따라 가중치 동적 조정
   */
  adjustWeights(query: string): { vectorWeight: number; keywordWeight: number } {
    // 정확한 키워드 검색이 필요한 경우 (인용부호, 전문 용어 등)
    if (query.includes('"') || query.includes("'")) {
      return { vectorWeight: 0.3, keywordWeight: 0.7 };
    }

    // 개념적 질문 (의미 기반 검색 중요)
    if (query.includes('무엇') || query.includes('어떻게') || query.includes('왜')) {
      return { vectorWeight: 0.7, keywordWeight: 0.3 };
    }

    // 기본값
    return { vectorWeight: 0.6, keywordWeight: 0.4 };
  }
}
```

### 4단계: RAG Engine에 하이브리드 검색 통합

**파일**: `backend/src/modules/ai/services/rag-engine.service.ts` 수정

```typescript
// ... existing imports ...
import { HybridSearchService } from './hybrid-search.service';

@Injectable()
export class RagEngineService {
  // ... existing code ...

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly hybridSearchService: HybridSearchService, // 추가
  ) {
    // ... existing code ...
  }

  async queryWithRag(
    lectureNoteId: string,
    query: string,
    mode: ChatMode,
  ): Promise<{ answer: string; citations: Citation[] }> {
    // 1. 문서 수집
    const documents = await this.fetchNoteDocuments(lectureNoteId);

    if (documents.length === 0) {
      throw new Error('No content found in this note');
    }

    // 2. 벡터 인덱스 생성
    const index = await VectorStoreIndex.fromDocuments(documents);

    // 3. 벡터 검색 쿼리 엔진 생성
    const queryEngine = index.asQueryEngine({
      similarityTopK: 10, // 하이브리드를 위해 더 많이 가져옴
    });

    // 4. 벡터 검색 수행
    const vectorResponse = await queryEngine.query({ query });
    const vectorResults = vectorResponse.sourceNodes || [];

    // 5. 하이브리드 검색 적용 (신규)
    const hybridResults = await this.hybridSearchService.combineResults(
      query,
      documents,
      vectorResults.map(node => ({
        node: node,
        score: node.score || 0,
      })),
      5, // 최종 TOP-5
    );

    // 6. 하이브리드 결과로 컨텍스트 생성
    const context = hybridResults
      .map((result, idx) => {
        const meta = result.metadata;
        return `[${idx + 1}] (Source: ${meta.type}, Page: ${meta.pageNumber || 'N/A'})\n${result.document.getText()}`;
      })
      .join('\n\n');

    // 7. 프롬프트 생성 및 답변 생성
    const prompt = this.buildPrompt(query, context, mode);
    const answer = await this.generateAnswer(prompt);

    // 8. Citations 생성
    const citations = hybridResults.map((result, idx) => ({
      pageNumber: result.metadata.pageNumber || null,
      startSec: result.metadata.timestamp || null,
      endSec: null,
      score: result.score,
      text: result.document.getText().substring(0, 200),
    }));

    return { answer, citations };
  }

  // ... rest of existing code ...
}
```

### 5단계: Module에 등록

**파일**: `backend/src/modules/ai/ai.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { RagEngineService } from './services/rag-engine.service';
import { BM25SearchService } from './services/bm25-search.service';
import { HybridSearchService } from './services/hybrid-search.service';
import { DbModule } from '../db/db.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DbModule, StorageModule],
  controllers: [AiController],
  providers: [
    AiService,
    RagEngineService,
    BM25SearchService, // 추가
    HybridSearchService, // 추가
  ],
  exports: [AiService, RagEngineService],
})
export class AiModule {}
```

---

## 🎯 Priority 3: Gemini Vision 통합 (Multi-modal)

### 예상 작업 시간: 1-2주

### 1단계: Vision Service 생성

**파일**: `backend/src/modules/ai/services/vision.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface VisionAnalysisResult {
  description: string;
  extractedText?: string;
  detectedObjects?: string[];
  chartAnalysis?: {
    type: string; // bar, line, pie, etc.
    data: any;
    insights: string;
  };
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * 이미지 분석: 일반 설명 생성
   */
  async analyzeImage(
    imageBuffer: Buffer,
    prompt?: string,
  ): Promise<VisionAnalysisResult> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/png',
        },
      };

      const defaultPrompt = `Analyze this image and describe what you see in detail. 
        If there are charts, graphs, or diagrams, explain them.
        If there is text, extract it.`;

      const result = await model.generateContent([
        prompt || defaultPrompt,
        imagePart,
      ]);

      const response = await result.response;
      const text = response.text();

      return {
        description: text,
      };
    } catch (error) {
      this.logger.error('Image analysis failed', error);
      throw error;
    }
  }

  /**
   * 차트/그래프 분석
   */
  async analyzeChart(imageBuffer: Buffer): Promise<VisionAnalysisResult> {
    const prompt = `Analyze this chart or graph. Provide:
      1. Chart type (bar, line, pie, scatter, etc.)
      2. What data is being shown
      3. Key trends or insights
      4. Any notable patterns or outliers
      
      Format your response as JSON with keys: type, description, insights`;

    const result = await this.analyzeImage(imageBuffer, prompt);

    try {
      // JSON 파싱 시도
      const jsonMatch = result.description.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          description: result.description,
          chartAnalysis: parsed,
        };
      }
    } catch (e) {
      // JSON 파싱 실패 시 원본 텍스트 반환
    }

    return result;
  }

  /**
   * OCR: 이미지에서 텍스트 추출
   */
  async extractText(imageBuffer: Buffer): Promise<string> {
    const prompt = `Extract all visible text from this image. 
      Include text from diagrams, labels, and annotations.
      Preserve formatting where possible.`;

    const result = await this.analyzeImage(imageBuffer, prompt);
    return result.description;
  }

  /**
   * 수식 인식 (LaTeX 변환)
   */
  async recognizeMath(imageBuffer: Buffer): Promise<string> {
    const prompt = `This image contains mathematical equations or formulas.
      Convert them to LaTeX format.
      If there are multiple equations, separate them with newlines.`;

    const result = await this.analyzeImage(imageBuffer, prompt);
    return result.description;
  }
}
```

### 2단계: RAG Engine에 Vision 통합

```typescript
// rag-engine.service.ts에 추가

async fetchNoteDocumentsWithVision(lectureNoteId: string): Promise<Document[]> {
  const documents = await this.fetchNoteDocuments(lectureNoteId);
  
  // PDF 파일의 이미지 페이지도 분석
  const files = await this.prisma.file.findMany({
    where: { 
      noteId: lectureNoteId,
      fileType: { contains: 'pdf' },
    },
  });

  for (const file of files) {
    // PDF 페이지 이미지 가져오기
    const pages = await this.prisma.page.findMany({
      where: { fileId: file.id },
    });

    for (const page of pages) {
      if (page.imageUrl) {
        try {
          // 이미지 다운로드
          const imageStream = await this.storageService.getFileStream(page.storageKey);
          const imageBuffer = Buffer.from(await imageStream.body.transformToByteArray());

          // Vision API로 분석
          const analysis = await this.visionService.analyzeImage(imageBuffer);

          // 분석 결과를 Document로 추가
          const doc = new Document({
            text: `[이미지 분석 - Page ${page.pageNumber}]\n${analysis.description}`,
            metadata: {
              noteId: lectureNoteId,
              type: 'vision_analysis',
              fileId: file.id,
              pageNumber: page.pageNumber,
            },
          });

          documents.push(doc);
        } catch (error) {
          this.logger.error(`Failed to analyze image for page ${page.pageNumber}`, error);
        }
      }
    }
  }

  return documents;
}
```

---

## 📊 평가 및 벤치마킹

### 평가 스크립트 작성

**파일**: `backend/scripts/evaluate-rag.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { RagEngineService } from '../src/modules/ai/services/rag-engine.service';

interface EvaluationResult {
  question: string;
  groundTruth: string;
  predicted: string;
  accuracy: number;
  responseTime: number;
}

const testQuestions = [
  {
    question: "데이터 구조란 무엇인가?",
    groundTruth: "컴퓨터에서 데이터를 효율적으로 저장하고 관리하기 위한 방법",
  },
  {
    question: "스택과 큐의 차이점은?",
    groundTruth: "스택은 LIFO, 큐는 FIFO 구조",
  },
  // ... 더 많은 질문 추가
];

async function evaluateRAG() {
  const prisma = new PrismaClient();
  const ragService = new RagEngineService(prisma, /* ... */);

  const results: EvaluationResult[] = [];

  for (const test of testQuestions) {
    const startTime = Date.now();
    
    const response = await ragService.queryWithRag(
      'test-note-id',
      test.question,
      'question',
    );
    
    const responseTime = Date.now() - startTime;

    // 간단한 정확도 측정 (실제로는 더 정교한 메트릭 사용)
    const accuracy = calculateSimilarity(response.answer, test.groundTruth);

    results.push({
      question: test.question,
      groundTruth: test.groundTruth,
      predicted: response.answer,
      accuracy,
      responseTime,
    });
  }

  // 결과 출력
  console.log('=== RAG Evaluation Results ===');
  console.log(`Total Questions: ${results.length}`);
  console.log(`Average Accuracy: ${results.reduce((sum, r) => sum + r.accuracy, 0) / results.length}`);
  console.log(`Average Response Time: ${results.reduce((sum, r) => sum + r.responseTime, 0) / results.length}ms`);
}

function calculateSimilarity(str1: string, str2: string): number {
  // Cosine similarity, Jaccard similarity 등 사용 가능
  // 여기서는 간단히 단어 일치율로 계산
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

evaluateRAG();
```

---

## 🧪 실험 설계

### A/B 테스트 설정

**파일**: `backend/src/modules/ai/services/ab-test.service.ts`

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class ABTestService {
  /**
   * 사용자를 A/B 그룹에 할당
   */
  assignGroup(userId: string): 'A' | 'B' {
    // 사용자 ID의 해시값으로 일관성 있게 할당
    const hash = this.simpleHash(userId);
    return hash % 2 === 0 ? 'A' : 'B';
  }

  /**
   * 실험 결과 로깅
   */
  async logExperiment(data: {
    userId: string;
    group: 'A' | 'B';
    feature: string;
    metric: string;
    value: number;
  }) {
    // DB에 저장 또는 분석 도구로 전송
    // 예: Mixpanel, Amplitude, Google Analytics
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

---

## 📈 모니터링 및 로깅

### AI 기능 모니터링

**파일**: `backend/src/modules/ai/ai.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AIMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AI-Monitoring');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          
          // 성공 로깅
          this.logger.log({
            method,
            url,
            duration,
            status: 'success',
            question: body?.question,
            answerLength: data?.answer?.length,
            citationCount: data?.citations?.length,
          });

          // 메트릭 전송 (Prometheus, CloudWatch 등)
          // metrics.recordAIRequest(duration, 'success');
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          // 에러 로깅
          this.logger.error({
            method,
            url,
            duration,
            status: 'error',
            error: error.message,
          });

          // metrics.recordAIRequest(duration, 'error');
        },
      }),
    );
  }
}
```

---

## 🔍 다음 단계

1. **Whisper 통합 완료** → 음성 인식 정확도 측정
2. **하이브리드 검색 테스트** → MRR, NDCG 계산
3. **Vision API 실험** → 이미지 분석 품질 평가
4. **A/B 테스트 시작** → 사용자 만족도 비교
5. **논문 작성 시작** → 실험 결과 정리

## 📚 추가 리소스

- [OpenAI Whisper API Docs](https://platform.openai.com/docs/guides/speech-to-text)
- [BM25 알고리즘 설명](https://en.wikipedia.org/wiki/Okapi_BM25)
- [Gemini Vision API Docs](https://ai.google.dev/tutorials/python_quickstart#multi-modal)
- [RAG 평가 메트릭](https://docs.llamaindex.ai/en/stable/examples/evaluation/retrieval_evals/)

---

**업데이트**: 2025-12-07  
**버전**: 1.0

