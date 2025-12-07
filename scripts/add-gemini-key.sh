#!/bin/bash

ENV_FILE=".env"

echo "🔑 Gemini API 키 추가 스크립트"
echo ""

# .env 파일이 있는지 확인
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env 파일을 찾을 수 없습니다."
    echo "💡 npm run env:sync를 먼저 실행하세요."
    exit 1
fi

# 이미 GEMINI_API_KEY가 설정되어 있는지 확인
if grep -q "^GEMINI_API_KEY=" "$ENV_FILE"; then
    echo "ℹ️  GEMINI_API_KEY가 이미 설정되어 있습니다."
    echo ""
    read -p "덮어쓰시겠습니까? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "취소되었습니다."
        exit 0
    fi
fi

echo ""
echo "Gemini API 키를 입력하세요:"
echo "(https://aistudio.google.com/app/apikey 에서 발급)"
read -r GEMINI_KEY

if [ -z "$GEMINI_KEY" ]; then
    echo "❌ API 키가 비어있습니다."
    exit 1
fi

# 기존 GEMINI_API_KEY 제거
sed -i '/^GEMINI_API_KEY=/d' "$ENV_FILE" 2>/dev/null || true

# 새 키 추가
echo "GEMINI_API_KEY=$GEMINI_KEY" >> "$ENV_FILE"

# GEMINI_MODEL_NAME이 없으면 추가
if ! grep -q "^GEMINI_MODEL_NAME=" "$ENV_FILE"; then
    echo "GEMINI_MODEL_NAME=gemini-1.5-flash" >> "$ENV_FILE"
fi

echo ""
echo "✅ Gemini API 키가 성공적으로 추가되었습니다!"
echo ""
echo "다음 명령어로 서비스를 재시작하세요:"
echo "  npm run dev:all:down && npm run dev:all"
