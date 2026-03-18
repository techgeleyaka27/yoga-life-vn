import { Navbar } from "@/components/layout/Navbar";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { useListMemberships, useListEnrollments, useCreateEnrollment } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Wifi, MapPin, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const parseFeatures = (features: any): string[] => {
  if (Array.isArray(features)) return features;
  try { return JSON.parse(features || "[]"); } catch { return []; }
};

const TYPE_META: Record<string, { icon: any; color: string; bgColor: string; label: string; order: number }> = {
  online: { icon: Wifi, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200", label: "Online Only", order: 1 },
  offline: { icon: MapPin, color: "text-green-600", bgColor: "bg-green-50 border-green-200", label: "In-Studio", order: 2 },
  both: { icon: Sparkles, color: "text-primary", bgColor: "bg-primary/5 border-primary/20", label: "Online + Studio", order: 3 },
  drop_in: { icon: Zap, color: "text-orange-500", bgColor: "bg-orange-50 border-orange-200", label: "Drop-In", order: 4 },
};

export default function Memberships() {
  const { t } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState<number | null>(null);

  const { data, isLoading } = useListMemberships();
  const { data: enrollmentsData } = useListEnrollments(
    { userId: user?.id },
    { query: { enabled: !!user } }
  );
  const createEnrollment = useCreateEnrollment();

  const activeTypes = new Set(
    (enrollmentsData?.enrollments || [])
      .filter((e: any) => e.status === "active")
      .map((e: any) => e.membershipType)
  );

  const handleSubscribe = async (plan: any) => {
    if (!user) return;
    setLoading(plan.id);
    try {
      await createEnrollment.mutateAsync({
        data: {
          userId: user.id,
          membershipId: plan.id,
          startDate: new Date().toISOString(),
          amountPaid: plan.price,
        }
      });
      await qc.invalidateQueries();
      toast({ title: "Membership activated!", description: `${plan.name} is now active on your account.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message ?? "Please try again." });
    } finally {
      setLoading(null);
    }
  };

  const platformPlans = (data?.memberships || [])
    .filter(p => p.isActive && p.centerId === 4)
    .sort((a, b) => (TYPE_META[(a as any).type]?.order ?? 5) - (TYPE_META[(b as any).type]?.order ?? 5));

  const centerPlans = (data?.memberships || [])
    .filter(p => p.isActive && p.centerId !== 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">{t.memberships.title}</h1>
          <p className="text-lg text-muted-foreground">{t.memberships.subtitle}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Platform-level plans */}
            {platformPlans.length > 0 && (
              <div className="mb-20">
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-serif font-bold mb-2">Access Plans</h2>
                  <p className="text-muted-foreground">Choose how you want to practice — online, in-studio, or both.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
                  {platformPlans.map((plan, idx) => {
                    const type = (plan as any).type as string;
                    const meta = TYPE_META[type] || TYPE_META.offline;
                    const Icon = meta.icon;
                    const isBest = type === "both";
                    const isDropIn = type === "drop_in";
                    const alreadyActive = activeTypes.has(type);

                    return (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={isBest ? "lg:-mt-4 lg:mb-4" : ""}
                      >
                        <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                          isBest ? "border-primary shadow-lg shadow-primary/10" : "border-border/50"
                        }`}>
                          {isBest && (
                            <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-bold text-center py-1.5 uppercase tracking-wider">
                              {t.memberships.mostPopular}
                            </div>
                          )}
                          <CardHeader className={`pb-4 ${isBest ? "pt-12" : "pt-6"}`}>
                            <div className={`w-12 h-12 rounded-2xl ${meta.bgColor} border flex items-center justify-center mb-4`}>
                              <Icon className={`w-6 h-6 ${meta.color}`} />
                            </div>
                            <CardTitle className="font-serif text-xl leading-tight">{plan.name}</CardTitle>
                            <div className="mt-3">
                              <span className="text-3xl font-bold">{(plan.price / 1000).toFixed(0)}k</span>
                              <span className="text-muted-foreground text-sm"> VND{isDropIn ? ` / class` : ` / ${plan.durationDays} days`}</span>
                            </div>
                          </CardHeader>
                          <CardContent className="px-6 py-2">
                            <ul className="space-y-3">
                              {parseFeatures(plan.features).map((feature, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground text-sm">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                          <CardFooter className="p-6 pt-4">
                            {alreadyActive ? (
                              <div className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                {t.memberships.alreadyMember}
                              </div>
                            ) : user ? (
                              <Button
                                className={`w-full h-11 rounded-xl text-sm ${
                                  isBest ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-foreground text-background hover:bg-foreground/90"
                                }`}
                                disabled={loading === plan.id}
                                onClick={() => handleSubscribe(plan)}
                              >
                                {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : isDropIn ? t.memberships.dropInBtn : t.memberships.subscribeBtn}
                              </Button>
                            ) : (
                              <Link href="/login" className="w-full">
                                <Button className={`w-full h-11 rounded-xl text-sm ${
                                  isBest ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                                }`}>
                                  {t.memberships.choosePlan}
                                </Button>
                              </Link>
                            )}
                          </CardFooter>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Center-specific plans */}
            {centerPlans.length > 0 && (
              <div>
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-serif font-bold mb-2">Center Memberships</h2>
                  <p className="text-muted-foreground">Local plans offered at individual centers.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center">
                  {centerPlans.map((plan, idx) => {
                    const isPopular = idx === 1 || plan.name.toLowerCase().includes("premium");
                    return (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={isPopular ? "lg:-mt-8 lg:mb-8" : ""}
                      >
                        <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                          isPopular ? "border-primary shadow-lg shadow-primary/10" : "border-border/50"
                        }`}>
                          {isPopular && (
                            <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-bold text-center py-1.5 uppercase tracking-wider">
                              {t.memberships.mostPopular}
                            </div>
                          )}
                          <CardHeader className={`pt-10 pb-4 ${isPopular ? "pt-12" : ""}`}>
                            <CardTitle className="font-serif text-2xl text-center">{plan.name}</CardTitle>
                            <div className="text-center mt-4">
                              <span className="text-4xl font-bold">{(plan.price / 1000).toFixed(0)}k</span>
                              <span className="text-muted-foreground"> VND / {plan.durationDays} {t.memberships.days}</span>
                            </div>
                            {plan.centerName && (
                              <p className="text-center text-sm text-primary font-medium mt-2">{plan.centerName}</p>
                            )}
                          </CardHeader>
                          <CardContent className="px-6 py-4">
                            <ul className="space-y-4">
                              {parseFeatures(plan.features).map((feature, i) => (
                                <li key={i} className="flex items-start">
                                  <Check className="w-5 h-5 text-primary shrink-0 mr-3 mt-0.5" />
                                  <span className="text-muted-foreground text-sm leading-relaxed">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                          <CardFooter className="p-6 pt-2">
                            <Link href="/login" className="w-full">
                              <Button className={`w-full h-12 rounded-xl text-base ${
                                isPopular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                              }`}>
                                {t.memberships.choosePlan}
                              </Button>
                            </Link>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
