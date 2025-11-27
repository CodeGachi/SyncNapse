import os
import logging
import tempfile
from typing import List, Tuple
from pypdf import PdfReader
import httpx
from pdf2image import convert_from_path
from PIL import Image
import pytesseract

logger = logging.getLogger(__name__)


class PDFService:
    """PDF 파일 처리 서비스 (pypdf + OCR 지원)"""
    
    def __init__(self):
        self.backend_url = os.getenv("BACKEND_URL", "http://backend:4000")
        self.enable_ocr = os.getenv("ENABLE_OCR", "true").lower() == "true"
        self.ocr_min_text_length = int(os.getenv("OCR_MIN_TEXT_LENGTH", "50"))
        logger.info(f"✅ PDFService initialized - backend: {self.backend_url}, OCR: {self.enable_ocr}")
    
    async def extract_text_from_url(self, pdf_url: str) -> str:
        """
        URL에서 PDF 다운로드 후 텍스트 추출 (필요시 OCR)
        
        Args:
            pdf_url: PDF URL
            
        Returns:
            추출된 텍스트 (페이지별 구분)
        """
        try:
            logger.info(f"[PDF] Starting extraction from: {pdf_url[:100]}...")
            
            # 1. PDF 다운로드
            pdf_bytes = await self._download_pdf(pdf_url)
            logger.info(f"[PDF] Downloaded {len(pdf_bytes)} bytes")
            
            # 2. 텍스트 추출 (OCR 포함)
            pdf_text = self._extract_text_with_ocr(pdf_bytes)
            logger.info(f"[PDF] Extracted {len(pdf_text)} characters")
            
            return pdf_text
            
        except Exception as e:
            logger.error(f"[PDF] ❌ Failed to extract text from URL: {e}")
            raise ValueError(f"PDF 텍스트 추출 실패: {str(e)}")
    
    async def _download_pdf(self, url: str) -> bytes:
        """PDF 파일 다운로드"""
        try:
            # 상대 경로면 backend URL과 합치기
            if url.startswith('/'):
                full_url = f"{self.backend_url}{url}"
            else:
                full_url = url
            
            # localhost를 Docker 컨테이너 이름으로 변환
            full_url = full_url.replace('http://localhost:9000', 'http://syncnapse-minio:9000')
            full_url = full_url.replace('http://127.0.0.1:9000', 'http://syncnapse-minio:9000')
            
            logger.info(f"[PDF] Downloading from: {full_url[:100]}...")
            
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
    
    def _extract_text_with_ocr(self, pdf_bytes: bytes) -> str:
        """PDF 바이트에서 텍스트 추출 (필요시 OCR 적용)"""
        temp_path = None
        try:
            # 임시 파일에 저장
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_file.write(pdf_bytes)
                temp_path = temp_file.name
            
            logger.info(f"[PDF] Created temp file: {temp_path}")
            
            # 1단계: pypdf로 텍스트 추출 시도
            reader = PdfReader(temp_path)
            num_pages = len(reader.pages)
            logger.info(f"[PDF] PDF has {num_pages} pages")
            
            # 페이지별 텍스트 추출
            text_parts = []
            pages_need_ocr = []
            
            for page_num in range(num_pages):
                try:
                    page = reader.pages[page_num]
                    page_text = page.extract_text()
                    
                    if page_text and len(page_text.strip()) >= self.ocr_min_text_length:
                        text_parts.append(f"--- Page {page_num + 1} ---\n{page_text.strip()}")
                        logger.debug(f"[PDF] Page {page_num + 1}: {len(page_text)} chars (text-based)")
                    else:
                        logger.info(f"[PDF] Page {page_num + 1}: Insufficient text, OCR needed")
                        pages_need_ocr.append(page_num)
                        text_parts.append(None)
                        
                except Exception as e:
                    logger.warning(f"[PDF] Error extracting page {page_num + 1}: {e}")
                    pages_need_ocr.append(page_num)
                    text_parts.append(None)
            
            # 2단계: OCR이 필요한 페이지가 있으면 OCR 수행
            if pages_need_ocr and self.enable_ocr:
                logger.info(f"[OCR] Running OCR on {len(pages_need_ocr)} pages")
                ocr_results = self._extract_text_with_ocr_from_file(temp_path, pages_need_ocr)
                
                for page_num, ocr_text in ocr_results:
                    text_parts[page_num] = f"--- Page {page_num + 1} (OCR) ---\n{ocr_text.strip()}"
            elif pages_need_ocr and not self.enable_ocr:
                logger.warning(f"[OCR] {len(pages_need_ocr)} pages need OCR but OCR is disabled")
                for page_num in pages_need_ocr:
                    text_parts[page_num] = f"--- Page {page_num + 1} ---\n[텍스트 없음 - OCR 비활성화됨]"
            
            # None인 항목을 기본 메시지로 변경
            text_parts = [
                part if part is not None else f"--- Page {i + 1} ---\n[텍스트 추출 실패]"
                for i, part in enumerate(text_parts)
            ]
            
            # 전체 텍스트 합치기
            full_text = "\n\n".join(text_parts)
            
            if not full_text.strip() or len(full_text.strip()) < 10:
                raise ValueError("PDF에서 유효한 텍스트를 추출할 수 없습니다.")
            
            logger.info(f"[PDF] ✅ Successfully extracted {len(full_text)} characters from {num_pages} pages")
            return full_text
            
        except Exception as e:
            logger.error(f"[PDF] ❌ Text extraction failed: {e}")
            raise
            
        finally:
            if temp_path:
                try:
                    os.unlink(temp_path)
                    logger.debug(f"[PDF] Cleaned up temp file: {temp_path}")
                except Exception as e:
                    logger.warning(f"[PDF] Failed to cleanup temp file: {e}")
    
    def _extract_text_with_ocr_from_file(self, pdf_path: str, page_numbers: List[int]) -> List[Tuple[int, str]]:
        """지정된 페이지에 대해 OCR 수행"""
        try:
            logger.info(f"[OCR] Converting PDF to images for pages: {page_numbers}")
            
            # PDF를 이미지로 변환
            images = convert_from_path(
                pdf_path,
                dpi=200,
                fmt='PNG',
                thread_count=4
            )
            
            logger.info(f"[OCR] Converted {len(images)} pages to images")
            
            # OCR 수행
            ocr_results = []
            for page_num in page_numbers:
                if page_num >= len(images):
                    logger.warning(f"[OCR] Page {page_num + 1} out of range")
                    ocr_results.append((page_num, "[페이지 범위 초과]"))
                    continue
                
                try:
                    image = images[page_num]
                    
                    # Tesseract OCR 수행
                    ocr_text = pytesseract.image_to_string(
                        image,
                        lang='kor+eng',
                        config='--psm 3 --oem 1'
                    )
                    
                    if ocr_text and ocr_text.strip():
                        ocr_results.append((page_num, ocr_text))
                        logger.info(f"[OCR] Page {page_num + 1}: {len(ocr_text)} chars extracted")
                    else:
                        ocr_results.append((page_num, "[OCR로 텍스트를 찾을 수 없음]"))
                        logger.warning(f"[OCR] Page {page_num + 1}: No text found")
                        
                except Exception as e:
                    logger.error(f"[OCR] Error processing page {page_num + 1}: {e}")
                    ocr_results.append((page_num, f"[OCR 오류: {str(e)}]"))
            
            logger.info(f"[OCR] ✅ Completed OCR for {len(ocr_results)} pages")
            return ocr_results
            
        except Exception as e:
            logger.error(f"[OCR] ❌ OCR processing failed: {e}")
            return [(page_num, f"[OCR 실패: {str(e)}]") for page_num in page_numbers]
