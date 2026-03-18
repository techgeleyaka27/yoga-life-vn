import { Link } from "wouter";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGetHeroContent, useListTestimonials, useListCenters } from "@workspace/api-client-react";
import { ArrowRight, MapPin, Star, Heart, Calendar as CalendarIcon, Users, Award, BookOpen, Globe, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useLang } from "@/lib/lang-context";

interface DbTeacher {
  id: number; name: string; title: string; bio: string;
  certifications: string; styles: string[]; photoUrl?: string | null;
  displayOrder: number; isActive: boolean;
}

const TRAINING_PROGRAMS = [
  {
    hours: 200,
    titleKey: "t200Title",
    descKey: "t200Desc",
    featuresKey: "t200Features",
    color: "from-green-500/20 to-emerald-500/10",
    accent: "bg-green-600",
    textAccent: "text-green-700",
    borderAccent: "border-green-200",
    badge: "bg-green-100 text-green-800",
    duration: "3 months",
  },
  {
    hours: 300,
    titleKey: "t300Title",
    descKey: "t300Desc",
    featuresKey: "t300Features",
    color: "from-blue-500/20 to-indigo-500/10",
    accent: "bg-blue-600",
    textAccent: "text-blue-700",
    borderAccent: "border-blue-200",
    badge: "bg-blue-100 text-blue-800",
    duration: "5 months",
    popular: true,
  },
  {
    hours: 500,
    titleKey: "t500Title",
    descKey: "t500Desc",
    featuresKey: "t500Features",
    color: "from-primary/20 to-secondary/10",
    accent: "bg-primary",
    textAccent: "text-primary",
    borderAccent: "border-primary/30",
    badge: "bg-primary/10 text-primary",
    duration: "8 months",
  },
];

