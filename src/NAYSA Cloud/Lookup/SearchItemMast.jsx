// import React, { useState, useEffect, useMemo } from "react";
// import { useQuery, keepPreviousData } from "@tanstack/react-query";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faTimes,
//   faSpinner,
//   faSyncAlt,
//   faSort,
//   faSearch,
//   faEraser,
//   faCheckSquare,
// } from "@fortawesome/free-solid-svg-icons";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

// function useDebounce(value, delay) {
//   const [debouncedValue, setDebouncedValue] = useState(value);

//   useEffect(() => {
//     const handler = setTimeout(() => setDebouncedValue(value), delay);
//     return () => clearTimeout(handler);
//   }, [value, delay]);

//   return debouncedValue;
// }

// const usageColumnConfig = [
//   { key: "itemCode", label: "Item Code", width: "140px", hidden: 0, classNames: "text-left" },
//   { key: "itemName", label: "Item Name", width: "320px", hidden: 0, classNames: "text-left" },
//   { key: "uomCode", label: "UOM", width: "100px", hidden: 0, classNames: "text-left" },
//   { key: "qtyHand", label: "On Hand", width: "120px", hidden: 0, classNames: "text-right" },
//   { key: "unitCost", label: "Unit Cost", width: "130px", hidden: 0, classNames: "text-right" },
//   { key: "categCode", label: "Category Code", width: "150px", hidden: 0, classNames: "text-left" },
//   { key: "categName", label: "Category Name", width: "200px", hidden: 0, classNames: "text-left" },
//   { key: "classCode", label: "Class Code", width: "140px", hidden: 0, classNames: "text-left" },
//   { key: "className", label: "Class Name", width: "220px", hidden: 0, classNames: "text-left" },
//   { key: "groupId", label: "Group ID", width: "120px", hidden: 1, classNames: "text-left" },
// ];

// const { companyInfo, currentUserRow } = useAuth();
// const visibleColumns = usageColumnConfig.filter((col) => !Number(col.hidden));

// const createFilterObject = (cols = []) =>
//   cols.reduce((acc, col) => {
//     acc[col.key] = "";
//     return acc;
//   }, {});

// const initialFilters = createFilterObject(visibleColumns);

// const ItemMastLookupModal = ({
//   isOpen,
//   onClose,
//   customParam = "ActiveAll",
//   enableMultiSelect = false,
//   onGetSelectedItems,
//   endpoint = "/getInvLookup",
//   selectedItems: externalSelectedItems = [],
// }) => {
//   const [searchTerm, setSearchTerm] = useState("");
//   const [appliedSearch, setAppliedSearch] = useState("");
//   const [searchMode, setSearchMode] = useState("part");
//   const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
//   const [internalSelectedItems, setInternalSelectedItems] = useState([]);
//   const [filters, setFilters] = useState(initialFilters);
//   const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);

//   const debouncedColumnFilters = useDebounce(filters, 300);

//   const selectedItems =
//     externalSelectedItems?.length > 0 ? externalSelectedItems : internalSelectedItems;

//   const getRowUniqueKey = (row) => String(row?.groupId ?? "");

//   const selectedItemKeys = useMemo(() => {
//     return new Set((selectedItems || []).map((item) => getRowUniqueKey(item)));
//   }, [selectedItems]);

//   const parseApiRows = (result) => {
//     if (!result?.success) return [];

//     const rawJson = result?.data?.[0]?.result;

//     if (typeof rawJson === "string") {
//       try {
//         const parsed = JSON.parse(rawJson);
//         return Array.isArray(parsed) ? parsed : [];
//       } catch (error) {
//         console.error("Failed to parse SQL JSON result:", error);
//         return [];
//       }
//     }

//     if (Array.isArray(rawJson)) {
//       return rawJson;
//     }

//     return [];
//   };

//   const {
//     data: apiRows = [],
//     isLoading,
//     isFetching,
//     refetch,
//   } = useQuery({
//     queryKey: [
//       "itemMastLookup",
//       endpoint,
//       appliedSearch,
//       searchMode,
//       customParam,
//       hasSubmittedSearch,
//     ],
//     queryFn: async () => {
//       const payload = {
//         PARAMS: JSON.stringify({
//           json_data: {
//             search: appliedSearch?.trim() || null,
//             filter: customParam || "ActiveAll",
//             docType: "PRMS",
//             searchMode,
//           },
//         }),
//       };

