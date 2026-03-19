import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp, AlertTriangle, DollarSign, Users, Building2,
  CheckCircle, Search, ChevronDown, ChevronUp,
  Banknote, CreditCard, RefreshCw, BarChart3,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = BASE.startsWith("/__replco")
  ? "/api"
  : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("yoga_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

const VND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n * 1000);

interface DebtRecord {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  membershipName: string;
  centerName: string;
  debtAmount: number;
  amountPaid: number;
  membershipPrice: number;
  status: string;
  createdAt: string;
  paymentMethod?: string;
}

interface ReportData {
  summary: { totalRevenue: number; totalDebt: number; totalEnrollments: number; activeEnrollments: number };
  debts: DebtRecord[];
  centerBreakdown: { centerId: number; centerName: string; revenue: number; debt: number; enrollments: number }[];
  monthlyRevenue: { month: string; revenue: number; enrollments: number }[];
  paymentMethods: Record<string, number>;
  recentTransactions: DebtRecord[];
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function RecoverDebtDialog({ debt, open, onClose }: {
  debt: DebtRecord | null; open: boolean; onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/finance/recover-debt/${debt!.id}`, {
        method: "POST",
        body: JSON.stringify({ amountRecovered: Number(amount) || debt!.debtAmount, note }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["finance-reports-center"] });
      toast({ title: "Debt recovered", description: `Recorded for ${debt?.userFullName}` });
      onClose(); setAmount(""); setNote("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  if (!debt) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Recover Debt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
              {debt.userFullName.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-sm">{debt.userFullName}</p>
              <p className="text-xs text-muted-foreground">{debt.userEmail}</p>
              <p className="text-xs text-muted-foreground">{debt.membershipName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
              <p className="text-lg font-bold text-destructive">{VND(debt.debtAmount)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <p className="text-xs text-muted-foreground mb-1">Already Paid</p>
              <p className="text-lg font-bold text-emerald-600">{VND(debt.amountPaid)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Amount to Recover (thousands VND)</Label>
            <Input type="number" min={1} max={debt.debtAmount} placeholder={`Max: ${debt.debtAmount.toLocaleString()}`} value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input placeholder="e.g. Cash payment received…" value={note} onChange={(e) => setNote(e.target.value)} className="h-11" />
          </div>
          <div className="flex gap-3">
            <Button className="flex-1 gap-2" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              <CheckCircle className="w-4 h-4" />
              {mutation.isPending ? "Processing…" : "Confirm Recovery"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CenterAdminFinancialReports() {
  const { user } = useAuth();
  const [debtSearch, setDebtSearch] = useState("");
  const [showAllDebts, setShowAllDebts] = useState(false);
  const [recoveringDebt, setRecoveringDebt] = useState<DebtRecord | null>(null);

  const centerId = (user as any)?.centerId;

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["finance-reports-center", centerId],
    queryFn: () => apiFetch(`/finance/reports${centerId ? `?centerId=${centerId}` : ""}`),
    refetchInterval: 60000,
  });

  const report = data;
  const debts = (report?.debts ?? []).filter(
    (d) => !debtSearch || d.userFullName.toLowerCase().includes(debtSearch.toLowerCase())
  );
  const visibleDebts = showAllDebts ? debts : debts.slice(0, 6);
  const maxRevenue = Math.max(...(report?.monthlyRevenue ?? []).map((m) => m.revenue), 1);

  return (
    <AdminLayout role={UserRole.center_admin}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue overview, outstanding debts & debt recovery</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted/40 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Total Revenue" value={VND(report?.summary.totalRevenue ?? 0)} sub="All time collected" color="bg-emerald-100 text-emerald-600" />
              <StatCard icon={AlertTriangle} label="Outstanding Debt" value={VND(report?.summary.totalDebt ?? 0)} sub={`${report?.debts.length ?? 0} members`} color="bg-red-100 text-red-500" />
              <StatCard icon={Users} label="Enrollments" value={(report?.summary.totalEnrollments ?? 0).toLocaleString()} sub={`${report?.summary.activeEnrollments ?? 0} active`} color="bg-blue-100 text-blue-600" />
              <StatCard icon={TrendingUp} label="Collection Rate" value={report?.summary.totalRevenue ? `${Math.round((report.summary.totalRevenue / (report.summary.totalRevenue + report.summary.totalDebt)) * 100)}%` : "—"} color="bg-violet-100 text-violet-600" />
            </div>

            {/* Monthly bar chart */}
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Monthly Revenue (last 6 months)</h2>
              </div>
              <div className="flex items-end gap-2 h-36">
                {(report?.monthlyRevenue ?? []).map((m) => {
                  const pct = (m.revenue / maxRevenue) * 100;
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">{m.revenue > 0 ? `${(m.revenue / 1000).toFixed(0)}K` : "—"}</span>
                      <div className="w-full flex items-end justify-center h-24">
                        <div className="w-full max-w-[32px] rounded-t-md bg-primary/70 hover:bg-primary transition-colors" style={{ height: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outstanding Debts */}
            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Outstanding Debts</h2>
                    <p className="text-xs text-muted-foreground">{report?.debts.length ?? 0} members · {VND(report?.summary.totalDebt ?? 0)}</p>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={debtSearch} onChange={(e) => setDebtSearch(e.target.value)} placeholder="Search member…" className="pl-8 h-8 text-sm w-44" />
                </div>
              </div>
              {debts.length === 0 ? (
                <div className="text-center py-10"><CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No outstanding debts</p></div>
              ) : (
                <>
                  <div className="divide-y divide-border/50">
                    {visibleDebts.map((debt) => (
                      <div key={debt.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{debt.userFullName.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{debt.userFullName}</p>
                          <p className="text-xs text-muted-foreground">{debt.userEmail} · {debt.membershipName}</p>
                        </div>
                        <p className="text-sm font-bold text-destructive shrink-0">{VND(debt.debtAmount)}</p>
                        <Button size="sm" className="shrink-0 gap-1 h-8 text-xs" onClick={() => setRecoveringDebt(debt)}>
                          <RefreshCw className="w-3 h-3" />Recover
                        </Button>
                      </div>
                    ))}
                  </div>
                  {debts.length > 6 && (
                    <div className="p-3 text-center border-t border-border/50">
                      <Button variant="ghost" size="sm" onClick={() => setShowAllDebts(!showAllDebts)} className="text-xs gap-1">
                        {showAllDebts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {showAllDebts ? "Show less" : `Show ${debts.length - 6} more`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Recent Transactions */}
            <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-5 border-b border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Banknote className="w-4 h-4 text-primary" /></div>
                <h2 className="font-semibold text-sm">Recent Transactions</h2>
              </div>
              <div className="divide-y divide-border/50">
                {(report?.recentTransactions ?? []).map((tx) => (
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.debtAmount > 0 ? "bg-amber-100" : "bg-emerald-100"}`}>
                      <CreditCard className={`w-4 h-4 ${tx.debtAmount > 0 ? "text-amber-600" : "text-emerald-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.userFullName}</p>
                      <p className="text-xs text-muted-foreground">{tx.membershipName} · {new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-600">+{VND(tx.amountPaid)}</p>
                      {tx.debtAmount > 0 && <p className="text-xs text-destructive">Debt: {VND(tx.debtAmount)}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <RecoverDebtDialog debt={recoveringDebt} open={!!recoveringDebt} onClose={() => setRecoveringDebt(null)} />
    </AdminLayout>
  );
}
