

// import { useEffect, useRef, useState, useCallback } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faMagnifyingGlass,
//   faXmark,
//   faAnglesLeft,
//   faArrowLeft,
//   faArrowRight,
//   faAnglesRight,
//   faChevronUp,
// } from "@fortawesome/free-solid-svg-icons";
// import { useIsTranExist } from "@/NAYSA Cloud/Global/procedure";
// import Swal from "sweetalert2";

// const AllTranDocNo = ({
//   isOpen,
//   onClose,
//   source,
//   params,
//   docNo,
//   onRetrieve,
//   onResponse,
//   onSelected,
// }) => {
//   const [mode, setMode] = useState("retrieve"); // "retrieve" | "use"
//   const docRef = useRef(null);
//   const [docNoValue, setDocNoValue] = useState(docNo ?? "");
//   const [collapsed, setCollapsed] = useState(false);

//   // ── Drag logic ────────────────────────────────────────────────────────────────
//   const modalRef = useRef(null);
//   const [position, setPosition] = useState({
//     x: typeof window !== "undefined" ? window.innerWidth / 2 - 260 : 100,
//     y: typeof window !== "undefined" ? window.innerHeight / 2 - 200 : 100,
//   });
//   const [isDragging, setIsDragging] = useState(false);
//   const [offset, setOffset] = useState({ x: 0, y: 0 });

//   const startDrag = useCallback((e) => {
//     e.preventDefault();
//     if (!modalRef.current) return;
//     const r = modalRef.current.getBoundingClientRect();
//     setIsDragging(true);
//     setOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
//   }, []);

//   const stopDrag = useCallback(() => setIsDragging(false), []);

//   const handleDrag = useCallback(
//     (e) => {
//       if (!isDragging) return;
//       const newX = e.clientX - offset.x;
//       const newY = e.clientY - offset.y;
//       const maxX = (typeof window !== "undefined" ? window.innerWidth : 1080) - 540;
//       const maxY = (typeof window !== "undefined" ? window.innerHeight : 720) - 200;
//       setPosition({
//         x: Math.max(10, Math.min(newX, maxX)),
//         y: Math.max(10, Math.min(newY, maxY)),
//       });
//     },
//     [isDragging, offset]
//   );

//   useEffect(() => {
//     // Attach global mouse listeners when dragging
//     window.addEventListener("mousemove", handleDrag);
//     window.addEventListener("mouseup", stopDrag);
//     return () => {
//       window.removeEventListener("mousemove", handleDrag);
//       window.removeEventListener("mouseup", stopDrag);
//     };
//   }, [handleDrag, stopDrag]);

//   // ── Prop → state initial sync ────────────────────────────────────────────────
//   useEffect(() => {
//     if (!isOpen) return;
//     setMode("retrieve"); // reset mode each open (optional)
//     setCollapsed(false);
//     setDocNoValue(docNo ?? "");
//     // focus after open
//     setTimeout(() => docRef.current?.focus(), 50);
//   }, [isOpen, docNo]);

//   // Only update from onResponse if not actively editing and value actually differs
//   useEffect(() => {
//     const incoming = onResponse?.documentNo;
//     if (incoming == null) return;
//     const activeOnInput = document.activeElement === docRef.current;
//     if (!activeOnInput && incoming !== docNoValue) {
//       setDocNoValue(incoming ?? "");
//     }
//   }, [onResponse, docNoValue]);

//   // Helper to get the freshest value (ref first, then state)
//   const getCurrentDocNo = useCallback(() => {
//     return (docRef.current?.value ?? docNoValue ?? "").trim();
//   }, [docNoValue]);

//   // ── Actions ─────────────────────────────────────────────────────────────────
//   const RetrieveDocument = useCallback(
//     (modalClose, key) => {
//       if (mode !== "retrieve") return;
//       const current = getCurrentDocNo();
//       onRetrieve?.({ docNo: current, key, modalClose });
//     },
//     [mode, getCurrentDocNo, onRetrieve]
//   );

//   const SelectDocument = useCallback(async () => {
//     if (mode !== "use") return;
//     const current = getCurrentDocNo();

//     // Optional: basic guard
//     if (!current) {
//       await Swal.fire({
//         icon: "warning",
//         title: "No Document No.",
//         text: "Please enter a document number first.",
//         timer: 1600,
//         showConfirmButton: false,
//       });
//       return;
//     }

