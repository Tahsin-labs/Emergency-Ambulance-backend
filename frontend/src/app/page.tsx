import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Ambulance,
  PhoneCall,
  Clock,
  ShieldCheck,
  MapPin,
  HeartPulse,
  Activity,
  Hospital,
  CreditCard,
  UserCheck,
  Sparkles,
  ArrowRight,
  Flame,
  Stethoscope,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-red-500/10 via-background to-background py-16 md:py-24">
          <div className="container relative z-10 mx-auto px-4 text-center md:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 mb-6">
              <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
              <span>Real-Time Rapid Emergency Dispatch • Available 24/7</span>
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Seconds Save Lives.{" "}
              <span className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 bg-clip-text text-transparent">
                Dispatch an Ambulance
              </span>{" "}
              Instantly.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
              Automated triage priority engine, live GPS tracking, ICU life-support units,
              and seamless emergency hospital bed coordination across Dhaka.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild variant="emergency" size="lg" className="w-full sm:w-auto h-12 px-8 text-lg">
                <Link href="/patient/request">
                  <PhoneCall className="mr-2 h-5 w-5 animate-bounce" />
                  Request Emergency Ambulance
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8">
                <Link href="/login">
                  Explore Demo Portals
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Quick Metrics */}
            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
                <div className="text-3xl font-extrabold text-red-600">8.4 min</div>
                <div className="text-xs text-muted-foreground mt-1">Avg. Arrival Time</div>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
                <div className="text-3xl font-extrabold text-red-600">100%</div>
                <div className="text-xs text-muted-foreground mt-1">GPS Fleet Visibility</div>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
                <div className="text-3xl font-extrabold text-red-600">3 Tiers</div>
                <div className="text-xs text-muted-foreground mt-1">Basic / Advanced / ICU</div>
              </div>
              <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
                <div className="text-3xl font-extrabold text-red-600">SSLCommerz</div>
                <div className="text-xs text-muted-foreground mt-1">Cashless Instant Pay</div>
              </div>
            </div>
          </div>
        </section>

        {/* Fleet Tier Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-2">Ambulance Fleet</Badge>
              <h2 className="text-3xl font-bold tracking-tight">Equipped For Every Medical Priority</h2>
              <p className="text-muted-foreground mt-2">
                Our smart triage engine matches patient condition to the required life-support tier.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-t-4 border-t-sky-500">
                <CardHeader>
                  <Badge variant="info" className="w-fit mb-2">Tier 1 • Basic</Badge>
                  <CardTitle>Basic Life Support (BLS)</CardTitle>
                  <CardDescription>Non-critical transport, stable fractures, high fever</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-600" />
                    <span>Emergency Oxygen & Pulse Oximeter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-600" />
                    <span>Certified First-Responder Driver</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-sky-600" />
                    <span>Foldable Stretcher & First Aid Kit</span>
                  </div>
                  <div className="pt-4 border-t font-semibold text-foreground">
                    From ৳1,000 base + ৳40/km
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-amber-500">
                <CardHeader>
                  <Badge variant="warning" className="w-fit mb-2">Tier 2 • Advanced</Badge>
                  <CardTitle>Advanced Life Support (ALS)</CardTitle>
                  <CardDescription>Major road accidents, labor/pregnancy, severe seizures</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <span>ECG Monitor & Defibrillator</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <span>IV Cannulation & Medication Infusion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <span>Trained Paramedic Onboard</span>
                  </div>
                  <div className="pt-4 border-t font-semibold text-foreground">
                    From ৳1,800 base + ৳60/km
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-red-600 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl">
                  HIGHEST PRIORITY
                </div>
                <CardHeader>
                  <Badge variant="critical" className="w-fit mb-2">Tier 3 • ICU</Badge>
                  <CardTitle>Mobile Intensive Care (MICU)</CardTitle>
                  <CardDescription>Cardiac arrest, stroke, unconscious, severe trauma</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-red-600" />
                    <span>Transport Ventilator & Multi-para Monitor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-red-600" />
                    <span>Critical Care Doctor / Specialist Nurse</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-red-600" />
                    <span>Automatic Priority Hospital Bed Reservation</span>
                  </div>
                  <div className="pt-4 border-t font-semibold text-foreground">
                    From ৳3,000 base + ৳100/km
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <Badge variant="outline" className="mb-2">Operational Workflow</Badge>
              <h2 className="text-3xl font-bold tracking-tight">How ResQ Emergency Dispatch Works</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div className="flex flex-col items-center p-6 border rounded-xl bg-card">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 font-bold text-xl mb-4">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">Enter Details & Location</h3>
                <p className="text-sm text-muted-foreground">
                  Select symptom or emergency type. Pickup GPS is automatically locked.
                </p>
              </div>

              <div className="flex flex-col items-center p-6 border rounded-xl bg-card">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 font-bold text-xl mb-4">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">Priority Engine Matching</h3>
                <p className="text-sm text-muted-foreground">
                  Nearest available ambulance with the required life-support unit is assigned.
                </p>
              </div>

              <div className="flex flex-col items-center p-6 border rounded-xl bg-card">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 font-bold text-xl mb-4">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">Live GPS & Hospital Route</h3>
                <p className="text-sm text-muted-foreground">
                  Track the driver in real-time. Destination hospital is pre-notified.
                </p>
              </div>

              <div className="flex flex-col items-center p-6 border rounded-xl bg-card">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 font-bold text-xl mb-4">
                  4
                </div>
                <h3 className="font-semibold text-lg mb-2">Digital Fare & Payment</h3>
                <p className="text-sm text-muted-foreground">
                  Distance-based fare calculated automatically with instant SSLCommerz checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA banner */}
        <section className="py-16 bg-gradient-to-r from-red-600 to-rose-700 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Facing an Urgent Medical Emergency?</h2>
            <p className="mt-4 text-lg text-red-100 max-w-xl mx-auto">
              Our dispatch center responds within milliseconds. Tap below to launch emergency request.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="bg-white text-red-600 hover:bg-red-50 font-bold text-lg h-12 px-8">
                <Link href="/patient/request">
                  <PhoneCall className="mr-2 h-5 w-5 animate-bounce" />
                  Request Emergency Unit Now
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
