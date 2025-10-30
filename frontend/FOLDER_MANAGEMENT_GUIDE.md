# 폴더 관리 기능 가이드

## 구현된 기능

모든 폴더 관리 기능을 모달 방식으로 구현했습니다:

### 1. 폴더 옵션 메뉴 ("..." 버튼)

각 폴더 옆에 **"..."** 버튼이 표시됩니다 (마우스 호버 시):

#### 옵션:
- **Rename** (이름 변경)
- **Add Subfolder** (하위 폴더 추가)
- **Delete** (삭제)

### 2. 폴더 이름 변경

**접근 방법:**
- 폴더 옵션 메뉴 → "Rename" 클릭
- 또는 폴더 우클릭 → "이름 변경" 선택

**기능:**
- 새로운 폴더 이름 입력
- 현재 이름 표시
- 실시간 검증 (빈 이름, 중복 이름 체크)
- Enter 키로 빠른 저장

**위치:** [src/components/dashboard/rename-folder-modal.tsx](src/components/dashboard/rename-folder-modal.tsx)

### 3. 하위 폴더 만들기

**접근 방법:**
- 폴더 옵션 메뉴 → "Add Subfolder" 클릭
- 또는 폴더 우클릭 → "하위 폴더 만들기" 선택

**기능:**
- 폴더 생성 모달이 열리면서 선택한 폴더가 자동으로 부모로 설정됨
- 트리 구조로 모든 폴더 탐색 가능
- 원하는 위치 선택 가능

**위치:** [src/components/dashboard/create-folder-modal.tsx](src/components/dashboard/create-folder-modal.tsx)

### 4. 폴더 삭제 (휴지통으로 이동)

**접근 방법:**
- 폴더 옵션 메뉴 → "Delete" 클릭 (빨간색)
- 또는 폴더 우클릭 → "삭제" 선택

**기능:**
- 삭제 전 확인 모달 표시
- 영향 범위 안내:
  - 하위 폴더도 함께 이동
  - 폴더 내 노트도 함께 이동
  - 파일과 녹음은 복구를 위해 보존
- 15일 이내 복구 가능
- 휴지통 페이지에서 관리 가능

**위치:** [src/components/dashboard/delete-folder-modal.tsx](src/components/dashboard/delete-folder-modal.tsx)

## 새로 생성된 파일

1. **[src/components/dashboard/folder-options-menu.tsx](src/components/dashboard/folder-options-menu.tsx)**
   - 폴더 옵션 드롭다운 메뉴
   - 이름 변경, 하위 폴더 추가, 삭제 옵션 제공

2. **[src/components/dashboard/rename-folder-modal.tsx](src/components/dashboard/rename-folder-modal.tsx)**
   - 폴더 이름 변경 모달
   - 입력 검증 및 실시간 피드백

3. **[src/components/dashboard/delete-folder-modal.tsx](src/components/dashboard/delete-folder-modal.tsx)**
   - 폴더 삭제 확인 모달
   - 영향 범위 및 경고 메시지 표시

## 수정된 파일

1. **[src/components/dashboard/folder-tree.tsx](src/components/dashboard/folder-tree.tsx)**
   - 각 폴더에 FolderOptionsMenu 컴포넌트 추가
   - 우클릭 메뉴 유지 (기존 사용자 경험 보존)

2. **[src/components/dashboard/dashboard-sidebar.tsx](src/components/dashboard/dashboard-sidebar.tsx)**
   - 모달 상태 관리 추가
   - prompt() 및 confirm() 제거, 모달로 대체
   - 이름 변경 및 삭제 모달 통합

## 사용 방법

### 개발 서버 시작

```bash
npm run dev
```

### 테스트 시나리오

#### 1. 폴더 이름 변경
1. 대시보드로 이동
2. 폴더에 마우스 호버
3. "..." 버튼 클릭
4. "Rename" 선택
5. 새 이름 입력 후 "Rename" 버튼 클릭

