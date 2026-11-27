"use client";

import { useRef, useState } from "react";
import { useFormState } from "react-dom";
import Image from "next/image";
import { saveHtmlContractTemplateAction, type FormState } from "@/app/actions";
import type { ContractTemplateVersion } from "@/lib/contract-templates";
import { SubmitButton } from "./submit-button";

function splitStyles(html: string) {
  const styles: string[] = [];
  const content = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi, (_match, css: string) => {
    styles.push(css);
    return "";
  });
  return { content, styles: styles.join("\n") };
}

function buildEditorDocument(content: string, styles: string) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${styles}
html,body{margin:0;padding:0;background:#fff;color:#1f1f1f;font:16px Arial,sans-serif;line-height:1.6}
body{box-sizing:border-box;min-height:75vh;padding:28px 34px;outline:none}
img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}
body:focus{outline:none}h1{font-size:2em}h2{font-size:1.5em}h3{font-size:1.2em}
.page-break{border-top:1px dashed #a28d5b;margin:1.5rem 0;padding-top:.5rem;color:#82744f}
</style></head><body contenteditable="true">${content}</body></html>`;
}

function EditorTool({ label, title, command, run }: { label: string; title: string; command: string; run: (command: string, value?: string) => void }) {
  return <button type="button" title={title} aria-label={title} onMouseDown={(event) => event.preventDefault()} onClick={() => run(command, command === "formatBlock" ? label : undefined)} className="btn-ghost h-9 min-w-9 rounded-md px-2.5 py-1.5 text-sm">{label}</button>;
}

export function ContractTemplateHtmlEditor({ version }: { version: ContractTemplateVersion }) {
  const [state, action] = useFormState<FormState, FormData>(saveHtmlContractTemplateAction, {});
  const initial = splitStyles(version.htmlContent ?? "");
  const [content, setContent] = useState(initial.content);
  const [styles, setStyles] = useState(version.htmlStyles ?? initial.styles);
  const [mode, setMode] = useState<"visual" | "code">("visual");
  const [editorDocument, setEditorDocument] = useState(() => buildEditorDocument(initial.content, version.htmlStyles ?? initial.styles));
  const [showMarkers, setShowMarkers] = useState(false);
  const [headerLogoLeft, setHeaderLogoLeft] = useState(version.headerLogoLeft ?? "");
  const [headerLogoRight, setHeaderLogoRight] = useState(version.headerLogoRight ?? "");
  const [logoError, setLogoError] = useState("");
  const editorRef = useRef<HTMLIFrameElement>(null);
  const leftLogoInputRef = useRef<HTMLInputElement>(null);
  const rightLogoInputRef = useRef<HTMLInputElement>(null);
  const savedSelection = useRef<Range | null>(null);

  function loadHeaderLogo(file: File | undefined, side: "left" | "right") {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setLogoError("Usa una imagen PNG, JPG o WebP.");
      return;
    }
    if (file.size > 300 * 1024) {
      setLogoError("Cada imagen debe pesar máximo 300 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl.startsWith(`data:${file.type};base64,`)) {
        setLogoError("No se pudo leer la imagen. Vuelve a seleccionarla.");
        return;
      }
      setLogoError("");
      if (side === "left") setHeaderLogoLeft(dataUrl);
      else setHeaderLogoRight(dataUrl);
    };
    reader.onerror = () => setLogoError("No se pudo leer la imagen. Vuelve a seleccionarla.");
    reader.readAsDataURL(file);
  }

  function syncVisual() {
    const doc = editorRef.current?.contentDocument;
    if (doc) setContent(doc.body.innerHTML);
  }

  function runCommand(command: string, value?: string) {
    const doc = editorRef.current?.contentDocument;
    if (!doc) return;
    if (savedSelection.current) {
      const selection = doc.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelection.current);
      savedSelection.current = null;
    }
    if (command === "insertPageBreak") doc.execCommand("insertHTML", false, '<div class="page-break">Salto de página</div>');
    else if (command === "createLink") {
      const url = window.prompt("Ingresa la dirección del enlace (https://…)");
      if (url) doc.execCommand(command, false, url);
    } else doc.execCommand(command, false, value);
    setContent(doc.body.innerHTML);
  }

  function clearDocument() {
    setContent("");
    setStyles("");
    setEditorDocument(buildEditorDocument("", ""));
  }

  const markerGroups = [
    { title: "Propietarios", tags: ["{{owner1.fullName}}", "{{owner1.identityNumber}}", "{{owner1.identityIssuedIn}}", "{{owner1.address}}", "{{owner1.whatsapp}}", "{{#owners}}…{{/owners}}", "{{separator}}"] },
    { title: "Inmueble y contrato", tags: ["{{property.address}}", "{{property.registry}}", "{{contract.amount}}", "{{contract.amountInWords}}", "{{contract.currency}}", "{{contract.date}}", "{{contract.validityNumeric}}", "{{contract.validityUnit}}", "{{contract.validityInWords}}", "{{contract.expirationDate}}"] },
    { title: "Asesor", tags: ["{{advisor.fullName}}", "{{advisor.mobile}}", "{{advisor.email}}"] },
  ];

  return <details className="overflow-hidden rounded-xl border border-gold-200 bg-white dark:border-carbon-700 dark:bg-carbon-900">
    <summary className="cursor-pointer px-4 py-4 text-sm font-semibold text-ink dark:text-white">Editor HTML · crear una nueva versión</summary>
    <form action={action} className="space-y-5 border-t border-stone-200 p-4 dark:border-carbon-800 sm:p-6">
      <input type="hidden" name="tipo" value={version.tipo} />
      <input type="hidden" name="versionOrigen" value={version.id} />
      <input type="hidden" name="htmlStyles" value={styles} />
      <input type="hidden" name="headerLogoLeft" value={headerLogoLeft} />
      <input type="hidden" name="headerLogoRight" value={headerLogoRight} />

      <section className="rounded-xl border border-stone-200 p-4 dark:border-carbon-700">
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-white">Logos del encabezado impreso</h3>
          <p className="mt-1 text-xs leading-5 text-ink-mute dark:text-carbon-400">Se repiten en la parte superior de cada página y se guardan en esta versión de la plantilla. PNG, JPG o WebP; máximo 300 KB por imagen.</p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["left", "right"] as const).map((side) => {
            const value = side === "left" ? headerLogoLeft : headerLogoRight;
            const inputRef = side === "left" ? leftLogoInputRef : rightLogoInputRef;
            const label = side === "left" ? "Logotipo izquierdo" : "Emblema derecho";
            return <div key={side} className="rounded-lg border border-stone-200 p-3 dark:border-carbon-700">
              <p className="mb-2 text-xs font-medium text-ink-soft dark:text-carbon-200">{label}</p>
              {value ? <div className="flex min-h-20 items-center justify-between gap-3 rounded-md bg-stone-50 p-3 dark:bg-carbon-950">
                <Image src={value} alt={`Vista previa: ${label}`} width={240} height={60} unoptimized className="max-h-14 max-w-[75%] object-contain" />
                <button type="button" onClick={() => { side === "left" ? setHeaderLogoLeft("") : setHeaderLogoRight(""); if (inputRef.current) inputRef.current.value = ""; }} className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs">Quitar</button>
              </div> : <p className="rounded-md bg-stone-50 px-3 py-4 text-xs text-ink-mute dark:bg-carbon-950 dark:text-carbon-400">No hay imagen seleccionada.</p>}
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Cargar ${label}`} onChange={(event) => loadHeaderLogo(event.target.files?.[0], side)} className="input mt-3 text-xs" />
            </div>;
          })}
        </div>
        {logoError && <p role="alert" className="mt-3 text-xs text-red-700 dark:text-red-300">{logoError}</p>}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4 dark:bg-carbon-950">
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-white">Contenido del contrato</h3>
          <p className="mt-1 text-sm text-ink-mute dark:text-carbon-400">Pega el texto del contrato en Visual para conservar formato, o cambia a Código para ajustar HTML y marcadores.</p>
          <p className="mt-2 max-w-4xl text-xs leading-5 text-ink-mute dark:text-carbon-400">Para que la última hoja no quede solo con firmas, en Código agrupa la última cláusula, la fecha y las firmas dentro de <code className="rounded bg-stone-200 px-1 dark:bg-carbon-800">&lt;section class=&quot;c21-contract-closing&quot;&gt;...&lt;/section&gt;</code>. Conserva el texto legal actual; el estilo de impresión mantiene ese bloque unido si cabe en una página.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={clearDocument} className="btn-ghost text-xs">Vaciar editor</button>
          <button type="button" onClick={() => setShowMarkers((visible) => !visible)} className="btn-ghost text-xs">{showMarkers ? "Ocultar marcadores" : "Ver marcadores"}</button>
        </div>
      </div>

      {showMarkers && <div className="grid gap-3 rounded-xl border border-stone-200 p-4 dark:border-carbon-700 md:grid-cols-3">
        {markerGroups.map((group) => <div key={group.title}>
          <p className="mb-2 text-xs font-semibold text-ink dark:text-white">{group.title}</p>
          <div className="flex flex-wrap gap-1.5">{group.tags.map((tag) => <code key={tag} className="rounded bg-stone-100 px-2 py-1 text-[11px] text-ink-soft dark:bg-carbon-800 dark:text-carbon-200">{tag}</code>)}</div>
        </div>)}
      </div>}

      <section className="overflow-hidden rounded-xl border border-stone-200 dark:border-carbon-700">
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 pt-3 dark:border-carbon-700 dark:bg-carbon-950">
          <div className="flex gap-1" role="tablist" aria-label="Modo del editor HTML">
            <button type="button" role="tab" aria-selected={mode === "visual"} onClick={() => { setEditorDocument(buildEditorDocument(content, styles)); setMode("visual"); }} className={`rounded-t-md border-b-2 px-4 py-2.5 text-sm font-semibold transition ${mode === "visual" ? "border-gold-700 bg-[#BEAF87] text-[#252526]" : "border-transparent bg-gold-100 text-ink-soft hover:bg-[#d2c08f] dark:bg-carbon-800 dark:text-carbon-200 dark:hover:bg-[#d2c08f]"}`}>Visual</button>
            <button type="button" role="tab" aria-selected={mode === "code"} onClick={() => { syncVisual(); setMode("code"); }} className={`rounded-t-md border-b-2 px-4 py-2.5 text-sm font-semibold transition ${mode === "code" ? "border-gold-700 bg-[#BEAF87] text-[#252526]" : "border-transparent bg-gold-100 text-ink-soft hover:bg-[#d2c08f] dark:bg-carbon-800 dark:text-carbon-200 dark:hover:bg-[#d2c08f]"}`}>Código</button>
          </div>
          <span className="pb-2 text-xs text-ink-mute dark:text-carbon-400">Editor de contrato</span>
        </div>

        {mode === "visual" ? <>
          <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-white p-2 dark:border-carbon-700 dark:bg-carbon-900">
            <select aria-label="Formato de párrafo" defaultValue="P" onChange={(event) => runCommand("formatBlock", event.target.value)} className="input h-9 w-40 py-1.5 text-xs">
              <option value="P">Párrafo</option><option value="H1">Título 1</option><option value="H2">Título 2</option><option value="H3">Título 3</option>
            </select>
            <span className="mx-1 h-6 border-l border-stone-300 dark:border-carbon-700" />
            <EditorTool label="B" title="Negrita" command="bold" run={runCommand} />
            <EditorTool label="I" title="Cursiva" command="italic" run={runCommand} />
            <EditorTool label="U" title="Subrayado" command="underline" run={runCommand} />
            <EditorTool label="•" title="Lista con viñetas" command="insertUnorderedList" run={runCommand} />
            <EditorTool label="1." title="Lista numerada" command="insertOrderedList" run={runCommand} />
            <EditorTool label="❝" title="Cita" command="formatBlock" run={(cmd) => runCommand(cmd, "BLOCKQUOTE")} />
            <span className="mx-1 h-6 border-l border-stone-300 dark:border-carbon-700" />
            <EditorTool label="↤" title="Alinear a la izquierda" command="justifyLeft" run={runCommand} />
            <EditorTool label="↔" title="Centrar" command="justifyCenter" run={runCommand} />
            <EditorTool label="↦" title="Alinear a la derecha" command="justifyRight" run={runCommand} />
            <EditorTool label="↗" title="Insertar enlace" command="createLink" run={runCommand} />
            <EditorTool label="↵" title="Insertar salto de página" command="insertPageBreak" run={runCommand} />
          </div>
          <iframe ref={editorRef} srcDoc={editorDocument} title={`Editor visual de ${version.fileName}`} onBlur={() => { const selection = editorRef.current?.contentDocument?.getSelection(); if (selection?.rangeCount) savedSelection.current = selection.getRangeAt(0).cloneRange(); }} onLoad={(event) => { const doc = event.currentTarget.contentDocument; if (doc) { doc.body.setAttribute("contenteditable", "true"); doc.body.addEventListener("input", syncVisual); } }} className="h-[72vh] min-h-[700px] w-full bg-white" />
          <textarea name="htmlContent" value={content} readOnly className="sr-only" aria-label="Contenido HTML del contrato" />
        </> : <textarea name="htmlContent" value={content} onChange={(event) => setContent(event.target.value)} rows={32} maxLength={1_500_000} className="input min-h-[72vh] resize-y rounded-none border-0 bg-neutral-950 font-mono text-xs leading-5 text-emerald-100 focus:ring-0 dark:bg-neutral-950" placeholder="Pega o edita aquí el HTML del contrato. Conserva los marcadores entre llaves dobles." required />}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-xs leading-5 text-ink-mute dark:text-carbon-400">El documento se guardará como borrador HTML. Revisa los marcadores antes de activar la versión. La plantilla activa no cambia hasta que Legal o Administración la active.</p>
        <SubmitButton>Guardar nueva versión HTML como borrador</SubmitButton>
      </div>
      {state.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{state.ok}</p>}
    </form>
  </details>;
}
