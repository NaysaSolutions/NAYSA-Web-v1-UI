// src/NAYSA Cloud/Reference File/BillCodeRef.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

//UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faMagnifyingGlass,
  faTrashAlt,
  faPrint,
  faChevronDown,
  faInfoCircle,
  faFileCsv,
  faFileExcel,
  faFilePdf,
  faVideo,
  faSave,
  faUndo,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";


// Global
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ------- Config / helpers ----------------------------------------------------
const API = axios.create({ baseURL: "http://localhost:8000/api" });



/** Simple validators */
const isTinValid = (v) => /^[0-9-]{9,20}$/.test(String(v || ""));
const req = (v) => String(v || "").trim().length > 0;

/** Case-insensitive "includes" that tolerates nulls */
const includesCI = (hay, needle) =>
  String(hay ?? "").toLowerCase().includes(String(needle ?? "").toLowerCase());



// const req = (v) => String(v ?? "").trim().length > 0;
// const includesCI = (hay, needle) =>
//   String(hay ?? "").toLowerCase().includes(String(needle ?? "").toLowerCase());

// Props: reftables maps and guides are assumed to exist in your project
// import {
//   reftables,
//   reftablesPDFGuide,
//   reftablesVideoGuide,
// } from "@/NAYSA Cloud/Global/reftable";

