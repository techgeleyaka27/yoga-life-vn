import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole, useListMemberships, useCreateMembership, useUpdateMembership, useDeleteMembership, useListCenters } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function parseFeatures(features: any): string[] {
  if (!features) return [];
  if (Array.isArray(features)) return features;
  try { return JSON.parse(features); } catch { return []; }
}

export default function SuperAdminMemberships() {
  const { data, isLoading } = useListMemberships({});
  const { data: centersData } = useListCenters();
  const createMut = useCreateMembership();
  const updateMut = useUpdateMembership();
  const deleteMut = useDeleteMembership();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [featuresInput, setFeaturesInput] = useState("");
  const [centerId, setCenterId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const memberships = data?.memberships || [];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const features = featuresInput.split("\n").map(f => f.trim()).filter(Boolean);
    try {
      await createMut.mutateAsync({
        data: {
          name: fd.get("name") as string,
          description: fd.get("description") as string || null,
          price: parseFloat(fd.get("price") as string),
          durationDays: parseInt(fd.get("durationDays") as string),
          classesPerWeek: fd.get("classesPerWeek") ? parseInt(fd.get("classesPerWeek") as string) : null,
          centerId: Number(centerId),
          features, isActive,
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
      setIsCreateOpen(false);
      setFeaturesInput("");
      toast({ title: "Membership plan created" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this membership plan?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
      toast({ title: "Deleted" });
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  const toggleActive = async (m: any) => {
    try {
      await updateMut.mutateAsync({ id: m.id, data: { isActive: !m.isActive } });
      queryClient.invalidateQueries({ queryKey: ["/api/memberships"] });
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Membership Plans</h1>
            <p className="text-muted-foreground mt-1">Manage all membership plans across centers</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-serif">Create Membership Plan</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Plan Name</Label>
                    <Input name="name" placeholder="e.g. Monthly Unlimited" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Price (VND)</Label>
                    <Input name="price" type="number" placeholder="800000" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (days)</Label>
                    <Input name="durationDays" type="number" placeholder="30" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Classes/Week (optional)</Label>
                    <Input name="classesPerWeek" type="number" placeholder="3" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Center</Label>
                    <Select value={centerId} onValueChange={setCenterId} required>
                      <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                      <SelectContent>
                        {(centersData?.centers || []).map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Description</Label>
                    <Textarea name="description" placeholder="Plan description..." className="resize-none h-20" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Features (one per line)</Label>
                    <Textarea value={featuresInput} onChange={e => setFeaturesInput(e.target.value)} placeholder={"Unlimited classes\nFree mat\nSpa access"} className="resize-none h-24" />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                    <Label>Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Plan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-card rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memberships.map(m => (
              <Card key={m.id} className={`border-none premium-shadow relative overflow-hidden ${!m.isActive ? 'opacity-60' : ''}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-serif text-lg leading-tight">{m.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{m.centerName}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleActive(m)}>
                        <Switch checked={m.isActive} className="h-4 w-8" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-serif">{(m.price / 1000).toFixed(0)}k</span>
                    <span className="text-muted-foreground text-sm">VND / {m.durationDays} days</span>
                  </div>
                  {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                  <ul className="space-y-1.5">
                    {parseFeatures(m.features).map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {m.classesPerWeek && (
                    <p className="text-xs text-muted-foreground">{m.classesPerWeek} classes/week</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {memberships.length === 0 && !isLoading && (
          <div className="text-center py-16 text-muted-foreground">No membership plans yet. Create your first plan.</div>
        )}
      </div>
    </AdminLayout>
  );
}
