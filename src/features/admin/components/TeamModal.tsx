import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { MockTeam } from "@/lib/mock-data";

interface TeamModalProps {
  team: MockTeam;
  onClose: () => void;
}

export function TeamModal({ team, onClose }: TeamModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        tabIndex={-1}
        className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-2xl outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2
              id="team-modal-title"
              className="text-xl font-display font-bold tracking-wider-2"
            >
              {team.name}
            </h2>
            <p className="text-sm-readable text-muted-foreground">Team Details</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Team Info */}
            <div>
              <h3 className="mb-3 text-lg font-display font-semibold">Team Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Tag:</span>
                  <span className="ml-2 text-sm">{team.tag}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Captain:</span>
                  <span className="ml-2 text-sm">{team.captain}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Registered:</span>
                  <span className="ml-2 text-sm">{team.registrationDate}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <span className="ml-2 text-sm">{team.status}</span>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div>
              <h3 className="mb-3 text-lg font-display font-semibold">Team Members</h3>
              <div className="space-y-2">
                {team.members.map((member, index) => (
                  <div key={index} className="rounded border border-border bg-muted/20 p-2">
                    <div className="font-medium">{member.ign}</div>
                    <div className="text-sm text-muted-foreground">{member.role}</div>
                    <div className="text-xs text-muted-foreground">{member.discord}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tournament History */}
          <div className="mt-6">
            <h3 className="mb-3 text-lg font-display font-semibold">Tournament History</h3>
            <div className="space-y-1">
              {team.history.map((achievement, index) => (
                <div key={index} className="text-sm text-muted-foreground">
                  • {achievement}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border bg-secondary px-4 py-2 text-sm font-medium transition hover:bg-secondary/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
