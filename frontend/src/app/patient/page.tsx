"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Trip, NotificationItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PhoneCall, Navigation, ArrowRight, Ambulance, CheckCircle, Clock } from "lucide-react";

export default function PatientDashboard() {
  const { data: tripsData, isLoading: tripsLoading } = useQuery({
    queryKey: ["patient-trips"],
    queryFn: () => apiFetch<{ trips: Trip[] }>("/trips/me"),
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationItem[]>("/notifications"),
  });

  const trips = (tripsData?.data as any) || [];
  const activeTrip = trips.find(
    (t: Trip) => t.status !== "COMPLETED" && t.status !== "CANCELLED"
  );

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 p-6 md:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div>
          <Badge className="bg-white/20 text-white border-none mb-2">Patient Emergency Dashboard</Badge>
          <h1 className="text-2xl md:text-3xl font-bold">24/7 Rapid Ambulance Dispatch</h1>
          <p className="text-red-100 text-sm mt-1 max-w-xl">
            Need urgent medical transport? Submit an emergency request with our automated triage engine.
          </p>
        </div>
        <Button asChild size="lg" className="bg-white text-red-600 hover:bg-red-50 font-bold shrink-0">
          <Link href="/patient/request">
            <PhoneCall className="mr-2 h-5 w-5 animate-bounce" />
            Request Ambulance
          </Link>
        </Button>
      </div>

      {/* Active Trip Banner if any */}
      {activeTrip && (
        <Card className="border-red-500 bg-red-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="critical">Active Emergency Trip In Progress</Badge>
              <span className="text-xs text-muted-foreground">ID: {activeTrip.id.slice(0, 8)}...</span>
            </div>
            <CardTitle className="text-xl flex items-center gap-2 mt-2">
              <Ambulance className="h-5 w-5 text-red-600 animate-pulse" />
              Status: {activeTrip.status.replace(/_/g, " ")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">Pickup:</span> {activeTrip.request?.pickupAddress}</div>
              <div><span className="text-muted-foreground">Ambulance:</span> {activeTrip.ambulance?.plateNumber} ({activeTrip.ambulance?.type})</div>
            </div>
            <Button asChild variant="emergency">
              <Link href={`/patient/trips/${activeTrip.id}`}>
                <Navigation className="mr-2 h-4 w-4" />
                Live Tracking & Trip Cockpit
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Trips & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Trips */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Trips</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/patient/trips">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {tripsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No trips booked yet.
              </div>
            ) : (
              trips.slice(0, 4).map((trip: Trip) => (
                <Link
                  key={trip.id}
                  href={`/patient/trips/${trip.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{trip.request?.emergencyType || "Emergency"}</span>
                      <Badge
                        variant={
                          trip.status === "COMPLETED"
                            ? "success"
                            : trip.status === "CANCELLED"
                            ? "destructive"
                            : "warning"
                        }
                        className="text-[10px]"
                      >
                        {trip.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-xs">
                      {trip.request?.pickupAddress}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold">
                      {trip.fare ? `৳${trip.fare}` : "Calculating"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(trip.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!notificationsData?.data || (notificationsData.data as any).length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                No recent notifications.
              </div>
            ) : (
              (notificationsData.data as any).slice(0, 4).map((notif: NotificationItem) => (
                <div key={notif.id} className="p-3 rounded-lg border text-sm space-y-1">
                  <div className="font-semibold flex items-center justify-between">
                    <span>{notif.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{notif.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
