import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole, useListCenters, useCreateCenter, useUpdateCenter, useDeleteCenter, Center } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, MapPin, Search } from "lucide-react";

export default function AdminCenters() {
  const { data, isLoading } = useListCenters();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);

  const createMut = useCreateCenter();
  const updateMut = useUpdateCenter();
  const deleteMut = useDeleteCenter();

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createMut.mutateAsync({
        data: {
          name: fd.get("name") as string,
          address: fd.get("address") as string,
          city: fd.get("city") as string,
          phone: fd.get("phone") as string,
          email: fd.get("email") as string,
          description: fd.get("description") as string,
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/centers"] });
      setIsCreateOpen(false);
      toast({ title: "Center created successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCenter) return;
    const fd = new FormData(e.currentTarget);
    try {
      await updateMut.mutateAsync({
        id: selectedCenter.id,
        data: {
          name: fd.get("name") as string,
          address: fd.get("address") as string,
          city: fd.get("city") as string,
          phone: fd.get("phone") as string,
          email: fd.get("email") as string,
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/centers"] });
      setIsEditOpen(false);
      toast({ title: "Center updated successfully." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this center?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/centers"] });
      toast({ title: "Center deleted." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const centers = data?.centers?.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Centers & Branches</h1>
          <p className="text-muted-foreground mt-1">Manage all your yoga studio locations.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shadow-lg shadow-primary/20"><Plus className="w-4 h-4 mr-2" /> Add New Center</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Create New Center</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Center Name</Label><Input name="name" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>City</Label><Input name="city" required /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" required /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" required /></div>
              <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" rows={3} /></div>
              <Button type="submit" className="w-full mt-4" disabled={createMut.isPending}>Save Center</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-2xl premium-shadow overflow-hidden border border-border/50">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <input 
            type="text" 
            placeholder="Search centers..." 
            className="bg-transparent border-none outline-none flex-1 text-sm focus:ring-0"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Center Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading centers...</TableCell></TableRow>
              ) : centers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No centers found.</TableCell></TableRow>
              ) : (
                centers.map((center) => (
                  <TableRow key={center.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <MapPin className="w-5 h-5" />
                        </div>
                        {center.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{center.city}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{center.address}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{center.phone}</p>
                      <p className="text-xs text-muted-foreground">{center.email}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {center.memberCount} members
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedCenter(center); setIsEditOpen(true); }}>
                        <Edit className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(center.id)}>
                        <Trash2 className="w-4 h-4 text-destructive opacity-70 hover:opacity-100" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Edit Center</DialogTitle></DialogHeader>
          {selectedCenter && (
            <form onSubmit={handleUpdate} className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Center Name</Label><Input name="name" defaultValue={selectedCenter.name} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>City</Label><Input name="city" defaultValue={selectedCenter.city} required /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={selectedCenter.phone} required /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" defaultValue={selectedCenter.address} required /></div>
              <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={selectedCenter.email} required /></div>
              <Button type="submit" className="w-full mt-4" disabled={updateMut.isPending}>Update Center</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
