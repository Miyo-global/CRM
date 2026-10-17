-- MIYO-0661: which letter template an offer renders with.
ALTER TABLE IF EXISTS "candidate_offers" ADD COLUMN IF NOT EXISTS "offer_letter_template_id" integer;
