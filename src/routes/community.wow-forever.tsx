import { createFileRoute } from "@tanstack/react-router";
import { WoWForeverLaunchPage } from "@/features/game-servers/components/WoWForeverLaunchPage";

export const Route = createFileRoute("/community/wow-forever")({
  head: () => ({
    meta: [
      { title: "WoW Forever — Black Rose" },
      {
        name: "description",
        content:
          "Join Black Rose in World of Warcraft: Forever. Launch details, our community announcement and an invitation to play together.",
      },
    ],
  }),
  component: WoWForeverLaunchPage,
});
