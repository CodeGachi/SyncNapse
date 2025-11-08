# Backend API Specification

Frontend에서 Backend로 동기화할 때 사용하는 API 엔드포인트 명세입니다.

---

## 🔐 인증 (Authentication)

모든 API 요청은 인증 토큰이 필요합니다.

### 헤더
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 📁 Folders API

### 1. 폴더 생성
```http
POST /api/folders
Content-Type: application/json

{
  "name": "새 폴더",
  "parent_id": "parent-folder-id" | null
}
```

**Response:**
```json
{
  "id": "folder-uuid",
  "name": "새 폴더",
  "parent_id": "parent-folder-id",
  "created_at": "2025-11-09T12:00:00Z",
  "updated_at": "2025-11-09T12:00:00Z"
}
```

---

### 2. 폴더 업데이트
```http
PATCH /api/folders/{folderId}
Content-Type: application/json

{
  "name": "수정된 이름",          // Optional
  "parent_id": "new-parent-id",   // Optional (이동)
  "updated_at": "2025-11-09T12:00:00Z"
}
```

**Response:**
```json
{
  "id": "folder-uuid",
  "name": "수정된 이름",
  "parent_id": "new-parent-id",
  "updated_at": "2025-11-09T12:05:00Z"
}
```

---

### 3. 폴더 삭제
```http
DELETE /api/folders/{folderId}
```

**Response:**
```json
{
  "success": true,
  "deleted_at": "2025-11-09T12:10:00Z"
}
```

---

## 📝 Notes API

### 1. 노트 생성
```http
POST /api/notes
Content-Type: multipart/form-data

{
  "title": "새 노트",
  "folder_id": "folder-uuid",
  "type": "student" | "educator",
  "created_at": "2025-11-09T12:00:00Z",
  "updated_at": "2025-11-09T12:00:00Z",
  "files": [File, File, ...]  // Optional
}
```

**Response:**
```json
{
  "id": "note-uuid",
  "title": "새 노트",
  "folder_id": "folder-uuid",
  "type": "student",
  "thumbnail": null,
  "created_at": "2025-11-09T12:00:00Z",
  "updated_at": "2025-11-09T12:00:00Z"
}
```

---

### 2. 노트 업데이트
```http
PATCH /api/notes/{noteId}
Content-Type: application/json

{
  "title": "수정된 제목",         // Optional
  "folder_id": "new-folder-id",  // Optional
  "thumbnail": "base64-image",   // Optional
  "updated_at": "2025-11-09T12:05:00Z"
}
```

**Response:**
```json
{
  "id": "note-uuid",
  "title": "수정된 제목",
  "updated_at": "2025-11-09T12:05:00Z"
}
```

---

### 3. 노트 삭제
```http
DELETE /api/notes/{noteId}
```

**Response:**
```json
{
  "success": true,
  "deleted_at": "2025-11-09T12:10:00Z"
}
```

---

### 4. 노트 컨텐츠 저장
```http
POST /api/notes/{noteId}/content
Content-Type: application/json

{
  "page_id": "page-1",
  "blocks": [
    {
      "type": "text",
      "data": { "text": "Hello World" }
    },
    {
      "type": "drawing",
      "data": { "paths": [...] }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "note_id": "note-uuid",
  "page_id": "page-1",
  "saved_at": "2025-11-09T12:15:00Z"
}
```

---

### 5. 노트 컨텐츠 가져오기
```http
GET /api/notes/{noteId}/content/{pageId}
```

**Response:**
```json
{
  "note_id": "note-uuid",
  "page_id": "page-1",
  "blocks": [
    {
      "type": "text",
      "data": { "text": "Hello World" }
    }
  ],
  "updated_at": "2025-11-09T12:15:00Z"
}
```

---

## 📎 Files API

### 1. 파일 업로드
```http
POST /api/notes/{noteId}/files
Content-Type: multipart/form-data

{
  "file": File,
  "file_name": "document.pdf",
  "file_type": "application/pdf",
  "file_size": 1024000,
  "created_at": "2025-11-09T12:00:00Z"
}
```

**Response:**
```json
{
  "id": "file-uuid",
  "note_id": "note-uuid",
  "file_name": "document.pdf",
  "file_type": "application/pdf",
  "file_size": 1024000,
  "url": "https://storage.example.com/files/document.pdf",
  "created_at": "2025-11-09T12:00:00Z"
}
```

