import React, { useEffect, useState, useRef } from "react";
import { fetchData, postRequest, apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useSwalErrorAlert, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines, faSave, faXmark, faEnvelope, faPaperPlane, faCheckCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";

const money = (v) => Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (v) => v ? new Date(`${String(v).slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const sum = (rows, key) => rows.reduce((n, r) => n + Number(r[key] || 0), 0);
const PAPER_SIZES = {
  long: { label: "Long / Folio", shortLabel: "Long", width: "8.5in", height: "13in", rows: 26 },
  a4: { label: "A4", shortLabel: "A4", width: "210mm", height: "297mm", rows: 20 },
  short: { label: "Short / Letter", shortLabel: "Short", width: "8.5in", height: "11in", rows: 18 },
};

export default function ARStatementOfAccount() {
  const { user, currentUserRow } = useAuth();
  const preparedBy = currentUserRow?.userName || user?.USER_NAME || "";
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState("100");
  const [paperSize, setPaperSize] = useState("a4");
  const paper = PAPER_SIZES[paperSize];
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [selected, setSelected] = useState("");
  const [savingTerms, setSavingTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [draftTerms, setDraftTerms] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [emailTab, setEmailTab] = useState("body");
  const [emailRows, setEmailRows] = useState([]);
  const [emailBody, setEmailBody] = useState("Dear Customer,\n\nPlease find attached your Statement of Account as of {asOfDate}. Kindly review your outstanding balance and contact our Accounting Department for any questions or discrepancies.\n\nThank you.\n{companyName}");
  const [emailSubject, setEmailSubject] = useState("Statement of Account as of {asOfDate}");
  const [emailSending, setEmailSending] = useState(false);
  const emailSendingRef = useRef(false);
  const previewRef = useRef(null);
  const openEmail = () => {
    setEmailRows((previous) => reports.map((report) => previous.find((row) => row.custCode === report.custCode) || ({ ...report, email: report.custEmail || "", checked: false, status: "Ready", message: "" })));
    setShowEmail(true);
    setEmailTab("body");
  };
  const sendStatements = async () => {
    if (emailSendingRef.current) return;
    const recipients = emailRows.filter((row) => row.checked && row.status === "Ready");
    if (!recipients.length || !emailBody.trim() || !emailSubject.trim()) {
      useSwalErrorAlert("Email Statement", "Select customers and enter a subject and message."); return;
    }
    if (recipients.some((row) => !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(row.email.trim()))) {
      useSwalErrorAlert("Email Statement", "Enter one valid email address for each selected customer."); return;
    }
    setEmailTab("customers");
    emailSendingRef.current = true; setEmailSending(true);
    const progress = (code, status, message = "") => setEmailRows((rows) => rows.map((row) => row.custCode === code ? { ...row, status, message } : row));
    try {
      await document.fonts.ready;
      for (const row of recipients) {
        let host;
        let submitted = false;
        try {
          progress(row.custCode, "Creating PDF");
          const articles = [...previewRef.current.querySelectorAll("article[data-soa-customer]")].filter((node) => node.dataset.soaCustomer === row.custCode);
          if (!articles.length) throw new Error("No statement pages available for this customer.");
          const size = paperSize === "long" ? [215.9, 330.2] : paperSize === "short" ? [215.9, 279.4] : [210, 297];
          const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: size, compress: true });
          host = document.createElement("div");
          host.className = "soa-preview";
          host.style.cssText = `position:absolute;left:-20000px;top:0;padding:0;--soa-paper-width:${paper.width};--soa-paper-height:${paper.height};`;
          document.body.appendChild(host);
          for (let i = 0; i < articles.length; i++) {
            const clone = articles[i].cloneNode(true);
            clone.hidden = false; clone.style.display = "flex"; clone.style.zoom = "1"; clone.style.margin = "0"; clone.style.boxShadow = "none";
            host.replaceChildren(clone);
            const canvas = await html2canvas(clone, { scale: 1.5, backgroundColor: "#ffffff", logging: false });
            if (i) pdf.addPage(size, "portrait");
            pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, size[0], size[1]);
          }
          const blob = pdf.output("blob");
          if (blob.size > 20 * 1024 * 1024) throw new Error("Statement PDF exceeds the 20 MB email attachment limit.");
          const personalize = (text) => text.replaceAll("{customerName}", row.custName || "Customer").replaceAll("{asOfDate}", date(row.asOfDate)).replaceAll("{companyName}", row.company?.companyName || "Accounting Department");
          const payload = new FormData();
          payload.append("custCode", row.custCode); payload.append("to", row.email.trim());
          payload.append("subject", personalize(emailSubject)); payload.append("body", personalize(emailBody));
          payload.append("attachment", blob, "Statement-of-Account.pdf");
          progress(row.custCode, "Sending"); submitted = true;
          // Match Bank Recon uploads; otherwise the shared client defaults to JSON
          // and Laravel receives no uploaded PDF.
          const { data } = await apiClient.post("/emailARStatementOfAccount", payload, {
            timeout: 120000,
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (!data?.success) throw new Error(data?.message || "Unable to confirm sending.");
          progress(row.custCode, "Sent", "Accepted by the mail server.");
        } catch (err) {
          const definitive = err?.response?.status >= 400 && err?.response?.status < 500;
          progress(row.custCode, submitted && !definitive ? "Check sending" : "Failed", err?.response?.data?.message || err.message);
        } finally { host?.remove(); }
      }
    } finally { emailSendingRef.current = false; setEmailSending(false); }
  };
  const saveTerms = async () => {
    if (savingTerms) return;
    setSavingTerms(true);
    try {
      const result = await postRequest("updateSOATerms", { terms: draftTerms });
      if (!result?.success) throw new Error(result?.message || "Unable to save statement terms.");
      setPaymentInstructions(draftTerms);
      setShowTerms(false);
      useSwalSuccessAlert("Statement of Account", "Terms saved successfully.");
    } catch (err) {
      useSwalErrorAlert("Statement of Account", err?.response?.data?.message || err.message);
    } finally { setSavingTerms(false); }
  };
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(window.location.search);
    const filters = Object.fromEntries(["branchCode", "custCode", "refDate", "acctCode"].map((key) => [key, query.get(key) || ""]));
    fetchData("getARStatementOfAccount", { json_data: { json_data: filters } })
      .then((response) => {
        const raw = response?.data?.[0]?.result;
        const data = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!Array.isArray(data)) throw new Error("Invalid statement response. Please reload the preview.");
        if (active) { setReports(data); setPaymentInstructions(data[0]?.company?.soaTerms || ""); }
      })
      .catch((err) => { if (active) setError(err?.response?.data?.message || err.message || "Unable to load statements."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const allPages = reports.flatMap((report) =>
    [...new Set(report.details.map((r) => r.currCode))].flatMap((currency) => {
      const rows = report.details.filter((r) => r.currCode === currency);
      const count = Math.ceil(rows.length / paper.rows);
      return Array.from({ length: count }, (_, index) => ({ report, currency, rows, visible: rows.slice(index * paper.rows, (index + 1) * paper.rows), index, count }));
    }));
  const pages = allPages.filter(({report}) => !selected || report.custCode === selected);
  const emailSelected = emailRows.filter((row) => row.checked);
  const emailCompleted = emailSelected.filter((row) => ["Sent", "Failed", "Check sending"].includes(row.status)).length;
  return <div ref={previewRef} className="soa-preview" style={{ "--soa-paper-width": paper.width, "--soa-paper-height": paper.height }}>
    {savingTerms && <LoadingSpinner />}
    {showEmail && <div className="soa-email-modal fixed inset-0 z-[100010] flex items-center justify-center bg-gray-900/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="soa-email-title" className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b bg-blue-50 px-5 py-4"><div><h2 id="soa-email-title" className="text-base font-semibold text-blue-800"><FontAwesomeIcon icon={faEnvelope} className="mr-2" />Email Statements of Account</h2><p className="mt-1 text-xs text-slate-500">Each customer receives only their own statement as a PDF attachment.</p></div><button type="button" aria-label="Close email" disabled={emailSending} onClick={() => setShowEmail(false)} className="p-2 text-slate-500 disabled:opacity-30"><FontAwesomeIcon icon={faXmark} /></button></div>
        <div role="tablist" aria-label="Statement email settings" className="flex shrink-0 gap-1 border-b border-slate-200 px-5 pt-3">
          {[{ key: "body", label: "Email Body", icon: faFileLines }, { key: "customers", label: "Customer Emails", icon: faEnvelope }].map((tab) => <button key={tab.key} id={`soa-email-tab-${tab.key}`} type="button" role="tab" aria-selected={emailTab === tab.key} aria-controls={`soa-email-panel-${tab.key}`} onClick={() => setEmailTab(tab.key)} className={`inline-flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${emailTab === tab.key ? "border-blue-600 bg-blue-50 text-blue-700" : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"}`}><FontAwesomeIcon icon={tab.icon} />{tab.label}{tab.key === "customers" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{emailRows.filter((row) => row.checked).length} selected</span>}</button>)}
        </div>
        <div className="min-h-[340px] overflow-auto p-5">
          <div id="soa-email-panel-body" role="tabpanel" aria-labelledby="soa-email-tab-body" hidden={emailTab !== "body"} className="space-y-4">
          <label className="block text-xs font-medium text-slate-600">Subject<input disabled={emailSending} value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} maxLength={200} className="mt-1 h-9 w-full rounded-md border border-slate-300 px-3 text-sm" /></label>
          <label className="block text-xs font-medium text-slate-600">Message<textarea disabled={emailSending} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} maxLength={20000} rows={5} className="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <p className="text-xs text-slate-500">Available fields: {"{customerName}, {asOfDate}, {companyName}"}. This message is used for this sending only.</p>
          <button type="button" onClick={() => setEmailTab("customers")} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white"><FontAwesomeIcon icon={faEnvelope} />Select Customers</button>
          </div>
          <div id="soa-email-panel-customers" role="tabpanel" aria-labelledby="soa-email-tab-customers" hidden={emailTab !== "customers"} className="space-y-4">
          <div className="overflow-auto rounded-lg border border-slate-200"><table className="w-full text-left text-xs"><thead className="bg-blue-100 text-slate-700"><tr><th className="w-10 p-3"><input type="checkbox" aria-label="Select all customers" disabled={emailSending} checked={emailRows.some((row) => row.status === "Ready") && emailRows.filter((row) => row.status === "Ready").every((row) => row.checked)} onChange={(e) => setEmailRows((rows) => rows.map((row) => row.status === "Ready" ? {...row, checked: e.target.checked} : row))} /></th><th className="p-3">Customer</th><th className="p-3">Email Address</th><th className="p-3">Status</th></tr></thead><tbody>{emailRows.map((row) => <tr key={row.custCode} className="border-t border-slate-200"><td className="p-3"><input type="checkbox" aria-label={`Select ${row.custName}`} checked={row.checked} disabled={emailSending || row.status !== "Ready"} onChange={(e) => setEmailRows((rows) => rows.map((item) => item.custCode === row.custCode ? {...item, checked: e.target.checked} : item))} /></td><td className="p-3"><div className="font-semibold">{row.custName}</div><div className="text-slate-500">{row.custCode}</div></td><td className="p-3"><input type="email" aria-label={`Email for ${row.custName}`} value={row.email} disabled={emailSending || row.status !== "Ready"} onChange={(e) => setEmailRows((rows) => rows.map((item) => item.custCode === row.custCode ? {...item, email: e.target.value} : item))} className="h-8 w-full min-w-[220px] rounded border border-slate-300 px-2" /></td><td className="max-w-[260px] p-3"><span className={`font-medium ${row.status === "Sent" ? "text-emerald-700" : ["Failed", "Check sending"].includes(row.status) ? "text-red-600" : "text-blue-700"}`}><FontAwesomeIcon icon={row.status === "Sent" ? faCheckCircle : ["Creating PDF", "Sending"].includes(row.status) ? faSpinner : faEnvelope} spin={["Creating PDF", "Sending"].includes(row.status)} className="mr-1.5" />{row.status}</span>{row.message && <p className="mt-1 text-[11px] text-slate-500">{row.message}</p>}</td></tr>)}</tbody></table></div>
          <div aria-live="polite"><div className="mb-2 flex justify-between text-xs font-medium text-slate-600"><span>{emailSending ? "Sending statements…" : emailCompleted && emailCompleted === emailSelected.length ? "Sending completed" : "Overall progress"}</span><span>{emailCompleted} / {emailSelected.length} completed · {emailSelected.filter((row) => row.status === "Sent").length} sent</span></div><progress max={emailSelected.length || 1} value={emailCompleted} className="h-2 w-full accent-blue-600" /></div>
          <p className="text-xs text-slate-500">Sent means accepted by the mail server. For “Check sending”, verify with your mail administrator before sending again.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3"><button type="button" disabled={emailSending} onClick={() => setShowEmail(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium disabled:opacity-40">Close</button><button type="button" disabled={emailSending || !emailRows.some((row) => row.checked && row.status === "Ready")} onClick={sendStatements} className="rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"><FontAwesomeIcon icon={emailSending ? faSpinner : faPaperPlane} spin={emailSending} className="mr-2" />{emailSending ? "Sending…" : "Send Selected"}</button></div>
      </div>
    </div>}
    <style>{`
      @media print{.soa-email-modal{display:none!important}}
      .soa-signatures .soa-signature-name{display:block;box-sizing:border-box;height:28px;line-height:16px;padding:7px 2px 5px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid #555;margin-bottom:6px}
      .soa-preview{min-height:100vh;background:#e8edf3;color:#172033;font-family:Arial,sans-serif;padding-top:48px;padding-bottom:30px}
      .soa-tools{position:fixed;top:56px;left:12px;right:12px;z-index:40;display:flex;align-items:center;justify-content:space-between;gap:10px 14px;padding:6px 10px;border:1px solid #d4d8de;border-radius:8px;background:linear-gradient(to right,#bfdbfe,#dbeafe);box-shadow:0 3px 14px #10182814}
      .soa-toolbar-placeholder{height:48px}.soa-toolbar-title{display:flex;flex:1 1 auto;flex-direction:column;gap:2px;min-width:0}.soa-toolbar-title strong{color:#1e3a8a;font-size:14px}.soa-toolbar-title span{color:#475569;font-size:12px}.soa-toolbar-controls{display:flex;flex:0 0 auto;align-items:flex-end;justify-content:flex-end;flex-wrap:wrap;gap:8px}.soa-option-group{display:flex;flex-direction:column;gap:3px}.soa-option-label{color:#667085;font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}.soa-toolbar-controls select{height:32px;padding:4px 8px;background:#f8fafc;color:#344054;font-size:11px;border:1px solid #d0d5dd;border-radius:7px}.soa-toolbar-controls button{height:32px;padding:0 14px;font-size:11px;font-weight:700;border-radius:7px}
      @media screen and (max-width:900px){.soa-tools{align-items:flex-start;flex-direction:column}.soa-toolbar-controls{justify-content:flex-start}.soa-toolbar-placeholder{height:96px}}
      .soa-tools strong{margin-right:auto}.soa-tools button{background:#2563eb;color:white;border:0;border-radius:6px;padding:9px 20px;cursor:pointer}.soa-tools select{border:1px solid #cbd5e1;border-radius:6px;padding:7px;font-size:12px;max-width:280px}.soa-instructions{margin:14px auto;max-width:794px;font-size:12px;display:flex;gap:10px;align-items:center}.soa-instructions textarea{flex:1;border:1px solid #cbd5e1;border-radius:6px;padding:8px;min-height:48px}
      .soa-paper{box-sizing:border-box;width:210mm;height:297mm;background:white;padding:13mm 12mm;margin:20px auto;box-shadow:0 4px 24px #14243b24;display:flex;flex-direction:column;font-size:10px;line-height:1.45;color:#111;border:1px solid #d4dce6}
      .soa-brand{display:flex;justify-content:space-between;gap:20px}.soa-brand h2{font-size:15px;font-weight:700;margin:0 0 5px}.soa-brand address{font-style:normal;font-size:9px;line-height:1.5}.soa-run{font-size:8px;text-align:right;white-space:nowrap;color:#555}.soa-title{text-align:center;margin:18px 0 22px}.soa-title h1{font-size:20px;font-weight:700;margin:0 0 4px}.soa-title p{font-size:11px;margin:0}.soa-customer{display:grid;grid-template-columns:82px 1fr;gap:3px 8px;margin-bottom:15px;font-size:10px}.soa-customer b{font-weight:700}.soa-table{width:100%;border-collapse:collapse;font-size:9px;table-layout:fixed}.soa-table th{border-top:1.5px solid #222;border-bottom:1px solid #222;padding:6px 3px;text-align:left;font-weight:700;line-height:1.25}.soa-table td{padding:5px 3px;border-bottom:1px solid #edf0f3;overflow-wrap:anywhere;vertical-align:top}.soa-table .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.soa-table tfoot td{border-top:1px solid #222;border-bottom:3px double #222;font-weight:700;padding:7px 3px}.soa-continued{font-size:9px;text-align:right;margin-top:9px;color:#555}
      .soa-bottom{margin-top:auto;padding-top:18px}.soa-summary-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #444;min-height:105px}.soa-summary,.soa-payment{padding:9px 11px}.soa-payment{border-left:1px solid #444;font-size:9px;white-space:pre-wrap}.soa-summary h3,.soa-payment h3{font-size:10px;font-weight:700;margin:0 0 7px}.soa-summary p{display:flex;justify-content:space-between;margin:3px 0}.soa-summary .total{border-top:1px solid #444;padding-top:4px;font-weight:700}.soa-signatures{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:16px 0 14px;font-size:9px}.soa-signatures span{display:block;border-bottom:1px solid #555;height:22px;margin-bottom:3px}.soa-note{font-size:8px;font-style:italic;border-top:1px solid #555;padding-top:7px}.soa-foot{display:flex;justify-content:space-between;font-size:8px;color:#666;margin-top:9px}.soa-empty{text-align:center;padding:80px}
      .soa-paper{width:var(--soa-paper-width);height:var(--soa-paper-height)}
      .soa-paper-options{display:inline-flex;height:32px;padding:2px;border:1px solid #d0d5dd;border-radius:7px;background:#f8fafc;gap:2px}
      .soa-tools .soa-paper-options button{height:26px;padding:0 10px;border:0;border-radius:5px;background:transparent;color:#475467;font-size:11px;font-weight:700}
      .soa-tools .soa-paper-options button.is-active{background:#2563eb;color:#fff}
      @media screen and (max-width:1100px){.soa-tools{align-items:flex-start;flex-direction:column}.soa-toolbar-controls{justify-content:flex-start}.soa-toolbar-placeholder{height:96px}}
      @page{size:${paper.width} ${paper.height};margin:0}
      @media print{
        .soa-terms-modal{display:none!important}
        .soa-toolbar-placeholder{display:none!important}
        body:has(.soa-preview) .sticky.top-0.z-40:has(> .fixed.left-0.top-0){display:none!important}
        body:has(.soa-preview) #root div:has(.soa-preview){padding:0!important;overflow:visible!important;transform:none!important}
      }
      @media print{html,body,#root{margin:0!important;padding:0!important;background:white!important}.soa-tools,.soa-instructions{display:none!important}.soa-preview{padding:0;background:white}.soa-paper{margin:0;border:0;box-shadow:none;break-after:page;zoom:1!important}.soa-paper:last-child{break-after:auto}}
    `}</style>
    <div className="soa-tools"><div className="soa-toolbar-title"><strong>Statement of Account</strong><span>{reports.length} customer(s) | {pages.length} printable page(s) | {paper.label} Portrait</span></div>
      <div className="soa-toolbar-controls">
        <div className="soa-option-group"><span className="soa-option-label">Paper size</span><div className="soa-paper-options" role="group" aria-label="Paper size">{Object.entries(PAPER_SIZES).map(([key, option]) => <button type="button" key={key} className={paperSize === key ? "is-active" : ""} aria-pressed={paperSize === key} onClick={() => setPaperSize(key)}>{option.shortLabel}</button>)}</div></div>
        <label className="soa-option-group"><span className="soa-option-label">Customer</span><select aria-label="Preview customer" value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">All Customers</option>{reports.map((r) => <option key={r.custCode} value={r.custCode}>{r.custCode} — {r.custName}</option>)}</select></label>
        <label className="soa-option-group"><span className="soa-option-label">Zoom</span><select aria-label="Preview zoom" value={zoom} onChange={(e) => setZoom(e.target.value)}>{[75, 90, 100, 125].map((n) => <option key={n} value={n}>{n}%</option>)}</select></label>
        <button type="button" disabled={loading || !allPages.length || emailSending} onClick={openEmail}><FontAwesomeIcon icon={faEnvelope} className="mr-2" />Email</button>
        <button disabled={loading || !pages.length} onClick={() => window.print()}>Print / Save PDF</button>
        <button type="button" disabled={loading || savingTerms} onClick={() => { setDraftTerms(paymentInstructions); setShowTerms(true); }}><FontAwesomeIcon icon={faFileLines} className="mr-2" />Terms</button>
      </div></div>
    <div className="soa-toolbar-placeholder" aria-hidden="true" />
    {showTerms && <div className="soa-terms-modal fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="soa-terms-title">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b bg-slate-100 px-5 py-3"><h2 id="soa-terms-title" className="text-sm font-semibold text-blue-800"><FontAwesomeIcon icon={faFileLines} className="mr-2" />SOA Terms and Conditions</h2><button type="button" aria-label="Close terms" disabled={savingTerms} onClick={() => setShowTerms(false)} className="h-8 w-8 rounded-md text-slate-500 hover:bg-slate-200"><FontAwesomeIcon icon={faXmark} /></button></div>
        <div className="p-5"><label htmlFor="soa-payment" className="mb-2 block text-xs font-medium text-slate-600">Terms and payment instructions</label><textarea autoFocus id="soa-payment" maxLength={20000} disabled={savingTerms} value={draftTerms} onChange={(e) => setDraftTerms(e.target.value)} rows={8} className="w-full resize-y rounded-lg border border-slate-300 p-3 text-xs leading-5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter company statement terms and payment instructions." /><p className="mt-2 text-xs text-slate-400">Saved terms apply to all customer statements.</p></div>
        <div className="flex justify-end gap-2 border-t bg-slate-50 px-5 py-3"><button type="button" disabled={savingTerms} onClick={() => setShowTerms(false)} className="inline-flex h-8 min-w-[90px] items-center justify-center gap-2 rounded-md border bg-white px-3 text-xs font-medium text-slate-600"><FontAwesomeIcon icon={faXmark} />Cancel</button><button type="button" disabled={savingTerms} onClick={saveTerms} className="inline-flex h-8 min-w-[100px] items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-medium text-white disabled:opacity-50"><FontAwesomeIcon icon={faSave} />{savingTerms ? "Saving…" : "Save"}</button></div>
      </div>
    </div>}
    {loading ? <LoadingSpinner /> : error || !pages.length ? <div className="soa-empty" role="alert">{error || "No outstanding balances found for the selected filters."}</div> : allPages.map(({ report: r, currency, rows, visible, index, count }) => <article data-soa-customer={r.custCode} className="soa-paper" style={{ zoom: Number(zoom) / 100, display: selected && r.custCode !== selected ? "none" : undefined }} key={`${r.custCode}-${currency}-${index}`}>
      <div className="soa-brand"><div><h2>{r.company?.companyName}</h2><address>VAT Reg. TIN: {r.company?.companyTin}<br />{r.company?.companyAddress}<br />Tel. No.: {r.company?.companyTel}</address></div><div className="soa-run">Run Date: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}<br />Run Time: {new Date().toLocaleTimeString("en-US")}</div></div>
      <div className="soa-title"><h1>Statement of Account</h1><p>As of {date(r.asOfDate)}</p></div>
      <div className="soa-customer"><span>Account Name</span><b>: {r.custName}</b><span>Address</span><span>: {r.custAddress || "—"}</span><span>Credit Limit</span><span>: {money(r.creditLimit)}</span><span>Credit Term</span><span>: {r.creditTerm || "—"}</span></div>
      <table className="soa-table"><colgroup>{[17, 15, 12, 12, 5, 14, 14, 11].map((n, i) => <col key={i} style={{ width: `${n}%` }} />)}</colgroup><thead><tr>{["Customer PO No.", "Document No.", "Invoice Date", "Due Date", "Age", "Original Amount", "Balance", "PDC"].map((h, i) => <th key={h} className={i >= 4 ? "num" : ""}>{h}</th>)}</tr></thead><tbody>{visible.map((row, i) => <tr key={i}><td>{row.customerPoNo || "—"}</td><td>{row.docCode} {row.docNo}</td><td>{date(row.docDate)}</td><td>{date(row.dueDate)}</td><td className="num">{row.ageInDays}</td><td className="num">{money(row.originalAmount)}</td><td className="num">{money(row.balance)}</td><td className="num">{money(row.pdcAmount)}</td></tr>)}</tbody>{index === count - 1 && <tfoot><tr><td colSpan={5} style={{ textAlign: "right" }}>Total &gt;&gt;&gt; {currency}</td><td className="num">{money(sum(rows, "originalAmount"))}</td><td className="num">{money(sum(rows, "balance"))}</td><td className="num">{money(sum(rows, "pdcAmount"))}</td></tr></tfoot>}</table>
      {index < count - 1 && <p className="soa-continued">Continued on next page…</p>}
      <div className="soa-bottom">{index === count - 1 && <><div className="soa-summary-grid"><div className="soa-summary"><h3>Account Summary — {currency}</h3><p>Current <span>{money(sum(rows, "currentAmount"))}</span></p><p>Overdue <span>{money(sum(rows, "balance") - sum(rows, "currentAmount"))}</span></p><p className="total">Total <span>{money(sum(rows, "balance"))}</span></p></div><div className="soa-payment"><h3>Payment Instructions</h3>{paymentInstructions || "Please contact our Accounting Department for payment instructions."}</div></div><div className="soa-signatures">{["Prepared By", "Noted By", "Verified By", "Received By"].map((label) => <div key={label}>{label}:<span className="soa-signature-name" style={{ fontWeight: label === "Prepared By" ? 600 : 400, fontSize: label === "Prepared By" ? "11px" : undefined }}>{label === "Prepared By" ? preparedBy : ""}</span>Signature over Printed Name</div>)}</div><div className="soa-note">Please review this Statement of Account carefully. For questions or discrepancies, please contact our Accounting Department. PDC amounts are shown for reference and are not deducted again from the balance.</div></>}<div className="soa-foot"><span>NAYSA Financials · {r.custCode} · {currency}</span><span>Page {index + 1} of {count}</span></div></div>
    </article>)}
  </div>;
}
