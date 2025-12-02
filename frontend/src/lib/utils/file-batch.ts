/**
 * 배치 파일 검증 유틸리티
 * 여러 파일을 한 번에 검증
 */

import { validateFile, validateFileCount, validateTotalSize } from "./file-validation";
import { validateFileName, detectDuplicateFile } from "./file-name";

/**
 * 여러 파일 일괄 검증
 * @param files - 검증할 파일 배열
 * @param existingFiles - 기존 파일 배열 (중복 체크용)
 * @returns validFiles - 검증 통과 파일
 * @returns invalidFiles - 검증 실패 파일 (에러 메시지 포함)
 * @returns duplicates - 중복 파일
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

  // Check file count
  const countResult = validateFileCount(existingFiles.length, files.length);
  if (!countResult.isValid) {
    // Mark all files as invalid
    files.forEach((file) => {
      invalidFiles.push({ file, error: countResult.error! });
    });
    return { validFiles, invalidFiles, duplicates };
  }

  // Check total size
  const totalSizeResult = validateTotalSize(existingFiles, files);
  if (!totalSizeResult.isValid) {
    // Mark all files as invalid
    files.forEach((file) => {
      invalidFiles.push({ file, error: totalSizeResult.error! });
    });
    return { validFiles, invalidFiles, duplicates };
  }

  files.forEach((file) => {
    // Validate file name
    const nameResult = validateFileName(file.name);
    if (!nameResult.isValid) {
      invalidFiles.push({ file, error: nameResult.error! });
      return;
    }

    // Validate file
    const validationResult = validateFile(file);
    if (!validationResult.isValid) {
      invalidFiles.push({ file, error: validationResult.error! });
      return;
    }

    // Check for duplicates
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
