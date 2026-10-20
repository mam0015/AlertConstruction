#!/usr/bin/env node
// Connects ONE company mailbox to Jarvis. Run this on your own computer, once per mailbox.
//
//   JARVIS_GMAIL_CLIENT_ID=… JARVIS_GMAIL_CLIENT_SECRET=… node jarvis/scripts/gmail-authorize.mjs info@yourcompany.com.au
//   … same command with  --allow-replies  to also let Jarvis send replies you have approved
//
// Default: Google's consent screen asks ONLY for "read your email" (gmail.readonly). Google itself will not let Jarvis send,
// delete or change anything with that permission.
// With --allow-replies it also asks for "send email" (gmail.send), so that Jarvis can send a reply when — and only when — you
// press Send on a draft. Anything broader than these two permissions is refused. The refresh token is printed once and is
// never written to disk — copy the line into the Cloudflare secret JARVIS_GMAIL_ACCOUNTS (see jarvis/README.md).

import { randomBytes } from "node:crypto";
import http from "node:http";
import { GMAIL_SEND_SCOPE } from "../reply.mjs";
import { GMAIL_READONLY_SCOPE } from "../sources/company-email.mjs";

const args = process.argv.slice(2);
const allowReplies = args.includes("--allow-replies");
const label = args.find((arg) => !arg.startsWith("--"))?.trim();
const requested = allowReplies ? [GMAIL_READONLY_SCOPE, GMAIL_SEND_SCOPE] : [GMAIL_READONLY_SCOPE];
const clientId = process.env.JARVIS_GMAIL_CLIENT_ID?.trim();
const clientSecret = process.env.JARVIS_GMAIL_CLIENT_SECRET?.trim();

if (!label || !label.includes("@") || !clientId || !clientSecret) {
  console.error("Usage: JARVIS_GMAIL_CLIENT_ID=… JARVIS_GMAIL_CLIENT_SECRET=… node jarvis/scripts/gmail-authorize.mjs <mailbox@yourcompany.com.au> [--allow-replies]");
  process.exit(1);
}

const state = randomBytes(16).toString("hex");

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname !== "/") {
    response.writeHead(404).end();
    return;
  }
  const finish = (status, message, code = 0) => {
    response.writeHead(status, { "content-type": "text/html; charset=utf-8" }).end(`<!doctype html><meta charset="utf-8"><body style="font:16px system-ui;padding:40px"><h2>${message}</h2><p>You can close this tab and return to the terminal.</p></body>`);
    server.close(() => process.exit(code));
  };
  if (url.searchParams.get("state") !== state) return finish(400, "Security check failed.", 1);
  const code = url.searchParams.get("code");
  if (!code) return finish(400, "Google did not approve the request.", 1);
  try {
    const redirectUri = `http://127.0.0.1:${server.address().port}`;
    const reply = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    });
    const tokens = await reply.json();
    if (!reply.ok || !tokens.refresh_token) throw new Error(tokens.error_description || tokens.error || "Google returned no refresh token (try again; the consent screen must be accepted).");
    // Refuse anything broader than what was asked for, even if the OAuth client was misconfigured.
    const granted = String(tokens.scope ?? "").split(/\s+/).filter(Boolean);
    if (granted.some((scope) => !requested.includes(scope)) || !granted.includes(GMAIL_READONLY_SCOPE)) {
      throw new Error(`Google granted something other than the permissions asked for (${granted.join(", ")}). Nothing was saved.`);
    }
    // On Google's consent screen a person can untick "send"; then replies stay off for this mailbox.
    const canReply = allowReplies && granted.includes(GMAIL_SEND_SCOPE);
    finish(200, canReply ? "Mailbox connected (read + reply on your approval)." : "Mailbox connected (read-only).");
    console.log(`\nSuccess — ${canReply ? "read access and permission to send replies you approve" : "read-only access"} granted for`, label);
    if (allowReplies && !canReply) console.log('Note: you did not tick "send", so replies stay OFF for this mailbox. Run the command again to enable them.');
    console.log("\nAdd this entry to the JARVIS_GMAIL_ACCOUNTS secret (a JSON list; keep entries for your other mailboxes):\n");
    console.log(JSON.stringify([{ label, refreshToken: tokens.refresh_token, canReply }]));
    console.log("\nStore it with:  npx wrangler secret put JARVIS_GMAIL_ACCOUNTS   (or paste it into Cloudflare → Workers → Settings → Variables and Secrets)\n");
  } catch (error) {
    console.error("\nCould not connect the mailbox:", error instanceof Error ? error.message : error);
    finish(500, "Something went wrong.", 1);
  }
});

server.listen(0, "127.0.0.1", () => {
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: requested.join(" "),
    access_type: "offline",
    prompt: "consent",
    login_hint: label,
    state,
  });
  console.log(`Open this link in your browser and sign in as ${label}:\n\nhttps://accounts.google.com/o/oauth2/v2/auth?${params}\n`);
  console.log("Waiting for Google… (press Ctrl+C to cancel)");
});
