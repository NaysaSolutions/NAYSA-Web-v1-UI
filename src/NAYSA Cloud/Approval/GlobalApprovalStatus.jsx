import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Info,
  User,
  X,
  XCircle,
} from "lucide-react";

const EMPTY_DATA = {};

const valueOrDash = (value) => {
  const text = String(value ?? "").trim();
  return text || "-";
};

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();

const formatDocLabel = (docType) => {
  const type = String(docType || "Document").trim();
  return type || "Document";
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const rawValue = String(value).trim();
  if (!rawValue) return "-";

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDataValue = (data, key) =>
  data?.[key] ?? data?.[key.toUpperCase()] ?? data?.[key.toLowerCase()] ?? "";

const ExpandableText = ({ value, limit = 90, className = "" }) => {
  const [expanded, setExpanded] = useState(false);
  const text = valueOrDash(value);
  const shouldTruncate = text !== "-" && text.length > limit;
  const displayText =
    shouldTruncate && !expanded ? `${text.slice(0, limit).trim()}...` : text;

  return (
    <p className={className}>
      {displayText}
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="ml-1 font-semibold text-sky-600 hover:text-sky-700"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </p>
  );
};

const buildApprovalLevels = (data) =>
  [1, 2, 3, 4].map((level) => {
    const approvedDate = getDataValue(data, `app_date${level}`);
    const comment = getDataValue(data, `app_note${level}`);
    const approverName = getDataValue(data, `user_app${level}`);
    const action = String(getDataValue(data, `app_action${level}`) || "").trim().toUpperCase();
    const isRejected = action === "R";
    const isApproved = !isRejected && Boolean(String(approvedDate || "").trim());
    const requiredValue = getDataValue(data, `app_required${level}`);
    const isRequired = requiredValue === "" || requiredValue === null || requiredValue === undefined
      ? true
      : ![false, 0, "0", "N", "NA"].includes(
          typeof requiredValue === "string" ? requiredValue.trim().toUpperCase() : requiredValue,
        );

    return {
      level,
      approverName,
      approvedDate,
      comment,
      isApproved,
      isRejected,
      isRequired,
    };
  });

const normalizeMaxAppLevel = (value) => {
  const level = Number(value);
  if (!Number.isFinite(level) || level <= 0) return 4;
  return Math.min(Math.max(Math.trunc(level), 1), 4);
};

const getStatusStyle = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized.includes("disapprove") || normalized.includes("reject")) {
    return {
      wrapper: "border-red-200 bg-red-50 text-red-700",
      icon: XCircle,
    };
  }

  if (normalized.includes("approve")) {
    return {
      wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    };
  }

  return {
    wrapper: "border-slate-200 bg-slate-100 text-slate-700",
    icon: Clock3,
  };
};

const ApprovalStatusBadge = ({ status }) => {
  const statusStyle = getStatusStyle(status);
  const StatusIcon = statusStyle.icon;

  return (
    <span
      className={`inline-flex min-h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase leading-tight tracking-normal md:whitespace-nowrap ${statusStyle.wrapper}`}
    >
      <StatusIcon size={13} strokeWidth={2.2} className="shrink-0" />
      <span className="min-w-0 break-words">{valueOrDash(status)}</span>
    </span>
  );
};

