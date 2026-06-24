import React, { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/NAYSA Cloud/Components/Header";
import DateFormatInput, {
  formatDateToMMDDYYYY,
  formatDateToYYYYMMDD,
} from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReset } from "@/NAYSA Cloud/Components/ResetContext.jsx";
import BOMReferenceLookupModal from "@/NAYSA Cloud/Lookup/SearchBOMRef.jsx";
import COAMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import PayeeMastLookupModal from "@/NAYSA Cloud/Lookup/SearchVendMast.jsx";
import {
  docTypeNames,
  docTypes,
  docTypePDFGuide,
  docTypeVideoGuide,
} from "@/NAYSA Cloud/Global/doctype";

const ENDPOINTS = {
  load: "getWorkOrderHistory",
  get: "getWorkOrder",
  loadBOM: "loadWorkOrderBOM",
  upsert: "upsertWorkOrder",
  cancel: "cancelWorkOrder",
};

const normalizeResponse = (data) => {
  if (Array.isArray(data)) {
    return { success: true, rows: data };
  }

  if (data?.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    return {
      ...data,
      ...data.data,
      success: data.success ?? data.status ?? true,
    };
  }

  return {
    success: data?.success ?? data?.status ?? true,
    rows: data?.rows || data?.data || [],
    ...data,
  };
};

const request = async (endpoint, payload = {}) => {
  const data = await postRequest(endpoint, payload);
  return normalizeResponse(data);
};

const woApi = {
  load: (payload) => request(ENDPOINTS.load, payload),
  get: (payload) => request(ENDPOINTS.get, payload),
  loadBOM: (payload) => request(ENDPOINTS.loadBOM, payload),
  upsert: (payload) => request(ENDPOINTS.upsert, payload),
  cancel: (payload) => request(ENDPOINTS.cancel, payload),
};

const STATUS = {
  O: "Open",
  C: "Closed",
  X: "Cancelled",
  R: "Released",
  A: "Accounting Closed",
  0: "Open",
  1: "Closed",
  9: "Cancelled",
  F: "Closed",
  P: "Closed",
};

const EMPTY_HD = {
  branchCode: "",
  woNo: "",
  woId: "",
  woDate: formatDateToMMDDYYYY(new Date().toISOString().slice(0, 10)),
  refNo1: "",
  refNo2: "",
  invType: "FG",
  itemCode: "",
  itemName: "",
  uomCode: "",
  bomCode: "",
  bomDate: "",
  bomQty: 0,
  batchQty: 1,
  woQty: 0,
  worQty: 0,
  worAmt: 0,
  totalMatcost: 0,
  woAmt: 0,
  woUnitcost: 0,
  remarks: "",
  vendCode: "",
  vendName: "",
  wcCode: "",
  wcName: "",
  routeCode: "",
  estRunTime: 0,
  actualRuntime: 0,
  acctCode: "",
  acctName: "",
  tranType: "JV",
  varQty: 0,
  stdLabor: 0,
  stdOverhead: 0,
  stdLaborRate: 0,
  stdOverheadRate: 0,
  woStatus: "O",
  cancelled: "",
};

const n = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const money = (value, digits = 2) =>
  n(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const qty = (value, digits = 6) =>
  n(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

const currentUser = () => {
  const keys = ["auth", "user", "authUser", "naysaUser"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      return obj?.userCode || obj?.user_code || obj?.userId || obj?.userid || obj?.name || "";
    } catch (_) {
      // ignore invalid storage values
    }
  }
  return "";
};

const currentBranch = () => {
  const keys = ["auth", "user", "authUser", "naysaUser"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      const obj = JSON.parse(raw);
      return obj?.branchCode || obj?.branch_code || obj?.branchcode || obj?.branch || "HO";
    } catch (_) {
      // ignore invalid storage values
    }
  }
  return "HO";
};

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";

const getUserCode = (currentUserRow) =>
  pickFirst(
    currentUserRow?.userCode,
    currentUserRow?.USER_CODE,
    currentUserRow?.user_code,
    currentUserRow?.userId,
    currentUserRow?.USER_ID,
    currentUser()
  );

const getDefaultBranch = (currentUserRow, companyInfo) =>
  pickFirst(
    currentUserRow?.branchCode,
    currentUserRow?.BRANCH_CODE,
    currentUserRow?.branch_code,
    companyInfo?.branchCode,
    companyInfo?.BRANCH_CODE,
    companyInfo?.branch_code,
    currentBranch()
  );

