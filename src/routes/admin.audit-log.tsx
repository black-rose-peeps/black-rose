import { createFileRoute } from "@tanstack/react-router";
import { AdminTopbar } from "@/features/admin/components/AdminTopbar";
import { AdminPageContent } from "@/features/admin/components/AdminPageContent";
import { AuditLogManagement } from "@/features/admin/features/audit-log/components/AuditLogManagement";

export const Route = createFileRoute("/admin/audit-log")({
  component: AuditLogPage,
});

function AuditLogPage() {
  return (
    <>
      <AdminTopbar title="Audit Log" subtitle="Admin Activity" />
      <AdminPageContent>
        <AuditLogManagement />
      </AdminPageContent>
    </>
  );
}
