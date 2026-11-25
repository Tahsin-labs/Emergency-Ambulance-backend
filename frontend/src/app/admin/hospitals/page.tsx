"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Hospital } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminHospitalsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-hospitals"],
    queryFn: () => apiFetch<Hospital[]>("/hospitals"),
  });

  const hospitals = (data?.data as any) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hospitals & Bed Capacity</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor emergency room readiness and intensive care unit (ICU) bed allocation.
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
                    <th className="p-3">Hospital Name</th>
                    <th className="p-3">Address</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">General Beds</th>
                    <th className="p-3">ICU Beds</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {hospitals.map((h: Hospital) => (
                    <tr key={h.id} className="hover:bg-muted/50">
                      <td className="p-3 font-semibold">{h.name}</td>
                      <td className="p-3 text-muted-foreground text-xs">{h.address}</td>
                      <td className="p-3 font-mono text-xs">{h.contactNumber}</td>
                      <td className="p-3">{h.generalBedsAvailable} / {h.generalBedsTotal}</td>
                      <td className="p-3 font-bold text-red-600">
                        {h.icuBedsAvailable} / {h.icuBedsTotal}
                      </td>
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
