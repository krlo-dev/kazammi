import { connection } from "next/server";

import { FINGERPRINT_VERSION } from "@/modules/fingerprint";

import packageJson from "../../../../package.json";

export type HealthResponse = {
  status: "ok";
  version: string;
  fingerprintVersion: number;
};

// Public endpoint (no session) used to check the deployment and wake Neon up.
export async function GET() {
  // Run on every request instead of being prerendered at build time.
  await connection();

  const body: HealthResponse = {
    status: "ok",
    version: packageJson.version,
    fingerprintVersion: FINGERPRINT_VERSION,
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
