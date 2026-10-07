import { useEffect, useState, useRef, useCallback, forwardRef, useMemo } from "react";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faSliders,
  faTableList,
} from "@fortawesome/free-solid-svg-icons";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { useGetCurrentDayV2 } from "@/NAYSA Cloud/Global/dates";

const ENDPOINT = "getAPSchedule";
const BASE_KEY = "AP_SCHEDULE";

function getGlobalCache() {
  if (typeof window !== "undefined") {
    if (!window.__NAYSA_APSCH_CACHE__) window.__NAYSA_APSCH_CACHE__ = {};
    return window.__NAYSA_APSCH_CACHE__;
  }
  return {};
}

const toNumber = (value) => {
  const parsed = typeof parseFormattedNumber === "function"
    ? parseFormattedNumber(value)
    : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(Number(parsed)) ? Number(parsed) : 0;
};

/**
 * AP Schedule has its own stored-procedure processing.
 * AP Schedule uses its own getAPSchedule HTTP endpoint and AP_Schedule
 * stored-procedure mode. AP Aging dt1/dt2 are never consumed here.
 */
const extractScheduleRows = (response) => {
  const rawResult = response?.data?.[0]?.result;
  if (!rawResult) return [];

  const parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
  const resultRow = Array.isArray(parsed) ? parsed[0] : parsed;

  if (!resultRow || !Array.isArray(resultRow.apSchedule)) {
    throw new Error("Invalid AP Schedule response. Expected apSchedule array from getAPSchedule.");
  }

  return resultRow.apSchedule;
};

const normalizeScheduleRow = (row) => ({
  ...row,
  payeeGroup: [row?.vendCode, row?.vendName].filter(Boolean).join(" - ") || "(No Payee)",
});

const SCHEDULE_COLUMNS = [
  { key: "payeeGroup", label: "Payee", hidden: false },
  { key: "branchCode", label: "Branch" },
  { key: "vendCode", label: "Payee Code" },
  { key: "vendName", label: "Payee Name" },
  { key: "acctCode", label: "AP Account" },
  { key: "acctName", label: "AP Account Name" },
  { key: "docCode", label: "Doc Type" },
  { key: "docNo", label: "Document No." },
  { key: "docDate", label: "Document Date", renderType: "date" },
  { key: "refNo", label: "Reference No." },
  { key: "refDate", label: "Reference Date", renderType: "date" },
  { key: "paytermCode", label: "Pay Term" },
  { key: "dueDate", label: "Due Date", renderType: "date" },
  { key: "currCode", label: "Currency" },
  { key: "originalAmount", label: "Original AP", renderType: "currency", roundingOff: 2 },
  { key: "appliedAmount", label: "Applied / Debit", renderType: "currency", roundingOff: 2 },
  { key: "outstandingBalance", label: "Outstanding Balance", renderType: "currency", roundingOff: 2 },
  { key: "ageInDays", label: "Age in Days", renderType: "number" },
  { key: "daysOverdue", label: "Days Overdue", renderType: "number" },
  { key: "status", label: "Status" },
  { key: "remarks", label: "Remarks" },
];

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

  return { requestOnce, resultCache };
}

