"use client";

import * as React from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const items = [
    {
      icon: Heading2,
      label: "Heading",
      active: editor.isActive("heading", { level: 2 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: Heading3,
      label: "Subheading",
      active: editor.isActive("heading", { level: 3 }),
      onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: Bold,
      label: "Bold",
      active: editor.isActive("bold"),
      onClick: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      label: "Italic",
      active: editor.isActive("italic"),
      onClick: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: List,
      label: "Bullet list",
      active: editor.isActive("bulletList"),
      onClick: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      icon: ListOrdered,
      label: "Numbered list",
      active: editor.isActive("orderedList"),
      onClick: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      icon: Quote,
      label: "Quote",
      active: editor.isActive("blockquote"),
      onClick: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: LinkIcon,
      label: "Link",
      active: editor.isActive("link"),
      onClick: () => {
        const url = window.prompt("Link URL");
        if (url) editor.chain().focus().setLink({ href: url }).run();
        else editor.chain().focus().unsetLink().run();
      },
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
      {items.map((item) => (
        <Button
          key={item.label}
          type="button"
          size="icon-sm"
          variant={item.active ? "secondary" : "ghost"}
          aria-label={item.label}
          onClick={item.onClick}
        >
          <item.icon className="size-4" />
        </Button>
      ))}
      <span className="mx-1 h-5 w-px bg-border" />
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo className="size-4" />
      </Button>
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
      StarterKit,
      Link.configure({ openOnClick: false }),
      ImageExtension,
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class:
          "prose-content min-h-[220px] max-w-none px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  return (
    <div>
      <Label htmlFor={`${name}-editor`}>{label}</Label>
      <input type="hidden" name={name} value={html} readOnly />
      <div
        id={`${name}-editor`}
        className={cn("mt-2 overflow-hidden rounded-lg border border-input bg-background")}
      >
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