//       console.log("Lookup payload:", payload);

//       const { data: result } = await apiClient.get(endpoint, {
//         params: payload,
//       });

//       if (!result?.success) {
//         throw new Error(result?.message || "Failed to fetch item lookup records.");
//       }

//       return parseApiRows(result);
//     },
//     enabled: isOpen && hasSubmittedSearch && typeof endpoint === "string",
//     staleTime: 60000,
//     placeholderData: keepPreviousData,
//   });

//   const records = useMemo(() => {
//     return Array.isArray(apiRows) ? apiRows : [];
//   }, [apiRows]);

//   const hasActiveFilters =
//     searchTerm !== "" ||
//     appliedSearch !== "" ||
//     Object.values(filters).some((val) => val !== "");

//   const resetFilters = () => {
//     setSearchTerm("");
//     setAppliedSearch("");
//     setHasSubmittedSearch(true);
//     setSortConfig({ key: "", direction: "asc" });
//     setFilters(initialFilters);
//     setInternalSelectedItems([]);
//   };

//   const handleManualSearch = (e) => {
//     e.preventDefault();
//     setAppliedSearch(searchTerm);
//     setHasSubmittedSearch(true);
//   };

//   const filteredAndSorted = useMemo(() => {
//     let result = [...records];

//     result = result.filter((item) =>
//       visibleColumns.every((col) => {
//         const itemValue = String(item?.[col.key] ?? "").toLowerCase();
//         const filterValue = String(debouncedColumnFilters?.[col.key] ?? "").toLowerCase();
//         return itemValue.includes(filterValue);
//       })
//     );

//     if (sortConfig.key) {
//       result.sort((a, b) => {
//         const aRaw = a?.[sortConfig.key];
//         const bRaw = b?.[sortConfig.key];

//         const aNum = Number(aRaw);
//         const bNum = Number(bRaw);

//         const bothNumeric =
//           aRaw !== null &&
//           aRaw !== "" &&
//           bRaw !== null &&
//           bRaw !== "" &&
//           !Number.isNaN(aNum) &&
//           !Number.isNaN(bNum);

//         if (bothNumeric) {
//           return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
//         }

//         const aVal = String(aRaw ?? "");
//         const bVal = String(bRaw ?? "");

//         return sortConfig.direction === "asc"
//           ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" })
//           : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: "base" });
//       });
//     }

//     return result;
//   }, [records, debouncedColumnFilters, sortConfig]);

//   const visibleRows = filteredAndSorted;

//   const allVisibleSelected =
//     enableMultiSelect &&
//     visibleRows.length > 0 &&
//     visibleRows.every((row) => selectedItemKeys.has(getRowUniqueKey(row)));

//   const someVisibleSelected =
//     enableMultiSelect &&
//     visibleRows.some((row) => selectedItemKeys.has(getRowUniqueKey(row)));


//   const handleRowClick = (item) => {
//     if (enableMultiSelect) return;

//     const payload = {
//       records: item ? [item] : [],
//     };

//     if (onGetSelectedItems) {
//       onGetSelectedItems(payload);
//       return;
//     }

//     onClose?.(payload);
//   };

//   const handleToggleItem = (item) => {
//     const rowKey = getRowUniqueKey(item);
//     if (!rowKey) return;

//     setInternalSelectedItems((prevSelected) => {
//       const exists = prevSelected.some((x) => getRowUniqueKey(x) === rowKey);
//       if (exists) {
//         return prevSelected.filter((x) => getRowUniqueKey(x) !== rowKey);
//       }
//       return [...prevSelected, item];
//     });
//   };

//   const handleSelectAllVisible = () => {
//     if (allVisibleSelected) {
//       setInternalSelectedItems((prev) =>
//         prev.filter(
//           (selected) =>
//             !visibleRows.some((row) => getRowUniqueKey(row) === getRowUniqueKey(selected))
//         )
//       );
//     } else {
//       setInternalSelectedItems((prev) => {
//         const map = new Map(
//           prev
//             .filter((item) => getRowUniqueKey(item))
//             .map((item) => [getRowUniqueKey(item), item])
//         );

