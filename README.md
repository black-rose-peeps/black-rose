# Black Rose Arena

A community esports tournament platform for creating, managing, and competing in organized events. Built with React, TanStack Start, and Tailwind CSS.

---

## Prerequisites

Before you start, make sure you have these installed:

- **Node.js** `22.12+` — check with `node -v`
  - If you're on an older version, upgrade via [nvm](https://github.com/coreybutler/nvm-windows) (Windows) or [nvm](https://github.com/nvm-sh/nvm) (Mac/Linux):
    ```bash
    nvm install 22
    nvm use 22
    ```
- **npm** `10+` — comes with Node, check with `npm -v`
- **Git** — to clone the repo

---

## Getting Started

**1. Clone the repo**

```bash
git clone https://github.com/your-org/blackrose-arena.git
cd blackrose-arena
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the dev server**

```bash
npm run dev
```

The app will be running at **http://localhost:5173**

---

## Available Scripts

| Command           | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start development server             |
| `npm run build`   | Build for production                 |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |
| `npm run format`  | Run Prettier on all files            |

---

## Project Structure

```text
src/
├── assets/                        # Images (logo, banners, etc.)
│
├── features/                      # ← Main source of truth for all features
│   ├── landing/                   # Public home page (/)
│   │   └── components/
│   │       ├── Header.tsx
│   │       ├── Hero.tsx
│   │       ├── FeaturedTournaments.tsx
│   │       ├── WhyBlackRose.tsx
│   │       ├── HallOfChampions.tsx
│   │       ├── CtaBand.tsx
│   │       ├── Footer.tsx
│   │       └── SectionHeading.tsx
│   │
│   ├── auth/                      # Login and Register pages
│   │   ├── components/
│   │   │   └── AuthShell.tsx      # Shared auth page layout shell
│   │   ├── services/
│   │   │   └── discord.ts         # Discord OAuth2 placeholder (wire up when backend is ready)
│   │   ├── store/
│   │   │   └── session.ts         # Client-side session store (placeholder until real auth)
│   │   └── types/
│   │       └── index.ts           # UserRole, AppUser types
│   │
│   ├── admin/                     # Admin console (/admin/*)
│   │   └── components/
│   │       ├── AdminSidebar.tsx
│   │       ├── AdminTopbar.tsx
│   │       └── ui.tsx             # Admin-specific UI primitives
│   │
│   └── shared/                    # Components reused across 2+ features
│       └── components/
│           └── Emblem.tsx
│
├── components/
│   └── ui/                        # shadcn/ui base primitives (do not edit manually)
│
├── hooks/                         # Custom React hooks
│
├── lib/
│   ├── mock-data.ts               # Placeholder data for admin panel
│   └── utils.ts                   # Utility functions (cn, etc.)
│
├── routes/                        # File-based routing (TanStack Router)
│   ├── __root.tsx                 # Root layout — wraps every page
│   ├── index.tsx                  # Home page (/)
│   ├── login.tsx                  # Sign in (/login)
│   ├── register.tsx               # Create account (/register)
│   ├── unauthorized.tsx           # 403 page (/unauthorized)
│   ├── admin.tsx                  # Admin layout wrapper
│   ├── admin.index.tsx            # Admin dashboard (/admin)
│   └── admin.*.tsx                # Other admin sections
│
├── routeTree.gen.ts               # AUTO-GENERATED — never edit by hand
├── router.tsx                     # Router instance setup
├── server.ts                      # SSR server entry
├── start.ts                       # TanStack Start entry
└── styles.css                     # Global styles + Tailwind theme
```

### How features are organized

Each folder inside `src/features/` represents one page group or feature. Inside a feature you can add these subfolders as needed:

```text
features/
└── your-feature/
    ├── components/   ← UI pieces specific to this feature
    ├── hooks/        ← React hooks used only here
    ├── types/        ← TypeScript interfaces and types
    ├── constants/    ← Static values, enums, config
    ├── services/     ← API calls or data-fetching logic
    └── utils/        ← Helper functions specific to this feature
