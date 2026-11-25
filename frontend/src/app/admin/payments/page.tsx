"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Payment } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => apiFetch<{ payments: Payment[] }>("/admin/reports"),
  });

  const payments = (data?.data as any)?.payments || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Settlement records from SSLCommerz gateway for emergency ambulance dispatches.
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : payments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-sm text-muted-foreground">No payment records found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-xs uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">User</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p: Payment) => (
                    <tr key={p.id} className="hover:bg-muted/50 font-mono text-xs">
                      <td className="p-3 font-bold">{p.tranId}</td>
                      <td className="p-3 font-sans">{p.user?.name || "Patient"}</td>
                      <td className="p-3 font-bold text-foreground">৳{p.amount}</td>
                      <td className="p-3">
                        <Badge variant={p.status === "PAID" ? "success" : "destructive"}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-3">{p.cardType || "SSLCommerz"}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
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
