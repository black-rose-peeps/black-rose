import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { MembersManagement } from "@/features/admin/features/members/components/MembersManagement";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

function UsersPage() {
  return (
    <>
      <AdminTopbar title="Users" subtitle="User Management" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <MembersManagement />
      </div>
    </>
  );
}
