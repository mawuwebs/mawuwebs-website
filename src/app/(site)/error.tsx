"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center bg-forest px-6 text-center text-white">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-white/10 text-yellow">
        <AlertTriangle className="size-8" />
      </div>
      <p className="mt-6 font-display text-sm font-semibold tracking-widest text-yellow uppercase">
        Something went wrong
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold text-balance sm:text-5xl">
        We hit a snag loading this page
      </h1>
      <p className="mt-4 max-w-md text-white/70">
        Please try again, or head back to the homepage if the problem continues.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={() => reset()}
          size="lg"
          className="bg-orange text-forest hover:bg-orange-dark"
        >
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button
          render={<Link href="/" />}
          size="lg"
          variant="outline"
          className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to homepage
        </Button>
      </div>
    </div>
  );
}
