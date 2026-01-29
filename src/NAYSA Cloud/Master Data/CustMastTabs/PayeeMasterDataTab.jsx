// // src/NAYSA Cloud/Master Data/CustMastTabs/PayeeMasterDataTab.jsx
// import React, { useMemo, useEffect, useState } from "react";
// import {
//   faFilter,
//   faUndo,
//   faPrint,
//   faFileExcel,
// } from "@fortawesome/free-solid-svg-icons";
// import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

// const text = (v) => (v === null || v === undefined ? "" : String(v));

// const pick = (obj, keys = []) => {
//   for (const k of keys) {
//     const val = obj?.[k];
//     if (val !== null && val !== undefined && String(val).trim() !== "") return val;
//   }
//   return "";
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
//   onPrint,
//   onExport,
//   onRowDoubleClick,
// }) => {
//   const slType = String(subsidiaryType || "").toUpperCase().trim();
//   const isCustomer = slType === "CU";
//   const isSupplier = slType === "SU";
//   const isAll = slType === "";
//   const col = useMemo(() => {
//     // CUSTOMER
//     if (isCustomer) {
//       return {
//         codeLabel: "Customer Code",
//         nameLabel: "Customer Name",
//         codeKey: "custCode",
//         nameKey: "custName",
//         zipKey: "custZip",
//         tinKey: "custTin",
//       };
//     }

//     // ALL, SUPPLIER, AGENCY, EMPLOYEE, OTHERS, TENANT
//     return {
//       codeLabel: "Payee Code",
//       nameLabel: "Payee Name",
//       codeKey: "vendCode",
//       nameKey: "vendName",
//       zipKey: "vendZip",
//       tinKey: "vendTin",
//     };
//   }, [isCustomer]);



//   const buttons = useMemo(
//     () => [
//       { key: "filter", label: "Filter", icon: faFilter, onClick: onFilter, disabled: isLoading },
//       { key: "reset", label: "Reset", icon: faUndo, onClick: onReset, disabled: isLoading },
//       { key: "print", label: "Print", icon: faPrint, onClick: onPrint, disabled: isLoading },
//       { key: "export", label: "Export", icon: faFileExcel, onClick: onExport, disabled: isLoading },
//     ],
//     [isLoading, onFilter, onReset, onPrint, onExport]
//   );

//   // paging
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(100);

//   useEffect(() => setPage(1), [rows, subsidiaryType]);

//   const totalRows = rows?.length ?? 0;
//   const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
//   const safePage = Math.min(page, totalPages);

//   const startIdx = (safePage - 1) * pageSize;
//   const endIdx = Math.min(startIdx + pageSize, totalRows);
//   const pageRows = useMemo(() => rows.slice(startIdx, endIdx), [rows, startIdx, endIdx]);

//   const getCode = (r) =>
//     pick(r, [
//       col.codeKey,
//       col.codeKey.toLowerCase(),
//       col.codeKey.toUpperCase(),
//       col.codeKey.replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase(), // vend_code / cust_code
//     ]);

//   const getName = (r) =>
//     pick(r, [
//       col.nameKey,
//       col.nameKey.toLowerCase(),
//       col.nameKey.toUpperCase(),
//       col.nameKey.replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase(),
//     ]);

//   const getZip = (r) =>
//     pick(r, [
//       col.zipKey,
//       col.zipKey.toLowerCase(),
//       col.zipKey.toUpperCase(),
//       col.zipKey.replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase(),
//     ]);

//   const getTin = (r) =>
//     pick(r, [
//       col.tinKey,
//       col.tinKey.toLowerCase(),
//       col.tinKey.toUpperCase(),
//       col.tinKey.replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase(),
//     ]);

//   const handleRowDblClick = (row) => {
//     const code = getCode(row);
//     if (!code) return;
//     // ✅ pass a generic payload; parent can decide to call getVendMast/getPayee/getCustMast
//     onRowDoubleClick?.({ code, subsidiaryType });
//   };

//   // ✅ filter keys become dynamic too
//   const filterKeys = useMemo(
//     () => [
//       col.codeKey,
//       col.nameKey,
//       "taxClass",
//       "firstName",
//       "middleName",
//       "lastName",
//       "address",
//       col.zipKey,
//       col.tinKey,
//       "branchCode",
//     ],
//     [col]
//   );

