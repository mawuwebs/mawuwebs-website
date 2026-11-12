import { MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export function whatsappHref(number: string, text = "Hello, I need IT support.") {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Floating call + WhatsApp buttons, bottom-left. Hidden on pages where a form already fills the screen. */
export function QuickContact({ phone, whatsapp }: { phone: string; whatsapp?: string | null }) {
  const tel = phone.replace(/[^\d+]/g, "");
  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-2 print:hidden">
      {whatsapp && (
        <a
          href={whatsappHref(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className={cn(
            "flex h-12 items-center gap-2 rounded-full bg-[#1e8e4e] px-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105",
            "focus-visible:outline-2 focus-visible:outline-offset-2"
          )}
        >
          <MessageCircle className="size-5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
      <a
        href={`tel:${tel}`}
        aria-label="Call us"
        className="flex h-12 items-center gap-2 rounded-full bg-forest px-4 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 lg:hidden"
      >
        <Phone className="size-5" />
        <span className="hidden sm:inline">Call</span>
      </a>
    </div>
  );
}
