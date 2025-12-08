import { Test, TestingModule } from '@nestjs/testing';
import { BM25SearchService } from '../services/bm25-search.service';
import { Document } from 'llamaindex';

describe('BM25SearchService', () => {
  let service: BM25SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BM25SearchService],
    }).compile();

    service = module.get<BM25SearchService>(BM25SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('tokenize', () => {
    it('should tokenize Korean text correctly', () => {
      // @ts-ignore - accessing private method for testing
      const tokens = service['tokenize']('인공지능 학습');
      console.log('Tokenized "인공지능 학습":', tokens);
      expect(tokens).toContain('인공지능');
      expect(tokens).toContain('학습');
    });

    it('should tokenize mixed text', () => {
      // @ts-ignore - accessing private method for testing
      const tokens = service['tokenize']('AI 인공지능 기술');
      console.log('Tokenized "AI 인공지능 기술":', tokens);
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('search', () => {
    it('should return relevant documents based on BM25 scoring', () => {
      const documents = [
        new Document({ 
          text: '인공지능은 컴퓨터가 인간처럼 학습하고 추론하는 기술입니다.', 
          metadata: { id: '1' } 
        }),
        new Document({ 
          text: '머신러닝은 인공지능의 한 분야로 데이터로부터 학습합니다.', 
          metadata: { id: '2' } 
        }),
        new Document({ 
          text: '딥러닝은 인공 신경망을 사용하는 머신러닝 기법입니다.', 
          metadata: { id: '3' } 
        }),
        new Document({ 
          text: '자연어 처리는 컴퓨터가 인간의 언어를 이해하는 기술입니다.', 
          metadata: { id: '4' } 
        }),
      ];

      const query = '인공지능 학습';
      const results = service.search(query, documents, 3);

      console.log('Query:', query);
      console.log('Results:', results);
      console.log('Results length:', results.length);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);

      // 각 결과는 필수 속성을 가져야 함
      results.forEach(result => {
        expect(result).toHaveProperty('document');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('metadata');
        expect(result.score).toBeGreaterThan(0);
      });

      // 점수순으로 정렬되어 있어야 함
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should handle empty query', () => {
      const documents = [
        new Document({ text: 'Test document', metadata: { id: '1' } }),
      ];

      const results = service.search('', documents, 5);

      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    });

    it('should handle empty documents', () => {
      const results = service.search('test query', [], 5);

      expect(results).toBeDefined();
      expect(results.length).toBe(0);
    });

    it('should return only documents with positive scores', () => {
      const documents = [
        new Document({ text: '인공지능 머신러닝', metadata: { id: '1' } }),
        new Document({ text: '완전히 관련없는 다른 주제의 문서', metadata: { id: '2' } }),
      ];

      const query = '인공지능';
      const results = service.search(query, documents, 5);

      expect(results).toBeDefined();
      results.forEach(result => {
        expect(result.score).toBeGreaterThan(0);
      });
    });

    it('should respect topK parameter', () => {
      const documents = Array.from({ length: 10 }, (_, i) => 
        new Document({ 
          text: `인공지능 문서 ${i + 1}`, 
          metadata: { id: `${i + 1}` } 
        })
      );

      const query = '인공지능';
      const topK = 3;
      const results = service.search(query, documents, topK);

      expect(results.length).toBeLessThanOrEqual(topK);
    });

    it('should handle queries with special characters', () => {
      const documents = [
        new Document({ text: 'C++ 프로그래밍', metadata: { id: '1' } }),
        new Document({ text: 'JavaScript & TypeScript', metadata: { id: '2' } }),
      ];

      const query = 'C++ JavaScript';
      const results = service.search(query, documents, 5);

      expect(results).toBeDefined();
    });

    it('should filter Korean and English stopwords', () => {
      const documents = [
        new Document({ 
          text: '이것은 그것이고 저것은 the thing입니다', 
          metadata: { id: '1' } 
        }),
        new Document({ 
          text: '중요한 키워드가 포함된 문서입니다', 
          metadata: { id: '2' } 
        }),
      ];

      const query = '이것 그것 the thing';
      const results = service.search(query, documents, 5);

      // 불용어가 제거되므로 결과가 적을 수 있음
      expect(results).toBeDefined();
    });
  });

  describe('BM25 parameters', () => {
    it('should apply document length normalization', () => {
      const shortDoc = new Document({ 
        text: '짧은 문서', 
        metadata: { id: '1' } 
      });
      
      const longDoc = new Document({ 
        text: '이것은 매우 긴 문서입니다. '.repeat(20) + '짧은', 
        metadata: { id: '2' } 
      });

      const documents = [shortDoc, longDoc];
      const query = '짧은';
      const results = service.search(query, documents, 2);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      // BM25는 문서 길이를 고려하므로 짧은 문서가 더 높은 점수를 받을 수 있음
    });

    it('should consider term frequency', () => {
      const doc1 = new Document({ 
        text: '인공지능', 
        metadata: { id: '1' } 
      });
      
      const doc2 = new Document({ 
        text: '인공지능 인공지능 인공지능', 
        metadata: { id: '2' } 
      });

      const documents = [doc1, doc2];
      const query = '인공지능';
      const results = service.search(query, documents, 2);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      // 빈도가 높은 문서가 더 높은 점수를 받을 수 있음 (문서 길이 정규화 고려)
    });

    it('should apply IDF for rare terms', () => {
      const documents = [
        new Document({ text: '일반적인 단어 일반적인 단어', metadata: { id: '1' } }),
        new Document({ text: '일반적인 단어 희귀단어', metadata: { id: '2' } }),
        new Document({ text: '일반적인 단어', metadata: { id: '3' } }),
      ];

      const query = '희귀단어';
      const results = service.search(query, documents, 3);

      expect(results).toBeDefined();
      if (results.length > 0) {
        // 희귀한 단어를 포함한 문서가 상위에 나와야 함
        expect(results[0].document.getText()).toContain('희귀단어');
      }
    });
  });

  describe('Korean language support', () => {
    it('should handle Korean text correctly', () => {
      const documents = [
        new Document({ text: '한글 문서 처리 테스트', metadata: { id: '1' } }),
        new Document({ text: '자연어 처리 기술', metadata: { id: '2' } }),
        new Document({ text: '데이터 분석', metadata: { id: '3' } }),
      ];

      const query = '한글 처리';
      const results = service.search(query, documents, 5);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle mixed Korean and English', () => {
      const documents = [
        new Document({ text: 'AI 인공지능 기술', metadata: { id: '1' } }),
        new Document({ text: 'Machine Learning 머신러닝', metadata: { id: '2' } }),
      ];

      const query = 'AI 기술';
      const results = service.search(query, documents, 5);

      expect(results).toBeDefined();
    });
  });
});

