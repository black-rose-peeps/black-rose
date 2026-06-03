import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    // tsconfigPaths must come first so path aliases resolve for all other plugins
    tsconfigPaths(),
    tailwindcss(),
    // tanstackStart includes the TanStack Router plugin internally —
    // do NOT add TanStackRouterVite separately or transforms will run twice.
    tanstackStart({
      server: { entry: "server" },
    }),
    // @vitejs/plugin-react is required by tanstackStart for React Refresh
    react(),
  ],
});
