import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { MembersManagement } from "@/features/admin/features/members/components/MembersManagement";

export const Route = createFileRoute("/admin/users/")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <>
      <AdminTopbar title="Users" subtitle="User Management" />
      <AdminPageContent>
        <MembersManagement />
      </AdminPageContent>
    </>
  );
}
