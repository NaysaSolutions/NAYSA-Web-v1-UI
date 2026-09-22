import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faTrashAlt,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReset } from "@/NAYSA Cloud/Components/ResetContext.jsx";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import SearchCustMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchGlobalLookupv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import SearchVEServiceCodeRef from "@/NAYSA Cloud/Lookup/SearchVEServiceCodeRef.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import VATLookupModal from "@/NAYSA Cloud/Lookup/SearchVATRef.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalInfoAlert,
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import { useGetCurrentDayV2, useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";

import {
  docTypes,
  docTypePDFGuide,
  docTypeVideoGuide,
} from "@/NAYSA Cloud/Global/doctype";

const ENDPOINTS = {
  upsert: "/upsertCJO",
  get: "/getCJO",
  cancel: "/cancelCJO",
  history: "/getCJOHistory",
  vehicleByCustomer: "/getCJOVehicleByCustomer",
};

const getToday = () => {
  try {
    return useGetCurrentDayV2();
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

const unwrapResult = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data?.data ??
    response?.data;

  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
};

const safeNumber = (value) => {
  const parsed = parseFormattedNumber(value ?? 0);
  const numeric = Number(parsed);
  return Number.isFinite(numeric) ? numeric : 0;
};

const firstNonBlank = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
};

const createDetailRow = () => ({
  joType: "PART",
  itemNo: "",
  itemDesc: "",
  specs: "",
  uomCode: "",
  partClassCode: "",
  quantity: formatNumber(1, 6),
  sellPrice: formatNumber(0, 2),
  grossAmt: formatNumber(0, 2),
  vatCode: "",
  vatAmt: formatNumber(0, 2),
  netAmt: formatNumber(0, 2),
  unitCost: formatNumber(0, 6),
  totCost: formatNumber(0, 2),
  netProfit: formatNumber(0, 2),
  vjeLineNo: "",
  sviNo: "",
  insSiNo: "",
});

const vehicleLookupColumns = [
  { key: "plateNo", label: "Plate No.", sortable: true },
  { key: "makeName", label: "Vehicle Make", sortable: true },
  { key: "modelName", label: "Vehicle Model", sortable: true },
  { key: "vehTypeName", label: "Vehicle Type", sortable: true },
  { key: "vehClassName", label: "Vehicle Class", sortable: true },
  { key: "year", label: "Year", sortable: true },
  { key: "transmission", label: "Transmission", sortable: true },
  { key: "engineNo", label: "Engine No.", sortable: true },
  { key: "chassisNo", label: "Chassis No.", sortable: true },
  { key: "motorNo", label: "Motor No.", sortable: true },
  { key: "mvrrNo", label: "MVRR No.", sortable: true },
];


const CJO = () => {
  const location = useLocation();
  const { resetFlag } = useReset();

  const {
    currentUserRow,
    getAllTopHSDocRow,
    getAllTopVatRow,
    getAllTopVatAmount,
  } = useAuth();

  const docType = docTypes?.CJO || "CJO";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const documentTitle = hsDoc?.docName
    ? `${hsDoc.docName} Transaction`
    : "Vehicle Job Order Transaction";

  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];

  const isViewDocument =
    new URLSearchParams(location.search).get("viewDocument") === "true";

  const [topTab, setTopTab] = useState("details");

  const [state, setState] = useState({
    documentID: "",
    documentNo: "",
    documentDate: getToday(),
    documentStatus: "O",
    status: "",

    branchCode: currentUserRow?.branchCode || "",
    branchName:
      currentUserRow?.branchName ||
      currentUserRow?.BranchName ||
      "",

    vjeNo: "",

    custCode: "",
    custName: "",
    custType: "",

    plateNo: "",
    makeCode: "",
    makeName: "",
    modelCode: "",
    modelName: "",
    typeCode: "",
    typeName: "",
    vehClass: "",
    vehClassName: "",
    year: "",
    transmission: "",
    engineNo: "",
    chassisNo: "",
    motorNo: "",
    mvrrNo: "",

    dateStarted: "",
    dateDue: "",
    dateCompleted: "",

    insuranceCode: "",
    insuranceName: "",
    policyNo: "",
    claimNo: "",

    vatCode: "",
    vatName: "",

    mechanicName: "",
    contractor: "",
    sviNo: "",

    particular: "",
    stat: "",
    cancelled: "",
    noReprints: 0,

    detailRows: [],

    isLoading: false,

    branchModalOpen: false,
    customerModalOpen: false,
    vehicleModalOpen: false,
    serviceCodeModalOpen: false,
    itemLookupModalOpen: false,
    vatLookupModalOpen: false,

    vehicleOptions: [],

    showCancelModal: false,
    showAllTranDocNo: false,
    resetCancelPasswordTrigger: 0,

    selectedRowIndex: null,
    itemLookupEndPoint: "getInvLookupMS",
    itemLookupDocType: "PRMS",
  });

  const updateState = useCallback((patch) => {
    setState((prev) => ({
      ...prev,
      ...(typeof patch === "function" ? patch(prev) : patch),
    }));
  }, []);

  const {
    documentID,
    documentNo,
    documentDate,
    documentStatus,
    status,
    branchCode,
    branchName,
    vjeNo,
    custCode,
    custName,
    custType,
    plateNo,
    makeCode,
    makeName,
    modelCode,
    modelName,
    typeCode,
    typeName,
    vehClass,
    vehClassName,
    year,
    transmission,
    engineNo,
    chassisNo,
    motorNo,
    mvrrNo,
    dateStarted,
    dateDue,
    dateCompleted,
    insuranceCode,
    insuranceName,
    policyNo,
    claimNo,
    vatCode,
    vatName,
    mechanicName,
    contractor,
    particular,
    detailRows,
  } = state;

  const displayStatus =
    status ||
    (documentStatus === "C"
      ? "CLOSED"
      : documentStatus === "X"
      ? "CANCELLED"
      : "OPEN");

  const isDocumentLocked = ["CLOSED", "CANCELLED", "FINALIZED"].includes(
    String(displayStatus || "").trim().toUpperCase()
  );

  const isFormDisabled = isViewDocument || isDocumentLocked;

  const statusClass =
    String(displayStatus || "").toUpperCase() === "CANCELLED"
      ? "global-tran-stat-text-closed-ui"
      : String(displayStatus || "").toUpperCase() === "CLOSED"
      ? "global-tran-stat-text-finalized-ui"
      : "global-tran-stat-text-open-ui";

  const totals = useMemo(() => {
    const values = detailRows.reduce(
      (acc, row) => {
        acc.gross += safeNumber(row.grossAmt);
        acc.vat += safeNumber(row.vatAmt);
        acc.net += safeNumber(row.netAmt);
        acc.cost += safeNumber(row.totCost);
        acc.profit += safeNumber(row.netProfit);
        return acc;
      },
      {
        gross: 0,
        vat: 0,
        net: 0,
        cost: 0,
        profit: 0,
      }
    );

    return {
      gross: formatNumber(values.gross, 2),
      vat: formatNumber(values.vat, 2),
      net: formatNumber(values.net, 2),
      cost: formatNumber(values.cost, 2),
      profit: formatNumber(values.profit, 2),
    };
  }, [detailRows]);

  const handleReset = useCallback(() => {
    updateState({
      documentID: "",
      documentNo: "",
      documentDate: getToday(),
      documentStatus: "O",
      status: "",

      branchCode: currentUserRow?.branchCode || "",
      branchName:
        currentUserRow?.branchName ||
        currentUserRow?.BranchName ||
        "",

      vjeNo: "",

      custCode: "",
      custName: "",
      custType: "",

      plateNo: "",
      makeCode: "",
      makeName: "",
      modelCode: "",
      modelName: "",
      typeCode: "",
      typeName: "",
      vehClass: "",
      vehClassName: "",
      year: "",
      transmission: "",
      engineNo: "",
      chassisNo: "",
      motorNo: "",
      mvrrNo: "",

      dateStarted: "",
      dateDue: "",
      dateCompleted: "",

      insuranceCode: "",
      insuranceName: "",
      policyNo: "",
      claimNo: "",

      vatCode: "",
      vatName: "",

      mechanicName: "",
      contractor: "",
      sviNo: "",

      particular: "",
      stat: "",
      cancelled: "",
      noReprints: 0,

      detailRows: [],

      branchModalOpen: false,
      customerModalOpen: false,
      vehicleModalOpen: false,
        serviceCodeModalOpen: false,
      itemLookupModalOpen: false,
      vatLookupModalOpen: false,

      vehicleOptions: [],
      showCancelModal: false,
      showAllTranDocNo: false,
      resetCancelPasswordTrigger: 0,
      selectedRowIndex: null,
    });
  }, [currentUserRow, updateState]);

  useEffect(() => {
    if (resetFlag) handleReset();
  }, [handleReset, resetFlag]);

  useEffect(() => {
    const handleF1 = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };

    window.addEventListener("keydown", handleF1);
    return () => window.removeEventListener("keydown", handleF1);
  }, [updateState]);

  const calculateDetailRow = useCallback(
    (row) => {
      const quantity = safeNumber(row.quantity);
      const sellPrice = safeNumber(row.sellPrice);
      const unitCost = safeNumber(row.unitCost);

      const grossAmt = quantity * sellPrice;

      const computedVat =
        row.vatCode && getAllTopVatAmount
          ? safeNumber(getAllTopVatAmount(row.vatCode, grossAmt))
          : 0;

      const netAmt = grossAmt - computedVat;
      const totCost = quantity * unitCost;
      const netProfit = netAmt - totCost;

      return {
        ...row,
        quantity: formatNumber(quantity, 6),
        sellPrice: formatNumber(sellPrice, 2),
        grossAmt: formatNumber(grossAmt, 2),
        vatAmt: formatNumber(computedVat, 2),
        netAmt: formatNumber(netAmt, 2),
        unitCost: formatNumber(unitCost, 6),
        totCost: formatNumber(totCost, 2),
        netProfit: formatNumber(netProfit, 2),
      };
    },
    [getAllTopVatAmount]
  );

  const updateDetailRow = useCallback(
    (index, field, value, recalculate = false) => {
      updateState((prev) => {
        const rows = [...prev.detailRows];
        let row = {
          ...(rows[index] || createDetailRow()),
          [field]: value,
        };

        if (field === "vatCode" && value && typeof value === "object") {
          row.vatCode = value.vatCode || "";
        }

        if (recalculate) {
          row = calculateDetailRow(row);
        }

        rows[index] = row;

        return {
          detailRows: rows,
        };
      });
    },
    [calculateDetailRow, updateState]
  );

  const addDetailRow = (afterIndex = -1) => {
    updateState((prev) => {
      const rows = [...prev.detailRows];
      const newRow = createDetailRow();

      if (afterIndex >= 0) {
        rows.splice(afterIndex + 1, 0, newRow);
      } else {
        rows.push(newRow);
      }

      return {
        detailRows: rows,
      };
    });
  };

  const deleteDetailRow = (index) => {
    updateState((prev) => ({
      detailRows: prev.detailRows.filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const applyVehicle = useCallback(
    (vehicle = {}) => {
      updateState({
        plateNo:
          vehicle.plateNo ??
          vehicle.plate_no ??
          vehicle.PLATE_NO ??
          "",

        makeCode:
          vehicle.makeCode ??
          vehicle.make_code ??
          vehicle.MAKE_CODE ??
          "",
        makeName:
          vehicle.makeName ??
          vehicle.make_name ??
          vehicle.MAKE_NAME ??
          "",

        modelCode:
          vehicle.modelCode ??
          vehicle.model_code ??
          vehicle.MODEL_CODE ??
          "",
        modelName:
          vehicle.modelName ??
          vehicle.model_name ??
          vehicle.MODEL_NAME ??
          "",

        typeCode:
          vehicle.vehType ??
          vehicle.typeCode ??
          vehicle.veh_type ??
          vehicle.VEH_TYPE ??
          "",
        typeName: firstNonBlank(
          vehicle.vehTypeName,
          vehicle.typeName,
          vehicle.veh_type_name,
          vehicle.VEH_TYPE_NAME,
          vehicle.vehType,
          vehicle.typeCode
        ),

        vehClass:
          vehicle.vehClass ??
          vehicle.veh_class ??
          vehicle.VEH_CLASS ??
          "",
        vehClassName: firstNonBlank(
          vehicle.vehClassName,
          vehicle.veh_class_name,
          vehicle.VEH_CLASS_NAME,
          vehicle.vehClass,
          vehicle.veh_class,
          vehicle.VEH_CLASS
        ),

        year:
          vehicle.year ??
          vehicle.YEAR ??
          "",

        transmission:
          vehicle.transmission ??
          vehicle.TRANSMISSION ??
          "",

        engineNo:
          vehicle.engineNo ??
          vehicle.engine_no ??
          vehicle.ENGINE_NO ??
          "",

        chassisNo:
          vehicle.chassisNo ??
          vehicle.chassis_no ??
          vehicle.CHASSIS_NO ??
          "",

        motorNo:
          vehicle.motorNo ??
          vehicle.motor_no ??
          vehicle.MOTOR_NO ??
          "",

        mvrrNo:
          vehicle.mvrrNo ??
          vehicle.mvrr_no ??
          vehicle.MVRR_NO ??
          "",

        insuranceCode:
          vehicle.insuranceCode ??
          vehicle.insurance_code ??
          vehicle.INSURANCE_CODE ??
          "",

        insuranceName:
          vehicle.insuranceName ??
          vehicle.insurance_name ??
          vehicle.INSURANCE_NAME ??
          "",

        policyNo:
          vehicle.policyNo ??
          vehicle.policy_no ??
          vehicle.POLICY_NO ??
          "",
      });
    },
    [updateState]
  );

  const loadVehiclesByCustomer = useCallback(
    async (selectedCustCode) => {
      if (!selectedCustCode) return;

      updateState({ isLoading: true });

      try {
        const response = await apiClient.post(
          ENDPOINTS.vehicleByCustomer,
          {
            custCode: selectedCustCode,
          }
        );

        const rows =
          response?.data?.data ||
          response?.data ||
          [];

        const vehicleRows = (Array.isArray(rows) ? rows : []).map(
          (vehicle, index) => ({
            ...vehicle,
            groupId:
              String(
                vehicle.plateNo ??
                vehicle.plate_no ??
                vehicle.PLATE_NO ??
                `VEHICLE-${index + 1}`
              ).trim() || `VEHICLE-${index + 1}`,

            plateNo:
              vehicle.plateNo ??
              vehicle.plate_no ??
              vehicle.PLATE_NO ??
              "",

            makeName:
              vehicle.makeName ??
              vehicle.make_name ??
              vehicle.MAKE_NAME ??
              vehicle.makeCode ??
              "",

            modelName:
              vehicle.modelName ??
              vehicle.model_name ??
              vehicle.MODEL_NAME ??
              vehicle.modelCode ??
              "",

            vehTypeName: firstNonBlank(
              vehicle.vehTypeName,
              vehicle.typeName,
              vehicle.veh_type_name,
              vehicle.VEH_TYPE_NAME,
              vehicle.vehType,
              vehicle.typeCode
            ),

            vehClassName: firstNonBlank(
              vehicle.vehClassName,
              vehicle.veh_class_name,
              vehicle.VEH_CLASS_NAME,
              vehicle.vehClass
            ),

            year: vehicle.year ?? vehicle.YEAR ?? "",
            transmission:
              vehicle.transmission ??
              vehicle.TRANSMISSION ??
              "",
            engineNo:
              vehicle.engineNo ??
              vehicle.engine_no ??
              vehicle.ENGINE_NO ??
              "",
            chassisNo:
              vehicle.chassisNo ??
              vehicle.chassis_no ??
              vehicle.CHASSIS_NO ??
              "",
            motorNo:
              vehicle.motorNo ??
              vehicle.motor_no ??
              vehicle.MOTOR_NO ??
              "",
            mvrrNo:
              vehicle.mvrrNo ??
              vehicle.mvrr_no ??
              vehicle.MVRR_NO ??
              "",
          })
        );

        updateState({
          vehicleOptions: vehicleRows,
          vehicleModalOpen: vehicleRows.length > 0,
        });

        if (vehicleRows.length === 1) {
          applyVehicle(vehicleRows[0]);
          updateState({ vehicleModalOpen: false });
        }

        if (vehicleRows.length === 0) {
          useSwalInfoAlert(
            "Vehicle Master",
            "No vehicle setup was found for the selected customer."
          );
        }
      } catch (error) {
        console.error("CJO vehicle lookup error:", error);

        useSwalInfoAlert(
          "Vehicle Master",
          "Vehicle lookup endpoint is not yet connected."
        );
      } finally {
        updateState({ isLoading: false });
      }
    },
    [applyVehicle, updateState]
  );

  const handleCustomerSelect = async (selected) => {
    updateState({ customerModalOpen: false });

    if (!selected) return;

    const row = Array.isArray(selected?.records)
      ? selected.records[0]
      : selected?.records || selected;

    const selectedCustCode =
      row?.custCode ??
      row?.cust_code ??
      "";

    updateState({
      custCode: selectedCustCode,
      custName:
        row?.custName ??
        row?.cust_name ??
        "",
      custType:
        row?.custType ??
        row?.cust_type ??
        "",
    });

    await loadVehiclesByCustomer(selectedCustCode);
  };

  const handleVehicleSelect = (selected) => {
    const vehicle =
      Array.isArray(selected?.records)
        ? selected.records[0]
        : selected?.records || selected;

    updateState({
      vehicleModalOpen: false,
      vehicleOptions: [],
    });

    if (vehicle) {
      applyVehicle(vehicle);
    }
  };


  const openItemLookup = (index) => {
    const row = detailRows[index];

    updateState({
      selectedRowIndex: index,
      serviceCodeModalOpen:
        String(row?.joType || "").toUpperCase() === "JOB",
      itemLookupModalOpen:
        String(row?.joType || "").toUpperCase() !== "JOB",
    });
  };

  const handleServiceCodeSelect = (selected) => {
    updateState({ serviceCodeModalOpen: false });

    if (!selected || state.selectedRowIndex === null) return;

    updateDetailRow(
      state.selectedRowIndex,
      "itemNo",
      selected.serviceCode ||
        selected.code ||
        "",
      false
    );

    updateDetailRow(
      state.selectedRowIndex,
      "itemDesc",
      selected.serviceDescription ||
        selected.description ||
        "",
      false
    );
  };

  const handleItemSelect = (selected) => {
    updateState({ itemLookupModalOpen: false });

    if (!selected || state.selectedRowIndex === null) return;

    const row = Array.isArray(selected?.records)
      ? selected.records[0]
      : selected?.records || selected;

    updateState((prev) => {
      const rows = [...prev.detailRows];
      const index = prev.selectedRowIndex;

      rows[index] = {
        ...(rows[index] || createDetailRow()),
        itemNo:
          row.itemNo ??
          row.item_no ??
          "",
        itemDesc:
          row.itemDesc ??
          row.itemName ??
          row.item_desc ??
          "",
        uomCode:
          row.uomCode ??
          row.uom_code ??
          "",
        unitCost: formatNumber(
          row.unitCost ??
          row.unit_cost ??
          0,
          6
        ),
      };

      rows[index] = calculateDetailRow(rows[index]);

      return {
        detailRows: rows,
      };
    });
  };

  const handleVATSelect = (selected) => {
    updateState({ vatLookupModalOpen: false });

    if (!selected || state.selectedRowIndex === null) return;

    const vat =
      getAllTopVatRow?.(selected.vatCode) ||
      selected;

    updateState((prev) => {
      const rows = [...prev.detailRows];
      const index = prev.selectedRowIndex;

      rows[index] = calculateDetailRow({
        ...(rows[index] || createDetailRow()),
        vatCode: vat?.vatCode || "",
      });

      return {
        detailRows: rows,
      };
    });
  };


  const validateSave = async () => {
    const missing = [];

    if (!branchCode) missing.push("Branch");
    if (!documentDate) missing.push("CJO Date");
    if (!custCode) missing.push("Customer");
    if (!plateNo) missing.push("Plate No.");
    if (!detailRows.length) missing.push("At least one Job Detail");

    if (missing.length) {
      await useSwalErrorAlert(
        "Validation Error",
        `Please fill in the required field(s):\n- ${missing.join("\n- ")}`
      );
      return false;
    }

    const invalidDetail = detailRows.findIndex(
      (row) =>
        !String(row.joType || "").trim() ||
        !String(row.itemNo || "").trim() ||
        !String(row.uomCode || "").trim() ||
        safeNumber(row.quantity) <= 0
    );

    if (invalidDetail >= 0) {
      await useSwalErrorAlert(
        "Validation Error",
        `Job Detail LN # ${invalidDetail + 1} - Job Type, Item No. / JO Code, UOM and Quantity are required.`
      );
      return false;
    }

    return true;
  };

  const fetchCJO = useCallback(
    async (cjoNo, selectedBranch = branchCode, direction = "") => {
      const docNo = String(cjoNo || "").trim();
      const retrievalDirection = String(direction || "").trim();

      if ((!docNo && !retrievalDirection) || !selectedBranch) return;

      updateState({ isLoading: true });

      try {
        const response = await apiClient.post(ENDPOINTS.get, {
          branchCode: selectedBranch,
          cjoNo: docNo,
          direction: retrievalDirection,
        });

        const data = unwrapResult(response);

        if (!data || data?.result === null) {
          await useSwalErrorAlert("CJO", "Transaction does not exist.");
          return;
        }

        const header =
          typeof data === "object" && !Array.isArray(data) ? data : {};

        const loadedDetails = Array.isArray(header.dt1)
          ? header.dt1.map((row) => ({
              ...createDetailRow(),
              ...row,
              vjeLineNo: row.vjeLineNo ?? row.cjeLineNo ?? "",
              quantity: formatNumber(row.quantity || 0, 6),
              sellPrice: formatNumber(row.sellPrice || 0, 2),
              grossAmt: formatNumber(row.grossAmt || 0, 2),
              vatAmt: formatNumber(row.vatAmt || 0, 2),
              netAmt: formatNumber(row.netAmt || 0, 2),
              unitCost: formatNumber(row.unitCost || 0, 6),
              totCost: formatNumber(row.totCost || 0, 2),
              netProfit: formatNumber(row.netProfit || 0, 2),
            }))
          : [];

        const headerVat = header.vatCode
          ? getAllTopVatRow?.(header.vatCode)
          : null;

        updateState({
          documentID: header.cjoId || "",
          documentNo: header.cjoNo || docNo,
          documentDate:
            useformatToDatev2(header.cjoDate) || header.cjoDate || "",
          documentStatus: header.cjoHStatus || "O",
          status: header.cjoStatus || "",

          branchCode: header.branchCode || selectedBranch,
          branchName: header.branchName || "",

          vjeNo: header.vjeNo || header.cjeNo || "",
          custCode: header.custCode || "",
          custName: header.custName || "",
          custType: header.custType || "",

          plateNo: header.plateNo || "",
          makeCode: header.makeCode || "",
          makeName: header.makeName || "",
          modelCode: header.modelCode || "",
          modelName: header.modelName || "",
          typeCode: header.typeCode || "",
          typeName: header.typeName || "",
          vehClass: header.vehClass || "",
          vehClassName: header.vehClassName || "",
          year: header.year || "",
          transmission: header.transmission || "",
          engineNo: header.engineNo || "",
          chassisNo: header.chassisNo || "",
          motorNo: header.motorNo || "",
          mvrrNo: header.mvrrNo || "",

          dateStarted: header.dateStarted
            ? String(header.dateStarted).slice(0, 10)
            : "",
          dateDue: header.dateDue
            ? String(header.dateDue).slice(0, 10)
            : "",
          dateCompleted: header.dateCompleted
            ? String(header.dateCompleted).slice(0, 10)
            : "",

          insuranceCode: header.insuCo || "",
          insuranceName: header.insuranceName || "",
          policyNo: header.policyNo || "",
          claimNo: header.claimNo || "",

          vatCode: header.vatCode || "",
          vatName: headerVat?.vatName || headerVat?.vatDesc || "",

          mechanicName: header.mechanicName || "",
          contractor: header.contractor || "",
          sviNo: header.sviNo || "",

          particular: header.particular || "",
          stat: header.stat || "",
          cancelled: header.cancelled || "",
          noReprints: header.noReprints || 0,

          detailRows: loadedDetails,
        });
      } catch (error) {
        console.error("CJO retrieval error:", error);
        await useSwalErrorAlert(
          "CJO Retrieval",
          error?.response?.data?.message ||
            error?.response?.data?.details ||
            error?.message ||
            "Unable to retrieve CJO."
        );
      } finally {
        updateState({ isLoading: false });
      }
    },
    [branchCode, getAllTopVatRow, updateState]
  );

  const handleSave = async () => {
    if (isFormDisabled || state.isLoading) return;
    if (!(await validateSave())) return;

    updateState({ isLoading: true });

    try {
      const payload = {
        branchCode,
        cjoId: documentID || "",
        cjoNo: documentNo || "",
        cjoDate: documentDate,
        cjeNo: vjeNo || "",

        custCode,
        custType: custType || "",
        plateNo,

        dateStarted: dateStarted || null,
        dateDue: dateDue || null,
        dateCompleted: dateCompleted || null,

        insuCo: insuranceCode || insuranceName || "",
        policyNo: policyNo || "",
        claimNo: claimNo || "",

        mechanicName: mechanicName || "",
        contractor: contractor || "",
        sviNo: state.sviNo || "",
        vatCode: vatCode || "",
        particular: particular || "",

        stat: state.stat || "",
        cjoStatus: documentStatus || "O",
        cancelled: state.cancelled || "",

        userCode:
          currentUserRow?.userCode || currentUserRow?.USER_CODE || "",

        dt1: detailRows.map((row, index) => ({
          lnNo: index + 1,
          joType: row.joType || "",
          itemNo: row.itemNo || "",
          itemDesc: row.itemDesc || "",
          specs: row.specs || "",
          uomCode: row.uomCode || "",
          partClassCode: row.partClassCode || "",
          quantity: safeNumber(row.quantity),
          sellPrice: safeNumber(row.sellPrice),
          grossAmt: safeNumber(row.grossAmt),
          vatCode: row.vatCode || "",
          vatAmt: safeNumber(row.vatAmt),
          netAmt: safeNumber(row.netAmt),
          unitCost: safeNumber(row.unitCost),
          totCost: safeNumber(row.totCost),
          netProfit: safeNumber(row.netProfit),
          cjeLineNo:
            String(row.vjeLineNo ?? "").trim() === ""
              ? null
              : Number(row.vjeLineNo),
          sviNo: row.sviNo || "",
          insSiNo: row.insSiNo || "",
        })),
      };

      const response = await apiClient.post(ENDPOINTS.upsert, {
        json_data: payload,
      });

      const row =
        response?.data?.data?.[0] ||
        response?.data?.data ||
        response?.data ||
        {};

      const errorCount = Number(row?.errorCount ?? row?.errorcount ?? 0);
      const errorMessage =
        row?.errorMsg ??
        row?.errormsg ??
        response?.data?.message ??
        "";

      if (response?.data?.success === false || errorCount > 0) {
        throw new Error(errorMessage || "Failed to save CJO.");
      }

      const savedNo = row?.cjoNo ?? response?.data?.cjoNo ?? documentNo;
      const savedId = row?.cjoId ?? response?.data?.cjoId ?? documentID;

      updateState({
        documentNo: savedNo || documentNo,
        documentID: savedId || documentID,
        status: "OPEN",
      });

      await useSwalSuccessAlert(
        "Success",
        `CJO ${savedNo || documentNo || ""} saved successfully.`
      );

      if (savedNo) {
        await fetchCJO(savedNo, branchCode);
      }
    } catch (error) {
      console.error("CJO save error:", error);
      await useSwalErrorAlert(
        "CJO Save",
        error?.response?.data?.details ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save CJO."
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleDocNoBlur = () => {
    if (documentNo && branchCode) fetchCJO(documentNo, branchCode);
  };

  const handleTranDocNoRetrieval = async (data) => {
    const docNo = data?.docNo || documentNo || "";
    const direction = data?.key || "";

    if (!docNo && !direction) return;

    await fetchCJO(
      docNo,
      data?.branchCode || branchCode,
      direction
    );

    updateState({
      showAllTranDocNo: Boolean(data?.modalClose),
    });
  };

  const handleTranDocNoSelection = async (data) => {
    if (!data?.docNo) {
      updateState({ showAllTranDocNo: false });
      return;
    }

    handleReset();

    updateState({
      showAllTranDocNo: false,
      documentNo: data.docNo,
      branchCode: data.branchCode || branchCode,
    });

    await fetchCJO(
      data.docNo,
      data.branchCode || branchCode
    );
  };

  const handleCancel = () => {
    if (!documentNo || isDocumentLocked) return;

    updateState({
      showCancelModal: true,
      resetCancelPasswordTrigger: 0,
    });
  };

  const handleCloseCancel = async (confirmation) => {
    if (!confirmation) {
      updateState({ showCancelModal: false });
      return;
    }

    updateState({ isLoading: true });

    try {
      const response = await apiClient.post(ENDPOINTS.cancel, {
        json_data: {
          branchCode,
          cjoId: documentID || "",
          cjoNo: documentNo,
          userCode:
            currentUserRow?.userCode || currentUserRow?.USER_CODE || "",
          password: confirmation.password,
          reason: confirmation.reason,
        },
      });

      if (response?.data?.success === false) {
        throw new Error(
          response?.data?.message || "Failed to cancel CJO."
        );
      }

      await useSwalSuccessAlert(
        "Success",
        `CJO ${documentNo} has been cancelled.`
      );

      updateState({ showCancelModal: false });
      await fetchCJO(documentNo, branchCode);
    } catch (error) {
      await useSwalErrorAlert(
        "CJO Cancellation",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to cancel CJO."
      );

      updateState({
        resetCancelPasswordTrigger: Date.now(),
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleHistoryRowPick = async (row) => {
    const docNo = row?.docNo || row?.cjoNo;
    const rowBranch = row?.branchCode || branchCode;

    if (!docNo || !rowBranch) return;

    await fetchCJO(docNo, rowBranch);
    setTopTab("details");
  };

  const renderDateField = (id, label, value) => (
    <div className="relative w-full">
      <div
        className={`flex items-stretch global-ref-textbox-ui ${
          isFormDisabled
            ? "global-ref-textbox-disabled"
            : "global-ref-textbox-enabled"
        }`}
      >
        <DateFormatInput
          id={id}
          className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
          value={value || ""}
          disabled={isFormDisabled}
          updateState={(patch) => {
            const next =
              typeof patch === "function"
                ? patch({ [id]: value })
                : patch;

            if (next?.[id] !== undefined) {
              updateState({
                [id]: next[id],
              });
            }
          }}
        />
      </div>

      <label
        htmlFor={id}
        className="global-ref-floating-label"
      >
        {label}
      </label>
    </div>
  );

  const amountInput = (
    row,
    index,
    field,
    decimals = 2,
    readOnly = false
  ) => (
    <input
      type="text"
      className="w-full global-tran-td-inputclass-ui text-right"
      value={row[field] || ""}
      readOnly={readOnly || isFormDisabled}
      onChange={(e) => {
        const value = e.target.value.replace(/[^0-9.-]/g, "");

        updateDetailRow(index, field, value, false);
      }}
      onBlur={(e) => {
        if (readOnly || isFormDisabled) return;

        const numeric = safeNumber(e.target.value);

        updateDetailRow(
          index,
          field,
          formatNumber(numeric, decimals),
          ["quantity", "sellPrice", "unitCost"].includes(field)
        );
      }}
    />
  );

  return (
    <div className="global-tran-main-div-ui">
      {state.isLoading && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onReset={handleReset}
          onSave={handleSave}
          onCancel={handleCancel}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          isViewDocument={isViewDocument}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation
          detailsRoute="/tran/VEJO"
          isSaveDisabled={isFormDisabled || state.isLoading || detailRows.length === 0}
          isResetDisabled={state.isLoading}
          isCancelDisabled={!documentNo || isDocumentLocked}
          isAttachDisabled
          isPrintDisabled
          isNotifyDisabled
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">
              {documentTitle}
            </h1>
          </div>

          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">
                Transaction Status
              </p>
              <h1
                className={`global-tran-stat-text-ui uppercase ${statusClass}`}
              >
                {displayStatus}
              </h1>
            </div>
          </div>
        </div>

        {/* =====================================================
            HEADER
            ===================================================== */}
        <div className="global-tran-header-div-ui">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* COLUMN 1 - DOCUMENT / CUSTOMER */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={branchName || ""}
                readOnly
                disabled={isFormDisabled || !!documentNo}
                lookupDisabled={isFormDisabled || !!documentNo}
                onLookup={() =>
                  updateState({ branchModalOpen: true })
                }
              />

              <FieldRenderer
                id="cjoNo"
                label="CJO No."
                type="lookup"
                value={documentNo || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ documentNo: String(value || "").toUpperCase() })
                }
                onLookup={() => updateState({ showAllTranDocNo: true })}
                onBlur={handleDocNoBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleDocNoBlur();
                  }
                }}
              />

              {renderDateField(
                "documentDate",
                "CJO Date",
                documentDate
              )}

              <FieldRenderer
                id="vjeNo"
                label="VJE No."
                value={vjeNo || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ vjeNo: String(value || "").toUpperCase() })
                }
              />

              <div className="grid grid-cols-2 gap-2">
                <FieldRenderer
                  id="custCode"
                  label="Customer Code"
                  required
                  type="lookup"
                  value={custCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() =>
                    updateState({
                      customerModalOpen: true,
                    })
                  }
                />

                <FieldRenderer
                  id="custName"
                  label="Customer Name"
                  value={custName || ""}
                  disabled
                  readOnly
                />
              </div>

              <FieldRenderer
                id="custType"
                label="Customer Type"
                value={custType || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ custType: value })
                }
              />

              <FieldRenderer
                id="plateNo"
                label="Plate No."
                required
                type="lookup"
                value={plateNo || ""}
                readOnly
                disabled={isFormDisabled}
                lookupDisabled={
                  isFormDisabled ||
                  state.vehicleOptions.length === 0
                }
                onLookup={() =>
                  updateState({
                    vehicleModalOpen: true,
                  })
                }
              />
            </div>

            {/* COLUMN 2 - VEHICLE */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="makeName"
                label="Vehicle Make"
                value={
                  makeCode
                    ? `${makeCode}${
                        makeName ? ` - ${makeName}` : ""
                      }`
                    : makeName || ""
                }
                disabled
                readOnly
              />

              <FieldRenderer
                id="modelName"
                label="Vehicle Model"
                value={
                  modelCode
                    ? `${modelCode}${modelName ? ` - ${modelName}` : ""}`
                    : modelName || ""
                }
                disabled
                readOnly
              />

              <FieldRenderer
                id="typeName"
                label="Vehicle Type"
                value={
                  typeCode
                    ? `${typeCode}${typeName ? ` - ${typeName}` : ""}`
                    : typeName || ""
                }
                disabled
                readOnly
              />

              <FieldRenderer
                id="vehClassName"
                label="Vehicle Class"
                value={
                  vehClass
                    ? `${vehClass}${
                        vehClassName
                          ? ` - ${vehClassName}`
                          : ""
                      }`
                    : vehClassName || ""
                }
                disabled
                readOnly
              />

              <FieldRenderer
                id="year"
                label="Year"
                value={year || ""}
                disabled
                readOnly
              />

              <FieldRenderer
                id="transmission"
                label="Transmission"
                value={transmission || ""}
                disabled
                readOnly
              />

              <FieldRenderer
                id="engineNo"
                label="Engine No."
                value={engineNo || ""}
                disabled
                readOnly
              />

              <FieldRenderer
                id="chassisNo"
                label="Chassis No."
                value={chassisNo || ""}
                disabled
                readOnly
              />

              <FieldRenderer
                id="motorNo"
                label="Motor No."
                value={motorNo || ""}
                disabled
                readOnly
              />

              <FieldRenderer
                id="mvrrNo"
                label="MVRR No."
                value={mvrrNo || ""}
                disabled
                readOnly
              />
            </div>

            {/* COLUMN 3 - JOB / INSURANCE */}
            <div className="global-tran-textbox-group-div-ui">
              <div className="grid grid-cols-3 gap-2">
                {renderDateField(
                  "dateStarted",
                  "Date Started",
                  dateStarted
                )}

                {renderDateField(
                  "dateDue",
                  "Date Due",
                  dateDue
                )}

                {renderDateField(
                  "dateCompleted",
                  "Date Completed",
                  dateCompleted
                )}
              </div>

              <FieldRenderer
                id="insuranceName"
                label="Insurance Co."
                value={
                  insuranceCode
                    ? `${insuranceCode}${
                        insuranceName
                          ? ` - ${insuranceName}`
                          : ""
                      }`
                    : insuranceName || ""
                }
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({
                    insuranceName: value,
                  })
                }
              />

              <div className="grid grid-cols-2 gap-2">
                <FieldRenderer
                  id="policyNo"
                  label="Policy No."
                  value={policyNo || ""}
                  disabled={isFormDisabled}
                  onChange={(value) =>
                    updateState({ policyNo: value })
                  }
                />

                <FieldRenderer
                  id="claimNo"
                  label="Claim No."
                  value={claimNo || ""}
                  disabled={isFormDisabled}
                  onChange={(value) =>
                    updateState({ claimNo: value })
                  }
                />
              </div>

              <FieldRenderer
                id="vatCode"
                label="VAT Code"
                type="lookup"
                value={
                  vatCode
                    ? `${vatCode}${
                        vatName ? ` - ${vatName}` : ""
                      }`
                    : ""
                }
                readOnly
                disabled={isFormDisabled}
                lookupDisabled={isFormDisabled}
                onLookup={() =>
                  updateState({
                    vatLookupModalOpen: true,
                    selectedRowIndex: null,
                  })
                }
              />

              <FieldRenderer
                id="mechanicName"
                label="Mechanic"
                value={mechanicName || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({
                    mechanicName: value,
                  })
                }
              />

              <FieldRenderer
                id="contractor"
                label="Contractor"
                value={contractor || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ contractor: value })
                }
              />

              <FieldRenderer
                id="documentStatus"
                label="CJO Status"
                type="select"
                value={documentStatus || "O"}
                disabled={isFormDisabled || !documentID}
                onChange={(value) =>
                  updateState({
                    documentStatus: value,
                  })
                }
                options={[
                  { value: "O", label: "Open" },
                  { value: "C", label: "Closed" },
                  { value: "X", label: "Cancelled" },
                ]}
              />
            </div>

            {/* REMARKS */}
            <div className="col-span-full">
              <div className="relative p-2">
                <textarea
                  id="particular"
                  rows={4}
                  className="peer global-tran-textbox-remarks-ui pt-2"
                  value={particular || ""}
                  disabled={isFormDisabled}
                  onChange={(e) =>
                    updateState({
                      particular: e.target.value,
                    })
                  }
                />
                <label
                  htmlFor="particular"
                  className="global-tran-floating-label-remarks"
                >
                  Remarks
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            JOB DETAIL
            ===================================================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Job Detail
              </span>
            </div>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-[1900px] border-separate border-spacing-0">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    <th className="global-tran-th-ui w-[55px]">
                      LN
                    </th>
                    <th className="global-tran-th-ui w-[110px]">
                      Job Type
                    </th>
                    <th className="global-tran-th-ui w-[150px]">
                      Item No. / JO Code
                    </th>
                    <th className="global-tran-th-ui w-[250px]">
                      Item / JO Description
                    </th>
                    <th className="global-tran-th-ui w-[250px]">
                      Specification
                    </th>
                    <th className="global-tran-th-ui w-[90px]">
                      UOM
                    </th>
                    <th className="global-tran-th-ui w-[130px]">
                      Condition / Class
                    </th>
                    <th className="global-tran-th-ui w-[110px]">
                      Quantity
                    </th>
                    <th className="global-tran-th-ui w-[120px]">
                      Unit Price
                    </th>
                    <th className="global-tran-th-ui w-[120px]">
                      Gross Amount
                    </th>
                    <th className="global-tran-th-ui w-[100px]">
                      VAT Code
                    </th>
                    <th className="global-tran-th-ui w-[120px]">
                      VAT Amount
                    </th>
                    <th className="global-tran-th-ui w-[120px]">
                      Net Amount
                    </th>
                    <th className="global-tran-th-ui w-[120px]">
                      Unit Cost
                    </th>
                    <th className="global-tran-th-ui w-[120px]">
                      Total Cost
                    </th>
                    <th className="global-tran-th-ui w-[120px]">
                      Net Profit
                    </th>

                    {!isFormDisabled && (
                      <th className="global-tran-th-ui sticky right-0 z-10 w-[90px] bg-blue-100 dark:bg-blue-900">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {detailRows.map((row, index) => (
                    <tr
                      key={index}
                      className="global-tran-tr-ui"
                    >
                      <td className="global-tran-td-ui text-center">
                        {index + 1}
                      </td>

                      <td className="global-tran-td-ui">
                        <select
                          className="w-full global-tran-td-inputclass-ui"
                          value={row.joType || "PART"}
                          disabled={isFormDisabled}
                          onChange={(e) =>
                            updateDetailRow(
                              index,
                              "joType",
                              e.target.value,
                              false
                            )
                          }
                        >
                          <option value="PART">Part</option>
                          <option value="JOB">Job / Service</option>
                        </select>
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            className="w-full global-tran-td-inputclass-ui pr-7"
                            value={row.itemNo || ""}
                            readOnly
                          />

                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 cursor-pointer text-blue-600 hover:text-blue-900"
                              onClick={() =>
                                openItemLookup(index)
                              }
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          className="w-full global-tran-td-inputclass-ui"
                          value={row.itemDesc || ""}
                          disabled={isFormDisabled}
                          onChange={(e) =>
                            updateDetailRow(
                              index,
                              "itemDesc",
                              e.target.value,
                              false
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          className="w-full global-tran-td-inputclass-ui"
                          value={row.specs || ""}
                          disabled={isFormDisabled}
                          onChange={(e) =>
                            updateDetailRow(
                              index,
                              "specs",
                              e.target.value,
                              false
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          className="w-full global-tran-td-inputclass-ui text-center"
                          value={row.uomCode || ""}
                          disabled={isFormDisabled}
                          onChange={(e) =>
                            updateDetailRow(
                              index,
                              "uomCode",
                              e.target.value,
                              false
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        <input
                          className="w-full global-tran-td-inputclass-ui"
                          value={row.partClassCode || ""}
                          disabled={isFormDisabled}
                          onChange={(e) =>
                            updateDetailRow(
                              index,
                              "partClassCode",
                              e.target.value,
                              false
                            )
                          }
                        />
                      </td>

                      <td className="global-tran-td-ui">
                        {amountInput(
                          row,
                          index,
                          "quantity",
                          6
                        )}
                      </td>

                      <td className="global-tran-td-ui">
                        {amountInput(
                          row,
                          index,
                          "sellPrice",
                          2
                        )}
                      </td>

                      <td className="global-tran-td-ui">
                        {amountInput(
                          row,
                          index,
                          "grossAmt",
                          2,
                          true
                        )}
                      </td>

                      <td className="global-tran-td-ui relative">
                        <div className="flex items-center">
                          <input
                            className="w-full global-tran-td-inputclass-ui pr-7 text-center"
                            value={row.vatCode || ""}
                            readOnly
                          />

                          {!isFormDisabled && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute right-2 cursor-pointer text-blue-600 hover:text-blue-900"
                              onClick={() =>
                                updateState({
                                  selectedRowIndex: index,
                                  vatLookupModalOpen: true,
                                })
                              }
                            />
                          )}
                        </div>
                      </td>

                      <td className="global-tran-td-ui">
                        {amountInput(
                          row,
                          index,
                          "vatAmt",
                          2,
                          true
                        )}
                      </td>

                      <td className="global-tran-td-ui">
                        {amountInput(
                          row,
                          index,
                          "netAmt",
                          2,
                          true
                        )}
                      </td>

                      <td className="global-tran-td-ui">
                        {amountInput(
                          row,
                          index,
                          "unitCost",
                          6
                        )}
                      </td>

                      <td className="global-tran-td-ui">
                        {amountInput(
                          row,
                          index,
                          "totCost",
                          2,
                          true
                        )}
                      </td>

                      <td className="global-tran-td-ui">
                        {amountInput(
                          row,
                          index,
                          "netProfit",
                          2,
                          true
                        )}
                      </td>

                      {!isFormDisabled && (
                        <td className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              className="global-tran-td-button-add-ui"
                              onClick={() =>
                                addDetailRow(index)
                              }
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>

                            <button
                              type="button"
                              className="global-tran-td-button-delete-ui"
                              onClick={() =>
                                deleteDetailRow(index)
                              }
                            >
                              <FontAwesomeIcon
                                icon={faTrashAlt}
                              />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                type="button"
                disabled={isFormDisabled}
                className="global-tran-tab-footer-button-add-ui"
                onClick={() => addDetailRow()}
              >
                <FontAwesomeIcon
                  icon={faPlus}
                  className="mr-2"
                />
                Add
              </button>
            </div>

            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-[auto_auto] gap-1">
              <div className="global-tran-tab-footer-total-label-ui">
                Gross Amount:
              </div>
              <div className="global-tran-tab-footer-total-value-ui">
                {totals.gross}
              </div>

              <div className="global-tran-tab-footer-total-label-ui">
                VAT Amount:
              </div>
              <div className="global-tran-tab-footer-total-value-ui">
                {totals.vat}
              </div>

              <div className="global-tran-tab-footer-total-label-ui">
                Net Amount:
              </div>
              <div className="global-tran-tab-footer-total-value-ui">
                {totals.net}
              </div>

              <div className="global-tran-tab-footer-total-label-ui">
                Total Cost:
              </div>
              <div className="global-tran-tab-footer-total-value-ui">
                {totals.cost}
              </div>

              <div className="global-tran-tab-footer-total-label-ui">
                Net Profit:
              </div>
              <div className="global-tran-tab-footer-total-value-ui">
                {totals.profit}
              </div>
            </div>
          </div>
        </div>
      </div>

      {topTab === "history" && (
        <div>
          <AllTranHistory
            showHeader={false}
            isActive
            endpoint={ENDPOINTS.history}
            cacheKey={`CJO:${branchCode || ""}`}
            activeTabKey="CJO_Summary"
            branchCode={branchCode}
            status="All"
            onRowDoubleClick={handleHistoryRowPick}
            historyExportName={`${documentTitle} History`}
          />
        </div>
      )}

      {state.showCancelModal && (
        <CancelTranModal
          isOpen={state.showCancelModal}
          onClose={handleCloseCancel}
          resetPasswordTrigger={state.resetCancelPasswordTrigger}
        />
      )}

      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          params={{
            branchCode,
            branchName,
            docType,
            documentTitle,
            fieldNo: "cjoNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {/* =====================================================
          LOOKUPS
          ===================================================== */}
      {state.branchModalOpen && (
        <BranchLookupModal
          isOpen={state.branchModalOpen}
          onClose={(selected) => {
            updateState({
              branchModalOpen: false,
            });

            if (!selected) return;

            updateState({
              branchCode:
                selected.branchCode || "",
              branchName:
                selected.branchName || "",
            });
          }}
        />
      )}

      {state.customerModalOpen && (
        <SearchCustMast
          isOpen={state.customerModalOpen}
          customParam="ActiveVehicleService"
          onClose={handleCustomerSelect}
        />
      )}

      <SearchGlobalLookupv1
        isOpen={state.vehicleModalOpen}
        onClose={handleVehicleSelect}
        onCancel={() =>
          updateState({
            vehicleModalOpen: false,
            vehicleOptions: [],
          })
        }
        endpoint={vehicleLookupColumns}
        data={state.vehicleOptions}
        title={`Select Vehicle${
          custCode ? ` - ${custCode}` : ""
        }`}
        btnCaption="Select Vehicle"
        singleSelect
        modalMaxWidthClass="max-w-6xl"
        overlayZIndexClass="z-[70]"
        exportFileName="Vehicle Selection"
        preferenceKey="CJO_VehicleSelection"
      />


      {state.serviceCodeModalOpen && (
        <SearchVEServiceCodeRef
          isOpen={state.serviceCodeModalOpen}
          onClose={handleServiceCodeSelect}
        />
      )}

      {state.itemLookupModalOpen && (
        <ItemMastLookupModal
          isOpen={state.itemLookupModalOpen}
          endpoint={state.itemLookupEndPoint}
          docType={state.itemLookupDocType}
          customParam="ActiveAll"
          enableMultiSelect={false}
          onClose={handleItemSelect}
          onGetSelectedItems={handleItemSelect}
          onCancel={() =>
            updateState({
              itemLookupModalOpen: false,
              selectedRowIndex: null,
            })
          }
        />
      )}

      {state.vatLookupModalOpen && (
        <VATLookupModal
          isOpen={state.vatLookupModalOpen}
          onClose={(selected) => {
            if (state.selectedRowIndex === null) {
              updateState({
                vatLookupModalOpen: false,
              });

              if (!selected) return;

              const result =
                getAllTopVatRow?.(
                  selected.vatCode
                ) || selected;

              updateState({
                vatCode: result?.vatCode || "",
                vatName:
                  result?.vatName || "",
              });

              return;
            }

            handleVATSelect(selected);
          }}
          customParam="OutputService"
        />
      )}
    </div>
  );
};

export default CJO;