const TimelineIcon = ({ isApproved, isRejected }) => (
  <div
    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm sm:h-9 sm:w-9 ${
      isRejected
        ? "bg-red-500 text-white"
        : isApproved
        ? "bg-emerald-500 text-white"
        : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
    }`}
  >
    {isRejected ? <XCircle size={17} strokeWidth={2.4} /> : isApproved ? <Check size={17} strokeWidth={2.4} /> : <User size={16} />}
  </div>
);

const ApprovalLevelCard = ({ approval, isLast }) => {
  const isApproved = approval.isApproved;
  const isRejected = approval.isRejected;

  return (
    <div className="relative grid grid-cols-[38px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[46px_minmax(0,1fr)]">
      {!isLast && (
        <div
          className={`absolute left-4 top-8 h-[calc(100%+10px)] w-0.5 sm:left-[18px] sm:top-9 ${
            isApproved ? "bg-emerald-200" : "bg-slate-200"
          }`}
        />
      )}

      <TimelineIcon isApproved={isApproved} isRejected={isRejected} />

      <div
        className={`min-w-0 rounded-lg border p-2.5 sm:p-3 ${
          isRejected
            ? "border-red-200 bg-red-50/70"
            : isApproved
            ? "border-emerald-200 bg-emerald-50/70"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="grid min-w-0 gap-2.5 md:grid-cols-[118px_125px_130px_minmax(0,1fr)_104px] md:items-start">
          <div className="min-w-0">
            <p
              className={`text-[11px] font-bold uppercase tracking-normal ${
                isApproved ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              Level {approval.level}
            </p>
            <p className="mt-0.5 text-[12px] font-medium leading-5 text-slate-900">
              {isRejected ? "Rejected" : isApproved ? "Completed" : "For Approval"}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-600">
              {isRejected ? "Rejected By" : isApproved ? "Approved By" : "Approver"}
            </p>
            <p className="mt-0.5 break-words text-[12px] font-semibold leading-5 text-slate-950">
              {valueOrDash(approval.approverName)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-600">
              {isRejected ? "Date Rejected" : isApproved ? "Date Approved" : "Date"}
            </p>
            <p className="mt-0.5 text-[12px] leading-5 text-slate-900">
              {formatDateTime(approval.approvedDate)}
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-600">Comment</p>
            <ExpandableText
              value={approval.comment}
              className="mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-5 text-slate-900"
            />
          </div>

          <div className="min-w-0 md:pt-6">
            <span
              className={`inline-flex min-h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase md:whitespace-nowrap ${
                isRejected
                  ? "bg-red-100 text-red-700"
                  : isApproved
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isRejected ? (
                <XCircle size={13} />
              ) : isApproved ? (
                <CheckCircle2 size={13} />
              ) : (
                <Clock3 size={13} />
              )}
              <span className="min-w-0 break-words md:break-normal">
                {isRejected ? "Rejected" : isApproved ? "Approved" : "Pending"}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const movementActionLabel = (row) => {
  const action = String(row?.action || "").toUpperCase();
  if (action === "REQUESTED") return Number(row?.cycle || 1) > 1 ? "Requested Again" : "Requested for Approval";
  if (action === "A" || action === "APPROVED") return "Approved";
  if (action === "R" || action === "REJECTED") return "Rejected";
  if (action === "COMMENTED") return "Comment Added";
  return action || "Approval Activity";
};

const ApprovalMovement = ({ rows = [] }) => {
  const cycles = useMemo(() => {
    const grouped = new Map();
    rows.forEach((row) => {
      const cycle = Number(row?.cycle || 1);
      if (!grouped.has(cycle)) grouped.set(cycle, []);
      grouped.get(cycle).push(row);
    });
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  }, [rows]);

  if (!cycles.length) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center">
        <History size={28} className="text-slate-300" />
        <p className="mt-2 text-[12px] font-semibold text-slate-600">No approval movement recorded yet.</p>
        <p className="text-[11px] text-slate-400">New requests and approval actions will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cycles.map(([cycle, events]) => {
        const approvedCount = events.filter((row) => ["A", "APPROVED"].includes(String(row?.action || "").toUpperCase())).length;
        const rejectedCount = events.filter((row) => ["R", "REJECTED"].includes(String(row?.action || "").toUpperCase())).length;
        const cycleStatus = rejectedCount > 0 ? "Rejected" : approvedCount > 0 ? "Approved" : "In Progress";
        return (
        <section key={cycle} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2">
            <div>
              <p className="text-[12px] font-black text-slate-800">Approval Cycle {cycle}</p>
              <p className="text-[10px] text-slate-500">
                {approvedCount} approved{rejectedCount > 0 ? ` · ${rejectedCount} rejected` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${rejectedCount > 0 ? "bg-red-100 text-red-700" : approvedCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{cycleStatus}</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Cycle {cycle}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {events.map((row, index) => {
              const rejected = ["R", "REJECTED"].includes(String(row?.action || "").toUpperCase());
              const requested = String(row?.action || "").toUpperCase() === "REQUESTED";
              return (
                <div key={`${row?.source}-${row?.trailId}-${index}`} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[32px_170px_minmax(0,1fr)_145px] sm:items-start">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${rejected ? "bg-red-100 text-red-600" : requested ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>
                    {rejected ? <XCircle size={15} /> : requested ? <FileText size={14} /> : <CheckCircle2 size={15} />}
                  </div>
                  <div>
                    <p className={`text-[11px] font-black ${rejected ? "text-red-700" : requested ? "text-blue-700" : "text-emerald-700"}`}>{movementActionLabel(row)}</p>
                    <p className="text-[10px] text-slate-500">{row?.source === "LINE" ? `Line ${valueOrDash(row?.lineNo)} · Level ${valueOrDash(row?.level)}` : row?.level > 0 ? `Document · Level ${row.level}` : "Document"}</p>
                  </div>
                  <div className="min-w-0">
                    {row?.source === "LINE" && <p className="truncate text-[11px] font-semibold text-slate-800">{valueOrDash(row?.itemCode)} · {valueOrDash(row?.itemName)}</p>}
                    <p className="text-[11px] text-slate-600">{valueOrDash(row?.userName || row?.userCode)}</p>
                    {row?.remarks && <p className="mt-0.5 text-[10px] italic text-slate-500">{row.remarks}</p>}
                  </div>
                  <p className="text-[10px] text-slate-500 sm:text-right">{formatDateTime(row?.actionDate)}</p>
                </div>
              );
            })}
          </div>
        </section>
      );})}
    </div>
  );
};

const GlobalApprovalStatus = ({
  isOpen,
  onClose,
  docType = "PR",
  docNo = "00000001",
  docDate = "05/06/2026",
  status = "Approved",
  remarks = "",
  maxAppLevel = 4,
  data = EMPTY_DATA,
  tranId = "",
  closeOnBackdrop = true,
}) => {
  const [transactionApproval, setTransactionApproval] = useState(null);
  const [activeTab, setActiveTab] = useState("current");
  const [loadedTransactionKey, setLoadedTransactionKey] = useState("");
  const transactionKey = `${String(docType).toUpperCase()}:${tranId}`;
  const requiresFreshStatus = Boolean(
    isOpen && tranId && ["PR", "PO", "JO", "CV"].includes(String(docType).toUpperCase()),
  );

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      setTransactionApproval(null);
      if (!isOpen || !tranId || !["PR", "PO", "JO", "CV"].includes(String(docType).toUpperCase())) {
        setLoadedTransactionKey("");
        return;
      }
      try {
        const response = await apiClient.get("/transactionApprovalStatus", {
          params: { docCode: String(docType).toUpperCase(), tranId },
        });
        if (active) setTransactionApproval(response?.data?.data || null);
      } catch (error) {
        console.error("Unable to load transaction approval status:", error);
        if (active) setTransactionApproval(null);
      } finally {
        if (active) setLoadedTransactionKey(transactionKey);
      }
    };
    loadStatus();
    return () => { active = false; };
  }, [isOpen, tranId, docType, transactionKey]);

  useEffect(() => {
    if (isOpen) setActiveTab("current");
  }, [isOpen, transactionKey]);

  const effectiveData = transactionApproval || data || EMPTY_DATA;
  const effectiveMaxLevel = transactionApproval?.maxAppLevel ?? maxAppLevel;
  const effectiveStatus = transactionApproval?.status || status;
  const documentLabel = formatDocLabel(docType);
  const approvalLevels = useMemo(
    () => buildApprovalLevels(effectiveData)
      .slice(0, normalizeMaxAppLevel(effectiveMaxLevel))
      .filter((approval) => approval.isRequired),
    [effectiveData, effectiveMaxLevel],
  );
  const normalizedOverallStatus = normalizeStatus(effectiveStatus);
  const isOverallApproved =
    normalizedOverallStatus.includes("approved") &&
    !normalizedOverallStatus.includes("not required");
  const hasDocumentApprovalActivity = approvalLevels.some(
    (approval) => approval.isApproved,
  );
  const isCompletedByLineApproval =
    isOverallApproved && !hasDocumentApprovalActivity;

  if (!isOpen) return null;
  if (requiresFreshStatus && loadedTransactionKey !== transactionKey) {
    return <LoadingSpinner />;
  }

  const handleBackdropClick = () => {
    if (closeOnBackdrop) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[10040] flex items-center justify-center bg-slate-950/55 p-2 sm:p-4"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <section
        className="flex max-h-[calc(100dvh-8px)] w-full max-w-[1060px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:max-h-[92vh] sm:rounded-xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-approval-status-title"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-100 px-3 py-1.5 sm:px-4">
          <div className="min-w-0">
            <h2
              id="global-approval-status-title"
              className="global-lookup-headertext-ui truncate !text-[14px] !font-black !tracking-normal text-slate-950 sm:!text-[17px]"
            >
              {documentLabel} Approval Status
            </h2>
            <p className="hidden text-[10px] font-medium text-slate-500 sm:block">
              Approval tracking for the selected transaction.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-rose-600"
            aria-label="Close approval status"
            title="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button type="button" onClick={() => setActiveTab("current")} className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold transition ${activeTab === "current" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>
            <CheckCircle2 size={14} /> Current Status
          </button>
          <button type="button" onClick={() => setActiveTab("movement")} className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-bold transition ${activeTab === "movement" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>
            <History size={14} /> Approval Movement
          </button>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto overflow-x-hidden bg-slate-50 px-2.5 py-2.5 sm:px-3 sm:py-3">
          {activeTab === "current" ? <>
          <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
            <div className="grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(170px,1fr)]">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Document No.
                </p>
                <p className="mt-0.5 break-words text-[12px] font-bold leading-5 text-slate-950">
                  {valueOrDash(docNo)}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Document Code
                </p>
                <p className="mt-0.5 text-[12px] font-bold leading-5 text-slate-950">
                  {documentLabel}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Document Date
                </p>
                <p className="mt-0.5 text-[12px] font-bold leading-5 text-slate-950">
                  {valueOrDash(docDate)}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-500">
                  Current Status
                </p>
                <div className="mt-0.5">
                  <ApprovalStatusBadge status={effectiveStatus} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
            <div className="space-y-2.5">
              <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[46px_minmax(0,1fr)]">
                <div className="relative">
                  <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm sm:h-9 sm:w-9">
                    <FileText size={16} />
                  </div>
                  <div className="absolute left-4 top-8 h-[calc(100%+10px)] w-0.5 bg-sky-100 sm:left-[18px] sm:top-9" />
                </div>

                <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-2.5 sm:p-3">
                  <div className="grid min-w-0 gap-2.5 md:grid-cols-[220px_150px_135px_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-normal text-sky-700">
                        Prepared
                      </p>
                      <p className="mt-0.5 text-[12px] font-medium leading-5 text-slate-900">
                        Document was prepared
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-600">
                        Document No.
                      </p>
                      <p className="mt-0.5 break-words text-[12px] font-semibold leading-5 text-slate-950">
                        {valueOrDash(docNo)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-600">Date</p>
                      <p className="mt-0.5 text-[12px] leading-5 text-slate-900">
                        {valueOrDash(docDate)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-600">
                        Remarks
                      </p>
                      <ExpandableText
                        value={remarks}
                        className="mt-0.5 whitespace-pre-wrap break-words text-[12px] leading-5 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isCompletedByLineApproval ? (
                <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-2.5 sm:grid-cols-[46px_minmax(0,1fr)]">
                  <TimelineIcon isApproved />
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 sm:p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase text-emerald-700">
                          Line Item Approval
                        </p>
                        <p className="mt-0.5 text-[12px] font-semibold leading-5 text-slate-950">
                          All required line items have completed approval.
                        </p>
                      </div>
                      <span className="inline-flex min-h-6 items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        <CheckCircle2 size={13} /> Approved
                      </span>
                    </div>
                    <div className="mt-2.5 grid gap-2 border-t border-emerald-200/80 pt-2.5 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Approved By</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-900">{valueOrDash(effectiveData?.lastApproval?.approvedBy)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Last Approval</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-900">{formatDateTime(effectiveData?.lastApproval?.approvedDate)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-500">Approval Cycle</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-900">Cycle {effectiveData?.lastApproval?.cycle || 1} · {effectiveData?.lastApproval?.approvedLineCount || 0} item(s)</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                approvalLevels.map((approval, index) => (
                  <ApprovalLevelCard
                    key={approval.level}
                    approval={approval}
                    isLast={index === approvalLevels.length - 1}
                  />
                ))
              )}
            </div>

            <div className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-600">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p className="min-w-0">
                {isCompletedByLineApproval
                  ? "The required line-item approval process is complete."
                  : "The approval process will continue until the final approval level is completed."}
              </p>
            </div>
          </div>
          </> : <ApprovalMovement rows={effectiveData?.approvalMovement || []} />}
        </div>
      </section>
    </div>
  );
};

export default GlobalApprovalStatus;
