# Patch notes

## Game profiles & memberships — unreleased

### New

- **My Games:** save your in-game identity, role and character details for each game.
- **Independent Main Game:** choose your preferred game without changing your other profiles or memberships.
- **Game memberships:** apply to a game community and track your status. Admins can review applications and manage each game's roster.
- **Acceptance notifications:** receive an in-app notification when your game application is accepted.
- **Public game affiliations:** show accepted memberships on profiles that allow public viewing. Profile links now use `/br/{slug}`; old links still redirect.
- **WoW Forever launch page:** view the Facebook announcement, a simple countdown and joining details. The overlay returns to Community after launch.

### Improved

- Clearer **Overview → My Games → Teams** dashboard navigation.
- Smoother profile editing, scroll behavior and unsaved-change protection.
- Game membership status refreshes without discarding profile drafts.
- Subtle expand/collapse for longer identity lists and more consistent card sizing.
- Searchable admin filters, member details and CSV exports.
- Inactive games stay out of current selections without deleting saved data or team/tournament history.
- Shared data reads reduce duplicate requests across dashboards, teams, tournaments and notifications.
- Game administration and profile/membership changes use server-verified sessions.

### Before production

Apply the database changes and configure production settings using [the SQL rollout guide](main-production-sql-rollout.md). Do not copy Dev data into Prod. Automatic Discord-based game acceptance is **not included** in this update.
