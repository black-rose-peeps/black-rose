import type { ReactNode } from "react";
import { TechPanel } from "./MemberShell";

/** Labelled card used throughout the member profile page. */
export function ProfileCard({ label, children }: { label: string; children: ReactNode }) {
  return <TechPanel label={label}>{children}</TechPanel>;
}