//   return (
//     <div className="flex flex-col h-full min-h-0">
//       {/* Top bar */}
//       <div className="w-full flex items-center gap-3 mb-2">
//         <div className="flex items-center gap-2">
//           <div className="text-xs font-bold text-gray-700 whitespace-nowrap">Subsidiary Type</div>
//           <select
//             value={subsidiaryType}
//             onChange={(e) => onChangeSubsidiaryType?.(e.target.value)}
//             className="global-tran-textbox-ui global-tran-textbox-enabled w-44"
//           >
//             {SLTYPE_OPTIONS.map((o) => (
//               <option key={o.value} value={o.value}>
//                 {o.label}
//               </option>
//             ))}
//           </select>

//         </div>

//         <div className="ml-auto">
//           <ButtonBar buttons={buttons} />
//         </div>
//       </div>

//       {/* table */}


//         <div
//           className="w-full overflow-auto rounded-md flex-1"
//           style={{ minHeight: 0 }}
//         >

//           <table className="min-w-full border-collapse">
//             <thead className="global-tran-thead-div-ui sticky top-0 z-10">
//               <tr>
//                 <th className="global-tran-th-ui whitespace-nowrap">{col.codeLabel}</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">{col.nameLabel}</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">Tax Rate Class</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">First Name</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">Middle Name</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">Last Name</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">Address</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">ZIP Code</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">TIN</th>
//                 <th className="global-tran-th-ui whitespace-nowrap">Branchcode</th>
//               </tr>

//               <tr>
//                 {filterKeys.map((key) => (
//                   <th key={key} className="global-tran-th-ui">
//                     <input
//                       value={filters?.[key] ?? ""}
//                       onChange={(e) => onChangeFilter?.(key, e.target.value)}
//                       placeholder="Contains:"
//                       className="w-full global-tran-textbox-ui global-tran-textbox-enabled"
//                       disabled={isLoading}
//                     />
//                   </th>
//                 ))}
//               </tr>
//             </thead>

//             <tbody>
//               {pageRows.map((r, idx) => {
//                 const code = getCode(r);
//                 return (
//                   <tr
//                     key={`${code || "row"}-${startIdx + idx}`}
//                     className={`global-tran-tr-ui cursor-pointer select-none ${(startIdx + idx) % 2 === 0 ? "bg-white" : "bg-gray-50"
//                       } hover:bg-blue-50`}
//                     onDoubleClick={() => handleRowDblClick(r)}
//                     title="Double click to open Payee Set-Up"
//                   >
//                     <td className="global-tran-td-ui whitespace-nowrap font-semibold">{text(code || "—")}</td>
//                     <td className="global-tran-td-ui">{text(getName(r))}</td>
//                     <td className="global-tran-td-ui whitespace-nowrap">{text(pick(r, ["taxClass", "tax_class"]))}</td>
//                     <td className="global-tran-td-ui">{text(pick(r, ["firstName", "first_name"]))}</td>
//                     <td className="global-tran-td-ui">{text(pick(r, ["middleName", "middle_name"]))}</td>
//                     <td className="global-tran-td-ui">{text(pick(r, ["lastName", "last_name"]))}</td>
//                     <td className="global-tran-td-ui">{text(pick(r, ["address", "addr"]))}</td>
//                     <td className="global-tran-td-ui whitespace-nowrap">{text(getZip(r))}</td>
//                     <td className="global-tran-td-ui whitespace-nowrap">{text(getTin(r))}</td>
//                     <td className="global-tran-td-ui whitespace-nowrap">{text(pick(r, ["branchCode", "branch_code"]))}</td>
//                   </tr>
//                 );
//               })}

//               {!pageRows.length && (
//                 <tr className="global-tran-tr-ui">
//                   <td className="global-tran-td-ui text-center" colSpan={10}>
//                     {isLoading ? "Loading..." : "No records found."}
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Paging footer */}
//         <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 px-1 border-t">

