-- ============================================
-- SyncNapse Test Data Seeding
-- ============================================
-- This file is automatically executed after schema creation
-- to populate the database with test data for development

-- ============================================
-- 1. Test Users
-- ============================================
INSERT INTO "User" (id, email, "displayName", "createdAt", "updatedAt", "authProvider", role) VALUES
('user-test-001', 'admin@syncnapse.dev', 'Admin User', NOW(), NOW(), 'google', 'admin'),
('user-test-002', 'student1@university.edu', 'Alice Johnson', NOW(), NOW(), 'google', 'user'),
('user-test-003', 'student2@university.edu', 'Bob Smith', NOW(), NOW(), 'google', 'user'),
('user-test-004', 'professor@university.edu', 'Dr. Emily Chen', NOW(), NOW(), 'google', 'user'),
('user-test-005', 'demo@syncnapse.dev', 'Demo User', NOW(), NOW(), 'google', 'user');

-- ============================================
-- 2. Folder Structure
-- ============================================
INSERT INTO "Folder" (id, "userId", name, "parentId", "createdAt", "updatedAt") VALUES
-- Root folders
('folder-001', 'user-test-002', 'Computer Science', NULL, NOW(), NOW()),
('folder-002', 'user-test-002', 'Mathematics', NULL, NOW(), NOW()),
('folder-003', 'user-test-003', 'My Lectures', NULL, NOW(), NOW()),
('folder-004', 'user-test-004', 'Course Materials', NULL, NOW(), NOW()),
-- Nested folders
('folder-005', 'user-test-002', 'Data Structures', 'folder-001', NOW(), NOW()),
('folder-006', 'user-test-002', 'Algorithms', 'folder-001', NOW(), NOW()),
('folder-007', 'user-test-002', 'Calculus', 'folder-002', NOW(), NOW());

-- ============================================
-- 3. Lecture Notes
-- ============================================
-- NOTE: MinIO S3 object keys (STORAGE_BUCKET=syncnapse-files)
-- Full URL will be: http://minio:9000/syncnapse-files/{key}
INSERT INTO "LectureNote" (id, title, "sourceFileUrl", "audioFileUrl", "createdAt", "updatedAt") VALUES
('note-001', 'Introduction to Data Structures', 'documents/sample-slides-ds.pdf', 'audio/sample-lecture-01.mp3', NOW() - INTERVAL '7 days', NOW()),
('note-002', 'Binary Search Trees Explained', 'documents/sample-slides-bst.pdf', 'audio/sample-lecture-02.mp3', NOW() - INTERVAL '5 days', NOW()),
('note-003', 'Graph Algorithms: BFS and DFS', 'documents/sample-slides-graphs.pdf', 'audio/sample-lecture-03.mp3', NOW() - INTERVAL '3 days', NOW()),
('note-004', 'Calculus I - Limits and Continuity', 'documents/sample-slides-calculus.pdf', 'audio/sample-lecture-04.mp3', NOW() - INTERVAL '10 days', NOW()),
('note-005', 'Machine Learning Basics', 'documents/sample-slides-ml.pdf', 'audio/sample-lecture-05.mp3', NOW() - INTERVAL '1 day', NOW());

-- ============================================
-- 4. Folder-LectureNote Mapping
-- ============================================
INSERT INTO "FolderLectureNote" ("folderId", "noteId") VALUES
('folder-005', 'note-001'),
('folder-005', 'note-002'),
('folder-006', 'note-003'),
('folder-007', 'note-004'),
('folder-003', 'note-005');

-- ============================================
-- 5. Audio Recordings
-- ============================================
INSERT INTO "AudioRecording" (id, "noteId", "fileUrl", "durationSec", "createdAt", "updatedAt") VALUES
('audio-001', 'note-001', 'audio/sample-lecture-01.mp3', 3600.00, NOW() - INTERVAL '7 days', NOW()),
('audio-002', 'note-002', 'audio/sample-lecture-02.mp3', 2700.50, NOW() - INTERVAL '5 days', NOW()),
('audio-003', 'note-003', 'audio/sample-lecture-03.mp3', 4200.75, NOW() - INTERVAL '3 days', NOW()),
('audio-004', 'note-004', 'audio/sample-lecture-04.mp3', 3300.25, NOW() - INTERVAL '10 days', NOW()),
('audio-005', 'note-005', 'audio/sample-lecture-05.mp3', 5400.00, NOW() - INTERVAL '1 day', NOW());

