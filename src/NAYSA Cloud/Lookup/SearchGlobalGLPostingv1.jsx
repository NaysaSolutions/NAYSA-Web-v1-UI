// import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import {
//   faTimes, faSort, faSortUp, faSortDown, faSpinner,
//   faFilterCircleXmark, faMagnifyingGlass, faCircleExclamation,
//   faEye, faEyeSlash, faListCheck
// } from '@fortawesome/free-solid-svg-icons';
// import { formatNumber } from '../Global/behavior';

// function useDebouncedValue(value, delay = 250) {
//   const [debounced, setDebounced] = useState(value);
//   useEffect(() => {
//     const t = setTimeout(() => setDebounced(value), delay);
//     return () => clearTimeout(t);
//   }, [value, delay]);
//   return debounced;
// }

// /**
//  * GlobalGLPostingModalv1
//  */
// const GlobalGLPostingModalv1 = ({
//   data,
//   colConfigData,
//   title,
//   btnCaption,
//   onClose,
//   onPost,
//   onViewDocument,
//   remoteLoading = false,
// }) => {
//   const [records, setRecords] = useState([]);
//   const [filtered, setFiltered] = useState([]);
//   const [selected, setSelected] = useState([]);
//   const [filters, setFilters] = useState({});
//   const [columnConfig, setColumnConfig] = useState([]);
//   const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
//   const [currentPage, setCurrentPage] = useState(1);
//   const [showFilters, setShowFilters] = useState(true);
//   const [globalQuery, setGlobalQuery] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [userPassword, setUserPassword] = useState(null);

//   const itemsPerPage = 50;
//   const firstFocusableRef = useRef(null);

//   // Sticky columns: Select + 4 data columns
//   const STICKY_COUNT = 5; // index 0 = Select, 1–4 = first 4 visible data columns

//   const selectHeaderRef = useRef(null);
//   const columnHeaderRefs = useRef({});
//   const [stickyLefts, setStickyLefts] = useState([]); // left offsets for sticky columns
//   const [resizeTick, setResizeTick] = useState(0);

//   // focus first control, allow ESC to close
//   useEffect(() => {
//     firstFocusableRef.current?.focus();
//     const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
//     window.addEventListener('keydown', onKey);
//     return () => window.removeEventListener('keydown', onKey);
//   }, [onClose]);

//   // Listen for window resize to recompute sticky positions
//   useEffect(() => {
//     const handleResize = () => setResizeTick(t => t + 1);
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   // map incoming props -> local state
//   useEffect(() => {
//     setSelected([]);
//     setSortConfig({ key: null, direction: null });
//     setCurrentPage(1);
//     setFilters({});
//     setGlobalQuery('');

//     setColumnConfig(Array.isArray(colConfigData) ? colConfigData : []);
//     const rows = Array.isArray(data) ? data.map((row, i) => ({ ...row, __idx: i })) : [];
//     setRecords(rows);
//     setFiltered([]);
//   }, [data, colConfigData]);

//   const visibleCols = useMemo(
//     () => columnConfig.filter((c) => !c.hidden),
//     [columnConfig]
//   );

//   const renderValue = (column, value, decimal = 2) => {
//     if (!value && value !== 0) return '';
//     switch (column.renderType) {
//       case 'number': {
//         const digits = Number.isFinite(parseInt(decimal, 10)) ? parseInt(decimal, 10) : 2;
//         return formatNumber(value, digits);
//       }
//       case 'date': {
//         const d = new Date(value);
//         if (Number.isNaN(d.getTime())) return '';
//         const m = String(d.getMonth() + 1).padStart(2, '0');
//         const day = String(d.getDate()).padStart(2, '0');
//         const y = d.getFullYear();
//         return `${m}/${day}/${y}`;
//       }
//       default:
//         return value;
//     }
//   };

//   // sorting helpers
//   const coerceForSort = (val, type) => {
//     if (val == null) return null;
//     if (type === 'number') return Number(String(val).replace(/,/g, ''));
//     if (type === 'date') {
//       const t = new Date(val).getTime();
//       return Number.isNaN(t) ? 0 : t;
//     }
//     return String(val).toLowerCase();
//   };
//   const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

//   const debouncedFilters = useDebouncedValue(filters, 200);
//   const debouncedGlobal = useDebouncedValue(globalQuery, 250);

//   useEffect(() => {
//     let current = records.slice();

//     // global search
//     if (debouncedGlobal?.trim()) {
//       const q = debouncedGlobal.trim().toLowerCase();
//       const visibleKeys = visibleCols.map(c => c.key);
//       current = current.filter(row =>
//         visibleKeys.some(k => String(row[k] ?? '').toLowerCase().includes(q))
//       );
//     }

//     // per-column filtering
//     current = current.filter((item) =>
//       Object.entries(debouncedFilters).every(([key, value]) => {
//         if (!value) return true;
//         const itemValue = String(item[key] ?? '').toLowerCase().replace(/,/g, '');
//         const filterValue = String(value).toLowerCase().replace(/,/g, '');
//         return itemValue.includes(filterValue);
//       })
//     );

//     // sorting
//     if (sortConfig?.key && sortConfig?.direction) {
//       const col = columnConfig.find((c) => c.key === sortConfig.key);
//       const type = col?.renderType || 'string';
//       const dir = sortConfig.direction === 'asc' ? 1 : -1;

