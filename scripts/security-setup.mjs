import { pbkdf2Sync, randomBytes } from "node:crypto";
import { createInterface, emitKeypressEvents } from "node:readline";

const base64url = (value) => Buffer.from(value).toString("base64url");

function passwordHash(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256");
  return `pbkdf2$100000$${base64url(salt)}$${base64url(hash)}`;
}

async function ask(label) {
  const input = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => input.question(label, resolve));
  input.close();
  return answer.trim();
}

async function askHidden(label) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run this helper in a local interactive terminal.");
  process.stdout.write(label);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = "";
  return new Promise((resolve, reject) => {
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("keypress", onKey);
      process.stdout.write("\n");
      resolve(value);
    };
    const onKey = (character, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        reject(new Error("Cancelled."));
      } else if (key?.name === "return") finish();
      else if (key?.name === "backspace") {
        if (value) { value = value.slice(0, -1); process.stdout.write("\b \b"); }
      } else if (character && !key?.ctrl && !key?.meta) {
        value += character;
        process.stdout.write("•");
      }
    };
    process.stdin.on("keypress", onKey);
  });
}

try {
  const kind = (await ask("Create Owner credentials or Team Code? [owner/team]: ")).toLowerCase();
  if (!["owner", "team"].includes(kind)) throw new Error("Choose owner or team.");

  if (kind === "owner") {
    const email = (await ask("Owner email address: ")).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
    const displayName = (await ask("Owner display name [Owner]: ")) || "Owner";
    const first = await askHidden("Owner password: ");
    const second = await askHidden("Repeat password: ");
    if (first !== second) throw new Error("Passwords did not match.");
    if (first.length < 10) throw new Error("Use at least 10 characters.");
    console.log("\nCopy these values into the private runtime settings. Do not add them to GitHub.\n");
    console.log(`OWNER_EMAIL=${email}`);
    console.log(`OWNER_PASSWORD_HASH=${passwordHash(first)}`);
    console.log(`OWNER_DISPLAY_NAME=${displayName}`);
    console.log(`OWNER_SESSION_SECRET=${base64url(randomBytes(48))}`);
  } else {
    const first = (await askHidden("Company Team Code: ")).toUpperCase();
    const second = (await askHidden("Repeat Team Code: ")).toUpperCase();
    if (first !== second) throw new Error("Team Codes did not match.");
    if (first.length < 6) throw new Error("Use at least 6 characters.");
    console.log("\nCopy these values into the private runtime settings. Do not add them to GitHub.\n");
    console.log(`TEAM_CODE=${first}`);
    console.log(`TEAM_CODE_HASH=${passwordHash(first)}`);
    console.log(`TEAM_SESSION_SECRET=${base64url(randomBytes(48))}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
