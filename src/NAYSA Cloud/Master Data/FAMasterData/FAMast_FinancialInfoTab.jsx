// src/NAYSA Cloud/Master Data/FAMasterData/FAMast_FinancialInfoTab.jsx
import React, { useMemo, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faUndo, faTimes, faSearch } from "@fortawesome/free-solid-svg-icons";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

/**
 * Fixed Asset Financial Information tab
 *
 * Mirrors the search / slice pattern in FAMast_DataTab:
 * - "Load Records" calls onRefresh (parent's loadFinancialInfoList) with
 *   { search, searchMode } — same as DataTab calling onFilter.
 * - Client-side search then filters ALL returned rows.
 * - Result is sliced to top 100 before being passed to the table.
 * - Double-clicking a row navigates to SetupTab (handled by parent).
 */
const FAMast_FinancialInfoTab = ({
  data = [],
  isLoading = false,
  isFetching = false,
  selectedRow = null,
  onRowClick,
  onRowDoubleClick,
  onRefresh,
  tableRef,
}) => {
  // ── Search state (mirrors DataTab) ────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("part"); // "part" = Contains, "start" = Starts With

  // ── Column definitions ────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      { key: "faCode",                  label: "Asset Code",               classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "faName",                  label: "Description",              classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "categName",               label: "Category",                 classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "className",               label: "Sub Category",             classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "locName",                 label: "Location",                 classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "rcName",                  label: "RC Name",                  classNames: "text-left",  renderType: "text",   renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "currCode",                label: "Curr Code",                classNames: "text-center", renderType: "text",  renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "acquisitionDate",         label: "Acquisition Date",         classNames: "text-center", renderType: "date",  renderFormat: "MM/dd/yyyy", roundingOff: 0, hidden: 0 },
      { key: "deprStart",               label: "Depr. Start",              classNames: "text-center", renderType: "text",  renderFormat: null,         roundingOff: 0, hidden: 0 },
      { key: "acquisitionCost",         label: "Acquisition Cost",         classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
      { key: "eul",                     label: "EUL",                      classNames: "text-right", renderType: "number", renderFormat: "quantity",   roundingOff: 0, hidden: 0 },
      { key: "rul",                     label: "RUL",                      classNames: "text-right", renderType: "number", renderFormat: "quantity",   roundingOff: 0, hidden: 0 },
      { key: "monthlyDepreciation",     label: "Monthly Depreciation",     classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
      { key: "accumulatedDepreciation", label: "Accumulated Depreciation", classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
      { key: "netBookValue",            label: "Net Book Value",           classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
      { key: "salvageValue",            label: "Salvage Value",            classNames: "text-right", renderType: "number", renderFormat: "amount",     roundingOff: 2, hidden: 0 },
    ],
    []
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Calls parent's loadFinancialInfoList with search params — mirrors DataTab's handleLoad → onFilter
  const handleLoad = useCallback(() => {
    if (typeof onRefresh === "function") {
      onRefresh({ search: searchTerm, searchMode });
    }
  }, [onRefresh, searchTerm, searchMode]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    if (typeof onRefresh === "function") {
      onRefresh({});
    }
  }, [onRefresh]);

  // ── Search: filter ALL rows, then slice to 100 (mirrors DataTab logic) ────
  const tableDataFiltered = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return Array.isArray(data) ? data : [];

    const visibleKeys = columns
      .filter((c) => !c.hidden)
      .map((c) => c.key);

    return (Array.isArray(data) ? data : []).filter((r) =>
      visibleKeys.some((k) => {
        const cell = String(r?.[k] ?? "").toLowerCase();
        return searchMode === "start" ? cell.startsWith(q) : cell.includes(q);
      })
    );
  }, [data, searchTerm, searchMode, columns]);

  // Cap display to top 100 — same as DataTab
  const tableData = useMemo(() => tableDataFiltered.slice(0, 100), [tableDataFiltered]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Top bar (mirrors DataTab layout exactly) ── */}
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">

        {/* Search input with clear button */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faSearch} />
          </span>
          <input
            type="text"
            placeholder="Search Asset Code or Name..."
            className="block w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        {/* Search mode toggles */}
        <div className="flex items-center gap-3 px-3 border-l border-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value="start"
              checked={searchMode === "start"}
              onChange={(e) => setSearchMode(e.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Starts with</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value="part"
              checked={searchMode === "part"}
              onChange={(e) => setSearchMode(e.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Contains</span>
          </label>
        </div>

        {/* Badges + action buttons */}
        <div className="flex items-center gap-2">
          {tableDataFiltered.length > 100 && (
            <span className="text-[11px] text-red-500 font-bold mr-2 animate-pulse uppercase tracking-wider">
              Showing top 100 of {tableDataFiltered.length} records
            </span>
          )}

          <button
            type="button"
            onClick={handleLoad}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
            title="Load Records"
          >
            <FontAwesomeIcon icon={faFilter} className="mr-2" />
            Load Records
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
            title="Reset"
          >
            <FontAwesomeIcon icon={faUndo} className="mr-2" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <SearchGlobalReferenceTable
        ref={tableRef}
        columns={columns}
        data={tableData}
        itemsPerPage={50}
        showPagination={true}
        showFilters={true}
        showGlobalSearch={false}
        showGroupBy={true}
        enableGroupBy={true}
        docType="FAMastFinancialInfo"
        onRowClick={onRowClick}
        onRowDoubleClick={onRowDoubleClick}
        selectedRow={selectedRow}
        isLoading={isLoading}
        isFetching={isFetching}
        onRefresh={onRefresh}
        tableSize="Full"
      />
    </div>
  );
};

export default FAMast_FinancialInfoTab;