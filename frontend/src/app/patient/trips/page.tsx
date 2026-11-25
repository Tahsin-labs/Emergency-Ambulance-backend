"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Trip } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation, Clock, MapPin, Ambulance } from "lucide-react";

export default function PatientTripsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["patient-trips"],
    queryFn: () => apiFetch<{ trips: Trip[] }>("/trips/me"),
  });

  const trips = (data?.data as any) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Emergency Trips</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track active emergency runs or inspect completed trip records and payments.
          </p>
        </div>
        <Button asChild variant="emergency">
          <Link href="/patient/request">New Request</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : trips.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent className="space-y-3">
            <Ambulance className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg">No trips found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              You haven&apos;t lodged any emergency requests yet.
            </p>
            <Button asChild variant="emergency">
              <Link href="/patient/request">Request Ambulance Now</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trips.map((trip: Trip) => (
            <Card key={trip.id} className="hover:border-red-500/50 transition">
              <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={trip.status === "COMPLETED" ? "success" : trip.status === "CANCELLED" ? "destructive" : "warning"}>
                      {trip.status}
                    </Badge>
                    <Badge variant="outline">{trip.request?.emergencyType}</Badge>
                    <span className="text-xs text-muted-foreground">
                      ID: {trip.id.slice(0, 8)}...
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-red-600 shrink-0" />
                      <span>{trip.request?.pickupAddress}</span>
                    </div>
                    {trip.hospital && (
                      <div className="text-xs text-muted-foreground">
                        Destination: <span className="font-medium text-foreground">{trip.hospital.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <div className="font-bold text-lg">
                      {trip.fare ? `৳${trip.fare}` : "Fare calculating"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(trip.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/patient/trips/${trip.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
