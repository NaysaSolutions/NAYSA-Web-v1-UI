// src/NAYSA Cloud/Master Data/VEHSVServiceMaster/VEHSVMast.jsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCarSide,
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
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import VEHSVMast_SetupTab from "@/NAYSA Cloud/Master Data/VEMasterData/VEHSVMast_SetupTab.jsx";
import VEHSVMast_DataTab from "@/NAYSA Cloud/Master Data/VEMasterData/VEHSVMast_DataTab.jsx";
import VEHSVMast_ReferenceCodeTab from "@/NAYSA Cloud/Master Data/VEMasterData/VEHSVMast_ReferenceCodeTab.jsx";

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
  plateNo: "",
  custCode: "",
  custName: "",

  vehMake: "",
  vehMakeName: "",
  vehType: "",
  vehTypeName: "",
  vehModel: "",
  vehModelName: "",
  vehClass: "",
  vehClassName: "",
  year: "",

  transmission: "",
  engineNo: "",
  chassisNo: "",
  motorNo: "",
  mvrrNo: "",
  insuranceCode: "",
  insuranceName: "",
  policyNo: "",

  registeredBy: "",
  registeredDate: "",
  updatedBy: "",
  updatedDate: "",

  __isNew: false,
};

const resultFlag = (response) => {
  const row =
    response?.data?.data?.[0] ??
    response?.data?.[0] ??
    response?.data?.data ??
    {};

  return String(row?.result ?? row?.Result ?? row?.isUsed ?? "0").trim();
};

const sqlResult = (response) => {
  const row =
    response?.data?.data?.[0] ??
    response?.data?.[0] ??
    response?.data ??
    {};

  return {
    errorcount: Number(row?.errorcount ?? response?.data?.errorcount ?? 0),
    errormsg: String(
      row?.errormsg ??
        response?.data?.errormsg ??
        response?.data?.message ??
        ""
    ),
  };
};

