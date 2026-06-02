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

```
src/
├── assets/          # Images and static files
├── components/
│   ├── admin/       # Admin console components
│   ├── auth/        # Login / register shell
│   ├── site/        # Public-facing site components
│   └── ui/          # Reusable UI primitives (shadcn/ui)
├── hooks/           # Custom React hooks
├── lib/             # Utilities and shared data
├── routes/          # File-based routes (TanStack Router)
│   ├── __root.tsx   # App shell — wraps every page
│   ├── index.tsx    # Public home page (/)
│   ├── login.tsx    # Sign in (/login)
│   ├── register.tsx # Sign up (/register)
│   ├── admin.tsx    # Admin layout (/admin/*)
│   └── ...
└── styles.css       # Global styles + Tailwind theme
```

### Key Pages

| URL                    | Description            |
| ---------------------- | ---------------------- |
| `/`                    | Public landing page    |
| `/login`               | Sign in                |
| `/register`            | Create account         |
| `/admin`               | Admin dashboard        |
| `/admin/tournaments`   | Tournament management  |
| `/admin/teams`         | Team directory         |
| `/admin/users`         | User management        |
| `/admin/participants`  | Registration queue     |
| `/admin/announcements` | Broadcast center       |
| `/admin/settings`      | Console settings       |
| `/unauthorized`        | 403 access denied page |

---

## Tech Stack

- **[React 19](https://react.dev)** — UI library
- **[TanStack Start](https://tanstack.com/start)** — Full-stack React framework with SSR
- **[TanStack Router](https://tanstack.com/router)** — File-based routing
- **[Tailwind CSS v4](https://tailwindcss.com)** — Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com)** — Accessible UI component primitives
- **[Vite 7](https://vite.dev)** — Build tool

---

## Notes

- The admin panel currently uses **mock data** (`src/lib/mock-data.ts`) — no backend or authentication is wired up yet.
- Route files are auto-generated into `src/routeTree.gen.ts` by the TanStack Router plugin. Don't edit that file by hand.
- To add a new page, just create a new `.tsx` file in `src/routes/`. The router picks it up automatically on the next dev server restart.

---

## Current Status

The project is currently frontend-only and uses mock data for development.

### Completed

- ✅ Landing Page
- ✅ Login & Registration UI
- ✅ Admin Dashboard UI

### Next Pages to Build (Priority Order)

1. Tournament Directory
2. Tournament Details Page
3. Team Creation & Management
4. Tournament Registration Flow
5. Bracket Viewer
6. User Dashboard
7. Notifications & Announcements

### Notes

- No backend has been implemented yet.
- No database is connected.
- Authentication is not functional yet.
- All users, teams, tournaments, and registrations currently use mock data.
