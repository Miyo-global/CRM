ALTER TABLE "asset_returns"
  ADD COLUMN IF NOT EXISTS "handover_photo_urls" jsonb NOT NULL DEFAULT '[]'::jsonb;
