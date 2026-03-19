import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useSiteLogo } from "@/lib/useSiteLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_ORIGIN = BASE.startsWith("/__replco")
  ? "/api"
  : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const logoUrl = useSiteLogo();
  const { toast } = useToast();

  const token = new URLSearchParams(window.location.search).get("token") || "";

  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    fetch(`${API_ORIGIN}/auth/verify-reset-token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        setTokenValid(d.valid);
        if (d.email) setUserEmail(d.email);
      })
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Please make sure both passwords are the same." });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: "destructive", title: "Too short", description: "Password must be at least 8 characters." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_ORIGIN}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      setDone(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: err.message || "Please request a new link." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:flex-none lg:w-[520px] xl:w-[560px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-[400px]"
        >
          <Link href="/">
            <div className="flex items-center gap-3 mb-10">
              <img src={logoUrl} alt="Yoga Life International" className="w-10 h-10 object-contain" />
              <span className="text-xl font-serif font-bold text-foreground tracking-tight">
                YOGA LIFE INTERNATIONAL
              </span>
            </div>
          </Link>

          {tokenValid === null && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying your reset link...</p>
            </div>
          )}

          {tokenValid === false && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-serif font-bold mb-3">Link expired or invalid</h1>
              <p className="text-muted-foreground text-sm mb-8">
                This password reset link has expired or already been used. Please request a new one.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full mb-3">Request New Link</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />Back to Sign In
                </Button>
              </Link>
            </div>
          )}

          {tokenValid === true && done && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold mb-3">Password updated!</h1>
              <p className="text-muted-foreground text-sm mb-8">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <Button className="w-full" onClick={() => setLocation("/login")}>Sign In Now</Button>
            </div>
          )}

          {tokenValid === true && !done && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Set new password</h1>
              {userEmail && (
                <p className="text-muted-foreground text-sm mb-6">
                  Resetting password for <strong>{userEmail}</strong>
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPwd ? "text" : "password"}
                      required
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-12 bg-muted/40 pr-11"
                      placeholder="Min. 8 characters"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPwd ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`h-12 bg-muted/40 ${confirmPassword && newPassword !== confirmPassword ? "border-red-400" : ""}`}
                    placeholder="Repeat your password"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords don't match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl font-semibold text-base"
                  disabled={loading || (!!confirmPassword && newPassword !== confirmPassword)}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />Updating...
                    </span>
                  ) : "Reset Password"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>

      <div className="hidden lg:block relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/60" />
        <img
          className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60"
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Yoga"
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white p-12">
          <div className="text-center max-w-sm">
            <h2 className="text-3xl font-serif font-bold mb-4">A fresh beginning</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              Secure your account and get back to your practice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
