import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole, useListEnrollments, useUpdateEnrollment, useDeleteEnrollment, useCreateEnrollment, useListMemberships, useListUsers } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

export default function CenterAdminEnrollments() {
  const { user } = useAuth();
  const centerId = user?.centerId;
  const { data, isLoading } = useListEnrollments({ centerId: centerId ?? undefined });
  const { data: membershipsData } = useListMemberships({ centerId: centerId ?? undefined });
  const { data: usersData } = useListUsers({ role: "student" as any });
  const updateMut = useUpdateEnrollment();
  const deleteMut = useDeleteEnrollment();
  const createMut = useCreateEnrollment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const enrollments = data?.enrollments || [];
  const filtered = enrollments.filter(e => {
    const matchSearch = e.userFullName.toLowerCase().includes(search.toLowerCase()) || e.membershipName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || e.status === filterStatus;
    return matchSearch && matchStatus;
  });

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
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      setIsCreateOpen(false);
      toast({ title: "Enrollment created" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateMut.mutateAsync({ id, data: { status: status as any } });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({ title: "Status updated" });
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Cancel this enrollment?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({ title: "Enrollment cancelled" });
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  return (
    <AdminLayout role={UserRole.center_admin}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Enrollments</h1>
            <p className="text-muted-foreground mt-1">Manage member enrollments for your center</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Enrollment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-serif">Create Enrollment</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser} required>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {(usersData?.users || []).map(u => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.fullName} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Membership Plan</Label>
                  <Select value={selectedMembership} onValueChange={setSelectedMembership} required>
                    <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                    <SelectContent>
                      {(membershipsData?.memberships || []).filter(m => m.isActive).map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.name} — {(m.price/1000).toFixed(0)}k VND</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input name="startDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid (VND)</Label>
                  <Input name="amountPaid" type="number" placeholder="800000" required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Enrollment</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none premium-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search member or plan..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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

        <Card className="border-none premium-shadow">
          <CardHeader><CardTitle className="font-serif">Enrollments ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Member</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Plan</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Period</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Paid</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium">{e.userFullName}</p>
                          <p className="text-xs text-muted-foreground">{e.userEmail}</p>
                        </td>
                        <td className="py-3 px-4 text-sm">{e.membershipName}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(e.startDate).toLocaleDateString()} – {new Date(e.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Select value={e.status} onValueChange={v => handleStatusChange(e.id, v)}>
                            <SelectTrigger className={`h-7 w-28 text-xs border rounded-full px-2 ${statusColors[e.status]}`}>
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
                        <td className="py-3 px-4 text-sm font-medium">{(e.amountPaid/1000).toFixed(0)}k</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(e.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">No enrollments found</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
