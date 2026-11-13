import { guardArea } from "@/lib/guard-area";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guardArea("orders");
  return children;
}
