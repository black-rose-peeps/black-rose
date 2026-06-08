import { isSwissFormat } from "../constants/formats";
import type { BracketRound, ScheduleEntry, TournamentStatus } from "../types";

function uniqueRoundLabels(rounds: BracketRound[]): string[] {
  const labels: string[] = [];
  for (const round of rounds) {
    const base = round.label.split(" · ")[0]?.trim() ?? round.label;
    if (!labels.includes(base)) labels.push(base);
  }
  return labels;
}

export function buildTournamentSchedule(input: {
  registrationDeadline: string;
  startDate: string;
  format: string;
  status: TournamentStatus | string;
  bracketRounds?: BracketRound[];
}): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [
    { phase: "Registration Deadline", date: input.registrationDeadline },
    { phase: "Tournament Starts", date: input.startDate },
  ];

  const rounds = input.bracketRounds ?? [];
  if (rounds.length > 0) {
    const labels = uniqueRoundLabels(rounds);
    labels.forEach((label, index) => {
      schedule.push({
        phase: label,
        date: input.startDate,
        note:
          index === 0
            ? "Opening competitive round"
            : index === labels.length - 1
              ? "Closing round"
              : "Bracket progression",
      });
    });
  } else if (isSwissFormat(input.format)) {
    schedule.push({
      phase: "Swiss Group Stage",
      date: input.startDate,
      note: "Teams paired by record each round — 3 wins to qualify",
    });
  } else {
    schedule.push({
      phase: "Bracket Stage",
      date: input.startDate,
      note: "Published once staff lock seeding",
    });
  }

  if (input.status === "Completed" || input.status === "Archived") {
    schedule.push({
      phase: "Tournament Concluded",
      date: input.startDate,
      note: "Final placements published",
    });
  } else if (input.status === "Live") {
    schedule.push({
      phase: "Live Competition",
      date: input.startDate,
      note: "Bracket updates in real time",
    });
  }

  return schedule;
}
