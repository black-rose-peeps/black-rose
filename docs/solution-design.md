# Black Rose Web Application — Solution Design

## 1. Overview

Black Rose Web Application is a community esports platform for the Black Rose gaming organization. The application will use Discord as the central identity and membership source. Members will log in using Discord OAuth2, and only users who are verified members of the Black Rose Discord server with the `ROSE` role will receive full access.

The initial version will focus on:

1. Discord-centered user registration and login
2. Role-based access control using the Black Rose Discord `ROSE` role
3. Member profile pages for social media features
4. Tournament registration and bracketing, initially for Valorant
5. Admin tools for managing users, teams, tournaments, registrations, and brackets
6. Riot account linking for Valorant profile/stat verification, subject to Riot API and RSO approval requirements

Repository: `black-rose-peeps/black-rose`
Discord Invite: `https://discord.com/invite/Epe4aDdt8N`

---

## 2. Current Repository Baseline

The existing repo already provides a strong frontend foundation:

- App name: `blackrose-arena`
- Frontend stack:
  - React
  - TanStack Start
  - TanStack Router
  - Tailwind CSS
  - shadcn/Radix UI-style component primitives
  - Vite

- Current pages already present:
  - Public landing page
  - Login page
  - Register page
  - Unauthorized page
  - Tournament directory
  - Tournament detail page
  - Admin dashboard
  - Admin tournament management
  - Admin tournament detail view

- Current limitations:
  - No real backend yet
  - No database connected yet
  - Authentication is not functional yet
  - All users, teams, tournaments, brackets, and registrations are currently mock data

The solution should reuse the current UI direction: black/white esports branding, Black Rose emblem, dark grid background, angular CTA buttons, tournament cards, admin panels, and existing tournament/admin layout patterns.

---

## 3. Goals

### Primary Goals

- Allow users to sign in using Discord OAuth2.
- Verify if the logged-in user belongs to the Black Rose Discord server.
- Verify if the logged-in user has the `ROSE` Discord role.
- Grant full member access only to verified users.
- Redirect non-verified users to a waitlist or verification page.
- Allow verified members to create and maintain public profile pages.
- Allow verified members to register for Valorant tournaments.
- Allow admins to create tournaments, approve registrations, seed teams, manage brackets, and publish results.
- Allow users to link Riot accounts for Valorant stats and account verification.

### Non-Goals for MVP

- Full multi-game tournament automation beyond Valorant.
- Real-time match lobby creation.
- Automatic in-game result submission.
- Payments, entry fees, or prize payout automation.
- Public ranking/ELO system.
- Scouting tools that show opponent stats before a match.

---

## 4. User Roles

### Guest

A visitor who is not logged in.

Allowed access:

- Landing page
- Public tournament listing
- Public tournament details
- Login/Register page
- Discord invite link

Restricted from:

- Member profiles dashboard
- Tournament registration
- Riot linking
- Admin pages

---

### Waitlisted User

A user who logged in with Discord but either:

- Has not joined the Black Rose Discord server, or
- Joined the server but does not have the `ROSE` role yet

Allowed access:

- Waitlist / verification page
- Discord invite link
- Re-check verification button
- Logout

Restricted from:

- Full member dashboard
- Profile editing
- Tournament registration
- Admin pages

---

### Verified Member

A Discord-authenticated user who belongs to the Black Rose Discord server and has the `ROSE` role.

Allowed access:

- Member dashboard
- Member profile page
- Social link management
- Riot account linking
- Tournament registration
- Team creation/joining
- Tournament bracket viewing

---

### Tournament Admin

An internal Black Rose admin who can manage tournaments.

Allowed access:

- Admin dashboard
- Tournament creation/editing
- Team and participant approval
- Bracket generation
- Match result updates
- Announcement publishing

---

### Super Admin

A full application administrator.

Allowed access:

- All Tournament Admin features
- User role management
- App settings
- Discord role mapping settings
- Audit logs
- Admin assignment

---

## 5. High-Level Architecture

```text
[ User Browser ]
      |
      v
[ TanStack Start / React Frontend ]
      |
      v
[ Server/API Layer ]
      |
      +--> [ Discord OAuth2 API ]
      |
      +--> [ Discord Guild Member Role Check ]
      |
      +--> [ Riot API / Riot Sign On ]
      |
      +--> [ PostgreSQL Database ]
      |
      +--> [ Object Storage for Profile Media, optional ]
```

