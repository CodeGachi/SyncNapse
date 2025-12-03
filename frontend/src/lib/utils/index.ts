/**
 * 유틸리티 함수 Barrel Export
 * 모든 유틸리티를 한 곳에서 import 가능
 */

// UI 유틸리티
export { cn } from "./cn";

// 포맷팅
export { formatFileSize, formatDate } from "./format";

// 파일 검증
export {
  validateFileType,
  validateFileSize,
  validateFileCount,
  validateTotalSize,
  validateFile,
  calculateStorageUsage,
} from "./file-validation";

// 파일명 처리
export {
  validateFileName,
  detectDuplicateFile,
  detectFileNameConflict,
  generateSafeFileName,
} from "./file-name";

// 배치 검증
export { validateFiles } from "./file-batch";

// ZIP 처리
export {
  isZipFile,
  getZipFileList,
  extractZipFile,
  extractedFileToFile,
  processZipFile,
} from "./zip";

// 로깅
export { logger, createLogger, logIf, perfLogger } from "./logger";

// 쿠키
export { getCookie, setCookie, deleteCookie } from "./cookie";

// 파일명 디코딩
export { decodeFilename } from "./decode-filename";

// 도형 그리기 유틸리티
export {
  createSolidLineClick,
  createArrowLineClick,
  createRectClick,
  createCircleClick,
  createShapeByClick,
  createSolidLineDrag,
  createArrowLineDrag,
  createRectDrag,
  createCircleDrag,
  createShapeByDrag,
  type DrawInfo,
  type ClickShapeInfo,
  type DragShapeInfo,
  type ShapeType,
} from "./shapes";
