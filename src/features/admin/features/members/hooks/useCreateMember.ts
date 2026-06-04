import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AdminMember, CreateMemberInput } from "../types";
import { rowToAdminMember } from "../utils";

export function useCreateMember() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetError = useCallback(() => setError(null), []);

  const submit = useCallback(async (input: CreateMemberInput): Promise<AdminMember> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: sbError } = await supabase
        .from("members")
        .insert({
          username: input.username,
          discord_username: input.discordUsername,
          discord_id: input.discordId ?? null,
          role: input.role,
        })
        .select()
        .single();

      if (sbError) {
        // Handle unique constraint violations gracefully
        if (sbError.code === "23505") {
          if (sbError.message.includes("username")) {
            throw new Error("That username is already registered.");
          }
          if (sbError.message.includes("discord_username")) {
            throw new Error("That Discord username is already registered.");
          }
          if (sbError.message.includes("discord_id")) {
            throw new Error("That Discord ID is already linked to another member.");
          }
        }
        throw new Error(sbError.message);
      }

      return rowToAdminMember(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submit, isSubmitting, error, resetError };
}
