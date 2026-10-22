# Patch notes

## Discord game membership — local/Dev, not activated in production

- Save a valid IGN and apply: members already holding the matching Discord game role can be accepted immediately.
- Later role changes can update Discord-managed memberships without replacing character details or Main Game.
- Manual admin decisions, Leave/Withdraw and existing acceptance history are respected; failed Discord checks do not revoke memberships.
- Requires the additional SQL and explicit activation in [the Discord rollout guide](discord-game-membership-automation.md).

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

Apply the foundation database changes using [the SQL rollout guide](main-production-sql-rollout.md). Do not copy Dev data into Prod. The optional Discord integration above has a separate additional migration and deployment gate; merging website code does not activate it.
