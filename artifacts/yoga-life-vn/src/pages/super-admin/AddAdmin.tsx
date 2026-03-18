import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole, useListCenters, useListUsers } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Eye, EyeOff, CheckCircle2, Building2, Mail, Lock, User, Phone, Trash2, Edit, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SuperAdminAddAdmin() {
  const { data: centersData } = useListCenters();
  const { data: usersData, refetch } = useListUsers({ role: "center_admin" as any });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    centerId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  // Edit modal
  const [editAdmin, setEditAdmin] = useState<any>(null);
  const [editCenterId, setEditCenterId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const centers = centersData?.centers || [];
  const admins = usersData?.users || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.centerId) {
      toast({ variant: "destructive", title: "Please select a center to assign" });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("yoga_token");
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          role: "center_admin",
          centerId: Number(form.centerId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");
      setSuccess(data);
      setForm({ fullName: "", email: "", password: "", phone: "", centerId: "" });
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      refetch();
      toast({ title: "Center admin created!", description: `${data.fullName} can now log in with the credentials you set.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove admin account for "${name}"? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem("yoga_token");
      await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      refetch();
      toast({ title: "Admin removed" });
    } catch {
      toast({ variant: "destructive", title: "Error removing admin" });
    }
  };

  const handleEditSave = async () => {
    if (!editAdmin) return;
    setEditLoading(true);
    try {
      const token = localStorage.getItem("yoga_token");
      const body: any = { centerId: editCenterId ? Number(editCenterId) : null };
      // If password is provided, we need to update via a special endpoint — for now update via PUT
      const res = await fetch(`/api/users/${editAdmin.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      refetch();
      setEditAdmin(null);
      toast({ title: "Admin updated successfully" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-serif font-bold">Add Center Admin</h1>
          <p className="text-muted-foreground mt-1">Create login accounts for center administrators and assign them to a branch.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Create Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-none premium-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif text-xl">New Center Admin</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">They'll log in with this email and password</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {success && (
                  <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-green-800 mb-1">Account created!</p>
                      <p className="text-green-700"><span className="font-medium">{success.fullName}</span> can now log in at <span className="font-mono bg-green-100 px-1 rounded">/login</span></p>
                      <div className="mt-2 space-y-0.5 text-green-600 font-mono text-xs bg-green-100 rounded-lg p-2">
                        <p>Email: {success.email}</p>
                        <p>Center: {success.centerName}</p>
                      </div>
                      <button className="text-green-600 text-xs underline mt-2" onClick={() => setSuccess(null)}>Dismiss</button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Full Name
                    </Label>
                    <Input
                      placeholder="e.g. Nguyễn Thị Lan"
                      value={form.fullName}
                      onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Email Address
                    </Label>
                    <Input
                      type="email"
                      placeholder="admin@yogalifevn.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        required
                        minLength={6}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Minimum 6 characters. Share this securely with the admin.</p>
                  </div>

                  {/* Phone (optional) */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      Phone <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                    </Label>
                    <Input
                      type="tel"
                      placeholder="+84 9xx xxx xxxx"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  {/* Assign Center */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      Assign to Center
                    </Label>
                    <Select value={form.centerId} onValueChange={v => setForm(f => ({ ...f, centerId: v }))}>
                      <SelectTrigger className={!form.centerId ? "border-dashed" : ""}>
                        <SelectValue placeholder="Select a center / branch…" />
                      </SelectTrigger>
                      <SelectContent>
                        {centers.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary" />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.centerId && (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        This admin will only manage classes and members in the selected center.
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base rounded-xl mt-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Creating account…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Create Admin Account
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right side: info + existing admins */}
          <div className="space-y-6">
            {/* How it works */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-none bg-primary/5 border border-primary/10">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    How Center Admins Work
                  </h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {[
                      "Center admin logs in at /login with the email & password you set",
                      "They see only their assigned center's data",
                      "Can manage classes, memberships, instructors and enrollments",
                      "Cannot access other centers or super admin pages",
                      "You can reassign them to a different center anytime",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            {/* Existing center admins */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-none premium-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-base flex items-center justify-between">
                    Existing Center Admins
                    <span className="text-sm font-normal text-muted-foreground">{admins.length} total</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {admins.length === 0 ? (
                    <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No center admins yet. Create one using the form.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {admins.map((admin: any) => (
                        <div key={admin.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                            {admin.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{admin.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                            {admin.centerName && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-primary" />
                                <span className="text-xs text-primary font-medium">{admin.centerName}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                              onClick={() => {
                                setEditAdmin(admin);
                                setEditCenterId(admin.centerId ? String(admin.centerId) : "");
                                setEditPassword("");
                              }}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(admin.id, admin.fullName)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Edit Admin Modal */}
      <Dialog open={!!editAdmin} onOpenChange={open => { if (!open) setEditAdmin(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Admin — {editAdmin?.fullName}</DialogTitle>
          </DialogHeader>
          {editAdmin && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-muted/40 text-sm">
                <p className="font-medium">{editAdmin.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Joined {new Date(editAdmin.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-sm">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Assigned Center
                </Label>
                <Select value={editCenterId} onValueChange={setEditCenterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select center" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditAdmin(null)}>Cancel</Button>
                <Button onClick={handleEditSave} disabled={editLoading}>
                  {editLoading ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
