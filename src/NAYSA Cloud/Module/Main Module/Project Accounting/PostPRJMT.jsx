import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import GlobalGLPostingModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalGLPostingv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData.js";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure.js";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const ENDPOINT = "postingPRJMT";
const fallbackColumns = [
  { key: "branchCode", label: "Branch Code", width: 120, renderType: "text" },
  { key: "branchName", label: "Branch Name", width: 160, renderType: "text" },
  { key: "docNo", label: "Transfer No.", width: 130, renderType: "text" },
  { key: "docDate", label: "Transfer Date", width: 120, renderType: "date" },
  { key: "projCode", label: "Project Code", width: 130, renderType: "text" },
  { key: "projName", label: "Project Name", width: 220, renderType: "text" },
  { key: "custCode", label: "Customer Code", width: 130, renderType: "text" },
  { key: "custName", label: "Customer Name", width: 220, renderType: "text" },
  { key: "fromWh", label: "From Warehouse", width: 140, renderType: "text" },
  { key: "toWh", label: "To Warehouse", width: 140, renderType: "text" },
  { key: "rcCode", label: "RC Code", width: 110, renderType: "text" },
  { key: "totalAmount", label: "Total Amount", width: 130, renderType: "number" },
  { key: "remarks", label: "Remarks", width: 240, renderType: "text" },
];

const parseRows = (response) => {
  const raw = response?.data?.data?.[0]?.result;
  if (Array.isArray(raw)) return raw;
  try { const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw; return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
};

export default function PostPRJMT({ isOpen, onClose, userCode }) {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    (async () => {
      setLoading(true); setReady(false);
      try {
        const [response, configured] = await Promise.all([
          apiClient.get(`/${ENDPOINT}`), useSelectedHSColConfig(ENDPOINT, userCode || ""),
        ]);
        const data = parseRows(response).map((row, i) => ({ ...row, lineNo: i + 1, lnNo: i + 1, documentID: row.groupId }));
        if (!data.length) {
          useSwalValidationAlert({ icon: "info", title: "No Transactions to Finalize", message: "There are no open Project Material Transfer records available for finalization." });
          onClose?.(); return;
        }
        if (active) { setRows(data); setColumns(Array.isArray(configured) && configured.length ? configured : fallbackColumns); setReady(true); }
      } catch (error) {
        useSwalValidationAlert({ icon: "error", title: "Finalization Load Error", message: error?.response?.data?.details || error?.response?.data?.message || error.message });
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [isOpen, onClose, userCode]);

  const handlePost = async (selectedRows, password) => {
    const result = await useHandlePostTran(selectedRows, password, "PRJMT", userCode, setLoading, onClose);
    if (result?.success) window.dispatchEvent(new CustomEvent("project-transfer-finalized", { detail: { documentIds: selectedRows.map(r => r.groupId).filter(Boolean) } }));
  };

  if (!isOpen) return null;
  return <>
    {ready && <GlobalGLPostingModalv1 data={rows} colConfigData={columns} title="Finalize Project Material Transfer" btnCaption="Finalize" onClose={onClose} onPost={handlePost}
      onViewDocument={(row) => window.open(`${window.location.origin}/prj/transaction/project-material-transfer?tfNo=${encodeURIComponent(row.docNo || "")}&branchCode=${encodeURIComponent(row.branchCode || "")}&viewDocument=true`, "_blank", "noopener,noreferrer")}
      remoteLoading={loading} />}
    {ReactDOM.createPortal(loading ? <LoadingSpinner /> : null, document.body)}
  </>;
}
