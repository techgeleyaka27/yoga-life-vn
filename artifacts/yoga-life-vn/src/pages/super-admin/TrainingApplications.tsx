import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, MessageSquare, Trash2, Users, ClipboardList, UserCheck, UserX } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_ORIGIN = BASE.startsWith("/__replco")
  ? "/api"
  : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("yoga_token");
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers || {}) },
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Request failed"); }
  return res.json();
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:       { label: "New",      color: "bg-blue-100 text-blue-700" },
  contacted: { label: "Contacted",color: "bg-amber-100 text-amber-700" },
  enrolled:  { label: "Enrolled", color: "bg-emerald-100 text-emerald-700" },
  declined:  { label: "Declined", color: "bg-red-100 text-red-700" },
};

const STATUS_ICONS: Record<string, any> = {
  new: ClipboardList, contacted: Phone, enrolled: UserCheck, declined: UserX,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function TrainingApplications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/training-applications"],
    queryFn: () => apiFetch("/training-applications"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/training-applications/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-applications"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/training-applications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-applications"] });
      toast({ title: "Application deleted" });
    },
    onError: () => toast({ variant: "destructive", title: "Error" }),
  });

  const applications: any[] = data?.applications || [];
  const filtered = filterStatus === "all" ? applications : applications.filter(a => a.status === filterStatus);

  const counts = {
    all: applications.length,
    new: applications.filter(a => a.status === "new").length,
    contacted: applications.filter(a => a.status === "contacted").length,
    enrolled: applications.filter(a => a.status === "enrolled").length,
    declined: applications.filter(a => a.status === "declined").length,
  };

  const stats = [
    { label: "Total",     value: counts.all,      icon: ClipboardList, color: "text-primary",       bg: "bg-primary/10" },
    { label: "New",       value: counts.new,       icon: ClipboardList, color: "text-blue-600",      bg: "bg-blue-50" },
    { label: "Contacted", value: counts.contacted, icon: Phone,         color: "text-amber-600",     bg: "bg-amber-50" },
    { label: "Enrolled",  value: counts.enrolled,  icon: UserCheck,     color: "text-emerald-600",   bg: "bg-emerald-50" },
  ];

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Training Applications</h1>
          <p className="text-muted-foreground mt-1">Applicants who clicked "Apply Now" on the teacher training programs</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-card rounded-2xl p-5 border premium-shadow flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold font-serif">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex gap-2 flex-wrap">
            {(["all", "new", "contacted", "enrolled", "declined"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {s === "all" ? `All (${counts.all})` : `${STATUS_CONFIG[s].label} (${counts[s]})`}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No applications {filterStatus !== "all" ? `with status "${filterStatus}"` : "yet"}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((app: any) => {
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.new;
              const StatusIcon = STATUS_ICONS[app.status] || ClipboardList;
              return (
                <div key={app.id} className="bg-card border rounded-2xl p-5 premium-shadow flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${cfg.color.replace("text-", "bg-").replace("-700", "-100").replace("-600", "-100")} flex items-center justify-center shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${cfg.color.split(" ")[1]}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-base">{app.fullName}</span>
                      <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{fmtDate(app.createdAt)}</span>
                    </div>
                    <p className="text-sm text-primary font-medium mb-2">{app.program}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" />{app.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />{app.phone}
                      </span>
                    </div>
                    {app.message && (
                      <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="italic">"{app.message}"</span>
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center gap-2 shrink-0">
                    <Select
                      value={app.status}
                      onValueChange={status => updateStatus.mutate({ id: app.id, status })}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm("Delete this application?")) deleteMut.mutate(app.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
