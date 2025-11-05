/**
 * Drawing/Annotation Types
 * Fabric.js 기반 필기 환경 타입 정의
 */

/**
 * 필기 도구 타입
 */
export type DrawingToolType =
  | "pen"           // 펜 (검은색 선)
  | "highlighter"   // 형광펜 (투명 색상)
  | "eraser"        // 지우개
  | "laser"         // 레이저 포인터 (임시, 저장 안 함)
  | "rectangle"     // 사각형
  | "circle"        // 원
  | "line"          // 직선
  | "arrow"         // 화살표
  | "text"          // 텍스트 상자
  | "sticky-note";  // 포스트잇

/**
 * 필기 도구 설정
 */
export interface DrawingTool {
  type: DrawingToolType;
  color: string;           // 16진수 색상 코드 (#RRGGBB)
  strokeWidth: number;     // 선 굵기 (px)
  opacity: number;         // 투명도 (0 ~ 1)
  fontSize?: number;       // 텍스트 폰트 크기 (텍스트 도구)
}

/**
 * Fabric.js Canvas 상태를 포함한 그림 데이터
 */
export interface DrawingData {
  id: string;                          // 그림 고유 ID (noteId-fileId-pageNum)
  noteId: string;                      // 노트 ID
  fileId: string;                      // 파일 ID (페이지별 구분)
  pageNum: number;                     // PDF 페이지 번호

  // Fabric.js Canvas JSON (객체 메타데이터)
  canvas: {
    version: string;
    objects: Array<any>;               // Fabric.js 객체들
    background: string;
    width: number;
    height: number;
    [key: string]: any;
  };

  // PNG 이미지 (base64, 미리보기 + 백업)
  image: string;                       // data:image/png;base64,...

  // 메타데이터
  createdAt: number;                   // Unix timestamp
  updatedAt: number;                   // Unix timestamp
}

/**
 * 그림 저장 요청
 */
export interface SaveDrawingRequest {
  noteId: string;
  pageNum: number;
  canvas: any;                         // Fabric.js Canvas toJSON()
  image: string;                       // base64 이미지
}

/**
 * 그림 로드 응답
 */
export interface LoadDrawingResponse {
  drawings: DrawingData[];             // 페이지별 그림 데이터
}

/**
 * 필기 상태 (UI State)
 */
export interface DrawingState {
  currentTool: DrawingTool;            // 현재 선택된 도구
  isDrawing: boolean;                  // 그리는 중 여부
  canUndo: boolean;                    // Undo 가능 여부
  canRedo: boolean;                    // Redo 가능 여부
  isLayerVisible: boolean;             // 그리기 레이어 표시 여부
}

/**
 * 히스토리 항목
 */
export interface HistoryEntry {
  id: string;
  json: string;                        // Canvas JSON (직렬화)
  timestamp: number;
}

/**
 * 도구별 기본 설정
 */
export const DRAWING_TOOL_DEFAULTS: Record<DrawingToolType, DrawingTool> = {
  pen: {
    type: "pen",
    color: "#000000",
    strokeWidth: 2,
    opacity: 1,
  },
  highlighter: {
    type: "highlighter",
    color: "#FFFF00",
    strokeWidth: 10,
    opacity: 0.3,
  },
  eraser: {
    type: "eraser",
    color: "#FFFFFF",
    strokeWidth: 10,
    opacity: 1,
  },
  laser: {
    type: "laser",
    color: "#FF0000",
    strokeWidth: 3,
    opacity: 0.7,
  },
  rectangle: {
    type: "rectangle",
    color: "#000000",
    strokeWidth: 2,
    opacity: 1,
  },
  circle: {
    type: "circle",
    color: "#000000",
    strokeWidth: 2,
    opacity: 1,
  },
  line: {
    type: "line",
    color: "#000000",
    strokeWidth: 2,
    opacity: 1,
  },
  arrow: {
    type: "arrow",
    color: "#000000",
    strokeWidth: 2,
    opacity: 1,
  },
  text: {
    type: "text",
    color: "#000000",
    strokeWidth: 1,
    opacity: 1,
    fontSize: 16,
  },
  "sticky-note": {
    type: "sticky-note",
    color: "#FFFF99",
    strokeWidth: 1,
    opacity: 0.9,
    fontSize: 14,
  },
};

/**
 * 색상 팔레트
 */
export const COLOR_PALETTE = [
  "#000000",  // 검은색
  "#FF0000",  // 빨강
  "#00FF00",  // 초록
  "#0000FF",  // 파랑
  "#FFFF00",  // 노랑
  "#FF00FF",  // 자주
  "#00FFFF",  // 시안
  "#FFFFFF",  // 하양
  "#FF6600",  // 주황
  "#FF99CC",  // 분홍
];

/**
 * 선 굵기 옵션 (픽셀)
 */
export const STROKE_WIDTH_OPTIONS = [1, 2, 4, 6, 8, 10, 15, 20];

/**
 * 투명도 옵션
 */
export const OPACITY_OPTIONS = [0.3, 0.5, 0.7, 1.0];
