/**
 * 그리기 내보내기 및 저장 훅
 */

import { useCallback } from "react";
import * as fabric from "fabric";
import type { DrawingData } from "@/lib/types/drawing";

interface UseDrawingExportProps {
  canvas: fabric.Canvas | null;
}

export function useDrawingExport({ canvas }: UseDrawingExportProps) {
  /**
   * Canvas를 JSON으로 직렬화
   * (Fabric.js 메타데이터 포함)
   */
  const toJSON = useCallback(() => {
    if (!canvas) return null;

    return canvas.toJSON();
  }, [canvas]);

  /**
   * Canvas를 PNG 이미지로 내보내기 (base64)
   */
  const toImage = useCallback(
    (highRes: boolean = false): string | null => {
      if (!canvas) return null;

      try {
        // 배경을 투명하게 설정하고 내보내기
        const originalBg = canvas.backgroundColor;
        canvas.backgroundColor = "";

        const imageData = canvas.toDataURL({
          format: "png",
          quality: highRes ? 0.95 : 0.8,
          multiplier: highRes ? 2 : 1,
        });

        // 원래 배경색 복원
        canvas.backgroundColor = originalBg;

        return imageData;
      } catch (error) {
        console.error("Failed to export image:", error);
        return null;
      }
    },
    [canvas]
  );

  /**
   * Canvas를 JPEG로 내보내기 (더 작은 파일 크기)
   */
  const toJPEG = useCallback(
    (quality: number = 0.85): string | null => {
      if (!canvas) return null;

      try {
        return canvas.toDataURL({
          format: "jpeg",
          quality,
          multiplier: 1,
        });
      } catch (error) {
        console.error("Failed to export JPEG:", error);
        return null;
      }
    },
    [canvas]
  );

  /**
   * Canvas를 SVG로 내보내기 (벡터 형식)
   * 펜 그리기는 래스터이므로 수정 후 저장 시에만 사용
   */
  const toSVG = useCallback((): string | null => {
    if (!canvas) return null;

    try {
      return canvas.toSVG();
    } catch (error) {
      console.error("Failed to export SVG:", error);
      return null;
    }
  }, [canvas]);

  /**
   * Canvas를 DrawingData로 변환 (저장용)
   */
  const toDrawingData = useCallback(
    (noteId: string, fileId: string, pageNum: number): DrawingData | null => {
      if (!canvas) return null;

      const image = toImage(true); // 고해상도 저장
      if (!image) return null;

      const now = Date.now();

      return {
        id: `drawing-${noteId}-${fileId}-${pageNum}-${now}`,
        noteId,
        fileId,
        pageNum,
        canvas: canvas.toJSON(),
        image,
        createdAt: now,
        updatedAt: now,
      };
    },
    [canvas, toImage]
  );

  /**
   * DrawingData에서 Canvas로 복원
   */
  const fromDrawingData = useCallback(
    (data: DrawingData): Promise<void> => {
      if (!canvas) return Promise.reject("Canvas not initialized");

      return new Promise((resolve, reject) => {
        try {
          canvas.loadFromJSON(data.canvas, () => {
            canvas.renderAll();
            resolve();
          });
        } catch (error) {
          console.error("Failed to load drawing data:", error);
          reject(error);
        }
      });
    },
    [canvas]
  );

  /**
   * Canvas 초기화 (모든 객체 제거)
   */
  const clear = useCallback(() => {
    if (!canvas) return;

    canvas.clear();
    canvas.renderAll();
  }, [canvas]);

  /**
   * Canvas 스크린샷 (Blob)
   */
  const toBlob = useCallback(
    async (format: "png" | "jpeg" = "png"): Promise<Blob | null> => {
      if (!canvas) return null;

      return new Promise((resolve) => {
        // PNG 형식일 때 배경을 투명하게 설정
        const originalBg = canvas.backgroundColor;
        if (format === "png") {
          canvas.backgroundColor = "";
        }

        const dataUrl =
          format === "png"
            ? canvas.toDataURL({ format: "png", quality: 0.9, multiplier: 1 })
            : canvas.toDataURL({ format: "jpeg", quality: 0.85, multiplier: 1 });

        // 원래 배경색 복원
        canvas.backgroundColor = originalBg;

        if (!dataUrl) {
          resolve(null);
          return;
        }

        // Data URL to Blob
        fetch(dataUrl)
          .then((res) => res.blob())
          .then((blob) => resolve(blob))
          .catch(() => resolve(null));
      });
    },
    [canvas]
  );

  /**
   * 파일로 다운로드
   */
  const download = useCallback(
    async (filename: string, format: "png" | "jpeg" = "png") => {
      const blob = await toBlob(format);
      if (!blob) {
        console.error("Failed to create blob");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [toBlob]
  );

  return {
    toJSON,
    toImage,
    toJPEG,
    toSVG,
    toDrawingData,
    fromDrawingData,
    toBlob,
    clear,
    download,
  };
}
