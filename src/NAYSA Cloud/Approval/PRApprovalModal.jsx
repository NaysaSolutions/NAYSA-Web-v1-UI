import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import GlobalApprovalModal from "@/NAYSA Cloud/Approval/GlobaApprovalModal.jsx";

const ENDPOINT = "getPRApproval";
const EMPTY_PARAMS = {};

const getColumnSearchText = (column) =>
  [
    column?.key,
    column?.dataField,
    column?.field,
    column?.name,
    column?.label,
    column?.header,
    column?.headerName,
    column?.caption,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

const shouldHideApprovalInfoColumn = (column, approvalLevel) => {
  const level = Number(approvalLevel);
  if (!Number.isFinite(level) || level < 1) return false;

  const columnText = getColumnSearchText(column);

  return [2, 3, 4].some((approvalInfoLevel) => {
    if (approvalInfoLevel <= level) return false;

    return [
      `approvalinfo${approvalInfoLevel}`,
      `appinfo${approvalInfoLevel}`,
      `approvaluser${approvalInfoLevel}`,
      `userapp${approvalInfoLevel}`,
      `approvaldate${approvalInfoLevel}`,
      `appdate${approvalInfoLevel}`,
      `approvalnote${approvalInfoLevel}`,
      `appnote${approvalInfoLevel}`,
    ].some((pattern) => columnText.includes(pattern));
  });
};

const parseApprovalRows = (response) => {
  const rawResult = response?.data?.[0]?.result;

  if (rawResult) {
    const parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
    if (Array.isArray(parsed)) return parsed?.[0]?.dt1 ?? parsed;
    return parsed?.dt1 ?? parsed?.data ?? [];
  }

  return Array.isArray(response?.data) ? response.data : [];
};

const PRApprovalModal = ({
  isOpen,
  approverName,
  department,
  params = EMPTY_PARAMS,
  detailRows,
  detailColumns,
  transactionLabel = "Purchase Requisition Approval",
  documentName = "Purchase Requisition",
  onDataLoaded,
  onViewDocument,
  onViewAttachment,
  ...modalProps
}) => {
  const { currentUserRow } = useAuth();
  const loadedColumnsRef = useRef(false);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const requestParams = params || EMPTY_PARAMS;
  const requestParamsKey = useMemo(
    () => JSON.stringify(requestParams),
    [requestParams],
  );
  const resolvedColumns = Array.isArray(detailColumns) ? detailColumns : columns;
  const effectiveApproverName = approverName || currentUserRow?.userName || "";
  const effectiveDepartment = department || currentUserRow?.rcName || "";
  const approvalLevel = currentUserRow?.prAppLevel || "";
  const effectiveColumns = useMemo(
    () =>
      resolvedColumns.filter(
        (column) => !shouldHideApprovalInfoColumn(column, approvalLevel),
      ),
    [resolvedColumns, approvalLevel],
  );

  const loadColumns = useCallback(async () => {
    if (Array.isArray(detailColumns) || loadedColumnsRef.current) return;

    try {
      const selectedColumns = await useSelectedHSColConfig(ENDPOINT);
      setColumns(Array.isArray(selectedColumns) ? selectedColumns : []);
      loadedColumnsRef.current = true;
    } catch (error) {
      console.error("Load PR approval columns failed:", error);
      loadedColumnsRef.current = true;
    }
  }, [detailColumns]);

  const fetchApprovalRows = useCallback(
    async () => {
      const response = await fetchData(ENDPOINT, {
        PARAMS: requestParamsKey,
      });

      const approvalRows = parseApprovalRows(response);
      return { approvalRows, response };
    },
    [requestParamsKey],
  );

  const reloadApprovalRows = useCallback(async () => {
    if (Array.isArray(detailRows)) {
      setRows(detailRows);
      return;
    }

    setIsLoading(true);

    try {
      const { approvalRows, response } = await fetchApprovalRows();
      setRows(Array.isArray(approvalRows) ? approvalRows : []);
      onDataLoaded?.(approvalRows, response);
    } catch (error) {
      console.error("Reload PR approval failed:", error);
      setRows([]);
      useSwalErrorAlert(
        "PR Approval",
        error?.response?.data?.message ||
          error?.message ||
          "Unable to reload PR approval detail.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [detailRows, fetchApprovalRows, onDataLoaded]);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      setIsLoading(true);

      try {
        await loadColumns();

        if (!alive) return;

        if (Array.isArray(detailRows)) {
          setRows(detailRows);
          return;
        }

        const { approvalRows, response } = await fetchApprovalRows();
        if (!alive) return;
        setRows(Array.isArray(approvalRows) ? approvalRows : []);
        onDataLoaded?.(approvalRows, response);
      } catch (error) {
        console.error("Fetch PR approval failed:", error);
        if (alive) {
          setRows([]);
          useSwalErrorAlert(
            "PR Approval",
            error?.response?.data?.message ||
              error?.message ||
              "Unable to load PR approval detail.",
          );
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, detailRows, fetchApprovalRows, loadColumns]);

  return (
    <GlobalApprovalModal
      {...modalProps}
      isOpen={isOpen}
      title={transactionLabel}
      transactionLabel={transactionLabel}
      documentName={documentName}
      approverName={effectiveApproverName}
      approvalLevel={approvalLevel}
      department={effectiveDepartment}
      detailColumns={effectiveColumns}
      detailRows={rows}
      isDetailLoading={isLoading}
      onViewDocument={onViewDocument}
      onViewAttachment={onViewAttachment}
      onReloadRecords={reloadApprovalRows}
    />
  );
};

export default PRApprovalModal;
