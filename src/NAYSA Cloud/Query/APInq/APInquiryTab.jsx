import { useEffect, useState, useRef, useCallback, forwardRef } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faUser,
  faCalendarAlt,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {exportGenericHistoryExcel} from "@/NAYSA Cloud/Global/report";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import {
  useTopCompanyRow,
  useTopUserRow,
  useTopBranchRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { formatNumber, parseFormattedNumber } from "@/NAYSA Cloud/Global/behavior";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";

const ENDPOINT = "getAPInquiry";

/** Light global cache so the tab remembers its UI state across mounts */
function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_APINQ_CACHE__) window.__NAYSA_APINQ_CACHE__ = {};
    return window.__NAYSA_APINQ_CACHE__;
  }
  return {};
}

const APInquiryTab = forwardRef(function APInquiryTab({ registerActions }, ref) {
  const { user,companyInfo, currentUserRow, refsLoaded, refsLoading } = useAuth();
  const baseKey = "AP_INQUIRY";
  const hydratedRef = useRef(false);

  const [state, setState] = useState({
    branchCode: "",
    branchName: "",
    vendCode: "",
    vendName: "",
    startingCutoff: "",
    startingCutoffName: "",
    endingCutoff: "",
    endingCutoffName: "",
    arInquiryData: [],
    columnConfig: [],
    beginningBalance: "0.00",
    totalDebit: "0.00",
    totalCredit: "0.00",
    endingBalance: "0.00",
    showBranchModal: false,
    showPayeeModal: false,
    showCutoffModal: false,
    cutoffModalType: "",
    isLoading: false,
    showSpinner: false,
  });

  const [exporting, setExporting] = useState(false);
  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode, branchName, vendCode, vendName,
    startingCutoff, startingCutoffName,
    endingCutoff, endingCutoffName,
    arInquiryData, columnConfig,
    beginningBalance, totalDebit, totalCredit, endingBalance,
    showBranchModal, showPayeeModal, showCutoffModal, cutoffModalType,
    isLoading, showSpinner,
  } = state;

  // ---- table refs/state caching (filters/sort/page/scroll) ----
  const tableRef = useRef(null);
  const tableStateRef = useRef({ filters: {}, sortConfig: { key: null, direction: null }, currentPage: 1 });

  // keep export values in refs (avoid async state race)
  const dataRefs = useRef({ arInquiry: [] });
  const colRefs  = useRef({ arInquiry: [] });
  useEffect(() => { dataRefs.current.arInquiry = arInquiryData; }, [arInquiryData]);
  useEffect(() => { colRefs.current.arInquiry = columnConfig; }, [columnConfig]);

  // smooth spinner
  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);

  // load columns once
  const loadedColsRef = useRef(false);
  useEffect(() => {
    if (loadedColsRef.current) return;
    let alive = true;
    (async () => {
      try {
        const cols = await useSelectedHSColConfig(ENDPOINT);
        if (!alive || !Array.isArray(cols)) return;
        setState((prev) => {
          const same = prev.columnConfig.length === cols.length &&
                       prev.columnConfig.every((c, i) => c.key === cols[i].key);
          return same ? prev : { ...prev, columnConfig: cols.map(c => ({ ...c })) };
        });
        loadedColsRef.current = true;
      } catch (e) {
        console.error("Load column config failed:", e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // defaults (company/user/branch)
  const loadAPInqDefault = useCallback(async () => {
    updateState({ showSpinner: true });
    try {
      const [hsCompany, hsUser] = await Promise.all([
        useTopCompanyRow(),
        useTopUserRow(user?.USER_CODE),
      ]);
      if (hsCompany) {
        updateState({
          startingCutoffName: hsCompany.cutoffName,
          endingCutoffName: hsCompany.cutoffName,
          startingCutoff: hsCompany.cutoffCode,
          endingCutoff: hsCompany.cutoffCode,
        });
      }
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
      arInquiryData: [],
      beginningBalance: "0.00",
      totalDebit: "0.00",
      totalCredit: "0.00",
      endingBalance: "0.00",
    });
  }, []);

  // totals
  const calculateTotals = useCallback((rows = []) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      updateState({
        totalDebit: "0.00",
        totalCredit: "0.00",
        endingBalance: beginningBalance,
      });
      return;
    }
    const totals = rows.reduce(
      (acc, row) => {
        acc.debit += parseFormattedNumber(row.debit) || 0;
        acc.credit += parseFormattedNumber(row.credit) || 0;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
    const beg = parseFormattedNumber(beginningBalance) || 0;
    const end = beg + totals.debit - totals.credit;
    updateState({
      totalDebit: formatNumber(totals.debit),
      totalCredit: formatNumber(totals.credit),
      endingBalance: formatNumber(end),
    });
  }, [beginningBalance]);

  // find (rows only)
  const fetchRecord = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      // keeping payload structure as-is to avoid breaking your API
      const response = await fetchData(ENDPOINT, {
        json_data: { json_data: { branchCode, vendCode, startingCutoff, endingCutoff } },
      });

      const custData = response?.data?.[0]?.result
        ? JSON.parse(response.data[0].result)
        : [];

      const rows = custData?.[0]?.dt1 ?? [];
      updateState({ arInquiryData: Array.isArray(rows) ? rows : [] });
      calculateTotals(rows);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, vendCode, startingCutoff, endingCutoff, calculateTotals]);

  // -------- hydrate from cache or load defaults once --------
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (hydratedRef.current) return;

      const cache = getGlobalCache();
      const snap = cache[baseKey];

      const hasValidCache =
        !!snap &&
        (snap.branchCode ||
         snap.startingCutoff ||
         (Array.isArray(snap.arInquiryData) && snap.arInquiryData.length > 0));

      if (hasValidCache) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            branchCode: snap.branchCode ?? prev.branchCode,
            branchName: snap.branchName ?? prev.branchName,
            vendCode: snap.vendCode ?? prev.vendCode,
            vendName: snap.vendName ?? prev.vendName,
            startingCutoff: snap.startingCutoff ?? prev.startingCutoff,
            startingCutoffName: snap.startingCutoffName ?? prev.startingCutoffName,
            endingCutoff: snap.endingCutoff ?? prev.endingCutoff,
            endingCutoffName: snap.endingCutoffName ?? prev.endingCutoffName,
            arInquiryData: Array.isArray(snap.arInquiryData) ? snap.arInquiryData : prev.arInquiryData,
            columnConfig: Array.isArray(snap.columnConfig) ? snap.columnConfig : prev.columnConfig,
            beginningBalance: snap.beginningBalance ?? prev.beginningBalance,
            totalDebit: snap.totalDebit ?? prev.totalDebit,
            totalCredit: snap.totalCredit ?? prev.totalCredit,
            endingBalance: snap.endingBalance ?? prev.endingBalance,
          }));
          // hydrate table UI state (filters/sort/page)
          tableStateRef.current = snap.table || tableStateRef.current;
          hydratedRef.current = true;
        }
        return;
      }

      // wait for user, then load defaults once
      if (!user?.USER_CODE) return;
      await loadAPInqDefault();
      await handleReset();
      hydratedRef.current = true;
    };
    run();
    return () => { cancelled = true; };
  }, [user?.USER_CODE, loadAPInqDefault, handleReset]);

  // -------- snapshot into cache whenever important things change --------
  useEffect(() => {
    if (!hydratedRef.current) return; // avoid writing empty snapshot before hydration
    const cache = getGlobalCache();
    const prev = cache[baseKey] || {};
    cache[baseKey] = {
      ...prev,
      branchCode,
      branchName,
      vendCode,
      vendName,
      startingCutoff,
      startingCutoffName,
      endingCutoff,
      endingCutoffName,
      arInquiryData,
      columnConfig,
      beginningBalance,
      totalDebit,
      totalCredit,
      endingBalance,
      table: tableStateRef.current, // <- filters/sort/page live here
      // keep any existing scroll position
      scroll: prev.scroll || { top: 0, left: 0 },
    };
  }, [
    branchCode, branchName, vendCode, vendName,
    startingCutoff, startingCutoffName, endingCutoff, endingCutoffName,
    arInquiryData, columnConfig, beginningBalance, totalDebit, totalCredit, endingBalance,
  ]);

  // -------- restore & persist scroll position of the table --------
  useEffect(() => {
    const cache = getGlobalCache();
    const snap = cache[baseKey] || {};
    const targetTop = Number(snap?.scroll?.top) || 0;
    const targetLeft = Number(snap?.scroll?.left) || 0;

    let tries = 0;
    const maxTries = 8;

    const tryRestore = () => {
      const scroller = tableRef.current?.scrollRef?.current;
      if (!scroller) {
        if (tries++ < maxTries) requestAnimationFrame(tryRestore);
        return;
      }

      // wait until content is measurable
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

    // run twice to ensure DOM paint done
    requestAnimationFrame(() => requestAnimationFrame(tryRestore));

    // save on scroll
    const scroller = tableRef.current?.scrollRef?.current;
    if (!scroller) return;
    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[baseKey] || {};
      cacheNow[baseKey] = {
        ...prev,
        scroll: { top: scroller.scrollTop, left: scroller.scrollLeft },
      };
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [arInquiryData.length, columnConfig.length]);





  
  const handleExport = useCallback(async () => {
    const rows = dataRefs.current.arInquiry;
    const colsInq = colRefs.current.arInquiry;
    if (!Array.isArray(rows) || rows.length === 0) return;
    setExporting(true);

    try {
  
      const exportData = {
        "Data" : {
          "AP Query Detailed" : rows
        }
      }

      const columnConfigsMap = {
          "AP Query Detailed": colsInq 
      };


      const payload = {
        ReportName: "AP Inquiry Report",
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
      setExporting(false);
    }
  }, [branchCode, user]);

  // register action bar handlers
  useEffect(() => {
    registerActions?.({
      onFind: fetchRecord,
      onReset: handleReset,
      onPrint: () => window.print(),
      onExport: handleExport,
      onViewDoc: undefined,
    });
  }, [registerActions, fetchRecord, handleReset, handleExport]);

  const handleViewRow = useCallback((row) => {
    const url = `${window.location.origin}${row.pathUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // initial table UI state from cache (if any)
  const initialTableState = getGlobalCache()[baseKey]?.table || undefined;

  return (
    <div>
      {(showSpinner || exporting) && <LoadingSpinner />}

      {/* === Filters + Summary (Redesigned) === */}
      <div id="summary" className="global-tran-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          {/* 3 columns with subtle dividers; stack on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            {/* Payee Details */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                Payee Details
              </h3>

              {/* Branch */}
              <div className="global-tran-textbox-group-div-ui">
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
              </div>

              {/* Payee Code */}
              <div className="global-tran-textbox-group-div-ui">
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
              </div>

              {/* Payee Name */}
              <div className="global-tran-textbox-group-div-ui">
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

            {/* Date Range */}
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faCalendarAlt} />
                Date Range
              </h3>

              {/* Starting Cut-off */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="text"
                    id="startingCutoffName"
                    placeholder=" "
                    value={startingCutoffName}
                    readOnly
                    className="peer global-tran-textbox-ui cursor-pointer"
                  />
                  <label htmlFor="startingCutoffName" className="global-tran-floating-label">Starting Cut-off</label>
                  <button
                    type="button"
                    className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
                    onClick={() => updateState({ showCutoffModal: true, cutoffModalType: "starting" })}
                    disabled={isLoading}
                    aria-label="Find Starting Cut-off"
                    title="Find Starting Cut-off"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>

              {/* Ending Cut-off */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="text"
                    id="endingCutoffName"
                    placeholder=" "
                    value={endingCutoffName}
                    readOnly
                    className="peer global-tran-textbox-ui cursor-pointer"
                  />
                  <label htmlFor="endingCutoffName" className="global-tran-floating-label">Ending Cut-off</label>
                  <button
                    type="button"
                    className="global-tran-textbox-button-search-padding-ui global-tran-textbox-button-search-enabled-ui global-tran-textbox-button-search-ui"
                    onClick={() => updateState({ showCutoffModal: true, cutoffModalType: "ending" })}
                    disabled={isLoading}
                    aria-label="Find Ending Cut-off"
                    title="Find Ending Cut-off"
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>
              </div>
            </section>

            {/* Financial Summary */}
            <aside className="p-5 bg-gray-50">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faChartLine} />
                AP Balance Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Beginning Balance:</span>
                  <span className="font-semibold text-gray-800">{beginningBalance}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Debit:</span>
                  <span className="font-semibold text-red-600">{totalDebit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Credit:</span>
                  <span className="font-semibold text-green-600">{totalCredit}</span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-gray-700">Ending Balance:</span>
                  <span className="font-bold text-blue-600">{endingBalance}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* === Table Section (unchanged layout, minor tidy) === */}
      <div id="summary" className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Transaction Details
            </button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
          <div className="max-h-[600px] overflow-y-auto relative">
            <SearchGlobalReportTable
              ref={tableRef}
              columns={columnConfig}
              data={arInquiryData}
              itemsPerPage={50}
              showFilters={true}
              rightActionLabel="View"
              onRowAction={handleViewRow}
              className="mt-2"
              initialState={initialTableState}
              onStateChange={(tbl) => {
                tableStateRef.current = tbl;
                const cache = getGlobalCache();
                const prev = cache[baseKey] || {};
                cache[baseKey] = { ...prev, table: tbl };
              }}
            />
          </div>
        </div>
      </div>

      {/* === Modals (unchanged) === */}
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

      {showPayeeModal && (
        <PayeeMastLookupModal
          isOpen={showPayeeModal}
          onClose={(selectedPayee) => {
            if (selectedPayee) {
              updateState({
                vendCode: selectedPayee.vendCode,
                vendName: selectedPayee.vendName,
                arInquiryData: [],
                beginningBalance: "0.00",
                totalDebit: "0.00",
                totalCredit: "0.00",
                endingBalance: "0.00",
              });
            }
            updateState({ showPayeeModal: false });
          }}
        />
      )}

      {showCutoffModal && (
        <CutoffLookupModal
          isOpen={showCutoffModal}
          onClose={(selectedCutoff) => {
            if (selectedCutoff) {
              if (cutoffModalType === "starting") {
                updateState({
                  startingCutoff: selectedCutoff.cutoffCode,
                  startingCutoffName: selectedCutoff.cutoffName,
                });
              } else {
                updateState({
                  endingCutoff: selectedCutoff.cutoffCode,
                  endingCutoffName: selectedCutoff.cutoffName,
                });
              }
            }
            updateState({ showCutoffModal: false, cutoffModalType: "" });
          }}
        />
      )}
    </div>
  );
});

export default APInquiryTab;
