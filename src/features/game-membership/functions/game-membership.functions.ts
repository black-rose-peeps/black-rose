import { createServerFn } from "@tanstack/react-start";
import {
  parseAdminMembershipInput,
  parseGameRosterInput,
  parseMemberAction,
  parseSaveGameProfileInput,
} from "../rules";
import type {
  GameRosterInput,
  GameMembershipStatus,
  SaveGameProfileInput,
  MemberMembershipAction,
} from "../types";

export const fetchMyGameWorkspace = createServerFn({ method: "POST" }).handler(async () => {
  const service = await import("../server/game-membership.server");
  return service.fetchMyGameWorkspace();
});
export const saveMyGameProfile = createServerFn({ method: "POST" })
  .validator((input: SaveGameProfileInput) => parseSaveGameProfileInput(input))
  .handler(async ({ data }) => {
    const service = await import("../server/game-membership.server");
    return service.saveMyGameProfile(data);
  });
export const changeMyMainGame = createServerFn({ method: "POST" })
  // Runtime shape/UUID validation stays in the server, including for direct callers.
  .validator((input: { gameId: string | null }) => input)
  .handler(async ({ data }): Promise<void> => {
    const service = await import("../server/game-membership.server");
    await service.changeMyMainGame(data);
  });
export const changeMyGameMembership = createServerFn({ method: "POST" })
  .validator((input: { gameId: string; action: MemberMembershipAction }) =>
    parseMemberAction(input),
  )
  .handler(async ({ data }) => {
    const service = await import("../server/game-membership.server");
    return service.changeMyGameMembership(data);
  });
export const fetchGameRoster = createServerFn({ method: "POST" })
  .validator((input: GameRosterInput) => parseGameRosterInput(input))
  .handler(async ({ data }) => {
    const service = await import("../server/game-membership.server");
    return service.fetchGameRoster(data);
  });
export const changeGameMembershipAsAdmin = createServerFn({ method: "POST" })
  .validator(
    (input: { memberId: string; gameId: string; status: GameMembershipStatus; reason?: string }) =>
      parseAdminMembershipInput(input),
  )
  .handler(async ({ data }) => {
    const service = await import("../server/game-membership.server");
    return service.changeGameMembershipAsAdmin(data);
  });
