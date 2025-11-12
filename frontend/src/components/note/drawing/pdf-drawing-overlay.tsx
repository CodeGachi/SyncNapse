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
import { drawShape, type DrawInfo } from "@/lib/utils/shapes";
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
  currentTool: string;
  penColor: string;
  penSize: number;
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
      currentTool,
      penColor,
      penSize,
      isPdf,
      onSave,
      isCollaborative = false,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

    const drawStore = useDrawStore();
    const toolsStore = useToolsStore();

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

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎨 드로잉 캔버스 초기화');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📐 캔버스 원본 크기 (PDF 원본 기준):');
      console.log(`   Width: ${containerWidth.toFixed(2)}px`);
      console.log(`   Height: ${adjustedHeight.toFixed(2)}px`);
      console.log(`   오른쪽 아래 모서리: (${containerWidth.toFixed(2)}, ${adjustedHeight.toFixed(2)})`);
      console.log('');
      console.log('🔍 현재 렌더링 크기:');
      console.log(`   Width: ${renderedWidth.toFixed(2)}px`);
      console.log(`   Height: ${renderedHeight.toFixed(2)}px`);
      console.log(`   Scale: ${pdfScale.toFixed(3)} (${(pdfScale * 100).toFixed(1)}%)`);
      console.log(`   오른쪽 아래 모서리: (${renderedWidth.toFixed(2)}, ${renderedHeight.toFixed(2)})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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

      // 캔버스 리사이즈 정보 출력
      const renderedWidth = containerWidth * pdfScale;
      const renderedHeight = adjustedHeight * pdfScale;

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔄 드로잉 캔버스 크기 업데이트');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📐 캔버스 원본 크기 (PDF 원본 기준):');
      console.log(`   Width: ${containerWidth.toFixed(2)}px`);
      console.log(`   Height: ${adjustedHeight.toFixed(2)}px`);
      console.log(`   오른쪽 아래 모서리: (${containerWidth.toFixed(2)}, ${adjustedHeight.toFixed(2)})`);
      console.log('');
      console.log('🔍 현재 렌더링 크기:');
      console.log(`   Width: ${renderedWidth.toFixed(2)}px`);
      console.log(`   Height: ${renderedHeight.toFixed(2)}px`);
      console.log(`   Scale: ${pdfScale.toFixed(3)} (${(pdfScale * 100).toFixed(1)}%)`);
      console.log(`   오른쪽 아래 모서리: (${renderedWidth.toFixed(2)}, ${renderedHeight.toFixed(2)})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

    // 미리보기 선 렌더링
    const renderPreviewLine = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 제거
        canvas.forEachObject((obj: any) => {
          if (obj.isPreview) {
            canvas.remove(obj);
          }
        });

        // 새 미리보기 선 추가
        const line = new fabric.Line(
          [start.x, start.y, end.x, end.y],
          {
            stroke: drawStore.lineColor,
            strokeWidth: drawStore.lineWidth,
            selectable: false,
            evented: false,
          }
        );
        (line as any).isPreview = true;
        canvas.add(line);
        canvas.renderAll();
      },
      [drawStore.lineColor, drawStore.lineWidth]
    );

    // 미리보기 사각형 렌더링
    const renderPreviewRect = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 제거
        canvas.forEachObject((obj: any) => {
          if (obj.isPreview) {
            canvas.remove(obj);
          }
        });

        // 새 미리보기 사각형 추가
        const rect = new fabric.Rect({
          left: Math.min(start.x, end.x),
          top: Math.min(start.y, end.y),
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
          fill: 'rgba(255, 255, 255, 0)',
          stroke: drawStore.lineColor,
          strokeWidth: drawStore.lineWidth,
          selectable: false,
          evented: false,
        });
        (rect as any).isPreview = true;
        canvas.add(rect);
        canvas.renderAll();
      },
      [drawStore.lineColor, drawStore.lineWidth]
    );

    // 미리보기 원 렌더링
    const renderPreviewCircle = useCallback(
      (start: { x: number; y: number }, end: { x: number; y: number }) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        // 기존 미리보기 제거
        canvas.forEachObject((obj: any) => {
          if (obj.isPreview) {
            canvas.remove(obj);
          }
        });

        // 새 미리보기 원 추가
        const radius = Math.sqrt(
          (end.x - start.x) ** 2 + (end.y - start.y) ** 2
        ) / 2;
        const circle = new fabric.Circle({
          left: start.x,
          top: start.y,
          radius,
          fill: 'rgba(255, 255, 255, 0)',
          stroke: drawStore.lineColor,
          strokeWidth: drawStore.lineWidth,
          selectable: false,
          evented: false,
        });
        (circle as any).isPreview = true;
        canvas.add(circle);
        canvas.renderAll();
      },
      [drawStore.lineColor, drawStore.lineWidth]
    );

    // Auto-save drawing data to database (debounced) - 반드시 먼저 정의
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

    // 마우스 다운 이벤트
    const handleMouseDown = useCallback(
      (event: any) => {
        if (!isEnabled || !isDrawingMode || !fabricCanvasRef.current) return;

        // 펜/형광펜 모드는 자동으로 처리되므로 이벤트 핸들러 제외
        const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';
        if (isFreeDrawingMode) return;

        const pos = fabricCanvasRef.current.getPointer(event.e as MouseEvent);

        // 캔버스 경계 체크: 캔버스 영역 내에서만 드로잉 시작
        const adjustedHeight = Math.max(containerHeight, 100);
        if (pos.x < 0 || pos.x > containerWidth || pos.y < 0 || pos.y > adjustedHeight) {
          return; // 캔버스 밖이면 드로잉 시작 안 함
        }

        setIsDrawing(true);
        setStartPos(pos);

        // 히스토리 저장
        useToolsStore.getState().saveSnapshot(
          JSON.stringify(fabricCanvasRef.current.toJSON())
        );
      },
      [isEnabled, isDrawingMode, drawStore.type, containerWidth, containerHeight]
    );

    // 마우스 이동 이벤트
    const handleMouseMove = useCallback(
      (event: any) => {
        if (
          !isDrawing ||
          !isEnabled ||
          !fabricCanvasRef.current ||
          !startPos
        ) return;

        const canvas = fabricCanvasRef.current;
        const pos = canvas.getPointer(event.e as MouseEvent);

        // 도구별 미리보기 렌더링
        const toolType = drawStore.type;

        if (toolType === 'eraser') {
          // 지우개 미리보기: 지울 영역을 사각형으로 표시
          renderPreviewRect(startPos, pos);
        } else if (
          toolType === 'free' ||
          toolType === 'solidLine' ||
          toolType === 'dashedLine'
        ) {
          renderPreviewLine(startPos, pos);
        } else if (toolType === 'rect') {
          renderPreviewRect(startPos, pos);
        } else if (toolType === 'circle') {
          renderPreviewCircle(startPos, pos);
        }
      },
      [
        isDrawing,
        isEnabled,
        startPos,
        drawStore.type,
        renderPreviewLine,
        renderPreviewRect,
        renderPreviewCircle,
      ]
    );

    // 마우스 업 이벤트
    const handleMouseUp = useCallback(
      (event: any) => {
        if (!isDrawing || !fabricCanvasRef.current || !startPos) return;

        const canvas = fabricCanvasRef.current;
        const pos = canvas.getPointer(event.e as MouseEvent);

        // 미리보기 제거
        canvas.forEachObject((obj: any) => {
          if (obj.isPreview) {
            canvas.remove(obj);
          }
        });

        const toolType = drawStore.type;

        // 지우개 처리: 지우개 영역에 겹치는 모든 객체 삭제
        if (toolType === 'eraser') {
          const objectsToRemove: fabric.Object[] = [];

          canvas.forEachObject((obj) => {
            // 지우개 영역과 객체의 충돌 감지
            const objBounds = obj.getBoundingRect();
            const eraserX = Math.min(startPos.x, pos.x);
            const eraserY = Math.min(startPos.y, pos.y);
            const eraserWidth = Math.abs(pos.x - startPos.x) || drawStore.lineWidth;
            const eraserHeight = Math.abs(pos.y - startPos.y) || drawStore.lineWidth;

            // 간단한 충돌 감지: 지우개 영역과 객체 바운딩박스가 겹치는지 확인
            if (
              objBounds.left < eraserX + eraserWidth &&
              objBounds.left + objBounds.width > eraserX &&
              objBounds.top < eraserY + eraserHeight &&
              objBounds.top + objBounds.height > eraserY
            ) {
              objectsToRemove.push(obj);
            }
          });

          // 겹친 객체 모두 삭제
          objectsToRemove.forEach((obj) => canvas.remove(obj));
          canvas.renderAll();

          // 히스토리 업데이트
          useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

          // 자동 저장 트리거
          triggerAutoSave();
        } else {
          // 도형 생성
          const drawInfo: DrawInfo = {
            lineColor: drawStore.lineColor,
            lineWidth: drawStore.lineWidth,
            mouseFrom: startPos,
            mouseTo: pos,
          };

          const shape = drawShape(drawInfo, toolType as any);

          if (shape) {
            canvas.add(shape);
            canvas.renderAll();

            // 히스토리 업데이트
            useToolsStore.getState().saveSnapshot(JSON.stringify(canvas.toJSON()));

            // 자동 저장 트리거
            triggerAutoSave();
          }
        }

        setIsDrawing(false);
        setStartPos(null);
      },
      [isDrawing, startPos, drawStore.type, drawStore.lineColor, drawStore.lineWidth, triggerAutoSave]
    );

    // Canvas 이벤트 핸들러 바인딩 (도형/지우개용, 펜 제외)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !isDrawingMode) return;

      // 펜/형광펜은 Fabric의 자동 처리를 사용하므로 이벤트 핸들러 등록 안 함
      const isFreeDrawingMode = drawStore.type === 'pen' || drawStore.type === 'highlighter';

      if (isFreeDrawingMode) {
        // 펜 모드로 전환 시 기존 이벤트 핸들러 제거
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
        return;
      }

      // 도형 모드: 이벤트 핸들러 등록
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:move', handleMouseMove);
      canvas.on('mouse:up', handleMouseUp);

      return () => {
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:move', handleMouseMove);
        canvas.off('mouse:up', handleMouseUp);
      };
    }, [handleMouseDown, handleMouseMove, handleMouseUp, drawStore.type, isDrawingMode]);

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
