import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, ShieldAlert, HeartPulse, CheckCircle2 } from "lucide-react";

export default function ServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-12 container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-2">Emergency Response Tiers</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight">Ambulance Services & Life Support Tiers</h1>
          <p className="text-muted-foreground mt-3">
            Every emergency is different. Our clinical triage system allocates the right vehicle and medical equipment based on symptom urgency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-t-4 border-t-sky-500">
            <CardHeader>
              <Badge variant="info" className="w-fit mb-2">Basic Life Support</Badge>
              <CardTitle className="text-2xl">BLS Unit</CardTitle>
              <CardDescription>Designed for non-life-threatening medical transport.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold">৳1,000 <span className="text-xs font-normal text-muted-foreground">+ ৳40/km</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-600" /> Supplemental Oxygen System</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-600" /> Pulse Oximeter & BP Monitor</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-600" /> Basic Splinting & Bandages</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-600" /> Certified Paramedic Driver</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-amber-500">
            <CardHeader>
              <Badge variant="warning" className="w-fit mb-2">Advanced Life Support</Badge>
              <CardTitle className="text-2xl">ALS Unit</CardTitle>
              <CardDescription>Equipped for complex trauma, pregnancy and respiratory distress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold">৳1,800 <span className="text-xs font-normal text-muted-foreground">+ ৳60/km</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600" /> Defibrillator & ECG Monitoring</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600" /> IV Infusion & Emergency Medications</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600" /> Advanced Airway Management (ET Tube)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-amber-600" /> Registered Nurse & Paramedic</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-red-600">
            <CardHeader>
              <Badge variant="critical" className="w-fit mb-2">Intensive Care Unit</Badge>
              <CardTitle className="text-2xl">MICU Unit</CardTitle>
              <CardDescription>Full mobile ICU for cardiac arrest, stroke and critical patients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold">৳3,000 <span className="text-xs font-normal text-muted-foreground">+ ৳100/km</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-600" /> Transport Mechanical Ventilator</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-600" /> Multi-Para Cardiac Monitor & Pacemaker</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-600" /> Syringe Pumps & Blood Gas Analyzer</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-red-600" /> Onboard Critical Care Physician</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <Button asChild variant="emergency" size="lg">
            <Link href="/patient/request">
              <PhoneCall className="mr-2 h-5 w-5" />
              Request Dispatch Service Now
            </Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
