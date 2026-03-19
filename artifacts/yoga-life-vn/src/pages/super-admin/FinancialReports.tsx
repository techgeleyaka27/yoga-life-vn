import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, AlertTriangle, DollarSign, Users, Building2,
  CheckCircle, Search, ChevronDown, ChevronUp, ArrowLeft,
  Banknote, CreditCard, RefreshCw, BarChart3, MapPin,
  Percent, ArrowUpRight, ChevronRight,
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

const SHORT = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}M`;
  if (n >= 100) return `${Math.round(n)}K`;
  return `${n}K`;
};

interface TxRecord {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  userPhone: string;
  membershipName: string;
  membershipPrice: number;
  centerId: number;
  centerName: string;
  debtAmount: number;
  amountPaid: number;
  status: string;
  paymentMethod: string;
  salesPerson: string;
  createdAt: string;
  startDate: string;
  endDate: string;
}

interface ReportData {
  summary: { totalRevenue: number; totalDebt: number; totalEnrollments: number; activeEnrollments: number };
  debts: TxRecord[];
  centerBreakdown: { centerId: number; centerName: string; revenue: number; debt: number; enrollments: number }[];
  monthlyRevenue: { month: string; revenue: number; enrollments: number }[];
  paymentMethods: Record<string, number>;
  recentTransactions: TxRecord[];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: any; label: string; value: string; sub?: string; color: string; trend?: string;
}) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MiniBarChart({ data, color = "bg-primary" }: {
  data: { month: string; revenue: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map(d => (
        <div
          key={d.month}
          className={`flex-1 rounded-sm ${color} opacity-70`}
          style={{ height: `${Math.max((d.revenue / max) * 100, 4)}%` }}
          title={`${d.month}: ${VND(d.revenue)}`}
        />
      ))}
    </div>
  );
}

function BarChart({ data }: { data: { month: string; revenue: number; enrollments: number }[] }) {
  const max = Math.max(...data.map(d => d.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map(m => {
        const pct = (m.revenue / max) * 100;
        return (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground font-medium">
              {m.revenue > 0 ? SHORT(m.revenue) : "—"}
            </span>
            <div className="w-full flex items-end justify-center h-24">
              <div
                className="w-full max-w-[36px] rounded-t-md bg-primary/70 hover:bg-primary transition-colors"
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${m.month}: ${VND(m.revenue)}`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{m.month}</span>
          </div>
        );
      })}
    </div>
  );
}

