// The plan: calendar entries and schedule events from today onward ("what is coming up"). Unlike the other sources this
// one looks AHEAD — fromDate/toDate are Melbourne calendar dates — and its items carry the planned time in `at`.

import { makeItem } from "../briefing.mjs";
import { runQueries } from "./run.mjs";

const SOURCE = "schedule";
const toISO = (date, time) => `${date}T${/^\d{2}:\d{2}$/.test(String(time)) ? time : "00:00"}:00`;
const dateParams = ({ fromDate, toDate, limit }) => [fromDate, toDate, limit];

const queries = [
  {
    name: "calendar_entries",
    sql: `SELECT id, entry_date AS entryDate, start_time AS startTime, title, notes, project_code AS projectCode, assignee_name AS assigneeName, assignee_email AS assigneeEmail,
        created_by_name AS createdByName
      FROM calendar_entries WHERE entry_date >= ? AND entry_date <= ? ORDER BY entry_date, start_time LIMIT ?`,
    params: dateParams,
    item: (row) => makeItem({
      id: `cal:${row.id}`, source: SOURCE, kind: "calendar_entry", at: toISO(row.entryDate, row.startTime),
      title: `${row.entryDate}${row.startTime ? ` ${row.startTime}` : ""} — ${row.title}`, who: row.assigneeName || row.assigneeEmail, project: row.projectCode,
      body: `${row.notes} Planned by ${row.createdByName || "the team"}.`,
    }),
  },
  {
    name: "schedule_events",
    sql: `SELECT id, event_date AS eventDate, start_time AS startTime, title, assignee, project_code AS projectCode, notes
      FROM schedule_events WHERE event_date >= ? AND event_date <= ? ORDER BY event_date, start_time LIMIT ?`,
    params: dateParams,
    item: (row) => makeItem({
      id: `sched:${row.id}`, source: SOURCE, kind: "schedule_event", at: toISO(row.eventDate, row.startTime),
      title: `${row.eventDate}${row.startTime ? ` ${row.startTime}` : ""} — ${row.title}`, who: row.assignee, project: row.projectCode, body: row.notes,
    }),
  },
];

export const readSchedule = (reader, window) => runQueries(reader, queries, window);
