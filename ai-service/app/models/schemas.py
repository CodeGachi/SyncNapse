from pydantic import BaseModel, Field
from typing import List, Optional


class AskRequest(BaseModel):
    note_id: str = Field(..., description="노트 ID")
    question: str = Field(..., description="질문 내용")
    use_pdf: bool = Field(default=True, description="PDF 사용 (True) 또는 전사 데이터 사용 (False)")


class SummaryRequest(BaseModel):
    note_id: str = Field(..., description="노트 ID")
    lines: int = Field(default=3, ge=1, le=10, description="요약할 줄 수")
    use_pdf: bool = Field(default=True, description="PDF 사용 (True) 또는 전사 데이터 사용 (False)")


class QuizRequest(BaseModel):
    note_id: str = Field(..., description="노트 ID")
    count: int = Field(default=5, ge=1, le=10, description="퀴즈 문제 수")
    use_pdf: bool = Field(default=True, description="PDF 사용 (True) 또는 전사 데이터 사용 (False)")


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int
    explanation: str


class AskResponse(BaseModel):
    answer: str


class SummaryResponse(BaseModel):
    summary: str


class QuizResponse(BaseModel):
    quizzes: List[QuizQuestion]


class HealthResponse(BaseModel):
    status: str
    message: str

