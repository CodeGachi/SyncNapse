const DB_NAME = 'SyncNapse_Transcription';
const DB_VERSION = 3; // Incremented for schema changes

interface TranscriptionDB {
  sessions: {
    id: string;
    title: string;
    startTime: number;
    endTime?: number;
    duration: number;
    fullAudioBlob?: Blob; // Full audio file (replaces chunks)
    fullAudioUrl?: string; // MinIO URL for full audio
    createdAt: string;
  };
  segments: {
    id: string;
    sessionId: string;
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
    isPartial: boolean;
    language: string;
    createdAt: string;
  };
  words: {
    id: string;
    segmentId: string;
    word: string;
    startTime: number;
    confidence: number;
    wordIndex: number;
    createdAt: string;
  };
  audioChunks: {
    id: string;
    sessionId: string;
    chunkIndex: number;
    blob: Blob;
    startTime: number;
    endTime: number;
    duration: number;
    createdAt: string;
  };
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('segments')) {
        const segmentsStore = db.createObjectStore('segments', { keyPath: 'id' });
        segmentsStore.createIndex('sessionId', 'sessionId', { unique: false });
        segmentsStore.createIndex('startTime', 'startTime', { unique: false });
      }
      
      // Add words store for word-level timestamps
      if (!db.objectStoreNames.contains('words')) {
        const wordsStore = db.createObjectStore('words', { keyPath: 'id' });
        wordsStore.createIndex('segmentId', 'segmentId', { unique: false });
        wordsStore.createIndex('wordIndex', 'wordIndex', { unique: false });
        wordsStore.createIndex('startTime', 'startTime', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('audioChunks')) {
        const chunksStore = db.createObjectStore('audioChunks', { keyPath: 'id' });
        chunksStore.createIndex('sessionId', 'sessionId', { unique: false });
        chunksStore.createIndex('chunkIndex', 'chunkIndex', { unique: false });
      }
      
      if (oldVersion < 2) {
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        if (transaction) {
          const segmentsStore = transaction.objectStore('segments');
          const cursorRequest = segmentsStore.openCursor();
          
          cursorRequest.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const segment = cursor.value;
              if (segment.isPartial === undefined) {
                segment.isPartial = false;
              }
              if (!segment.language) {
                segment.language = 'ko-KR';
              }
              cursor.update(segment);
              cursor.continue();
            }
          };
        }
      }
    };
  });
}

export async function saveSession(session: TranscriptionDB['sessions']): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('sessions', 'readwrite');
  const store = tx.objectStore('sessions');
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  db.close();
  console.log('[TranscriptionStorage] Session saved:', session.id);
}

export async function saveSegment(segment: TranscriptionDB['segments']): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('segments', 'readwrite');
  const store = tx.objectStore('segments');
  
  const segmentWithDefaults = {
    ...segment,
    isPartial: segment.isPartial ?? false,
    language: segment.language || 'ko-KR',
  };
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put(segmentWithDefaults);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  db.close();
  console.log('[TranscriptionStorage] Segment saved:', segment.text.substring(0, 30));
}

// Save word-level timestamp data
export async function saveWord(word: TranscriptionDB['words']): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('words', 'readwrite');
  const store = tx.objectStore('words');
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put(word);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  db.close();
  console.log('[TranscriptionStorage] Word saved:', word.word);
}

