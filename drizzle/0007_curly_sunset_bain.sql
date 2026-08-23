CREATE TABLE `follow_up_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_email` text NOT NULL,
	`person_role` text NOT NULL,
	`person_name` text NOT NULL,
	`project_code` text DEFAULT 'Business / General' NOT NULL,
	`title` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`target_date` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`dedupe_key` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_by_email` text NOT NULL,
	`created_by_role` text NOT NULL,
	`work_date` text DEFAULT '' NOT NULL,
	`clocked_out_at` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `follow_up_items_dedupe_key_unique` ON `follow_up_items` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `follow_up_items_person_idx` ON `follow_up_items` (`person_email`,`status`,`target_date`);--> statement-breakpoint
CREATE INDEX `follow_up_items_target_idx` ON `follow_up_items` (`target_date`,`status`);--> statement-breakpoint
CREATE TABLE `site_issue_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer NOT NULL,
	`project_code` text NOT NULL,
	`project_name` text DEFAULT '' NOT NULL,
	`site_location` text NOT NULL,
	`affected_trade` text NOT NULL,
	`issue_type` text NOT NULL,
	`severity` text DEFAULT 'High' NOT NULL,
	`summary` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`impact` text DEFAULT '' NOT NULL,
	`contacted_person` text DEFAULT '' NOT NULL,
	`contacted_at` text DEFAULT '' NOT NULL,
	`expected_date` text DEFAULT '' NOT NULL,
	`reporter_email` text NOT NULL,
	`reporter_name` text NOT NULL,
	`status` text DEFAULT 'reported' NOT NULL,
	`admin_action` text DEFAULT '' NOT NULL,
	`rescheduled_date` text DEFAULT '' NOT NULL,
	`rescheduled_time` text DEFAULT '' NOT NULL,
	`rescheduled_assignee` text DEFAULT '' NOT NULL,
	`admin_email` text DEFAULT '' NOT NULL,
	`admin_reviewed_at` text DEFAULT '' NOT NULL,
	`owner_note` text DEFAULT '' NOT NULL,
	`reported_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`resolved_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `site_issue_reports_status_idx` ON `site_issue_reports` (`status`,`severity`,`reported_at`);--> statement-breakpoint
CREATE INDEX `site_issue_reports_case_idx` ON `site_issue_reports` (`case_id`,`status`);--> statement-breakpoint
CREATE INDEX `site_issue_reports_reporter_idx` ON `site_issue_reports` (`reporter_email`,`status`);