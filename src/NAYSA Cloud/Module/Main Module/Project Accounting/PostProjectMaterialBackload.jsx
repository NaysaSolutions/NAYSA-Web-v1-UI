import { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import GlobalGLPostingModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalGLPostingv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData.js";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure.js";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const parsePostingRows = (response) => {
  const raw = response?.data?.data?.[0]?.result;
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const fallbackColumns = [
  { key: "branchCode", label: "Branch Code", width: 120, renderType: "text" },
  { key: "branchName", label: "Branch Name", width: 160, renderType: "text" },
  { key: "docNo", label: "Backload No.", width: 130, renderType: "text" },
  { key: "docDate", label: "Backload Date", width: 130, renderType: "date" },
  { key: "transactionType", label: "Transaction Type", width: 140, renderType: "text" },
  { key: "projCode", label: "Project Code", width: 140, renderType: "text" },
  { key: "projName", label: "Project Name", width: 220, renderType: "text" },
  { key: "custCode", label: "Customer Code", width: 140, renderType: "text" },
  { key: "custName", label: "Customer Name", width: 220, renderType: "text" },
  { key: "whCode", label: "Warehouse", width: 130, renderType: "text" },
  { key: "locCode", label: "Location", width: 130, renderType: "text" },
  { key: "referenceNo", label: "Reference No.", width: 140, renderType: "text" },
  { key: "totalAmount", label: "Total Amount", width: 140, classNames: "text-right", renderType: "number", renderFormat: "2" },
];

const PostProjectMaterialBackload = ({
  isOpen,
  onClose,
  userCode,
  endpoint = "postingProjectMaterialBackloadIncoming",
  postingDocCode = "ProjectMaterialBackloadIncoming",
  transactionType = "I",
  transactionPath = "/prj/transaction/project-material-backload-incoming",
}) => {
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;

    const loadPosting = async () => {
      setLoading(true);
      setReady(false);
      try {
        const [response, configuredColumns] = await Promise.all([
          apiClient.get(`/${endpoint}`),
          useSelectedHSColConfig(endpoint, userCode || ""),
        ]);
        const postingRows = parsePostingRows(response).map((row, index) => ({
          ...row,
          lineNo: index + 1,
          lnNo: index + 1,
          documentID: row.groupId,
        }));

        if (!postingRows.length) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Transactions to Finalize",
            message: `There are no open ${transactionType === "I" ? "Incoming" : "Outgoing"} Project Material Backload records available for finalization.`,
          });
          onClose?.();
          return;
        }

        if (active) {
          setRows(postingRows);
          setColumns(Array.isArray(configuredColumns) && configuredColumns.length ? configuredColumns : fallbackColumns);
          setReady(true);
        }
      } catch (error) {
        useSwalValidationAlert({
          icon: "error",
          title: "Posting Load Error",
          message: error?.response?.data?.details || error?.response?.data?.message || error.message,
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPosting();
    return () => {
      active = false;
    };
  }, [endpoint, isOpen, onClose, transactionType, userCode]);

  const handlePost = async (selectedRows, password) => {
    const result = await useHandlePostTran(selectedRows, password, postingDocCode, userCode, setLoading, onClose);
    if (result?.success) {
      window.dispatchEvent(new CustomEvent("project-backload-finalized", {
        detail: { documentIds: selectedRows.map((row) => row.groupId).filter(Boolean) },
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {ready && (
        <GlobalGLPostingModalv1
          data={rows}
          colConfigData={columns}
          title={`Finalize ${transactionType === "I" ? "Incoming" : "Outgoing"} Project Material Backload`}
          btnCaption="Finalize"
          onClose={onClose}
          onPost={handlePost}
          onViewDocument={(row) => {
            const url = `${window.location.origin}${transactionPath}?blNo=${encodeURIComponent(row.docNo || "")}&branchCode=${encodeURIComponent(row.branchCode || "")}&viewDocument=true`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          remoteLoading={loading}
        />
      )}
      {ReactDOM.createPortal(loading ? <LoadingSpinner /> : null, document.body)}
    </>
  );
};

export default PostProjectMaterialBackload;
