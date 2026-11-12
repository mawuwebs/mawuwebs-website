import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { PostModel, CategoryModel } from "@/generated/prisma/models";

type PostWithRelations = PostModel & { category?: CategoryModel | null };

export function BlogCard({
  post,
  headingLevel = 3,
}: {
  post: PostWithRelations;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group spotlight flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 focus-visible:-translate-y-1.5"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {post.featuredImage && (
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
        {post.category && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
            {post.category.name}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {post.publishedAt && (
          <time
            dateTime={post.publishedAt.toISOString()}
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            {format(post.publishedAt, "MMMM d, yyyy")}
          </time>
        )}
        <Heading className="mt-2 font-display text-lg font-semibold text-balance group-hover:text-accent">
          {post.title}
        </Heading>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
      </div>
    </Link>
  );
}
