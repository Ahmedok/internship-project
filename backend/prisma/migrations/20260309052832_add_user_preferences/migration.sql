-- AlterTable
ALTER TABLE "User" ADD COLUMN     "preferedLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "preferedTheme" TEXT NOT NULL DEFAULT 'system';
