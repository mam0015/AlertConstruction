CREATE TABLE `owner_accounts` (
	`id` integer PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text DEFAULT 'Owner' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_accounts_email_unique` ON `owner_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `team_access_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`team_code` text NOT NULL,
	`team_code_hash` text NOT NULL,
	`updated_at` text NOT NULL
);
