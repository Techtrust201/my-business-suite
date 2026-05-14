// Helpers partages par les Edge Functions (CORS allowlist, auth cron, garde-fous).
// Cf. N4, N5, N16.

const DEFAULT_ALLOWED_ORIGINS = [
  "https://my-business-suite.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getAllowedOrigins(): string[] {
  const fromEnv = Deno.env.get("ALLOWED_ORIGINS");
  if (!fromEnv) return DEFAULT_ALLOWED_ORIGINS;
  return fromEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  const allowed = getAllowedOrigins();
  const origin = req.headers.get("origin") ?? "";
  const isAllowed = allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowed[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }
  return null;
}

// Verifie le secret cron. Comparaison a temps constant.
// Retourne true si autorise, false sinon.
export function isAuthorizedCron(req: Request): boolean {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected) {
    console.warn("CRON_SECRET non configure : refus par defaut.");
    return false;
  }
  const provided = req.headers.get("x-cron-secret") ?? "";
  return constantTimeEquals(provided, expected);
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function jsonResponse(
  body: unknown,
  status: number,
  req: Request,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(req),
    },
  });
}
