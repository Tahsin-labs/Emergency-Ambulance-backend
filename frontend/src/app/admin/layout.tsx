"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import {
  LayoutDashboard,
  Ambulance,
  Users,
  Building2,
  Navigation,
  CreditCard,
  FileText,
  Shield,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Analytics Overview", icon: LayoutDashboard },
    { href: "/admin/trips", label: "Trips & Dispatch", icon: Navigation },
    { href: "/admin/ambulances", label: "Ambulance Fleet", icon: Ambulance },
    { href: "/admin/users", label: "User Accounts", icon: Users },
    { href: "/admin/hospitals", label: "Hospitals & Beds", icon: Building2 },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="border-b bg-red-600/10">
        <div className="container flex overflow-x-auto py-2 gap-2 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md whitespace-nowrap transition ${
                  active
                    ? "bg-red-600 text-white font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 container py-8 px-4">{children}</main>

      <Footer />
    </div>
  );
}
