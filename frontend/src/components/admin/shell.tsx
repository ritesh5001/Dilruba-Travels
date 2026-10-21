"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck, ExternalLink, Inbox, LayoutDashboard, LogOut, Package, Users } from "lucide-react";
import { ApiError, adminFetch, clearAdminCache } from "@/lib/admin-api";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: Inbox },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/packages", label: "Packages", icon: Package },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [email, setEmail] = useState<string | null>(null);

  // Checked once when the panel opens (not on every page), in parallel with the page's own data:
  // waiting for it first added a full round trip to every click. Any page request that comes
  // back "not logged in" also sends the browser to the login page (see useAdminData).
  useEffect(() => {
    if (isLogin) return;
    adminFetch<{ email: string }>("/me")
      .then((me) => setEmail(me.email))
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace(`/admin/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        }
        // Network trouble: the page's own request shows the error and a Retry button.
      });
  }, [isLogin, router]);

  if (isLogin) return <div className="flex min-h-full flex-1 items-center justify-center bg-sand p-4">{children}</div>;

  async function logout() {
    await adminFetch("/logout", { method: "POST" }).catch(() => {});
    clearAdminCache();
    setEmail(null);
    router.replace("/admin/login");
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="flex min-h-full flex-1 flex-col bg-sand lg:flex-row">
      <aside className="border-b border-line bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-5">
          <Link href="/admin" className="font-display text-lg font-semibold">
            Dilruba <span className="text-brand">CRM</span>
          </Link>
          <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink lg:hidden">
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </div>
        <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive(href) ? "bg-ink text-white" : "text-ink/70 hover:bg-sand hover:text-ink"
              }`}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
          <Link href="/" target="_blank" className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink/60 hover:bg-sand hover:text-ink lg:mt-auto">
            <ExternalLink className="size-4" aria-hidden /> View website
          </Link>
        </nav>
        <div className="hidden border-t border-line px-5 py-4 lg:block">
          <p className="truncate text-xs text-muted" title={email ?? ""}>{email ?? " "}</p>
          <button type="button" onClick={logout} className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