//     const response = await useIsTranExist(
//       current,
//       params?.branchCode,
//       params?.docType,
//       params?.fieldNo
//     );

//     if (response == 1) {
//       await Swal.fire({
//         icon: "info",
//         title: "Document Conflict",
//         text: "This document has already been processed and cannot be selected again.",
//         timer: 2000,
//         showConfirmButton: false,
//       });
//       // Stay in 'use' mode; do not auto-retrieve unless that’s your intended UX
//       return;
//     }

//     onSelected?.({ docNo: current, branchCode: params?.branchCode });
//   }, [mode, getCurrentDocNo, onSelected, params, useIsTranExist]);

//   // ── Keyboard shortcuts ──────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!isOpen) return;

//     const onKey = async (e) => {
//       if (e.key === "Escape") {
//         e.preventDefault();
//         onClose?.();
//       }
//       if (e.key === "F6") {
//         e.preventDefault();
//         setMode("retrieve");
//       }
//       if (e.key === "F7") {
//         e.preventDefault();
//         setMode("use");
//       }
//       if (e.key === "F8") {
//         e.preventDefault();
//         setCollapsed((c) => !c);
//       }
//       if (
//         e.key === "F5" ||
//         (e.key === "Enter" && document.activeElement === docRef.current)
//       ) {
//         e.preventDefault();
//         if (mode === "retrieve") {
//           RetrieveDocument(false, "");
//         } else {
//           SelectDocument();
//         }
//       }
//     };

//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [isOpen, mode, onClose, RetrieveDocument, SelectDocument]);

//   // ── Render ──────────────────────────────────────────────────────────────────
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[100] font-sans">
//       {/* Backdrop */}
//       <div className="absolute inset-0 bg-black/50" onClick={onClose} />

//       {/* Modal */}
//       <div
//         ref={modalRef}
//         className="absolute w-[520px] max-w-[92vw] rounded-xl shadow-2xl bg-white text-slate-800 border border-[#1f4b68]/30 select-none"
//         style={{ left: `${position.x}px`, top: `${position.y}px` }}
//       >
//         {/* Header */}
//         <div
//           className="flex items-center justify-between px-4 py-2 bg-[#2c6c95] text-white rounded-t-xl cursor-move"
//           onMouseDown={startDrag}
//         >
//           <div className="text-sm font-semibold">
//             {params?.documentTitle ?? "Document Lookup"}
//           </div>
//           <div className="flex items-center gap-1">
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setCollapsed((c) => !c);
//                 setMode("retrieve")
//               }}
//               className="p-1.5 rounded hover:bg-white/10"
//               title="Collapse (F8)"
//             >
//               <FontAwesomeIcon icon={faChevronUp} />
//             </button>
//             <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10">
//               <FontAwesomeIcon icon={faXmark} />
//             </button>
//           </div>
//         </div>

//         {/* Navigation (always visible) */}
//        {mode === "retrieve" && (
//           <div
//             className={`px-6 py-4 flex justify-center ${
//               collapsed ? "rounded-t-xl bg-[#f3f7fa]" : ""
//             }`}
//             onMouseDown={collapsed ? startDrag : undefined}
//           >
//             <div className="flex justify-center gap-2">
//               {[
//                 { icon: faAnglesLeft, label: "First", key: "F" },
//                 { icon: faArrowLeft, label: "Previous", key: "P" },
//                 { icon: faArrowRight, label: "Next", key: "N" },
//                 { icon: faAnglesRight, label: "Last", key: "L" },
//               ].map((btn) => (
//                 <button
//                   key={btn.key}
//                   className="px-3 py-2 text-xs font-semibold rounded-md bg-[#eaf2f7] text-[#1f4b68] hover:bg-white shadow-sm flex items-center"
//                   onClick={() => RetrieveDocument(true, btn.key)}
//                 >
//                   <FontAwesomeIcon icon={btn.icon} className="mr-1" />
//                   {btn.label}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}
//         {/* Body */}
//         {!collapsed && (
//           <div className="px-6 pb-5 pt-2">
//             {/* Branch */}
//             <div className="mb-4">
//               <label className="text-xs text-slate-600 mb-1 block">Branch</label>
//               <div className="flex items-center rounded-md h-12 px-3 bg-slate-100 border border-slate-200 shadow-sm cursor-not-allowed">
//                 <span className="flex-1 text-2xl font-bold text-[#1f4b68]">
//                   {params?.branchName ?? ""}
//                 </span>
//                 <FontAwesomeIcon
//                   icon={faMagnifyingGlass}
//                   className="ml-3 opacity-0 pointer-events-none"
//                 />
//               </div>
//             </div>

