import { Injectable, Logger } from '@nestjs/common';
import { Document } from 'llamaindex';

export interface BM25Result {
  document: Document;
  score: number;
  metadata: Record<string, any>;
}

/**
 * BM25 알고리즘을 사용한 키워드 기반 검색 서비스
 * 
 * BM25 (Best Matching 25): 정보 검색에서 사용되는 랭킹 함수
 * - TF (Term Frequency): 문서 내 단어 빈도
 * - IDF (Inverse Document Frequency): 단어의 희귀성
 * - 문서 길이 정규화
 */
@Injectable()
export class BM25SearchService {
  private readonly logger = new Logger(BM25SearchService.name);

  // BM25 파라미터
  private readonly k1 = 1.5; // 빈도 포화 조절 (클수록 빈도 영향 큼)
  private readonly b = 0.75;  // 문서 길이 영향 조절 (0=무시, 1=최대)

  /**
   * BM25 알고리즘으로 문서 검색
   */
  search(
    query: string,
    documents: Document[],
    topK: number = 5,
  ): BM25Result[] {
    if (!query || documents.length === 0) {
      return [];
    }

    this.logger.debug(`BM25 search for: "${query}" in ${documents.length} documents`);

    // 1. 쿼리 토큰화
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      this.logger.warn('Query tokenization resulted in empty tokens');
      return [];
    }

    // 2. 모든 문서 토큰화
    const docTokens = documents.map(doc => this.tokenize(doc.getText()));

    // 3. 평균 문서 길이 계산
    const avgDocLen = this.calculateAvgDocLength(docTokens);

    // 4. IDF 계산
    const idf = this.calculateIDF(queryTokens, docTokens);

    // 5. 각 문서에 대한 BM25 점수 계산
    const scores: BM25Result[] = documents.map((doc, idx) => {
      const score = this.calculateBM25Score(
        queryTokens,
        docTokens[idx],
        avgDocLen,
        idf,
      );

      return {
        document: doc,
        score,
        metadata: doc.metadata,
      };
    });

    // 6. 점수 기준 정렬 및 상위 K개 반환
    const results = scores
      .filter(s => s.score > 0) // 점수 0인 것 제외
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    this.logger.debug(`BM25 found ${results.length} results (top ${topK})`);

    return results;
  }

  /**
   * 텍스트를 토큰(단어)으로 분리
   */
  private tokenize(text: string): string[] {
    if (!text) return [];

    // 1. 소문자 변환
    const lower = text.toLowerCase();

    // 2. 특수문자 제거 (한글, 영문, 숫자, 공백만 남김)
    const cleaned = lower.replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣]/g, ' ');

    // 3. 공백으로 분리
    const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);

    // 4. 불용어 제거 (간단한 버전)
    const stopwords = new Set(['이', '그', '저', '것', '등', '및', 'the', 'a', 'an', 'is', 'are']);
    const filtered = tokens.filter(t => !stopwords.has(t) && t.length > 1);

    return filtered;
  }

  /**
   * 평균 문서 길이 계산
   */
  private calculateAvgDocLength(docTokens: string[][]): number {
    if (docTokens.length === 0) return 0;

    const totalLength = docTokens.reduce((sum, tokens) => sum + tokens.length, 0);
    return totalLength / docTokens.length;
  }

  /**
   * IDF (Inverse Document Frequency) 계산
   * 희귀한 단어일수록 높은 값
   */
  private calculateIDF(queryTokens: string[], docTokens: string[][]): Map<string, number> {
    const idf = new Map<string, number>();
    const N = docTokens.length;

    for (const token of queryTokens) {
      // 해당 토큰을 포함한 문서 개수
      const df = docTokens.filter(tokens => tokens.includes(token)).length;

      if (df > 0) {
        // 표준 BM25 IDF 공식: log((N - df + 0.5) / (df + 0.5))
        const idfValue = Math.log((N - df + 0.5) / (df + 0.5));
        idf.set(token, idfValue);
      } else {
        // 문서에 없는 토큰은 0
        idf.set(token, 0);
      }
    }

    return idf;
  }

  /**
   * BM25 점수 계산
   */
  private calculateBM25Score(
    queryTokens: string[],
    docTokens: string[],
    avgDocLen: number,
    idf: Map<string, number>,
  ): number {
    if (docTokens.length === 0 || avgDocLen === 0) {
      return 0;
    }

    const docLen = docTokens.length;
    let score = 0;

    for (const token of queryTokens) {
      // 1. 문서 내 토큰 빈도 (TF)
      const tf = docTokens.filter(t => t === token).length;

      if (tf === 0) continue; // 이 토큰이 문서에 없으면 건너뜀

      // 2. IDF 값
      const idfValue = idf.get(token) || 0;

      // 3. BM25 공식
      // score += IDF * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * (docLen / avgDocLen)))
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / avgDocLen));

      score += idfValue * (numerator / denominator);
    }

    return score;
  }
}

