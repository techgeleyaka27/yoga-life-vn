import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole, useListInstructors, useListCenters } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Clock, Plus, Trash2, Edit, Building2, User, CheckCircle2, Coffee, Sunrise, Sunset } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// Times from 05:00 to 22:00 in 30-min increments
const TIMES = Array.from({ length: 35 }, (_, i) => {
  const h = Math.floor(i / 2) + 5;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2,"0")}:${m}`;
});

function apiCall(method: string, path: string, body?: any) {
  const token = localStorage.getItem("yoga_token");
  return fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

interface Schedule {
  id: number;
  instructorId: number;
  instructorName: string;
  centerId: number;
  centerName: string;
  dayOfWeek: string;
  workStart: string;
  morningEnd: string | null;
  eveningStart: string | null;
  workEnd: string;
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function calcHours(start: string, end: string) {
  const mins = toMinutes(end) - toMinutes(start);
  if (mins <= 0) return "0h";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function calcBreak(morningEnd: string, eveningStart: string) {
  return calcHours(morningEnd, eveningStart);
}

function totalWorkHours(s: Schedule) {
  if (s.morningEnd && s.eveningStart) {
    const morning = toMinutes(s.morningEnd) - toMinutes(s.workStart);
    const evening = toMinutes(s.workEnd) - toMinutes(s.eveningStart);
    return ((morning + evening) / 60).toFixed(1);
  }
  return ((toMinutes(s.workEnd) - toMinutes(s.workStart)) / 60).toFixed(1);
}

const dayColor: Record<string, string> = {
  Monday: "bg-blue-100 text-blue-700",
  Tuesday: "bg-purple-100 text-purple-700",
  Wednesday: "bg-green-100 text-green-700",
  Thursday: "bg-orange-100 text-orange-700",
  Friday: "bg-pink-100 text-pink-700",
  Saturday: "bg-amber-100 text-amber-700",
  Sunday: "bg-red-100 text-red-700",
};

interface FormState {
  instructorId: string;
  centerId: string;
  dayOfWeek: string;
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
}

const defaultForm: FormState = {
  instructorId: "",
  centerId: "",
  dayOfWeek: "",
  morningStart: "09:00",
  morningEnd: "13:00",
  eveningStart: "14:00",
  eveningEnd: "18:00",
};

function ShiftFormSection({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const breakDuration = calcBreak(form.morningEnd, form.eveningStart);
  const morningDuration = calcHours(form.morningStart, form.morningEnd);
  const eveningDuration = calcHours(form.eveningStart, form.eveningEnd);

  return (
    <div className="space-y-4">
      {/* Morning Shift */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sunrise className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-amber-700">Morning Shift</span>
          {morningDuration !== "0h" && (
            <span className="ml-auto text-xs text-amber-600 font-medium">{morningDuration}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-amber-700">Work Start</Label>
            <Select value={form.morningStart} onValueChange={v => setForm(f => ({ ...f, morningStart: v }))}>
              <SelectTrigger className="h-9 border-amber-200 focus:ring-amber-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-amber-700">Work End</Label>
            <Select value={form.morningEnd} onValueChange={v => setForm(f => ({ ...f, morningEnd: v }))}>
              <SelectTrigger className="h-9 border-amber-200 focus:ring-amber-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Break Indicator */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1 h-px bg-border" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border">
          <Coffee className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">
            Break {form.morningEnd} – {form.eveningStart}
            {breakDuration !== "0h" && ` (${breakDuration})`}
          </span>
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Evening Shift */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sunset className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">Evening Shift</span>
          {eveningDuration !== "0h" && (
            <span className="ml-auto text-xs text-indigo-600 font-medium">{eveningDuration}</span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-indigo-700">Work Start</Label>
            <Select value={form.eveningStart} onValueChange={v => setForm(f => ({ ...f, eveningStart: v }))}>
              <SelectTrigger className="h-9 border-indigo-200 focus:ring-indigo-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-indigo-700">Work End</Label>
            <Select value={form.eveningEnd} onValueChange={v => setForm(f => ({ ...f, eveningEnd: v }))}>
              <SelectTrigger className="h-9 border-indigo-200 focus:ring-indigo-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{TIMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherSchedulesPage() {
  const { data: instructorsData } = useListInstructors({});
  const { data: centersData } = useListCenters();
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterInstructor, setFilterInstructor] = useState("all");
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState<{ schedule: Schedule; form: FormState } | null>(null);

  const [form, setForm] = useState<FormState>(defaultForm);

  const instructors = instructorsData?.instructors || [];
  const centers = centersData?.centers || [];

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const res = await apiCall("GET", "/teacher-schedules");
      setSchedules(res.schedules || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load schedules" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchedules(); }, []);

  const filtered = schedules.filter(s => {
    if (filterCenter !== "all" && s.centerId !== Number(filterCenter)) return false;
    if (filterInstructor !== "all" && s.instructorId !== Number(filterInstructor)) return false;
    return true;
  });

  const byInstructor: Record<number, { name: string; schedules: Schedule[] }> = {};
  for (const s of filtered) {
    if (!byInstructor[s.instructorId]) byInstructor[s.instructorId] = { name: s.instructorName, schedules: [] };
    byInstructor[s.instructorId].schedules.push(s);
  }

  const handleAdd = async () => {
    if (!form.instructorId || !form.centerId || !form.dayOfWeek) {
      toast({ variant: "destructive", title: "Please fill all fields" }); return;
    }
    const res = await apiCall("POST", "/teacher-schedules", {
      instructorId: Number(form.instructorId),
      centerId: Number(form.centerId),
      dayOfWeek: form.dayOfWeek,
      workStart: form.morningStart,
      morningEnd: form.morningEnd,
      eveningStart: form.eveningStart,
      workEnd: form.eveningEnd,
    });
    if (res.error) { toast({ variant: "destructive", title: res.error }); return; }
    toast({ title: "Schedule added!" });
    setAddModal(false);
    setForm(defaultForm);
    fetchSchedules();
  };

  const openEdit = (s: Schedule) => {
    setEditModal({
      schedule: s,
      form: {
        instructorId: String(s.instructorId),
        centerId: String(s.centerId),
        dayOfWeek: s.dayOfWeek,
        morningStart: s.workStart,
        morningEnd: s.morningEnd ?? "13:00",
        eveningStart: s.eveningStart ?? "14:00",
        eveningEnd: s.workEnd,
      },
    });
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    const { form: ef, schedule } = editModal;
    const res = await apiCall("PUT", `/teacher-schedules/${schedule.id}`, {
      workStart: ef.morningStart,
      morningEnd: ef.morningEnd,
      eveningStart: ef.eveningStart,
      workEnd: ef.eveningEnd,
    });
    if (res.error) { toast({ variant: "destructive", title: res.error }); return; }
    toast({ title: "Schedule updated!" });
    setEditModal(null);
    fetchSchedules();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this schedule?")) return;
    await apiCall("DELETE", `/teacher-schedules/${id}`);
    toast({ title: "Removed" });
    fetchSchedules();
  };

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold">Teacher Schedules</h1>
            <p className="text-muted-foreground mt-1">Set morning & evening shifts per teacher, center, and day.</p>
          </div>
          <Button onClick={() => { setForm(defaultForm); setAddModal(true); }} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Schedule
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterCenter} onValueChange={setFilterCenter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Centers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Centers</SelectItem>
              {centers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterInstructor} onValueChange={setFilterInstructor}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Instructors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instructors</SelectItem>
              {instructors.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            {filtered.length} schedule entries
          </div>
        </div>

        {/* Schedule Grid by Instructor */}
        {loading ? (
          <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-32 bg-card rounded-2xl animate-pulse" />)}</div>
        ) : Object.keys(byInstructor).length === 0 ? (
          <Card className="border-none premium-shadow">
            <CardContent className="py-16 text-center text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No schedules yet</p>
              <p className="text-sm mt-1">Click "Add Schedule" to set a teacher's working hours.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(byInstructor).map(([instrId, { name, schedules: instrSchedules }]) => (
            <motion.div key={instrId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-none premium-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="font-serif text-base">{name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{instrSchedules.length} working day{instrSchedules.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {DAYS.map(day => {
                      const s = instrSchedules.find(x => x.dayOfWeek === day);
                      if (!s) return null;
                      const hasTwoShifts = s.morningEnd && s.eveningStart;
                      return (
                        <div key={day} className="px-5 py-3 hover:bg-muted/20 group">
                          <div className="flex items-start gap-4">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-24 text-center shrink-0 mt-0.5 ${dayColor[day]}`}>{day}</span>
                            <div className="flex items-center gap-1.5 text-sm shrink-0 mt-0.5">
                              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground text-xs">{s.centerName}</span>
                            </div>
                            <div className="flex flex-col gap-1 ml-auto">
                              {hasTwoShifts ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <Sunrise className="w-3 h-3 text-amber-500" />
                                    <span className="text-xs font-medium">{s.workStart} – {s.morningEnd}</span>
                                    <span className="text-xs text-muted-foreground">({calcHours(s.workStart, s.morningEnd!)})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Coffee className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Break {s.morningEnd} – {s.eveningStart} ({calcBreak(s.morningEnd!, s.eveningStart!)})</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Sunset className="w-3 h-3 text-indigo-500" />
                                    <span className="text-xs font-medium">{s.eveningStart} – {s.workEnd}</span>
                                    <span className="text-xs text-muted-foreground">({calcHours(s.eveningStart!, s.workEnd)})</span>
                                  </div>
                                </>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-primary" />
                                  <span className="text-sm font-medium">{s.workStart} – {s.workEnd}</span>
                                  <span className="text-xs text-muted-foreground">({totalWorkHours(s)}h)</span>
                                </div>
                              )}
                              {hasTwoShifts && (
                                <p className="text-xs text-primary font-medium">{totalWorkHours(s)}h total</p>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)}>
                                <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(s.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Schedule Modal */}
      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Teacher Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><User className="w-3.5 h-3.5 text-muted-foreground" />Teacher</Label>
              <Select value={form.instructorId} onValueChange={v => setForm(f => ({ ...f, instructorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>{instructors.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.fullName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />Center</Label>
              <Select value={form.centerId} onValueChange={v => setForm(f => ({ ...f, centerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                <SelectContent>{centers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm"><CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />Day of Week</Label>
              <Select value={form.dayOfWeek} onValueChange={v => setForm(f => ({ ...f, dayOfWeek: v }))}>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ShiftFormSection form={form} setForm={setForm} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Add Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Modal */}
      <Dialog open={!!editModal} onOpenChange={open => { if (!open) setEditModal(null); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Working Hours</DialogTitle>
          </DialogHeader>
          {editModal && (
            <div className="space-y-4 pt-1">
              <div className="p-3 rounded-xl bg-muted/40 text-sm space-y-1">
                <p className="font-semibold">{editModal.schedule.instructorName}</p>
                <p className="text-muted-foreground">{editModal.schedule.dayOfWeek} · {editModal.schedule.centerName}</p>
              </div>
              <ShiftFormSection
                form={editModal.form}
                setForm={ef => setEditModal(prev => prev ? { ...prev, form: typeof ef === "function" ? ef(prev.form) : ef } : null)}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
                <Button onClick={handleEditSave}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
