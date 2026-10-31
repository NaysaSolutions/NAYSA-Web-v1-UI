import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { CheckCircle2, ClipboardCheck, FileText, ListChecks, X, XCircle } from "lucide-react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalErrorAlert, useSwalProceedConfirm, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const getTranId = (row) => row?.tranId || row?.prId || row?.poId || row?.joId || row?.PR_ID || row?.PO_ID || row?.JO_ID || "";
const statusName = (value) => ({ A: "Approved", P: "Pending for Approval", R: "Rejected", NA: "Approval Not Required" }[value] || value || "-");
const isRowApprovable = (row) => row?.canApprove === true || Number(row?.canApprove) === 1 || String(row?.canApprove || "").toUpperCase() === "Y";
const formatNumber = (value, decimals = 2) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export default function LineItemApprovalModal({ isOpen, docCode, documentRow, userCode, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const tranId = getTranId(documentRow);
  const docNo = documentRow?.docNo || documentRow?.prNo || documentRow?.poNo || documentRow?.joNo || "";

  const load = useCallback(async () => {
    if (!isOpen || !tranId || !userCode) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get("/lineApproval", { params: { docCode, tranId, userCode } });
      const nextRows = Array.isArray(data?.data) ? data.data : [];
      setRows(nextRows);
      setSelected(new Set());
      return nextRows;
    } catch (error) {
      useSwalErrorAlert("Line Item Approval", error?.response?.data?.message || "Unable to load approval lines.");
      return null;
    } finally { setLoading(false); }
  }, [docCode, isOpen, tranId, userCode]);

  useEffect(() => { load(); }, [load]);
  const eligibleRows = useMemo(() => rows.filter(isRowApprovable), [rows]);
  const selectedRows = useMemo(() => eligibleRows.filter((row) => selected.has(String(row.lineKey))), [eligibleRows, selected]);
  const filteredRows = rows;
  const filteredEligibleRows = eligibleRows;

  const submit = async (action) => {
    if (!selectedRows.length) return;
    let reason = "";
    if (action === "R") {
      const result = await Swal.fire({ title: "Disapprove selected items?", input: "textarea", inputLabel: "Reason", inputValidator: (v) => !String(v || "").trim() ? "Reason is required." : undefined, showCancelButton: true, confirmButtonText: "Disapprove", confirmButtonColor: "#ef4444" });
      if (!result.isConfirmed) return;
      reason = String(result.value || "").trim();
    } else {
      const result = await useSwalProceedConfirm("Approve selected items?", `Approve ${selectedRows.length} selected line item(s)?`, "Yes, approve");
      if (!result?.isConfirmed) return;
    }
    setLoading(true);
    if (action === "A") onClose?.();
    try {
      await apiClient.post("/lineApproval", { json_data: { docCode, tranId, userCode, action, reason, dt1: selectedRows.map(({ lineKey }) => ({ lineKey })) } });
      const updatedCount = selectedRows.length;
      if (action !== "A") await load();
      await Promise.resolve(onChanged?.());
      await useSwalSuccessAlert(action === "A" ? "Items Approved" : "Items Disapproved", `${updatedCount} line item(s) updated successfully.`);
    } catch (error) {
      useSwalErrorAlert("Line Item Approval", error?.response?.data?.message || "Unable to update selected line items.");
    } finally { setLoading(false); }
  };

  if (!isOpen) return loading ? <LoadingSpinner/> : null;
  const allFilteredSelected = filteredEligibleRows.length > 0 && filteredEligibleRows.every((row) => selected.has(String(row.lineKey)));
  const statusStyle = (status) => ({
    A: "border-emerald-200 bg-emerald-50 text-emerald-700",
    P: "border-amber-200 bg-amber-50 text-amber-700",
    R: "border-red-200 bg-red-50 text-red-700",
    NA: "border-slate-200 bg-slate-100 text-slate-500",
  }[status] || "border-slate-200 bg-slate-50 text-slate-600");

  return <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[1px] md:p-5">
    <div className="flex h-[min(540px,76vh)] w-full max-w-[1180px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-[0_20px_60px_rgba(15,23,42,.26)]">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm"><ClipboardCheck size={19}/></div>
          <div className="min-w-0"><h2 className="truncate text-[16px] font-bold text-slate-900">{docCode} Line Item Approval</h2><p className="text-[10px] font-medium text-slate-500">Review and approve required transaction lines</p></div>
        </div>
        <button onClick={onClose} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40" title="Close"><X size={20}/></button>
      </header>

      <div className="grid shrink-0 grid-cols-1 gap-2 px-4 pt-2.5 sm:grid-cols-3">
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText size={16}/></span><div><p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Document No.</p><p className="text-[13px] font-bold text-slate-900">{docNo || "-"}</p></div></div>
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-100 bg-white px-3 py-2 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><ClipboardCheck size={16}/></span><div><p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Pending Lines</p><p className="text-base font-bold leading-none text-amber-700">{eligibleRows.length}</p></div></div>
        <div className="flex items-center gap-2.5 rounded-lg border border-emerald-100 bg-white px-3 py-2 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ListChecks size={16}/></span><div><p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">Selected</p><p className="text-base font-bold leading-none text-emerald-700">{selectedRows.length}</p></div></div>
      </div>

      <div className="flex shrink-0 items-center justify-end px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button disabled={!selectedRows.length || loading} onClick={() => submit("A")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 size={15}/>Approve Selected</button>
          <button disabled={!selectedRows.length || loading} onClick={() => submit("R")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-500 px-4 text-xs font-bold text-white shadow-sm hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"><XCircle size={15}/>Disapprove Selected</button>
        </div>
      </div>

      <div className="mx-4 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? <div className="flex h-full min-h-[260px] items-center justify-center"><LoadingSpinner/></div> : <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#dbeafe] text-slate-700"><tr>
              <th className="w-12 border-b border-r border-blue-200 px-3 py-2 text-center"><input type="checkbox" disabled={!filteredEligibleRows.length} checked={allFilteredSelected} onChange={(event) => setSelected((previous) => { const next=new Set(previous); filteredEligibleRows.forEach((row) => event.target.checked ? next.add(String(row.lineKey)) : next.delete(String(row.lineKey))); return next; })}/></th>
              <th className="w-14 border-b border-r border-blue-200 px-3 py-2 text-left">Line</th><th className="w-16 border-b border-r border-blue-200 px-3 py-2 text-left">Type</th><th className="w-32 border-b border-r border-blue-200 px-3 py-2 text-left">Item Code</th><th className="min-w-[260px] border-b border-r border-blue-200 px-3 py-2 text-left">Item Name</th><th className="w-20 border-b border-r border-blue-200 px-3 py-2 text-left">UOM</th><th className="w-32 border-b border-r border-blue-200 px-3 py-2 text-right">Quantity</th><th className="w-32 border-b border-r border-blue-200 px-3 py-2 text-right">Amount</th><th className="w-24 border-b border-r border-blue-200 px-3 py-2 text-center">Level</th><th className="w-44 border-b border-blue-200 px-3 py-2 text-left">Status</th>
            </tr></thead>
            <tbody>{filteredRows.map((row, index) => { const canApprove=isRowApprovable(row); return <tr key={row.lineKey} className={canApprove ? `${index%2 ? "bg-slate-50/60" : "bg-white"} hover:bg-blue-50` : "bg-slate-50 text-slate-400"}>
              <td className="border-b border-r border-slate-200 px-3 py-1.5 text-center"><input type="checkbox" disabled={!canApprove} checked={canApprove && selected.has(String(row.lineKey))} className={!canApprove ? "cursor-not-allowed opacity-35" : "cursor-pointer accent-blue-600"} onChange={() => setSelected((previous) => { const next=new Set(previous); const key=String(row.lineKey); next.has(key)?next.delete(key):next.add(key); return next; })}/></td>
              <td className="border-b border-r border-slate-200 px-3 py-1.5 font-semibold">{row.lineNo}</td><td className="border-b border-r border-slate-200 px-3 py-1.5">{row.invType}</td><td className="border-b border-r border-slate-200 px-3 py-1.5 font-semibold text-slate-700">{row.itemCode}</td><td className="border-b border-r border-slate-200 px-3 py-1.5">{row.itemName}</td><td className="border-b border-r border-slate-200 px-3 py-1.5">{row.uom}</td><td className="border-b border-r border-slate-200 px-3 py-1.5 text-right tabular-nums">{formatNumber(row.quantity,6)}</td><td className="border-b border-r border-slate-200 px-3 py-1.5 text-right tabular-nums">{formatNumber(row.amount)}</td><td className="border-b border-r border-slate-200 px-3 py-1.5 text-center font-semibold">{row.currentLevel} / {row.requiredLevel}</td><td className="border-b border-slate-200 px-3 py-1.5"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusStyle(row.appStat)}`}>{statusName(row.appStat)}</span></td>
            </tr>})}</tbody>
          </table>}
          {!loading && !filteredRows.length && <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-slate-400"><ClipboardCheck size={32} strokeWidth={1.4}/><p className="text-sm font-semibold">No line items available.</p></div>}
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-medium text-slate-500"><span>Disabled rows do not require approval.</span><span>{filteredRows.length} of {rows.length} line(s)</span></div>
      </div>
    </div>
  </div>;
}
