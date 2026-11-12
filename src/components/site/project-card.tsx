import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type {
  ProjectModel,
  CategoryModel,
  TagModel,
} from "@/generated/prisma/models";

type ProjectWithRelations = ProjectModel & {
  category?: CategoryModel | null;
  tags?: TagModel[];
};

export function ProjectCard({ project }: { project: ProjectWithRelations }) {
  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group spotlight flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/10 focus-visible:-translate-y-1.5"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {project.featuredImage && (
          <Image
            src={project.featuredImage}
            alt={project.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
        <div className="absolute top-3 left-3 flex items-center justify-center rounded-full bg-white/90 p-2 -translate-y-1 opacity-0 shadow-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight className="size-4 text-forest" />
        </div>
        {project.category && (
          <Badge className="absolute bottom-3 left-3 bg-forest text-white">
            {project.category.name}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-lg font-semibold">{project.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>
        {project.tags && project.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
