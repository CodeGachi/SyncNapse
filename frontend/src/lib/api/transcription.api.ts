import { apiClient } from './client';

export interface TranscriptionSession {
  id: string;
  userId: string;
  title: string;
  noteId?: string;
  duration: number;
  status: string;
  fullAudioUrl?: string; // Full audio file URL (preferred)
  fullAudioKey?: string; // Storage key for full audio
  fullAudioSize?: number; // File size in bytes
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface AudioChunk {
  id: string;
  sessionId: string;
  chunkIndex: number;
  audioUrl: string;
  signedUrl?: string;
  storageUrl?: string;
  storageKey?: string;
  startTime: number;
  endTime: number;
  duration: number;
  sampleRate: number;
  createdAt: string;
  blob?: Blob;
}

export interface TranscriptWord {
  id: string;
  segmentId: string;
  word: string;
  startTime: number;
  confidence: number;
  wordIndex: number;
  createdAt: string;
}

export interface TranscriptSegment {
  id: string;
  sessionId: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  isPartial: boolean;
  language?: string;
  words?: TranscriptWord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionDto {
  title: string;
  noteId?: string;
}

export interface SaveAudioChunkDto {
  sessionId: string;
  chunkIndex: number;
  startTime: number;
  endTime: number;
  duration: number;
  sampleRate?: number;
  audioUrl: string;
}

export interface TranscriptWordDto {
  word: string;
  startTime: number;
  confidence?: number;
  wordIndex: number;
}

export interface SaveTranscriptDto {
  sessionId: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  isPartial?: boolean;
  language?: string;
  words?: TranscriptWordDto[];
}

export interface SaveFullAudioDto {
  sessionId: string;
  audioUrl: string; // Base64 encoded audio data URL
  duration: number;
}

export async function createSession(
  title: string,
  noteId?: string,
): Promise<TranscriptionSession> {
  return apiClient<TranscriptionSession>('/api/transcription/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, noteId }),
  });
}

export async function endSession(
  sessionId: string,
): Promise<TranscriptionSession> {
  return apiClient<TranscriptionSession>(
    `/api/transcription/sessions/${sessionId}/end`,
    {
      method: 'POST',
    },
  );
}

export async function getSessions(): Promise<TranscriptionSession[]> {
  return apiClient<TranscriptionSession[]>('/api/transcription/sessions');
}

export async function getSession(sessionId: string) {
  return apiClient<
    TranscriptionSession & {
      audioChunks: (AudioChunk & { signedUrl?: string })[];
      segments: TranscriptSegment[];
    }
  >(`/api/transcription/sessions/${sessionId}`);
}

export async function saveAudioChunk(
  dto: SaveAudioChunkDto,
): Promise<AudioChunk> {
  return apiClient<AudioChunk>('/api/transcription/audio-chunks', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function saveTranscript(
  dto: SaveTranscriptDto,
): Promise<TranscriptSegment> {
  return apiClient<TranscriptSegment>('/api/transcription/segments', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getTranscripts(
  sessionId: string,
): Promise<TranscriptSegment[]> {
  return apiClient<TranscriptSegment[]>(
    `/api/transcription/sessions/${sessionId}/transcripts`,
  );
}

export async function getAudioChunkByTime(
  sessionId: string,
  time: number,
): Promise<AudioChunk | null> {
  return apiClient<AudioChunk | null>(
    `/api/transcription/sessions/${sessionId}/audio-chunk?time=${time}`,
  );
}

export async function getTranscriptsByTimeRange(
  sessionId: string,
  startTime: number,
  endTime: number,
): Promise<TranscriptSegment[]> {
  return apiClient<TranscriptSegment[]>(
    `/api/transcription/sessions/${sessionId}/transcripts/range?startTime=${startTime}&endTime=${endTime}`,
  );
}

// Save full audio file for transcription session
// Replaces chunk-based approach with single file
export async function saveFullAudio(
  dto: SaveFullAudioDto,
): Promise<TranscriptionSession> {
  return apiClient<TranscriptionSession>('/api/transcription/full-audio', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

// Delete transcription session (soft delete with deletedAt timestamp)
// Removes from backend and local IndexedDB
export async function deleteSession(sessionId: string): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>(
    `/api/transcription/sessions/${sessionId}`,
    {
      method: 'DELETE',
    },
  );
}
