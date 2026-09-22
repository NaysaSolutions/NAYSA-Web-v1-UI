import React, { useMemo, useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faUndo, faTimes, faUser } from "@fortawesome/free-solid-svg-icons";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

// -------------------- helpers --------------------
const normalizeUpper = (v) => String(v ?? "").toUpperCase().trim();

const pick = (obj, keys = []) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== null && val !== undefined && String(val).trim() !== "") return val;
  }
  return "";
};

const toSnake = (s) => String(s || "").replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase();

const pickAnyCase = (row, key) => {
  const k = String(key || "");
  return pick(row, [k, k.toLowerCase(), k.toUpperCase(), toSnake(k), toSnake(k).toUpperCase()]);
};



const PayeeMasterDataTab = ({
  isLoading = false,
  subsidiaryType = "",
  onChangeSubsidiaryType,
  sltypeOptions = [],
  filters = {},
  onChangeFilter,
  rows = [],
  onFilter,
  onReset,
  onRowDoubleClick,
  activeTab,
}) => {
  const slType = normalizeUpper(subsidiaryType);

  // Payee only
  const docType = "Payee Master Data";

  const mappedSltypeOptions = useMemo(() => {
    const seen = new Set();

    const options = (Array.isArray(sltypeOptions) ? sltypeOptions : [])
      .map((option) => {
        const value = normalizeUpper(
          typeof option === "string"
            ? option
            : option?.value ??
              option?.code ??
              option?.slTypeCode ??
              option?.sltypeCode ??
              option?.sltype_code ??
              ""
        );

        if (!value) return null;

        const label = String(
          typeof option === "string"
            ? value
            : option?.label ??
              option?.name ??
              option?.slTypeName ??
              option?.sltypeName ??
              option?.sltype_name ??
              value
        ).trim();

        return {
          value,
          label: label || value,
        };
      })
      .filter(Boolean)
      .filter((option) => {
        if (seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });

    // Preserve current historical selection if it is no longer returned
    // by SL Master (for example, an old/inactive Payee SL Type).
    const currentValue = normalizeUpper(subsidiaryType);
    if (currentValue && !seen.has(currentValue)) {
      options.unshift({
        value: currentValue,
        label: currentValue,
      });
    }

    return [{ value: "", label: "" }, ...options];
  }, [sltypeOptions, subsidiaryType]);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("part"); // default = Contains

  // Clear search and trigger parent filter when switching subsidiary type
  useEffect(() => {
    setSearchTerm("");
    setSearchMode("part");
    onFilter?.(); // Automatically apply filters for the new subsidiary type
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subsidiaryType]);

  const col = useMemo(() => {
    return {
      codeLabel: "Payee Code",
      nameLabel: "Payee Name",
      codeKey: "vendCode",
      nameKey: "vendName",
      zipKey: "vendZip",
      tinKey: "vendTin",
    };
  }, []);

  const getCode = useCallback((r) => pickAnyCase(r, col.codeKey), [col]);
  const getName = useCallback((r) => pickAnyCase(r, col.nameKey), [col]);
  const getZip = useCallback((r) => pickAnyCase(r, col.zipKey), [col]);
  const getTin = useCallback((r) => pickAnyCase(r, col.tinKey), [col]);

  const handleLoad = useCallback(() => {
    onFilter?.();
  }, [onFilter]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    onReset?.();
  }, [onReset]);

  const handleRowDblClick = useCallback(
    (row) => {
      const code = getCode(row);
      if (!code) return;
      onRowDoubleClick?.({ code, subsidiaryType: slType });
    },
    [getCode, onRowDoubleClick, slType]
  );

  const tableColumns = useMemo(
    () => [
      { key: col.codeKey, label: "Payee Code", sortable: true, width: 130 },
      { key: col.nameKey, label: "Payee Name", sortable: true, width: 260 },
      { key: "taxClass", label: "Tax Class", sortable: true, width: 110 },
      { key: "firstName", label: "First Name", sortable: true, width: 140 },
      { key: "middleName", label: "Middle Name", sortable: true, width: 140 },
      { key: "lastName", label: "Last Name", sortable: true, width: 140 },
      { key: col.tinKey, label: "TIN", sortable: true, width: 150 },
      { key: "address", label: "Address", sortable: true, width: 200 },
      { key: "branchCode", label: "Branch", sortable: true, width: 100 },
    ],
    [col]
  );

  const tableDataRaw = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((r) => ({
      ...r,
      [col.codeKey]: getCode(r),
      [col.nameKey]: getName(r),
      [col.zipKey]: getZip(r),
      [col.tinKey]: getTin(r),

      taxClass: pick(r, ["taxClass", "tax_class"]),
      firstName: pick(r, ["firstName", "first_name"]),
      middleName: pick(r, ["middleName", "middle_name"]),
      lastName: pick(r, ["lastName", "last_name"]),
      address: pick(r, ["address", "addr", "vendAddr1", "vend_addr1"]),
      branchCode: pick(r, ["branchCode", "branch_code"]),
    }));
  }, [rows, col, getCode, getName, getZip, getTin]);

  // 1. Filter the massive list based on the search box
  const tableDataFiltered = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return tableDataRaw;

    const keysToSearch = tableColumns.map((c) => c.key);

    return tableDataRaw.filter((r) =>
      keysToSearch.some((k) => {
        const cell = String(r?.[k] ?? "").toLowerCase();
        return searchMode === "start" ? cell.startsWith(q) : cell.includes(q);
      })
    );
  }, [searchTerm, tableDataRaw, tableColumns, searchMode]);

  // 2. Slice the rendered data to a maximum of 100 rows to prevent the browser from freezing.
  const tableData = useMemo(() => {
      return tableDataFiltered.slice(0, 100);
  }, [tableDataFiltered]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-gray-700">Subsidiary Type</div>
          <select
            value={subsidiaryType}
            onChange={(e) => onChangeSubsidiaryType?.(e.target.value)}
            className="global-tran-textbox-ui global-tran-textbox-enabled w-44"
            disabled={isLoading}
          >
            {mappedSltypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input with Clear Button */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faUser} />
          </span>
          <input
            type="text"
            placeholder="Search Payee Name..."
            className="block w-full pl-10 pr-10 py-2 text-sm bg-white border-2 border-blue-500 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} size="sm" />
            </button>
          )}
        </div>

        {/* Search Modes */}
        <div className="flex items-center gap-3 px-3 border-l border-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="sm"
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
              name="sm"
              value="part"
              checked={searchMode === "part"}
              onChange={(e) => setSearchMode(e.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Contains</span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Visual Indicator of sliced limit */}
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

      {/* Table */}
      <SearchGlobalReferenceTable
        columns={tableColumns}
        data={tableData}
        itemsPerPage={50}
        showFilters
        rightActionLabel="View"
        docType={docType}
        onRowDoubleClick={handleRowDblClick}
        autoFillGrid={false}
        onRefresh={() => onFilter?.()}
      />
    </div>
  );
};

export default PayeeMasterDataTab;