//             {/* Document No */}
//             <div className="mb-6">
//               <label className="text-xs text-slate-600 mb-1 block">
//                 Document No.
//               </label>
//               <input
//                 ref={docRef}
//                 value={docNoValue}
//                 onChange={(e) => setDocNoValue(e.target.value)}
//                 className="peer global-tran-textbox-ui !h-16 !py-4 text-3xl font-bold tracking-[0.25em] text-center text-[#1f4b68] bg-white border border-slate-200 shadow-inner focus:ring-2 focus:ring-[#2c6c95]/60"
//                 placeholder="00000000"
//               />
//             </div>

//             {/* Primary Button */}
//             <div className="flex justify-center">
//               <button
//                 onClick={() => {
//                   if (mode === "retrieve") {
//                     RetrieveDocument(false, "");
//                   } else {
//                     SelectDocument();
//                   }
//                 }}
//                 className={`px-6 py-2.5 rounded-md font-semibold text-sm shadow-md transition ${
//                   mode === "retrieve"
//                     ? "bg-[#eaf2f7] text-[#1f4b68] hover:bg-white"
//                     : "bg-[#d1e4f2] text-[#1f4b68] hover:bg-white"
//                 }`}
//               >
//                 {mode === "retrieve"
//                   ? "Find and Retrieve (F5)"
//                   : "Apply Document No (F5)"}
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Footer Tabs */}
//         {!collapsed && (
//           <div className="flex items-center justify-between px-4 py-2 bg-[#eaf2f7] border-t border-slate-200 rounded-b-xl text-[#1f4b68] font-semibold text-xs">
//             <button
//               onClick={() => setMode("retrieve")}
//               className={`px-3 py-1 rounded-md transition ${
//                 mode === "retrieve"
//                   ? "bg-[#2c6c95] text-white shadow-sm"
//                   : "hover:bg-[#d6e5ef]"
//               }`}
//             >
//               Retrieve Selected Document (F6)
//             </button>
//             <button
//               onClick={() => setMode("use")}
//               className={`px-3 py-1 rounded-md transition ${
//                 mode === "use"
//                   ? "bg-[#2c6c95] text-white shadow-sm"
//                   : "hover:bg-[#d6e5ef]"
//               }`}
//             >
//               Use Selected Document (F7)
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AllTranDocNo;











// import { useEffect, useRef, useState, useCallback } from "react";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faMagnifyingGlass,
//   faXmark,
//   faAnglesLeft,
//   faArrowLeft,
//   faArrowRight,
//   faAnglesRight,
//   faChevronUp,
// } from "@fortawesome/free-solid-svg-icons";
// import { useIsTranExist } from "@/NAYSA Cloud/Global/procedure";
// import Swal from "sweetalert2";

// const MARGIN = 10; // viewport margin to keep modal from touching edges

// const AllTranDocNo = ({
//   isOpen,
//   onClose,
//   source,
//   params,
//   docNo,
//   onRetrieve,
//   onResponse,
//   onSelected,
// }) => {
//   const [mode, setMode] = useState("retrieve"); // "retrieve" | "use"
//   const docRef = useRef(null);
//   const [docNoValue, setDocNoValue] = useState(docNo ?? "");
//   const [collapsed, setCollapsed] = useState(false);

//   // ── Viewport tracking (for responsive width & bounds) ────────────────────────
//   const [vw, setVw] = useState(
//     typeof window !== "undefined" ? window.innerWidth : 1080
//   );
//   const [vh, setVh] = useState(
//     typeof window !== "undefined" ? window.innerHeight : 720
//   );

//   useEffect(() => {
//     const onResize = () => {
//       setVw(window.innerWidth);
//       setVh(window.innerHeight);
//       // After updating vw/vh, also clamp the modal position to the new bounds
//       clampPositionToViewport();
//     };
//     window.addEventListener("resize", onResize);
//     return () => window.removeEventListener("resize", onResize);
//   }, []);

