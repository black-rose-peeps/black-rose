import { useState } from "react";

interface EventCardProps {
  title: string;
  date: string;
  description: string;
  accentTag: string;
  /** Index for numbered marker (1-based) */
  index?: number;
}

interface VideoEventCardProps extends EventCardProps {
  youtubeVideoId: string;
  imageSrc?: never;
}

interface ImageEventCardProps extends EventCardProps {
  youtubeVideoId?: never;
  imageSrc: string;
}

interface MixedMediaEventCardProps extends EventCardProps {
  youtubeVideoId: string;
  imageSrc: string;
}

export type EventCardWithMedia = VideoEventCardProps | ImageEventCardProps | MixedMediaEventCardProps;

export function EventCard({
  title,
  date,
  description,
  accentTag,
  index,
  ...mediaProps
}: EventCardWithMedia) {
  const hasBothMedia = "youtubeVideoId" in mediaProps && "imageSrc" in mediaProps;
  const [activeMedia, setActiveMedia] = useState<"video" | "image">(
    hasBothMedia ? "video" : "youtubeVideoId" in mediaProps ? "video" : "image"
  );

  const showVideo = hasBothMedia ? activeMedia === "video" : "youtubeVideoId" in mediaProps;
  const showImage = hasBothMedia ? activeMedia === "image" : "imageSrc" in mediaProps;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-white/[0.07] bg-[oklch(0.055_0_0)] transition duration-500 hover:shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
      {/* Media section */}
      <div className="relative aspect-video w-full overflow-hidden">
        {showVideo && "youtubeVideoId" in mediaProps ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${mediaProps.youtubeVideoId}`}
            title={title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : showImage && "imageSrc" in mediaProps ? (
          <>
            <img
              src={mediaProps.imageSrc}
              alt={title}
              className="h-full w-full object-cover object-center brightness-[0.7] saturate-[0.7] transition duration-700 group-hover:brightness-90 group-hover:saturate-90"
            />
            {/* Gradient fade only for static images */}
            <div className="absolute inset-0 bg-linear-to-t from-[oklch(0.055_0_0)] via-[oklch(0.055_0_0/0.35)] to-transparent" />
          </>
        ) : null}

        {/* Date badge */}
        <div
          className={`absolute border px-2 py-0.5 font-tech text-label-readable uppercase backdrop-blur-md ${accentTag} right-3 top-3`}
        >
          {date}
        </div>

        {/* Media toggle tabs (only when both video and image are present) */}
        {hasBothMedia && (
          <div className="absolute bottom-3 left-3 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveMedia("video")}
              className={`px-3 py-1.5 text-xs font-tech uppercase transition ${
                activeMedia === "video"
                  ? "bg-white text-black"
                  : "bg-black/50 text-white/70 hover:bg-black/70 hover:text-white"
              }`}
            >
              Video
            </button>
            <button
              type="button"
              onClick={() => setActiveMedia("image")}
              className={`px-3 py-1.5 text-xs font-tech uppercase transition ${
                activeMedia === "image"
                  ? "bg-white text-black"
                  : "bg-black/50 text-white/70 hover:bg-black/70 hover:text-white"
              }`}
            >
              Photo
            </button>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="relative flex flex-1 flex-col px-5 pb-5 pt-4 md:px-8 md:py-6">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.08]" />

        <div className="relative">
          <div className="flex items-start gap-4">
            {/* Numbered marker */}
            {index !== undefined && (
              <span className="font-tech text-2xl font-bold text-white/20 md:text-3xl">
                {String(index).padStart(2, "0")}
              </span>
            )}
            <h3 className="font-display text-2xl tracking-display text-white leading-tight md:text-3xl">
              {title}
            </h3>
          </div>
        </div>

        <div className="relative mt-4 flex-1 border-t border-white/[0.07] pt-4">
          <p className="text-sm leading-6 text-white/50 md:text-base">{description}</p>
        </div>
      </div>
    </article>
  );
}
