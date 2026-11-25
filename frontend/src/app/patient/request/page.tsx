"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emergencyRequestSchema, EmergencyRequestInput } from "@/schemas";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PhoneCall,
  MapPin,
  HeartPulse,
  Flame,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Crosshair,
} from "lucide-react";

const EMERGENCY_TYPES = [
  { value: "CARDIAC", label: "Cardiac Arrest / Heart Attack", tier: "ICU (CRITICAL)" },
  { value: "ACCIDENT", label: "Major Accident / Trauma", tier: "ADVANCED (HIGH)" },
  { value: "STROKE", label: "Stroke / Paralysis", tier: "ICU (CRITICAL)" },
  { value: "BREATHING", label: "Severe Breathing Difficulty", tier: "ICU (CRITICAL)" },
  { value: "PREGNANCY", label: "Labor / Pregnancy Emergency", tier: "ADVANCED (HIGH)" },
  { value: "BLEEDING", label: "Severe Uncontrolled Bleeding", tier: "ICU (CRITICAL)" },
  { value: "BURN", label: "Severe Burn / Fire Injury", tier: "ADVANCED (HIGH)" },
  { value: "SEIZURE", label: "Active Seizure / Convulsion", tier: "ADVANCED (HIGH)" },
  { value: "UNCONSCIOUS", label: "Unconscious / Unresponsive", tier: "ICU (CRITICAL)" },
  { value: "FRACTURE", label: "Bone Fracture / Sprain", tier: "BASIC (MEDIUM)" },
  { value: "FEVER", label: "High Fever / Stable Infection", tier: "BASIC (MEDIUM)" },
  { value: "OTHER", label: "Other Condition", tier: "EVALUATED BY ENGINE" },
];

export default function RequestAmbulancePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmergencyRequestInput>({
    resolver: zodResolver(emergencyRequestSchema),
    defaultValues: {
      emergencyType: "CARDIAC",
      description: "Severe chest pain and shortness of breath",
      pickupAddress: "House 12, Road 4, Dhanmondi, Dhaka",
      pickupLat: 23.7465,
      pickupLng: 90.376,
    },
  });

  const selectedType = watch("emergencyType");

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      toast.info("Detecting current GPS coordinates...");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setValue("pickupLat", Number(pos.coords.latitude.toFixed(6)));
          setValue("pickupLng", Number(pos.coords.longitude.toFixed(6)));
          toast.success("Location coordinates locked via GPS!");
        },
        () => {
          toast.error("Could not obtain GPS. Using default Dhaka coordinates.");
        }
      );
    } else {
      toast.error("Geolocation not supported by browser.");
    }
  };

  const onSubmit = async (data: EmergencyRequestInput) => {
    try {
      setSubmitting(true);
      // Create emergency request
      const res = await apiFetch("/emergency-requests", {
        method: "POST",
        body: JSON.stringify(data),
      });

      const request = res.data;
      toast.success("Emergency request lodged! Priority engine is finding nearest unit...");

      // Automatically trigger dispatch
      const dispatchRes = await apiFetch("/dispatch", {
        method: "POST",
        body: JSON.stringify({ requestId: request.id }),
      });

      if (dispatchRes.success && dispatchRes.data?.trip) {
        toast.success("Ambulance dispatched! Redirecting to live tracking...");
        router.push(`/patient/trips/${dispatchRes.data.trip.id}`);
      } else {
        toast.info("Request queued! Awaiting available driver.");
        router.push("/patient/trips");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit emergency request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold mb-2">
          <PhoneCall className="h-3.5 w-3.5 animate-pulse" />
          <span>Emergency Dispatch Form</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Request Emergency Ambulance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Provide the patient&apos;s symptoms and pickup location. Our engine will prioritize and route the nearest equipped unit immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Emergency Classification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-red-600" />
              1. Medical Condition & Symptoms
            </CardTitle>
            <CardDescription>
              Select the most accurate symptom to calculate clinical priority.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Emergency Type</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {EMERGENCY_TYPES.map((type) => {
                  const selected = selectedType === type.value;
                  return (
                    <button
                      type="button"
                      key={type.value}
                      onClick={() => setValue("emergencyType", type.value as any)}
                      className={`text-left p-3 rounded-lg border text-sm transition ${
                        selected
                          ? "border-red-600 bg-red-500/10 font-bold text-red-600"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{type.value}</span>
                        {selected && <CheckCircle2 className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {type.label}
                      </div>
                      <div className="text-[10px] font-semibold text-rose-600 mt-1">
                        {type.tier}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Describe Patient Condition</label>
              <Input
                placeholder="e.g. Patient collapsed, complaining of chest pressure, breathing fast"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Pickup Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              2. Pickup Location & GPS Coordinates
            </CardTitle>
            <CardDescription>
              Enter the exact street address and coordinates for the driver to navigate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Street Address / Landmark</label>
              <Input
                placeholder="House, Road, Area, Landmark"
                {...register("pickupAddress")}
              />
              {errors.pickupAddress && (
                <p className="text-xs text-red-500">{errors.pickupAddress.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  {...register("pickupLat", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  {...register("pickupLng", { valueAsNumber: true })}
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={detectLocation}
              className="w-full sm:w-auto"
            >
              <Crosshair className="mr-2 h-4 w-4 text-red-600" />
              Lock My Current GPS Location
            </Button>
          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="emergency"
          size="lg"
          className="w-full h-14 text-lg font-bold"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Allocating Nearest Life-Support Unit...
            </>
          ) : (
            <>
              <PhoneCall className="mr-2 h-5 w-5 animate-bounce" />
              Confirm & Dispatch Ambulance
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
