import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Files,
  History,
  Info,
  ListChecks,
  User,
  XCircle,
} from "lucide-react";

const EMPTY_DATA = {};
const TABS = [
  { key: "current", label: "Current Status", icon: CheckCircle2 },
  { key: "movement", label: "Approval Movement", icon: History },
];

const TONES = {
  blue: {
    tile: "bg-blue-50 text-blue-600",
    border: "border-blue-100",
    text: "text-blue-700",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    accent: "border-l-blue-500",
    solid: "bg-blue-600 text-white",
    line: "bg-blue-200",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600",
    border: "border-violet-100",
    text: "text-violet-700",
  },
  emerald: {
    tile: "bg-emerald-50 text-emerald-600",
    border: "border-emerald-100",
    text: "text-emerald-700",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    accent: "border-l-emerald-500",
    solid: "bg-emerald-500 text-white",
    line: "bg-emerald-200",
  },
  red: {
    tile: "bg-red-50 text-red-600",
    border: "border-red-100",
    text: "text-red-700",
    badge: "border-red-200 bg-red-50 text-red-700",
    accent: "border-l-red-500",
    solid: "bg-red-500 text-white",
    line: "bg-slate-200",
  },
  amber: {
    tile: "bg-amber-50 text-amber-600",
    border: "border-amber-100",
    text: "text-amber-700",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    accent: "border-l-amber-400",
    solid: "bg-amber-500 text-white",
    line: "bg-slate-200",
  },
  slate: {
    tile: "bg-slate-100 text-slate-600",
    border: "border-slate-200",
    text: "text-slate-700",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    accent: "border-l-slate-300",
    solid: "bg-white text-slate-400 ring-1 ring-slate-200",
    line: "bg-slate-200",
  },
};

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
          className="ml-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
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
    return { tone: TONES.red, icon: XCircle };
  }

  if (normalized.includes("approve")) {
    return { tone: TONES.emerald, icon: CheckCircle2 };
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("for approval") ||
    normalized.includes("progress")
  ) {
    return { tone: TONES.amber, icon: Clock3 };
  }

  return { tone: TONES.slate, icon: Clock3 };
};

const StatusPill = ({ tone, icon: Icon, children }) => (
  <span
    className={`inline-flex min-h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase leading-tight tracking-wide md:whitespace-nowrap ${tone.badge}`}
  >
    {Icon && <Icon size={12} strokeWidth={2.2} className="shrink-0" />}
    <span className="min-w-0 break-words">{children}</span>
  </span>
);

const FieldLabel = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
    {children}
  </p>
);

const Field = ({ label, children, className = "" }) => (
  <div className={`min-w-0 ${className}`}>
    <FieldLabel>{label}</FieldLabel>
    <div className="mt-0.5 break-words text-[12px] font-semibold leading-5 text-slate-900">
      {children}
    </div>
  </div>
);

const SummaryCard = ({ icon: Icon, label, tone, className = "", children }) => (
  <div
    className={`group flex min-w-0 items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 shadow-md shadow-slate-900/[0.06] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${tone.border} ${className}`}
  >
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100 ${tone.tile}`}>
      <Icon size={18} strokeWidth={2} />
    </div>
    <div className="min-w-0 flex-1">
      <div className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-0.5 min-w-0">{children}</div>
    </div>
  </div>
);

const getLevelState = (approval, isCurrent) => {
  if (approval.isRejected) {
    return { tone: TONES.red, title: "Rejected", badge: "Rejected", icon: XCircle, byLabel: "Rejected By", dateLabel: "Date Rejected" };
  }
  if (approval.isApproved) {
    return { tone: TONES.emerald, title: "Completed", badge: "Approved", icon: CheckCircle2, byLabel: "Approved By", dateLabel: "Date Approved" };
  }
  if (isCurrent) {
    return { tone: TONES.blue, title: "Awaiting Approval", badge: "Current", icon: Clock3, byLabel: "Approver", dateLabel: "Date" };
  }
  return { tone: TONES.amber, title: "For Approval", badge: "Pending", icon: Clock3, byLabel: "Approver", dateLabel: "Date" };
};

const TimelineStep = ({ marker, markerClass, lineClass, isLast, accentClass, children }) => (
  <li className="relative flex gap-3">
    {!isLast && (
      <span
        aria-hidden="true"
        className={`absolute -bottom-3 left-[15px] top-8 w-0.5 sm:left-[17px] sm:top-9 ${lineClass}`}
      />
    )}
    <div
      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm sm:h-9 sm:w-9 ${markerClass}`}
    >
      {marker}
    </div>
    <div
      className={`min-w-0 flex-1 rounded-lg border border-l-4 border-slate-200 bg-white px-3 py-2.5 ${accentClass}`}
    >
      {children}
    </div>
  </li>
);

