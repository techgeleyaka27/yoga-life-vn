import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { useListEnrollments, useListClasses } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, User, CreditCard, Clock, Activity } from "lucide-react";
import { Link } from "wouter";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  
  // In a real scenario, we'd fetch enrollments for this specific user
  // The API spec has `userId` as a query param
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useListEnrollments({ userId: user?.id });
  const { data: classesData } = useListClasses(); // Ideally filtered by centerId if user belongs to one

  const activeEnrollment = enrollmentsData?.enrollments?.find(e => e.status === 'active');

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
          <div className="lg:col-span-1 space-y-8">
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
                    <div className="space-y-2 text-sm">
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
                <div className="space-y-4">
                  {!classesData?.classes?.length ? (
                    <p className="text-muted-foreground text-center py-8">{t.dashboard.noClasses}</p>
                  ) : (
                    classesData.classes.slice(0, 4).map((cls) => (
                      <div key={cls.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-secondary/30 flex flex-col items-center justify-center text-secondary-foreground shrink-0">
                            <span className="text-xs font-bold uppercase">{cls.dayOfWeek.slice(0, 3)}</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">{cls.name}</h4>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <Clock className="w-3 h-3 mr-1" />
                              {cls.startTime} - {cls.endTime}
                              <span className="mx-2">•</span>
                              {cls.level.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="hidden sm:flex">
                          {t.dashboard.bookSpot}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
