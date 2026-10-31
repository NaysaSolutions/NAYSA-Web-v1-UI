import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { CheckCircle2, ClipboardCheck, ListChecks, PackageCheck, RefreshCcw, Store, X, XCircle } from "lucide-react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import GlobalApprovalModal from "@/NAYSA Cloud/Approval/GlobaApprovalModal.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalErrorAlert, useSwalProceedConfirm, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const columns = [
  { key: "branchCode", label: "Branch", width: 90 },
  { key: "docNo", label: "Canvass No.", width: 130 },
  { key: "docDate", label: "Canvass Date", width: 120 },
  { key: "totalLines", label: "Items", width: 80, align: "right" },
  { key: "pendingLines", label: "Pending Items", width: 110, align: "right" },
  { key: "totalAmount", label: "Recommended Amount", width: 170, align: "right", format: "number" },
  { key: "top1Offer", label: "Top 1 Supplier / Offer", width: 230 },
  { key: "top2Offer", label: "Top 2 Supplier / Offer", width: 230 },
  { key: "top3Offer", label: "Top 3 Supplier / Offer", width: 230 },
  { key: "requiredLevel", label: "Required Level", width: 110, align: "center" },
  { key: "approvalStatus", label: "Approval Status", width: 140 },
];

const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
const isApprovable = (row) => row?.canApprove === true || Number(row?.canApprove) === 1;

function SupplierComparisonModal({ open, canId, line, userCode, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiClient.get("/can/approval/suppliers", { params: { canId, lineKey: line?.lineKey, userCode } })
      .then(({ data }) => {
        const next = Array.isArray(data?.data) ? data.data : [];
        setRows(next);
        setSelected(String(next.find((row) => Number(row.awardPriority) === 1)?.supplierLineId || ""));
      })
      .catch((error) => useSwalErrorAlert("Supplier Comparison", error?.response?.data?.message || "Unable to load supplier quotations."))
      .finally(() => setLoading(false));
  }, [open, canId, line?.lineKey, userCode]);

  if (!open) return null;

  const applySupplier = async () => {
    const current = rows.find((row) => Number(row.awardPriority) === 1);
    if (!selected || selected === String(current?.supplierLineId || "")) return onClose();
    const reasonResult = await Swal.fire({
      title: "Change suggested supplier?", input: "textarea", inputLabel: "Reason for changing supplier",
      inputPlaceholder: "Enter the reason for selecting this supplier...", showCancelButton: true,
      confirmButtonText: "Apply Supplier", inputValidator: (value) => !String(value || "").trim() ? "Reason is required." : undefined,
    });
    if (!reasonResult.isConfirmed) return;
    setLoading(true);
    try {
      await apiClient.post("/can/approval/supplier", { json_data: {
        canId, lineKey: line.lineKey, supplierLineId: selected, userCode, reason: String(reasonResult.value).trim(),
      }});
      await useSwalSuccessAlert("Supplier Updated", "Suggested supplier was changed. Approval for this line was reset.");
      await onChanged?.();
      onClose();
    } catch (error) {
      useSwalErrorAlert("Supplier Change", error?.response?.data?.message || "Unable to change the suggested supplier.");
    } finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[10150] flex items-center justify-center bg-slate-950/45 p-5">
    <div className="flex max-h-[72vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><Store size={18}/></span><div><h3 className="text-sm font-bold text-slate-900">Supplier Comparison</h3><p className="text-[10px] text-slate-500">{line?.itemCode} — {line?.itemName}</p></div></div>
        <button onClick={onClose} className="text-slate-400 hover:text-red-600"><X size={20}/></button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading ? <LoadingSpinner/> : <table className="w-full min-w-[850px] text-[11px]"><thead className="bg-blue-100 text-slate-700"><tr><th className="p-2">Select</th><th className="p-2 text-left">Priority</th><th className="p-2 text-left">Supplier</th><th className="p-2 text-right">Unit Price</th><th className="p-2 text-right">Amount</th><th className="p-2 text-left">Payment Terms</th><th className="p-2 text-left">Delivery Terms</th><th className="p-2 text-center">Lowest</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.supplierLineId} className={Number(row.awardPriority) === 1 ? "bg-emerald-50" : "border-b border-slate-200"}><td className="p-2 text-center"><input type="radio" name="supplier" checked={selected === String(row.supplierLineId)} onChange={() => setSelected(String(row.supplierLineId))}/></td><td className="p-2 font-bold">{row.awardPriority || "-"}</td><td className="p-2"><div className="font-semibold">{row.supplierName}</div><div className="text-[9px] text-slate-400">{row.supplierCode}</div></td><td className="p-2 text-right tabular-nums">{money(row.unitPrice)}</td><td className="p-2 text-right font-semibold tabular-nums">{money(row.amount)}</td><td className="p-2">{row.paymentTerms || "-"}</td><td className="p-2">{row.deliveryTerms || "-"}</td><td className="p-2 text-center">{Number(row.isLowestOffer) === 1 ? "Yes" : ""}</td></tr>)}</tbody></table>}
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3"><button onClick={onClose} className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold">Cancel</button><button disabled={loading || !selected} onClick={applySupplier} className="h-9 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-40">Apply Suggested Supplier</button></footer>
    </div>
  </div>;
}

