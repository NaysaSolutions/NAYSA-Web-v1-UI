import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
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
import SearchVEMakeRef from "@/NAYSA Cloud/Lookup/SearchVEMakeRef.jsx";
import SearchVEModelRef from "@/NAYSA Cloud/Lookup/SearchVEModelRef.jsx";
import SearchVETypeRef from "@/NAYSA Cloud/Lookup/SearchVETypeRef.jsx";
import SearchVEServiceTypeRef from "@/NAYSA Cloud/Lookup/SearchVEServiceTypeRef.jsx";
import SearchVEServiceCodeRef from "@/NAYSA Cloud/Lookup/SearchVEServiceCodeRef.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import VATLookupModal from "@/NAYSA Cloud/Lookup/SearchVATRef.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "@/NAYSA Cloud/Lookup/SearchDocNo.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";

import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates";

import {
  docTypes,
  docTypePDFGuide,
  docTypeVideoGuide,
} from "@/NAYSA Cloud/Global/doctype";

/* ============================================================
   MJO API ENDPOINTS

   These are the endpoints expected by this interface.
   Backend/controller can be created next using sproc_PHP_MJO.
   ============================================================ */

const ENDPOINTS = {
  upsert: "/upsertMJO",
  get: "/getMJO",
  cancel: "/cancelMJO",
  history: "/getMJOHistory",
  vehicleByCustomer: "/getMJOVehicleByCustomer",
};

/* ============================================================
   HELPERS
   ============================================================ */

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

const normalizeLookupRows = (payload) => {
  const value =
    payload?.data?.data ??
    payload?.data ??
    payload;

  const parsed =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return [];
          }
        })()
      : value;

  if (Array.isArray(parsed)) return parsed;

  const result = parsed?.[0]?.result;
  if (typeof result === "string") {
    try {
      return JSON.parse(result) || [];
    } catch {
      return [];
    }
  }

  return [];
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

const safeNumber = (value) => {
  const parsed = parseFormattedNumber(value ?? 0);
  return Number.isFinite(Number(parsed)) ? Number(parsed) : 0;
};

const makeServiceRow = () => ({
  joStatus: "O",
  serviceType: "",
  serviceCode: "",
  serviceDescription: "",
  specs: "",
  amount: formatNumber(0),
  discRate: formatNumber(0),
  discAmt: formatNumber(0),
  netAmt: formatNumber(0),
  vatCode: "",
  vatDesc: "",
  vatAmt: formatNumber(0),
  cwtCode: "",
  cwtDesc: "",
  cwtAmt: formatNumber(0),
  totParts: formatNumber(0),
  isParts: formatNumber(0),
});

const makePartRow = () => ({
  serviceCode: "",
  joStatus: "O",
  invType: "MS",
  itemNo: "",
  itemDesc: "",
  uomCode: "",
  quantity: formatNumber(1, 6),
  isQty: formatNumber(0, 6),
  remarks: "",
  retQty: formatNumber(0, 6),
  sellPrice: formatNumber(0),
});

const vehicleLookupColumns = [
  {
    key: "plateNo",
    label: "Plate No.",
    sortable: true,
  },
  {
    key: "makeName",
    label: "Vehicle Make",
    sortable: true,
  },
  {
    key: "modelName",
    label: "Vehicle Model",
    sortable: true,
  },
  {
    key: "vehTypeName",
    label: "Vehicle Type",
    sortable: true,
  },
  {
    key: "year",
    label: "Year",
    sortable: true,
  },
  {
    key: "transmission",
    label: "Transmission",
    sortable: true,
  },
  {
    key: "engineNo",
    label: "Engine No.",
    sortable: true,
  },
  {
    key: "chassisNo",
    label: "Chassis No.",
    sortable: true,
  },
];