#### 2. 하위 폴더 생성
1. 폴더 옵션 메뉴 열기
2. "Add Subfolder" 선택
3. 폴더 생성 모달에서 이름 입력
4. 위치 확인 (선택한 폴더가 부모로 설정됨)
5. "Create Folder" 클릭

#### 3. 폴더 삭제
1. 폴더 옵션 메뉴 열기
2. "Delete" 선택 (빨간색)
3. 확인 모달에서 영향 범위 확인
4. "Delete Folder" 클릭
5. 휴지통에서 확인 가능 (/trash)

#### 4. 우클릭 메뉴 (기존 방식)
1. 폴더에 우클릭
2. 컨텍스트 메뉴에서 원하는 작업 선택
3. 모달이 열리면 작업 완료

## UI/UX 개선사항

### 접근성
- 버튼 방식("...")과 우클릭 모두 지원
- 키보드 네비게이션 (Enter 키로 저장)
- 명확한 시각적 피드백

### 사용자 경험
- 즉시 표시되는 로딩 상태 ("Creating...", "Renaming...", "Deleting...")
- 에러 처리 및 사용자 친화적 메시지
- 작업 전 확인 모달로 실수 방지

### 디자인
- 일관된 모달 스타일
- 컬러 코딩 (삭제는 빨간색)
- 부드러운 애니메이션
- 다크 테마에 최적화된 색상

## 기술 상세

### State 관리
```typescript
const [renamingFolder, setRenamingFolder] = useState<DBFolder | null>(null);
const [deletingFolder, setDeletingFolder] = useState<DBFolder | null>(null);
const [createSubfolderParentId, setCreateSubfolderParentId] = useState<string | null>(null);
```

### 모달 연동
```typescript
// 이름 변경
const handleRenameFolder = (folderId: string) => {
  const folder = folders.find((f) => f.id === folderId);
  if (folder) setRenamingFolder(folder);
};

// 하위 폴더 생성
const handleCreateSubFolder = (parentId: string) => {
  setCreateSubfolderParentId(parentId);
  setIsCreateFolderModalOpen(true);
};

// 삭제
const handleDeleteFolder = (folderId: string) => {
  const folder = folders.find((f) => f.id === folderId);
  if (folder) setDeletingFolder(folder);
};
```

### IndexedDB 연동
- 모든 작업은 IndexedDB에 즉시 반영
- TanStack Query로 캐시 자동 무효화
- 낙관적 업데이트로 빠른 UI 응답

## 향후 개선 가능 사항

1. **드래그 앤 드롭**
   - 폴더를 다른 폴더로 드래그하여 이동

2. **벌크 작업**
   - 여러 폴더 한번에 선택하여 삭제/이동

3. **폴더 색상**
   - 폴더별 색상 지정으로 시각적 구분

4. **즐겨찾기**
   - 자주 사용하는 폴더를 상단에 고정

5. **검색 필터**
   - 폴더 이름으로 빠른 검색

## 주의사항

### 삭제 동작
- 폴더 삭제는 **휴지통으로 이동**입니다 (소프트 삭제)
- 15일 후 자동으로 영구 삭제
- 휴지통에서 언제든지 복구 가능
- 영구 삭제는 휴지통 페이지에서만 가능

### 하위 폴더
- 폴더 삭제 시 모든 하위 폴더도 함께 휴지통으로 이동
- 복구 시 전체 구조가 그대로 복원됨

### 노트 관리
- 폴더 삭제 시 폴더 내 모든 노트도 휴지통으로 이동
- 파일, 녹음, 컨텐츠는 복구를 위해 보존

## 테스트 URL

- 대시보드: http://localhost:3000/dashboard
- 휴지통: http://localhost:3000/trash
- 테스트 페이지: http://localhost:3000/test-db

---

**생성일:** 2025-10-30
**요청사항:** 하위 폴더 만들기, 삭제, 폴더 이름 변경을 모달을 통해 가능하게 변경
**상태:** ✅ 완료