// ------- Component -----------------------------------------------------------
const BillCodeRef = () => {
  // Document meta
  const docType = "BillCode";
  const documentTitle = reftables[docType] || "Bill Codes";
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // Data state
  const [billCode, setBillCodes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBillCode, setEditingBillCode] = useState(null);

  // UX state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  // Table helpers
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("billCode");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Per-column filters
  const [columnFilters, setColumnFilters] = useState({
    billCode: "",
    billName: "",
    uom: "",
    arAcct: "",
    salesAcct: "",
    sdiscAcct: "",
    rcCode: "",
    active: "", // Y / N
  });

  // Refs for click-away
  const exportRef = useRef(null);
  const guideRef = useRef(null);

  // -------- Fetch ------------------------------------------------------------
 const fetchBillcodes = async () => {
  setLoading(true);
  try {
    const { data } = await API.get("/billCode");
    const resultString = data?.data?.[0]?.result;
    const list = resultString ? JSON.parse(resultString) : [];
    setBillCodes(list);           // <-- populate table
    setEditingBillCode(null);     // optional: clear the form
  } catch (error) {
    console.error("Error fetching bill codes:", error);
    Swal.fire("Error", "Failed to load bill codes.", "error");
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {  fetchBillcodes();   }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideExport = exportRef.current && !exportRef.current.contains(event.target);
      const clickedOutsideGuide = guideRef.current && !guideRef.current.contains(event.target);
      if (clickedOutsideExport) setOpenExport(false);
      if (clickedOutsideGuide) setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Ctrl+S
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveBillCode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, isEditing, editingBillCode]);

  // -------- Derivations: search + filters + sort + pagination ---------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Global search (optional)
    const base = q 
      ? billCode.filter((b) =>
          [
            b.billCode,
            b.billName,
            b.uom,
            b.arAcct,
            b.salesAcct,
            b.sdiscAcct,
            b.rcCode,
            b.active,
          ].some((x) => String(x ?? "").toLowerCase().includes(q))
        )
      : billCode;

    // Per-column filters (all must match)
    const withColFilters = base.filter((b) => {
      const f = columnFilters;
      if (f.billCode && !includesCI(b.billCode, f.billCode)) return false;
      if (f.billName && !includesCI(b.billName, f.billName)) return false;
      if (f.uom && !includesCI(b.uom, f.uom)) return false;
      if (f.arAcct && !includesCI(b.arAcct, f.arAcct)) return false;
      if (f.salesAcct && !includesCI(b.salesAcct, f.salesAcct)) return false;
      if (f.sdiscAcct && !includesCI(b.sdiscAcct, f.sdiscAcct)) return false;
      if (f.rcCode && !includesCI(b.rcCode, f.rcCode)) return false;
      if (f.active && String(b.active ?? "") !== String(f.active)) return false;

      // select filters: exact match when a value is chosen
      if (f.main && String(b.main ?? "") !== String(f.main)) return false;
      if (f.active && String(b.active ?? "") !== String(f.active)) return false;

      return true;
    });

    // Sort
    const factor = sortDir === "asc" ? 1 : -1;
    return [...withColFilters].sort((a, b) => {
      const A = String(a?.[sortBy] ?? "");
      const B = String(b?.[sortBy] ?? "");
      return A.localeCompare(B) * factor;
    });
  }, [billCode, query, columnFilters, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // -------- NEW  /  EDIT   RESET FLOWS  -------------------------------------------------------------
  const startNew = () => {
    setEditingBillCode({
      __existing: false,
      billCode: "",
      billName: "",
      uom: "",
      arAcct: "",
      salesAcct: "",
      sdiscAcct: "",
      rcCode: "",
      active: "Y", // or "1" depending on your backend
    });
    setIsEditing(true);
  };

  const handleEditRow = (index) => {
    const item = filtered[index + (page - 1) * pageSize]; // map visible index to original
    setEditingBillCode({ ...item, __existing: true });
    setIsEditing(true);
  };

  const resetForm = () => {
    setEditingBillCode(null);
    setIsEditing(false);
    setOpenExport(false);
    setOpenGuide(false);
    setPage(1);
  };

  const handleSaveBillCode = async () => {
    if (!editingBillCode) return;

    const { billCode, billName, uom, arAcct, salesAcct, sdiscAcct, rcCode } =
      editingBillCode;

    // Validate requireds
    if (
      !req(billCode) ||
      !req(billName) ||
      !req(uom) ||
      !req(arAcct) ||
      !req(salesAcct) ||
      !req(sdiscAcct) ||
      !req(rcCode)
    ) {
      Swal.fire(
        "Missing data",
        "Please fill: Bill Code, Description, UOM, AR Account, Sales Account, Sales Discount Account, Responsibility Center.",
        "warning"
      );
      return;
    }

    const payload = {
      json_data: {
        billCode: editingBillCode.billCode,
        billName: editingBillCode.billName,
        uom: editingBillCode.uom,
        arAcct: editingBillCode.arAcct || "",
        salesAcct: editingBillCode.salesAcct || "",
        sdiscAcct: editingBillCode.sdiscAcct || "",
        rcCode: editingBillCode.rcCode,
        active: editingBillCode.active ?? "Y",
        userCode: "NSI",
      },
    };

    const confirm = await Swal.fire({
      title: "Save Bill Code?",
      text: "Make sure details are correct.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    setLoading(true);
    try {
      const { data } = await API.post("/upsertBillCodes", payload);
      if (data?.status === "success") {
        await Swal.fire("Saved", "Bill Code saved successfully.", "success");
        await fetchBillcodes();
        resetForm();
      } else {
        Swal.fire("Error", data?.message || "Something went wrong.", "error");
      }
    } catch (error) {
      console.error("Error saving Bill Code:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Error saving Bill Code.",
        "error"
      );
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  const handleDeleteBillCode = async (index) => {
    const b = filtered[index];
    if (!b?.billCode) return;
    const confirm = await Swal.fire({
      title: "Delete this Bill Code?",
      text: `Bill Code: ${b.billCode} | ${b.billName}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it",
    });
    if (!confirm.isConfirmed) return;

    try {
      const { data } = await API.post("/deleteBillCodes", {json_data: { billCode: b.billCode },});
      if (data?.status === "success") {
        setBillCodes((prev) => prev.filter((x) => x.billCode !== b.billCode));
        Swal.fire("Deleted", "The bill code has been deleted.", "success");
      } else {
        Swal.fire("Error", data?.message || "Deletion failed.", "error");
      }
    } catch (error) {
      console.error("API delete error:", error);
      Swal.fire("Error", error?.response?.data?.message || "Failed to delete Bill Code.","error" );
    }
  };

  // -------- Export -----------------------------------------------------------
  const handleExport = (type) => {
    if (!billCode.length) {
      Swal.fire("No data", "There is no data to export.", "info");
      return;
    }

    const headers = [
      "Bill Code",
      "Bill Name",
      "UOM",
      "AR Account",
      "Sales Account",
      "Sales Discount Account",
      "Responsibility Center",
      "Active",
    ];

    const rows = billCode.map((r) => [
      r.billCode ?? "",
      r.billName ?? "",
      r.uom ?? "",
      r.arAcct ?? "",
      r.salesAcct ?? "",
      r.sdiscAcct ?? "",
      r.rcCode ?? "",
      r.active ?? "",
    ]);

    if (type === "csv" || type === "excel") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "BillCodes");
      if (type === "csv") {
        XLSX.writeFile(wb, "billCode.csv", { bookType: "csv" });
      } else {
        XLSX.writeFile(wb, "billCode.xlsx", { bookType: "xlsx" });
      }
    } else if (type === "pdf") {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });
      doc.setFontSize(15);
      doc.text("Bill Codes", 40, 40);
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 60,
        margin: { top: 50, left: 40, right: 40 },
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 82, 204], textColor: [255, 255, 255] },
      });
      doc.save("billCode.pdf");
    }
  };

  // -------- Guides -----------------------------------------------------------
  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };
  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // -------- UI ---------------------------------------------------------------
  return (
    <div className="global-ref-main-div-ui mt-20">
      <div className="mx-auto">
        {/*  header */}
        <div className="fixed top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
            <div className="relative ml-auto sm:ml-4 w-full sm:w-64">
                  <input
                    className="global-ref-filterbox-ui global-ref-filterbox-enabled pl-8"
                    placeholder="Search bill codes…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value); setPage(1);}}
                  />
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                </div>
              </div>

              <div className="flex gap-2 justify-center text-xs">
               <button onClick={startNew} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
                  <FontAwesomeIcon icon={faPlus} /> Add
                 </button>

                <button
                  onClick={handleSaveBillCode}
                  className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={!isEditing || saving}
                  title="Ctrl+S to Save"
                >
                  <FontAwesomeIcon icon={faSave} /> Save
                </button>

                <button
                  onClick={resetForm} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700" disabled={saving}>
                  <FontAwesomeIcon icon={faUndo} /> Reset
                </button>



                <div ref={exportRef} className="relative">
                  <button
                    onClick={() => setOpenExport((v) => !v)}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
                  >
                    <FontAwesomeIcon icon={faPrint} /> Export <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                  </button>
                  {isOpenExport && (
                    <div className="bsolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                      <button
                        onClick={() => { handleExport("csv");setOpenExport(false); }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                      >
                        <FontAwesomeIcon icon={faFileCsv} className="mr-2 text-green-600" /> CSV
                      </button>
                      <button
                        onClick={() => { handleExport("excel");setOpenExport(false);}}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                      >
                        <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" /> Excel
                      </button>
                      <button
                        onClick={() => { handleExport("pdf");setOpenExport(false); }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                      >
                        <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> PDF
                      </button>
                    </div>
                  )}
                </div>

                <div ref={guideRef} className="relative">
                  <button
                    onClick={() => setOpenGuide((v) => !v)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} /> Info <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
                  </button>
                  {isOpenGuide && (
                    <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                      <button
                        onClick={() => { handlePDFGuide();setOpenGuide(false);}}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                      >
                        <FontAwesomeIcon icon={faFilePdf} /> User Guide
                      </button>
                      <button
                        onClick={() => {handleVideoGuide();setOpenGuide(false);}}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                      >
                        <FontAwesomeIcon icon={faVideo} /> Video Guide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
        <div className="global-tran-tab-div-ui">
          {(loading || saving) && (
            <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <div
                className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-xl flex items-center gap-3"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                {/* Spinner */}
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 dark:border-gray-600 dark:border-t-white" />
                {/* Text */}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {saving ? "Saving…" : "Loading…"}
                </span>
              </div>
            </div>
          )}

          {/* Form grid (flattened) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
                {/* Bill Code */}
                <div className="relative md:col-span-1">
                  <input
                    type="text"
                    id="billCode"
                    placeholder=" "
                    className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                    value={editingBillCode?.billCode || ""}
                    onChange={(e) =>
                      setEditingBillCode((prev) => ({ ...(prev || {}), billCode: e.target.value }))
                    }
                    disabled={!!editingBillCode?.__existing}
                    readOnly={!isEditing}
                    maxLength={10}
                  />
                  <label
                    htmlFor="billCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`} >
                    <span className="text-red-500">*</span> Bill Code
                  </label>
                </div>

                {/* Bill Name */}
                <div className="relative md:col-span-1">
                  <input
                    type="text"
                    id="billName"
                    placeholder=" "
                    className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                    value={editingBillCode?.billName || ""}
                    onChange={(e) =>
                      setEditingBillName((prev) => ({ ...(prev || {}), billName: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="arAcct" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                    <span className="text-red-500">*</span> Bill Name
                  </label>
                </div>




                

                {/* UOM */}
                <div className="relative md:col-span-1">
                  <input
                    type="text"
                    id="uom"
                    placeholder=" "
                    className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                    value={editingBillCode?.uom || ""}
                    onChange={(e) =>
                      setEditingBillCode((prev) => ({ ...(prev || {}), uom: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="uom" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                    <span className="text-red-500">*</span> UOM
                  </label>
                </div>
             
           
                {/* AR Account */}
                <div className="relative md:col-span-1">
                  <input
                    type="text"
                    id="arAcct"
                    placeholder=" "
                    className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                    value={editingBillCode?.arAcct || ""}
                    onChange={(e) =>
                      setEditingBillCode((prev) => ({ ...(prev || {}), arAcct: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="arAcct" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                    <span className="text-red-500">*</span> AR Account
                  </label>
                </div>

                {/* Sales Account */}
                <div className="relative md:col-span-1">
                  <input
                    type="text"
                    id="salesAcct"
                    placeholder=" "
                    className={ `peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                    value={editingBillCode?.salesAcct || ""}
                    onChange={(e) =>
                      setEditingBillCode((prev) => ({ ...(prev || {}), salesAcct: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="salesAcct" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                    <span className="text-red-500">*</span> Sales Account
                  </label>
                </div>

                {/* Sales Discount Account */}
                <div className="relative md:col-span-1">
                  <input
                    type="text"
                    id="sdiscAcct"
                    placeholder=" "
                    className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                    value={editingBillCode?.sdiscAcct || ""}
                    onChange={(e) =>
                      setEditingBillCode((prev) => ({ ...(prev || {}), sdiscAcct: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="sdiscAcct" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                    <span className="text-red-500">*</span> Sales Discount Account
                  </label>
                </div>
             

              {/* Col 3 */}
              <div className="space-y-4">
                {/* Responsibility Center */}
                <div className="relative md:col-span-1">
                  <input
                    type="text"
                    id="rcCode"
                    placeholder=" "
                    className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                    value={editingBillCode?.rcCode || ""}
                    onChange={(e) =>
                      setEditingBillCode((prev) => ({ ...(prev || {}), rcCode: e.target.value }))
                    }
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="rcCode"
                    className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                    <span className="text-red-500">*</span> Responsibility Center
                  </label>
                </div>

                {/* Active */}
                <div className="relative md:col-span-1">
                  <select
                    id="active"
                    className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                    value={editingBillCode?.active ?? "Active"}
                    onChange={(e) =>
                      setEditingBillCode((prev) => ({ ...(prev || {}), active: e.target.value }))
                    }
                    disabled={!isEditing}
                  >
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                  <label htmlFor="active"className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                     <span className="global-ref-asterisk-ui">*</span> Active
                     </label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                      <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
             </div> 
        </div>

       {/* Table */}
        <div className="global-ref-table-main-div-ui">
          <div className="global-ref-table-main-sub-div-ui">
            <div className="global-ref-table-main-sub-div-ui">
              <table className="global-ref-table-main-sub-div-ui">
                <thead className="global-ref-table-main-sub-div-ui">
                  {/* Sortable header row */}
                  <tr className="text-left">
                    {[
                      ["billCode", "Bill Code"],
                      ["billName", "Bill Name"],
                      ["uom", "UOM"],
                      ["arAcct", "AR Account"],
                      ["salesAcct", "Sales Account"],
                      ["sdiscAcct", "Sales Disc Acct"],
                      ["rcCode", "Dept/RC"],
                      ["active", "Active"],
                      ["_edit", "Edit"],
                      ["_delete", "Delete"],
                    ].map(([key, label]) => (
                      <th
                        key={key}
                        className={`global-ref-th-ui ${key.startsWith("_") ? "" : "cursor-pointer select-none"}`}
                        onClick={() => {
                          if (key.startsWith("_")) return;
                          setSortBy(key);
                          setSortDir((prev) => (sortBy === key && prev === "asc" ? "desc" : "asc"));
                        }}
                        title={!key.startsWith("_") ? "Click to sort" : undefined}
                      >
                        {label} {sortBy === key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                    ))}
                  </tr>



                  {/* Filter row */}
                  <tr>
                    {/* BillCode Code */}
                    <th className="global-ref-th-ui">
                      <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.billCode}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, billCode: e.target.value })); setPage(1); }}
                        />
                      </th>

                      {/* BillCode Name */}
                    <th className="global-ref-th-ui">
                      <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.billName}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, billName: e.target.value })); setPage(1); }}
                        />
                      </th>

                        {/* UOM Name */}
                    <th className="global-ref-th-ui">
                      <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.uom}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, uom: e.target.value })); setPage(1); }}
                        />
                      </th>

                        {/* AR Acct Name */}
                    <th className="global-ref-th-ui">
                      <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.arAcct}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, arAcct: e.target.value })); setPage(1); }}
                        />
                      </th>


                    {/* Sales Acct Name */}
                    <th className="global-ref-th-ui">
                      <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.salesAcct}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, salesAcct: e.target.value })); setPage(1); }}
                        />
                      </th>

                    {/* discout Acct Name */}
                    <th className="global-ref-th-ui">
                      <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.sdiscAcct}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, sdiscAcct: e.target.value })); setPage(1); }}
                        />
                      </th>
                    
                       {/* RC Acct Name */}
                    <th className="global-ref-th-ui">
                      <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.rcCode}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, rcCode: e.target.value })); setPage(1); }}
                        />
                      </th>


                    {/* Active select */}
                    <th className="global-ref-th-ui">
                      <select
                        className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                        value={columnFilters.active}
                        onChange={(e) => {setColumnFilters((s) => ({ ...s, active: e.target.value }));setPage(1); }}
                      >
                        <option value="">All</option>
                        <option value="Y">Yes</option>
                        <option value="N">No</option>
                      </select>
                    </th>
                    {/* Edit/Delete spacers */}
                    <th className="global-ref-th-ui"></th>
                    <th className="global-ref-th-ui"></th>
                  </tr>
                </thead>

                <tbody>
                  {pageRows.length ? (
                    pageRows.map((row, idx) => (
                      <tr key={`${billCode.billCode}-${idx}`} className="global-tran-tr-ui">
                        <td className="global-ref-td-ui">{row.billCode}</td>
                        <td className="global-ref-td-ui">{row.billName}</td>
                        <td className="global-ref-td-ui">{row.uom || "-"}</td>
                        <td className="global-ref-td-ui">{row.arAcct || "-"}</td>
                        <td className="global-ref-td-ui">{row.salesAcct || "-"}</td>
                        <td className="global-ref-td-ui">{row.sdiscAcct || "-"}</td>
                        <td className="global-ref-td-ui">{row.rcCode || "-"}</td>
                        <td className="global-ref-td-ui">{row.active}</td>
                        <td className="global-ref-td-ui text-center sticky right-10">
                          <button
                            className="global-ref-td-button-edit-ui"
                            onClick={() => handleEditRow((page - 1) * pageSize + idx)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                        </td>
                        <td className="global-ref-td-ui text-center sticky right-0">
                          <button
                            className="global-ref-td-button-delete-ui"
                            onClick={() => handleDeleteBillCode((page - 1) * pageSize + idx)}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="global-ref-norecords-ui">
                         No bill codes found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            

            {/* Pager */}
            <div className="flex items-center justify-between p-3">
              <div className="text-xs opacity-80 font-semibold">
                Total Records: {filtered.length}
              </div>
              <div className="flex items-center gap-3">

                  <div className="text-xs opacity-80 font-semibold">
                    Page {page} of {totalPages}
                  </div>


                
                  <select
                    className="px-7 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    value={pageSize}
                    onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/page
                    </option>
                  ))}
                </select>
                
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-7 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-7 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  Next
                </button>
                
              </div>
            </div>
          </div>
        </div>
        {/* end Table */}
      </div>
    </div>
    </div>
  );
};

export default BillCodeRef;
