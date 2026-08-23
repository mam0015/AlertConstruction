CREATE TABLE `worker_attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`worker_email` text NOT NULL,
	`work_date` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worker_file_access` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` integer NOT NULL,
	`case_id` integer NOT NULL,
	`worker_email` text NOT NULL,
	`granted_by` text NOT NULL,
	`granted_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worker_project_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`worker_email` text NOT NULL,
	`trade_title` text DEFAULT 'Worker' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`assigned_by` text NOT NULL,
	`assigned_at` text NOT NULL,
	`removed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worker_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`worker_email` text NOT NULL,
	`work_date` text NOT NULL,
	`completed_work` text NOT NULL,
	`next_step` text NOT NULL,
	`issues_delays` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`submitted_at` text NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL,
	`reviewed_at` text DEFAULT '' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worker_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`worker_email` text NOT NULL,
	`title` text NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'assigned' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text DEFAULT '' NOT NULL
);
