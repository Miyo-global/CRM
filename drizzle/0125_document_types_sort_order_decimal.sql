ALTER TABLE "document_types" ALTER COLUMN "sort_order" TYPE double precision USING "sort_order"::double precision;
ALTER TABLE "document_types" ALTER COLUMN "sort_order" SET DEFAULT 0;
