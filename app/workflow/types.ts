export const workflowStages = [
  "request_submitted",
  "admin_review",
  "customer_contacted",
  "site_visit_ready",
  "site_visit_scheduled",
  "site_visit_submitted",
  "visit_changes_requested",
  "site_visit_approved",
  "estimate_ready",
  "estimate_sent",
  "estimate_declined",
  "customer_approved",
  "active_project",
  "quality_inspection",
  "completion_ready",
  "complete",
  "closed",
] as const;

export type WorkflowStage = typeof workflowStages[number];
export type WorkflowRole = "owner" | "admin" | "supervisor" | "estimator";

export const estimatorStages: WorkflowStage[] = ["site_visit_approved", "estimate_ready", "estimate_sent", "estimate_declined", "customer_approved", "active_project", "quality_inspection", "completion_ready", "complete"];

export const stageLabels: Record<WorkflowStage, string> = {
  request_submitted: "Request submitted",
  admin_review: "Admin review",
  customer_contacted: "Customer contacted",
  site_visit_ready: "Project folder ready",
  site_visit_scheduled: "Site visit scheduled",
  site_visit_submitted: "Visit report submitted",
  visit_changes_requested: "Visit changes requested",
  site_visit_approved: "Waiting for Estimator",
  estimate_ready: "Estimate ready for Admin",
  estimate_sent: "Estimate sent",
  estimate_declined: "Estimate declined",
  customer_approved: "Customer approved",
  active_project: "Active project",
  quality_inspection: "Quality inspection",
  completion_ready: "Ready for completion",
  complete: "Complete",
  closed: "Closed",
};

export type QualityInspection = {
  id: number;
  // The version Admin's decision names (a new value each time it is submitted again).
  revision: string;
  caseId: number;
  supervisorEmail: string;
  inspectedAt: string;
  summary: string;
  defects: string;
  status: string;
  adminNote: string;
  ownerNote: string;
  submittedAt: string;
  reviewedAt: string;
  completedAt: string;
};

export type WorkflowFile = {
  id: number;
  caseId: number;
  updateId: number;
  category: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  visibility: string;
  uploadedAt: string;
  publishedAt: string;
  url: string;
};

export type SiteVisitReport = {
  id: number;
  // The version Admin's decision and the Site Supervisor's corrected report name (a new value each time it is submitted again).
  revision: string;
  caseId: number;
  supervisorEmail: string;
  visitDate: string;
  summary: string;
  findings: string;
  recommendations: string;
  internalNotes: string;
  status: string;
  adminNote: string;
  submittedAt: string;
  reviewedAt: string;
};

export type WorkflowEstimate = {
  id: number;
  // The version the calculator and Send name (a new value each time the estimate is saved again).
  revision: string;
  caseId: number;
  amountCents: number;
  scope: string;
  terms: string;
  status: string;
  createdBy: string;
  createdAt: string;
  sentAt: string;
  customerDecidedAt: string;
  confirmedAt: string;
  // The priced working (unit prices, margin): sent to Owner and Admin only.
  breakdown?: string;
};

export type ProjectUpdate = {
  id: number;
  caseId: number;
  workDate: string;
  supervisorEmail: string;
  internalUpdate: string;
  customerUpdate: string;
  status: string;
  adminNote: string;
  ownerNote: string;
  createdAt: string;
  adminReviewedAt: string;
  ownerReviewedAt: string;
  publishedAt: string;
  files: WorkflowFile[];
};

export type ChangeProposal = {
  id: number;
  caseId: number;
  title: string;
  detail: string;
  status: string;
  createdBy: string;
  createdAt: string;
  customerReply: string;
  decidedAt: string;
};

export type CustomerMessage = {
  id: number;
  caseId: number;
  sender: "Admin" | "Customer";
  senderLabel: string;
  body: string;
  kind: "message" | "document_request";
  createdAt: string;
};

export type WorkflowEvent = {
  id: number;
  caseId: number;
  actorRole: string;
  actorEmail: string;
  eventType: string;
  title: string;
  detail: string;
  audience: string;
  createdAt: string;
};

export type WorkflowCase = {
  id: number;
  requestCode: string;
  projectCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service: string;
  suburb: string;
  description: string;
  timeframe: string;
  budget: string;
  stage: WorkflowStage;
  assignedSupervisorEmail: string;
  assignedSupervisorName: string;
  siteVisitAt: string;
  projectFolder: string;
  createdAt: string;
  updatedAt: string;
  progress: number;
  visitReport: SiteVisitReport | null;
  qualityInspection: QualityInspection | null;
  estimate: WorkflowEstimate | null;
  files: WorkflowFile[];
  updates: ProjectUpdate[];
  proposals: ChangeProposal[];
  messages: CustomerMessage[];
  view?: CaseStatusView;
};

export type WorkflowSnapshot = {
  cases: WorkflowCase[];
  events: WorkflowEvent[];
  supervisors: Array<{ email: string; name: string }>;
  role: WorkflowRole;
  stageOptions?: string[];
};

// What the Owner/Admin decided about a project beside the step-by-step workflow (see db/case-view-store.ts).
export type CustomerNote = { id: number; body: string; showFrom: string; showUntil: string; createdBy: string; createdAt: string; removedAt: string };
export type CaseStatusView = {
  origin: "website" | "team";
  statusLabel: string;
  statusUpdatedAt: string;
  customerStatus: { title: string; detail: string; shownAt: string } | null;
  draft: { title: string; detail: string; updatedAt: string } | null;
  notes: CustomerNote[];
};
