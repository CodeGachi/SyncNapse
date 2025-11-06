import { apiClient } from './client';

export interface TranscriptionSession {
  id: string;
  userId: string;
  title: string;
  noteId?: string;
  duration: number;
  status: string;
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

export interface TranscriptSegment {
  id: string;
  sessionId: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  isPartial: boolean;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionDto {
  title: string;
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

export interface SaveTranscriptDto {
  sessionId: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  isPartial?: boolean;
  language?: string;
}

export async function createSession(
  title: string,
): Promise<TranscriptionSession> {
  return apiClient<TranscriptionSession>('/api/transcription/sessions', {
    method: 'POST',
    body: JSON.stringify({ title }),
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
