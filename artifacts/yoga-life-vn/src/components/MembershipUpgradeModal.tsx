import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { useListMemberships, useCreateEnrollment } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Check, Wifi, MapPin, Sparkles, Zap, LogIn, X } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
  reason: "online" | "offline";
}

const TYPE_META: Record<string, { icon: any; color: string; badge?: string }> = {
  online: { icon: Wifi, color: "text-blue-600", badge: "Online" },
  offline: { icon: MapPin, color: "text-green-600", badge: "Studio" },
  both: { icon: Sparkles, color: "text-primary", badge: "Best Value" },
  drop_in: { icon: Zap, color: "text-orange-500", badge: "Drop-In" },
};

export function MembershipUpgradeModal({ open, onClose, reason }: Props) {
  const { user } = useAuth();
  const { t } = useLang();
  const m = t.memberships;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState<number | null>(null);

  const { data: membershipsData } = useListMemberships({});
  const createEnrollment = useCreateEnrollment();

  const plans = (membershipsData?.memberships || []).filter((p: any) =>
    p.isActive && p.centerId === 4
  );

  const handleSubscribe = async (plan: any) => {
    if (!user) return;
    setLoading(plan.id);
    try {
      await createEnrollment.mutateAsync({
        userId: user.id,
        membershipId: plan.id,
        startDate: new Date().toISOString(),
        amountPaid: plan.price,
      });
      await qc.invalidateQueries();
      toast({ title: "Membership activated!", description: `${plan.name} is now active.` });
      onClose();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message ?? "Please try again." });
    } finally {
      setLoading(null);
    }
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogTitle className="sr-only">Sign In Required</DialogTitle>
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold">Sign In Required</h2>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {reason === "online"
                ? "Sign in and choose an Online or Both membership to watch classes."
                : "Sign in and choose an Offline or Both membership to book studio classes."}
            </p>
          </div>
          <div className="p-6 flex flex-col gap-3">
            <Link href="/login" onClick={onClose}>
              <Button className="w-full h-11 rounded-xl"><LogIn className="w-4 h-4 mr-2" />Sign In</Button>
            </Link>
            <Link href="/register" onClick={onClose}>
              <Button variant="outline" className="w-full h-11 rounded-xl">Register Free</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Choose Your Membership</DialogTitle>
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-serif text-2xl font-bold">{m.upgradeTitle}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground">{m.upgradeDesc}</p>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          {plans.map((plan, idx) => {
            const meta = TYPE_META[plan.type] || TYPE_META.offline;
            const Icon = meta.icon;
            const isBest = plan.type === "both";
            const isDropIn = plan.type === "drop_in";
            const isRelevant =
              (reason === "online" && (plan.type === "online" || plan.type === "both")) ||
              (reason === "offline" && (plan.type === "offline" || plan.type === "both" || plan.type === "drop_in"));

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.07 }}
                className={`relative rounded-2xl border p-5 flex flex-col gap-3 transition-all ${
                  isBest
                    ? "border-primary shadow-lg shadow-primary/10 bg-primary/5"
                    : isRelevant
                    ? "border-border bg-card hover:border-primary/30"
                    : "border-border/50 bg-muted/30 opacity-60"
                }`}
              >
                {isBest && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                    Best Value
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl bg-background flex items-center justify-center border ${isBest ? "border-primary/30" : "border-border"}`}>
                    <Icon className={`w-4.5 h-4.5 ${meta.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-tight">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{meta.badge}</p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{(plan.price / 1000).toFixed(0)}k</span>
                  <span className="text-xs text-muted-foreground">VND {isDropIn ? m.perClass : m.perMonth}</span>
                </div>

                <ul className="space-y-1.5 flex-1">
                  {((): string[] => { try { const f = plan.features; return Array.isArray(f) ? f : JSON.parse(f || "[]"); } catch { return []; } })().slice(0, 4).map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  size="sm"
                  disabled={!isRelevant || loading === plan.id}
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full h-9 rounded-xl text-sm ${
                    isBest
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : isRelevant
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  {loading === plan.id ? "Processing…" : isDropIn ? m.dropInBtn : m.subscribeBtn}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-muted-foreground">{m.cancelAnytime}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
