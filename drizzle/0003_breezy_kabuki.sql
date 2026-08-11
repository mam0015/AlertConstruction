CREATE TABLE `project_updates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`work_date` text NOT NULL,
	`supervisor_email` text NOT NULL,
	`internal_update` text NOT NULL,
	`customer_update` text NOT NULL,
	`status` text DEFAULT 'pending_admin' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`owner_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`admin_reviewed_at` text DEFAULT '' NOT NULL,
	`owner_reviewed_at` text DEFAULT '' NOT NULL,
	`published_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_visit_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`supervisor_email` text NOT NULL,
	`visit_date` text NOT NULL,
	`summary` text NOT NULL,
	`findings` text NOT NULL,
	`recommendations` text NOT NULL,
	`internal_notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`admin_note` text DEFAULT '' NOT NULL,
	`submitted_at` text NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_code` text NOT NULL,
	`project_code` text DEFAULT '' NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text DEFAULT '' NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`service` text NOT NULL,
	`suburb` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`timeframe` text DEFAULT '' NOT NULL,
	`budget` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'request_submitted' NOT NULL,
	`assigned_supervisor_email` text DEFAULT '' NOT NULL,
	`assigned_supervisor_name` text DEFAULT '' NOT NULL,
	`site_visit_at` text DEFAULT '' NOT NULL,
	`project_folder` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_cases_request_code_unique` ON `workflow_cases` (`request_code`);--> statement-breakpoint
CREATE TABLE `workflow_estimates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`scope` text NOT NULL,
	`terms` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text DEFAULT '' NOT NULL,
	`customer_decided_at` text DEFAULT '' NOT NULL,
	`confirmed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_estimates_case_id_unique` ON `workflow_estimates` (`case_id`);--> statement-breakpoint
CREATE TABLE `workflow_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`actor_role` text NOT NULL,
	`actor_email` text DEFAULT '' NOT NULL,
	`event_type` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`audience` text DEFAULT 'internal' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`update_id` integer DEFAULT 0 NOT NULL,
	`category` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text NOT NULL,
	`visibility` text DEFAULT 'internal' NOT NULL,
	`uploaded_at` text NOT NULL,
	`published_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_files_object_key_unique` ON `workflow_files` (`object_key`);