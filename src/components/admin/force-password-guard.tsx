"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

/** Sends users on a temporary password to the account page until they change it. */
export function ForcePasswordGuard() {
  const pathname = usePathname();
  const router = useRouter();
  React.useEffect(() => {
    if (pathname !== "/admin/account") router.replace("/admin/account");
  }, [pathname, router]);
  return null;
}