---

### 2. 파일 삭제
```http
DELETE /api/files/{fileId}
```

**Response:**
```json
{
  "success": true,
  "deleted_at": "2025-11-09T12:10:00Z"
}
```

---

### 3. 파일 일괄 업로드
```http
POST /api/notes/{noteId}/files/batch
Content-Type: multipart/form-data

{
  "files": [File, File, ...]
}
```

**Response:**
```json
{
  "uploaded": [
    {
      "id": "file-uuid-1",
      "file_name": "doc1.pdf",
      "url": "https://storage.example.com/files/doc1.pdf"
    },
    {
      "id": "file-uuid-2",
      "file_name": "doc2.pdf",
      "url": "https://storage.example.com/files/doc2.pdf"
    }
  ],
  "total": 2
}
```

---

## 🎙️ Recordings API

### 1. 녹음 업로드
```http
POST /api/notes/{noteId}/recordings
Content-Type: multipart/form-data

{
  "file": File (audio),
  "name": "녹음 1",
  "duration": 120,  // seconds
  "created_at": "2025-11-09T12:00:00Z"
}
```

**Response:**
```json
{
  "id": "recording-uuid",
  "note_id": "note-uuid",
  "name": "녹음 1",
  "duration": 120,
  "url": "https://storage.example.com/recordings/audio.webm",
  "created_at": "2025-11-09T12:00:00Z"
}
```

---

### 2. 녹음 삭제
```http
DELETE /api/recordings/{recordingId}
```

**Response:**
```json
{
  "success": true,
  "deleted_at": "2025-11-09T12:10:00Z"
}
```

---

## 🔄 Sync API (배치 동기화)

### 배치 동기화 엔드포인트
Frontend의 동기화 큐에 쌓인 항목들을 한 번에 처리합니다.

```http
POST /api/sync/batch
Content-Type: application/json

{
  "items": [
    {
      "entity_type": "note",
      "entity_id": "note-uuid",
      "operation": "create",
      "data": {
        "title": "새 노트",
        "folder_id": "folder-uuid",
        "type": "student"
      },
      "timestamp": 1699520000000
    },
    {
      "entity_type": "folder",
      "entity_id": "folder-uuid",
      "operation": "update",
      "data": {
        "name": "수정된 폴더"
      },
      "timestamp": 1699520001000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "results": [
    {
      "entity_id": "note-uuid",
      "status": "success",
      "synced_at": "2025-11-09T12:00:00Z"
    },
    {
      "entity_id": "folder-uuid",
      "status": "success",
      "synced_at": "2025-11-09T12:00:01Z"
    }
  ],
  "conflicts": []  // 충돌이 있으면 여기 포함
}
```

---

### 충돌 응답 (Conflict Response)

충돌이 발생한 경우:

```json
{
  "success": true,
  "processed": 1,
  "failed": 0,
  "results": [
    {
      "entity_id": "note-uuid",
      "status": "success"
    }
  ],
  "conflicts": [
    {
      "entity_type": "note",
      "entity_id": "note-uuid-2",
      "local_data": {
        "title": "로컬 제목",
        "updated_at": "2025-11-09T12:00:00Z"
      },
      "remote_data": {
        "title": "서버 제목",
        "updated_at": "2025-11-09T12:05:00Z"
      },
      "conflict_type": "concurrent_update"
    }
  ]
}
```

Frontend는 이 충돌 정보를 받아 `ConflictResolutionModal`을 표시하고 사용자에게 선택을 요청합니다.

---

## 🔐 Authorization

### JWT 토큰 발급
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "user-uuid",
    "name": "홍길동",
    "email": "user@example.com"
  }
}
```

---

### JWT 토큰 갱신
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

---

## ⚠️ 에러 응답 (Error Responses)

### 일반 에러 형식
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error information"
    }
  }
}
```

### 주요 에러 코드

| 코드 | HTTP 상태 | 설명 |
|------|----------|------|
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `CONFLICT` | 409 | 데이터 충돌 |
| `VALIDATION_ERROR` | 422 | 유효성 검사 실패 |
| `INTERNAL_ERROR` | 500 | 서버 에러 |

---

## 📊 Rate Limiting

- **제한**: 100 requests / 분 (사용자당)
- **헤더**:
  ```http
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1699520000
  ```

---

**작성자:** Claude Code
**최종 업데이트:** 2025-11-09
**버전:** v1.0