### Recommended MVP Architecture

Use TanStack Start as the full-stack application layer first. This avoids introducing a separate backend too early and fits the current repo direction.

Suggested setup:

- Frontend and server routes: TanStack Start
- Database: PostgreSQL
- ORM: Prisma or Drizzle
- Auth/session: secure HTTP-only cookie session
- File uploads: S3-compatible storage or Cloudinary, optional for MVP
- Hosting: Node-capable deployment platform
- Background jobs: simple scheduled job runner or hosted cron later

---

## 6. Authentication and Verification Design

### 6.1 Discord Login Flow

```text
User clicks "Continue with Discord"
      |
      v
Redirect to Discord OAuth2 authorization URL
      |
      v
User authorizes app
      |
      v
Discord redirects to /api/auth/discord/callback?code=...&state=...
      |
      v
Backend validates state
      |
      v
Backend exchanges code for access token
      |
      v
Backend fetches Discord user profile
      |
      v
Backend fetches user’s Black Rose guild member record
      |
      v
Check if roles[] contains DISCORD_ROSE_ROLE_ID
      |
      +--> Has ROSE role: create/update user, create session, redirect to /dashboard
      |
      +--> Missing ROSE role: create/update waitlisted user, redirect to /waitlist
```

### 6.2 Discord OAuth Scopes

Minimum recommended Discord scopes:

```text
identify
guilds.members.read
```

Optional:

```text
email
guilds
```

The `guilds.members.read` scope allows the app to retrieve the logged-in user’s member object for a specific guild. The backend should check the member object’s `roles` array for the configured `ROSE` role ID.

### 6.3 Important Implementation Notes

Use role IDs, not role names.

The application should not check for `"ROSE"` as text because Discord role names can change. The Discord role ID is stable and should be stored in environment configuration.

Recommended environment variables:

```env
APP_BASE_URL=
DATABASE_URL=
SESSION_SECRET=
ENCRYPTION_KEY=

DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=
DISCORD_GUILD_ID=
DISCORD_ROSE_ROLE_ID=
DISCORD_ADMIN_ROLE_IDS=

RIOT_API_KEY=
RIOT_RSO_CLIENT_ID=
RIOT_RSO_CLIENT_SECRET=
RIOT_REDIRECT_URI=
```

### 6.4 Session Rules

On successful login:

- Store user ID in secure HTTP-only cookie session.
- Store Discord ID in the database.
- Store current verification status:
  - `VERIFIED`
  - `WAITLISTED`
  - `SUSPENDED`
  - `BANNED`

- Re-check Discord role:
  - On login
  - On manual “Re-check Verification” button
  - Optionally once every 12–24 hours
  - Optionally through Discord bot role update events in a later phase

---

## 7. Access Control Matrix

| Feature                 | Guest | Waitlisted | Verified Member | Tournament Admin | Super Admin |
| ----------------------- | ----: | ---------: | --------------: | ---------------: | ----------: |
| Landing page            |   Yes |        Yes |             Yes |              Yes |         Yes |
| Tournament list         |   Yes |        Yes |             Yes |              Yes |         Yes |
| Tournament detail       |   Yes |        Yes |             Yes |              Yes |         Yes |
| Login with Discord      |   Yes |        Yes |             Yes |              Yes |         Yes |
| Waitlist page           |    No |        Yes |              No |               No |          No |
| Member dashboard        |    No |         No |             Yes |              Yes |         Yes |
| Edit own profile        |    No |         No |             Yes |              Yes |         Yes |
| Link socials            |    No |         No |             Yes |              Yes |         Yes |
| Link Riot account       |    No |         No |             Yes |              Yes |         Yes |
| Register for tournament |    No |         No |             Yes |              Yes |         Yes |
| Admin dashboard         |    No |         No |              No |              Yes |         Yes |
| Manage tournaments      |    No |         No |              No |              Yes |         Yes |
| Manage users            |    No |         No |              No |          Limited |         Yes |
| App settings            |    No |         No |              No |               No |         Yes |

---

## 8. Core Pages

## 8.1 Public Landing Page

Purpose:

