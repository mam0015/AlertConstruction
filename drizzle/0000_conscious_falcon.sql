CREATE TABLE `eod_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person` text NOT NULL,
	`role` text NOT NULL,
	`project_code` text NOT NULL,
	`summary` text NOT NULL,
	`submitted_at` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`owner_note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `finance_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`category` text NOT NULL,
	`project_code` text DEFAULT 'Business / General' NOT NULL,
	`amount` integer NOT NULL,
	`entry_date` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`service` text NOT NULL,
	`stage` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`contract_value` integer DEFAULT 0 NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`customer_name` text DEFAULT '' NOT NULL,
	`suburb` text DEFAULT '' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_code_unique` ON `projects` (`code`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role` text PRIMARY KEY NOT NULL,
	`projects` integer DEFAULT true NOT NULL,
	`schedule` integer DEFAULT true NOT NULL,
	`finance` integer DEFAULT false NOT NULL,
	`finance_export` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `schedule_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_date` text NOT NULL,
	`start_time` text NOT NULL,
	`title` text NOT NULL,
	`assignee` text NOT NULL,
	`project_code` text DEFAULT 'Business / General' NOT NULL,
	`tone` text DEFAULT 'gold' NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`body` text NOT NULL,
	`sent_at` text NOT NULL
);
