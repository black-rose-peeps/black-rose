import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORM_ORDER } from "@/features/member/constants";
import type { MemberProfile } from "@/features/member/types";

interface MemberMobileSocialListProps {
  profile: MemberProfile | null;
}

export function MemberMobileSocialList({ profile }: MemberMobileSocialListProps) {
  return (
    <ul className="divide-y divide-white/8 md:hidden">
      {SOCIAL_PLATFORM_ORDER.map((platform) => {
        const link = profile?.socialLinks.find((s) => s.platform === platform);
        const url = link?.url?.trim() ?? "";
        const hasUrl = url.length > 0;

        return (
          <li key={platform} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-tech text-label-readable uppercase text-muted-foreground">
                  {SOCIAL_PLATFORM_LABELS[platform]}
                </p>
                {!hasUrl ? (
                  <p className="mt-1 text-sm text-muted-foreground/40">Not set</p>
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-sm text-muted-foreground hover:text-foreground"
                  >
                    {url}
                  </a>
                )}
              </div>
              {hasUrl ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`h-6 rounded-none px-2 py-0 font-tech text-label-readable uppercase leading-none ${
                      link!.isPublic
                        ? "border-emerald-400/20 text-emerald-400"
                        : "border-amber-400/20 text-amber-400"
                    }`}
                  >
                    {link!.isPublic ? "Public" : "Private"}
                  </Badge>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-m-1.5 inline-flex p-1.5 text-muted-foreground hover:text-foreground"
                    aria-label={`Open ${SOCIAL_PLATFORM_LABELS[platform]}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
