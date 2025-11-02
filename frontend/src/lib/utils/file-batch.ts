/**
 * Batch file validation utility
 * Validates multiple files at once
 */

import { validateFile, validateFileCount, validateTotalSize } from "./file-validation";
import { validateFileName, detectDuplicateFile } from "./file-name";

/**
 * Batch file validation (multiple files at once)
 *
 * @returns validFiles - Files that passed validation
 * @returns invalidFiles - Files that failed validation (with error messages)
 * @returns duplicates - Duplicate files
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
