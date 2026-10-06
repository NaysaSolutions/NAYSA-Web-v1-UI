import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiClient, fetchData, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  useSwalProceedConfirm,
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalSuccessAlert
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import GlobalApprovalModal from "@/NAYSA Cloud/Approval/GlobaApprovalModal.jsx";

const ENDPOINT = "getCVApproval";
const APPROVE_ENDPOINT = "approveCV";
const EMPTY_PARAMS = {};
const CV_APPROVAL_COLUMNS = [
  { key: "branchCode", label: "Branch", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "cvNo", label: "CV No.", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "cvDate", label: "CV Date", classNames: "text-left", hidden: false, renderType: "date", renderFormat: "MM/DD/YYYY" },
  { key: "payeeCode", label: "Payee Code", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "payeeName", label: "Payee Name", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "bankCode", label: "Bank Code", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "bankAcctName", label: "Bank Account Name", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "checkNo", label: "Check No.", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "checkDate", label: "Check Date", classNames: "text-left", hidden: false, renderType: "date", renderFormat: "MM/DD/YYYY" },
  { key: "currCode", label: "Currency", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "amount", label: "Amount", classNames: "text-right", hidden: false, renderType: "number", renderFormat: "N2" },
  { key: "remarks", label: "Remarks", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "preparedBy", label: "Prepared By", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "userApp1", label: "Approver 1", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "appDate1", label: "Approval Date 1", classNames: "text-left", hidden: false, renderType: "date", renderFormat: "MM/DD/YYYY" },
  { key: "appNote1", label: "Approval Note 1", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "userApp2", label: "Approver 2", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "appDate2", label: "Approval Date 2", classNames: "text-left", hidden: false, renderType: "date", renderFormat: "MM/DD/YYYY" },
  { key: "appNote2", label: "Approval Note 2", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "userApp3", label: "Approver 3", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "appDate3", label: "Approval Date 3", classNames: "text-left", hidden: false, renderType: "date", renderFormat: "MM/DD/YYYY" },
  { key: "appNote3", label: "Approval Note 3", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "userApp4", label: "Approver 4", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "appDate4", label: "Approval Date 4", classNames: "text-left", hidden: false, renderType: "date", renderFormat: "MM/DD/YYYY" },
  { key: "appNote4", label: "Approval Note 4", classNames: "text-left", hidden: false, renderType: "text" },
  { key: "viewDocument", label: "View Document", classNames: "text-left", hidden: true, renderType: "text" },
];

const getDirectProfileImage = (row) =>
  row?.profileImageUrl ||
  row?.PROFILE_IMAGE_URL ||
  row?.profileImage ||
  row?.PROFILE_IMAGE ||
  row?.profilePhoto ||
  row?.PROFILE_PHOTO ||
  row?.userPhoto ||
  row?.USER_PHOTO ||
  row?.photo ||
  row?.PHOTO ||
  row?.picture ||
  row?.PICTURE ||
  "";

const buildProfileImageUrl = (userCode, directImageSrc = "") => {
  if (directImageSrc) return directImageSrc;
  if (!userCode) return "";

  const apiBaseUrl = (apiClient?.defaults?.baseURL || "").replace(/\/$/, "");
  if (!apiBaseUrl) return "";

  const companyDb =
    apiClient?.defaults?.headers?.common?.["X-Company-DB"] || "";
  const params = new URLSearchParams();

  if (companyDb) params.set("company", companyDb);
  params.set("t", Date.now().toString());

  return `${apiBaseUrl}/user/profile-image/${encodeURIComponent(
    userCode,
  )}?${params.toString()}`;
};

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

  let rows = [];

  if (rawResult) {
    const parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;

    if (Array.isArray(parsed)) {
      rows = parsed?.[0]?.dt1 ?? parsed;
    } else {
      rows = parsed?.dt1 ?? parsed?.data ?? [];
    }
  } else {
    rows = Array.isArray(response?.data) ? response.data : [];
  }

  return Array.isArray(rows)
    ? rows.filter((row) => row && Object.keys(row).length > 0 && row.tranId)
    : [];
};

const buildApprovePayload = (
  rows,
  userCode,
  userName,
  appLevel,
  mode = "Approved",
  reason = "",
) => ({
  tranIds: rows.map((row) => row?.tranId).filter(Boolean).join(","),
  userCode,
  userName,
  appLevel,
  mode,
  reason,
  url: `${window.location.origin}/?page=CVApprovalModal`,
});

