import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  UserRole,
  useListEnrollments,
  useUpdateEnrollment,
  useDeleteEnrollment,
  useCreateEnrollment,
  useListMemberships,
  useListUsers,
  useListCenters,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, TrendingUp, Users, CreditCard, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const TYPE_LABELS: Record<string, string> = {
  online: "Online",
  offline: "In-Studio",
  both: "Online + Studio",
  drop_in: "Drop-In",
};

export default function SuperAdminEnrollments() {
  const { data, isLoading } = useListEnrollments({});
  const { data: membershipsData } = useListMemberships({});
  const { data: usersData } = useListUsers({ role: "student" as any });
  const { data: centersData } = useListCenters();
  const updateMut = useUpdateEnrollment();
  const deleteMut = useDeleteEnrollment();
  const createMut = useCreateEnrollment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCenter, setFilterCenter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const enrollments = data?.enrollments || [];

  const filtered = enrollments.filter((e: any) => {
    const matchSearch =
      e.userFullName.toLowerCase().includes(search.toLowerCase()) ||
      e.membershipName.toLowerCase().includes(search.toLowerCase()) ||
      (e.userEmail || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeCount = enrollments.filter((e: any) => e.status === "active").length;
  const totalRevenue = enrollments.reduce((sum: number, e: any) => sum + (e.amountPaid || 0), 0);
  const expiredCount = enrollments.filter((e: any) => e.status === "expired").length;

  const summaryCards = [
    { label: "Total Enrollments", value: enrollments.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active", value: activeCount, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Expired", value: expiredCount, icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Total Revenue", value: `${(totalRevenue / 1000).toFixed(0)}k`, icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
  ];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMut.mutateAsync({
        data: {
          userId: Number(selectedUser),
          membershipId: Number(selectedMembership),
          startDate: fd.get("startDate") as string,
          amountPaid: parseFloat(fd.get("amountPaid") as string),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      setIsCreateOpen(false);
      setSelectedUser("");
      setSelectedMembership("");
      toast({ title: "Enrollment created successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateMut.mutateAsync({ id, data: { status: status as any } });
      await queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({ title: "Status updated" });
    } catch {
      toast({ variant: "destructive", title: "Error updating status" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this enrollment?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      await queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({ title: "Enrollment removed" });
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const activeMemberships = (membershipsData?.memberships || []).filter((m: any) => m.isActive);

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Enrollments</h1>
            <p className="text-muted-foreground mt-1">All membership enrollments across every center</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" />New Enrollment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif">Create Enrollment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser} required>
                    <SelectTrigger><SelectValue placeholder="Select student…" /></SelectTrigger>
                    <SelectContent>
                      {(usersData?.users || []).map((u: any) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.fullName} <span className="text-muted-foreground text-xs">({u.email})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Membership Plan</Label>
                  <Select value={selectedMembership} onValueChange={setSelectedMembership} required>
                    <SelectTrigger><SelectValue placeholder="Select plan…" /></SelectTrigger>
                    <SelectContent>
                      {activeMemberships.map((m: any) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name} — {(m.price / 1000).toFixed(0)}k VND
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input name="startDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid (VND)</Label>
                  <Input name="amountPaid" type="number" placeholder="800000" required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMut.isPending}>Create Enrollment</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}>
                <Card className="border-none premium-shadow">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className="text-2xl font-bold font-serif">{card.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="border-none premium-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or plan…"
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-none premium-shadow">
          <CardHeader className="pb-0">
            <CardTitle className="font-serif">All Enrollments ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-4">
            {isLoading ? (
              <div className="p-10 text-center text-muted-foreground">Loading enrollments…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Period</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any) => (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors group">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {(e.userFullName || "?").charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium leading-tight">{e.userFullName}</p>
                              <p className="text-xs text-muted-foreground">{e.userEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium">{e.membershipName}</p>
                          <p className="text-xs text-muted-foreground">{e.centerName}</p>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          {e.membershipType && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {TYPE_LABELS[e.membershipType] || e.membershipType}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell">
                          <p className="text-xs text-muted-foreground">
                            {new Date(e.startDate).toLocaleDateString("en-GB")} –
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(e.endDate).toLocaleDateString("en-GB")}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <Select value={e.status} onValueChange={v => handleStatusChange(e.id, v)}>
                            <SelectTrigger className={`h-7 w-28 text-xs border rounded-full px-2.5 ${statusColors[e.status] || ""}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="expired">Expired</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-semibold">{(e.amountPaid / 1000).toFixed(0)}k</span>
                          <span className="text-xs text-muted-foreground"> VND</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive h-7 w-7 p-0"
                            onClick={() => handleDelete(e.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && !isLoading && (
                  <div className="p-14 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No enrollments found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