// Save multiple words at once
export async function saveWords(words: TranscriptionDB['words'][]): Promise<void> {
  if (words.length === 0) return;
  
  const db = await openDB();
  const tx = db.transaction('words', 'readwrite');
  const store = tx.objectStore('words');
  
  await Promise.all(
    words.map((word) =>
      new Promise<void>((resolve, reject) => {
        const request = store.put(word);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    )
  );
  
  db.close();
  console.log(`[TranscriptionStorage] ${words.length} words saved`);
}

// Get all words for a segment
export async function getWordsBySegment(segmentId: string): Promise<TranscriptionDB['words'][]> {
  const db = await openDB();
  const tx = db.transaction('words', 'readonly');
  const store = tx.objectStore('words');
  const index = store.index('segmentId');
  
  const words = await new Promise<TranscriptionDB['words'][]>((resolve, reject) => {
    const request = index.getAll(segmentId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  db.close();
  
  // Sort by wordIndex
  return words.sort((a, b) => a.wordIndex - b.wordIndex);
}

export async function saveAudioChunkLocal(chunk: TranscriptionDB['audioChunks']): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('audioChunks', 'readwrite');
  const store = tx.objectStore('audioChunks');
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put(chunk);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  db.close();
  console.log('[TranscriptionStorage] Audio chunk saved:', chunk.chunkIndex);
}

export async function getSessions(): Promise<TranscriptionDB['sessions'][]> {
  const db = await openDB();
  const tx = db.transaction('sessions', 'readonly');
  const store = tx.objectStore('sessions');
  const index = store.index('createdAt');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result.reverse());
    request.onerror = () => reject(request.error);
  });
}

export async function getSessionById(sessionId: string): Promise<{
  session: TranscriptionDB['sessions'];
  segments: TranscriptionDB['segments'][];
  audioChunks: TranscriptionDB['audioChunks'][];
  fullAudioBlob?: Blob;
  fullAudioUrl?: string;
}> {
  const db = await openDB();
  
  const sessionTx = db.transaction('sessions', 'readonly');
  const sessionStore = sessionTx.objectStore('sessions');
  const session = await new Promise<TranscriptionDB['sessions']>((resolve, reject) => {
    const request = sessionStore.get(sessionId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const segmentsTx = db.transaction('segments', 'readonly');
  const segmentsStore = segmentsTx.objectStore('segments');
  const segmentsIndex = segmentsStore.index('sessionId');
  const segments = await new Promise<TranscriptionDB['segments'][]>((resolve, reject) => {
    const request = segmentsIndex.getAll(sessionId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  const chunksTx = db.transaction('audioChunks', 'readonly');
  const chunksStore = chunksTx.objectStore('audioChunks');
  const chunksIndex = chunksStore.index('sessionId');
  const audioChunks = await new Promise<TranscriptionDB['audioChunks'][]>((resolve, reject) => {
    const request = chunksIndex.getAll(sessionId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  db.close();
  
  // Return with fullAudioBlob/fullAudioUrl from session if available
  return { 
    session, 
    segments, 
    audioChunks,
    fullAudioBlob: session.fullAudioBlob,
    fullAudioUrl: session.fullAudioUrl,
  };
}

export async function updateSession(sessionId: string, updates: Partial<TranscriptionDB['sessions']>): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('sessions', 'readwrite');
  const store = tx.objectStore('sessions');
  
  const session = await new Promise<TranscriptionDB['sessions']>((resolve, reject) => {
    const request = store.get(sessionId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  
  if (!session) {
    db.close();
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  const updatedSession = { ...session, ...updates };
  
  await new Promise<void>((resolve, reject) => {
    const request = store.put(updatedSession);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  db.close();
  console.log('[TranscriptionStorage] Session updated:', sessionId);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await openDB();
  
  const sessionTx = db.transaction('sessions', 'readwrite');
  const sessionStore = sessionTx.objectStore('sessions');
  await new Promise<void>((resolve, reject) => {
    const request = sessionStore.delete(sessionId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
  
  const segmentsTx = db.transaction('segments', 'readwrite');
  const segmentsStore = segmentsTx.objectStore('segments');
  const segmentsIndex = segmentsStore.index('sessionId');
  const segmentsCursor = await new Promise<IDBCursorWithValue | null>((resolve) => {
    const request = segmentsIndex.openCursor(IDBKeyRange.only(sessionId));
    request.onsuccess = () => resolve(request.result);
  });
  
  if (segmentsCursor) {
    segmentsCursor.delete();
  }
  
  const chunksTx = db.transaction('audioChunks', 'readwrite');
  const chunksStore = chunksTx.objectStore('audioChunks');
  const chunksIndex = chunksStore.index('sessionId');
  const chunksCursor = await new Promise<IDBCursorWithValue | null>((resolve) => {
    const request = chunksIndex.openCursor(IDBKeyRange.only(sessionId));
    request.onsuccess = () => resolve(request.result);
  });
  
  if (chunksCursor) {
    chunksCursor.delete();
  }
  
  db.close();
  console.log('[TranscriptionStorage] Session deleted:', sessionId);
}