function normalizeHd(hd = {}) {
  const rawWoStatus = hd.woStatus ?? hd.WO_STATUS ?? "O";
  const normalizedStatus = STATUS[String(rawWoStatus).toUpperCase()]
    ? String(rawWoStatus).toUpperCase()
    : rawWoStatus === 1
      ? "C"
      : rawWoStatus === 9
        ? "X"
        : "O";

  return {
    ...EMPTY_HD,
    ...hd,
    woDate: formatDateToMMDDYYYY(toDateInput(hd.woDate || hd.WO_DATE)) || hd.woDate || EMPTY_HD.woDate,
    bomDate: toDateInput(hd.bomDate || hd.BOM_DATE),
    branchCode: hd.branchCode || hd.BRANCH_CODE || currentBranch(),
    woNo: hd.woNo || hd.WO_NO || "",
    woId: hd.woId || hd.WO_ID || "",
    refNo1: hd.refNo1 || hd.REF_NO1 || hd.refNo || hd.REF_NO || "",
    refNo2: hd.refNo2 || hd.REF_NO2 || "",
    invType: hd.invType || hd.INV_TYPE || "FG",
    itemCode: hd.itemCode || hd.ITEM_CODE || "",
    itemName: hd.itemName || hd.ITEM_NAME || "",
    uomCode: hd.uomCode || hd.UOM_CODE || "",
    bomCode: hd.bomCode || hd.BOM_CODE || "",
    bomQty: n(hd.bomQty ?? hd.BOM_QTY),
    batchQty: n(hd.batchQty ?? hd.BATCH_QTY) || 1,
    woQty: n(hd.woQty ?? hd.WO_QTY),
    worQty: n(hd.worQty ?? hd.WOR_QTY),
    worAmt: n(hd.worAmt ?? hd.WOR_AMT),
    totalMatcost: n(hd.totalMatcost ?? hd.TOTAL_MATCOST),
    woAmt: n(hd.woAmt ?? hd.WO_AMT),
    woUnitcost: n(hd.woUnitcost ?? hd.WO_UNITCOST),
    stdLabor: n(hd.stdLabor ?? hd.STD_LABOR),
    stdOverhead: n(hd.stdOverhead ?? hd.STD_OVERHEAD),
    stdLaborRate: n(hd.stdLaborRate ?? hd.STD_LABOR_RATE),
    stdOverheadRate: n(hd.stdOverheadRate ?? hd.STD_OVERHEAD_RATE),
    vendCode: hd.vendCode || hd.VEND_CODE || "",
    vendName: hd.vendName || hd.VEND_NAME || "",
    wcCode: hd.wcCode || hd.WC_CODE || "",
    wcName: hd.wcName || hd.WC_NAME || "",
    routeCode: hd.routeCode || hd.ROUTE_CODE || "",
    estRunTime: n(hd.estRunTime ?? hd.EST_RUNTIME ?? hd.EST_RUN_TIME),
    actualRuntime: n(hd.actualRuntime ?? hd.ACTUAL_RUNTIME),
    acctCode: hd.acctCode || hd.ACCT_CODE || "",
    acctName: hd.acctName || hd.ACCT_NAME || "",
    tranType: hd.tranType || hd.TRAN_TYPE || "JV",
    remarks: hd.remarks || hd.REMARKS || "",
    woStatus: normalizedStatus,
    cancelled: hd.cancelled || hd.CANCELLED || "",
  };
}

function normalizeRow(row = {}, index = 0) {
  const qtyNeeded = n(row.qtyNeeded ?? row.QTY_NEEDED);
  const scrapQty = n(row.scrapQty ?? row.SCRAP_QTY ?? row.scrapRate ?? row.SCRAP_RATE);
  const requiredQty = n(row.requiredQty ?? row.REQUIRED_QTY);
  const issuedQty = n(row.issuedQty ?? row.ISSUED_QTY);
  const issuedWac = n(row.issuedWac ?? row.ISSUED_WAC);
  const issuedAmt = n(row.issuedAmt ?? row.ISSUED_AMT) || issuedQty * issuedWac;
  const requiredAmt = n(row.requiredAmt ?? row.REQUIRED_AMT) || requiredQty * issuedWac;

  return {
    lineNo: n(row.lnNo ?? row.lineNo ?? row.LINE_NO) || index + 1,
    invType: row.invType || row.INV_TYPE || "RM",
    itemCode: row.itemCode || row.ITEM_CODE || "",
    itemName: row.itemName || row.ITEM_NAME || "",
    uomCode: row.uomCode || row.UOM_CODE || "",
    qtyNeeded,
    scrapQty,
    requiredQty,
    issuedQty,
    unservedQty: n(row.unservedQty ?? row.UNSERVED_QTY),
    qtyHand: n(row.qtyHand ?? row.QTY_HAND),
    issuedAmt,
    requiredAmt,
    issuedWac,
    varianceAmt: n(row.varianceAmt ?? row.VARIANCE_AMT),
    pickedQty: n(row.pickedQty ?? row.PICKED_QTY),
    pcCode: row.pcCode || row.PC_CODE || "",
    pcDesc: row.pcDesc || row.PC_DESC || "",
    ouDoctype: row.ouDoctype || row.OU_DOCTYPE || "",
  };
}

