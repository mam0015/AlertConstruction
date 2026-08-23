export type WorkerIdentity = {
  email: string;
  role: string;
  tradeTitle: string;
};

export type WorkerProject = {
  caseId: number;
  projectCode: string;
  siteLabel: string;
  tradeTitle: string;
  assignedAt: string;
};

export type WorkerTask = {
  id: number;
  caseId: number;
  projectCode: string;
  workerEmail: string;
  title: string;
  instructions: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
};

export type WorkerFile = {
  id: number;
  caseId: number;
  projectCode: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  sharedWith: string[];
  url: string;
};

export type WorkerReport = {
  id: number;
  caseId: number;
  projectCode: string;
  workerEmail: string;
  workDate: string;
  completedWork: string;
  nextStep: string;
  issuesDelays: string;
  status: string;
  submittedAt: string;
  reviewedBy: string;
  reviewedAt: string;
  reviewNote: string;
};

export type WorkerSnapshot = {
  identity: WorkerIdentity;
  projects: WorkerProject[];
  tasks: WorkerTask[];
  files: WorkerFile[];
  reports: WorkerReport[];
  missingReportDates: string[];
  today: string;
};

export type WorkerManagementSnapshot = {
  projects: Array<{ caseId: number; projectCode: string; siteLabel: string; service: string }>;
  workers: Array<{ email: string; role: string; tradeTitle: string }>;
  assignments: Array<{ id: number; caseId: number; projectCode: string; workerEmail: string; tradeTitle: string; status: string; assignedAt: string }>;
  tasks: WorkerTask[];
  files: WorkerFile[];
  reports: WorkerReport[];
};
