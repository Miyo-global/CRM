ALTER TABLE "candidate_offers" ADD COLUMN "acceptance_token" text UNIQUE;
ALTER TABLE "candidate_offers" ADD COLUMN "acceptance_token_expires_at" timestamp;
