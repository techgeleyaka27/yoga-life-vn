import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { useLogin, UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      
      // Redirect based on role
      if (res.user.role === UserRole.super_admin) setLocation('/super-admin');
      else if (res.user.role === UserRole.center_admin) setLocation('/center-admin');
      else setLocation('/dashboard');
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Login Failed", 
        description: err.message || "Invalid credentials. Please try again." 
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto w-full max-w-sm lg:w-96"
        >
          <div className="mb-8">
            <Link href="/">
              <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="h-12 w-auto mb-6" />
            </Link>
            <h2 className="text-3xl font-serif font-bold text-foreground">{t.auth.welcomeBack}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.auth.noAccount} <Link href="/register" className="font-medium text-primary hover:underline">{t.auth.signUpFree}</Link>
            </p>
          </div>

          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.emailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="h-12 bg-muted/50 border-border focus:ring-primary/20"
                    placeholder="namaste@yogalife.vn"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                    <a href="#" className="text-sm font-medium text-primary hover:underline">{t.auth.forgotPassword}</a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="h-12 bg-muted/50 border-border focus:ring-primary/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 text-base rounded-xl"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? t.auth.signingIn : t.auth.signIn}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <div className="hidden lg:block relative w-0 flex-1">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Spa towels and stones"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
      </div>
    </div>
  );
}
