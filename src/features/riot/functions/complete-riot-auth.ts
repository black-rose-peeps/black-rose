import { createServerFn } from "@tanstack/react-start";
import { isAllowedRiotRedirectUri } from "@/lib/riot-url";
import { RIOT_CONSENT_VERSION } from "../constants";
import type { RiotAccount } from "@/features/member/types";

export interface CompleteRiotAuthInput {
  code: string;
  redirectUri: string;
  memberId: string;
  isPublic: boolean;
  region?: string;
  consentVersion?: string;
}

export interface CompleteRiotAuthResult {
  riotAccount: RiotAccount;
}

export const completeRiotAuth = createServerFn({ method: "POST" })
  .inputValidator((data: CompleteRiotAuthInput) => {
    if (!data?.code?.trim()) throw new Error("Missing Riot authorization code.");
    const redirectUri = data.redirectUri?.trim() ?? "";
    if (!isAllowedRiotRedirectUri(redirectUri)) {
      throw new Error("Invalid Riot redirect URI.");
    }
    if (!data?.memberId?.trim()) throw new Error("Missing member id.");
    return {
      code: data.code.trim(),
      redirectUri,
      memberId: data.memberId.trim(),
      isPublic: Boolean(data.isPublic),
      region: data.region?.trim() ?? "",
      consentVersion: data.consentVersion?.trim() || RIOT_CONSENT_VERSION,
    };
  })
  .handler(async ({ data }): Promise<CompleteRiotAuthResult> => {
    const { resolveRiotIdentityFromCode } = await import("../server/riot-rso.server");
    const { upsertRiotAccount, rowToRiotAccount } = await import(
      "../server/riot-accounts.server"
    );
    const { findMemberById } = await import("@/features/auth/server/member-auth.server");

    const member = await findMemberById(data.memberId);
    if (!member) throw new Error("Member not found.");

    const identity = await resolveRiotIdentityFromCode(data.code, data.redirectUri);
    const row = await upsertRiotAccount({
      memberId: data.memberId,
      puuid: identity.puuid,
      gameName: identity.gameName,
      tagline: identity.tagLine,
      region: data.region,
      rsoSubject: identity.subject,
      isPublic: data.isPublic,
      consentVersion: data.consentVersion,
    });

    return {
      riotAccount: rowToRiotAccount(row, true),
    };
  });
