/**
 * PDF 뷰어 위의 필기 오버레이 컴포넌트
 * 마우스와 터치펜 입력 모두 지원, 하단 네비게이션 바 형태
 */

"use client";

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import * as fabric from "fabric";
import { DRAWING_TOOL_DEFAULTS, type DrawingTool } from "@/lib/types/drawing";
import { getDrawing } from "@/lib/db/drawings";

/**
 * 커스텀 지우개 브러시
 * 1. 드래그 중: 형광펜처럼 반투명으로 시각화
 * 2. 마우스 업: 그려진 영역 모두 투명화
 */
class EraserBrush extends fabric.BaseBrush {
  declare canvas: any;
  declare width: number;
  lastPointer: any = null;
  pathPoints: Array<{ x: number; y: number }> = [];

  onMouseDown(pointer: any) {
    this.lastPointer = pointer;
    this.pathPoints = [{ x: pointer.x, y: pointer.y }];
  }

  onMouseMove(pointer: any) {
    if (!this.canvas.contextTop) return;

    const ctx = this.canvas.contextTop;

    // 경로 저장
    this.pathPoints.push({ x: pointer.x, y: pointer.y });

    // 형광펜 스타일로 시각화 (반투명 노란색)
    ctx.strokeStyle = "rgba(255, 255, 0, 0.4)";
    ctx.lineWidth = this.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (this.lastPointer) {
      ctx.beginPath();
      ctx.moveTo(this.lastPointer.x, this.lastPointer.y);
      ctx.lineTo(pointer.x, pointer.y);
      ctx.stroke();
    }

    this.lastPointer = pointer;
  }

  onMouseUp() {
    if (!this.canvas.contextTop) return;

    const ctx = this.canvas.contextTop;
    const radius = this.width / 2;

    // 저장된 모든 포인트에 대해 clearRect 호출 - 투명화
    for (const point of this.pathPoints) {
      ctx.clearRect(point.x - radius, point.y - radius, this.width, this.width);
    }

    this.pathPoints = [];
    this.lastPointer = null;
  }

  // BaseBrush의 추상 메서드 - 지우개는 렌더링하지 않음
  _render() {
    // 아무것도 하지 않음
  }
}

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
  containerWidth: number;
  containerHeight: number;
  currentTool?: "pen" | "highlighter" | "eraser";
  penColor?: string;
  penSize?: number;
  onSave?: (data: any) => Promise<void>;
}

const PDF_CONTROL_BAR_HEIGHT = 56; // PDF 컨트롤 바 높이 (h-14)

