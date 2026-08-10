import { pbkdf2Sync, randomBytes } from "node:crypto";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function hashSecret(value) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(value, salt, 100_000, 32, "sha256");
  return `pbkdf2$100000$${encode(salt)}$${encode(hash)}`;
}

async function hiddenPrompt(label) {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run this command in an interactive terminal.");
  }

  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish();
          reject(new Error("Cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          if (value) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
        } else if (character >= " ") {
          value += character;
          stdout.write("•");
        }
      }
    };
    stdin.on("data", onData);
  });
}

const prompt = createInterface({ input: stdin, output: stdout });

try {
  const ownerEmail = (await prompt.question("Owner email: ")).trim().toLowerCase();
  prompt.close();
  if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) throw new Error("Enter a valid Owner email.");

  const ownerPassword = await hiddenPrompt("New Owner password: ");
  const teamCode = (await hiddenPrompt("Private Team Code: ")).trim().toUpperCase();
  if (ownerPassword.length < 12) throw new Error("Owner password must contain at least 12 characters.");
  if (teamCode.length < 8) throw new Error("Team Code must contain at least 8 characters.");

  stdout.write("\nAdd these values to your hosting provider's encrypted environment settings:\n\n");
  stdout.write(`OWNER_EMAIL=${ownerEmail}\n`);
  stdout.write(`OWNER_PASSWORD_HASH=${hashSecret(ownerPassword)}\n`);
  stdout.write(`OWNER_SESSION_SECRET=${encode(randomBytes(48))}\n`);
  stdout.write(`ADMIN_TEAM_CODE_HASH=${hashSecret(teamCode)}\n`);
  stdout.write(`ADMIN_SESSION_SECRET=${encode(randomBytes(48))}\n`);
  stdout.write("\nDo not save this output in the public website directory.\n");
} catch (error) {
  prompt.close();
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
