import { useState } from "react";
import { EventCard } from "./EventCard";
import valorantEventImg from "@/assets/blackrose-valorant-event.jpg";

const EVENTS = [
  {
    title: "BLACK ROSE FIRST IRL",
    date: "February 27, 2026",
    description:
      "This video documents an exciting first-ever in-person meetup of the Black Rose guild, hosted at the NAOS Esports Arena during a Mountain Dew event. The vlog, created by Alodia Gosiengfiao, captures the transition of an online gaming community into a real-world social experience after months of digital interaction. Members from various divisions of Black Rose come together for the first time, sharing stories and creating what the group describes as a 'new core memory.' The footage showcases the vibrant energy of the Mountain Dew event, featuring interviews with members, stage activities, and the genuine excitement of finally meeting friends in person.",
    youtubeVideoId: "qsKA3jIye1Q",
    accentLine: "from-red-400/80 via-red-400/20 to-transparent",
    accentTag: "border-red-400/35 text-red-200 bg-red-500/8",
  },
  {
    title: "BLACK ROSE NOVELLINO WINERY TOUR",
    date: "February 28, 2026",
    description:
      "This video features content creator Alodia Gosiengfiao leading the Black Rose Guild on an educational and fun-filled tour of the Novellino Winery located in Laguna, Philippines. The visit offers a behind-the-scenes look at the professional wine-making process, from the source of the grapes to the final bottling stages. The winery utilizes renewable energy, with 99% of its power coming from solar energy. Attendees learn about the technical aspects of wine production, including micro-filtration and the importance of high-quality ingredients sourced from Italy and Spain. Beyond the tour, the event fosters community building within the guild, featuring trivia games, merchandise giveaways, and celebratory activities like group birthday greetings.",
    youtubeVideoId: "i0vsCw1KqXk",
    accentLine: "from-amber-400/80 via-amber-400/20 to-transparent",
    accentTag: "border-amber-400/35 text-amber-200 bg-amber-500/8",
  },
  {
    title: "VALORANT Creator Brawl + Black Rose Grand Finals",
    date: "July 11, 2026",
    description:
      "The VALORANT Creator Brawl + Black Rose Grand Finals was a July 2026 LAN at NAOS Esports Arena that combined a creator invitational with a community tournament, headlined by Black Rose and Alodia Gosiengfiao. This big community esports event in the Philippines ran alongside the VALORANT PH competitive season, featuring a creator-focused tournament where Filipino streamers and content creators competed with full broadcast treatment. The Grand Finals event hosted by Black Rose featured the Black Rose Community Valorant Tournament, with a black and gold trophy engraved with 'BLACK ROSE RISE AS ONE.' The event was positioned as grassroots PH esports meets creator culture, with packed crowds cheering, fan-art walls, and Tagalog broadcasters on stage.",
    imageSrc: valorantEventImg,
    accentLine: "from-pink-400/80 via-pink-400/20 to-transparent",
    accentTag: "border-pink-400/35 text-pink-200 bg-pink-500/8",
  },
];

const INITIAL_VISIBLE = 3;

export function EventsTab() {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const hasMore = EVENTS.length > visibleCount;

  const handleLoadMore = () => {
    setVisibleCount(EVENTS.length);
  };

  return (
    <main className="relative bg-[oklch(0.05_0_0)]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10">
          <p className="font-tech text-label-readable uppercase text-muted-foreground">
            Community History
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-display text-white sm:text-4xl">
            Past Events
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            A collection of memorable moments and milestones from the Black Rose community journey.
          </p>
        </div>

        <div className="grid gap-8">
          {EVENTS.slice(0, visibleCount).map((event, index) => (
            <EventCard
              key={event.title}
              title={event.title}
              date={event.date}
              description={event.description}
              youtubeVideoId={event.youtubeVideoId}
              imageSrc={event.imageSrc}
              accentLine={event.accentLine}
              accentTag={event.accentTag}
              index={index + 1}
            />
          ))}
        </div>

        {hasMore && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="clip-cta inline-flex h-11 items-center justify-center gap-2 border border-white/25 bg-white/6 px-6 font-tech text-ui-readable uppercase transition duration-300 hover:bg-white/10 hover:border-white/35"
            >
              Load More Events
              <span aria-hidden className="text-sm leading-none">
                ↓
              </span>
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