- Introduce Black Rose
- Drive users to Discord login
- Promote tournaments
- Showcase champions and community credibility

Current repo already has a strong hero style with:

- Black Rose emblem
- Dark grid background
- Large “FORGE YOUR LEGACY” hero text
- Register and View Tournaments CTAs

Recommended changes:

- Replace generic Register with “Continue with Discord”
- Keep “View Tournaments”
- Add “Join Discord” secondary action for guests
- Add member feature preview section

---

## 8.2 Login Page

Current login/register pages still show email/password and mock social buttons. For the actual solution, authentication should be Discord-first.

Recommended login page behavior:

- Primary button: “Continue with Discord”
- Remove password login from MVP unless admins specifically need non-Discord emergency access
- Display a short message:

> Black Rose access is verified through Discord. You must be a member of the Black Rose server and have the ROSE role to access member features.

---

## 8.3 Waitlist / Verification Page

Purpose:

Show users why they cannot access the app yet.

States:

1. User is not in the Black Rose Discord server.
2. User is in the server but does not have the `ROSE` role.
3. Discord role check failed due to temporary API issue.

Recommended page content:

- Black Rose emblem
- Status card
- Discord invite link
- “I already joined — re-check verification” button
- Message telling users to contact moderators if they believe this is a mistake

Suggested route:

```text
/waitlist
```

---

## 8.4 Member Dashboard

Purpose:

Central member hub after verification.

Sections:

- Profile completion status
- Linked socials
- Linked Riot account status
- Active tournament registrations
- Upcoming matches
- Featured member preview card

Suggested route:

```text
/dashboard
```

---

## 8.5 Member Profile Page

Purpose:

Each verified member has a shareable profile page that can be used when the member is featured on Black Rose social media.

Suggested route:

```text
/members/:slug
```

Profile fields:

- Display name
- Discord username
- Black Rose role/title
- Profile avatar
- Banner image
- Short bio
- Favorite games
- Main game
- Main role/agent
- Country/region
- Social links:
  - Twitch
  - YouTube
  - TikTok
  - Facebook Gaming
  - X/Twitter
  - Instagram

- Riot account link status
- Featured tournaments
- Achievements/badges

Recommended privacy rule:

Members should be able to choose which socials are public.

---

## 8.6 Tournament Directory

The repo already has a tournament directory with filters by game and status.

Suggested route:

```text
/tournaments
```

Recommended additions:

- Show “Registration Open” tournaments first
- Add game filter
- Add status filter
- Add “Verified Members Only” registration indicator
- Show team count and deadline
- Add CTA:
  - Guest: “Login with Discord”
  - Waitlisted: “Verify Membership”
  - Verified Member: “Register Team”

---

## 8.7 Tournament Detail Page

The repo already has tournament detail tabs:

- Overview
- Teams
- Bracket
- Rules

Suggested route:

```text
/tournaments/:id
```

Recommended additions:

- Registration CTA based on user access
- Team registration form
- Match schedule
- Bracket viewer
- Admin-only edit shortcut
- Riot account requirement indicator for Valorant tournaments

For Valorant tournaments, registration can require:

- Verified Black Rose member
- Riot account linked
- Valid Riot ID
- Team roster minimum met
- Agreement to tournament rules

---

## 8.8 Tournament Registration Page

Suggested route:

```text
/tournaments/:id/register
```

Flow:

```text
Open tournament
      |
      v
Click Register Team
      |
      v
Check user is verified
      |
      v
Check Riot account linked, if required
      |
      v
Create or select team
      |
      v
Add roster members
      |
      v
Submit registration
      |
      v
Registration status: Pending Admin Approval
```

Registration status values:

- `DRAFT`
- `PENDING`
- `APPROVED`
- `REJECTED`
- `WAITLISTED`
- `WITHDRAWN`

---

## 8.9 Admin Dashboard

The repo already has an admin dashboard with:

- Total users
- Total teams
- Active tournaments
- Pending registrations
- Completed tournaments

Recommended additions:

- Verification queue
- Riot link status count
- Recent audit logs
- Tournament health alerts
- Upcoming match conflicts

Suggested route:

```text
/admin
```

---

## 8.10 Admin Tournament Management

The repo already has admin tournament listing and tournament detail pages.

Suggested routes:

```text
/admin/tournaments
/admin/tournaments/:id
```

