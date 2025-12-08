# AI 기능 연구 실험 설계서

> AI 경진대회 논문을 위한 체계적인 실험 설계

## 📋 목차

1. [실험 1: Whisper vs Web Speech API 비교](#실험-1-whisper-vs-web-speech-api-비교)
2. [실험 2: 하이브리드 검색 전략 평가](#실험-2-하이브리드-검색-전략-평가)
3. [실험 3: Multi-modal RAG 효과 측정](#실험-3-multi-modal-rag-효과-측정)
4. [실험 4: 개인화 학습 효과 분석](#실험-4-개인화-학습-효과-분석)
5. [실험 5: 사용자 경험 평가](#실험-5-사용자-경험-평가)

---

## 실험 1: Whisper vs Web Speech API 비교

### 📊 연구 질문

**RQ1**: OpenAI Whisper가 Web Speech API 대비 강의 전사의 정확도를 얼마나 향상시키는가?

**RQ2**: 전문 용어가 많은 학술 강의에서 두 시스템의 성능 차이는 얼마나 되는가?

### 🎯 가설

- **H1**: Whisper가 Web Speech API보다 WER(Word Error Rate)가 최소 20% 낮을 것이다.
- **H2**: 전문 용어 인식률에서 Whisper가 최소 30% 높을 것이다.
- **H3**: 실시간 처리 지연(latency)은 Whisper가 2-3배 높을 것이다.

### 📝 실험 설계

#### 데이터셋 구성

```
총 60개 강의 샘플 (각 5-10분)

카테고리별 분포:
- 일반 교양 (20개): 한국사, 철학, 경제학
- STEM (20개): 수학, 물리학, 컴퓨터과학
- 전문 분야 (20개): 의학, 법학, 공학

음질 조건:
- 고품질 (20개): 스튜디오 녹음
- 중품질 (20개): 강의실 녹음
- 저품질 (20개): 잡음 포함
```

#### 실험 절차

**1단계: Ground Truth 생성**
```python
# 사람이 직접 전사하여 정답 데이터 생성
# 전문 전사 서비스 활용 또는 연구팀 직접 전사
```

**2단계: 시스템 전사**
```typescript
// 각 샘플에 대해 두 시스템으로 전사
for (const sample of dataset) {
  // Web Speech API 전사
  const webSpeechResult = await transcribeWithWebSpeech(sample);
  
  // Whisper 전사
  const whisperResult = await transcribeWithWhisper(sample);
  
  // 결과 저장
  await saveResults({
    sampleId: sample.id,
    groundTruth: sample.groundTruth,
    webSpeech: webSpeechResult,
    whisper: whisperResult,
  });
}
```

**3단계: 평가 메트릭 계산**

#### 평가 지표

**1. WER (Word Error Rate)**
```python
WER = (S + D + I) / N

S: 대체된 단어 수 (Substitutions)
D: 삭제된 단어 수 (Deletions)
I: 삽입된 단어 수 (Insertions)
N: 전체 단어 수
```

**코드 예시:**
```typescript
import leven from 'leven'; // Levenshtein distance

function calculateWER(reference: string, hypothesis: string): number {
  const refWords = reference.split(' ');
  const hypWords = hypothesis.split(' ');
  
  const distance = leven(refWords.join(''), hypWords.join(''));
  return distance / refWords.length;
}
```

**2. 전문 용어 정확도**
```typescript
interface TermAccuracy {
  term: string;
  occurrences: number;
  correctRecognitions: number;
  accuracy: number;
}

function evaluateTermAccuracy(
  groundTruth: string,
  transcription: string,
  technicalTerms: string[],
): TermAccuracy[] {
  const results: TermAccuracy[] = [];
  
  for (const term of technicalTerms) {
    const truthCount = (groundTruth.match(new RegExp(term, 'g')) || []).length;
    const transCount = (transcription.match(new RegExp(term, 'g')) || []).length;
    
    results.push({
      term,
      occurrences: truthCount,
      correctRecognitions: Math.min(truthCount, transCount),
      accuracy: truthCount > 0 ? Math.min(truthCount, transCount) / truthCount : 0,
    });
  }
  
  return results;
}
```

**3. 실시간 성능 (RTF - Real-Time Factor)**
```typescript
RTF = Processing Time / Audio Duration

// RTF < 1.0 이면 실시간 처리 가능
// RTF = 0.5 이면 10초 오디오를 5초에 처리

function calculateRTF(processingTime: number, audioDuration: number): number {
  return processingTime / audioDuration;
}
```

**4. 비용 분석**
```typescript
interface CostAnalysis {
  system: 'WebSpeech' | 'Whisper';
  audioHours: number;
  costPerHour: number;
  totalCost: number;
}

// Web Speech API: 무료 (브라우저 내장)
// Whisper API: $0.006 / minute = $0.36 / hour
```

### 📈 예상 결과

```
예상 WER (낮을수록 좋음):
- Web Speech API: 15-25%
- Whisper: 5-10%

예상 전문 용어 정확도:
- Web Speech API: 60-70%
- Whisper: 85-95%

예상 RTF:
- Web Speech API: 0.1-0.3 (실시간)
- Whisper: 0.5-1.5 (준실시간)
```

### 📊 결과 시각화

```python
import matplotlib.pyplot as plt
import seaborn as sns

# 1. WER 비교 박스플롯
plt.figure(figsize=(10, 6))
sns.boxplot(data=results, x='category', y='wer', hue='system')
plt.title('WER Comparison by Category')
plt.savefig('wer_comparison.png')

# 2. 전문 용어 정확도 히트맵
plt.figure(figsize=(12, 8))
sns.heatmap(term_accuracy_matrix, annot=True, fmt='.2f')
plt.title('Technical Term Recognition Accuracy')
plt.savefig('term_accuracy.png')

# 3. 음질별 성능
plt.figure(figsize=(10, 6))
plt.plot(audio_quality, web_speech_performance, label='Web Speech')
plt.plot(audio_quality, whisper_performance, label='Whisper')
plt.legend()
plt.title('Performance by Audio Quality')
plt.savefig('quality_performance.png')
```

---

## 실험 2: 하이브리드 검색 전략 평가

### 📊 연구 질문

**RQ1**: 하이브리드 검색이 순수 벡터 검색 대비 검색 품질을 얼마나 향상시키는가?

**RQ2**: 질문 유형에 따라 최적의 검색 전략은 무엇인가?

### 🎯 가설

- **H1**: 하이브리드 검색이 순수 벡터 검색 대비 MRR이 15% 이상 높을 것이다.
- **H2**: 사실 기반 질문에서는 키워드 검색 가중치를 높일수록 성능이 향상될 것이다.
- **H3**: 개념 설명 질문에서는 벡터 검색 가중치를 높일수록 성능이 향상될 것이다.

### 📝 실험 설계

#### 데이터셋 구성

**1. 강의 노트 데이터**
```
10개 과목 × 5개 강의 = 50개 노트
- 각 노트당 30-50 페이지 PDF
- 음성 전사 포함
- 학생 필기 포함
```

**2. 질문 데이터셋 (총 500개)**
```typescript
interface Question {
  id: string;
  text: string;
  type: QuestionType;
  relevantDocs: string[]; // Ground truth
  difficulty: 'easy' | 'medium' | 'hard';
}

enum QuestionType {
  FACTUAL = 'factual',           // 사실 확인: "경사하강법의 학습률은?"
  CONCEPTUAL = 'conceptual',     // 개념 설명: "경사하강법이란?"
  COMPARISON = 'comparison',     // 비교: "A와 B의 차이는?"
  APPLICATION = 'application',   // 응용: "이걸 실제로 어떻게 사용?"
  ANALYSIS = 'analysis',         // 분석: "왜 이런 결과가?"
}
```

**질문 예시:**
```json
[
  {
    "id": "q001",
    "text": "경사하강법(Gradient Descent)이란 무엇인가?",
    "type": "conceptual",
    "relevantDocs": ["note-001-page-15", "note-001-page-16"],
    "difficulty": "medium"
  },
  {
    "id": "q002",
    "text": "학습률(learning rate)의 값은 무엇인가?",
    "type": "factual",
    "relevantDocs": ["note-001-page-17"],
    "difficulty": "easy"
  },
  {
    "id": "q003",
    "text": "배치 경사하강법과 확률적 경사하강법의 차이점은?",
    "type": "comparison",
    "relevantDocs": ["note-001-page-18", "note-001-page-19"],
    "difficulty": "hard"
  }
]
```

#### 실험 조건

**검색 전략 비교:**
```typescript
const strategies = [
  { name: 'Vector Only', vectorWeight: 1.0, keywordWeight: 0.0 },
  { name: 'Keyword Only', vectorWeight: 0.0, keywordWeight: 1.0 },
  { name: 'Hybrid 50-50', vectorWeight: 0.5, keywordWeight: 0.5 },
  { name: 'Hybrid 60-40', vectorWeight: 0.6, keywordWeight: 0.4 },
  { name: 'Hybrid 70-30', vectorWeight: 0.7, keywordWeight: 0.3 },
  { name: 'Adaptive', vectorWeight: 'auto', keywordWeight: 'auto' }, // 질문 유형에 따라 자동 조절
];
```

#### 평가 지표

**1. MRR (Mean Reciprocal Rank)**
```typescript
function calculateMRR(results: SearchResult[][]): number {
  let sum = 0;
  
  for (const result of results) {
    // 첫 번째 관련 문서의 순위 찾기
    const firstRelevantIndex = result.findIndex(doc => doc.isRelevant);
    
    if (firstRelevantIndex >= 0) {
      sum += 1 / (firstRelevantIndex + 1);
    }
  }
  
  return sum / results.length;
}

// 예시:
// 질문 1: 관련 문서가 1번째 → RR = 1/1 = 1.0
// 질문 2: 관련 문서가 3번째 → RR = 1/3 = 0.33
// 질문 3: 관련 문서 없음 → RR = 0
// MRR = (1.0 + 0.33 + 0) / 3 = 0.44
```

**2. NDCG@K (Normalized Discounted Cumulative Gain)**
```typescript
function calculateNDCG(results: SearchResult[], k: number = 5): number {
  // DCG (실제 순위)
  let dcg = 0;
  for (let i = 0; i < Math.min(k, results.length); i++) {
    const relevance = results[i].relevanceScore; // 0-3 scale
    dcg += (Math.pow(2, relevance) - 1) / Math.log2(i + 2);
  }
  
  // IDCG (이상적인 순위)
  const idealResults = [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
  let idcg = 0;
  for (let i = 0; i < Math.min(k, idealResults.length); i++) {
    const relevance = idealResults[i].relevanceScore;
    idcg += (Math.pow(2, relevance) - 1) / Math.log2(i + 2);
  }
  
  return idcg > 0 ? dcg / idcg : 0;
}
```

**3. Precision@K & Recall@K**
```typescript
function calculatePrecisionRecall(
  results: SearchResult[],
  groundTruth: string[],
  k: number,
): { precision: number; recall: number } {
  const topK = results.slice(0, k);
  const retrieved = new Set(topK.map(r => r.id));
  const relevant = new Set(groundTruth);
  
  const intersection = new Set([...retrieved].filter(x => relevant.has(x)));
  
  const precision = intersection.size / retrieved.size;
  const recall = intersection.size / relevant.size;
  
  return { precision, recall };
}
```

#### 실험 절차

```typescript
// 평가 스크립트
async function evaluateSearchStrategies() {
  const results = [];
  
  for (const strategy of strategies) {
    console.log(`Testing strategy: ${strategy.name}`);
    
    const metrics = {
      mrr: 0,
      ndcg: 0,
      precision: 0,
      recall: 0,
      responseTime: 0,
    };
    
    for (const question of questions) {
      const startTime = Date.now();
      
      // 검색 수행
      const searchResults = await hybridSearch.search(
        question.text,
        documents,
        {
          vectorWeight: strategy.vectorWeight,
          keywordWeight: strategy.keywordWeight,
          topK: 10,
        },
      );
      
      const responseTime = Date.now() - startTime;
      
      // 메트릭 계산
      const rr = calculateReciprocalRank(searchResults, question.relevantDocs);
      const ndcg = calculateNDCG(searchResults, 5);
      const { precision, recall } = calculatePrecisionRecall(
        searchResults,
        question.relevantDocs,
        5,
      );
      
      metrics.mrr += rr;
      metrics.ndcg += ndcg;
      metrics.precision += precision;
      metrics.recall += recall;
      metrics.responseTime += responseTime;
    }
    
    // 평균 계산
    const avgMetrics = {
      strategy: strategy.name,
      mrr: metrics.mrr / questions.length,
      ndcg: metrics.ndcg / questions.length,
      precision: metrics.precision / questions.length,
      recall: metrics.recall / questions.length,
      avgResponseTime: metrics.responseTime / questions.length,
    };
    
    results.push(avgMetrics);
  }
  
  return results;
}
```

### 📈 예상 결과

```
예상 MRR:
- Vector Only: 0.65
- Keyword Only: 0.55
- Hybrid 60-40: 0.75
- Adaptive: 0.80

질문 유형별 최적 전략:
- Factual: Keyword-heavy (30-70)
- Conceptual: Vector-heavy (70-30)
- Comparison: Balanced (50-50)
- Application: Vector-heavy (70-30)
- Analysis: Vector-heavy (80-20)
```

### 📊 결과 시각화

```python
import pandas as pd
import matplotlib.pyplot as plt

# 1. 전략별 메트릭 비교
df = pd.DataFrame(results)
df.plot(x='strategy', y=['mrr', 'ndcg', 'precision', 'recall'], kind='bar')
plt.title('Search Strategy Comparison')
plt.savefig('strategy_comparison.png')

# 2. 질문 유형별 성능
fig, axes = plt.subplots(2, 3, figsize=(15, 10))
for i, qtype in enumerate(QuestionType):
    ax = axes[i // 3, i % 3]
    type_results = df[df['question_type'] == qtype]
    type_results.plot(x='strategy', y='mrr', kind='bar', ax=ax)
    ax.set_title(f'{qtype} Questions')
plt.savefig('question_type_performance.png')

# 3. 가중치 히트맵
weights = np.linspace(0, 1, 11)
performance_matrix = np.zeros((11, 11))

for i, vec_w in enumerate(weights):
    for j, key_w in enumerate(weights):
        if vec_w + key_w == 1.0:
            performance_matrix[i, j] = run_experiment(vec_w, key_w)

sns.heatmap(performance_matrix, annot=True)
plt.xlabel('Keyword Weight')
plt.ylabel('Vector Weight')
plt.savefig('weight_heatmap.png')
```

---

## 실험 3: Multi-modal RAG 효과 측정

### 📊 연구 질문

**RQ1**: 이미지 분석을 통합한 Multi-modal RAG가 텍스트만 사용하는 RAG 대비 정확도를 얼마나 향상시키는가?

**RQ2**: 어떤 유형의 질문에서 이미지 분석이 가장 효과적인가?

### 🎯 가설

- **H1**: 차트/그래프 관련 질문에서 Multi-modal RAG가 50% 이상 정확도 향상
- **H2**: 수식 포함 질문에서 30% 이상 정확도 향상
- **H3**: 일반 텍스트 질문에서는 두 방법 간 유의미한 차이 없음

### 📝 실험 설계

#### 데이터셋

**1. 강의 자료 (20개)**
```
시각 자료가 풍부한 과목:
- 통계학 (그래프, 차트)
- 물리학 (다이어그램, 수식)
- 생물학 (그림, 구조도)
- 수학 (수식, 증명)
```

**2. 질문 카테고리 (총 200개)**
```typescript
enum VisualQuestionType {
  CHART = 'chart',           // "그래프가 보여주는 추세는?"
  DIAGRAM = 'diagram',       // "다이어그램에서 화살표의 의미는?"
  EQUATION = 'equation',     // "이 수식의 결과는?"
  TABLE = 'table',          // "표에서 최대값은?"
  TEXT_ONLY = 'text_only',  // "개념의 정의는?" (비교군)
}
```

#### 실험 조건

```typescript
const conditions = [
  {
    name: 'Text-only RAG',
    useVision: false,
    useOCR: false,
  },
  {
    name: 'RAG + OCR',
    useVision: false,
    useOCR: true, // 텍스트 추출만
  },
  {
    name: 'RAG + Vision (Gemini)',
    useVision: true,
    useOCR: false,
  },
  {
    name: 'RAG + OCR + Vision',
    useVision: true,
    useOCR: true,
  },
];
```

#### 평가 방법

**1. 정확도 평가 (사람 평가)**
```typescript
interface HumanEvaluation {
  questionId: string;
  answer: string;
  ratings: {
    factualAccuracy: number;  // 1-5: 사실 정확성
    relevance: number;         // 1-5: 질문과의 관련성
    completeness: number;      // 1-5: 답변 완성도
    usefulness: number;        // 1-5: 유용성
  };
  overallScore: number;        // 1-5
}

// 3명의 평가자가 독립적으로 평가
// Inter-rater reliability 계산 (Krippendorff's alpha)
```

**2. 자동 평가**
```typescript
// LLM을 judge로 사용 (GPT-4)
async function llmAsJudge(
  question: string,
  answer: string,
  groundTruth: string,
): Promise<number> {
  const prompt = `
    Question: ${question}
    Ground Truth: ${groundTruth}
    Answer: ${answer}
    
    Rate the answer's quality from 1-5:
    1: Completely incorrect
    2: Mostly incorrect
    3: Partially correct
    4: Mostly correct
    5: Completely correct
    
    Provide only the number.
  `;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
  });
  
  return parseInt(response.choices[0].message.content);
}
```

**3. Citation 정확도**
```typescript
function evaluateCitationAccuracy(
  citations: Citation[],
  relevantPages: number[],
): number {
  const citedPages = new Set(citations.map(c => c.pageNumber));
  const relevant = new Set(relevantPages);
  
  const intersection = new Set([...citedPages].filter(x => relevant.has(x)));
  
  // F1 score
  const precision = intersection.size / citedPages.size;
  const recall = intersection.size / relevant.size;
  
  return 2 * (precision * recall) / (precision + recall);
}
```

### 📈 예상 결과

```
질문 유형별 정확도 향상:

CHART 질문:
- Text-only: 45%
- + OCR: 55%
- + Vision: 85%
- + Both: 90%

EQUATION 질문:
- Text-only: 40%
- + OCR: 70%
- + Vision: 75%
- + Both: 85%

TEXT_ONLY 질문:
- Text-only: 80%
- + OCR: 82%
- + Vision: 81%
- + Both: 83%
```

### 비용 분석

```typescript
interface CostAnalysis {
  condition: string;
  costPerQuestion: number;
  accuracy: number;
  costPerCorrectAnswer: number;
}

// 예상:
// Text-only: $0.01/question, 70% 정확도 → $0.014/correct
// + Vision: $0.05/question, 85% 정확도 → $0.059/correct
```

---

## 실험 4: 개인화 학습 효과 분석

### 📊 연구 질문

**RQ1**: 개인화된 요약/추천이 학습 효과를 향상시키는가?

**RQ2**: 어떤 학습 패턴 특성이 개인화 효과를 극대화하는가?

### 🎯 가설

- **H1**: 개인화 그룹이 대조군 대비 학습 시간 20% 단축
- **H2**: 개인화 그룹이 이해도 테스트에서 15% 높은 점수
- **H3**: 개인화 그룹의 만족도가 대조군 대비 30% 높음

### 📝 실험 설계

#### 참가자 모집

```
총 60명의 학생
- 실험군 (개인화 사용): 30명
- 대조군 (일반 시스템): 30명

분야:
- 컴퓨터과학 전공: 20명
- 공학 전공: 20명
- 자연과학 전공: 20명

학년:
- 2학년: 20명
- 3학년: 20명
- 4학년: 20명
```

#### 실험 프로토콜

**Week 0: 사전 평가**
```
1. 지식 수준 테스트 (사전 평가)
2. 학습 스타일 설문 (VARK 모델)
3. 시스템 사용법 교육
```

**Week 1-4: 학습 기간**
```
매주:
- 2개의 강의 시청 (각 60분)
- AI 챗봇 사용하여 질문
- 주간 퀴즈 (10문제)

수집 데이터:
- 시청 시간, 일시정지 횟수
- 반복 시청 구간
- 질문 빈도 및 유형
- 퀴즈 점수
```

**Week 5: 사후 평가**
```
1. 지식 수준 테스트 (사후 평가)
2. 만족도 설문 (SUS - System Usability Scale)
3. 인터뷰 (정성적 피드백)
```

#### 개인화 기능

```typescript
interface PersonalizedFeatures {
  // 1. 적응형 요약
  summaryStyle: 'brief' | 'detailed' | 'example-based';
  summaryLength: number; // 사용자 선호에 따라 조절
  
  // 2. 약점 보완 추천
  weakTopics: string[];
  recommendedContent: string[];
  
  // 3. 최적 학습 시간 제안
  optimalStudyTime: string; // "19:00-21:00"
  studySessionLength: number; // 25분 (포모도로) vs 60분
  
  // 4. 맞춤형 퀴즈
  quizDifficulty: 'easy' | 'medium' | 'hard';
  focusAreas: string[];
  
  // 5. 학습 진도 시각화
  progressDashboard: {
    completedTopics: string[];
    masteryLevel: Record<string, number>;
    estimatedTimeToComplete: number;
  };
}
```

#### 평가 지표

**1. 학습 효율**
```typescript
interface LearningEfficiency {
  totalStudyTime: number; // 분
  contentCovered: number; // 페이지/강의 수
  testScore: number; // 0-100
  
  // 효율 = (점수 향상 / 학습 시간)
  efficiency: number;
}
```

**2. 지식 향상**
```typescript
interface KnowledgeGain {
  preTestScore: number;
  postTestScore: number;
  gain: number; // post - pre
  normalizedGain: number; // (post - pre) / (100 - pre)
}
```

**3. 사용자 만족도**
```typescript
interface Satisfaction {
  sus: number; // System Usability Scale (0-100)
  nps: number; // Net Promoter Score (-100 to 100)
  
  ratings: {
    easeOfUse: number; // 1-5
    helpfulness: number;
    personalization: number;
    wouldRecommend: boolean;
  };
}
```

### 📊 통계 분석

```r
# R 스크립트
library(tidyverse)
library(lme4)

# 1. t-test (실험군 vs 대조군)
t.test(experimental_group$gain, control_group$gain)

# 2. ANOVA (여러 요인 분석)
anova_model <- aov(gain ~ group + major + year, data = results)
summary(anova_model)

# 3. 회귀 분석 (어떤 요인이 효과에 영향?)
regression_model <- lm(
  gain ~ group + initial_score + study_time + question_count,
  data = results
)
summary(regression_model)

# 4. 효과 크기 (Cohen's d)
cohen.d(experimental_group$gain, control_group$gain)
```

---

## 실험 5: 사용자 경험 평가

### 📊 연구 질문

**RQ1**: AI 기능들이 전반적인 사용자 경험에 어떤 영향을 미치는가?

**RQ2**: 어떤 AI 기능이 가장 가치 있다고 인식되는가?

### 🎯 방법론

#### 1. 설문 조사 (Quantitative)

**System Usability Scale (SUS)**
```
10개 문항, 5점 척도

1. 이 시스템을 자주 사용하고 싶다
2. 시스템이 불필요하게 복잡하다
3. 시스템이 사용하기 쉽다
...

점수 계산: 0-100 (68점 이상이 평균 이상)
```

**Technology Acceptance Model (TAM)**
```typescript
interface TAMSurvey {
  perceivedUsefulness: number; // 유용성 인식
  perceivedEaseOfUse: number; // 사용 용이성 인식
  attitudeTowardUsing: number; // 사용 태도
  behavioralIntention: number; // 사용 의도
}
```

**AI Feature Rating**
```typescript
const aiFeatures = [
  'AI 챗봇 (질문 답변)',
  '자동 요약',
  '퀴즈 생성',
  '음성 인식/전사',
  '개인화 추천',
  '실시간 협업',
];

// 각 기능에 대해:
// - 사용 빈도 (1-5)
// - 유용성 (1-5)
// - 만족도 (1-5)
```

#### 2. 인터뷰 (Qualitative)

**반구조화 인터뷰 (30분)**
```
질문 예시:

1. 가장 유용했던 AI 기능은 무엇인가요?
2. 어떤 상황에서 AI 챗봇을 사용했나요?
3. AI 답변이 도움이 안 되었던 경우가 있나요?
4. 개인화 기능이 실제로 효과가 있었나요?
5. 개선이 필요한 부분은 무엇인가요?
6. 다른 학생들에게 추천하시겠습니까?
```

**포커스 그룹 (6-8명, 90분)**
```
주제:
- AI 기능의 장단점
- 학습 패턴의 변화
- 전통적 학습 vs AI 지원 학습
- 미래 기능 아이디어
```

#### 3. 행동 분석 (Behavioral)

```typescript
interface UserBehavior {
  // 사용 패턴
  dailyActiveTime: number[];
  featureUsageFrequency: Record<string, number>;
  
  // 참여도
  questionsAsked: number;
  quizzesTaken: number;
  collaborationSessions: number;
  
  // 학습 패턴
  averageSessionLength: number;
  pausePoints: number[]; // 어디서 멈췄는지
  repeatSections: number[]; // 반복 학습 구간
  
  // 성과
  quizScores: number[];
  improvementRate: number;
}
```

### 📊 분석 방법

**정량 분석:**
```python
import pandas as pd
import scipy.stats as stats

# 1. 기술 통계
df['sus_score'].describe()

# 2. 상관 분석
correlation = df[['usefulness', 'ease_of_use', 'satisfaction']].corr()

# 3. 회귀 분석
from sklearn.linear_model import LinearRegression

X = df[['usefulness', 'ease_of_use', 'personalization']]
y = df['satisfaction']

model = LinearRegression()
model.fit(X, y)

print(f"R² = {model.score(X, y)}")
print(f"Coefficients: {model.coef_}")
```

**정성 분석:**
```python
# Thematic Analysis (주제 분석)

# 1. 인터뷰 전사본 코딩
codes = {
    'positive': ['유용하다', '도움이 된다', '좋다'],
    'negative': ['불편하다', '부정확하다', '느리다'],
    'suggestions': ['~하면 좋겠다', '개선', '추가'],
}

# 2. 주제 추출
themes = [
    '정확도와 신뢰성',
    '사용 편의성',
    '학습 효과',
    '개인화',
    '협업 기능',
]

# 3. 빈도 분석
for theme in themes:
    count = count_mentions(transcripts, theme)
    sentiment = analyze_sentiment(transcripts, theme)
```

---

## 📋 전체 실험 일정

```
Week 1-2: 데이터 수집 및 준비
- 강의 녹음 수집
- Ground truth 생성
- 질문 데이터셋 구축

Week 3-4: 실험 1 (Whisper vs Web Speech)
- 전사 실행
- WER 계산
- 결과 분석

Week 5-6: 실험 2 (하이브리드 검색)
- 검색 전략 테스트
- 메트릭 수집
- 최적화

Week 7-8: 실험 3 (Multi-modal RAG)
- Vision API 통합
- 정확도 평가
- 비용 분석

Week 9-12: 실험 4 (개인화 효과)
- 사용자 모집
- 4주 학습 기간
- 사전/사후 평가

Week 13-14: 실험 5 (UX 평가)
- 설문 조사
- 인터뷰 수행
- 분석

Week 15-16: 논문 작성
- 결과 정리
- 시각화
- 초고 작성

Week 17-18: 리뷰 및 수정
- 동료 리뷰
- 피드백 반영
- 최종 제출
```

---

## 📊 예상 논문 구조

```
Title: "SyncNapse: An AI-Enhanced Collaborative Learning Platform 
        for Real-time Lecture Note Generation"

Abstract (250 words)
- Background, Methods, Results, Conclusion

1. Introduction (2 pages)
   - Motivation
   - Research Questions
   - Contributions

2. Related Work (3 pages)
   - Speech Recognition in Education
   - RAG Systems
   - Personalized Learning
   - Collaborative Learning Platforms

3. System Design (4 pages)
   - Architecture
   - AI Components
   - Implementation

4. Experiments (8 pages)
   4.1 Speech Recognition Evaluation
   4.2 Hybrid Search Evaluation
   4.3 Multi-modal RAG Evaluation
   4.4 Personalization Effect Study
   4.5 User Experience Study

5. Results (6 pages)
   - Quantitative Results
   - Qualitative Findings
   - Discussion

6. Limitations (1 page)

7. Conclusion & Future Work (1 page)

References (2 pages)

Total: ~25 pages
```

---

## 🎓 통계적 유의성

### Power Analysis (검정력 분석)

```r
library(pwr)

# t-test에 필요한 샘플 크기
# 효과 크기 d = 0.5 (중간)
# 유의수준 α = 0.05
# 검정력 1-β = 0.80

pwr.t.test(
  d = 0.5,
  sig.level = 0.05,
  power = 0.80,
  type = "two.sample"
)

# 결과: 그룹당 n ≈ 64명 필요
```

### 다중 비교 보정

```r
# Bonferroni 보정
alpha_adjusted = 0.05 / number_of_tests

# 예: 5개 실험 → α = 0.05 / 5 = 0.01
```

---

## 📝 체크리스트

### 실험 시작 전
- [ ] IRB 승인 (사람 대상 연구)
- [ ] 참가자 동의서
- [ ] 데이터 수집 계획
- [ ] 평가 도구 준비
- [ ] 파일럿 테스트

### 실험 중
- [ ] 데이터 백업
- [ ] 중간 점검
- [ ] 이상치 확인
- [ ] 참가자 문의 대응

### 실험 후
- [ ] 데이터 정제
- [ ] 통계 분석
- [ ] 시각화
- [ ] 논문 작성
- [ ] 코드/데이터 공개 (옵션)

---

**작성일**: 2025-12-07  
**버전**: 1.0  
**연락처**: AI Research Team

