CREATE TABLE `team_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`case_id` integer DEFAULT 0 NOT NULL,
	`assignee_email` text NOT NULL,
	`assignee_role` text NOT NULL,
	`assignee_title` text NOT NULL,
	`title` text NOT NULL,
	`instructions` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'Normal' NOT NULL,
	`status` text DEFAULT 'assigned' NOT NULL,
	`created_by_role` text NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `team_tasks_assignee_idx` ON `team_tasks` (`assignee_email`,`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `team_tasks_case_idx` ON `team_tasks` (`case_id`,`status`);