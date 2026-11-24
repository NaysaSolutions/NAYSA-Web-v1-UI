import React, { useMemo, useState } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTruckFast,
  faChartColumn,
  faMagnifyingGlass,
  faRotateLeft,
  faFileCsv,
  faPrint,
  faCircleInfo,
  faCalendarDays,
  faCheckCircle,
  faCircleXmark,
  faClipboardList,
  faEye,
  faXmark,
  faArrowTrendUp,
} from "@fortawesome/free-solid-svg-icons";

/**
 * NAYSA Financials Cloud | Purchasing > Reports > PO Delivery Monitoring
 * ------------------------------------------------------------------------
 * LIVE DELIVERY REPORT: pulls pre-evaluated PO records from getPODeliveryMonitoring. No database writes.
 * Component key: PODeliveryMonitoring
 * Suggested route: /purchasing/reports/po-delivery-monitoring
 *
 * The dedicated report procedure uses MSRR actual receipt dates and PO receipt quantities.
 * Incomplete/unverified POs remain NOT EVALUATED; monthly pass rate counts all POs.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const getCurrentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const DEFAULT_START = getCurrentMonth();
const DEFAULT_END = getCurrentMonth();
const DEFAULT_TARGET_DAYS = 15;
const DEFAULT_TARGET_PERCENT = 80;

/** Same response envelope as NAYSA's Laravel controller; reads report dt1. */
function unwrapRows(response) {
  let payload = response?.data?.data ?? response?.data ?? response;
  if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch { return []; } }
  const first = Array.isArray(payload) ? payload[0] : payload;
  let result = first?.result ?? first;
  if (typeof result === "string") { try { result = JSON.parse(result); } catch { return []; } }
  if (Array.isArray(result?.dt1)) return result.dt1;
  if (Array.isArray(result?.[0]?.dt1)) return result[0].dt1;
  return [];
}

const isoDate = (value) => {
  if (!value) return null;
  const d = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
};

/** Dedicated SQL report already returns one row per branch and PO. */
function normalizeLivePOs(rawRows) {
  return rawRows.map((item) => {
    const poNo = String(item.poNo ?? "").trim();
    const branchCode = String(item.branchCode ?? "").trim();
    const evaluated = item.evaluationStatus === "EVALUATED";
    return {
      key: `${branchCode}|${poNo}`,
      poNo,
      branchCode,
      poDate: isoDate(item.poDate),
      supplier: item.vendName || "",
      // An incomplete order may have partial RR dates; do not score it as fully delivered.
      deliveryDate: evaluated ? isoDate(item.actualReceiptDate) : null,
      evaluationStatus: item.evaluationStatus || "NOT EVALUATED",
      rrCount: Number(item.rrCount || 0),
      orderedQty: Number(item.orderedQty || 0),
      receivedQty: Number(item.receivedQty || 0),
    };
  }).filter((r) => r.poNo).sort((a,b) => (a.poDate || "").localeCompare(b.poDate || "") || a.poNo.localeCompare(b.poNo));
}

