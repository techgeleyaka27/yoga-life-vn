import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSiteLogo } from "@/lib/useSiteLogo";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { useLogin, UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { User, ShieldCheck, Building2, Eye, EyeOff, Loader2 } from "lucide-react";

type LoginTab = "member" | "admin";
type AdminType = "center" | "super";

const ADMIN_HINTS = {
  center: {
    icon: Building2,
    label: "Center Admin",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    hint: "admin.hanoi@yogalifevn.com",
    description: "Manage your yoga center — classes, instructors & enrollments",
  },
  super: {
    icon: ShieldCheck,
    label: "Super Admin",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 border-violet-200",
    badge: "bg-violet-100 text-violet-700",
    hint: "kanteshnm.111@gmail.com",
    description: "Full platform control — all centers, content & settings",
  },
};

function LoginForm({
  role,
  adminType,
  onAdminTypeChange,
}: {
  role: LoginTab;
  adminType: AdminType;
  onAdminTypeChange: (t: AdminType) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { t } = useLang();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginMutation.mutateAsync({ data: { email, password } });
      login(res.user, res.token);
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      if (res.user.role === UserRole.super_admin) setLocation("/super-admin");
      else if (res.user.role === UserRole.center_admin) setLocation("/center-admin");
      else setLocation("/dashboard");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.message || "Invalid email or password. Please try again.",
      });
    }
  };

  const hint = role === "admin" ? ADMIN_HINTS[adminType] : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Admin Type Selector */}
      {role === "admin" && (
        <div className="grid grid-cols-2 gap-3 mb-2">
          {(["center", "super"] as AdminType[]).map((type) => {
            const cfg = ADMIN_HINTS[type];
            const Icon = cfg.icon;
            const active = adminType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onAdminTypeChange(type)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${
                  active
                    ? type === "center"
                      ? "border-emerald-400 bg-emerald-50 shadow-md"
                      : "border-violet-400 bg-violet-50 shadow-md"
                    : "border-border bg-muted/30 hover:bg-muted/60"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${cfg.color}`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Role badge */}
      {role === "admin" && hint && (
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${hint.bg}`}>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${hint.badge}`}>
            {hint.label}
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">{hint.description}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 bg-muted/40 border-border focus:ring-primary/20"
          placeholder={
            role === "admin"
              ? hint?.hint ?? "admin@yogalifevn.com"
              : "namaste@yogalife.vn"
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPwd ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 bg-muted/40 border-border pr-11 focus:ring-primary/20"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base rounded-xl font-semibold"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          `Sign In${role === "admin" ? ` as ${hint?.label ?? "Admin"}` : ""}`
        )}
      </Button>

      {role === "member" && (
        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Sign up free
          </Link>
        </p>
      )}
    </form>
  );
}

export default function Login() {
  const [tab, setTab] = useState<LoginTab>("member");
  const [adminType, setAdminType] = useState<AdminType>("center");
  const logoUrl = useSiteLogo();

  const tabs = [
    { id: "member" as LoginTab, label: "Member Login", icon: User },
    { id: "admin" as LoginTab, label: "Admin Login", icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:flex-none lg:w-[520px] xl:w-[560px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-[400px]"
        >
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-3 mb-10 group">
              <img src={logoUrl} alt="Yoga Life International" className="w-10 h-10 object-contain" />
              <span className="text-xl font-serif font-bold text-foreground tracking-tight">
                YOGA LIFE INTERNATIONAL
              </span>
            </div>
          </Link>

          <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Welcome back</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to your account to continue your journey.
          </p>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-muted rounded-xl mb-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  tab === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === "admin" ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <LoginForm
                role={tab}
                adminType={adminType}
                onAdminTypeChange={setAdminType}
              />
            </motion.div>
          </AnimatePresence>

          {/* Admin note */}
          {tab === "admin" && (
            <p className="text-xs text-center text-muted-foreground mt-6">
              Admin accounts are created by the Super Administrator.
              Contact your system admin for access.
            </p>
          )}
        </motion.div>
      </div>

      {/* Right panel — visual */}
      <div className="hidden lg:block relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/60" />
        <img
          className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60"
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Yoga practice"
        />
        {/* Overlay content */}
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="text-white max-w-md">
            <div className="flex gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-5 h-5 fill-yellow-300" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <blockquote className="text-xl font-serif italic leading-relaxed mb-4 text-white/95">
              "Yoga is not about touching your toes. It's about what you learn on the way down."
            </blockquote>
            <div>
              <p className="font-semibold text-white">Jigar Gor</p>
              <p className="text-white/70 text-sm">Yoga Philosophy</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
