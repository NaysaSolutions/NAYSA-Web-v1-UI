// import React, { useMemo, useState, useCallback, useEffect } from "react";
// import axios from "axios"; // <-- FIX: import axios
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faUser, faTimes, faFilter, faUndo } from "@fortawesome/free-solid-svg-icons";
// import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

// const normalizeUpper = (v) => String(v ?? "").toUpperCase().trim();
// const pickAnyCase = (row, key) => row?.[key] ?? "";

// const SLTYPE_OPTIONS = [
//     { value: "", label: "" },
//     { value: "AG", label: "AGENCY" },
//     { value: "CU", label: "CUSTOMER" },
//     { value: "EM", label: "EMPLOYEE" },
//     { value: "OT", label: "OTHERS" },
//     { value: "SU", label: "SUPPLIER" },
//     { value: "TN", label: "TENANT" },
// ];

// const CustMasterDataTab = ({
//     isLoading = false,
//     subsidiaryType = "CU",
//     onChangeSubsidiaryType,
//     onRowDoubleClick,
// }) => {
//     const slType = normalizeUpper(subsidiaryType);
//     const [searchTerm, setSearchTerm] = useState("");
//     const [searchMode, setSearchMode] = useState("start");
//     const [tableRows, setTableRows] = useState([]);
//     const [hasLoaded, setHasLoaded] = useState(false);

//     const docType = "CustMast";

//     const tableColumns = useMemo(() => [
//         { key: "custCode", label: "Customer Code", sortable: true, width: 160 },
//         { key: "custName", label: "Customer Name", sortable: true, width: 260 },
//         { key: "taxClass", label: "Tax Rate Class", sortable: true, width: 140 },
//         { key: "firstName", label: "First Name", sortable: true, width: 140 },
//         { key: "middleName", label: "Middle Name", sortable: true, width: 140 },
//         { key: "lastName", label: "Last Name", sortable: true, width: 140 },
//         { key: "custTin", label: "TIN", sortable: true, width: 140 },
//         { key: "address", label: "Address", sortable: true, width: 320 },
//         { key: "branchCode", label: "Branch Code", sortable: true, width: 120 },
//         { key: "source", label: "Source", sortable: true, width: 100 },
//     ], []);

// const handleLoad = useCallback(async () => {
//     setHasLoaded(true);

//     try {
//         const payload = {
//             search: searchTerm || "",
//             searchMode: searchMode,
//             filter: "ActiveAll",
//         };

//         const response = await axios.get("/api/lookupCustomer", {
//             params: {
//                 json_data: JSON.stringify(payload)
//             }
//         });

//         if (response.data?.success) {
//             setTableRows(response.data.data);
//         } else {
//             console.error("Failed to load customer:", response.data?.message);
//         }

//     } catch (error) {
//         console.error("Lookup failed:", error);
//     }
// }, [searchTerm, searchMode]);

//     const handleReset = useCallback(() => {
//         setSearchTerm("");
//         setTableRows([]);
//         setHasLoaded(false);
//     }, []);

//     const handleRowDblClick = useCallback(
//         (row) => {
//             const code = pickAnyCase(row, "custCode");
//             if (!code) return;
//             onRowDoubleClick?.({ code, subsidiaryType });
//         },
//         [onRowDoubleClick, subsidiaryType]
//     );

//     const tableData = useMemo(() => {
//         if (!hasLoaded) return [];
//         if (!searchTerm) return tableRows;

//         const q = searchTerm.trim().toLowerCase();
//         return tableRows.filter((r) =>
//             tableColumns.some((c) => {
//                 const val = String(r[c.key] ?? "").toLowerCase();
//                 return searchMode === "start" ? val.startsWith(q) : val.includes(q);
//             })
//         );
//     }, [tableRows, searchTerm, searchMode, hasLoaded, tableColumns]);

//     return (
//         <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
//             {/* Top Bar */}
//             <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">
//                 <div className="flex items-center gap-2">
//                     <div className="text-xs font-bold text-gray-700">Subsidiary Type</div>
//                     <select
//                         value={subsidiaryType}
//                         onChange={(e) => onChangeSubsidiaryType?.(e.target.value)}
//                         className="global-tran-textbox-ui global-tran-textbox-enabled w-44"
//                         disabled={isLoading}
//                     >
//                         {SLTYPE_OPTIONS.map((o) => (
//                             <option key={o.value} value={o.value}>{o.label || o.value}</option>
//                         ))}
//                     </select>
//                 </div>

//                 <div className="relative flex-grow max-w-md">
//                     <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
//                         <FontAwesomeIcon icon={faUser} />
//                     </span>
//                     <input
//                         type="text"
//                         placeholder="Search Customer Name..."
//                         className="block w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                         onKeyDown={(e) => e.key === "Enter" && handleLoad()}
//                     />
//                     {searchTerm && (
//                         <button
//                             onClick={() => setSearchTerm("")}
//                             className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors"
//                         >
//                             <FontAwesomeIcon icon={faTimes} size="sm" />
//                         </button>
//                     )}
//                 </div>

