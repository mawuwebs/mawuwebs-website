import { requirePortalUser } from "@/lib/portal";
import { NewTicketForm } from "@/components/site/portal-forms";

export default async function NewTicketPage() {
  await requirePortalUser();
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">New support request</h1>
      <p className="mb-8 mt-1 text-muted-foreground">We reply by email and here in the portal.</p>
      <NewTicketForm />
    </div>
  );
}
