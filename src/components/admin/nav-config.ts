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
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
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
      { label: "Pages", href: "/admin/pages", icon: FileText },
      { label: "Services", href: "/admin/services", icon: Briefcase },
      { label: "Projects", href: "/admin/projects", icon: FolderKanban },
      { label: "Blog Posts", href: "/admin/posts", icon: Newspaper },
      { label: "Testimonials", href: "/admin/testimonials", icon: MessageSquareQuote },
      { label: "FAQs", href: "/admin/faqs", icon: HelpCircle },
      { label: "Categories & Tags", href: "/admin/taxonomy", icon: Tags },
      { label: "Media Library", href: "/admin/media", icon: ImageIcon },
    ],
  },
  {
    title: "Engagement",
    items: [
      { label: "Enquiries", href: "/admin/messages", icon: Mail },
      { label: "Newsletter", href: "/admin/newsletter", icon: Mails },
    ],
  },
  {
    title: "Configuration",
    items: [
      { label: "Site Settings", href: "/admin/settings", icon: Settings },
      { label: "Users", href: "/admin/users", icon: Users, adminOnly: true },
      { label: "Activity Log", href: "/admin/activity", icon: History },
    ],
  },
];