//           <div className="text-xs text-gray-600">
//             Showing <span className="font-semibold">{totalRows ? startIdx + 1 : 0}</span>–
//             <span className="font-semibold">{endIdx}</span> of <span className="font-semibold">{totalRows}</span>
//           </div>

//           <div className="flex items-center gap-2">
//             <div className="text-xs text-gray-600 whitespace-nowrap">Rows per page</div>
//             <select
//               className="global-tran-textbox-ui global-tran-textbox-enabled w-24"
//               value={pageSize}
//               disabled={isLoading}
//               onChange={(e) => {
//                 const v = Number(e.target.value || 100);
//                 setPageSize(v);
//                 setPage(1);
//               }}
//             >
//               {[10, 20, 50, 100].map((n) => (
//                 <option key={n} value={n}>
//                   {n}
//                 </option>
//               ))}
//             </select>

//             <button
//               type="button"
//               className="global-tran-btn-ui px-3 py-1 text-xs"
//               disabled={isLoading || safePage <= 1}
//               onClick={() => setPage((p) => Math.max(1, p - 1))}
//             >
//               Prev
//             </button>

//             <div className="text-xs text-gray-700 whitespace-nowrap">
//               Page <span className="font-semibold">{safePage}</span> /{" "}
//               <span className="font-semibold">{totalPages}</span>
//             </div>

//             <button
//               type="button"
//               className="global-tran-btn-ui px-3 py-1 text-xs"
//               disabled={isLoading || safePage >= totalPages}
//               onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//             >
//               Next
//             </button>
//           </div>

//       </div>
//     </div>
//   );
// };

// export default PayeeMasterDataTab;

//GLOBAL REPORT TABLE

// src/NAYSA Cloud/Master Data/CustMastTabs/PayeeMasterDataTab.jsx
// src/NAYSA Cloud/Master Data/CustMastTabs/PayeeMasterDataTab.jsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faUndo,
  faPrint,
  faFileExcel,
} from "@fortawesome/free-solid-svg-icons";
// import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const pick = (obj, keys = []) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== null && val !== undefined && String(val).trim() !== "") return val;
  }
  return "";
};

const SLTYPE_OPTIONS = [
  { value: "", label: "" },
  { value: "AG", label: "AGENCY" },
  { value: "CU", label: "CUSTOMER" },
  { value: "EM", label: "EMPLOYEE" },
  { value: "OT", label: "OTHERS" },
  { value: "SU", label: "SUPPLIER" },
  { value: "TN", label: "TENANT" },
];