Recommended features:

- Create tournament
- Edit tournament
- Open/close registration
- Approve/reject teams
- Generate bracket
- Seed teams
- Publish bracket
- Update match result
- Publish winners
- Export CSV
- Post announcement to Discord, optional later

---

## 9. Riot / Valorant Account Linking Design

### 9.1 Purpose

Riot account linking is needed to:

- Verify Valorant identity
- Associate a member profile with a Riot account
- Fetch player match data and stats after opt-in
- Improve tournament integrity

### 9.2 Required Approach

Valorant personal stats should use Riot Sign On where users explicitly opt in to sharing their Riot account data.

Recommended user flow:

```text
User opens Profile Settings
      |
      v
Clicks "Link Riot Account"
      |
      v
Redirect to Riot Sign On
      |
      v
User logs in and consents
      |
      v
Riot redirects back with auth code
      |
      v
Backend exchanges code for Riot token
      |
      v
Backend calls Riot account endpoint
      |
      v
Store Riot PUUID + Riot Game Name + Tagline
      |
      v
User sees linked account confirmation
```

### 9.3 Valorant Data to Store

Store only what is needed.

Suggested fields:

- Riot PUUID
- Game name
- Tagline
- Region/routing value
- Linked date
- Last sync date
- Consent version
- Account visibility setting

### 9.4 Valorant Stats for MVP

For MVP, show simple member-owned stats only:

- Recent matches
- Agent usage
- Win/loss summary
- KDA summary
- Last updated timestamp

Avoid:

- Pre-match opponent scouting
- Hidden player lookup
- Ranking systems that compete with Riot’s official ranking
- Publicly exposing a player’s stats without opt-in

---

## 10. Data Model

### 10.1 users

```text
id
discord_id
username
display_name
avatar_url
email
verification_status
app_role
created_at
updated_at
last_login_at
last_discord_check_at
```

Suggested `verification_status` values:

```text
VERIFIED
WAITLISTED
SUSPENDED
BANNED
```

Suggested `app_role` values:

```text
MEMBER
TOURNAMENT_ADMIN
SUPER_ADMIN
```

---

### 10.2 discord_accounts

```text
id
user_id
discord_id
discord_username
discord_global_name
avatar_hash
guild_id
role_ids
has_rose_role
joined_at
last_checked_at
created_at
updated_at
```

---

### 10.3 member_profiles

```text
id
user_id
slug
display_name
headline
bio
main_game
region
profile_image_url
banner_image_url
is_public
is_featured
created_at
updated_at
```

---

### 10.4 social_links

```text
id
profile_id
platform
url
label
is_public
sort_order
created_at
updated_at
```

Suggested platforms:

```text
TWITCH
YOUTUBE
TIKTOK
FACEBOOK_GAMING
X
INSTAGRAM
DISCORD
OTHER
```

---

### 10.5 riot_accounts

```text
id
user_id
puuid
game_name
tagline
region
rso_subject
access_token_encrypted
refresh_token_encrypted
token_expires_at
last_synced_at
is_public
created_at
updated_at
```

For MVP, tokens may be stored encrypted only if refresh/sync is required. If not needed, store only verified Riot identity and require manual re-link for refresh.

---

### 10.6 tournaments

```text
id
slug
name
game
description
status
format
region
team_cap
min_players
max_players
prize_pool
registration_open_at
registration_deadline
start_date
end_date
rules_markdown
created_by
created_at
updated_at
```

Suggested statuses:

```text
DRAFT
REGISTRATION_OPEN
REGISTRATION_CLOSED
LIVE
COMPLETED
ARCHIVED
```

---

### 10.7 teams

```text
id
name
tag
captain_user_id
logo_url
created_at
updated_at
```

---

### 10.8 team_members

```text
id
team_id
user_id
ign
role
is_captain
status
joined_at
```

Suggested statuses:

```text
INVITED
ACTIVE
REMOVED
```

---

### 10.9 tournament_registrations

```text
id
tournament_id
team_id
submitted_by
status
admin_note
submitted_at
reviewed_by
reviewed_at
created_at
updated_at
```

---

### 10.10 matches

```text
id
tournament_id
bracket_round
match_number
team_a_id
team_b_id
score_a
score_b
winner_team_id
scheduled_at
status
created_at
updated_at
```

