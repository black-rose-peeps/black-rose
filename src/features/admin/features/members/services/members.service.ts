/**
 * Members data layer — replace mock store with Supabase when `profiles` exists.
 */

import { mockUsers } from "@/lib/mock-data";
import type { AdminMember, CreateMemberInput } from "../types";
import { buildAdminMemberFromInput, mapMockUserToAdminMember } from "../utils";

const MOCK_LATENCY_MS = 200;

let membersStore: AdminMember[] = mockUsers.map(mapMockUserToAdminMember);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchMembers(): Promise<AdminMember[]> {
  await delay(MOCK_LATENCY_MS);
  return [...membersStore].sort((a, b) => b.registrationDate.localeCompare(a.registrationDate));
}

export async function fetchMemberById(id: string): Promise<AdminMember | null> {
  await delay(0);
  return membersStore.find((m) => m.id === id) ?? null;
}

export async function createMember(input: CreateMemberInput): Promise<AdminMember> {
  await delay(MOCK_LATENCY_MS);

  const duplicateUsername = membersStore.some(
    (m) => m.username.toLowerCase() === input.username.toLowerCase(),
  );
  if (duplicateUsername) {
    throw new Error("A member with this username already exists.");
  }

  const duplicateDiscord = membersStore.some(
    (m) => m.discordUsername.toLowerCase() === input.discordUsername.toLowerCase(),
  );
  if (duplicateDiscord) {
    throw new Error("A member with this Discord username already exists.");
  }

  if (input.discordId) {
    const duplicateId = membersStore.some((m) => m.discordId === input.discordId);
    if (duplicateId) {
      throw new Error("This Discord ID is already linked to another member.");
    }
  }

  const member = buildAdminMemberFromInput(input);
  membersStore = [member, ...membersStore];
  return member;
}

export function resetMembersStoreForTesting(): void {
  membersStore = mockUsers.map(mapMockUserToAdminMember);
}