//         visibleRows.forEach((row) => {
//           const rowKey = getRowUniqueKey(row);
//           if (rowKey) map.set(rowKey, row);
//         });

//         return Array.from(map.values());
//       });
//     }
//   };



//   const handleGetSelectedItems = () => {
//     const payload = {
//       records: Array.isArray(selectedItems) ? selectedItems : [],
//     };

//     if (onGetSelectedItems) {
//       onGetSelectedItems(payload);
//       return;
//     }

//     onClose?.(payload);
//   };




//   const formatCellValue = (key, value) => {
//     if (value == null || value === "") return "";

//     if (key === "qtyHand" || key === "unitCost") {
//       const numericValue = Number(value);
//       return Number.isNaN(numericValue)
//         ? value
//         : numericValue.toLocaleString(undefined, {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 6,
//           });
//     }

//     return value;
//   };

//   useEffect(() => {
//     if (isOpen) {
//       setHasSubmittedSearch(true);
//       setAppliedSearch("");
//       setSearchTerm("");
//       setFilters(initialFilters);
//       setSortConfig({ key: "", direction: "asc" });
//       setInternalSelectedItems([]);
//     } else {
//       setSearchTerm("");
//       setAppliedSearch("");
//       setSearchMode("part");
//       setSortConfig({ key: "", direction: "asc" });
//       setInternalSelectedItems([]);
//       setFilters(initialFilters);
//       setHasSubmittedSearch(false);
//     }
//   }, [isOpen]);

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in font-sans">
//       <div className="bg-white rounded-xl shadow-2xl w-full max-w-[90rem] max-h-[85vh] flex flex-col relative overflow-hidden border border-slate-200">
//         <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b">
//           <h2 className="text-[16px] font-bold text-[#1e40af]">
//             {enableMultiSelect ? "Select Items" : "Select Item"}
//           </h2>

//           <div className="flex items-center gap-4">
//             <button
//               onClick={() => refetch()}
//               className="text-slate-400 hover:text-blue-600 transition-colors"
//               type="button"
//               disabled={!hasSubmittedSearch}
//             >
//               <FontAwesomeIcon icon={faSyncAlt} spin={isFetching} />
//             </button>

//             <button
//               onClick={() => onClose?.(null)}
//               className="text-slate-400 hover:text-red-600 transition-colors"
//               type="button"
//             >
//               <FontAwesomeIcon icon={faTimes} size="lg" />
//             </button>
//           </div>
//         </div>

//         <form
//           onSubmit={handleManualSearch}
//           className="px-4 py-3 bg-slate-50 border-b flex items-center gap-6 flex-wrap"
//         >
//           <div className="flex items-center gap-2 w-full max-w-xl">
//             <div className="relative flex-grow">
//               <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
//                 <FontAwesomeIcon icon={faSearch} size="sm" />
//               </span>

//               <input
//                 type="text"
//                 placeholder="Search by item code or item name..."
//                 className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white transition-all"
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//               />
//             </div>

//             <button
//               type="submit"
//               className="px-6 py-2 bg-[#1e40af] text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider"
//             >
//               {isFetching ? (
//                 <FontAwesomeIcon icon={faSpinner} spin />
//               ) : (
//                 <FontAwesomeIcon icon={faSearch} />
//               )}
//               Filter
//             </button>
//           </div>

//           <div className="flex items-center gap-5">
//             <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 tracking-tight">
//               <input
//                 type="radio"
//                 value="start"
//                 checked={searchMode === "start"}
//                 onChange={(e) => setSearchMode(e.target.value)}
//                 className="w-4 h-4 text-blue-600"
//               />
//               STARTS WITH
//             </label>

//             <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 tracking-tight">
//               <input
//                 type="radio"
//                 value="part"
//                 checked={searchMode === "part"}
//                 onChange={(e) => setSearchMode(e.target.value)}
//                 className="w-4 h-4 text-blue-600"
//               />
//               CONTAINS
//             </label>

//             {hasActiveFilters && (
//               <button
//                 type="button"
//                 onClick={resetFilters}
//                 className="ml-2 text-[10px] font-bold text-blue-600 hover:underline"
//               >
//                 <FontAwesomeIcon icon={faEraser} className="mr-1" />
//                 CLEAR ALL
//               </button>
//             )}
//           </div>
//         </form>

