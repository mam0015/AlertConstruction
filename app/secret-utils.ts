const encoder = new TextEncoder();
export const PBKDF2_ITERATIONS = 100_000;

function base64UrlEncode(input: Uint8Array) {
  let binary = "";
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(input: string) {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function safeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function pbkdf2Iterations(storedHash: string) {
  const [algorithm, iterationsText, saltText, expectedText, extra] = storedHash.split("$");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2" || extra || !Number.isInteger(iterations) || !saltText || !expectedText) return null;
  return iterations;
}

export function isSupportedPbkdf2Hash(storedHash: string) {
  return pbkdf2Iterations(storedHash) === PBKDF2_ITERATIONS;
}

export async function verifyPbkdf2(value: string, storedHash: string) {
  if (!isSupportedPbkdf2Hash(storedHash)) return false;
  const [, , saltText, expectedText] = storedHash.split("$");
  try {
    const salt = base64UrlDecode(saltText);
    const expected = base64UrlDecode(expectedText);
    if (salt.length < 16 || expected.length !== 32) return false;
    const key = await crypto.subtle.importKey("raw", encoder.encode(value), "PBKDF2", false, ["deriveBits"]);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    }, key, expected.length * 8));
    return safeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function hashPbkdf2(value: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(value), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt,
    iterations: PBKDF2_ITERATIONS,
  }, key, 256));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64UrlEncode(salt)}$${base64UrlEncode(bits)}`;
}
