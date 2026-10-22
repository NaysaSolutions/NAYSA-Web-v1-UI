import { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import GlobalGLPostingModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalGLPostingv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData.js";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure.js";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const ENDPOINT = "postingProjectMaterialIssue";
const POSTING_DOC_CODE = "ProjectMaterialIssue";

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
  { key: "branchName", label: "Branch Name", width: 150, renderType: "text" },
  { key: "docNo", label: "MI No.", width: 120, renderType: "text" },
  { key: "docDate", label: "MI Date", width: 120, renderType: "date" },
  { key: "mrNo", label: "MR No.", width: 120, renderType: "text" },
  { key: "projCode", label: "Project Code", width: 130, renderType: "text" },
  { key: "projName", label: "Project Name", width: 220, renderType: "text" },
  { key: "custName", label: "Customer Name", width: 220, renderType: "text" },
  { key: "rcCode", label: "RC Code", width: 110, renderType: "text" },
  { key: "totalAmount", label: "Total Amount", width: 140, renderType: "number", roundingOff: 2 },
  { key: "docStatus", label: "Document Status", width: 130, renderType: "text" },
];

const PostProjectMaterialIssue = ({ isOpen, onClose, userCode }) => {
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
          apiClient.get(`/${ENDPOINT}`),
          useSelectedHSColConfig(ENDPOINT, userCode || ""),
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
            title: "No Transactions to Post",
            message: "There are no fully allocated Project Material Issue Slip records available for posting.",
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
  }, [isOpen, onClose, userCode]);

  const handlePost = async (selectedRows, password) => {
    await useHandlePostTran(
      selectedRows,
      password,
      POSTING_DOC_CODE,
      userCode,
      setLoading,
      onClose
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {ready && (
        <GlobalGLPostingModalv1
          data={rows}
          colConfigData={columns}
          title="Post Project Material Issue Slip"
          btnCaption="Post"
          onClose={onClose}
          onPost={handlePost}
          onViewDocument={(row) => {
            const url = `${window.location.origin}/prj/transaction/project-material-issue?isNo=${encodeURIComponent(row.docNo || "")}&branchCode=${encodeURIComponent(row.branchCode || "")}&viewDocument=true`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          remoteLoading={loading}
        />
      )}
      {ReactDOM.createPortal(loading ? <LoadingSpinner /> : null, document.body)}
    </>
  );
};

export default PostProjectMaterialIssue;
