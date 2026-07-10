import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { setAppQueryClient } from "@/lib/app-query";

import appCss from "../styles.css?url";
import favicon from "@/assets/black-rose-emblem-black.png";
import { CapacitorOAuthBridge } from "@/features/auth/components/CapacitorOAuthBridge";
import { NotFoundPage } from "@/features/shared/components/NotFoundPage";
import { ErrorPage } from "@/features/shared/components/ErrorPage";
import { MaintenancePage } from "@/features/shared/components/MaintenancePage";
import { DEFAULT_OG_TITLE, defaultOgMeta } from "@/lib/site-meta";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "author", content: "Black Rose Esports" },
      ...defaultOgMeta({ title: DEFAULT_OG_TITLE }),
    ],
    links: [
      {
        rel: "icon",
        type: "image/png",
        href: favicon,
      },
      {
        rel: "apple-touch-icon",
        href: "/og-hero.png",
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Rajdhani:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const maintenanceMode = import.meta.env.VITE_MAINTENANCE_MODE === "true";

  useEffect(() => {
    setAppQueryClient(queryClient);
  }, [queryClient]);

  if (maintenanceMode) {
    return <MaintenancePage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CapacitorOAuthBridge />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
