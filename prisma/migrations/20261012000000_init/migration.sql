-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateTable
CREATE TABLE "app"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Conversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Turn" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."PinnedChart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "sql" TEXT NOT NULL,
    "chart" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."Upload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "columns" JSONB NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "app"."User"("email");

-- CreateIndex
CREATE INDEX "Conversation_userId_updatedAt_idx" ON "app"."Conversation"("userId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "Turn_conversationId_createdAt_idx" ON "app"."Turn"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "PinnedChart_userId_createdAt_idx" ON "app"."PinnedChart"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_tableName_key" ON "app"."Upload"("tableName");

-- CreateIndex
CREATE INDEX "Upload_userId_createdAt_idx" ON "app"."Upload"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Upload_expiresAt_idx" ON "app"."Upload"("expiresAt");

-- AddForeignKey
ALTER TABLE "app"."Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Turn" ADD CONSTRAINT "Turn_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "app"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."PinnedChart" ADD CONSTRAINT "PinnedChart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."Upload" ADD CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "app"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

