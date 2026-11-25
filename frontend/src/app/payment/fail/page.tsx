"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowRight } from "lucide-react";

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const tranId = searchParams.get("tran_id") || searchParams.get("tranId");

  return (
    <Card className="max-w-md w-full text-center border-red-500/30">
      <CardHeader>
        <div className="h-16 w-16 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <XCircle className="h-10 w-10" />
        </div>
        <CardTitle className="text-2xl mt-4 text-red-700 dark:text-red-400">
          Payment Failed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          The transaction could not be processed by SSLCommerz or was declined.
        </p>
        {tranId && (
          <div className="bg-muted p-3 rounded-lg text-xs font-mono">
            Ref: {tranId}
          </div>
        )}
        <div className="pt-2 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/patient/trips">Return to Trips</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaymentFailPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Suspense fallback={<div>Loading...</div>}>
          <PaymentFailContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
