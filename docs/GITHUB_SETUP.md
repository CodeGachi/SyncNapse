# Environment Sync 설정 가이드

Private repository (`git@github.com:CodeGachi/.env.git`)에서 환경 변수를 동기화하는데 필요한 설정입니다.

## 📋 사용 가능한 명령어

```bash
npm run env:sync         # dev 환경 변수 pull + backend 전파
npm run env:sync:prod    # prod 환경 변수 pull + backend 전파
npm run env:push         # dev 환경 변수 push
npm run env:push:prod    # prod 환경 변수 push
```

---

## 🔧 로컬 개발자 설정

### 1. SSH Key 확인

Private repository 접근을 위해 SSH key가 필요합니다.

```bash
# 기존 SSH key 확인
ls -la ~/.ssh/id_*

# SSH key가 없으면 생성
ssh-keygen -t ed25519 -C "your_email@example.com"

# Public key 확인
cat ~/.ssh/id_ed25519.pub
```

### 2. GitHub에 SSH Key 등록

1. Public key 복사:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # 또는
   pbcopy < ~/.ssh/id_ed25519.pub
   ```

2. GitHub 설정에 추가:
   - https://github.com/settings/keys 접속
   - `New SSH key` 클릭
   - Title: `MacBook Pro` (또는 원하는 이름)
   - Key: 복사한 public key 붙여넣기
   - `Add SSH key` 클릭

### 3. Private Repo 접근 권한 확인

CodeGachi organization의 `.env` repository에 접근 권한이 있어야 합니다.

```bash
# SSH 연결 테스트
ssh -T git@github.com

# Private repo clone 테스트
npm run env:sync
```

### 4. SSH Config 설정 (선택사항)

SSH key 파일이 기본 위치가 아니라면:

```bash
# ~/.ssh/config 파일 생성/수정
cat >> ~/.ssh/config << 'EOF'

Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
  AddKeysToAgent yes
EOF
```

---

## 🤖 GitHub Actions CI 설정

CI에서 private repository에 접근하려면 Personal Access Token (PAT)을 사용합니다.

### 1. Personal Access Token (PAT) 생성

1. GitHub 설정 페이지 접속:
   - https://github.com/settings/tokens?type=beta 접속 (Fine-grained tokens)

2. `Generate new token` 클릭

3. Token 설정:
   - **Token name:** `SyncNapse CI Environment Access`
   - **Expiration:** `90 days` (또는 원하는 기간)
   - **Repository access:** `Only select repositories`
     - `CodeGachi/.env` 선택
   - **Permissions:**
     - Repository permissions > Contents: `Read-only` (✓)
   
4. `Generate token` 클릭

5. **생성된 토큰을 복사** (다시 볼 수 없으니 안전한 곳에 보관)

### 2. GitHub Secrets에 PAT 등록

1. Main repository secrets 페이지 접속:
   - https://github.com/CodeGachi/SyncNapse/settings/secrets/actions

2. `New repository secret` 클릭

3. Secret 추가:
   - **Name:** `ENV_REPO_PAT`
   - **Value:** 위에서 복사한 PAT 붙여넣기
   - `Add secret` 클릭

### 3. CI 워크플로우 확인

`.github/workflows/ci.yml`에서 다음과 같이 설정되어 있어야 합니다:

```yaml
- name: Setup environment files
  env:
    GITHUB_TOKEN: ${{ secrets.ENV_REPO_PAT }}
  run: |
    # Configure git to use PAT
    # WARNING: Use --local instead of --global to avoid persisting token globally
    git config --local url."https://x-access-token:${GITHUB_TOKEN}@github.com/".insteadOf "git@github.com:"
    
    # After operation, clean up the config:
    git config --local --unset url."https://x-access-token:${GITHUB_TOKEN}@github.com/".insteadOf
    
    # Fetch environment from private repo
    npm run env:sync
    cp .env.dev .env
```

---

## ✅ 설정 확인

### 로컬 환경 테스트

```bash
# 1. SSH 연결 확인
ssh -T git@github.com
# 출력: Hi username! You've successfully authenticated...

# 2. Env sync 테스트
npm run env:sync

# 3. Docker Compose 테스트
npm run dev:all
```

### CI 환경 테스트

```bash
# PR 생성 또는 코드 push
git add .
git commit -m "test: CI env sync"
git push

# GitHub Actions 탭에서 워크플로우 확인
# https://github.com/CodeGachi/SyncNapse/actions
```

---

## 🐛 트러블슈팅

### "Permission denied (publickey)" 에러

**원인:** SSH key가 GitHub에 등록되지 않았거나, SSH agent가 실행되지 않음

**해결:**
```bash
# SSH agent 시작
eval "$(ssh-agent -s)"

# SSH key 추가
ssh-add ~/.ssh/id_ed25519

# SSH 연결 테스트
ssh -T git@github.com
```

### "Repository not found" 에러

**원인:** Private repository 접근 권한이 없음

**해결:**
- CodeGachi organization의 `.env` repository에 초대되었는지 확인
- Organization owner에게 접근 권한 요청

### CI에서 "Repository not found" 에러

**원인:** PAT 권한이 없거나 만료됨

**해결:**
1. PAT가 만료되지 않았는지 확인
2. PAT에 `.env` repository 접근 권한이 있는지 확인
3. GitHub Secrets의 `ENV_REPO_PAT`가 올바른지 확인

---

## 📝 체크리스트

### 로컬 개발자
- [ ] SSH key 생성 및 GitHub에 등록
- [ ] Private repository 접근 권한 확인
- [ ] `npm run env:sync` 성공
- [ ] `npm run dev:all` 성공

### CI 설정 (한 번만)
- [ ] Personal Access Token (PAT) 생성
- [ ] PAT에 `.env` private repo 읽기 권한 부여
- [ ] GitHub Secrets (`ENV_REPO_PAT`)에 PAT 등록
- [ ] CI 워크플로우 실행 확인

---

## 🔒 보안 주의사항

- ✅ Private key는 절대 공유하지 마세요
- ✅ Private key는 Git에 커밋하지 마세요
- ✅ Deploy Key는 읽기 전용으로 설정하세요
- ✅ CI 전용 key는 로컬 개발에 사용하지 마세요
- ✅ `.env`, `.env.dev`, `.env.prod` 파일은 `.gitignore`에 포함되어 있어야 합니다

---

## 📚 관련 문서

- [환경 변수 관리 가이드](./ENV_MANAGEMENT.md)
- [Dev vs Prod 환경 비교](./ENV_DEV_VS_PROD.md)
- [GitHub Deploy Keys 문서](https://docs.github.com/en/developers/overview/managing-deploy-keys)
- [webfactory/ssh-agent Action](https://github.com/webfactory/ssh-agent)

Generated By Claude Code 4.5