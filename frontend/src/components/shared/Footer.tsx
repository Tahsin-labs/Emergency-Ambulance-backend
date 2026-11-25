import Link from "next/link";
import { Ambulance, Heart, ShieldAlert, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 text-muted-foreground">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-600 text-white">
              <Ambulance className="h-5 w-5" />
            </div>
            <span>ResQ Ambulance</span>
          </div>
          <p className="text-sm">
            24/7 Rapid Response Emergency Dispatch and Hospital Bed Coordination Network.
          </p>
          <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
            <Phone className="h-4 w-4 animate-pulse" />
            <span>Emergency Hotline: 999 / +880 1700 000000</span>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-3 text-sm">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-foreground">Home</Link></li>
            <li><Link href="/services" className="hover:text-foreground">Ambulance Fleet</Link></li>
            <li><Link href="/hospitals" className="hover:text-foreground">Hospitals & ICU</Link></li>
            <li><Link href="/patient/request" className="hover:text-foreground font-medium text-red-600">Request Ambulance</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-3 text-sm">Portals</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/patient" className="hover:text-foreground">Patient Dashboard</Link></li>
            <li><Link href="/driver" className="hover:text-foreground">Driver Cockpit</Link></li>
            <li><Link href="/admin" className="hover:text-foreground">Admin Governance</Link></li>
            <li><Link href="/login" className="hover:text-foreground">Demo Accounts</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-foreground mb-3 text-sm">Emergency Protocols</h4>
          <p className="text-xs leading-relaxed mb-3">
            For critical cardiac, stroke, and trauma emergencies, ICU ambulances with on-board paramedics and life-support ventilators are prioritized automatically.
          </p>
          <div className="flex items-center gap-1 text-xs">
            <ShieldAlert className="h-4 w-4 text-emerald-600" />
            <span>ISO 9001 Certified Health Response</span>
          </div>
        </div>
      </div>

      <div className="border-t py-6 text-center text-xs">
        <p>&copy; {new Date().getFullYear()} ResQ Emergency Ambulance Dispatch. All rights reserved.</p>
      </div>
    </footer>
  );
}
