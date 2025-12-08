import { Test, TestingModule } from '@nestjs/testing';
import { HybridSearchService } from '../services/hybrid-search.service';
import { BM25SearchService } from '../services/bm25-search.service';
import { Document } from 'llamaindex';

describe('HybridSearchService', () => {
  let service: HybridSearchService;
  let bm25Service: BM25SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HybridSearchService, BM25SearchService],
    }).compile();

    service = module.get<HybridSearchService>(HybridSearchService);
    bm25Service = module.get<BM25SearchService>(BM25SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('combineResults', () => {
    it('should combine vector and keyword search results', () => {
      const documents = [
        new Document({ text: '인공지능은 기계가 학습하는 기술입니다.', metadata: { id: '1' } }),
        new Document({ text: '머신러닝은 인공지능의 한 분야입니다.', metadata: { id: '2' } }),
        new Document({ text: '딥러닝은 신경망을 사용합니다.', metadata: { id: '3' } }),
      ];

      const vectorResults = [
        { node: { getText: () => documents[0].getText() }, score: 0.9 },
        { node: { getText: () => documents[1].getText() }, score: 0.7 },
        { node: { getText: () => documents[2].getText() }, score: 0.5 },
      ];

      const query = '인공지능이란 무엇인가?';

      const results = service.combineResults(
        query,
        documents,
        vectorResults,
        3,
        0.6,
        0.4,
      );

      expect(results).toBeDefined();
      expect(results.length).toBeLessThanOrEqual(3);
      
      // 각 결과는 하이브리드 점수를 가져야 함
      results.forEach(result => {
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('vectorScore');
        expect(result).toHaveProperty('keywordScore');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      });

      // 점수순으로 정렬되어 있어야 함
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should handle empty vector results', () => {
      const documents = [
        new Document({ text: 'Test document', metadata: { id: '1' } }),
      ];

      const results = service.combineResults(
        'test query',
        documents,
        [],
        5,
        0.6,
        0.4,
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty documents', () => {
      const vectorResults = [
        { node: { getText: () => 'test text' }, score: 0.9 },
      ];

      const results = service.combineResults(
        'test query',
        [],
        vectorResults,
        5,
        0.6,
        0.4,
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    });
  });

  describe('adaptive weights', () => {
    it('should prioritize keywords for queries with quotes', () => {
      const documents = [
        new Document({ text: '정확한 문장: "특정 인용구"를 포함합니다.', metadata: { id: '1' } }),
        new Document({ text: '일반적인 설명 텍스트입니다.', metadata: { id: '2' } }),
      ];

      const vectorResults = [
        { node: { getText: () => documents[0].getText() }, score: 0.8 },
        { node: { getText: () => documents[1].getText() }, score: 0.9 },
      ];

      const query = '"특정 인용구"';

      const results = service.combineResults(
        query,
        documents,
        vectorResults,
        2,
      );

      expect(results).toBeDefined();
      // 인용부호가 있으면 키워드 검색이 더 중요
      // (테스트는 로직이 실행되는지만 확인)
    });

    it('should balance weights for numeric queries', () => {
      const documents = [
        new Document({ text: '2024년도 데이터 분석', metadata: { id: '1' } }),
        new Document({ text: '일반 텍스트', metadata: { id: '2' } }),
      ];

      const vectorResults = [
        { node: { getText: () => documents[0].getText() }, score: 0.8 },
      ];

      const query = '2024 데이터';

      const results = service.combineResults(
        query,
        documents,
        vectorResults,
        2,
      );

      expect(results).toBeDefined();
    });

    it('should prioritize vector search for conceptual questions', () => {
      const documents = [
        new Document({ text: '개념 설명 문서', metadata: { id: '1' } }),
        new Document({ text: '다른 내용', metadata: { id: '2' } }),
      ];

      const vectorResults = [
        { node: { getText: () => documents[0].getText() }, score: 0.8 },
      ];

      const query = '무엇인가요?';

      const results = service.combineResults(
        query,
        documents,
        vectorResults,
        2,
      );

      expect(results).toBeDefined();
    });
  });

  describe('score normalization', () => {
    it('should normalize scores to 0-1 range', () => {
      const documents = [
        new Document({ text: '첫 번째 문서', metadata: { id: '1' } }),
        new Document({ text: '두 번째 문서', metadata: { id: '2' } }),
      ];

      const vectorResults = [
        { node: { getText: () => documents[0].getText() }, score: 100 },
        { node: { getText: () => documents[1].getText() }, score: 50 },
      ];

      const results = service.combineResults(
        'test query',
        documents,
        vectorResults,
        2,
        0.5,
        0.5,
      );

      expect(results).toBeDefined();
      results.forEach(result => {
        expect(result.vectorScore).toBeGreaterThanOrEqual(0);
        expect(result.vectorScore).toBeLessThanOrEqual(1);
        expect(result.keywordScore).toBeGreaterThanOrEqual(0);
        expect(result.keywordScore).toBeLessThanOrEqual(1);
      });
    });
  });
});

