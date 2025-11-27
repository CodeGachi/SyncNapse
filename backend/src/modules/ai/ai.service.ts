import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Document, VectorStoreIndex } from 'llamaindex';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  
  // 간단한 메모리 캐시 (노트별 인덱스 저장)
  private indexCache = new Map<string, VectorStoreIndex>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 질문에 답변하기
   */
  async ask(noteId: string, question: string): Promise<string> {
    this.logger.log(`질문: ${question} (노트: ${noteId})`);

    // 1. 인덱스가 없으면 생성
    let index = this.indexCache.get(noteId);
    if (!index) {
      this.logger.log(`인덱스 생성 중...`);
      index = await this.createIndex(noteId);
      this.indexCache.set(noteId, index);
    }

    // 2. 질문하고 답변 받기
    const queryEngine = index.asQueryEngine();
    const response = await queryEngine.query({ query: question });

    return response.toString();
  }

  /**
   * 노트의 전사 내용으로 인덱스 생성
   */
  private async createIndex(noteId: string): Promise<VectorStoreIndex> {
    // DB에서 전사 내용 가져오기
    const transcripts = await this.prisma.transcriptSegment.findMany({
      where: { noteId },
      orderBy: { startSec: 'asc' },
    });

    if (transcripts.length === 0) {
      throw new NotFoundException('전사 데이터가 없습니다. 먼저 오디오를 녹음하고 전사해주세요.');
    }

    this.logger.log(`${transcripts.length}개 전사 세그먼트 로드됨`);

    // LlamaIndex Document로 변환
    const documents = transcripts.map(
      (segment) =>
        new Document({
          text: segment.text,
          metadata: {
            noteId,
            startSec: segment.startSec.toNumber(),
            endSec: segment.endSec.toNumber(),
          },
        }),
    );

    // 벡터 인덱스 생성
    this.logger.log(`벡터 인덱스 생성 중...`);
    const index = await VectorStoreIndex.fromDocuments(documents);
    this.logger.log(`인덱스 생성 완료!`);

    return index;
  }
}

