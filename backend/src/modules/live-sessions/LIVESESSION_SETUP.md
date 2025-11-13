# LiveSession 모듈 설정 가이드

## 🎓 개요

LiveSession은 교수자(Presenter)와 학생(Listener) 간의 실시간 강의 공유를 지원합니다.

### 핵심 기능
1. **교수자의 자료 공유**: TypingSection을 제외한 강의 자료를 실시간으로 학생들과 공유
2. **학생의 필기**: 각 학생이 본인만의 TypingSection을 작성
3. **세션 종료 후 병합**: 공유받은 자료 + 학생의 필기를 합쳐서 학생 소유의 완전한 노트 생성

---

## 구현 완료 항목

✅ **스키마 추가**
- `LiveSession`: 실시간 세션 정보
- `SessionInvite`: 초대 토큰
- `SessionMember`: 세션 참가자
- `SectionSync`: 자료 공유 매핑 (excludeTyping 필드 포함)
- `TypingSection`: userId, sessionId 필드 추가 (작성자 구분)

✅ **권한 검증 로직**
- `assertSessionMember()`: 세션 멤버 검증
- `assertPresenter()`: 발표자 권한 검증

✅ **세션 관리 API** (HAL/HATEOAS 준수)
- `POST /api/live-sessions` - 세션 생성
- `GET /api/live-sessions` - 사용자의 활성 세션 목록
- `GET /api/live-sessions/:sessionId` - 세션 상세 조회
- `POST /api/live-sessions/:sessionId/end` - 세션 종료
- `POST /api/live-sessions/:sessionId/invites` - 초대 토큰 생성
- `POST /api/invites/:token/join` - 초대 토큰으로 참가
- `POST /api/live-sessions/:sessionId/leave` - 세션 나가기
- `GET /api/live-sessions/:sessionId/members` - 세션 멤버 목록

✅ **자료 공유 API**
- `GET /api/live-sessions/:sessionId/shared-notes` - 공유 노트 목록
- `POST /api/live-sessions/:sessionId/shared-notes` - 노트 공유
- `DELETE /api/live-sessions/:sessionId/shared-notes/:noteId` - 공유 해제

✅ **학생 필기 API**
- `POST /api/typing-sections` - 학생 필기 생성
- `PUT /api/typing-sections/:typingSectionId` - 필기 수정
- `DELETE /api/typing-sections/:typingSectionId` - 필기 삭제
- `GET /api/live-sessions/:sessionId/typing-sections` - 본인의 필기 조회

✅ **세션 종료 API**
- `POST /api/live-sessions/:sessionId/finalize` - 학생 노트 생성 (공유자료 + 필기 병합)

---

## 🚀 다음 단계

다음 명령어들을 **순서대로** 실행하세요:

```bash
cd /home/khm9287/workspace/capstone/SyncNapse/backend

# 1. Prisma 클라이언트 재생성
npx prisma generate

# 2. 마이그레이션 생성 및 적용
npx prisma migrate dev --name update_typing_section_and_section_sync

# 3. 애플리케이션 시작
npm run start:dev
```

---

## 📚 API 사용 예제

### 1. 세션 생성 (교수자)

```bash
POST /api/live-sessions
Authorization: Bearer <jwt_token>

{
  "noteId": "note-123",
  "title": "Math Lecture Session",
  "liveblocksRoomId": "session-12345"
}
```

### 2. 초대 토큰 생성 (교수자)

```bash
POST /api/live-sessions/session-1/invites
Authorization: Bearer <jwt_token>

{
  "expiresAt": "2025-11-11T10:00:00Z",
  "maxUses": 50
}
```

### 3. 세션 참가 (학생)

```bash
POST /api/invites/a1b2c3d4.../join
Authorization: Bearer <jwt_token>

{
  "displayName": "Student Name"
}
```

### 4. 노트 공유 (교수자)

**중요**: `excludeTyping: true`로 설정하면 교수자의 TypingSection은 공유되지 않습니다.

