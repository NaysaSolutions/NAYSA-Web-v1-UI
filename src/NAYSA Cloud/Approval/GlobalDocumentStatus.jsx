import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Check, CheckCircle2, Clock3, FileText, Files, History, Info, Printer, Send, User, X, XCircle } from "lucide-react";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient, getTenant } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const formatDateTime = (value) => {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]} ${match[4]}` : value || "—";
};

const TONES = {
  blue: {tile: "bg-blue-50 text-blue-600", border: "border-blue-100", solid: "bg-blue-600 text-white", accent: "border-l-blue-500", badge: "border-blue-200 bg-blue-50 text-blue-700", line: "bg-blue-200"},
  violet: {tile: "bg-violet-50 text-violet-600", border: "border-violet-100", solid: "bg-violet-600 text-white", accent: "border-l-violet-500", badge: "border-violet-200 bg-violet-50 text-violet-700", line: "bg-violet-200"},
  emerald: {tile: "bg-emerald-50 text-emerald-600", border: "border-emerald-100", solid: "bg-emerald-500 text-white", accent: "border-l-emerald-500", badge: "border-emerald-200 bg-emerald-50 text-emerald-700", line: "bg-emerald-200"},
  red: {tile: "bg-red-50 text-red-600", border: "border-red-100", solid: "bg-red-500 text-white", accent: "border-l-red-500", badge: "border-red-200 bg-red-50 text-red-700", line: "bg-slate-200"},
  amber: {tile: "bg-amber-50 text-amber-600", border: "border-amber-100", solid: "bg-amber-500 text-white", accent: "border-l-amber-400", badge: "border-amber-200 bg-amber-50 text-amber-700", line: "bg-amber-200"},
};

const SummaryCard = ({icon: Icon, label, tone, children}) => (
  <div className="min-w-0 px-3 py-3">
    <div className="mb-1.5 flex items-center gap-1.5">
      <Icon size={13} className={`shrink-0 ${tone.tile.split(" ").find((value) => value.startsWith("text-"))}`} />
      <span className="truncate text-[10px] font-medium text-slate-500" title={label}>{label}</span>
    </div>
    <div className="min-w-0 break-words text-[12px] font-semibold leading-5 text-slate-800">{children}</div>
  </div>
);

const activityStyle = (activity) => {
  if (/cancel|void|delete/i.test(activity)) return {tone: TONES.red, Icon: XCircle};
  if (/print/i.test(activity)) return {tone: TONES.violet, Icon: Printer};
  if (/post|final|generat|award/i.test(activity)) return {tone: TONES.emerald, Icon: Check};
  if (/submit|notif|send|sent|email/i.test(activity)) return {tone: TONES.amber, Icon: Send};
  return {tone: TONES.blue, Icon: FileText};
};

export default function GlobalDocumentStatus({
  isOpen, onClose, docType, tranId, docNo, docDate, status, branchCode, closeOnBackdrop = false,
}) {
  const dialogRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const tenant = getTenant();
  const requestKey = JSON.stringify([tenant, docType, tranId, branchCode, reload]);
  const [loadedKey, setLoadedKey] = useState("");
  const busy = loading || loadedKey !== requestKey;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !busy && dialog && !dialog.open) dialog.showModal();
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen, busy]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) { setLoadedKey(""); return; }
    const abort = new AbortController();
    let active = true;
    setRows([]);
    setError("");
    setLoading(true);
    setLoadedKey("");
    const load = async () => {
      try {
        if (!tranId || !docType) throw new Error("Save or retrieve a transaction before viewing its audit trail.");
        const { data } = await apiClient.post("/getDocTrail", {
          PARAMS: JSON.stringify({tranId, docCode: docType, branchCode}),
        }, {signal: abort.signal});
        if (data?.success !== true || !Array.isArray(data.data)) throw new Error(data?.message || "Unable to load the document audit trail.");
        const result = data.data[0]?.result;
        const activities = typeof result === "string" ? JSON.parse(result) : result;
        if (!Array.isArray(activities)) throw new Error("The audit trail response is invalid.");
        if (active) setRows(activities);
      } catch (failure) {
        if (active && !abort.signal.aborted) setError(failure.response?.data?.message || failure.message || "Unable to load the audit trail.");
      } finally {
        if (active) { setLoading(false); setLoadedKey(requestKey); }
      }
    };
    load();
    return () => { active = false; abort.abort(); };
  }, [isOpen, docType, tranId, branchCode, requestKey, reload]);

  if (!isOpen) return null;
  if (busy) return createPortal(<LoadingSpinner />, document.body);
  const statusTone = activityStyle(status || "").tone;
  return createPortal(
    <dialog ref={dialogRef} onCancel={(event) => {event.preventDefault(); onClose?.();}}
      onClick={(event) => {if (closeOnBackdrop && event.target === dialogRef.current) onClose?.();}}
      aria-labelledby="global-document-status-title"
      className="m-auto w-[calc(100vw-16px)] max-w-[800px] overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-800 shadow-xl backdrop:bg-slate-900/40 md:rounded-2xl">
      <section className="flex max-h-[92dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 py-0.5 md:py-1">
          <h2 id="global-document-status-title" className="global-lookup-headertext-ui truncate pl-3 !text-[15px] md:pl-4 md:!text-[18px]">{docType} Document Status</h2>
          <button type="button" autoFocus onClick={onClose} aria-label="Close document status" title="Close (Esc)" className="mr-1 rounded-md p-1.5 text-slate-400 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-blue-500/40 md:mr-2 md:p-2"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3 md:p-4" aria-busy={busy}>
          <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid min-w-[620px] grid-cols-5 divide-x divide-slate-100">
            <SummaryCard icon={FileText} label="Document No." tone={TONES.blue}>{docNo || "—"}</SummaryCard>
            <SummaryCard icon={Files} label="Document Code" tone={TONES.violet}>{docType || "—"}</SummaryCard>
            <SummaryCard icon={CalendarDays} label="Document Date" tone={TONES.blue}>{docDate || "—"}</SummaryCard>
            <SummaryCard icon={CheckCircle2} label="Current Status" tone={statusTone}><span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone.badge}`}>{status || "—"}</span></SummaryCard>
            <SummaryCard icon={History} label="Activities" tone={TONES.emerald}>{busy ? "Loading..." : error ? "Unavailable" : `${rows.length} activities`}</SummaryCard>
          </div>
          </div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700"><History size={16} />Activity History</h3>
            <span className="text-xs text-slate-500">{busy ? "Loading..." : `${rows.length} activities`}</span>
          </div>
          {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" onClick={() => setReload((value) => value + 1)} className="ml-3 underline">Retry</button></div>
            : !rows.length ? <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">No document activities recorded.</div>
            : <ol className="space-y-3">
              {rows.map((row, index) => {
                const {tone, Icon} = activityStyle(row.activity || "");
                return <li key={row.trailId} className="relative flex gap-3">
                  {index < rows.length - 1 && <span className={`absolute -bottom-3 left-[15px] top-8 w-0.5 sm:left-[17px] sm:top-9 ${tone.line}`} aria-hidden="true" />}
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm sm:h-9 sm:w-9 ${tone.solid}`}><Icon size={17} strokeWidth={2.4} /></span>
                  <article className={`min-w-0 flex-1 rounded-lg border border-l-4 border-slate-200 bg-white px-3 py-2.5 ${tone.accent}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Activity {String(index + 1).padStart(2, "0")}</p><h4 className="text-[12px] font-bold leading-5 text-slate-900">{row.activity || "Document activity"}</h4></div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}><CheckCircle2 size={11} />Recorded</span>
                    </div>
                    <div className="mt-2 grid gap-2.5 border-t border-slate-100 pt-2 sm:grid-cols-2">
                      <div><p className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400"><User size={11} />Action By</p><p className="text-xs font-semibold text-slate-700">{row.userName || row.userCode || "—"}</p></div>
                      <div><p className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400"><Clock3 size={11} />Date / Time</p><p className="text-xs font-medium tabular-nums text-slate-700">{formatDateTime(row.dateStamp)}</p></div>
                    </div>
                    {row.remarks && <details className="mt-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2"><summary className="cursor-pointer text-xs font-normal text-blue-600">View Details</summary><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{row.remarks}</p></details>}
                  </article>
                </li>;
              })}
            </ol>}
        </div>
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 md:px-4">
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Info size={13} className="shrink-0 text-slate-400" />Chronological document activities. Approval actions are shown separately.</p>
          <button type="button" onClick={onClose} title="Close (Esc)" className="group inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-400 hover:bg-slate-50 hover:shadow focus-visible:ring-2 focus-visible:ring-blue-500/30"><XCircle size={14} className="text-slate-400 group-hover:text-red-500" />Close<kbd className="ml-0.5 hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-px font-sans text-[10px] font-semibold leading-4 text-slate-400 sm:inline-block">Esc</kbd></button>
        </footer>
      </section>
    </dialog>, document.body,
  );
}
