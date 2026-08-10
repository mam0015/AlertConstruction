CREATE TABLE `staff_access_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`role` text DEFAULT 'Unassigned' NOT NULL,
	`trade_title` text DEFAULT '' NOT NULL,
	`requested_at` text NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_access_requests_email_unique` ON `staff_access_requests` (`email`);