const PayeeMasterDataTab = ({
  isLoading = false,
  subsidiaryType = "", // AG | CU | EM | OT | SU | TN
  onChangeSubsidiaryType,
  filters = {},
  onChangeFilter,
  rows = [],
  onFilter,
  onReset,
  onPrint,
  onExport,
  onRowDoubleClick,
}) => {
  const slType = String(subsidiaryType || "").toUpperCase().trim();
  const isCustomer = slType === "CU";

  const col = useMemo(() => {
    if (isCustomer) {
      return {
        codeLabel: "Customer Code",
        nameLabel: "Customer Name",
        codeKey: "custCode",
        nameKey: "custName",
        zipKey: "custZip",
        tinKey: "custTin",
      };
    }

    return {
      codeLabel: "Payee Code",
      nameLabel: "Payee Name",
      codeKey: "vendCode",
      nameKey: "vendName",
      zipKey: "vendZip",
      tinKey: "vendTin",
    };
  }, [isCustomer]);

  const getCode = useCallback(
    (r) =>
      pick(r, [
        col.codeKey,
        col.codeKey.toLowerCase(),
        col.codeKey.toUpperCase(),
        col.codeKey.replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase(),
      ]),
    [col]
  );

  const getName = useCallback(
    (r) =>
      pick(r, [
        col.nameKey,
        col.nameKey.toLowerCase(),
        col.nameKey.toUpperCase(),
        col.nameKey.replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase(),
      ]),
    [col]
  );

  const getZip = useCallback(
    (r) =>
      pick(r, [
        col.zipKey,
        col.zipKey.toLowerCase(),
        col.zipKey.toUpperCase(),
        col.zipKey.replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase(),
      ]),
    [col]
  );

  const getTin = useCallback(
    (r) =>
      pick(r, [
        col.tinKey,
        col.tinKey.toLowerCase(),
        col.tinKey.toUpperCase(),
        col.tinKey.replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase(),
      ]),
    [col]
  );

  // ✅ Auto-filter when subsidiaryType changes (NO local loading)
  useEffect(() => {
    if (typeof onFilter === "function") onFilter();
  }, [subsidiaryType, onFilter]);

  const buttons = useMemo(
    () => [
      { key: "filter", label: "Filter", icon: faFilter, onClick: onFilter, disabled: isLoading },
      { key: "reset", label: "Reset", icon: faUndo, onClick: onReset, disabled: isLoading },
      { key: "print", label: "Print", icon: faPrint, onClick: onPrint, disabled: isLoading },
      { key: "export", label: "Export", icon: faFileExcel, onClick: onExport, disabled: isLoading },
    ],
    [isLoading, onFilter, onReset, onPrint, onExport]
  );

  const [pageSize] = useState(100);

  const handleRowDblClick = (row) => {
    const code = getCode(row);
    if (!code) return;
    onRowDoubleClick?.({ code, subsidiaryType });
  };

  const tableColumns = useMemo(() => {
    return [
      { key: col.codeKey, label: col.codeLabel, sortable: true, width: 160 },
      { key: col.nameKey, label: col.nameLabel, sortable: true, width: 260 },
      { key: "taxClass", label: "Tax Rate Class", sortable: true, width: 140 },
      { key: "firstName", label: "First Name", sortable: true, width: 140 },
      { key: "middleName", label: "Middle Name", sortable: true, width: 140 },
      { key: "lastName", label: "Last Name", sortable: true, width: 140 },
      { key: col.tinKey, label: "TIN", sortable: true, width: 140 },
      { key: "address", label: "Address", sortable: true, width: 320 },
      { key: col.zipKey, label: "ZIP Code", sortable: true, width: 110 },
      { key: "branchCode", label: "Branch Code", sortable: true, width: 120 },
    ];
  }, [col]);

  const tableData = useMemo(() => {
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
      address: pick(r, ["address", "addr"]),
      branchCode: pick(r, ["branchCode", "branch_code"]),
    }));
  }, [rows, col, getCode, getName, getZip, getTin]);

  const initialState = useMemo(
    () => ({
      filters: filters || {},
      sortConfig: { key: null, direction: null },
      currentPage: 1,
      groupBy: [],
      userHiddenCols: [],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subsidiaryType]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="w-full flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold text-gray-700 whitespace-nowrap">
            Subsidiary Type
          </div>

          {/* ✅ no spinner + not disabled by local loading */}
          <select
            value={subsidiaryType}
            onChange={(e) => onChangeSubsidiaryType?.(e.target.value)}
            className="global-tran-textbox-ui global-tran-textbox-enabled w-44"
          >
            {SLTYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* <div className="ml-auto">
          <ButtonBar buttons={buttons} />
        </div> */}
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        {/* <SearchGlobalReportTable
          columns={tableColumns}
          data={tableData}
          itemsPerPage={pageSize}
          showFilters={true}
          isLoading={isLoading}     // ✅ parent-only loading
          rightActionLabel={null}
          onRowDoubleClick={(row) => handleRowDblClick(row)}
          onStateChange={(state) => {
            if (state?.filters && typeof onChangeFilter === "function") {
              Object.entries(state.filters).forEach(([k, v]) => {
                if ((filters?.[k] ?? "") !== (v ?? "")) onChangeFilter(k, v);
              });
            }
          }}
          initialState={initialState}
          className="border border-gray-200 rounded-md"
        /> */}

        <SearchGlobalReferenceTable
          columns={tableColumns}
          data={rows}
          itemsPerPage={50}
          showFilters
          rightActionLabel="View"
          docType="VendMast"
          onRowAction={(row) => console.log("view", row)}
          onRowActionsClick={(row) => console.log("actions", row)}
          onRowDoubleClick={(row) => handleRowDblClick(row)}
        />
      </div>
    </div>
  );
};

export default PayeeMasterDataTab;

