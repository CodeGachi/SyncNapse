/**
 * PDF Drawing Overlay - 마이그레이션: drawing-board의 PicBoard 로직을 React로 포팅
 * Canvas overlay on PDF viewer with drawing capabilities (펜 + 도형)
 */

"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import * as fabric from "fabric";
import { useDrawStore } from "@/stores/draw-store";
import { useToolsStore } from "@/stores/tools-store";
import type { DrawingData } from "@/lib/types/drawing";
import { createShapeByClick, type ClickShapeInfo, type ShapeType } from "@/lib/utils/shapes";
import { CollaborativeCanvasWrapper } from "./collaborative-canvas-wrapper";

export interface PDFDrawingOverlayHandle {
  handleUndo: () => void;
  handleRedo: () => void;
  handleClear: () => void;
}

interface PDFDrawingOverlayProps {
  isEnabled: boolean;
  isDrawingMode: boolean;
  noteId: string;
  fileId: string;
  pageNum: number;
  containerWidth: number;   // PDF 원본 크기 (baseWidth)
  containerHeight: number;  // PDF 원본 크기 (baseHeight)
  pdfScale: number;         // PDF 현재 스케일 (CSS transform용)
  isPdf?: boolean;
  onSave?: (data: DrawingData) => Promise<void>;
  isCollaborative?: boolean;
}

export const PDFDrawingOverlay = forwardRef<
  PDFDrawingOverlayHandle,
  PDFDrawingOverlayProps
