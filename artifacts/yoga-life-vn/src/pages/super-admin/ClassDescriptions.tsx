import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, BookOpen, Search, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = BASE.startsWith("/__replco")
  ? "/api"
  : `${window.location.origin}${BASE}/api`.replace(/([^:])\/\//, "$1/");

async function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("yoga_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

interface ClassDef {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

interface FormData {
  name: string;
  description: string;
}

const EMPTY: FormData = { name: "", description: "" };

function ClassForm({
  initial,
  onSubmit,
  loading,
  onCancel,
}: {
  initial: FormData;
  onSubmit: (d: FormData) => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const [data, setData] = useState<FormData>(initial);
  const set = (patch: Partial<FormData>) => setData((d) => ({ ...d, ...patch }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(data);
      }}
      className="space-y-5 pt-2"
    >
      <div className="space-y-2">
        <Label htmlFor="cls-name">
          Class Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="cls-name"
          required
          value={data.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. Vinyasa Flow, Morning Hatha, Yin Yoga…"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cls-desc">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="cls-desc"
          required
          rows={4}
          value={data.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Describe what students will experience in this class, the benefits, and who it's suitable for…"
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          This description auto-fills when you select this class while building a schedule.
        </p>
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? "Saving…" : "Save Class"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function ClassDescriptions() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ClassDef | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ classDefinitions: ClassDef[] }>({
    queryKey: ["class-definitions"],
    queryFn: () => apiFetch("/class-definitions"),
  });
  const classes: ClassDef[] = data?.classDefinitions || [];

  const createMutation = useMutation({
    mutationFn: (d: FormData) =>
      apiFetch("/class-definitions", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-definitions"] });
      toast({ title: "Class added", description: "Class is now available in schedules." });
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: FormData }) =>
      apiFetch(`/class-definitions/${id}`, { method: "PUT", body: JSON.stringify(d) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-definitions"] });
      toast({ title: "Class updated" });
      setEditing(null);
      setDialogOpen(false);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/class-definitions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-definitions"] });
      toast({ title: "Class deleted" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
  );

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(cls: ClassDef) {
    setEditing(cls);
    setDialogOpen(true);
  }
  function handleSubmit(d: FormData) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, d });
    } else {
      createMutation.mutate(d);
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Class & Description</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage class types. These appear as options when building schedules — selecting a class
              auto-fills its description.
            </p>
          </div>
          <Button onClick={openAdd} className="shrink-0 gap-2">
            <Plus className="w-4 h-4" />
            Add New Class
          </Button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
          <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Auto-fill in Schedule Builder</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When creating a class schedule, admins pick a class from this list and the description
              automatically fills in — saving time and ensuring consistency.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes…"
            className="pl-9 h-10"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {search ? "No classes match your search" : "No classes yet"}
            </p>
            {!search && (
              <Button onClick={openAdd} variant="outline" className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Add your first class
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((cls, idx) => (
              <div
                key={cls.id}
                className="group flex items-start gap-4 p-4 bg-card rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {/* Index badge */}
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{cls.name}</h3>
                    {!cls.isActive && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {cls.description || (
                      <span className="italic text-muted-foreground/60">No description</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    onClick={() => openEdit(cls)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteId(cls.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer count */}
        {!isLoading && classes.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {filtered.length} of {classes.length} class{classes.length !== 1 ? "es" : ""}
          </p>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editing ? "Edit Class" : "Add New Class"}
            </DialogTitle>
          </DialogHeader>
          <ClassForm
            initial={editing ? { name: editing.name, description: editing.description } : EMPTY}
            onSubmit={handleSubmit}
            loading={isMutating}
            onCancel={() => {
              setDialogOpen(false);
              setEditing(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Delete Class?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the class from the list. Existing schedules using this class name will
            not be affected.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId !== null && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