-- ============================================
-- 6. Material Pages
-- ============================================
INSERT INTO "MaterialPage" (id, "noteId", "pageNumber", "pageUrl", "pageHash", "createdAt", "updatedAt") VALUES
-- Data Structures lecture pages
('page-001', 'note-001', 1, 'pages/ds-intro-p001.png', 'hash-ds-001', NOW() - INTERVAL '7 days', NOW()),
('page-002', 'note-001', 2, 'pages/ds-intro-p002.png', 'hash-ds-002', NOW() - INTERVAL '7 days', NOW()),
('page-003', 'note-001', 3, 'pages/ds-intro-p003.png', 'hash-ds-003', NOW() - INTERVAL '7 days', NOW()),
-- BST lecture pages
('page-004', 'note-002', 1, 'pages/bst-p001.png', 'hash-bst-001', NOW() - INTERVAL '5 days', NOW()),
('page-005', 'note-002', 2, 'pages/bst-p002.png', 'hash-bst-002', NOW() - INTERVAL '5 days', NOW()),
-- Graph algorithms pages
('page-006', 'note-003', 1, 'pages/graphs-p001.png', 'hash-graph-001', NOW() - INTERVAL '3 days', NOW()),
('page-007', 'note-003', 2, 'pages/graphs-p002.png', 'hash-graph-002', NOW() - INTERVAL '3 days', NOW()),
('page-008', 'note-003', 3, 'pages/graphs-p003.png', 'hash-graph-003', NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- 7. Media Chunks (time segments)
-- ============================================
INSERT INTO "MediaChunk" (id, "noteId", "startSec", "endSec", "createdAt", "updatedAt") VALUES
-- Data Structures chunks (60min lecture)
('chunk-001', 'note-001', 0.00, 600.00, NOW() - INTERVAL '7 days', NOW()),
('chunk-002', 'note-001', 600.00, 1200.00, NOW() - INTERVAL '7 days', NOW()),
('chunk-003', 'note-001', 1200.00, 1800.00, NOW() - INTERVAL '7 days', NOW()),
-- BST chunks (45min lecture)
('chunk-004', 'note-002', 0.00, 900.00, NOW() - INTERVAL '5 days', NOW()),
('chunk-005', 'note-002', 900.00, 1800.00, NOW() - INTERVAL '5 days', NOW()),
-- Graph algorithms chunks
('chunk-006', 'note-003', 0.00, 1200.00, NOW() - INTERVAL '3 days', NOW()),
('chunk-007', 'note-003', 1200.00, 2400.00, NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- 8. Transcript Segments
-- ============================================
INSERT INTO "TranscriptSegment" (id, "noteId", "chunkId", "startSec", "endSec", text, "createdAt", "updatedAt") VALUES
-- Data Structures lecture transcripts
('trans-001', 'note-001', 'chunk-001', 0.00, 15.50, 'Welcome to the introduction to data structures. Today we will cover arrays, linked lists, and basic operations.', NOW() - INTERVAL '7 days', NOW()),
('trans-002', 'note-001', 'chunk-001', 15.50, 45.20, 'Let''s start with arrays. An array is a contiguous block of memory that stores elements of the same type.', NOW() - INTERVAL '7 days', NOW()),
('trans-003', 'note-001', 'chunk-001', 45.20, 120.00, 'The time complexity for accessing an element in an array is O(1), which is constant time.', NOW() - INTERVAL '7 days', NOW()),
('trans-004', 'note-001', 'chunk-002', 600.00, 650.30, 'Now let''s move on to linked lists. Unlike arrays, linked lists use non-contiguous memory.', NOW() - INTERVAL '7 days', NOW()),
('trans-005', 'note-001', 'chunk-002', 650.30, 720.00, 'Each node in a linked list contains data and a pointer to the next node.', NOW() - INTERVAL '7 days', NOW()),
-- BST lecture transcripts
('trans-006', 'note-002', 'chunk-004', 0.00, 30.00, 'Binary Search Trees are hierarchical data structures where each node has at most two children.', NOW() - INTERVAL '5 days', NOW()),
('trans-007', 'note-002', 'chunk-004', 30.00, 90.00, 'The left child contains values less than the parent, and the right child contains values greater than the parent.', NOW() - INTERVAL '5 days', NOW()),
('trans-008', 'note-002', 'chunk-004', 90.00, 150.00, 'Search operation in a balanced BST has O(log n) time complexity.', NOW() - INTERVAL '5 days', NOW()),
-- Graph algorithms transcripts
('trans-009', 'note-003', 'chunk-006', 0.00, 45.00, 'Graphs are collections of vertices and edges. They can represent complex relationships.', NOW() - INTERVAL '3 days', NOW()),
('trans-010', 'note-003', 'chunk-006', 45.00, 120.00, 'Breadth-First Search, or BFS, explores neighbors level by level using a queue.', NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- 9. Translation Segments (Korean translations)
-- ============================================
INSERT INTO "TranslationSegment" (id, "noteId", "chunkId", "sourceLang", "targetLang", "startSec", "endSec", text, "createdAt", "updatedAt") VALUES
('transl-001', 'note-001', 'chunk-001', 'en', 'ko', 0.00, 15.50, '자료구조 소개에 오신 것을 환영합니다. 오늘은 배열, 연결 리스트 및 기본 연산을 다룰 것입니다.', NOW() - INTERVAL '7 days', NOW()),
('transl-002', 'note-001', 'chunk-001', 'en', 'ko', 15.50, 45.20, '배열부터 시작하겠습니다. 배열은 동일한 타입의 요소를 저장하는 연속된 메모리 블록입니다.', NOW() - INTERVAL '7 days', NOW()),
('transl-003', 'note-002', 'chunk-004', 'en', 'ko', 0.00, 30.00, '이진 탐색 트리는 각 노드가 최대 두 개의 자식을 가지는 계층적 자료구조입니다.', NOW() - INTERVAL '5 days', NOW()),
('transl-004', 'note-003', 'chunk-006', 'en', 'ko', 0.00, 45.00, '그래프는 정점과 간선의 모음입니다. 복잡한 관계를 표현할 수 있습니다.', NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- 10. Typing Sections (student notes)
-- ============================================
INSERT INTO "TypingSection" (id, "noteId", "chunkId", "userId", title, content, "startSec", "endSec", "createdAt", "updatedAt") VALUES
('typing-001', 'note-001', 'chunk-001', 'user-test-001', 'Arrays Overview', 'Key points:\n- Contiguous memory\n- O(1) access time\n- Fixed size in most languages\n- Cache-friendly', 0.00, 120.00, NOW() - INTERVAL '7 days', NOW()),
('typing-002', 'note-001', 'chunk-002', 'user-test-001', 'Linked Lists', 'Important:\n- Dynamic size\n- Non-contiguous memory\n- O(n) access time\n- Easy insertion/deletion', 600.00, 720.00, NOW() - INTERVAL '7 days', NOW()),
('typing-003', 'note-002', 'chunk-004', 'user-test-002', 'BST Properties', 'BST Rules:\n1. Left subtree < parent\n2. Right subtree > parent\n3. No duplicates (usually)\n4. Inorder traversal gives sorted order', 0.00, 150.00, NOW() - INTERVAL '5 days', NOW()),
('typing-004', 'note-003', 'chunk-006', 'user-test-003', 'BFS vs DFS', 'Comparison:\nBFS:\n- Uses Queue\n- Level-order\n- Shortest path\n\nDFS:\n- Uses Stack\n- Deep exploration\n- Memory efficient for deep graphs', 0.00, 120.00, NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- 11. Uploads (chunked file uploads)
-- ============================================
INSERT INTO "Upload" (id, "userId", "fileName", "mimeType", "totalSizeBytes", "totalChunks", "receivedChunks", status, "checksumSha256", "storageKey", "createdAt", "updatedAt", "completedAt") VALUES
-- Completed uploads (storageKey = MinIO object key)
('upload-001', 'user-test-002', 'lecture-recording-01.mp3', 'audio/mpeg', 52428800, 10, 10, 'COMPLETED', 'sha256-abc123def456', 'uploads/user-test-002/lecture-recording-01.mp3', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('upload-002', 'user-test-003', 'notes-scan.pdf', 'application/pdf', 10485760, 5, 5, 'COMPLETED', 'sha256-ghi789jkl012', 'uploads/user-test-003/notes-scan.pdf', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
-- In-progress upload
('upload-003', 'user-test-002', 'video-lecture.mp4', 'video/mp4', 104857600, 20, 12, 'RECEIVING', NULL, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 minute', NULL),
-- Pending upload
('upload-004', 'user-test-004', 'presentation.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 15728640, 8, 0, 'PENDING', NULL, NULL, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NULL),
-- Failed upload
('upload-005', 'user-test-005', 'corrupted-file.zip', 'application/zip', 20971520, 12, 7, 'FAILED', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NULL);

-- ============================================
-- 12. Upload Chunks
-- ============================================
INSERT INTO "UploadChunk" (id, "uploadId", index, "sizeBytes", checksum, "receivedAt") VALUES
-- Completed upload chunks (upload-001)
('chunk-up-001', 'upload-001', 0, 5242880, 'chunk-sha256-001', NOW() - INTERVAL '8 days'),
('chunk-up-002', 'upload-001', 1, 5242880, 'chunk-sha256-002', NOW() - INTERVAL '8 days'),
('chunk-up-003', 'upload-001', 2, 5242880, 'chunk-sha256-003', NOW() - INTERVAL '8 days'),
('chunk-up-004', 'upload-001', 3, 5242880, 'chunk-sha256-004', NOW() - INTERVAL '8 days'),
('chunk-up-005', 'upload-001', 4, 5242880, 'chunk-sha256-005', NOW() - INTERVAL '8 days'),
('chunk-up-006', 'upload-001', 5, 5242880, 'chunk-sha256-006', NOW() - INTERVAL '8 days'),
('chunk-up-007', 'upload-001', 6, 5242880, 'chunk-sha256-007', NOW() - INTERVAL '8 days'),
('chunk-up-008', 'upload-001', 7, 5242880, 'chunk-sha256-008', NOW() - INTERVAL '8 days'),
('chunk-up-009', 'upload-001', 8, 5242880, 'chunk-sha256-009', NOW() - INTERVAL '8 days'),
('chunk-up-010', 'upload-001', 9, 5242880, 'chunk-sha256-010', NOW() - INTERVAL '8 days'),
-- In-progress upload chunks (upload-003) - 12 out of 20 received
('chunk-up-011', 'upload-003', 0, 5242880, 'chunk-sha256-011', NOW() - INTERVAL '2 hours'),
('chunk-up-012', 'upload-003', 1, 5242880, 'chunk-sha256-012', NOW() - INTERVAL '2 hours'),
('chunk-up-013', 'upload-003', 2, 5242880, 'chunk-sha256-013', NOW() - INTERVAL '2 hours'),
('chunk-up-014', 'upload-003', 3, 5242880, 'chunk-sha256-014', NOW() - INTERVAL '1 hour 50 minutes'),
('chunk-up-015', 'upload-003', 4, 5242880, 'chunk-sha256-015', NOW() - INTERVAL '1 hour 40 minutes'),
('chunk-up-016', 'upload-003', 5, 5242880, 'chunk-sha256-016', NOW() - INTERVAL '1 hour 30 minutes'),
('chunk-up-017', 'upload-003', 6, 5242880, 'chunk-sha256-017', NOW() - INTERVAL '1 hour 20 minutes'),
('chunk-up-018', 'upload-003', 7, 5242880, 'chunk-sha256-018', NOW() - INTERVAL '1 hour 10 minutes'),
('chunk-up-019', 'upload-003', 8, 5242880, 'chunk-sha256-019', NOW() - INTERVAL '1 hour'),
('chunk-up-020', 'upload-003', 9, 5242880, 'chunk-sha256-020', NOW() - INTERVAL '50 minutes'),
('chunk-up-021', 'upload-003', 10, 5242880, 'chunk-sha256-021', NOW() - INTERVAL '40 minutes'),
('chunk-up-022', 'upload-003', 11, 5242880, 'chunk-sha256-022', NOW() - INTERVAL '30 minutes');

-- ============================================
-- 13. Questions
-- ============================================
INSERT INTO "Question" (id, "askedByUserId", "noteId", "materialPageId", "startSec", text, "createdAt", "updatedAt") VALUES
('question-001', 'user-test-002', 'note-001', 'page-001', 45.20, 'What is the difference between static and dynamic arrays?', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('question-002', 'user-test-003', 'note-001', 'page-002', 650.30, 'How do you reverse a linked list in place?', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('question-003', 'user-test-002', 'note-002', 'page-004', 30.00, 'Can a BST have duplicate values?', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('question-004', 'user-test-003', 'note-003', 'page-006', 45.00, 'When should I use BFS instead of DFS?', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('question-005', 'user-test-005', 'note-003', 'page-007', 120.00, 'How does Dijkstra''s algorithm differ from BFS?', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- ============================================
-- 14. Answers
-- ============================================
INSERT INTO "Answer" (id, "questionId", "answeredByUserId", text, "createdAt", "updatedAt") VALUES
('answer-001', 'question-001', 'user-test-004', 'Static arrays have a fixed size at compile time, while dynamic arrays can grow or shrink at runtime. In languages like C++, std::vector is a dynamic array implementation.', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('answer-002', 'question-002', 'user-test-004', 'You can reverse a linked list in-place by maintaining three pointers: previous, current, and next. Traverse the list and reverse the pointers. Time complexity is O(n), space is O(1).', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('answer-003', 'question-003', 'user-test-002', 'Typically, BSTs do not allow duplicates. However, you can modify the definition to allow duplicates by placing them either in the left or right subtree consistently.', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('answer-004', 'question-004', 'user-test-004', 'Use BFS when you need the shortest path in an unweighted graph, or when you want to explore nodes level by level. Use DFS for topological sorting, cycle detection, or when memory is limited.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('answer-005', 'question-005', 'user-test-004', 'Dijkstra''s algorithm finds the shortest path in a weighted graph, while BFS finds the shortest path in an unweighted graph. Dijkstra uses a priority queue, BFS uses a regular queue.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- ============================================
-- 15. Canonical Pages (for deduplication)
-- ============================================
INSERT INTO "CanonicalPage" (id, "contentHash", "sourceType", "renderKey", width, height, "createdAt", "updatedAt") VALUES
('canonical-001', 'hash-ds-001', 'pdf', 'render/canonical-001.png', 1920, 1080, NOW() - INTERVAL '7 days', NOW()),
('canonical-002', 'hash-bst-001', 'pdf', 'render/canonical-002.png', 1920, 1080, NOW() - INTERVAL '5 days', NOW()),
('canonical-003', 'hash-graph-001', 'pdf', 'render/canonical-003.png', 1920, 1080, NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- 16. Ink Layers (user annotations)
-- ============================================
INSERT INTO "InkLayer" (id, "noteId", "chunkId", "canonicalPageId", "materialPageId", title, color, opacity, "blendMode", "zIndex", "createdByUserId", "createdAt", "updatedAt") VALUES
('ink-layer-001', 'note-001', 'chunk-001', 'canonical-001', 'page-001', 'My Notes - Slide 1', '#FF5733', 0.8, 'normal', 1, 'user-test-002', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('ink-layer-002', 'note-002', 'chunk-004', 'canonical-002', 'page-004', 'Important Points', '#33C1FF', 0.9, 'normal', 1, 'user-test-003', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('ink-layer-003', 'note-003', 'chunk-006', 'canonical-003', 'page-006', 'Highlights', '#FFD700', 0.5, 'multiply', 2, 'user-test-002', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- ============================================
-- 17. Ink Strokes (actual pen strokes)
-- ============================================
INSERT INTO "InkStroke" (id, "layerId", tool, color, thickness, points, bbox, "createdById", "createdAt") VALUES
('ink-stroke-001', 'ink-layer-001', 'pen', '#FF5733', 2.5, '[{"x":100,"y":150,"t":0,"p":0.8},{"x":120,"y":160,"t":50,"p":0.9},{"x":140,"y":155,"t":100,"p":0.85}]'::jsonb, '{"x":100,"y":150,"w":40,"h":15}'::jsonb, 'user-test-002', NOW() - INTERVAL '6 days'),
('ink-stroke-002', 'ink-layer-001', 'highlighter', '#FFFF00', 10.0, '[{"x":200,"y":200,"t":0,"p":0.5},{"x":300,"y":205,"t":200,"p":0.6}]'::jsonb, '{"x":200,"y":200,"w":100,"h":10}'::jsonb, 'user-test-002', NOW() - INTERVAL '6 days'),
('ink-stroke-003', 'ink-layer-002', 'pen', '#33C1FF', 3.0, '[{"x":50,"y":300,"t":0,"p":1.0},{"x":60,"y":320,"t":30,"p":0.95},{"x":70,"y":340,"t":60,"p":0.9}]'::jsonb, '{"x":50,"y":300,"w":20,"h":40}'::jsonb, 'user-test-003', NOW() - INTERVAL '4 days'),
('ink-stroke-004', 'ink-layer-003', 'highlighter', '#FFD700', 12.0, '[{"x":150,"y":400,"t":0,"p":0.4},{"x":250,"y":405,"t":150,"p":0.45}]'::jsonb, '{"x":150,"y":400,"w":100,"h":12}'::jsonb, 'user-test-002', NOW() - INTERVAL '2 days');

-- ============================================
-- 18. Audio Slices (time-aligned audio segments)
-- ============================================
INSERT INTO "AudioSlice" (id, "recordingId", "chunkId", "startSec", "endSec", "fileOffsetSec", "createdAt", "updatedAt") VALUES
('audio-slice-001', 'audio-001', 'chunk-001', 0.00, 600.00, 0.00, NOW() - INTERVAL '7 days', NOW()),
('audio-slice-002', 'audio-001', 'chunk-002', 600.00, 1200.00, 600.00, NOW() - INTERVAL '7 days', NOW()),
('audio-slice-003', 'audio-002', 'chunk-004', 0.00, 900.00, 0.00, NOW() - INTERVAL '5 days', NOW()),
('audio-slice-004', 'audio-003', 'chunk-006', 0.00, 1200.00, 0.00, NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- 19. Media Links (cross-references)
-- ============================================
INSERT INTO "MediaLink" (id, "noteId", "startSec", "endSec", "linkType", "filePageNumber", "transcriptId", "materialPageId", "createdAt", "updatedAt") VALUES
('link-001', 'note-001', 0.00, 15.50, 'transcript', 1, 'trans-001', 'page-001', NOW() - INTERVAL '7 days', NOW()),
('link-002', 'note-001', 15.50, 45.20, 'transcript', 1, 'trans-002', 'page-001', NOW() - INTERVAL '7 days', NOW()),
('link-003', 'note-002', 0.00, 30.00, 'transcript', 1, 'trans-006', 'page-004', NOW() - INTERVAL '5 days', NOW()),
('link-004', 'note-003', 0.00, 45.00, 'transcript', 1, 'trans-009', 'page-006', NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- 20. Audit Logs
-- ============================================
INSERT INTO "AuditLog" (id, at, "userId", method, path, status, ip, "userAgent", "requestId", action, "resourceId", payload) VALUES
('audit-001', NOW() - INTERVAL '10 days', 'user-test-002', 'POST', '/api/sessions', 201, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'req-001', 'CREATE_SESSION', 'note-001', '{"title":"Introduction to Data Structures"}'::jsonb),
('audit-002', NOW() - INTERVAL '9 days', 'user-test-002', 'POST', '/api/uploads/start', 201, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'req-002', 'UPLOAD_START', 'upload-001', '{"fileName":"lecture-recording-01.mp3","totalChunks":10}'::jsonb),
('audit-003', NOW() - INTERVAL '8 days', 'user-test-002', 'POST', '/api/uploads/upload-001/complete', 200, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'req-003', 'UPLOAD_COMPLETE', 'upload-001', '{"uploadId":"upload-001"}'::jsonb),
('audit-004', NOW() - INTERVAL '7 days', 'user-test-003', 'GET', '/api/sessions/note-001', 200, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'req-004', 'VIEW_SESSION', 'note-001', NULL),
('audit-005', NOW() - INTERVAL '6 days', 'user-test-002', 'POST', '/api/sessions/note-001/questions', 201, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'req-005', 'CREATE_QUESTION', 'question-001', '{"text":"What is the difference between static and dynamic arrays?"}'::jsonb),
('audit-006', NOW() - INTERVAL '5 days', 'user-test-004', 'POST', '/api/sessions/note-001/questions/question-001/answers', 201, '192.168.1.102', 'Mozilla/5.0 (Linux; Android 11)', 'req-006', 'CREATE_ANSWER', 'answer-001', '{"questionId":"question-001"}'::jsonb),
('audit-007', NOW() - INTERVAL '4 days', 'user-test-001', 'GET', '/api/admin/users', 200, '192.168.1.1', 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64)', 'req-007', 'LIST_USERS', NULL, NULL),
('audit-008', NOW() - INTERVAL '3 days', 'user-test-002', 'PATCH', '/api/sessions/note-001', 200, '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'req-008', 'UPDATE_SESSION', 'note-001', '{"title":"Introduction to Data Structures - Updated"}'::jsonb),
('audit-009', NOW() - INTERVAL '2 days', 'user-test-003', 'POST', '/api/auth/login', 200, '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'req-009', 'USER_LOGIN', 'user-test-003', '{"provider":"google"}'::jsonb),
('audit-010', NOW() - INTERVAL '1 day', 'user-test-005', 'DELETE', '/api/uploads/upload-005', 200, '192.168.1.105', 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0)', 'req-010', 'DELETE_UPLOAD', 'upload-005', '{"uploadId":"upload-005","reason":"corrupted"}'::jsonb);

-- ============================================
-- Data Seeding Complete
-- ============================================
-- Summary:
-- - 5 test users (admin, students, professor, demo)
-- - 7 folders with hierarchical structure
-- - 5 lecture notes with various topics
-- - 5 audio recordings with durations
-- - 8 material pages
-- - 7 media chunks for time segmentation
-- - 10 transcript segments
-- - 4 translation segments (Korean)
-- - 4 typing sections (student notes)
-- - 5 uploads (completed, in-progress, pending, failed)
-- - 22 upload chunks
-- - 5 questions from students
-- - 5 answers from professor and students
-- - 3 canonical pages for deduplication
-- - 3 ink layers for annotations
-- - 4 ink strokes (pen and highlighter)
-- - 4 audio slices
-- - 4 media links
-- - 10 audit log entries

-- ============================================
-- MinIO Setup Guide
-- ============================================
-- 1. MinIO는 docker-compose.minio.yml로 실행됩니다
-- 2. 버킷은 자동으로 생성되거나 수동으로 생성 필요: syncnapse-files
-- 3. 테스트 파일 업로드 방법:
--    - MinIO Console: http://localhost:9001 (minioadmin / minioadmin123)
--    - 또는 AWS CLI: aws --endpoint-url http://localhost:9000 s3 cp sample.pdf s3://syncnapse-files/documents/
-- 4. 애플리케이션에서 URL 생성:
--    - Backend storage service가 자동으로 presigned URL 생성
--    - 예: http://minio:9000/syncnapse-files/documents/sample-slides-ds.pdf

-- Test Query Examples:
-- 1. Find all notes in a folder: SELECT ln.* FROM "LectureNote" ln JOIN "FolderLectureNote" fln ON ln.id = fln."noteId" WHERE fln."folderId" = 'folder-005';
-- 2. Get transcript for a note: SELECT * FROM "TranscriptSegment" WHERE "noteId" = 'note-001' ORDER BY "startSec";
-- 3. Find in-progress uploads: SELECT * FROM "Upload" WHERE status = 'RECEIVING';
-- 4. Get user's recent activity: SELECT * FROM "AuditLog" WHERE "userId" = 'user-test-002' ORDER BY at DESC LIMIT 10;
-- 5. Find questions on a note: SELECT q.*, u."displayName" FROM "Question" q JOIN "User" u ON q."askedByUserId" = u.id WHERE q."noteId" = 'note-001';

