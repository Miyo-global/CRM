-- BUG-35: helpdesk tickets can be closed or cancelled, not only marked Done.
ALTER TYPE "public"."ticket_status" ADD VALUE IF NOT EXISTS 'CLOSED';--> statement-breakpoint
ALTER TYPE "public"."ticket_status" ADD VALUE IF NOT EXISTS 'CANCELLED';