function RecoverDebtDialog({ debt, open, onClose }: {
  debt: TxRecord | null; open: boolean; onClose: () => void;
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
    onSuccess: data => {
      qc.invalidateQueries({ queryKey: ["finance-reports"] });
      toast({
        title: "Debt recovered",
        description: `${VND(data.amountRecovered || 0)} recorded for ${debt?.userFullName}`,
      });
      onClose(); setAmount(""); setNote("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  if (!debt) return null;
  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
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
              <p className="text-xs text-muted-foreground">{debt.membershipName} · {debt.centerName}</p>
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
            <Input type="number" min={1} max={debt.debtAmount}
              placeholder={`Max: ${debt.debtAmount.toLocaleString()}`}
              value={amount} onChange={e => setAmount(e.target.value)} className="h-11" />
            <p className="text-xs text-muted-foreground">Leave empty to recover the full amount ({VND(debt.debtAmount)})</p>
          </div>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input placeholder="e.g. Cash payment received, Bank transfer #123…"
              value={note} onChange={e => setNote(e.target.value)} className="h-11" />
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

// ─── Center Card (overview grid) ─────────────────────────────────────────────

const CENTER_COLORS = [
  { bg: "from-primary/5 to-primary/10", ring: "border-primary/20", bar: "bg-primary", icon: "bg-primary/10 text-primary" },
  { bg: "from-violet-50 to-violet-100", ring: "border-violet-200", bar: "bg-violet-500", icon: "bg-violet-100 text-violet-600" },
  { bg: "from-emerald-50 to-emerald-100", ring: "border-emerald-200", bar: "bg-emerald-500", icon: "bg-emerald-100 text-emerald-600" },
  { bg: "from-amber-50 to-amber-100", ring: "border-amber-200", bar: "bg-amber-500", icon: "bg-amber-100 text-amber-600" },
];

function CenterCard({
  center, totalRevenue, monthlyData, rank, onClick,
}: {
  center: { centerId: number; centerName: string; revenue: number; debt: number; enrollments: number };
  totalRevenue: number;
  monthlyData: { month: string; revenue: number }[];
  rank: number;
  onClick: () => void;
}) {
  const colors = CENTER_COLORS[rank % CENTER_COLORS.length];
  const sharePercent = totalRevenue > 0 ? Math.round((center.revenue / totalRevenue) * 100) : 0;
  const collectionRate = center.revenue + center.debt > 0
    ? Math.round((center.revenue / (center.revenue + center.debt)) * 100)
    : 100;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-gradient-to-br ${colors.bg} border ${colors.ring} rounded-2xl p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.icon}`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{center.centerName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />{center.enrollments} enrollments
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1 shrink-0" />
      </div>

      {/* Revenue */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-0.5">Total Revenue</p>
        <p className="text-xl font-bold text-foreground">{VND(center.revenue)}</p>
      </div>

      {/* Mini chart */}
      <div className="mb-3">
        <MiniBarChart data={monthlyData} color={colors.bar} />
      </div>

      {/* Revenue share bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Revenue share</span>
          <span className="font-medium">{sharePercent}%</span>
        </div>
        <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
          <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${sharePercent}%` }} />
        </div>
      </div>

      {/* Footer stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground">Collection</p>
          <p className="text-sm font-bold text-foreground">{collectionRate}%</p>
        </div>
        <div className={`rounded-lg p-2 text-center ${center.debt > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
          <p className="text-[10px] text-muted-foreground">Debt</p>
          <p className={`text-sm font-bold ${center.debt > 0 ? "text-destructive" : "text-emerald-600"}`}>
            {center.debt > 0 ? VND(center.debt) : "None"}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Center Detail Panel ──────────────────────────────────────────────────────

function CenterDetail({ centerId, centerName, onBack }: {
  centerId: number; centerName: string; onBack: () => void;
}) {
  const [debtSearch, setDebtSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [showAllDebts, setShowAllDebts] = useState(false);
  const [recoveringDebt, setRecoveringDebt] = useState<TxRecord | null>(null);

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["finance-reports", centerId],
    queryFn: () => apiFetch(`/finance/reports?centerId=${centerId}`),
    refetchInterval: 60_000,
  });

  const report = data;
  const debts = (report?.debts ?? []).filter(d =>
    !debtSearch ||
    d.userFullName.toLowerCase().includes(debtSearch.toLowerCase()) ||
    d.userEmail.toLowerCase().includes(debtSearch.toLowerCase())
  );
  const visibleDebts = showAllDebts ? debts : debts.slice(0, 6);
  const txs = (report?.recentTransactions ?? []).filter(t =>
    !txSearch || t.userFullName.toLowerCase().includes(txSearch.toLowerCase())
  );
  const collectionRate = report
    ? report.summary.totalRevenue + report.summary.totalDebt > 0
      ? Math.round((report.summary.totalRevenue / (report.summary.totalRevenue + report.summary.totalDebt)) * 100)
      : 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2 h-9" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> All Centers
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold">{centerName}</h2>
            <p className="text-xs text-muted-foreground">Center financial detail</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted/40 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Revenue" value={VND(report?.summary.totalRevenue ?? 0)}
              sub="Total collected" color="bg-emerald-100 text-emerald-600" />
            <StatCard icon={AlertTriangle} label="Outstanding Debt" value={VND(report?.summary.totalDebt ?? 0)}
              sub={`${report?.debts.length ?? 0} member(s)`} color="bg-red-100 text-red-500" />
            <StatCard icon={Users} label="Enrollments" value={(report?.summary.totalEnrollments ?? 0).toLocaleString()}
              sub={`${report?.summary.activeEnrollments ?? 0} active`} color="bg-blue-100 text-blue-600" />
            <StatCard icon={Percent} label="Collection Rate" value={`${collectionRate}%`}
              sub="Paid / (Paid + Debt)" color="bg-violet-100 text-violet-600" />
          </div>

          {/* Revenue chart + payment methods */}
          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Monthly Revenue — {centerName}</h3>
              </div>
              <BarChart data={report?.monthlyRevenue ?? []} />
            </div>
            <div className="lg:col-span-2 bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Payment Methods</h3>
              </div>
              {Object.keys(report?.paymentMethods ?? {}).length === 0 ? (
                <p className="text-sm text-muted-foreground">No data</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(report?.paymentMethods ?? {})
                    .sort(([, a], [, b]) => b - a)
                    .map(([method, amount]) => {
                      const pct = Math.round((amount / (report?.summary.totalRevenue || 1)) * 100);
                      return (
                        <div key={method}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize font-medium">{method || "Not specified"}</span>
                            <span className="text-muted-foreground">{VND(amount)} · {pct}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Sales person breakdown */}
              {(() => {
                const spMap: Record<string, number> = {};
                for (const tx of report?.recentTransactions ?? []) {
                  const sp = tx.salesPerson || "Unassigned";
                  spMap[sp] = (spMap[sp] ?? 0) + tx.amountPaid;
                }
                const entries = Object.entries(spMap).sort(([, a], [, b]) => b - a);
                if (entries.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-2">By Sales Person</p>
                    <div className="space-y-1.5">
                      {entries.map(([sp, amt]) => (
                        <div key={sp} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{sp}</span>
                          <span className="font-medium">{VND(amt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
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
                  <h3 className="font-semibold text-sm">Outstanding Debts</h3>
                  <p className="text-xs text-muted-foreground">
                    {report?.debts.length ?? 0} member(s) · Total {VND(report?.summary.totalDebt ?? 0)}
                  </p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={debtSearch} onChange={e => setDebtSearch(e.target.value)}
                  placeholder="Search member…" className="pl-8 h-8 text-sm w-44" />
              </div>
            </div>
            {debts.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No outstanding debts</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border/50">
                  {visibleDebts.map(debt => (
                    <div key={debt.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {debt.userFullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{debt.userFullName}</p>
                        <p className="text-xs text-muted-foreground">{debt.userEmail} · {debt.membershipName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-destructive">{VND(debt.debtAmount)}</p>
                        <p className="text-xs text-muted-foreground">Paid: {VND(debt.amountPaid)}</p>
                      </div>
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

          {/* All Transactions */}
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">All Transactions</h3>
                  <p className="text-xs text-muted-foreground">{txs.length} record(s)</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={txSearch} onChange={e => setTxSearch(e.target.value)}
                  placeholder="Search member…" className="pl-8 h-8 text-sm w-44" />
              </div>
            </div>
            {txs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {txs.map(tx => (
                  <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.debtAmount > 0 ? "bg-amber-100" : "bg-emerald-100"}`}>
                      <CreditCard className={`w-4 h-4 ${tx.debtAmount > 0 ? "text-amber-600" : "text-emerald-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.userFullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.membershipName} ·{" "}
                        {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {tx.salesPerson ? ` · ${tx.salesPerson}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-600">+{VND(tx.amountPaid)}</p>
                      {tx.debtAmount > 0 && <p className="text-xs text-destructive">Debt: {VND(tx.debtAmount)}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {tx.paymentMethod && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                          {tx.paymentMethod}
                        </span>
                      )}
                      <Badge variant={tx.status === "active" ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <RecoverDebtDialog debt={recoveringDebt} open={!!recoveringDebt} onClose={() => setRecoveringDebt(null)} />
    </div>
  );
}

// ─── Overview Panel ───────────────────────────────────────────────────────────

function Overview({ onSelectCenter }: { onSelectCenter: (id: number, name: string) => void }) {
  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["finance-reports"],
    queryFn: () => apiFetch("/finance/reports"),
    refetchInterval: 60_000,
  });

  const report = data;
  const totalRevenue = report?.summary.totalRevenue ?? 0;
  const collectionRate = totalRevenue + (report?.summary.totalDebt ?? 0) > 0
    ? Math.round((totalRevenue / (totalRevenue + (report?.summary.totalDebt ?? 0))) * 100)
    : 0;

  // Build per-center monthly data from the breakdown (we'll use overall monthly as a proxy)
  // We need per-center monthly — for now use overall monthly chart filtered per-center on drill-down

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted/40 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Total Revenue" value={VND(totalRevenue)}
              sub="All centers combined" color="bg-emerald-100 text-emerald-600" />
            <StatCard icon={AlertTriangle} label="Outstanding Debt" value={VND(report?.summary.totalDebt ?? 0)}
              sub={`${report?.debts.length ?? 0} member(s)`} color="bg-red-100 text-red-500" />
            <StatCard icon={Users} label="Total Enrollments" value={(report?.summary.totalEnrollments ?? 0).toLocaleString()}
              sub={`${report?.summary.activeEnrollments ?? 0} active`} color="bg-blue-100 text-blue-600" />
            <StatCard icon={TrendingUp} label="Collection Rate" value={`${collectionRate}%`}
              sub="Revenue / (Revenue + Debt)" color="bg-violet-100 text-violet-600" />
          </div>

          {/* Overall monthly chart */}
          <div className="bg-card border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Overall Monthly Revenue (last 6 months)</h2>
            </div>
            <BarChart data={report?.monthlyRevenue ?? []} />
          </div>

          {/* Center cards */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Center Breakdown</h2>
              <span className="text-xs text-muted-foreground ml-1">Click a center to see full details</span>
            </div>
            {(report?.centerBreakdown.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No centers found</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {(report?.centerBreakdown ?? [])
                  .sort((a, b) => b.revenue - a.revenue)
                  .map((center, idx) => (
                    <CenterCard
                      key={center.centerId}
                      center={center}
                      totalRevenue={totalRevenue}
                      monthlyData={report?.monthlyRevenue ?? []}
                      rank={idx}
                      onClick={() => onSelectCenter(center.centerId, center.centerName)}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Recent Transactions (all centers, last 10) */}
          <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-5 border-b border-border/50">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Banknote className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Recent Transactions (All Centers)</h2>
                <p className="text-xs text-muted-foreground">Latest 50 across all centers</p>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {(report?.recentTransactions ?? []).slice(0, 10).map(tx => (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.debtAmount > 0 ? "bg-amber-100" : "bg-emerald-100"}`}>
                    <CreditCard className={`w-4 h-4 ${tx.debtAmount > 0 ? "text-amber-600" : "text-emerald-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.userFullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.membershipName} · {tx.centerName} ·{" "}
                      {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-emerald-600">+{VND(tx.amountPaid)}</p>
                    {tx.debtAmount > 0 && <p className="text-xs text-destructive">Debt: {VND(tx.debtAmount)}</p>}
                  </div>
                  <button
                    onClick={() => onSelectCenter(tx.centerId, tx.centerName)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors shrink-0 capitalize flex items-center gap-0.5"
                  >
                    {tx.centerName} <ArrowUpRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────

export default function FinancialReports() {
  const [selectedCenter, setSelectedCenter] = useState<{ id: number; name: string } | null>(null);

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedCenter
              ? `Viewing ${selectedCenter.name} · `
              : "All centers overview · "}
            Revenue, debts & transactions
          </p>
        </div>

        {selectedCenter ? (
          <CenterDetail
            centerId={selectedCenter.id}
            centerName={selectedCenter.name}
            onBack={() => setSelectedCenter(null)}
          />
        ) : (
          <Overview onSelectCenter={(id, name) => setSelectedCenter({ id, name })} />
        )}
      </div>
    </AdminLayout>
  );
}
