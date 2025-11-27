import os
import logging
import tempfile
from typing import List
from pypdf import PdfReader
import httpx

logger = logging.getLogger(__name__)


class PDFService:
    """PDF 파일 처리 서비스 (pypdf 사용)"""
    
    def __init__(self):
        self.backend_url = os.getenv("BACKEND_URL", "http://backend:4000")
        logger.info(f"✅ PDFService initialized - backend: {self.backend_url}")
    
    async def extract_text_from_url(self, pdf_url: str) -> str:
        """
        URL에서 PDF 다운로드 후 텍스트 추출
        
        Args:
            pdf_url: PDF URL (예: http://minio:9000/bucket/file.pdf 또는 /api/storage/file.pdf)
            
        Returns:
            추출된 텍스트 (페이지별 구분)
        """
        try:
            logger.info(f"[PDF] Starting extraction from: {pdf_url[:100]}...")
            
            # 1. PDF 다운로드
            pdf_bytes = await self._download_pdf(pdf_url)
            logger.info(f"[PDF] Downloaded {len(pdf_bytes)} bytes")
            
            # 2. 텍스트 추출
            pdf_text = self._extract_text(pdf_bytes)
            logger.info(f"[PDF] Extracted {len(pdf_text)} characters")
            
            return pdf_text
            
        except Exception as e:
            logger.error(f"[PDF] ❌ Failed to extract text from URL: {e}")
            raise ValueError(f"PDF 텍스트 추출 실패: {str(e)}")
    
    async def _download_pdf(self, url: str) -> bytes:
        """
        PDF 파일 다운로드
        
        Args:
            url: PDF URL (절대 경로 또는 상대 경로)
            
        Returns:
            PDF 바이트 데이터
        """
        try:
            # 상대 경로면 backend URL과 합치기
            if url.startswith('/'):
                full_url = f"{self.backend_url}{url}"
            else:
                full_url = url
            
            # localhost를 Docker 컨테이너 이름으로 변환
            # Docker 내부에서는 localhost가 자기 자신을 가리키므로
            full_url = full_url.replace('http://localhost:9000', 'http://syncnapse-minio:9000')
            full_url = full_url.replace('http://127.0.0.1:9000', 'http://syncnapse-minio:9000')
            
            logger.info(f"[PDF] Downloading from: {full_url[:100]}...")
            
            # httpx로 비동기 다운로드 (MinIO 직접 접근은 인증 불필요)
            async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
                response = await client.get(full_url)
                response.raise_for_status()
            
            logger.info(f"[PDF] ✅ Downloaded {len(response.content)} bytes")
            return response.content
            
        except httpx.HTTPError as e:
            logger.error(f"[PDF] ❌ HTTP error during download: {e}")
            raise
        except Exception as e:
            logger.error(f"[PDF] ❌ Download failed: {e}")
            raise
    
    def _extract_text(self, pdf_bytes: bytes) -> str:
        """
        PDF 바이트에서 텍스트 추출
        
        Args:
            pdf_bytes: PDF 파일 바이트 데이터
            
        Returns:
            페이지별로 구분된 전체 텍스트
        """
        temp_path = None
        try:
            # 임시 파일에 저장
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_file.write(pdf_bytes)
                temp_path = temp_file.name
            
            logger.info(f"[PDF] Created temp file: {temp_path}")
            
            # pypdf로 PDF 읽기
            reader = PdfReader(temp_path)
            num_pages = len(reader.pages)
            logger.info(f"[PDF] PDF has {num_pages} pages")
            
            # 페이지별 텍스트 추출
            text_parts = []
            for page_num in range(num_pages):
                try:
                    page = reader.pages[page_num]
                    page_text = page.extract_text()
                    
                    if page_text and page_text.strip():
                        # 페이지 구분자 추가
                        text_parts.append(f"--- Page {page_num + 1} ---\n{page_text.strip()}")
                        logger.debug(f"[PDF] Page {page_num + 1}: {len(page_text)} chars")
                    else:
                        logger.warning(f"[PDF] Page {page_num + 1}: No text found")
                        text_parts.append(f"--- Page {page_num + 1} ---\n[텍스트 없음]")
                        
                except Exception as e:
                    logger.warning(f"[PDF] Error extracting page {page_num + 1}: {e}")
                    text_parts.append(f"--- Page {page_num + 1} ---\n[추출 오류]")
            
            # 전체 텍스트 합치기
            full_text = "\n\n".join(text_parts)
            
            if not full_text.strip() or len(full_text.strip()) < 10:
                raise ValueError("PDF에서 유효한 텍스트를 추출할 수 없습니다. 이미지 기반 PDF일 수 있습니다.")
            
            logger.info(f"[PDF] ✅ Successfully extracted {len(full_text)} characters from {num_pages} pages")
            return full_text
            
        except Exception as e:
            logger.error(f"[PDF] ❌ Text extraction failed: {e}")
            raise
            
        finally:
            # 임시 파일 정리
            if temp_path:
                try:
                    os.unlink(temp_path)
                    logger.debug(f"[PDF] Cleaned up temp file: {temp_path}")
                except Exception as e:
                    logger.warning(f"[PDF] Failed to cleanup temp file: {e}")
    
    def extract_text_by_page(self, pdf_bytes: bytes) -> List[str]:
        """
        PDF에서 페이지별로 텍스트 추출 (리스트로 반환)
        
        Args:
            pdf_bytes: PDF 파일 바이트 데이터
            
        Returns:
            페이지별 텍스트 리스트
        """
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_file.write(pdf_bytes)
                temp_path = temp_file.name
            
            reader = PdfReader(temp_path)
            page_texts = []
            
            for page_num in range(len(reader.pages)):
                try:
                    page = reader.pages[page_num]
                    page_text = page.extract_text()
                    
                    if page_text and page_text.strip():
                        page_texts.append(page_text.strip())
                    else:
                        page_texts.append(f"[페이지 {page_num + 1}: 텍스트 없음]")
                        
                except Exception as e:
                    logger.warning(f"Error extracting page {page_num + 1}: {e}")
                    page_texts.append(f"[페이지 {page_num + 1}: 추출 오류]")
            
            logger.info(f"✅ Extracted text from {len(page_texts)} pages")
            return page_texts
            
        except Exception as e:
            logger.error(f"Failed to extract text by page: {e}")
            raise
            
        finally:
            if temp_path:
                try:
                    os.unlink(temp_path)
                except:
                    pass
