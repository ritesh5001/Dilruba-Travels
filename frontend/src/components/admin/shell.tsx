"use client";

import Image from "next/image";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  ExternalLink,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  PlaneTakeoff,
  Settings,
  Star,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { can, staffRoleNames, type Me, type Permission } from "@dilruba/shared/ops";
import { ApiError, adminFetch, clearAdminCache } from "@/lib/admin-api";
import { NotificationBell } from "./notification-bell";

// Each item shows only for roles with its permission (the server checks again on every request).
const nav: { href: string; label: string; icon: typeof LayoutDashboard; needs?: Permission }[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: Inbox, needs: "leads.read" },
  { href: "/admin/quotes", label: "Quotes", icon: FileText, needs: "leads.read" },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck, needs: "bookings.read" },
  { href: "/admin/departures", label: "Departures", icon: PlaneTakeoff, needs: "bookings.read" },
  { href: "/admin/customers", label: "Customers", icon: Users, needs: "customers.read" },
  { href: "/admin/suppliers", label: "Suppliers", icon: Truck, needs: "costs" },
  { href: "/admin/packages", label: "Packages", icon: Package, needs: "catalog.write" },
  { href: "/admin/reviews", label: "Reviews", icon: Star, needs: "catalog.write" },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, needs: "reports" },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone, needs: "reports" },
  { href: "/admin/staff", label: "Staff", icon: UserCog, needs: "staff" },
  { href: "/admin/settings", label: "Settings", icon: Settings, needs: "settings" },
];

const MeContext = createContext<Me | null>(null);

/** The logged-in person (null while loading). */
export function useMe() {
  return useContext(MeContext);
}

/** `can("payments.write")`: whether to show an action. False until the login check finishes. */
export function useCan() {
  const me = useMe();
  return (permission: Permission) => can(me?.role, permission);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [me, setMe] = useState<Me | null>(null);

  // Checked once when the panel opens (not on every page), in parallel with the page's own data:
  // waiting for it first added a full round trip to every click. Any page request that comes
  // back "not logged in" also sends the browser to the login page (see useAdminData).
  useEffect(() => {
    if (isLogin) return;
    adminFetch<Me>("/me")
      .then((m) => setMe({ id: m.id, name: m.name, email: m.email, role: m.role }))
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
    setMe(null);
    router.replace("/admin/login");
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <div className="flex min-h-full flex-1 flex-col bg-sand lg:flex-row">
      <aside className="border-b border-line bg-white print:hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5 lg:py-5">
          <Link href="/admin" className="flex items-center gap-2.5 font-display text-lg font-semibold">
            <Image src="/brand/logo-badge.webp" alt="" width={512} height={512} className="size-10 lg:size-12" />
            <span>Dilruba <span className="text-brand">CRM</span></span>
          </Link>
          <div className="flex items-center gap-1">
            {me && <NotificationBell />}
            <button type="button" onClick={logout} className="inline-flex items-center gap-1.5 px-2 text-sm text-muted hover:text-ink lg:hidden">
              <LogOut className="size-4" aria-hidden /> Log out
            </button>
          </div>
        </div>
        <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-3 lg:pb-0">
          {nav.filter((n) => !n.needs || can(me?.role, n.needs)).map(({ href, label, icon: Icon }) => (
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
          <p className="truncate text-sm font-medium" title={me?.email ?? ""}>{me?.name ?? " "}</p>
          <p className="truncate text-xs text-muted">{me ? staffRoleNames[me.role] : " "}</p>
          <button type="button" onClick={logout} className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8 print:p-0">
        <MeContext value={me}>{children}</MeContext>
      </main>
    </div>
  );
}