const ApprovalLevelCard = ({ approval, isLast, isCurrent }) => {
  const state = getLevelState(approval, isCurrent);
  const marker = approval.isRejected ? (
    <XCircle size={17} strokeWidth={2.4} />
  ) : approval.isApproved ? (
    <Check size={17} strokeWidth={2.6} />
  ) : (
    <User size={16} />
  );
  const markerClass = approval.isRejected || approval.isApproved
    ? state.tone.solid
    : isCurrent
    ? "bg-blue-50 text-blue-600 ring-2 ring-blue-500"
    : TONES.slate.solid;

  return (
    <TimelineStep
      marker={marker}
      markerClass={markerClass}
      lineClass={approval.isApproved ? TONES.emerald.line : TONES.slate.line}
      accentClass={state.tone.accent}
      isLast={isLast}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-wide ${state.tone.text}`}>
            Level {approval.level}
          </p>
          <p className="text-[12px] font-bold leading-5 text-slate-900">{state.title}</p>
        </div>
        <StatusPill tone={state.tone} icon={state.icon}>
          {state.badge}
        </StatusPill>
      </div>

      <div className="mt-2 grid gap-2.5 border-t border-slate-100 pt-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <Field label={state.byLabel}>{valueOrDash(approval.approverName)}</Field>
        <Field label={state.dateLabel}>
          <span className="font-medium">{formatDateTime(approval.approvedDate)}</span>
        </Field>
        <Field label="Comment" className="sm:col-span-2 lg:col-span-1">
          <ExpandableText
            value={approval.comment}
            className="whitespace-pre-wrap break-words font-medium text-slate-700"
          />
        </Field>
      </div>
    </TimelineStep>
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

const getMovementTone = (row) => {
  const action = String(row?.action || "").toUpperCase();
  if (["R", "REJECTED"].includes(action)) return { tone: TONES.red, icon: XCircle };
  if (action === "REQUESTED") return { tone: TONES.blue, icon: FileText };
  if (action === "COMMENTED") return { tone: TONES.slate, icon: Info };
  return { tone: TONES.emerald, icon: CheckCircle2 };
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
      <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <History size={22} />
        </div>
        <p className="mt-2 text-[12px] font-bold text-slate-700">No approval movement recorded yet.</p>
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
        const cycleTone = rejectedCount > 0 ? TONES.red : approvedCount > 0 ? TONES.emerald : TONES.amber;

        return (
          <section key={cycle} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[12px] font-bold text-blue-700">
                  {cycle}
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-slate-900">Approval Cycle {cycle}</p>
                  <p className="text-[10px] font-medium text-slate-500">
                    {events.length} event{events.length === 1 ? "" : "s"} · {approvedCount} approved
                    {rejectedCount > 0 ? ` · ${rejectedCount} rejected` : ""}
                  </p>
                </div>
              </div>
              <StatusPill tone={cycleTone}>{cycleStatus}</StatusPill>
            </div>

            <ul className="divide-y divide-slate-100">
              {events.map((row, index) => {
                const { tone, icon: EventIcon } = getMovementTone(row);
                const isLine = row?.source === "LINE";

                return (
                  <li
                    key={`${row?.source}-${row?.trailId}-${index}`}
                    className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-2.5 gap-y-1 px-3 py-2.5 transition-colors hover:bg-slate-50 sm:grid-cols-[28px_170px_minmax(0,1fr)_140px] sm:items-start"
                  >
                    <div className={`row-span-2 flex h-7 w-7 items-center justify-center rounded-full sm:row-span-1 ${tone.tile}`}>
                      <EventIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[11px] font-bold ${tone.text}`}>{movementActionLabel(row)}</p>
                      <p className="text-[10px] font-medium text-slate-500">
                        {isLine
                          ? `Line ${valueOrDash(row?.lineNo)} · Level ${valueOrDash(row?.level)}`
                          : row?.level > 0
                          ? `Document · Level ${row.level}`
                          : "Document"}
                      </p>
                    </div>
                    <div className="min-w-0 sm:col-auto">
                      {isLine && (
                        <p className="truncate text-[11px] font-semibold text-slate-800">
                          {valueOrDash(row?.itemCode)} · {valueOrDash(row?.itemName)}
                        </p>
                      )}
                      <p className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                        <User size={11} className="shrink-0 text-slate-400" />
                        <span className="truncate">{valueOrDash(row?.userName || row?.userCode)}</span>
                      </p>
                      {row?.remarks && (
                        <p className="mt-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] italic text-slate-600">
                          {row.remarks}
                        </p>
                      )}
                    </div>
                    <p className="col-start-2 text-[10px] font-medium text-slate-400 sm:col-start-auto sm:text-right">
                      {formatDateTime(row?.actionDate)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
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
  const closeButtonRef = useRef(null);
  const tabRefs = useRef({});
  const transactionKey = `${String(docType).toUpperCase()}:${tranId}`;
  const requiresFreshStatus = Boolean(
    isOpen && tranId && ["PR", "PO", "JO", "CV"].includes(String(docType).toUpperCase()),
  );
  const isReady = !requiresFreshStatus || loadedTransactionKey === transactionKey;

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

  // Close on Escape while the dialog is open.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Move focus into the dialog when it renders and restore it on close.
  useEffect(() => {
    if (!isOpen || !isReady) return undefined;
    const previouslyFocused = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [isOpen, isReady]);

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
  const movementRows = effectiveData?.approvalMovement || [];

  const completedLevelCount = approvalLevels.filter((approval) => approval.isApproved).length;
  const hasRejectedLevel = approvalLevels.some((approval) => approval.isRejected);
  const currentLevelIndex = isOverallApproved || hasRejectedLevel
    ? -1
    : approvalLevels.findIndex((approval) => !approval.isApproved);
  const progressPercent = isCompletedByLineApproval
    ? 100
    : approvalLevels.length
    ? Math.round((completedLevelCount / approvalLevels.length) * 100)
    : 0;
  const progressTone = hasRejectedLevel
    ? TONES.red
    : progressPercent === 100
    ? TONES.emerald
    : TONES.blue;
  const statusStyle = getStatusStyle(effectiveStatus);

  if (!isOpen) return null;
  if (!isReady) {
    return <LoadingSpinner />;
  }

  const handleBackdropClick = () => {
    if (closeOnBackdrop) onClose?.();
  };

  const handleTabKeyDown = (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.key === activeTab);
    const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    const nextKey = TABS[nextIndex].key;
    setActiveTab(nextKey);
    tabRefs.current[nextKey]?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-[10040] flex items-center justify-center bg-slate-900/40 p-2 md:p-4"
      onMouseDown={handleBackdropClick}
      role="presentation"
    >
      <section
        className="flex max-h-[calc(100dvh-16px)] w-full max-w-[1024px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:max-h-[92vh] md:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-approval-status-title"
      >
        {/* Header — matches GlobalApprovalModal */}
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 py-0.5 md:py-1">
          <div className="flex min-w-0 items-center gap-2 pl-3 md:pl-4">
            <h2
              id="global-approval-status-title"
              className="global-lookup-headertext-ui truncate !text-[15px] md:!text-[18px]"
            >
              {documentLabel} Approval Status
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="mr-1 rounded-md p-1.5 text-slate-400 transition-colors hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 md:mr-2 md:p-2"
            aria-label="Close approval status"
            title="Close (Esc)"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50">
          {/* Document summary */}
          <section className="px-2 pt-2 md:px-4 md:pt-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-[repeat(3,minmax(0,0.85fr))_minmax(0,1.15fr)_minmax(0,1.3fr)]">
              <SummaryCard icon={FileText} label="Document No." tone={TONES.blue}>
                <p className="break-words text-[13px] font-bold leading-5 text-slate-900">
                  {valueOrDash(docNo)}
                </p>
              </SummaryCard>

              <SummaryCard icon={Files} label="Document Code" tone={TONES.violet}>
                <p className="text-[13px] font-bold leading-5 text-slate-900">{documentLabel}</p>
              </SummaryCard>

              <SummaryCard icon={CalendarDays} label="Document Date" tone={TONES.slate}>
                <p className="text-[13px] font-bold leading-5 text-slate-900">{valueOrDash(docDate)}</p>
              </SummaryCard>

              <SummaryCard icon={statusStyle.icon} label="Current Status" tone={statusStyle.tone}>
                <StatusPill tone={statusStyle.tone}>{valueOrDash(effectiveStatus)}</StatusPill>
              </SummaryCard>

              <SummaryCard
                icon={ListChecks}
                label="Approval Progress"
                tone={progressTone}
                className="col-span-2 lg:col-span-1"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-[13px] font-bold leading-5 ${progressTone.text}`}>
                    {isCompletedByLineApproval
                      ? "Line items complete"
                      : `${completedLevelCount} of ${approvalLevels.length} level${approvalLevels.length === 1 ? "" : "s"}`}
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400">{progressPercent}%</span>
                </div>
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressPercent}
                  aria-label="Approval progress"
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      hasRejectedLevel ? "bg-red-500" : progressPercent === 100 ? "bg-emerald-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </SummaryCard>
            </div>
          </section>

          {/* Tabs */}
          <div className="sticky top-0 z-20 mt-2 border-b border-slate-200 bg-slate-50/95 px-2 backdrop-blur md:mt-3 md:px-4">
            <div role="tablist" aria-label="Approval status views" className="flex gap-4" onKeyDown={handleTabKeyDown}>
              {TABS.map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    ref={(node) => { tabRefs.current[tab.key] = node; }}
                    type="button"
                    role="tab"
                    id={`approval-status-tab-${tab.key}`}
                    aria-selected={isActive}
                    aria-controls={`approval-status-panel-${tab.key}`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveTab(tab.key)}
                    className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 py-2 text-[12px] font-bold transition-colors focus:outline-none focus-visible:text-blue-700 ${
                      isActive
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <TabIcon size={14} />
                    {tab.label}
                    {tab.key === "movement" && movementRows.length > 0 && (
                      <span
                        className={`rounded-full px-1.5 text-[10px] font-bold leading-4 ${
                          isActive ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {movementRows.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            role="tabpanel"
            id={`approval-status-panel-${activeTab}`}
            aria-labelledby={`approval-status-tab-${activeTab}`}
            className="px-2 py-2 md:px-4 md:py-3"
          >
            {activeTab === "current" ? (
              <ol className="space-y-3">
                <TimelineStep
                  marker={<FileText size={16} />}
                  markerClass={TONES.blue.solid}
                  lineClass={TONES.blue.line}
                  accentClass={TONES.blue.accent}
                  isLast={!isCompletedByLineApproval && approvalLevels.length === 0}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Prepared</p>
                      <p className="text-[12px] font-bold leading-5 text-slate-900">Document was prepared</p>
                    </div>
                    <StatusPill tone={TONES.blue} icon={FileText}>Submitted</StatusPill>
                  </div>
                  <div className="mt-2 grid gap-2.5 border-t border-slate-100 pt-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
                    <Field label="Document No.">{valueOrDash(docNo)}</Field>
                    <Field label="Date">
                      <span className="font-medium">{valueOrDash(docDate)}</span>
                    </Field>
                    <Field label="Remarks" className="sm:col-span-2 lg:col-span-1">
                      <ExpandableText
                        value={remarks}
                        className="whitespace-pre-wrap break-words font-medium text-slate-700"
                      />
                    </Field>
                  </div>
                </TimelineStep>

                {isCompletedByLineApproval ? (
                  <TimelineStep
                    marker={<Check size={17} strokeWidth={2.6} />}
                    markerClass={TONES.emerald.solid}
                    lineClass={TONES.emerald.line}
                    accentClass={TONES.emerald.accent}
                    isLast
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          Line Item Approval
                        </p>
                        <p className="text-[12px] font-bold leading-5 text-slate-900">
                          All required line items have completed approval.
                        </p>
                      </div>
                      <StatusPill tone={TONES.emerald} icon={CheckCircle2}>Approved</StatusPill>
                    </div>
                    <div className="mt-2 grid gap-2.5 border-t border-slate-100 pt-2 sm:grid-cols-3">
                      <Field label="Approved By">{valueOrDash(effectiveData?.lastApproval?.approvedBy)}</Field>
                      <Field label="Last Approval">
                        <span className="font-medium">{formatDateTime(effectiveData?.lastApproval?.approvedDate)}</span>
                      </Field>
                      <Field label="Approval Cycle">
                        Cycle {effectiveData?.lastApproval?.cycle || 1} · {effectiveData?.lastApproval?.approvedLineCount || 0} item(s)
                      </Field>
                    </div>
                  </TimelineStep>
                ) : (
                  approvalLevels.map((approval, index) => (
                    <ApprovalLevelCard
                      key={approval.level}
                      approval={approval}
                      isCurrent={index === currentLevelIndex}
                      isLast={index === approvalLevels.length - 1}
                    />
                  ))
                )}
              </ol>
            ) : (
              <ApprovalMovement rows={movementRows} />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 md:px-4">
          <div className="flex min-w-0 items-start gap-1.5 text-[11px] leading-4 text-slate-500">
            <Info size={13} className="mt-px shrink-0 text-slate-400" />
            <p className="min-w-0">
              {activeTab === "movement"
                ? "Chronological history of approval requests and actions."
                : isCompletedByLineApproval
                ? "The required line-item approval process is complete."
                : "The approval process will continue until the final approval level is completed."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="group inline-flex h-8 w-auto shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 hover:shadow active:translate-y-px active:shadow-none focus:outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 motion-reduce:transition-none"
          >
            <XCircle
              size={14}
              strokeWidth={2}
              className="text-slate-400 transition-colors group-hover:text-red-500"
            />
            <span>Close</span>
            <kbd className="ml-0.5 hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-px font-sans text-[10px] font-semibold leading-4 text-slate-400 transition-colors group-hover:border-slate-300 group-hover:text-slate-500 sm:inline-block">
              Esc
            </kbd>
          </button>
        </footer>
      </section>
    </div>
  );
};

export default GlobalApprovalStatus;