//                 <div className="flex items-center gap-3 px-3 border-l border-gray-300">
//                     <label className="flex items-center gap-1.5 cursor-pointer">
//                         <input
//                             type="radio"
//                             name="sm"
//                             value="start"
//                             checked={searchMode === "start"}
//                             onChange={(e) => setSearchMode(e.target.value)}
//                             className="accent-blue-600"
//                         />
//                         <span className="text-xs text-gray-700">Starts with</span>
//                     </label>
//                     <label className="flex items-center gap-1.5 cursor-pointer">
//                         <input
//                             type="radio"
//                             name="sm"
//                             value="part"
//                             checked={searchMode === "part"}
//                             onChange={(e) => setSearchMode(e.target.value)}
//                             className="accent-blue-600"
//                         />
//                         <span className="text-xs text-gray-700">Contains</span>
//                     </label>
//                 </div>

//                 <div className="flex items-center gap-2">
//                     <button
//                         type="button"
//                         onClick={handleLoad}
//                         disabled={isLoading}
//                         className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
//                         title="Load Records"
//                     >
//                         <FontAwesomeIcon icon={faFilter} />
//                         Load Records
//                     </button>
//                     <button
//                         type="button"
//                         onClick={handleReset}
//                         disabled={isLoading}
//                         className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
//                         title="Reset"
//                     >
//                         <FontAwesomeIcon icon={faUndo} />
//                         Reset
//                     </button>
//                 </div>
//             </div>

//             <SearchGlobalReferenceTable
//                 columns={tableColumns}
//                 data={tableData}
//                 itemsPerPage={50}
//                 showFilters
//                 rightActionLabel="View"
//                 docType={docType}
//                 onRowDoubleClick={handleRowDblClick}
//             />
//         </div>
//     );
// };

// export default CustMasterDataTab;

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faUndo, faTimes, faUser } from "@fortawesome/free-solid-svg-icons";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

// -------------------- helpers --------------------
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

const CustMasterDataTab = ({
  isLoading = false,
  rows = [],
  onFilter,
  onReset,
  onRowDoubleClick,
}) => {
  const docType = "CustMast";

  // prevent showing all rows until user loads
  const [hasLoaded, setHasLoaded] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("start"); // "start" or "part"

  const col = useMemo(() => {
    return {
      codeLabel: "Customer Code",
      nameLabel: "Customer Name",
      codeKey: "custCode",
      nameKey: "custName",
      zipKey: "custZip",
      tinKey: "custTin",
    };
  }, []);

  const getCode = useCallback((r) => pickAnyCase(r, col.codeKey), [col]);
  const getName = useCallback((r) => pickAnyCase(r, col.nameKey), [col]);
  const getZip = useCallback((r) => pickAnyCase(r, col.zipKey), [col]);
  const getTin = useCallback((r) => pickAnyCase(r, col.tinKey), [col]);

  useEffect(() => {
    setHasLoaded(false);
    setSearchTerm("");
  }, []);

  const handleLoad = useCallback(() => {
    setHasLoaded(true);
    onFilter?.();
  }, [onFilter]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setHasLoaded(false);
    onReset?.();
  }, [onReset]);

  const handleRowDblClick = useCallback(
    (row) => {
      const code = getCode(row);
      if (!code) return;
      onRowDoubleClick?.({ code });
    },
    [getCode, onRowDoubleClick]
  );

  const tableColumns = useMemo(
    () => [
      { key: col.codeKey, label: col.codeLabel, sortable: true, width: 160 },
      { key: col.nameKey, label: col.nameLabel, sortable: true, width: 260 },
      { key: "taxClass", label: "Tax Rate Class", sortable: true, width: 140 },
      { key: "firstName", label: "First Name", sortable: true, width: 140 },
      { key: "middleName", label: "Middle Name", sortable: true, width: 140 },
      { key: "lastName", label: "Last Name", sortable: true, width: 140 },
      { key: col.tinKey, label: "TIN", sortable: true, width: 140 },
      { key: "address", label: "Address", sortable: true, width: 320 },
      { key: "branchCode", label: "Branch Code", sortable: true, width: 120 },
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
      address: pick(r, ["address", "addr", "custAddr1", "cust_addr1"]),
      branchCode: pick(r, ["branchCode", "branch_code"]),
    }));
  }, [rows, col, getCode, getName, getZip, getTin]);

  const tableData = useMemo(() => {
    if (!hasLoaded) return [];

    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return tableDataRaw;

    const keysToSearch = tableColumns.map((c) => c.key);

    return tableDataRaw.filter((r) =>
      keysToSearch.some((k) => {
        const cell = String(r?.[k] ?? "").toLowerCase();
        return searchMode === "start" ? cell.startsWith(q) : cell.includes(q);
      })
    );
  }, [hasLoaded, searchTerm, tableDataRaw, tableColumns, searchMode]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">
        {/* Search Input with Clear Button */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faUser} />
          </span>
          <input
            type="text"
            placeholder="Search Customer Name..."
            className="block w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          {searchTerm && (
            <button
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
      />
    </div>
  );
};

export default CustMasterDataTab;