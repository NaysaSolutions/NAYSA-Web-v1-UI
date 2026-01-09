
import { useEffect, useState, useRef, useCallback, forwardRef, useMemo } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faUser,
  faSliders,
  faTableList,
  faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {exportGenericHistoryExcel} from "@/NAYSA Cloud/Global/report";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import { useTopUserRow, useTopBranchRow } from "@/NAYSA Cloud/Global/top1RefTable";
import { useGetCurrentDay } from "@/NAYSA Cloud/Global/dates";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { formatNumber, parseFormattedNumber } from "@/NAYSA Cloud/Global/behavior";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";

const ENDPOINT = "getAPAging";
const COLS_KEY_BOTTOM = "getAPAging";    // detail columns
const COLS_KEY_TOP    = "getAPInquiryS"; // summary columns (for totals)

/** Light global cache */
function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_APAGE_CACHE__) window.__NAYSA_APAGE_CACHE__ = {};
    return window.__NAYSA_APAGE_CACHE__;
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

  try {
    const res = await fetchData("getHSColConfig", { params: { endpoint: endpointKey } });
    const data = Array.isArray(res?.data) ? res.data : (res?.data?.data ?? []);
    if (!Array.isArray(data)) throw new Error("Invalid getHSColConfig response shape");
    return data;
  } catch (e) {
    const res2 = await fetchData("getHSColConfig", { endpoint: endpointKey });
    const data2 = Array.isArray(res2?.data) ? res2.data : (res2?.data?.data ?? []);
    if (!Array.isArray(data2)) throw new Error("Invalid getHSColConfig (POST) response shape");
    return data2;
  }
}

/** De-dup + 429 backoff */
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

