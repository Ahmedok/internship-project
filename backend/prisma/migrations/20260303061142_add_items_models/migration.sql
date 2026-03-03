-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "customId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemFieldValue" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,

    CONSTRAINT "ItemFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLike" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ItemLike_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateIndex
CREATE INDEX "Item_inventoryId_idx" ON "Item"("inventoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_inventoryId_customId_key" ON "Item"("inventoryId", "customId");

-- CreateIndex
CREATE INDEX "ItemFieldValue_itemId_idx" ON "ItemFieldValue"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemFieldValue_itemId_customFieldId_key" ON "ItemFieldValue"("itemId", "customFieldId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemFieldValue" ADD CONSTRAINT "ItemFieldValue_customFieldId_fkey" FOREIGN KEY ("customFieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLike" ADD CONSTRAINT "ItemLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLike" ADD CONSTRAINT "ItemLike_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
