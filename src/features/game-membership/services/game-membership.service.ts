import {
  fetchMyGameWorkspace as fetchWorkspaceFn,
  saveMyGameProfile as saveProfileFn,
  changeMyGameMembership as changeMembershipFn,
  changeMyMainGame as changeMainGameFn,
  fetchGameRoster as fetchRosterFn,
  changeGameMembershipAsAdmin as changeAsAdminFn,
} from "../functions/game-membership.functions";
import type {
  GameRosterInput,
  SaveGameProfileInput,
  GameMembershipStatus,
  MemberMembershipAction,
} from "../types";

export function fetchMyGameWorkspace() {
  return fetchWorkspaceFn();
}
export function saveMyGameProfile(input: SaveGameProfileInput) {
  return saveProfileFn({ data: input });
}
export function changeMyMainGame(input: { gameId: string | null }): Promise<void> {
  return changeMainGameFn({ data: input });
}
export function changeMyGameMembership(input: { gameId: string; action: MemberMembershipAction }) {
  return changeMembershipFn({ data: input });
}
export function fetchGameRoster(input: GameRosterInput) {
  return fetchRosterFn({ data: input });
}
export function changeGameMembershipAsAdmin(input: {
  memberId: string;
  gameId: string;
  status: GameMembershipStatus;
  reason?: string;
}) {
  return changeAsAdminFn({ data: input });
}
