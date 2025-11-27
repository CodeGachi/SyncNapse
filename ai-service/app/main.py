from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from app.models.schemas import (
    AskRequest, AskResponse,
    SummaryRequest, SummaryResponse,
    QuizRequest, QuizResponse,
    HealthResponse
)
from app.services.rag_service import RAGService

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI 앱 생성
app = FastAPI(
    title="SyncNapse AI Service",
    description="RAG 기반 AI 챗봇 서비스 (퀴즈, 요약, 질문답변)",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 제한 필요
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RAG 서비스 초기화 (앱 시작 시 한 번만)
rag_service = None


@app.on_event("startup")
async def startup_event():
    """앱 시작 시 실행"""
    global rag_service
    logger.info("🚀 Starting SyncNapse AI Service...")
    
    # OpenAI API 키 확인
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your_openai_api_key_here":
        logger.warning("⚠️ OPENAI_API_KEY가 설정되지 않았습니다!")
    
    # RAG 서비스 초기화
    rag_service = RAGService()
    logger.info("✅ RAG Service initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """앱 종료 시 실행"""
    logger.info("👋 Shutting down SyncNapse AI Service...")


@app.get("/", response_model=HealthResponse)
async def root():
    """루트 엔드포인트"""
    return {
        "status": "healthy",
        "message": "SyncNapse AI Service is running"
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "message": "OK"
    }


@app.post("/api/ai/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """
    질문에 답변하기
    
    - **note_id**: 노트 ID (예: note-001)
    - **question**: 질문 내용
    """
    try:
        logger.info(f"[ASK] Request - note_id: {request.note_id}, question: {request.question[:50]}...")
        
        answer = await rag_service.ask(request.note_id, request.question)
        
        return {"answer": answer}
        
    except ValueError as e:
        logger.error(f"[ASK] ValueError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[ASK] Error: {e}")
        raise HTTPException(status_code=500, detail=f"질문 처리 중 오류가 발생했습니다: {str(e)}")


@app.post("/api/ai/summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest):
    """
    강의 내용 요약하기
    
    - **note_id**: 노트 ID (예: note-001)
    - **lines**: 요약할 줄 수 (기본: 3, 최소: 1, 최대: 10)
    """
    try:
        logger.info(f"[SUMMARY] Request - note_id: {request.note_id}, lines: {request.lines}")
        
        summary = await rag_service.summarize(request.note_id, request.lines)
        
        return {"summary": summary}
        
    except ValueError as e:
        logger.error(f"[SUMMARY] ValueError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[SUMMARY] Error: {e}")
        raise HTTPException(status_code=500, detail=f"요약 생성 중 오류가 발생했습니다: {str(e)}")


@app.post("/api/ai/quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """
    퀴즈 생성하기
    
    - **note_id**: 노트 ID (예: note-001)
    - **count**: 퀴즈 문제 수 (기본: 5, 최소: 1, 최대: 10)
    """
    try:
        logger.info(f"[QUIZ] Request - note_id: {request.note_id}, count: {request.count}")
        
        quizzes = await rag_service.generate_quiz(request.note_id, request.count)
        
        return {"quizzes": quizzes}
        
    except ValueError as e:
        logger.error(f"[QUIZ] ValueError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[QUIZ] Error: {e}")
        raise HTTPException(status_code=500, detail=f"퀴즈 생성 중 오류가 발생했습니다: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