Suggested statuses:

```text
PENDING
SCHEDULED
LIVE
COMPLETED
DISPUTED
FORFEIT
```

---

### 10.11 bracket_nodes

```text
id
tournament_id
match_id
round_number
position
next_match_id
next_match_slot
lower_bracket_match_id
created_at
updated_at
```

---

### 10.12 audit_logs

```text
id
actor_user_id
action
entity_type
entity_id
metadata_json
created_at
```

Examples:

```text
TOURNAMENT_CREATED
REGISTRATION_APPROVED
REGISTRATION_REJECTED
BRACKET_PUBLISHED
MATCH_RESULT_UPDATED
USER_ROLE_CHANGED
```

---

## 11. API Route Design

### Auth Routes

```text
GET  /api/auth/discord/start
GET  /api/auth/discord/callback
POST /api/auth/logout
POST /api/auth/refresh-discord-verification
GET  /api/me
```

### Member/Profile Routes

```text
GET  /api/profile/me
PUT  /api/profile/me
GET  /api/members/:slug
POST /api/profile/social-links
PUT  /api/profile/social-links/:id
DELETE /api/profile/social-links/:id
```

### Riot Routes

```text
GET  /api/riot/start
GET  /api/riot/callback
POST /api/riot/unlink
GET  /api/riot/me/stats
POST /api/riot/sync
```

### Tournament Routes

```text
GET  /api/tournaments
GET  /api/tournaments/:id
POST /api/tournaments/:id/register
GET  /api/tournaments/:id/bracket
GET  /api/tournaments/:id/teams
```

### Admin Routes

```text
GET    /api/admin/overview
GET    /api/admin/users
PATCH  /api/admin/users/:id
GET    /api/admin/tournaments
POST   /api/admin/tournaments
PUT    /api/admin/tournaments/:id
DELETE /api/admin/tournaments/:id
GET    /api/admin/tournaments/:id/registrations
POST   /api/admin/registrations/:id/approve
POST   /api/admin/registrations/:id/reject
POST   /api/admin/tournaments/:id/generate-bracket
POST   /api/admin/tournaments/:id/publish-bracket
PATCH  /api/admin/matches/:id/result
GET    /api/admin/audit-logs
```

---

## 12. Wireframe Samples

The wireframes below follow the existing repo’s visual direction:

- Black background
- White typography
- Black Rose emblem
- Grid texture
- Angular clipped CTA buttons
- Admin dashboard panels
- Tournament cards and tables

---

## 12.1 Landing Page Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Rose Emblem] BLACK ROSE        Tournaments  Teams  Champions  Community   │
│                                                    [Sign In with Discord]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         [Large Spinning Rose Emblem]                         │
│                                                                             │
│                            COMMUNITY ESPORTS                                 │
│                                                                             │
│                         FORGE YOUR                                           │
│                            LEGACY                                            │
│                                                                             │
│        Compete. Rise. Dominate. Join community-driven tournaments            │
│        hosted by Black Rose and prove yourself against the best.             │
│                                                                             │
│                [ Continue with Discord ]   [ View Tournaments ]              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Featured Tournaments                                                        │
│                                                                             │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│ │ Valorant Nightfall   │ │ MLBB Bloom Qualifier │ │ CS2 Ashfall Open     │ │
│ │ Registration Open    │ │ Registration Open    │ │ Registration Open    │ │
│ │ 14/32 Teams          │ │ 6/24 Teams           │ │ 9/16 Teams           │ │
│ │ [View Details]       │ │ [View Details]       │ │ [View Details]       │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Why Black Rose                                                              │
│ [Organized Tournaments] [Verified Members] [Community Features]             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Hall of Champions                                                           │
│ [Champion Card] [Champion Card] [Champion Card]                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12.2 Discord Login Page Wireframe

