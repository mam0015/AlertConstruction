CREATE TABLE `job_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`request_type` text NOT NULL,
	`customer_name` text NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`service` text NOT NULL,
	`suburb` text DEFAULT '' NOT NULL,
	`submitted_at` text NOT NULL,
	`status` text DEFAULT 'New' NOT NULL,
	`priority` text DEFAULT 'Normal' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`assigned_to` text DEFAULT 'Unassigned' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_requests_code_unique` ON `job_requests` (`code`);