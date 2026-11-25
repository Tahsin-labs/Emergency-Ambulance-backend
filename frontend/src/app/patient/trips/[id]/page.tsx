"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Trip, TripStatus } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Ambulance,
  Phone,
  User,
  Hospital,
  MapPin,
  CreditCard,
  AlertOctagon,
  CheckCircle,
  Loader2,
  Clock,
  ArrowRight,
} from "lucide-react";

const TRIP_STEPS: TripStatus[] = [
  "ACCEPTED",
  "EN_ROUTE",
  "ARRIVED_AT_PICKUP",
  "PICKED_UP",
  "EN_ROUTE_TO_HOSPITAL",
  "ARRIVED_AT_HOSPITAL",
  "COMPLETED",
];

export default function PatientTripDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  // Poll trip every 4 seconds for live tracking
  const { data, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => apiFetch<Trip>(`/trips/${id}`),
    refetchInterval: (query) => {
      const trip = query.state.data?.data;
      if (trip?.status === "COMPLETED" || trip?.status === "CANCELLED") {
        return false;
      }
      return 4000;
    },
  });

  const trip = data?.data;

  // Cancel trip (allowed only before PICKED_UP)
  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this emergency ambulance?")) return;
    try {
      setCancelling(true);
      await apiFetch(`/trips/${id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason: "Patient requested cancellation" }),
      });
      toast.success("Trip has been cancelled.");
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel trip");
    } finally {
      setCancelling(false);
    }
  };

  // SSLCommerz payment initiation
  const handlePayment = async () => {
    try {
      setPaying(true);
      const res = await apiFetch(`/payments/initiate/${id}`, {
        method: "POST",
      });
      if (res.data?.paymentUrl) {
        toast.info("Redirecting to SSLCommerz Sandbox Gateway...");
        window.location.href = res.data.paymentUrl;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate SSLCommerz payment");
    } finally {
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Trip not found</h2>
        <Button className="mt-4" onClick={() => router.push("/patient/trips")}>
          Back to Trips
        </Button>
      </div>
    );
  }

  const currentStepIndex = TRIP_STEPS.indexOf(trip.status);
  const canCancel =
    trip.status === "ACCEPTED" ||
    trip.status === "EN_ROUTE" ||
    trip.status === "ARRIVED_AT_PICKUP";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Trip #{trip.id.slice(0, 8)}</h1>
            <Badge
              variant={
                trip.status === "COMPLETED"
                  ? "success"
                  : trip.status === "CANCELLED"
                  ? "destructive"
                  : "warning"
              }
            >
              {trip.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Requested on {new Date(trip.createdAt).toLocaleString()}
          </p>
        </div>

        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <AlertOctagon className="h-4 w-4 mr-1" />
            )}
            Cancel Request
          </Button>
        )}
      </div>

      {/* Stepper Progress Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Trip Progress</span>
            <span className="text-xs font-normal text-muted-foreground">Auto-updates in real time</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
            {TRIP_STEPS.map((step, idx) => {
              const done = currentStepIndex >= idx && trip.status !== "CANCELLED";
              const current = currentStepIndex === idx && trip.status !== "CANCELLED";
              return (
                <div
                  key={step}
                  className={`p-2 rounded-lg border transition ${
                    current
                      ? "border-red-600 bg-red-500/10 font-bold text-red-600 animate-pulse"
                      : done
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground bg-muted/20"
                  }`}
                >
                  <div className="font-semibold">{idx + 1}</div>
                  <div className="text-[10px] mt-1 leading-tight">{step.replace(/_/g, " ")}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Driver & Ambulance Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ambulance className="h-5 w-5 text-red-600" />
              Ambulance & Paramedic Unit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plate Number:</span>
              <span className="font-bold">{trip.ambulance?.plateNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tier:</span>
              <Badge variant="outline">{trip.ambulance?.type}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Fare:</span>
              <span>৳{trip.ambulance?.baseFare}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Per Km Rate:</span>
              <span>৳{trip.ambulance?.perKmRate}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5 text-red-600" />
              Assigned Driver Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver Name:</span>
              <span className="font-bold">{trip.driver?.user?.name || "Paramedic Driver"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver Phone:</span>
              <span className="font-bold text-red-600">{trip.driver?.user?.phone || "+8801700000000"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver Status:</span>
              <Badge variant="outline">{trip.driver?.status}</Badge>
            </div>
            {trip.driver?.currentLat && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>GPS Fix:</span>
                <span>{trip.driver.currentLat.toFixed(4)}, {trip.driver.currentLng?.toFixed(4)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hospital & Route */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hospital className="h-5 w-5 text-red-600" />
            Destination Hospital
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {trip.hospital ? (
            <div>
              <div className="font-bold text-base">{trip.hospital.name}</div>
              <div className="text-muted-foreground">{trip.hospital.address}</div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                Emergency ICU Beds: {trip.hospital.icuBedsAvailable} available
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs">
              Driver will coordinate hospital destination based on patient stabilization and bed availability.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Settlement Card */}
      {trip.status === "COMPLETED" && (
        <Card className="border-emerald-500 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CreditCard className="h-5 w-5" />
              Trip Completed • Fare Settlement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">Total Fare:</span>
              <span className="font-extrabold text-2xl text-foreground">৳{trip.fare || 0}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Calculated based on {trip.distanceKm ? `${trip.distanceKm.toFixed(2)} km` : "flat base"} distance with {trip.ambulance?.type} life-support equipment.
            </div>

            {trip.payment?.status === "PAID" ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold p-3 bg-emerald-100 dark:bg-emerald-950 rounded-lg">
                <CheckCircle className="h-5 w-5" />
                <span>Paid via SSLCommerz (TranID: {trip.payment.tranId})</span>
              </div>
            ) : (
              <Button
                variant="emergency"
                size="lg"
                className="w-full h-12 text-base font-bold"
                onClick={handlePayment}
                disabled={paying}
              >
                {paying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening SSLCommerz Gateway...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay ৳{trip.fare || 0} with SSLCommerz (Sandbox)
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
