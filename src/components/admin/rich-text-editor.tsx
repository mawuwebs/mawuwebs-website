"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import Youtube from "@tiptap/extension-youtube";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Undo,
  Redo,
  Underline as UnderlineIcon,
  Strikethrough,
  Minus,
  Code,
  ImagePlus,
  RemoveFormatting,
  Table as TableIcon,
  Video,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LinkDialog, MediaPickerDialog } from "@/components/admin/editor-dialogs";
import { cn } from "@/lib/utils";

/** Starter content built from standard nodes so it survives the editor's schema. */
const BLOCKS: { label: string; html: string }[] = [
  {
    label: "Callout",
    html: "<blockquote><p><strong>Good to know:</strong> Write your key point here.</p></blockquote><p></p>",
  },
  {
    label: "Call to action",
    html: '<h2>Ready to get started?</h2><p>Tell us about your project and we will reply within one business day.</p><p><a href="/start-a-project"><strong>Start a project →</strong></a></p>',
  },
  {
    label: "Feature list",
    html: "<h2>What you get</h2><ul><li><p><strong>Benefit one:</strong> short explanation.</p></li><li><p><strong>Benefit two:</strong> short explanation.</p></li><li><p><strong>Benefit three:</strong> short explanation.</p></li></ul>",
  },
  {
    label: "FAQ section",
    html: "<h2>Frequently asked questions</h2><h3>Question one?</h3><p>Answer one.</p><h3>Question two?</h3><p>Answer two.</p><h3>Question three?</h3><p>Answer three.</p>",
  },
  {
    label: "How it works (3 steps)",
    html: "<h2>How it works</h2><ol><li><p><strong>Tell us what you need.</strong> A short call or form.</p></li><li><p><strong>We plan and build.</strong> You approve each stage.</p></li><li><p><strong>Launch and support.</strong> We stay on after go-live.</p></li></ol>",
  },
];

function Toolbar({ editor }: { editor: Editor | null }) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [mediaOpen, setMediaOpen] = React.useState(false);
  if (!editor) return null;

  const linkAttrs = editor.getAttributes("link") as { href?: string; target?: string };

  const items = [
    { icon: Heading2, label: "Heading", active: editor.isActive("heading", { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: "Subheading", active: editor.isActive("heading", { level: 3 }), onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: Bold, label: "Bold", active: editor.isActive("bold"), onClick: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: "Italic", active: editor.isActive("italic"), onClick: () => editor.chain().focus().toggleItalic().run() },
    { icon: UnderlineIcon, label: "Underline", active: editor.isActive("underline"), onClick: () => editor.chain().focus().toggleUnderline().run() },
    { icon: Strikethrough, label: "Strikethrough", active: editor.isActive("strike"), onClick: () => editor.chain().focus().toggleStrike().run() },
    { icon: Code, label: "Code", active: editor.isActive("code"), onClick: () => editor.chain().focus().toggleCode().run() },
    { icon: List, label: "Bullet list", active: editor.isActive("bulletList"), onClick: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: "Numbered list", active: editor.isActive("orderedList"), onClick: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: Quote, label: "Quote", active: editor.isActive("blockquote"), onClick: () => editor.chain().focus().toggleBlockquote().run() },
    { icon: LinkIcon, label: "Link", active: editor.isActive("link"), onClick: () => setLinkOpen(true) },
    { icon: ImagePlus, label: "Insert image", active: false, onClick: () => setMediaOpen(true) },
    {
      icon: TableIcon,
      label: "Insert table",
      active: editor.isActive("table"),
      onClick: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      icon: Video,
      label: "Embed YouTube video",
      active: false,
      onClick: () => {
        const url = window.prompt("YouTube URL");
        if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
      },
    },
    { icon: Minus, label: "Divider", active: false, onClick: () => editor.chain().focus().setHorizontalRule().run() },
    { icon: RemoveFormatting, label: "Clear formatting", active: false, onClick: () => editor.chain().focus().clearNodes().unsetAllMarks().run() },
  ];

  return (
    <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap items-center gap-1 border-b border-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="outline" size="sm" className="mr-1 gap-1.5">
              <LayoutTemplate className="size-4" />
              Blocks
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {BLOCKS.map((b) => (
            <DropdownMenuItem key={b.label} onClick={() => editor.chain().focus().insertContent(b.html).run()}>
              {b.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          size="icon-sm"
          variant={item.active ? "secondary" : "ghost"}
          aria-label={item.label}
          title={item.label}
          onClick={item.onClick}
        >
          <item.icon className="size-4" />
        </Button>
      ))}
      <span className="mx-1 h-5 w-px bg-border" />
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Undo" title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo className="size-4" />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Redo" title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo className="size-4" />
      </Button>

      {editor.isActive("table") && (
        <div className="flex w-full flex-wrap items-center gap-1 border-t border-border pt-2 mt-1">
          <span className="mr-1 text-xs text-muted-foreground">Table:</span>
          <Button type="button" size="xs" variant="ghost" onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row</Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Column</Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => editor.chain().focus().deleteRow().run()}>− Row</Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => editor.chain().focus().deleteColumn().run()}>− Column</Button>
          <Button type="button" size="xs" variant="ghost" onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</Button>
        </div>
      )}

      <LinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        initial={{ href: linkAttrs.href ?? "", newTab: linkAttrs.target === "_blank" }}
        onApply={({ href, newTab }) =>
          editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href, target: newTab ? "_blank" : null, rel: newTab ? "noopener noreferrer" : null })
            .run()
        }
        onRemove={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
      />
      <MediaPickerDialog
        open={mediaOpen}
        onOpenChange={setMediaOpen}
        onPick={({ url, alt }) => editor.chain().focus().setImage({ src: url, alt }).run()}
      />
    </div>
  );
}

export function RichTextEditor({
  name,
  label = "Content",
  defaultValue = "",
}: {
  name: string;
  label?: string;
  defaultValue?: string;
}) {
  const [html, setHtml] = React.useState(defaultValue);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      ImageExtension,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "prose-content min-h-[220px] max-w-none px-4 py-3 focus:outline-none",
        "aria-label": label,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  const words = React.useMemo(
    () => html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
    [html]
  );

  return (
    <div>
      <Label htmlFor={`${name}-editor`}>{label}</Label>
      <input type="hidden" name={name} value={html} readOnly />
      <div id={`${name}-editor`} className={cn("mt-2 overflow-hidden rounded-lg border border-input bg-background")}>
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
        <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
          {words} words · ~{Math.max(1, Math.round(words / 200))} min read
        </div>
      </div>
    </div>
  );
}