function recalcRows(rows, batchQty) {
  return rows.map((row, index) => {
    const requiredQty = (n(row.qtyNeeded) + n(row.scrapQty)) * n(batchQty);
    const issuedQty = n(row.issuedQty) || requiredQty;
    const requiredAmt = requiredQty * n(row.issuedWac);
    const issuedAmt = issuedQty * n(row.issuedWac);

    return {
      ...row,
      lineNo: index + 1,
      requiredQty,
      issuedQty,
      unservedQty: requiredQty - issuedQty,
      requiredAmt,
      issuedAmt,
      varianceAmt: issuedAmt - requiredAmt,
    };
  });
}

function recalcHeader(hd, rows) {
  const woQty = n(hd.bomQty) * n(hd.batchQty);
  const totalMatcost = rows.reduce((sum, row) => sum + n(row.issuedAmt), 0);
  const stdLabor = woQty * n(hd.stdLaborRate);
  const stdOverhead = woQty * n(hd.stdOverheadRate);
  const woAmt = totalMatcost + stdLabor + stdOverhead;

  return {
    ...hd,
    woQty,
    totalMatcost,
    stdLabor,
    stdOverhead,
    woAmt,
    woUnitcost: woQty ? woAmt / woQty : 0,
    varQty: woQty - n(hd.worQty),
  };
}

