INSERT INTO "User" (id, email, "displayName", "createdAt", "updatedAt", "authProvider", role) VALUES
('user-test-001', 'admin@syncnapse.dev', 'Admin User', NOW(), NOW(), 'google', 'admin'),
('user-test-002', 'student1@university.edu', 'Alice Johnson', NOW(), NOW(), 'google', 'user'),
('user-test-003', 'student2@university.edu', 'Bob Smith', NOW(), NOW(), 'google', 'user'),
('user-test-004', 'professor@university.edu', 'Dr. Emily Chen', NOW(), NOW(), 'google', 'user'),
('user-test-005', 'demo@syncnapse.dev', 'Demo User', NOW(), NOW(), 'google', 'user');

INSERT INTO "Folder" (id, "userId", name, "parentId", "createdAt", "updatedAt") VALUES
('folder-001', 'user-test-002', 'Computer Science', NULL, NOW(), NOW()),
('folder-002', 'user-test-002', 'Mathematics', NULL, NOW(), NOW()),
('folder-003', 'user-test-003', 'My Lectures', NULL, NOW(), NOW()),
('folder-004', 'user-test-004', 'Course Materials', NULL, NOW(), NOW()),
('folder-005', 'user-test-002', 'Data Structures', 'folder-001', NOW(), NOW()),
('folder-006', 'user-test-002', 'Algorithms', 'folder-001', NOW(), NOW()),
('folder-007', 'user-test-002', 'Calculus', 'folder-002', NOW(), NOW());

INSERT INTO "LectureNote" (id, title, "sourceFileUrl", "audioFileUrl", "createdAt", "updatedAt") VALUES
('note-001', 'Introduction to Data Structures', 'documents/sample-slides-ds.pdf', 'audio/sample-lecture-01.mp3', NOW() - INTERVAL '7 days', NOW()),
('note-002', 'Binary Search Trees Explained', 'documents/sample-slides-bst.pdf', 'audio/sample-lecture-02.mp3', NOW() - INTERVAL '5 days', NOW()),
('note-003', 'Graph Algorithms: BFS and DFS', 'documents/sample-slides-graphs.pdf', 'audio/sample-lecture-03.mp3', NOW() - INTERVAL '3 days', NOW()),
('note-004', 'Calculus I - Limits and Continuity', 'documents/sample-slides-calculus.pdf', 'audio/sample-lecture-04.mp3', NOW() - INTERVAL '10 days', NOW()),
('note-005', 'Machine Learning Basics', 'documents/sample-slides-ml.pdf', 'audio/sample-lecture-05.mp3', NOW() - INTERVAL '1 day', NOW());

INSERT INTO "FolderLectureNote" ("folderId", "noteId") VALUES
('folder-005', 'note-001'),
('folder-005', 'note-002'),
('folder-006', 'note-003'),
('folder-007', 'note-004'),
('folder-003', 'note-005');

INSERT INTO "AudioRecording" (id, "noteId", "fileUrl", "durationSec", "createdAt", "updatedAt") VALUES
('audio-001', 'note-001', 'audio/sample-lecture-01.mp3', 3600.00, NOW() - INTERVAL '7 days', NOW()),
('audio-002', 'note-002', 'audio/sample-lecture-02.mp3', 2700.50, NOW() - INTERVAL '5 days', NOW()),
('audio-003', 'note-003', 'audio/sample-lecture-03.mp3', 4200.75, NOW() - INTERVAL '3 days', NOW()),
('audio-004', 'note-004', 'audio/sample-lecture-04.mp3', 3300.25, NOW() - INTERVAL '10 days', NOW()),
('audio-005', 'note-005', 'audio/sample-lecture-05.mp3', 5400.00, NOW() - INTERVAL '1 day', NOW());

INSERT INTO "Upload" (id, "userId", "fileName", "mimeType", "totalSizeBytes", "totalChunks", "receivedChunks", status, "checksumSha256", "storageKey", "createdAt", "updatedAt", "completedAt") VALUES
('upload-001', 'user-test-002', 'lecture-recording-01.mp3', 'audio/mpeg', 52428800, 10, 10, 'COMPLETED', 'sha256-abc123def456', 'uploads/user-test-002/lecture-recording-01.mp3', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
('upload-002', 'user-test-003', 'notes-scan.pdf', 'application/pdf', 10485760, 5, 5, 'COMPLETED', 'sha256-ghi789jkl012', 'uploads/user-test-003/notes-scan.pdf', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),
('upload-003', 'user-test-002', 'video-lecture.mp4', 'video/mp4', 104857600, 20, 12, 'RECEIVING', NULL, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 minute', NULL),
('upload-004', 'user-test-004', 'presentation.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 15728640, 8, 0, 'PENDING', NULL, NULL, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NULL),
('upload-005', 'user-test-005', 'corrupted-file.zip', 'application/zip', 20971520, 12, 7, 'FAILED', NULL, NULL, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NULL);

INSERT INTO "UploadChunk" (id, "uploadId", index, "sizeBytes", checksum, "receivedAt") VALUES
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
