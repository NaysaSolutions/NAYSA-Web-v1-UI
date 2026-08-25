// src/NAYSA Cloud/Master Data/VEMasterData/VEMast.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCar,
  faList,
  faTags,
  faPlus,
  faSave,
  faUndo,
  faTrash,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import {
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalErrorAlert,
  useSwalErrorAlertAPI,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import VEMast_SetupTab from "@/NAYSA Cloud/Master Data/VEMasterData/VEMast_SetupTab.jsx";
import VEMast_DataTab from "@/NAYSA Cloud/Master Data/VEMasterData/VEMast_DataTab.jsx";
import VEMast_ReferenceCodeTab from "@/NAYSA Cloud/Master Data/VEMasterData/VEMast_ReferenceCodeTab.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const parsePossibleJson = (value, fallback = []) => {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (typeof res === "string") return parsePossibleJson(res, []);
  return [];
};

const EMPTY_FORM = {
  itemCode: "",
  itemDesc: "",
  uom: "UNIT",
  categoryCode: "",
  categoryName: "",
  classCode: "",
  className: "",
  sellingPrice: "0.00",
  stdPoPrice: "0.00",
  unitCost: "0.00",
  qtyOnHand: "0.00",
  lastPurPrice: "0.00",
  lastPurCost: "0.00",
  stockValuation: "0.00",
  payeeCode: "",
  payeeName: "",
  active: "Y",
  requireModel: "Y",
  requireSerial: "Y",
  requireEngine: "Y",
  requireColor: "Y",
  requireQsCode: "Y",
  requireProdNo: "Y",
  defaultQsCode: "",
  color: "",
  colorCodes: [],
  vehicleImageBase64: "",
  removeVehicleImage: false,
  registeredBy: "",
  registeredDate: "",
  updatedBy: "",
  updatedDate: "",
  isUsed: "0",
  __isNew: false,
};

const resultFlag = (response) => {
  const row = response?.data?.data?.[0] ?? response?.data?.[0] ?? response?.data?.data ?? {};
  return String(row?.result ?? row?.Result ?? row?.isUsed ?? "0").trim();
};

const sqlResult = (response) => {
  const row = response?.data?.data?.[0] ?? response?.data?.[0] ?? response?.data ?? {};
  return {
    errorcount: Number(row?.errorcount ?? response?.data?.errorcount ?? 0),
    errormsg: String(row?.errormsg ?? response?.data?.errormsg ?? response?.data?.message ?? ""),
    generatedCode: row?.generatedCode ?? "",
  };
};

