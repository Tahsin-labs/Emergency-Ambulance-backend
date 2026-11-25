"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Trip, Hospital } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Ambulance,
  Phone,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Navigation,
  Power,
  Hospital as HospitalIcon,
} from "lucide-react";

export default function DriverCockpitPage() {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");

  // Get current active trip for driver
  const { data: tripData, isLoading: tripLoading } = useQuery({
    queryKey: ["driver-current-trip"],
    queryFn: () => apiFetch<Trip>("/drivers/me/current-trip"),
    refetchInterval: 5000,
  });

  // Get hospital list
  const { data: hospitalsData } = useQuery({
    queryKey: ["hospitals"],
    queryFn: () => apiFetch<Hospital[]>("/hospitals"),
  });

  const trip = tripData?.data;
  const hospitals = hospitalsData?.data || [];

  // Duty toggle
  const toggleDuty = async (newStatus: "AVAILABLE" | "OFF_DUTY") => {
    try {
      setUpdating(true);
      await apiFetch("/drivers/me/availability", {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Duty status updated to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["driver-current-trip"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update duty status");
    } finally {
      setUpdating(false);
    }
  };

  // State machine transition helper
  const transitionTrip = async (newStatus: string) => {
    if (!trip) return;
    try {
      setUpdating(true);
      await apiFetch(`/trips/${trip.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Trip advanced to ${newStatus.replace(/_/g, " ")}`);
      queryClient.invalidateQueries({ queryKey: ["driver-current-trip"] });
    } catch (err: any) {
      toast.error(err.message || "Transition failed");
    } finally {
      setUpdating(false);
    }
  };

  // Select hospital
  const assignHospital = async () => {
    if (!trip || !selectedHospitalId) {
      toast.error("Please select a hospital");
      return;
    }
    try {
      setUpdating(true);
      await apiFetch(`/trips/${trip.id}/hospital`, {
        method: "PATCH",
        body: JSON.stringify({ hospitalId: selectedHospitalId }),
      });
      toast.success("Destination hospital selected!");
      queryClient.invalidateQueries({ queryKey: ["driver-current-trip"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to assign hospital");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Duty Status Bar */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
              <Ambulance className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-base">Ambulance Paramedic Cockpit</div>
              <div className="text-xs text-muted-foreground">
                Assigned Unit: {trip?.ambulance?.plateNumber || "Active Roster"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleDuty("AVAILABLE")}
              disabled={updating}
              className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
            >
              <Power className="h-4 w-4 mr-1" />
              On Duty
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleDuty("OFF_DUTY")}
              disabled={updating}
              className="text-muted-foreground"
            >
              Off Duty
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Assignment */}
      {tripLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !trip ? (
        <Card className="text-center py-16">
          <CardContent className="space-y-3">
            <Ambulance className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">No Active Emergency Assignment</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your ambulance is on standby. As soon as an emergency request matches your unit, the assignment details and navigation controls will display here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Trip Header */}
          <Card className="border-red-600 border-2">
            <CardHeader className="bg-red-500/10">
              <div className="flex items-center justify-between">
                <Badge variant="critical" className="text-xs">
                  ACTIVE RUN: {trip.status.replace(/_/g, " ")}
                </Badge>
                <span className="text-xs font-mono font-bold">ID: {trip.id.slice(0, 8)}</span>
              </div>
              <CardTitle className="text-2xl mt-2 flex items-center gap-2">
                <Phone className="h-6 w-6 text-red-600 animate-bounce" />
                {trip.request?.emergencyType} Emergency
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground uppercase font-bold">
                    Patient Pickup Details
                  </div>
                  <div className="text-sm font-semibold">{trip.patient?.name}</div>
                  <div className="text-xs text-red-600 font-bold">{trip.patient?.phone}</div>
                  <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{trip.request?.pickupAddress}</span>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    Symptom: {trip.request?.description}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground uppercase font-bold">
                    Hospital Coordination
                  </div>
                  {trip.hospital ? (
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">{trip.hospital.name}</div>
                      <div className="text-xs text-muted-foreground">{trip.hospital.address}</div>
                      <div className="text-xs text-emerald-600 font-semibold">
                        Available ICU Beds: {trip.hospital.icuBedsAvailable}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Select destination hospital before starting the hospital route:
                      </p>
                      <select
                        value={selectedHospitalId}
                        onChange={(e) => setSelectedHospitalId(e.target.value)}
                        className="w-full text-xs p-2 rounded border bg-background"
                      >
                        <option value="">-- Choose Hospital --</option>
                        {hospitals.map((h: Hospital) => (
                          <option key={h.id} value={h.id}>
                            {h.name} (ICU: {h.icuBedsAvailable})
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={assignHospital}
                        disabled={updating || !selectedHospitalId}
                      >
                        Confirm Hospital
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sequential Action Transition Controls */}
              <div className="pt-6 border-t space-y-2">
                <div className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  Trip State Machine Execution Controls
                </div>

                <div className="flex flex-wrap gap-2">
                  {trip.status === "ACCEPTED" && (
                    <Button
                      variant="emergency"
                      onClick={() => transitionTrip("EN_ROUTE")}
                      disabled={updating}
                    >
                      Depart: Start Moving (EN_ROUTE)
                    </Button>
                  )}

                  {trip.status === "EN_ROUTE" && (
                    <Button
                      variant="emergency"
                      onClick={() => transitionTrip("ARRIVED_AT_PICKUP")}
                      disabled={updating}
                    >
                      Arrived at Patient Pickup (ARRIVED_AT_PICKUP)
                    </Button>
                  )}

                  {trip.status === "ARRIVED_AT_PICKUP" && (
                    <Button
                      variant="emergency"
                      onClick={() => transitionTrip("PICKED_UP")}
                      disabled={updating}
                    >
                      Patient Boarded Ambulance (PICKED_UP)
                    </Button>
                  )}

                  {trip.status === "PICKED_UP" && (
                    <Button
                      variant="emergency"
                      onClick={() => transitionTrip("EN_ROUTE_TO_HOSPITAL")}
                      disabled={updating || !trip.hospitalId}
                    >
                      Depart for Hospital (EN_ROUTE_TO_HOSPITAL)
                    </Button>
                  )}

                  {trip.status === "EN_ROUTE_TO_HOSPITAL" && (
                    <Button
                      variant="emergency"
                      onClick={() => transitionTrip("ARRIVED_AT_HOSPITAL")}
                      disabled={updating}
                    >
                      Arrived at Hospital Emergency Room (ARRIVED_AT_HOSPITAL)
                    </Button>
                  )}

                  {trip.status === "ARRIVED_AT_HOSPITAL" && (
                    <Button
                      variant="emergency"
                      onClick={() => transitionTrip("COMPLETED")}
                      disabled={updating}
                    >
                      Patient Transferred & Trip Completed (COMPLETED)
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
