import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { useListEnrollments } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { MembershipUpgradeModal } from "@/components/MembershipUpgradeModal";
import { Link } from "wouter";
import { Play, Lock, Clock, Signal, CheckCircle2, X, Wifi, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "");

interface OnlineClass {
  id: number;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: string;
  category: string;
  thumbnailUrl: string;
  videoId: string;
  featured: boolean;
  isActive: boolean;
  displayOrder: number;
}

const levelColors: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700 border-emerald-200",
  intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  advanced: "bg-purple-100 text-purple-700 border-purple-200",
  all_levels: "bg-orange-100 text-orange-700 border-orange-200",
};

const levelLabels: Record<string, Record<string, string>> = {
  en: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", all_levels: "All Levels" },
  vi: { beginner: "Người mới", intermediate: "Trung cấp", advanced: "Nâng cao", all_levels: "Mọi cấp độ" },
};

type GateReason = "unauthenticated" | "no_membership" | null;

export default function OnlineClasses() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const o = t.online;
  const [classes, setClasses] = useState<OnlineClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<OnlineClass | null>(null);
  const [gateReason, setGateReason] = useState<GateReason>(null);
  const [watchingClass, setWatchingClass] = useState<OnlineClass | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: enrollmentsData } = useListEnrollments(
    { userId: user?.id },
    { query: { enabled: !!user } }
  );

  useEffect(() => {
    fetch(`${BASE}/api/cms/online-classes`)
      .then(r => r.json())
      .then(d => {
        if (d.classes) setClasses(d.classes.filter((c: OnlineClass) => c.isActive));
      })
      .finally(() => setLoading(false));
  }, []);

  const activeEnrollments = (enrollmentsData?.enrollments || []).filter((e: any) => e.status === "active");
  const hasOnlineAccess = activeEnrollments.some((e: any) =>
    e.membershipType === "online" || e.membershipType === "both"
  );

  const categories = ["all", ...Array.from(new Set(classes.map(c => c.category)))];
  const filteredClasses = activeCategory === "all"
    ? classes
    : classes.filter(c => c.category === activeCategory);

  const handleWatch = (cls: OnlineClass) => {
    if (!user) { setSelectedClass(cls); setGateReason("unauthenticated"); return; }
    if (!hasOnlineAccess) { setSelectedClass(cls); setShowUpgradeModal(true); return; }
    setWatchingClass(cls);
  };

  const closeGate = () => { setGateReason(null); setSelectedClass(null); };

  const getLevelLabel = (level: string) => levelLabels[lang]?.[level] || level;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-24 pb-16 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-24 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-20 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto px-4 relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full">
              <Wifi className="w-4 h-4" />
              {o.liveBadge}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-3 max-w-2xl leading-tight">
            {o.heroTitle}<br />
            <span className="text-primary">{o.heroSubtitle}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mb-8">
            {o.heroDesc.replace("{count}", String(classes.length))}
          </p>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            {[
              { icon: Play, label: `${classes.length} ${o.videos}` },
              { icon: Signal, label: "HD Quality" },
              { icon: Clock, label: o.duration },
              { icon: CheckCircle2, label: o.allLevels },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="sticky top-20 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat === "all" ? o.all : cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Class Grid */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse h-64" />
            ))}
          </div>
        )}

        {!loading && (
          <>
            {/* Featured */}
            {activeCategory === "all" && (() => {
              const featured = filteredClasses.find(c => c.featured);
              if (!featured) return null;
              return (
                <div className="mb-10">
                  <h2 className="text-xl font-serif font-semibold mb-4">{o.featured}</h2>
                  <div className="relative rounded-3xl overflow-hidden group cursor-pointer premium-shadow"
                    onClick={() => handleWatch(featured)}>
                    <div className="relative h-64 md:h-80">
                      <img src={featured.thumbnailUrl} alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div whileHover={{ scale: 1.1 }}
                          className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                          <Play className="w-7 h-7 text-primary fill-primary ml-1" />
                        </motion.div>
                      </div>
                      <div className="absolute bottom-0 left-0 p-6 md:p-8">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium mb-3 inline-block ${levelColors[featured.level]}`}>
                          {getLevelLabel(featured.level)}
                        </span>
                        <h3 className="text-white text-2xl md:text-3xl font-serif font-bold mb-1">{featured.title}</h3>
                        <p className="text-white/80 text-sm">{featured.instructor} · {featured.duration}</p>
                      </div>
                      {(!user || !hasOnlineAccess) && (
                        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          {o.memberBadge}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredClasses.filter(c => activeCategory !== "all" || !c.featured).map((cls, idx) => (
                <motion.div key={cls.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className="border-none premium-shadow overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300"
                    onClick={() => handleWatch(cls)}>
                    <div className="relative h-44 overflow-hidden">
                      <img src={cls.thumbnailUrl} alt={cls.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 text-primary fill-primary ml-0.5" />
                        </div>
                      </div>
                      {(!user || !hasOnlineAccess) && (
                        <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-2.5 left-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${levelColors[cls.level]}`}>
                          {getLevelLabel(cls.level)}
                        </span>
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />{cls.duration}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs text-primary font-medium mb-1">{cls.category}</p>
                      <h3 className="font-serif font-semibold leading-snug line-clamp-2 mb-1.5">{cls.title}</h3>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">{cls.instructor.charAt(0)}</span>
                        </div>
                        <span className="text-xs font-medium text-primary truncate">{cls.instructor}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Gate — Unauthenticated */}
      <AnimatePresence>
        {gateReason === "unauthenticated" && selectedClass && (
          <Dialog open onOpenChange={closeGate}>
            <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
              <div className="relative h-40">
                <img src={selectedClass.thumbnailUrl} alt={selectedClass.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20" />
                <button onClick={closeGate} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-4">
                  <p className="text-white text-xs opacity-80">{selectedClass.category} · {selectedClass.duration}</p>
                  <h3 className="text-white font-serif font-bold text-lg">{selectedClass.title}</h3>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg">{o.gate.signInTitle}</h4>
                    <p className="text-sm text-muted-foreground">{o.gate.signInDesc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" onClick={closeGate}>
                    <Button variant="outline" className="w-full">
                      <LogIn className="w-4 h-4 mr-2" />
                      {o.gate.loginBtn}
                    </Button>
                  </Link>
                  <Link href="/register" onClick={closeGate}>
                    <Button className="w-full">{o.gate.registerBtn}</Button>
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs text-muted-foreground">{o.gate.or}</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <p className="text-sm font-medium mb-1">{o.gate.alreadyAccount}</p>
                  <p className="text-xs text-muted-foreground mb-3">{o.gate.alreadyAccountDesc}</p>
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" />{o.gate.unlimitedVideos}</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-primary" />{o.gate.hdQuality}</span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Membership Upgrade Modal */}
      <MembershipUpgradeModal
        open={showUpgradeModal}
        onClose={() => { setShowUpgradeModal(false); setSelectedClass(null); }}
        reason="online"
      />

      {/* Video Player Modal */}
      <AnimatePresence>
        {watchingClass && (
          <Dialog open onOpenChange={() => setWatchingClass(null)}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 bg-black">
              <div className="relative">
                <button onClick={() => setWatchingClass(null)}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="aspect-video w-full">
                  <iframe
                    src={`https://www.youtube.com/embed/${watchingClass.videoId}?autoplay=1&rel=0`}
                    title={watchingClass.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen className="w-full h-full"
                  />
                </div>
              </div>
              <div className="bg-background p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${levelColors[watchingClass.level]}`}>
                      {getLevelLabel(watchingClass.level)}
                    </span>
                    <h3 className="font-serif font-bold text-xl mt-2">{watchingClass.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{watchingClass.instructor} · {watchingClass.duration} · {watchingClass.category}</p>
                    <p className="text-sm text-muted-foreground mt-2">{watchingClass.description}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {o.memberBadge}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