>(
  (
    {
      isEnabled,
      isDrawingMode,
      noteId,
      fileId,
      pageNum,
      containerWidth,
      containerHeight,
      pdfScale,
      isPdf,
      onSave,
      isCollaborative = false,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 도구 상태 직접 구독
    const drawStore = useDrawStore();
    const toolsStore = useToolsStore();
    const currentTool = drawStore.type;
    const penColor = drawStore.lineColor;
    const penSize = drawStore.lineWidth;

    // syncToStorage 함수 ref (협업 래퍼에서 설정됨)
    const syncToStorageRef = useRef<((canvas: fabric.Canvas) => void) | null>(null);

    // Canvas 초기화 (펜과 도형 모두 지원)
    useEffect(() => {
      if (!canvasRef.current || !isEnabled) return;

      // 기존 canvas 정리
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
        } catch (error) {
          console.error("Failed to dispose previous canvas:", error);
        }
        fabricCanvasRef.current = null;
      }

      // 캔버스는 전체 높이를 사용 (PDF 뷰어와 동일한 높이)
      const adjustedHeight = Math.max(containerHeight, 100);

      // Fabric Canvas 생성 (항상 PDF 원본 크기로 고정)
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: containerWidth,
        height: adjustedHeight,
        isDrawingMode: false,
        backgroundColor: 'transparent',
      });

      fabricCanvasRef.current = canvas;

      // 캔버스 경계 체크 이벤트 추가 (펜/형광펜 모드에서도 적용)
      canvas.on('mouse:down', (e: any) => {
        if (!canvas.isDrawingMode) return; // 자유 그리기 모드가 아니면 무시

        const pointer = canvas.getPointer(e.e);
        // 캔버스 경계 밖이면 드로잉 방지
        if (pointer.x < 0 || pointer.x > containerWidth || pointer.y < 0 || pointer.y > adjustedHeight) {
          canvas.isDrawingMode = false; // 일시적으로 비활성화
          // 다음 프레임에 다시 활성화 (이벤트 처리 후)
          setTimeout(() => {
            if (canvas) canvas.isDrawingMode = true;
          }, 0);
        }
      });

      // 캔버스 크기 정보 콘솔 출력
      const renderedWidth = containerWidth * pdfScale;
      const renderedHeight = adjustedHeight * pdfScale;

      // Canvas initialization debug logs disabled for performance

      // 초기 히스토리 저장
      useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

      return () => {
        try {
          if (fabricCanvasRef.current) {
            // Fabric canvas를 안전하게 정리
            fabricCanvasRef.current.dispose();
            fabricCanvasRef.current = null;
          }
        } catch (error) {
          console.error("Canvas cleanup error:", error);
          fabricCanvasRef.current = null;
        }
      };
    }, [canvasRef, isEnabled, isPdf]);

    // Canvas 크기 업데이트 (PDF 원본 크기 변경 시만 - 페이지 전환 등)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const adjustedHeight = Math.max(containerHeight, 100);

      // 캔버스를 항상 PDF 원본 크기로 유지
      // CSS transform: scale(pdfScale)로 시각적 확대/축소 처리
      canvas.setWidth(containerWidth);
      canvas.setHeight(adjustedHeight);
      canvas.renderAll();

      // Canvas resize debug logs disabled for performance
    }, [containerWidth, containerHeight, pdfScale]);

    // 펜 모드 설정 (펜/형광펜 자유 그리기)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';
      const isSelectionMode = drawStore.type === 'hand';
      const isEraserMode = drawStore.type === 'eraser';

      // 자유 그리기 모드 설정
      canvas.isDrawingMode = isFreeDrawingMode && isDrawingMode;

      // 펜 모드일 때 PencilBrush 초기화 (중요!)
      if (isFreeDrawingMode && isDrawingMode) {
        // Fabric.js 브러시 생성 및 설정
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = drawStore.lineColor;

        // pdfScale을 고려한 브러시 크기 설정
        // CSS transform: scale(pdfScale)이 적용되므로 브러시 크기를 pdfScale로 나눔
        // 그릴 때: (lineWidth / pdfScale) → transform 적용 후: lineWidth
        // 그려진 후: (lineWidth / pdfScale) × pdfScale = lineWidth (일관된 크기)
        canvas.freeDrawingBrush.width = drawStore.lineWidth / pdfScale;

        // 형광펜은 투명도 설정
        if (drawStore.type === 'highlighter') {
          (canvas.freeDrawingBrush as any).globalAlpha = 0.3;
        } else {
          (canvas.freeDrawingBrush as any).globalAlpha = 1;
        }
      } else {
        // 펜 모드 비활성화 시 - 브러시 정리
        canvas.isDrawingMode = false;
      }

      // 선택 가능 여부 설정
      canvas.forEachObject((obj) => {
        if (isEraserMode) {
          // 지우개 모드: 모든 객체 선택 불가능
          obj.selectable = false;
          obj.evented = false;
        } else if (isSelectionMode) {
          // 손 아이콘 모드: 모든 객체 선택 가능
          obj.selectable = true;
          obj.evented = true;
        }
      });
    }, [drawStore.type, drawStore.lineColor, drawStore.lineWidth, isDrawingMode, pdfScale]);

    // Auto-save drawing data to database (debounced)
    const triggerAutoSave = useCallback(() => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        try {
          const canvasJSON = canvas.toJSON();

          // Liveblocks 협업 동기화 (실시간 협업용)
          if (isCollaborative && syncToStorageRef.current) {
            syncToStorageRef.current(canvas);
          }

          // IndexedDB 로컬 저장 (영구 백업용)
          if (onSave) {
            const imageData = canvas.toDataURL({ format: "png", multiplier: 1 });

            const data: DrawingData = {
              id: `${noteId}-${fileId}-${pageNum}`,
              noteId,
              fileId,
              pageNum,
              canvas: canvasJSON,
              image: imageData,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            await onSave(data);
          }
        } catch (error) {
          console.error("Failed to auto-save drawing:", error);
        }
      }, 1000);
    }, [onSave, noteId, fileId, pageNum, isCollaborative]);

    // 클릭 이벤트로 도형 생성 (드래그 불필요)
    const handleClick = useCallback(
      (event: any) => {
        if (!isEnabled || !isDrawingMode || !fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;
        const toolType = drawStore.type as ShapeType;

        // 펜/형광펜/지우개/hand 모드는 별도 처리
        if (toolType === 'pen' || toolType === 'highlighter' || toolType === 'eraser' || toolType === 'hand') {
          return;
        }

        const pos = canvas.getPointer(event.e as MouseEvent);

        // 캔버스 경계 체크
        const adjustedHeight = Math.max(containerHeight, 100);
        if (pos.x < 0 || pos.x > containerWidth || pos.y < 0 || pos.y > adjustedHeight) {
          return;
        }

        // 히스토리 저장 (도형 추가 전)
        useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

        // 클릭한 위치에 고정 크기 도형 생성
        const shapeInfo: ClickShapeInfo = {
          x: pos.x,
          y: pos.y,
          lineColor: drawStore.lineColor,
          lineWidth: drawStore.lineWidth,
        };

        const shape = createShapeByClick(shapeInfo, toolType);

        if (shape) {
          canvas.add(shape);
          canvas.setActiveObject(shape); // 생성 후 바로 선택 상태로
          canvas.renderAll();

          // 자동 저장 트리거
          triggerAutoSave();
        }
      },
      [isEnabled, isDrawingMode, drawStore.type, drawStore.lineColor, drawStore.lineWidth, containerWidth, containerHeight, triggerAutoSave]
    );

    // 지우개 기능 (클릭한 객체 삭제)
    const handleEraserClick = useCallback(
      (event: any) => {
        if (!isEnabled || !isDrawingMode || !fabricCanvasRef.current) return;
        if (drawStore.type !== 'eraser') return;

        const canvas = fabricCanvasRef.current;
        const target = canvas.findTarget(event.e as MouseEvent);

        if (target && !(target as any).isPreview) {
          // 히스토리 저장
          useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

          canvas.remove(target);
          canvas.renderAll();

          // 자동 저장 트리거
          triggerAutoSave();
        }
      },
      [isEnabled, isDrawingMode, drawStore.type, triggerAutoSave]
    );

    // Canvas 클릭 이벤트 핸들러 바인딩
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isDrawingMode) return;

      // 펜/형광펜은 Fabric의 자동 처리를 사용
      const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';

      if (isFreeDrawingMode) {
        // 펜 모드: 클릭 핸들러 제거
        canvas.off('mouse:down', handleClick);
        canvas.off('mouse:down', handleEraserClick);
        return;
      }

      // 지우개 모드
      if (drawStore.type === 'eraser') {
        canvas.off('mouse:down', handleClick);
        canvas.on('mouse:down', handleEraserClick);
      } else {
        // 도형 모드
        canvas.off('mouse:down', handleEraserClick);
        canvas.on('mouse:down', handleClick);
      }

      return () => {
        canvas.off('mouse:down', handleClick);
        canvas.off('mouse:down', handleEraserClick);
      };
    }, [handleClick, handleEraserClick, drawStore.type, isDrawingMode]);

    // Fabric.js 자유 그리기 이벤트 처리 (펜/형광펜 모드용)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isDrawingMode) return;

      const handlePathCreated = () => {
        // 펜/형광펜으로 그린 후 자동 저장
        triggerAutoSave();
      };

      // 자유 그리기 완료 이벤트 리스너 등록
      canvas.on('path:created', handlePathCreated);

      return () => {
        canvas.off('path:created', handlePathCreated);
      };
    }, [isDrawingMode, triggerAutoSave]);

    // 이 useEffect는 위의 "Canvas 크기 업데이트"와 중복되어 제거됨
    // containerWidth, containerHeight가 변경될 때 이미 위에서 처리됨

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
      };
    }, []);

    // Undo 구현
    const handleUndo = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const snapshot = useToolsStore.getState().undo();
      if (snapshot) {
        canvas.loadFromJSON(snapshot, () => {
          canvas.renderAll();
        });
      }
    }, []);

    // Redo 구현
    const handleRedo = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const snapshot = useToolsStore.getState().redo();
      if (snapshot) {
        canvas.loadFromJSON(snapshot, () => {
          canvas.renderAll();
        });
      }
    }, []);

    // Clear 구현
    const handleClear = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      canvas.clear();
      useToolsStore.getState().clearUndo();
      useToolsStore.getState().clearRedo();
      useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));
    }, []);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        handleUndo,
        handleRedo,
        handleClear,
      }),
      [handleUndo, handleRedo, handleClear]
    );

    // 캔버스는 전체 높이를 사용 (PDF 뷰어와 동일한 높이)
    const canvasHeight = Math.max(containerHeight, 100);

    return (
      <>
        <canvas
          ref={canvasRef}
          width={containerWidth}
          height={canvasHeight}
          style={{
            position: "absolute",
            top: "0.5rem",     // PDF canvas의 m-2 (8px) 마진과 일치
            left: "0.5rem",    // PDF canvas의 m-2 (8px) 마진과 일치
            // CSS transform으로 PDF 줌 레벨 적용
            // 캔버스는 항상 원본 크기, 시각적으로만 확대/축소
            transform: `scale(${pdfScale})`,
            transformOrigin: "top left",
            cursor: isEnabled && isDrawingMode ? "crosshair" : "default",
            // 뷰어 모드에서도 필기가 보이도록 항상 표시
            opacity: isEnabled ? 1 : 0,
            // 뷰어 모드: 필기 보기만 가능 (상호작용 불가)
            // 필기 모드일 때만 마우스 이벤트 수신
            pointerEvents: isEnabled && isDrawingMode ? "auto" : "none",
            // z-index를 낮춰서 우측 사이드 패널이 위에 있도록 함
            // (사이드 패널의 버튼 클릭이 가능해야 함)
            zIndex: isDrawingMode ? 5 : -1,
            // 항상 표시 (뷰어 모드에서도 필기 기록이 보임)
            display: isEnabled ? "block" : "none",
          }}
        />

        {/* 협업 모드일 때만 Liveblocks 동기화 활성화 */}
        {isCollaborative && (
          <CollaborativeCanvasWrapper
            fabricCanvas={fabricCanvasRef.current}
            fileId={fileId}
            pageNum={pageNum}
            syncToStorageRef={syncToStorageRef}
          />
        )}
      </>
    );
  }
);

PDFDrawingOverlay.displayName = "PDFDrawingOverlay";
