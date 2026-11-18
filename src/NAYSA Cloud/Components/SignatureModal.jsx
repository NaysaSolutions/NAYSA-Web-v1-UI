import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignature, faUpload, faPen, faRotateLeft, faEraser, faTrashCan, faXmark, faCheck, faImage } from "@fortawesome/free-solid-svg-icons";

export default function SignatureModal({ initialImage = null, busy = false, onClose, onUse }) {
  const canvas = useRef(null);
  const strokes = useRef([]);
  const current = useRef(null);
  const fileInput = useRef(null);
  const actionClass = "inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-[10px] sm:text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";
  const secondaryClass = `${actionClass} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`;
  const [tab, setTab] = useState("upload");
  const [image, setImage] = useState(initialImage || "");
  const [error, setError] = useState("");
  const redraw = () => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 800, 240); ctx.strokeStyle = "#111827"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    strokes.current.forEach((points) => {
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      if (points.length === 1) ctx.lineTo(points[0].x + 0.1, points[0].y + 0.1);
      ctx.stroke();
    });
  };
  useEffect(() => { if (tab === "draw") redraw(); }, [tab]);
  const point = (e) => { const r = canvas.current.getBoundingClientRect(); return { x: (e.clientX - r.left) * 800 / r.width, y: (e.clientY - r.top) * 240 / r.height }; };
  const upload = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 1048576) { setError("Choose a PNG or JPG image under 1 MB."); return; }
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const output = document.createElement("canvas"); const scale = Math.min(1, 1000 / img.width, 400 / img.height);
      output.width = Math.round(img.width * scale); output.height = Math.round(img.height * scale);
      output.getContext("2d").drawImage(img, 0, 0, output.width, output.height);
      setImage(output.toDataURL("image/png")); setError(""); URL.revokeObjectURL(url);
    };
    img.onerror = () => { setError("Unable to read this image."); URL.revokeObjectURL(url); };
    img.src = url;
  };
  const useSignature = () => {
    if (busy) return;
    if (tab === "upload") { if (!image) return setError("Choose a signature image first."); onUse(image); }
    else { if (!strokes.current.length) return setError("Draw your signature first."); onUse(canvas.current.toDataURL("image/png")); }
  };
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="2307 Signatory Signature">
    <div aria-busy={busy} className={`w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white text-[10px] font-medium sm:text-xs shadow-2xl ${busy ? "pointer-events-none opacity-70" : ""}`} inert={busy ? "" : undefined}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-5 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><FontAwesomeIcon icon={faSignature} /></span><div><h2 className="text-sm font-semibold text-blue-800">2307 Signatory Signature</h2><p className="mt-0.5 text-xs text-slate-500">Upload an image or draw your signature.</p></div></div><button type="button" onClick={onClose} aria-label="Close signature" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-600"><FontAwesomeIcon icon={faXmark} /></button></div>
      <div className="p-5"><div role="tablist" aria-label="Signature method" className="mb-4 flex w-fit gap-1 rounded-lg bg-slate-100 p-1">{["upload", "draw"].map((v) => <button type="button" role="tab" aria-selected={tab === v} key={v} onClick={() => { setTab(v); setError(""); }} className={`${actionClass} min-w-[145px] ${tab === v ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}><FontAwesomeIcon icon={v === "upload" ? faUpload : faPen} />{v === "upload" ? "Upload Image" : "Draw Signature"}</button>)}</div>
        {tab === "upload" ? <div><input ref={fileInput} className="hidden" type="file" accept="image/png,image/jpeg" onChange={upload} aria-label="Choose signature image" /><div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50/50 px-5">{image ? <img src={image} alt="Signature preview" className="max-h-32 max-w-full object-contain" /> : <div className="text-center"><FontAwesomeIcon icon={faImage} className="mb-2 text-2xl text-slate-300" /><p className="text-xs text-slate-400">Your signature preview appears here</p></div>}</div><div className="mt-3 flex items-center justify-between gap-3"><button type="button" onClick={() => fileInput.current?.click()} className={`${secondaryClass} min-w-[125px]`}><FontAwesomeIcon icon={faUpload} />{image ? "Replace Image" : "Choose Image"}</button><p className="text-right text-[11px] leading-4 text-slate-400">PNG or JPG · Under 1 MB<br />Transparent PNG recommended</p></div></div> : <div><canvas ref={canvas} width={800} height={240} className="w-full rounded-lg border border-slate-200 bg-slate-50/50" style={{ touchAction: "none" }} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); current.current = [point(e)]; strokes.current.push(current.current); redraw(); }} onPointerMove={(e) => { if (current.current) { current.current.push(point(e)); redraw(); } }} onPointerUp={() => { current.current = null; }} onPointerCancel={() => { current.current = null; }} /><div className="mt-3 flex items-center gap-2"><button type="button" onClick={() => { strokes.current.pop(); redraw(); }} className={`${secondaryClass} min-w-[85px]`}><FontAwesomeIcon icon={faRotateLeft} />Undo</button><button type="button" onClick={() => { strokes.current = []; redraw(); }} className={`${secondaryClass} min-w-[85px]`}><FontAwesomeIcon icon={faEraser} />Clear</button><p className="ml-auto text-right text-[11px] text-slate-400">Use your mouse or touchscreen.</p></div></div>}
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      </div><div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{initialImage && <button type="button" onClick={() => onUse(null)} className={`${secondaryClass} mr-auto`}><FontAwesomeIcon icon={faTrashCan} />Remove</button>}<button type="button" onClick={onClose} className={`${secondaryClass} min-w-[90px]`}><FontAwesomeIcon icon={faXmark} />Cancel</button><button type="button" onClick={useSignature} className={`${actionClass} min-w-[140px] bg-blue-600 text-white hover:bg-blue-700`}><FontAwesomeIcon icon={faCheck} />Use Signature</button></div>
    </div>
  </div>;
}
