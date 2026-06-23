/** OAuth2 PKCE (RFC 7636) helpers for Discord mobile native sign-in. */

const PKCE_VERIFIER_LENGTH = 64;
const PKCE_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

function createPkceVerifier(): string {
  const randomValues = crypto.getRandomValues(new Uint8Array(PKCE_VERIFIER_LENGTH));
  return Array.from(randomValues, (value) => PKCE_CHARSET[value % PKCE_CHARSET.length]).join("");
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createPkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = createPkceVerifier();
  const challenge = await createPkceChallenge(verifier);
  return { verifier, challenge };
}
