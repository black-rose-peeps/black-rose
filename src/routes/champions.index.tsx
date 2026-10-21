import { createFileRoute, redirect } from "@tanstack/react-router";

/** Preserve bookmarks while making the tournament hub canonical. */
export const Route = createFileRoute("/champions/")({
  beforeLoad: () => {
    throw redirect({ to: "/tournaments", search: { view: "champions" }, replace: true });
  },
});
