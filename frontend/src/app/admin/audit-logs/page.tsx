"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { AuditLog } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => apiFetch<{ logs: AuditLog[] }>("/admin/audit-logs"),
  });

  const logs = (data?.data as any) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Immutable audit trail of administrator and system actions.
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
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log: AuditLog) => (
                    <tr key={log.id} className="hover:bg-muted/50 font-mono text-xs">
                      <td className="p-3 text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3 font-semibold text-foreground">{log.action}</td>
                      <td className="p-3">{log.entity}</td>
                      <td className="p-3 font-sans">{log.user?.email || "System"}</td>
                      <td className="p-3 text-muted-foreground">{log.ipAddress || "127.0.0.1"}</td>
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