const VEMast = () => {
  const { user } = useAuth();
  const userCode = user?.USER_CODE || user?.userCode || user?.code || "";

  const { pagePermission, isReadOnly, isFullAccess, canAdd, canEdit, canSave, canDelete } =
    usePagePermission("VEMast");

  const [activeTab, setActiveTab] = useState("setup");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [rows, setRows] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const refTabRef = useRef(null);
  const [refState, setRefState] = useState({ isEditing: false, canSave: false, activeRefTab: "category" });

  const updateForm = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const loadMasterList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get("/veMast");
      setRows(extractRows(res));
    } catch (error) {
      console.error("Failed to load Vehicle Master", error);
      setRows([]);
      await useSwalErrorAlertAPI("Load Error", "Failed to load Vehicle Master data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "master") loadMasterList();
  }, [activeTab, loadMasterList]);

  const loadColorMatrix = useCallback(async (itemCode) => {
    const code = String(itemCode || "").trim();
    if (!code) return [];
    try {
      const res = await apiClient.post("/loadVEMastColorMatrix", { ITEM_CODE: code });
      const matrixRows = extractRows(res);
      return matrixRows
        .filter((row) => row.value === true || row.value === 1 || String(row.value) === "1")
        .map((row) => row.colorCode ?? row.code)
        .filter(Boolean);
    } catch (error) {
      console.error("Failed to load Vehicle Color Matrix", error);
      return [];
    }
  }, []);

  const fetchItemByCode = useCallback(async (itemCode, enterEditMode = false) => {
    const code = String(itemCode || "").trim();
    if (!code) return false;

    setIsLoading(true);
    try {
      const [itemRes, selectedColors] = await Promise.all([
        apiClient.post("/getVEMast", { ITEM_CODE: code }),
        loadColorMatrix(code),
      ]);

      const itemRows = extractRows(itemRes);
      const row = itemRows[0];
      if (!row) {
        await useSwalErrorAlert("Info", `Vehicle Item "${code}" was not found.`);
        return false;
      }

      setForm({
        ...EMPTY_FORM,
        ...row,
        itemCode: row.itemCode ?? code,
        categoryCode: row.categoryCode ?? row.categCode ?? "",
        categoryName: row.categoryName ?? row.categName ?? "",
        classCode: row.classCode ?? "",
        className: row.className ?? "",
        colorCodes: selectedColors,
        vehicleImageBase64: row.vehicleImageBase64 || "",
        removeVehicleImage: false,
        __isNew: false,
      });
      setIsEditing(Boolean(enterEditMode && canEdit && !isReadOnly));
      return true;
    } catch (error) {
      console.error("Failed to fetch Vehicle Master record", error);
      await useSwalErrorAlertAPI("Fetch Error", "Failed to retrieve Vehicle Master record.");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadColorMatrix, canEdit, isReadOnly]);

  const checkDuplicate = useCallback(async (itemCode) => {
    const code = String(itemCode || "").trim();
    if (!code || !form.__isNew) return false;
    try {
      const res = await apiClient.post("/checkVEMastDuplicate", { json_data: { itemCode: code } });
      if (resultFlag(res) === "1") {
        await useSwalErrorAlert("Duplicate Entry", `Item / Vehicle No. "${code}" already exists.`);
        updateForm({ itemCode: "" });
        return true;
      }
    } catch (error) {
      console.error("Vehicle duplicate check failed", error);
    }
    return false;
  }, [form.__isNew, updateForm]);

  const validateForm = useCallback(() => {
    const required = [
      [form.itemCode, "Item / Vehicle No"],
      [form.itemDesc, "Vehicle Description"],
      [form.uom, "UOM"],
      [form.categoryCode, "Category"],
      [form.classCode, "Classification"],
    ];
    const missing = required.filter(([value]) => !String(value ?? "").trim()).map(([, label]) => label);
    if (missing.length) return `Please fill in the required field(s):\n• ${missing.join("\n• ")}`;

    if (Number(String(form.stdPoPrice ?? 0).replace(/,/g, "")) < 0 || Number(String(form.sellingPrice ?? 0).replace(/,/g, "")) < 0) {
      return "Standard PO Price and Selling Price cannot be negative.";
    }
    return "";
  }, [form]);

  const saveItem = useCallback(async () => {
    if (!canSave || isReadOnly) {
      await useSwalErrorAlert("Read Only", "You are not allowed to save Vehicle Master changes.");
      return;
    }

    const validation = validateForm();
    if (validation) {
      await useSwalErrorAlert("Validation Error", validation);
      return;
    }

    if (form.__isNew && await checkDuplicate(form.itemCode)) return;

    setIsLoading(true);
    try {
      const payload = {
        itemCode: form.itemCode,
        itemDesc: form.itemDesc,
        uom: form.uom || "UNIT",
        categoryCode: form.categoryCode,
        classCode: form.classCode,
        sellingPrice: Number(String(form.sellingPrice ?? 0).replace(/,/g, "")),
        stdPoPrice: Number(String(form.stdPoPrice ?? 0).replace(/,/g, "")),
        payeeCode: form.payeeCode || "",
        payeeName: form.payeeName || "",
        active: form.active || "Y",
        requireModel: form.requireModel || "Y",
        requireSerial: form.requireSerial || "Y",
        requireEngine: form.requireEngine || "Y",
        requireColor: form.requireColor || "Y",
        requireQsCode: form.requireQsCode || "Y",
        requireProdNo: form.requireProdNo || "Y",
        defaultQsCode: form.defaultQsCode || "",
        color: form.color || "",
        colorCodes: (form.colorCodes || []).map((value) => typeof value === "object" ? value : { colorCode: value }),
        vehicleImageBase64: form.vehicleImageBase64 || null,
        removeVehicleImage: Boolean(form.removeVehicleImage),
        userCode,
      };

      const res = await apiClient.post("/upsertVEMast", {
        json_data: JSON.stringify({ json_data: payload }),
      });

      const result = sqlResult(res);
      if (result.errorcount > 0 || res?.data?.success === false) {
        await useSwalErrorAlert("Validation Error", result.errormsg || "Vehicle Master could not be saved.");
        return;
      }

      await useSwalSuccessAlert("Success!", `Vehicle Item "${form.itemCode}" saved successfully.`);
      await fetchItemByCode(form.itemCode, false);
      await loadMasterList();
    } catch (error) {
      await useSwalErrorAlert("Save Error", error?.response?.data?.message || error?.message || "Failed to save Vehicle Master.");
    } finally {
      setIsLoading(false);
    }
  }, [canSave, isReadOnly, validateForm, form, checkDuplicate, userCode, fetchItemByCode, loadMasterList]);

  const deleteItem = useCallback(async () => {
    if (!canDelete || isReadOnly) {
      await useSwalErrorAlert("Read Only", "You are not allowed to delete Vehicle Master records.");
      return;
    }

    const code = String(form.itemCode || "").trim();
    if (!code || form.__isNew) return;

    try {
      const usedRes = await apiClient.post("/checkVEMastInUsed", { json_data: { itemCode: code } });
      if (resultFlag(usedRes) === "1") {
        await useSwalErrorAlert("Cannot Delete", "Vehicle item is already used by a transaction. Set Active to N instead.");
        return;
      }
    } catch (error) {
      await useSwalErrorAlert("Error", "Failed to check whether the Vehicle item is in use.");
      return;
    }

    const confirm = await useSwalDeleteConfirm("Delete Vehicle Item?", `Delete Item / Vehicle No. "${code}"?`);
    if (!confirm?.isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await apiClient.post("/deleteVEMast", { json_data: { itemCode: code, userCode } });
      const result = sqlResult(res);
      if (result.errorcount > 0 || res?.data?.success === false) {
        await useSwalErrorAlert("Cannot Delete", result.errormsg || "Vehicle item could not be deleted.");
        return;
      }

      await useSwalDeleteRecord("Deleted", `Vehicle Item "${code}" removed successfully.`);
      setForm({ ...EMPTY_FORM });
      setIsEditing(false);
      await loadMasterList();
    } catch (error) {
      await useSwalErrorAlert("Delete Error", error?.response?.data?.message || error?.message || "Failed to delete Vehicle Master record.");
    } finally {
      setIsLoading(false);
    }
  }, [canDelete, isReadOnly, form, userCode, loadMasterList]);

  const handleAdd = useCallback(async () => {
    if (!canAdd || isReadOnly) {
      await useSwalErrorAlert("Read Only", "You are not allowed to add Vehicle Master records.");
      return;
    }
    setForm({ ...EMPTY_FORM, __isNew: true });
    setIsEditing(true);
    setActiveTab("setup");
  }, [canAdd, isReadOnly]);

  const handleReset = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setIsEditing(false);
  }, []);

  const tabs = useMemo(() => [
    { id: "setup", label: "Setup", icon: faCar },
    { id: "master", label: "Master Data", icon: faList },
    { id: "ref", label: "Reference Codes", icon: faTags },
  ], []);

  const baseBtn = "inline-flex items-center justify-center px-3 py-2 rounded-md text-white text-xs font-semibold transition";
  const headerButtons = useMemo(() => {
    if (activeTab === "setup") {
      return [
        { key: "add", label: <span className="hidden sm:inline ml-1">Add</span>, icon: faPlus, onClick: handleAdd, disabled: !canAdd || isLoading, className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50` },
        { key: "save", label: <span className="hidden sm:inline ml-1">Save</span>, icon: faSave, onClick: saveItem, disabled: !isEditing || !canSave || isLoading, className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50` },
        { key: "reset", label: <span className="hidden sm:inline ml-1">Reset</span>, icon: faUndo, onClick: handleReset, disabled: isLoading, className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50` },
        { key: "delete", label: <span className="hidden sm:inline ml-1">Delete</span>, icon: faTrash, onClick: deleteItem, disabled: !form.itemCode || form.__isNew || !canDelete || isLoading, className: `${baseBtn} bg-red-600 hover:bg-red-700 disabled:opacity-50` },
      ];
    }

    if (activeTab === "master") {
      return [
        { key: "refresh", label: <span className="hidden sm:inline ml-1">Refresh</span>, icon: faRotate, onClick: loadMasterList, disabled: isLoading, className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50` },
      ];
    }

    if (activeTab === "ref") {
      return [
        { key: "add", label: <span className="hidden sm:inline ml-1">Add</span>, icon: faPlus, onClick: () => refTabRef.current?.add?.(), disabled: !canAdd, className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50` },
        { key: "save", label: <span className="hidden sm:inline ml-1">Save</span>, icon: faSave, onClick: () => refTabRef.current?.save?.(), disabled: !canSave || !refState.canSave, className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50` },
        { key: "reset", label: <span className="hidden sm:inline ml-1">Reset</span>, icon: faUndo, onClick: () => refTabRef.current?.reset?.(), className: `${baseBtn} bg-blue-600 hover:bg-blue-700` },
      ];
    }

    return [];
  }, [activeTab, handleAdd, canAdd, isLoading, saveItem, isEditing, canSave, handleReset, deleteItem, form.itemCode, form.__isNew, canDelete, loadMasterList, refState.canSave]);

  return (
    <div className="global-ref-main-div-ui">
      {isLoading && <LoadingSpinner />}
      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 w-full lg:w-auto">
            <div className="flex-shrink-0 text-center lg:text-left">
              <h1 className="global-ref-headertext-ui truncate">Vehicle Master Data</h1>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <div className="flex flex-nowrap border-b border-blue-300">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold border-b-2 rounded-md ${activeTab === tab.id ? "border-blue-700 text-blue-700 bg-blue-50" : "border-transparent text-gray-500 hover:text-blue-500"}`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
            <PermissionBadge permission={pagePermission} isReadOnly={isReadOnly} isFullAccess={isFullAccess} />
            {!!headerButtons.length ? <ButtonBar buttons={headerButtons} /> : null}
          </div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui mt-36 sm:mt-32 md:mt-28 lg:mt-24" style={{ minHeight: "calc(100vh - 170px)" }}>
        {activeTab === "setup" ? (
          <VEMast_SetupTab
            form={form}
            isEditing={isEditing && isFullAccess}
            isReadOnly={isReadOnly}
            isLoading={isLoading}
            onChangeForm={updateForm}
            onBlurItemCode={checkDuplicate}
          />
        ) : null}

        {activeTab === "master" ? (
          <VEMast_DataTab
            rows={rows}
            isLoading={isLoading}
            onFilter={loadMasterList}
            onReset={loadMasterList}
            onRowDoubleClick={async (row) => {
              const code = row?.itemCode ?? row?.item_code ?? "";
              if (!code) return;
              await fetchItemByCode(code, canEdit);
              setActiveTab("setup");
            }}
          />
        ) : null}

        {activeTab === "ref" ? (
          <VEMast_ReferenceCodeTab
            ref={refTabRef}
            onStateChange={setRefState}
            isReadOnly={isReadOnly}
            canAdd={canAdd}
            canEdit={canEdit}
            canSave={canSave}
            canDelete={canDelete}
          />
        ) : null}
      </div>
    </div>
  );
};

export default VEMast;
