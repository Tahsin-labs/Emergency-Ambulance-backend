"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { PhoneCall, Navigation, Clock, User, CreditCard, Bell } from "lucide-react";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/patient", label: "Overview", icon: Clock },
    { href: "/patient/request", label: "Request Ambulance", icon: PhoneCall, highlight: true },
    { href: "/patient/trips", label: "My Trips", icon: Navigation },
    { href: "/patient/payments", label: "Payment History", icon: CreditCard },
    { href: "/patient/profile", label: "My Profile", icon: User },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="border-b bg-muted/40">
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
                    ? item.highlight
                      ? "bg-red-600 text-white font-semibold"
                      : "bg-primary text-primary-foreground font-semibold"
                    : item.highlight
                    ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
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
