# Collaborative Canvas 사용 가이드

## 개요
`collaborative-canvas-sync.tsx`는 Fabric.js 캔버스와 Liveblocks Storage를 동기화하여 실시간 협업 드로잉을 가능하게 합니다.

## 통합 방법

### 1. pdf-drawing-overlay.tsx 수정

```tsx
import { useCollaborativeCanvasSync } from "./collaborative-canvas-sync";

export const PDFDrawingOverlay = forwardRef<
  PDFDrawingOverlayHandle,
  PDFDrawingOverlayProps & { isCollaborative?: boolean } // Props 추가
>(
  (
    {
      // ... 기존 props
      isCollaborative = false, // 새 prop
    },
    ref
  ) => {
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

    // Liveblocks 동기화 훅 사용
    const { syncToStorage } = useCollaborativeCanvasSync({
      fileId,
      pageNum,
      fabricCanvas: fabricCanvasRef.current,
      isEnabled: isCollaborative,
    });

    // 기존 triggerAutoSave와 함께 사용
    const triggerAutoSave = useCallback(() => {
      // ... 기존 로컬 저장 로직

      // 추가: Liveblocks 동기화
      if (isCollaborative && fabricCanvasRef.current) {
        syncToStorage(fabricCanvasRef.current);
      }
    }, [isCollaborative, syncToStorage, /* 기존 deps */]);

    // ... 나머지 코드
  }
);
```

### 2. Educator/Student 노트 페이지에서 사용

```tsx
import { PDFDrawingOverlay } from "@/components/note/drawing/pdf-drawing-overlay";

// Educator 모드: 협업 활성화
<PDFDrawingOverlay
  // ... 기존 props
  isCollaborative={true} // 실시간 동기화 활성화
/>

// Student 모드: 협업 활성화 (읽기 전용)
<PDFDrawingOverlay
  // ... 기존 props
  isCollaborative={true}
  isDrawingMode={false} // 읽기 전용
/>
```

## 동작 방식

### 로컬 → Storage 동기화
1. 사용자가 캔버스에 그림
2. Fabric.js 이벤트 발생: `object:added`, `object:modified`, `path:created` 등
3. 300ms 디바운스 후 `syncToStorage()` 호출
4. `canvas.toJSON()` → Liveblocks Storage `canvasData[fileId-pageNum]` 저장

### Storage → 로컬 동기화
1. 다른 사용자가 캔버스 수정
2. Liveblocks Storage 변경 감지 (`useStorage` 훅)
3. `canvas.loadFromJSON(storageData)` 실행
4. `canvas.renderAll()` → 화면 업데이트

### 무한 루프 방지
- `isUpdatingFromStorage` ref 플래그 사용
- Storage → 로컬 동기화 중에는 로컬 → Storage 동기화 차단
- 100ms 딜레이 후 플래그 해제

## Storage 구조

```typescript
// Liveblocks Storage
{
  canvasData: {
    "file123-1": {
      version: "5.3.0",
      objects: [
        { type: "path", /* ... */ },
        { type: "rect", /* ... */ },
        // ...
      ],
      background: "transparent"
    },
    "file123-2": { /* 2페이지 */ },
    // ...
  }
}
```

## 성능 최적화

- **디바운스**: 300ms (과도한 Storage 업데이트 방지)
- **페이지별 분리**: 각 페이지마다 독립적인 캔버스 데이터
- **선택적 활성화**: `isCollaborative=false` 시 동기화 비활성화

## 주의사항

1. **로컬 저장과 병행**: IndexedDB 저장 (`triggerAutoSave`)과 Liveblocks 동기화를 모두 유지
   - IndexedDB: 오프라인 백업, 영구 저장
   - Liveblocks: 실시간 협업, 일시적 저장

2. **권한 제어**: Student 모드에서는 `isDrawingMode=false`로 설정하여 읽기 전용 유지

3. **페이지 전환**: 페이지 변경 시 자동으로 다른 canvasKey로 전환됨

## 디버깅

콘솔 로그 확인:
```
[Collaborative Canvas] Storage 업데이트: file123-1
[Collaborative Canvas] 로컬 → Storage 동기화
[Collaborative Canvas] Storage → 로컬 동기화 시작
[Collaborative Canvas] Storage → 로컬 동기화 완료
```

## 예상 작업 시간

- pdf-drawing-overlay.tsx 수정: 30분
- 통합 테스트 및 디버깅: 1시간
- 총 예상 시간: **1.5시간**
