/**
 * ZIP 파일 처리 유틸리티
 * ZIP 파일 확인, 압축 해제, 처리
 *
 * 참고: 실제 ZIP 압축 해제를 위해서는 JSZip 라이브러리 필요
 * 설치: npm install jszip
 */

import type { ExtractedFile, ZipProcessOptions } from "../types";

/**
 * Check if the file is a ZIP file
 */
export function isZipFile(file: File): boolean {
  return (
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    file.name.toLowerCase().endsWith(".zip")
  );
}

/**
 * ZIP 파일에서 파일 목록 추출 (미리보기)
 *
 * TODO: JSZip 라이브러리 설치 후 구현
 */
export async function getZipFileList(zipFile: File): Promise<string[]> {
  console.warn("ZIP 파일 처리를 위해 JSZip 라이브러리가 필요합니다.");
  return [zipFile.name];
}

/**
 * ZIP 파일 압축 해제
 *
 * TODO: JSZip 라이브러리 설치 후 구현
 */
export async function extractZipFile(
  zipFile: File,
  filter?: (fileName: string) => boolean
): Promise<ExtractedFile[]> {
  console.warn("ZIP 파일 처리를 위해 JSZip 라이브러리가 필요합니다.");

  // 임시: ZIP 파일 자체를 반환
  return [
    {
      name: zipFile.name,
      data: zipFile,
      size: zipFile.size,
      path: zipFile.name,
    },
  ];
}

/**
 * 추출된 파일을 File 객체로 변환
 */
export function extractedFileToFile(extracted: ExtractedFile): File {
  return new File([extracted.data], extracted.name, {
    type: extracted.data.type || "application/octet-stream",
  });
}

/**
 * ZIP 파일 처리 (메인 함수)
 *
 * @param zipFile - 처리할 ZIP 파일
 * @param options - 처리 옵션 (자동 압축 해제, 파일 필터 등)
 * @returns ZIP 파일 또는 압축 해제된 파일 배열
 */
export async function processZipFile(
  zipFile: File,
  options: ZipProcessOptions = { autoExtract: false }
): Promise<File[]> {
  if (!isZipFile(zipFile)) {
    return [zipFile];
  }

  if (!options.autoExtract) {
    return [zipFile];
  }

  try {
    const filter = options.allowedExtensions
      ? (fileName: string) => {
          const ext = "." + fileName.split(".").pop()?.toLowerCase();
          return options.allowedExtensions!.includes(ext);
        }
      : undefined;

    const extracted = await extractZipFile(zipFile, filter);
    const filtered = options.maxFileSize
      ? extracted.filter((f) => f.size <= options.maxFileSize!)
      : extracted;

    return filtered.map(extractedFileToFile);
  } catch (error) {
    console.error("ZIP 파일 처리 실패:", error);
    return [zipFile];
  }
}
