/**
 * 파일 검증 유틸리티
 * 파일 타입, 크기, 개수, 전체 용량 검증
 */

import { FILE_CONSTRAINTS } from "../constants";
import type { FileValidationResult, StorageUsage } from "../types";

/**
 * 파일 타입 검증 (MIME type + 확장자)
 */
export function validateFileType(file: File): FileValidationResult {
  const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;

  // MIME type 체크
  if (
    !(FILE_CONSTRAINTS.ALLOWED_TYPES as readonly string[]).includes(file.type)
  ) {
    // 확장자로 재확인
    if (
      !(FILE_CONSTRAINTS.ALLOWED_EXTENSIONS as readonly string[]).includes(
        extension
      )
    ) {
      return {
        isValid: false,
        error: `지원하지 않는 파일 형식입니다: ${extension}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * 파일 크기 검증
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size > FILE_CONSTRAINTS.MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxSizeMB = (FILE_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)).toFixed(
      0
    );
    return {
      isValid: false,
      error: `파일 크기가 너무 큽니다 (${sizeMB}MB). 최대 ${maxSizeMB}MB까지 가능합니다.`,
    };
  }

  return { isValid: true };
}

/**
 * 파일 개수 검증
 */
export function validateFileCount(
  currentCount: number,
  newCount: number
): FileValidationResult {
  const totalCount = currentCount + newCount;
  if (totalCount > FILE_CONSTRAINTS.MAX_FILES) {
    return {
      isValid: false,
      error: `최대 ${FILE_CONSTRAINTS.MAX_FILES}개까지만 업로드 가능합니다.`,
    };
  }

  return { isValid: true };
}

/**
 * 전체 용량 검증
 */
export function validateTotalSize(
  existingFiles: File[],
  newFiles: File[]
): FileValidationResult {
  const existingTotalSize = existingFiles.reduce(
    (sum, file) => sum + file.size,
    0
  );
  const newTotalSize = newFiles.reduce((sum, file) => sum + file.size, 0);
  const totalSize = existingTotalSize + newTotalSize;

  if (totalSize > FILE_CONSTRAINTS.MAX_TOTAL_SIZE) {
    const currentGB = (existingTotalSize / (1024 * 1024 * 1024)).toFixed(2);
    const maxGB = (FILE_CONSTRAINTS.MAX_TOTAL_SIZE / (1024 * 1024 * 1024)).toFixed(
      0
    );
    const exceededMB = (
      (totalSize - FILE_CONSTRAINTS.MAX_TOTAL_SIZE) /
      (1024 * 1024)
    ).toFixed(0);

    return {
      isValid: false,
      error: `저장 공간 한도를 초과했습니다. 현재: ${currentGB}GB / 최대: ${maxGB}GB (${exceededMB}MB 초과)`,
    };
  }

  return { isValid: true };
}

/**
 * 파일 전체 검증 (타입 + 크기)
 */
export function validateFile(file: File): FileValidationResult {
  // 타입 검증
  const typeResult = validateFileType(file);
  if (!typeResult.isValid) {
    return typeResult;
  }

  // 크기 검증
  const sizeResult = validateFileSize(file);
  if (!sizeResult.isValid) {
    return sizeResult;
  }

  return { isValid: true };
}

/**
 * 저장 공간 사용량 계산
 */
export function calculateStorageUsage(files: File[]): StorageUsage {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const totalMB = totalBytes / (1024 * 1024);
  const totalGB = totalBytes / (1024 * 1024 * 1024);
  const usagePercentage =
    (totalBytes / FILE_CONSTRAINTS.MAX_TOTAL_SIZE) * 100;

  return {
    totalBytes,
    totalMB,
    totalGB,
    usagePercentage,
  };
}
