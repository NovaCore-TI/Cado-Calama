"use client";
import { useEffect } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { parseArticleContent, safeArticleLink } from "@/lib/article-content";

export default function RichTextEditor({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, codeBlock: false, code: false, horizontalRule: false, link: { openOnClick: false } })],
    immediatelyRender: false,
    content: parseArticleContent(value),
    editorProps: { attributes: { role: "textbox", "aria-multiline": "true", "aria-labelledby": "article-content-label", class: "article-body min-h-64 p-4 text-sm outline-none" } },
    onUpdate: ({ editor: current }) => onChange(JSON.stringify(current.getJSON())),
  });
  useEditorState({ editor, selector: ({ editor: current }) => current?.state });
  useEffect(() => { if (editor && JSON.stringify(editor.getJSON()) !== value) editor.commands.setContent(parseArticleContent(value), { emitUpdate: false }); }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);
  if (!editor) return <p className="min-h-64 p-4 text-sm" role="status">Cargando editor…</p>;
  const button = (label: string, active: boolean, action: () => void, text: string) => <button key={label} type="button" aria-label={label} aria-pressed={active} disabled={disabled} onClick={action} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${active ? "border-[#A14B92] bg-[#F8EFF6]" : "border-[#E2E7E7] bg-white"}`}>{text}</button>;
  return <div className="rounded-2xl border border-[#B3BFBF] bg-white focus-within:ring-2 focus-within:ring-[#A14B92]/30">
    <div role="group" aria-label="Formato del artículo" className="flex flex-wrap gap-2 border-b border-[#E2E7E7] p-3">
      {button("Negrita", editor.isActive("bold"), () => { editor.chain().focus().toggleBold().run(); }, "Negrita")}
      {button("Cursiva", editor.isActive("italic"), () => { editor.chain().focus().toggleItalic().run(); }, "Cursiva")}
      {button("Subtítulo", editor.isActive("heading", { level: 2 }), () => { editor.chain().focus().toggleHeading({ level: 2 }).run(); }, "Subtítulo")}
      {button("Lista con viñetas", editor.isActive("bulletList"), () => { editor.chain().focus().toggleBulletList().run(); }, "• Lista")}
      {button("Lista numerada", editor.isActive("orderedList"), () => { editor.chain().focus().toggleOrderedList().run(); }, "1. Lista")}
      {button("Cita", editor.isActive("blockquote"), () => { editor.chain().focus().toggleBlockquote().run(); }, "Cita")}
      {button("Enlace", editor.isActive("link"), () => {
        const value = window.prompt("URL del enlace (https://…). Deja vacío para quitarlo.", editor.getAttributes("link").href || "");
        if (value === null) return;
        if (!value) { editor.chain().focus().unsetLink().run(); return; }
        const href = safeArticleLink(value);
        if (!href) { window.alert("Utiliza una URL https, http o mailto válida."); return; }
        editor.chain().focus().setLink({ href }).run();
      }, "Enlace")}
      <button type="button" disabled={!editor.can().undo() || disabled} onClick={() => editor.chain().focus().undo().run()} className="rounded-lg px-3 py-2 text-xs underline disabled:opacity-50">Deshacer</button>
    </div>
    <EditorContent editor={editor} />
  </div>;
}
