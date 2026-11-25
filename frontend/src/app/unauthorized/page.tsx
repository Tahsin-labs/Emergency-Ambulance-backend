import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            You do not have the required permissions to access this dashboard. Please log in with an authorized role account.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/">Return Home</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Switch Account</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