//   // Compute responsive modal width (height is auto)
//   const modalWidth = Math.min(520, vw - MARGIN * 2);

//   // ── Drag logic ───────────────────────────────────────────────────────────────
//   const modalRef = useRef(null);
//   const [position, setPosition] = useState({
//     x: vw / 2 - 260,
//     y: vh / 2 - 200,
//   });
//   const [isDragging, setIsDragging] = useState(false);
//   const [offset, setOffset] = useState({ x: 0, y: 0 });

//   const getModalRect = () => {
//     // Safe rect with fallback when ref not yet measured
//     const rect = modalRef.current?.getBoundingClientRect();
//     return rect || { width: modalWidth, height: 300, left: position.x, top: position.y };
//   };

//   const getBounds = () => {
//     const rect = getModalRect();
//     const maxX = Math.max(MARGIN, vw - rect.width - MARGIN);
//     const maxY = Math.max(MARGIN, vh - rect.height - MARGIN);
//     return { minX: MARGIN, minY: MARGIN, maxX, maxY };
//   };

//   const clampPosition = (x, y) => {
//     const { minX, minY, maxX, maxY } = getBounds();
//     return {
//       x: Math.max(minX, Math.min(x, maxX)),
//       y: Math.max(minY, Math.min(y, maxY)),
//     };
//   };

//   const clampPositionToViewport = () => {
//     setPosition((p) => {
//       const clamped = clampPosition(p.x, p.y);
//       return clamped;
//     });
//   };

//   const startDrag = useCallback((e) => {
//     e.preventDefault();
//     if (!modalRef.current) return;
//     const r = modalRef.current.getBoundingClientRect();
//     setIsDragging(true);
//     setOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
//   }, []);

//   const stopDrag = useCallback(() => setIsDragging(false), []);

//   const handleDrag = useCallback(
//     (e) => {
//       if (!isDragging) return;
//       const nextX = e.clientX - offset.x;
//       const nextY = e.clientY - offset.y;
//       setPosition(clampPosition(nextX, nextY));
//     },
//     [isDragging, offset]
//   );

//   useEffect(() => {
//     window.addEventListener("mousemove", handleDrag);
//     window.addEventListener("mouseup", stopDrag);
//     return () => {
//       window.removeEventListener("mousemove", handleDrag);
//       window.removeEventListener("mouseup", stopDrag);
//     };
//   }, [handleDrag, stopDrag]);

//   // ── Prop → state initial sync ────────────────────────────────────────────────
//   useEffect(() => {
//     if (!isOpen) return;
//     setMode("retrieve");
//     setCollapsed(false);
//     setDocNoValue(docNo ?? "");

//     // Center on open using current modal width & viewport
//     const centered = {
//       x: Math.round((vw - modalWidth) / 2),
//       y: Math.round((vh - 400) / 2), // rough guess; will be clamped anyway
//     };
//     setPosition(clampPosition(centered.x, centered.y));

//     setTimeout(() => docRef.current?.focus(), 50);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isOpen, docNo, vw, vh, modalWidth]);

//   // Only update from onResponse if not actively editing and value actually differs
//   useEffect(() => {
//     const incoming = onResponse?.documentNo;
//     if (incoming == null) return;
//     const activeOnInput = document.activeElement === docRef.current;
//     if (!activeOnInput && incoming !== docNoValue) {
//       setDocNoValue(incoming ?? "");
//     }
//   }, [onResponse, docNoValue]);

//   // Helper to get the freshest value (ref first, then state)
//   const getCurrentDocNo = useCallback(() => {
//     return (docRef.current?.value ?? docNoValue ?? "").trim();
//   }, [docNoValue]);

//   // ── Actions ─────────────────────────────────────────────────────────────────
//   const RetrieveDocument = useCallback(
//     (modalClose, key) => {
//       if (mode !== "retrieve") return;
//       const current = getCurrentDocNo();
//       onRetrieve?.({ docNo: current, key, modalClose });
//     },
//     [mode, getCurrentDocNo, onRetrieve]
//   );

//   const SelectDocument = useCallback(async () => {
//     if (mode !== "use") return;
//     const current = getCurrentDocNo();

