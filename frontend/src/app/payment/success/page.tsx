"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id") || searchParams.get("tranId");

  return (
    <Card className="max-w-md w-full text-center border-emerald-500/30">
      <CardHeader>
        <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <CardTitle className="text-2xl mt-4 text-emerald-700 dark:text-emerald-400">
          Payment Successful!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Your ambulance trip payment has been successfully verified via SSLCommerz.
        </p>
        {tranId && (
          <div className="bg-muted p-3 rounded-lg text-xs font-mono">
            Transaction ID: {tranId}
          </div>
        )}
        <div className="pt-2 flex justify-center gap-3">
          <Button asChild>
            <Link href="/patient/trips">
              View My Trips <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<div>Loading payment confirmation...</div>}>
          <PaymentSuccessContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
