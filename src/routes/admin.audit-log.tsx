import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AuditLogManagement } from "@/features/admin/features/audit-log/components/AuditLogManagement";

export const Route = createFileRoute("/admin/audit-log")({
  component: AuditLogPage,
});

function AuditLogPage() {
  return (
    <>
      <AdminTopbar title="Audit Log" subtitle="Admin Activity" />
      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:px-10">
        <AuditLogManagement />
      </div>
    </>
  );
}
