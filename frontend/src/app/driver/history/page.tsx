"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Trip } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Ambulance, Calendar, MapPin } from "lucide-react";

export default function DriverHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["driver-history"],
    queryFn: () => apiFetch<{ trips: Trip[] }>("/drivers/me/trips"),
  });

  const trips = (data?.data as any) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Completed Trips History</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review all emergency runs completed by your ambulance unit.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : trips.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-2">
            <Ambulance className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="font-semibold">No historical trips found</h3>
            <p className="text-xs text-muted-foreground">
              Completed emergency assignments will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {trips.map((trip: Trip) => (
            <Card key={trip.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={trip.status === "COMPLETED" ? "success" : "destructive"}>
                      {trip.status}
                    </Badge>
                    <span className="font-semibold text-sm">
                      {trip.request?.emergencyType} Emergency
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Pickup: {trip.request?.pickupAddress}
                  </div>
                  {trip.hospital && (
                    <div className="text-xs text-muted-foreground">
                      Delivered to: {trip.hospital.name}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-base">
                    {trip.fare ? `৳${trip.fare}` : "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(trip.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
