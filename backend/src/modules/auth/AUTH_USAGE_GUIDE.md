# Auth 사용 가이드

## 📚 다른 모듈에서 Auth 사용하는 방법

### 1️⃣ **기본 JWT 인증** (가장 많이 사용)

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sessions')
export class SessionsController {
  
  // ✅ 단일 엔드포인트에 인증 적용
  @UseGuards(JwtAuthGuard)
  @Get('list')
  async listSessions() {
    return { message: 'Authenticated user can see this' };
  }
  
  // ❌ 인증 없음 (누구나 접근 가능)
  @Get('public')
  async publicEndpoint() {
    return { message: 'Anyone can see this' };
  }
}
```

### 2️⃣ **컨트롤러 전체에 인증 적용**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// ✅ 컨트롤러 레벨에 적용하면 모든 엔드포인트에 적용
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  
  @Get('list')
  async listSessions() {
    // 모든 엔드포인트가 자동으로 인증 필요
  }
  
  @Post('create')
  async createSession() {
    // 이것도 자동으로 인증 필요
  }
}
```

### 3️⃣ **현재 로그인한 사용자 정보 가져오기**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('users')
export class UsersController {
  
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@CurrentUser() user: { id: string }) {
    // ✅ user.id로 현재 로그인한 사용자 ID 접근
    return { userId: user.id, message: 'This is your profile' };
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('posts')
  async createPost(
    @CurrentUser() user: { id: string },
    @Body() body: { title: string; content: string }
  ) {
    // ✅ user.id를 사용하여 작성자 설정
    return this.db.post.create({
      data: {
        ...body,
        authorId: user.id,
      }
    });
  }
}
```

### 4️⃣ **역할 기반 접근 제어 (Role-Based Access Control)**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ 순서 중요: 먼저 인증, 그 다음 역할 확인
export class AdminController {
  
  @Get('users')
  @Roles('admin') // ✅ admin만 접근 가능
  async listAllUsers() {
    return { message: 'Only admins can see this' };
  }
  
  @Get('moderators')
  @Roles('admin', 'moderator') // ✅ admin 또는 moderator 접근 가능
  async moderatorPanel() {
    return { message: 'Admins and moderators can see this' };
  }
}
```

### 5️⃣ **공유 범위 가드 (Share Scope Guard)** - 질문 기반 접근

```typescript
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ShareScopeGuard } from '../auth/guards/share-scope.guard';
import { ShareScope } from '../auth/share-scope.decorator';

@Controller('notes')
@UseGuards(JwtAuthGuard, ShareScopeGuard)
export class NotesController {
  
  // ✅ 해당 note에 질문을 한 사람만 접근 가능
  @Get(':noteId/materials')
  @ShareScope({ resource: 'note', action: 'read' })
  async getMaterials(@Param('noteId') noteId: string) {
    return { message: 'You can see this because you asked a question on this note' };
  }
  
  // ✅ audio 리소스 접근
  @Get('audio/:audioId')
  @ShareScope({ resource: 'audio', action: 'read', audioIdParam: 'audioId' })
  async getAudio(@Param('audioId') audioId: string) {
    return { message: 'Audio access granted' };
  }
}
```

### 6️⃣ **Public 엔드포인트 (인증 없이 접근)**

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/public.decorator';

// 컨트롤러 전체에 인증 적용
@UseGuards(JwtAuthGuard)
@Controller('articles')
export class ArticlesController {
  
  // ✅ Public 데코레이터로 특정 엔드포인트만 인증 제외
  @Public()
  @Get('list')
  async publicList() {
    return { message: 'Anyone can see article list' };
  }
  
  // 인증 필요 (컨트롤러 레벨 가드 적용)
  @Post('create')
  async createArticle() {
    return { message: 'Only authenticated users can create' };
  }
}
```

---

## 🔧 **모듈에서 Auth 임포트하는 방법**

다른 모듈에서 auth를 사용하려면 `AuthModule`을 임포트해야 합니다:

```typescript
// sessions.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; // ✅ Auth 모듈 임포트

