// src/NAYSA Cloud/Reference File/BranchRef.jsx
import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faTrashAlt,
  faSpinner,
  faFileExport,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";

import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

const BranchRef = () => {
  const { user } = useAuth();

  // ───── Document meta ─────
  const docType = "Branch"; // key must exist in reftables.js
  const documentTitle = reftables[docType] || "Branch Reference";
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // ───── State ─────
  const [branches, setBranches] = useState([]);
  const [filtered, setFiltered] = useState([]);

  // ✅ Filters for ALL columns
  const [filters, setFilters] = useState({
    code: "",
    name: "",
    address: "",
    zip: "",
    tin: "",
    contact: "",
    type: "",
    active: "",
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [selectedRow, setSelectedRow] = useState(null);
  const [editingBranch, setEditingBranch] = useState(null);

  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState("asc");

  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isOpenExport, setOpenExport] = useState(false);

  const guideRef = useRef(null);
  const exportRef = useRef(null);

  const userCode =
    user?.USER_CODE || user?.username || user?.userCode || "SYSTEM";

  const getRowId = (row) =>
    row ? String(row.branchCode ?? row.branch_code ?? "") : "";

  // ───── Mapping helpers ─────
  const mapMainToBranchType = (val) => {
    if (!val) return "Branch";
    const v = String(val).toLowerCase();
    if (v === "yes" || v === "y") return "Main";
    return "Branch";
  };

  const mapBranchTypeToYN = (val) => {
    const v = String(val || "").toLowerCase();
    return v === "main" ? "Y" : "N";
  };

  const mapActiveToYesNo = (val) => {
    if (!val) return "Yes";
    const v = String(val).toLowerCase();
    if (v === "y" || v === "yes") return "Yes";
    if (v === "n" || v === "no") return "No";
    return "Yes";
  };

  const mapYesNoToYN = (val) => {
    const v = String(val || "").toLowerCase();
    return v === "no" ? "N" : "Y";
  };

  // ───── Fetch branches ─────
  const fetchBranches = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/branch");
      const resultString =
        data?.data?.[0]?.result || data?.[0]?.result || null;
      const list = resultString ? JSON.parse(resultString) : [];
      const arr = Array.isArray(list) ? list : [];
      setBranches(arr);
      setFiltered(arr);
    } catch (err) {
      console.error("Error fetching branches:", err);
      Swal.fire("Error", "Failed to load branches.", "error");
      setBranches([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  // ───── Filter + sort ─────
  useEffect(() => {
    const f = {
      code: (filters.code || "").toLowerCase(),
      name: (filters.name || "").toLowerCase(),
      address: (filters.address || "").toLowerCase(),
      zip: (filters.zip || "").toLowerCase(),
      tin: (filters.tin || "").toLowerCase(),
      contact: (filters.contact || "").toLowerCase(),
      type: (filters.type || "").toLowerCase(),
      active: (filters.active || "").toLowerCase(),
    };

    let list = branches.filter((b) => {
      const code = String(b.branchCode ?? "").toLowerCase();
      const name = String(b.branchName ?? "").toLowerCase();

      const address = [
        b.branchAddr1,
        b.branchAddr2,
        b.branchAddr3,
      ]
        .filter(Boolean)
        .join(", ")
        .toLowerCase();

      const zip = String(b.zipCode ?? "").toLowerCase();
      const tin = String(b.branchTin ?? "").toLowerCase();
      const contact = String(b.telNo ?? "").toLowerCase();
      const type = mapMainToBranchType(b.main).toLowerCase();
      const active = String(b.active ?? "").toLowerCase(); // keep as-is from DB/UI

      return (
        code.includes(f.code) &&
        name.includes(f.name) &&
        address.includes(f.address) &&
        zip.includes(f.zip) &&
        tin.includes(f.tin) &&
        contact.includes(f.contact) &&
        type.includes(f.type) &&
        active.includes(f.active)
      );
    });

    if (sortBy) {
      list = [...list].sort((a, b) => {
        let aVal = "";
        let bVal = "";

        if (sortBy === "code") {
          aVal = String(a.branchCode ?? "").toLowerCase();
          bVal = String(b.branchCode ?? "").toLowerCase();
        } else if (sortBy === "name") {
          aVal = String(a.branchName ?? "").toLowerCase();
          bVal = String(b.branchName ?? "").toLowerCase();
        }

        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFiltered(list);
  }, [branches, filters, sortBy, sortDir]);

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () =>
    setFilters({
      code: "",
      name: "",
      address: "",
      zip: "",
      tin: "",
      contact: "",
      type: "",
      active: "",
    });

  // ───── Click outside for dropdowns ─────
  useEffect(() => {
    const onClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setOpenExport(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ───── Selection & editing ─────
  const handleSelectRow = (row) => {
    if (isEditing) return;
    setSelectedRow(row);
  };

  const mapRowToEditing = (row) => {
    if (!row) return null;
    return {
      branchCode: row.branchCode ?? "",
      branchName: row.branchName ?? "",
      branchAddr1: row.branchAddr1 ?? "",
      branchAddr2: row.branchAddr2 ?? "",
      branchAddr3: row.branchAddr3 ?? "",
      branchTin: row.branchTin ?? "",
      contactNo: row.telNo ?? "",
      zipCode: row.zipCode ?? "",
      branchType: mapMainToBranchType(row.main), // Main/Branch
      active: mapActiveToYesNo(row.active), // Yes/No
      __existing: true,
    };
  };

  const startNew = () => {
    setSelectedRow(null);
    setEditingBranch({
      branchCode: "",
      branchName: "",
      branchAddr1: "",
      branchAddr2: "",
      branchAddr3: "",
      branchTin: "",
      contactNo: "",
      zipCode: "",
      branchType: "Branch",
      active: "Yes",
      __existing: false,
    });
    setIsAdding(true);
    setIsEditing(true);
  };

  const handleEditRow = (row) => {
    if (!row) return;
    setEditingBranch(mapRowToEditing(row));
    setIsAdding(false);
    setIsEditing(true);
    setSelectedRow(row);
  };

  const handleRowDoubleClick = (row) => {
    if (!isEditing) handleEditRow(row);
  };

  const resetForm = () => {
    setEditingBranch(null);
    setIsEditing(false);
    setIsAdding(false);
    setSelectedRow(null);
  };

  // ───── Save (Upsert) ─────
  const handleSave = async () => {
    if (!editingBranch) {
      Swal.fire("Error", "Nothing to save.", "error");
      return;
    }

    const { branchCode, branchName, branchAddr1, branchTin } = editingBranch;

    if (!branchCode || !branchName || !branchAddr1 || !branchTin) {
      Swal.fire(
        "Missing Data",
        "Please fill Branch Code, Branch Name, Address 1 and TIN.",
        "warning"
      );
      return;
    }

    const payload = {
      json_data: {
        branchCode: String(branchCode).trim(),
        branchName: String(branchName).trim(),
        branchAddr1: String(editingBranch.branchAddr1 || "").trim(),
        branchAddr2: String(editingBranch.branchAddr2 || "").trim(),
        branchAddr3: String(editingBranch.branchAddr3 || "").trim(),
        branchTin: String(branchTin || "").trim(),
        telNo: String(editingBranch.contactNo || "").trim(),
        faxNo: "",
        zipCode: String(editingBranch.zipCode || "").trim(),
        main: mapBranchTypeToYN(editingBranch.branchType), // Y/N
        active: mapYesNoToYN(editingBranch.active), // Y/N
        userCode,
      },
    };

    const confirm = await Swal.fire({
      title: "Save Branch?",
      text: "Make sure the details are correct.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/upsertBranch", payload);
      const status = data?.status ?? data?.data?.status;
      const success = data?.success || status === "success";

      if (success) {
        await Swal.fire(
          "Saved",
          isAdding ? "Branch added successfully." : "Branch updated successfully.",
          "success"
        );
        await fetchBranches();
        resetForm();
      } else {
        Swal.fire(
          "Error",
          data?.message || data?.data?.message || "Failed to save Branch.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error saving Branch:", error);
      const msg =
        error?.response?.data?.message || error.message || "Error saving Branch.";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  // ───── Delete ─────
  const handleDelete = async () => {
    if (!editingBranch || !editingBranch.branchCode) {
      Swal.fire("Error", "Select a branch to delete first.", "error");
      return;
    }

    const branchCode = editingBranch.branchCode;
    const branchName = editingBranch.branchName || "";

    const confirm = await Swal.fire({
      title: "Delete this branch?",
      text: `Branch Code: ${branchCode} | Branch Name: ${branchName}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete",
    });

    if (!confirm.isConfirmed) return;

    try {
      const payload = {
        json_data: {
          branchCode: String(branchCode).trim(),
          userCode,
        },
      };

      const { data } = await apiClient.post("/deleteBranch", payload);
      const status = data?.status ?? data?.success;
      const success = data?.success || status === "success";

      if (success) {
        await Swal.fire("Deleted", "Branch deleted successfully.", "success");
        await fetchBranches();
        resetForm();
      } else {
        Swal.fire("Error", data?.message || "Failed to delete Branch.", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      const msg =
        error?.response?.data?.message ||
        error.message ||
        "Failed to delete Branch.";
      Swal.fire("Error", msg, "error");
    }
  };

  // ───── Export + Guides ─────
  const handleExport = () => {
    setOpenExport(false);
    Swal.fire("Info", "Export for Branches will be implemented here.", "info");
  };

  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // ───── ButtonBar ─────
  const mainButtons = [
    {
      key: "add",
      label: "Add",
      icon: faPlus,
      onClick: startNew,
      disabled: saving || isEditing,
    },
    {
      key: "save",
      label: saving ? "Saving..." : "Save",
      icon: faSave,
      onClick: handleSave,
      disabled: !isEditing || saving,
    },
    {
      key: "delete",
      label: "Delete",
      icon: faTrashAlt,
      onClick: handleDelete,
      disabled: saving || !editingBranch || !editingBranch.__existing,
    },
    {
      key: "reset",
      label: "Reset",
      icon: faUndo,
      onClick: () => {
        if (isEditing) resetForm();
        else resetFilters();
      },
      disabled: saving,
    },
  ];

  // ───── Render ─────
  return (
    <div className="global-ref-main-div-ui mt-24">
      {/* HEADER */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-end text-xs">
          <ButtonBar buttons={mainButtons} />

          {/* Export dropdown */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setOpenExport((prev) => !prev)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faFileExport} />
              Export
              <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
            </button>
            {isOpenExport && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg ring-1 ring-black/10 z-40">
                <button
                  onClick={handleExport}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50"
                >
                  Excel / CSV
                </button>
              </div>
            )}
          </div>

          {/* Info (PDF / Video) */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((prev) => !prev)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
              Info
              <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
            </button>
            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60]">
                <button
                  onClick={handlePDFGuide}
                  disabled={!pdfLink}
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" />
                  User Guide
                </button>
                <button
                  onClick={handleVideoGuide}
                  disabled={!videoLink}
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" />
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
              <div className="border rounded-lg overflow-hidden p-4 bg-gray-50 relative">
                {(loading || saving) && (
                  <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10">
                    <span className="inline-flex items-center gap-2 text-xs text-blue-700 font-semibold">
                      <FontAwesomeIcon icon={faSpinner} spin />
                      {saving ? "Saving..." : "Loading..."}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {/* LEFT COLUMN */}
                  <div className="space-y-1">
                    <FieldRenderer
                      label="Branch Code"
                      required
                      type="text"
                      value={editingBranch?.branchCode || ""}
                      disabled={
                        !isEditing || (editingBranch && editingBranch.__existing)
                      }
                      onChange={(val) => {
                        const v = (val || "").toUpperCase();

                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          branchCode: v,
                        }));

                        // SweetAlert duplicate check (Add mode only)
                        if (isAdding && v.trim() !== "") {
                          const exists = branches.some((row) => {
                            const existing = String(row.branchCode ?? "")
                              .trim()
                              .toUpperCase();
                            return existing === v.trim();
                          });

                          if (exists) {
                            Swal.fire({
                              icon: "error",
                              title: "Duplicate Code",
                              text: "Branch Code already exists and cannot be used.",
                              confirmButtonText: "OK",
                            });

                            setEditingBranch((prev) => ({
                              ...(prev || {}),
                              branchCode: "",
                            }));
                          }
                        }
                      }}
                    />
                    

                    <FieldRenderer
                      label="Branch Name"
                      required
                      type="text"
                      value={editingBranch?.branchName || ""}
                      disabled={!isEditing}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          branchName: val,
                        }))
                      }
                    />

                    <FieldRenderer
                      label="Address 1"
                      required
                      type="text"
                      value={editingBranch?.branchAddr1 || ""}
                      disabled={!isEditing}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          branchAddr1: val,
                        }))
                      }
                    />

                    <FieldRenderer
                      label="Address 2"
                      type="text"
                      value={editingBranch?.branchAddr2 || ""}
                      disabled={!isEditing}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          branchAddr2: val,
                        }))
                      }
                    />

                    <FieldRenderer
                      label="Address 3"
                      type="text"
                      value={editingBranch?.branchAddr3 || ""}
                      disabled={!isEditing}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          branchAddr3: val,
                        }))
                      }
                    />
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-1">
                    <FieldRenderer
                      label="Branch TIN"
                      required
                      type="text"
                      value={editingBranch?.branchTin || ""}
                      disabled={!isEditing}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          branchTin: val,
                        }))
                      }
                    />

                    <FieldRenderer
                      label="Contact No."
                      type="text"
                      value={editingBranch?.contactNo || ""}
                      disabled={!isEditing}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          contactNo: val,
                        }))
                      }
                    />

                    <FieldRenderer
                      label="Zip Code"
                      type="text"
                      value={editingBranch?.zipCode || ""}
                      disabled={!isEditing}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          zipCode: val,
                        }))
                      }
                    />

                    <FieldRenderer
                      label="Branch Type"
                      type="select"
                      value={editingBranch?.branchType || "Branch"}
                      disabled={!isEditing}
                      options={[
                        { value: "Main", label: "Main" },
                        { value: "Branch", label: "Branch" },
                      ]}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          branchType: val || "Branch",
                        }))
                      }
                    />

                    <FieldRenderer
                      label="Active"
                      type="select"
                      value={editingBranch?.active || "Yes"}
                      disabled={!isEditing}
                      options={[
                        { value: "Yes", label: "Yes" },
                        { value: "No", label: "No" },
                      ]}
                      onChange={(val) =>
                        setEditingBranch((prev) => ({
                          ...(prev || {}),
                          active: val || "Yes",
                        }))
                      }
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
                          Branch Code{" "}
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
                          Branch Name{" "}
                          {sortBy === "name"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th className="global-ref-th-ui">Address</th>
                        <th className="global-ref-th-ui">Zip Code</th>
                        <th className="global-ref-th-ui">TIN</th>
                        <th className="global-ref-th-ui">Contact No.</th>
                        <th className="global-ref-th-ui">Main / Branch</th>
                        <th className="global-ref-th-ui">Active</th>
                      </tr>

                      {/* ✅ Filter row (ALL columns) */}
                      <tr>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.code}
                            onChange={(e) =>
                              handleFilterChange("code", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.name}
                            onChange={(e) =>
                              handleFilterChange("name", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.address}
                            onChange={(e) =>
                              handleFilterChange("address", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.zip}
                            onChange={(e) =>
                              handleFilterChange("zip", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.tin}
                            onChange={(e) =>
                              handleFilterChange("tin", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.contact}
                            onChange={(e) =>
                              handleFilterChange("contact", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.type}
                            onChange={(e) =>
                              handleFilterChange("type", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Filter…"
                            value={filters.active}
                            onChange={(e) =>
                              handleFilterChange("active", e.target.value)
                            }
                          />
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.length > 0 ? (
                        filtered.map((row, index) => {
                          const selected =
                            getRowId(selectedRow) === getRowId(row);

                          const address = [
                            row.branchAddr1,
                            row.branchAddr2,
                            row.branchAddr3,
                          ]
                            .filter(Boolean)
                            .join(", ");

                          const branchType = mapMainToBranchType(row.main);

                          return (
                            <tr
                              key={getRowId(row) || index}
                              className={`global-tran-tr-ui ${
                                selected ? "bg-blue-50" : ""
                              }`}
                              onClick={() => handleSelectRow(row)}
                              onDoubleClick={() => handleRowDoubleClick(row)}
                            >
                              <td className="global-ref-td-ui">
                                {row.branchCode}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.branchName}
                              </td>
                              <td className="global-ref-td-ui">{address}</td>
                              <td className="global-ref-td-ui">
                                {row.zipCode}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.branchTin}
                              </td>
                              <td className="global-ref-td-ui">{row.telNo}</td>
                              <td className="global-ref-td-ui">
                                {branchType}
                              </td>
                              <td className="global-ref-td-ui">{row.active}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={8}
                            className="global-ref-norecords-ui text-center"
                          >
                            {loading ? (
                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} spin />
                                Loading…
                              </span>
                            ) : (
                              "No branches found"
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

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

        {/* FOOTER STRIP */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center mt-4 rounded-b-lg">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{filtered.length}</span> of{" "}
            <span className="font-medium">{branches.length}</span> branches
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchRef;
