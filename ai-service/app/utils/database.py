import asyncpg
import os
import logging
from typing import List, Dict
from urllib.parse import urlparse, parse_qs

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
    
    async def get_transcripts(self, note_id: str) -> List[Dict]:
        """
        노트의 전사 데이터 가져오기
        
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

