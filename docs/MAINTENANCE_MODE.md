# Maintenance mode

Black Rose Arena can replace every application route with a maintenance page by setting:

```env
VITE_MAINTENANCE_MODE=true
```

The flag is evaluated at build time. In Vercel, add or update it under **Project → Settings → Environment Variables**, apply it to **Production**, and redeploy the production branch.

## Enable maintenance mode

1. Set `VITE_MAINTENANCE_MODE=true` for the Vercel Production environment.
2. Redeploy the current production deployment.
3. Verify `blackrose.asia`, `www.blackrose.asia`, and `admin.blackrose.asia` display the maintenance page.
4. Stop external writers such as the Discord sync Worker before taking a database backup.

## Disable maintenance mode

1. Set `VITE_MAINTENANCE_MODE=false` or remove the variable.
2. Confirm the production Supabase environment variables point to the intended project.
3. Redeploy Production.
4. Verify login, member, team, tournament, admin, and Realtime flows before re-enabling background workers.

Maintenance mode prevents normal site navigation and does not mount the Discord OAuth bridge. It is not a database-level write lock: already-open browser sessions, direct Supabase clients, workers, bots, and administrative tools must be stopped or blocked separately during a migration.
