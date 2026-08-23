function setting(name: string) {
  return process.env[name]?.trim() ?? "";
}

export async function notifyOwnerOfStaffRequest(staffEmail: string) {
  const apiKey = setting("RESEND_API_KEY");
  const from = setting("TEAM_NOTIFICATION_EMAIL_FROM");
  const ownerEmail = setting("OWNER_EMAIL");
  if (!apiKey || !from || !ownerEmail) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [ownerEmail],
      subject: "New Alert Tradie Pro team access request",
      text: `${staffEmail} used the company Team Code and is waiting for your approval and role assignment in Owner → Access requests.`,
    }),
  });
  if (!response.ok) throw new Error("Owner notification provider rejected the request.");
}
