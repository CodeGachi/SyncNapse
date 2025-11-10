-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "presenterId" TEXT NOT NULL,
    "title" TEXT,
    "liveblocksRoomId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionInvite" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionMember" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "displayName" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "SessionMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionSync" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "startSec" DECIMAL(7,2),
    "endSec" DECIMAL(7,2),
    "pageNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LiveSession_noteId_idx" ON "LiveSession"("noteId");

-- CreateIndex
CREATE INDEX "LiveSession_presenterId_idx" ON "LiveSession"("presenterId");

-- CreateIndex
CREATE INDEX "LiveSession_isActive_idx" ON "LiveSession"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SessionInvite_token_key" ON "SessionInvite"("token");

-- CreateIndex
CREATE INDEX "SessionInvite_token_idx" ON "SessionInvite"("token");

-- CreateIndex
CREATE INDEX "SessionInvite_sessionId_idx" ON "SessionInvite"("sessionId");

-- CreateIndex
CREATE INDEX "SessionInvite_expiresAt_idx" ON "SessionInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "SessionMember_sessionId_idx" ON "SessionMember"("sessionId");

-- CreateIndex
CREATE INDEX "SessionMember_userId_idx" ON "SessionMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionMember_sessionId_userId_key" ON "SessionMember"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "SectionSync_sessionId_idx" ON "SectionSync"("sessionId");

-- CreateIndex
CREATE INDEX "SectionSync_noteId_idx" ON "SectionSync"("noteId");

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionInvite" ADD CONSTRAINT "SessionInvite_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMember" ADD CONSTRAINT "SessionMember_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMember" ADD CONSTRAINT "SessionMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSync" ADD CONSTRAINT "SectionSync_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionSync" ADD CONSTRAINT "SectionSync_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "LectureNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

