import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hospital, Phone, MapPin, Bed } from "lucide-react";

async function getHospitals() {
  try {
    const res = await fetch("https://emergency-ambulance-backend-sovv.onrender.com/api/v1/hospitals", {
      next: { revalidate: 30 },
    });
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export default async function HospitalsPage() {
  const hospitals = await getHospitals();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-12 container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge variant="outline" className="mb-2">Hospital Network</Badge>
          <h1 className="text-4xl font-extrabold tracking-tight">Partner Hospitals & Bed Availability</h1>
          <p className="text-muted-foreground mt-3">
            Real-time tracking of general and ICU bed capacity across partner healthcare facilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hospitals.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No hospitals found or backend connecting.
            </div>
          ) : (
            hospitals.map((h: any) => (
              <Card key={h.id} className="shadow-sm hover:shadow transition">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={h.icuBedsAvailable > 0 ? "success" : "destructive"}>
                      {h.icuBedsAvailable > 0 ? `${h.icuBedsAvailable} ICU Beds Open` : "ICU Full"}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl mt-2 flex items-center gap-2">
                    <Hospital className="h-5 w-5 text-red-600" />
                    {h.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                    <span>{h.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{h.contactNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                    <div className="bg-muted/40 p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">General Beds</div>
                      <div className="font-bold text-base text-foreground">
                        {h.generalBedsAvailable} / {h.generalBedsTotal}
                      </div>
                    </div>
                    <div className="bg-muted/40 p-2 rounded text-center">
                      <div className="text-xs text-muted-foreground">ICU Beds</div>
                      <div className="font-bold text-base text-red-600">
                        {h.icuBedsAvailable} / {h.icuBedsTotal}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