```text
┌──────────────────────────────────────┬──────────────────────────────────────┐
│                                      │                                      │
│  [Large Rose Emblem Background]      │  BLACK ROSE                          │
│                                      │                                      │
│  FORGE YOUR LEGACY                   │  Sign in with Discord                │
│                                      │                                      │
│  Tournament Access                   │  Black Rose access is verified       │
│  Discord-centered member portal      │  through your Discord account.        │
│                                      │                                      │
│                                      │  You must be in the Black Rose        │
│                                      │  Discord server and have the ROSE     │
│                                      │  role to access member features.      │
│                                      │                                      │
│                                      │  [ Continue with Discord ]            │
│                                      │                                      │
│                                      │  Not in the server yet?               │
│                                      │  [ Join Black Rose Discord ]          │
│                                      │                                      │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 12.3 Waitlist / Verification Page Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         [Black Rose Emblem]                                  │
│                                                                             │
│                         VERIFICATION PENDING                                 │
│                                                                             │
│        Your Discord account was connected, but we could not confirm          │
│        that you have the ROSE role in the Black Rose Discord server.         │
│                                                                             │
│        Current Status:                                                       │
│        ┌───────────────────────────────────────────────────────────────┐     │
│        │ Discord Connected: Yes                                        │     │
│        │ Black Rose Server Member: Not confirmed                        │     │
│        │ ROSE Role: Missing                                             │     │
│        └───────────────────────────────────────────────────────────────┘     │
│                                                                             │
│        [ Join Discord Server ]   [ Re-check Verification ]   [ Logout ]      │
│                                                                             │
│        If you already joined, please contact a Black Rose moderator.         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12.4 Member Dashboard Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Rose] BLACK ROSE      Tournaments  My Profile  My Team       [Avatar ▾]    │
├─────────────────────────────────────────────────────────────────────────────┤
│ Dashboard                                                                   │
│                                                                             │
│ ┌─────────────────────────────┐ ┌─────────────────────────────────────────┐ │
│ │ Profile Completion          │ │ Active Tournament Registration          │ │
│ │ 75% Complete                │ │ Valorant Nightfall Cup                  │ │
│ │ [Edit Profile]              │ │ Status: Pending Approval                │ │
│ └─────────────────────────────┘ │ Team: Obsidian Vipers                   │ │
│                                 │ [View Registration]                     │ │
│ ┌─────────────────────────────┐ └─────────────────────────────────────────┘ │
│ │ Riot Account                │                                             │
│ │ Riot ID: Not Linked         │ ┌─────────────────────────────────────────┐ │
│ │ [Link Riot Account]         │ │ Social Links                            │ │
│ └─────────────────────────────┘ │ Twitch: Added                           │ │
│                                 │ YouTube: Missing                        │ │
│ ┌─────────────────────────────┐ │ TikTok: Added                           │ │
│ │ Upcoming Matches            │ │ [Manage Socials]                        │ │
│ │ No scheduled matches yet    │ └─────────────────────────────────────────┘ │
│ └─────────────────────────────┘                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12.5 Public Member Profile Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Rose] BLACK ROSE        Tournaments  Members  Community       [Discord]    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                         Banner Image / Dark Grid                        │ │
│ │                                                                         │ │
│ │   [Avatar]  thornn                                                      │ │
│ │             Valorant Duelist / IGL                                      │ │
│ │             Black Rose Verified Member                                  │ │
│ │                                                                         │ │
│ │             Competing, creating, and representing Black Rose.            │ │
│ │                                                                         │ │
│ │             [Twitch] [YouTube] [TikTok] [Facebook] [X]                  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ Featured Stats                                                              │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐       │
│ │ Main Game          │ │ Riot Account        │ │ Region             │       │
│ │ Valorant           │ │ Linked              │ │ PH / APAC          │       │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘       │
│                                                                             │
│ Tournament History                                                          │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ Valorant Onyx Series — Top 8                                            │ │
│ │ Valorant Spring Open — Champions                                        │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12.6 Tournament Detail + Registration Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Rose] BLACK ROSE        Tournaments  Teams  Community        [Avatar ▾]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Valorant Nightfall Cup                                                       │
│ Registration Open                                                           │
│                                                                             │
│ ₱10,000 Prize Pool | Double Elimination | PH | 14/32 Teams                  │
│                                                                             │
│ [ Register Team ]   [ View Bracket ]   [ Rules ]                            │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Teams] [Bracket] [Rules]                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Overview                                                                    │
│ ┌───────────────────────────────┐ ┌───────────────────────────────────────┐ │
│ │ Schedule                      │ │ Prize Breakdown                        │ │
│ │ Registration Closes: Jun 18   │ │ 1st: ₱5,000                            │ │
│ │ Group Stage: Jun 21-22        │ │ 2nd: ₱2,500                            │ │
│ │ Finals: Jun 29                │ │ 3rd-4th: ₱1,250 each                   │ │
│ └───────────────────────────────┘ └───────────────────────────────────────┘ │
│                                                                             │
│ Registered Teams                                                            │
│ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ │
│ │ OBV Obsidian Vipers  │ │ CRH Crimson Halo     │ │ ASH Ash Reapers      │ │
│ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 12.7 Admin Tournament Organizer Wireframe

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ BLACK ROSE ADMIN                                      [Admin Avatar ▾]       │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ Dashboard     │ Tournaments / Valorant Nightfall Cup                        │
│ Tournaments   │                                                             │
│ Teams         │ ┌────────┬──────────────┬──────────┬─────────────┬───────┐ │
│ Users         │ │ Game   │ Status       │ Teams    │ Deadline    │ Prize │ │
│ Participants  │ │ VLR    │ Reg. Open    │ 14/32    │ Jun 18      │ 10K   │ │
│ Announcements │ └────────┴──────────────┴──────────┴─────────────┴───────┘ │
│ Settings      │                                                             │
│               │ Registered Teams                                            │
│               │ ┌───────────────┬─────────┬─────────┬──────────┬────────┐ │
│               │ │ Team          │ Captain │ Members │ Status   │ Action │ │
│               │ ├───────────────┼─────────┼─────────┼──────────┼────────┤ │
│               │ │ Obsidian      │ thornn  │ 5       │ Pending  │ Approve│ │
│               │ │ Crimson Halo  │ halox   │ 5       │ Approved │ View   │ │
│               │ └───────────────┴─────────┴─────────┴──────────┴────────┘ │
│               │                                                             │
│               │ [Export CSV] [Generate Bracket] [Publish Bracket]           │
│               │                                                             │
│               │ Bracket Preview                                             │
│               │ QF ───── SF ───── GF                                        │
│               │ OBV vs TBD                                                  │
│               │ CRH vs ASH                                                  │
│               │                                                             │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 13. Suggested Repo Structure Changes

The current repo already organizes features cleanly. Extend it like this:

```text
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── server/
│   │   └── utils/
│   │
│   ├── members/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── profiles/
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── riot/
│   │   ├── components/
│   │   ├── server/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── tournaments/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── admin/
│   │   ├── components/
│   │   ├── services/
│   │   └── types/
│   │
│   └── shared/
│       ├── components/
│       ├── server/
│       └── utils/
│
├── routes/
│   ├── index.tsx
│   ├── login.tsx
│   ├── waitlist.tsx
│   ├── dashboard.tsx
│   ├── members.$slug.tsx
│   ├── profile.settings.tsx
│   ├── tournaments.index.tsx
│   ├── tournaments.$id.tsx
│   ├── tournaments.$id.register.tsx
│   ├── admin.tsx
│   ├── admin.index.tsx
│   ├── admin.tournaments.tsx
│   ├── admin.tournaments.$id.tsx
│   ├── admin.users.tsx
│   └── admin.participants.tsx
│
├── server/
│   ├── auth/
│   ├── db/
│   ├── discord/
│   ├── riot/
│   └── security/
│
└── lib/
    ├── env.ts
    ├── permissions.ts
    └── utils.ts
