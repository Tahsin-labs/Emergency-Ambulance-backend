"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { User } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiFetch<{ users: User[] }>("/admin/users"),
  });

  const users = (data?.data as any) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Account Governance</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Role governance for Administrators, Drivers, and Patients.
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
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u: User) => (
                    <tr key={u.id} className="hover:bg-muted/50">
                      <td className="p-3 font-semibold">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3 font-mono text-xs">{u.phone}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            u.role === "ADMIN"
                              ? "destructive"
                              : u.role === "DRIVER"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={u.status === "ACTIVE" ? "success" : "destructive"}>
                          {u.status}
                        </Badge>
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
