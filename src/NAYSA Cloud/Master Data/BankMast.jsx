import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faFileExport,
  faInfoCircle,
  faChevronDown,
  faSpinner,
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

import SearchBankRef from "@/NAYSA Cloud/Lookup/SearchBankRef.jsx";

const BankMast = () => {
  const { user } = useAuth();
  const userCode =
    user?.USER_CODE || user?.username || user?.userCode || "SYSTEM";

  // ───── Document meta ─────
  const docType = "BankMaster"; // add this key in reftable if you want a custom title
  const documentTitle = reftables[docType] || "Bank Master Data";
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // ───── State ─────
  const [banks, setBanks] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [filters, setFilters] = useState({
    bankCode: "",
    bankTypeCode: "",
    acctCode: "",
    acctName: "",
    currCode: "",
    bankBranch: "",
  });

  const [sortBy, setSortBy] = useState("bankCode");
  const [sortDir, setSortDir] = useState("asc");

  const [editingBank, setEditingBank] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const [isBankTypeModalOpen, setBankTypeModalOpen] = useState(false);

  const guideRef = useRef(null);
  const exportRef = useRef(null);

  const getRowId = (row) =>
    row ? String(row.bankCode ?? row.bank_code ?? "") : "";

  // ─────────────────────────────────────
  // Fetch list (sproc mode = Load via /bank)
  // ─────────────────────────────────────
  const fetchBanks = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/bank");
      const resultString =
        data?.data?.[0]?.result || data?.[0]?.result || data?.result || null;

      let list = [];
      if (resultString) {
        try {
          list = JSON.parse(resultString) || [];
        } catch (e) {
          console.error("Error parsing /bank result:", e);
        }
      }
      if (!Array.isArray(list)) list = [];

      setBanks(list);
      setFiltered(list);
    } catch (err) {
      console.error("Error fetching bank master:", err);
      Swal.fire("Error", "Failed to load bank master records.", "error");
      setBanks([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  // ─────────────────────────────────────
  // Filter + sort
  // ─────────────────────────────────────
  useEffect(() => {
    let list = banks.filter((b) => {
      const bankCode = String(b.bankCode ?? "").toLowerCase();
      const bankTypeCode = String(b.bankTypeCode ?? "").toLowerCase();
      const acctCode = String(b.acctCode ?? "").toLowerCase();
      const acctName = String(b.acctName ?? "").toLowerCase();
      const currCode = String(b.currCode ?? "").toLowerCase();
      const bankBranch = String(b.bankBranch ?? "").toLowerCase();

      return (
        bankCode.includes(filters.bankCode.toLowerCase()) &&
        bankTypeCode.includes(filters.bankTypeCode.toLowerCase()) &&
        acctCode.includes(filters.acctCode.toLowerCase()) &&
        acctName.includes(filters.acctName.toLowerCase()) &&
        currCode.includes(filters.currCode.toLowerCase()) &&
        bankBranch.includes(filters.bankBranch.toLowerCase())
      );
    });

    if (sortBy) {
      list = [...list].sort((a, b) => {
        let A = "";
        let B = "";
        switch (sortBy) {
          case "bankCode":
            A = String(a.bankCode ?? "");
            B = String(b.bankCode ?? "");
            break;
          case "bankTypeCode":
            A = String(a.bankTypeCode ?? "");
            B = String(b.bankTypeCode ?? "");
            break;
          case "acctCode":
            A = String(a.acctCode ?? "");
            B = String(b.acctCode ?? "");
            break;
          case "acctName":
            A = String(a.acctName ?? "");
            B = String(b.acctName ?? "");
            break;
          case "currCode":
            A = String(a.currCode ?? "");
            B = String(b.currCode ?? "");
            break;
          case "bankBranch":
            A = String(a.bankBranch ?? "");
            B = String(b.bankBranch ?? "");
            break;
          default:
            A = "";
            B = "";
        }
        const res = A.localeCompare(B);
        return sortDir === "asc" ? res : -res;
      });
    }

    setFiltered(list);
  }, [banks, filters, sortBy, sortDir]);

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const resetFilters = () =>
    setFilters({
      bankCode: "",
      bankTypeCode: "",
      acctCode: "",
      acctName: "",
      currCode: "",
      bankBranch: "",
    });

  // ─────────────────────────────────────
  // Click-away for dropdowns
  // ─────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setOpenExport(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─────────────────────────────────────
  // Selection + edit
  // ─────────────────────────────────────
  const handleSelectRow = (row) => {
    if (isEditing) return;
    setSelectedRow(row);
  };

  // Double-click row → call /getBank (sproc mode=Get) to load full record (with acctName)
  const handleRowDoubleClick = async (row) => {
    if (!row) return;

    const bankCode = row.bankCode || row.bank_code;
    if (!bankCode) return;

    setLoading(true);
    try {
      const { data } = await apiClient.get("/getBank", {
        params: { bankCode },
      });

      const resultString =
        data?.data?.[0]?.result || data?.[0]?.result || data?.result || null;

      let list = [];
      if (resultString) {
        try {
          list = JSON.parse(resultString) || [];
        } catch (e) {
          console.error("Error parsing /getBank result:", e);
        }
      }
      const rec = Array.isArray(list) ? list[0] : null;
      if (!rec) {
        Swal.fire("Error", "Bank record not found.", "error");
        return;
      }

      setEditingBank({
        bankCode: rec.bankCode ?? "",
        acctCode: rec.acctCode ?? "",
        acctName: rec.acctName ?? "",
        bankAcctNo: rec.bankAcctNo ?? "",
        bankAcctType: rec.bankAcctType ?? "",
        currCode: rec.currCode ?? "",
        lastCheckNo: rec.lastCheckNo ?? "",
        autoCk: rec.autoCk ?? "N",
        bankAddr1: rec.bankAddr1 ?? "",
        bankAddr2: rec.bankAddr2 ?? "",
        bankContact: rec.bankContact ?? "",
        bankPosition: rec.bankPosition ?? "",
        bankTelNo: rec.bankTelNo ?? "",
        bankBranch: rec.bankBranch ?? "",
        bankTypeCode: rec.bankTypeCode ?? "",
        bankTypeName: rec.bankTypeName ?? "",
        __existing: true,
      });
      setIsEditing(true);
      setIsAdding(false);
      setSelectedRow(row);
    } catch (err) {
      console.error("Error calling /getBank:", err);
      Swal.fire("Error", "Failed to retrieve bank record.", "error");
    } finally {
      setLoading(false);
    }
  };

  const startNew = () => {
    setSelectedRow(null);
    setEditingBank({
      bankCode: "",
      acctCode: "",
      acctName: "",
      bankAcctNo: "",
      bankAcctType: "",
      currCode: "",
      lastCheckNo: "",
      autoCk: "Y",
      bankAddr1: "",
      bankAddr2: "",
      bankContact: "",
      bankPosition: "",
      bankTelNo: "",
      bankBranch: "",
      bankTypeCode: "",
      bankTypeName: "",
      __existing: false,
    });
    setIsAdding(true);
    setIsEditing(true);
  };

  const resetForm = () => {
    setEditingBank(null);
    setIsAdding(false);
    setIsEditing(false);
    setSelectedRow(null);
  };

  // ─────────────────────────────────────
  // Save (Upsert) via /upsertBank
  // ─────────────────────────────────────
  const handleSave = async () => {
    if (!editingBank) {
      Swal.fire("Error", "Nothing to save.", "error");
      return;
    }

    const {
      bankCode,
      acctCode,
      bankAcctNo,
      bankAcctType,
      currCode,
      bankTypeCode,
    } = editingBank;

    if (!bankCode || !acctCode || !bankAcctNo || !bankAcctType || !currCode) {
      Swal.fire(
        "Missing Data",
        "Please fill all required fields: Bank Code, Acct Code, Bank Acct No, Bank Account Type and Currency.",
        "warning"
      );
      return;
    }

    const payload = {
      json_data: {
        bankCode: String(bankCode).trim(),
        bankTypeCode: String(bankTypeCode || "").trim(),
        acctCode: String(acctCode).trim(),
        bankAcctNo: String(editingBank.bankAcctNo || "").trim(),
        bankAcctType: String(editingBank.bankAcctType || "").trim(),
        currCode: String(editingBank.currCode || "").trim(),
        lastCheckNo: String(editingBank.lastCheckNo || "").trim(),
        autoCk:
          editingBank.autoCk === "Y" || editingBank.autoCk === "Yes"
            ? "Y"
            : "N",
        bankAddr1: String(editingBank.bankAddr1 || "").trim(),
        bankAddr2: String(editingBank.bankAddr2 || "").trim(),
        bankContact: String(editingBank.bankContact || "").trim(),
        bankPosition: String(editingBank.bankPosition || "").trim(),
        bankTelNo: String(editingBank.bankTelNo || "").trim(),
        bankBranch: String(editingBank.bankBranch || "").trim(),
        userCode,
      },
    };

    const confirm = await Swal.fire({
      title: "Save Bank Master?",
      text: "Please confirm the details before saving.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Save",
    });
    if (!confirm.isConfirmed) return;

    setSaving(true);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/upsertBank", payload);
      const success = data?.success || data?.status === "success";

      if (success) {
        await Swal.fire(
          "Saved",
          isAdding ? "Bank master record added." : "Bank master record updated.",
          "success"
        );
        await fetchBanks();
        resetForm();
      } else {
        Swal.fire(
          "Error",
          data?.message || "Failed to save bank master record.",
          "error"
        );
      }
    } catch (err) {
      console.error("Error saving bank master:", err);
      const msg =
        err?.response?.data?.message ||
        err.message ||
        "Error saving bank master.";
      Swal.fire("Error", msg, "error");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  // ─────────────────────────────────────
  // Export / Help
  // ─────────────────────────────────────
  const handleExport = () => {
    setOpenExport(false);
    Swal.fire("Info", "Export for Bank Master will be implemented here.", "info");
  };

  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // ─────────────────────────────────────
  // Bank Type modal (Update Bank Types button)
  // ─────────────────────────────────────
  const openBankTypeModal = () => {
    if (isEditing) setBankTypeModalOpen(true);
  };

  const handleBankTypeClose = (selected) => {
    setBankTypeModalOpen(false);
    if (selected) {
      setEditingBank((prev) => ({
        ...(prev || {}),
        bankTypeCode: selected.bankTypeCode || "",
        bankTypeName: selected.bankTypeName || "",
      }));
    }
  };

  // ─────────────────────────────────────
  // ButtonBar setup
  // ─────────────────────────────────────
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

  // ─────────────────────────────────────
  // Render
  // ─────────────────────────────────────
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

          {/* Help menu */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((prev) => !prev)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} />
              Help
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

      {/* MAIN CARD */}
      <div className="mt-4 mb-4 bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="w-full bg-white p-4 sm:p-6 shadow-md rounded-lg">
          <div className="flex flex-col gap-4">
            {/* FORM */}
            <div className="border rounded-lg overflow-hidden p-4 bg-gray-50 relative">
              {(loading || saving) && (
                <div className="absolute inset-0 bg-white/40 flex items-center justify-center z-10">
                  <span className="inline-flex items-center gap-2 text-xs text-blue-700 font-semibold">
                    <FontAwesomeIcon icon={faSpinner} spin />
                    {saving ? "Saving..." : "Loading..."}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {/* LEFT SIDE */}
                <div className="space-y-1">
                  <FieldRenderer
                    label="Bank Code"
                    required
                    type="text"
                    value={editingBank?.bankCode || ""}
                    disabled={
                      !isEditing || (editingBank && editingBank.__existing)
                    }
                    onChange={(val) => {
                      const v = (val || "").toUpperCase();
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankCode: v,
                      }));

                      // Client-side duplicate check when adding
                      if (isAdding && v.trim() !== "") {
                        const exists = banks.some((row) => {
                          const existing = String(row.bankCode ?? "")
                            .trim()
                            .toUpperCase();
                          return existing === v.trim();
                        });
                        if (exists) {
                          Swal.fire({
                            icon: "error",
                            title: "Duplicate Code",
                            text: "Bank Code already exists and cannot be used.",
                            confirmButtonText: "OK",
                          });
                          setEditingBank((prev) => ({
                            ...(prev || {}),
                            bankCode: "",
                          }));
                        }
                      }
                    }}
                  />

                  <FieldRenderer
                    label="Acct Code"
                    required
                    type="text"
                    value={editingBank?.acctCode || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        acctCode: (val || "").toUpperCase(),
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Acct Name"
                    type="text"
                    value={editingBank?.acctName || ""}
                    disabled
                  />

                  <FieldRenderer
                    label="Bank Acct No"
                    required
                    type="text"
                    value={editingBank?.bankAcctNo || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankAcctNo: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Bank Account Type"
                    required
                    type="select"
                    value={editingBank?.bankAcctType || ""}
                    disabled={!isEditing}
                    options={[
                      { value: "Current", label: "Current" },
                      { value: "Savings", label: "Savings" },
                      { value: "Time", label: "Time Deposit" },
                    ]}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankAcctType: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Auto-Generated?"
                    type="select"
                    value={
                      editingBank?.autoCk === "N" || editingBank?.autoCk === "No"
                        ? "No"
                        : "Yes"
                    }
                    disabled={!isEditing}
                    options={[
                      { value: "Yes", label: "Yes" },
                      { value: "No", label: "No" },
                    ]}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        autoCk: val === "Yes" ? "Y" : "N",
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Last Check No"
                    type="text"
                    value={editingBank?.lastCheckNo || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        lastCheckNo: val,
                      }))
                    }
                  />
                </div>

                {/* RIGHT SIDE */}
                <div className="space-y-1">
                  <FieldRenderer
                    label="Currency"
                    required
                    type="text"
                    labelWidth="w-40"
                    value={editingBank?.currCode || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        currCode: (val || "").toUpperCase(),
                      }))
                    }
                  />

                  {/* Update Bank Types → opens SearchBankRef */}
                  <FieldRenderer
                    label="Bank Type"
                    type="lookup"
                    labelWidth="w-40"
                    value={
                      editingBank?.bankTypeCode
                        ? `${editingBank.bankTypeCode} - ${
                            editingBank.bankTypeName || ""
                          }`
                        : ""
                    }
                    disabled={!isEditing}
                    onLookup={openBankTypeModal}
                  />

                  <FieldRenderer
                    label="Bank Branch"
                    type="text"
                    labelWidth="w-40"
                    value={editingBank?.bankBranch || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankBranch: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Address 1"
                    type="text"
                    labelWidth="w-40"
                    value={editingBank?.bankAddr1 || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankAddr1: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Address 2"
                    type="text"
                    labelWidth="w-40"
                    value={editingBank?.bankAddr2 || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankAddr2: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Contact Person"
                    type="text"
                    labelWidth="w-40"
                    value={editingBank?.bankContact || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankContact: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Contact No"
                    type="text"
                    labelWidth="w-40"
                    value={editingBank?.bankTelNo || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankTelNo: val,
                      }))
                    }
                  />

                  <FieldRenderer
                    label="Position"
                    type="text"
                    labelWidth="w-40"
                    value={editingBank?.bankPosition || ""}
                    disabled={!isEditing}
                    onChange={(val) =>
                      setEditingBank((prev) => ({
                        ...(prev || {}),
                        bankPosition: val,
                      }))
                    }
                  />

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={openBankTypeModal}
                      disabled={!isEditing}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                        !isEditing
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      Update Bank Types
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* GRID */}
            <div className="global-ref-table-main-div-ui">
              <div className="global-ref-table-main-sub-div-ui">
                <div className="global-ref-table-div-ui">
                  <table className="global-ref-table-div-ui">
                    <thead className="global-ref-thead-div-ui">
                      <tr>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("bankCode");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Bank Code{" "}
                          {sortBy === "bankCode"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("bankTypeCode");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Bank Type{" "}
                          {sortBy === "bankTypeCode"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("acctCode");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Acct Code{" "}
                          {sortBy === "acctCode"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("acctName");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Account Name{" "}
                          {sortBy === "acctName"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th className="global-ref-th-ui">Bank Acct No</th>
                        <th className="global-ref-th-ui">Bank Acct Type</th>
                        <th className="global-ref-th-ui">Auto-Generated?</th>
                        <th className="global-ref-th-ui">Last Check No</th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("currCode");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Currency{" "}
                          {sortBy === "currCode"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          className="global-ref-th-ui cursor-pointer select-none"
                          onClick={() => {
                            setSortBy("bankBranch");
                            setSortDir((prev) =>
                              prev === "asc" ? "desc" : "asc"
                            );
                          }}
                        >
                          Bank Branch{" "}
                          {sortBy === "bankBranch"
                            ? sortDir === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th className="global-ref-th-ui">Address</th>
                        <th className="global-ref-th-ui">Contact Person</th>
                        <th className="global-ref-th-ui">Contact No</th>
                        <th className="global-ref-th-ui">Position</th>
                      </tr>

                      {/* Filter row */}
                      <tr>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.bankCode}
                            onChange={(e) =>
                              handleFilterChange("bankCode", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.bankTypeCode}
                            onChange={(e) =>
                              handleFilterChange("bankTypeCode", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.acctCode}
                            onChange={(e) =>
                              handleFilterChange("acctCode", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.acctName}
                            onChange={(e) =>
                              handleFilterChange("acctName", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui" />
                        <th className="global-ref-th-ui" />
                        <th className="global-ref-th-ui" />
                        <th className="global-ref-th-ui" />
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.currCode}
                            onChange={(e) =>
                              handleFilterChange("currCode", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui">
                          <input
                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                            placeholder="Contains..."
                            value={filters.bankBranch}
                            onChange={(e) =>
                              handleFilterChange("bankBranch", e.target.value)
                            }
                          />
                        </th>
                        <th className="global-ref-th-ui" />
                        <th className="global-ref-th-ui" />
                        <th className="global-ref-th-ui" />
                        <th className="global-ref-th-ui" />
                      </tr>
                    </thead>

                    <tbody>
                      {filtered.length > 0 ? (
                        filtered.map((row, index) => {
                          const selected =
                            getRowId(selectedRow) === getRowId(row);
                          const address = [row.bankAddr1, row.bankAddr2]
                            .filter(Boolean)
                            .join(", ");
                          const autoLabel =
                            row.autoCk === "N" || row.autoCk === "No"
                              ? "No"
                              : "Yes";

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
                                {row.bankCode}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.bankTypeCode}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.acctCode}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.acctName}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.bankAcctNo}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.bankAcctType}
                              </td>
                              <td className="global-ref-td-ui">
                                {autoLabel}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.lastCheckNo}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.currCode}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.bankBranch}
                              </td>
                              <td className="global-ref-td-ui">
                                {address}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.bankContact}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.bankTelNo}
                              </td>
                              <td className="global-ref-td-ui">
                                {row.bankPosition}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={14}
                            className="global-ref-norecords-ui text-center"
                          >
                            {loading ? (
                              <span className="inline-flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} spin />
                                Loading…
                              </span>
                            ) : (
                              "No records found"
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
            Showing{" "}
            <span className="font-medium">{filtered.length}</span> of{" "}
            <span className="font-medium">{banks.length}</span> bank accounts
          </div>
        </div>
      </div>
      {/* Modal for "Update Bank Types" */}
      <SearchBankRef
        isOpen={isBankTypeModalOpen}
        onClose={handleBankTypeClose}
      />
    </div>
  );
};

export default BankMast;
