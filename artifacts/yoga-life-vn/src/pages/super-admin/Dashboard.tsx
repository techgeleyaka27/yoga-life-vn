import { useGetStats, useListEnrollments, useListCenters } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { UserRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Calendar as CalendarIcon, CreditCard, TrendingUp, ArrowUpRight, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Link } from "wouter";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-600",
  pending: "bg-yellow-100 text-yellow-700",
};

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useGetStats();
  const { data: enrollmentsData } = useListEnrollments({});
  const { data: centersData } = useListCenters();

  const recentEnrollments = (enrollmentsData?.enrollments || [])
    .slice()
    .sort((a: any, b: any) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime())
    .slice(0, 8);

  // Revenue per center
  const centers = centersData?.centers || [];
  const allEnrollments = enrollmentsData?.enrollments || [];
  const revenueByCenter = centers.map(c => ({
    name: c.name.replace("YOGA LIFE VN - ", "").replace("YOGA LIFE VN PREMIUM", "PREMIUM"),
    revenue: allEnrollments
      .filter((e: any) => e.centerName === c.name)
      .reduce((sum: number, e: any) => sum + (e.amountPaid || 0), 0) / 1000,
  })).filter(c => c.revenue > 0);

  const statCards = [
    {
      title: "Total Members",
      value: stats?.totalMembers || 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      href: "/super-admin/users",
    },
    {
      title: "Active Enrollments",
      value: stats?.activeEnrollments || 0,
      icon: CreditCard,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
      href: "/super-admin/enrollments",
    },
    {
      title: "Total Centers",
      value: stats?.totalCenters || 0,
      icon: Building2,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
      href: "/super-admin/centers",
    },
    {
      title: "Total Classes",
      value: stats?.totalClasses || 0,
      icon: CalendarIcon,
      color: "text-orange-500",
      bg: "bg-orange-50",
      border: "border-orange-100",
      href: "/super-admin/classes",
    },
  ];

  const quickActions = [
    { label: "Add Center", href: "/super-admin/centers", color: "bg-purple-500" },
    { label: "Add Class", href: "/super-admin/classes", color: "bg-orange-500" },
    { label: "New Membership Plan", href: "/super-admin/memberships", color: "bg-primary" },
    { label: "Manage Users", href: "/super-admin/users", color: "bg-blue-500" },
    { label: "View Enrollments", href: "/super-admin/enrollments", color: "bg-green-500" },
    { label: "Edit Website Content", href: "/super-admin/content", color: "bg-pink-500" },
  ];

  return (
    <AdminLayout role={UserRole.super_admin}>
      <div className="space-y-8">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Platform-wide overview and performance.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-xl px-4 py-2">
            <Activity className="w-4 h-4 text-green-500" />
            <span>System Online</span>
          </div>
        </div>

        {/* Stat Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-card rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <Link href={stat.href}>
                    <Card className={`border ${stat.border} hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${stat.color}`} />
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-0.5">{stat.title}</p>
                        <h3 className="text-3xl font-bold font-serif">{stat.value.toLocaleString()}</h3>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Charts + Quick Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <Card className="lg:col-span-2 border-none premium-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg">Revenue by Center</CardTitle>
              <p className="text-sm text-muted-foreground">Total membership revenue (VND ×1000)</p>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                {revenueByCenter.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByCenter} barCategoryGap="30%">
                      <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `${v}k`}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid hsl(var(--border))",
                          boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                          fontSize: 12,
                        }}
                        formatter={(v: any) => [`${v}k VND`, "Revenue"]}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {revenueByCenter.map((_, i) => (
                          <Cell key={i} fill={`hsl(var(--primary))`} fillOpacity={0.7 + (i / revenueByCenter.length) * 0.3} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No revenue data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Insights */}
          <Card className="border-none premium-shadow bg-primary text-primary-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-primary-foreground">Quick Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-primary-foreground/70 text-xs mb-0.5">New Members This Month</p>
                <div className="flex items-end gap-2">
                  <h4 className="text-4xl font-bold font-serif">{stats?.newMembersThisMonth || 0}</h4>
                  <span className="text-green-300 text-xs flex items-center mb-1">
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5" />growing
                  </span>
                </div>
              </div>
              <div className="h-px w-full bg-primary-foreground/15" />
              <div>
                <p className="text-primary-foreground/70 text-xs mb-0.5">Total Revenue</p>
                <h4 className="text-3xl font-bold font-serif">
                  {((stats?.revenue || 0) / 1000).toFixed(0)}k
                </h4>
                <p className="text-primary-foreground/60 text-xs mt-0.5">VND across all centers</p>
              </div>
              <div className="h-px w-full bg-primary-foreground/15" />
              <div>
                <p className="text-primary-foreground/70 text-xs mb-0.5">Active Rate</p>
                <h4 className="text-3xl font-bold font-serif">
                  {allEnrollments.length > 0
                    ? Math.round(((stats?.activeEnrollments || 0) / allEnrollments.length) * 100)
                    : 0}%
                </h4>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions + Recent Enrollments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="border-none premium-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {quickActions.map(action => (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className={`w-2 h-2 rounded-full ${action.color}`} />
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{action.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent Enrollments */}
          <Card className="lg:col-span-2 border-none premium-shadow">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-base">Recent Enrollments</CardTitle>
              <Link href="/super-admin/enrollments">
                <span className="text-xs text-primary hover:underline cursor-pointer">View all →</span>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentEnrollments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No enrollments yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {recentEnrollments.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                          {(e.userFullName || "?").charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{e.userFullName}</p>
                          <p className="text-xs text-muted-foreground truncate">{e.membershipName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-sm font-semibold">{(e.amountPaid / 1000).toFixed(0)}k</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[e.status] || "bg-muted"}`}>
                          {e.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
