/**
 * 배치 파일 검증 유틸리티
 * 여러 파일을 한번에 검증
 */

import { validateFile, validateFileCount, validateTotalSize } from "./file-validation";
import { validateFileName, detectDuplicateFile } from "./file-name";

/**
 * 배치 파일 검증 (여러 파일 한번에)
 *
 * @returns validFiles - 검증 통과한 파일들
 * @returns invalidFiles - 검증 실패한 파일들 (에러 메시지 포함)
 * @returns duplicates - 중복 파일들
 */
export function validateFiles(
  files: File[],
  existingFiles: File[] = []
): {
  validFiles: File[];
  invalidFiles: { file: File; error: string }[];
  duplicates: File[];
} {
  const validFiles: File[] = [];
  const invalidFiles: { file: File; error: string }[] = [];
  const duplicates: File[] = [];

  // 개수 체크
  const countResult = validateFileCount(existingFiles.length, files.length);
  if (!countResult.isValid) {
    // 모든 파일을 invalid 처리
    files.forEach((file) => {
      invalidFiles.push({ file, error: countResult.error! });
    });
    return { validFiles, invalidFiles, duplicates };
  }

  // 전체 용량 체크
  const totalSizeResult = validateTotalSize(existingFiles, files);
  if (!totalSizeResult.isValid) {
    // 모든 파일을 invalid 처리
    files.forEach((file) => {
      invalidFiles.push({ file, error: totalSizeResult.error! });
    });
    return { validFiles, invalidFiles, duplicates };
  }

  files.forEach((file) => {
    // 파일명 검증
    const nameResult = validateFileName(file.name);
    if (!nameResult.isValid) {
      invalidFiles.push({ file, error: nameResult.error! });
      return;
    }

    // 파일 검증
    const validationResult = validateFile(file);
    if (!validationResult.isValid) {
      invalidFiles.push({ file, error: validationResult.error! });
      return;
    }

    // 중복 체크
    const duplicateCheck = detectDuplicateFile(file, [
      ...existingFiles,
      ...validFiles,
    ]);
    if (duplicateCheck.isDuplicate) {
      duplicates.push(file);
      return;
    }

    validFiles.push(file);
  });

  return { validFiles, invalidFiles, duplicates };
}
