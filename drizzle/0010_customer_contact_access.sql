CREATE TABLE IF NOT EXISTS `customer_contact_index` (
	`case_id` integer NOT NULL,
	`kind` text NOT NULL,
	`contact_hash` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY (`case_id`, `kind`),
	CHECK (`kind` IN ('email', 'phone'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `customer_contact_lookup_idx` ON `customer_contact_index` (`kind`, `contact_hash`);
