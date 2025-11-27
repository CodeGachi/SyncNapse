FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 설치 (OCR 및 PDF 처리 도구 포함)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    # Poppler (pdf2image를 위한 PDF 변환 도구)
    poppler-utils \
    # Tesseract OCR 및 언어 팩
    tesseract-ocr \
    tesseract-ocr-kor \
    tesseract-ocr-eng \
    # 이미지 처리 라이브러리
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    && rm -rf /var/lib/apt/lists/*

# Tesseract 설치 확인
RUN tesseract --version && \
    tesseract --list-langs

# Python 의존성 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY ./app ./app

# 환경 변수 설정
ENV ENABLE_OCR=true
ENV OCR_MIN_TEXT_LENGTH=50

# 포트 노출
EXPOSE 8000

# 헬스 체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 애플리케이션 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]