function CANLineApprovalModal({ open, documentRow, userCode, onClose, onChanged }) {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [supplierLine, setSupplierLine] = useState(null);
  const [loading, setLoading] = useState(false);
  const canId = documentRow?.tranId;

  const load = useCallback(async () => {
    if (!open || !canId) return [];
    setLoading(true);
    try {
      const { data } = await apiClient.get("/can/approval/lines", { params: { canId, userCode } });
      const next = Array.isArray(data?.data) ? data.data : [];
      setRows(next); setSelected(new Set()); return next;
    } catch (error) { useSwalErrorAlert("Canvass Line Approval", error?.response?.data?.message || "Unable to load Canvass items."); return []; }
    finally { setLoading(false); }
  }, [open, canId, userCode]);
  useEffect(() => { load(); }, [load]);
  if (!open) return null;

  const selectedRows = rows.filter((row) => isApprovable(row) && selected.has(String(row.lineKey)));
  const submit = async (action) => {
    if (!selectedRows.length) return;
    let reason = "";
    if (action === "R") {
      const result = await Swal.fire({ title: "Disapprove selected Canvass items?", input: "textarea", inputLabel: "Reason", showCancelButton: true, confirmButtonText: "Disapprove", inputValidator: (value) => !String(value || "").trim() ? "Reason is required." : undefined });
      if (!result.isConfirmed) return; reason = String(result.value).trim();
    } else {
      const result = await useSwalProceedConfirm("Approve selected Canvass items?", `Approve ${selectedRows.length} selected item(s)?`, "Approve");
      if (!result?.isConfirmed) return;
    }
    setLoading(true);
    try {
      await apiClient.post("/can/approval/lines", { json_data: { canId, userCode, action, reason, dt1: selectedRows.map((row) => ({ lineKey: row.lineKey })) }});
      await useSwalSuccessAlert(action === "A" ? "Items Approved" : "Items Disapproved", `${selectedRows.length} item(s) updated successfully.`);
      const next = await load(); await onChanged?.();
      if (!next.some(isApprovable)) onClose();
    } catch (error) { useSwalErrorAlert("Canvass Line Approval", error?.response?.data?.message || "Unable to update Canvass items."); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/50 p-4">
    <div className="flex h-[min(610px,82vh)] w-full max-w-[1320px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><ClipboardCheck size={18}/></span><div><h2 className="text-base font-bold">Canvass Line Item Approval</h2><p className="text-[10px] text-slate-500">{documentRow?.docNo}</p></div></div><button onClick={onClose}><X size={20}/></button></header>
      <div className="grid grid-cols-3 gap-2 px-4 pt-3"><div className="rounded-lg border bg-white p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Document</p><p className="font-bold">{documentRow?.docNo}</p></div><div className="rounded-lg border bg-white p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Pending Items</p><p className="font-bold text-amber-600">{rows.filter(isApprovable).length}</p></div><div className="rounded-lg border bg-white p-3"><p className="text-[9px] font-bold uppercase text-slate-400">Selected</p><p className="font-bold text-emerald-600">{selectedRows.length}</p></div></div>
      <div className="flex justify-end gap-2 px-4 py-2"><button onClick={load} className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-semibold"><RefreshCcw size={14}/>Refresh</button><button disabled={!selectedRows.length} onClick={() => submit("A")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white disabled:opacity-40"><CheckCircle2 size={15}/>Approve Selected</button><button disabled={!selectedRows.length} onClick={() => submit("R")} className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-500 px-4 text-xs font-bold text-white disabled:opacity-40"><XCircle size={15}/>Disapprove Selected</button></div>
      <div className="mx-4 mb-4 min-h-0 flex-1 overflow-auto rounded-lg border bg-white"><table className="w-full min-w-[1200px] text-[11px]"><thead className="sticky top-0 bg-blue-100"><tr><th className="p-2">Select</th><th className="p-2 text-left">Line</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Item Code</th><th className="p-2 text-left">Item Name</th><th className="p-2 text-left">UOM</th><th className="p-2 text-right">Quantity</th><th className="p-2 text-left">Suggested Supplier</th><th className="p-2 text-right">Amount</th><th className="p-2 text-center">Level</th><th className="p-2 text-center">Status</th><th className="p-2 text-center">Supplier</th></tr></thead><tbody>{rows.map((row) => { const allowed=isApprovable(row); return <tr key={row.lineKey} className={allowed ? "border-b hover:bg-blue-50" : "border-b bg-slate-50 text-slate-400"}><td className="p-2 text-center"><input type="checkbox" disabled={!allowed} checked={selected.has(String(row.lineKey))} onChange={() => setSelected((current) => { const next=new Set(current); const key=String(row.lineKey); next.has(key)?next.delete(key):next.add(key); return next; })}/></td><td className="p-2 font-semibold">{row.lineNo}</td><td className="p-2">{row.invType}</td><td className="p-2 font-semibold">{row.itemCode}</td><td className="p-2">{row.itemName}</td><td className="p-2">{row.uom}</td><td className="p-2 text-right">{qty(row.quantity)}</td><td className="p-2 font-semibold text-blue-700">{row.awardedSupplierName || "-"}</td><td className="p-2 text-right font-semibold">{money(row.amount)}</td><td className="p-2 text-center">{row.currentLevel} / {row.requiredLevel}</td><td className="p-2 text-center">{row.appStat}</td><td className="p-2 text-center"><button disabled={!allowed} onClick={() => setSupplierLine(row)} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700 disabled:opacity-35">Compare / Change</button></td></tr>})}</tbody></table>{!rows.length && !loading && <div className="p-12 text-center text-sm text-slate-400">No Canvass lines available.</div>}</div>
      {loading && <LoadingSpinner/>}
    </div>
    <SupplierComparisonModal open={Boolean(supplierLine)} canId={canId} line={supplierLine} userCode={userCode} onClose={() => setSupplierLine(null)} onChanged={load}/>
  </div>;
}

export default function CANApprovalModal({ isOpen = true, onClose }) {
  const { currentUserRow } = useAuth();
  const userCode = currentUserRow?.userCode || currentUserRow?.USER_CODE || "";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lineDocument, setLineDocument] = useState(null);
  const noApprovalAlertShownRef = useRef(false);

  const load = useCallback(async () => {
    if (!userCode) return [];
    setLoading(true);
    try {
      const { data } = await apiClient.get("/can/approval", { params: { userCode } });
      const rawRows = Array.isArray(data?.data) ? data.data : [];
      const next = rawRows.map((row) => ({
        ...row,
        top1Offer: row.top1Supplier ? `${row.top1Supplier} — PHP ${money(row.top1Amount)}` : "—",
        top2Offer: row.top2Supplier ? `${row.top2Supplier} — PHP ${money(row.top2Amount)}` : "—",
        top3Offer: row.top3Supplier ? `${row.top3Supplier} — PHP ${money(row.top3Amount)}` : "—",
      }));
      setRows(next);
      if (!next.length && !noApprovalAlertShownRef.current) {
        noApprovalAlertShownRef.current = true;
        useSwalErrorAlert("Canvass Approval", "No open Canvass found for approval.");
        onClose?.();
      } else if (next.length) {
        noApprovalAlertShownRef.current = false;
      }
      return next;
    }
    catch (error) { useSwalErrorAlert("Canvass Approval", error?.response?.data?.message || "Unable to load Canvass approvals."); return []; }
    finally { setLoading(false); }
  }, [onClose, userCode]);
  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);
  const scope = rows[0]?.approvalScope || "LINE";
  const level = rows[0]?.userLevel || "";
  const updateDocuments = useCallback(async (selectedRows, action, reason = "") => {
    const documents = (Array.isArray(selectedRows) ? selectedRows : [selectedRows]).filter(Boolean);
    if (!documents.length) return false;
    if (action === "A") {
      const confirm = await useSwalProceedConfirm(
        "Approve selected Canvass?",
        `Approve ${documents.length} selected Canvass transaction(s)?`,
        "Approve",
      );
      if (!confirm?.isConfirmed) return false;
    }
    setLoading(true);
    try {
      await apiClient.post("/can/approval/documents", { json_data: {
        userCode, action, reason,
        dt1: documents.map((row) => ({ tranId: row.tranId })),
      }});
      await useSwalSuccessAlert(
        action === "A" ? "Canvass Approved" : "Canvass Disapproved",
        `${documents.length} transaction(s) updated successfully.`,
      );
      await load();
      return true;
    } catch (error) {
      useSwalErrorAlert("Canvass Approval", error?.response?.data?.message || "Unable to update Canvass approval.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [load, userCode]);
  if (!isOpen) return null;
  return <><GlobalApprovalModal isOpen={isOpen} onClose={onClose} title="Canvass Approval" transactionLabel="Canvass Approval" documentName="Canvass" totalLabel="Total Canvass" approverName={currentUserRow?.userName || ""} approvalLevel={level} department={currentUserRow?.rcName || ""} detailColumns={columns} detailRows={rows} isDetailLoading={loading} isProcessing={loading} onViewLineItems={scope === "LINE" ? setLineDocument : undefined} showDocumentApprovalActions={scope !== "LINE"} onApprove={(row) => updateDocuments(row, "A")} onApproveSelected={(selectedRows) => updateDocuments(selectedRows, "A")} onReject={(row, reason) => updateDocuments(row, "R", reason)} onRejectSelected={(selectedRows, reason) => updateDocuments(selectedRows, "R", reason)} onReloadRecords={load}/><CANLineApprovalModal open={Boolean(lineDocument)} documentRow={lineDocument} userCode={userCode} onClose={() => setLineDocument(null)} onChanged={load}/></>;
}
