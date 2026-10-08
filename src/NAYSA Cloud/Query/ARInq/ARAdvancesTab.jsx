
import { useEffect, useState, useRef, useCallback, forwardRef, useMemo } from "react";
import { fetchData, postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faChevronDown,
  faUser,
  faSliders,
  faTableList,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {exportGenericHistoryExcel} from "@/NAYSA Cloud/Global/report";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import { useTopUserRow, useTopBranchRow } from "@/NAYSA Cloud/Global/top1RefTable";
import { useGetCurrentDay } from "@/NAYSA Cloud/Global/dates";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { formatNumber, parseFormattedNumber, useSwalProceedConfirm, useSwalSuccessAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import APBeginningBalanceModal from "../APInq/APBeginningBalanceModal.jsx";

/** Different endpoints */
const ENDPOINT_DETAIL = "getARAdvances"; // bottom table (detail/application)
const ENDPOINT_SUMMARY = "getARAdvances"; // top table (summary)

/** Light global cache so the tab remembers its UI state across mounts */
function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_ARADV_CACHE__) window.__NAYSA_ARADV_CACHE__ = {};
    return window.__NAYSA_ARADV_CACHE__;
  }
  return {};
}

/** Column-config loader with fallback to direct API call */
async function getHSColsSafe(endpointKey) {
  try {
    const cols = await useSelectedHSColConfig(endpointKey);
    if (Array.isArray(cols)) return cols;
  } catch (e) {
    console.warn("useSelectedHSColConfig failed; falling back to /getHSColConfig:", e);
  }

  // Try GET with query params (e.g., /api/getHSColConfig?endpoint=key)
  try {
    const res = await fetchData("getHSColConfig", { params: { endpoint: endpointKey } });
    const data = Array.isArray(res?.data) ? res.data : res?.data?.data ?? [];
    if (!Array.isArray(data)) throw new Error("Invalid getHSColConfig response shape");
    return data;
  } catch (_) {
    // Fallback to POST-style if your helper is wired that way
    const res2 = await fetchData("getHSColConfig", { endpoint: endpointKey });
    const data2 = Array.isArray(res2?.data) ? res2.data : res2?.data?.data ?? [];
    if (!Array.isArray(data2)) throw new Error("Invalid getHSColConfig (POST) response shape");
    return data2;
  }
}

