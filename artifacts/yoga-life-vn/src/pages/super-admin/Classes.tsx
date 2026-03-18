import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  UserRole,
  useListClasses,
  useListCenters,
  useListInstructors,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  YogaClassLevel,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Clock, Users as UsersIcon, Pencil, Calendar as CalendarIcon, Building2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LEVELS = [
  { value: "all_levels", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

interface ClassTemplate { name: string; description: string; }

function useClassTemplates() {
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  useEffect(() => {
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    const API_BASE = BASE.startsWith("/__replco")
      ? "/api"
      : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");
    fetch(`${API_BASE}/class-definitions`)
      .then(r => r.json())
      .then(d => {
        const defs = (d.classDefinitions || []).filter((x: any) => x.isActive);
        setTemplates(defs.map((x: any) => ({ name: x.name, description: x.description })));
      })
      .catch(() => {});
  }, []);
  return templates;
}

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
  centerId: number;
  instructorId?: number;
}

function ClassFormFields({
  initial,
  onChange,
  centers,
  instructors,
  templates,
  showCenter = true,
}: {
  initial: ClassFormData;
  onChange: (d: ClassFormData) => void;
  centers: { id: number; name: string }[];
  instructors: { id: number; fullName: string; centerId: number }[];
  templates: ClassTemplate[];
  showCenter?: boolean;
}) {
  const [data, setData] = useState<ClassFormData>(initial);
  const set = (patch: Partial<ClassFormData>) => {
    const next = { ...data, ...patch };
    setData(next);
    onChange(next);
  };
  const centerInstructors = instructors.filter(i => i.centerId === data.centerId);
  return (
    <div className="space-y-4 pt-2">
      {showCenter && (
        <div className="space-y-2">
          <Label>Center</Label>
          <Select value={String(data.centerId)} onValueChange={v => set({ centerId: Number(v), instructorId: undefined })}>
            <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
            <SelectContent>{centers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Class Type</Label>
        <Select
          value={templates.find(t => t.name === data.name)?.name || "__custom__"}
          onValueChange={v => {
            const tpl = templates.find(t => t.name === v);
            if (tpl) set({ name: tpl.name, description: tpl.description });
          }}
        >
          <SelectTrigger><SelectValue placeholder={templates.length ? "Choose from class library…" : "Loading class library…"} /></SelectTrigger>
          <SelectContent>
            {templates.map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
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
            {centerInstructors.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.fullName}</SelectItem>)}
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

export default function SuperAdminClasses() {
  const templates = useClassTemplates();
  const { data: centersData } = useListCenters();
  const centers = centersData?.centers || [];

  const [selectedCenterId, setSelectedCenterId] = useState<number | undefined>(undefined);
  const { data, isLoading } = useListClasses(selectedCenterId ? { centerId: selectedCenterId } : {});
  const { data: instructorsData } = useListInstructors({});
  const instructors = (instructorsData?.instructors || []) as { id: number; fullName: string; centerId: number }[];
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editClass, setEditClass] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<ClassFormData | null>(null);

  const defaultCenterId = centers[0]?.id || 1;
  const [createForm, setCreateForm] = useState<ClassFormData>({
    name: "", description: "", dayOfWeek: "Monday",
    startTime: "09:00", endTime: "10:00", capacity: 15,
    level: YogaClassLevel.all_levels, isActive: true, centerId: defaultCenterId,
  });

  const createMut = useCreateClass();
  const updateMut = useUpdateClass();
  const deleteMut = useDeleteClass();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/classes"] });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMut.mutateAsync({ data: { ...createForm } });
      invalidate();
      setIsCreateOpen(false);
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
    if (!confirm("Permanently remove this class?")) return;
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
      centerId: cls.centerId,
      instructorId: cls.instructorId ?? undefined,
    });
    setEditClass(cls);
  };

  const getCenterName = (id: number) => centers.find(c => c.id === id)?.name || `Center #${id}`;

  const allClasses = data?.classes || [];

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Class Management</h1>
          <p className="text-muted-foreground mt-1">View and edit classes across all centers.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl"><Plus className="w-4 h-4 mr-2" /> Add Class</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-serif">Add New Class</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}>
              <ClassFormFields initial={{ ...createForm, centerId: defaultCenterId }} onChange={setCreateForm} centers={centers} instructors={instructors} templates={templates} showCenter />
              <Button type="submit" className="w-full mt-4" disabled={createMut.isPending}>Add to Schedule</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={selectedCenterId === undefined ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          onClick={() => setSelectedCenterId(undefined)}
        >
          All Centers
        </Button>
        {centers.map(c => (
          <Button
            key={c.id}
            variant={selectedCenterId === c.id ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setSelectedCenterId(c.id)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editClass} onOpenChange={open => { if (!open) setEditClass(null); }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">Edit Class</DialogTitle></DialogHeader>
          {editForm && (
            <form onSubmit={handleUpdate}>
              <ClassFormFields initial={editForm} onChange={setEditForm} centers={centers} instructors={instructors} templates={templates} showCenter={false} />
              <Button type="submit" className="w-full mt-4" disabled={updateMut.isPending}>Save Changes</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {centers.map(c => {
          const count = (data?.classes || []).filter(cl => cl.centerId === c.id).length;
          return (
            <div key={c.id} className="bg-card border border-border rounded-xl p-4 text-center">
              <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{selectedCenterId ? (selectedCenterId === c.id ? count : "–") : count}</p>
              <p className="text-xs text-muted-foreground truncate">{c.name}</p>
            </div>
          );
        })}
      </div>

      {/* Classes grouped by day */}
      <div className="grid grid-cols-1 gap-8">
        {DAYS.map(day => {
          const dayClasses = allClasses.filter(c => c.dayOfWeek === day);
          if (dayClasses.length === 0) return null;
          return (
            <div key={day}>
              <div className="flex items-center gap-3 mb-4 border-b border-border pb-2">
                <h3 className="text-xl font-serif font-bold text-foreground">{day}</h3>
                <span className="text-sm text-muted-foreground">{dayClasses.length} classes</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {dayClasses.map(cls => (
                  <Card key={cls.id} className={`border shadow-sm hover:shadow-md transition-shadow group ${cls.isActive === false ? "opacity-60" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-foreground leading-tight pr-1 flex-1">{cls.name}</h4>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => openEdit(cls)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(cls.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      {(cls as any).instructorName && (
                        <div className="flex items-center gap-1 mb-1.5">
                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="w-2.5 h-2.5 text-primary" />
                          </div>
                          <span className="text-xs font-medium text-primary">{(cls as any).instructorName}</span>
                        </div>
                      )}
                      {!selectedCenterId && (
                        <p className="text-xs text-primary/70 font-medium mb-2">{getCenterName(cls.centerId)}</p>
                      )}
                      {cls.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{cls.description}</p>}
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1.5 text-primary" />{cls.startTime} – {cls.endTime}
                        </div>
                        <div className="flex items-center">
                          <UsersIcon className="w-3 h-3 mr-1.5 text-primary" />{cls.capacity} spots
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${levelBadgeColor(cls.level)}`}>
                          {cls.level.replace("_", " ")}
                        </span>
                        {cls.isActive === false && (
                          <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Inactive</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        {!isLoading && allClasses.length === 0 && (
          <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
            <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">No classes found</h3>
            <p className="text-muted-foreground">Try selecting a different center or add a new class.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
