import type { Prisma } from "@/generated/prisma/client";
import { KIND_VALUES, STATUS_OPTIONS } from "@/lib/submission";

export const ENQUIRY_PAGE_SIZE = 20;

export type EnquiryFilters = {
  status?: string;
  type?: string;
  q?: string;
  service?: string;
  follow?: string; // "due" = follow-up date has passed and the lead is still open
};

const OPEN_STATUSES = ["NEW", "READ", "RESPONDED", "QUOTED"] as const;

/** Builds the DB filter from URL params. Unknown values are ignored, never trusted. */
export function buildEnquiryWhere(f: EnquiryFilters): Prisma.ContactSubmissionWhereInput {
  const and: Prisma.ContactSubmissionWhereInput[] = [];
  if (f.status && STATUS_OPTIONS.some((o) => o.value === f.status)) {
    and.push({ status: f.status as (typeof OPEN_STATUSES)[number] });
  }
  if (f.type && (KIND_VALUES as string[]).includes(f.type)) and.push({ kind: f.type });
  if (f.service) and.push({ serviceSlug: f.service.slice(0, 120) });
  const q = f.q?.trim().slice(0, 100);
  if (q) {
    and.push({
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { subject: { contains: q } },
        { message: { contains: q } },
        { phone: { contains: q } },
      ],
    });
  }
  if (f.follow === "due") {
    and.push({ followUpAt: { lte: new Date() }, status: { in: [...OPEN_STATUSES] } });
  }
  return and.length ? { AND: and } : {};
}
