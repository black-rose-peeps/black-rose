import { useState, useMemo } from "react";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalFooter,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateGame, useUpdateGame, useGamesWithRoles, useAddGameRole } from "../hooks/useGames";
import type { GameFormData } from "../types";
import { COLOR_CLASS_OPTIONS, ACCENT_CLASS_OPTIONS, IDENTITY_GROUP_OPTIONS } from "../constants";
import {
  GAME_HEADER_ACCEPT,
  GAME_HEADER_MAX_BYTES,
  validateGameHeaderImage,
  uploadGameHeaderImage,
} from "../services/game-header-image.service";

interface CreateGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateGameModal({ open, onOpenChange, onSuccess }: CreateGameModalProps) {
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const addRole = useAddGameRole();
  const { data: existingGames } = useGamesWithRoles();
  const [newRoleName, setNewRoleName] = useState("");
  const [tempRoles, setTempRoles] = useState<string[]>([]);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [headerImageError, setHeaderImageError] = useState<string | null>(null);
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null);

  // Filter out colors already used by other games
  const availableColors = useMemo(() => {
    const usedColors = new Set(existingGames?.map((g) => g.color_class) || []);
    return COLOR_CLASS_OPTIONS.filter((c) => !usedColors.has(c.value));
  }, [existingGames]);

  const availableAccents = useMemo(() => {
    const usedAccents = new Set(existingGames?.map((g) => g.accent_class) || []);
    return ACCENT_CLASS_OPTIONS.filter((a) => !usedAccents.has(a.value));
  }, [existingGames]);
  const [formData, setFormData] = useState<GameFormData>({
    name: "",
    slug: "",
    display_name: "",
    identity_group: "",
    identity_field_label: "",
    identity_field_placeholder: "",
    identity_helper_text: "",
    color_class: "text-muted-foreground",
    accent_class: "from-white/10 via-white/5 to-transparent",
    tournament_header_image: "",
    is_active: true,
    sort_order: "0",
  });

  // Handle header image file selection
  const handleHeaderImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setHeaderImageFile(null);
      setHeaderImagePreview(null);
      setHeaderImageError(null);
      return;
    }

    const error = validateGameHeaderImage(file);
    if (error) {
      setHeaderImageError(error);
      setHeaderImageFile(null);
      setHeaderImagePreview(null);
      return;
    }

    setHeaderImageError(null);
    setHeaderImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setHeaderImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleHeaderImageRemove = () => {
    setHeaderImageFile(null);
    setHeaderImagePreview(null);
    setHeaderImageError(null);
  };

  // Auto-generate slug and display name from name
  const handleNameChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setFormData({ ...formData, name: value, slug, display_name: value });
  };

  const handleAddTempRole = () => {
    if (!newRoleName.trim()) return;
    setTempRoles([...tempRoles, newRoleName.trim()]);
    setNewRoleName("");
  };

  const handleRemoveTempRole = (index: number) => {
    setTempRoles(tempRoles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createGame.mutateAsync({
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        display_name: formData.display_name || formData.name,
        identity_group: formData.identity_group === "none" ? null : formData.identity_group || null,
        identity_field_label: formData.identity_field_label || null,
        identity_field_placeholder: formData.identity_field_placeholder || null,
        identity_helper_text: formData.identity_helper_text || null,
        color_class: formData.color_class,
        accent_class: formData.accent_class,
        tournament_header_image: null,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
      });

      // Upload header image if provided
      if (result && headerImageFile) {
        const imageUrl = await uploadGameHeaderImage(result.id, headerImageFile);
        // Update game with image URL
        await updateGame.mutateAsync({ id: result.id, input: { tournament_header_image: imageUrl } });
      }

      // Add roles after game is created
      if (result && tempRoles.length > 0) {
        for (const roleName of tempRoles) {
          await addRole.mutateAsync({ gameId: result.id, roleName });
        }
      }

      onSuccess();
      onOpenChange(false);
      setFormData({
        name: "",
        slug: "",
        display_name: "",
        identity_group: "",
        identity_field_label: "",
        identity_field_placeholder: "",
        identity_helper_text: "",
        color_class: "text-muted-foreground",
        accent_class: "from-white/10 via-white/5 to-transparent",
        tournament_header_image: "",
        is_active: true,
        sort_order: "0",
      });
      setTempRoles([]);
      setNewRoleName("");
      setHeaderImageFile(null);
      setHeaderImagePreview(null);
      setHeaderImageError(null);
    } catch (err) {
      console.error("Failed to create game:", err);
    }
  };

  return (
    <AdaptiveModal open={open} onOpenChange={onOpenChange}>
      <AdaptiveModalContent className="max-w-2xl">
        <AdaptiveModalHeader>
          <AdaptiveModalTitle>Add New Game</AdaptiveModalTitle>
          <AdaptiveModalDescription>
            Configure a new game for teams, tournaments, and member profiles
          </AdaptiveModalDescription>
        </AdaptiveModalHeader>

        <form onSubmit={handleSubmit}>
          <AdaptiveModalBody>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="identity">Identity</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Game Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Valorant"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Slug and display name will be auto-generated from this name
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Color Class</Label>
                    <Select
                      value={formData.color_class}
                      onValueChange={(value) => setFormData({ ...formData, color_class: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                    {availableColors.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <span className={color.preview}>{color.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Accent Class</Label>
                <Select
                  value={formData.accent_class}
                  onValueChange={(value) => setFormData({ ...formData, accent_class: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select accent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccents.map((accent) => (
                      <SelectItem key={accent.value} value={accent.value}>
                        {accent.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first in lists
                </p>
              </div>
              <div className="flex flex-col space-y-2 pt-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only active games appear in dropdowns
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tournament Header Image</Label>
              <div className="space-y-3">
                {headerImagePreview ? (
                  <div className="relative group">
                    <img
                      src={headerImagePreview}
                      alt="Header preview"
                      className="w-full h-32 object-cover rounded-md border border-border"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleHeaderImageRemove}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-md hover:border-primary/50 transition-colors">
                    <label htmlFor="header-image-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload image</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG, WebP (max {Math.round(GAME_HEADER_MAX_BYTES / (1024 * 1024))}MB)
                      </p>
                    </label>
                    <input
                      id="header-image-upload"
                      type="file"
                      accept={GAME_HEADER_ACCEPT}
                      onChange={handleHeaderImageChange}
                      className="hidden"
                    />
                  </div>
                )}
                {headerImageError && (
                  <p className="text-xs text-destructive">{headerImageError}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Roles ({tempRoles.length})</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Add new role..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTempRole();
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={handleAddTempRole}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {tempRoles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tempRoles.map((role, index) => (
                    <div
                      key={index}
                      className="group flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <span>{role}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                        onClick={() => handleRemoveTempRole(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </TabsContent>
              <TabsContent value="identity" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Identity Group</Label>
                  <Select
                    value={formData.identity_group}
                    onValueChange={(value) => setFormData({ ...formData, identity_group: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select identity group" />
                    </SelectTrigger>
                    <SelectContent>
                      {IDENTITY_GROUP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Games in the same group share identity fields (e.g., Riot games share one Riot ID)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Identity Field Label</Label>
                  <Input
                    value={formData.identity_field_label}
                    onChange={(e) => setFormData({ ...formData, identity_field_label: e.target.value })}
                    placeholder="Riot ID / Character Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Identity Field Placeholder</Label>
                  <Input
                    value={formData.identity_field_placeholder}
                    onChange={(e) => setFormData({ ...formData, identity_field_placeholder: e.target.value })}
                    placeholder="PlayerName#TAG"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Identity Helper Text</Label>
                  <Textarea
                    value={formData.identity_helper_text}
                    onChange={(e) => setFormData({ ...formData, identity_helper_text: e.target.value })}
                    placeholder="Used on team rosters and tournament brackets"
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </AdaptiveModalBody>

          <AdaptiveModalFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createGame.isPending}>
              {createGame.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Game
            </Button>
          </AdaptiveModalFooter>
        </form>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
