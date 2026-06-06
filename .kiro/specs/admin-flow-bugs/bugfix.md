# Bugfix Requirements Document

## Introduction

Four confirmed bugs prevent core admin workflows from functioning correctly in the Black Rose Arena tournament management app. The issues span the full admin flow: adding members to team rosters, registering teams into tournaments, bracket team-count thresholds, and bracket state visibility on the public-facing site. Left unfixed, admins cannot complete the tournament setup pipeline end-to-end.

---

## Bug Analysis

### Bug 1 — Cannot Add Existing Members to Existing Teams

#### Current Behavior (Defect)

1.1 WHEN the admin opens the "Add Member" dialog for an existing team AND the members list is empty (no available members shown in the dropdown) THEN the system renders the select as disabled with the placeholder "No available members" and the submit button is permanently disabled, preventing any assignment

1.2 WHEN the admin selects a valid existing member in the dropdown and submits the form THEN the system fails to add the member to the team roster and returns an error, leaving the roster unchanged

#### Expected Behavior (Correct)

2.1 WHEN the admin opens the "Add Member" dialog for an existing team AND registered members who are not already on that team exist THEN the system SHALL display all eligible members in the dropdown so the admin can select one

2.2 WHEN the admin selects a valid existing member and submits the "Add Member" form THEN the system SHALL add the member to the team's roster, return the updated team record, and reflect the new member in the team list without a full page reload

#### Unchanged Behavior (Regression Prevention)

3.1 WHEN a member is already on the selected team (with a non-removed status) THEN the system SHALL CONTINUE TO exclude that member from the available members dropdown

3.2 WHEN a member is already on another active team THEN the system SHALL CONTINUE TO reject the assignment and return an error message identifying the conflicting team

3.3 WHEN no registered members exist at all THEN the system SHALL CONTINUE TO display the "No available members" placeholder and keep the submit button disabled

---

### Bug 2 — Cannot Add Existing Teams to Existing Tournaments

#### Current Behavior (Defect)

1.3 WHEN the admin opens the "Add Team" dialog on a tournament detail page THEN the system shows no eligible teams in the dropdown (the list is empty or all teams are filtered out), making it impossible to register any team

1.4 WHEN the admin selects a team and submits the "Add Team" form THEN the system silently fails or returns an error without adding the team to the tournament's registered teams list

#### Expected Behavior (Correct)

2.3 WHEN the admin opens the "Add Team" dialog on a tournament detail page AND eligible roster teams exist (matching game, not already registered, not at cap, not locked to another tournament) THEN the system SHALL populate the dropdown with all eligible teams

2.4 WHEN the admin selects an eligible team and submits the "Add Team" form THEN the system SHALL register the team, prepend it to the Registered Teams table, and increment the displayed team count without a full page reload

#### Unchanged Behavior (Regression Prevention)

3.4 WHEN a roster team's game does not match the tournament's game (and the team is not "Multi") THEN the system SHALL CONTINUE TO exclude that team from the eligible teams list

3.5 WHEN a roster team is already registered for the tournament THEN the system SHALL CONTINUE TO exclude that team from the eligible teams list

3.6 WHEN the tournament has reached its team cap THEN the system SHALL CONTINUE TO disable the "Add Team" button and show a cap-reached notice in the dialog

3.7 WHEN a roster team is already active in a different tournament THEN the system SHALL CONTINUE TO exclude that team from the eligible teams list

---

### Bug 3 — Bracket Team Count Logic Is Inverted

#### Current Behavior (Defect)

1.5 WHEN a tournament uses the Single Elimination format and has exactly 8 registered teams THEN the system does not enable the Bracket Management tab (it requires 16 teams instead of 8)

1.6 WHEN a tournament uses the Double Elimination format and has exactly 8 registered teams THEN the system incorrectly enables the Bracket Management tab (it should require 16 teams, not 8)

1.7 WHEN a tournament uses the Single Elimination format and has exactly 16 registered teams THEN the system incorrectly enables the Bracket Management tab using the wrong threshold constant (`BRACKET_TEAM_COUNT_SINGLE = 16` is assigned the value intended for double elimination)

#### Expected Behavior (Correct)

2.5 WHEN a tournament uses Single Elimination format and has exactly 8 registered teams THEN the system SHALL enable the Bracket Management tab and allow bracket generation

2.6 WHEN a tournament uses Double Elimination format and has exactly 16 registered teams THEN the system SHALL enable the Bracket Management tab and allow bracket generation

2.7 WHEN `requiredBracketTeamCount` is called with a Single Elimination format THEN the system SHALL return 8; when called with a Double Elimination format THEN the system SHALL return 16

#### Unchanged Behavior (Regression Prevention)

