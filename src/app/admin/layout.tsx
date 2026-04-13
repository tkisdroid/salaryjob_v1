import { requireAdmin } from "@/lib/dal";
import AdminSidebar from "./admin-sidebar";

/**
 * Admin layout — gate + shell.
 *
 * T-06-15: requireAdmin() here redirects non-ADMIN to /login?error=admin_required
 * before any child renders. Individual pages call requireAdmin() again for
 * defense-in-depth (layouts don't re-run on client-side navigation).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
