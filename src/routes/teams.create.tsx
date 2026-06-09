import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — team creation is now a modal on /teams */
export const Route = createFileRoute("/teams/create")({
  beforeLoad: () => {
    throw redirect({ to: "/teams", search: { create: true } });
  },
});
