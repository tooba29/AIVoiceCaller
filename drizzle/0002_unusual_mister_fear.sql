ALTER TABLE `campaigns` ADD `paused_at` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `resumed_at` text;--> statement-breakpoint
ALTER TABLE `campaigns` ADD `last_processed_lead_id` int;