@Module({
  imports: [
    AuthModule, // ✅ 여기에 추가
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
```

---

## 🎯 **실제 사용 예제 (프로젝트에서)**

### 예제 1: Users Controller
```typescript
// users.controller.ts
@Controller('users')
export class UsersController {
  
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }
}
```

### 예제 2: Uploads Controller
```typescript
// uploads.controller.ts
@Controller('uploads')
export class UploadsController {
  
  @UseGuards(JwtAuthGuard)
  @Post('start')
  async startUpload(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.uploads.startUpload(user.id, body);
  }
}
```

### 예제 3: Notes Controller (Share Scope)
```typescript
// materials.controller.ts
@Controller('sessions/materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  
  @UseGuards(ShareScopeGuard)
  @Get(':noteId/pages')
  @ShareScope({ resource: 'note', action: 'read' })
  async listPages(@Param('noteId') noteId: string) {
    // 해당 note에 질문한 사람만 접근 가능
  }
}
```

---

## 📋 **가드 조합 패턴**

```typescript
// 패턴 1: 기본 인증만
@UseGuards(JwtAuthGuard)

// 패턴 2: 인증 + 역할 체크
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')

// 패턴 3: 인증 + 공유 범위 체크
@UseGuards(JwtAuthGuard, ShareScopeGuard)
@ShareScope({ resource: 'note', action: 'read' })

// 패턴 4: 전부 조합
@UseGuards(JwtAuthGuard, RolesGuard, ShareScopeGuard)
@Roles('admin', 'moderator')
@ShareScope({ resource: 'note', action: 'write' })
```

---

## ⚠️ **주의사항**

1. **가드 순서가 중요합니다!**
   ```typescript
   // ✅ 올바른 순서: 먼저 인증, 그 다음 역할
   @UseGuards(JwtAuthGuard, RolesGuard)
   
   // ❌ 잘못된 순서: 인증 전에 역할 체크하면 에러
   @UseGuards(RolesGuard, JwtAuthGuard)
   ```

2. **CurrentUser는 JwtAuthGuard와 함께 사용해야 합니다**
   ```typescript
   // ✅ 올바름
   @UseGuards(JwtAuthGuard)
   @Get('me')
   async getMe(@CurrentUser() user: { id: string }) { }
   
   // ❌ 에러: Guard 없이 사용하면 user가 undefined
   @Get('me')
   async getMe(@CurrentUser() user: { id: string }) { }
   ```

3. **모듈 의존성 추가 필요**
   - `AuthModule`을 사용하는 모듈의 `imports`에 추가
   - 가드는 직접 import해서 사용 (`@UseGuards(JwtAuthGuard)`)

---

## 🚀 **빠른 참고**

| 목적 | 사용 방법 |
|------|-----------|
| 기본 인증 | `@UseGuards(JwtAuthGuard)` |
| 현재 사용자 | `@CurrentUser() user: { id: string }` |
| 역할 체크 | `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` |
| 공유 접근 | `@UseGuards(JwtAuthGuard, ShareScopeGuard)` + `@ShareScope({...})` |
| Public 설정 | `@Public()` |

---

## 💡 **Express 미들웨어와 차이점**

### Express (옛날 방식):
```javascript
// ❌ Express 미들웨어 방식
app.use('/api/users', authMiddleware);
app.get('/api/users/me', (req, res) => {
  res.json({ userId: req.user.id });
});
```

### NestJS (현재 방식):
```typescript
// ✅ NestJS Guard 방식 (더 타입 안전하고 깔끔함)
@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return { userId: user.id };
  }
}
```

**장점:**
- ✅ 타입 안전성 (TypeScript 완전 지원)
- ✅ 데코레이터로 깔끔한 코드
- ✅ 테스트하기 쉬움
- ✅ 의존성 주입 지원
- ✅ 메타데이터 기반 동적 처리

---

작성일: 2025-10-30

Generated by Claude Code 4.5 Sonnet