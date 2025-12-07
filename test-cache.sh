#!/bin/bash

# 테스트 스크립트: AI 캐싱 기능 검증

echo "=== AI 캐싱 테스트 시작 ==="
echo ""

# 노트 ID (실제 존재하는 노트 ID로 변경 필요)
NOTE_ID="note-001"

echo "📌 노트 ID: $NOTE_ID"
echo ""

# 첫 번째 질문
echo "1️⃣ 첫 번째 질문 (Cache MISS 예상)"
echo "질문: 이 강의의 주요 내용은?"
echo "⏱️  시작 시간: $(date +%T)"
START1=$(date +%s.%N)

curl -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"lectureNoteId\": \"$NOTE_ID\",
    \"question\": \"이 강의의 주요 내용은?\",
    \"mode\": \"question\"
  }" \
  -w "\n상태 코드: %{http_code}\n" \
  -s | head -n 20

END1=$(date +%s.%N)
DIFF1=$(echo "$END1 - $START1" | bc)
echo "⏱️  종료 시간: $(date +%T)"
echo "⏱️  소요 시간: ${DIFF1}초"
echo ""
echo "---"
echo ""

# 잠시 대기
sleep 2

# 두 번째 질문
echo "2️⃣ 두 번째 질문 (Cache HIT 예상)"
echo "질문: 핵심 개념을 설명해줘"
echo "⏱️  시작 시간: $(date +%T)"
START2=$(date +%s.%N)

curl -X POST http://localhost:4000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"lectureNoteId\": \"$NOTE_ID\",
    \"question\": \"핵심 개념을 설명해줘\",
    \"mode\": \"question\"
  }" \
  -w "\n상태 코드: %{http_code}\n" \
  -s | head -n 20

END2=$(date +%s.%N)
DIFF2=$(echo "$END2 - $START2" | bc)
echo "⏱️  종료 시간: $(date +%T)"
echo "⏱️  소요 시간: ${DIFF2}초"
echo ""
echo "---"
echo ""

# 결과 비교
echo "📊 결과 비교:"
echo "1번 질문 소요 시간: ${DIFF1}초"
echo "2번 질문 소요 시간: ${DIFF2}초"

# 속도 개선 계산
IMPROVEMENT=$(echo "scale=2; $DIFF1 / $DIFF2" | bc)
echo "🚀 속도 개선: ${IMPROVEMENT}배 빠름"
echo ""

echo "✅ 백엔드 로그에서 다음을 확인하세요:"
echo "   1번 질문: [Cache MISS] Creating new index"
echo "   2번 질문: [Cache HIT] Using cached index"

