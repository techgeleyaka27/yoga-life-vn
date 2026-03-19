import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { useListEnrollments, useListClasses } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, User, CreditCard, Clock, Activity, Wifi, MapPin, Sparkles, Zap, Video, BookOpen } from "lucide-react";
import { Link } from "wouter";

const ACCESS_META: Record<string, { label: string; icon: any; color: string; bg: string; canOnline: boolean; canOffline: boolean }> = {
  online:   { label: "Online Only",       icon: Wifi,     color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",   canOnline: true,  canOffline: false },
  offline:  { label: "In-Studio Only",    icon: MapPin,   color: "text-green-600",  bg: "bg-green-50 border-green-200", canOnline: false, canOffline: true  },
  both:     { label: "Online + Studio",   icon: Sparkles, color: "text-primary",    bg: "bg-primary/5 border-primary/20", canOnline: true, canOffline: true },
  drop_in:  { label: "Drop-In",           icon: Zap,      color: "text-orange-500", bg: "bg-orange-50 border-orange-200", canOnline: false, canOffline: true },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useListEnrollments({ userId: user?.id });
  const { data: classesData } = useListClasses();

  const activeEnrollments = (enrollmentsData?.enrollments || []).filter((e: any) => e.status === "active");
  const activeEnrollment = activeEnrollments[0];
  const membershipType = (activeEnrollment as any)?.membershipType ?? null;
  const accessMeta = membershipType ? ACCESS_META[membershipType] ?? null : null;

  const upcomingClasses = (classesData?.classes || []).slice(0, 3);

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-serif font-bold">
            {user?.fullName.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">{t.dashboard.greeting}, {user?.fullName?.split(' ')[0]}</h1>
            <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Membership Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-none premium-shadow bg-card overflow-hidden">
              <div className="h-2 bg-primary w-full" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <CreditCard className="w-5 h-5 text-primary" /> {t.dashboard.myMembership}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enrollmentsLoading ? (
                  <div className="animate-pulse h-20 bg-muted rounded-xl" />
                ) : activeEnrollment ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <h4 className="font-bold text-lg text-primary">{activeEnrollment.membershipName}</h4>
                      <p className="text-sm text-muted-foreground">{activeEnrollment.centerName}</p>
                    </div>

                    {/* Access level badge */}
                    {accessMeta && (
                      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${accessMeta.bg}`}>
                        <accessMeta.icon className={`w-4 h-4 shrink-0 ${accessMeta.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold uppercase tracking-wider ${accessMeta.color}`}>Your Access</p>
                          <p className="text-sm font-bold text-foreground">{accessMeta.label}</p>
                        </div>
                      </div>
                    )}

                    {/* What you can do */}
                    {accessMeta && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">With this plan you can:</p>
                        <div className="space-y-1.5">
                          <div className={`flex items-center gap-2 text-sm ${accessMeta.canOnline ? "text-foreground" : "text-muted-foreground/50 line-through"}`}>
                            <Video className="w-3.5 h-3.5 shrink-0" />
                            Watch online classes on-demand
                          </div>
                          <div className={`flex items-center gap-2 text-sm ${accessMeta.canOffline ? "text-foreground" : "text-muted-foreground/50 line-through"}`}>
                            <BookOpen className="w-3.5 h-3.5 shrink-0" />
                            Book in-studio classes
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-sm border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.dashboard.status}</span>
                        <span className="text-green-600 font-medium uppercase tracking-wider text-xs">{t.dashboard.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t.dashboard.validUntil}</span>
                        <span className="font-medium text-foreground">
                          {format(new Date(activeEnrollment.endDate), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex flex-col gap-2 pt-1">
                      {accessMeta?.canOnline && (
                        <Link href="/online-classes">
                          <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                            <Video className="w-4 h-4" />Watch Online Classes
                          </Button>
                        </Link>
                      )}
                      {accessMeta?.canOffline && (
                        <Link href="/classes">
                          <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-green-600 border-green-200 hover:bg-green-50">
                            <BookOpen className="w-4 h-4" />Book a Studio Class
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground mb-4">{t.dashboard.noMembership}</p>
                    <Link href="/memberships">
                      <Button className="w-full">{t.dashboard.explorePlans}</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none premium-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <User className="w-5 h-5 text-primary" /> {t.dashboard.profileDetails}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t.dashboard.email}</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                {user?.phone && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t.dashboard.phone}</p>
                    <p className="font-medium">{user.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{t.dashboard.memberSince}</p>
                  <p className="font-medium">{user?.createdAt ? format(new Date(user.createdAt), "MMM yyyy") : 'Recently'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Classes & Schedule */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-none premium-shadow">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <Calendar className="w-5 h-5 text-primary" /> {t.dashboard.upcomingClasses}
                </CardTitle>
                <Link href="/classes">
                  <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">{t.dashboard.viewFullSchedule}</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {upcomingClasses.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground text-sm">{t.dashboard.noUpcomingClasses}</p>
                    <Link href="/classes">
                      <Button variant="outline" className="mt-4">{t.dashboard.viewFullSchedule}</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingClasses.map((cls: any) => (
                      <div key={cls.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">{cls.dayOfWeek} · {cls.startTime}–{cls.endTime}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{cls.style}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
