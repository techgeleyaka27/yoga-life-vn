import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole, useListUsers, useDeleteUser, useUpdateUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Edit, Search, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useListCenters } from "@workspace/api-client-react";

const roleColors: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-800 border-purple-200",
  center_admin: "bg-blue-100 text-blue-800 border-blue-200",
  student: "bg-green-100 text-green-800 border-green-200",
};

export default function SuperAdminUsers() {
  const { data, isLoading } = useListUsers({});
  const { data: centersData } = useListCenters();
  const deleteMut = useDeleteUser();
  const updateMut = useUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [editUser, setEditUser] = useState<any>(null);
  const [editRole, setEditRole] = useState("");
  const [editCenterId, setEditCenterId] = useState<string>("");

  const users = data?.users || [];
  const filtered = users.filter(u => {
    const matchSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted" });
    } catch {
      toast({ variant: "destructive", title: "Error deleting user" });
    }
  };

  const handleEdit = (u: any) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditCenterId(u.centerId ? String(u.centerId) : "");
  };

  const handleSaveEdit = async () => {
    try {
      await updateMut.mutateAsync({
        id: editUser.id,
        data: { role: editRole as any, centerId: editCenterId ? Number(editCenterId) : null }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUser(null);
      toast({ title: "User updated" });
    } catch {
      toast({ variant: "destructive", title: "Error updating user" });
    }
  };

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Users & Roles</h1>
            <p className="text-muted-foreground mt-1">Manage all platform users and their roles</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <UserPlus className="w-4 h-4" />
            {data?.total || 0} total users
          </div>
        </div>

        <Card className="border-none premium-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                  <SelectItem value="center_admin">Center Admins</SelectItem>
                  <SelectItem value="super_admin">Super Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none premium-shadow">
          <CardHeader><CardTitle className="font-serif">All Users ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Center</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                              {u.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{u.fullName}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors[u.role]}`}>
                            {u.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{u.centerName || "—"}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(u)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(u.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">No users found</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">Edit User Role</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="font-medium">{editUser.fullName}</p>
                <p className="text-sm text-muted-foreground">{editUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="center_admin">Center Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editRole === "center_admin" && (
                <div className="space-y-2">
                  <Label>Assign Center</Label>
                  <Select value={editCenterId} onValueChange={setEditCenterId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select center" />
                    </SelectTrigger>
                    <SelectContent>
                      {(centersData?.centers || []).map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
