"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Ambulance, Gauge, History, User } from "lucide-react";

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/driver", label: "Driver Cockpit", icon: Gauge },
    { href: "/driver/history", label: "Completed Trips", icon: History },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="border-b bg-amber-500/10">
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
                    ? "bg-amber-600 text-white font-semibold"
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
