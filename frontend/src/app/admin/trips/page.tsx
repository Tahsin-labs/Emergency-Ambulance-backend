"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Trip } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTripsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-trips"],
    queryFn: () => apiFetch<{ trips: Trip[] }>("/trips"),
  });

  const trips = (data?.data as any) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trips & Dispatch Center</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor all active and completed emergency ambulance runs across the city.
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
                    <th className="p-3">ID</th>
                    <th className="p-3">Type / Priority</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3">Ambulance</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Fare</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {trips.map((t: Trip) => (
                    <tr key={t.id} className="hover:bg-muted/50">
                      <td className="p-3 font-mono text-xs">{t.id.slice(0, 8)}</td>
                      <td className="p-3 font-medium">{t.request?.emergencyType}</td>
                      <td className="p-3">{t.patient?.name || "Patient"}</td>
                      <td className="p-3">{t.driver?.user?.name || "Driver"}</td>
                      <td className="p-3 font-mono text-xs">{t.ambulance?.plateNumber}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            t.status === "COMPLETED"
                              ? "success"
                              : t.status === "CANCELLED"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold">{t.fare ? `৳${t.fare}` : "—"}</td>
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
