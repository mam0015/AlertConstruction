DELETE FROM `request_consents`
WHERE `case_id` IN (
  SELECT `id` FROM `workflow_cases`
  WHERE `request_code` IN ('REQ-2026-0201', 'REQ-2026-0198')
    AND `customer_email` IN ('customer@example.com', 'customer198@example.com')
);
--> statement-breakpoint
DELETE FROM `quality_inspections`
WHERE `case_id` IN (
  SELECT `id` FROM `workflow_cases`
  WHERE `request_code` IN ('REQ-2026-0201', 'REQ-2026-0198')
    AND `customer_email` IN ('customer@example.com', 'customer198@example.com')
);
--> statement-breakpoint
DELETE FROM `project_updates`
WHERE `case_id` IN (
  SELECT `id` FROM `workflow_cases`
  WHERE `request_code` IN ('REQ-2026-0201', 'REQ-2026-0198')
    AND `customer_email` IN ('customer@example.com', 'customer198@example.com')
);
--> statement-breakpoint
DELETE FROM `workflow_estimates`
WHERE `case_id` IN (
  SELECT `id` FROM `workflow_cases`
  WHERE `request_code` IN ('REQ-2026-0201', 'REQ-2026-0198')
    AND `customer_email` IN ('customer@example.com', 'customer198@example.com')
);
--> statement-breakpoint
DELETE FROM `workflow_files`
WHERE `case_id` IN (
  SELECT `id` FROM `workflow_cases`
  WHERE `request_code` IN ('REQ-2026-0201', 'REQ-2026-0198')
    AND `customer_email` IN ('customer@example.com', 'customer198@example.com')
);
--> statement-breakpoint
DELETE FROM `site_visit_reports`
WHERE `case_id` IN (
  SELECT `id` FROM `workflow_cases`
  WHERE `request_code` IN ('REQ-2026-0201', 'REQ-2026-0198')
    AND `customer_email` IN ('customer@example.com', 'customer198@example.com')
);
--> statement-breakpoint
DELETE FROM `workflow_events`
WHERE `case_id` IN (
  SELECT `id` FROM `workflow_cases`
  WHERE `request_code` IN ('REQ-2026-0201', 'REQ-2026-0198')
    AND `customer_email` IN ('customer@example.com', 'customer198@example.com')
);
--> statement-breakpoint
DELETE FROM `workflow_cases`
WHERE `request_code` IN ('REQ-2026-0201', 'REQ-2026-0198')
  AND `customer_email` IN ('customer@example.com', 'customer198@example.com');
--> statement-breakpoint
DELETE FROM `finance_entries`
WHERE `created_at` = '2026-08-09T12:00:36.421Z'
  AND `project_code` IN ('ATP-2026-00124', 'ATP-2026-00131');
--> statement-breakpoint
DELETE FROM `schedule_events`
WHERE `project_code` = 'ATP-2026-00124'
  AND `title` IN ('Owner project review', 'Plumbing rough-in', 'Framing inspection', 'Electrical rough-in', 'Wall lining begins');
--> statement-breakpoint
DELETE FROM `eod_reports`
WHERE `submitted_at` LIKE '2026-08-09%'
  AND `person` IN ('Site Supervisor 01', 'Admin 01', 'Worker 01');
--> statement-breakpoint
DELETE FROM `team_messages`
WHERE (`sent_at` = '2026-08-09T10:36:00+10:00' AND `body` = 'Morning Ali, the framing dimensions are checked and the plumbing set-out is ready.')
   OR (`sent_at` = '2026-08-09T10:40:00+10:00' AND `body` = 'Great. Please upload the marked-up photos to Project 124 before the EOD report.')
   OR (`sent_at` = '2026-08-09T10:44:00+10:00' AND `body` = 'Done — 8 photos are now attached to the project.');
--> statement-breakpoint
DELETE FROM `job_requests`
WHERE (`code` = 'REQ-2026-0148' AND `customer_name` = 'Customer 148')
   OR (`code` = 'JOB-2026-0221' AND `customer_name` = 'Customer 221' AND `contact` = 'customer221@example.com')
   OR (`code` = 'REQ-2026-0151' AND `customer_name` = 'Customer 151')
   OR (`code` = 'JOB-2026-0224' AND `customer_name` = 'Customer 224' AND `contact` = 'customer224@example.com');
--> statement-breakpoint
DELETE FROM `staff_access_requests`
WHERE `email` LIKE '%@alerttradiepro.demo' AND `password_hash` = 'preview';
--> statement-breakpoint
DELETE FROM `projects`
WHERE `code` IN ('ATP-2026-00124', 'ATP-2026-00131', 'ATP-2026-00136', 'ATP-2026-00141')
  AND `customer_name` IN ('Customer 124', 'Customer 131', 'Customer 136', 'Customer 141')
  AND `updated_at` = '2026-08-09T12:00:36.421Z';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `app_migrations` (
  `migration_key` text PRIMARY KEY NOT NULL,
  `applied_at` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `app_migrations` (`migration_key`, `applied_at`)
VALUES ('remove_seed_records_v72', CURRENT_TIMESTAMP);
--> statement-breakpoint
INSERT OR IGNORE INTO `app_migrations` (`migration_key`, `applied_at`)
VALUES ('remove_workflow_demo_v72', CURRENT_TIMESTAMP);