export const PDFDrawingOverlay = forwardRef<PDFDrawingOverlayHandle, PDFDrawingOverlayProps>(
  function PDFDrawingOverlayComponent(
    {
      isEnabled,
      isDrawingMode,
      noteId,
      fileId,
      pageNum,
      containerWidth,
      containerHeight,
      currentTool: propCurrentTool = "pen",
      penColor: propPenColor = "#000000",
      penSize: propPenSize = 3,
      onSave,
    }: PDFDrawingOverlayProps,
    ref
  ) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const savedImageCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [currentTool, setCurrentTool] = useState<"pen" | "highlighter" | "eraser">(propCurrentTool);
  const [penColor, setPenColor] = useState(propPenColor);
  const [penSize, setPenSize] = useState(propPenSize);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const historyRef = useRef<any[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Canvas 초기화 및 데이터 로드
  useEffect(() => {
    if (!canvasRef.current || !isEnabled) return;

    let isComponentMounted = true;
    let fabricCanvas: fabric.Canvas | null = null;

    const initializeCanvas = async () => {
      try {
        // Canvas 높이 - PDF 컨트롤 바 공간 확보
        const canvasHeight = Math.max(containerHeight - PDF_CONTROL_BAR_HEIGHT, 100);
        // Canvas 너비 - containerWidth를 전체로 사용 (sidebar는 별도 컴포넌트)
        const canvasWidth = Math.max(containerWidth, 100);

        // Canvas 엘리먼트 설정
        if (!canvasRef.current) return;

        // 기존 캔버스 정리 (clear 전에 반드시 isDrawingMode를 false로 설정)
        if (fabricCanvasRef.current) {
          try {
            // isDrawingMode를 false로 설정하여 drawing context 정리
            fabricCanvasRef.current.isDrawingMode = false;
            // 마우스 이벤트 리스너 제거
            fabricCanvasRef.current.off("mouse:up");
            // dispose - clear는 호출하지 않음 (context 문제 발생)
            fabricCanvasRef.current.dispose();
          } catch (e) {
            console.warn("Error disposing previous canvas:", e);
          }
          fabricCanvasRef.current = null;
        }

        // Canvas 엘리먼트 초기화 (새로 설정)
        canvasRef.current.width = canvasWidth;
        canvasRef.current.height = canvasHeight;

        // 저장된 필기 이미지 Canvas 초기화
        if (savedImageCanvasRef.current) {
          savedImageCanvasRef.current.width = canvasWidth;
          savedImageCanvasRef.current.height = canvasHeight;
        }

        // Fabric Canvas 생성
        fabricCanvas = new fabric.Canvas(canvasRef.current, {
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: "", // 빈 문자열로 설정하여 완전 투명성 보장
          enableRetinaScaling: true,
          renderOnAddRemove: false,
        });

        if (!isComponentMounted) return;

        fabricCanvasRef.current = fabricCanvas;

        // 자유 드로잉 모드 설정
        fabricCanvas.isDrawingMode = true;
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        fabricCanvas.freeDrawingBrush.width = penSize;

        // 색상을 rgba로 변환하여 투명도 적용
        const hex = penColor.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        fabricCanvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, 1)`;

        // 캔버스 컨텍스트 초기화를 위해 한 번 렌더링
        fabricCanvas.renderAll();

        // 저장된 필기 데이터 로드
        try {
          const savedDrawing = await getDrawing(noteId, fileId, pageNum);
          if (savedDrawing && savedDrawing.canvas) {
            // 저장된 데이터가 있으면 로드 (완벽한 정리 후)
            const wasDrawingMode = fabricCanvas.isDrawingMode;
            try {
              // 1. 드로잉 모드 종료
              fabricCanvas.isDrawingMode = false;

              // 2. 선택된 객체 해제
              fabricCanvas.discardActiveObject();

              // 3. 모든 객체 제거 (clearRect 에러 방지를 위해 clear() 대신 객체 제거)
              const objects = fabricCanvas.getObjects();
              objects.forEach((obj) => fabricCanvas!.remove(obj));

              // 4. 렌더링 (clean state)
              fabricCanvas.renderAll();

              // 5. contextTop 강제 초기화 (clearRect 에러 방지)
              // 드로잉 모드를 재활성화하여 contextTop 재생성
              fabricCanvas.isDrawingMode = true;

              // 6. loadFromJSON 호출
              await new Promise<void>((resolve) => {
                try {
                  fabricCanvas!.loadFromJSON(savedDrawing.canvas, () => {
                    // 로드 완료 후 드로잉 모드 복원
                    fabricCanvas!.isDrawingMode = wasDrawingMode;
                    fabricCanvas!.renderAll();
                    // 히스토리 초기화
                    historyRef.current = [JSON.stringify(fabricCanvas!.toJSON())];
                    historyIndexRef.current = 0;
                    setCanUndo(false);
                    setCanRedo(false);
                    resolve();
                  });
                } catch (error) {
                  console.warn("Error during loadFromJSON, recovering:", error);
                  fabricCanvas!.isDrawingMode = wasDrawingMode;
                  resolve();
                }
              });
              console.log(`Drawing data loaded for file ${fileId} page ${pageNum}`);

              // 저장된 필기 이미지를 savedImageCanvas에 렌더링
              if (savedImageCanvasRef.current && savedDrawing.image) {
                const ctx = savedImageCanvasRef.current.getContext("2d");
                if (ctx) {
                  const img = new Image();
                  img.onload = () => {
                    ctx.clearRect(
                      0,
                      0,
                      savedImageCanvasRef.current!.width,
                      savedImageCanvasRef.current!.height
                    );
                    ctx.drawImage(
                      img,
                      0,
                      0,
                      canvasWidth,
                      canvasHeight
                    );
                  };
                  img.src = savedDrawing.image;
                }
              }
            } catch (error) {
              console.warn("Error preparing canvas for load:", error);
              // 복구: 드로잉 모드 복원
              fabricCanvas.isDrawingMode = wasDrawingMode;
              saveHistory();
            }
          } else {
            // 새 캔버스 - 초기 상태 저장
            saveHistory();
          }
        } catch (loadError) {
          console.warn("Failed to load drawing data, starting fresh:", loadError);
          saveHistory();
        }

        // 마우스 업 이벤트 - 드로잉 완료 후 저장
        const handleMouseUp = () => {
          saveHistory();
          debouncedAutoSave();
        };

        fabricCanvas.on("mouse:up", handleMouseUp);

        console.log("Canvas initialized for page", pageNum, ":", containerWidth, "x", canvasHeight);
      } catch (error) {
        console.error("Failed to initialize canvas:", error);
      }
    };

    initializeCanvas();

    return () => {
      isComponentMounted = false;
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.off("mouse:up");
          fabricCanvasRef.current.dispose();
        } catch (e) {
          console.warn("Error during cleanup:", e);
        }
        fabricCanvasRef.current = null;
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [containerWidth, containerHeight, isEnabled, noteId, fileId, pageNum]);

  // Props로부터 tool/color/size 변경 감지 및 동기화
  useEffect(() => {
    setCurrentTool(propCurrentTool);
    setPenColor(propPenColor);
    setPenSize(propPenSize);
  }, [propCurrentTool, propPenColor, propPenSize]);

  // isDrawingMode 변경시 canvas drawing mode 동기화
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // isDrawingMode에 따라 canvas drawing mode 업데이트
    canvas.isDrawingMode = isDrawingMode;

    // drawing mode 진입시 brush 재설정
    if (isDrawingMode && canvas.freeDrawingBrush) {
      // Brush width와 color가 올바르게 설정되었는지 확인
      if (currentTool === "eraser") {
        // 커스텀 EraserBrush 사용 - Canvas clearRect로 투명하게 지우기
        canvas.freeDrawingBrush = new EraserBrush(canvas);
        canvas.freeDrawingBrush.width = Math.max(penSize * 1.5, 6);
      } else {
        const toolDefaults = DRAWING_TOOL_DEFAULTS[currentTool];
        const opacity = toolDefaults?.opacity || 1;
        const hex = penColor.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        canvas.freeDrawingBrush.width = penSize;
        if (canvas.contextTop) {
          canvas.contextTop.globalCompositeOperation = "source-over";
        }
      }
      canvas.renderAll();
    }
  }, [isDrawingMode, currentTool, penColor, penSize]);

  // 도구 및 색상/크기 변경 (drawing mode가 아닐 때는 실행 안 함)
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvas.freeDrawingBrush || !isDrawingMode) return;

    try {
      if (currentTool === "eraser") {
        // 커스텀 EraserBrush 사용 - Canvas clearRect로 투명하게 지우기
        canvas.freeDrawingBrush = new EraserBrush(canvas);
        canvas.freeDrawingBrush.width = Math.max(penSize * 1.5, 6);
      } else {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = penSize;

        const toolDefaults = DRAWING_TOOL_DEFAULTS[currentTool];
        const opacity = toolDefaults?.opacity || 1;
        const hex = penColor.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        canvas.freeDrawingBrush.color = `rgba(${r}, ${g}, ${b}, ${opacity})`;

        if (canvas.contextTop) {
          canvas.contextTop.globalCompositeOperation = "source-over";
        }
      }

      canvas.renderAll();
    } catch (error) {
      console.error("Failed to update tool:", error);
    }
  }, [isDrawingMode, currentTool, penColor, penSize]);

  // 히스토리 저장
  const saveHistory = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const state = JSON.stringify(canvas.toJSON());
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );
    historyRef.current.push(state);
    historyIndexRef.current++;

    setCanUndo(true);
    setCanRedo(false);
  };

  // 실행취소
  const handleUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;

    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];

    try {
      const wasDrawingMode = canvas.isDrawingMode;
      canvas.isDrawingMode = false;

      // Canvas 정리
      canvas.discardActiveObject();
      const objects = canvas.getObjects();
      objects.forEach((obj) => canvas!.remove(obj));
      canvas.renderAll();

      // contextTop 강제 초기화 (clearRect 에러 방지)
      canvas.isDrawingMode = true;

      // loadFromJSON 호출
      canvas.loadFromJSON(state, () => {
        canvas!.isDrawingMode = wasDrawingMode;
        canvas!.renderAll();
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(true);
        debouncedAutoSave();
      });
    } catch (error) {
      console.warn("Error during undo:", error);
      historyIndexRef.current++;
    }
  };

  // 다시실행
  const handleRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (
      !canvas ||
      historyIndexRef.current >= historyRef.current.length - 1
    )
      return;

    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];

    try {
      const wasDrawingMode = canvas.isDrawingMode;
      canvas.isDrawingMode = false;

      // Canvas 정리
      canvas.discardActiveObject();
      const objects = canvas.getObjects();
      objects.forEach((obj) => canvas!.remove(obj));
      canvas.renderAll();

      // contextTop 강제 초기화 (clearRect 에러 방지)
      canvas.isDrawingMode = true;

      // loadFromJSON 호출
      canvas.loadFromJSON(state, () => {
        canvas!.isDrawingMode = wasDrawingMode;
        canvas!.renderAll();
        setCanUndo(true);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        debouncedAutoSave();
      });
    } catch (error) {
      console.warn("Error during redo:", error);
      historyIndexRef.current--;
    }
  };

  // 전체 지우기
  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      // canvas.clear() 대신 모든 객체 제거 (clearRect 에러 방지)
      const objects = canvas.getObjects();
      canvas.discardActiveObject();
      objects.forEach((obj) => canvas.remove(obj));
      canvas.renderAll();
    } catch (e) {
      console.warn("Error during clear:", e);
    }

    historyRef.current = [];
    historyIndexRef.current = -1;
    saveHistory();
    debouncedAutoSave();
  };

  // 자동저장
  const handleAutoSave = async () => {
    const canvas = fabricCanvasRef.current;
    if (!onSave || !canvas) return;

    try {
      // 캔버스 배경을 명시적으로 투명하게 설정
      const originalBg = canvas.backgroundColor;
      canvas.backgroundColor = "";

      const canvasJSON = JSON.stringify(canvas.toJSON());
      // PNG 형식으로 내보낼 때 투명도 보존
      const imageData = canvas.toDataURL({ format: "png", multiplier: 1 });

      // 원래 배경색 복원
      canvas.backgroundColor = originalBg;

      const data = {
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
      console.log("Drawing auto-saved successfully");
    } catch (error) {
      console.error("Failed to auto-save drawing:", error);
    }
  };

  // 디바운스된 자동저장 (마우스 업 후 1초 후 저장)
  const debouncedAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 1000);
  };

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 외부에 undo/redo/clear 함수 노출
  useImperativeHandle(ref, () => ({
    handleUndo,
    handleRedo,
    handleClear,
  }), []);

  return (
    <div
      className="absolute inset-0 z-40 bg-transparent"
      style={{
        height: containerHeight,
        width: containerWidth,
        pointerEvents: isDrawingMode ? "auto" : "none", // 뷰어 모드에서 pointer events 차단
      }}
    >
      {/* 3-레이어 캔버스 스택: PDF(아래) → 저장된 필기 이미지 → 현재 필기(위) */}
      <div className="relative h-full w-full">
        {/* 레이어 2: 저장된 필기 이미지 (투명 PNG) - PDF와 현재 캔버스 사이 */}
        <canvas
          ref={savedImageCanvasRef}
          className="absolute inset-0"
          style={{
            pointerEvents: "none", // 이 레이어는 클릭 이벤트 차단
            zIndex: 1,
          }}
        />

        {/* 레이어 3: 현재 필기 Canvas (Fabric.js) - 맨 위 레이어 */}
        <canvas
          ref={canvasRef}
          className="block absolute inset-0"
          style={{
            display: "block",
            touchAction: "none",
            cursor: isDrawingMode ? "crosshair" : "pointer",
            backgroundColor: "transparent",
            width: "100%",
            height: "100%",
            pointerEvents: isDrawingMode ? "auto" : "none",
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
  }
);
