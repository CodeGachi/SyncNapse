import asyncpg
import os
import logging
from typing import List, Dict, Optional
import httpx

logger = logging.getLogger(__name__)


class DatabaseService:
    """PostgreSQL 데이터베이스 서비스"""
    
    def __init__(self):
        # DATABASE_URL에서 schema 파라미터 제거
        raw_url = os.getenv(
            "DATABASE_URL",
            "postgresql://sn2025:f8643fd87f1a62d84dd49463ef05ec4deba737bf2a4ac4c97ec6fed0fa538f22@postgres:5432/syncnapse"
        )
        
        # ?schema=public 제거
        self.db_url = raw_url.split('?')[0] if '?' in raw_url else raw_url
        
        logger.info(f"Database URL configured: {self.db_url[:50]}...")
    
    async def get_note_info(self, note_id: str) -> Optional[Dict]:
        """
        노트 정보 가져오기 (PDF URL 포함)
        
        Args:
            note_id: 노트 ID
            
        Returns:
            노트 정보 (id, title, sourceFileUrl 등)
        """
        conn = None
        try:
            conn = await asyncpg.connect(self.db_url)
            
            row = await conn.fetchrow(
                '''
                SELECT id, title, "sourceFileUrl", type
                FROM "LectureNote" 
                WHERE id = $1
                ''',
                note_id
            )
            
            if not row:
                return None
            
            # sourceFileUrl이 temp://이면 실제 파일 정보를 가져옴
            source_file_url = row["sourceFileUrl"]
            
            if source_file_url and source_file_url.startswith("temp://"):
                logger.info(f"[DB] temp:// URL detected, fetching actual file from database")
                # 노트의 첫 번째 PDF 파일 찾기
                files = await self.get_note_files(note_id)
                pdf_files = [f for f in files if f.get("fileType", "").lower().endswith("pdf")]
                
                if pdf_files:
                    file_info = pdf_files[0]
                    # storageKey를 사용하여 MinIO URL 생성
                    storage_key = file_info.get("storageKey")
                    if storage_key:
                        # MinIO 버킷 이름 가져오기
                        bucket = os.getenv("STORAGE_BUCKET", "syncnapse-files")
                        # Docker 내부에서는 syncnapse-minio 사용
                        source_file_url = f"http://syncnapse-minio:9000/{bucket}/{storage_key}"
                        logger.info(f"[DB] Using storageKey URL: {source_file_url}")
                    else:
                        logger.warning(f"[DB] No storageKey found for file")
            
            note_info = {
                "id": row["id"],
                "title": row["title"],
                "sourceFileUrl": source_file_url,
                "type": row["type"]
            }
            
            logger.info(f"Loaded note info: {note_info['title']}")
            return note_info
            
        except Exception as e:
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                await conn.close()
    
    async def get_note_files(self, note_id: str) -> List[Dict]:
        """
        노트의 파일 목록 가져오기
        
        Args:
            note_id: 노트 ID
            
        Returns:
            파일 메타데이터 리스트
        """
        conn = None
        try:
            conn = await asyncpg.connect(self.db_url)
            
            rows = await conn.fetch(
                '''
                SELECT id, "noteId", "fileName", "fileType", "fileSize", 
                       "storageUrl", "storageKey", "uploadedAt"
                FROM "File" 
                WHERE "noteId" = $1 
                ORDER BY "uploadedAt" ASC
                ''',
                note_id
            )
            
            files = [
                {
                    "id": row["id"],
                    "noteId": row["noteId"],
                    "fileName": row["fileName"],
                    "fileType": row["fileType"],
                    "fileSize": row["fileSize"],
                    "storageUrl": row["storageUrl"],
                    "storageKey": row["storageKey"],
                    "uploadedAt": row["uploadedAt"]
                }
                for row in rows
            ]
            
            logger.info(f"Loaded {len(files)} files for note_id: {note_id}")
            return files
            
        except Exception as e:
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                await conn.close()
    
    async def get_transcripts(self, note_id: str) -> List[Dict]:
        """
        노트의 전사 데이터 가져오기 (음성 기반)
        
        Args:
            note_id: 노트 ID
            
        Returns:
            전사 세그먼트 리스트
        """
        conn = None
        try:
            conn = await asyncpg.connect(self.db_url)
            
            rows = await conn.fetch(
                '''
                SELECT "startSec", "endSec", text 
                FROM "TranscriptSegment" 
                WHERE "noteId" = $1 
                ORDER BY "startSec" ASC
                ''',
                note_id
            )
            
            transcripts = [
                {
                    "startSec": row["startSec"],
                    "endSec": row["endSec"],
                    "text": row["text"]
                }
                for row in rows
            ]
            
            logger.info(f"Loaded {len(transcripts)} transcripts for note_id: {note_id}")
            return transcripts
            
        except Exception as e:
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                await conn.close()


class FileService:
    """파일 다운로드 및 처리 서비스"""
    
    def __init__(self):
        self.backend_url = os.getenv("BACKEND_URL", "http://backend:4000")
        logger.info(f"Backend URL: {self.backend_url}")
    
    async def download_file(self, file_url: str) -> bytes:
        """
        파일 다운로드
        
        Args:
            file_url: 파일 URL (MinIO/S3)
            
        Returns:
            파일 바이트 데이터
        """
        try:
            # URL이 상대 경로면 절대 경로로 변환
            if file_url.startswith('/'):
                full_url = f"{self.backend_url}{file_url}"
            else:
                full_url = file_url
            
            logger.info(f"Downloading file from: {full_url[:80]}...")
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(full_url)
                response.raise_for_status()
                
            logger.info(f"Downloaded {len(response.content)} bytes")
            return response.content
            
        except Exception as e:
            logger.error(f"File download error: {e}")
            raise
