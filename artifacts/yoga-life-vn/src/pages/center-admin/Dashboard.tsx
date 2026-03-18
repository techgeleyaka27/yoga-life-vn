import { useGetStats, useListMemberships, useListClasses, useListEnrollments, useListCenters } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, CreditCard, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";

export default function CenterAdminDashboard() {
  const { user } = useAuth();
  const centerId = user?.centerId;
  const { data: stats, isLoading } = useGetStats({ centerId: centerId ?? undefined });
  const { data: membershipsData } = useListMemberships({ centerId: centerId ?? undefined });
  const { data: classesData } = useListClasses({ centerId: centerId ?? undefined });
  const { data: enrollmentsData } = useListEnrollments({ centerId: centerId ?? undefined });
  const { data: centersData } = useListCenters();
  const centerName = centersData?.centers?.find((c: any) => c.id === centerId)?.name ?? "Your Center";

  const statCards = [
    { title: "Total Members", value: stats?.totalMembers || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Active Enrollments", value: stats?.activeEnrollments || 0, icon: CreditCard, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Classes", value: stats?.totalClasses || 0, icon: Calendar, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Revenue (VND)", value: stats?.revenue ? `${(stats.revenue / 1000000).toFixed(1)}M` : "0", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <AdminLayout role={UserRole.center_admin}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-serif font-bold">Center Dashboard</h1>
          <p className="text-muted-foreground mt-1">{centerName} — Overview</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                <Card className="border-none premium-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                        <h3 className="text-2xl font-bold font-serif">{isLoading ? "..." : stat.value}</h3>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none premium-shadow">
            <CardHeader><CardTitle className="font-serif">Recent Enrollments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(enrollmentsData?.enrollments || []).slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{e.userFullName}</p>
                      <p className="text-xs text-muted-foreground">{e.membershipName}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      e.status === 'active' ? 'bg-green-100 text-green-700' :
                      e.status === 'expired' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-700'
                    }`}>{e.status}</span>
                  </div>
                ))}
                {(enrollmentsData?.enrollments || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No enrollments yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none premium-shadow">
            <CardHeader><CardTitle className="font-serif">Today's Classes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(classesData?.classes || []).filter(c => c.isActive).slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{c.startTime}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.dayOfWeek} · {c.level}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{c.capacity} cap.</span>
                  </div>
                ))}
                {(classesData?.classes || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No classes scheduled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
