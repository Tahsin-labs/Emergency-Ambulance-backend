import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-12 container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight">Contact & Emergency Hotline</h1>
          <p className="text-muted-foreground mt-3">
            Our dispatch coordinators and customer care agents are available around the clock.
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-red-500/20 bg-red-500/5">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <Phone className="h-5 w-5 animate-pulse" />
                24/7 Emergency Dispatch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                For immediate life-threatening situations, dial directly:
              </p>
              <div className="text-2xl font-extrabold text-foreground">+880 1700 000000</div>
              <div className="text-lg font-bold text-red-600">Hotline: 999</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-sky-600" />
                Administrative Inquiries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                For partnerships, hospital listings, or billing questions:
              </p>
              <div className="font-semibold text-foreground">support@resq-ambulance.com</div>
              <div className="text-xs text-muted-foreground">
                Response within 2 hours during business shifts.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
