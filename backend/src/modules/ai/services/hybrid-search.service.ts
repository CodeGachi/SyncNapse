import { Injectable, Logger } from '@nestjs/common';
import { Document } from 'llamaindex';
import { BM25SearchService, BM25Result } from './bm25-search.service';

export interface HybridSearchResult {
  document: Document;
  score: number;
  vectorScore: number;
  keywordScore: number;
  metadata: Record<string, any>;
}

/**
 * 하이브리드 검색 서비스
 * 벡터 검색과 키워드 검색(BM25)을 결합
 */
@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);

  // 기본 가중치
  private readonly DEFAULT_VECTOR_WEIGHT = 0.6;
  private readonly DEFAULT_KEYWORD_WEIGHT = 0.4;

  constructor(private readonly bm25Service: BM25SearchService) {}

  /**
   * 벡터 검색 결과와 키워드 검색 결과를 결합
   */
  combineResults(
    query: string,
    documents: Document[],
    vectorResults: Array<{ node: any; score: number }>,
    topK: number = 5,
    vectorWeight?: number,
    keywordWeight?: number,
  ): HybridSearchResult[] {
    // 가중치 설정 (미제공 시 적응형 가중치 사용)
    const weights = vectorWeight && keywordWeight
      ? { vector: vectorWeight, keyword: keywordWeight }
      : this.getAdaptiveWeights(query);

    this.logger.debug(
      `Hybrid search with weights - vector: ${weights.vector}, keyword: ${weights.keyword}`,
    );

    // 1. BM25 키워드 검색 수행
    const keywordResults = this.bm25Service.search(query, documents, topK * 2);

    // 2. 벡터 검색 결과 정규화
    const vectorScoreMap = this.normalizeVectorScores(vectorResults);

    // 3. 키워드 검색 결과 정규화
    const keywordScoreMap = this.normalizeKeywordScores(keywordResults);

    // 4. 하이브리드 점수 계산
    const hybridResults = this.calculateHybridScores(
      documents,
      vectorScoreMap,
      keywordScoreMap,
      weights.vector,
      weights.keyword,
    );

    // 5. 정렬 및 상위 K개 반환
    const topResults = hybridResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    this.logger.debug(`Hybrid search returned ${topResults.length} results`);

    return topResults;
  }

  /**
   * 벡터 검색 점수 정규화 (0-1 범위)
   */
  private normalizeVectorScores(
    vectorResults: Array<{ node: any; score: number }>,
  ): Map<string, number> {
    const scoreMap = new Map<string, number>();

    if (vectorResults.length === 0) return scoreMap;

    // 최대값 찾기 (최소값 1로 제로 디비전 방지)
    const maxScore = Math.max(...vectorResults.map(r => r.score), 1);

    // 정규화
    for (const result of vectorResults) {
      // NodeWithScore 구조: { node: BaseNode, score: number }
      // BaseNode에서 텍스트 추출 (여러 방법 시도)
      let nodeText = '';
      
      if (result.node.getText && typeof result.node.getText === 'function') {
        nodeText = result.node.getText();
      } else if (result.node.getContent && typeof result.node.getContent === 'function') {
        nodeText = result.node.getContent();
      } else if (result.node.text) {
        nodeText = result.node.text;
      } else {
        this.logger.warn('Unable to extract text from node:', result.node);
        continue;
      }

      const normalizedScore = result.score / maxScore;
      scoreMap.set(nodeText, normalizedScore);
    }

    this.logger.debug(`Normalized ${scoreMap.size} vector scores (max: ${maxScore.toFixed(3)})`);

    return scoreMap;
  }

  /**
   * 키워드 검색 점수 정규화 (0-1 범위)
   */
  private normalizeKeywordScores(keywordResults: BM25Result[]): Map<string, number> {
    const scoreMap = new Map<string, number>();

    if (keywordResults.length === 0) return scoreMap;

    // 최대값 찾기 (최소값 1로 제로 디비전 방지)
    const maxScore = Math.max(...keywordResults.map(r => r.score), 1);

    // 정규화
    for (const result of keywordResults) {
      const text = result.document.getText();
      const normalizedScore = result.score / maxScore;
      scoreMap.set(text, normalizedScore);
    }

    this.logger.debug(`Normalized ${scoreMap.size} keyword scores (max: ${maxScore.toFixed(3)})`);

    return scoreMap;
  }

  /**
   * 하이브리드 점수 계산
   */
  private calculateHybridScores(
    documents: Document[],
    vectorScoreMap: Map<string, number>,
    keywordScoreMap: Map<string, number>,
    vectorWeight: number,
    keywordWeight: number,
  ): HybridSearchResult[] {
    const results: HybridSearchResult[] = [];
    const seenTexts = new Set<string>();

    for (const doc of documents) {
      const text = doc.getText();

      // 중복 제거
      if (seenTexts.has(text)) continue;
      seenTexts.add(text);

      const vectorScore = vectorScoreMap.get(text) || 0;
      const keywordScore = keywordScoreMap.get(text) || 0;

      // 둘 다 0이면 제외
      if (vectorScore === 0 && keywordScore === 0) continue;

      // 하이브리드 점수 = 가중 평균
      const hybridScore = vectorWeight * vectorScore + keywordWeight * keywordScore;

      results.push({
        document: doc,
        score: hybridScore,
        vectorScore,
        keywordScore,
        metadata: doc.metadata,
      });
    }

    this.logger.debug(
      `Calculated ${results.length} hybrid scores (weights: v=${vectorWeight}, k=${keywordWeight})`,
    );

    return results;
  }

  /**
   * 질문 유형에 따라 적응형 가중치 결정
   */
  private getAdaptiveWeights(query: string): { vector: number; keyword: number } {
    const lowerQuery = query.toLowerCase();

    // 1. 정확한 값/인용이 필요한 경우 → 키워드 강조
    if (lowerQuery.includes('"') || lowerQuery.includes("'")) {
      return { vector: 0.3, keyword: 0.7 };
    }

    // 2. 숫자가 포함된 경우 → 키워드 약간 강조
    if (/\d+/.test(query)) {
      return { vector: 0.5, keyword: 0.5 };
    }

    // 3. 개념 설명 질문 → 벡터 강조
    if (
      lowerQuery.includes('무엇') ||
      lowerQuery.includes('어떻게') ||
      lowerQuery.includes('왜') ||
      lowerQuery.includes('what') ||
      lowerQuery.includes('how') ||
      lowerQuery.includes('why')
    ) {
      return { vector: 0.7, keyword: 0.3 };
    }

    // 4. 기본값: 벡터 약간 우선
    return { vector: this.DEFAULT_VECTOR_WEIGHT, keyword: this.DEFAULT_KEYWORD_WEIGHT };
  }
}