//       current.sort((a, b) => {
//         const av = coerceForSort(a[sortConfig.key], type);
//         const bv = coerceForSort(b[sortConfig.key], type);
//         return dir * cmp(av, bv);
//       });
//     } else {
//       current.sort((a, b) => (a.__idx ?? 0) - (b.__idx ?? 0));
//     }

//     setFiltered(current);
//   }, [records, debouncedFilters, sortConfig, columnConfig, debouncedGlobal, visibleCols]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [debouncedFilters, debouncedGlobal]);

//   // Compute sticky left offsets based on real DOM widths
//   useLayoutEffect(() => {
//     const lefts = [];
//     let accumulated = 0;

//     // Select column (index 0)
//     if (selectHeaderRef.current) {
//       lefts[0] = 0;
//       accumulated = selectHeaderRef.current.offsetWidth;
//     }

//     // First 4 visible data columns (indexes 1–4 overall)
//     visibleCols.forEach((col, idx) => {
//       if (idx < STICKY_COUNT - 1) {
//         const overallIndex = idx + 1; // because 0 is Select
//         lefts[overallIndex] = accumulated;
//         const hdr = columnHeaderRefs.current[col.key];
//         if (hdr) {
//           accumulated += hdr.offsetWidth;
//         }
//       }
//     });

//     setStickyLefts(lefts);
//   }, [visibleCols, showFilters, resizeTick, filtered.length]);

//   const handleFilterChange = (e, key) => {
//     const v = e.target.value;
//     setFilters((prev) => ({ ...prev, [key]: v }));
//   };
//   const clearAllFilters = () => setFilters({});

//   const handleGetSelected = () => {
//     const payload = selected.map((item) => item.groupId);
//     onPost?.(payload, userPassword);
//   };

//   const handleSort = (key) => {
//     setCurrentPage(1);
//     setSortConfig((prev) => {
//       if (prev.key !== key) return { key, direction: 'asc' };
//       if (prev.direction === 'asc') return { key, direction: 'desc' };
//       return { key: null, direction: null };
//     });
//   };

//   const renderSortIcon = (columnKey) => {
//     if (sortConfig.key === columnKey) {
//       return sortConfig.direction === 'asc'
//         ? <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" />
//         : <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />;
//     }
//     return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
//   };

//   const toggleSelect = (row) => {
//     setSelected((prev) =>
//       prev.some((s) => s.groupId === row.groupId)
//         ? prev.filter((s) => s.groupId !== row.groupId)
//         : [...prev, row]
//     );
//   };

//   const toggleSelectAll = () => {
//     if (selected.length === filtered.length) setSelected([]);
//     else setSelected(filtered);
//   };

//   const handleNextPage = () => setCurrentPage((prev) => prev + 1);
//   const handlePrevPage = () => setCurrentPage((prev) => prev - 1);

//   const paginatedData = useMemo(() => {
//     const startIndex = (currentPage - 1) * itemsPerPage;
//     return filtered.slice(startIndex, startIndex + itemsPerPage);
//   }, [filtered, currentPage, itemsPerPage]);

//   const totalItems = filtered.length;
//   const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
//   const endItem = Math.min(currentPage * itemsPerPage, totalItems);

//   const activeFilterChips = Object.entries(filters).filter(([, v]) => v);

//   // Right-sticky "View" column
//   const ACTION_COL_W = 90; // px
//   const actionHeaderStyle = { right: 0, width: ACTION_COL_W };
//   const actionCellStyle = { right: 0, width: ACTION_COL_W };

//   const handleViewRow = (row) => {
//     onViewDocument?.(row);
//   };

//   const isLoading = !!remoteLoading || (Array.isArray(data) && data.length === 0 && !!remoteLoading);

//   const numberAlignClass = (col) =>
//     col?.renderType === 'number' ? 'text-right tabular-nums' : '';

//   const remarksCellClass = (col) => {
//     const key = String(col?.key ?? '');
//     const label = String(col?.label ?? '');
//     const isRemarks = /remarks/i.test(key) || /remarks/i.test(label);
//     return isRemarks ? 'max-w-[400px] truncate md:whitespace-nowrap' : '';
//   };

//   // Helper: meta for sticky columns (index 0 = Select, 1–4 = first 4 visible data cols)
//   const stickyMeta = (overallIndex) => {
//     if (overallIndex < STICKY_COUNT) {
//       const left = stickyLefts[overallIndex] ?? 0;
//       return {
//         sticky: true,
//         left,
//         // For data sticky cols (1–4), cap width at 200px but still let it be based on content
//         maxWidth: overallIndex === 0 ? undefined : 200,
//       };
//     }
//     return { sticky: false, left: 0, maxWidth: undefined };
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 lg:p-8">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1280px] max-h-[92vh] flex flex-col relative overflow-hidden">
//         {/* Close */}
//         <button
//           onClick={onClose}
//           className="absolute top-3 right-3 text-blue-600 hover:text-blue-800 focus:outline-none p-2 rounded-full hover:bg-blue-50"
//           aria-label="Close modal"
//         >
//           <FontAwesomeIcon icon={faTimes} />
//         </button>

//         {/* Header */}
//         <div className="border-b border-gray-100 bg-white/95 sticky top-0 z-20">
//           <div className="flex items-center gap-3 px-4 py-3">
//             <h2 className="text-sm font-semibold text-blue-900 truncate">{title}</h2>
//             <span className="ml-auto inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
//               <FontAwesomeIcon icon={faListCheck} />
//               {selected.length} selected
//             </span>
//           </div>

