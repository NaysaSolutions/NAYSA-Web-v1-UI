// src/NAYSA Cloud/Reference File/BankRef.jsx
import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faVideo,
  faUndo,
  faSave,
  faTrash,
  faPlus,
  faEdit,
  faTrashAlt,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faFileExport,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable"; // BankType title here
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Helper to get unique ID from row
const getId = (row) => (row ? row.bankTypeCode ?? row.banktype_code ?? null : null);

const BankRef = () => {
  const { user } = useAuth();

  // Document setup
  const docType = "BankType";
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // Data
  const [bankTypes, setBankTypes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ code: "", name: "" });

  // UI state
  const [loading, setLoading] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankTypeCode, setBankTypeCode] = useState("");
  const [bankTypeName, setBankTypeName] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState("asc");

  const guideRef = useRef(null);

  // Initial load
  useEffect(() => {
    fetchBankTypes();
  }, []);

  // Close help dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideGuide =
        guideRef.current && !guideRef.current.contains(event.target);
      if (clickedOutsideGuide) setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ctrl+S save when editing
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, isEditing, bankTypeCode, bankTypeName]);

  // Fetch bank types from /bankType
  const fetchBankTypes = () => {
    setLoading(true);

    apiClient
      .get("/bankType")
      .then(({ data }) => {
        if (data?.success && Array.isArray(data.data) && data.data[0]?.result) {
          try {
            const parsed = JSON.parse(data.data[0].result || "[]");
            setBankTypes(parsed);
            setFiltered(parsed);
          } catch (err) {
            console.error("Parse error:", err);
            setBankTypes([]);
            setFiltered([]);
            Swal.fire("Error", "Failed to parse bank types from server.", "error");
          }
          return;
        }

        // If API ever returns direct array
        if (data?.success && Array.isArray(data.data)) {
          setBankTypes(data.data);
          setFiltered(data.data);
          return;
        }

        setBankTypes([]);
        setFiltered([]);
      })
      .catch((err) => {
        console.error("Fetch bank types error:", err);
        Swal.fire("Error", "Failed to fetch bank types from server.", "error");
        setBankTypes([]);
        setFiltered([]);
      })
      .finally(() => setLoading(false));
  };

  // Filter + sort
  useEffect(() => {
    let list = bankTypes.filter((item) => {
      const code = String(item.bankTypeCode ?? item.banktype_code ?? "")
        .toLowerCase()
        .trim();
      const name = String(item.bankTypeName ?? item.banktype_name ?? "")
        .toLowerCase()
        .trim();

      return (
        code.includes((filters.code || "").toLowerCase()) &&
        name.includes((filters.name || "").toLowerCase())
      );
    });

    if (sortBy) {
      list = [...list].sort((a, b) => {
        let aVal = "";
        let bVal = "";

        if (sortBy === "code") {
          aVal = String(a.bankTypeCode ?? a.banktype_code ?? "").toLowerCase();
          bVal = String(b.bankTypeCode ?? b.banktype_code ?? "").toLowerCase();
        } else if (sortBy === "name") {
          aVal = String(a.bankTypeName ?? a.banktype_name ?? "").toLowerCase();
          bVal = String(b.bankTypeName ?? b.banktype_name ?? "").toLowerCase();
        }

        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFiltered(list);
  }, [filters, bankTypes, sortBy, sortDir]);

  const handleFilterChange = (e, key) => {
    setFilters({ ...filters, [key]: e.target.value });
  };

  const resetFilters = () => setFilters({ code: "", name: "" });

  // Selection
  const handleSelect = (row) => {
    if (isEditing) return; // don't change selection while editing

    setSelectedRow(row);
    setBankTypeCode(row.bankTypeCode ?? row.banktype_code ?? "");
    setBankTypeName(row.bankTypeName ?? row.banktype_name ?? "");
  };

  // Form helpers
  const resetForm = () => {
    setBankTypeCode("");
    setBankTypeName("");
    setIsEditing(false);
    setIsAdding(false);
    setSelectedRow(null);

    // If not editing, reset filters too
    if (!isEditing) resetFilters();
  };

  const startNew = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(true);
  };

  const handleEditRow = (row) => {
    if (!row) return;

    setBankTypeCode(row.bankTypeCode ?? row.banktype_code ?? "");
    setBankTypeName(row.bankTypeName ?? row.banktype_name ?? "");
    setIsEditing(true);
    setIsAdding(false);
    setSelectedRow(row);
  };

  // // Build json_data string for sproc_PHP_BankRef
  // const buildJsonDataString = () => {
  //   const userCode = user?.USER_CODE || user?.username || "SYSTEM";

  //   const inner = {
  //     json_data: {
  //       bankTypeCode: String(bankTypeCode).trim(),
  //       bankTypeName: String(bankTypeName).trim(),
  //       userCode,
  //     },
  //   };

  //   return JSON.stringify(inner);
  // };

  const buildJsonDataString = () => {
    const userCode = user?.USER_CODE || user?.username || "SYSTEM";

    const inner = {
      json_data: {
        action: isAdding ? "Add" : "Edit",   // 🔴 NEW
        bankTypeCode: String(bankTypeCode).trim(),
        bankTypeName: String(bankTypeName).trim(),
        userCode,
      },
    };

    return JSON.stringify(inner);
  };


  // // Save (Upsert)
  // const handleSave = async () => {
  //   if (!bankTypeCode || !bankTypeName) {
  //     Swal.fire({
  //       title: "Error!",
  //       text: "Bank Type Code and Bank Type Name are required.",
  //       icon: "error",
  //       confirmButtonText: "Okay",
  //     });
  //     return;
  //   }

  //   setSaving(true);
  //   try {
  //     const jsonString = buildJsonDataString();

  //     const payload = {
  //       json_data: jsonString, // Laravel expects this as valid JSON string
  //     };

  //     const { data } = await apiClient.post("/upsertBankType", payload);

  //     if (data?.success || data?.status === "success") {
  //       await Swal.fire({
  //         title: "Success!",
  //         text: isAdding
  //           ? "Bank Type added successfully."
  //           : "Bank Type updated successfully.",
  //         icon: "success",
  //         confirmButtonText: "Okay",
  //       });
  //       fetchBankTypes();
  //       resetForm();
  //     } else {
  //       Swal.fire("Error", data?.message || "Failed to save Bank Type.", "error");
  //     }
  //   } catch (error) {
  //     console.error("Error saving Bank Type:", error);
  //     const msg =
  //       error.response?.data?.message || error.message || "Failed to save Bank Type.";
  //     Swal.fire("Error", msg, "error");
  //   } finally {
  //     setSaving(false);
  //   }
  // };
  const handleSave = async () => {
    if (!bankTypeCode || !bankTypeName) {
      Swal.fire({
        title: "Error!",
        text: "Bank Type Code and Bank Type Name are required.",
        icon: "error",
        confirmButtonText: "Okay",
      });
      return;
    }

    // 🔹 Front-end duplicate check when adding
    if (isAdding) {
      const exists = bankTypes.some((row) => {
        const existingCode = String(row.bankTypeCode ?? row.banktype_code ?? "")
          .toLowerCase()
          .trim();
        return existingCode === String(bankTypeCode).toLowerCase().trim();
      });

      if (exists) {
        Swal.fire({
          title: "Duplicate Code",
          text: "Bank Type Code already exists. Duplicated code is not allowed.",
          icon: "error",
          confirmButtonText: "Okay",
        });
        return; // ⛔ Do not proceed to API
      }
    }

    setSaving(true);
    try {
      const jsonString = buildJsonDataString();

      const payload = {
        json_data: jsonString, // Laravel expects JSON string
      };

      const { data } = await apiClient.post("/upsertBankType", payload);

      if (data?.success || data?.status === "success") {
        await Swal.fire({
          title: "Success!",
          text: isAdding
            ? "Bank Type added successfully."
            : "Bank Type updated successfully.",
          icon: "success",
          confirmButtonText: "Okay",
        });
        fetchBankTypes();
        resetForm();
      } else {
        Swal.fire(
          "Error",
          data?.message || "Failed to save Bank Type.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error saving Bank Type:", error);
      const msg =
        error.response?.data?.message || error.message || "Failed to save Bank Type.";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };



  // Delete (real API call)
  const handleDelete = async () => {
    if (!selectedRow) {
      Swal.fire("Error", "Please select a Bank Type to delete.", "error");
      return;
    }

    const code = selectedRow.bankTypeCode ?? selectedRow.banktype_code;

    const confirm = await Swal.fire({
      title: "Delete this Bank Type?",
      text: `Code: ${code} | Name: ${selectedRow.bankTypeName ?? selectedRow.banktype_name
        }`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
      customClass: { popup: "rounded-xl shadow-2xl" },
    });

    if (!confirm.isConfirmed) return;

    try {
      setSaving(true);

      // Reuse same structure as Upsert: {"json_data":{"bankTypeCode","bankTypeName","userCode"}}
      const jsonString = buildJsonDataString();

      const payload = {
        json_data: jsonString,
      };

      const { data } = await apiClient.post("/deleteBankType", payload);

      if (data?.success) {
        await Swal.fire("Deleted", "Bank Type deleted successfully.", "success");
        fetchBankTypes();
        resetForm();
      } else {
        Swal.fire(
          "Error",
          data?.message || "Failed to delete Bank Type.",
          "error"
        );
      }
    } catch (error) {
      console.error("Delete error:", error);
      const msg =
        error.response?.data?.message || error.message || "Failed to delete Bank Type.";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
    }
  };


  // Export
  const handleExport = () => {
    Swal.fire({
      title: "Export",
      text: "Export functionality will be implemented here.",
      icon: "info",
    });
  };

  // Guides
  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  return (
    <div className="global-ref-main-div-ui mt-24">
      {/* HEADER with buttons (same style as CurrencyRef) */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-end text-xs">
          {/* ADD */}
          <button
            onClick={startNew}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${isEditing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            disabled={isEditing}
          >
            <FontAwesomeIcon icon={faPlus} /> Add
          </button>

          {/* EDIT */}
          <button
            onClick={() => handleEditRow(selectedRow)}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!selectedRow || isEditing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            disabled={!selectedRow || isEditing}
          >
            <FontAwesomeIcon icon={faEdit} /> Edit
          </button>

          {/* DELETE */}
          <button
            onClick={handleDelete}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!selectedRow || isEditing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            disabled={!selectedRow || isEditing}
          >
            <FontAwesomeIcon icon={faTrashAlt} /> Delete
          </button>

          {/* SAVE */}
          <button
            onClick={handleSave}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!isEditing || saving ? "opacity-50 cursor-not-allowed" : ""
              }`}
            disabled={!isEditing || saving}
            title="Ctrl+S to Save"
          >
            <FontAwesomeIcon icon={faSave} /> {saving ? "Saving..." : "Save"}
          </button>

          {/* RESET / CLEAR / RESET FILTERS */}
          <button
            onClick={() => {
              if (isEditing) {
                resetForm();
              } else if (selectedRow) {
                setSelectedRow(null);
                setBankTypeCode("");
                setBankTypeName("");
              } else {
                resetFilters();
              }
            }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faUndo} />{" "}
            {isEditing
              ? "Reset"
              : selectedRow
                ? "Clear Selection"
                : "Reset Filters"}
          </button>

          {/* EXPORT */}
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <FontAwesomeIcon icon={faFileExport} /> Export
          </button>

          {/* INFO MENU (PDF / Video) */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide(!isOpenGuide)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} /> Info{" "}
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>
            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={handlePDFGuide}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!pdfLink}
                >
                  <FontAwesomeIcon
                    icon={faFilePdf}
                    className="mr-2 text-red-600"
                  />{" "}
                  User Guide
                </button>
                <button
                  onClick={handleVideoGuide}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!videoLink}
                >
                  <FontAwesomeIcon
                    icon={faVideo}
                    className="mr-2 text-blue-600"
                  />{" "}
                  Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT CARD */}
      <div className="mt-4 mb-4 bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="w-full bg-white p-4 sm:p-6 shadow-md rounded-lg">
          <div className="flex flex-col gap-4">
            {/* FORM */}
            <div className="w-full">
              <div className="border rounded-lg overflow-hidden p-4 bg-gray-50">
                {saving && (
                  <div className="text-xs text-blue-600 mb-2">Processing...</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Type Code */}
                  <div className="w-full">
                    <FieldRenderer
                      label="Bank Type Code"
                      required
                      value={bankTypeCode}
                      onChange={(val) => {
                        const v = val.toUpperCase();
                        setBankTypeCode(v);

                        // 🔎 Duplicate check (runs immediately)
                        if (isAdding) {
                          const exists = bankTypes.some((row) => {
                            const existing = String(row.bankTypeCode ?? row.banktype_code ?? "")
                              .trim()
                              .toUpperCase();
                            return existing === v.trim();
                          });

                          if (exists) {
                            Swal.fire({
                              icon: "error",
                              title: "Duplicate Code",
                              text: "Duplicate Code is not Allowed.",
                              confirmButtonText: "OK",
                            });

                            // Clear invalid input
                            setBankTypeCode("");
                          }
                        }
                      }}
                      disabled={!isEditing || !isAdding}
                    />

                    {isEditing && !isAdding && (
                      <p className="mt-1 text-[11px] text-gray-400">
                        Code not editable in edit mode.
                      </p>
                    )}
                  </div>

                  {/* Bank Type Name */}
                  <div className="w-full">
                    <FieldRenderer
                      label="Bank Type Name"
                      required
                      value={bankTypeName}
                      onChange={setBankTypeName}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="global-ref-table-main-div-ui">
              <div className="global-ref-table-main-sub-div-ui">
                <div className="global-ref-table-div-ui">
                  <table className="global-ref-table-div-ui">
                    <thead className="global-ref-thead-div-ui">
                      <tr>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("code");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Bank Type Code{" "}
                          {sortBy === "code"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("name");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Bank Type Name{" "}
                          {sortBy === "name"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                      </tr>

                      {/* Filter row */}
                      <tr>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.code}
                            onChange={(e) => handleFilterChange(e, "code")}
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.name}
                            onChange={(e) => handleFilterChange(e, "name")}
                          />
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.length > 0 ? (
                        filtered.map((row, index) => (
                          <tr
                            key={getId(row) ?? index}
                            className={`global-tran-tr-ui ${getId(selectedRow) === getId(row)
                              ? "bg-blue-50"
                              : ""
                              }`}
                            onClick={() => handleSelect(row)}
                            onDoubleClick={() => {
                              if (!isEditing) handleEditRow(row);
                            }}
                          >
                            <td className="global-ref-td-ui">
                              {row.bankTypeCode ?? row.banktype_code ?? ""}
                            </td>
                            <td className="global-ref-td-ui">
                              {row.bankTypeName ?? row.banktype_name ?? "-"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="2"
                            className="global-ref-norecords-ui text-center"
                          >
                            {loading ? (
                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} spin />
                                Loading…
                              </span>
                            ) : (
                              "No bank type codes found"
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Simple footer / record count */}
                  <div className="flex items-center justify-between p-3">
                    <div className="text-xs opacity-80 font-semibold">
                      Total Records: {filtered.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer strip */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center mt-4 rounded-b-lg">
          <div className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">{filtered.length}</span> of{" "}
            <span className="font-medium">{bankTypes.length}</span> bank types
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankRef;
