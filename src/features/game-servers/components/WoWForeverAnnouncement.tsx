import { useEffect, useRef, useState } from "react";
import { WOW_FOREVER_ANNOUNCEMENT_URL, getWoWForeverEmbedUrl } from "../utils/wow-forever-launch";

/** Facebook owns its embed rendering; keep the original post accessible independently. */
export function WoWForeverAnnouncement() {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    function measure() {
      setWidth(Math.floor(element!.getBoundingClientRect().width));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-labelledby="wow-announcement-heading" className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id="wow-announcement-heading" className="font-display text-xl tracking-display">
          Community announcement
        </h2>
        <a
          href={WOW_FOREVER_ANNOUNCEMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
        >
          View on Facebook<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <div ref={container} className="mx-auto w-full max-w-[500px]">
        {width !== null && width >= 350 && !failed ? (
          <iframe
            src={getWoWForeverEmbedUrl(width)}
            title="Black Rose WoW Forever announcement on Facebook"
            width={Math.min(500, width)}
            height={540}
            className="block w-full border-0 bg-white [color-scheme:light]"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        ) : width === null ? (
          <p role="status" className="py-6 text-sm text-muted-foreground">
            Loading announcement…
          </p>
        ) : (
          <p className="border-y border-white/10 py-6 text-sm leading-relaxed text-muted-foreground">
            Open the original post on Facebook to view the full announcement.
          </p>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Facebook may require cookies or sign-in to display the post. The original post is always
        available through the link above.
      </p>
    </section>
  );
}