/** Small helper: deduplicate in-flight requests + 429-aware retry */
function useRequestCoalescer() {
  const inflightMap = useRef(new Map());
  const resultCache = useRef(new Map());

  const requestOnce = useCallback(async (key, fn, { attempts = 3 } = {}) => {
    if (resultCache.current.has(key)) return resultCache.current.get(key);
    if (inflightMap.current.has(key)) return inflightMap.current.get(key);

    const run = async () => {
      let lastErr;
      for (let i = 0; i < attempts; i++) {
        try {
          const res = await fn();
          resultCache.current.set(key, res);
          return res;
        } catch (e) {
          lastErr = e;
          const status = e?.response?.status ?? e?.status;
          if (status !== 429 || i === attempts - 1) throw e;
          const ra = Number(e?.response?.headers?.["retry-after"]);
          const backoff = Number.isFinite(ra) ? ra * 1000 : 500 * 2 ** i;
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
      throw lastErr;
    };

    const p = run().finally(() => inflightMap.current.delete(key));
    inflightMap.current.set(key, p);
    return p;
  }, []);

  return { requestOnce, inflightMap, resultCache };
}

const ARAdvancesTab = forwardRef(function ARAdvancesTab({ registerActions }, ref) {
  const { user,companyInfo, currentUserRow, refsLoaded, refsLoading } = useAuth();
  const baseKey = "AR_ADVANCES";
  const hydratedRef = useRef(false);
  const [showBeginningBalance, setShowBeginningBalance] = useState(false);
  const [refund, setRefund] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundDate, setRefundDate] = useState("");
  const [refundMethod, setRefundMethod] = useState("APV");
  const [refundCreditAccount, setRefundCreditAccount] = useState(null);
  const [showRefundAccount, setShowRefundAccount] = useState(false);
  const [refundRequestId, setRefundRequestId] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);

  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    custCode: "",
    custName: "",
    status: "Open",
    arAdvancesDataUnfiltered: [], // preserve full detail dataset for export
    arAdvancesData: [], // BOTTOM table (detail/application)
    arAdvancesDataS: [], // TOP table (summary)
    columnConfig: [], // BOTTOM columns
    columnConfigS: [], // TOP columns
    showBranchModal: false,
    showCustomerModal: false,
    isLoading: false,
    showSpinner: false,
  });
  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    custCode,
    custName,
    status,
    arAdvancesData,
    arAdvancesDataS,
    arAdvancesDataUnfiltered,
    columnConfig,
    columnConfigS,
    isLoading,
    showSpinner,
    showBranchModal,
    showCustomerModal,
  } = state;

  // table refs + UI state persistence refs
  const tableRefTop = useRef(null); // summary table
  const tableRefBottom = useRef(null); // detail table
  const detailedSectionRef = useRef(null);
  const tableStateTopRef = useRef({
    filters: {},
    sortConfig: { key: null, direction: null },
    currentPage: 1,
  });
  const tableStateBottomRef = useRef({
    filters: {},
    sortConfig: { key: null, direction: null },
    currentPage: 1,
  });

  // smooth spinner
  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);

  // load defaults (user/branch) once
  const loadDefaults = useCallback(async () => {
    updateState({ showSpinner: true });
    try {
      const hsUser = await useTopUserRow(user?.USER_CODE);
      if (hsUser) {
        const hsBranch = await useTopBranchRow(hsUser.branchCode);
        updateState({
          branchCode: hsUser.branchCode,
          branchName: hsBranch?.branchName || hsUser.branchName,
        });
      }
    } catch (err) {
      console.error("Error loading defaults data:", err);
    } finally {
      updateState({ showSpinner: false });
    }
  }, [user?.USER_CODE]);







  const handleReset = useCallback(async () => {
    updateState({
      custCode: "",
      custName: "",
      arAdvancesData: [],
      arAdvancesDataS: [],
      arAdvancesDataUnfiltered: [],
    });
  }, []);

  /** Request de-duplication hook */
  const { requestOnce } = useRequestCoalescer();

  // Load columns once for both endpoints – StrictMode-safe + deduped
  const loadedColsOnceRef = useRef(false);
  useEffect(() => {
    if (loadedColsOnceRef.current) return;
    let alive = true;

    (async () => {
      try {
        const [colsBottom, colsTop] = await Promise.all([
          requestOnce(`cols:${ENDPOINT_DETAIL}`, () => getHSColsSafe(ENDPOINT_DETAIL)),
          requestOnce(`cols:${ENDPOINT_SUMMARY}`, () => getHSColsSafe(ENDPOINT_SUMMARY)),
        ]);

        if (!alive) return;

        setState((prev) => ({
          ...prev,
          columnConfig: Array.isArray(colsBottom) ? colsBottom.map((c) => ({ ...c })) : [],
          columnConfigS: Array.isArray(colsTop) ? colsTop.map((c) => ({ ...c })) : [],
        }));

        loadedColsOnceRef.current = true;
      } catch (e) {
        console.error("Load column configs failed:", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [requestOnce]);



  // Find loads the summary only. Detail is loaded from the selected summary row.
 const fetchRecord = useCallback(async () => {
  updateState({ isLoading: true });

  try {
    const summaryRes = await fetchData(ENDPOINT_SUMMARY, {
      json_data: { json_data: { branchCode, custCode, status, viewMode: "Summary" } },
    });
    const dtSummary = summaryRes?.data?.[0]?.result
      ? JSON.parse(summaryRes.data[0].result)
      : [];

    const rowsTop = Array.isArray(dtSummary?.[0]?.dt2) ? dtSummary[0].dt2 : [];

    if (rowsTop.length === 0) {
      updateState({
        arAdvancesData: [],
        arAdvancesDataUnfiltered: [],
        arAdvancesDataS: [],
      });

      useSwalErrorAlert("AR Advances", "No records found.");
      return;
    }

    updateState({
      arAdvancesData: [],
      arAdvancesDataUnfiltered: [],
      arAdvancesDataS: rowsTop,
    });
  } catch (err) {
    console.error("Error fetching data:", err);
  } finally {
    updateState({ isLoading: false });
  }
}, [branchCode, custCode, status, requestOnce]);





  // Load the complete lifecycle of the advance selected from the summary.
  const fetchRecordperCustomer = useCallback(
    async (selectedAdvance) => {
      updateState({ isLoading: true });
      try {
        const resp = await fetchData(ENDPOINT_DETAIL, {
          json_data: {
            json_data: {
              branchCode: selectedAdvance.branchCode || branchCode,
              custCode: selectedAdvance.custCode,
              advanceDocCode: selectedAdvance.docCode,
              advanceDocNo: selectedAdvance.docNo,
              viewMode: "Detail",
            },
          },
        });

        const dt = resp?.data?.[0]?.result ? JSON.parse(resp.data[0].result) : [];
        const rowsBottom = dt?.[0]?.dt1 ?? dt ?? [];
        updateState({
          arAdvancesData: Array.isArray(rowsBottom) ? rowsBottom : [],
          arAdvancesDataUnfiltered: Array.isArray(rowsBottom) ? rowsBottom : [],
        });
      } catch (e) {
        console.error("Error fetching detail:", e);
      } finally {
        updateState({ isLoading: false });
      }
    },
    [branchCode]
  );

  // hydrate from cache OR load defaults once
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (hydratedRef.current) return;

      const cache = getGlobalCache();
      const snap = cache[baseKey];

      const hasValidCache =
        !!snap &&
        (snap.branchCode ||
          (Array.isArray(snap.arAdvancesData) && snap.arAdvancesData.length > 0) ||
          (Array.isArray(snap.arAdvancesDataS) && snap.arAdvancesDataS.length > 0));

      if (hasValidCache) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            branchCode: snap.branchCode ?? prev.branchCode,
            branchName: snap.branchName ?? prev.branchName,
            custCode: snap.custCode ?? prev.custCode,
            custName: snap.custName ?? prev.custName,
            status: snap.status ?? prev.status,
            arAdvancesData: Array.isArray(snap.arAdvancesData)
              ? snap.arAdvancesData
              : prev.arAdvancesData,
            arAdvancesDataS: Array.isArray(snap.arAdvancesDataS)
              ? snap.arAdvancesDataS
              : prev.arAdvancesDataS,
            columnConfig: Array.isArray(snap.columnConfig)
              ? snap.columnConfig
              : prev.columnConfig,
            columnConfigS: Array.isArray(snap.columnConfigS)
              ? snap.columnConfigS
              : prev.columnConfigS,
          }));
          // hydrate table UI states (filters/sort/page) independently
          tableStateTopRef.current = snap.tableTop || tableStateTopRef.current;
          tableStateBottomRef.current = snap.tableBottom || tableStateBottomRef.current;
          hydratedRef.current = true;
        }
        return;
      }

      if (!user?.USER_CODE) return;
      await loadDefaults();
      await handleReset();
      hydratedRef.current = true;
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.USER_CODE, loadDefaults, handleReset]);

  // snapshot into cache whenever important things change
  useEffect(() => {
    if (!hydratedRef.current) return;
    const cache = getGlobalCache();
    const prev = cache[baseKey] || {};
    cache[baseKey] = {
      ...prev,
      branchCode,
      branchName,
      custCode,
      custName,
      status,
      arAdvancesData,
      arAdvancesDataS,
      columnConfig,
      columnConfigS,
      tableTop: tableStateTopRef.current,
      tableBottom: tableStateBottomRef.current,
      scrollTop: prev.scrollTop || { top: 0, left: 0 },
      scrollBottom: prev.scrollBottom || { top: 0, left: 0 },
    };
  }, [
    branchCode,
    branchName,
    custCode,
    custName,
    status,
    arAdvancesData,
    arAdvancesDataS,
    columnConfig,
    columnConfigS,
  ]);

  // restore & persist scroll: TOP table
  useEffect(() => {
    const cache = getGlobalCache();
    const snap = cache[baseKey] || {};
    const targetTop = Number(snap?.scrollTop?.top) || 0;
    const targetLeft = Number(snap?.scrollTop?.left) || 0;

    let tries = 0;
    const maxTries = 8;

    const tryRestore = () => {
      const scroller = tableRefTop.current?.scrollRef?.current;
      if (!scroller) {
        if (tries++ < maxTries) requestAnimationFrame(tryRestore);
        return;
      }
      const ready =
        scroller.scrollHeight > scroller.clientHeight ||
        scroller.scrollWidth > scroller.clientWidth;
      if (!ready && tries++ < maxTries) {
        requestAnimationFrame(tryRestore);
        return;
      }
      scroller.scrollTop = targetTop;
      scroller.scrollLeft = targetLeft;
    };

    requestAnimationFrame(() => requestAnimationFrame(tryRestore));

    const scroller = tableRefTop.current?.scrollRef?.current;
    if (!scroller) return;
    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[baseKey] || {};
      cacheNow[baseKey] = {
        ...prev,
        scrollTop: { top: scroller.scrollTop, left: scroller.scrollLeft },
      };
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [arAdvancesDataS.length, columnConfigS.length]);

  // restore & persist scroll: BOTTOM table
  useEffect(() => {
    const cache = getGlobalCache();
    const snap = cache[baseKey] || {};
    const targetTop = Number(snap?.scrollBottom?.top) || 0;
    const targetLeft = Number(snap?.scrollBottom?.left) || 0;

    let tries = 0;
    const maxTries = 8;

    const tryRestore = () => {
      const scroller = tableRefBottom.current?.scrollRef?.current;
      if (!scroller) {
        if (tries++ < maxTries) requestAnimationFrame(tryRestore);
        return;
      }
      const ready =
        scroller.scrollHeight > scroller.clientHeight ||
        scroller.scrollWidth > scroller.clientWidth;
      if (!ready && tries++ < maxTries) {
        requestAnimationFrame(tryRestore);
        return;
      }
      scroller.scrollTop = targetTop;
      scroller.scrollLeft = targetLeft;
    };

    requestAnimationFrame(() => requestAnimationFrame(tryRestore));

    const scroller = tableRefBottom.current?.scrollRef?.current;
    if (!scroller) return;
    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[baseKey] || {};
      cacheNow[baseKey] = {
        ...prev,
        scrollBottom: { top: scroller.scrollTop, left: scroller.scrollLeft },
      };
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [arAdvancesData.length, columnConfig.length]);

  // Export (maps Summary→top dataset/cols; Detail→bottom)
  const handleExport = useCallback(async () => {
    try {
      updateState({ isLoading: true });


        const exportData = {
        "Data" : {
          "AR Advances Summary" : arAdvancesDataS,
          "AR Advances Application" : arAdvancesDataUnfiltered,
        }
      }

      const columnConfigsMap = {
          "AR Advances Summary" : columnConfigS,
          "AR Advances Application" : columnConfig,
        }
      


      const payload = {
        ReportName: "AR Advances Report",
        UserCode: currentUserRow?.userName,
        Branch: branchCode || "",
        JsonData: exportData,
        companyName:companyInfo?.compName,
        companyAddress:companyInfo?.compAddr,
        companyTelNo:companyInfo?.telNo
      };
    

      await exportGenericHistoryExcel(payload, columnConfigsMap);




    } catch (e) {
      console.error("❌ Export failed:", e);
    } finally {
      updateState({ isLoading: false });
    }
  }, [
    arAdvancesDataS,
    arAdvancesDataUnfiltered,
    columnConfigS,
    columnConfig,
    branchCode,
    user,
  ]);

  // register action bar handlers
  useEffect(() => {
    registerActions?.({
      onFind: fetchRecord,
      onReset: handleReset,
      onBeginningBalance: () => setShowBeginningBalance(true),
      onPrint: () => window.print(),
      onExport: handleExport,
      onViewDoc: undefined,
    });
  }, [registerActions, fetchRecord, handleReset, handleExport]);

  // Row actions
  const handleViewTop = useCallback(
    async (row) => {
      await fetchRecordperCustomer(row);
      updateState({ custName: row.custName, custCode: row.custCode });
      requestAnimationFrame(() => detailedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    },
    [fetchRecordperCustomer]
  );

  const handleOpenRefund = useCallback((row) => {
    const balance = Number(parseFormattedNumber(row?.balance) || 0);
    if (balance <= 0) return;
    setRefund(row);
    setRefundAmount(formatNumber(balance));
    setRefundDate(new Date().toLocaleDateString("en-CA"));
    setRefundMethod("APV");
    setRefundCreditAccount(null);
    setRefundRequestId(crypto.randomUUID());
  }, []);

  const handleRefundAmountChange = useCallback((value) => {
    const raw = value.replace(/,/g, "");
    if (raw.startsWith("-")) {
      useSwalErrorAlert("Invalid Refund Amount", "Refund Amount cannot be negative.");
      return;
    }
    if (/^\d*(\.\d{0,2})?$/.test(raw)) setRefundAmount(raw);
  }, []);

  const handleRefundAmountBlur = useCallback(() => {
    if (!refundAmount.trim()) return;
    const amount = Number(parseFormattedNumber(refundAmount));
    const balance = Number(parseFormattedNumber(refund?.balance));
    if (!Number.isFinite(amount) || amount <= 0) {
      useSwalErrorAlert("Invalid Refund Amount", "Refund Amount must be greater than zero.");
      setRefundAmount("");
      return;
    }
    if (amount > balance) {
      useSwalErrorAlert("Invalid Refund Amount", `Refund Amount cannot exceed the available balance of ${formatNumber(balance)}.`);
      setRefundAmount(formatNumber(balance));
      return;
    }
    setRefundAmount(formatNumber(amount));
  }, [refundAmount, refund?.balance]);

  const handleSubmitRefund = useCallback(async () => {
    if (!refund || isRefunding) return;
    const amount = Number(parseFormattedNumber(refundAmount));
    const balance = Number(parseFormattedNumber(refund.balance));
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
      useSwalErrorAlert("Invalid Refund Amount", `Refund Amount must be greater than zero and cannot exceed ${formatNumber(balance)}.`);
      return;
    }
    if (!refundCreditAccount?.acctCode) {
      useSwalErrorAlert("Credit Account Required", "Select the Credit Account for the refund transaction.");
      return;
    }
    if (!refundDate) {
      useSwalErrorAlert("Refund Date Required", "Select the refund transaction date.");
      return;
    }

    const label = refundMethod === "JV" ? "Journal Voucher" : "Non-Purchases APV";
    const confirmation = await useSwalProceedConfirm(
      `Create ${label}?`,
      `Refund ${refund.currCode} ${formatNumber(amount)} from ${refund.docCode} ${refund.docNo}?`,
      `Create and Post ${refundMethod}`,
      "Cancel"
    );
    if (!confirmation.isConfirmed) return;

    setIsRefunding(true);
    try {
      const response = await postRequest("refundARAdvance", {
        json_data: {
          arAdvId: refund.arAdvId,
          branchCode: refund.branchCode,
          amount,
          refundDate,
          creditAcctCode: refundCreditAccount.acctCode,
          refundMethod,
          userCode: currentUserRow?.userCode || user?.USER_CODE,
          requestId: refundRequestId,
        },
      });
      if (!response?.success) throw new Error(response?.details || response?.message || "The refund could not be saved.");
      const completed = response.data;
      setRefund(null);
      updateState({ arAdvancesData: [], arAdvancesDataS: [], arAdvancesDataUnfiltered: [] });
      await fetchRecord({ silent: true });
      useSwalSuccessAlert("Refund Recorded", `${completed.documentType} ${completed.documentNo} was created and posted. Remaining balance: ${formatNumber(completed.balance)}.`);
    } catch (error) {
      useSwalErrorAlert("Refund Failed", error?.response?.data?.details || error?.response?.data?.message || error.message);
    } finally {
      setIsRefunding(false);
    }
  }, [refund, isRefunding, refundAmount, refundDate, refundCreditAccount, refundMethod, refundRequestId, currentUserRow?.userCode, user?.USER_CODE, fetchRecord]);

  const handleViewRow = useCallback((row) => {
    const url = `${window.location.origin}${row.pathUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // Totals for Filter Summary (from SUMMARY rows)
  const totals = useMemo(() => {
    const rows = Array.isArray(arAdvancesDataS) ? arAdvancesDataS : [];
    let adv = 0,
      appl = 0,
      bal = 0;

    for (const r of rows) {
      const a =
        (typeof parseFormattedNumber === "function"
          ? parseFormattedNumber(r?.advancesAmount)
          : Number(r?.advancesAmount)) || 0;
      const p =
        (typeof parseFormattedNumber === "function"
          ? parseFormattedNumber(r?.appliedAmount)
          : Number(r?.appliedAmount)) || 0;
      const b =
        (typeof parseFormattedNumber === "function"
          ? parseFormattedNumber(r?.balance)
          : Number(r?.balance)) || 0;

      adv += isNaN(a) ? 0 : a;
      appl += isNaN(p) ? 0 : p;
      bal += isNaN(b) ? 0 : b;
    }

    const fmt =
      typeof formatNumber === "function"
        ? formatNumber
        : (n) =>
            (n || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

    return { adv: fmt(adv), appl: fmt(appl), bal: fmt(bal) };
  }, [arAdvancesDataS]);

  // initial table UI states from cache (if any)
  const initialStateTop = getGlobalCache()[baseKey]?.tableTop || undefined;
  const initialStateBottom = getGlobalCache()[baseKey]?.tableBottom || undefined;

  return (
    <div>
      {(showSpinner || isRefunding) && <LoadingSpinner />}

      {/* === Redesigned Filters Card (3-panel) === */}
     <div className="global-tran-tab-div-ui">
        <div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Customer Details */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                <FontAwesomeIcon className="h-3 w-3 rounded-lg bg-blue-50 p-1.5 text-blue-600" icon={faUser} />
                Customer Details
              </h3>

              <div className="space-y-2">
                <FieldRenderer
                  id="branchName"
                  name="branchName"
                  label="Branch"
                  type="lookup"
                  value={branchName || ""}
                  readOnly
                  disabled={isLoading}
                  onLookup={() => updateState({ showBranchModal: true })}
                />

                <FieldRenderer
                  id="custCode"
                  name="custCode"
                  label="Customer Code"
                  type="lookup"
                  value={custCode || ""}
                  disabled={isLoading}
                  onChange={(val) => updateState({ custCode: val })}
                  onLookup={() => updateState({ showCustomerModal: true })}
                />

                <FieldRenderer
                  id="custName"
                  name="custName"
                  label="Customer Name"
                  type="text"
                  value={custName || ""}
                  disabled
                  readOnly
                />
              </div>
            </section>

            {/* Filters */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                <FontAwesomeIcon className="h-3 w-3 rounded-lg bg-blue-50 p-1.5 text-blue-600" icon={faSliders} />
                Filters
              </h3>

              <div className="space-y-2">
                <FieldRenderer
                  id="advStatus"
                  name="advStatus"
                  label="Advances Status"
                  type="select"
                  value={status || ""}
                  disabled={isLoading}
                  onChange={(val) => updateState({ status: val })}
                  options={[
                    { label: "Open", value: "Open" },
                    { label: "Closed", value: "Closed" },
                    { label: "All", value: "All" },
                  ]}
                />
              </div>
            </section>

            {/* Filter Summary */}
            <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-blue-600">
                <FontAwesomeIcon className="h-3 w-3 rounded-lg bg-blue-50 p-1.5 text-blue-600" icon={faTableList} />
                Filter Summary
              </h3>

              <div className="space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-gray-800">{status}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Advances Amount:</span>
                  <span className="font-semibold text-blue-600">{totals.adv}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Applied Amount:</span>
                  <span className="font-semibold text-blue-600">{totals.appl}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Balance:</span>
                  <span className="font-semibold text-blue-600">{totals.bal}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* === Summary (TOP TABLE) === */}
      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Summary
            </button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
            <SearchGlobalReportTable
              ref={tableRefTop}
              columns={columnConfigS}
              data={arAdvancesDataS}
              itemsPerPage={50}
              showFilters={true}
              rightActionLabel="View"
              onRowAction={handleViewTop}
              onRowActionsClick={handleOpenRefund}
              actionsIcon={faRotateLeft}
              actionsTitle="Refund Advance"
              isRowActionsDisabled={(row) => Number(parseFormattedNumber(row?.balance) || 0) <= 0 || isRefunding}
              className="mt-2"
              initialState={initialStateTop}
              docType="AR Advances Summary"
              onStateChange={(tbl) => {
                tableStateTopRef.current = tbl;
                const cache = getGlobalCache();
                const prev = cache[baseKey] || {};
                cache[baseKey] = { ...prev, tableTop: tbl };
              }}
            />
          </div>
      </div>

      {/* === Detailed (BOTTOM TABLE) === */}
      <div ref={detailedSectionRef} className="global-tran-tab-div-ui" style={{ scrollMarginTop: "120px" }}>
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Detailed
            </button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">

            <SearchGlobalReportTable
              ref={tableRefBottom}
              columns={columnConfig}
              data={arAdvancesData}
              itemsPerPage={50}
              showFilters={true}
              rightActionLabel="View"
              onRowAction={handleViewRow}
              className="mt-2"
              initialState={initialStateBottom}
              docType="AR Advances Detailed"
              totalExemptions={["rate", "percent", "ratio", "id", "code", "ROW_NO", "balance"]}
              onStateChange={(tbl) => {
                tableStateBottomRef.current = tbl;
                const cache = getGlobalCache();
                const prev = cache[baseKey] || {};
                cache[baseKey] = { ...prev, tableBottom: tbl };
              }}
            />
         
        </div>
      </div>

      <APBeginningBalanceModal
        isOpen={showBeginningBalance}
        onClose={() => setShowBeginningBalance(false)}
        ledgerType="AR"
        balanceType="ADVANCES"
        branchCode={branchCode}
        userCode={user?.userCode || user?.USER_CODE || currentUserRow?.userCode || ""}
        onFinalized={handleReset}
      />

      {/* === Modals === */}
      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
                custCode: selectedCustomer.custCode,
                custName: selectedCustomer.custName,
                arAdvancesData: [],
                arAdvancesDataS: [],
                arAdvancesDataUnfiltered: [],
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showCustomerModal && (
        <CustomerMastLookupModal
          isOpen={showCustomerModal}
          onClose={(selectedCustomer) => {
            if (selectedCustomer) {
              updateState({
                custCode: selectedCustomer.custCode,
                custName: selectedCustomer.custName,
                arAdvancesData: [],
                arAdvancesDataS: [],
                arAdvancesDataUnfiltered: [],
              });
            }
            updateState({ showCustomerModal: false });
          }}
        />
      )}

      {refund && !showRefundAccount && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Refund AR Advance">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-blue-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-blue-900">Refund AR Advance</h2>
              <p className="text-sm text-gray-600">Create and post a refund transaction against this customer advance.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 p-6 text-sm">
              <div className="col-span-2"><span className="text-gray-500">Customer</span><div>{refund.custCode} - {refund.custName}</div></div>
              <label className="col-span-2 block">
                <span className="text-gray-600">Refund Via</span>
                <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} disabled={isRefunding} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">
                  <option value="APV">Non-Purchases APV</option>
                  <option value="JV">Journal Voucher</option>
                </select>
              </label>
              <label className="block"><span className="text-gray-500">Reference</span><input value={`${refund.docCode || ""} ${refund.docNo || ""}`} readOnly className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2" /></label>
              <label className="block"><span className="text-gray-500">Advances Account</span><input value={refund.acctCode || ""} readOnly className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2" /></label>
              <label className="block"><span className="text-gray-500">Advance Amount</span><input value={formatNumber(refund.advancesAmount)} readOnly className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-right tabular-nums" /></label>
              <label className="block"><span className="text-gray-500">Available Balance</span><input value={`${refund.currCode} ${formatNumber(refund.balance)}`} readOnly className="mt-1 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-right text-blue-700 tabular-nums" /></label>
              <label className="block"><span className="text-gray-600">Refund Amount</span><input inputMode="decimal" value={refundAmount} onChange={(e) => handleRefundAmountChange(e.target.value)} onFocus={() => setRefundAmount((v) => v.replace(/,/g, ""))} onBlur={handleRefundAmountBlur} disabled={isRefunding} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-right tabular-nums" /></label>
              <label className="block"><span className="text-gray-600">{refundMethod === "JV" ? "JV Date" : "APV Date"}</span><input type="date" value={refundDate} onChange={(e) => setRefundDate(e.target.value)} disabled={isRefunding} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
              <div className="col-span-2"><span className="text-gray-600">Credit Account</span><button type="button" onClick={() => setShowRefundAccount(true)} disabled={isRefunding} className="mt-1 flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-left hover:bg-blue-50"><span>{refundCreditAccount ? `${refundCreditAccount.acctCode} - ${refundCreditAccount.acctName}` : "Select credit account"}</span><span className="text-blue-600">Search</span></button></div>
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button type="button" onClick={() => setRefund(null)} disabled={isRefunding} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700">Cancel</button>
              <button type="button" onClick={handleSubmitRefund} disabled={isRefunding} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">Create {refundMethod === "JV" ? "Journal Voucher" : "Non-Purchases APV"}</button>
            </div>
          </div>
        </div>
      )}

      {showRefundAccount && <COAMastLookupModal isOpen={showRefundAccount} customParam="ACTIVEALL" onClose={(account) => { if (account) setRefundCreditAccount(account); setShowRefundAccount(false); }} />}
    </div>
  );
});

export default ARAdvancesTab;
