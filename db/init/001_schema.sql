CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'RECEIVING', 'ASSEMBLING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "authProvider" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureNote" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceFileUrl" TEXT,
    "audioFileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LectureNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderLectureNote" (
    "folderId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,

    CONSTRAINT "FolderLectureNote_pkey" PRIMARY KEY ("folderId","noteId")
);

-- CreateTable
CREATE TABLE "TranscriptSegment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "chunkId" TEXT,
    "startSec" DECIMAL(7,2) NOT NULL,
    "endSec" DECIMAL(7,2) NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationSegment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "chunkId" TEXT,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "startSec" DECIMAL(7,2) NOT NULL,
    "endSec" DECIMAL(7,2) NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TypingSection" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "chunkId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "startSec" DECIMAL(7,2),
    "endSec" DECIMAL(7,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TypingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaLink" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "startSec" DECIMAL(7,2) NOT NULL,
    "endSec" DECIMAL(7,2) NOT NULL,
    "linkType" TEXT NOT NULL,
    "filePageNumber" INTEGER,
    "transcriptId" TEXT,
    "translationId" TEXT,
    "typingSectionId" TEXT,
    "materialPageId" TEXT,
    "audioSliceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPage" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "pageUrl" TEXT,
    "pageHash" TEXT,
    "canonicalPageId" TEXT,
    "viewTransform" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioRecording" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "durationSec" DECIMAL(7,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioSlice" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "chunkId" TEXT,
    "startSec" DECIMAL(7,2) NOT NULL,
    "endSec" DECIMAL(7,2) NOT NULL,
    "fileOffsetSec" DECIMAL(7,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioSlice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startSec" DECIMAL(7,2) NOT NULL,
    "tag" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaChunk" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "startSec" DECIMAL(7,2) NOT NULL,
    "endSec" DECIMAL(7,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalPage" (
    "id" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "renderKey" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InkLayer" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "chunkId" TEXT,
    "canonicalPageId" TEXT,
    "materialPageId" TEXT,
    "title" TEXT,
    "color" TEXT,
    "opacity" DOUBLE PRECISION,
    "blendMode" TEXT,
    "zIndex" INTEGER,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InkLayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InkStroke" (
    "id" TEXT NOT NULL,
    "layerId" TEXT NOT NULL,
    "tool" TEXT,
    "color" TEXT,
    "thickness" DOUBLE PRECISION,
    "points" JSONB NOT NULL,
    "bbox" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InkStroke_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "totalSizeBytes" INTEGER,
    "totalChunks" INTEGER NOT NULL,
    "receivedChunks" INTEGER NOT NULL DEFAULT 0,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "checksumSha256" TEXT,
    "storageKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadChunk" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "sizeBytes" INTEGER,
    "checksum" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "askedByUserId" TEXT NOT NULL,
    "noteId" TEXT,
    "materialPageId" TEXT,
    "startSec" DECIMAL(7,2),
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answeredByUserId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "TranscriptSegment_noteId_startSec_idx" ON "TranscriptSegment"("noteId", "startSec");

-- CreateIndex
CREATE INDEX "TranscriptSegment_chunkId_idx" ON "TranscriptSegment"("chunkId");

-- CreateIndex
CREATE INDEX "TranslationSegment_noteId_targetLang_startSec_idx" ON "TranslationSegment"("noteId", "targetLang", "startSec");

-- CreateIndex
CREATE INDEX "TranslationSegment_chunkId_idx" ON "TranslationSegment"("chunkId");

-- CreateIndex
CREATE INDEX "TypingSection_noteId_startSec_idx" ON "TypingSection"("noteId", "startSec");

-- CreateIndex
CREATE INDEX "TypingSection_chunkId_idx" ON "TypingSection"("chunkId");

-- CreateIndex
CREATE INDEX "MediaLink_noteId_startSec_idx" ON "MediaLink"("noteId", "startSec");

-- CreateIndex
CREATE INDEX "MaterialPage_canonicalPageId_idx" ON "MaterialPage"("canonicalPageId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialPage_noteId_pageNumber_key" ON "MaterialPage"("noteId", "pageNumber");

-- CreateIndex
CREATE INDEX "AudioRecording_noteId_idx" ON "AudioRecording"("noteId");

-- CreateIndex
CREATE INDEX "AudioSlice_recordingId_startSec_idx" ON "AudioSlice"("recordingId", "startSec");

-- CreateIndex
CREATE INDEX "AudioSlice_chunkId_idx" ON "AudioSlice"("chunkId");

-- CreateIndex
CREATE INDEX "Bookmark_noteId_startSec_idx" ON "Bookmark"("noteId", "startSec");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_noteId_startSec_key" ON "Bookmark"("userId", "noteId", "startSec");

-- CreateIndex
CREATE INDEX "MediaChunk_noteId_startSec_idx" ON "MediaChunk"("noteId", "startSec");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalPage_contentHash_key" ON "CanonicalPage"("contentHash");

-- CreateIndex
CREATE INDEX "InkLayer_noteId_chunkId_idx" ON "InkLayer"("noteId", "chunkId");

-- CreateIndex
CREATE INDEX "InkLayer_canonicalPageId_idx" ON "InkLayer"("canonicalPageId");

-- CreateIndex
CREATE INDEX "InkLayer_materialPageId_idx" ON "InkLayer"("materialPageId");

-- CreateIndex
CREATE INDEX "InkStroke_layerId_idx" ON "InkStroke"("layerId");

-- CreateIndex
CREATE INDEX "Upload_userId_idx" ON "Upload"("userId");

-- CreateIndex
CREATE INDEX "UploadChunk_uploadId_idx" ON "UploadChunk"("uploadId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadChunk_uploadId_index_key" ON "UploadChunk"("uploadId", "index");

-- CreateIndex
CREATE INDEX "Question_askedByUserId_idx" ON "Question"("askedByUserId");

-- CreateIndex
CREATE INDEX "Question_noteId_startSec_idx" ON "Question"("noteId", "startSec");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "Answer"("questionId");

-- CreateIndex
CREATE INDEX "Answer_answeredByUserId_idx" ON "Answer"("answeredByUserId");

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderLectureNote" ADD CONSTRAINT "FolderLectureNote_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderLectureNote" ADD CONSTRAINT "FolderLectureNote_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptSegment" ADD CONSTRAINT "TranscriptSegment_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "MediaChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationSegment" ADD CONSTRAINT "TranslationSegment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationSegment" ADD CONSTRAINT "TranslationSegment_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "MediaChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypingSection" ADD CONSTRAINT "TypingSection_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TypingSection" ADD CONSTRAINT "TypingSection_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "MediaChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLink" ADD CONSTRAINT "MediaLink_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLink" ADD CONSTRAINT "MediaLink_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "TranscriptSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLink" ADD CONSTRAINT "MediaLink_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "TranslationSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLink" ADD CONSTRAINT "MediaLink_typingSectionId_fkey" FOREIGN KEY ("typingSectionId") REFERENCES "TypingSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLink" ADD CONSTRAINT "MediaLink_materialPageId_fkey" FOREIGN KEY ("materialPageId") REFERENCES "MaterialPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaLink" ADD CONSTRAINT "MediaLink_audioSliceId_fkey" FOREIGN KEY ("audioSliceId") REFERENCES "AudioSlice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPage" ADD CONSTRAINT "MaterialPage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPage" ADD CONSTRAINT "MaterialPage_canonicalPageId_fkey" FOREIGN KEY ("canonicalPageId") REFERENCES "CanonicalPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioRecording" ADD CONSTRAINT "AudioRecording_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioSlice" ADD CONSTRAINT "AudioSlice_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "AudioRecording"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioSlice" ADD CONSTRAINT "AudioSlice_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "MediaChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaChunk" ADD CONSTRAINT "MediaChunk_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InkLayer" ADD CONSTRAINT "InkLayer_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InkLayer" ADD CONSTRAINT "InkLayer_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "MediaChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InkLayer" ADD CONSTRAINT "InkLayer_canonicalPageId_fkey" FOREIGN KEY ("canonicalPageId") REFERENCES "CanonicalPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InkLayer" ADD CONSTRAINT "InkLayer_materialPageId_fkey" FOREIGN KEY ("materialPageId") REFERENCES "MaterialPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InkLayer" ADD CONSTRAINT "InkLayer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InkStroke" ADD CONSTRAINT "InkStroke_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "InkLayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InkStroke" ADD CONSTRAINT "InkStroke_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadChunk" ADD CONSTRAINT "UploadChunk_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_askedByUserId_fkey" FOREIGN KEY ("askedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_materialPageId_fkey" FOREIGN KEY ("materialPageId") REFERENCES "MaterialPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_answeredByUserId_fkey" FOREIGN KEY ("answeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;