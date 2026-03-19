import { useState, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, User, Phone, Calendar, CreditCard,
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Edit2
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_ORIGIN = BASE.startsWith("/__replco")
  ? "/api"
  : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");

const PACKAGE_TYPES = [
  { value: "online",  label: "Online",          basePrice: 499000 },
  { value: "offline", label: "Offline",          basePrice: 799000 },
  { value: "both",    label: "Online + Offline", basePrice: 1099000 },
];

const DURATIONS = [
  { months: 1,  label: "1 Month" },
  { months: 3,  label: "3 Months" },
  { months: 6,  label: "6 Months" },
  { months: 12, label: "12 Months" },
];

const PAYMENT_METHODS = [
  { value: "cash",     label: "Cash" },
  { value: "card",     label: "Card" },
  { value: "transfer", label: "Bank Transfer" },
];

function fmt(n: number) { return new Intl.NumberFormat("vi-VN").format(n) + " ₫"; }
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB");
}
function statusColor(status: string) {
  if (status === "active")    return "bg-emerald-100 text-emerald-700";
  if (status === "expired")   return "bg-red-100 text-red-700";
  if (status === "cancelled") return "bg-gray-100 text-gray-600";
  return "bg-amber-100 text-amber-700";
}

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("yoga_token");
  const url = path.startsWith("/api/") ? `${API_ORIGIN}${path.slice(4)}` : `${API_ORIGIN}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
  return res.json();
}

export default function CenterAdminMemberships() {
  const { user } = useAuth();
  const centerId = user?.centerId || 1;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editMember, setEditMember] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/members", centerId],
    queryFn: () => apiFetch(`/api/members?centerId=${centerId}`),
  });

  const { data: plansData } = useQuery({
    queryKey: ["/api/memberships", centerId],
    queryFn: () => apiFetch(`/api/memberships?centerId=${centerId}`),
  });

  const members = data?.members ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m: any) =>
      !q || m.fullName?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.phone?.includes(q)
    );
  }, [members, search]);

  const addMutation = useMutation({
    mutationFn: (body: any) => apiFetch("/api/members", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", centerId] });
      setIsOpen(false);
      toast({ title: "Member added successfully" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const editMutation = useMutation({
    mutationFn: ({ enrollmentId, data }: { enrollmentId: number; data: any }) =>
      apiFetch(`/api/members/${enrollmentId}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", centerId] });
      setEditMember(null);
      toast({ title: "Member record updated" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const plans = plansData?.memberships ?? [];

  return (
    <AdminLayout role={UserRole.center_admin}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold">Members</h1>
            <p className="text-muted-foreground mt-1">Manage members and packages at your center</p>
          </div>
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Member
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone…" className="pl-9" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            {search ? "No members match your search." : "No members yet. Click \"Add Member\" to register the first one."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((m: any) => (
              <MemberRow
                key={m.enrollmentId}
                member={m}
                expanded={expandedId === m.enrollmentId}
                onToggle={() => setExpandedId(expandedId === m.enrollmentId ? null : m.enrollmentId)}
                onEdit={() => setEditMember(m)}
              />
            ))}
          </div>
        )}
      </div>

      <AddMemberDialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        plans={plans}
        centerId={centerId}
        onSubmit={(data) => addMutation.mutate(data)}
        isLoading={addMutation.isPending}
      />

      {editMember && (
        <EditMemberDialog
          open
          member={editMember}
          onClose={() => setEditMember(null)}
          onSubmit={(data) => editMutation.mutate({ enrollmentId: editMember.enrollmentId, data })}
          isLoading={editMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}

function MemberRow({ member: m, expanded, onToggle, onEdit }: {
  member: any; expanded: boolean; onToggle: () => void; onEdit: () => void;
}) {
  const isInDebt = m.debtAmount > 0;

  return (
    <div className="bg-card border rounded-xl overflow-hidden premium-shadow">
      <div className="flex items-center gap-4 px-5 py-4">
        <button className="flex-1 flex items-center gap-4 text-left" onClick={onToggle}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{m.fullName}</span>
              <Badge className={`text-xs ${statusColor(m.status)}`}>{m.status}</Badge>
              {isInDebt && (
                <Badge className="text-xs bg-red-100 text-red-600">
                  <AlertCircle className="w-3 h-3 mr-1" />Debt: {fmt(m.debtAmount)}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-sm text-muted-foreground">
              <span>{m.email}</span>
              {m.phone && <span>{m.phone}</span>}
            </div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <div className="text-sm font-medium capitalize">{m.membershipName}</div>
            <div className="text-xs text-muted-foreground">{m.packageDurationMonths}M · {fmtDate(m.activationDate || m.startDate)}</div>
          </div>
          <div className="shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary shrink-0" onClick={onEdit}>
          <Edit2 className="w-4 h-4" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t px-5 py-4 bg-muted/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <DetailCell label="Gender" value={m.gender || "—"} />
            <DetailCell label="Date of Birth" value={m.dateOfBirth || "—"} />
            <DetailCell label="Phone" value={m.phone || "—"} icon={<Phone className="w-3.5 h-3.5" />} />
            <DetailCell label="Address" value={m.address || "—"} />
            <DetailCell label="Package Type" value={m.membershipName} />
            <DetailCell label="Duration" value={`${m.packageDurationMonths} month(s)`} />
            <DetailCell label="Creation Date" value={fmtDate(m.startDate)} icon={<Calendar className="w-3.5 h-3.5" />} />
            <DetailCell label="Activation Date" value={fmtDate(m.activationDate)} />
            <DetailCell label="Expiry Date" value={fmtDate(m.endDate)} />
            <DetailCell label="Amount Paid" value={fmt(m.amountPaid)} icon={<CreditCard className="w-3.5 h-3.5" />} />
            <DetailCell
              label="Remaining Debt"
              value={m.debtAmount > 0 ? fmt(m.debtAmount) : "Paid in full"}
              highlight={m.debtAmount > 0 ? "red" : "green"}
            />
            <DetailCell label="Payment Method" value={m.paymentMethod || "—"} />
            {m.salesPerson && <DetailCell label="Sales Person" value={m.salesPerson} />}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailCell({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: "red" | "green" }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className={`flex items-center gap-1 font-medium ${highlight === "red" ? "text-red-600" : highlight === "green" ? "text-emerald-600" : ""}`}>
        {icon}{value}
      </div>
    </div>
  );
}

function EditMemberDialog({ open, member: m, onClose, onSubmit, isLoading }: {
  open: boolean; member: any; onClose: () => void;
  onSubmit: (data: any) => void; isLoading: boolean;
}) {
  const [amountPaid, setAmountPaid]   = useState(String(m.amountPaid || 0));
  const [debtAmount, setDebtAmount]   = useState(String(m.debtAmount || 0));
  const [paymentMethod, setPaymentMethod] = useState(m.paymentMethod || "cash");
  const [salesPerson, setSalesPerson] = useState(m.salesPerson || "");
  const [status, setStatus]           = useState(m.status || "active");
  const [endDate, setEndDate]         = useState(m.endDate?.split("T")[0] || "");
  const [activationDate, setActivationDate] = useState(m.activationDate?.split("T")[0] || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      amountPaid: parseFloat(amountPaid) || 0,
      debtAmount: parseFloat(debtAmount) || 0,
      paymentMethod,
      salesPerson: salesPerson || null,
      status,
      endDate: endDate || null,
      activationDate: activationDate || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Enrollment — {m.fullName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount Paid (VND)</Label>
              <Input type="number" min={0} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Debt Amount (VND)</Label>
              <Input type="number" min={0} value={debtAmount} onChange={e => setDebtAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer (alt)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Activation Date</Label>
              <Input type="date" value={activationDate} onChange={e => setActivationDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Sales Person</Label>
              <Input value={salesPerson} onChange={e => setSalesPerson(e.target.value)} placeholder="Staff name" />
            </div>
          </div>
          {parseFloat(amountPaid) >= 0 && parseFloat(debtAmount) >= 0 && (
            <div className={`text-sm flex items-center gap-2 p-3 rounded-lg ${parseFloat(debtAmount) > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {parseFloat(debtAmount) > 0
                ? <><AlertCircle className="w-4 h-4" /> Remaining debt: {fmt(parseFloat(debtAmount))}</>
                : <><CheckCircle2 className="w-4 h-4" /> Fully paid</>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddMemberDialog({ open, onClose, plans, centerId, onSubmit, isLoading }: {
  open: boolean; onClose: () => void; plans: any[]; centerId: number;
  onSubmit: (data: any) => void; isLoading: boolean;
}) {
  const [packageType, setPackageType]       = useState("offline");
  const [durationMonths, setDurationMonths] = useState(1);
  const [amountPaid, setAmountPaid]         = useState("");
  const [creationDate, setCreationDate]     = useState(new Date().toISOString().split("T")[0]);
  const [activationDate, setActivationDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod]   = useState("cash");

  // Controlled personal info fields (needed for pre-fill)
  const [fullName, setFullName]     = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [gender, setGender]         = useState("female");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress]       = useState("");
  const [salesPerson, setSalesPerson] = useState("");

  // Walk-in lookup state
  const [lookupEmail, setLookupEmail]   = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundUser, setFoundUser]       = useState<{ id: number; fullName: string; email: string; phone: string } | null>(null);
  const [lookupDone, setLookupDone]     = useState(false);

  const handleLookup = async () => {
    if (!lookupEmail.trim()) return;
    setLookupLoading(true);
    setFoundUser(null);
    setLookupDone(false);
    const token = localStorage.getItem("yoga_token");
    try {
      const res = await fetch(`${API_ORIGIN}/users/lookup?email=${encodeURIComponent(lookupEmail.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      setFoundUser(data);
      setFullName(data.fullName || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
    } catch {
      setFoundUser(null);
      setEmail(lookupEmail.trim());
    } finally {
      setLookupLoading(false);
      setLookupDone(true);
    }
  };

  const PRICES: Record<string, number> = { online: 499000, offline: 799000, both: 1099000 };
  const basePrice = PRICES[packageType] ?? 799000;
  const totalPrice = basePrice * durationMonths;
  const paid = parseFloat(amountPaid) || 0;
  const debt = Math.max(0, totalPrice - paid);

  const selectedPlan = plans.find(p => p.type === packageType) || plans[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPlan) { alert("No matching membership plan found for this center/type."); return; }
    onSubmit({
      fullName, email, phone, gender, dateOfBirth, address, salesPerson,
      membershipId: selectedPlan.id,
      packageDurationMonths: durationMonths,
      amountPaid: paid,
      debtAmount: debt,
      paymentMethod,
      creationDate,
      activationDate,
      centerId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Add Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">

          {/* Walk-in lookup */}
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/3 p-4 space-y-3">
            <p className="text-sm font-semibold text-primary">Walk-in Activation — Find Existing Account</p>
            <p className="text-xs text-muted-foreground">If the customer already has an account in the app, enter their email to auto-fill details and link the package to their existing login.</p>
            <div className="flex gap-2">
              <Input
                value={lookupEmail}
                onChange={e => setLookupEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleLookup())}
                placeholder="customer@email.com"
                type="email"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleLookup} disabled={lookupLoading || !lookupEmail.trim()}>
                {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Account"}
              </Button>
            </div>
            {lookupDone && (
              foundUser ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Account found: <strong>{foundUser.fullName}</strong> — details pre-filled below. Package will link to their existing login.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  No account found — fill in details below to create a new account for them.
                </div>
              )
            )}
          </div>

          <Section title="Personal Information">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Thị Lan" required />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@email.com" required />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0901 234 567" required />
              </div>
              <div className="space-y-1.5">
                <Label>Sales Person</Label>
                <Input value={salesPerson} onChange={e => setSalesPerson(e.target.value)} placeholder="Staff name" />
              </div>
              <div className="space-y-1.5">
                <Label>Address (optional)</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, District, City" />
              </div>
            </div>
          </Section>

          <Section title="Membership Package">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Package Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {PACKAGE_TYPES.map(pt => (
                    <button key={pt.value} type="button" onClick={() => setPackageType(pt.value)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${packageType === pt.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Package Duration</Label>
                <div className="flex gap-2 flex-wrap">
                  {DURATIONS.map(d => (
                    <button key={d.months} type="button" onClick={() => setDurationMonths(d.months)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${durationMonths === d.months ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 p-4 rounded-xl bg-muted/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Base price / month</span>
                <span className="font-medium">{fmt(basePrice)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium">× {durationMonths}</span>
              </div>
              <div className="border-t mt-2 pt-2 flex items-center justify-between">
                <span className="font-semibold">Total Package Price</span>
                <span className="text-xl font-bold text-primary">{fmt(totalPrice)}</span>
              </div>
            </div>
          </Section>

          <Section title="Payment">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Amount Paid (VND)</Label>
                <Input value={amountPaid} onChange={e => setAmountPaid(e.target.value)} type="number" placeholder={String(totalPrice)} min={0} max={totalPrice} />
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Remaining debt:</span>
                  <span className={`font-semibold flex items-center gap-1 ${debt > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {debt > 0 ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {debt > 0 ? fmt(debt) : "Paid in full"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <div className="flex gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <button key={pm.value} type="button" onClick={() => setPaymentMethod(pm.value)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${paymentMethod === pm.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Package Creation Date</Label>
                <Input type="date" value={creationDate} onChange={e => setCreationDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Package Activation Date</Label>
                <Input type="date" value={activationDate} onChange={e => setActivationDate(e.target.value)} />
              </div>
            </div>
          </Section>

          {!selectedPlan && plans.length > 0 && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
              No "{packageType}" membership plan found for this center. Please ask the super admin to create one first.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading || !selectedPlan}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Member
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide border-b pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, name, placeholder, required, type = "text", className = "" }: {
  label: string; name: string; placeholder?: string; required?: boolean; type?: string; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label>{label}</Label>
      <Input name={name} type={type} placeholder={placeholder} required={required} />
    </div>
  );
}