//           <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
//             <div className="relative">
//               <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-2.5 text-gray-400 text-xs" />
//               <input
//                 ref={firstFocusableRef}
//                 value={globalQuery}
//                 onChange={(e) => setGlobalQuery(e.target.value)}
//                 placeholder="Global search…"
//                 className="pl-7 pr-3 py-2 text-xs border rounded-md w-72 focus:ring-2 focus:ring-blue-200"
//               />
//             </div>

//             <button
//               onClick={() => setShowFilters((s) => !s)}
//               className="text-xs px-3 py-2 rounded-md border hover:bg-gray-50"
//             >
//               {showFilters ? 'Hide filters' : 'Show filters'}
//             </button>

//             <button
//               onClick={clearAllFilters}
//               disabled={activeFilterChips.length === 0}
//               className="text-xs px-3 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-40 inline-flex items-center gap-2"
//               title="Clear all filters"
//             >
//               <FontAwesomeIcon icon={faFilterCircleXmark} />
//               Clear filters
//             </button>

//             {/* Active filter chips */}
//             <div className="flex flex-wrap gap-1">
//               {activeFilterChips.map(([k, v]) => (
//                 <button
//                   key={k}
//                   className="text-[11px] px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
//                   onClick={() => setFilters(prev => ({ ...prev, [k]: '' }))}
//                   title={`Remove filter: ${k}`}
//                 >
//                   {k}: <span className="font-medium">{String(v)}</span> ✕
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* ===== Table area ===== */}
//         <div className="flex-grow overflow-hidden">
//           {isLoading ? (
//             <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-blue-500">
//               <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-3" />
//               <span className="text-sm">Loading records…</span>
//             </div>
//           ) : (
//             <div className="overflow-auto max-h-[calc(92vh-220px)] custom-scrollbar overscroll-x-contain">
//               {/* no table-fixed so widths can be natural */}
//               <table className="min-w-full">
//                 <thead className="sticky top-0 z-30">
//                   <tr className="bg-gray-100/90 backdrop-blur border-b border-gray-200 whitespace-nowrap text-[10px] sm:text[11px]">
//                     {/* Select header (sticky col index 0) */}
//                     {(() => {
//                       const m = stickyMeta(0);
//                       const stickyStyle = {};
//                       if (m.sticky) {
//                         stickyStyle.left = m.left;
//                         // Narrow select col fixed width
//                         stickyStyle.width = 50;
//                         stickyStyle.minWidth = 50;
//                         stickyStyle.maxWidth = 50;
//                       }
//                       return (
//                         <th
//                           ref={selectHeaderRef}
//                           className="sticky bg-gray-100 z-[70] px-2 py-2 text-center font-bold text-blue-900"
//                           style={stickyStyle}
//                         >
//                           Select
//                         </th>
//                       );
//                     })()}

//                     {/* Dynamic headers */}
//                     {visibleCols.map((column, vIdx) => {
//                       const overallIndex = vIdx + 1; // account for Select col
//                       const m = stickyMeta(overallIndex);
//                       const stickyHeaderClasses = m.sticky
//                         ? 'sticky bg-gray-100 z-[60]'
//                         : '';
//                       const stickyStyle = {};
//                       if (m.sticky) {
//                         stickyStyle.left = m.left;
//                         if (m.maxWidth) {
//                           stickyStyle.maxWidth = m.maxWidth; // cap at 200 for sticky data cols
//                         }
//                       }

//                       return (
//                         <th
//                           key={column.key}
//                           ref={el => {
//                             if (overallIndex < STICKY_COUNT) {
//                               columnHeaderRefs.current[column.key] = el;
//                             }
//                           }}
//                           onClick={() => column.sortable && handleSort(column.key)}
//                           className={[
//                             'px-3 py-2 font-bold text-blue-900 select-none',
//                             column.sortable ? 'cursor-pointer hover:bg-gray-200/50' : '',
//                             numberAlignClass(column),
//                             remarksCellClass(column),
//                             stickyHeaderClasses,
//                           ].join(' ')}
//                           style={stickyStyle}
//                         >
//                           <span className="inline-flex items-center">
//                             {column.label} {renderSortIcon(column.key)}
//                           </span>
//                         </th>
//                       );
//                     })}

//                     {/* Right-frozen View column header */}
//                     <th
//                       className="sticky bg-gray-100 z-[70] px-3 py-2 font-bold text-blue-900 text-center border-l border-gray-200"
//                       style={actionHeaderStyle}
//                     >
//                       View
//                     </th>
//                   </tr>

//                   {/* Header filter row */}
//                   {showFilters && (
//                     <tr className="bg-white border-b border-gray-100 text-[10px] sm:text-[11px]">
//                       {/* Select filter cell */}
//                       {(() => {
//                         const m = stickyMeta(0);
//                         const stickyStyle = {};
//                         if (m.sticky) {
//                           stickyStyle.left = m.left;
//                           stickyStyle.width = 50;
//                           stickyStyle.minWidth = 50;
//                           stickyStyle.maxWidth = 50;
//                         }
//                         return (
//                           <td
//                             className="sticky bg-white z-[70] px-2 py-1"
//                             style={stickyStyle}
//                           />
//                         );
//                       })()}

