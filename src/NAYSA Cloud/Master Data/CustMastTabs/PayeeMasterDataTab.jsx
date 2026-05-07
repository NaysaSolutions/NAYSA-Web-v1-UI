
// import React, { useMemo, useEffect, useState, useCallback } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faFilter, faUndo, faTimes, faUser } from "@fortawesome/free-solid-svg-icons";
// import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

// // -------------------- helpers --------------------
// const normalizeUpper = (v) => String(v ?? "").toUpperCase().trim();

// const pick = (obj, keys = []) => {
//   for (const k of keys) {
//     const val = obj?.[k];
//     if (val !== null && val !== undefined && String(val).trim() !== "") return val;
//   }
//   return "";
// };

// const toSnake = (s) => String(s || "").replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase();

// const pickAnyCase = (row, key) => {
//   const k = String(key || "");
//   return pick(row, [k, k.toLowerCase(), k.toUpperCase(), toSnake(k), toSnake(k).toUpperCase()]);
// };

// const SLTYPE_OPTIONS = [
//   { value: "", label: "" },
//   { value: "AG", label: "AGENCY" },
//   { value: "CU", label: "CUSTOMER" },
//   { value: "EM", label: "EMPLOYEE" },
//   { value: "OT", label: "OTHERS" },
//   { value: "SU", label: "SUPPLIER" },
//   { value: "TN", label: "TENANT" },
// ];

// const PayeeMasterDataTab = ({
//   isLoading = false,
//   subsidiaryType = "", // AG | CU | EM | OT | SU | TN
//   onChangeSubsidiaryType,
//   filters = {},
//   onChangeFilter,
//   rows = [],
//   onFilter,
//   onReset,
//   onRowDoubleClick,
//   activeTab,
// }) => {
//   const slType = normalizeUpper(subsidiaryType);
//   const isCustomer = slType === "CU";

//   // ✅ doctype must follow type so table behaves correctly
//   const docType = isCustomer ? "CustMast" : "VendMast";

//   // ✅ prevent showing all rows until user loads
//   const [hasLoaded, setHasLoaded] = useState(false);

//   // Search state
//   const [searchTerm, setSearchTerm] = useState("");
//   const [searchMode, setSearchMode] = useState("start"); // "start" or "part"

//   // when switching subsidiary type, DO NOT auto-load; clear view and search
//   useEffect(() => {
//     setHasLoaded(false);
//     setSearchTerm("");
//   }, [subsidiaryType]);

//   const col = useMemo(() => {
//     if (isCustomer) {
//       return {
//         codeLabel: "Customer Code",   // Label for Customer Code
//         nameLabel: "Customer Name",   // Label for Customer Name
//         codeKey: "custCode",          // Column key for Customer Code
//         nameKey: "custName",          // Column key for Customer Name
//         zipKey: "custZip",
//         tinKey: "custTin",
//       };
//     }

//     // If not a customer, return vendor-related columns
//     return {
//       codeLabel: "Payee Code",
//       nameLabel: "Payee Name",
//       codeKey: "vendCode",
//       nameKey: "vendName",
//       zipKey: "vendZip",
//       tinKey: "vendTin",
//     };
//   }, [isCustomer]);  // Ensure this updates when `isCustomer` changes

//   const getCode = useCallback((r) => pickAnyCase(r, col.codeKey), [col]);
//   const getName = useCallback((r) => pickAnyCase(r, col.nameKey), [col]);
//   const getZip = useCallback((r) => pickAnyCase(r, col.zipKey), [col]);
//   const getTin = useCallback((r) => pickAnyCase(r, col.tinKey), [col]);

//   const handleLoad = useCallback(() => {
//     setHasLoaded(true);
//     onFilter?.();
//   }, [onFilter]);

//   const handleReset = useCallback(() => {
//     setSearchTerm("");
//     setHasLoaded(false);          // ✅ hides list again after reset
//     onReset?.();
//   }, [onReset]);

//   const handleRowDblClick = useCallback(
//     (row) => {
//       const code = getCode(row);
//       if (!code) return;
//       onRowDoubleClick?.({ code, subsidiaryType });
//     },
//     [getCode, onRowDoubleClick, subsidiaryType]
//   );

//   const tableColumns = useMemo(() => [
//     { key: col.codeKey, label: col.codeLabel, sortable: true, width: 160 },
//     { key: col.nameKey, label: col.nameLabel, sortable: true, width: 260 },
//     { key: "taxClass", label: "Tax Rate Class", sortable: true, width: 140 },
//     { key: "firstName", label: "First Name", sortable: true, width: 140 },
//     { key: "middleName", label: "Middle Name", sortable: true, width: 140 },
//     { key: "lastName", label: "Last Name", sortable: true, width: 140 },
//     { key: col.tinKey, label: "TIN", sortable: true, width: 140 },
//     { key: "address", label: "Address", sortable: true, width: 320 },
//     { key: "branchCode", label: "Branch Code", sortable: true, width: 120 },
//   ], [col]);

//   const tableDataRaw = useMemo(() => {
//     const list = Array.isArray(rows) ? rows : [];
//     return list.map((r) => ({
//       ...r,
//       [col.codeKey]: getCode(r),
//       [col.nameKey]: getName(r),
//       [col.zipKey]: getZip(r),
//       [col.tinKey]: getTin(r),

