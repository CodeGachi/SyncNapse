# LiveSession 모듈 설정 가이드

## 🎉 복구 완료!

모든 LiveSession 모듈 파일이 성공적으로 복구되었습니다!

## 구현 완료 항목

✅ **스키마 추가**
- `LiveSession`: 실시간 세션 정보
- `SessionInvite`: 초대 토큰
- `SessionMember`: 세션 참가자
- `SectionSync`: 자료 공유 매핑

✅ **권한 검증 로직**
- `assertSessionMember()`: 세션 멤버 검증
- `assertPresenter()`: 발표자 권한 검증

✅ **API 엔드포인트** (HAL/HATEOAS 준수)
- `POST /api/live-sessions` - 세션 생성
- `GET /api/live-sessions` - 사용자의 활성 세션 목록
- `GET /api/live-sessions/:sessionId` - 세션 상세 조회
- `POST /api/live-sessions/:sessionId/end` - 세션 종료
- `POST /api/live-sessions/:sessionId/invites` - 초대 토큰 생성
- `POST /api/invites/:token/join` - 초대 토큰으로 참가
- `POST /api/live-sessions/:sessionId/leave` - 세션 나가기
- `GET /api/live-sessions/:sessionId/members` - 세션 멤버 목록
- `GET /api/live-sessions/:sessionId/shared-notes` - 공유 노트 목록
- `POST /api/live-sessions/:sessionId/shared-notes` - 노트 공유
- `DELETE /api/live-sessions/:sessionId/shared-notes/:noteId` - 공유 해제

---

## 🚀 다음 단계

다음 명령어들을 **순서대로** 실행하세요:

```bash
cd /home/khm9287/workspace/capstone/SyncNapse/backend

# 1. Prisma 클라이언트 재생성
npx prisma generate

# 2. 마이그레이션 생성 및 적용
npx prisma migrate dev --name add_live_session_models

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

### 2. 초대 토큰 생성

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

```bash
POST /api/live-sessions/session-1/shared-notes
Authorization: Bearer <jwt_token>

{
  "noteId": "note-456",
  "mode": "LINK",
  "startSec": 0,
  "endSec": 120,
  "pageNumber": 1
}
```

---

## 🔐 권한 체계

### Presenter (교수자)
- 세션 생성/종료
- 초대 토큰 생성
- 노트 공유/해제
- 모든 Listener 권한

### Listener (학생)
- 세션 참가/나가기
- 공유 노트 목록 조회 (읽기 전용)
- 멤버 목록 조회

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

### SectionSync
- `id`, `sessionId`, `noteId`
- `mode` ('LINK' | 'COPY')
- `startSec`, `endSec`, `pageNumber`

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

## ✨ 완료!

모든 파일이 복구되었습니다. 마이그레이션만 실행하면 바로 사용 가능합니다! 🎉

