import { prisma } from "@/lib/prisma";
import { requirePortalUser, fmtDate } from "@/lib/portal";

export default async function AssetsPage() {
  const user = await requirePortalUser();
  const assets = await prisma.clientAsset.findMany({ where: { userId: user.id }, orderBy: [{ type: "asc" }, { name: "asc" }] });
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Equipment and services</h1>
      <p className="mt-1 text-muted-foreground">What we look after for you.</p>
      {assets.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Your list is being prepared.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr><th className="py-2 pr-4 font-medium">Name</th><th className="py-2 pr-4 font-medium">Type</th><th className="py-2 pr-4 font-medium">Assigned to</th><th className="py-2 pr-4 font-medium">Details</th><th className="py-2 font-medium">Renews / expires</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assets.map((a) => (
                <tr key={a.id}>
                  <td className="py-3 pr-4 font-medium">{a.name}</td>
                  <td className="py-3 pr-4">{a.type}</td>
                  <td className="py-3 pr-4">{a.assignedTo || "-"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{a.details || "-"}</td>
                  <td className={a.expiresAt && a.expiresAt < new Date() ? "py-3 text-destructive" : "py-3"}>{a.expiresAt ? fmtDate(a.expiresAt) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