const getCVDisplayNo = (row, index) =>
  String(row?.cvNo || `CV ${index + 1}`);

const buildApprovedCVMessage = (approvalRows) => {
  const limit = 5;

  const visibleRows = approvalRows.slice(0, limit);

  const approvedList = visibleRows
    .map((row, index) => `${index + 1}. ${getCVDisplayNo(row, index)}`)
    .join("\n");

  const remainingCount = approvalRows.length - limit;

  const moreText =
    approvalRows.length > limit ? `\n...and +${remainingCount} more` : "";

  return `The following CV${
    approvalRows.length > 1 ? "s have" : " has"
  } been approved:\n${approvedList}${moreText}`;
};

const buildDisapprovedCVMessage = (approvalRows) => {
  const limit = 5;

  const visibleRows = approvalRows.slice(0, limit);

  const disapprovedList = visibleRows
    .map((row, index) => `${index + 1}. ${getCVDisplayNo(row, index)}`)
    .join("\n");

  const remainingCount = approvalRows.length - limit;

  const moreText =
    approvalRows.length > limit ? `\n...and +${remainingCount} more` : "";

  return `The following CV${
    approvalRows.length > 1 ? "s have" : " has"
  } been disapproved:\n${disapprovedList}${moreText}`;
};

const buildCommentedCVMessage = (approvalRows) => {
  const limit = 5;

  const visibleRows = approvalRows.slice(0, limit);

  const commentedList = visibleRows
    .map((row, index) => `${index + 1}. ${getCVDisplayNo(row, index)}`)
    .join("\n");

  const remainingCount = approvalRows.length - limit;

  const moreText =
    approvalRows.length > limit ? `\n...and +${remainingCount} more` : "";

  return `Approver's note has been applied to the following CV${
    approvalRows.length > 1 ? "s" : ""
  }:\n${commentedList}${moreText}`;
};