//                       {/* Dynamic filter inputs */}
//                       {visibleCols.map((column, vIdx) => {
//                         const overallIndex = vIdx + 1;
//                         const m = stickyMeta(overallIndex);
//                         const stickyFilterClasses = m.sticky
//                           ? 'sticky bg-white z-[60]'
//                           : '';
//                         const stickyStyle = {};
//                         if (m.sticky) {
//                           stickyStyle.left = m.left;
//                           if (m.maxWidth) {
//                             stickyStyle.maxWidth = m.maxWidth;
//                           }
//                         }

//                         return (
//                           <td
//                             key={column.key}
//                             className={['px-2 py-1', stickyFilterClasses].join(' ')}
//                             style={stickyStyle}
//                           >
//                             <input
//                               type="text"
//                               value={filters[column.key] || ''}
//                               onChange={(e) => handleFilterChange(e, column.key)}
//                               placeholder="Filter ..."
//                               className="w-full border rounded px-2 py-1 text-[10px] sm:text-[11px] focus:ring-2 focus:ring-blue-200"
//                             />
//                           </td>
//                         );
//                       })}

//                       {/* Right-frozen empty filter cell */}
//                       <td
//                         className="sticky bg-white z-[70] px-2 py-1 border-l border-gray-100"
//                         style={actionCellStyle}
//                       />
//                     </tr>
//                   )}
//                 </thead>

//                 <tbody className="bg-white whitespace-nowrap">
//                   {paginatedData.length > 0 ? (
//                     paginatedData.map((row, rIdx) => {
//                       const rowBgClass = rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

//                       return (
//                         <tr
//                           key={row.__idx ?? rIdx}
//                           className={`text-[10px] sm:text-[11px] hover:bg-blue-50 ${rowBgClass}`}
//                           onDoubleClick={() => handleViewRow(row)}
//                         >
//                           {/* Select data cell (sticky index 0) */}
//                           {(() => {
//                             const m = stickyMeta(0);
//                             const stickyStyle = {};
//                             if (m.sticky) {
//                               stickyStyle.left = m.left;
//                               stickyStyle.width = 50;
//                               stickyStyle.minWidth = 50;
//                               stickyStyle.maxWidth = 50;
//                             }
//                             return (
//                               <td
//                                 className="sticky z-[70] text-center bg-white"
//                                 style={stickyStyle}
//                               >
//                                 <input
//                                   type="checkbox"
//                                   checked={selected.some((s) => s.groupId === row.groupId)}
//                                   onChange={() => toggleSelect(row)}
//                                   className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
//                                 />
//                               </td>
//                             );
//                           })()}

//                           {/* Dynamic data cells */}
//                           {visibleCols.map((column, vIdx) => {
//                             const overallIndex = vIdx + 1;
//                             const m = stickyMeta(overallIndex);
//                             const stickyBodyClasses = m.sticky
//                               ? 'sticky z-[60] bg-white'
//                               : '';
//                             const stickyStyle = {};
//                             if (m.sticky) {
//                               stickyStyle.left = m.left;
//                               if (m.maxWidth) {
//                                 stickyStyle.maxWidth = m.maxWidth; // cap at 200 for sticky data cols
//                               }
//                             }

//                             const isRemarksKey = /remarks/i.test(String(column?.key ?? ''));

//                             return (
//                               <td
//                                 key={column.key}
//                                 className={[
//                                   'px-3 py-[6px]',
//                                   numberAlignClass(column),
//                                   remarksCellClass(column),
//                                   stickyBodyClasses,
//                                 ].join(' ')}
//                                 style={stickyStyle}
//                                 title={isRemarksKey ? String(row[column.key] ?? '') : undefined}
//                               >
//                                 {renderValue(column, row[column.key], Number(column.roundingOff))}
//                               </td>
//                             );
//                           })}

//                           {/* Right-frozen View action cell */}
//                           <td
//                             className="sticky z-[70] px-2 py-[6px] text-center border-l border-gray-200 bg-white"
//                             style={actionCellStyle}
//                           >
//                             <button
//                               type="button"
//                               onClick={(e) => { e.stopPropagation(); handleViewRow(row); }}
//                               className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
//                               title="View document"
//                             >
//                               <FontAwesomeIcon icon={faEye} />
//                             </button>
//                           </td>
//                         </tr>
//                       );
//                     })
//                   ) : (
//                     <tr>
//                       <td colSpan={visibleCols.length + 2} className="px-4 py-10 text-center">
//                         <div className="inline-flex items-center gap-3 text-gray-500">
//                           <FontAwesomeIcon icon={faCircleExclamation} />
//                           <span className="text-sm">No matching records found.</span>
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>

//         {/* Action bar */}
//         <div className="border-t border-gray-200 bg-white sticky bottom-0 z-10">
//           <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
//             <div className="flex flex-col gap-2">
//               <label className="flex items-center gap-2 cursor-pointer select-none">
//                 <input
//                   type="checkbox"
//                   checked={selected.length === filtered.length && filtered.length > 0}
//                   onChange={toggleSelectAll}
//                   className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
//                 />
//                 Select all (filtered)
//               </label>

