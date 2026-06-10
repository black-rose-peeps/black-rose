import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy route — Discord OAuth handles sign-up and sign-in in one flow. */
export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
  head: () => ({
    meta: [{ title: "Join — Black Rose" }],
  }),
  component: () => null,
});