const APScheduleTab = forwardRef(function APScheduleTab({ registerActions }, ref) {
  const { currentUserRow } = useAuth();
  const hydratedRef = useRef(false);
  const tableRef = useRef(null);
  const tableStateRef = useRef({
    filters: {},
    sortConfig: { key: null, direction: null },
    currentPage: 1,
  });

  const [state, setState] = useState({
    branchCode: currentUserRow.branchCode,
    branchName: currentUserRow.branchName,
    vendCode: "",
    vendName: "",
    refDate: useGetCurrentDayV2(),
    acctCode: "",
    acctName: "",
    scheduleData: [],
    showBranchModal: false,
    showPayeeModal: false,
    showAccountModal: false,
    isLoading: false,
    showSpinner: false,
  });

  const updateState = (u) => setState((p) => ({ ...p, ...u }));

  const {
    branchCode,
    branchName,
    vendCode,
    vendName,
    refDate,
    acctCode,
    acctName,
    scheduleData,
    showBranchModal,
    showPayeeModal,
    showAccountModal,
    isLoading,
    showSpinner,
  } = state;

  const { requestOnce, resultCache } = useRequestCoalescer();

  useEffect(() => {
    let t;
    if (isLoading) t = setTimeout(() => updateState({ showSpinner: true }), 200);
    else updateState({ showSpinner: false });
    return () => clearTimeout(t);
  }, [isLoading]);

  const handleReset = useCallback(async () => {
    resultCache.current.clear();
    updateState({
      vendCode: "",
      vendName: "",
      acctCode: "",
      acctName: "",
      refDate: useGetCurrentDayV2(),
      scheduleData: [],
      });
  }, [resultCache]);

  const fetchRecord = useCallback(async () => {
    updateState({ isLoading: true });

    try {
      const response = await requestOnce(
        `rows:${ENDPOINT}:${branchCode}:${vendCode}:${refDate}:${acctCode}`,
        () =>
          fetchData(ENDPOINT, {
            json_data: {
              json_data: {
                branchCode,
                vendCode,
                refDate,
                acctCode,
              },
            },
          })
      );

      const rows = extractScheduleRows(response);
      const safeRows = Array.isArray(rows)
        ? rows.map((row) => normalizeScheduleRow(row))
        : [];

      if (safeRows.length === 0) {
        updateState({ scheduleData: [] });
        useSwalErrorAlert("AP Schedule", "No records found.");
        return;
      }

      updateState({ scheduleData: safeRows });
    } catch (err) {
      console.error("Error fetching AP Schedule:", err);
    } finally {
      updateState({ isLoading: false });
    }
  }, [branchCode, vendCode, refDate, acctCode, requestOnce]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (hydratedRef.current) return;
      const cache = getGlobalCache();
      const snap = cache[BASE_KEY];

      const hasValidCache =
        !!snap &&
        (snap.branchCode ||
          snap.refDate ||
          snap.acctCode ||
          (Array.isArray(snap.scheduleData) && snap.scheduleData.length > 0));

      if (hasValidCache) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            branchCode: snap.branchCode ?? prev.branchCode,
            branchName: snap.branchName ?? prev.branchName,
            vendCode: snap.vendCode ?? prev.vendCode,
            vendName: snap.vendName ?? prev.vendName,
            refDate: snap.refDate ?? prev.refDate,
            acctCode: snap.acctCode ?? prev.acctCode,
            acctName: snap.acctName ?? prev.acctName,
            scheduleData: Array.isArray(snap.scheduleData) ? snap.scheduleData : prev.scheduleData,
          }));
          tableStateRef.current = snap.table || tableStateRef.current;
          hydratedRef.current = true;
        }
        return;
      }

      hydratedRef.current = true;
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const cache = getGlobalCache();
    const prev = cache[BASE_KEY] || {};
    cache[BASE_KEY] = {
      ...prev,
      branchCode,
      branchName,
      vendCode,
      vendName,
      refDate,
      acctCode,
      acctName,
      scheduleData,
          table: tableStateRef.current,
      scroll: prev.scroll || { top: 0, left: 0 },
    };
  }, [
    branchCode,
    branchName,
    vendCode,
    vendName,
    refDate,
    acctCode,
    acctName,
    scheduleData,
  ]);

  useEffect(() => {
    const cache = getGlobalCache();
    const snap = cache[BASE_KEY] || {};
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

    const scroller = tableRef.current?.scrollRef?.current;
    if (!scroller) return;

    const onScroll = () => {
      const cacheNow = getGlobalCache();
      const prev = cacheNow[BASE_KEY] || {};
      cacheNow[BASE_KEY] = {
        ...prev,
        scroll: { top: scroller.scrollTop, left: scroller.scrollLeft },
      };
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [scheduleData.length]);

  useEffect(() => {
    registerActions?.({
      onFind: fetchRecord,
      onReset: handleReset,
      onPrint: () => window.print(),
      onExport: undefined,
      onViewDoc: undefined,
    });
  }, [registerActions, fetchRecord, handleReset]);

  const handleViewRow = useCallback((row) => {
    if (!row?.pathUrl) return;
    const url = `${window.location.origin}${row.pathUrl}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const totals = useMemo(() => {
    const rows = Array.isArray(scheduleData) ? scheduleData : [];
    let outstanding = 0;
    let current = 0;
    let overdue = 0;

    for (const row of rows) {
      const amount = toNumber(row?.outstandingBalance);
      outstanding += amount;

      const status = String(row?.status || "").toUpperCase();
      if (status === "OVERDUE") overdue += amount;
      else if (status !== "PAID") current += amount;
    }

    const fmt = (n) =>
      typeof formatNumber === "function"
        ? formatNumber(n)
        : (n || 0).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

    return {
      outstanding: fmt(outstanding),
      current: fmt(current),
      overdue: fmt(overdue),
    };
  }, [scheduleData]);

  const initialState = useMemo(() => {
    const cached = getGlobalCache()[BASE_KEY]?.table || {};
    return {
      ...cached,
      groupBy: Array.isArray(cached.groupBy) && cached.groupBy.length ? cached.groupBy : ["payeeGroup"],
      autoExpandGroups: cached.autoExpandGroups ?? true,
    };
  }, []);

  const scheduleColumns = useMemo(() => {
    if (!scheduleData.length) return SCHEDULE_COLUMNS;
    const always = new Set([
      "payeeGroup", "vendCode", "vendName", "docNo",
      "outstandingBalance", "status"
    ]);
    return SCHEDULE_COLUMNS.filter((col) =>
      always.has(col.key) || scheduleData.some((row) => {
        const value = row?.[col.key];
        return value !== undefined && value !== null && String(value).trim() !== "" && value !== 0;
      })
    );
  }, [scheduleData]);

  return (
    <div>
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-tab-div-ui">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faUser} />
                Payee & Account
              </h3>

              <div className="space-y-3">
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

                <div className="relative w-full">
                  <div
                    className={`flex items-stretch global-ref-textbox-ui ${
                      !isLoading
                        ? "global-ref-textbox-enabled"
                        : "global-ref-textbox-disabled"
                    }`}
                  >
                    <DateFormatInput
                      id="refDate"
                      className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                      value={refDate}
                      disabled={isLoading}
                      updateState={updateState}
                    />
                  </div>
                  <label htmlFor="refDate" className="global-ref-floating-label">
                    Reference Date
                  </label>
                </div>

                <FieldRenderer
                  id="acctName"
                  name="acctName"
                  label="AP Account"
                  type="lookup"
                  value={acctName || ""}
                  readOnly
                  disabled={isLoading}
                  onLookup={() => updateState({ showAccountModal: true })}
                />
              </div>
            </section>

            <section className="p-5">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faSliders} />
                Filters
              </h3>

              <div className="space-y-3">
                <FieldRenderer
                  id="vendCode"
                  name="vendCode"
                  label="Payee Code"
                  type="lookup"
                  value={vendCode || ""}
                  disabled={isLoading}
                  onChange={(val) => updateState({ vendCode: val })}
                  onLookup={() => updateState({ showPayeeModal: true })}
                />

                <FieldRenderer
                  id="vendName"
                  name="vendName"
                  label="Payee Name"
                  type="text"
                  value={vendName || ""}
                  disabled
                  readOnly
                />
              </div>
            </section>

            <aside className="p-5 bg-gray-50">
              <h3 className="flex items-center gap-2 text-gray-800 font-semibold mb-4">
                <FontAwesomeIcon className="text-blue-600" icon={faTableList} />
                Schedule Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Outstanding:</span>
                  <span className="font-semibold text-blue-600">{totals.outstanding}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Current:</span>
                  <span className="font-semibold text-blue-600">{totals.current}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Over Due:</span>
                  <span className="font-semibold text-blue-600">{totals.overdue}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui">
        <div className="global-tran-tab-nav-ui">
          <div className="flex flex-row sm:flex-row">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              AP Schedule
            </button>
          </div>
        </div>

        <div className="global-tran-table-main-div-ui">
          <SearchGlobalReportTable
            ref={tableRef}
            columns={scheduleColumns}
            data={scheduleData}
            itemsPerPage={50}
            showFilters={true}
            showGroupBy={true}
            rightActionLabel="View"
            onRowAction={handleViewRow}
            className="mt-2"
            docType="AP Schedule"
            initialState={initialState}
            onStateChange={(tbl) => {
              tableStateRef.current = tbl;
              const cache = getGlobalCache();
              const prev = cache[BASE_KEY] || {};
              cache[BASE_KEY] = { ...prev, table: tbl };
            }}
          />
        </div>
      </div>

      {showBranchModal && (
        <BranchLookupModal
          isOpen={showBranchModal}
          onClose={(selectedBranch) => {
            if (selectedBranch) {
              updateState({
                branchCode: selectedBranch.branchCode,
                branchName: selectedBranch.branchName,
                acctCode: "",
                acctName: "",
                scheduleData: [],
                          });
            }
            updateState({ showBranchModal: false });
          }}
        />
      )}

      {showAccountModal && (
        <COAMastLookupModal
          isOpen={showAccountModal}
          customParam="APGL"
          onClose={(selectedAccount) => {
            if (selectedAccount) {
              updateState({
                acctCode: selectedAccount.acctCode,
                acctName: selectedAccount.acctName,
                scheduleData: [],
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
                scheduleData: [],
                          });
            }
            updateState({ showPayeeModal: false });
          }}
        />
      )}
    </div>
  );
});

export default APScheduleTab;
