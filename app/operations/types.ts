export type OperationsRole = "Owner" | "Admin" | "Site Supervisor";

export type OperationsProject = {
  caseId: number;
  projectCode: string;
  projectName: string;
  siteLocation: string;
};

export type SiteIssue = {
  id: number;
  caseId: number;
  projectCode: string;
  projectName: string;
  siteLocation: string;
  affectedTrade: string;
  issueType: string;
  severity: "Normal" | "High" | "Critical";
  summary: string;
  details: string;
  impact: string;
  contactedPerson: string;
  contactedAt: string;
  expectedDate: string;
  reporterEmail: string;
  reporterName: string;
  status: "reported" | "under_review" | "rescheduled" | "monitoring" | "resolved";
  adminAction: string;
  rescheduledDate: string;
  rescheduledTime: string;
  rescheduledAssignee: string;
  adminEmail: string;
  adminReviewedAt: string;
  ownerNote: string;
  reportedAt: string;
  updatedAt: string;
  resolvedAt: string;
};

export type FollowUpItem = {
  id: number;
  personEmail: string;
  personRole: string;
  personName: string;
  projectCode: string;
  title: string;
  details: string;
  targetDate: string;
  source: "manual" | "clock_out" | "site_issue";
  status: "open" | "completed" | "cancelled";
  createdByEmail: string;
  createdByRole: string;
  workDate: string;
  clockedOutAt: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
};

export type OperationsSnapshot = {
  viewer: { email: string; role: OperationsRole; name: string };
  today: string;
  tomorrow: string;
  projects: OperationsProject[];
  issues: SiteIssue[];
  followUps: FollowUpItem[];
  metrics: { openIssues: number; criticalIssues: number; dueToday: number; overdue: number };
};