export default function Home() {
  const { t } = useLang();
  const { data: heroData } = useGetHeroContent();
  const { data: testimonialsData } = useListTestimonials();
  const { data: centersData } = useListCenters();
  const [teachers, setTeachers] = useState<DbTeacher[]>([]);

  useEffect(() => {
    const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
    fetch(`${base}/api/cms/teachers`)
      .then(r => r.json())
      .then(d => { if (d.teachers) setTeachers(d.teachers.filter((t: DbTeacher) => t.isActive)); })
      .catch(() => {});
  }, []);

  const hero = heroData || {
    headline: "Find Your Inner Peace",
    subheadline: "Join our vibrant community and transform your mind, body, and spirit through the practice of yoga.",
    ctaText: t.home.startJourney,
    imageUrl: `${import.meta.env.BASE_URL}images/hero-yoga.png`
  };

  const features = [
    { title: t.home.feature1Title, desc: t.home.feature1Desc, icon: Users },
    { title: t.home.feature2Title, desc: t.home.feature2Desc, icon: CalendarIcon },
    { title: t.home.feature3Title, desc: t.home.feature3Desc, icon: Heart },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src={hero.imageUrl || `${import.meta.env.BASE_URL}images/hero-yoga.png`}
            alt="Yoga Studio"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wider mb-6">
              {t.home.welcome}
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-foreground leading-tight mb-6">
              {hero.headline}
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-10 leading-relaxed max-w-xl">
              {hero.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:-translate-y-1 transition-all">
                  {hero.ctaText}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/classes">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-primary/20 bg-background/50 backdrop-blur hover:bg-background/80">
                  {t.home.viewSchedule}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30 relative">
        <img src={`${import.meta.env.BASE_URL}images/abstract-leaf.png`} alt="Pattern" className="absolute top-0 right-0 w-64 h-64 opacity-10 object-cover pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="border-none shadow-none bg-transparent group">
                    <CardContent className="pt-6">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-xl font-serif font-bold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Centers Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">{t.home.ourStudios}</h2>
            <p className="text-muted-foreground text-lg">{t.home.studiosDesc}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {centersData?.centers?.slice(0, 3).map((center, idx) => (
              <motion.div
                key={center.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="overflow-hidden premium-shadow group cursor-pointer hover:-translate-y-1 transition-all duration-300">
                  <div className="h-48 bg-muted relative overflow-hidden">
                    <img
                      src={center.imageUrl || `https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80&w=800`}
                      alt={center.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-serif font-bold mb-2">{center.name}</h3>
                    <div className="flex items-start text-muted-foreground text-sm mb-4">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-primary" />
                      <span>{center.address}, {center.city}</span>
                    </div>
                    <Link href={`/classes?centerId=${center.id}`}>
                      <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                        {t.home.viewSchedule}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/centers">
              <Button variant="ghost" className="font-semibold text-primary hover:bg-primary/5">
                {t.home.ourStudios} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Teachers Section */}
      <section className="py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wider mb-4"
            >
              {t.home.ourInstructors}
            </motion.span>
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">{t.home.ourInstructors}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teachers.map((teacher, idx) => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="overflow-hidden border-none premium-shadow group hover:-translate-y-1 transition-all duration-300">
                  <div className="h-60 relative overflow-hidden bg-muted">
                    {teacher.photoUrl ? (
                      <img
                        src={teacher.photoUrl}
                        alt={teacher.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-primary/20 bg-gradient-to-br from-primary/5 to-secondary/10">
                        {teacher.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex flex-wrap gap-1">
                        {(teacher.styles || []).map(s => (
                          <span key={s} className="bg-background/80 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-serif font-bold text-lg leading-tight mb-0.5">{teacher.name}</h3>
                    <p className="text-primary text-xs font-semibold mb-2">{teacher.title}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-3">{teacher.bio}</p>
                    {teacher.certifications && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Award className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{teacher.certifications}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Teacher Training Section */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-semibold tracking-wider mb-4"
            >
              Teacher Training
            </motion.span>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">{t.home.teacherTrainingTitle}</h2>
            <p className="text-muted-foreground text-lg">{t.home.teacherTrainingDesc}</p>
          </div>

          {/* Certification badges */}
          <div className="flex items-center justify-center gap-6 mb-14 flex-wrap">
            {[
              { icon: Award, label: t.home.iyttcCert, color: "text-amber-600 bg-amber-50 border-amber-200" },
              { icon: Globe, label: t.home.yogalifeCert, color: "text-primary bg-primary/5 border-primary/20" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className={`flex items-center gap-2 px-5 py-2.5 rounded-full border font-semibold text-sm ${color}`}>
                <Icon className="w-5 h-5" />
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TRAINING_PROGRAMS.map((program, idx) => {
              const titleKey = program.titleKey as keyof typeof t.home;
              const descKey = program.descKey as keyof typeof t.home;
              const featuresKey = program.featuresKey as keyof typeof t.home;
              const features = (t.home[featuresKey] as string).split("|");

              return (
                <motion.div
                  key={program.hours}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.12 }}
                  className={program.popular ? "md:-mt-6 md:mb-6" : ""}
                >
                  <Card className={`relative overflow-hidden border ${program.borderAccent} hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
                    {program.popular && (
                      <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-[11px] font-bold text-center py-1.5 uppercase tracking-widest">
                        Most Popular
                      </div>
                    )}
                    <div className={`bg-gradient-to-br ${program.color} ${program.popular ? "pt-10" : "pt-6"} pb-6 px-6`}>
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-6xl font-serif font-bold text-foreground">{program.hours}</span>
                        <span className={`text-lg font-semibold ${program.textAccent} mb-2`}>{t.home.hoursLabel}</span>
                      </div>
                      <h3 className="font-serif font-bold text-xl mb-1">{t.home[titleKey] as string}</h3>
                      <p className="text-sm text-muted-foreground">{program.duration}</p>
                    </div>
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{t.home[descKey] as string}</p>
                      <ul className="space-y-2 mb-6">
                        {features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className={`w-4 h-4 ${program.textAccent} shrink-0 mt-0.5`} />
                            <span className="text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center gap-2 mb-5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${program.badge}`}>
                          <Award className="w-3 h-3 inline mr-1" />IYTTC
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${program.badge}`}>
                          <BookOpen className="w-3 h-3 inline mr-1" />YOGA LIFE VN
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link href="/register" className="flex-1">
                          <Button className={`w-full h-11 rounded-xl text-sm ${program.popular ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"}`}>
                            {t.home.trainingApply}
                          </Button>
                        </Link>
                        <Button variant="outline" className={`h-11 px-4 rounded-xl text-sm border ${program.borderAccent} ${program.textAccent}`}>
                          {t.home.trainingLearn}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonialsData?.testimonials && testimonialsData.testimonials.length > 0 && (
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h2 className="text-4xl font-serif font-bold text-center mb-16">{t.home.membersLove}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonialsData.testimonials.slice(0, 3).map((t2, idx) => (
                <motion.div
                  key={t2.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-background/10 backdrop-blur p-8 rounded-3xl border border-background/20"
                >
                  <div className="flex gap-1 mb-6 text-secondary">
                    {[...Array(t2.rating)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                  </div>
                  <p className="text-lg leading-relaxed mb-8 italic">"{t2.content}"</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-xl">
                      {t2.avatarUrl ? <img src={t2.avatarUrl} className="w-full h-full rounded-full object-cover" alt={t2.authorName} /> : t2.authorName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold">{t2.authorName}</h4>
                      <p className="text-sm opacity-80">{t2.authorRole}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-card py-12 border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Logo" className="w-12 h-12 mx-auto mb-6 opacity-80 grayscale" />
          <p className="text-muted-foreground font-serif text-xl mb-4">Find your center. Breathe. Live.</p>
          <p className="text-sm text-muted-foreground/60">© {new Date().getFullYear()} YOGA LIFE VN. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
