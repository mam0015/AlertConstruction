// What the team writes: messages to the Owner, the team channel, and the internal dashboard messages between roles.
// Private chats between two staff members are not read. Customer rows of team_messages belong to client_comments.

import { makeItem } from "../briefing.mjs";
import { runQueries, sinceAndLimit } from "./run.mjs";

const SOURCE = "team_messages";

const queries = [
  {
    name: "chat_to_owner_or_channel",
    sql: `SELECT id, sender_email AS senderEmail, sender_name AS senderName, recipient_email AS recipientEmail, body, file_name AS fileName, sent_at AS at
      FROM team_chat WHERE sent_at >= ? AND (recipient_email = ? OR recipient_email = '*' OR sender_email = ?) ORDER BY sent_at DESC LIMIT ?`,
    params: ({ sinceISO, limit, ownerEmail }) => [sinceISO, String(ownerEmail ?? "").toLowerCase(), String(ownerEmail ?? "").toLowerCase(), limit],
    item: (row, { ownerEmail }) => {
      const channel = row.recipientEmail === "*";
      const fromOwner = row.senderEmail === String(ownerEmail ?? "").toLowerCase();
      return makeItem({
        id: `chat:${row.id}`, source: SOURCE, kind: channel ? "team_channel" : fromOwner ? "message_from_owner" : "message_to_owner", at: row.at,
        title: `${channel ? "Team channel" : fromOwner ? "You wrote" : "Message"} — ${row.senderName || row.senderEmail}`,
        who: row.senderName || row.senderEmail, body: `${row.body}${row.fileName ? ` [attached file: ${row.fileName}]` : ""}`,
      });
    },
  },
  {
    name: "dashboard_messages",
    sql: `SELECT id, sender, recipient, body, sent_at AS at FROM team_messages
      WHERE sent_at >= ? AND sender NOT LIKE 'Customer · %' ORDER BY sent_at DESC LIMIT ?`,
    params: sinceAndLimit,
    item: (row) => makeItem({
      id: `msg:${row.id}`, source: SOURCE, kind: "team_message", at: row.at,
      title: `${row.sender} → ${row.recipient}`, who: row.sender, body: row.body,
    }),
  },
];

export const readTeamMessages = (reader, window) => runQueries(reader, queries, window);