//         <div className="flex-grow overflow-auto custom-scrollbar bg-white">
//           {isLoading || isFetching ? (
//             <div className="flex flex-col items-center justify-center h-64 text-slate-400">
//               <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
//               <p className="text-sm font-medium">Fetching from server...</p>
//             </div>
//           ) : (
//             <table className="min-w-full border-separate border-spacing-0">
//               <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
//                 <tr>
//                   {enableMultiSelect && (
//                     <th
//                       style={{ width: "110px" }}
//                       className="px-4 py-3 text-left border-b border-slate-200 align-top"
//                     >
//                       <div className="mb-2">
//                         <span className="text-[12px] font-bold text-slate-600 uppercase tracking-tighter">
//                           Select
//                         </span>
//                       </div>

//                       <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
//                         <input
//                           type="checkbox"
//                           checked={allVisibleSelected}
//                           ref={(el) => {
//                             if (el) {
//                               el.indeterminate = !allVisibleSelected && someVisibleSelected;
//                             }
//                           }}
//                           onChange={handleSelectAllVisible}
//                           className="w-4 h-4 accent-blue-600"
//                         />
//                         <span>Select All</span>
//                       </label>
//                     </th>
//                   )}

//                   {visibleColumns.map((col) => (
//                     <th
//                       key={col.key}
//                       style={{ width: col.width || "180px" }}
//                       className="px-4 py-3 text-left border-b border-slate-200"
//                     >
//                       <div
//                         onClick={() =>
//                           setSortConfig((prev) => ({
//                             key: col.key,
//                             direction:
//                               prev.key === col.key && prev.direction === "asc"
//                                 ? "desc"
//                                 : "asc",
//                           }))
//                         }
//                         className="flex items-center gap-2 cursor-pointer mb-2 group"
//                       >
//                         <span className="text-[12px] font-bold text-slate-600 uppercase tracking-tighter">
//                           {col.label}
//                         </span>
//                         <FontAwesomeIcon
//                           icon={faSort}
//                           className={`text-[10px] ${
//                             sortConfig.key === col.key ? "text-blue-500" : "opacity-20"
//                           }`}
//                         />
//                       </div>

//                       <div className="relative">
//                         <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-300">
//                           <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
//                         </span>
//                         <input
//                           type="text"
//                           value={filters[col.key] || ""}
//                           onChange={(e) =>
//                             setFilters((prev) => ({
//                               ...prev,
//                               [col.key]: e.target.value,
//                             }))
//                           }
//                           placeholder="Filter..."
//                           className="w-full pl-7 pr-2 py-1.5 text-[11px] font-normal border border-slate-200 rounded-md bg-white focus:border-blue-400 outline-none"
//                         />
//                       </div>
//                     </th>
//                   ))}
//                 </tr>
//               </thead>

//               <tbody className="divide-y divide-slate-100">
//                 {visibleRows.length > 0 ? (
//                   visibleRows.map((item, idx) => {
//                     const rowKey = getRowUniqueKey(item);
//                     const isChecked = selectedItemKeys.has(rowKey);

//                     return (
//                       <tr
//                         key={`${rowKey || idx}-${idx}`}
//                         onClick={() => handleRowClick(item)}
//                         className={`transition-colors group ${
//                           enableMultiSelect
//                             ? isChecked
//                               ? "bg-blue-50 hover:bg-blue-100"
//                               : "hover:bg-slate-50"
//                             : "hover:bg-blue-50 cursor-pointer"
//                         }`}
//                       >
//                         {enableMultiSelect && (
//                           <td className="px-4 py-3 text-[12px] text-slate-700 font-medium">
//                             <div
//                               className="flex items-center"
//                               onClick={(e) => e.stopPropagation()}
//                             >
//                               <input
//                                 type="checkbox"
//                                 checked={isChecked}
//                                 onChange={() => handleToggleItem(item)}
//                                 className="w-4 h-4 accent-blue-600"
//                               />
//                             </div>
//                           </td>
//                         )}