//       taxClass: pick(r, ["taxClass", "tax_class"]),
//       firstName: pick(r, ["firstName", "first_name"]),
//       middleName: pick(r, ["middleName", "middle_name"]),
//       lastName: pick(r, ["lastName", "last_name"]),
//       address: pick(r, ["address", "addr", "custAddr1", "vendAddr1", "cust_addr1", "vend_addr1"]),
//       branchCode: pick(r, ["branchCode", "branch_code"]),
//     }));
//   }, [rows, col, getCode, getName, getZip, getTin]);

//   const tableData = useMemo(() => {
//     // ✅ if not loaded yet, show nothing
//     if (!hasLoaded) return [];

//     const q = String(searchTerm || "").trim().toLowerCase();
//     if (!q) return tableDataRaw;

//     const keysToSearch = tableColumns.map((c) => c.key);
//     return tableDataRaw.filter((r) =>
//       keysToSearch.some((k) => {
//         const cell = String(r?.[k] ?? "").toLowerCase();
//         if (searchMode === "start") {
//           return cell.startsWith(q); // "Starts with" search mode
//         }
//         return cell.includes(q); // "Contains" search mode
//       })
//     );
//   }, [hasLoaded, searchTerm, tableDataRaw, tableColumns, searchMode]);


//   return (
//     <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
//       {/* Top bar */}
//       <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">
//         <div className="flex items-center gap-2">
//           <div className="text-xs font-bold text-gray-700">Subsidiary Type</div>
//           <select
//             value={subsidiaryType}
//             onChange={(e) => onChangeSubsidiaryType?.(e.target.value)}
//             className="global-tran-textbox-ui global-tran-textbox-enabled w-44"
//             disabled={isLoading}
//           >
//             {SLTYPE_OPTIONS.map((o) => (
//               <option key={o.value} value={o.value}>

//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Search Input with Clear Button */}
//         <div className="relative flex-grow max-w-md">
//           <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
//             <FontAwesomeIcon icon={faUser} />
//           </span>
//           <input
//             type="text"
//             placeholder={activeTab === "master" ? "Search Customer Name..." : "Search Payee Name..."}
//             className="block w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             onKeyDown={(e) => e.key === "Enter" && handleLoad()}
//           />
//           {searchTerm && (
//             <button
//               onClick={() => setSearchTerm("")}
//               className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors"
//             >
//               <FontAwesomeIcon icon={faTimes} size="sm" />
//             </button>
//           )}
//         </div>

//         {/* Search Modes (Starts with / Contains) */}
//         <div className="flex items-center gap-3 px-3 border-l border-gray-300">
//           <label className="flex items-center gap-1.5 cursor-pointer">
//             <input
//               type="radio"
//               name="sm"
//               value="start"
//               checked={searchMode === "start"}
//               onChange={(e) => setSearchMode(e.target.value)}
//               className="accent-blue-600"
//             />
//             <span className="text-xs text-gray-700">Starts with</span>
//           </label>
//           <label className="flex items-center gap-1.5 cursor-pointer">
//             <input
//               type="radio"
//               name="sm"
//               value="part"
//               checked={searchMode === "part"}
//               onChange={(e) => setSearchMode(e.target.value)}
//               className="accent-blue-600"
//             />
//             <span className="text-xs text-gray-700">Contains</span>
//           </label>
//         </div>

//         {/* Buttons */}
//         <div className="flex items-center gap-2">
//           <button
//             type="button"
//             onClick={handleLoad}
//             disabled={isLoading}
//             className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
//             title="Load Records"
//           >
//             <FontAwesomeIcon icon={faFilter} className="mr-2" />
//             Load Records
//           </button>

//           <button
//             type="button"
//             onClick={handleReset}
//             disabled={isLoading}
//             className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
//             title="Reset"
//           >
//             <FontAwesomeIcon icon={faUndo} className="mr-2" />
//             Reset
//           </button>
//         </div>
//       </div>

//       {/* Table */}
//       <SearchGlobalReferenceTable
//         columns={tableColumns}
//         data={tableData}
//         itemsPerPage={50}
//         showFilters
//         rightActionLabel="View"
//         docType={docType}
//         onRowDoubleClick={handleRowDblClick}
//       />
//     </div>
//   );
// };

// export default PayeeMasterDataTab;
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

const SLTYPE_OPTIONS = [
  { value: "", label: "" },
  { value: "AG", label: "AGENCY" },
  { value: "EM", label: "EMPLOYEE" },
  { value: "OT", label: "OTHERS" },
  { value: "SU", label: "SUPPLIER" },
  { value: "TN", label: "TENANT" },
];

const PayeeMasterDataTab = ({
  isLoading = false,
  subsidiaryType = "", // AG | EM | OT | SU | TN
  onChangeSubsidiaryType,
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
  const docType = "VendMast";

  // prevent showing all rows until user loads
  const [hasLoaded, setHasLoaded] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("part"); // default = Contains

  // when switching subsidiary type, do not auto-load; clear view and search
  useEffect(() => {
    setHasLoaded(false);
    setSearchTerm("");
    setSearchMode("part");
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
    setHasLoaded(true);
    onFilter?.();
  }, [onFilter]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    setHasLoaded(false);
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
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-gray-700">Subsidiary Type</div>
          <select
            value={subsidiaryType}
            onChange={(e) => onChangeSubsidiaryType?.(e.target.value)}
            className="global-tran-textbox-ui global-tran-textbox-enabled w-44"
            disabled={isLoading}
          >
            {SLTYPE_OPTIONS.map((o) => (
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
      />
    </div>
  );
};

export default PayeeMasterDataTab;