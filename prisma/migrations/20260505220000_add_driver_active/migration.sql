-- AlterTable
-- IF NOT EXISTS makes this safe to run after the column has already been
-- added in-place by /api/admin/repair-2026 (raw SQL).
ALTER TABLE "Driver" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