/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const MJO = () => {
  const location = useLocation();
  const { resetFlag } = useReset();
  const {
    companyInfo,
    currentUserRow,
    getAllTopHSDocRow,
    getAllTopVatRow,
    getAllTopVatAmount,
  } = useAuth();

  const docType = docTypes?.MJO || "MJO";
  const hsDoc = getAllTopHSDocRow?.(docType) || {};
  const documentTitle =
    hsDoc?.docName
      ? `${hsDoc.docName} Transaction`
      : "Vehicle Job Order (Motorcycle) Transaction";

  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];

  const [topTab, setTopTab] = useState("details");
  const [backgroundLoadingCount, setBackgroundLoadingCount] = useState(0);

  const startBackgroundLoading = useCallback(() => {
    setBackgroundLoadingCount((prev) => prev + 1);
  }, []);

  const stopBackgroundLoading = useCallback(() => {
    setBackgroundLoadingCount((prev) => Math.max(0, prev - 1));
  }, []);

  const [state, setState] = useState({
    documentNo: "",
    documentDate: getToday(),
    documentStatus: "O",
    status: "",
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || currentUserRow?.BranchName || "",

    custCode: "",
    custName: "",
    custAddr1: "",
    custAddr2: "",
    custAddr3: "",
    custVatCode: "",

    plateNo: "",
    kmReading: "0",
    mechanicName: "",

    makeCode: "",
    makeName: "",
    modelCode: "",
    modelName: "",
    typeCode: "",
    typeName: "",
    serviceType: "",
    serviceTypeName: "",

    estPrice: formatNumber(0),
    engineNo: "",
    dateStarted: "",
    dateEnd: "",
    timeStart: "",
    timeEnd: "",

    particular: "",
    cancelled: "",
    sviNo: "",
    repCode3: "",
    refMjoNo: "",
    noReprints: 0,

    serviceRows: [],
    partRows: [],

    isLoading: false,
    isFetchDisabled: false,

    branchModalOpen: false,
    customerModalOpen: false,
    makeModalOpen: false,
    modelModalOpen: false,
    typeModalOpen: false,
    serviceTypeModalOpen: false,
    serviceCodeModalOpen: false,
    vatLookupModalOpen: false,
    itemLookupModalOpen: false,
    showCancelModal: false,
    showAllTranDocNo: false,
    resetCancelPasswordTrigger: 0,

    vehicleSelectionModalOpen: false,
    vehicleOptions: [],

    selectedServiceIndex: null,
    selectedPartServiceIndex: null,
    selectedPartIndex: null,
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
    documentNo,
    documentDate,
    documentStatus,
    status,
    branchCode,
    branchName,
    custCode,
    custName,
    custAddr1,
    custAddr2,
    custAddr3,
    custVatCode,
    plateNo,
    kmReading,
    mechanicName,
    makeCode,
    makeName,
    modelCode,
    modelName,
    typeCode,
    typeName,
    serviceType,
    serviceTypeName,
    estPrice,
    engineNo,
    dateStarted,
    dateEnd,
    timeStart,
    timeEnd,
    particular,
    cancelled,
    sviNo,
    serviceRows,
    partRows,
  } = state;

  const isLoading =
    state.isLoading || backgroundLoadingCount > 0;

  const displayStatus =
    status ||
    (documentStatus === "C"
      ? "CLOSED"
      : documentStatus === "X"
      ? "CANCELLED"
      : "OPEN");

  const isDocumentLocked =
    ["CLOSED", "CANCELLED", "FINALIZED"].includes(
      String(displayStatus || "").trim().toUpperCase()
    );

  const isViewDocument =
    new URLSearchParams(location.search).get("viewDocument") === "true";

  const isFormDisabled = isDocumentLocked || isViewDocument;

  const statusClass =
    String(displayStatus || "").toUpperCase() === "CANCELLED"
      ? "global-tran-stat-text-closed-ui"
      : String(displayStatus || "").toUpperCase() === "CLOSED"
      ? "global-tran-stat-text-finalized-ui"
      : "global-tran-stat-text-open-ui";

  /* ============================================================
     TOTALS
     ============================================================ */

  const totals = useMemo(() => {
    const serviceAmount = serviceRows.reduce(
      (sum, row) => sum + safeNumber(row.amount),
      0
    );
    const serviceNet = serviceRows.reduce(
      (sum, row) => sum + safeNumber(row.netAmt),
      0
    );
    const vat = serviceRows.reduce(
      (sum, row) => sum + safeNumber(row.vatAmt),
      0
    );
    const cwt = serviceRows.reduce(
      (sum, row) => sum + safeNumber(row.cwtAmt),
      0
    );
    const parts = partRows.reduce(
      (sum, row) =>
        sum + safeNumber(row.quantity) * safeNumber(row.sellPrice),
      0
    );

    return {
      amount: formatNumber(serviceAmount),
      net: formatNumber(serviceNet),
      vat: formatNumber(vat),
      cwt: formatNumber(cwt),
      parts: formatNumber(parts),
      payable: formatNumber(serviceNet + vat + parts - cwt),
    };
  }, [partRows, serviceRows]);

  /* ============================================================
     RESET
     ============================================================ */

  const handleReset = useCallback(() => {
    updateState({
      documentNo: "",
      documentDate: getToday(),
      documentStatus: "O",
      status: "",
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || currentUserRow?.BranchName || "",

      custCode: "",
      custName: "",
      custAddr1: "",
      custAddr2: "",
      custAddr3: "",
      custVatCode: "",

      plateNo: "",
      kmReading: "0",
      mechanicName: "",

      makeCode: "",
      makeName: "",
      modelCode: "",
      modelName: "",
      typeCode: "",
      typeName: "",
      serviceType: "",
      serviceTypeName: "",

      estPrice: formatNumber(0),
      engineNo: "",
      dateStarted: "",
      dateEnd: "",
      timeStart: "",
      timeEnd: "",

      particular: "",
      cancelled: "",
      sviNo: "",
      repCode3: "",
      refMjoNo: "",
      noReprints: 0,

      serviceRows: [],
      partRows: [],

      vehicleSelectionModalOpen: false,
      vehicleOptions: [],
      itemLookupModalOpen: false,
      showCancelModal: false,
      showAllTranDocNo: false,
      resetCancelPasswordTrigger: 0,

      selectedServiceIndex: null,
      selectedPartServiceIndex: null,
      selectedPartIndex: null,
      itemLookupEndPoint: "getInvLookupMS",
      itemLookupDocType: "PRMS",

      isFetchDisabled: false,
    });

  }, [currentUserRow, updateState]);

  useEffect(() => {
    if (resetFlag) handleReset();
  }, [handleReset, resetFlag]);

  /* ============================================================
     F1 - DOCUMENT LOOKUP
     ============================================================ */

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

  /* ============================================================
     CUSTOMER / VEHICLE LOOKUPS
     ============================================================ */

  const applyVehicleMaster = useCallback(
    (vehicle = {}) => {
      updateState({
        custAddr1:
          vehicle.custAddr1 ??
          vehicle.cust_addr1 ??
          vehicle.CUST_ADDR1 ??
          "",
        custAddr2:
          vehicle.custAddr2 ??
          vehicle.cust_addr2 ??
          vehicle.CUST_ADDR2 ??
          "",
        custAddr3:
          vehicle.custAddr3 ??
          vehicle.cust_addr3 ??
          vehicle.CUST_ADDR3 ??
          "",
        custVatCode:
          vehicle.vatCode ??
          vehicle.vat_code ??
          vehicle.VAT_CODE ??
          "",

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
          vehicle.typeCode,
          vehicle.veh_type,
          vehicle.VEH_TYPE
        ),

        engineNo:
          vehicle.engineNo ??
          vehicle.engine_no ??
          vehicle.ENGINE_NO ??
          "",
      });
    },
    [updateState]
  );

  const loadVehicleMasterByCustomer = useCallback(
    async (selectedCustCode) => {
      const code = String(selectedCustCode || "").trim();

      if (!code) return;

      updateState({
        plateNo: "",
        makeCode: "",
        makeName: "",
        modelCode: "",
        modelName: "",
        typeCode: "",
        typeName: "",
        engineNo: "",
        vehicleSelectionModalOpen: false,
        vehicleOptions: [],
      });

      let rows = [];

      startBackgroundLoading();

      try {
        const response = await apiClient.post(
          ENDPOINTS.vehicleByCustomer,
          {
            custCode: code,
          }
        );

        rows = Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
      } catch (error) {
        console.error(
          "Failed to load Vehicle Service Master by customer:",
          error
        );

        await useSwalErrorAlert(
          "Vehicle Master",
          error?.response?.data?.message ||
            error?.message ||
            "Unable to retrieve the customer's vehicle setup."
        );

        return;
      } finally {
        stopBackgroundLoading();
      }

      if (rows.length === 0) {
        await Swal.fire({
          icon: "info",
          title: "Vehicle Master",
          text: `No Vehicle Service Master setup was found for customer ${code}.`,
        });
        return;
      }

      const vehicleRows = rows.map((vehicle, index) => ({
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
          vehicle.make_code ??
          vehicle.MAKE_CODE ??
          "",

        modelName:
          vehicle.modelName ??
          vehicle.model_name ??
          vehicle.MODEL_NAME ??
          vehicle.modelCode ??
          vehicle.model_code ??
          vehicle.MODEL_CODE ??
          "",

        vehTypeName: firstNonBlank(
          vehicle.vehTypeName,
          vehicle.veh_type_name,
          vehicle.VEH_TYPE_NAME,
          vehicle.vehType,
          vehicle.veh_type,
          vehicle.VEH_TYPE
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
      }));

      updateState({
        vehicleOptions: vehicleRows,
        vehicleSelectionModalOpen: true,
      });
    },
    [
      startBackgroundLoading,
      stopBackgroundLoading,
      updateState,
    ]
  );


  const handleVehicleLookupClose = (selected) => {
    const vehicle =
      Array.isArray(selected?.records)
        ? selected.records[0]
        : selected?.records || null;

    updateState({
      vehicleSelectionModalOpen: false,
      vehicleOptions: [],
    });

    if (!vehicle) return;

    applyVehicleMaster(vehicle);
  };

  const handleVehicleLookupCancel = () => {
    updateState({
      vehicleSelectionModalOpen: false,
      vehicleOptions: [],
    });
  };

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
      custName: row?.custName ?? row?.cust_name ?? "",
      custAddr1:
        row?.addr1 ??
        row?.address1 ??
        row?.custAddr1 ??
        row?.cust_addr1 ??
        row?.addr ??
        "",
      custAddr2:
        row?.addr2 ??
        row?.address2 ??
        row?.custAddr2 ??
        row?.cust_addr2 ??
        "",
      custAddr3:
        row?.addr3 ??
        row?.address3 ??
        row?.custAddr3 ??
        row?.cust_addr3 ??
        "",
    });

    await loadVehicleMasterByCustomer(selectedCustCode);
  };

  const handleMakeSelect = (selected) => {
    updateState({ makeModalOpen: false });
    if (!selected) return;

    updateState({
      makeCode: selected.code ?? selected.makeCode ?? "",
      makeName: selected.description ?? selected.makeName ?? "",
      modelCode: "",
      modelName: "",
    });
  };

  const handleModelSelect = (selected) => {
    updateState({ modelModalOpen: false });
    if (!selected) return;

    updateState({
      modelCode: selected.code ?? selected.modelCode ?? "",
      modelName: selected.description ?? selected.modelName ?? "",
    });
  };

  const handleTypeSelect = (selected) => {
    updateState({ typeModalOpen: false });
    if (!selected) return;

    updateState({
      typeCode: selected.code ?? selected.typeCode ?? "",
      typeName: selected.description ?? selected.typeName ?? "",
    });
  };

  const handleServiceTypeSelect = (selected) => {
    updateState({ serviceTypeModalOpen: false });
    if (!selected) return;

    updateState({
      serviceType:
        selected.serviceTypeCode ??
        selected.code ??
        "",
      serviceTypeName:
        selected.serviceTypeName ??
        selected.description ??
        "",
    });
  };

  /* ============================================================
     SERVICE DETAIL
     ============================================================ */

  const addServiceRow = (afterIndex = null) => {
    if (isFormDisabled) return;

    const defaultVat =
      custVatCode && getAllTopVatRow
        ? getAllTopVatRow(custVatCode)
        : null;

    const row = {
      ...makeServiceRow(),
      serviceType: serviceType || "",
      vatCode: custVatCode || "",
      vatDesc:
        defaultVat?.vatName ??
        defaultVat?.vatDesc ??
        "",
    };

    updateState((prev) => {
      const rows = [...prev.serviceRows];

      if (afterIndex === null || afterIndex < 0 || afterIndex >= rows.length) {
        rows.push(row);
      } else {
        rows.splice(afterIndex + 1, 0, row);
      }

      return { serviceRows: rows };
    });
  };

  const deleteServiceRow = (index) => {
    if (isFormDisabled) return;
    updateState((prev) => ({
      serviceRows: prev.serviceRows.filter((_, i) => i !== index),
    }));
  };

  const updateServiceRow = (index, field, value, calculate = true) => {
    updateState((prev) => {
      const rows = [...prev.serviceRows];
      let row = { ...rows[index], [field]: value };

      if (calculate) {
        const amount = safeNumber(row.amount);
        let discRate = safeNumber(row.discRate);
        let discAmt = safeNumber(row.discAmt);

        if (field === "discRate" || field === "amount") {
          discAmt = amount * (discRate / 100);
        } else if (field === "discAmt") {
          discRate = amount > 0 ? (discAmt / amount) * 100 : 0;
        }

        const totalAfterDiscount = Math.max(0, amount - discAmt);
        const vatAmt = row.vatCode
          ? safeNumber(getAllTopVatAmount?.(row.vatCode, totalAfterDiscount))
          : safeNumber(row.vatAmt);

        row = {
          ...row,
          amount: formatNumber(amount),
          discRate: formatNumber(discRate),
          discAmt: formatNumber(discAmt),
          netAmt: formatNumber(totalAfterDiscount),
          vatAmt: formatNumber(vatAmt),
        };
      }

      rows[index] = row;
      return { serviceRows: rows };
    });
  };

  const handleServiceCodeSelect = (selected) => {
    const serviceIndex = state.selectedServiceIndex;
    const partIndex = state.selectedPartServiceIndex;

    updateState({
      serviceCodeModalOpen: false,
      selectedServiceIndex: null,
      selectedPartServiceIndex: null,
    });

    if (!selected) return;

    const selectedServiceCode =
      selected.serviceCode ??
      selected.code ??
      "";

    if (serviceIndex !== null) {
      updateServiceRow(
        serviceIndex,
        "serviceCode",
        selectedServiceCode,
        false
      );

      updateServiceRow(
        serviceIndex,
        "serviceDescription",
        selected.serviceDescription ??
          selected.description ??
          "",
        false
      );

      return;
    }

    if (partIndex !== null) {
      updatePartRow(
        partIndex,
        "serviceCode",
        selectedServiceCode
      );
    }
  };

  const handleVATSelect = (selectedVat) => {
    const index = state.selectedServiceIndex;
    updateState({ vatLookupModalOpen: false, selectedServiceIndex: null });

    if (!selectedVat || index === null) return;

    const vatRow =
      getAllTopVatRow?.(selectedVat.vatCode) ||
      selectedVat;

    updateServiceRow(index, "vatCode", vatRow?.vatCode || "", false);
    updateServiceRow(index, "vatDesc", vatRow?.vatName || vatRow?.vatDesc || "", false);

    const row = state.serviceRows[index];
    const base = Math.max(
      0,
      safeNumber(row?.amount) - safeNumber(row?.discAmt)
    );

    const vatAmt = vatRow?.vatCode
      ? safeNumber(getAllTopVatAmount?.(vatRow.vatCode, base))
      : 0;

    updateServiceRow(index, "vatAmt", formatNumber(vatAmt), false);
  };

  /* ============================================================
     PARTS DETAIL
     ============================================================ */

  const addPartRow = (afterIndex = null) => {
    if (isFormDisabled) return;

    updateState((prev) => {
      const rows = [...prev.partRows];
      const row = makePartRow();

      if (afterIndex === null || afterIndex < 0 || afterIndex >= rows.length) {
        rows.push(row);
      } else {
        rows.splice(afterIndex + 1, 0, row);
      }

      return { partRows: rows };
    });
  };

  const deletePartRow = (index) => {
    if (isFormDisabled) return;
    updateState((prev) => ({
      partRows: prev.partRows.filter((_, i) => i !== index),
    }));
  };

  const updatePartRow = (index, field, value) => {
    updateState((prev) => {
      const rows = [...prev.partRows];
      rows[index] = {
        ...rows[index],
        [field]: value,
      };
      return { partRows: rows };
    });
  };

  const openPartItemLookup = (index) => {
    if (isFormDisabled) return;

    const invType = String(
      state.partRows?.[index]?.invType || "MS"
    )
      .trim()
      .toUpperCase();

    const supportedInvType =
      ["MS", "FG", "RM"].includes(invType)
        ? invType
        : "MS";

    updateState({
      selectedPartIndex: index,
      itemLookupModalOpen: true,
      itemLookupEndPoint: `getInvLookup${supportedInvType}`,
      itemLookupDocType: `PR${supportedInvType}`,
    });
  };

  const handlePartItemSelect = (selected) => {
    const index = state.selectedPartIndex;

    const item =
      Array.isArray(selected?.records)
        ? selected.records[0]
        : selected?.records || selected;

    updateState({
      itemLookupModalOpen: false,
      selectedPartIndex: null,
    });

    if (!item || index === null) return;

    updateState((prev) => {
      const rows = [...prev.partRows];
      const currentRow = rows[index] || {};

      rows[index] = {
        ...currentRow,

        itemNo:
          item.itemCode ??
          item.itemNo ??
          item.code ??
          "",

        itemDesc:
          item.itemName ??
          item.itemDesc ??
          item.description ??
          item.name ??
          "",

        uomCode:
          item.uomCode ??
          item.uom ??
          item.stockUom ??
          currentRow.uomCode ??
          "",
      };

      return {
        partRows: rows,
      };
    });
  };

  /* ============================================================
     SAVE
     ============================================================ */

  const validateSave = async () => {
    const missing = [];

    if (!branchCode) missing.push("Branch");
    if (!documentDate) missing.push("MJO Date");
    if (!custCode) missing.push("Customer");
    if (!plateNo) missing.push("Plate No.");
    if (!makeCode) missing.push("Vehicle Make");
    if (!modelCode) missing.push("Vehicle Model");
    if (!typeCode) missing.push("Vehicle Type");
    if (!serviceType) missing.push("Service Type");
    if (!serviceRows.length) missing.push("At least one Job Estimate Detail");

    if (missing.length) {
      await useSwalErrorAlert(
        "Validation Error",
        `Please fill in the required field(s):\n- ${missing.join("\n- ")}`
      );
      return false;
    }

    const invalidService = serviceRows.findIndex(
      (row) => !String(row.serviceCode || "").trim()
    );

    if (invalidService >= 0) {
      await useSwalErrorAlert(
        "Validation Error",
        `Service Detail LN # ${invalidService + 1} - Service Code is required.`
      );
      return false;
    }

    const invalidPart = partRows.findIndex(
      (row) =>
        !String(row.itemNo || "").trim() ||
        safeNumber(row.quantity) <= 0
    );

    if (invalidPart >= 0) {
      await useSwalErrorAlert(
        "Validation Error",
        `Parts Detail LN # ${invalidPart + 1} - Item No. and Quantity are required.`
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (isFormDisabled || isLoading) return;
    if (!(await validateSave())) return;

    updateState({ isLoading: true });

    try {
      const payload = {
        branchCode,
        mjoNo: documentNo || "",
        mjoDate: documentDate,

        custCode,
        custName,
        custAddr1,
        custAddr2,
        custAddr3,

        plateNo,
        kmReading: safeNumber(kmReading),
        mechanicName,

        makeCode,
        modelCode,
        typeCode,
        serviceType,

        estPrice: safeNumber(estPrice),
        engineNo,

        dateStarted: dateStarted || null,
        dateEnd: dateEnd || null,
        timeStart: timeStart || "",
        timeEnd: timeEnd || "",

        particular,
        joStatus: documentStatus || "O",
        cancelled: cancelled || "",

        sviNo: sviNo || "",
        repCode3: state.repCode3 || "",
        refMjoNo: state.refMjoNo || "",
        userCode: currentUserRow?.userCode || currentUserRow?.USER_CODE || "",

        dt1: partRows.map((row, index) => ({
          lnNo: index + 1,
          serviceCode: row.serviceCode || "",
          joStatus: row.joStatus || documentStatus || "O",
          invType: row.invType || "",
          itemNo: row.itemNo || "",
          itemDesc: row.itemDesc || "",
          uomCode: row.uomCode || "",
          quantity: safeNumber(row.quantity),
          isQty: safeNumber(row.isQty),
          remarks: row.remarks || "",
          retQty: safeNumber(row.retQty),
          sellPrice: safeNumber(row.sellPrice),
        })),

        dt2: serviceRows.map((row, index) => ({
          lnNo: index + 1,
          joStatus: row.joStatus || documentStatus || "O",
          serviceCode: row.serviceCode || "",
          serviceDescription: row.serviceDescription || "",
          specs: row.specs || "",
          amount: safeNumber(row.amount),
          discRate: safeNumber(row.discRate),
          discAmt: safeNumber(row.discAmt),
          netAmt: safeNumber(row.netAmt),
          vatCode: row.vatCode || "",
          vatDesc: row.vatDesc || "",
          vatAmt: safeNumber(row.vatAmt),
          cwtCode: row.cwtCode || "",
          cwtDesc: row.cwtDesc || "",
          cwtAmt: safeNumber(row.cwtAmt),
          totParts: safeNumber(row.totParts),
          isParts: safeNumber(row.isParts),
          serviceType: row.serviceType || serviceType || "",
        })),
      };

      const response = await apiClient.post(ENDPOINTS.upsert, {
        json_data: payload,
      });

      const row = response?.data?.data?.[0] || response?.data?.data || response?.data || {};
      const errorCount = Number(row?.errorCount ?? row?.errorcount ?? 0);
      const errorMessage =
        row?.errorMsg ??
        row?.errormsg ??
        response?.data?.message ??
        "";

      if (response?.data?.success === false || errorCount > 0) {
        throw new Error(errorMessage || "Failed to save MJO.");
      }

      const savedNo =
        row?.mjoNo ??
        response?.data?.mjoNo ??
        documentNo;

      updateState({
        documentNo: savedNo || documentNo,
        status: "OPEN",
      });

      await useSwalSuccessAlert(
        "Success",
        `MJO ${savedNo || documentNo || ""} saved successfully.`
      );

      if (savedNo) {
        await fetchMJO(savedNo, branchCode);
      }
    } catch (error) {
      console.error("MJO save error:", error);
      await useSwalErrorAlert(
        "MJO Save",
        error?.response?.data?.details ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save MJO."
      );
    } finally {
      updateState({ isLoading: false });
    }
  };

  /* ============================================================
     FETCH
     ============================================================ */

  const fetchMJO = useCallback(
    async (mjoNo, selectedBranch = branchCode, direction = "") => {
      const docNo = String(mjoNo || "").trim();
      const retrievalDirection = String(direction || "").trim();

      if ((!docNo && !retrievalDirection) || !selectedBranch) return;

      updateState({ isLoading: true });

      try {
        const response = await apiClient.post(ENDPOINTS.get, {
          branchCode: selectedBranch,
          mjoNo: docNo,
          direction: retrievalDirection,
        });

        const data = unwrapResult(response);

        if (!data || data?.result === null) {
          await useSwalErrorAlert("MJO", "Transaction does not exist.");
          return;
        }

        const header =
          typeof data === "object" && !Array.isArray(data)
            ? data
            : {};

        const loadedServices = Array.isArray(header.dt2)
          ? header.dt2.map((row) => ({
              ...makeServiceRow(),
              ...row,
              amount: formatNumber(row.amount || 0),
              discRate: formatNumber(row.discRate || 0),
              discAmt: formatNumber(row.discAmt || 0),
              netAmt: formatNumber(row.netAmt || 0),
              vatAmt: formatNumber(row.vatAmt || 0),
              cwtAmt: formatNumber(row.cwtAmt || 0),
              totParts: formatNumber(row.totParts || 0),
              isParts: formatNumber(row.isParts || 0),
            }))
          : [];

        const loadedParts = Array.isArray(header.dt1)
          ? header.dt1.map((row) => ({
              ...makePartRow(),
              ...row,
              quantity: formatNumber(row.quantity || 0, 6),
              isQty: formatNumber(row.isQty || 0, 6),
              retQty: formatNumber(row.retQty || 0, 6),
              sellPrice: formatNumber(row.sellPrice || 0),
            }))
          : [];

        updateState({
          documentNo: header.mjoNo || docNo,
          documentDate: useformatToDatev2(header.mjoDate) || header.mjoDate || "",
          documentStatus: header.joHStatus || header.joStatus || "O",
          status: header.mjoStatus || "",

          branchCode: header.branchCode || selectedBranch,
          branchName: header.branchName || "",

          custCode: header.custCode || "",
          custName: header.custName || "",
          custAddr1: header.custAddr1 || "",
          custAddr2: header.custAddr2 || "",
          custAddr3: header.custAddr3 || "",

          plateNo: header.plateNo || "",
          kmReading: String(header.kmReading ?? 0),
          mechanicName: header.mechanicName || "",

          makeCode: header.makeCode || "",
          makeName: header.makeName || "",
          modelCode: header.modelCode || "",
          modelName: header.modelName || "",
          typeCode: header.typeCode || "",
          typeName: header.typeName || "",
          serviceType: header.serviceType || "",
          serviceTypeName: header.serviceTypeName || "",

          estPrice: formatNumber(header.estPrice || 0),
          engineNo: header.engineNo || "",
          dateStarted: header.dateStarted ? String(header.dateStarted).slice(0, 10) : "",
          dateEnd: header.dateEnd ? String(header.dateEnd).slice(0, 10) : "",
          timeStart: header.timeStart || "",
          timeEnd: header.timeEnd || "",

          particular: header.particular || "",
          cancelled: header.cancelled || "",
          sviNo: header.sviNo || "",
          noReprints: header.noReprints || 0,

          serviceRows: loadedServices,
          partRows: loadedParts,

          isFetchDisabled: true,
        });
      } catch (error) {
        console.error("MJO fetch error:", error);
        await useSwalErrorAlert(
          "MJO Retrieval",
          error?.response?.data?.message ||
            error?.message ||
            "Unable to retrieve MJO."
        );
      } finally {
        updateState({ isLoading: false });
      }
    },
    [branchCode, updateState]
  );

  const handleDocNoBlur = () => {
    if (documentNo && branchCode) fetchMJO(documentNo, branchCode);
  };

  const handleTranDocNoRetrieval = async (data) => {
    const docNo = data?.docNo || documentNo || "";
    const direction = data?.key || "";

    if (!docNo && !direction) return;

    await fetchMJO(
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
  };

  /* ============================================================
     CANCEL
     ============================================================ */

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
          mjoNo: documentNo,
          userCode:
            currentUserRow?.userCode ||
            currentUserRow?.USER_CODE ||
            "",
          password: confirmation.password,
          reason: confirmation.reason,
        },
      });

      if (response?.data?.success === false) {
        throw new Error(
          response?.data?.message ||
          "Failed to cancel MJO."
        );
      }

      await useSwalSuccessAlert(
        "Success",
        `MJO ${documentNo} has been cancelled.`
      );

      updateState({ showCancelModal: false });
      await fetchMJO(documentNo, branchCode);
    } catch (error) {
      await useSwalErrorAlert(
        "MJO Cancellation",
        error?.response?.data?.message ||
          error?.response?.data?.details ||
          error?.message ||
          "Unable to cancel MJO."
      );

      updateState({
        resetCancelPasswordTrigger: Date.now(),
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  /* ============================================================
     HISTORY
     ============================================================ */

  const handleHistoryRowPick = async (row) => {
    const docNo = row?.docNo || row?.mjoNo;
    const rowBranch = row?.branchCode || branchCode;
    if (!docNo || !rowBranch) return;

    await fetchMJO(docNo, rowBranch);
    setTopTab("details");
  };

  /* ============================================================
     COLUMN DEFINITIONS
     ============================================================ */

  const serviceColumns = [
    "LN",
    "JO Status",
    "Service Type",
    "Service Code",
    "Description",
    "Specification",
    "Amount",
    "Disc Rate",
    "Disc Amt",
    "Net Amt",
    "VAT Code",
    "VAT Desc",
    "VAT Amt",
    "CWT Code",
    "CWT Desc",
    "CWT Amt",
    "Total Parts",
    "Issued Parts",
  ];

  const partColumns = [
    "LN",
    "Service Code",
    "JO Status",
    "Inv Type",
    "Item No.",
    "Item Description",
    "UOM",
    "Quantity",
    "Issued Qty",
    "Returned Qty",
    "Sell Price",
    "Remarks",
  ];

  const amountInput = (value, onChange, disabled = false, decimals = 2) => (
    <input
      type="text"
      value={value ?? ""}
      disabled={disabled}
      className="w-full global-tran-td-inputclass-ui text-right"
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.-]/g, "");
        const rgx = decimals === 0
          ? /^-?\d*$/
          : new RegExp(`^-?\\d*\\.?\\d{0,${decimals}}$`);
        if (raw === "" || rgx.test(raw)) onChange(raw);
      }}
    />
  );

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="global-tran-main-div-ui">
      <style>{`
        .mjo-time-input {
          position: relative;
          padding-right: 2.25rem !important;
        }

        .mjo-time-input::-webkit-calendar-picker-indicator {
          position: absolute;
          right: 0.70rem;
          top: 50%;
          transform: translateY(-50%);
          margin: 0;
          padding: 0;
          cursor: pointer;
          width: 14px;
          height: 14px;
        }

        .dark .mjo-time-input::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.6);
        }
      `}</style>

      {isLoading && <LoadingSpinner />}

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
          disableRouteNavigation={true}
          detailsRoute="/page/MJO"
          isSaveDisabled={isFormDisabled || isLoading || serviceRows.length === 0}
          isResetDisabled={isLoading}
          isCancelDisabled={!documentNo || isDocumentLocked}
          isAttachDisabled
          isPrintDisabled
          isNotifyDisabled
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>

          <div className="global-tran-headerstat-div-ui">
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui uppercase ${statusClass}`}>
                {displayStatus}
              </h1>
            </div>
          </div>
        </div>

        {/* =====================================================
            HEADER INFORMATION
            ===================================================== */}
        <div className="global-tran-header-div-ui">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* COLUMN 1 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={branchName || ""}
                readOnly
                disabled={isFormDisabled || !!documentNo}
                lookupDisabled={isFormDisabled || !!documentNo}
                onLookup={() => updateState({ branchModalOpen: true })}
              />

              <FieldRenderer
                id="mjoNo"
                label="MJO No."
                type="lookup"
                value={documentNo || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ documentNo: String(value || "").toUpperCase() })
                }
                onLookup={() =>
                  updateState({ showAllTranDocNo: true })
                }
                onBlur={handleDocNoBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleDocNoBlur();
                  }
                }}
              />

              <div className="relative w-full">
                <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                  <DateFormatInput
                    id="documentDate"
                    className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
                    value={documentDate}
                    disabled={isFormDisabled}
                    updateState={(patch) => {
                      const next =
                        typeof patch === "function"
                          ? patch({ documentDate })
                          : patch;

                      if (next?.documentDate !== undefined) {
                        updateState({ documentDate: next.documentDate });
                      }
                    }}
                  />
                </div>
                <label htmlFor="documentDate" className="global-ref-floating-label">
                  MJO Date
                </label>
              </div>

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
                  onLookup={() => updateState({ customerModalOpen: true })}
                />

                <FieldRenderer
                  id="custName"
                  label="Customer Name"
                  value={custName || ""}
                  disabled
                />
              </div>

              <FieldRenderer
                id="custAddr1"
                label="Customer Address 1"
                value={custAddr1 || ""}
                disabled={isFormDisabled}
                onChange={(value) => updateState({ custAddr1: value })}
              />

              <FieldRenderer
                id="custAddr2"
                label="Customer Address 2"
                value={[custAddr2, custAddr3]
                  .filter((value) => String(value || "").trim())
                  .join(" ")}
                disabled
                readOnly
              />
            </div>

            {/* COLUMN 2 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="plateNo"
                label="Plate No."
                required
                value={plateNo || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ plateNo: String(value || "").toUpperCase() })
                }
              />

              <FieldRenderer
                id="kmReading"
                label="Mileage / KM Reading"
                type="amount"
                value={kmReading || ""}
                disabled={isFormDisabled}
                onChange={(value) => updateState({ kmReading: value })}
              />

              <FieldRenderer
                id="mechanicName"
                label="Mechanic Name"
                value={mechanicName || ""}
                disabled={isFormDisabled}
                onChange={(value) => updateState({ mechanicName: value })}
              />

              <FieldRenderer
                id="makeCode"
                label="Vehicle Make"
                required
                type="lookup"
                value={
                  makeCode
                    ? `${makeCode}${makeName ? ` - ${makeName}` : ""}`
                    : ""
                }
                readOnly
                disabled
                lookupDisabled
              />

              <FieldRenderer
                id="modelCode"
                label="Vehicle Model"
                required
                type="lookup"
                value={
                  modelCode
                    ? `${modelCode}${modelName ? ` - ${modelName}` : ""}`
                    : ""
                }
                readOnly
                disabled
                lookupDisabled
              />

              <FieldRenderer
                id="typeCode"
                label="Vehicle Type"
                required
                type="lookup"
                value={
                  typeCode
                    ? `${typeCode}${typeName ? ` - ${typeName}` : ""}`
                    : ""
                }
                readOnly
                disabled
                lookupDisabled
              />
            </div>

            {/* COLUMN 3 */}
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="serviceType"
                label="Service Type"
                required
                type="lookup"
                value={
                  serviceType
                    ? `${serviceType}${serviceTypeName ? ` - ${serviceTypeName}` : ""}`
                    : ""
                }
                readOnly
                disabled={isFormDisabled}
                lookupDisabled={isFormDisabled}
                onLookup={() => updateState({ serviceTypeModalOpen: true })}
              />

              <FieldRenderer
                id="estPrice"
                label="Est. Service Charge"
                type="amount"
                value={estPrice || ""}
                disabled={isFormDisabled}
                onChange={(value) => updateState({ estPrice: value })}
              />

              <FieldRenderer
                id="engineNo"
                label="Engine No."
                value={engineNo || ""}
                disabled={isFormDisabled}
                onChange={(value) =>
                  updateState({ engineNo: String(value || "").toUpperCase() })
                }
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="relative w-full">
                  <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                    <DateFormatInput
                      id="dateStarted"
                      className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
                      value={dateStarted}
                      disabled={isFormDisabled}
                      updateState={(patch) => {
                        const next =
                          typeof patch === "function"
                            ? patch({ dateStarted })
                            : patch;

                        if (next?.dateStarted !== undefined) {
                          updateState({ dateStarted: next.dateStarted });
                        }
                      }}
                    />
                  </div>
                  <label
                    htmlFor="dateStarted"
                    className="global-ref-floating-label"
                  >
                    Date Started
                  </label>
                </div>

                <div className="relative w-full">
                  <div className="flex items-stretch global-ref-textbox-ui global-ref-textbox-enabled">
                    <DateFormatInput
                      id="dateEnd"
                      className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
                      value={dateEnd}
                      disabled={isFormDisabled}
                      updateState={(patch) => {
                        const next =
                          typeof patch === "function"
                            ? patch({ dateEnd })
                            : patch;

                        if (next?.dateEnd !== undefined) {
                          updateState({ dateEnd: next.dateEnd });
                        }
                      }}
                    />
                  </div>
                  <label
                    htmlFor="dateEnd"
                    className="global-ref-floating-label"
                  >
                    Date End
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative w-full">
                  <input
                    id="timeStart"
                    type="time"
                    step="60"
                    value={
                      String(timeStart || "").replace(/\D/g, "").length === 4
                        ? `${String(timeStart || "").replace(/\D/g, "").slice(0, 2)}:${String(timeStart || "").replace(/\D/g, "").slice(2, 4)}`
                        : ""
                    }
                    disabled={isFormDisabled}
                    onChange={(e) =>
                      updateState({
                        timeStart: String(e.target.value || "").replace(":", ""),
                      })
                    }
                    className={`
                      mjo-time-input
                      peer w-full h-8 rounded-lg border shadow-none
                      global-ref-textbox-ui
                      !px-2 !pr-8 !font-normal
                      focus-visible:!ring-0 focus-visible:!ring-offset-0
                      ${
                        isFormDisabled
                          ? "global-ref-textbox-disabled !bg-slate-100 !text-slate-600 !border-slate-200"
                          : "global-ref-textbox-enabled !bg-white !text-slate-900 !border-slate-300 focus:!border-blue-500"
                      }
                    `}
                  />
                  <label
                    htmlFor="timeStart"
                    className={`
                      global-ref-floating-label
                      !text-slate-600
                      ${
                        isFormDisabled
                          ? "global-ref-label-disabled !bg-slate-100"
                          : "global-ref-label-enabled !bg-white"
                      }
                    `}
                  >
                    Time Start
                  </label>
                </div>

                <div className="relative w-full">
                  <input
                    id="timeEnd"
                    type="time"
                    step="60"
                    value={
                      String(timeEnd || "").replace(/\D/g, "").length === 4
                        ? `${String(timeEnd || "").replace(/\D/g, "").slice(0, 2)}:${String(timeEnd || "").replace(/\D/g, "").slice(2, 4)}`
                        : ""
                    }
                    disabled={isFormDisabled}
                    onChange={(e) =>
                      updateState({
                        timeEnd: String(e.target.value || "").replace(":", ""),
                      })
                    }
                    className={`
                      mjo-time-input
                      peer w-full h-8 rounded-lg border shadow-none
                      global-ref-textbox-ui
                      !px-2 !pr-8 !font-normal
                      focus-visible:!ring-0 focus-visible:!ring-offset-0
                      ${
                        isFormDisabled
                          ? "global-ref-textbox-disabled !bg-slate-100 !text-slate-600 !border-slate-200"
                          : "global-ref-textbox-enabled !bg-white !text-slate-900 !border-slate-300 focus:!border-blue-500"
                      }
                    `}
                  />
                  <label
                    htmlFor="timeEnd"
                    className={`
                      global-ref-floating-label
                      !text-slate-600
                      ${
                        isFormDisabled
                          ? "global-ref-label-disabled !bg-slate-100"
                          : "global-ref-label-enabled !bg-white"
                      }
                    `}
                  >
                    Time End
                  </label>
                </div>
              </div>

              <FieldRenderer
                id="documentStatus"
                label="MJO Status"
                type="select"
                value={documentStatus || "O"}
                disabled={isFormDisabled || !documentNo}
                onChange={(value) => updateState({ documentStatus: value })}
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
                  onChange={(e) => updateState({ particular: e.target.value })}
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
            DETAILS
            ===================================================== */}
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                Job Estimate Detail
              </span>
            </div>
          </div>

          {/* SERVICE TABLE */}
          <div>
            <div className="global-tran-table-main-div-ui">
              <div className="global-tran-table-main-sub-div-ui">
                <table className="min-w-[2300px] border-separate border-spacing-0">
                  <thead className="global-tran-thead-div-ui">
                    <tr>
                      {serviceColumns.map((column) => (
                        <th
                          key={column}
                          className="global-tran-th-ui sticky top-0 bg-blue-100 dark:bg-blue-900"
                        >
                          {column}
                        </th>
                      ))}
                      {!isFormDisabled && (
                        <th className="global-tran-th-ui sticky right-0 top-0 bg-blue-100 dark:bg-blue-900">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {serviceRows.map((row, index) => (
                      <tr key={index} className="global-tran-tr-ui">
                        <td className="global-tran-td-ui text-center">{index + 1}</td>

                        <td className="global-tran-td-ui">
                          <select
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.joStatus || "O"}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updateServiceRow(index, "joStatus", e.target.value, false)
                            }
                          >
                            <option value="O">Open</option>
                            <option value="C">Closed</option>
                            <option value="X">Cancelled</option>
                          </select>
                        </td>

                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.serviceType || ""}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updateServiceRow(index, "serviceType", e.target.value, false)
                            }
                          />
                        </td>

                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              className="w-full global-tran-td-inputclass-ui pr-7"
                              value={row.serviceCode || ""}
                              readOnly
                            />
                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 cursor-pointer text-blue-600"
                                onClick={() =>
                                  updateState({
                                    selectedServiceIndex: index,
                                    selectedPartServiceIndex: null,
                                    serviceCodeModalOpen: true,
                                  })
                                }
                              />
                            )}
                          </div>
                        </td>

                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.serviceDescription || ""}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updateServiceRow(
                                index,
                                "serviceDescription",
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
                              updateServiceRow(index, "specs", e.target.value, false)
                            }
                          />
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(
                            row.amount,
                            (value) => updateServiceRow(index, "amount", value, true),
                            isFormDisabled
                          )}
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(
                            row.discRate,
                            (value) => updateServiceRow(index, "discRate", value, true),
                            isFormDisabled,
                            6
                          )}
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(
                            row.discAmt,
                            (value) => updateServiceRow(index, "discAmt", value, true),
                            isFormDisabled
                          )}
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(row.netAmt, () => {}, true)}
                        </td>

                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              className="w-full global-tran-td-inputclass-ui pr-7"
                              value={row.vatCode || ""}
                              readOnly
                            />
                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 cursor-pointer text-blue-600"
                                onClick={() =>
                                  updateState({
                                    selectedServiceIndex: index,
                                    vatLookupModalOpen: true,
                                  })
                                }
                              />
                            )}
                          </div>
                        </td>

                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.vatDesc || ""}
                            readOnly
                          />
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(row.vatAmt, () => {}, true)}
                        </td>

                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.cwtCode || ""}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updateServiceRow(index, "cwtCode", e.target.value, false)
                            }
                          />
                        </td>

                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.cwtDesc || ""}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updateServiceRow(index, "cwtDesc", e.target.value, false)
                            }
                          />
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(
                            row.cwtAmt,
                            (value) =>
                              updateServiceRow(index, "cwtAmt", value, false),
                            isFormDisabled
                          )}
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(
                            row.totParts,
                            (value) =>
                              updateServiceRow(index, "totParts", value, false),
                            isFormDisabled
                          )}
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(row.isParts, () => {}, true)}
                        </td>

                        {!isFormDisabled && (
                          <td className="global-tran-td-ui sticky right-0 bg-white text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                type="button"
                                className="global-tran-td-button-add-ui"
                                onClick={() => addServiceRow(index)}
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                              <button
                                type="button"
                                className="global-tran-td-button-delete-ui"
                                onClick={() => deleteServiceRow(index)}
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
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
                  onClick={() => addServiceRow()}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>

              <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-[auto_auto] gap-1">
                <div className="global-tran-tab-footer-total-label-ui">Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.amount}</div>

                <div className="global-tran-tab-footer-total-label-ui">Net Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.net}</div>

                <div className="global-tran-tab-footer-total-label-ui">VAT Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.vat}</div>

                <div className="global-tran-tab-footer-total-label-ui">CWT Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.cwt}</div>

                <div className="global-tran-tab-footer-total-label-ui">Amt to be Paid:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.payable}</div>
              </div>
            </div>
          </div>

          {/* PARTS AND SUPPLIES SECTION */}
          <div className="mt-4 border-t border-slate-200 pt-2">
            <div className="global-tran-tab-nav-ui">
              <div className="flex flex-row">
                <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
                  Parts and Supplies
                </span>
              </div>
            </div>
            <div className="global-tran-table-main-div-ui">
              <div className="global-tran-table-main-sub-div-ui">
                <table className="min-w-[1700px] border-separate border-spacing-0">
                  <thead className="global-tran-thead-div-ui">
                    <tr>
                      {partColumns.map((column) => (
                        <th
                          key={column}
                          className="global-tran-th-ui sticky top-0 bg-blue-100 dark:bg-blue-900"
                        >
                          {column}
                        </th>
                      ))}
                      {!isFormDisabled && (
                        <th className="global-tran-th-ui sticky right-0 top-0 bg-blue-100 dark:bg-blue-900">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {partRows.map((row, index) => (
                      <tr key={index} className="global-tran-tr-ui">
                        <td className="global-tran-td-ui text-center">{index + 1}</td>

                        {/* Service Code */}
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              className="w-full global-tran-td-inputclass-ui pr-7"
                              value={row.serviceCode || ""}
                              readOnly
                              disabled={isFormDisabled}
                            />

                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 cursor-pointer text-blue-600"
                                title="Lookup Service Code"
                                onClick={() =>
                                  updateState({
                                    selectedServiceIndex: null,
                                    selectedPartServiceIndex: index,
                                    serviceCodeModalOpen: true,
                                  })
                                }
                              />
                            )}
                          </div>
                        </td>

                        {/* JO Status */}
                        <td className="global-tran-td-ui">
                          <select
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.joStatus || "O"}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updatePartRow(
                                index,
                                "joStatus",
                                e.target.value
                              )
                            }
                          >
                            <option value="O">Open</option>
                            <option value="C">Closed</option>
                            <option value="X">Cancelled</option>
                          </select>
                        </td>

                        {/* Inventory Type */}
                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.invType || ""}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updatePartRow(
                                index,
                                "invType",
                                String(e.target.value || "").toUpperCase()
                              )
                            }
                          />
                        </td>

                        {/* Item No. */}
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              className="w-full global-tran-td-inputclass-ui pr-7"
                              value={row.itemNo || ""}
                              readOnly
                              disabled={isFormDisabled}
                            />

                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 cursor-pointer text-blue-600"
                                title="Lookup Item No."
                                onClick={() =>
                                  openPartItemLookup(index)
                                }
                              />
                            )}
                          </div>
                        </td>

                        {/* Item Description */}
                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.itemDesc || ""}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updatePartRow(
                                index,
                                "itemDesc",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        {/* UOM */}
                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.uomCode || ""}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updatePartRow(
                                index,
                                "uomCode",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(
                            row.quantity,
                            (value) => updatePartRow(index, "quantity", value),
                            isFormDisabled,
                            6
                          )}
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(row.isQty, () => {}, true, 6)}
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(row.retQty, () => {}, true, 6)}
                        </td>

                        <td className="global-tran-td-ui">
                          {amountInput(
                            row.sellPrice,
                            (value) => updatePartRow(index, "sellPrice", value),
                            isFormDisabled
                          )}
                        </td>

                        <td className="global-tran-td-ui">
                          <input
                            className="w-full global-tran-td-inputclass-ui"
                            value={row.remarks || ""}
                            disabled={isFormDisabled}
                            onChange={(e) =>
                              updatePartRow(index, "remarks", e.target.value)
                            }
                          />
                        </td>

                        {!isFormDisabled && (
                          <td className="global-tran-td-ui sticky right-0 bg-white text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                type="button"
                                className="global-tran-td-button-add-ui"
                                onClick={() => addPartRow(index)}
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                              <button
                                type="button"
                                className="global-tran-td-button-delete-ui"
                                onClick={() => deletePartRow(index)}
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
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
                  onClick={() => addPartRow()}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>

              <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-[auto_auto] gap-1">
                <div className="global-tran-tab-footer-total-label-ui">Parts Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.parts}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          HISTORY
          ============================================================ */}
      {topTab === "history" && (
        <div>
          <AllTranHistory
            showHeader={false}
            isActive
            endpoint={ENDPOINTS.history}
            cacheKey={`MJO:${branchCode || ""}`}
            activeTabKey="MJO_Summary"
            branchCode={branchCode}
            status="All"
            onRowDoubleClick={handleHistoryRowPick}
            historyExportName={`${documentTitle} History`}
          />
        </div>
      )}

      {/* ============================================================
          VEHICLE SELECTION
          ============================================================ */}
      <SearchGlobalLookupv1
        isOpen={state.vehicleSelectionModalOpen}
        onClose={handleVehicleLookupClose}
        onCancel={handleVehicleLookupCancel}
        endpoint={vehicleLookupColumns}
        data={state.vehicleOptions}
        title={`Select Vehicle${custCode ? ` - ${custCode}` : ""}`}
        btnCaption="Select Vehicle"
        singleSelect
        modalMaxWidthClass="max-w-6xl"
        overlayZIndexClass="z-[70]"
        exportFileName="Vehicle Selection"
        preferenceKey="MJO_VehicleSelection"
      />

      {/* ============================================================
          CANCEL DOCUMENT
          ============================================================ */}
      {state.showCancelModal && (
        <CancelTranModal
          isOpen={state.showCancelModal}
          onClose={handleCloseCancel}
          resetPasswordTrigger={state.resetCancelPasswordTrigger}
        />
      )}

      {/* ============================================================
          DOCUMENT NUMBER LOOKUP - F1
          ============================================================ */}
      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          params={{
            branchCode,
            branchName,
            docType,
            documentTitle,
            fieldNo: "mjoNo",
          }}
          onRetrieve={handleTranDocNoRetrieval}
          onResponse={{ documentNo }}
          onSelected={handleTranDocNoSelection}
          onClose={() =>
            updateState({ showAllTranDocNo: false })
          }
        />
      )}

      {/* ============================================================
          LOOKUPS
          ============================================================ */}

      {state.branchModalOpen && (
        <BranchLookupModal
          isOpen={state.branchModalOpen}
          onClose={(selected) => {
            updateState({ branchModalOpen: false });
            if (!selected) return;
            updateState({
              branchCode: selected.branchCode || "",
              branchName: selected.branchName || "",
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

      {state.makeModalOpen && (
        <SearchVEMakeRef
          isOpen={state.makeModalOpen}
          onClose={handleMakeSelect}
        />
      )}

      {state.modelModalOpen && (
        <SearchVEModelRef
          isOpen={state.modelModalOpen}
          makeCode={makeCode || ""}
          onClose={handleModelSelect}
        />
      )}

      {state.typeModalOpen && (
        <SearchVETypeRef
          isOpen={state.typeModalOpen}
          onClose={handleTypeSelect}
        />
      )}

      {state.serviceTypeModalOpen && (
        <SearchVEServiceTypeRef
          isOpen={state.serviceTypeModalOpen}
          onClose={handleServiceTypeSelect}
        />
      )}

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
          onClose={handlePartItemSelect}
          onGetSelectedItems={handlePartItemSelect}
          onCancel={() =>
            updateState({
              itemLookupModalOpen: false,
              selectedPartIndex: null,
            })
          }
        />
      )}

      {state.vatLookupModalOpen && (
        <VATLookupModal
          isOpen={state.vatLookupModalOpen}
          customParam="InputService"
          onClose={handleVATSelect}
        />
      )}
    </div>
  );
};

export default MJO;
