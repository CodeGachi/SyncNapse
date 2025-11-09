/**
 * Fabric.js Canvas와 Liveblocks 실시간 동기화 훅
 *
 * Educator 노트에서 Fabric.js Canvas의 필기를 실시간으로 동기화합니다.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import {
  useStorage,
  useMutation,
  useEventListener,
  getCanvasKey,
} from "@/lib/liveblocks/liveblocks.config";

interface UseLiveblocksSyncOptions {
  canvas: fabric.Canvas | null;
  fileId: string;
  pageNum: number;
  isEducator: boolean; // Educator만 수정 가능
}

export function useLivebloksCanvasSync({
  canvas,
  fileId,
  pageNum,
  isEducator,
}: UseLiveblocksSyncOptions) {
  const canvasKey = getCanvasKey(fileId, pageNum);
  const isLocalUpdate = useRef(false);

  // Liveblocks Storage에서 현재 페이지 Canvas 데이터 조회
  const canvasData = useStorage((root) => root.canvasData?.[canvasKey]);

  // Canvas 업데이트 Mutation
  const updateCanvas = useMutation(({ storage }, canvasJSON: any) => {
    const canvasDataMap = storage.get("canvasData");
    if (!canvasDataMap) {
      storage.set("canvasData", { [canvasKey]: canvasJSON });
    } else {
      canvasDataMap[canvasKey] = canvasJSON;
    }
  }, [canvasKey]);

  // 1. Liveblocks Storage → Fabric.js Canvas (원격 업데이트 수신)
  useEffect(() => {
    if (!canvas || !canvasData || isLocalUpdate.current) {
      return;
    }

    console.log("[Liveblocks] Remote canvas update received", canvasKey);

    // Fabric.js Canvas에 로드
    canvas.loadFromJSON(canvasData, () => {
      canvas.renderAll();
      console.log("[Liveblocks] Canvas loaded from remote", canvasData.objects?.length || 0, "objects");
    });
  }, [canvas, canvasData, canvasKey]);

  // 2. Fabric.js Canvas → Liveblocks Storage (로컬 업데이트 전송)
  const syncToLiveblocks = useCallback(() => {
    if (!canvas || !isEducator) return;

    isLocalUpdate.current = true;

    const canvasJSON = canvas.toJSON();
    updateCanvas(canvasJSON);

    console.log("[Liveblocks] Local canvas synced", canvasJSON.objects?.length || 0, "objects");

    // 플래그 초기화 (다음 프레임)
    setTimeout(() => {
      isLocalUpdate.current = false;
    }, 100);
  }, [canvas, isEducator, updateCanvas]);

  // 3. Fabric.js 이벤트 리스너 등록
  useEffect(() => {
    if (!canvas || !isEducator) return;

    // Canvas 오브젝트가 추가/수정/삭제될 때 동기화
    const events = [
      "object:added",
      "object:modified",
      "object:removed",
      "path:created", // 자유 그리기
    ];

    events.forEach((event) => {
      canvas.on(event as any, syncToLiveblocks);
    });

    return () => {
      events.forEach((event) => {
        canvas.off(event as any, syncToLiveblocks);
      });
    };
  }, [canvas, isEducator, syncToLiveblocks]);

  // 4. Student는 Canvas를 읽기 전용으로 설정
  useEffect(() => {
    if (!canvas || isEducator) return;

    // 모든 오브젝트를 선택 불가능하게 설정
    canvas.selection = false;
    canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = false;
    });

    console.log("[Liveblocks] Canvas set to read-only for student");
  }, [canvas, isEducator]);

  // 5. Canvas 초기 로드
  useEffect(() => {
    if (!canvas || !canvasData) return;

    console.log("[Liveblocks] Initial canvas load", canvasKey);

    canvas.loadFromJSON(canvasData, () => {
      canvas.renderAll();
    });
  }, [canvas, canvasData, canvasKey]);

  return {
    syncToLiveblocks,
    isReadOnly: !isEducator,
  };
}
