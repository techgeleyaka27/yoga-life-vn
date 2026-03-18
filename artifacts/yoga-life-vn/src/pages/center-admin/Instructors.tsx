import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole, useListInstructors, useCreateInstructor, useUpdateInstructor, useDeleteInstructor } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function CenterAdminInstructors() {
  const { user } = useAuth();
  const centerId = user?.centerId || 1;
  const { data, isLoading } = useListInstructors({ centerId });
  const createMut = useCreateInstructor();
  const deleteMut = useDeleteInstructor();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [specialtiesInput, setSpecialtiesInput] = useState("");

  const instructors = data?.instructors || [];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const specialties = specialtiesInput.split(",").map(s => s.trim()).filter(Boolean);
    try {
      await createMut.mutateAsync({
        data: {
          fullName: fd.get("fullName") as string,
          bio: fd.get("bio") as string || null,
          specialties,
          experience: fd.get("experience") as string || null,
          centerId,
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      setIsOpen(false);
      setSpecialtiesInput("");
      toast({ title: "Instructor added" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this instructor?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast({ title: "Instructor removed" });
    } catch {
      toast({ variant: "destructive", title: "Error" });
    }
  };

  return (
    <AdminLayout role={UserRole.center_admin}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Instructors</h1>
            <p className="text-muted-foreground mt-1">Manage instructors at your center</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Instructor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-serif">Add Instructor</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input name="fullName" placeholder="Nguyễn Thị Lan" required />
                </div>
                <div className="space-y-2">
                  <Label>Specialties (comma separated)</Label>
                  <Input value={specialtiesInput} onChange={e => setSpecialtiesInput(e.target.value)} placeholder="Hatha Yoga, Vinyasa, Meditation" />
                </div>
                <div className="space-y-2">
                  <Label>Experience</Label>
                  <Input name="experience" placeholder="5 years" />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea name="bio" placeholder="Brief bio about the instructor..." className="resize-none h-20" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit">Add Instructor</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-card rounded-2xl animate-pulse" />)}
          </div>
        ) : instructors.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No instructors yet. Add your first instructor.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {instructors.map(i => (
              <Card key={i.id} className="border-none premium-shadow overflow-hidden group">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      {i.imageUrl ? (
                        <img src={i.imageUrl} alt={i.fullName} className="w-14 h-14 rounded-2xl object-cover" />
                      ) : (
                        <User className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold font-serif">{i.fullName}</h3>
                          {i.experience && <p className="text-xs text-muted-foreground">{i.experience}</p>}
                        </div>
                        <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(i.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {i.bio && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{i.bio}</p>}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(i.specialties || []).map((s: string, idx: number) => (
                          <span key={idx} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
