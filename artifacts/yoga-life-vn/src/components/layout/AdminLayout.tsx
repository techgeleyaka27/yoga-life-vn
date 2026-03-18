import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { UserRole } from "@workspace/api-client-react";
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
  BookOpen
} from "lucide-react";
import { useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
  role: UserRole;
}

export function AdminLayout({ children, role }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const superAdminLinks = [
    { href: '/super-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/super-admin/centers', label: 'Centers & Branches', icon: MapPin },
    { href: '/super-admin/class-library', label: 'Class Library', icon: BookOpen },
    { href: '/super-admin/classes', label: 'Class Schedules', icon: Calendar },
    { href: '/super-admin/users', label: 'Users & Roles', icon: Users },
    { href: '/super-admin/memberships', label: 'Memberships', icon: CreditCard },
    { href: '/super-admin/enrollments', label: 'Enrollments', icon: UserSquare2 },
    { href: '/super-admin/add-admin', label: 'Add Admin', icon: UserPlus },
    { href: '/super-admin/teacher-schedules', label: 'Teacher Schedules', icon: CalendarDays },
    { href: '/super-admin/content', label: 'Website Content', icon: FileText },
  ];

  const centerAdminLinks = [
    { href: '/center-admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/center-admin/memberships', label: 'Memberships', icon: CreditCard },
    { href: '/center-admin/classes', label: 'Classes & Schedule', icon: Calendar },
    { href: '/center-admin/instructors', label: 'Instructors', icon: UserSquare2 },
    { href: '/center-admin/enrollments', label: 'Enrollments', icon: Users },
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
              <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-8 h-8" />
              <span className="font-serif font-bold text-primary truncate">YOGA LIFE Admin</span>
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
        <header className="h-20 bg-card border-b border-border flex items-center px-4 sm:px-6 lg:hidden shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 mr-3 text-muted-foreground hover:bg-muted rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-serif font-bold text-lg text-primary">YOGA LIFE Admin</span>
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
