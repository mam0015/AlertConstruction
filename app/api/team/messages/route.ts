// The old shared "Owner & Admin" staff channel is closed. It was keyed by job title (for example "Site Supervisor"), so every person with the
// same title received the same conversation: one Site Supervisor could read another's notes to management, and Admin's replies to
// "Site Supervisor 01" never reached anyone. Staff messages are now private between two people in Calendar & messages (/api/team/chat).
// The history stays with the Owner and Admin (their dashboards); nothing is deleted.
const closed = () => Response.json({ error: "Team messages have moved to Calendar & messages, where each conversation is private between two people. Open /team/hub?tab=messages." }, { status: 410, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  return closed();
}

export async function POST() {
  return closed();
}