const CVApprovalModal = ({
  isOpen,
  approverName,
  department,
  userCode,
  params = EMPTY_PARAMS,
  detailRows,
  detailColumns,
  transactionLabel = "Check Voucher Approval",
  documentName = "Check Voucher",
  onDataLoaded,
  onViewDocument,
  onViewAttachment,
  onClose,
  ...modalProps
}) => {
  const { currentUserRow } = useAuth();
  const loadedColumnsRef = useRef(false);
  const noApprovalAlertShownRef = useRef(false);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const resolvedUserCode = userCode || currentUserRow?.userCode || "";
  const resolvedUserName = currentUserRow?.userName || "";

  const requestParams = params || EMPTY_PARAMS;
  const requestParamsKey = useMemo(
    () => JSON.stringify(requestParams),
    [requestParams],
  );
  const resolvedColumns = Array.isArray(detailColumns)
    ? detailColumns
    : columns.length
      ? columns
      : CV_APPROVAL_COLUMNS;
  const effectiveApproverName = approverName || currentUserRow?.userName ||  "";
  const effectiveApproverImageSrc = useMemo(
    () => buildProfileImageUrl(resolvedUserCode, getDirectProfileImage(currentUserRow)),
    [currentUserRow, resolvedUserCode],
  );
  const effectiveDepartment = department || currentUserRow?.rcName ||  "";
  const approvalLevel = currentUserRow?.cvAppLevel ||  "";
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
      console.error("Load CV approval columns failed:", error);
      loadedColumnsRef.current = true;
    }
  }, [detailColumns]);

  const fetchApprovalRows = useCallback(
    async () => {
      if (!resolvedUserCode) {
        return { approvalRows: [], response: null };
      }

      const payload = {
        json_data: {
          userCode: resolvedUserCode,
        }
      };

      const response = await fetchData(ENDPOINT, {
        PARAMS: JSON.stringify(payload),
      });

      const approvalRows = parseApprovalRows(response);
      return { approvalRows, response };
    },
    [resolvedUserCode, requestParamsKey],
  );

  const showNoApprovalAvailableAlert = useCallback(() => {
    if (noApprovalAlertShownRef.current) return;

    noApprovalAlertShownRef.current = true;
    useSwalInfoAlert(
      "CV Approval",
      "There is no CV for approval available.",
    );
    onClose?.();
  }, [onClose]);

  const reloadApprovalRows = useCallback(async ({ showLoading = true } = {}) => {
    if (Array.isArray(detailRows)) {
      setRows(detailRows);
      if (detailRows.length) {
        noApprovalAlertShownRef.current = false;
        setIsInitialLoadComplete(true);
      } else {
        setIsInitialLoadComplete(false);
        showNoApprovalAvailableAlert();
      }
      return detailRows;
    }

    if (!resolvedUserCode) {
      return [];
    }

    if (showLoading) setIsLoading(true);

    try {
      const { approvalRows, response } = await fetchApprovalRows();
      const nextRows = Array.isArray(approvalRows) ? approvalRows : [];
      setRows(nextRows);
      onDataLoaded?.(approvalRows, response);
      if (nextRows.length) {
        noApprovalAlertShownRef.current = false;
        setIsInitialLoadComplete(true);
      } else {
        setIsInitialLoadComplete(false);
        showNoApprovalAvailableAlert();
      }
      return nextRows;
    } catch (error) {
      console.error("Reload CV approval failed:", error);
      setRows([]);
      useSwalErrorAlert(
        "CV Approval",
        error?.response?.data?.message ||
          error?.message ||
          "Unable to reload CV approval detail.",
      );
      return [];
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [detailRows, fetchApprovalRows, onDataLoaded, resolvedUserCode, showNoApprovalAvailableAlert]);

  const handleApproveRows = useCallback(
    async (approvalRows) => {
      const targetRows = Array.isArray(approvalRows)
        ? approvalRows
        : [approvalRows].filter(Boolean);
      const approvalCount = targetRows.length;
      const payload = buildApprovePayload(
        targetRows,
        resolvedUserCode,
        resolvedUserName,
        approvalLevel,
        "Approved",
      );

      if (!payload.tranIds) return;

      const confirm = await useSwalProceedConfirm(
        "Approve CV?",
        `Approve ${approvalCount} selected transaction${
          approvalCount > 1 ? "s" : ""
        }?`,
        "Yes, approve",
      );

      if (!confirm?.isConfirmed) return;

      setIsApproving(true);

      try {
        const finalPayload = {
          json_data: payload
        };

          //console.log("Approve payload:", JSON.stringify(finalPayload));
        await postRequest(APPROVE_ENDPOINT, finalPayload);
        setIsApproving(false);

        await useSwalSuccessAlert(
          "CV Approved",
          buildApprovedCVMessage(targetRows),
        );
        await reloadApprovalRows({ showLoading: false });
      } catch (error) {
        console.error("Approve CV failed:", error);
        useSwalErrorAlert(
          "CV Approval",
          error?.response?.data?.message ||
            error?.message ||
            "Unable to approve selected CV transaction.",
        );
      } finally {
        setIsApproving(false);
      }
    },
    [approvalLevel, reloadApprovalRows, resolvedUserCode, resolvedUserName],
  );

  const handleDisapproveRows = useCallback(
    async (approvalRows, reason) => {
      const targetRows = Array.isArray(approvalRows)
        ? approvalRows
        : [approvalRows].filter(Boolean);
      const trimmedReason = String(reason || "").trim();
      const payload = buildApprovePayload(
        targetRows,
        resolvedUserCode,
        resolvedUserName,
        approvalLevel,
        "Disapprove",
        trimmedReason,
      );

      if (!payload.tranIds || !trimmedReason) return false;

      setIsApproving(true);

      try {
        const finalPayload = {
          json_data: payload
        };

        //console.log("Disapprove payload:", JSON.stringify(finalPayload));
        await postRequest(APPROVE_ENDPOINT, finalPayload);
        setIsApproving(false);

        await useSwalSuccessAlert(
          "CV Disapproved",
          buildDisapprovedCVMessage(targetRows),
        );
        await reloadApprovalRows({ showLoading: false });
        return true;
      } catch (error) {
        console.error("Disapprove CV failed:", error);
        useSwalErrorAlert(
          "CV Approval",
          error?.response?.data?.message ||
            error?.message ||
            "Unable to disapprove selected CV transaction.",
        );
        return false;
      } finally {
        setIsApproving(false);
      }
    },
    [approvalLevel, reloadApprovalRows, resolvedUserCode, resolvedUserName],
  );

  const handleCommentRows = useCallback(
    async (approvalRows, note) => {
      const targetRows = Array.isArray(approvalRows)
        ? approvalRows
        : [approvalRows].filter(Boolean);
      const trimmedNote = String(note || "").trim();
      const payload = buildApprovePayload(
        targetRows,
        resolvedUserCode,
        resolvedUserName,
        approvalLevel,
        "Comment",
        trimmedNote,
      );

      if (!payload.tranIds || !trimmedNote) return false;

      setIsApproving(true);

      try {
        const finalPayload = {
          json_data: payload
        };
        //console.log("Comment payload:", JSON.stringify(finalPayload));
        await postRequest(APPROVE_ENDPOINT, finalPayload);
        setIsApproving(false);

        await useSwalSuccessAlert(
          "Approver's Note Applied",
          buildCommentedCVMessage(targetRows),
        );
        await reloadApprovalRows({ showLoading: false });
        return true;
      } catch (error) {
        console.error("Apply CV approver note failed:", error);
        useSwalErrorAlert(
          "CV Approval",
          error?.response?.data?.message ||
            error?.message ||
            "Unable to apply approver's note to selected CV transaction.",
        );
        return false;
      } finally {
        setIsApproving(false);
      }
    },
    [approvalLevel, reloadApprovalRows, resolvedUserCode, resolvedUserName],
  );

  useEffect(() => {
    if (!isOpen) {
      noApprovalAlertShownRef.current = false;
      setIsInitialLoadComplete(false);
      setRows([]);
      return;
    }

    if (!resolvedUserCode) return;

    let alive = true;

    (async () => {
      setIsLoading(true);
      setIsInitialLoadComplete(false);
      setRows([]);

      try {
        await loadColumns();

        if (!alive) return;

        if (Array.isArray(detailRows)) {
          setRows(detailRows);
          if (detailRows.length) {
            noApprovalAlertShownRef.current = false;
            setIsInitialLoadComplete(true);
          } else {
            showNoApprovalAvailableAlert();
          }
          return;
        }

        const { approvalRows, response } = await fetchApprovalRows();
        if (!alive) return;
        const nextRows = Array.isArray(approvalRows) ? approvalRows : [];
        setRows(nextRows);
        onDataLoaded?.(approvalRows, response);
        if (nextRows.length) {
          noApprovalAlertShownRef.current = false;
          setIsInitialLoadComplete(true);
        } else {
          showNoApprovalAvailableAlert();
        }
      } catch (error) {
        console.error("Fetch CV approval failed:", error);
        if (alive) {
          setRows([]);
          setIsInitialLoadComplete(true);
          useSwalErrorAlert(
            "CV Approval",
            error?.response?.data?.message ||
              error?.message ||
              "Unable to load CV approval detail.",
          );
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    isOpen,
    resolvedUserCode,
    detailRows,
    fetchApprovalRows,
    loadColumns,
    onDataLoaded,
    showNoApprovalAvailableAlert,
  ]);

  if (!isOpen) return null;

  if (noApprovalAlertShownRef.current && !rows.length) return null;

  if (!resolvedUserCode || !isInitialLoadComplete || (isLoading && !rows.length)) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <GlobalApprovalModal
        {...modalProps}
        isOpen={isOpen}
        onClose={onClose}
        title={transactionLabel}
        transactionLabel={transactionLabel}
        documentName={documentName}
        approverName={effectiveApproverName}
        approverImageSrc={effectiveApproverImageSrc}
        approvalLevel={approvalLevel}
        department={effectiveDepartment}
        detailColumns={effectiveColumns}
        detailRows={rows}
        isDetailLoading={isLoading}
        isProcessing={isApproving}
        onViewDocument={onViewDocument}
        onViewAttachment={onViewAttachment}
        onReloadRecords={reloadApprovalRows}
        onRowApprove={handleApproveRows}
        onRowDisapprove={handleDisapproveRows}
        onRowComment={handleCommentRows}
        onApproveSelected={handleApproveRows}
        onRejectSelected={handleDisapproveRows}
        onCommentSelected={handleCommentRows}
      />

      {isApproving && <LoadingSpinner />}
    </>
  );
};

export default CVApprovalModal;

