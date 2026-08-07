import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  facebookVideoId?: never;
}

interface ImageEventCardProps extends EventCardProps {
  youtubeVideoId?: never;
  imageSrc: string;
  facebookVideoId?: never;
}

interface MixedMediaEventCardProps extends EventCardProps {
  youtubeVideoId: string;
  imageSrc: string;
  facebookVideoId?: never;
}

interface FullMediaEventCardProps extends EventCardProps {
  youtubeVideoId: string;
  imageSrc: string;
  facebookVideoId: string;
}

export type EventCardWithMedia = VideoEventCardProps | ImageEventCardProps | MixedMediaEventCardProps | FullMediaEventCardProps;

type MediaType = "youtube" | "facebook" | "image";

export function EventCard({
  title,
  date,
  description,
  accentTag,
  index,
  ...mediaProps
}: EventCardWithMedia) {
  const hasFacebook = "facebookVideoId" in mediaProps;
  const hasImage = "imageSrc" in mediaProps;
  const hasYoutube = "youtubeVideoId" in mediaProps;

  const mediaTypes: MediaType[] = [];
  if (hasYoutube) mediaTypes.push("youtube");
  if (hasFacebook) mediaTypes.push("facebook");
  if (hasImage) mediaTypes.push("image");

  const [activeMedia, setActiveMedia] = useState<MediaType>(
    mediaTypes[0] || "image"
  );

  const activeIndex = mediaTypes.indexOf(activeMedia);

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveMedia(mediaTypes[activeIndex - 1]);
    } else {
      setActiveMedia(mediaTypes[mediaTypes.length - 1]);
    }
  };

  const handleNext = () => {
    if (activeIndex < mediaTypes.length - 1) {
      setActiveMedia(mediaTypes[activeIndex + 1]);
    } else {
      setActiveMedia(mediaTypes[0]);
    }
  };

  const showYoutube = activeMedia === "youtube" && hasYoutube;
  const showFacebook = activeMedia === "facebook" && hasFacebook;
  const showImage = activeMedia === "image" && hasImage;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-white/[0.07] bg-[oklch(0.055_0_0)] transition duration-500 hover:shadow-[0_24px_64px_rgba(0,0,0,0.65)]">
      {/* Media section */}
      <div className="relative aspect-video w-full overflow-hidden">
        {showYoutube && "youtubeVideoId" in mediaProps ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${mediaProps.youtubeVideoId}`}
            title={title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : showFacebook && "facebookVideoId" in mediaProps ? (
          <iframe
            src={`https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/reel/${mediaProps.facebookVideoId}&show_text=false`}
            title={title}
            className="h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ border: "none", overflow: "hidden" }}
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

        {/* Media toggle dots and navigation (only when multiple media types are present) */}
        {mediaTypes.length > 1 && (
          <>
            {/* Left navigation button */}
            <button
              type="button"
              onClick={handlePrevious}
              className="cursor-pointer absolute left-3 top-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition duration-300 hover:bg-black/80 group-hover:opacity-100"
              aria-label="Previous media"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>

            {/* Right navigation button */}
            <button
              type="button"
              onClick={handleNext}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition duration-300 hover:bg-black/80 group-hover:opacity-100"
              aria-label="Next media"
            >
              <ChevronRight className="h-8 w-8" />
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
              {mediaTypes.map((type, index) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActiveMedia(type)}
                  className={`h-2 w-2 rounded-full transition ${
                    activeMedia === type
                      ? "bg-white"
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Switch to ${type}`}
                />
              ))}
            </div>
          </>
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
