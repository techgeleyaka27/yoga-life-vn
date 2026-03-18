import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  UserRole,
  useListClasses,
  useListInstructors,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  YogaClassLevel,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Clock, Users as UsersIcon, Pencil, Calendar as CalendarIcon, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LEVELS = [
  { value: "all_levels", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const CLASS_TEMPLATES = [
  { name: "Hatha Yoga", description: "A classical and gentle style focusing on basic postures and breathing techniques. Suitable for all levels." },
  { name: "Vinyasa Flow", description: "A dynamic practice linking breath with movement through a flowing sequence of poses to build strength and flexibility." },
  { name: "Power Yoga", description: "A vigorous, fitness-based approach to vinyasa-style yoga building strength, endurance and mental focus." },
  { name: "Yin Yoga", description: "A slow-paced style with long-held seated postures targeting connective tissues for deep flexibility and relaxation." },
  { name: "Restorative Yoga", description: "A gentle therapeutic practice using props to fully support the body in passive poses for deep rest and recovery." },
  { name: "Ashtanga Yoga", description: "A rigorous style following a fixed sequence of postures synchronized with breath for strength and internal purification." },
  { name: "Prenatal Yoga", description: "A gentle practice specially designed to support expectant mothers through each trimester safely and comfortably." },
  { name: "Kids Yoga", description: "Fun, age-appropriate poses and games that introduce children to yoga, mindfulness and healthy movement habits." },
  { name: "Yoga Nidra", description: "A guided meditation leading to a deep state of conscious relaxation between waking and sleep — the 'yogic sleep'." },
  { name: "Meditation & Breathwork", description: "Guided pranayama and mindfulness meditation to calm the mind, reduce stress and cultivate inner stillness." },
  { name: "Hot Yoga", description: "A challenging sequence performed in a heated room to enhance flexibility, build endurance and support detoxification." },
  { name: "Morning Flow", description: "An energizing morning sequence designed to awaken the body, boost circulation and set a positive tone for the day." },
  { name: "Evening Wind-Down", description: "A calming, gentle practice to release tension from the day, relax the nervous system and prepare for restful sleep." },
  { name: "Core & Balance", description: "A focused practice targeting core strength, stability and balance through targeted poses and functional movements." },
];

function levelBadgeColor(level: string) {
  if (level === "beginner") return "bg-emerald-100 text-emerald-700";
  if (level === "intermediate") return "bg-blue-100 text-blue-700";
  if (level === "advanced") return "bg-purple-100 text-purple-700";
  return "bg-muted text-foreground";
}

interface ClassFormData {
  name: string;
  description: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: number;
  level: YogaClassLevel;
  isActive: boolean;
  instructorId?: number;
}

function ClassFormFields({
  initial,
  onChange,
  instructors,
}: {
  initial: ClassFormData;
  onChange: (d: ClassFormData) => void;
  instructors: { id: number; fullName: string }[];
}) {
  const [data, setData] = useState<ClassFormData>(initial);
  const set = (patch: Partial<ClassFormData>) => {
    const next = { ...data, ...patch };
    setData(next);
    onChange(next);
  };
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Class Type</Label>
        <Select
          value={CLASS_TEMPLATES.find(t => t.name === data.name)?.name || "__custom__"}
          onValueChange={v => {
            const tpl = CLASS_TEMPLATES.find(t => t.name === v);
            if (tpl) set({ name: tpl.name, description: tpl.description });
          }}
        >
          <SelectTrigger><SelectValue placeholder="Choose a class type…" /></SelectTrigger>
          <SelectContent>
            {CLASS_TEMPLATES.map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
            <SelectItem value="__custom__">Custom (enter manually)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Class Name</Label>
        <Input value={data.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Vinyasa Flow" required />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={data.description} onChange={e => set({ description: e.target.value })} rows={2} placeholder="Short description of this class…" />
      </div>
      <div className="space-y-2">
        <Label>Teacher / Instructor</Label>
        <Select
          value={data.instructorId ? String(data.instructorId) : "__none__"}
          onValueChange={v => set({ instructorId: v === "__none__" ? undefined : Number(v) })}
        >
          <SelectTrigger><SelectValue placeholder="Assign a teacher…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— No teacher assigned —</SelectItem>
            {instructors.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Day of Week</Label>
          <Select value={data.dayOfWeek} onValueChange={v => set({ dayOfWeek: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Level</Label>
          <Select value={data.level} onValueChange={v => set({ level: v as YogaClassLevel })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Time</Label>
          <Input type="time" value={data.startTime} onChange={e => set({ startTime: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>End Time</Label>
          <Input type="time" value={data.endTime} onChange={e => set({ endTime: e.target.value })} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Capacity (spots)</Label>
          <Input type="number" min={1} value={data.capacity} onChange={e => set({ capacity: Number(e.target.value) })} required />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={data.isActive ? "active" : "inactive"} onValueChange={v => set({ isActive: v === "active" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default function CenterAdminClasses() {
  const { user } = useAuth();
  const centerId = user?.centerId || 1;
  const { data, isLoading } = useListClasses({ centerId });
  const { data: instructorsData } = useListInstructors({ centerId });
  const instructors = (instructorsData?.instructors || []) as { id: number; fullName: string }[];
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editClass, setEditClass] = useState<any | null>(null);
  const [createForm, setCreateForm] = useState<ClassFormData>({
    name: "", description: "", dayOfWeek: "Monday",
    startTime: "09:00", endTime: "10:00", capacity: 15,
    level: YogaClassLevel.all_levels, isActive: true,
  });
  const [editForm, setEditForm] = useState<ClassFormData | null>(null);

  const createMut = useCreateClass();
  const updateMut = useUpdateClass();
  const deleteMut = useDeleteClass();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/classes"] });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({ data: { ...createForm, centerId } });
      invalidate();
      setIsCreateOpen(false);
      setCreateForm({ name: "", description: "", dayOfWeek: "Monday", startTime: "09:00", endTime: "10:00", capacity: 15, level: YogaClassLevel.all_levels, isActive: true });
      toast({ title: "Class added to schedule." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClass || !editForm) return;
    try {
      await updateMut.mutateAsync({ id: editClass.id, data: editForm });
      invalidate();
      setEditClass(null);
      toast({ title: "Class updated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this class from the schedule?")) return;
    try {
      await deleteMut.mutateAsync({ id });
      invalidate();
      toast({ title: "Class removed." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const openEdit = (cls: any) => {
    setEditForm({
      name: cls.name,
      description: cls.description || "",
      dayOfWeek: cls.dayOfWeek,
      startTime: cls.startTime,
      endTime: cls.endTime,
      capacity: cls.capacity,
      level: cls.level as YogaClassLevel,
      isActive: cls.isActive !== false,
      instructorId: cls.instructorId ?? undefined,
    });
    setEditClass(cls);
  };

  return (
    <AdminLayout role={UserRole.center_admin}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Class Schedule</h1>
          <p className="text-muted-foreground mt-1">Manage weekly yoga sessions for your center.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add Class</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader><DialogTitle className="font-serif">Add New Class</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}>
              <ClassFormFields initial={createForm} onChange={setCreateForm} instructors={instructors} />
              <Button type="submit" className="w-full mt-4" disabled={createMut.isPending}>Add to Schedule</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editClass} onOpenChange={open => { if (!open) setEditClass(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle className="font-serif">Edit Class</DialogTitle></DialogHeader>
          {editForm && (
            <form onSubmit={handleUpdate}>
              <ClassFormFields initial={editForm} onChange={setEditForm} instructors={instructors} />
              <Button type="submit" className="w-full mt-4" disabled={updateMut.isPending}>Save Changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-8">
        {DAYS.map(day => {
          const dayClasses = data?.classes?.filter(c => c.dayOfWeek === day) || [];
          if (dayClasses.length === 0) return null;
          return (
            <div key={day}>
              <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
                <h3 className="text-xl font-serif font-bold text-foreground">{day}</h3>
                <span className="text-sm text-muted-foreground">{dayClasses.length} classes</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayClasses.map(cls => (
                  <Card key={cls.id} className={`border shadow-sm hover:shadow-md transition-shadow group ${cls.isActive === false ? "opacity-60" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-base text-foreground leading-tight pr-2">{cls.name}</h4>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(cls)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(cls.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {(cls as any).instructorName && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-primary">{(cls as any).instructorName}</span>
                        </div>
                      )}
                      {cls.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{cls.description}</p>}
                      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-2 text-primary shrink-0" />
                          {cls.startTime} – {cls.endTime}
                        </div>
                        <div className="flex items-center">
                          <UsersIcon className="w-3.5 h-3.5 mr-2 text-primary shrink-0" />
                          {cls.capacity} spots
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${levelBadgeColor(cls.level)}`}>
                          {cls.level.replace("_", " ")}
                        </span>
                        {cls.isActive === false && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Inactive</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        {!isLoading && (!data?.classes || data.classes.length === 0) && (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">No classes scheduled</h3>
            <p className="text-muted-foreground">Click "Add Class" to get started.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