//                         {visibleColumns.map((col) => (
//                           <td
//                             key={col.key}
//                             className={`px-4 py-3 text-[12px] text-slate-700 font-medium ${col.classNames || ""}`}
//                           >
//                             {col.key === "itemCode" ? (
//                               <span className="font-bold">
//                                 {formatCellValue(col.key, item[col.key])}
//                               </span>
//                             ) : (
//                               formatCellValue(col.key, item[col.key])
//                             )}
//                           </td>
//                         ))}
//                       </tr>
//                     );
//                   })
//                 ) : (
//                   <tr>
//                     <td
//                       colSpan={visibleColumns.length + (enableMultiSelect ? 1 : 0)}
//                       className="px-4 py-20 text-center text-slate-400 italic"
//                     >
//                       No records found.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           )}
//         </div>

//         <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
//           <div className="flex items-center gap-4">
//             <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
//               Total Records: {visibleRows.length}
//             </span>

//             {enableMultiSelect && (
//               <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">
//                 Selected: {selectedItems.length}
//               </span>
//             )}

//             {isFetching && (
//               <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase tracking-widest italic">
//                 Syncing with server...
//               </span>
//             )}
//           </div>

//           {enableMultiSelect && (
//             <button
//               type="button"
//               onClick={handleGetSelectedItems}
//               className="px-4 py-2 bg-[#1e40af] text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
//               disabled={selectedItems.length === 0}
//             >
//               <FontAwesomeIcon icon={faCheckSquare} />
//               Get Selected Items
//             </button>
//           )}
//         </div>
//       </div>

//       <style jsx="true">{`
//         .custom-scrollbar::-webkit-scrollbar {
//           width: 8px;
//           height: 8px;
//         }
//         .custom-scrollbar::-webkit-scrollbar-track {
//           background: #f1f1f1;
//         }
//         .custom-scrollbar::-webkit-scrollbar-thumb {
//           background: #cbd5e1;
//           border-radius: 4px;
//         }
//         .custom-scrollbar::-webkit-scrollbar-thumb:hover {
//           background: #94a3b8;
//         }
//         @keyframes fade-in {
//           from {
//             opacity: 0;
//             transform: translateY(-10px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }
//         .animate-fade-in {
//           animation: fade-in 0.2s ease-out forwards;
//         }
//       `}</style>
//     </div>
//   );
// };

// export default ItemMastLookupModal;


import React, { useState, useEffect, useMemo } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSpinner,
  faSyncAlt,
  faSort,
  faSearch,
  faEraser,
  faCheckSquare,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const usageColumnConfig = [
  { key: "itemCode", label: "Item Code", width: "140px", hidden: 0, classNames: "text-left" },
  { key: "itemName", label: "Item Name", width: "320px", hidden: 0, classNames: "text-left" },
  { key: "uomCode", label: "UOM", width: "100px", hidden: 0, classNames: "text-left" },
  { key: "qtyHand", label: "On Hand", width: "120px", hidden: 0, classNames: "text-right" },
  { key: "unitCost", label: "Unit Cost", width: "130px", hidden: 0, classNames: "text-right" },
  { key: "categCode", label: "Category Code", width: "150px", hidden: 0, classNames: "text-left" },
  { key: "categName", label: "Category Name", width: "200px", hidden: 0, classNames: "text-left" },
  { key: "classCode", label: "Class Code", width: "140px", hidden: 0, classNames: "text-left" },
  { key: "className", label: "Class Name", width: "220px", hidden: 0, classNames: "text-left" },
  { key: "groupId", label: "Group ID", width: "120px", hidden: 1, classNames: "text-left" },
];

const createFilterObject = (cols = []) =>
  cols.reduce((acc, col) => {
    acc[col.key] = "";
    return acc;
  }, {});

