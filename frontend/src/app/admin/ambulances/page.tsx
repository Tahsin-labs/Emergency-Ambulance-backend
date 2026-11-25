"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Ambulance } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAmbulancesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ambulances"],
    queryFn: () => apiFetch<Ambulance[]>("/ambulances"),
  });

  const ambulances = (data?.data as any) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ambulance Fleet Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registered life-support vehicles, assigned drivers, and availability status.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3">Plate Number</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Base Fare</th>
                    <th className="p-3">Per Km Rate</th>
                    <th className="p-3">Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ambulances.map((a: Ambulance) => (
                    <tr key={a.id} className="hover:bg-muted/50">
                      <td className="p-3 font-bold font-mono">{a.plateNumber}</td>
                      <td className="p-3"><Badge variant="outline">{a.type}</Badge></td>
                      <td className="p-3">
                        <Badge
                          variant={
                            a.status === "AVAILABLE"
                              ? "success"
                              : a.status === "ON_TRIP"
                              ? "critical"
                              : "secondary"
                          }
                        >
                          {a.status}
                        </Badge>
                      </td>
                      <td className="p-3">৳{a.baseFare}</td>
                      <td className="p-3">৳{a.perKmRate}</td>
                      <td className="p-3">{a.driver?.user?.name || "Unassigned"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
