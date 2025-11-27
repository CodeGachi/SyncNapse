import os
import logging
import httpx
import aiofiles
from typing import Optional
from PyPDF2 import PdfReader
from io import BytesIO

logger = logging.getLogger(__name__)


class PDFService:
    """PDF 파일 다운로드 및 텍스트 추출 서비스"""
    
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL", "").split('?')[0]
        logger.info("PDFService initialized")
    
    async def get_pdf_url_from_db(self, note_id: str) -> Optional[str]:
        """
        DB에서 노트의 PDF 파일 URL 가져오기
        
        Args:
            note_id: 노트 ID
            
        Returns:
            PDF 파일 URL 또는 None
        """
        import asyncpg
        
        conn = None
        try:
            conn = await asyncpg.connect(self.db_url)
            
            # LectureNote의 sourceFileUrl 가져오기
            row = await conn.fetchrow(
                'SELECT "sourceFileUrl" FROM "LectureNote" WHERE id = $1',
                note_id
            )
            
            if row and row["sourceFileUrl"]:
                logger.info(f"Found PDF URL for note_id: {note_id}")
                return row["sourceFileUrl"]
            
            # File 테이블에서도 확인
            file_row = await conn.fetchrow(
                '''
                SELECT url FROM "File" 
                WHERE "noteId" = $1 AND "fileType" LIKE '%pdf%' 
                LIMIT 1
                ''',
                note_id
            )
            
            if file_row and file_row["url"]:
                logger.info(f"Found PDF in File table for note_id: {note_id}")
                return file_row["url"]
            
            logger.warning(f"No PDF found for note_id: {note_id}")
            return None
            
        except Exception as e:
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                await conn.close()
    
    async def download_pdf(self, url: str) -> bytes:
        """
        PDF 파일 다운로드
        
        Args:
            url: PDF 파일 URL
            
        Returns:
            PDF 파일 바이너리 데이터
        """
        logger.info(f"Downloading PDF from: {url}")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            logger.info(f"Downloaded PDF: {len(response.content)} bytes")
            return response.content
    
    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """
        PDF에서 텍스트 추출
        
        Args:
            pdf_bytes: PDF 파일 바이너리 데이터
            
        Returns:
            추출된 텍스트
        """
        try:
            pdf_file = BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)
            
            text = ""
            for page_num, page in enumerate(reader.pages):
                page_text = page.extract_text()
                text += f"\n\n--- Page {page_num + 1} ---\n\n{page_text}"
            
            logger.info(f"Extracted text from PDF: {len(text)} characters, {len(reader.pages)} pages")
            return text.strip()
            
        except Exception as e:
            logger.error(f"PDF text extraction error: {e}")
            raise ValueError(f"PDF 텍스트 추출 실패: {str(e)}")
    
    async def get_pdf_text(self, note_id: str) -> str:
        """
        노트 ID로 PDF 텍스트 가져오기 (전체 프로세스)
        
        Args:
            note_id: 노트 ID
            
        Returns:
            PDF 텍스트 내용
        """
        # 1. DB에서 PDF URL 찾기
        pdf_url = await self.get_pdf_url_from_db(note_id)
        if not pdf_url:
            raise ValueError(f"노트 ID '{note_id}'에 대한 PDF 파일을 찾을 수 없습니다.")
        
        # 2. PDF 다운로드
        pdf_bytes = await self.download_pdf(pdf_url)
        
        # 3. 텍스트 추출
        text = self.extract_text_from_pdf(pdf_bytes)
        
        return text
