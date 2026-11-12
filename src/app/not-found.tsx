import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center bg-forest px-6 text-center text-white">
      <div className="animate-float">
        <div className="animate-in zoom-in-50 fade-in fill-mode-both flex size-16 items-center justify-center rounded-2xl bg-white/10 text-yellow">
          <Compass className="size-8" />
        </div>
      </div>
      <p className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both mt-6 font-display delay-100 duration-500 text-sm font-semibold tracking-widest text-yellow uppercase">
        404 Error
      </p>
      <h1 className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-3 font-display delay-200 duration-700 text-4xl font-bold text-balance sm:text-5xl">
        Looks like you&apos;re off the map
      </h1>
      <p className="animate-in fade-in fill-mode-both mt-4 max-w-md delay-300 duration-700 text-white/70">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Button
        render={<Link href="/" />}
        size="lg"
        className="sheen-host animate-in fade-in slide-in-from-bottom-2 fill-mode-both mt-8 bg-orange text-forest delay-500 duration-700 hover:-translate-y-0.5 hover:bg-orange-dark"
      >
        <ArrowLeft className="size-4" />
        Back to homepage
      </Button>
    </div>
  );
}
