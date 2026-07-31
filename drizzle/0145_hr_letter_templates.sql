ALTER TABLE "hr_offer_letter_templates" ADD COLUMN IF NOT EXISTS "document_type" text NOT NULL DEFAULT 'OFFER_LETTER';
ALTER TABLE "hr_offer_letter_templates" ADD COLUMN IF NOT EXISTS "show_signature_block" boolean NOT NULL DEFAULT false;
