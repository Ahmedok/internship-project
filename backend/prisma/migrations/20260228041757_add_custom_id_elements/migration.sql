-- CreateEnum
CREATE TYPE "IdElementType" AS ENUM ('FIXED_TEXT', 'RANDOM_20BIT', 'RANDOM_32BIT', 'RANDOM_6DIGIT', 'RANDOM_9DIGIT', 'GUID', 'DATETIME', 'SEQUENCE');

-- CreateTable
CREATE TABLE "CustomIdElement" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "elementType" "IdElementType" NOT NULL,
    "config" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomIdElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomIdElement_inventoryId_idx" ON "CustomIdElement"("inventoryId");

-- AddForeignKey
ALTER TABLE "CustomIdElement" ADD CONSTRAINT "CustomIdElement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
