import os
import logging
from typing import Dict
from llama_index.core import VectorStoreIndex, Document, Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

from app.utils.database import DatabaseService, FileService
from app.utils.pdf_service import PDFService

logger = logging.getLogger(__name__)


class RAGService:
    """RAG (Retrieval-Augmented Generation) 서비스"""
    
    def __init__(self):
        # OpenAI API 키 확인
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key or self.api_key == "your_openai_api_key_here":
            logger.warning("⚠️ OPENAI_API_KEY가 설정되지 않았습니다!")
        else:
            logger.info("✅ OpenAI API 키 확인됨")
        
        # LlamaIndex 설정
        Settings.llm = OpenAI(
            model="gpt-4o-mini",
            api_key=self.api_key,
            temperature=0.7
        )
        Settings.embed_model = OpenAIEmbedding(
            model="text-embedding-3-small",
            api_key=self.api_key
        )
        
        # 인덱스 캐시 (메모리)
        self.index_cache: Dict[str, VectorStoreIndex] = {}
        
        # 서비스 초기화
        self.db = DatabaseService()
        self.file_service = FileService()
        self.pdf_service = PDFService()
        
        logger.info("RAGService initialized")
    
    async def get_or_create_index(self, note_id: str) -> VectorStoreIndex:
        """
        인덱스 가져오기 또는 생성
        PDF 파일이 있으면 PDF 기반, 없으면 전사 데이터 기반
        
        Args:
            note_id: 노트 ID
            
        Returns:
            VectorStoreIndex 인스턴스
        """
        # 캐시 확인
        if note_id in self.index_cache:
            logger.info(f"✅ Cache hit for note_id: {note_id}")
            return self.index_cache[note_id]
        
        logger.info(f"📦 Creating new index for note_id: {note_id}")
        
        # 1. 노트 정보 가져오기
        note_info = await self.db.get_note_info(note_id)
        if not note_info:
            raise ValueError(f"노트 ID '{note_id}'를 찾을 수 없습니다.")
        
        # 2. PDF 파일이 있으면 PDF 기반, 없으면 전사 데이터 기반
        source_file_url = note_info.get("sourceFileUrl")
        
        # PDF 파일 URL 체크: .pdf로 끝나거나 /download 엔드포인트인 경우
        is_pdf = False
        if source_file_url:
            is_pdf = (source_file_url.endswith('.pdf') or 
                     '/download' in source_file_url or
                     'pdf' in source_file_url.lower())
        
        if is_pdf:
            logger.info(f"[INDEX] PDF 파일 발견: {source_file_url}")
            index = await self._create_index_from_pdf(note_id, source_file_url)
        else:
            logger.info(f"[INDEX] PDF 없음. 전사 데이터 사용")
            index = await self._create_index_from_transcripts(note_id)
        
        # 캐시에 저장
        self.index_cache[note_id] = index
        logger.info(f"✅ Index created and cached for note_id: {note_id}")
        
        return index
    
    async def _create_index_from_pdf(self, note_id: str, pdf_url: str) -> VectorStoreIndex:
        """
        PDF 파일로부터 인덱스 생성
        """
        try:
            # PDF에서 텍스트 추출
            logger.info(f"[PDF] Extracting text from: {pdf_url}")
            pdf_text = await self.pdf_service.extract_text_from_url(pdf_url)
            
            if not pdf_text or len(pdf_text.strip()) < 50:
                raise ValueError("PDF에서 충분한 텍스트를 추출할 수 없습니다.")
            
            logger.info(f"[PDF] Extracted {len(pdf_text)} characters")
            
            # Document 생성 (페이지별로 분할)
            documents = []
            pdf_pages = pdf_text.split("--- Page ")
            
            for i, page_text in enumerate(pdf_pages):
                if page_text.strip():
                    doc = Document(
                        text=page_text.strip(),
                        metadata={
                            "note_id": note_id,
                            "source": "pdf",
                            "page": i
                        }
                    )
                    documents.append(doc)
            
            logger.info(f"[PDF] Created {len(documents)} documents from PDF")
            
            # 인덱스 생성
            index = VectorStoreIndex.from_documents(documents)
            logger.info(f"[PDF] ✅ Index created from PDF")
            
            return index
            
        except Exception as e:
            logger.error(f"[PDF] Error creating index from PDF: {e}")
            raise ValueError(f"PDF 인덱싱 중 오류: {str(e)}")
    
    async def _create_index_from_transcripts(self, note_id: str) -> VectorStoreIndex:
        """
        전사 데이터로부터 인덱스 생성 (음성 녹음 기반)
        """
        try:
            # DB에서 전사 데이터 가져오기
            transcripts = await self.db.get_transcripts(note_id)
            
            if not transcripts:
                raise ValueError(
                    f"노트 ID '{note_id}'에 대한 전사 데이터가 없습니다. "
                    "PDF 파일을 업로드하거나 오디오를 녹음해주세요."
                )
            
            logger.info(f"[TRANSCRIPT] Loaded {len(transcripts)} segments")
            
            # Document 생성
            documents = []
            for transcript in transcripts:
                doc = Document(
                    text=transcript["text"],
                    metadata={
                        "note_id": note_id,
                        "source": "transcript",
                        "start_sec": float(transcript["startSec"]),
                        "end_sec": float(transcript["endSec"]),
                    }
                )
                documents.append(doc)
            
            # 인덱스 생성
            index = VectorStoreIndex.from_documents(documents)
            logger.info(f"[TRANSCRIPT] ✅ Index created from transcripts")
            
            return index
            
        except Exception as e:
            logger.error(f"[TRANSCRIPT] Error: {e}")
            raise
    
    async def ask(self, note_id: str, question: str, use_pdf: bool = True) -> str:
        """
        질문에 답변하기
        
        Args:
            note_id: 노트 ID
            question: 질문 내용
            use_pdf: PDF 사용 여부 (기본값: True)
            
        Returns:
            AI 답변
        """
        logger.info(f"[ASK] note_id={note_id}, question={question[:50]}..., use_pdf={use_pdf}")
        
        try:
            # 인덱스 가져오기 (PDF 또는 전사 자동 선택)
            index = await self.get_or_create_index(note_id)
            
            # 쿼리 엔진 생성
            query_engine = index.as_query_engine()
            
            # 프롬프트 구성
            prompt = f"""다음 질문에 한국어로 친절하게 답변해주세요.
강의 자료를 바탕으로 정확하게 답변하되, 자료에서 다루지 않은 내용이라면 그렇게 말씀해주세요.

질문: {question}

답변:"""
            
            # 쿼리 실행
            response = query_engine.query(prompt)
            
            answer = str(response)
            logger.info(f"[ASK] Answer generated ({len(answer)} chars)")
            
            return answer
            
        except Exception as e:
            logger.error(f"[ASK] Error: {e}")
            raise
    
    async def summarize(self, note_id: str, lines: int = 3, use_pdf: bool = True) -> str:
        """
        강의 내용 요약
        
        Args:
            note_id: 노트 ID
            lines: 요약할 줄 수
            use_pdf: PDF 사용 여부 (기본값: True)
            
        Returns:
            요약 내용
        """
        logger.info(f"[SUMMARY] note_id={note_id}, lines={lines}, use_pdf={use_pdf}")
        
        try:
            # 인덱스 가져오기
            index = await self.get_or_create_index(note_id)
            
            # 쿼리 엔진 생성
            query_engine = index.as_query_engine()
            
            # 프롬프트 구성
            prompt = f"""이 강의 자료의 내용을 정확히 {lines}줄로 요약해주세요.

규칙:
- 정확히 {lines}개의 문장으로 작성
- 각 문장은 "1. ", "2. ", "3. " 등으로 시작
- 강의의 핵심 개념과 중요한 내용 위주로 작성
- 한국어로 작성
- 번호와 함께 핵심만 간결하게

요약:"""
            
            # 쿼리 실행
            response = query_engine.query(prompt)
            
            summary = str(response)
            logger.info(f"[SUMMARY] Summary generated ({len(summary)} chars)")
            
            return summary
            
        except Exception as e:
            logger.error(f"[SUMMARY] Error: {e}")
            raise
    
    async def generate_quiz(self, note_id: str, count: int = 5, use_pdf: bool = True) -> list:
        """
        퀴즈 생성
        
        Args:
            note_id: 노트 ID
            count: 퀴즈 문제 수
            use_pdf: PDF 사용 여부 (기본값: True)
            
        Returns:
            퀴즈 리스트
        """
        logger.info(f"[QUIZ] note_id={note_id}, count={count}, use_pdf={use_pdf}")
        
        try:
            # 인덱스 가져오기
            index = await self.get_or_create_index(note_id)
            
            # 쿼리 엔진 생성
            query_engine = index.as_query_engine()
            
            # 프롬프트 구성
            prompt = f"""이 강의 자료를 바탕으로 객관식 퀴즈 {count}개를 생성해주세요.

반드시 다음 JSON 형식으로 응답해주세요 (다른 텍스트 없이 JSON만):
[
  {{
    "question": "문제 내용",
    "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
    "correct_answer": 0,
    "explanation": "정답 해설"
  }}
]

규칙:
- 강의에서 다룬 핵심 개념을 중심으로 문제 출제
- 각 문제는 반드시 4개의 선택지를 가짐
- correct_answer는 0부터 시작하는 인덱스 (0, 1, 2, 3 중 하나)
- explanation은 왜 그것이 정답인지 설명
- 난이도는 중간 정도로
- 반드시 JSON 배열 형식으로만 응답
- 한국어로 작성"""
            
            # 쿼리 실행
            response = query_engine.query(prompt)
            
            response_text = str(response)
            logger.debug(f"[QUIZ] Raw response: {response_text[:200]}...")
            
            # JSON 파싱 시도
            import json
            import re
            
            # JSON 배열 추출
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                json_str = json_match.group(0)
                quizzes = json.loads(json_str)
                
                # 유효성 검사
                valid_quizzes = []
                for quiz in quizzes:
                    if (isinstance(quiz, dict) and
                        'question' in quiz and
                        'options' in quiz and
                        'correct_answer' in quiz and
                        'explanation' in quiz and
                        len(quiz['options']) == 4):
                        valid_quizzes.append(quiz)
                
                logger.info(f"[QUIZ] Generated {len(valid_quizzes)} valid quizzes")
                return valid_quizzes[:count]
            else:
                logger.warning("[QUIZ] No JSON found in response, using fallback")
                return self._generate_fallback_quiz(count)
                
        except Exception as e:
            logger.error(f"[QUIZ] Error: {e}")
            return self._generate_fallback_quiz(count)
    
    def _generate_fallback_quiz(self, count: int) -> list:
        """Fallback 퀴즈 생성"""
        logger.warning(f"[QUIZ] Generating {count} fallback quizzes")
        
        quizzes = []
        for i in range(count):
            quizzes.append({
                "question": f"AI가 퀴즈를 생성하는 중 오류가 발생했습니다. (문제 {i+1})",
                "options": [
                    "다시 시도해주세요",
                    "다른 노트를 선택해보세요",
                    "퀴즈 개수를 줄여보세요",
                    "잠시 후 다시 시도해주세요"
                ],
                "correct_answer": 0,
                "explanation": "AI가 퀴즈를 생성하는 중 형식 오류가 발생했습니다. 다시 시도해주세요."
            })
        
        return quizzes
