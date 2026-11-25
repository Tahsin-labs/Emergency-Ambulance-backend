"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  Ambulance,
  PhoneCall,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  Bell,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, checkSession } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const getDashboardLink = () => {
    if (!user) return "/login";
    if (user.role === "ADMIN") return "/admin";
    if (user.role === "DRIVER") return "/driver";
    return "/patient";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg md:text-xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600 text-white shadow">
            <Ambulance className="h-6 w-6" />
          </div>
          <span className="bg-gradient-to-r from-red-600 to-rose-700 bg-clip-text text-transparent font-extrabold tracking-tight">
            ResQ Ambulance
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className={`transition hover:text-red-600 ${
              pathname === "/" ? "text-red-600 font-semibold" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>
          <Link
            href="/services"
            className={`transition hover:text-red-600 ${
              pathname === "/services" ? "text-red-600 font-semibold" : "text-muted-foreground"
            }`}
          >
            Services & Tiers
          </Link>
          <Link
            href="/hospitals"
            className={`transition hover:text-red-600 ${
              pathname === "/hospitals" ? "text-red-600 font-semibold" : "text-muted-foreground"
            }`}
          >
            Hospitals
          </Link>
          <Link
            href="/contact"
            className={`transition hover:text-red-600 ${
              pathname === "/contact" ? "text-red-600 font-semibold" : "text-muted-foreground"
            }`}
          >
            Contact
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Button asChild variant="emergency" size="sm">
            <Link href="/patient/request">
              <PhoneCall className="h-4 w-4 mr-1 animate-bounce" />
              Request Ambulance
            </Link>
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={getDashboardLink()}>
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  Dashboard
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-muted-foreground hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-background p-4 space-y-4">
          <div className="flex flex-col space-y-2 text-sm">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted"
            >
              Home
            </Link>
            <Link
              href="/services"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted"
            >
              Services & Tiers
            </Link>
            <Link
              href="/hospitals"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted"
            >
              Hospitals Directory
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2 py-1.5 rounded hover:bg-muted"
            >
              Contact Us
            </Link>
          </div>

          <div className="pt-2 border-t flex flex-col gap-2">
            <Button asChild variant="emergency" className="w-full">
              <Link href="/patient/request" onClick={() => setMobileMenuOpen(false)}>
                <PhoneCall className="h-4 w-4 mr-2" />
                Emergency Request
              </Link>
            </Button>
            {user ? (
              <>
                <Button asChild variant="outline" className="w-full">
                  <Link href={getDashboardLink()} onClick={() => setMobileMenuOpen(false)}>
                    Dashboard ({user.role})
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    Sign Up
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
