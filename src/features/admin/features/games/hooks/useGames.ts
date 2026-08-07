import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGames,
  getActiveGames,
  getGameById,
  getGameBySlug,
  getGamesWithRoles,
  createGame,
  updateGame,
  deleteGame,
  addGameRole,
  removeGameRole,
  getGameRoles,
  type Game,
  type GameWithRoles,
  type CreateGameInput,
  type UpdateGameInput,
} from "../services/games.service";

export const GAMES_QUERY_KEY = ["games"] as const;
export const ACTIVE_GAMES_QUERY_KEY = ["games", "active"] as const;
export const GAME_QUERY_KEY = (id: string) => ["games", id] as const;
export const GAME_SLUG_QUERY_KEY = (slug: string) => ["games", "slug", slug] as const;
export const GAMES_WITH_ROLES_QUERY_KEY = ["games", "with-roles"] as const;
export const GAME_ROLES_QUERY_KEY = (gameId: string) => ["games", gameId, "roles"] as const;

export function useGames() {
  return useQuery({
    queryKey: GAMES_QUERY_KEY,
    queryFn: getGames,
    staleTime: 30 * 60 * 1000, // 30 minutes - cache with long TTL
  });
}

export function useActiveGames() {
  return useQuery({
    queryKey: ACTIVE_GAMES_QUERY_KEY,
    queryFn: getActiveGames,
    staleTime: 30 * 60 * 1000, // 30 minutes - cache with long TTL
  });
}

export function useGameById(id: string) {
  return useQuery({
    queryKey: GAME_QUERY_KEY(id),
    queryFn: () => getGameById(id),
    enabled: !!id,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useGameBySlug(slug: string) {
  return useQuery({
    queryKey: GAME_SLUG_QUERY_KEY(slug),
    queryFn: () => getGameBySlug(slug),
    enabled: !!slug,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useGamesWithRoles() {
  return useQuery({
    queryKey: GAMES_WITH_ROLES_QUERY_KEY,
    queryFn: getGamesWithRoles,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useGameRoles(gameId: string) {
  return useQuery({
    queryKey: GAME_ROLES_QUERY_KEY(gameId),
    queryFn: () => getGameRoles(gameId),
    enabled: !!gameId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGameInput) => createGame(input),
    onSuccess: () => {
      // Invalidate all games queries on create
      queryClient.invalidateQueries({ queryKey: GAMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_GAMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: GAMES_WITH_ROLES_QUERY_KEY });
    },
  });
}

export function useUpdateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGameInput }) =>
      updateGame(id, input),
    onSuccess: (_, { id }) => {
      // Invalidate specific game and all games queries on update
      queryClient.invalidateQueries({ queryKey: GAMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_GAMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: GAME_QUERY_KEY(id) });
      queryClient.invalidateQueries({ queryKey: GAMES_WITH_ROLES_QUERY_KEY });
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteGame(id),
    onSuccess: () => {
      // Invalidate all games queries on delete
      queryClient.invalidateQueries({ queryKey: GAMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_GAMES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: GAMES_WITH_ROLES_QUERY_KEY });
    },
  });
}

export function useAddGameRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, roleName }: { gameId: string; roleName: string }) =>
      addGameRole(gameId, roleName),
    onSuccess: (_, { gameId }) => {
      // Invalidate game roles and games with roles queries
      queryClient.invalidateQueries({ queryKey: GAME_ROLES_QUERY_KEY(gameId) });
      queryClient.invalidateQueries({ queryKey: GAMES_WITH_ROLES_QUERY_KEY });
    },
  });
}

export function useRemoveGameRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gameId, roleId }: { gameId: string; roleId: string }) =>
      removeGameRole(roleId),
    onSuccess: (_, { gameId }) => {
      // Invalidate game roles and games with roles queries
      queryClient.invalidateQueries({ queryKey: GAME_ROLES_QUERY_KEY(gameId) });
      queryClient.invalidateQueries({ queryKey: GAMES_WITH_ROLES_QUERY_KEY });
    },
  });
}
