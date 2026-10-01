import { verifyPbkdf2 } from "./secret-utils";

function requiredTeamPinHash() {
  const value = process.env.TEAM_PIN_HASH?.trim();
  if (!value) throw new Error("TEAM_PIN_HASH is not configured.");
  return value;
}

export async function verifyTeamPin(pin: string) {
  const value = pin.trim();
  if (!value) return false;
  return verifyPbkdf2(value, requiredTeamPinHash());
}
