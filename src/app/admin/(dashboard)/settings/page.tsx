import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSiteSettings, getSocialLinks } from "@/lib/settings";

export const metadata: Metadata = { title: "Site Settings" };

export default async function SettingsPage() {
  const [settings, socialLinks] = await Promise.all([getSiteSettings(), getSocialLinks()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Site Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your brand, homepage, and contact information.
        </p>
      </div>
      <SettingsForm settings={settings} socialLinks={socialLinks} />
    </div>
  );
}
