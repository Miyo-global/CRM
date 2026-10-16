-- MIYO-0019: new salary structures store NULL PT (= by band) instead of 200.
ALTER TABLE "salary_structures" ALTER COLUMN "professional_tax" DROP DEFAULT;
