import type { Metadata } from "next";
import { EmptyState } from "@/components/admin/list-page-header";
import { MediaUploader } from "@/components/admin/media-uploader";
import { MediaCard } from "@/components/admin/media-card";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Media Library" };

export default async function MediaLibraryPage() {
  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Media Library</h1>
          <p className="mt-1 text-muted-foreground">
            Every image uploaded across your site, in one place.
          </p>
        </div>
        <MediaUploader />
      </div>

      {media.length === 0 ? (
        <EmptyState message="No media uploaded yet." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {media.map((item) => (
            <MediaCard key={item.id} media={item} />
          ))}
        </div>
      )}
    </div>
  );
}
