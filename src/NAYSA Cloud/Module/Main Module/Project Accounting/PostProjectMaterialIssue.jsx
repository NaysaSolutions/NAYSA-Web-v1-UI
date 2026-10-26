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
  { key: "branchCode", label: "Branch Code", width: 120, renderType: "text" },
  { key: "branchName", label: "Branch Name", width: 150, renderType: "text" },
  { key: "docNo", label: "MI No.", width: 120, renderType: "text" },
  { key: "docDate", label: "MI Date", width: 120, renderType: "date" },
  { key: "mrNo", label: "MR No.", width: 120, renderType: "text" },
  { key: "boqNo", label: "BOQ No.", width: 120, renderType: "text" },
  { key: "joNo", label: "JO No.", width: 120, renderType: "text" },
  { key: "projCode", label: "Project Code", width: 130, renderType: "text" },
  { key: "projName", label: "Project Name", width: 220, renderType: "text" },
  { key: "custCode", label: "Customer Code", width: 130, renderType: "text" },
  { key: "custName", label: "Customer Name", width: 220, renderType: "text" },
  { key: "custRefNo", label: "Cust Ref No.", width: 130, renderType: "text" },
  { key: "phaseCode", label: "Phase Code", width: 120, renderType: "text" },
  { key: "phaseName", label: "Phase Name", width: 180, renderType: "text" },
  { key: "siteCode", label: "Site Code", width: 120, renderType: "text" },
  { key: "siteName", label: "Site Name", width: 180, renderType: "text" },
  { key: "activityCode", label: "Activity Code", width: 130, renderType: "text" },
  { key: "activityName", label: "Activity Name", width: 180, renderType: "text" },
  { key: "rcCode", label: "RC Code", width: 110, renderType: "text" },
  { key: "rcName", label: "RC Name", width: 180, renderType: "text" },
  { key: "remarks", label: "Remarks", width: 240, renderType: "text" },
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
            title: "No Transactions to Finalize",
            message: "There are no fully allocated Project Material Issue Slip records available for finalization.",
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
          title: "Finalization Load Error",
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
    const result = await useHandlePostTran(
      selectedRows,
      password,
      POSTING_DOC_CODE,
      userCode,
      setLoading,
      onClose
    );
    if (result?.success) {
      window.dispatchEvent(new CustomEvent("project-mi-finalized", {
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
          title="Finalize Project Material Issue Slip"
          btnCaption="Finalize"
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
