import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@workspace/api-client-react";
import { useSiteLogo } from "@/lib/useSiteLogo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  MapPin,
  CreditCard,
  Calendar,
  CalendarDays,
  UserSquare2,
  FileText,
  LogOut,
  Menu,
  ChevronLeft,
  UserPlus,
  BookOpen,
  ListChecks,
  BarChart3,
  Bell,
  X,
  Clock,
  Cake,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface AdminLayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = BASE.startsWith("/__replco")
  ? "/api"
  : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");

async function apiFetch(path: string) {
  const token = localStorage.getItem("yoga_token");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  return res.json();
}

interface NotifData {
  total: number;
  expiringMemberships: {
    enrollmentId: number;
    userName: string;
    membershipName: string;
    centerName: string;
    daysLeft: number;
    priority: string;
  }[];
  upcomingBirthdays: {
    userId: number;
    userName: string;
    daysLeft: number;
    isToday: boolean;
    priority: string;
  }[];
  debtSummary: { count: number; total: number };
}

function NotificationBell({ role }: { role: UserRole }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery<NotifData>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/notifications?daysAhead=10"),
    refetchInterval: 5 * 60 * 1000, // every 5 min
    staleTime: 2 * 60 * 1000,
  });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const expiring = data?.expiringMemberships ?? [];
  const birthdays = data?.upcomingBirthdays ?? [];
  const debtCount = data?.debtSummary.count ?? 0;
  const total = expiring.length + birthdays.length + (debtCount > 0 ? 1 : 0);

  const priorityColor = (p: string) =>
    p === "high" ? "text-red-500" : p === "medium" ? "text-amber-500" : "text-blue-500";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
      >
        <Bell className="w-4.5 h-4.5 text-muted-foreground" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card border border-border shadow-xl rounded-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Notifications</span>
              {total > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                  {total}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {total === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">All clear! No alerts.</p>
              </div>
            ) : (
              <>
                {/* Membership expiry alerts */}
                {expiring.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20 border-b border-border/30">
                      Memberships Expiring Soon
                    </div>
                    {expiring.map((e) => (
                      <div
                        key={e.enrollmentId}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 border-b border-border/20 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Clock className={`w-4 h-4 ${priorityColor(e.priority)}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{e.userName}</p>
                          <p className="text-xs text-muted-foreground truncate">{e.membershipName}</p>
                          <p className={`text-xs font-semibold mt-0.5 ${priorityColor(e.priority)}`}>
                            {e.daysLeft === 0
                              ? "⚡ Expires today!"
                              : e.daysLeft === 1
                              ? "⚡ Expires tomorrow"
                              : `Expires in ${e.daysLeft} days`}
                          </p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          {(e.centerName ?? "").split(" ")[0] || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Birthday alerts */}
                {birthdays.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20 border-b border-border/30">
                      Upcoming Birthdays 🎂
                    </div>
                    {birthdays.map((b) => (
                      <div
                        key={b.userId}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 border-b border-border/20 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0 mt-0.5">
                          <Cake className="w-4 h-4 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{b.userName}</p>
                          {b.isToday ? (
                            <p className="text-xs font-semibold text-pink-500">🎉 Birthday today! Wish them well</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Birthday in <span className="font-semibold text-foreground">{b.daysLeft} days</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Outstanding debts summary */}
                {debtCount > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/20 border-b border-border/30">
                      Outstanding Debts
                    </div>
                    <Link href={role === UserRole.super_admin ? "/super-admin/finance" : "/center-admin/finance"}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {debtCount} member{debtCount !== 1 ? "s" : ""} with outstanding debt
                          </p>
                          <p className="text-xs text-primary hover:underline">View financial reports →</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {total > 0 && (
            <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
              <Link href={role === UserRole.super_admin ? "/super-admin/finance" : "/center-admin/finance"}>
                <button
                  onClick={() => setOpen(false)}
                  className="text-xs text-primary hover:underline font-medium w-full text-center"
                >
                  View Financial Reports & Manage →
                </button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminLayout({ children, role }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const logoUrl = useSiteLogo();

  const superAdminLinks = [
    { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/centers', label: 'Centers & Branches', icon: MapPin },
    { href: '/super-admin/class-descriptions', label: 'Class & Description', icon: ListChecks },
    { href: '/super-admin/class-library', label: 'Class Library', icon: BookOpen },
    { href: '/super-admin/classes', label: 'Class Schedules', icon: Calendar },
    { href: '/super-admin/users', label: 'Users & Roles', icon: Users },
    { href: '/super-admin/memberships', label: 'Memberships', icon: CreditCard },
    { href: '/super-admin/enrollments', label: 'Enrollments', icon: UserSquare2 },
    { href: '/super-admin/add-admin', label: 'Add Admin', icon: UserPlus },
    { href: '/super-admin/teacher-schedules', label: 'Teacher Schedules', icon: CalendarDays },
    { href: '/super-admin/finance', label: 'Financial Reports', icon: BarChart3 },
    { href: '/super-admin/training-applications', label: 'Training Applications', icon: ClipboardList },
    { href: '/super-admin/content', label: 'Website Content', icon: FileText },
  ];

  const centerAdminLinks = [
    { href: '/center-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/center-admin/memberships', label: 'Memberships', icon: CreditCard },
    { href: '/center-admin/classes', label: 'Classes & Schedule', icon: Calendar },
    { href: '/center-admin/instructors', label: 'Instructors', icon: UserSquare2 },
    { href: '/center-admin/enrollments', label: 'Enrollments', icon: Users },
    { href: '/center-admin/finance', label: 'Financial Reports', icon: BarChart3 },
  ];

  const links = role === UserRole.super_admin ? superAdminLinks : centerAdminLinks;
  const basePath = role === UserRole.super_admin ? '/super-admin' : '/center-admin';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="h-20 flex items-center px-6 border-b border-border justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img src={logoUrl} alt="Logo" className="w-8 h-8" />
              <span className="font-serif font-bold text-primary truncate">YOGA LIFE INTL Admin</span>
            </Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
            <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Management
            </div>
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location === link.href || (location.startsWith(link.href) && link.href !== basePath);
              return (
                <Link key={link.href} href={link.href}>
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    {link.label}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {user?.fullName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar — always visible with bell */}
        <header className="h-16 bg-card border-b border-border flex items-center px-4 sm:px-6 shrink-0 justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg lg:hidden">
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-serif font-bold text-primary lg:hidden">YOGA LIFE INTL Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell role={role} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/30 relative">
          <img
            src={`${import.meta.env.BASE_URL}images/abstract-leaf.png`}
            alt="Decoration"
            className="absolute top-0 right-0 w-96 h-96 opacity-5 pointer-events-none -z-10 object-cover"
          />
          <div className="max-w-6xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