const formatDate = (iso) => {
  if (!iso) return "—";
  const parts = String(iso).slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}/${parts[0]}` : "—";
};
const numberPercent = (value) => value == null ? "—" : `${value.toFixed(2)}%`;
const dayDiff = (start, end) => {
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
};
const monthLabel = (period) => {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || "")) return "—";
  const [y, m] = period.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
const computePO = (r, targetDays, targetPercent) => {
  const actualDays = dayDiff(r.poDate, r.deliveryDate);
  const valid = r.evaluationStatus === "EVALUATED" && actualDays !== null && actualDays >= 0;
  const actualPercent = !valid ? null : actualDays <= targetDays ? 100 : (targetDays / actualDays) * 100;
  const passed = actualPercent == null ? null : actualPercent >= targetPercent;
  return { ...r, actualDays: valid ? actualDays : null, actualPercent, targetDays, targetPercent, passed };
};
const classNames = (...parts) => parts.filter(Boolean).join(" ");
function Status({ passed, compact = false }) {
  const isEmpty = passed === null || passed === undefined;
  return (
    <span className={classNames(
      "inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
      compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
      isEmpty ? "border-slate-200 bg-slate-100 text-slate-500" : passed
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-rose-200 bg-rose-50 text-rose-700",
    )}>
      {!isEmpty && <FontAwesomeIcon icon={passed ? faCheckCircle : faCircleXmark} />}
      {isEmpty ? "NO DATA" : passed ? "PASSED" : "FAILED"}
    </span>
  );
}
function Metric({ title, value, icon, tint, note }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
        </div>
        <div className={classNames("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tint)}>
          <FontAwesomeIcon icon={icon} />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{note}</p>
    </div>
  );
}

const csvCell = (value) => `"${String(value ?? "").replace(/\"/g, '\"\"')}"`;
function downloadCSV(filename, header, rows) {
  const content = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function PODeliveryMonitoring() {
  const { currentUserRow } = useAuth();
  const [tab, setTab] = useState("monitoring");
  const [liveRows, setLiveRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [startPeriod, setStartPeriod] = useState(DEFAULT_START);
  const [endPeriod, setEndPeriod] = useState(DEFAULT_END);
  const [targetDays, setTargetDays] = useState(DEFAULT_TARGET_DAYS);
  const [targetPercent, setTargetPercent] = useState(DEFAULT_TARGET_PERCENT);
  const [applied, setApplied] = useState({
    startPeriod: DEFAULT_START, endPeriod: DEFAULT_END,
    targetDays: DEFAULT_TARGET_DAYS, targetPercent: DEFAULT_TARGET_PERCENT,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const validRange = Boolean(startPeriod && endPeriod && startPeriod <= endPeriod);
  const validSettings = Number.isInteger(Number(targetDays)) && Number(targetDays) > 0 &&
    Number.isFinite(Number(targetPercent)) && Number(targetPercent) > 0 && Number(targetPercent) <= 100;
  const canPreview = validRange && validSettings;
  const dirty = startPeriod !== applied.startPeriod || endPeriod !== applied.endPeriod ||
    Number(targetDays) !== applied.targetDays || Number(targetPercent) !== applied.targetPercent;

  const data = useMemo(() => liveRows
    .filter((r) => r.poDate && r.poDate.slice(0, 7) >= applied.startPeriod && r.poDate.slice(0, 7) <= applied.endPeriod)
    .map((r) => computePO(r, applied.targetDays, applied.targetPercent)), [applied, liveRows]);

  const totals = useMemo(() => {
    const passed = data.filter((r) => r.passed === true).length;
    const failed = data.filter((r) => r.passed === false).length;
    return { count: data.length, passed, failed, rate: data.length ? (passed / data.length) * 100 : null };
  }, [data]);

  const filtered = useMemo(() => data.filter((r) => {
    const textMatches = r.poNo.toLowerCase().includes(search.trim().toLowerCase());
    return textMatches && (status === "ALL" || (status === "PASSED" && r.passed === true) ||
      (status === "FAILED" && r.passed === false));
  }), [data, search, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRows = filtered.slice((Math.min(page, pages) - 1) * pageSize, Math.min(page, pages) * pageSize);

  const summary = useMemo(() => {
    const result = [];
    const [sy, sm] = applied.startPeriod.split("-").map(Number);
    const [ey, em] = applied.endPeriod.split("-").map(Number);
    if (!sy || !sm || !ey || !em) return result;
    // Limit visual summary to a reasonable window; display a hint if longer.
    for (let n = sy * 12 + sm - 1; n <= ey * 12 + em - 1 && result.length < 120; n++) {
      const year = Math.floor(n / 12);
      const month = n % 12;
      const period = `${year}-${String(month + 1).padStart(2, "0")}`;
      const rows = data.filter((r) => r.poDate.slice(0, 7) === period);
      const passed = rows.filter((r) => r.passed === true).length;
      const failed = rows.filter((r) => r.passed === false).length;
      const pct = rows.length ? 100 * passed / rows.length : null;
      result.push({ period, month: MONTHS[month], year, count: rows.length, passed, failed,
        pct, status: pct === null ? null : pct >= applied.targetPercent });
    }
    return result;
  }, [applied, data]);

  const preview = async () => {
    if (!canPreview || isLoading) return;
    setIsLoading(true);
    setNotice("");
    const params = { startPeriod, endPeriod, targetDays: Number(targetDays), targetPercent: Number(targetPercent) };
    try {
      const response = await fetchData("getPODeliveryMonitoring", {
        json_data: {
          branchCode: currentUserRow?.branchCode ?? "",
          startingCutoff: startPeriod.replace("-", ""),
          endingCutoff: endPeriod.replace("-", ""),
          targetDays: Number(targetDays),
          targetPercent: Number(targetPercent),
        },
      });
      if (response?.data?.success === false) throw new Error(response.data.message || "Report API failed");
      const rows = normalizeLivePOs(unwrapRows(response));
      setLiveRows(rows);

      setApplied(params);
      setSearch(""); setStatus("ALL"); setPage(1);
      setNotice(rows.length
        ? `Loaded ${rows.length} unique MS purchase orders. Completed orders are rated using their latest receiving report date.`
        : "No purchase orders found for the selected month range and branch.");
    } catch (err) {
      console.error("PO Delivery Monitoring:", err);
      setNotice(`Unable to retrieve purchase orders: ${err?.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };
  const reset = () => {
    setStartPeriod(DEFAULT_START); setEndPeriod(DEFAULT_END);
    setTargetDays(DEFAULT_TARGET_DAYS); setTargetPercent(DEFAULT_TARGET_PERCENT);
    setApplied({ startPeriod: DEFAULT_START, endPeriod: DEFAULT_END,
      targetDays: DEFAULT_TARGET_DAYS, targetPercent: DEFAULT_TARGET_PERCENT });
    setSearch(""); setStatus("ALL"); setPage(1); setNotice("");
    setLiveRows([]);
  };
  const exportReport = () => {
    if (dirty) { setNotice("Click Preview Report first to apply the updated filters before exporting."); return; }
    if (tab === "monitoring") {
      if (!filtered.length) { setNotice("There are no matching records to export."); return; }
      downloadCSV(`PO_Delivery_Monitoring_${applied.startPeriod}_${applied.endPeriod}.csv`,
        ["PO No.", "Target Days", "Target %", "PO Date (Start)", "Delivery Date (End)", "Actual Days", "Actual %", "Remarks"],
        filtered.map((r) => [r.poNo, r.targetDays, `${r.targetPercent}%`, formatDate(r.poDate),
          formatDate(r.deliveryDate), r.actualDays, numberPercent(r.actualPercent), r.passed == null ? "NOT EVALUATED" : r.passed ? "PASSED" : "FAILED"]));
    } else {
      if (!summary.some((r) => r.count)) { setNotice("There are no summary records to export."); return; }
      downloadCSV(`PO_Delivery_Summary_${applied.startPeriod}_${applied.endPeriod}.csv`,
        ["Month", "Year", "Total POs", "Passed", "Failed", "Actual %", "Remarks"],
        summary.map((r) => [r.month, r.year, r.count, r.passed, r.failed, numberPercent(r.pct),
          r.status === null ? "NO DATA" : r.status ? "PASSED" : "FAILED"]));
    }
    setNotice("PO report exported as CSV. Incomplete/unverified orders remain unrated.");
  };

  return (
    <div className="global-ref-main-div-ui min-h-screen bg-slate-50/70 pb-10 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <div className="global-ref-header-ui">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FontAwesomeIcon icon={faTruckFast} />
            </div>
            <div>
              <h1 className="global-ref-headertext-ui text-lg font-bold">PO Delivery Monitoring</h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Purchasing / Reports / PO Delivery Monitoring</p>
            </div>
          </div>
          <span className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-800">
            LIVE DELIVERY REPORT
          </span>
        </div>
      </div>

      {/* Top padding is consistent with the fixed NAYSA report header. */}
      <div className="mt-24 space-y-4 px-2 sm:mt-20 sm:px-4 lg:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Report Parameters</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select PO cut-off period (month/year). Monitoring is grouped by PO month.</p>
            </div>
            <span className="flex items-center gap-2 text-xs text-slate-500"><FontAwesomeIcon icon={faCalendarDays} /> {monthLabel(applied.startPeriod)} – {monthLabel(applied.endPeriod)}</span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Start Cut-off Period</span>
              <input type="month" value={startPeriod} onChange={(e) => setStartPeriod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">End Cut-off Period</span>
              <input type="month" value={endPeriod} onChange={(e) => setEndPeriod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Target Days <span className="font-normal text-slate-400">(report)</span></span>
              <input type="number" min="1" max="3650" step="1" value={targetDays} onChange={(e) => setTargetDays(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">Passing Target % <span className="font-normal text-slate-400">(report)</span></span>
              <input type="number" min="1" max="100" step="1" value={targetPercent} onChange={(e) => setTargetPercent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </label>
          </div>
          {!validRange && <p role="alert" className="px-5 pb-3 text-xs font-semibold text-rose-600">End cut-off period must not be earlier than the start period.</p>}
          {!validSettings && <p role="alert" className="px-5 pb-3 text-xs font-semibold text-rose-600">Enter positive whole target days and a passing target from 1 to 100%.</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={preview} disabled={!canPreview || isLoading}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" />{isLoading ? "Loading..." : "Preview Report"}
              </button>
              <button type="button" onClick={reset}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                <FontAwesomeIcon icon={faRotateLeft} className="mr-2" />Reset
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportReport}
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">
                <FontAwesomeIcon icon={faFileCsv} className="mr-2" />Export CSV
              </button>
              <button type="button" onClick={() => window.print()}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                <FontAwesomeIcon icon={faPrint} className="mr-2" />Print
              </button>
            </div>
          </div>
        </div>

        {(dirty || notice) && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs text-blue-800">
          <FontAwesomeIcon icon={faCircleInfo} className="mr-2" />{dirty ? "Filters have changed. Click Preview Report to apply them." : notice}
        </div>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric title="Total PO Transactions" value={totals.count.toLocaleString()} icon={faClipboardList} tint="bg-blue-50 text-blue-600" note="Unique purchase orders in period" />
          <Metric title="Passed" value={totals.passed.toLocaleString()} icon={faCheckCircle} tint="bg-emerald-50 text-emerald-600" note="Actual rating meets target" />
          <Metric title="Failed" value={totals.failed.toLocaleString()} icon={faCircleXmark} tint="bg-rose-50 text-rose-600" note="Actual rating below target" />
          <Metric title="Overall Pass Rate" value={numberPercent(totals.rate)} icon={faArrowTrendUp} tint="bg-indigo-50 text-indigo-600" note="Passed ÷ all POs × 100" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 pt-4 dark:border-slate-700">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">PO Delivery Performance</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{monthLabel(applied.startPeriod)} – {monthLabel(applied.endPeriod)} · SQL Server PO records</p>
            </div>
            <div className="flex gap-1 self-end">
              {[
                { key: "monitoring", label: "Delivery Monitoring", icon: faTruckFast },
                { key: "summary", label: "Delivery Summary", icon: faChartColumn },
              ].map((item) => <button key={item.key} type="button" onClick={() => { setTab(item.key); setNotice(""); }}
                className={classNames("flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-xs font-semibold transition-colors",
                  tab === item.key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-blue-600")}
                aria-selected={tab === item.key} role="tab">
                <FontAwesomeIcon icon={item.icon} />{item.label}
              </button>)}
            </div>
          </div>

          {tab === "monitoring" ? <>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
                  <input aria-label="Search purchase orders" placeholder="Search PO number..." value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-56 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800" />
                </div>
                <select aria-label="Filter by remarks" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-600 dark:bg-slate-800">
                  <option value="ALL">All Remarks</option><option value="PASSED">Passed</option><option value="FAILED">Failed</option>
                </select>
              </div>
              <span className="text-xs text-slate-500">{filtered.length} of {data.length} PO records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="bg-[#123d6b] text-white">
                  <tr>{["PO Number", "Target Days", "Target %", "PO Date (Start)", "Delivery Date (End)", "Actual Days", "Actual %", "Remarks", "Action"].map((h) =>
                    <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {visibleRows.map((r) => <tr key={r.key} className="hover:bg-blue-50/40 dark:hover:bg-slate-800">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-blue-700 dark:text-blue-300">{r.poNo}</td>
                    <td className="px-4 py-3">{r.targetDays}</td>
                    <td className="px-4 py-3">{r.targetPercent}%</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(r.poDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(r.deliveryDate)}</td>
                    <td className="px-4 py-3">{r.actualDays ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold">{numberPercent(r.actualPercent)}</td>
                    <td className="px-4 py-3"><Status passed={r.passed} compact /></td>
                    <td className="px-4 py-3"><button type="button" onClick={() => setDetail(r)}
                      className="rounded-md border border-blue-200 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-50">
                      <FontAwesomeIcon icon={faEye} className="mr-1" />View</button></td>
                  </tr>)}
                  {!visibleRows.length && <tr><td colSpan={9} className="px-4 py-14 text-center text-sm text-slate-500">No purchase orders match the selected period or filters.</td></tr>}
                </tbody>
                {data.length > 0 && <tfoot className="bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  <tr><td colSpan={6} className="px-4 py-3 text-right font-semibold">Overall pass rate (all POs in selected period)</td>
                    <td className="px-4 py-3 font-bold">{numberPercent(totals.rate)}</td>
                    <td colSpan={2} className="px-4 py-3"><Status passed={totals.rate === null ? null : totals.rate >= applied.targetPercent} compact /></td></tr>
                </tfoot>}
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
              <span className="text-xs text-slate-500">Showing {filtered.length ? (Math.min(page, pages) - 1) * pageSize + 1 : 0}–{Math.min(Math.min(page, pages) * pageSize, filtered.length)} of {filtered.length}</span>
              <div className="flex items-center gap-2 text-xs">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Previous</button>
                <span>Page {Math.min(page, pages)} of {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          </> : <>
            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[580px] text-left text-xs">
                  <thead className="bg-[#123d6b] text-white"><tr>
                    {["Month", "Year", "Total POs", "Passed", "Failed", "Actual %", "Remarks"].map((h) =>
                      <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {summary.map((r) => <tr key={r.period} className="hover:bg-blue-50/40 dark:hover:bg-slate-800">
                      <td className="px-3 py-3 font-semibold">{r.month}</td>
                      <td className="px-3 py-3">{r.year}</td>
                      <td className="px-3 py-3">{r.count}</td>
                      <td className="px-3 py-3">{r.passed}</td>
                      <td className="px-3 py-3">{r.failed}</td>
                      <td className="px-3 py-3 font-semibold">{numberPercent(r.pct)}</td>
                      <td className="px-3 py-3"><Status passed={r.status} compact /></td>
                    </tr>)}
                    {!summary.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No months selected.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="text-xs font-bold">Monthly Passing Rate</h3>
                <p className="mt-1 text-[11px] text-slate-500">Percentage of POs meeting the required rating.</p>
                <div className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
                  {summary.filter((r) => r.count > 0).map((r) => <div key={r.period}>
                    <div className="mb-1.5 flex justify-between gap-2 text-[11px]"><span>{r.month.slice(0, 3)} {r.year}</span><strong>{numberPercent(r.pct)}</strong></div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                      <div className={classNames("h-full rounded-full", r.status ? "bg-emerald-500" : "bg-rose-500")}
                        style={{ width: `${Math.max(0, Math.min(100, r.pct || 0))}%` }} />
                    </div>
                  </div>)}
                  {!summary.some((r) => r.count > 0) && <p className="text-xs text-slate-400">No purchase orders found for the selected reporting period.</p>}
                </div>
                {summary.length >= 120 && <p className="mt-3 text-[11px] text-amber-700">Preview shows at most 120 months.</p>}
              </div>
            </div>
          </>}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800">
            <span><FontAwesomeIcon icon={faCircleInfo} className="mr-1.5" />Live PO date · actual RR receipt date pending backend enhancement · calendar days</span>
            <span>Actual % = 100 if within target; otherwise (Target Days / Actual Days) × 100.</span>
          </div>
        </div>
      </div>

      {detail && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="PO Delivery Details" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetail(null); }}>
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div><h2 className="font-bold">PO Delivery Details</h2><p className="text-xs text-slate-500">{detail.poNo} · Live PO Inquiry</p></div>
            <button type="button" aria-label="Close details" onClick={() => setDetail(null)} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><FontAwesomeIcon icon={faXmark} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 p-5 text-xs">
            {[["PO Date", formatDate(detail.poDate)], ["Delivery Date", formatDate(detail.deliveryDate)],
              ["Target Days", detail.targetDays], ["Actual Days", detail.actualDays],
              ["Passing Target", `${detail.targetPercent}%`], ["Actual Rating", numberPercent(detail.actualPercent)]].map(([k, v]) =>
              <div key={k}><p className="text-slate-500">{k}</p><p className="mt-1 font-bold text-slate-800 dark:text-slate-100">{v ?? "—"}</p></div>)}
            <div className="col-span-2 border-t border-slate-100 pt-4 dark:border-slate-700"><Status passed={detail.passed} /></div>
          </div>
          <div className="bg-blue-50 px-5 py-3 text-xs text-blue-800">PO data is from SQL Server. The actual receiving date must be returned from an RR header before performance can be rated.</div>
        </div>
      </div>}
    </div>
  );
}
