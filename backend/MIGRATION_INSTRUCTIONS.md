# 마이그레이션 실행 가이드

## ⚠️ 중요: 다음 단계 진행 필요

LiveSession 기능이 업데이트되었습니다. 데이터베이스 스키마를 업데이트하려면 다음 명령어를 실행하세요.

## 실행 명령어

```bash
cd /home/khm9287/workspace/capstone/SyncNapse/backend

# 1. Prisma 클라이언트 재생성
npx prisma generate

# 2. 마이그레이션 생성 및 적용
npx prisma migrate dev --name update_typing_section_and_section_sync

# 3. 애플리케이션 시작
npm run start:dev
```

## 변경 사항

### TypingSection 테이블
- ✅ `userId` 필드 추가 (작성자 식별)
- ✅ `sessionId` 필드 추가 (세션 연결)
- ✅ User 모델과 관계 추가
- ✅ LiveSession 모델과 관계 추가

### SectionSync 테이블
- ✅ `excludeTyping` 필드 추가 (Boolean, default: true)

## 새로운 기능

1. **학생 필기 시스템**
   - 각 학생이 본인만의 TypingSection 작성 가능
   - 교수자의 TypingSection과 분리

2. **세션 종료 후 노트 병합**
   - 공유받은 자료 + 학생 필기를 합쳐서 새 노트 생성
   - `/api/live-sessions/:sessionId/finalize` 엔드포인트 사용

3. **TypingSection 제외 옵션**
   - 자료 공유 시 교수자의 필기를 제외할 수 있음
   - `excludeTyping: true` (기본값)

## 문제 해결

### Prisma 클라이언트 오류
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### 마이그레이션 충돌
```bash
npx prisma migrate status
npx prisma migrate reset  # ⚠️ 개발 환경만!
```

## 문서

- API 문서: `src/modules/live-sessions/LIVESESSION_SETUP.md`
- 모듈 README: `src/modules/live-sessions/README.md`

