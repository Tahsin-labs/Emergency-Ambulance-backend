"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Ambulance, Shield, User, Car, Lock, ArrowRight, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const { setUser, setRole } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const loginEmail = customEmail || email;
    const loginPass = customPass || password;

    if (!loginEmail || !loginPass) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Login failed");
      }

      setUser(json.data.user);
      setRole(json.data.user.role);
      toast.success(`Welcome back, ${json.data.user.name}!`);

      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        if (json.data.user.role === "ADMIN") router.push("/admin");
        else if (json.data.user.role === "DRIVER") router.push("/driver");
        else router.push("/patient");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(undefined, demoEmail, demoPass);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-12 bg-muted/20">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Form */}
          <Card className="shadow-lg border-red-500/10">
            <CardHeader className="space-y-1">
              <div className="flex items-center gap-2 text-red-600 font-bold text-lg mb-1">
                <Ambulance className="h-6 w-6" />
                <span>ResQ Dispatch</span>
              </div>
              <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
              <CardDescription>
                Enter your credentials or click any demo role on the right.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <label className="font-medium">Password</label>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link href="/register" className="text-red-600 hover:underline font-medium">
                    Create patient account
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>

          {/* 1-Click Demo Credentials */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                1-Click Demo Login Credentials
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Click any role card below to automatically authenticate with pre-seeded demo accounts.
              </p>
            </div>

            {/* Patient Demo */}
            <Card
              className="cursor-pointer hover:border-red-600 transition shadow-sm hover:shadow"
              onClick={() => setDemoCredentials("patient1@example.com", "Patient123!")}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Patient Portal</span>
                      <Badge variant="success" className="text-[10px]">PATIENT</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">patient1@example.com</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            {/* Driver Demo */}
            <Card
              className="cursor-pointer hover:border-red-600 transition shadow-sm hover:shadow"
              onClick={() => setDemoCredentials("driver3@ambulance.com", "Driver123!")}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">ICU Ambulance Driver</span>
                      <Badge variant="warning" className="text-[10px]">DRIVER</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">driver3@ambulance.com</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>

            {/* Admin Demo */}
            <Card
              className="cursor-pointer hover:border-red-600 transition shadow-sm hover:shadow"
              onClick={() => setDemoCredentials("admin@ambulance.com", "Admin123!")}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">System Administrator</span>
                      <Badge variant="destructive" className="text-[10px]">ADMIN</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">admin@ambulance.com</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
