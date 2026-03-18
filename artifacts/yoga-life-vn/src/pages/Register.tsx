import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { useRegister, UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Register() {
  const [formData, setFormData] = useState({ email: "", password: "", fullName: "", phone: "" });
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { t: tl } = useLang();
  const { toast } = useToast();
  
  const registerMutation = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await registerMutation.mutateAsync({ data: formData });
      login(res.user, res.token);
      toast({ title: "Account created!", description: "Welcome to Yoga Life VN." });
      setLocation('/dashboard');
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Registration Failed", 
        description: err.message || "Please check your details and try again." 
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:block relative w-0 flex-1">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Spa aesthetic"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto w-full max-w-sm lg:w-[400px]"
        >
          <div className="mb-8">
            <Link href="/">
              <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="h-12 w-auto mb-6" />
            </Link>
            <h2 className="text-3xl font-serif font-bold text-foreground">{tl.auth.createAccount}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {tl.auth.haveAccount} <Link href="/login" className="font-medium text-primary hover:underline">{tl.auth.signInHere}</Link>
            </p>
          </div>

          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">{tl.auth.fullName}</Label>
                  <Input 
                    id="fullName" 
                    required 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    className="h-11 bg-muted/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{tl.auth.emailLabel}</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="h-11 bg-muted/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{tl.auth.phone}</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="h-11 bg-muted/50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{tl.auth.passwordLabel}</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="h-11 bg-muted/50" 
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 mt-2 text-base rounded-xl"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? tl.auth.creatingAccount : tl.auth.createAccountBtn}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
