import { createCalendarEntries, sendChat, type TeamPerson } from "../db/team-store";
import { performTaskManagementAction } from "../db/task-store";
import { createOwnerRecord } from "../db/owner-store";
import { runtimeBindings } from "../db/runtime";
import type { TeamIdentity } from "../app/team-identity";

// How Jarvis carries out an action the Owner confirmed: through the SAME functions the Owner's own pages use, acting as the Owner,
// so every rule of the app (approved team members only, field limits, who may plan what) applies exactly as if the Owner had typed it.
export function ownerIdentity(owner: { email: string; name: string }): TeamIdentity {
  return { email: owner.email, role: "Owner", name: `${owner.name} (Owner)` };
}

export function executorsFor(owner: { email: string; name: string }) {
  const identity = ownerIdentity(owner);
  return {
    async sendMessage({ personEmail, text }: { personEmail: string; text: string }) {
      await sendChat(identity, personEmail, text);
    },
    async addCalendar({ personEmail, title, notes, dates, startTime, projectCode }: { personEmail: string; title: string; notes: string; dates: string[]; startTime: string; projectCode: string }) {
      await createCalendarEntries(identity, { assigneeEmail: personEmail, title, notes, dates, startTime, projectCode });
    },
    // The same function the Owner's own Finance page uses (amounts are whole cents), so every rule of a finance entry applies.
    async addFinance({ financeType, category, projectCode, amountCents, entryDate, note }: { financeType: string; category: string; projectCode: string; amountCents: number; entryDate: string; note: string }) {
      await createOwnerRecord("finance", { type: financeType, category, projectCode, amount: amountCents, entryDate, note });
    },
    async createTask({ personEmail, title, instructions, priority, projectCode }: { personEmail: string; title: string; instructions: string; priority: string; projectCode: string }) {
      let caseId = 0;
      const code = projectCode.trim();
      if (code && !/^business\s*\/\s*general$/i.test(code)) {
        const env = await runtimeBindings();
        if (!env.DB) throw new Error("The company database is unavailable.");
        const row = await env.DB.prepare("SELECT id FROM workflow_cases WHERE (project_code = ?1 OR request_code = ?1) AND stage = 'active_project' LIMIT 1").bind(code).first<{ id: number }>();
        if (!row) throw new Error(`No active project has the code ${code.slice(0, 30)}. Ask Jarvis again without a project, or with the right code.`);
        caseId = Number(row.id);
      }
      await performTaskManagementAction("Owner", identity.email, "create_task", { assigneeEmail: personEmail, caseId, title, instructions, priority });
    },
  };
}

export async function teamPeople(listPeople: () => Promise<TeamPerson[]>): Promise<TeamPerson[]> {
  try {
    return await listPeople();
  } catch (error) {
    console.error("Jarvis could not load the team list:", error instanceof Error ? error.name : "unknown");
    return [];
  }
}
