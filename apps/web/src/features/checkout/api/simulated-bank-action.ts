"use server";

import { env } from "@/config/env";

export type SimulatedBankOutcome = "approve" | "fail";

export type SimulatedBankResult = { ok: true } | { reason: "GENERIC" };

// GW-25: answers the simulated bank's 3-D Secure challenge. The browser never
// calls the API directly: this posts server-side to the unauthenticated REST
// endpoint, which the API only serves with the simulated gateway (GW-20..22).
// Any non-2xx answer, or a request that fails, reads as GENERIC.
export async function simulatedBankAction(
  clientSecret: string,
  outcome: SimulatedBankOutcome,
): Promise<SimulatedBankResult> {
  try {
    const response = await fetch(
      `${env.apiUrl}/billing/simulated-3ds/${encodeURIComponent(clientSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
        cache: "no-store",
      },
    );
    return response.ok ? { ok: true } : { reason: "GENERIC" };
  } catch {
    return { reason: "GENERIC" };
  }
}
