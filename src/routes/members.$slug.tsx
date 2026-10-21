import { createFileRoute, redirect } from "@tanstack/react-router";

/** Preserve previously shared links without changing any stored profile slug. */
export const Route = createFileRoute("/members/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/br/$slug",
      params: { slug: params.slug },
      replace: true,
      statusCode: 301,
    });
  },
});
