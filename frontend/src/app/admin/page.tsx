"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Ambulance,
  Navigation,
  CreditCard,
  Building2,
  TrendingUp,
  Activity,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiFetch("/admin/dashboard"),
  });

  const stats = data?.data?.stats || {
    totalUsers: 14,
    totalPatients: 8,
    totalDrivers: 4,
    totalAmbulances: 4,
    activeTrips: 1,
    completedTrips: 5,
    cancelledTrips: 1,
    totalRevenue: 15400,
  };

  const priorityData = [
    { name: "CRITICAL", value: 3, color: "#DC2626" },
    { name: "HIGH", value: 2, color: "#F59E0B" },
    { name: "MEDIUM", value: 4, color: "#0284C7" },
    { name: "LOW", value: 1, color: "#16A34A" },
  ];

  const revenueMonthly = [
    { month: "Aug", revenue: 8200 },
    { month: "Sep", revenue: 10400 },
    { month: "Oct", revenue: 12800 },
    { month: "Nov", revenue: 15400 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Governance & Dispatch Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time oversight over ambulance fleet, emergency requests, driver availability, and revenue settlement.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Total Revenue</span>
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold">৳{stats.totalRevenue.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-1">SSLCommerz settled</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Active Dispatches</span>
              <Activity className="h-4 w-4 text-red-600 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold text-red-600">{stats.activeTrips}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Live ambulances on road</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Ambulance Fleet</span>
              <Ambulance className="h-4 w-4 text-sky-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold">{stats.totalAmbulances}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Basic, ALS & ICU units</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Registered Users</span>
              <Users className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-extrabold">{stats.totalUsers}</div>
            <div className="text-[10px] text-muted-foreground mt-1">Patients & Drivers</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Revenue Trend (BDT)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueMonthly}>
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trips by Clinical Priority</CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
