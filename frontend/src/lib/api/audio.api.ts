/**
 * Audio API Client
 * AudioRecording 및 타임라인 이벤트 관리
 */

import { apiClient } from './client';

// ===== Types =====

export interface AudioRecording {
  id: string;
  noteId: string;
  title: string;
  fileUrl: string;
  storageKey: string;
  durationSec?: number;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  timelineEvents?: AudioTimelineEvent[];
}

export interface AudioTimelineEvent {
  id: string;
  recordingId: string;
  timestamp: number; // 초 단위
  fileId?: string;
  pageNumber?: number;
  createdAt: string;
}

export interface CreateAudioRecordingDto {
  noteId: string;
  title?: string;
  durationSec?: number;
}

export interface CreateTimelineEventDto {
  timestamp: number; // 초 단위
  fileId?: string;
  pageNumber?: number;
}

// ===== API Functions =====

/**
 * AudioRecording 생성 (메타데이터만, 파일 없이)
 */
export async function createRecording(
  dto: CreateAudioRecordingDto
): Promise<AudioRecording> {
  return apiClient<AudioRecording>('/api/audio/recordings', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * AudioRecording 조회 (타임라인 이벤트 포함)
 */
export async function getRecording(
  recordingId: string
): Promise<AudioRecording> {
  return apiClient<AudioRecording>(`/api/audio/recordings/${recordingId}`);
}

/**
 * AudioRecording 삭제
 */
export async function deleteRecording(
  recordingId: string
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(
    `/api/audio/recordings/${recordingId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * 타임라인 이벤트 추가 (페이지 컨텍스트 저장)
 */
export async function addTimelineEvent(
  recordingId: string,
  dto: CreateTimelineEventDto
): Promise<AudioTimelineEvent> {
  return apiClient<AudioTimelineEvent>(
    `/api/audio/recordings/${recordingId}/timeline`,
    {
      method: 'POST',
      body: JSON.stringify(dto),
    }
  );
}

/**
 * 타임라인 이벤트 목록 조회
 */
export async function getTimelineEvents(
  recordingId: string
): Promise<AudioTimelineEvent[]> {
  return apiClient<AudioTimelineEvent[]>(
    `/api/audio/recordings/${recordingId}/timeline`
  );
}

// ===== Helper Functions =====

/**
 * 현재 재생 시간에 해당하는 페이지 컨텍스트 계산
 * @param timelineEvents - 타임라인 이벤트 배열 (timestamp 오름차순 정렬)
 * @param currentTime - 현재 재생 시간 (초)
 * @returns 현재 시간에 해당하는 fileId/pageNumber 정보
 */
export function getPageContextAtTime(
  timelineEvents: AudioTimelineEvent[],
  currentTime: number
): { fileId?: string; pageNumber: number } | null {
  if (!timelineEvents || timelineEvents.length === 0) {
    return null;
  }

  // 현재 시간 이전의 가장 최근 이벤트 찾기
  const event = timelineEvents
    .filter((e) => e.timestamp <= currentTime)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  // pageNumber가 있어야 유효한 컨텍스트
  if (!event || !event.pageNumber) {
    return null;
  }

  return {
    fileId: event.fileId,
    pageNumber: event.pageNumber,
  };
}
