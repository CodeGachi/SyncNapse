/**
 * Transcription API Service
 * 
 * Handles API calls for transcription sessions, segments, and audio
 */

import { apiClient, getAuthHeaders } from '../client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface TranscriptionSession {
  id: string;
  userId: string;
  title: string;
  noteId?: string;
  duration: number;
  status: string;
  fullAudioUrl?: string;
  fullAudioKey?: string;
  fullAudioSize?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  _count?: {
    segments: number;
    audioChunks: number;
  };
}

export interface TranscriptionSegment {
  id: string;
  sessionId: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  language?: string;
  words?: {
    word: string;
    startTime: number;
    confidence: number;
    wordIndex: number;
  }[];
}

export interface SessionWithSegments {
  id: string;
  userId: string;
  title: string;
  noteId?: string;
  duration: number;
  status: string;
  fullAudioUrl?: string;
  fullAudioKey?: string;
  createdAt: string;
  updatedAt: string;
  segments: TranscriptionSegment[];
}

/**
 * Fetch all transcription sessions for current user
 */
export async function getAllSessions(): Promise<TranscriptionSession[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcription/sessions`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    const sessions = await response.json();
    return sessions;
  } catch (error) {
    console.error('[transcription-api] Failed to fetch sessions:', error);
    throw error;
  }
}

/**
 * Fetch transcription sessions for a specific note
 */
export async function getSessionsByNote(noteId: string): Promise<TranscriptionSession[]> {
  try {
    const allSessions = await getAllSessions();
    return allSessions.filter(session => session.noteId === noteId);
  } catch (error) {
    console.error(`[transcription-api] Failed to fetch sessions for note ${noteId}:`, error);
    throw error;
  }
}

/**
 * Fetch a single transcription session with segments
 */
export async function getSessionWithSegments(sessionId: string): Promise<SessionWithSegments> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcription/sessions/${sessionId}`, {
      method: 'GET',
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    const session = await response.json();
    return session;
  } catch (error) {
    console.error(`[transcription-api] Failed to fetch session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Create a new transcription session
 */
export async function createSession(title: string, noteId?: string): Promise<TranscriptionSession> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcription/sessions`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        noteId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const session = await response.json();
    return session;
  } catch (error) {
    console.error('[transcription-api] Failed to create session:', error);
    throw error;
  }
}

/**
 * Save transcription segment
 */
export async function saveSegment(
  sessionId: string,
  text: string,
  startTime: number,
  confidence?: number,
  words?: any[]
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcription/segments`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        text,
        startTime,
        confidence,
        words,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save segment: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[transcription-api] Failed to save segment:', error);
    throw error;
  }
}

/**
 * Save full audio file
 */
export async function saveFullAudio(
  sessionId: string,
  audioUrl: string,
  duration: number
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcription/full-audio`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        audioUrl,
        duration,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save audio: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[transcription-api] Failed to save audio:', error);
    throw error;
  }
}

/**
 * End transcription session
 */
export async function endSession(sessionId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/transcription/sessions/${sessionId}/end`, {
      method: 'POST',
      credentials: 'include',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to end session: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[transcription-api] Failed to end session:', error);
    throw error;
  }
}

