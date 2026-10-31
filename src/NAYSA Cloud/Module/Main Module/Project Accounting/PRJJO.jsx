import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";

import Header from "@/NAYSA Cloud/Components/Header.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import DateFormatInput from "@/NAYSA Cloud/Global/DateFormatInput.jsx";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef.jsx";
import SearchProjectRef from "@/NAYSA Cloud/Lookup/SearchProjectRef.jsx";
import CurrLookupModal from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";
import CancelTranModal from "@/NAYSA Cloud/Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import PermissionBadge from "@/NAYSA Cloud/Global/PermissionBadge.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { usePagePermission } from "@/NAYSA Cloud/Global/usePagePermission.js";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData.js";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useGetCurrentDayV2,
  useformatToDatev2,
} from "@/NAYSA Cloud/Global/dates.js";
import {
  transactionActionsCellStyle,
  transactionActionsHeaderStyle,
  useResizableTableColumns,
} from "@/NAYSA Cloud/Global/datatable.jsx";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";

const DOC_TYPE = "PRJ_JO";
const COMPONENT_KEY = "PRJJO";
const DETAILS_ROUTE = "/page/PRJJO";

const emptyDetailRow = (
  lineNo,
  currCode = "",
  currRate = 1,
  transactionDate = ""
) => ({
  lineNo,
  groupId: "",
  tranDate: transactionDate,
  custPo: "",
  stat: "O",
  type: "O",
  description: "",
  amount: "0.00",
  remarks: "",
  code: "",
  boqNo: "",
  currCode,
  currRate: formatNumber(currRate || 1, 5),
});

