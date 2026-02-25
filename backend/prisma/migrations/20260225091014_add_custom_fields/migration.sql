-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('STRING', 'TEXT', 'NUMBER', 'DOCUMENT', 'BOOLEAN');

-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "showInTable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomField_inventoryId_idx" ON "CustomField"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomField_inventoryId_title_key" ON "CustomField"("inventoryId", "title");

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
