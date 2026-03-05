-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "searchVector" tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("description", '')), 'B')
) STORED;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "searchText" TEXT,
ADD COLUMN     "searchVector" tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce("customId", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce("searchText", '')), 'B')
) STORED;

-- CreateIndex
CREATE INDEX "Inventory_searchVector_idx" ON "Inventory" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "Item_searchVector_idx" ON "Item" USING GIN ("searchVector");