const APAgingSummaryTab = forwardRef(function APAgingSummaryTab({ registerActions }, ref) {
  const { user,companyInfo, currentUserRow, refsLoaded, refsLoading } = useAuth();
  const baseKey = "AP_AGING";
  const hydratedRef = useRef(false);

  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    vendCode: "",
    vendName: "",
    refDate: useGetCurrentDay(),
    apAgingDataUnfiltered: [],  // detail (for export)
    apAgingData: [],            // detail table rows
    apAgingDataS: [],           // summary table rows (from getAPInquiryS)
    columnConfig: [],           // detail columns
    columnConfigS: [],          // summary columns
    acctCode: "",
    acctName: "",
    showBranchModal: false,
    showPayeeModal: false,
    showAccountModal: false,
    isLoading: false,
    showSpinner: false,
  });
  const updateState = (u) => setState((p) => ({ ...p, ...u }));
  const {
    branchCode, branchName, vendCode, vendName, refDate,
    apAgingData, apAgingDataS, columnConfig, columnConfigS, apAgingDataUnfiltered,
    acctCode, acctName, isLoading, showSpinner,
    showBranchModal, showPayeeModal, showAccountModal,
  } = state;

  // refs for tables and their UI states
  const tableRefTop = useRef(null);
  const tableRefBottom = useRef(null);
  const tableStateTopRef = useRef({ filters: {}, sortConfig: { key: null, direction: null }, currentPage: 1 });
  const tableStateBottomRef = useRef({ filters: {}, sortConfig: { key: null, direction: null }, currentPage: 1 });

  // spinner smoothing
  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);

  // defaults (user/branch)
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
      vendCode: "",
      vendName: "",
      acctCode: "",
      acctName: "",
      refDate: useGetCurrentDay(),
      apAgingData: [],
      apAgingDataS: [],
      apAgingDataUnfiltered: [],
    });
  }, []);

  const { requestOnce } = useRequestCoalescer();

  // load columns once
  const loadedColsOnceRef = useRef(false);
  useEffect(() => {
    if (loadedColsOnceRef.current) return;
    let alive = true;

    (async () => {
      try {
        const [colsBottom, colsTop] = await Promise.all([
          requestOnce(`cols:${COLS_KEY_BOTTOM}`, () => getHSColsSafe(COLS_KEY_BOTTOM)),
          requestOnce(`cols:${COLS_KEY_TOP}`,    () => getHSColsSafe(COLS_KEY_TOP)),
        ]);
        if (!alive) return;

        setState(prev => ({
          ...prev,
          columnConfig:  Array.isArray(colsBottom) ? colsBottom.map(c => ({ ...c })) : [],
          columnConfigS: Array.isArray(colsTop)    ? colsTop.map(c => ({ ...c }))    : [],
        }));

        loadedColsOnceRef.current = true;
      } catch (e) {
        console.error("Load column config failed:", e);
      }
    })();

    return () => { alive = false; };
  }, [requestOnce]);

  // fetch both summary & detail
  const fetchRecord = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      const response = await requestOnce(
        `rows:${ENDPOINT}:${branchCode}:${vendCode}:${refDate}:${acctCode}`,
        () => fetchData(ENDPOINT, { json_data: { json_data: { branchCode, vendCode, refDate, acctCode } } })
      );

      const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
      const rowsBottom = custData?.[0]?.dt1 ?? []; // detail
      const rowsTop    = custData?.[0]?.dt2 ?? []; // summary (getAPInquiryS shape)

      updateState({
        apAgingData: Array.isArray(rowsBottom) ? rowsBottom : [],
        apAgingDataUnfiltered: Array.isArray(rowsBottom) ? rowsBottom : [],
        apAgingDataS: Array.isArray(rowsTop) ? rowsTop : [],
      });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, vendCode, refDate, acctCode, requestOnce]);

  // fetch detail per selected summary row
  const fetchRecordperCustomer = useCallback(async (selectedPayee) => {
    updateState({ isLoading: true });
    try {
      const response = await fetchData(ENDPOINT, {
        json_data: { json_data: { branchCode, vendCode: selectedPayee, refDate, acctCode } },
      });
      const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
      const rowsBottom = custData?.[0]?.dt1 ?? [];
      updateState({ apAgingData: Array.isArray(rowsBottom) ? rowsBottom : [] });
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, refDate, acctCode]);

  // hydrate from cache / defaults
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (hydratedRef.current) return;
      const cache = getGlobalCache();
      const snap = cache[baseKey];

      const hasValidCache =
        !!snap &&
        (snap.branchCode ||
         snap.refDate ||
         snap.acctCode ||
         (Array.isArray(snap.apAgingData) && snap.apAgingData.length > 0) ||
         (Array.isArray(snap.apAgingDataS) && snap.apAgingDataS.length > 0));

      if (hasValidCache) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            branchCode: snap.branchCode ?? prev.branchCode,
            branchName: snap.branchName ?? prev.branchName,
            vendCode: snap.vendCode ?? prev.vendCode,
            vendName: snap.vendName ?? prev.vendName,
            refDate: snap.refDate ?? prev.refDate,
            acctCode: snap.acctCode ?? prev.acctCode,
            acctName: snap.acctName ?? prev.acctName,
            apAgingData:  Array.isArray(snap.apAgingData)  ? snap.apAgingData  : prev.apAgingData,
            apAgingDataS: Array.isArray(snap.apAgingDataS) ? snap.apAgingDataS : prev.apAgingDataS,
            columnConfig:  Array.isArray(snap.columnConfig)  ? snap.columnConfig  : prev.columnConfig,
            columnConfigS: Array.isArray(snap.columnConfigS) ? snap.columnConfigS : prev.columnConfigS,
          }));
          tableStateTopRef.current    = snap.tableTop    || tableStateTopRef.current;
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
    return () => { cancelled = true; };
  }, [user?.USER_CODE, loadDefaults, handleReset]);

  // snapshot to cache
  useEffect(() => {
    if (!hydratedRef.current) return;
    const cache = getGlobalCache();
    const prev = cache[baseKey] || {};
    cache[baseKey] = {
      ...prev,
      branchCode, branchName, vendCode, vendName, refDate,
      acctCode, acctName,
      apAgingData, apAgingDataS,
      columnConfig, columnConfigS,
      tableTop: tableStateTopRef.current,
      tableBottom: tableStateBottomRef.current,
      scrollTop: prev.scrollTop || { top: 0, left: 0 },
      scrollBottom: prev.scrollBottom || { top: 0, left: 0 },
    };
  }, [
    branchCode, branchName, vendCode, vendName,
    refDate, acctCode, acctName,
    apAgingData, apAgingDataS, columnConfig, columnConfigS,
  ]);

  // restore & persist scroll: TOP
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
      const ready = scroller.scrollHeight > scroller.clientHeight || scroller.scrollWidth > scroller.clientWidth;
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
      cacheNow[baseKey] = { ...prev, scrollTop: { top: scroller.scrollTop, left: scroller.scrollLeft } };
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [apAgingDataS.length, columnConfigS.length]);

  // restore & persist scroll: BOTTOM
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
      const ready = scroller.scrollHeight > scroller.clientHeight || scroller.scrollWidth > scroller.clientWidth;
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
      cacheNow[baseKey] = { ...prev, scrollBottom: { top: scroller.scrollTop, left: scroller.scrollLeft } };
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [apAgingData.length, columnConfig.length]);

  // export
  const handleExport = useCallback(async () => {
    try {
      updateState({ isLoading: true });
    
   
        const exportData = {
        "Data" : {
          "AP Aging Summary" : apAgingDataS,
          "AP Aging Detailed" : apAgingDataUnfiltered,
        }
      }

      const columnConfigsMap = {
          "AP Aging Summary" : columnConfigS,
          "AP Aging Detailed" : columnConfig,
        }
      
      const payload = {
        ReportName: "AP Aging Report",
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
  }, [apAgingDataUnfiltered, apAgingDataS, columnConfig, columnConfigS, branchCode, refDate, user]);

  // register actions
  useEffect(() => {
    registerActions?.({
      onFind: fetchRecord,
      onReset: handleReset,
      onPrint: () => window.print(),
      onExport: handleExport,
      onViewDoc: undefined,
    });
  }, [registerActions, fetchRecord, handleReset, handleExport]);

  const handleViewTop = useCallback((row) => {
    fetchRecordperCustomer(row.vendCode);
    updateState({ vendName: row.vendName, vendCode: row.vendCode });
  }, [fetchRecordperCustomer]);

  const handleViewRow = useCallback((row) => {
    const url = `${window.location.origin}${row.pathUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // —— Totals for Filter Summary (from SUMMARY rows: getAPInquiryS) ——
  // Outstanding Balance = sum(amountDue)
  // Current             = sum(dayCurrent)
  // Amount Due          = sum(amountDue - dayCurrent)
  const sums = useMemo(() => {
    const rows = Array.isArray(apAgingDataS) ? apAgingDataS : [];
    let outstanding = 0, current = 0, amountDue = 0;

    for (const r of rows) {
      const amt = (typeof parseFormattedNumber === "function"
        ? parseFormattedNumber(r?.amountDue)
        : Number(r?.amountDue)) || 0;

      const cur = (typeof parseFormattedNumber === "function"
        ? parseFormattedNumber(r?.dayCurrent)
        : Number(r?.dayCurrent)) || 0;

      outstanding += isNaN(amt) ? 0 : amt;
      current     += isNaN(cur) ? 0 : cur;
      amountDue   += (isNaN(amt) ? 0 : amt) - (isNaN(cur) ? 0 : cur);
    }

    const fmt = (n) =>
      typeof formatNumber === "function"
        ? formatNumber(n)
        : (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      outstanding: fmt(outstanding),
      current: fmt(current),
      amountDue: fmt(amountDue),
    };
  }, [apAgingDataS]);

  // initial UI states
  const initialStateTop = getGlobalCache()[baseKey]?.tableTop || undefined;
  const initialStateBottom = getGlobalCache()[baseKey]?.tableBottom || undefined;

  return (
    <div>
      {showSpinner && <LoadingSpinner />}

      {/* === Redesigned Filters Card (3-panel) === */}
      <div className="global-tran-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">

            {/* Customer / Account / Date */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                Payee & Account
              </h3>

              <div className="global-tran-textbox-group-div-ui">
                {/* Branch */}
                <div className="relative">
                  <input
                    type="text"
                    id="branchName"
                    placeholder=" "
                    value={branchName}
                    readOnly
                    className="peer global-tran-textbox-ui cursor-pointer"
                  />
                  <label htmlFor="branchName" className="global-tran-floating-label">Branch</label>
                  <button
                    type="button"
                    className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
                    onClick={() => updateState({ showBranchModal: true })}
                    disabled={isLoading}
                    aria-label="Find Branch"
                    title="Find Branch"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* Reference Date */}
                <div className="relative">
                  <input
                    type="date"
                    className="peer global-tran-textbox-ui"
                    value={refDate}
                    onChange={(e) => updateState({ refDate: e.target.value })}
                  />
                  <label htmlFor="SVIDate" className="global-tran-floating-label">Reference Date</label>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <FontAwesomeIcon icon={faCalendarDays} />
                  </span>
                </div>

                {/* AR Account */}
                <div className="relative">
                  <input
                    type="text"
                    id="acctName"
                    placeholder=" "
                    value={acctName}
                    readOnly
                    className="peer global-tran-textbox-ui cursor-pointer"
                  />
                  <label htmlFor="acctName" className="global-tran-floating-label">AP Account</label>
                  <button
                    type="button"
                    className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
                    onClick={() => updateState({ showAccountModal: true })}
                    disabled={isLoading}
                    aria-label="Find Account"
                    title="Find Account"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>
            </section>

            {/* Customer Fields */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faSliders} />
                Filters
              </h3>

              <div className="global-tran-textbox-group-div-ui">
                {/* Customer Code */}
                <div className="relative">
                  <input
                    type="text"
                    id="vendCode"
                    placeholder=" "
                    value={vendCode}
                    onChange={(e) => updateState({ vendCode: e.target.value })}
                    className="peer global-tran-textbox-ui"
                    disabled={isLoading}
                  />
                  <label htmlFor="vendCode" className="global-tran-floating-label">Payee Code</label>
                  <button
                    type="button"
                    className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
                    onClick={() => updateState({ showPayeeModal: true })}
                    disabled={isLoading}
                    aria-label="Find Payee"
                    title="Find Payee"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                {/* Customer Name */}
                <div className="relative">
                  <input
                    type="text"
                    id="vendName"
                    placeholder=" "
                    value={vendName}
                    readOnly
                    className="peer global-tran-textbox-ui"
                  />
                  <label htmlFor="vendName" className="global-tran-floating-label">Payee Name</label>
                </div>
              </div>
            </section>

            {/* Filter Summary (computed from apAgingDataS) */}
            <aside className="p-5 bg-gray-50">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faTableList} />
                Filter Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount Due:</span>
                  <span className="font-semibold text-blue-600">{sums.outstanding}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current:</span>
                  <span className="font-semibold text-blue-600">{sums.current}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Over Due:</span>
                  <span className="font-semibold text-blue-600">{sums.amountDue}</span>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </div>

      {/* Summary (TOP) */}
      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Summary</button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
          <div className="max-h-[600px] overflow-y-auto relative">
            <SearchGlobalReportTable
              ref={tableRefTop}
              columns={columnConfigS}
              data={apAgingDataS}
              itemsPerPage={50}
              showFilters={true}
              rightActionLabel="View"
              onRowAction={handleViewTop}
              className="mt-2"
              initialState={initialStateTop}
              onStateChange={(tbl) => {
                tableStateTopRef.current = tbl;
                const cache = getGlobalCache();
                const prev = cache[baseKey] || {};
                cache[baseKey] = { ...prev, tableTop: tbl };
              }}
            />
          </div>
        </div>
      </div>

      {/* Detailed (BOTTOM) */}
      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Detailed</button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
          <div className="max-h-[600px] overflow-y-auto relative">
            <SearchGlobalReportTable
              ref={tableRefBottom}
              columns={columnConfig}
              data={apAgingData}
              itemsPerPage={50}
              showFilters={true}
              rightActionLabel="View"
              onRowAction={handleViewRow}
              className="mt-2"
              initialState={initialStateBottom}
              onStateChange={(tbl) => {
                tableStateBottomRef.current = tbl;
                const cache = getGlobalCache();
                const prev = cache[baseKey] || {};
                cache[baseKey] = { ...prev, tableBottom: tbl };
              }}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
              });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showAccountModal && (
        <COAMastLookupModal
          isOpen={showAccountModal}
          customParam={"ARGL"}
          onClose={(selectedAccount) => {
            if (selectedAccount) {
              updateState({
                acctCode: selectedAccount.acctCode,
                acctName: selectedAccount.acctName,
              });
            }
            updateState({ showAccountModal: false });
          }}
        />
      )}

      {showPayeeModal && (
        <PayeeMastLookupModal
          isOpen={showPayeeModal}
          onClose={(selectedPayee) => {
            if (selectedPayee) {
              updateState({
                vendCode: selectedPayee.vendCode,
                vendName: selectedPayee.vendName,
                apAgingData: [],
                apAgingDataS: [],
                apAgingDataUnfiltered: [],
              });
            }
            updateState({ showPayeeModal: false });
          }}
        />
      )}
    </div>
  );
});

export default APAgingSummaryTab;
