import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, BookOpen, Clock, ToggleLeft, ToggleRight, X, Tag } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const API_BASE = BASE.startsWith("/__replco")
  ? "/api"
  : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("yoga_token");
  return fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers || {}),
    },
  });
}

const LEVELS = [
  { value: "all_levels", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const CATEGORIES = [
  "Hatha", "Vinyasa", "Ashtanga", "Power", "Yin", "Restorative",
  "Meditation", "Prenatal", "Kids", "Hot Yoga", "Other",
];

const COLOR_PRESETS = [
  "#4a7c59", "#2d6a4f", "#52796f", "#84a98c",
  "#e07a5f", "#f2cc8f", "#81b29a", "#6b4226",
  "#3d405b", "#9b2335", "#457b9d", "#a8dadc",
];

const DURATION_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
  { value: 75, label: "75 min" },
  { value: 90, label: "90 min" },
  { value: 120, label: "2 hours" },
];

interface ClassDef {
  id: number;
  name: string;
  description: string;
  defaultDuration: number;
  level: string;
  category: string;
  color: string | null;
  imageUrl: string | null;
  benefits: string[];
  isActive: boolean;
  displayOrder: number;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  defaultDuration: 60,
  level: "all_levels",
  category: "Hatha",
  color: "#4a7c59",
  imageUrl: "",
  benefits: [] as string[],
  isActive: true,
};

function levelColor(level: string) {
  if (level === "beginner") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (level === "intermediate") return "bg-blue-100 text-blue-700 border-blue-200";
  if (level === "advanced") return "bg-purple-100 text-purple-700 border-purple-200";
  return "bg-muted text-foreground border-border";
}

export default function ClassLibrary() {
  const { toast } = useToast();
  const [classDefs, setClassDefs] = useState<ClassDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [benefitInput, setBenefitInput] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await apiFetch("/class-definitions");
      const data = await res.json();
      setClassDefs(data.classDefinitions || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load class library" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setBenefitInput("");
    setDialogOpen(true);
  };

  const openEdit = (def: ClassDef) => {
    setEditingId(def.id);
    setForm({
      name: def.name,
      description: def.description,
      defaultDuration: def.defaultDuration,
      level: def.level,
      category: def.category,
      color: def.color || "#4a7c59",
      imageUrl: def.imageUrl || "",
      benefits: def.benefits || [],
      isActive: def.isActive,
    });
    setBenefitInput("");
    setDialogOpen(true);
  };

  const addBenefit = () => {
    const trimmed = benefitInput.trim();
    if (!trimmed || form.benefits.includes(trimmed)) return;
    setForm(f => ({ ...f, benefits: [...f.benefits, trimmed] }));
    setBenefitInput("");
  };

  const removeBenefit = (b: string) => {
    setForm(f => ({ ...f, benefits: f.benefits.filter(x => x !== b) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, imageUrl: form.imageUrl || null };
      if (editingId !== null) {
        const res = await apiFetch(`/class-definitions/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        const res = await apiFetch("/class-definitions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
      }
      await load();
      setDialogOpen(false);
      toast({ title: editingId ? "Class updated." : "Class added to library." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}" from the class library?`)) return;
    try {
      const res = await apiFetch(`/class-definitions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await load();
      toast({ title: "Class deleted." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const toggleActive = async (def: ClassDef) => {
    try {
      await apiFetch(`/class-definitions/${def.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !def.isActive }),
      });
      await load();
    } catch {
      toast({ variant: "destructive", title: "Update failed" });
    }
  };

  const filtered = classDefs.filter(d => {
    if (filterCategory !== "all" && d.category !== filterCategory) return false;
    if (filterLevel !== "all" && d.level !== filterLevel) return false;
    return true;
  });

  const activeCount = classDefs.filter(d => d.isActive).length;

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Class Library</h1>
          <p className="text-muted-foreground mt-1">
            Define class types that instructors can use when building schedules.
          </p>
        </div>
        <Button className="rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New Class Type
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <BookOpen className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{classDefs.length}</p>
          <p className="text-xs text-muted-foreground">Total Classes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <ToggleRight className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <Tag className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">
            {new Set(classDefs.map(d => d.category)).size}
          </p>
          <p className="text-xs text-muted-foreground">Categories</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 h-8 text-sm rounded-full">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLevel} onValueChange={setFilterLevel}>
          <SelectTrigger className="w-36 h-8 text-sm rounded-full">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Class Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No class types found</h3>
          <p className="text-muted-foreground mb-4">
            {classDefs.length === 0
              ? "Create your first class type to get started."
              : "Try adjusting your filters."}
          </p>
          {classDefs.length === 0 && (
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add First Class</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(def => (
            <div
              key={def.id}
              className={`group bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${!def.isActive ? "opacity-60" : ""}`}
            >
              {/* Color bar */}
              <div
                className="h-2 w-full"
                style={{ backgroundColor: def.color || "#4a7c59" }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-foreground leading-tight">{def.name}</h3>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={() => openEdit(def)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(def.id, def.name)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {def.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{def.description}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${levelColor(def.level)}`}>
                    {LEVELS.find(l => l.value === def.level)?.label || def.level}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                    {def.category}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{def.defaultDuration} min</span>
                  </div>
                  <button
                    onClick={() => toggleActive(def)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    title={def.isActive ? "Click to deactivate" : "Click to activate"}
                  >
                    {def.isActive
                      ? <ToggleRight className="w-5 h-5 text-emerald-600" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>

                {def.benefits && def.benefits.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {def.benefits.slice(0, 3).map(b => (
                      <span key={b} className="px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">{b}</span>
                    ))}
                    {def.benefits.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{def.benefits.length - 3} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editingId ? "Edit Class Type" : "New Class Type"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Class Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Vinyasa Flow"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Describe what students will experience in this class…"
              />
            </div>

            {/* Level + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={form.level} onValueChange={v => setForm(f => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Default Duration */}
            <div className="space-y-1.5">
              <Label>Default Duration</Label>
              <Select
                value={String(form.defaultDuration)}
                onValueChange={v => setForm(f => ({ ...f, defaultDuration: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>Color Tag</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-7 h-7 rounded-full border-2 border-border cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-1.5">
              <Label>Key Benefits</Label>
              <div className="flex gap-2">
                <Input
                  value={benefitInput}
                  onChange={e => setBenefitInput(e.target.value)}
                  placeholder="e.g. Improves flexibility"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }}
                />
                <Button type="button" variant="outline" onClick={addBenefit}>Add</Button>
              </div>
              {form.benefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.benefits.map(b => (
                    <Badge key={b} variant="secondary" className="gap-1 pr-1">
                      {b}
                      <button
                        type="button"
                        onClick={() => removeBenefit(b)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label>Image URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>

            {/* Active */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
              >
                {form.isActive
                  ? <ToggleRight className="w-8 h-8 text-emerald-600" />
                  : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
              </button>
              <span className="text-sm text-foreground">
                {form.isActive ? "Active — visible when building schedules" : "Inactive — hidden from schedule builder"}
              </span>
            </div>

            <Button type="submit" className="w-full rounded-xl" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Class Type"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
