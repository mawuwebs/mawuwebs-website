import {
  LayoutDashboard,
  FileText,
  Briefcase,
  FolderKanban,
  Newspaper,
  MessageSquareQuote,
  HelpCircle,
  Tags,
  Image as ImageIcon,
  Mail,
  Settings,
  Users,
  History,
  Mails,
  ListChecks,
  SlidersHorizontal,
  Search,
  CornerUpRight,
  Building2,
  LifeBuoy,
  ClipboardCheck,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import type { Area } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  area?: Area;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    title: "Content",
    items: [
      { label: "Pages", href: "/admin/pages", icon: FileText, area: "content" },
      { label: "Services", href: "/admin/services", icon: Briefcase, area: "content" },
      { label: "Plans", href: "/admin/plans", icon: ListChecks, area: "content" },
      { label: "Projects", href: "/admin/projects", icon: FolderKanban, area: "content" },
      { label: "Blog Posts", href: "/admin/posts", icon: Newspaper, area: "content" },
      { label: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote, area: "content" },
      { label: "FAQs", href: "/admin/faqs", icon: HelpCircle, area: "content" },
      { label: "Categories & Tags", href: "/admin/taxonomy", icon: Tags, area: "content" },
      { label: "Media Library", href: "/admin/media", icon: ImageIcon, area: "content" },
      { label: "SEO Audit", href: "/admin/seo", icon: Search, area: "content" },
      { label: "Redirects", href: "/admin/redirects", icon: CornerUpRight, area: "content" },
    ],
  },
  {
    title: "Engagement",
    items: [
      { label: "Orders", href: "/admin/messages", icon: Mail, area: "orders" },
      { label: "IT health checks", href: "/admin/health-checks", icon: ClipboardCheck, area: "orders" },
      { label: "Clients", href: "/admin/clients", icon: Building2, area: "orders" },
      { label: "Billing", href: "/admin/billing", icon: Receipt, area: "billing" },
      { label: "Tickets", href: "/admin/tickets", icon: LifeBuoy, area: "orders" },
      { label: "Newsletter", href: "/admin/newsletter", icon: Mails, area: "newsletter" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Site Settings", href: "/admin/settings", icon: Settings, area: "settings" },
      { label: "Forms & estimates", href: "/admin/forms", icon: SlidersHorizontal, adminOnly: true },
      { label: "Users", href: "/admin/users", icon: Users, adminOnly: true },
      { label: "Activity Log", href: "/admin/activity", icon: History, area: "activity" },
    ],
  },
];
