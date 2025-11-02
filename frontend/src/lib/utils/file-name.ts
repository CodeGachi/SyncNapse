/**
 * 파일명 검증 및 처리 유틸리티
 * 파일명 유효성, 중복 감지, 안전한 파일명 생성
 */

import type { FileValidationResult } from "../types";

/**
 * 파일명 유효성 검증 (특수문자, 길이 등)
 */
export function validateFileName(fileName: string): FileValidationResult {
  // 파일명 길이 체크 (최대 255자)
  if (fileName.length > 255) {
    return {
      isValid: false,
      error: "파일명이 너무 깁니다 (최대 255자).",
    };
  }

  // 파일명이 비어있는지 체크
  if (fileName.trim().length === 0) {
    return {
      isValid: false,
      error: "파일명이 비어있습니다.",
    };
  }

  // 위험한 특수문자 체크 (Windows/Linux 파일시스템 고려)
  const invalidChars = /[<>:"|?*\x00-\x1F]/g;
  if (invalidChars.test(fileName)) {
    return {
      isValid: false,
      error: '파일명에 사용할 수 없는 문자가 포함되어 있습니다: < > : " | ? *',
    };
  }

  // 예약된 파일명 체크 (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  const nameWithoutExt =
    fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
  if (reservedNames.test(nameWithoutExt)) {
    return {
      isValid: false,
      error: "예약된 파일명은 사용할 수 없습니다.",
    };
  }

  return { isValid: true };
}

/**
 * 중복 파일 감지 (이름 + 크기 + 수정일 기반)
 */
export function detectDuplicateFile(
  newFile: File,
  existingFiles: File[]
): { isDuplicate: boolean; duplicateFile?: File } {
  const duplicate = existingFiles.find(
    (existing) =>
      existing.name === newFile.name &&
      existing.size === newFile.size &&
      existing.lastModified === newFile.lastModified
  );

  return {
    isDuplicate: !!duplicate,
    duplicateFile: duplicate,
  };
}

/**
 * 파일명 충돌 감지 (이름만 체크)
 */
export function detectFileNameConflict(
  fileName: string,
  existingFiles: File[]
): { hasConflict: boolean; conflictFile?: File } {
  const conflict = existingFiles.find((existing) => existing.name === fileName);

  return {
    hasConflict: !!conflict,
    conflictFile: conflict,
  };
}

/**
 * 안전한 파일명 생성 (충돌 시 숫자 추가)
 *
 * @example
 * generateSafeFileName("file.txt", existingFiles)
 * // 충돌 시: "file (1).txt", "file (2).txt" ...
 */
export function generateSafeFileName(
  originalName: string,
  existingFiles: File[]
): string {
  const conflict = detectFileNameConflict(originalName, existingFiles);

  if (!conflict.hasConflict) {
    return originalName;
  }

  // 파일명과 확장자 분리
  const lastDotIndex = originalName.lastIndexOf(".");
  const nameWithoutExt =
    lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
  const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : "";

  // 숫자를 증가시키며 충돌하지 않는 이름 찾기
  let counter = 1;
  let newName = `${nameWithoutExt} (${counter})${extension}`;

  while (detectFileNameConflict(newName, existingFiles).hasConflict) {
    counter++;
    newName = `${nameWithoutExt} (${counter})${extension}`;

    // 무한 루프 방지
    if (counter > 1000) {
      newName = `${nameWithoutExt}_${Date.now()}${extension}`;
      break;
    }
  }

  return newName;
}
