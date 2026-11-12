import Image from "next/image";
import { Quote, Star } from "lucide-react";
import type { TestimonialModel } from "@/generated/prisma/models";
import { cn } from "@/lib/utils";

export function TestimonialCard({
  testimonial,
  className,
}: {
  testimonial: TestimonialModel;
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "spotlight flex h-full flex-col rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5",
        className
      )}
    >
      <Quote className="size-8 text-accent/40" aria-hidden="true" />
      <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground/90">
        &ldquo;{testimonial.content}&rdquo;
      </blockquote>
      <div className="mt-6 flex items-center gap-3">
        {testimonial.avatar ? (
          <Image
            src={testimonial.avatar}
            alt={testimonial.name}
            width={44}
            height={44}
            className="size-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
            {testimonial.name.charAt(0)}
          </div>
        )}
        <figcaption>
          <div className="text-sm font-semibold">{testimonial.name}</div>
          <div className="text-xs text-muted-foreground">
            {testimonial.role}
            {testimonial.company ? `, ${testimonial.company}` : ""}
          </div>
        </figcaption>
      </div>
      <div className="mt-4 flex gap-0.5" role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "size-4",
              i < testimonial.rating ? "fill-yellow-dark text-yellow-dark" : "text-muted"
            )}
          />
        ))}
      </div>
    </figure>
  );
}