const parseProcedureResult = (response) => {
  const raw = response?.data?.data?.[0]?.result;
  if (!raw) return null;
  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const PRJJO = () => {
  const location = useLocation();
  const loadedFromUrlRef = useRef(false);
  const { currentUserRow, companyInfo, getAllTopHSDocRow } = useAuth();
  const hsDoc = getAllTopHSDocRow?.(DOC_TYPE) || {};
  const documentTitle = `${hsDoc?.docName || "Project Job Order"} Transaction`;

  const [topTab, setTopTab] = useState("details");
  const [isLoading, setIsLoading] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [detailColumnConfig, setDetailColumnConfig] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [currencyDetailIndex, setCurrencyDetailIndex] = useState(null);
  const [state, setState] = useState({
    documentID: "",
    documentNo: "",
    documentDate: useGetCurrentDayV2(),
    documentStatus: "",
    status: "OPEN",
    noReprints: 0,
    branchCode: currentUserRow?.branchCode || "",
    branchName: currentUserRow?.branchName || "",
    projCode: "",
    projName: "",
    custCode: "",
    custName: "",
    actCode: "",
    phaseCode: "",
    siteCode: "",
    projStat: "",
    rcCode: "",
    rcName: "",
    currCode: companyInfo?.currCode || "PHP",
    currRate: formatNumber(companyInfo?.currRate || 1, 6),
    remarks: "",
    detailRows: [],
    isDocNoDisabled: false,
    isFetchDisabled: false,
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
  });

  const updateState = useCallback((updates) => {
    setState((previous) => ({ ...previous, ...updates }));
  }, []);

  const {
    pagePermission,
    isReadOnly,
    isFullAccess,
    canSave,
    canCancel,
  } = usePagePermission({
    componentKey: COMPONENT_KEY,
    menuName: documentTitle,
    debug: false,
  });

  const isCancelled =
    String(state.documentStatus || "").toUpperCase() === "F" ||
    String(state.status || "").toUpperCase() === "CANCELLED";
  const isFormDisabled = isReadOnly || isCancelled;
  const projectStatusOptions = [
    { value: "N", label: "New" },
    { value: "O", label: "On-Going" },
    { value: "C", label: "Completed" },
  ];
  const detailStatusOptions = [
    { value: "O", label: "Open" },
    { value: "C", label: "Closed" },
  ];
  const detailTypeOptions = [
    { value: "O", label: "Original Contract" },
    { value: "A", label: "Additive" },
    { value: "D", label: "Deductive" },
  ];
  const totalAmount = useMemo(
    () =>
      state.detailRows.reduce(
        (total, row) => total + parseFormattedNumber(row.amount || 0),
        0
      ),
    [state.detailRows]
  );

  const defaultDetailColumnDefs = useMemo(
    () => [
      { key: "lineNo", label: "LN", width: 56 },
      { key: "tranDate", label: "Date", width: 140 },
      { key: "custPo", label: "Cust Ref No", width: 160 },
      { key: "stat", label: "Status", width: 110 },
      { key: "type", label: "Type", width: 160 },
      { key: "description", label: "Description", width: 300 },
      { key: "amount", label: "Amount", width: 140 },
      { key: "currCode", label: "Currency", width: 160 },
      { key: "currRate", label: "Rate", width: 120 },
      { key: "boqNo", label: "BOQ No.", width: 140 },
    ],
    []
  );

  const detailColumnDefs = useMemo(() => {
    if (!detailColumnConfig.length) return defaultDetailColumnDefs;

    const defaults = new Map(
      defaultDetailColumnDefs.map((column) => [column.key, column])
    );

    return detailColumnConfig
      .filter(
        (column) => Number(column.hidden || 0) !== 1 && defaults.has(column.key)
      )
      .map((column) => ({
        ...defaults.get(column.key),
        label: column.label || defaults.get(column.key).label,
      }));
  }, [defaultDetailColumnDefs, detailColumnConfig]);

  const {
    getColumnStyle,
    getFrozenColumnStyle,
    getOrderedColumns,
    getSortedRows,
    renderHeaderContextMenu,
    renderResizableHeader,
  } = useResizableTableColumns(detailColumnDefs);

  const orderedDetailColumns = getOrderedColumns(detailColumnDefs);
  const sortedDetailRows = getSortedRows(
    state.detailRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, sortKey) =>
      sortKey === "lineNo"
        ? entry.originalIndex + 1
        : entry.row?.[sortKey] ?? ""
  );

  const getDetailCellStyle = (column) => ({
    ...getColumnStyle(column.key, column.width),
    ...getFrozenColumnStyle(
      column.key,
      orderedDetailColumns,
      column.width,
      { isHeader: false }
    ),
  });

  useEffect(() => {
    let active = true;

    const loadCurrencies = async () => {
      try {
        const response = await apiClient.get("/lookupCurr", {
          params: { PARAMS: JSON.stringify({ search: "", page: 1, pageSize: 1000 }) },
        });
        const raw = response?.data?.data?.[0]?.result || "[]";
        const rows = Array.isArray(raw) ? raw : JSON.parse(raw);
        if (active) {
          setCurrencyOptions(
            rows.map((row) => ({
              value: row.currCode || "",
              label: row.currName || row.currCode || "",
            }))
          );
        }
      } catch {
        if (active) setCurrencyOptions([]);
      }
    };

    loadCurrencies();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.title = documentTitle;
  }, [documentTitle]);

  useEffect(() => {
    let active = true;

    const loadDetailColumnConfig = async () => {
      const config = await useSelectedHSColConfig(
        "PRJ_JO_Detail",
        currentUserRow?.userCode || ""
      );

      if (active && Array.isArray(config)) {
        setDetailColumnConfig(config);
      }
    };

    loadDetailColumnConfig();

    return () => {
      active = false;
    };
  }, [currentUserRow?.userCode]);

  const resetForm = useCallback(() => {
    updateState({
      documentID: "",
      documentNo: "",
      documentDate: useGetCurrentDayV2(),
      documentStatus: "",
      status: "OPEN",
      noReprints: 0,
      branchCode: currentUserRow?.branchCode || "",
      branchName: currentUserRow?.branchName || "",
      projCode: "",
      projName: "",
      custCode: "",
      custName: "",
      actCode: "",
      phaseCode: "",
      siteCode: "",
      projStat: "",
      rcCode: "",
      rcName: "",
      currCode: companyInfo?.currCode || "PHP",
      currRate: formatNumber(companyInfo?.currRate || 1, 6),
      remarks: "",
      detailRows: [],
      isDocNoDisabled: false,
      isFetchDisabled: false,
    });
  }, [companyInfo, currentUserRow, updateState]);

  const loadDocument = useCallback(
    async (docNo, branchCode = state.branchCode, direction = "") => {
      if (!branchCode || (!docNo && !direction)) return;

      setIsLoading(true);
      try {
        const response = await apiClient.get("/getPRJJO", {
          params: { joNo: docNo || "", branchCode, direction },
        });
        const data = parseProcedureResult(response);

        if (!data?.joId) {
          await Swal.fire({
            icon: "info",
            title: "No Records Found",
            text: "Project Job Order does not exist.",
          });
          return;
        }

        updateState({
          documentID: data.joId || "",
          documentNo: data.joNo || "",
          documentDate: useformatToDatev2(data.joDate),
          documentStatus: data.documentStatus || "",
          status: data.docStatus || "OPEN",
          noReprints: data.noReprints || 0,
          branchCode: data.branchCode || branchCode,
          branchName: data.branchName || state.branchName,
          projCode: data.projCode || "",
          projName: data.projName || "",
          custCode: data.custCode || "",
          custName: data.custName || "",
          actCode: data.actCode || "",
          phaseCode: data.phaseCode || "",
          siteCode: data.siteCode || "",
          projStat: data.projStat || "",
          rcCode: data.rcCode || "",
          rcName: data.rcName || "",
          currCode: data.currCode || companyInfo?.currCode || "PHP",
          currRate: formatNumber(data.currRate || 1, 6),
          remarks: data.remarks || "",
          detailRows: (data.dt1 || []).map((row, index) => ({
            ...emptyDetailRow(index + 1, data.currCode, data.currRate),
            ...row,
            lineNo: row.lineNo || index + 1,
            stat: row.boqNo ? "C" : row.stat || "O",
            tranDate: row.tranDate ? useformatToDatev2(row.tranDate) : "",
            amount: formatNumber(row.amount || 0, 2),
            currRate: formatNumber(row.currRate || 1, 5),
          })),
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title: "Retrieval Error",
          text:
            error?.response?.data?.details ||
            error?.response?.data?.message ||
            error.message,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [companyInfo, state.branchCode, state.branchName, updateState]
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const docNo = params.get("joNo");
    const branchCode = params.get("branchCode");

    if (!loadedFromUrlRef.current && docNo && branchCode) {
      loadedFromUrlRef.current = true;
      loadDocument(docNo, branchCode);
    }
  }, [loadDocument, location.search]);

  const updateDetail = (index, field, value) => {
    setState((previous) => ({
      ...previous,
      detailRows: previous.detailRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    }));
  };

  const addDetailRow = () => {
    if (!String(state.projCode || "").trim()) {
      useSwalErrorAlert(
        "Project Job Order Required",
        "Select a Project Code before adding Customer Order Details."
      );
      return;
    }

    updateState({
      detailRows: [
        ...state.detailRows,
        emptyDetailRow(
          state.detailRows.length + 1,
          state.currCode,
          state.currRate,
          state.documentDate
        ),
      ],
    });
  };

  const removeDetailRow = (index) => {
    if (state.detailRows[index]?.boqNo) {
      Swal.fire({
        icon: "warning",
        title: "Linked BOQ Detail",
        text: "A Customer Order Detail with a BOQ No. cannot be deleted.",
      });
      return;
    }

    updateState({
      detailRows: state.detailRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, lineNo: rowIndex + 1 })),
    });
  };

  const validateBeforeSave = () => {
    if (!state.branchCode || !state.documentDate || !state.projCode) {
      Swal.fire({
        icon: "warning",
        title: "Required Fields",
        text: "Branch, Job Order Date, and Project Code are required.",
      });
      return false;
    }

    if (!state.detailRows.length) {
      Swal.fire({
        icon: "warning",
        title: "Required Details",
        text: "Add at least one Project Job Order detail.",
      });
      return false;
    }

    return true;
  };

  const saveDocument = async () => {
    if (!canSave || isFormDisabled || !validateBeforeSave()) return;

    setIsLoading(true);
    try {
      const payload = {
        branchCode: state.branchCode,
        joNo: state.documentNo,
        joId: state.documentID,
        joDate: state.documentDate,
        projCode: state.projCode,
        projName: state.projName,
        custCode: state.custCode,
        custName: state.custName,
        actCode: state.actCode,
        phaseCode: state.phaseCode,
        siteCode: state.siteCode,
        projStat: state.projStat,
        currCode: state.currCode,
        currRate: parseFormattedNumber(state.currRate || 1),
        remarks: state.remarks,
        userCode: currentUserRow?.userCode || "",
        dt1: state.detailRows.map((row, index) => ({
          lineNo: index + 1,
          groupId: row.groupId || "",
          tranDate: row.tranDate || null,
          custPo: row.custPo || "",
          stat: row.boqNo ? "C" : row.stat || "",
          type: row.type || "",
          description: row.description || "",
          amount: parseFormattedNumber(row.amount || 0),
          remarks: row.remarks || "",
          code: row.code || "",
          boqNo: row.boqNo || "",
          currCode: row.currCode || state.currCode,
          currRate: parseFormattedNumber(row.currRate || state.currRate || 1),
        })),
        dt2: [],
      };

      const response = await apiClient.post("/upsertPRJJO", {
        json_data: payload,
      });
      const result = response?.data?.data?.[0] || {};

      if (result.errorCount) {
        throw new Error(result.errorMsg || "Unable to save Project Job Order.");
      }

      const savedDocNo = result.docNo || state.documentNo;
      await loadDocument(savedDocNo, state.branchCode);
      useSwalshowSaveSuccessDialog(resetForm, printDocument);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Save Error",
        text:
          error?.response?.data?.details ||
          error?.response?.data?.message ||
          error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const printDocument = async () => {
    if (!state.documentID || isCancelled) return;

    setIsLoading(true);
    try {
      await useHandlePrint(
        state.documentID,
        DOC_TYPE,
        "Inline",
        currentUserRow?.userCode || ""
      );
    } catch (error) {
      useSwalErrorAlert(
        "Print Error",
        error?.response?.data?.details ||
          error?.response?.data?.message ||
          error.message
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openAttachment = () => {
    if (!isFullAccess || !state.documentID) return;
    setAttachModalOpen(true);
  };

  const cancelDocument = () => {
    if (!canCancel || !state.documentID || isCancelled) return;
    setCancelModalOpen(true);
  };

  const handleCloseCancel = async (confirmation) => {
    if (!confirmation) {
      setCancelModalOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post("/cancelPRJJO", {
        userPassword: confirmation.password,
        userCode: currentUserRow?.userCode || "",
        json_data: {
          docCode: DOC_TYPE,
          documentID: state.documentID,
          userCode: currentUserRow?.userCode || "",
          reason: String(confirmation.reason || "").trim(),
        },
      });
      await loadDocument(state.documentNo, state.branchCode);
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Cancellation completed.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Cancellation Error",
        text:
          error?.response?.data?.details ||
          error?.response?.data?.message ||
          error.message,
      });
    } finally {
      setIsLoading(false);
      setCancelModalOpen(false);
    }
  };

  const detailInput = (index, field, options = {}) => {
    const row = state.detailRows[index];
    const common =
      "global-tran-td-inputclass-ui w-full border-0 bg-transparent text-xs focus:outline-none focus:ring-0";

    if (options.date) {
      return (
        <DateFormatInput
          id={`${field}${index}`}
          value={row[field] || ""}
          disabled={isFormDisabled || Boolean(row.boqNo)}
          className={common}
          updateState={(updates) =>
            updateDetail(index, field, updates[`${field}${index}`])
          }
        />
      );
    }

    if (options.select) {
      return (
        <select
          value={row[field] || ""}
          disabled={isFormDisabled || Boolean(row.boqNo) || options.readOnly}
          className={`${common} cursor-pointer`}
          onChange={(event) => updateDetail(index, field, event.target.value)}
        >
          <option value=""></option>
          {options.select.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (options.currencyLookup) {
      const currencyName =
        currencyOptions.find((option) => option.value === row.currCode)?.label ||
        row.currCode ||
        "";

      return (
        <div className="flex w-full items-center">
          <input
            value={currencyName}
            readOnly
            disabled={isFormDisabled || Boolean(row.boqNo)}
            className={`${common} cursor-pointer pr-1`}
            onClick={() =>
              !isFormDisabled && !row.boqNo && setCurrencyDetailIndex(index)
            }
          />
          {!isFormDisabled && !row.boqNo && (
            <button
              type="button"
              onClick={() => setCurrencyDetailIndex(index)}
              className="px-2 text-blue-600 hover:text-blue-800"
              title="Search Currency"
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
          )}
        </div>
      );
    }

    return (
      <input
        value={row[field] ?? ""}
        disabled={isFormDisabled || Boolean(row.boqNo) || options.readOnly}
        className={`${common} ${options.numeric ? "text-right" : ""}`}
        onChange={(event) => {
          const value = options.numeric
            ? event.target.value.replace(/[^0-9.-]/g, "")
            : event.target.value;
          updateDetail(index, field, value);
        }}
        onFocus={(event) => {
          if (
            options.numeric &&
            parseFormattedNumber(event.target.value || 0) === 0
          ) {
            updateDetail(index, field, "");
          }
        }}
        onBlur={() => {
          if (options.numeric) {
            updateDetail(
              index,
              field,
              formatNumber(row[field] || 0, options.decimals || 2)
            );
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && options.numeric) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    );
  };

  const statusLabel = isCancelled
    ? "CANCELLED"
    : state.status || (state.documentID ? "OPEN" : "NEW");

  return (
    <div className="global-tran-main-div-ui">
      {isLoading && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={DOC_TYPE}
          activeTopTab={topTab}
          detailsRoute={DETAILS_ROUTE}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation
          showActions={topTab === "details"}
          showResetAction={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          showPost={false}
          onReset={resetForm}
          onSave={saveDocument}
          onCancel={cancelDocument}
          onPrint={printDocument}
          onAttach={openAttachment}
          printData={{
            documentNo: state.documentNo,
            documentID: state.documentID,
            branchCode: state.branchCode,
            branchName: state.branchName,
            docType: DOC_TYPE,
          }}
          isSaveDisabled={!canSave || isFormDisabled || !state.detailRows.length}
          isResetDisabled={isLoading}
          isCancelDisabled={!canCancel || !state.documentID || isCancelled}
          isPrintDisabled={!state.documentID || isCancelled}
          isAttachDisabled={!isFullAccess || !state.documentID}
        />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>
        <div className="global-tran-header-ui">
          <div className="global-tran-headertext-div-ui">
            <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
          </div>
          <div className="global-tran-headerstat-div-ui flex items-center gap-6">
            <PermissionBadge
              permission={pagePermission}
              isReadOnly={isReadOnly}
              isFullAccess={isFullAccess}
            />
            <div>
              <p className="global-tran-headerstat-text-ui">Transaction Status</p>
              <h1
                className={`global-tran-stat-text-ui uppercase ${
                  isCancelled ? "text-red-600" : "text-blue-700"
                }`}
              >
                {statusLabel}
              </h1>
            </div>
          </div>
        </div>

        <section className="global-tran-header-div-ui">
          <div className="global-tran-header-tab-div-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Basic Information
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="branchName"
                label="Branch"
                type="lookup"
                value={state.branchName}
                disabled={state.isFetchDisabled || isFormDisabled}
                onLookup={() => setBranchModalOpen(true)}
              />
              <FieldRenderer
                id="joNo"
                label="Job Order No."
                type="text"
                value={state.documentNo}
                disabled={state.isDocNoDisabled}
                onChange={(value) => updateState({ documentNo: value })}
                onBlur={() =>
                  !state.documentID &&
                  state.documentNo &&
                  loadDocument(state.documentNo, state.branchCode)
                }
              />
              <div className="relative w-full">
                <div
                  className={`flex items-stretch global-ref-textbox-ui ${
                    !isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                  }`}
                >
                  <DateFormatInput
                    id="documentDate"
                    value={state.documentDate}
                    disabled={isFormDisabled}
                    className="peer flex-grow border-none bg-transparent px-3 focus:outline-none"
                    updateState={updateState}
                  />
                </div>
                <label htmlFor="documentDate" className="global-ref-floating-label">
                  Job Order Date
                </label>
              </div>
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="projCode"
                label="Project Code"
                required
                type="lookup"
                value={state.projCode}
                disabled={isFormDisabled}
                onLookup={() => setProjectModalOpen(true)}
              />
              <FieldRenderer
                id="projName"
                label="Project Name"
                value={state.projName}
                readOnly
                disabled
              />
              <FieldRenderer
                id="projStat"
                label="Project Status"
                type="select"
                options={projectStatusOptions}
                value={state.projStat}
                readOnly
                disabled
              />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="custCode"
                label="Customer Code"
                value={state.custCode}
                disabled
              />
              <FieldRenderer
                id="custName"
                label="Customer Name"
                value={state.custName}
                disabled
              />
              <FieldRenderer
                id="actCode"
                label="Activity Code"
                value={state.actCode}
                readOnly
                disabled
              />
            </div>

            <div className="global-tran-textbox-group-div-ui">
              <FieldRenderer
                id="phaseCode"
                label="Phase Code"
                value={state.phaseCode}
                readOnly
                disabled
              />
              <FieldRenderer
                id="siteCode"
                label="Site Code"
                value={state.siteCode}
                readOnly
                disabled
              />
              <FieldRenderer
                id="rcCode"
                label="Responsibility Center Code"
                value={state.rcCode}
                readOnly
                disabled
              />
              <FieldRenderer
                id="rcName"
                label="Responsibility Center Name"
                value={state.rcName}
                readOnly
                disabled
              />
            </div>

            <div className="col-span-full">
              <div className="relative p-2">
                <textarea
                  id="remarks"
                  rows={3}
                  value={state.remarks}
                  disabled={isFormDisabled}
                  onChange={(event) => updateState({ remarks: event.target.value })}
                  className="peer global-tran-textbox-remarks-ui pt-2"
                />
                <label htmlFor="remarks" className="global-tran-floating-label-remarks">
                  Remarks
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="global-tran-tab-div-ui">
          <div className="global-tran-tab-nav-ui">
            <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">
              Customer Order Details
            </button>
          </div>

          <div className="global-tran-table-main-div-ui">
            <div className="global-tran-table-main-sub-div-ui">
              <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
                <thead className="global-tran-thead-div-ui">
                  <tr>
                    {orderedDetailColumns.map((column) =>
                      renderResizableHeader(
                        column.label,
                        column.key,
                        column.width,
                        { orderedColumns: orderedDetailColumns }
                      )
                    )}
                    {!isFormDisabled && (
                      <th
                        className="global-tran-th-ui sticky right-0 top-0 bg-blue-100 dark:bg-blue-900"
                        style={transactionActionsHeaderStyle}
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="relative">
                  {sortedDetailRows.length ? (
                    sortedDetailRows.map(({ row, originalIndex }) => (
                      <tr key={originalIndex} className="global-tran-tr-ui">
                        {orderedDetailColumns.map((column) => (
                          <td
                            key={column.key}
                            className={`global-tran-td-ui ${
                              column.key === "lineNo"
                                ? "text-center"
                                : column.key === "amount" || column.key === "currRate"
                                  ? "text-right"
                                  : ""
                            }`}
                            style={getDetailCellStyle(column)}
                          >
                            {column.key === "lineNo"
                              ? originalIndex + 1
                              : detailInput(
                                  originalIndex,
                                  column.key,
                                  column.key === "tranDate"
                                    ? { date: true }
                                    : column.key === "stat"
                                      ? { select: detailStatusOptions }
                                      : column.key === "type"
                                        ? { select: detailTypeOptions }
                                        : column.key === "currCode"
                                          ? { currencyLookup: true }
                                          : column.key === "boqNo"
                                            ? { readOnly: true }
                                    : column.key === "amount"
                                      ? { numeric: true, decimals: 2 }
                                      : column.key === "currRate"
                                        ? { numeric: true, decimals: 5 }
                                        : {}
                                )}
                          </td>
                        ))}
                        {!isFormDisabled && (
                          <td
                            className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black"
                            style={transactionActionsCellStyle}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!String(state.projCode || "").trim()) {
                                    useSwalErrorAlert(
                                      "Project Job Order Required",
                                      "Select a Project Code before adding Customer Order Details."
                                    );
                                    return;
                                  }

                                  const rows = [...state.detailRows];
                                  rows.splice(
                                    originalIndex + 1,
                                    0,
                                    emptyDetailRow(
                                      originalIndex + 2,
                                      state.currCode,
                                      state.currRate,
                                      state.documentDate
                                    )
                                  );
                                  updateState({
                                    detailRows: rows.map((item, index) => ({
                                      ...item,
                                      lineNo: index + 1,
                                    })),
                                  });
                                }}
                                className="global-tran-td-button-add-ui"
                                title="Add detail"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeDetailRow(originalIndex)}
                                disabled={Boolean(row.boqNo)}
                                className={`global-tran-td-button-delete-ui ${
                                  row.boqNo ? "cursor-not-allowed opacity-40" : ""
                                }`}
                                title={
                                  row.boqNo
                                    ? "Linked BOQ details cannot be deleted"
                                    : "Remove detail"
                                }
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : null}
                </tbody>
              </table>
              {renderHeaderContextMenu()}
            </div>
          </div>

          <div className="global-tran-tab-footer-main-div-ui">
            <div className="global-tran-tab-footer-button-div-ui">
              <button
                type="button"
                onClick={addDetailRow}
                className="global-tran-tab-footer-button-add-ui"
                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add
              </button>
            </div>
            <div className="global-tran-tab-footer-total-main-div-ui grid grid-cols-2 gap-1">
              <div className="global-tran-tab-footer-total-label-ui">
                Total Amount:
              </div>
              <div className="global-tran-tab-footer-total-value-ui text-right">
                {formatNumber(totalAmount, 2)}
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          isActive={topTab === "history"}
          endpoint="/getPRJJOHistory"
          cacheKey={`PRJ_JO:${state.branchCode}:${state.startDate}:${state.endDate}`}
          activeTabKey="PRJ_JO_Summary"
          branchCode={state.branchCode}
          startDate={state.startDate}
          endDate={state.endDate}
          status="All"
          historyExportName="Project Job Order History"
          onRowDoubleClick={(row) => {
            if (row?.docNo && row?.branchCode) {
              loadDocument(row.docNo, row.branchCode);
              setTopTab("details");
            }
          }}
        />
      </div>

      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={(branch) => {
            if (branch) {
              updateState({
                branchCode: branch.branchCode || "",
                branchName: branch.branchName || "",
              });
            }
            setBranchModalOpen(false);
          }}
        />
      )}

      <SearchProjectRef
        isOpen={projectModalOpen}
        onClose={(project) => {
          setProjectModalOpen(false);
          if (!project) return;
          updateState({
            projCode: project.projectCode || "",
            projName: project.projectName || "",
            projStat: project.projectStatus || "",
            custCode: project.customerCode || "",
            custName: project.customerName || "",
            actCode: project.activityCode || "",
            phaseCode: project.phaseCode || "",
            siteCode: project.siteCode || "",
            rcCode: project.rcCode || "",
            rcName: project.rcName || "",
          });
        }}
      />

      {currencyDetailIndex !== null && (
        <CurrLookupModal
          isOpen
          onClose={(currency) => {
            const rowIndex = currencyDetailIndex;
            setCurrencyDetailIndex(null);
            if (!currency || rowIndex === null) return;

            const currencyCode = currency.currCode || "";
            const isGlobalCurrency =
              currencyCode.trim().toUpperCase() ===
              String(companyInfo?.currCode || "").trim().toUpperCase();

            setState((previous) => ({
              ...previous,
              detailRows: previous.detailRows.map((row, index) =>
                index === rowIndex
                  ? {
                      ...row,
                      currCode: currencyCode,
                      currRate: formatNumber(
                        isGlobalCurrency ? companyInfo?.currRate || 1 : 0,
                        5
                      ),
                    }
                  : row
              ),
            }));
          }}
        />
      )}

      {cancelModalOpen && (
        <CancelTranModal
          isOpen={cancelModalOpen}
          onClose={handleCloseCancel}
        />
      )}

      {attachModalOpen && (
        <AttachDocumentModal
          isOpen={attachModalOpen}
          params={{
            DocumentID: state.documentID,
            DocumentName: hsDoc?.docName || "Project Job Order",
            BranchName: state.branchName,
            DocumentNo: state.documentNo,
          }}
          onClose={() => setAttachModalOpen(false)}
        />
      )}
    </div>
  );
};

export default PRJJO;