export default function WO() {
  const { companyInfo, currentUserRow, getAllTopHSDocRow } = useAuth() || {};
  const { setOnSave, setOnReset } = useReset() || {};
  const docType = docTypes.WO;
  const hsDoc = getAllTopHSDocRow?.(docType);
  const documentTitle = hsDoc?.docName ? `${hsDoc.docName} Transaction` : docTypeNames[docType];
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const userCode = getUserCode(currentUserRow);
  const defaultBranch = getDefaultBranch(currentUserRow, companyInfo);

  const [activeTab, setActiveTab] = useState("details");
  const [infoTab, setInfoTab] = useState("bom");
  const [hd, setHd] = useState(() => ({ ...EMPTY_HD, branchCode: defaultBranch }));
  const [dt1, setDt1] = useState([]);
  const [history, setHistory] = useState([]);
  const [lookupOpen, setLookupOpen] = useState({
    bom: false,
    account: false,
    vendor: false,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const statusText = String(hd.woStatus ?? 0).toUpperCase();
  const isClosed = ["1", "9", "C", "X", "A", "F", "P", "POSTED", "CLOSED", "CANCELLED"].includes(statusText);

  const totals = useMemo(
    () => ({
      requiredAmt: dt1.reduce((sum, row) => sum + n(row.requiredAmt), 0),
      issuedAmt: dt1.reduce((sum, row) => sum + n(row.issuedAmt), 0),
      varianceAmt: dt1.reduce((sum, row) => sum + n(row.varianceAmt), 0),
    }),
    [dt1]
  );

  const setCalculatedState = useCallback((nextHd, nextRows) => {
    const rows = recalcRows(nextRows, nextHd.batchQty);
    setDt1(rows);
    setHd(recalcHeader(nextHd, rows));
  }, []);

  const reset = useCallback(() => {
    setMessage("");
    setHd({ ...EMPTY_HD, branchCode: defaultBranch });
    setDt1([]);
    setActiveTab("details");
    setInfoTab("bom");
  }, [defaultBranch]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await woApi.load({
        branchCode: hd.branchCode || defaultBranch,
        startDate: "2000-01-01",
        endDate: "2099-12-31",
      });
      setHistory(res.rows || []);
    } catch (error) {
      setMessage(error.message);
    }
  }, [defaultBranch, hd.branchCode]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const loadBOM = async (bomCode = hd.bomCode, baseHd = hd) => {
    if (!bomCode) {
      setMessage("Please enter or select BOM Code first.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const res = await woApi.loadBOM( {
        // branchCode: hd.branchCode || defaultBranch,
        bomCode,
        // batchQty: hd.batchQty || 1,
        // userId: userCode,
      });

      if (!res.success) {
        setMessage(res.message || "Unable to load BOM.");
        return;
      }

      const nextHd = normalizeHd({ ...baseHd, ...(res.hd || {}), bomCode });
      const rawRows = res.dt1 || res.rows || res.data || [];
      const nextRows = rawRows.map(normalizeRow);
      setCalculatedState(nextHd, nextRows);
      setActiveTab("details");
      setInfoTab("bom");
      setMessage(res.message || "BOM loaded.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadWO = async (woNo, woId = "") => {
    try {
      setLoading(true);
      setMessage("");
      const res = await woApi.get( {
        branchCode: hd.branchCode || defaultBranch,
        woNo,
        woId,
      });

      if (!res.success) {
        setMessage(res.message || "Work Order not found.");
        return;
      }

      const nextHd = normalizeHd(res.hd || {});
      const nextRows = (res.dt1 || []).map(normalizeRow);
      setHd(nextHd);
      setDt1(nextRows);
      setActiveTab("details");
      setInfoTab("bom");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const save = useCallback(async () => {
    if (isClosed) {
      setMessage("Closed/Cancelled Work Order cannot be edited.");
      return;
    }
    if (!hd.bomCode || !hd.itemCode || !n(hd.batchQty)) {
      setMessage("BOM Code, Item Code, and Batch Qty are required.");
      return;
    }
    if (!dt1.length) {
      setMessage("Item details are required.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const rows = recalcRows(dt1, hd.batchQty);
      const payloadHd = recalcHeader(hd, rows);
      const payloadWithoutGeneratedFields = { ...payloadHd };
      delete payloadWithoutGeneratedFields[["cutoff", "Code"].join("")];
      const res = await woApi.upsert({
        ...payloadWithoutGeneratedFields,
        woDate: formatDateToYYYYMMDD(payloadWithoutGeneratedFields.woDate) || payloadWithoutGeneratedFields.woDate,
        branchCode: payloadHd.branchCode || defaultBranch,
        userCode,
        userId: userCode,
        dt1: rows,
      });

      if (!res.success) {
        setMessage(res.message || "Unable to save Work Order.");
        return;
      }

      setHd((prev) => ({ ...prev, woNo: res.woNo || prev.woNo, woId: res.woId || prev.woId }));
      setDt1(rows);
      setMessage(res.message || "Saved.");
      fetchHistory();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [defaultBranch, dt1, fetchHistory, hd, isClosed, userCode]);

  useEffect(() => {
    if (!defaultBranch) return;
    setHd((prev) => (prev.branchCode ? prev : { ...prev, branchCode: defaultBranch }));
  }, [defaultBranch]);

  useEffect(() => {
    setOnSave?.(() => save);
    setOnReset?.(() => reset);

    return () => {
      setOnSave?.(null);
      setOnReset?.(null);
    };
  }, [reset, save, setOnReset, setOnSave]);

  const cancelWO = async () => {
    if (!hd.woId && !hd.woNo) {
      setMessage("Save or retrieve a Work Order first.");
      return;
    }
    if (!window.confirm("Do you want to cancel this Work Order?")) return;

    try {
      setLoading(true);
      const res = await woApi.cancel( {
        branchCode: hd.branchCode || defaultBranch,
        woNo: hd.woNo,
        woId: hd.woId,
        userId: userCode,
      });

      if (!res.success) {
        setMessage(res.message || "Unable to cancel Work Order.");
        return;
      }

      setHd((prev) => ({ ...prev, woStatus: 9, cancelled: "Y" }));
      setMessage(res.message || "Cancelled.");
      fetchHistory();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateHd = (field, value) => {
    const nextHd = { ...hd, [field]: value };
    if (["batchQty", "bomQty", "stdLaborRate", "stdOverheadRate"].includes(field)) {
      setCalculatedState(nextHd, dt1);
    } else {
      setHd(nextHd);
    }
  };

  const updateRow = (index, field, value) => {
    const rows = dt1.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: value } : row
    );
    setCalculatedState(hd, rows);
  };

  const handleDateState = (patch) => {
    const [field, value] = Object.entries(patch || {})[0] || [];
    if (!field) return;
    updateHd(field, value);
  };

  const handleBOMSelect = (bom) => {
    setLookupOpen((prev) => ({ ...prev, bom: false }));
    if (!bom) return;

    const nextHd = {
      ...hd,
      invType: bom.invType || bom.INV_TYPE || hd.invType,
      itemCode: bom.itemCode || bom.ITEM_CODE || "",
      itemName: bom.itemName || bom.ITEM_NAME || "",
      uomCode: bom.uomCode || bom.UOM_CODE || "",
      bomCode: bom.bomCode || bom.BOM_CODE || "",
      bomDate: toDateInput(bom.bomDate || bom.BOM_DATE),
      bomQty: n(bom.bomQty ?? bom.BOM_QTY),
      wcCode: bom.wcCode || bom.WC_CODE || "",
      wcName: bom.wcName || bom.WC_NAME || "",
      routeCode: bom.routeCode || bom.ROUTE_CODE || "",
      estRunTime: n(bom.estRunTime ?? bom.EST_RUNTIME ?? bom.EST_RUN_TIME),
      stdLaborRate: n(bom.stdLaborRate ?? bom.STD_LABOR_RATE),
      stdOverheadRate: n(bom.stdOverheadRate ?? bom.STD_OVERHEAD_RATE),
      acctCode: bom.acctCode || bom.ACCT_CODE || hd.acctCode,
      acctName: bom.acctName || bom.ACCT_NAME || hd.acctName,
      woStatus: hd.woStatus || "O",
    };

    setHd(recalcHeader(nextHd, dt1));
    loadBOM(nextHd.bomCode, nextHd);
  };

  const handleAccountSelect = (account) => {
    setLookupOpen((prev) => ({ ...prev, account: false }));
    if (!account) return;

    updateHd("acctCode", account.acctCode || "");
    setHd((prev) => ({
      ...prev,
      acctCode: account.acctCode || "",
      acctName: account.acctName || "",
    }));
  };

  const handleVendorSelect = (vendor) => {
    setLookupOpen((prev) => ({ ...prev, vendor: false }));
    if (!vendor) return;

    setHd((prev) => ({
      ...prev,
      vendCode: vendor.vendCode || "",
      vendName: vendor.vendName || "",
    }));
  };

  const displayStatus = STATUS[hd.woStatus] || "Open";
  const statusColor =
    displayStatus === "Cancelled"
      ? "text-red-600"
      : displayStatus === "Closed"
        ? "text-red-600"
        : "text-blue-600";
  const documentID = hd.woId || hd.woNo;
  const isFormDisabled = isClosed || loading;
  const infoTabClass = (tab) =>
    `global-tran-tab-padding-ui ${
      infoTab === tab ? "global-tran-tab-text_active-ui" : "global-tran-tab-text_inactive-ui"
    }`;
  const overUnderQty = n(hd.woQty) - n(hd.worQty);
  const overUnderAmt = n(hd.worAmt) - n(hd.woAmt);
  const woStatusOptions = [
    { value: "O", label: "Open" },
    { value: "C", label: "Closed" },
    { value: "X", label: "Cancelled" },
    { value: "R", label: "Released" },
    { value: "A", label: "Accounting Closed" },
  ];
  const tranTypeOptions = [
    { value: "JV", label: "Journal Voucher" },
    { value: "ADJ", label: "Adjustment" },
  ];

  const handleCopy = () => {
    if (!documentID) {
      setMessage("Retrieve or save a Work Order before copying.");
      return;
    }

    setHd((prev) => ({
      ...prev,
      woNo: "",
      woId: "",
      woDate: formatDateToMMDDYYYY(new Date().toISOString().slice(0, 10)),
      woStatus: "O",
      cancelled: "",
      refNo1: prev.woNo || prev.refNo1 || "",
    }));
    setMessage("Copied Work Order details. Save to create a new transaction.");
    setActiveTab("details");
  };

  const handleAttach = () => {
    setMessage("Attachment is available after the Work Order is saved.");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="global-tran-main-div-ui">
      {loading && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          activeTopTab={activeTab}
          showActions={activeTab === "details"}
          showBIRForm={false}
          showCopyForm={true}
          showPost={false}
          detailsRoute="/page/WO"
          onDetails={() => setActiveTab("details")}
          onHistory={() => setActiveTab("history")}
          onReset={reset}
          onSave={save}
          onCancel={cancelWO}
          onCopy={handleCopy}
          onAttach={handleAttach}
          onPrint={handlePrint}
          isSaveDisabled={loading || isClosed || !dt1.length}
          isResetDisabled={loading}
          isAttachDisabled={!documentID}
          isPrintDisabled={!documentID || displayStatus === "Cancelled"}
          isCopyDisabled={!documentID || displayStatus === "Cancelled"}
          isCancelDisabled={!documentID || loading || isClosed}
        />
      </div>

      {message && (
        <div className="mx-4 mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
          {message}
        </div>
      )}

      <div className={activeTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle || "Work Order Transaction File"}</h1>
          </div>
          <div className="global-tran-headerstat-div-ui justify-center">
            <div className="text-center">
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
            </div>
          </div>
        </div>

        <div className="global-tran-header-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button type="button" className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3" id="wo_hd">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer id="branchCode" label="Branch" type="text" value={hd.branchCode} disabled={isFormDisabled} onChange={(val) => updateHd("branchCode", val)} />
              <FieldRenderer
                id="woNo"
                label="WO No."
                type="lookup"
                value={hd.woNo}
                allowLookupInput
                disabled={loading}
                lookupDisabled={!hd.woNo || loading}
                onChange={(val) => updateHd("woNo", val)}
                onLookup={() => loadWO(hd.woNo)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hd.woNo) {
                    e.preventDefault();
                    loadWO(hd.woNo);
                  }
                }}
              />
              <div className="relative w-full">
                <div className={`flex items-stretch global-ref-textbox-ui ${!isFormDisabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}>
                  <DateFormatInput id="woDate" className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer" value={hd.woDate || ""} disabled={isFormDisabled} updateState={handleDateState} />
                </div>
                <label htmlFor="woDate" className="global-ref-floating-label">WO Date</label>
              </div>
              <FieldRenderer id="refNo1" label="Ref No" type="text" value={hd.refNo1 || ""} disabled={isFormDisabled} onChange={(val) => updateHd("refNo1", val)} />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer id="invType" label="Inv Type" type="text" value={hd.invType || ""} disabled readOnly />
              <FieldRenderer
                id="itemCode"
                label="Item Code"
                type="lookup"
                value={hd.itemCode || ""}
                readOnly
                disabled={isFormDisabled}
                lookupDisabled={isFormDisabled}
                onLookup={() => !isFormDisabled && setLookupOpen((prev) => ({ ...prev, bom: true }))}
              />
              <FieldRenderer id="itemName" label="Item Description" type="text" value={hd.itemName || ""} disabled readOnly />
              <FieldRenderer id="uomCode" label="UOM Code" type="text" value={hd.uomCode || ""} disabled readOnly />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer id="woStatus" label="WO Status" type="select" value={hd.woStatus || "O"} disabled={isFormDisabled} options={woStatusOptions} onChange={(val) => updateHd("woStatus", val)} />
            </div>

            <div className="col-span-full">
              <div className="relative p-2">
                <textarea id="remarks" rows={4} className="peer global-tran-textbox-remarks-ui pt-2" value={hd.remarks || ""} onChange={(e) => updateHd("remarks", e.target.value)} disabled={isFormDisabled} />
                <label htmlFor="remarks" className="global-tran-floating-label-remarks">Remarks</label>
              </div>
            </div>
          </div>
        </div>

        <div className="global-tran-subheader-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button type="button" className={infoTabClass("bom")} onClick={() => setInfoTab("bom")}>BOM Information</button>
            <button type="button" className={infoTabClass("other")} onClick={() => setInfoTab("other")}>Other Information</button>
            <button type="button" className={infoTabClass("run")} onClick={() => setInfoTab("run")}>Over/(Under) Run</button>
          </div>

          {infoTab === "bom" && (
            <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 xl:grid-cols-4">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="bomCode" label="BOM Code" type="text" value={hd.bomCode || ""} disabled readOnly />
                <FieldRenderer id="bomDate" label="BOM Date" type="text" value={hd.bomDate || ""} disabled readOnly />
                <FieldRenderer id="bomQty" label="BOM Qty" type="number" value={hd.bomQty} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="batchQty" label="Batch Qty" type="number" value={hd.batchQty} disabled={isFormDisabled} onChange={(val) => updateHd("batchQty", val)} />
                <FieldRenderer id="woQty" label="Qty to Produce" type="amount" value={qty(hd.woQty)} disabled readOnly />
                <FieldRenderer id="worQty" label="WO Receipt Qty" type="amount" value={qty(hd.worQty)} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="totalMatcost" label="Direct Material Cost" type="amount" value={money(hd.totalMatcost)} disabled readOnly />
                <FieldRenderer id="stdLabor" label="STD Labor Cost" type="amount" value={money(hd.stdLabor)} disabled readOnly />
                <FieldRenderer id="stdOverhead" label="STD Overhead Cost" type="amount" value={money(hd.stdOverhead)} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="woAmt" label="WO Amount" type="amount" value={money(hd.woAmt)} disabled readOnly />
                <FieldRenderer id="woUnitcost" label="WO Unit Cost" type="amount" value={money(hd.woUnitcost, 6)} disabled readOnly />
                <FieldRenderer id="worAmt" label="WOR Receipt Amount" type="amount" value={money(hd.worAmt)} disabled readOnly />
              </div>
            </div>
          )}

          {infoTab === "other" && (
            <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3">
              <div className="global-tran-textbox-group-div-ui">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FieldRenderer id="otherRouteCode" label="Route Code" type="text" value={hd.routeCode || ""} disabled readOnly />
                  <FieldRenderer id="wcCode" label="Work Center Code" type="text" value={hd.wcCode || ""} disabled readOnly />
                </div>
                <FieldRenderer id="wcName" label="Work Center Name" type="text" value={hd.wcName || ""} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="otherVendCode"
                  label="Payee Code"
                  type="lookup"
                  value={hd.vendCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && setLookupOpen((prev) => ({ ...prev, vendor: true }))}
                />
                <FieldRenderer id="otherVendName" label="Payee Name" type="text" value={hd.vendName || ""} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="estRunTime" label="Est. Run Time" type="number" value={hd.estRunTime || 0} disabled readOnly />
                <FieldRenderer id="otherActualRuntime" label="Actual Run Time" type="number" value={hd.actualRuntime || 0} disabled={isFormDisabled} onChange={(val) => updateHd("actualRuntime", val)} />
              </div>
            </div>
          )}

          {infoTab === "run" && (
            <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3">
              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="runTranType" label="Transaction" type="select" value={hd.tranType || "JV"} disabled={isFormDisabled} options={tranTypeOptions} onChange={(val) => updateHd("tranType", val)} />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer
                  id="runAcctCode"
                  label="Account Code"
                  type="lookup"
                  value={hd.acctCode || ""}
                  readOnly
                  disabled={isFormDisabled}
                  lookupDisabled={isFormDisabled}
                  onLookup={() => !isFormDisabled && setLookupOpen((prev) => ({ ...prev, account: true }))}
                />
                <FieldRenderer id="runAcctName" label="Account Name" type="text" value={hd.acctName || ""} disabled readOnly />
              </div>

              <div className="global-tran-textbox-group-div-ui">
                <FieldRenderer id="varQty" label="Over/Under Run Qty" type="amount" value={qty(overUnderQty)} disabled readOnly />
                <FieldRenderer id="overUnderAmt" label="Over/Under Amount" type="amount" value={money(overUnderAmt)} disabled readOnly />
              </div>
            </div>
          )}
        </div>

        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Item Details</span>
            </div>
          </div>
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-[1450px] border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_tr>td:first-child]:border-l [&_th]:border-b [&_th]:border-slate-200">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {[
                      "LN",
                      "Type",
                      "Item Code",
                      "Item Description",
                      "UOM",
                      "BOM Qty Needed",
                      "Scrap Qty",
                      "Required Qty",
                      "Issued Qty",
                      "Unserved Qty",
                      "Qty on Hand",
                      "Issued Amt",
                      "Required Amt",
                      "Issued Ave. Cost",
                      "Variance Amt",
                    ].map((label) => (
                      <th key={label} className={`global-tran-th-ui ${label.includes("Qty") || label.includes("Amt") || label.includes("Cost") || label.includes("Rate") ? "text-right" : ""}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="relative">
                  {dt1.length === 0 ? (
                    <tr className="global-tran-tr-ui">
                      <td colSpan={15} className="global-tran-td-ui py-8 text-center text-slate-500">
                        Load a BOM to generate Work Order item details.
                      </td>
                    </tr>
                  ) : (
                    dt1.map((row, index) => (
                      <tr key={`${row.itemCode}-${index}`} className="global-tran-tr-ui">
                        <td className="global-tran-td-ui font-mono">{String(row.lineNo).padStart(3, "0")}</td>
                        <td className="global-tran-td-ui font-semibold text-blue-700">{row.invType}</td>
                        <td className="global-tran-td-ui font-mono">{row.itemCode}</td>
                        <td className="global-tran-td-ui">{row.itemName}</td>
                        <td className="global-tran-td-ui">{row.uomCode}</td>
                        <td className="global-tran-td-ui text-right">{qty(row.qtyNeeded)}</td>
                        <td className="global-tran-td-ui">
                          <input
                            type="number"
                            value={row.scrapQty}
                            onChange={(e) => updateRow(index, "scrapQty", e.target.value)}
                            disabled={isFormDisabled}
                            className="global-tran-td-inputclass-ui text-right"
                          />
                        </td>
                        <td className="global-tran-td-ui text-right">{qty(row.requiredQty)}</td>
                        <td className="global-tran-td-ui">
                          <input
                            type="number"
                            value={row.issuedQty}
                            onChange={(e) => updateRow(index, "issuedQty", e.target.value)}
                            disabled={isFormDisabled}
                            className="global-tran-td-inputclass-ui text-right"
                          />
                        </td>
                        <td className={`global-tran-td-ui text-right ${n(row.unservedQty) > 0 ? "font-bold text-red-600" : ""}`}>{qty(row.unservedQty)}</td>
                        <td className="global-tran-td-ui text-right">{qty(row.qtyHand)}</td>
                        <td className="global-tran-td-ui text-right">{money(row.issuedAmt)}</td>
                        <td className="global-tran-td-ui text-right">{money(row.requiredAmt)}</td>
                        <td className="global-tran-td-ui">
                          <input
                            type="number"
                            value={row.issuedWac}
                            onChange={(e) => updateRow(index, "issuedWac", e.target.value)}
                            disabled={isFormDisabled}
                            className="global-tran-td-inputclass-ui text-right"
                          />
                        </td>
                        <td className="global-tran-td-ui text-right">{money(row.varianceAmt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui" />
            <div className="global-tran-tab-footer-total-main-div-ui">
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Required Amt:</label>
                <label className="global-tran-tab-footer-total-value-ui">{money(totals.requiredAmt)}</label>
              </div>
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Issued Amt:</label>
                <label className="global-tran-tab-footer-total-value-ui">{money(totals.issuedAmt)}</label>
              </div>
              <div className="global-tran-tab-footer-total-div-ui">
                <label className="global-tran-tab-footer-total-label-ui">Variance Amt:</label>
                <label className="global-tran-tab-footer-total-value-ui">{money(totals.varianceAmt)}</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={activeTab === "history" ? "" : "hidden"}>
        <div className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <div className="flex flex-row sm:flex-row">
              <span className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">Transaction History</span>
            </div>
            <button type="button" className="global-tran-button-lookup" onClick={fetchHistory} disabled={loading}>
              Refresh
            </button>
          </div>
          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-[1100px] border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-200 [&_tr>td:first-child]:border-l [&_th]:border-b [&_th]:border-slate-200">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {["WO No", "WO Date", "BOM Code", "Item", "Batch Qty", "WO Qty", "FG Amount", "Status", "User"].map((label) => (
                      <th key={label} className={`global-tran-th-ui ${label.includes("Qty") || label.includes("Amount") ? "text-right" : ""}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr className="global-tran-tr-ui">
                      <td colSpan={9} className="global-tran-td-ui py-8 text-center text-slate-500">No Work Order history found.</td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr
                        key={row.woId || row.woNo}
                        className="global-tran-tr-ui cursor-pointer"
                        onDoubleClick={() => loadWO(row.woNo, row.woId)}
                      >
                        <td className="global-tran-td-ui font-mono font-semibold">{row.woNo}</td>
                        <td className="global-tran-td-ui">{toDateInput(row.woDate)}</td>
                        <td className="global-tran-td-ui">{row.bomCode}</td>
                        <td className="global-tran-td-ui">{row.itemCode} - {row.itemName}</td>
                        <td className="global-tran-td-ui text-right">{qty(row.batchQty, 2)}</td>
                        <td className="global-tran-td-ui text-right">{qty(row.woQty, 2)}</td>
                        <td className="global-tran-td-ui text-right">{money(row.woAmt)}</td>
                        <td className="global-tran-td-ui">{row.statusDesc || STATUS[row.woStatus] || STATUS[row.status] || "Open"}</td>
                        <td className="global-tran-td-ui">{row.userId}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <BOMReferenceLookupModal
        isOpen={lookupOpen.bom}
        onClose={handleBOMSelect}
      />

      <COAMastLookupModal
        isOpen={lookupOpen.account}
        onClose={handleAccountSelect}
        title="Select Account"
      />

      <PayeeMastLookupModal
        isOpen={lookupOpen.vendor}
        onClose={handleVendorSelect}
        customParam="ActiveAll"
      />
    </div>
  );
}