//               <div className="flex items-center gap-2">
//                 <label className="font-medium">Password</label>
//                 <div className="relative">
//                   <input
//                     type={showPassword ? 'text' : 'password'}
//                     value={userPassword ?? ''}
//                     onChange={(e) => setUserPassword(e.target.value)}
//                     className="border border-gray-300 rounded px-2 py-1 text-xs w-44 pr-8"
//                   />
//                   <button
//                     type="button"
//                     onClick={() => setShowPassword(s => !s)}
//                     className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
//                     title={showPassword ? 'Hide' : 'Show'}
//                   >
//                     <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
//                   </button>
//                 </div>

//                 <button
//                   disabled={selected.length === 0}
//                   className="px-6 py-1.5 bg-blue-600 text-white rounded-md text-xs disabled:opacity-50 hover:bg-blue-700 transition"
//                   onClick={handleGetSelected}
//                 >
//                   {btnCaption} {selected.length ? `(${selected.length})` : ''}
//                 </button>

//                 <button
//                   className="px-6 py-1.5 bg-gray-100 text-gray-800 border rounded-md text-xs hover:bg-gray-200"
//                   onClick={onClose}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </div>

//             <div className="flex items-start gap-2 max-w-[520px]">
//               <div className="text-red-600 mt-0.5">
//                 <FontAwesomeIcon icon={faCircleExclamation} />
//               </div>
//               <div className="text-[11px] leading-snug">
//                 <div className="font-semibold text-red-700">Warning!</div>
//                 <div className="text-gray-700">
//                   Before running this routine, ensure that the transaction entries are correct.
//                   <span className="font-semibold"> Un-posting is not available.</span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Pagination */}
//           <div className="px-3 pb-3 flex justify-between items-center text-xs text-gray-600">
//             <div className="font-semibold">
//               Showing {startItem}-{endItem} of {totalItems} entries
//             </div>

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={handlePrevPage}
//                 disabled={currentPage === 1}
//                 className="px-3 py-1.5 font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <span className="px-2">Page {currentPage}</span>
//               <button
//                 onClick={handleNextPage}
//                 disabled={endItem >= totalItems}
//                 className="px-3 py-1.5 font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default GlobalGLPostingModalv1;



import { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faSort, faSortUp, faSortDown, faSpinner,
  faFilterCircleXmark, faMagnifyingGlass, faCircleExclamation,
  faEye, faEyeSlash, faListCheck
} from '@fortawesome/free-solid-svg-icons';
import { formatNumber } from '../Global/behavior';

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * GlobalGLPostingModalv1
 */