const ItemMastLookupModal = ({
  isOpen,
  onClose,
  customParam = "ActiveAll",
  enableMultiSelect = false,
  onGetSelectedItems,
  endpoint = "/getInvLookup",
  docType=null,
  selectedItems: externalSelectedItems = [],
}) => {
  const { companyInfo, currentUserRow } = useAuth();

  const visibleColumns = useMemo(() => {
    return usageColumnConfig.filter((col) => {
      if (Number(col.hidden)) return false;
      if (col.key === "unitCost" && currentUserRow?.view_costamt !== "Y") return false;
      return true;
    });
  }, [currentUserRow?.view_costamt]);

  const initialFilters = useMemo(() => createFilterObject(visibleColumns), [visibleColumns]);

  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [searchMode, setSearchMode] = useState("part");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [internalSelectedItems, setInternalSelectedItems] = useState([]);
  const [filters, setFilters] = useState({});
  const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);

  const debouncedColumnFilters = useDebounce(filters, 300);

  const selectedItems =
    externalSelectedItems?.length > 0 ? externalSelectedItems : internalSelectedItems;

  const getRowUniqueKey = (row) => String(row?.groupId ?? "");

  const selectedItemKeys = useMemo(() => {
    return new Set((selectedItems || []).map((item) => getRowUniqueKey(item)));
  }, [selectedItems]);

  const parseApiRows = (result) => {
    if (!result?.success) return [];

    const rawJson = result?.data?.[0]?.result;

    if (typeof rawJson === "string") {
      try {
        const parsed = JSON.parse(rawJson);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Failed to parse SQL JSON result:", error);
        return [];
      }
    }

    if (Array.isArray(rawJson)) {
      return rawJson;
    }

    return [];
  };

  const {
    data: apiRows = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "itemMastLookup",
      endpoint,
      appliedSearch,
      searchMode,
      customParam,
      hasSubmittedSearch,
    ],
    queryFn: async () => {
      const payload = {
        PARAMS: JSON.stringify({
          json_data: {
            search: appliedSearch?.trim() || null,
            filter: customParam || "ActiveAll",
            docType: docType,
            searchMode,
          },
        }),
      };

      const { data: result } = await apiClient.get(endpoint, {
        params: payload,
      });

      if (!result?.success) {
        throw new Error(result?.message || "Failed to fetch item lookup records.");
      }

      return parseApiRows(result);
    },
    enabled: isOpen && hasSubmittedSearch && typeof endpoint === "string",
    staleTime: 60000,
    placeholderData: keepPreviousData,
  });

  const records = useMemo(() => {
    return Array.isArray(apiRows) ? apiRows : [];
  }, [apiRows]);

  const hasActiveFilters =
    searchTerm !== "" ||
    appliedSearch !== "" ||
    Object.values(filters).some((val) => val !== "");

  const resetFilters = () => {
    setSearchTerm("");
    setAppliedSearch("");
    setHasSubmittedSearch(true);
    setSortConfig({ key: "", direction: "asc" });
    setFilters(createFilterObject(visibleColumns));
    setInternalSelectedItems([]);
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(searchTerm);
    setHasSubmittedSearch(true);
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...records];

    result = result.filter((item) =>
      visibleColumns.every((col) => {
        const itemValue = String(item?.[col.key] ?? "").toLowerCase();
        const filterValue = String(debouncedColumnFilters?.[col.key] ?? "").toLowerCase();
        return itemValue.includes(filterValue);
      })
    );

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aRaw = a?.[sortConfig.key];
        const bRaw = b?.[sortConfig.key];

        const aNum = Number(aRaw);
        const bNum = Number(bRaw);

        const bothNumeric =
          aRaw !== null &&
          aRaw !== "" &&
          bRaw !== null &&
          bRaw !== "" &&
          !Number.isNaN(aNum) &&
          !Number.isNaN(bNum);

        if (bothNumeric) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        const aVal = String(aRaw ?? "");
        const bVal = String(bRaw ?? "");

        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" })
          : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: "base" });
      });
    }

    return result;
  }, [records, debouncedColumnFilters, sortConfig, visibleColumns]);

  const visibleRows = filteredAndSorted;

  const allVisibleSelected =
    enableMultiSelect &&
    visibleRows.length > 0 &&
    visibleRows.every((row) => selectedItemKeys.has(getRowUniqueKey(row)));

  const someVisibleSelected =
    enableMultiSelect &&
    visibleRows.some((row) => selectedItemKeys.has(getRowUniqueKey(row)));

  const handleRowClick = (item) => {
    if (enableMultiSelect) return;

    const payload = {
      records: item ? [item] : [],
    };

    if (onGetSelectedItems) {
      onGetSelectedItems(payload);
      return;
    }

    onClose?.(payload);
  };

  const handleToggleItem = (item) => {
    const rowKey = getRowUniqueKey(item);
    if (!rowKey) return;

    setInternalSelectedItems((prevSelected) => {
      const exists = prevSelected.some((x) => getRowUniqueKey(x) === rowKey);
      if (exists) {
        return prevSelected.filter((x) => getRowUniqueKey(x) !== rowKey);
      }
      return [...prevSelected, item];
    });
  };

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setInternalSelectedItems((prev) =>
        prev.filter(
          (selected) =>
            !visibleRows.some((row) => getRowUniqueKey(row) === getRowUniqueKey(selected))
        )
      );
    } else {
      setInternalSelectedItems((prev) => {
        const map = new Map(
          prev
            .filter((item) => getRowUniqueKey(item))
            .map((item) => [getRowUniqueKey(item), item])
        );

        visibleRows.forEach((row) => {
          const rowKey = getRowUniqueKey(row);
          if (rowKey) map.set(rowKey, row);
        });

        return Array.from(map.values());
      });
    }
  };

  const handleGetSelectedItems = () => {
    const payload = {
      records: Array.isArray(selectedItems) ? selectedItems : [],
    };

    if (onGetSelectedItems) {
      onGetSelectedItems(payload);
      return;
    }
    onClose?.(payload);
  };

 



  const formatCellValue = (key, value) => {
  if (value == null || value === "") return "";

  if (key === "qtyHand") {
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return value;

    const normalizedDocType = String(docType || "").toUpperCase();

    let qtyDecimals = 2;

    if (normalizedDocType === "PRMS") {
      qtyDecimals = Number(companyInfo?.itemDecqtyPur ?? 2);
    } else if (normalizedDocType.startsWith("FG")) {
      qtyDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);
    } else if (normalizedDocType.startsWith("RM")) {
      qtyDecimals = Number(companyInfo?.itemDescQtyRM ?? 2);
    } else if (normalizedDocType.startsWith("MS")) {
      qtyDecimals = Number(companyInfo?.itemDecqtyMS ?? 2);
    }

    return numericValue.toLocaleString(undefined, {
      minimumFractionDigits: qtyDecimals,
      maximumFractionDigits: qtyDecimals,
    });
  }

  if (key === "unitCost") {
    const numericValue = Number(value);
    return Number.isNaN(numericValue)
      ? value
      : numericValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6,
        });
  }

  return value;
};





  useEffect(() => {
    if (isOpen) {
      setHasSubmittedSearch(true);
      setAppliedSearch("");
      setSearchTerm("");
      setFilters(createFilterObject(visibleColumns));
      setSortConfig({ key: "", direction: "asc" });
      setInternalSelectedItems([]);
    } else {
      setSearchTerm("");
      setAppliedSearch("");
      setSearchMode("part");
      setSortConfig({ key: "", direction: "asc" });
      setInternalSelectedItems([]);
      setFilters(createFilterObject(visibleColumns));
      setHasSubmittedSearch(false);
    }
  }, [isOpen, visibleColumns]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in font-sans">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[90rem] max-h-[85vh] flex flex-col relative overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b">
          <h2 className="text-[16px] font-bold text-[#1e40af]">
            {enableMultiSelect ? "Select Items" : "Select Item"}
          </h2>

          <div className="flex items-center gap-4">
            <button
              onClick={() => refetch()}
              className="text-slate-400 hover:text-blue-600 transition-colors"
              type="button"
              disabled={!hasSubmittedSearch}
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={isFetching} />
            </button>

            <button
              onClick={() => onClose?.(null)}
              className="text-slate-400 hover:text-red-600 transition-colors"
              type="button"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleManualSearch}
          className="px-4 py-3 bg-slate-50 border-b flex items-center gap-6 flex-wrap"
        >
          <div className="flex items-center gap-2 w-full max-w-xl">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <FontAwesomeIcon icon={faSearch} size="sm" />
              </span>

              <input
                type="text"
                placeholder="Search by item code or item name..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-[#1e40af] text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider"
            >
              {isFetching ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faSearch} />
              )}
              Filter
            </button>
          </div>

          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 tracking-tight">
              <input
                type="radio"
                value="start"
                checked={searchMode === "start"}
                onChange={(e) => setSearchMode(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              STARTS WITH
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-[10px] font-bold text-slate-600 tracking-tight">
              <input
                type="radio"
                value="part"
                checked={searchMode === "part"}
                onChange={(e) => setSearchMode(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              CONTAINS
            </label>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-2 text-[10px] font-bold text-blue-600 hover:underline"
              >
                <FontAwesomeIcon icon={faEraser} className="mr-1" />
                CLEAR ALL
              </button>
            )}
          </div>
        </form>

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">
          {isLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-4 text-blue-500" />
              <p className="text-sm font-medium">Fetching from server...</p>
            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                <tr>
                  {enableMultiSelect && (
                    <th
                      style={{ width: "110px" }}
                      className="px-4 py-3 text-left border-b border-slate-200 align-top"
                    >
                      <div className="mb-2">
                        <span className="text-[12px] font-bold text-slate-600 uppercase tracking-tighter">
                          Select
                        </span>
                      </div>

                      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = !allVisibleSelected && someVisibleSelected;
                            }
                          }}
                          onChange={handleSelectAllVisible}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span>Select All</span>
                      </label>
                    </th>
                  )}

                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      style={{ width: col.width || "180px" }}
                      className="px-4 py-3 text-left border-b border-slate-200"
                    >
                      <div
                        onClick={() =>
                          setSortConfig((prev) => ({
                            key: col.key,
                            direction:
                              prev.key === col.key && prev.direction === "asc"
                                ? "desc"
                                : "asc",
                          }))
                        }
                        className="flex items-center gap-2 cursor-pointer mb-2 group"
                      >
                        <span className="text-[12px] font-bold text-slate-600 uppercase tracking-tighter">
                          {col.label}
                        </span>
                        <FontAwesomeIcon
                          icon={faSort}
                          className={`text-[10px] ${
                            sortConfig.key === col.key ? "text-blue-500" : "opacity-20"
                          }`}
                        />
                      </div>

                      <div className="relative">
                        <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-300">
                          <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                        </span>
                        <input
                          type="text"
                          value={filters[col.key] || ""}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              [col.key]: e.target.value,
                            }))
                          }
                          placeholder="Filter..."
                          className="w-full pl-7 pr-2 py-1.5 text-[11px] font-normal border border-slate-200 rounded-md bg-white focus:border-blue-400 outline-none"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleRows.length > 0 ? (
                  visibleRows.map((item, idx) => {
                    const rowKey = getRowUniqueKey(item);
                    const isChecked = selectedItemKeys.has(rowKey);

                    return (
                      <tr
                        key={`${rowKey || idx}-${idx}`}
                        onClick={() => handleRowClick(item)}
                        className={`transition-colors group ${
                          enableMultiSelect
                            ? isChecked
                              ? "bg-blue-50 hover:bg-blue-100"
                              : "hover:bg-slate-50"
                            : "hover:bg-blue-50 cursor-pointer"
                        }`}
                      >
                        {enableMultiSelect && (
                          <td className="px-4 py-3 text-[12px] text-slate-700 font-medium">
                            <div
                              className="flex items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleItem(item)}
                                className="w-4 h-4 accent-blue-600"
                              />
                            </div>
                          </td>
                        )}

                        {visibleColumns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-[12px] text-slate-700 font-medium ${col.classNames || ""}`}
                          >
                            {col.key === "itemCode" ? (
                              <span className="font-bold">
                                {formatCellValue(col.key, item[col.key])}
                              </span>
                            ) : (
                              formatCellValue(col.key, item[col.key])
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + (enableMultiSelect ? 1 : 0)}
                      className="px-4 py-20 text-center text-slate-400 italic"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              Total Records: {visibleRows.length}
            </span>

            {enableMultiSelect && (
              <span className="text-[11px] text-blue-600 font-bold uppercase tracking-wider">
                Selected: {selectedItems.length}
              </span>
            )}

            {isFetching && (
              <span className="text-[10px] text-blue-500 animate-pulse font-bold uppercase tracking-widest italic">
                Syncing with server...
              </span>
            )}
          </div>

          {enableMultiSelect && (
            <button
              type="button"
              onClick={handleGetSelectedItems}
              className="px-4 py-2 bg-[#1e40af] text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedItems.length === 0}
            >
              <FontAwesomeIcon icon={faCheckSquare} />
              Get Selected Items
            </button>
          )}
        </div>
      </div>

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ItemMastLookupModal;