//     if (!current) {
//       await Swal.fire({
//         icon: "warning",
//         title: "No Document No.",
//         text: "Please enter a document number first.",
//         timer: 1600,
//         showConfirmButton: false,
//       });
//       return;
//     }

//     const response = await useIsTranExist(
//       current,
//       params?.branchCode,
//       params?.docType,
//       params?.fieldNo
//     );

//     if (response == 1) {
//       await Swal.fire({
//         icon: "info",
//         title: "Document Conflict",
//         text: "This document has already been processed and cannot be selected again.",
//         timer: 2000,
//         showConfirmButton: false,
//       });
//       return;
//     }

//     onSelected?.({ docNo: current, branchCode: params?.branchCode });
//   }, [mode, getCurrentDocNo, onSelected, params, useIsTranExist]);

//   // ── Keyboard shortcuts ──────────────────────────────────────────────────────
//   useEffect(() => {
//     if (!isOpen) return;

//     const onKey = async (e) => {
//       if (e.key === "Escape") {
//         e.preventDefault();
//         onClose?.();
//       }
//       if (e.key === "F6") {
//         e.preventDefault();
//         setMode("retrieve");
//       }
//       if (e.key === "F7") {
//         e.preventDefault();
//         setMode("use");
//       }
//       if (e.key === "F8") {
//         e.preventDefault();
//         setCollapsed((c) => !c);
//       }
//       if (
//         e.key === "F5" ||
//         (e.key === "Enter" && document.activeElement === docRef.current)
//       ) {
//         e.preventDefault();
//         if (mode === "retrieve") {
//           RetrieveDocument(false, "");
//         } else {
//           SelectDocument();
//         }
//       }
//     };

//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [isOpen, mode, onClose, RetrieveDocument, SelectDocument]);

//   // ── Render ──────────────────────────────────────────────────────────────────
//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-[100] font-sans">
//       {/* Backdrop */}
//       <div className="absolute inset-0 bg-black/50" onClick={onClose} />

//       {/* Modal */}
//       <div
//         ref={modalRef}
//         className="absolute max-w-[92vw] rounded-xl shadow-2xl bg-white text-slate-800 border border-[#1f4b68]/30 select-none"
//         style={{
//           width: modalWidth,
//           left: `${position.x}px`,
//           top: `${position.y}px`,
//         }}
//       >
//         {/* Header */}
//         <div
//           className="flex items-center justify-between px-4 py-2 bg-[#2c6c95] text-white rounded-t-xl cursor-move"
//           onMouseDown={startDrag}
//         >
//           <div className="text-sm font-semibold">
//             {params?.documentTitle ?? "Document Lookup"}
//           </div>
//           <div className="flex items-center gap-1">
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setCollapsed((c) => !c);
//                 setMode("retrieve");
//               }}
//               className="p-1.5 rounded hover:bg-white/10"
//               title="Collapse (F8)"
//             >
//               <FontAwesomeIcon icon={faChevronUp} />
//             </button>
//             <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10">
//               <FontAwesomeIcon icon={faXmark} />
//             </button>
//           </div>
//         </div>

//         {/* Navigation Buttons - Visible only in Retrieve mode */}
//         {mode === "retrieve" && (
//           <div
//             className={`px-4 sm:px-6 py-3 sm:py-4 flex justify-center ${
//               collapsed ? "rounded-t-xl bg-[#f3f7fa]" : ""
//             }`}
//             onMouseDown={collapsed ? startDrag : undefined}
//           >
//             <div className="flex flex-wrap justify-center gap-2">
//               {[
//                 { icon: faAnglesLeft, label: "First", key: "F" },
//                 { icon: faArrowLeft, label: "Previous", key: "P" },
//                 { icon: faArrowRight, label: "Next", key: "N" },
//                 { icon: faAnglesRight, label: "Last", key: "L" },
//               ].map((btn) => (
//                 <button
//                   key={btn.key}
//                   className="px-3 py-2 text-xs font-semibold rounded-md bg-[#eaf2f7] text-[#1f4b68] hover:bg-white shadow-sm flex items-center"
//                   onClick={() => RetrieveDocument(true, btn.key)}
//                 >
//                   <FontAwesomeIcon icon={btn.icon} className="mr-1" />
//                   {btn.label}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* Body */}
//         {!collapsed && (
//           <div className="px-4 sm:px-6 pb-5 pt-2">
//             {/* Branch */}
//             <div className="mb-4">
//               <label className="text-xs text-slate-600 mb-1 block">Branch</label>
//               <div className="flex items-center rounded-md h-12 px-3 bg-slate-100 border border-slate-200 shadow-sm cursor-not-allowed">
//                 <span className="flex-1 text-2xl sm:text-3xl font-bold text-[#1f4b68]">
//                   {params?.branchName ?? ""}
//                 </span>
//                 <FontAwesomeIcon
//                   icon={faMagnifyingGlass}
//                   className="ml-3 opacity-0 pointer-events-none"
//                 />
//               </div>
//             </div>

