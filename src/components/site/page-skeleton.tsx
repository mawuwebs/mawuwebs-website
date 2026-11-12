import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/site/container";

export function PageSkeleton() {
  return (
    <div>
      <div className="border-b border-border bg-forest">
        <Container className="py-20 sm:py-24">
          <Skeleton className="h-4 w-24 bg-white/10" />
          <Skeleton className="mt-4 h-10 w-2/3 max-w-md bg-white/10" />
          <Skeleton className="mt-3 h-5 w-1/2 max-w-sm bg-white/10" />
        </Container>
      </div>
      <Container className="py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border p-6">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
