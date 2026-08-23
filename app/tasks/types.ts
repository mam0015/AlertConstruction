export type TaskPerson = {
  email: string;
  role: string;
  title: string;
  group: "operations" | "management";
};

export type TaskProject = {
  caseId: number;
  projectCode: string;
  siteLabel: string;
};

export type TeamTask = {
  id: number;
  caseId: number;
  projectCode: string;
  siteLabel: string;
  assigneeEmail: string;
  assigneeRole: string;
  assigneeTitle: string;
  title: string;
  instructions: string;
  priority: "Normal" | "High" | "Urgent";
  status: "assigned" | "in_progress" | "completed";
  createdByRole: "Owner" | "Admin";
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
};

export type TaskManagementSnapshot = {
  viewerRole: "Owner" | "Admin";
  people: TaskPerson[];
  projects: TaskProject[];
  tasks: TeamTask[];
};

export type PersonalTaskSnapshot = {
  identity: { email: string; role: string; title: string };
  tasks: TeamTask[];
};
