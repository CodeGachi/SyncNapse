-- Schema bootstrap for SyncNapse (development)
-- English comments only per repo guideline

-- Users
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "authProvider" TEXT NOT NULL,
  role TEXT NOT NULL
);

-- Folder (mapped as Session in service layer)
CREATE TABLE IF NOT EXISTS "Folder" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  name TEXT NOT NULL,
  "parentId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT folder_user_fk FOREIGN KEY ("userId") REFERENCES "User"(id),
  CONSTRAINT folder_parent_fk FOREIGN KEY ("parentId") REFERENCES "Folder"(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS folder_user_idx ON "Folder"("userId");
CREATE INDEX IF NOT EXISTS folder_parent_idx ON "Folder"("parentId");

-- LectureNote
CREATE TABLE IF NOT EXISTS "LectureNote" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  "sourceFileUrl" TEXT,
  "audioFileUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No direct FK to Folder (M:N via junction)
);

-- Junction table for M:N Folder-LectureNote
CREATE TABLE IF NOT EXISTS "FolderLectureNote" (
  "folderId" TEXT NOT NULL,
  "noteId"   TEXT NOT NULL,
  PRIMARY KEY ("folderId", "noteId"),
  FOREIGN KEY ("folderId") REFERENCES "Folder"(id) ON DELETE CASCADE,
  FOREIGN KEY ("noteId")   REFERENCES "LectureNote"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS fln_note_idx ON "FolderLectureNote"("noteId");
CREATE INDEX IF NOT EXISTS fln_folder_idx ON "FolderLectureNote"("folderId");

-- TranscriptSegment
CREATE TABLE IF NOT EXISTS "TranscriptSegment" (
  id TEXT PRIMARY KEY,
  "noteId" TEXT NOT NULL,
  "startSec" NUMERIC(18,6) NOT NULL,
  "endSec" NUMERIC(18,6) NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transcript_note_fk FOREIGN KEY ("noteId") REFERENCES "LectureNote"(id)
);
CREATE INDEX IF NOT EXISTS transcript_note_start_idx ON "TranscriptSegment"("noteId", "startSec");

-- TranslationSegment
CREATE TABLE IF NOT EXISTS "TranslationSegment" (
  id TEXT PRIMARY KEY,
  "noteId" TEXT NOT NULL,
  "sourceLang" TEXT NOT NULL,
  "targetLang" TEXT NOT NULL,
  "startSec" NUMERIC(18,6) NOT NULL,
  "endSec" NUMERIC(18,6) NOT NULL,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT translation_note_fk FOREIGN KEY ("noteId") REFERENCES "LectureNote"(id)
);
CREATE INDEX IF NOT EXISTS translation_note_lang_start_idx ON "TranslationSegment"("noteId", "targetLang", "startSec");

-- TypingSection
CREATE TABLE IF NOT EXISTS "TypingSection" (
  id TEXT PRIMARY KEY,
  "noteId" TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "startSec" NUMERIC(18,6),
  "endSec" NUMERIC(18,6),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT typing_note_fk FOREIGN KEY ("noteId") REFERENCES "LectureNote"(id)
);
CREATE INDEX IF NOT EXISTS typing_note_start_idx ON "TypingSection"("noteId", "startSec");

-- MediaLink
CREATE TABLE IF NOT EXISTS "MediaLink" (
  id TEXT PRIMARY KEY,
  "noteId" TEXT NOT NULL,
  "startSec" NUMERIC(18,6) NOT NULL,
  "endSec" NUMERIC(18,6) NOT NULL,
  "linkType" TEXT NOT NULL,
  "filePageNumber" INT,
  "transcriptId" TEXT,
  "translationId" TEXT,
  "typingSectionId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT medialink_note_fk FOREIGN KEY ("noteId") REFERENCES "LectureNote"(id),
  CONSTRAINT medialink_transcript_fk FOREIGN KEY ("transcriptId") REFERENCES "TranscriptSegment"(id),
  CONSTRAINT medialink_translation_fk FOREIGN KEY ("translationId") REFERENCES "TranslationSegment"(id),
  CONSTRAINT medialink_typing_fk FOREIGN KEY ("typingSectionId") REFERENCES "TypingSection"(id)
);
CREATE INDEX IF NOT EXISTS medialink_note_start_idx ON "MediaLink"("noteId", "startSec");

-- Minimal seed: one user for service bootstrapping
INSERT INTO "User" (id, email, "displayName", "authProvider", role)
SELECT concat('seed_', extract(epoch from now())::bigint)::text, 'user_dev@example.com', 'Dev User', 'credentials', 'user'
WHERE NOT EXISTS (SELECT 1 FROM "User" LIMIT 1);