const VEHSVMast = () => {
  const { user } = useAuth();
  const userCode = user?.USER_CODE || user?.userCode || user?.code || "";

  const {
    pagePermission,
    isReadOnly,
    isFullAccess,
    canAdd,
    canEdit,
    canSave,
    canDelete,
  } = usePagePermission("VEHSVMast");

  const [activeTab, setActiveTab] = useState("setup");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [rows, setRows] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refTabRef = useRef(null);
  const [refState, setRefState] = useState({
    isEditing: false,
    canSave: false,
    activeRefTab: "make",
  });

  const updateForm = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const normalizeRow = useCallback((row = {}, fallbackPlate = "") => {
    return {
      ...EMPTY_FORM,
      ...row,

      plateNo:
        row.plateNo ??
        row.plate_no ??
        row.PLATE_NO ??
        fallbackPlate,

      custCode:
        row.custCode ??
        row.cust_code ??
        row.CUST_CODE ??
        "",

      custName:
        row.custName ??
        row.cust_name ??
        row.CUST_NAME ??
        "",

      vehMake:
        row.vehMake ??
        row.veh_make ??
        row.VEH_MAKE ??
        row.makeCode ??
        "",

      vehMakeName:
        row.vehMakeName ??
        row.veh_make_name ??
        row.VEH_MAKE_NAME ??
        row.makeName ??
        "",

      vehType:
        row.vehType ??
        row.veh_type ??
        row.VEH_TYPE ??
        row.typeCode ??
        "",

      vehTypeName:
        row.vehTypeName ??
        row.veh_type_name ??
        row.VEH_TYPE_NAME ??
        row.typeName ??
        "",

      vehModel:
        row.vehModel ??
        row.veh_model ??
        row.VEH_MODEL ??
        row.modelCode ??
        "",

      vehModelName:
        row.vehModelName ??
        row.veh_model_name ??
        row.VEH_MODEL_NAME ??
        row.modelName ??
        "",

      vehClass:
        row.vehClass ??
        row.veh_class ??
        row.VEH_CLASS ??
        row.classCode ??
        "",

      vehClassName:
        row.vehClassName ??
        row.veh_class_name ??
        row.VEH_CLASS_NAME ??
        row.className ??
        "",

      year: row.year ?? row.YEAR ?? "",

      transmission:
        row.transmission ??
        row.TRANSMISSION ??
        "",

      engineNo:
        row.engineNo ??
        row.engine_no ??
        row.ENGINE_NO ??
        "",

      chassisNo:
        row.chassisNo ??
        row.chassis_no ??
        row.CHASSIS_NO ??
        "",

      motorNo:
        row.motorNo ??
        row.motor_no ??
        row.MOTOR_NO ??
        "",

      mvrrNo:
        row.mvrrNo ??
        row.mvrr_no ??
        row.MVRR_NO ??
        "",

      insuranceCode:
        row.insuranceCode ??
        row.insurance_code ??
        row.INSURANCE_CODE ??
        "",

      insuranceName:
        row.insuranceName ??
        row.insurance_name ??
        row.INSURANCE_NAME ??
        row.insuranceCo ??
        "",

      policyNo:
        row.policyNo ??
        row.policy_no ??
        row.POLICY_NO ??
        "",

      registeredBy:
        row.registeredBy ??
        row.registered_by ??
        row.REGISTERED_BY ??
        "",

      registeredDate:
        row.registeredDate ??
        row.registered_date ??
        row.REGISTERED_DATE ??
        "",

      updatedBy:
        row.updatedBy ??
        row.updated_by ??
        row.UPDATED_BY ??
        "",

      updatedDate:
        row.updatedDate ??
        row.updated_date ??
        row.UPDATED_DATE ??
        "",

      __isNew: false,
    };
  }, []);

  const loadMasterList = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await apiClient.get("/veHSVMast");
      setRows(extractRows(res));
    } catch (error) {
      console.error("Failed to load Vehicle Service Master", error);
      setRows([]);
      await useSwalErrorAlertAPI(
        "Load Error",
        "Failed to load Vehicle Service Master data."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "master") loadMasterList();
  }, [activeTab, loadMasterList]);

  const fetchByPlateNo = useCallback(
    async (plateNo, enterEditMode = false) => {
      const plate = String(plateNo || "").trim();
      if (!plate) return false;

      setIsLoading(true);

      try {
        const res = await apiClient.post("/getVEHSVMast", {
          PLATE_NO: plate,
        });

        const recordRows = extractRows(res);
        const row = recordRows[0];

        if (!row) {
          await useSwalErrorAlert(
            "Info",
            `Plate No. "${plate}" was not found.`
          );
          return false;
        }

        setForm(normalizeRow(row, plate));
        setIsEditing(Boolean(enterEditMode && canEdit && !isReadOnly));
        return true;
      } catch (error) {
        console.error("Failed to fetch Vehicle Service Master record", error);
        await useSwalErrorAlertAPI(
          "Fetch Error",
          "Failed to retrieve Vehicle Service Master record."
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [canEdit, isReadOnly, normalizeRow]
  );

  const checkDuplicate = useCallback(
    async (plateNo) => {
      const plate = String(plateNo || "").trim();

      if (!plate || !form.__isNew) return false;

      try {
        const res = await apiClient.post("/checkVEHSVMastDuplicate", {
          json_data: { plateNo: plate },
        });

        if (resultFlag(res) === "1") {
          await useSwalErrorAlert(
            "Duplicate Entry",
            `Plate No. "${plate}" already exists.`
          );

          updateForm({ plateNo: "" });
          return true;
        }
      } catch (error) {
        console.error("Vehicle Service duplicate check failed", error);
      }

      return false;
    },
    [form.__isNew, updateForm]
  );

  const validateForm = useCallback(() => {
    // Required fields based on the legacy setup screen supplied:
    // Plate #, Customer Code, Customer Name, Vehicle Make,
    // Vehicle Model and Transmission.
    const required = [
      [form.plateNo, "Plate #"],
      [form.custCode, "Customer Code"],
      [form.custName, "Customer Name"],
      [form.vehMake, "Vehicle Make"],
      [form.vehModel, "Vehicle Model"],
      [form.transmission, "Transmission"],
    ];

    const missing = required
      .filter(([value]) => !String(value ?? "").trim())
      .map(([, label]) => label);

    if (missing.length) {
      return `Please fill in the required field(s):\n• ${missing.join("\n• ")}`;
    }

    if (
      form.year &&
      (!/^\d{4}$/.test(String(form.year).trim()) ||
        Number(form.year) < 1900 ||
        Number(form.year) > 2100)
    ) {
      return "Year must be a valid 4-digit year.";
    }

    return "";
  }, [form]);

  const saveRecord = useCallback(async () => {
    if (!canSave || isReadOnly) {
      await useSwalErrorAlert(
        "Read Only",
        "You are not allowed to save Vehicle Service Master changes."
      );
      return;
    }

    const validation = validateForm();

    if (validation) {
      await useSwalErrorAlert("Validation Error", validation);
      return;
    }

    if (form.__isNew && (await checkDuplicate(form.plateNo))) return;

    setIsLoading(true);

    try {
      const payload = {
        plateNo: String(form.plateNo || "").trim().toUpperCase(),
        custCode: form.custCode || "",
        custName: form.custName || "",

        vehMake: form.vehMake || "",
        vehType: form.vehType || "",
        vehModel: form.vehModel || "",
        vehClass: form.vehClass || "",
        year: form.year || "",

        transmission: form.transmission || "",
        engineNo: form.engineNo || "",
        chassisNo: form.chassisNo || "",
        motorNo: form.motorNo || "",
        mvrrNo: form.mvrrNo || "",
        insuranceCode: form.insuranceCode || "",
        insuranceName: form.insuranceName || "",
        policyNo: form.policyNo || "",

        userCode,
      };

      const res = await apiClient.post("/upsertVEHSVMast", {
        json_data: JSON.stringify({ json_data: payload }),
      });

      const result = sqlResult(res);

      if (result.errorcount > 0 || res?.data?.success === false) {
        await useSwalErrorAlert(
          "Validation Error",
          result.errormsg || "Vehicle Service Master could not be saved."
        );
        return;
      }

      await useSwalSuccessAlert(
        "Success!",
        `Plate No. "${form.plateNo}" saved successfully.`
      );

      await fetchByPlateNo(form.plateNo, false);
      await loadMasterList();
    } catch (error) {
      await useSwalErrorAlert(
        "Save Error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save Vehicle Service Master."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    canSave,
    isReadOnly,
    validateForm,
    form,
    checkDuplicate,
    userCode,
    fetchByPlateNo,
    loadMasterList,
  ]);

  const deleteRecord = useCallback(async () => {
    if (!canDelete || isReadOnly) {
      await useSwalErrorAlert(
        "Read Only",
        "You are not allowed to delete Vehicle Service Master records."
      );
      return;
    }

    const plate = String(form.plateNo || "").trim();

    if (!plate || form.__isNew) return;

    try {
      const usedRes = await apiClient.post("/checkVEHSVMastInUsed", {
        json_data: { plateNo: plate },
      });

      if (resultFlag(usedRes) === "1") {
        await useSwalErrorAlert(
          "Cannot Delete",
          "This vehicle is already used by a service transaction."
        );
        return;
      }
    } catch (error) {
      await useSwalErrorAlert(
        "Error",
        "Failed to check whether the vehicle is already in use."
      );
      return;
    }

    const confirm = await useSwalDeleteConfirm(
      "Delete Vehicle?",
      `Delete Plate No. "${plate}"?`
    );

    if (!confirm?.isConfirmed) return;

    setIsLoading(true);

    try {
      const res = await apiClient.post("/deleteVEHSVMast", {
        json_data: { plateNo: plate, userCode },
      });

      const result = sqlResult(res);

      if (result.errorcount > 0 || res?.data?.success === false) {
        await useSwalErrorAlert(
          "Cannot Delete",
          result.errormsg || "Vehicle record could not be deleted."
        );
        return;
      }

      await useSwalDeleteRecord(
        "Deleted",
        `Plate No. "${plate}" removed successfully.`
      );

      setForm({ ...EMPTY_FORM });
      setIsEditing(false);
      await loadMasterList();
    } catch (error) {
      await useSwalErrorAlert(
        "Delete Error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete Vehicle Service Master record."
      );
    } finally {
      setIsLoading(false);
    }
  }, [canDelete, isReadOnly, form, userCode, loadMasterList]);

  const handleAdd = useCallback(async () => {
    if (!canAdd || isReadOnly) {
      await useSwalErrorAlert(
        "Read Only",
        "You are not allowed to add Vehicle Service Master records."
      );
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

  const tabs = useMemo(
    () => [
      { id: "setup", label: "Vehicle Setup", icon: faCarSide },
      { id: "master", label: "Vehicle Master Data", icon: faList },
      { id: "ref", label: "Reference Codes", icon: faTags },
    ],
    []
  );

  const baseBtn =
    "inline-flex items-center justify-center px-3 py-2 rounded-md text-white text-xs font-semibold transition";

  const headerButtons = useMemo(() => {
    if (activeTab === "setup") {
      return [
        {
          key: "add",
          label: <span className="hidden sm:inline ml-1">Add</span>,
          icon: faPlus,
          onClick: handleAdd,
          disabled: !canAdd || isLoading,
          className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50`,
        },
        {
          key: "save",
          label: <span className="hidden sm:inline ml-1">Save</span>,
          icon: faSave,
          onClick: saveRecord,
          disabled: !isEditing || !canSave || isLoading,
          className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50`,
        },
        {
          key: "reset",
          label: <span className="hidden sm:inline ml-1">Reset</span>,
          icon: faUndo,
          onClick: handleReset,
          disabled: isLoading,
          className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50`,
        },
        {
          key: "delete",
          label: <span className="hidden sm:inline ml-1">Delete</span>,
          icon: faTrash,
          onClick: deleteRecord,
          disabled:
            !form.plateNo ||
            form.__isNew ||
            !canDelete ||
            isLoading,
          className: `${baseBtn} bg-red-600 hover:bg-red-700 disabled:opacity-50`,
        },
      ];
    }

    if (activeTab === "master") {
      return [
        {
          key: "refresh",
          label: <span className="hidden sm:inline ml-1">Refresh</span>,
          icon: faRotate,
          onClick: loadMasterList,
          disabled: isLoading,
          className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50`,
        },
      ];
    }

    if (activeTab === "ref") {
      return [
        {
          key: "add",
          label: <span className="hidden sm:inline ml-1">Add</span>,
          icon: faPlus,
          onClick: () => refTabRef.current?.add?.(),
          disabled: !canAdd,
          className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50`,
        },
        {
          key: "save",
          label: <span className="hidden sm:inline ml-1">Save</span>,
          icon: faSave,
          onClick: () => refTabRef.current?.save?.(),
          disabled: !canSave || !refState.canSave,
          className: `${baseBtn} bg-blue-600 hover:bg-blue-700 disabled:opacity-50`,
        },
        {
          key: "reset",
          label: <span className="hidden sm:inline ml-1">Reset</span>,
          icon: faUndo,
          onClick: () => refTabRef.current?.reset?.(),
          className: `${baseBtn} bg-blue-600 hover:bg-blue-700`,
        },
      ];
    }

    return [];
  }, [
    activeTab,
    handleAdd,
    canAdd,
    isLoading,
    saveRecord,
    isEditing,
    canSave,
    handleReset,
    deleteRecord,
    form.plateNo,
    form.__isNew,
    canDelete,
    loadMasterList,
    refState.canSave,
  ]);

  return (
    <div className="global-ref-main-div-ui">
      {isLoading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex flex-col lg:flex-row items-center gap-2 lg:gap-4 w-full lg:w-auto">
            <div className="flex-shrink-0 text-center lg:text-left">
              <h1 className="global-ref-headertext-ui truncate">
                Vehicle Service Master Data
              </h1>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <div className="flex flex-nowrap border-b border-blue-300">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold border-b-2 rounded-md ${
                      activeTab === tab.id
                        ? "border-blue-700 text-blue-700 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-blue-500"
                    }`}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
            <PermissionBadge
              permission={pagePermission}
              isReadOnly={isReadOnly}
              isFullAccess={isFullAccess}
            />

            {!!headerButtons.length ? (
              <ButtonBar buttons={headerButtons} />
            ) : null}
          </div>
        </div>
      </div>

      <div
        className="global-tran-tab-div-ui mt-36 sm:mt-32 md:mt-28 lg:mt-24"
        style={{ minHeight: "calc(100vh - 170px)" }}
      >
        {activeTab === "setup" ? (
          <VEHSVMast_SetupTab
            form={form}
            isEditing={isEditing && isFullAccess}
            isReadOnly={isReadOnly}
            isLoading={isLoading}
            onChangeForm={updateForm}
            onBlurPlateNo={checkDuplicate}
          />
        ) : null}

        {activeTab === "master" ? (
          <VEHSVMast_DataTab
            rows={rows}
            isLoading={isLoading}
            onFilter={loadMasterList}
            onReset={loadMasterList}
            onRowDoubleClick={async (row) => {
              const plate =
                row?.plateNo ??
                row?.plate_no ??
                row?.PLATE_NO ??
                "";

              if (!plate) return;

              await fetchByPlateNo(plate, canEdit);
              setActiveTab("setup");
            }}
          />
        ) : null}

        {activeTab === "ref" ? (
          <VEHSVMast_ReferenceCodeTab
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

export default VEHSVMast;
