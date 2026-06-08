import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminMemberDetail } from "@/features/admin/features/members/components/AdminMemberDetail";
import { fetchMemberById } from "@/features/admin/features/members/services/members.service";
import { fetchMemberProfileById } from "@/features/member/services/member-profile.service";
import type { AdminMember } from "@/features/admin/features/members/types";
import type { MemberProfile } from "@/features/member/types";

export const Route = createFileRoute("/admin/users/$memberId")({
  head: () => ({
    meta: [{ title: "Member Detail — Admin" }],
  }),
  component: AdminMemberDetailPage,
});

function AdminMemberDetailPage() {
  const { memberId } = Route.useParams();
  const [member, setMember] = useState<AdminMember | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [memberRow, profileRow] = await Promise.all([
          fetchMemberById(memberId),
          fetchMemberProfileById(memberId).catch(() => null),
        ]);
        if (cancelled) return;
        if (!memberRow) {
          setError("Member not found.");
          setMember(null);
          setProfile(null);
        } else {
          setMember(memberRow);
          setProfile(profileRow);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load member.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  return (
    <>
      <AdminTopbar title="Member Detail" subtitle="User Management" />
      <AdminMemberDetail member={member} profile={profile} isLoading={isLoading} error={error} />
    </>
  );
}