//             {/* Document No */}
//             <div className="mb-6">
//               <label className="text-xs text-slate-600 mb-1 block">
//                 Document No.
//               </label>
//               <input
//                 ref={docRef}
//                 value={docNoValue}
//                 onChange={(e) => setDocNoValue(e.target.value)}
//                 className="peer global-tran-textbox-ui !h-16 !py-4 text-2xl sm:text-3xl font-bold tracking-[0.25em] text-center text-[#1f4b68] bg-white border border-slate-200 shadow-inner focus:ring-2 focus:ring-[#2c6c95]/60 w-full"
//                 placeholder="00000000"
//               />
//             </div>

//             {/* Primary Button */}
//             <div className="flex justify-center">
//               <button
//                 onClick={() => {
//                   if (mode === "retrieve") {
//                     RetrieveDocument(false, "");
//                   } else {
//                     SelectDocument();
//                   }
//                 }}
//                 className={`px-6 py-2.5 rounded-md font-semibold text-sm shadow-md transition ${
//                   mode === "retrieve"
//                     ? "bg-[#eaf2f7] text-[#1f4b68] hover:bg-white"
//                     : "bg-[#d1e4f2] text-[#1f4b68] hover:bg-white"
//                 }`}
//               >
//                 {mode === "retrieve"
//                   ? "Find and Retrieve (F5)"
//                   : "Apply Document No (F5)"}
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Footer Tabs */}
//         {!collapsed && (
//           <div className="flex items-center justify-between px-4 py-2 bg-[#eaf2f7] border-t border-slate-200 rounded-b-xl text-[#1f4b68] font-semibold text-xs">
//             <button
//               onClick={() => setMode("retrieve")}
//               className={`px-3 py-1 rounded-md transition ${
//                 mode === "retrieve"
//                   ? "bg-[#2c6c95] text-white shadow-sm"
//                   : "hover:bg-[#d6e5ef]"
//               }`}
//             >
//               Retrieve Selected Document (F6)
//             </button>
//             <button
//               onClick={() => setMode("use")}
//               className={`px-3 py-1 rounded-md transition ${
//                 mode === "use"
//                   ? "bg-[#2c6c95] text-white shadow-sm"
//                   : "hover:bg-[#d6e5ef]"
//               }`}
//             >
//               Use Selected Document (F7)
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default AllTranDocNo;






