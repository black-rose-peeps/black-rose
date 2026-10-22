import { createServerFn } from "@tanstack/react-start";
import type { CreateGameInput, UpdateGameInput } from "../services/games.service";

export const createGameRequest = createServerFn({ method: "POST" })
  .validator((input: CreateGameInput) => input)
  .handler(async ({ data }) => {
    const service = await import("../server/games.server");
    return service.createGame(data);
  });
export const updateGameRequest = createServerFn({ method: "POST" })
  .validator((input: { id: string; input: UpdateGameInput }) => input)
  .handler(async ({ data }) => {
    const service = await import("../server/games.server");
    return service.updateGame(data.id, data.input);
  });
export const deleteGameRequest = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const service = await import("../server/games.server");
    return service.deleteGame(data.id);
  });
export const addGameRoleRequest = createServerFn({ method: "POST" })
  .validator((input: { gameId: string; roleName: string }) => input)
  .handler(async ({ data }) => {
    const service = await import("../server/games.server");
    return service.addGameRole(data.gameId, data.roleName);
  });
export const removeGameRoleRequest = createServerFn({ method: "POST" })
  .validator((input: { roleId: string }) => input)
  .handler(async ({ data }) => {
    const service = await import("../server/games.server");
    return service.removeGameRole(data.roleId);
  });
