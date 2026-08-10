CREATE TABLE `request_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_code` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`uploaded_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `request_files_object_key_unique` ON `request_files` (`object_key`);