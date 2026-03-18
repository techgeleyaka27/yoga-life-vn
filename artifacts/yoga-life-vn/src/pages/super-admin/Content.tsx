import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole, useGetHeroContent, useUpdateHeroContent, useListTestimonials, useCreateTestimonial, useDeleteTestimonial, useListCenters } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Star, Save, Palette, Video, FileText, Edit, Play, ExternalLink, Upload, ImageIcon, Users, Building2, X, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "");

function apiFetch(method: string, path: string, body?: any) {
  const token = localStorage.getItem("yoga_token");
  return fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("yoga_token");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/api/cms/upload`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url;
}

// ─── Image Upload Button ─────────────────────────────────────────────────────

function ImageUploadButton({ currentUrl, onUpload, label = "Change Photo", className = "" }: {
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onUpload(url);
      toast({ title: "Photo uploaded successfully" });
    } catch {
      toast({ variant: "destructive", title: "Upload failed — try a smaller image (< 10MB)" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {currentUrl ? (
        <div className="relative rounded-xl overflow-hidden">
          <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="gap-1.5">
              <Camera className="w-4 h-4" />{uploading ? "Uploading..." : label}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-muted/20"
        >
          <Upload className="w-6 h-6" />
          <span className="text-sm font-medium">{uploading ? "Uploading..." : label}</span>
          <span className="text-xs">JPG, PNG, WebP up to 10MB</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

const PRESET_COLORS = [
  { name: "Forest Green", primary: "140 30% 30%" },
  { name: "Ocean Blue", primary: "210 70% 40%" },
  { name: "Deep Purple", primary: "270 50% 40%" },
  { name: "Warm Rose", primary: "350 60% 45%" },
  { name: "Amber Gold", primary: "38 90% 45%" },
  { name: "Teal", primary: "175 55% 35%" },
  { name: "Slate", primary: "215 25% 35%" },
  { name: "Crimson", primary: "0 60% 40%" },
];

const PRESET_FONTS = [
  { name: "DM Sans + Playfair (Default)", sans: "'DM Sans', sans-serif", serif: "'Playfair Display', serif", url: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" },
  { name: "Inter + Cormorant", sans: "'Inter', sans-serif", serif: "'Cormorant Garamond', serif", url: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" },
  { name: "Poppins + Lora", sans: "'Poppins', sans-serif", serif: "'Lora', serif", url: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap" },
  { name: "Nunito + Libre Baskerville", sans: "'Nunito', sans-serif", serif: "'Libre Baskerville', serif", url: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" },
  { name: "Raleway + Merriweather", sans: "'Raleway', sans-serif", serif: "'Merriweather', serif", url: "https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap" },
];

const LEVELS = ["beginner", "intermediate", "advanced", "all_levels"];
const CATEGORIES = ["Hatha", "Vinyasa", "Yin", "Ashtanga", "Meditation", "Power", "Restorative", "Prenatal", "Kids", "Other"];

interface OnlineClass {
  id: number; title: string; description: string; instructor: string;
  duration: string; level: string; category: string;
  thumbnailUrl: string; videoId: string; featured: boolean; isActive: boolean; displayOrder: number;
}

interface Teacher {
  id: number; name: string; title: string; bio: string;
  certifications: string; styles: string[]; photoUrl?: string | null;
  displayOrder: number; isActive: boolean;
}

const emptyClass = (): Partial<OnlineClass> => ({
  title: "", description: "", instructor: "", duration: "45 min",
  level: "all_levels", category: "Hatha", thumbnailUrl: "", videoId: "",
  featured: false, isActive: true, displayOrder: 0,
});

const emptyTeacher = (): Partial<Teacher> => ({
  name: "", title: "", bio: "", certifications: "", styles: [],
  photoUrl: null, displayOrder: 0, isActive: true,
});

export default function SuperAdminContent() {
  const { data: hero } = useGetHeroContent();
  const { data: testimonialsData } = useListTestimonials();
  const { data: centersData } = useListCenters();
  const updateHeroMut = useUpdateHeroContent();
  const createTestimonialMut = useCreateTestimonial();
  const deleteTestimonialMut = useDeleteTestimonial();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Hero
  const [heroForm, setHeroForm] = useState({ headline: "", subheadline: "", ctaText: "", imageUrl: "" });
  const [savingHero, setSavingHero] = useState(false);
  useEffect(() => {
    if (hero) setHeroForm({
      headline: hero.headline || "",
      subheadline: hero.subheadline || "",
      ctaText: hero.ctaText || "",
      imageUrl: (hero as any).imageUrl || "",
    });
  }, [hero]);

  // Brand
  const [selectedColor, setSelectedColor] = useState<typeof PRESET_COLORS[0] | null>(null);
  const [selectedFont, setSelectedFont] = useState<typeof PRESET_FONTS[0] | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);
  useEffect(() => {
    apiFetch("GET", "/cms/settings").then(({ settings }) => {
      if (settings?.primaryColor) setSelectedColor(PRESET_COLORS.find(c => c.primary === settings.primaryColor) || null);
      if (settings?.fontName) setSelectedFont(PRESET_FONTS.find(f => f.name === settings.fontName) || null);
    });
  }, []);

  // Teachers
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Partial<Teacher> | null>(null);
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>(emptyTeacher());
  const [teacherStyleInput, setTeacherStyleInput] = useState("");
  const [savingTeacher, setSavingTeacher] = useState(false);

  const loadTeachers = () => {
    apiFetch("GET", "/cms/teachers").then(r => { if (r.teachers) setTeachers(r.teachers); });
  };
  useEffect(() => { loadTeachers(); }, []);

  // Centers (studios)
  const [centerForms, setCenterForms] = useState<Record<number, { imageUrl: string; description: string }>>({});
  const [savingCenter, setSavingCenter] = useState<number | null>(null);
  useEffect(() => {
    if (centersData?.centers) {
      const forms: Record<number, { imageUrl: string; description: string }> = {};
      centersData.centers.forEach((c: any) => {
        forms[c.id] = { imageUrl: c.imageUrl || "", description: c.description || "" };
      });
      setCenterForms(forms);
    }
  }, [centersData]);

  // Online classes
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<OnlineClass> | null>(null);
  const [classForm, setClassForm] = useState<Partial<OnlineClass>>(emptyClass());
  const [savingClass, setSavingClass] = useState(false);
  const loadClasses = () => { apiFetch("GET", "/cms/online-classes").then(r => { if (r.classes) setClasses(r.classes); }); };
  useEffect(() => { loadClasses(); }, []);

  // Testimonials
  const [isTestimonialOpen, setIsTestimonialOpen] = useState(false);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSaveHero = async () => {
    setSavingHero(true);
    try {
      await updateHeroMut.mutateAsync({ data: { headline: heroForm.headline, subheadline: heroForm.subheadline, ctaText: heroForm.ctaText } });
      if (heroForm.imageUrl) await apiFetch("PUT", "/cms/hero-image", { imageUrl: heroForm.imageUrl });
      queryClient.invalidateQueries({ queryKey: ["/api/content/hero"] });
      toast({ title: "Hero section saved" });
    } catch {
      toast({ variant: "destructive", title: "Error saving" });
    } finally {
      setSavingHero(false);
    }
  };

  const handleSaveBrand = async () => {
    if (!selectedColor && !selectedFont) return;
    setSavingBrand(true);
    try {
      const settings: Record<string, string> = {};
      if (selectedColor) { settings.primaryColor = selectedColor.primary; settings.primaryColorName = selectedColor.name; }
      if (selectedFont) { settings.fontName = selectedFont.name; settings.fontSans = selectedFont.sans; settings.fontSerif = selectedFont.serif; settings.fontUrl = selectedFont.url; }
      await apiFetch("PUT", "/cms/settings", { settings });
      const root = document.documentElement;
      if (selectedColor) {
        root.style.setProperty("--primary", selectedColor.primary);
        root.style.setProperty("--ring", selectedColor.primary);
        root.style.setProperty("--sidebar-primary", selectedColor.primary);
      }
      if (selectedFont) {
        const link = document.createElement("link");
        link.id = "dynamic-font"; link.rel = "stylesheet"; link.href = selectedFont.url;
        document.getElementById("dynamic-font")?.remove();
        document.head.appendChild(link);
        root.style.setProperty("--font-sans", selectedFont.sans);
        root.style.setProperty("--font-serif", selectedFont.serif);
      }
      toast({ title: "Brand settings applied to all pages!" });
    } catch {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setSavingBrand(false);
    }
  };

  const openNewTeacher = () => { setEditingTeacher(null); setTeacherForm(emptyTeacher()); setTeacherStyleInput(""); setTeacherDialogOpen(true); };
  const openEditTeacher = (t: Teacher) => { setEditingTeacher(t); setTeacherForm({ ...t, styles: [...(t.styles || [])] }); setTeacherStyleInput(""); setTeacherDialogOpen(true); };

  const handleSaveTeacher = async () => {
    if (!teacherForm.name || !teacherForm.title) {
      toast({ variant: "destructive", title: "Name and title are required" }); return;
    }
    setSavingTeacher(true);
    try {
      if (editingTeacher?.id) {
        await apiFetch("PUT", `/cms/teachers/${editingTeacher.id}`, teacherForm);
        toast({ title: "Teacher updated" });
      } else {
        await apiFetch("POST", "/cms/teachers", teacherForm);
        toast({ title: "Teacher added" });
      }
      loadTeachers(); setTeacherDialogOpen(false);
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSavingTeacher(false); }
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm("Delete this teacher?")) return;
    await apiFetch("DELETE", `/cms/teachers/${id}`);
    loadTeachers(); toast({ title: "Teacher deleted" });
  };

  const handleSaveCenter = async (centerId: number) => {
    setSavingCenter(centerId);
    try {
      const form = centerForms[centerId];
      await apiFetch("PUT", `/centers/${centerId}`, { imageUrl: form.imageUrl || null, description: form.description });
      queryClient.invalidateQueries({ queryKey: ["/api/centers"] });
      toast({ title: "Studio updated" });
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSavingCenter(null); }
  };

  const openNewClass = () => { setEditingClass(null); setClassForm(emptyClass()); setClassDialogOpen(true); };
  const openEditClass = (cls: OnlineClass) => { setEditingClass(cls); setClassForm({ ...cls }); setClassDialogOpen(true); };
  const handleSaveClass = async () => {
    if (!classForm.title || !classForm.videoId || !classForm.thumbnailUrl || !classForm.instructor) {
      toast({ variant: "destructive", title: "Title, Instructor, Video ID, and Thumbnail are required" }); return;
    }
    setSavingClass(true);
    try {
      if (editingClass?.id) { await apiFetch("PUT", `/cms/online-classes/${editingClass.id}`, classForm); toast({ title: "Video updated" }); }
      else { await apiFetch("POST", "/cms/online-classes", classForm); toast({ title: "Video added" }); }
      loadClasses(); setClassDialogOpen(false);
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setSavingClass(false); }
  };
  const handleDeleteClass = async (id: number) => {
    if (!confirm("Delete this video?")) return;
    await apiFetch("DELETE", `/cms/online-classes/${id}`); loadClasses(); toast({ title: "Deleted" });
  };
  const handleToggleActive = async (cls: OnlineClass) => {
    await apiFetch("PUT", `/cms/online-classes/${cls.id}`, { ...cls, isActive: !cls.isActive }); loadClasses();
  };

  const handleCreateTestimonial = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createTestimonialMut.mutateAsync({ data: { authorName: fd.get("authorName") as string, authorRole: fd.get("authorRole") as string || null, content: fd.get("content") as string, rating: parseInt(fd.get("rating") as string) || 5 } });
      queryClient.invalidateQueries({ queryKey: ["/api/content/testimonials"] });
      setIsTestimonialOpen(false); toast({ title: "Review added" });
    } catch { toast({ variant: "destructive", title: "Error" }); }
  };
  const handleDeleteTestimonial = async (id: number) => {
    if (!confirm("Delete this review?")) return;
    await deleteTestimonialMut.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: ["/api/content/testimonials"] });
    toast({ title: "Deleted" });
  };

  const levelBadge: Record<string, string> = {
    beginner: "bg-emerald-100 text-emerald-700",
    intermediate: "bg-blue-100 text-blue-700",
    advanced: "bg-purple-100 text-purple-700",
    all_levels: "bg-orange-100 text-orange-700",
  };

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold">Website Content Manager</h1>
          <p className="text-muted-foreground mt-1">Edit every aspect of the public website — text, photos, colors, fonts</p>
        </div>

        <Tabs defaultValue="hero">
          <TabsList className="grid grid-cols-6 w-full max-w-2xl">
            <TabsTrigger value="brand"><Palette className="w-3.5 h-3.5 mr-1" />Brand</TabsTrigger>
            <TabsTrigger value="hero"><ImageIcon className="w-3.5 h-3.5 mr-1" />Hero</TabsTrigger>
            <TabsTrigger value="teachers"><Users className="w-3.5 h-3.5 mr-1" />Teachers</TabsTrigger>
            <TabsTrigger value="studios"><Building2 className="w-3.5 h-3.5 mr-1" />Studios</TabsTrigger>
            <TabsTrigger value="videos"><Video className="w-3.5 h-3.5 mr-1" />Videos</TabsTrigger>
            <TabsTrigger value="reviews"><Star className="w-3.5 h-3.5 mr-1" />Reviews</TabsTrigger>
          </TabsList>

          {/* ─── Brand ───────────────────────────────────────────── */}
          <TabsContent value="brand" className="space-y-6 mt-6">
            <Card className="border-none premium-shadow">
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2"><Palette className="w-5 h-5 text-primary" />Brand Colors</CardTitle>
                <CardDescription>Primary accent color used across the entire website</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {PRESET_COLORS.map(color => {
                    const [h, s, l] = color.primary.split(" ").map(v => parseFloat(v));
                    const bg = `hsl(${h}, ${s}%, ${l}%)`;
                    const isSelected = selectedColor?.name === color.name;
                    return (
                      <button key={color.name} onClick={() => setSelectedColor(color)}
                        className={`group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected ? "border-primary bg-primary/5 shadow-md" : "border-transparent hover:border-border bg-muted/30"}`}>
                        <div className="w-12 h-12 rounded-full shadow-md transition-transform group-hover:scale-110" style={{ backgroundColor: bg }} />
                        <span className="text-xs font-medium text-center">{color.name}</span>
                        {isSelected && <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: bg, color: "white" }}>Active</Badge>}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none premium-shadow">
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Typography</CardTitle>
                <CardDescription>Font pairing used across the website (body + headings)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  {PRESET_FONTS.map(font => {
                    const isSelected = selectedFont?.name === font.name;
                    return (
                      <button key={font.name} onClick={() => setSelectedFont(font)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${isSelected ? "border-primary bg-primary/5" : "border-transparent bg-muted/30 hover:border-border"}`}>
                        <div>
                          <p className="font-semibold text-sm">{font.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Body: {font.sans.split(",")[0].replace(/'/g, "")} · Headings: {font.serif.split(",")[0].replace(/'/g, "")}</p>
                        </div>
                        {isSelected && <Badge variant="outline" className="border-primary text-primary text-xs">Selected</Badge>}
                      </button>
                    );
                  })}
                </div>
                <Button onClick={handleSaveBrand} disabled={savingBrand || (!selectedColor && !selectedFont)}>
                  <Save className="w-4 h-4 mr-2" />{savingBrand ? "Applying..." : "Save & Apply Brand Settings"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Changes apply immediately to all pages for all visitors</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Hero ─────────────────────────────────────────────── */}
          <TabsContent value="hero" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none premium-shadow">
                <CardHeader>
                  <CardTitle className="font-serif">Hero Text</CardTitle>
                  <CardDescription>Main headline, description, and call-to-action button on the homepage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Main Headline</Label>
                    <Input value={heroForm.headline} onChange={e => setHeroForm(h => ({...h, headline: e.target.value}))} placeholder="Find Your Inner Peace" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sub-headline</Label>
                    <Textarea value={heroForm.subheadline} onChange={e => setHeroForm(h => ({...h, subheadline: e.target.value}))} className="resize-none h-24" placeholder="Join YOGA LIFE VN..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input value={heroForm.ctaText} onChange={e => setHeroForm(h => ({...h, ctaText: e.target.value}))} placeholder="Start Your Journey" />
                  </div>
                  <Button onClick={handleSaveHero} disabled={savingHero}>
                    <Save className="w-4 h-4 mr-2" />{savingHero ? "Saving..." : "Save Hero Content"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none premium-shadow">
                <CardHeader>
                  <CardTitle className="font-serif">Hero Background Photo</CardTitle>
                  <CardDescription>The large background image behind the main headline. Upload your own photo or paste a URL.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ImageUploadButton
                    currentUrl={heroForm.imageUrl}
                    onUpload={url => setHeroForm(h => ({...h, imageUrl: url}))}
                    label="Upload Hero Photo"
                    className="h-48"
                  />
                  <div className="space-y-2">
                    <Label>Or paste an image URL</Label>
                    <Input value={heroForm.imageUrl} onChange={e => setHeroForm(h => ({...h, imageUrl: e.target.value}))} placeholder="https://images.unsplash.com/..." />
                  </div>
                  <Button onClick={handleSaveHero} disabled={savingHero}>
                    <Save className="w-4 h-4 mr-2" />{savingHero ? "Saving..." : "Save Hero Photo"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Teachers ─────────────────────────────────────────── */}
          <TabsContent value="teachers" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-bold">Teachers / Instructors</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{teachers.length} teachers shown on the homepage</p>
                </div>
                <Button onClick={openNewTeacher}><Plus className="w-4 h-4 mr-2" />Add Teacher</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {teachers.map(teacher => (
                  <Card key={teacher.id} className={`border-none premium-shadow overflow-hidden transition-opacity ${!teacher.isActive ? "opacity-50" : ""}`}>
                    <div className="flex gap-4 p-4">
                      <div className="relative group w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-muted cursor-pointer" onClick={() => openEditTeacher(teacher)}>
                        {teacher.photoUrl
                          ? <img src={teacher.photoUrl} alt={teacher.name} className="w-full h-full object-cover object-top" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary/40">{teacher.name.charAt(0)}</div>
                        }
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-1">{teacher.name}</h3>
                        <p className="text-xs text-primary mt-0.5 line-clamp-1">{teacher.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{teacher.bio}</p>
                        {teacher.styles?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {teacher.styles.map(s => (
                              <span key={s} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/20">
                      <Switch checked={teacher.isActive} onCheckedChange={async v => { await apiFetch("PUT", `/cms/teachers/${teacher.id}`, { ...teacher, isActive: v, styles: teacher.styles }); loadTeachers(); }} />
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditTeacher(teacher)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteTeacher(teacher.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {teachers.length === 0 && <div className="col-span-3 text-center py-12 text-muted-foreground">No teachers yet</div>}
              </div>
            </div>

            <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-serif">{editingTeacher ? "Edit Teacher" : "Add Teacher"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <ImageUploadButton
                      currentUrl={teacherForm.photoUrl}
                      onUpload={url => setTeacherForm(f => ({...f, photoUrl: url}))}
                      label="Upload Profile Photo"
                      className="h-40"
                    />
                    <Input value={teacherForm.photoUrl || ""} onChange={e => setTeacherForm(f => ({...f, photoUrl: e.target.value}))} placeholder="Or paste a photo URL" className="text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={teacherForm.name || ""} onChange={e => setTeacherForm(f => ({...f, name: e.target.value}))} placeholder="Nguyễn Thị Lan" />
                    </div>
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input value={teacherForm.title || ""} onChange={e => setTeacherForm(f => ({...f, title: e.target.value}))} placeholder="Lead Instructor" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Bio</Label>
                    <Textarea value={teacherForm.bio || ""} onChange={e => setTeacherForm(f => ({...f, bio: e.target.value}))} className="resize-none h-20" placeholder="About this teacher..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Certifications</Label>
                    <Input value={teacherForm.certifications || ""} onChange={e => setTeacherForm(f => ({...f, certifications: e.target.value}))} placeholder="RYT 500, IYTTC Certified" />
                  </div>
                  <div className="space-y-2">
                    <Label>Yoga Styles (press Enter to add)</Label>
                    <div className="flex gap-2">
                      <Input value={teacherStyleInput} onChange={e => setTeacherStyleInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && teacherStyleInput.trim()) { e.preventDefault(); setTeacherForm(f => ({...f, styles: [...(f.styles||[]), teacherStyleInput.trim()]})); setTeacherStyleInput(""); }}}
                        placeholder="Hatha, Vinyasa..." />
                      <Button type="button" size="sm" onClick={() => { if (teacherStyleInput.trim()) { setTeacherForm(f => ({...f, styles: [...(f.styles||[]), teacherStyleInput.trim()]})); setTeacherStyleInput(""); }}}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(teacherForm.styles || []).map((s, i) => (
                        <span key={i} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                          {s}
                          <button onClick={() => setTeacherForm(f => ({...f, styles: (f.styles||[]).filter((_, j) => j !== i)}))} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Display Order</Label>
                      <Input type="number" value={teacherForm.displayOrder ?? 0} onChange={e => setTeacherForm(f => ({...f, displayOrder: parseInt(e.target.value) || 0}))} />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <Switch checked={teacherForm.isActive ?? true} onCheckedChange={v => setTeacherForm(f => ({...f, isActive: v}))} id="teacher-active" />
                      <Label htmlFor="teacher-active">Active</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setTeacherDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveTeacher} disabled={savingTeacher}>
                      <Save className="w-4 h-4 mr-2" />{savingTeacher ? "Saving..." : (editingTeacher ? "Update" : "Add Teacher")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ─── Studios ──────────────────────────────────────────── */}
          <TabsContent value="studios" className="mt-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-serif font-bold">Studio Locations</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Edit photos and descriptions for each studio shown on the homepage</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(centersData?.centers || []).map((center: any) => {
                  const form = centerForms[center.id] || { imageUrl: "", description: "" };
                  return (
                    <Card key={center.id} className="border-none premium-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-serif text-base">{center.name}</CardTitle>
                        <CardDescription>{center.address}, {center.city}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Studio Photo</Label>
                          <ImageUploadButton
                            currentUrl={form.imageUrl}
                            onUpload={url => setCenterForms(f => ({...f, [center.id]: {...f[center.id], imageUrl: url}}))}
                            label="Upload Studio Photo"
                            className="h-40"
                          />
                          <Input value={form.imageUrl} onChange={e => setCenterForms(f => ({...f, [center.id]: {...f[center.id], imageUrl: e.target.value}}))} placeholder="Or paste an image URL" className="text-xs" />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea value={form.description} onChange={e => setCenterForms(f => ({...f, [center.id]: {...f[center.id], description: e.target.value}}))} className="resize-none h-16 text-sm" placeholder="Describe this studio..." />
                        </div>
                        <Button onClick={() => handleSaveCenter(center.id)} disabled={savingCenter === center.id} size="sm" className="w-full">
                          <Save className="w-3.5 h-3.5 mr-2" />{savingCenter === center.id ? "Saving..." : "Save Studio"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ─── Videos ───────────────────────────────────────────── */}
          <TabsContent value="videos" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-bold">Online Video Classes</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{classes.length} videos shown on the Online Classes page</p>
                </div>
                <Button onClick={openNewClass}><Plus className="w-4 h-4 mr-2" />Add Video</Button>
              </div>
              {classes.length === 0 && <div className="text-center py-16 text-muted-foreground">No videos yet.</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map(cls => (
                  <Card key={cls.id} className={`border-none premium-shadow overflow-hidden ${!cls.isActive ? "opacity-60" : ""}`}>
                    <div className="relative h-40 overflow-hidden">
                      <img src={cls.thumbnailUrl} alt={cls.title} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=600&h=340&fit=crop"; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <div>
                          <p className="text-white font-semibold text-sm line-clamp-1">{cls.title}</p>
                          <p className="text-white/80 text-xs">{cls.instructor}</p>
                        </div>
                        <div className="flex gap-1.5">
                          {cls.featured && <Badge className="bg-yellow-400 text-yellow-900 text-[10px] px-1.5">Featured</Badge>}
                          <Badge className={`${levelBadge[cls.level] || "bg-gray-100"} text-[10px] px-1.5`}>{cls.level.replace("_", " ")}</Badge>
                        </div>
                      </div>
                    </div>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Play className="w-3 h-3" />{cls.duration}</span>
                          <span>{cls.category}</span>
                          <a href={`https://youtu.be/${cls.videoId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="w-3 h-3" />Preview
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch checked={cls.isActive} onCheckedChange={() => handleToggleActive(cls)} />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditClass(cls)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteClass(cls.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-serif">{editingClass ? "Edit Video" : "Add Video"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={classForm.title || ""} onChange={e => setClassForm(f => ({...f, title: e.target.value}))} placeholder="Morning Hatha Flow" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={classForm.description || ""} onChange={e => setClassForm(f => ({...f, description: e.target.value}))} className="resize-none h-16" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Instructor *</Label>
                      <Input value={classForm.instructor || ""} onChange={e => setClassForm(f => ({...f, instructor: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Input value={classForm.duration || ""} onChange={e => setClassForm(f => ({...f, duration: e.target.value}))} placeholder="45 min" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Level</Label>
                      <Select value={classForm.level || "all_levels"} onValueChange={v => setClassForm(f => ({...f, level: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={classForm.category || "Hatha"} onValueChange={v => setClassForm(f => ({...f, category: v}))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube Video ID *</Label>
                    <Input value={classForm.videoId || ""} onChange={e => setClassForm(f => ({...f, videoId: e.target.value}))} placeholder="e.g. v7AYKMP6rOE" />
                    <p className="text-xs text-muted-foreground">From the URL: youtube.com/watch?v=<strong>v7AYKMP6rOE</strong></p>
                  </div>
                  <div className="space-y-2">
                    <Label>Thumbnail</Label>
                    <ImageUploadButton currentUrl={classForm.thumbnailUrl} onUpload={url => setClassForm(f => ({...f, thumbnailUrl: url}))} label="Upload Thumbnail" className="h-32" />
                    <Input value={classForm.thumbnailUrl || ""} onChange={e => setClassForm(f => ({...f, thumbnailUrl: e.target.value}))} placeholder="Or paste thumbnail URL" className="text-xs" />
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={classForm.featured ?? false} onCheckedChange={v => setClassForm(f => ({...f, featured: v}))} id="feat" />
                      <Label htmlFor="feat">Featured</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={classForm.isActive ?? true} onCheckedChange={v => setClassForm(f => ({...f, isActive: v}))} id="act" />
                      <Label htmlFor="act">Active</Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setClassDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveClass} disabled={savingClass}>
                      <Save className="w-4 h-4 mr-2" />{savingClass ? "Saving..." : (editingClass ? "Update" : "Add Video")}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ─── Reviews ──────────────────────────────────────────── */}
          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-bold">Customer Reviews</h2>
                  <p className="text-sm text-muted-foreground">Testimonials shown on the homepage</p>
                </div>
                <Button variant="outline" onClick={() => setIsTestimonialOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Review</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(testimonialsData?.testimonials || []).map(t => (
                  <Card key={t.id} className="border-none premium-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-0.5 mb-3">{Array.from({length: t.rating}).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                        <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0" onClick={() => handleDeleteTestimonial(t.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 italic">"{t.content}"</p>
                      <p className="text-sm font-medium">{t.authorName}</p>
                      {t.authorRole && <p className="text-xs text-muted-foreground">{t.authorRole}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {(testimonialsData?.testimonials || []).length === 0 && <div className="text-center py-10 text-muted-foreground">No reviews yet</div>}
            </div>
            <Dialog open={isTestimonialOpen} onOpenChange={setIsTestimonialOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-serif">Add Customer Review</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateTestimonial} className="space-y-4 pt-2">
                  <div className="space-y-2"><Label>Customer Name</Label><Input name="authorName" placeholder="Nguyễn Thị Lan" required /></div>
                  <div className="space-y-2"><Label>Title / Description</Label><Input name="authorRole" placeholder="Member at YOGA LIFE VN" /></div>
                  <div className="space-y-2"><Label>Review Text</Label><Textarea name="content" className="resize-none h-24" required /></div>
                  <div className="space-y-2"><Label>Star Rating (1–5)</Label><Input name="rating" type="number" min="1" max="5" defaultValue="5" /></div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsTestimonialOpen(false)}>Cancel</Button>
                    <Button type="submit">Add Review</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