```

Only create the subfolders you actually need. Don't create empty ones.

`features/shared/` is for anything genuinely used by two or more features (like `Emblem`).

Route files in `routes/` stay thin — they import from `features/` and compose the page.

### Key Pages

| URL                      | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `/`                      | Public landing page                                 |
| `/tournaments`           | Tournament directory with game & status filters     |
| `/tournaments/:id`       | Tournament detail — overview, teams, bracket, rules |
| `/login`                 | Sign in with Discord                                |
| `/register`              | Create account with Discord → redirects to waitlist |
| `/waitlist`              | Pending verification — shown after registering      |
| `/unauthorized`          | 403 access denied page                              |
| `/admin`                 | Admin dashboard                                     |
| `/admin/tournaments`     | Tournament management                               |
| `/admin/tournaments/:id` | Tournament detail (admin view)                      |
| `/admin/teams`           | Team directory                                      |
| `/admin/users`           | User management                                     |
| `/admin/participants`    | Registration queue                                  |
| `/admin/announcements`   | Broadcast center                                    |
| `/admin/settings`        | Console settings                                    |

---

## Tech Stack

- **[React 19](https://react.dev)** — UI library
- **[TanStack Start](https://tanstack.com/start)** — Full-stack React framework with SSR
- **[TanStack Router](https://tanstack.com/router)** — File-based routing
- **[Tailwind CSS v4](https://tailwindcss.com)** — Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com)** — Accessible UI component primitives
- **[Vite 7](https://vite.dev)** — Build tool

---

## Notes for Contributors

- **Don't edit `routeTree.gen.ts`** — it's auto-generated by TanStack Router every time you save a route file. Any manual edits will be overwritten.
- To add a new page, create a `.tsx` file in `src/routes/`. The router picks it up on the next dev server restart.
- The `@/` import alias maps to `src/`. For example, `@/features/landing/components/Hero` → `src/features/landing/components/Hero.tsx`.
- When adding a new shadcn/ui component, run `npx shadcn@latest add <component>` — it drops into `src/components/ui/` automatically. Don't move it.
- The admin panel uses mock data from `src/lib/mock-data.ts`. No real backend or auth is connected yet.
- Authentication uses Discord OAuth2. The placeholder service is at `src/features/auth/services/discord.ts`. To wire it up: create a Discord app at https://discord.com/developers/applications, set `VITE_DISCORD_CLIENT_ID` and `VITE_DISCORD_REDIRECT_URI` in a `.env` file, then implement the `exchangeCodeForToken` and `getDiscordUser` functions in a server function.
- User roles are defined in `src/features/auth/types/index.ts`. New registrations get `not_verified` and land on `/waitlist`. An admin manually sets the role to `verified` to grant full access.
- The session store at `src/features/auth/store/session.ts` is a `sessionStorage` placeholder. Replace it with real session management (JWT cookie, server-side session, etc.) when the backend is ready.

---

## Current Status

The project is currently frontend-only and uses mock data for development.

### Completed

- ✅ Landing Page
- ✅ Login — Discord OAuth2 UI (placeholder, backend not wired)
- ✅ Registration — Discord OAuth2 UI → redirects to waitlist
- ✅ Waitlist page — shown to `not_verified` users after registering
- ✅ Tournament Directory — frontend with mock data
- ✅ Tournament Details Page — frontend with mock data (overview, teams, bracket, rules)
- ✅ Admin Dashboard UI — frontend with mock data

### Next Up

1. Discord OAuth2 backend integration (callback route, token exchange, session)
2. Admin: user verification flow (change role `not_verified` → `verified`)
3. User Dashboard / Profile page (shown after verification)
4. Team Creation & Management
5. Tournament Registration Flow
6. Notifications & Announcements

### Notes

- No backend has been implemented yet.
- No database is connected.
- Authentication is not functional yet. Registration simulates a session in `sessionStorage` and redirects to `/waitlist`.
- All users, teams, tournaments, and registrations currently use mock data.
