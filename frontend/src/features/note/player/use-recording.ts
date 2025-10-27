/**
 * 실제 녹음 기능 훅 (MediaRecorder API)
 */

"use client";

import { useState, useRef, useCallback } from "react";

export interface RecordingData {
  id: string;
  title: string;
  audioBlob: Blob;
  duration: number;
  createdAt: Date;
}

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // 마이크 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;

      // MediaRecorder 설정
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 데이터 수집
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // 녹음 시작
      mediaRecorder.start(100); // 100ms마다 데이터 수집
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("녹음 시작 실패:", err);
      setError("마이크 권한이 필요합니다");
    }
  }, []);

  // 녹음 일시정지
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // 녹음 재개
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      // 타이머 재개
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  // 녹음 종료 및 저장
  const stopRecording = useCallback((): Promise<RecordingData> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error("녹음이 시작되지 않았습니다"));
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        // Blob 생성
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "audio/webm",
        });

        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // 타이머 정리
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const recordingData: RecordingData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: "", // 사용자가 입력할 제목 (빈 값)
          audioBlob,
          duration: recordingTime,
          createdAt: new Date(),
        };

        // 상태 초기화
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        audioChunksRef.current = [];

        resolve(recordingData);
      };

      mediaRecorderRef.current.stop();
    });
  }, [recordingTime]);

  // 녹음 취소
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // 타이머 정리
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 상태 초기화
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
  }, []);

  // 시간 포맷팅
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    isRecording,
    isPaused,
    recordingTime,
    formattedTime: formatTime(recordingTime),
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}
