import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postPdfRequest } from "@/NAYSA Cloud/Configuration/BaseURL";
import { useTopDocControlRow } from "@/NAYSA Cloud/Global/top1RefTable";

/**
 * Open the common PDF Viewer in _blank or _self.
 * No blob URLs are passed across tabs. The viewer will fetch the PDF itself.
 */
export async function openPdfViewer({ documentID, docType, target = "_blank" }) {
  const base = (import.meta?.env?.BASE_URL ?? "/").replace(/\/?$/, "/");
  const q = new URLSearchParams({
    docId: String(documentID ?? ""),
    docType: String(docType ?? ""),
    t: String(Date.now()), // bust caching
  }).toString();

  const viewerPath = `${base}pdf-viewer?${q}`;
  if (target === "_blank") window.open(viewerPath, "_blank", "noopener,noreferrer");
  else window.location.assign(viewerPath);
}

/** Route component: /pdf-viewer */
export default function PdfViewer() {
  const navigate = useNavigate?.() || null;
  const [src, setSrc] = useState(null);
  const [meta, setMeta] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  // Fetch the PDF in THIS tab using the query params
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        const documentID = qs.get("docId");
        const docType = qs.get("docType");

        if (!documentID || !docType) {
          setError("Missing docId or docType.");
          return;
        }

        // Resolve form name
        const { formName } = (await useTopDocControlRow(docType)) || {};
        if (!formName) {
          setError("Report Name not defined.");
          return;
        }

        // Fetch PDF
        const payload = { tranId: documentID, formName };
        const blob = await postPdfRequest("/printForm", payload);

        // Accept PDFs even if type is empty/octet-stream by sniffing magic header
        if (!(await blobLooksLikePdf(blob))) {
          const text = await safeReadAsText(blob);
          setError(text || "Unexpected non-PDF response from server.");
          return;
        }

        // Create Object URL IN THIS TAB
        const url = URL.createObjectURL(blob);
        if (!alive) return;

        setSrc(url);
        setMeta({ documentID, docType, formName, createdAt: Date.now() });
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load PDF.");
      }
    })();

    return () => {
      alive = false;
      try {
        if (src) URL.revokeObjectURL(src);
      } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const iframeSrc = useMemo(() => {
    if (!src) return null;
    // Add `#toolbar=0` to hide the built-in PDF.js viewer toolbar.
    // This is the most common and reliable method.
    return `data:application/pdf;base64,${src}#toolbar=0&zoom=${zoom}`;
  }, [src, zoom]);

  const handlePrint = () => {  
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      console.log("Omg!!!")
    } catch (e) {
      console.error("Print failed:", e);
      if (src) window.open(src, "_blank");
    }
  };

  const handleDownload = () => {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `${meta?.formName || "document"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleClose = () => {
    if (navigate) navigate(-1);
    else window.history.back();
  };

  // Error or missing PDF state
  if (error || !iframeSrc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-neutral-950 text-neutral-100">
        <div className="text-left max-w-2xl w-full">
          <h1 className="text-xl font-semibold mb-2">
            {error ? "Print Error" : "Loading PDF..."}
          </h1>
          {error ? (
            <pre className="text-sm whitespace-pre-wrap opacity-90 bg-neutral-900 p-3 rounded-xl overflow-auto">
              {error}
            </pre>
          ) : (
            <p className="opacity-80">Please wait…</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700"
        >
          Go back
        </button>
      </div>
    );
  }

  // Normal viewer UI
  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-950 text-neutral-100">
      {/* This div is your custom header. By making it `sticky`, we ensure it stays
        at the top, and by giving it a high `z-index`, we ensure it's on top of
        the iframe content. The `bg-neutral-950/90` and `backdrop-blur` are important
        for making sure the header is opaque.
      */}
      <div className="flex items-center gap-2 p-3 border-b border-neutral-800 sticky top-0 bg-neutral-950/90 backdrop-blur z-20">
        <button
          onClick={handleClose}
          className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
          title="Close"
        >
          ← Close
        </button>

        <div className="mx-2 text-sm opacity-90 truncate">
          {meta?.formName || "PDF"}
          {meta?.documentID ? ` • #${meta.documentID}` : ""}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-900 rounded-xl p-1">
            <button
              onClick={() => setZoom((z) => Math.max(25, z - 10))}
              className="px-2 py-1 rounded-lg hover:bg-neutral-800"
              title="Zoom out"
            >
              −
            </button>
            <span className="min-w-[3.5rem] text-center text-sm select-none">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(400, z + 10))}
              className="px-2 py-1 rounded-lg hover:bg-neutral-800"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => setZoom(100)}
              className="px-2 py-1 rounded-lg hover:bg-neutral-800"
              title="Reset zoom"
            >
              100%
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
            title="Print"
          >
            Print
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
            title="Download"
          >
            Download
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700"
            title="Open in new tab"
          >
            New tab
          </a>
        </div>
      </div>

      {/* This is the main content area. `flex-1` makes it grow to fill
        the remaining vertical space. `overflow-auto` adds scrollbars
        when the PDF content is larger than the viewport.
      */}
      <div className="flex-1 overflow-auto"
           onContextMenu={(e) => e.preventDefault()} >
        <iframe
          ref={iframeRef}
          title="PDF Viewer"
          src={iframeSrc}
          className="w-full h-full"
          style={{
            border: "none",
          }}
        />
      </div>
    </div>
  );
}

/* ------------------ helpers ------------------ */
async function blobLooksLikePdf(blob) {
  if (!(blob instanceof Blob)) return false;
  try {
    const head = await blob.slice(0, 5).text();
    return head === "%PDF-";
  } catch {
    return false;
  }
}
async function safeReadAsText(blob) {
  try {
    return await blob.text();
  } catch {
    return "";
  }
}