import { useEffect, useRef, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faXmark,
  faAnglesLeft,
  faArrowLeft,
  faArrowRight,
  faAnglesRight,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { useIsTranExist } from "@/NAYSA Cloud/Global/procedure";
import Swal from "sweetalert2";

const MARGIN = 10; // viewport margin to keep modal from touching edges

const AllTranDocNo = ({
  isOpen,
  onClose,
  source,
  params,
  docNo,
  onRetrieve,
  onResponse,
  onSelected,
}) => {
  const [mode, setMode] = useState("retrieve"); // "retrieve" | "use"
  const docRef = useRef(null);
  const [docNoValue, setDocNoValue] = useState(docNo ?? "");
  const [collapsed, setCollapsed] = useState(false);

  // ── Viewport tracking (for responsive width & bounds) ────────────────────────
  const [vw, setVw] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1080
  );
  const [vh, setVh] = useState(
    typeof window !== "undefined" ? window.innerHeight : 720
  );

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      // After updating vw/vh, also clamp the modal position to the new bounds
      clampPositionToViewport();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Compute responsive modal width (height is auto)
  const modalWidth = Math.min(520, vw - MARGIN * 2);

  // ── Drag logic ───────────────────────────────────────────────────────────────
  const modalRef = useRef(null);
  const [position, setPosition] = useState({
    x: vw / 2 - 260,
    y: vh / 2 - 200,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const getModalRect = () => {
    // Safe rect with fallback when ref not yet measured
    const rect = modalRef.current?.getBoundingClientRect();
    return rect || { width: modalWidth, height: 300, left: position.x, top: position.y };
  };

  const getBounds = () => {
    const rect = getModalRect();
    const maxX = Math.max(MARGIN, vw - rect.width - MARGIN);
    const maxY = Math.max(MARGIN, vh - rect.height - MARGIN);
    return { minX: MARGIN, minY: MARGIN, maxX, maxY };
  };

  const clampPosition = (x, y) => {
    const { minX, minY, maxX, maxY } = getBounds();
    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    };
  };

  const clampPositionToViewport = () => {
    setPosition((p) => {
      const clamped = clampPosition(p.x, p.y);
      return clamped;
    });
  };

  const startDrag = useCallback((e) => {
    e.preventDefault();
    if (!modalRef.current) return;
    const r = modalRef.current.getBoundingClientRect();
    setIsDragging(true);
    setOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
  }, []);

  const stopDrag = useCallback(() => setIsDragging(false), []);

  const handleDrag = useCallback(
    (e) => {
      if (!isDragging) return;
      const nextX = e.clientX - offset.x;
      const nextY = e.clientY - offset.y;
      setPosition(clampPosition(nextX, nextY));
    },
    [isDragging, offset]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [handleDrag, stopDrag]);

  // ── Prop → state initial sync ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setMode("retrieve");
    setCollapsed(false);
    setDocNoValue(docNo ?? "");

    // Center on open using current modal width & viewport
    const centered = {
      x: Math.round((vw - modalWidth) / 2),
      y: Math.round((vh - 400) / 2), // rough guess; will be clamped anyway
    };
    setPosition(clampPosition(centered.x, centered.y));

    setTimeout(() => docRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, docNo, vw, vh, modalWidth]);

  // Only update from onResponse if not actively editing and value actually differs
  useEffect(() => {
    const incoming = onResponse?.documentNo;
    if (incoming == null) return;
    const activeOnInput = document.activeElement === docRef.current;
    if (!activeOnInput && incoming !== docNoValue) {
      setDocNoValue(incoming ?? "");
    }
  }, [onResponse, docNoValue]);

  // Helper to get the freshest value (ref first, then state)
  const getCurrentDocNo = useCallback(() => {
    return (docRef.current?.value ?? docNoValue ?? "").trim();
  }, [docNoValue]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const RetrieveDocument = useCallback(
    (modalClose, key) => {
      if (mode !== "retrieve") return;
      const current = getCurrentDocNo();
      onRetrieve?.({ docNo: current, key, modalClose });
    },
    [mode, getCurrentDocNo, onRetrieve]
  );

  const SelectDocument = useCallback(async () => {
    if (mode !== "use") return;
    const current = getCurrentDocNo();

    if (!current) {
      await Swal.fire({
        icon: "warning",
        title: "No Document No.",
        text: "Please enter a document number first.",
        timer: 1600,
        showConfirmButton: false,
      });
      return;
    }

    const response = await useIsTranExist(
      current,
      params?.branchCode,
      params?.docType,
      params?.fieldNo
    );

    if (response == 1) {
      await Swal.fire({
        icon: "info",
        title: "Document Conflict",
        text: "This document has already been processed and cannot be selected again.",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }

    onSelected?.({ docNo: current, branchCode: params?.branchCode });
  }, [mode, getCurrentDocNo, onSelected, params, useIsTranExist]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const onKey = async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
      if (e.key === "F6") {
        e.preventDefault();
        setMode("retrieve");
      }
      if (e.key === "F7") {
        e.preventDefault();
        setMode("use");
      }
      if (e.key === "F8") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
      if (
        e.key === "F5" ||
        (e.key === "Enter" && document.activeElement === docRef.current)
      ) {
        e.preventDefault();
        if (mode === "retrieve") {
          RetrieveDocument(false, "");
        } else {
          SelectDocument();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, mode, onClose, RetrieveDocument, SelectDocument]);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        className="absolute max-w-[92vw] rounded-xl shadow-2xl bg-white text-slate-800 border border-[#1f4b68]/30 select-none"
        style={{
          width: modalWidth,
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2 bg-[#2c6c95] text-white rounded-t-xl cursor-move"
          onMouseDown={startDrag}
        >
          <div className="text-sm font-semibold">
            {params?.documentTitle ?? "Document Lookup"}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed((c) => !c);
                setMode("retrieve");
              }}
              className="p-1.5 rounded hover:bg-white/10"
              title="Collapse (F8)"
            >
              <FontAwesomeIcon icon={faChevronUp} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Navigation Buttons - Visible only in Retrieve mode */}
        {mode === "retrieve" && (
          <div
            className={`px-4 sm:px-6 py-3 sm:py-4 flex justify-center ${
              collapsed ? "rounded-t-xl bg-[#f3f7fa]" : ""
            }`}
            onMouseDown={collapsed ? startDrag : undefined}
          >
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { icon: faAnglesLeft, label: "First", key: "F" },
                { icon: faArrowLeft, label: "Previous", key: "P" },
                { icon: faArrowRight, label: "Next", key: "N" },
                { icon: faAnglesRight, label: "Last", key: "L" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  className="px-3 py-2 text-xs font-semibold rounded-md bg-[#eaf2f7] text-[#1f4b68] hover:bg-white shadow-sm flex items-center"
                  onClick={() => RetrieveDocument(true, btn.key)}
                >
                  <FontAwesomeIcon icon={btn.icon} className="mr-1" />
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        {!collapsed && (
          <div className="px-4 sm:px-6 pb-5 pt-2">
            {/* Branch */}
            <div className="mb-4">
              <label className="text-xs text-slate-600 mb-1 block">Branch</label>
              <div className="flex items-center rounded-md h-12 px-3 bg-slate-100 border border-slate-200 shadow-sm cursor-not-allowed">
                <span className="flex-1 text-2xl sm:text-3xl font-bold text-[#1f4b68]">
                  {params?.branchName ?? ""}
                </span>
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="ml-3 opacity-0 pointer-events-none"
                />
              </div>
            </div>

            {/* Document No */}
            <div className="mb-6">
              <label className="text-xs text-slate-600 mb-1 block">
                Document No.
              </label>
              <input
                ref={docRef}
                value={docNoValue}
                onChange={(e) => setDocNoValue(e.target.value)}
                className="peer global-tran-textbox-ui !h-16 !py-4 text-2xl sm:text-3xl font-bold tracking-[0.25em] text-center text-[#1f4b68] bg-white border border-slate-200 shadow-inner focus:ring-2 focus:ring-[#2c6c95]/60 w-full"
                placeholder="00000000"
              />
            </div>

            {/* Primary Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (mode === "retrieve") {
                    RetrieveDocument(false, "");
                  } else {
                    SelectDocument();
                  }
                }}
                className={`px-6 py-2.5 rounded-md font-semibold text-sm shadow-md transition ${
                  mode === "retrieve"
                    ? "bg-[#eaf2f7] text-[#1f4b68] hover:bg-white"
                    : "bg-[#d1e4f2] text-[#1f4b68] hover:bg-white"
                }`}
              >
                {mode === "retrieve"
                  ? "Find and Retrieve (F5)"
                  : "Apply Document No (F5)"}
              </button>
            </div>
          </div>
        )}

        {/* Footer Tabs */}
        {!collapsed && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#eaf2f7] border-t border-slate-200 rounded-b-xl text-[#1f4b68] font-semibold text-xs">
            <button
              onClick={() => setMode("retrieve")}
              className={`px-3 py-1 rounded-md transition ${
                mode === "retrieve"
                  ? "bg-[#2c6c95] text-white shadow-sm"
                  : "hover:bg-[#d6e5ef]"
              }`}
            >
              Retrieve Selected Document (F6)
            </button>
            <button
              onClick={() => setMode("use")}
              className={`px-3 py-1 rounded-md transition ${
                mode === "use"
                  ? "bg-[#2c6c95] text-white shadow-sm"
                  : "hover:bg-[#d6e5ef]"
              }`}
            >
              Use Selected Document (F7)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllTranDocNo;