const GlobalGLPostingModalv1 = ({
  data,
  colConfigData,
  title,
  btnCaption,
  onClose,
  onPost,
  onViewDocument,
  remoteLoading = false,
}) => {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({});
  const [columnConfig, setColumnConfig] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [globalQuery, setGlobalQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userPassword, setUserPassword] = useState(null);

  const itemsPerPage = 50;
  const firstFocusableRef = useRef(null);

  // Sticky columns: View + Select + 4 data columns
  // index 0 = View, 1 = Select, 2–5 = first 4 visible data columns
  const STICKY_COUNT = 6;

  const selectHeaderRef = useRef(null);
  const viewHeaderRef = useRef(null);
  const columnHeaderRefs = useRef({});
  const [stickyLefts, setStickyLefts] = useState([]); // left offsets for sticky columns
  const [resizeTick, setResizeTick] = useState(0);

  // View column width (compressed)
  const ACTION_COL_W = 70; // px, narrower like before

  // focus first control, allow ESC to close
  useEffect(() => {
    firstFocusableRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Listen for window resize to recompute sticky positions
  useEffect(() => {
    const handleResize = () => setResizeTick(t => t + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // map incoming props -> local state
  useEffect(() => {
    setSelected([]);
    setSortConfig({ key: null, direction: null });
    setCurrentPage(1);
    setFilters({});
    setGlobalQuery('');

    setColumnConfig(Array.isArray(colConfigData) ? colConfigData : []);
    const rows = Array.isArray(data) ? data.map((row, i) => ({ ...row, __idx: i })) : [];
    setRecords(rows);
    setFiltered([]);
  }, [data, colConfigData]);

  const visibleCols = useMemo(
    () => columnConfig.filter((c) => !c.hidden),
    [columnConfig]
  );

  const renderValue = (column, value, decimal = 2) => {
    if (!value && value !== 0) return '';
    switch (column.renderType) {
      case 'number': {
        const digits = Number.isFinite(parseInt(decimal, 10)) ? parseInt(decimal, 10) : 2;
        return formatNumber(value, digits);
      }
      case 'date': {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const y = d.getFullYear();
        return `${m}/${day}/${y}`;
      }
      default:
        return value;
    }
  };

  // sorting helpers
  const coerceForSort = (val, type) => {
    if (val == null) return null;
    if (type === 'number') return Number(String(val).replace(/,/g, ''));
    if (type === 'date') {
      const t = new Date(val).getTime();
      return Number.isNaN(t) ? 0 : t;
    }
    return String(val).toLowerCase();
  };
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  const debouncedFilters = useDebouncedValue(filters, 200);
  const debouncedGlobal = useDebouncedValue(globalQuery, 250);

  useEffect(() => {
    let current = records.slice();

    // global search
    if (debouncedGlobal?.trim()) {
      const q = debouncedGlobal.trim().toLowerCase();
      const visibleKeys = visibleCols.map(c => c.key);
      current = current.filter(row =>
        visibleKeys.some(k => String(row[k] ?? '').toLowerCase().includes(q))
      );
    }

    // per-column filtering
    current = current.filter((item) =>
      Object.entries(debouncedFilters).every(([key, value]) => {
        if (!value) return true;
        const itemValue = String(item[key] ?? '').toLowerCase().replace(/,/g, '');
        const filterValue = String(value).toLowerCase().replace(/,/g, '');
        return itemValue.includes(filterValue);
      })
    );

    // sorting
    if (sortConfig?.key && sortConfig?.direction) {
      const col = columnConfig.find((c) => c.key === sortConfig.key);
      const type = col?.renderType || 'string';
      const dir = sortConfig.direction === 'asc' ? 1 : -1;

      current.sort((a, b) => {
        const av = coerceForSort(a[sortConfig.key], type);
        const bv = coerceForSort(b[sortConfig.key], type);
        return dir * cmp(av, bv);
      });
    } else {
      current.sort((a, b) => (a.__idx ?? 0) - (b.__idx ?? 0));
    }

    setFiltered(current);
  }, [records, debouncedFilters, sortConfig, columnConfig, debouncedGlobal, visibleCols]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters, debouncedGlobal]);

  // Compute sticky left offsets based on real DOM widths
  useLayoutEffect(() => {
    const lefts = [];
    let accumulated = 0;

    // View column (index 0)
    if (viewHeaderRef.current) {
      lefts[0] = 0;
      accumulated = viewHeaderRef.current.offsetWidth;
    }

    // Select column (index 1)
    if (selectHeaderRef.current) {
      lefts[1] = accumulated;
      accumulated += selectHeaderRef.current.offsetWidth;
    }

    // First 4 visible data columns (indexes 2–5 overall)
    visibleCols.forEach((col, idx) => {
      if (idx < STICKY_COUNT - 2) { // 4 data cols
        const overallIndex = idx + 2; // 2..5
        lefts[overallIndex] = accumulated;
        const hdr = columnHeaderRefs.current[col.key];
        if (hdr) {
          accumulated += hdr.offsetWidth;
        }
      }
    });

    setStickyLefts(lefts);
  }, [visibleCols, showFilters, resizeTick, filtered.length]);

  const handleFilterChange = (e, key) => {
    const v = e.target.value;
    setFilters((prev) => ({ ...prev, [key]: v }));
  };
  const clearAllFilters = () => setFilters({});

  const handleGetSelected = () => {
    const payload = selected.map((item) => item.groupId);
    onPost?.(payload, userPassword);
  };

  const handleSort = (key) => {
    setCurrentPage(1);
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return { key: null, direction: null };
    });
  };

  const renderSortIcon = (columnKey) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc'
        ? <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" />
        : <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />;
    }
    return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
  };

  const toggleSelect = (row) => {
    setSelected((prev) =>
      prev.some((s) => s.groupId === row.groupId)
        ? prev.filter((s) => s.groupId !== row.groupId)
        : [...prev, row]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered);
  };

  const handleNextPage = () => setCurrentPage((prev) => prev + 1);
  const handlePrevPage = () => setCurrentPage((prev) => prev - 1);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalItems = filtered.length;
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const activeFilterChips = Object.entries(filters).filter(([, v]) => v);

  const handleViewRow = (row) => {
    onViewDocument?.(row);
  };

  const isLoading = !!remoteLoading || (Array.isArray(data) && data.length === 0 && !!remoteLoading);

  const numberAlignClass = (col) =>
    col?.renderType === 'number' ? 'text-right tabular-nums' : '';

  const remarksCellClass = (col) => {
    const key = String(col?.key ?? '');
    const label = String(col?.label ?? '');
    const isRemarks = /remarks/i.test(key) || /remarks/i.test(label);
    return isRemarks ? 'max-w-[400px] truncate md:whitespace-nowrap' : '';
  };

  // Helper: meta for sticky columns
  // index 0 = View, 1 = Select, 2–5 = first 4 visible data cols
  const stickyMeta = (overallIndex) => {
    if (overallIndex < STICKY_COUNT) {
      const left = stickyLefts[overallIndex] ?? 0;
      return {
        sticky: true,
        left,
        maxWidth: overallIndex > 1 ? 200 : undefined, // only data sticky cols are capped
      };
    }
    return { sticky: false, left: 0, maxWidth: undefined };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1280px] max-h-[92vh] flex flex-col relative overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-blue-600 hover:text-blue-800 focus:outline-none p-2 rounded-full hover:bg-blue-50"
          aria-label="Close modal"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>

        {/* Header */}
        <div className="border-b border-gray-100 bg-white/95 sticky top-0 z-20">
          <div className="flex items-center gap-3 px-4 py-3">
            <h2 className="text-sm font-semibold text-blue-900 truncate">{title}</h2>
            <span className="ml-auto inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              <FontAwesomeIcon icon={faListCheck} />
              {selected.length} selected
            </span>
          </div>

          <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-2.5 text-gray-400 text-xs" />
              <input
                ref={firstFocusableRef}
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Global search…"
                className="pl-7 pr-3 py-2 text-xs border rounded-md w-72 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              onClick={() => setShowFilters((s) => !s)}
              className="text-xs px-3 py-2 rounded-md border hover:bg-gray-50"
            >
              {showFilters ? 'Hide filters' : 'Show filters'}
            </button>

            <button
              onClick={clearAllFilters}
              disabled={activeFilterChips.length === 0}
              className="text-xs px-3 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-40 inline-flex items-center gap-2"
              title="Clear all filters"
            >
              <FontAwesomeIcon icon={faFilterCircleXmark} />
              Clear filters
            </button>

            {/* Active filter chips */}
            <div className="flex flex-wrap gap-1">
              {activeFilterChips.map(([k, v]) => (
                <button
                  key={k}
                  className="text-[11px] px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
                  onClick={() => setFilters(prev => ({ ...prev, [k]: '' }))}
                  title={`Remove filter: ${k}`}
                >
                  {k}: <span className="font-medium">{String(v)}</span> ✕
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== Table area ===== */}
        <div className="flex-grow overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-3" />
              <span className="text-sm">Loading records…</span>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(92vh-220px)] custom-scrollbar overscroll-x-contain">
              {/* no table-fixed so widths can be natural */}
              <table className="min-w-full">
                {/* increased z-index so header is always on top */}
                <thead className="sticky top-0 z-[80]">
                  <tr className="bg-gray-100/90 backdrop-blur border-b border-gray-200 whitespace-nowrap text-[10px] sm:text[11px]">
                    {/* View header (sticky col index 0) */}
                    {(() => {
                      const m = stickyMeta(0);
                      const stickyStyle = {};
                      if (m.sticky) {
                        stickyStyle.left = m.left;
                        stickyStyle.width = ACTION_COL_W;
                        stickyStyle.minWidth = ACTION_COL_W;
                        stickyStyle.maxWidth = ACTION_COL_W;
                      }
                      return (
                        <th
                          ref={viewHeaderRef}
                          className="sticky bg-gray-100 z-[70] px-3 py-2 font-bold text-blue-900 text-center border-r border-gray-200"
                          style={stickyStyle}
                        >
                          View
                        </th>
                      );
                    })()}

                    {/* Select header (sticky col index 1) */}
                    {(() => {
                      const m = stickyMeta(1);
                      const stickyStyle = {};
                      if (m.sticky) {
                        stickyStyle.left = m.left;
                        // Narrow select col fixed width
                        stickyStyle.width = 50;
                        stickyStyle.minWidth = 50;
                        stickyStyle.maxWidth = 50;
                      }
                      return (
                        <th
                          ref={selectHeaderRef}
                          className="sticky bg-gray-100 z-[70] px-2 py-2 text-center font-bold text-blue-900"
                          style={stickyStyle}
                        >
                          Select
                        </th>
                      );
                    })()}

                    {/* Dynamic headers (start at sticky index 2) */}
                    {visibleCols.map((column, vIdx) => {
                      const overallIndex = vIdx + 2; // 2.. for data cols
                      const m = stickyMeta(overallIndex);
                      const stickyHeaderClasses = m.sticky
                        ? 'sticky bg-gray-100 z-[60]'
                        : '';
                      const stickyStyle = {};
                      if (m.sticky) {
                        stickyStyle.left = m.left;
                        if (m.maxWidth) {
                          stickyStyle.maxWidth = m.maxWidth; // cap at 200 for sticky data cols
                        }
                      }

                      return (
                        <th
                          key={column.key}
                          ref={el => {
                            if (overallIndex < STICKY_COUNT) {
                              columnHeaderRefs.current[column.key] = el;
                            }
                          }}
                          onClick={() => column.sortable && handleSort(column.key)}
                          className={[
                            'px-3 py-2 font-bold text-blue-900 select-none',
                            column.sortable ? 'cursor-pointer hover:bg-gray-200/50' : '',
                            numberAlignClass(column),
                            remarksCellClass(column),
                            stickyHeaderClasses,
                          ].join(' ')}
                          style={stickyStyle}
                        >
                          <span className="inline-flex items-center">
                            {column.label} {renderSortIcon(column.key)}
                          </span>
                        </th>
                      );
                    })}
                  </tr>

                  {/* Header filter row */}
                  {showFilters && (
                    <tr className="bg-white border-b border-gray-100 text-[10px] sm:text-[11px]">
                      {/* View filter cell (blank) */}
                      {(() => {
                        const m = stickyMeta(0);
                        const stickyStyle = {};
                        if (m.sticky) {
                          stickyStyle.left = m.left;
                          stickyStyle.width = ACTION_COL_W;
                          stickyStyle.minWidth = ACTION_COL_W;
                          stickyStyle.maxWidth = ACTION_COL_W;
                        }
                        return (
                          <td
                            className="sticky bg-white z-[70] px-2 py-1 border-r border-gray-100"
                            style={stickyStyle}
                          />
                        );
                      })()}

                      {/* Select filter cell (blank) */}
                      {(() => {
                        const m = stickyMeta(1);
                        const stickyStyle = {};
                        if (m.sticky) {
                          stickyStyle.left = m.left;
                          stickyStyle.width = 50;
                          stickyStyle.minWidth = 50;
                          stickyStyle.maxWidth = 50;
                        }
                        return (
                          <td
                            className="sticky bg-white z-[70] px-2 py-1"
                            style={stickyStyle}
                          />
                        );
                      })()}

                      {/* Dynamic filter inputs */}
                      {visibleCols.map((column, vIdx) => {
                        const overallIndex = vIdx + 2;
                        const m = stickyMeta(overallIndex);
                        const stickyFilterClasses = m.sticky
                          ? 'sticky bg-white z-[60]'
                          : '';
                        const stickyStyle = {};
                        if (m.sticky) {
                          stickyStyle.left = m.left;
                          if (m.maxWidth) {
                            stickyStyle.maxWidth = m.maxWidth;
                          }
                        }

                        return (
                          <td
                            key={column.key}
                            className={['px-2 py-1', stickyFilterClasses].join(' ')}
                            style={stickyStyle}
                          >
                            <input
                              type="text"
                              value={filters[column.key] || ''}
                              onChange={(e) => handleFilterChange(e, column.key)}
                              placeholder="Filter ..."
                              className="w-full border rounded px-2 py-1 text-[10px] sm:text-[11px] focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </thead>

                <tbody className="bg-white whitespace-nowrap">
                  {paginatedData.length > 0 ? (
                    paginatedData.map((row, rIdx) => {
                      const rowBgClass = rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                      return (
                        <tr
                          key={row.__idx ?? rIdx}
                          className={`text-[10px] sm:text-[11px] hover:bg-blue-50 ${rowBgClass}`}
                          onDoubleClick={() => handleViewRow(row)}
                        >
                          {/* View data cell (sticky index 0) */}
                          {(() => {
                            const m = stickyMeta(0);
                            const stickyStyle = {};
                            if (m.sticky) {
                              stickyStyle.left = m.left;
                              stickyStyle.width = ACTION_COL_W;
                              stickyStyle.minWidth = ACTION_COL_W;
                              stickyStyle.maxWidth = ACTION_COL_W;
                            }
                            return (
                              <td
                                className="sticky z-[30] px-2 py-[6px] text-center border-r border-gray-200 bg-white"
                                style={stickyStyle}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleViewRow(row); }}
                                  className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                                  title="View document"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                </button>
                              </td>
                            );
                          })()}

                          {/* Select data cell (sticky index 1) */}
                          {(() => {
                            const m = stickyMeta(1);
                            const stickyStyle = {};
                            if (m.sticky) {
                              stickyStyle.left = m.left;
                              stickyStyle.width = 50;
                              stickyStyle.minWidth = 50;
                              stickyStyle.maxWidth = 50;
                            }
                            return (
                              <td
                                className="sticky z-[30] text-center bg-white"
                                style={stickyStyle}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected.some((s) => s.groupId === row.groupId)}
                                  onChange={() => toggleSelect(row)}
                                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                              </td>
                            );
                          })()}

                          {/* Dynamic data cells (start at sticky index 2) */}
                          {visibleCols.map((column, vIdx) => {
                            const overallIndex = vIdx + 2;
                            const m = stickyMeta(overallIndex);
                            const stickyBodyClasses = m.sticky
                              ? 'sticky z-[20] bg-white'
                              : '';
                            const stickyStyle = {};
                            if (m.sticky) {
                              stickyStyle.left = m.left;
                              if (m.maxWidth) {
                                stickyStyle.maxWidth = m.maxWidth; // cap at 200 for sticky data cols
                              }
                            }

                            const isRemarksKey = /remarks/i.test(String(column?.key ?? ''));

                            return (
                              <td
                                key={column.key}
                                className={[
                                  'px-3 py-[6px]',
                                  numberAlignClass(column),
                                  remarksCellClass(column),
                                  stickyBodyClasses,
                                ].join(' ')}
                                style={stickyStyle}
                                title={isRemarksKey ? String(row[column.key] ?? '') : undefined}
                              >
                                {renderValue(column, row[column.key], Number(column.roundingOff))}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={visibleCols.length + 2} className="px-4 py-10 text-center">
                        <div className="inline-flex items-center gap-3 text-gray-500">
                          <FontAwesomeIcon icon={faCircleExclamation} />
                          <span className="text-sm">No matching records found.</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="border-t border-gray-200 bg-white sticky bottom-0 z-10">
          <div className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                Select all (filtered)
              </label>

              <div className="flex items-center gap-2">
                <label className="font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={userPassword ?? ''}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-44 pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title={showPassword ? 'Hide' : 'Show'}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>

                <button
                  disabled={selected.length === 0}
                  className="px-6 py-1.5 bg-blue-600 text-white rounded-md text-xs disabled:opacity-50 hover:bg-blue-700 transition"
                  onClick={handleGetSelected}
                >
                  {btnCaption} {selected.length ? `(${selected.length})` : ''}
                </button>

                <button
                  className="px-6 py-1.5 bg-gray-100 text-gray-800 border rounded-md text-xs hover:bg-gray-200"
                  onClick={onClose}
                >
                  Cancel
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 max-w-[520px]">
              <div className="text-red-600 mt-0.5">
                <FontAwesomeIcon icon={faCircleExclamation} />
              </div>
              <div className="text-[11px] leading-snug">
                <div className="font-semibold text-red-700">Warning!</div>
                <div className="text-gray-700">
                  Before running this routine, ensure that the transaction entries are correct.
                  <span className="font-semibold"> Un-posting is not available.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="px-3 pb-3 flex justify-between items-center text-xs text-gray-600">
            <div className="font-semibold">
              Showing {startItem}-{endItem} of {totalItems} entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="px-3 py-1.5 font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-2">Page {currentPage}</span>
              <button
                onClick={handleNextPage}
                disabled={endItem >= totalItems}
                className="px-3 py-1.5 font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalGLPostingModalv1;