```

---

## 14. Bracketing Design

### MVP Bracket Features

- Admin can generate a bracket from approved registrations.
- Admin can manually seed teams.
- Admin can publish bracket.
- Members can view bracket.
- Admin can enter match results.
- Winners automatically advance to the next match.

### Supported MVP Formats

Start with:

- Single Elimination
- Double Elimination, if time allows

Later:

- Round Robin
- Group Stage + Playoffs
- Swiss

### Bracket Generation Flow

```text
Admin closes registration
      |
      v
Admin reviews pending teams
      |
      v
Admin approves final team list
      |
      v
Admin seeds teams manually or automatically
      |
      v
System generates bracket nodes
      |
      v
Admin previews bracket
      |
      v
Admin publishes bracket
      |
      v
Members see public bracket
```

---

## 15. Security Requirements

### Authentication Security

- Use Authorization Code flow.
- Validate OAuth `state`.
- Use secure HTTP-only cookies.
- Protect all member/admin routes server-side.
- Never trust client-side role checks.
- Re-check Discord role on login and periodically.
- Store Discord and Riot secrets only in environment variables.

### API Security

- Rate-limit auth callbacks and verification checks.
- Rate-limit profile updates.
- Rate-limit tournament registration submissions.
- Validate all request payloads using Zod.
- Add audit logs for admin actions.
- Use CSRF protection for cookie-based mutation requests.
- Use server-side authorization checks for every admin API.

### Token Security

- Do not expose Discord or Riot access tokens to the browser.
- Encrypt stored refresh tokens.
- Prefer short-lived sessions.
- Allow users to unlink Riot account.
- Revoke tokens where supported when unlinking.

---

## 16. Admin Moderation and Auditability

Every admin action should create an audit log.

Examples:

- Admin approves a registration
- Admin rejects a registration
- Admin edits tournament rules
- Admin publishes bracket
- Admin changes match result
- Admin suspends user
- Admin changes app role

Audit log format:

```text
[Timestamp] [Actor] [Action] [Target] [Metadata]
```

Example:

```text
2026-06-03 20:10:00 | marshal | REGISTRATION_APPROVED | team:Obsidian Vipers | tournament:Valorant Nightfall Cup
```

---

## 17. MVP Delivery Plan

### Phase 1 — Auth and Access Control

- Add Discord OAuth2 login
- Add backend session handling
- Add database
- Add `users` and `discord_accounts` tables
- Add `ROSE` role verification
- Add `/waitlist`
- Protect member/admin routes

### Phase 2 — Member Profiles

- Add member dashboard
- Add editable profile
- Add public member profile page
- Add social links
- Add profile visibility settings

### Phase 3 — Tournament Registration

- Connect tournament pages to database
- Add team creation
- Add tournament registration
- Add registration statuses
- Add admin approval flow

### Phase 4 — Bracket Management

- Add bracket generation
- Add bracket publishing
- Add match result updates
- Add public bracket viewer
- Add admin audit logs

### Phase 5 — Riot Account Linking

- Add Riot linking page
- Add Riot opt-in disclaimer
- Add Riot identity verification
- Add Valorant stats sync
- Add Riot-linked requirement for Valorant tournaments

### Phase 6 — Discord Enhancements

- Add optional Discord bot
- Sync role changes through Discord events
- Post tournament announcements to Discord
- Notify teams about match schedules

---

## 18. Key Assumptions

- The Black Rose Discord server ID will be configured in environment variables.
- The `ROSE` role ID will be configured in environment variables.
- Discord remains the source of truth for membership verification.
- The web application database stores app-specific data only.
- Riot account linking will require user opt-in.
- Real Valorant stat features may require Riot production approval.
- The MVP can launch with manual admin-controlled brackets before adding advanced automation.

---

## 19. Recommended MVP Acceptance Criteria

### Discord Login

- User can click “Continue with Discord”.
- User is redirected to Discord OAuth.
- User returns to the app after approval.
- App creates or updates user record.
- App checks Black Rose guild membership and `ROSE` role.
- Verified user lands on dashboard.
- Non-verified user lands on waitlist page.

### Profile

- Verified member can edit profile.
- Verified member can add social links.
- Public profile page can be viewed by slug.
- Member can toggle social link visibility.

### Tournament

- Verified member can register a team.
- Waitlisted user cannot register.
- Admin can approve/reject registration.
- Approved team appears in tournament team list.
- Admin can generate and publish bracket.
- Public users can view published bracket.

### Admin

- Non-admin cannot access `/admin`.
- Tournament Admin can manage tournaments.
- Super Admin can manage users and settings.
- Admin actions are saved in audit logs.

---

## 20. Final Recommendation

The best MVP direction is to keep the current TanStack Start frontend and extend it into a full-stack app. Discord should become the only login and member verification method. The `ROSE` role should control member access, while internal app roles should control admin access.

For the first release, prioritize:

1. Discord OAuth login
2. `ROSE` role verification
3. Waitlist page
4. Member profile pages
5. Tournament registration
6. Admin approval flow
7. Basic bracket generation

Riot account linking should be designed early but can be released after the Discord/member/tournament MVP is stable, especially because real Valorant account/stat functionality requires Riot opt-in and production-level API approval.