```bash
POST /api/live-sessions/session-1/shared-notes
Authorization: Bearer <jwt_token>

{
  "noteId": "note-456",
  "mode": "COPY",
  "excludeTyping": true,  // 기본값 true - 교수자의 필기 제외
  "startSec": 0,
  "endSec": 120,
  "pageNumber": 1
}
```

### 5. 학생 필기 작성

```bash
POST /api/typing-sections
Authorization: Bearer <jwt_token>

{
  "sessionId": "session-1",
  "noteId": "note-456",
  "title": "Chapter 1 Notes",
  "content": "My understanding of the lecture...",
  "startSec": 0,
  "endSec": 60
}
```

### 6. 필기 수정 (학생)

```bash
PUT /api/typing-sections/typing-123
Authorization: Bearer <jwt_token>

{
  "title": "Updated Chapter 1 Notes",
  "content": "Updated content..."
}
```

### 7. 본인 필기 조회 (학생)

```bash
GET /api/live-sessions/session-1/typing-sections
Authorization: Bearer <jwt_token>
```

### 8. 세션 종료 후 노트 생성 (학생)

**중요**: 이 API를 호출하면 공유받은 자료 + 학생의 필기가 합쳐진 새로운 노트가 생성됩니다.

```bash
POST /api/live-sessions/session-1/finalize
Authorization: Bearer <jwt_token>

{
  "noteTitle": "Math Lecture - My Notes",
  "folderId": "folder-789"  // optional
}
```

**응답 예시**:
```json
{
  "note": {
    "id": "note-new-123",
    "title": "Math Lecture - My Notes",
    "sourceFileUrl": "...",
    "audioFileUrl": "..."
  },
  "copiedContent": {
    "transcriptsCount": 45,
    "translationsCount": 45,
    "materialPagesCount": 20,
    "typingSectionsCount": 5
  }
}
```

---

## 🔐 권한 체계

### Presenter (교수자)
- 세션 생성/종료
- 초대 토큰 생성
- 노트 공유/해제 (excludeTyping 설정 가능)
- 모든 Listener 권한

### Listener (학생)
- 세션 참가/나가기
- 공유 노트 목록 조회 (읽기 전용, TypingSection 제외)
- 멤버 목록 조회
- **본인의 TypingSection 생성/수정/삭제**
- **세션 종료 후 본인 노트 생성** (공유자료 + 본인 필기 병합)

---

## 🎯 Liveblocks 연동

프론트엔드에서:

```typescript
// 1. 세션 생성 시 roomId 생성
const roomId = `session-${sessionId}`;

// 2. RoomProvider 설정
<RoomProvider
  id={session.liveblocksRoomId}
  initialPresence={{
    userName: user.displayName,
    userId: user.id,
    role: memberRole, // 'presenter' | 'listener'
  }}
>
  {/* 노트 컴포넌트 */}
</RoomProvider>

// 3. 권한별 UI 분기
if (role === 'presenter') {
  // 편집 가능
} else {
  // 읽기 전용
}
```

---

## 💾 데이터 모델

### LiveSession
- `id`, `noteId`, `presenterId`, `title`
- `liveblocksRoomId`, `isActive`
- `startedAt`, `endedAt`

### SessionInvite
- `id`, `sessionId`, `token`
- `expiresAt`, `maxUses`, `usedCount`
- `isActive`

### SessionMember
- `id`, `sessionId`, `userId`
- `role` ('presenter' | 'listener')
- `displayName`, `joinedAt`, `leftAt`

### SectionSync (공유 자료 매핑)
- `id`, `sessionId`, `noteId`
- `mode` ('LINK' | 'COPY')
- **`excludeTyping` (Boolean, default: true)** - TypingSection 제외 여부
- `startSec`, `endSec`, `pageNumber`

### TypingSection (필기)
- `id`, `noteId`, `chunkId`
- **`userId`** - 작성자 ID
- **`sessionId`** - 연결된 세션 (optional)
- `title`, `content`
- `startSec`, `endSec`

---

## 🔧 문제 해결

### Prisma 클라이언트 오류
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### 마이그레이션 충돌
```bash
npx prisma migrate status
npx prisma migrate reset  # 개발 환경만!
```

---
