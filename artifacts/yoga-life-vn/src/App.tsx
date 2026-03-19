import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { LangProvider } from "@/lib/lang-context";
import { UserRole } from "@workspace/api-client-react";

// Public Pages
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Memberships from "@/pages/Memberships";
import Centers from "@/pages/Centers";
import ClassesPage from "@/pages/Classes";
import OnlineClasses from "@/pages/OnlineClasses";
import NotFound from "@/pages/not-found";

// Student Pages
import StudentDashboard from "@/pages/student/Dashboard";

// Super Admin Pages
import SuperAdminDashboard from "@/pages/super-admin/Dashboard";
import AdminCenters from "@/pages/super-admin/Centers";
import AdminUsers from "@/pages/super-admin/Users";
import AdminMemberships from "@/pages/super-admin/Memberships";
import AdminContent from "@/pages/super-admin/Content";
import AdminClasses from "@/pages/super-admin/Classes";
import AdminClassLibrary from "@/pages/super-admin/ClassLibrary";
import AdminClassDescriptions from "@/pages/super-admin/ClassDescriptions";
import AdminFinancialReports from "@/pages/super-admin/FinancialReports";
import AdminTrainingApplications from "@/pages/super-admin/TrainingApplications";
import CenterAdminFinancialReports from "@/pages/center-admin/FinancialReports";
import AdminEnrollments from "@/pages/super-admin/Enrollments";
import AdminAddAdmin from "@/pages/super-admin/AddAdmin";
import AdminTeacherSchedules from "@/pages/super-admin/TeacherSchedules";
import PersonalTraining from "@/pages/PersonalTraining";

// Center Admin Pages
import CenterAdminDashboard from "@/pages/center-admin/Dashboard";
import CenterAdminClasses from "@/pages/center-admin/Classes";
import CenterAdminMemberships from "@/pages/center-admin/Memberships";
import CenterAdminEnrollments from "@/pages/center-admin/Enrollments";
import CenterAdminInstructors from "@/pages/center-admin/Instructors";

// Auto-inject auth token on all API requests
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  if (url.startsWith('/api')) {
    const token = localStorage.getItem('yoga_token');
    if (token) {
      init = { ...init };
      const headers = new Headers(init.headers as HeadersInit | undefined);
      headers.set('Authorization', `Bearer ${token}`);
      init.headers = headers;
    }
  }
  return originalFetch(input, init);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse font-serif text-2xl text-primary">Namaste...</div>
    </div>
  );

  if (!user) return <Redirect to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Redirect to="/dashboard" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/memberships" component={Memberships} />
      <Route path="/centers" component={Centers} />
      <Route path="/classes" component={ClassesPage} />
      <Route path="/online-classes" component={OnlineClasses} />
      <Route path="/personal-training" component={PersonalTraining} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Student */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={StudentDashboard} allowedRoles={[UserRole.student, UserRole.center_admin, UserRole.super_admin]} />}
      </Route>

      {/* Super Admin */}
      <Route path="/super-admin">
        {() => <ProtectedRoute component={SuperAdminDashboard} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/centers">
        {() => <ProtectedRoute component={AdminCenters} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/users">
        {() => <ProtectedRoute component={AdminUsers} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/memberships">
        {() => <ProtectedRoute component={AdminMemberships} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/content">
        {() => <ProtectedRoute component={AdminContent} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/class-descriptions">
        {() => <ProtectedRoute component={AdminClassDescriptions} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/class-library">
        {() => <ProtectedRoute component={AdminClassLibrary} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/classes">
        {() => <ProtectedRoute component={AdminClasses} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/enrollments">
        {() => <ProtectedRoute component={AdminEnrollments} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/add-admin">
        {() => <ProtectedRoute component={AdminAddAdmin} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/teacher-schedules">
        {() => <ProtectedRoute component={AdminTeacherSchedules} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/finance">
        {() => <ProtectedRoute component={AdminFinancialReports} allowedRoles={[UserRole.super_admin]} />}
      </Route>
      <Route path="/super-admin/training-applications">
        {() => <ProtectedRoute component={AdminTrainingApplications} allowedRoles={[UserRole.super_admin]} />}
      </Route>

      {/* Center Admin */}
      <Route path="/center-admin">
        {() => <ProtectedRoute component={CenterAdminDashboard} allowedRoles={[UserRole.center_admin, UserRole.super_admin]} />}
      </Route>
      <Route path="/center-admin/classes">
        {() => <ProtectedRoute component={CenterAdminClasses} allowedRoles={[UserRole.center_admin, UserRole.super_admin]} />}
      </Route>
      <Route path="/center-admin/memberships">
        {() => <ProtectedRoute component={CenterAdminMemberships} allowedRoles={[UserRole.center_admin, UserRole.super_admin]} />}
      </Route>
      <Route path="/center-admin/enrollments">
        {() => <ProtectedRoute component={CenterAdminEnrollments} allowedRoles={[UserRole.center_admin, UserRole.super_admin]} />}
      </Route>
      <Route path="/center-admin/instructors">
        {() => <ProtectedRoute component={CenterAdminInstructors} allowedRoles={[UserRole.center_admin, UserRole.super_admin]} />}
      </Route>
      <Route path="/center-admin/finance">
        {() => <ProtectedRoute component={CenterAdminFinancialReports} allowedRoles={[UserRole.center_admin, UserRole.super_admin]} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function hexToHsl(hex: string): string | null {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function BrandSettingsLoader() {
  useEffect(() => {
    const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
    fetch(`${base}/api/cms/settings`)
      .then(r => r.json())
      .then(({ settings }) => {
        if (!settings) return;
        const root = document.documentElement;
        if (settings.primaryColor) {
          const raw = settings.primaryColor as string;
          // Convert hex to HSL tuple (required by Tailwind CSS vars)
          const hsl = raw.startsWith("#") ? hexToHsl(raw) : raw;
          if (hsl) {
            root.style.setProperty("--primary", hsl);
            root.style.setProperty("--ring", hsl);
            root.style.setProperty("--sidebar-primary", hsl);
            root.style.setProperty("--sidebar-ring", hsl);
          }
        }
        if (settings.fontUrl && settings.fontName) {
          const existingLink = document.getElementById("dynamic-font");
          if (existingLink) existingLink.remove();
          const link = document.createElement("link");
          link.id = "dynamic-font";
          link.rel = "stylesheet";
          link.href = settings.fontUrl;
          document.head.appendChild(link);
          if (settings.fontSans) root.style.setProperty("--font-sans", settings.fontSans);
          if (settings.fontSerif) root.style.setProperty("--font-serif", settings.fontSerif);
        }
      })
      .catch(() => {});
  }, []);
  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <AuthProvider>
          <TooltipProvider>
            <BrandSettingsLoader />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </LangProvider>
    </QueryClientProvider>
  );
}
