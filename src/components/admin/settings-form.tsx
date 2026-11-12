"use client";

import { UnsavedGuard } from "@/components/admin/unsaved-guard";
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
import { LogosField } from "@/components/admin/logos-field";
import { SocialLinksManager } from "@/components/admin/social-links-manager";
import { SubmitButton } from "@/components/admin/submit-button";
import { updateSiteSettings, type SettingsFormState } from "@/lib/actions/settings";
import type { SiteSettingsModel, SocialLinkModel } from "@/generated/prisma/models";
import type { Metric, TrustLogo } from "@/lib/settings";

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
  let trustLogos: TrustLogo[] = [];
  try {
    trustLogos = JSON.parse(settings.trustLogos);
  } catch {
    trustLogos = [];
  }

  return (
    <form action={formAction} className="space-y-6">
      <UnsavedGuard />
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
            <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
              <p className="font-medium">Logo</p>
              <p className="mt-1 text-muted-foreground">
                The portrait mark with the site name beside it, on the website and in this admin. It&apos;s a fixed brand
                file, so there is nothing to upload here. The name above is what appears next to it.
              </p>
            </div>
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
          <LogosField defaultValue={trustLogos} />
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="WhatsApp number"
              htmlFor="field-whatsapp"
              hint="International format, digits only, e.g. 233501234567. Adds WhatsApp buttons across the site."
            >
              <Input id="field-whatsapp" name="whatsapp" defaultValue={settings.whatsapp ?? ""} placeholder="233501234567" />
            </Field>
            <Field
              label="Service area"
              htmlFor="field-serviceArea"
              hint="Where you work, e.g. “Accra and Tema, remote support nationwide”."
            >
              <Input id="field-serviceArea" name="serviceArea" defaultValue={settings.serviceArea ?? ""} />
            </Field>
          </div>
          <Field
            label="Support promise"
            htmlFor="field-supportPromise"
            hint="One honest line about response time, e.g. “Support requests answered within 2 working hours”. Only promise what you deliver."
          >
            <Input id="field-supportPromise" name="supportPromise" defaultValue={settings.supportPromise ?? ""} />
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
