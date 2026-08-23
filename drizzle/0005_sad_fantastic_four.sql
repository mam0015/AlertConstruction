CREATE UNIQUE INDEX `worker_attendance_email_date_unique` ON `worker_attendance` (`worker_email`,`work_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `worker_file_access_file_email_unique` ON `worker_file_access` (`file_id`,`worker_email`);--> statement-breakpoint
CREATE INDEX `worker_file_access_email_idx` ON `worker_file_access` (`worker_email`,`case_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `worker_project_assignments_case_email_unique` ON `worker_project_assignments` (`case_id`,`worker_email`);--> statement-breakpoint
CREATE INDEX `worker_project_assignments_email_idx` ON `worker_project_assignments` (`worker_email`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `worker_reports_case_email_date_unique` ON `worker_reports` (`case_id`,`worker_email`,`work_date`);--> statement-breakpoint
CREATE INDEX `worker_reports_email_idx` ON `worker_reports` (`worker_email`,`work_date`);--> statement-breakpoint
CREATE INDEX `worker_tasks_email_idx` ON `worker_tasks` (`worker_email`,`case_id`,`status`);