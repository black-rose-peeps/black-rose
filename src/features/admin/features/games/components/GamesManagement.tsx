import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminPageHero } from "@/features/admin/components/AdminShell";
import { AdminSection } from "@/features/admin/components/AdminSection";
import { AdminEmptyState } from "@/features/admin/components/AdminEmptyState";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminManagementTable } from "@/features/admin/components/AdminManagementTable";
import { useGamesWithRoles, useDeleteGame } from "../hooks/useGames";
import type { GameWithRoles } from "../types";
import { CreateGameModal, EditGameModal } from "./";
import { GamesTableSkeleton } from "./GamesTableSkeleton";
import { ConfirmDeleteDialog } from "@/features/admin/components/ConfirmDeleteDialog";

export function GamesManagement() {
  const { data: games, isLoading, error, refetch } = useGamesWithRoles();
  const deleteGameMutation = useDeleteGame();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GameWithRoles | null>(null);
  const [deletingGame, setDeletingGame] = useState<GameWithRoles | null>(null);

  const handleDelete = async () => {
    if (!deletingGame) return;
    try {
      await deleteGameMutation.mutateAsync(deletingGame.id);
      setDeletingGame(null);
      refetch();
    } catch (err) {
      console.error("Failed to delete game:", err);
    }
  };

  if (isLoading) {
    return (
      <>
        <AdminPageHero
          eyebrow="Settings"
          title="Games Management"
          description="Configure games available for teams, tournaments, and member profiles"
          actions={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Game
            </Button>
          }
        />
        <AdminSection eyebrow="Games" title="All Games">
          <AdminManagementTable columnWidths={["auto", "auto", "auto", "auto", "auto"]}>
            <GamesTableSkeleton />
          </AdminManagementTable>
        </AdminSection>
      </>
    );
  }

  if (error) {
    return (
      <AdminEmptyState
       eyebrow="Error"
        title="Error loading games"
        description={error instanceof Error ? error.message : "Failed to load games data"}
      />
    );
  }

  if (!games || games.length === 0) {
    return (
      <>
        <AdminPageHero
          eyebrow="Settings"
          title="Games Management"
          description="Configure games available for teams, tournaments, and member profiles"
          actions={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Game
            </Button>
          }
        />
        <AdminEmptyState
          eyebrow="Games"
          title="No games configured"
          description="Add your first game to get started"
          actions={
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Game
            </Button>
          }
        />
        <CreateGameModal open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={refetch} />
      </>
    );
  }

  return (
    <>
      <AdminPageHero
        eyebrow="Settings"
        title="Games Management"
        description="Configure games available for teams, tournaments, and member profiles"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Game
          </Button>
        }
      />

      <AdminSection eyebrow="Games" title="All Games">
        <AdminManagementTable columnWidths={["auto", "auto", "auto", "auto", "auto"]}>
          <TableHeader>
            <TableRow>
              <TableHead>Game</TableHead>
              <TableHead>Identity Group</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((game: GameWithRoles) => (
              <TableRow key={game.id}>
                <TableCell className="font-medium">{game.display_name}</TableCell>
                <TableCell>
                  {game.identity_group ? (
                    <Badge variant="outline">{game.identity_group}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{game.roles?.length || 0} roles</TableCell>
                <TableCell>
                  {game.is_active ? (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingGame(game)}
                    disabled={deleteGameMutation.isPending}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingGame(game)}
                    disabled={deleteGameMutation.isPending}
                    className="text-red-400 hover:text-red-300"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AdminManagementTable>
      </AdminSection>

      <CreateGameModal open={isCreateOpen} onOpenChange={setIsCreateOpen} onSuccess={refetch} />
      <EditGameModal
        game={editingGame}
        open={!!editingGame}
        onOpenChange={(open: boolean) => !open && setEditingGame(null)}
        onSuccess={refetch}
      />
      <ConfirmDeleteDialog
        open={!!deletingGame}
        onClose={() => setDeletingGame(null)}
        onConfirm={handleDelete}
        title="Delete Game"
        description={`Are you sure you want to delete "${deletingGame?.display_name}"? This action cannot be undone.`}
        isDeleting={deleteGameMutation.isPending}
      />
    </>
  );
}
