"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Field } from "@/components/admin/form-fields";
import { SwitchField } from "@/components/admin/status-field";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { MetricsField } from "@/components/admin/metrics-field";
import { SocialLinksManager } from "@/components/admin/social-links-manager";
import { SubmitButton } from "@/components/admin/submit-button";
import { updateSiteSettings, type SettingsFormState } from "@/lib/actions/settings";
import type { SiteSettingsModel, SocialLinkModel } from "@/generated/prisma/models";
import type { Metric } from "@/lib/settings";

const initialState: SettingsFormState = { success: false, message: "" };

export function SettingsForm({
  settings,
  socialLinks,
}: {
  settings: SiteSettingsModel;
  socialLinks: SocialLinkModel[];
}) {
  const [state, formAction] = useActionState(updateSiteSettings, initialState);

  let metrics: Metric[] = [];
  try {
    metrics = JSON.parse(settings.metrics);
  } catch {
    metrics = [];
  }

  return (
    <form action={formAction} className="space-y-6">
      <Tabs defaultValue="brand">
        <TabsList>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="hero">Hero &amp; Homepage</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
        </TabsList>

        <TabsContent value="brand" keepMounted className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Site name" htmlFor="field-siteName" error={state.fieldErrors?.siteName}>
              <Input id="field-siteName" name="siteName" defaultValue={settings.siteName} required />
            </Field>
            <Field label="Tagline" htmlFor="field-tagline" error={state.fieldErrors?.tagline}>
              <Input id="field-tagline" name="tagline" defaultValue={settings.tagline} required />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ImageUploadField label="Logo" name="logo" defaultValue={settings.logo} />
            <ImageUploadField label="Favicon" name="favicon" defaultValue={settings.favicon} />
          </div>
          <Field label="Footer text" htmlFor="field-footerText">
            <Textarea
              id="field-footerText"
              name="footerText"
              rows={2}
              defaultValue={settings.footerText}
              required
            />
          </Field>
          <SwitchField
            name="newsletterEnabled"
            label="Newsletter signup"
            description="Show the newsletter form in the site footer"
            defaultChecked={settings.newsletterEnabled}
          />
        </TabsContent>

        <TabsContent value="hero" keepMounted className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <Field label="Hero headline" htmlFor="field-heroHeadline">
            <Textarea
              id="field-heroHeadline"
              name="heroHeadline"
              rows={2}
              defaultValue={settings.heroHeadline}
              required
            />
          </Field>
          <Field label="Hero subheading" htmlFor="field-heroSubheading">
            <Textarea
              id="field-heroSubheading"
              name="heroSubheading"
              rows={3}
              defaultValue={settings.heroSubheading}
              required
            />
          </Field>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Primary CTA text" htmlFor="field-heroCtaPrimaryText">
              <Input
                id="field-heroCtaPrimaryText"
                name="heroCtaPrimaryText"
                defaultValue={settings.heroCtaPrimaryText}
                required
              />
            </Field>
            <Field label="Primary CTA link" htmlFor="field-heroCtaPrimaryUrl">
              <Input
                id="field-heroCtaPrimaryUrl"
                name="heroCtaPrimaryUrl"
                defaultValue={settings.heroCtaPrimaryUrl}
                required
              />
            </Field>
            <Field label="Secondary CTA text" htmlFor="field-heroCtaSecondaryText">
              <Input
                id="field-heroCtaSecondaryText"
                name="heroCtaSecondaryText"
                defaultValue={settings.heroCtaSecondaryText}
                required
              />
            </Field>
            <Field label="Secondary CTA link" htmlFor="field-heroCtaSecondaryUrl">
              <Input
                id="field-heroCtaSecondaryUrl"
                name="heroCtaSecondaryUrl"
                defaultValue={settings.heroCtaSecondaryUrl}
                required
              />
            </Field>
          </div>
          <MetricsField defaultValue={metrics} />
        </TabsContent>

        <TabsContent value="contact" keepMounted className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Contact email" htmlFor="field-contactEmail" error={state.fieldErrors?.contactEmail}>
              <Input
                id="field-contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={settings.contactEmail}
                required
              />
            </Field>
            <Field label="Phone number" htmlFor="field-phone">
              <Input id="field-phone" name="phone" defaultValue={settings.phone} required />
            </Field>
          </div>
          <Field label="Address" htmlFor="field-address">
            <Textarea id="field-address" name="address" rows={2} defaultValue={settings.address} required />
          </Field>
          <Field
            label="Map embed URL"
            htmlFor="field-mapEmbedUrl"
            hint="Google Maps embed iframe src URL (optional)."
          >
            <Input
              id="field-mapEmbedUrl"
              name="mapEmbedUrl"
              defaultValue={settings.mapEmbedUrl ?? ""}
            />
          </Field>
        <Field
            label="Booking link"
            htmlFor="field-bookingUrl"
            hint="Cal.com, Calendly or similar. Adds a “Book a 15-min call” button on the contact page."
          >
            <Input
              id="field-bookingUrl"
              name="bookingUrl"
              type="url"
              defaultValue={settings.bookingUrl ?? ""}
              placeholder="https://cal.com/your-name/intro"
            />
          </Field>
        </TabsContent>

        <TabsContent value="social" keepMounted className="rounded-2xl border border-border bg-card p-6">
          <SocialLinksManager links={socialLinks} />
        </TabsContent>
      </Tabs>

      {state.message && (
        <p
          className={`flex items-center gap-2 text-sm ${state.success ? "text-success" : "text-destructive"}`}
        >
          {state.success ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          {state.message}
        </p>
      )}

      <SubmitButton>Save settings</SubmitButton>
    </form>
  );
}