3.8 WHEN a tournament's format is neither Single nor Double Elimination THEN the system SHALL CONTINUE TO return null from `requiredBracketTeamCount` and keep the Bracket Management tab disabled

3.9 WHEN a tournament has a team count that does not match the required count for its format THEN the system SHALL CONTINUE TO display the correct availability message (e.g. "Single elimination bracket manager requires exactly 8 teams (currently N)")

3.10 WHEN `supportsBracketManager` is called with matching format and correct team count THEN the system SHALL CONTINUE TO return true; when called with a mismatched count it SHALL CONTINUE TO return false

---

### Bug 4 — Bracket Changes Don't Reflect on the Public Side

#### Current Behavior (Defect)

1.8 WHEN an admin generates and publishes a bracket for a tournament via the admin Bracket Manager THEN the public tournament detail page (`/tournaments/$id`) continues to show "Bracket Not Set" for that tournament

1.9 WHEN the public BracketTab is rendered for a tournament whose bracket was published in the admin session THEN the system reads bracket data exclusively from the static `mockTournamentDetails` record and ignores the bracket state held in the admin's in-memory `BracketManager`, so the bracket remains empty

#### Expected Behavior (Correct)

2.8 WHEN an admin publishes a bracket for a tournament THEN the system SHALL persist or propagate the bracket state so that the public tournament detail page reflects the generated bracket

2.9 WHEN the public BracketTab is rendered for a tournament that has a published bracket THEN the system SHALL display the bracket rounds and matches rather than showing "Bracket Not Set"

#### Unchanged Behavior (Regression Prevention)

3.11 WHEN no bracket has been published for a tournament THEN the system SHALL CONTINUE TO show the "Bracket Not Set" placeholder on the public tournament detail page

3.12 WHEN the public BracketTab receives a non-empty `bracket` prop THEN the system SHALL CONTINUE TO render the bracket rounds, match cards, team slots, and scores correctly

3.13 WHEN a tournament uses Double Elimination THEN the system SHALL CONTINUE TO separate upper and lower bracket sections in the public BracketTab view

---

## Bug Condition Summary

```pascal
// Bug 1 — Member-to-Team Assignment
FUNCTION isBugCondition_B1(X)
  INPUT: X = { team: Team, allMembers: AdminMember[] }
  OUTPUT: boolean
  RETURN allMembers contains members not already on team
         AND the dialog renders them as unavailable (empty dropdown)
END FUNCTION

// Property: Fix Checking — B1
FOR ALL X WHERE isBugCondition_B1(X) DO
  result ← openAddMemberDialog(X.team, X.allMembers)
  ASSERT eligibleMembers(result).length > 0
  ASSERT submitEnabled(result) = true
END FOR

// Bug 2 — Team-to-Tournament Assignment
FUNCTION isBugCondition_B2(X)
  INPUT: X = { tournament: Tournament, eligibleRosterTeams: Team[] }
  OUTPUT: boolean
  RETURN eligibleRosterTeams.length > 0
         AND dialog shows no eligible teams
END FUNCTION

// Property: Fix Checking — B2
FOR ALL X WHERE isBugCondition_B2(X) DO
  result ← openAddTeamDialog(X.tournament)
  ASSERT eligibleTeams(result).length > 0
END FOR

// Bug 3 — Inverted Bracket Team Count
FUNCTION isBugCondition_B3(format, teamCount)
  INPUT: format ∈ { "Single Elimination", "Double Elimination" }, teamCount: number
  OUTPUT: boolean
  RETURN (isSingleElim(format) AND teamCount = 8 AND supportsBracketManager returns false)
      OR (isDoubleElim(format) AND teamCount = 16 AND supportsBracketManager returns false)
END FUNCTION

// Property: Fix Checking — B3
FOR ALL X WHERE isBugCondition_B3(X.format, X.teamCount) DO
  result ← requiredBracketTeamCount(X.format)
  ASSERT isSingleElim(X.format) → result = 8
  ASSERT isDoubleElim(X.format) → result = 16
END FOR

// Bug 4 — Bracket Not Visible on Public Side
FUNCTION isBugCondition_B4(tournamentId)
  INPUT: tournamentId: string
  OUTPUT: boolean
  RETURN admin has published bracket for tournamentId
         AND public BracketTab shows empty bracket
END FUNCTION

// Property: Fix Checking — B4
FOR ALL X WHERE isBugCondition_B4(X.tournamentId) DO
  result ← renderPublicBracketTab(X.tournamentId)
  ASSERT result.bracket.length > 0
  ASSERT NOT showsBracketNotSet(result)
END FOR

// Preservation (all bugs)
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)   // existing correct behaviors unchanged
END FOR
```
