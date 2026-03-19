import { useState } from "react";
import { Link } from "wouter";
import { useSiteLogo } from "@/lib/useSiteLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_ORIGIN = BASE.startsWith("/__replco")
  ? "/api"
  : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const logoUrl = useSiteLogo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_ORIGIN}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSent(true);
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
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

          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-serif font-bold text-foreground mb-3">Check your inbox</h1>
              <p className="text-muted-foreground text-sm mb-2">
                If an account is registered with <strong>{email}</strong>, you'll receive a password reset link shortly.
              </p>
              <p className="text-muted-foreground text-xs mb-8">
                The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" />Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Mail className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Forgot password?</h1>
              <p className="text-muted-foreground text-sm mb-8">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-muted/40"
                    placeholder="your@email.com"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full h-12 rounded-xl font-semibold text-base" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />Sending...
                    </span>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <Link href="/login">
                  <Button variant="ghost" className="w-full gap-2 text-muted-foreground">
                    <ArrowLeft className="w-4 h-4" />Back to Sign In
                  </Button>
                </Link>
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
            <h2 className="text-3xl font-serif font-bold mb-4">Your journey continues</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              We'll help you get back on your mat. A fresh start is always possible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
