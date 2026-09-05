import { useCallback, useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCar,
  faCalculator,
  faEllipsis,
  faIdCard,
  faMagnifyingGlass,
  faMoneyBill,
  faPlus,
  faReceipt,
  faTag,
  faTrashAlt,
  faUser,
  faUsers,
  faWarehouse,
} from "@fortawesome/free-solid-svg-icons";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import SearchSalesRepRef from "../../../Lookup/SearchSalesRepRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import SearchVEAvailabilityVSO from "../../../Lookup/SearchVEAvailabilityVSO.jsx";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";
import {
  docTypeNames,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";
import {
  useTopDocControlRow,
  useTopDocDropDown,
  useTopBillTermRow as fetchTopBillTermRow,
} from "@/NAYSA Cloud/Global/top1RefTable";
import { apiClient, postRequest, fetchDataJson } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
  useTransactionUpsert,
  useFetchTranData,
  useHandleCancel,
  useFieldLenghtCheck,
} from "@/NAYSA Cloud/Global/procedure";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";
import {
  formatNumber,
  parseFormattedNumber,
  useSwalErrorAlert,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const todayISO = () => new Date().toISOString().split("T")[0];
const yesterdayISO = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};
const n = (value) => Number(parseFormattedNumber(value ?? 0)) || 0;
const round2 = (value) => Math.round((n(value) + Number.EPSILON) * 100) / 100;
const clamp = (value, min, max) => Math.min(max, Math.max(min, n(value)));
const toDateInput = (value) => (value ? String(value).substring(0, 10) : "");

const initialAmountRow = (index = 0, dtlType = "") => ({
  lnNo: index + 1,
  dtlType,
  descrip: "",
  amount: "0.00",
});

const initialIssueRow = (index = 0) => ({
  lnNo: index + 1,
  veId: "",
  itemCode: "",
  itemName: "",
  uomCode: "",
  quantity: 0,
  unitCost: 0,
  itemCost: 0,
  whouseCode: "",
  locCode: "",
  qtyHand: 0,
  qstatCode: "",
  lotNo: "",
  bbDate: "",
  rrNo: "",
});

const FieldGroup = ({ title, icon, children, className = "" }) => (
  <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${className}`}>
    <div className="global-tran-header-tab-div-ui !mb-4 !justify-start">
      <h3 className="global-tran-tab-padding-ui global-tran-tab-text_active-ui inline-flex items-center gap-2">
        <FontAwesomeIcon icon={icon || faEllipsis} className="text-xs" />
        {title}
      </h3>
    </div>
    {children}
  </section>
);

const TabButton = ({ active, icon, label, onClick }) => (
  <button
    type="button"
    aria-selected={active}
    className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
      active
        ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
        : "text-slate-600 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-blue-300"
    }`}
    onClick={onClick}
  >
    <FontAwesomeIcon icon={icon} className="text-[0.7rem]" />
    <span>{label}</span>
  </button>
);

// VSO continues to use the shared renderer. Amount fields only keep a local draft
// while focused so formatting does not move the caret after every keystroke.
const Field = FieldRenderer;
const DecimalField = ({ value, onChange, onBlur, onKeyDown, maxValue, ...props }) => {
  const [draftValue, setDraftValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleFocus = (event) => {
    setDraftValue(String(parseFormattedNumber(value ?? 0)));
    setIsEditing(true);
    event.target.select();
  };

  const handleChange = (nextValue) => {
    const cleanValue = String(nextValue ?? "").replace(/,/g, "");
    if (!/^\d*(?:\.\d{0,2})?$/.test(cleanValue)) return;
    if (cleanValue !== "" && cleanValue !== "." && maxValue !== undefined && Number(cleanValue) > maxValue) return;

    setDraftValue(cleanValue);
    onChange?.(cleanValue);
  };

  const handleBlur = (event) => {
    const rawValue = draftValue === "" || draftValue === "." ? "0" : draftValue;
    const finalValue = maxValue !== undefined ? String(Math.min(Number(rawValue) || 0, maxValue)) : rawValue;
    setIsEditing(false);
    onChange?.(finalValue);
    onBlur?.(event);
  };

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== "Enter") return;

    event.preventDefault();
    event.currentTarget.blur();
  };

  return (
    <FieldRenderer
      {...props}
      type="amount"
      value={isEditing ? draftValue : value}
      hideClearButton
      inputMode="decimal"
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};

const AmountGrid = ({ title, rows, onChange, onAdd, onDelete, disabled }) => {
  const finishAmountEdit = (index, value, moveNext = false) => {
    onChange(index, "amount", formatNumber(n(value), 2));
    if (moveNext) requestAnimationFrame(() => document.getElementById(`amount-${title}-${index + 1}`)?.focus());
  };
  return (
  <div className="global-tran-table-main-div-ui overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
      <div>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{title}</div>
        <div className="text-[0.65rem] text-slate-500 dark:text-slate-400">{rows.length} {rows.length === 1 ? "entry" : "entries"}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="rounded-md border border-slate-200 bg-white px-3 py-1 text-right dark:border-slate-700 dark:bg-slate-800">
          <div className="text-[0.6rem] font-medium uppercase tracking-wide text-slate-400">Total Amount</div>
          <div className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
            {formatNumber(rows.reduce((sum, row) => sum + n(row.amount), 0), 2)}
          </div>
        </div>
        <button type="button" className="global-tran-tab-footer-button-add-ui !m-0" onClick={onAdd} disabled={disabled}>
          <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Item
        </button>
      </div>
    </div>
    <div className="global-tran-table-main-sub-div-ui max-h-[260px] overflow-auto">
      <table className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
        <thead className="global-tran-thead-div-ui sticky top-0 z-10">
          <tr className="global-tran-tr-ui">
            <th className="global-tran-th-ui w-14 text-center">LN</th>
            <th className="global-tran-th-ui min-w-[320px] text-left">Description</th>
            <th className="global-tran-th-ui w-40 text-right">Amount</th>
            <th className="global-tran-th-ui sticky right-0 w-20 bg-blue-100 text-center dark:bg-blue-900">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="p-4 text-center text-gray-400">No records.</td></tr>
          ) : rows.map((row, index) => (
            <tr key={`${row.dtlType || title}-${index}`} className="global-tran-tr-ui">
              <td className="global-tran-td-ui text-center">{index + 1}</td>
              <td className="global-tran-td-ui">
                <input
                  id={`amount-${title}-${index}`}
                  className="global-tran-td-inputclass-ui w-full"
                  value={row.descrip ?? ""}
                  disabled={disabled}
                  onChange={(e) => onChange(index, "descrip", e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]{0,2}"
                  className="global-tran-td-inputclass-ui w-full text-right"
                  value={row.amount ?? 0}
                  disabled={disabled}
                  onFocus={(e) => { if (n(e.target.value) === 0) onChange(index, "amount", ""); }}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/,/g, "");
                    if (/^\d*(?:\.\d{0,2})?$/.test(clean)) onChange(index, "amount", clean);
                  }}
                  onBlur={(e) => finishAmountEdit(index, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); finishAmountEdit(index, e.currentTarget.value, true); } }}
                />
              </td>
              <td className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black">
                <button
                  type="button"
                  className="global-tran-td-button-delete-ui"
                  disabled={disabled}
                  onClick={() => onDelete(index)}
                  title="Delete row"
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

const IssueGrid = ({ rows, onChange, onAdd, onDelete, disabled, warehouseValue, onWarehouseLookup }) => {
  const finishNumericEdit = (index, key, value, moveNext = false) => {
    onChange(index, key, formatNumber(n(value), 2));
    if (moveNext) requestAnimationFrame(() => document.getElementById(`issue-${key}-${index + 1}`)?.focus());
  };
  return (
  <div className="global-tran-table-main-div-ui overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/50">
      <div>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Accessories from Inventory</div>
        <div className="text-[0.65rem] text-slate-500 dark:text-slate-400">{rows.length} {rows.length === 1 ? "item" : "items"} · Total quantity {formatNumber(rows.reduce((sum, row) => sum + n(row.quantity), 0), 2)}</div>
      </div>
      <div className="flex min-w-[420px] items-center justify-end gap-2">
        <div className="w-72">
          <FieldRenderer
            id="inventoryWarehouse"
            label="Warehouse"
            type="lookup"
            required
            value={warehouseValue || ""}
            disabled={disabled}
            readOnly
            lookupDisabled={disabled}
            onLookup={onWarehouseLookup}
          />
        </div>
        <button type="button" className="global-tran-tab-footer-button-add-ui !m-0" onClick={onAdd} disabled={disabled || !warehouseValue}>
          <FontAwesomeIcon icon={faPlus} className="mr-2" /> Add Item
        </button>
      </div>
    </div>
    <div className="global-tran-table-main-sub-div-ui max-h-[300px] overflow-auto">
      <table className="min-w-[1350px] w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
        <thead className="global-tran-thead-div-ui sticky top-0 z-10">
          <tr className="global-tran-tr-ui">
            {[
              ["LN", "w-12"], ["Item Code", "w-28"], ["Item Description", "min-w-[220px]"],
              ["UOM", "w-20"], ["Quantity", "w-24"], ["Unit Cost", "w-28"], ["Amount", "w-28"], ["Lot No", "w-28"], ["BB Date", "w-28"],
              ["QC Status", "w-24"], ["Warehouse", "w-28"], ["Location", "w-28"],
              ["Qty on Hand", "w-28"], ["RR No", "w-28"], ["Actions", "w-24"],
            ].map(([label, width]) => <th key={label || "action"} className={`global-tran-th-ui ${width}`}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={15} className="p-4 text-center text-gray-400">No inventory accessories.</td></tr>
          ) : rows.map((row, index) => (
            <tr key={`issue-${index}`} className="global-tran-tr-ui">
              <td className="global-tran-td-ui text-center">{index + 1}</td>
              {[
                ["itemCode", false], ["itemName", false], ["uomCode", false], ["quantity", true], ["unitCost", true], ["itemCost", true],
                ["lotNo", false], ["bbDate", false], ["qstatCode", false], ["whouseCode", false],
                ["locCode", false], ["qtyHand", true], ["rrNo", false],
              ].map(([key, amount]) => (
                <td key={key} className="global-tran-td-ui">
                  <input
                    id={`issue-${key}-${index}`}
                    type={key === "bbDate" ? "date" : "text"}
                    inputMode={amount ? "decimal" : undefined}
                    className={`global-tran-td-inputclass-ui w-full ${amount ? "text-right" : ""}`}
                    value={key === "bbDate" ? toDateInput(row[key]) : amount && !String(row[key] ?? "").includes(".") ? formatNumber(n(row[key]), 2) : row[key] ?? ""}
                    disabled={disabled || ["itemCode", "itemName", "uomCode", "unitCost", "itemCost", "qtyHand", "rrNo"].includes(key)}
                    onFocus={(e) => { if (amount && !e.currentTarget.disabled && n(e.target.value) === 0) onChange(index, key, ""); }}
                    onChange={(e) => { const value=e.target.value.replace(/,/g, ""); if (!amount || /^\d*(?:\.\d{0,2})?$/.test(value)) onChange(index, key, value); }}
                    onBlur={(e) => { if (amount && !e.currentTarget.disabled) finishNumericEdit(index, key, e.target.value); }}
                    onKeyDown={(e) => { if (amount && !e.currentTarget.disabled && e.key === "Enter") { e.preventDefault(); finishNumericEdit(index, key, e.currentTarget.value, true); } }}
                  />
                </td>
              ))}
              <td className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black">
                  <button type="button" className="global-tran-td-button-delete-ui" disabled={disabled} onClick={() => onDelete(index)} title="Delete row">
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

const VSO = () => {
  const loadedFromUrlRef = useRef(false);
  const { resetFlag } = useReset();
  const {
    user,
    currentUserRow,
    getAllTopVatRow,
  } = useAuth();

  const docType = docTypes?.VSO || "VSO";
  const documentTitle = `${docTypeNames?.[docType] || "Vehicle Sales Order"} Transaction`;
  const pdfLink = docTypePDFGuide?.[docType];
  const videoLink = docTypeVideoGuide?.[docType];
  const defaultBranchCode = currentUserRow?.branchCode || "";
  const defaultBranchName = currentUserRow?.branchName || "";

  const [topTab, setTopTab] = useState("details");
  const [gridTab, setGridTab] = useState("accessories1");
  const [coMakerTab, setCoMakerTab] = useState("cm");

  const [state, setState] = useState({
    documentName: "",
    documentSeries: "S",
    documentDocLen: 8,
    documentID: null,
    documentNo: "",
    vsoDate: todayISO(),
    cutoffCode: "",
    status: "OPEN",
    vsoStatus: "O",
    cancelled: "",

    branchCode: defaultBranchCode,
    branchName: defaultBranchName,

    custCode: "",
    custName: "",
    custAdd1: "",
    custAdd2: "",
    emailAdd: "",
    telNo: "",
    custIdtype: "",
    custIdno: "",
    custIddateissued: "",
    custIddateend: "",
    custLtoclid: "",
    custLtobussid: "",
    custBirthdate: "",

    cmCustcode: "",
    cmCustname: "",
    cmAdd1: "",
    cmAdd2: "",
    cmEmailadd: "",
    cmTelno: "",
    cmIdtype: "",
    cmIdno: "",
    cmIddateissued: "",
    cmIddateend: "",

    cm2Custcode: "",
    cm2Custname: "",
    cm2Add1: "",
    cm2Add2: "",
    cm2Emailadd: "",
    cm2Telno: "",
    cm2Idtype: "",
    cm2Idno: "",
    cm2Iddateissued: "",
    cm2Iddateend: "",

    cm3Custcode: "",
    cm3Custname: "",
    cm3Add1: "",
    cm3Add2: "",
    cm3Emailadd: "",
    cm3Telno: "",
    cm3Idtype: "",
    cm3Idno: "",
    cm3Iddateissued: "",
    cm3Iddateend: "",

    csCustname: "",
    finCustcode: "",
    finCustname: "",
    pnRef: "",
    termsPayment: "",

    vehicleVeId: "",
    itemCode: "",
    itemName: "",
    csNo: "",
    make: "",
    modelYr: "",
    model: "",
    serialNo: "",
    engineNo: "",
    prodNo: "",
    color: "",
    pnpNo: "",
    csrNo: "",
    plateNo: "",
    mvfileNo: "",
    cerIns: "",

    sellerVendcode: "",
    sellerVendname: "",
    repCode: "",
    repName: "",
    mgtRepCode: "",
    mgtRepName: "",
    repCode2: "",
    repName2: "",
    billTerm: "",
    billTermName: "",
    modePayment: "",
    salesType: "",
    salesTypes: [],
    whouseCode: "",
    whouseName: "",
    risNo: "",
    drNo: "",
    siNo: "",

    sellingPrice: 0,
    discAmt: 0,
    netAmt: 0,
    vatRate: 0,
    vatAmt: 0,
    netUnitPrice: 0,
    totalUnitPrice: 0,
    dpRate: 0,
    dpAmt: 0,
    incidentalAmt: 0,
    totalDisc: 0,
    totalCashOutlay: 0,
    financedRate: 0,
    financedAmt: 0,
    financedCharges: 0,
    contractAmt: 0,
    moInstallmentrate: 0,
    moInstallment: 0,
    promptDisc: 0,
    netMoInstallment: 0,
    interestRate: 0,
    moPerce: 0,

    dateTimeReleased: "",
    dateFiled: "",
    dateInvestigated: "",
    dateApproved: "",

    particular1: "",
    particular2: "",
    particular3: "",

    accessories1Rows: [],
    accessories2Rows: [],
    incidentalRows: [],
    discountRows: [],
    issueRows: [],

    tblFieldArray: [],
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isFetchDisabled: false,
    branchModalOpen: false,
    customerModalOpen: false,
    customerLookupTarget: "customer",
    payeeLookupOpen: false,
    warehouseLookupOpen: false,
    billTermLookupOpen: false,
    salesRepLookupOpen: false,
    inventoryLookupOpen: false,
    inventoryLookupRows: [],
    inventoryLookupColumns: [],
    salesRepLookupTarget: "rep",
    showCancelModal: false,
    showAttachModal: false,
    showAllTranDocNo: false,
    showVehicleAvailability: false,
  });

  const updateState = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const displayStatus = String(state.status || "OPEN").trim().toUpperCase();
  const isFormDisabled = ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

  const getSalesVatRate = useCallback(() => {
    try {
      const vat = typeof getAllTopVatRow === "function" ? getAllTopVatRow("SV") : null;
      return n(vat?.vatRate ?? 0);
    } catch {
      return 0;
    }
  }, [getAllTopVatRow]);

  const recalcSales = useCallback((overrides = {}) => {
    setState((prev) => {
      const sellingPrice = n(overrides.sellingPrice ?? prev.sellingPrice);
      const discAmt = n(overrides.discAmt ?? prev.discAmt);
      const vatRate = n(overrides.vatRate ?? prev.vatRate ?? getSalesVatRate());
      const netAmt = round2(sellingPrice - discAmt);
      const totalUnitPrice = netAmt;
      const fraction = vatRate * 0.01;
      const vatAmt = fraction > 0 ? round2((netAmt * fraction) / (1 + fraction)) : 0;
      const netUnitPrice = round2(totalUnitPrice - vatAmt);

      let dpRate = n(overrides.dpRate ?? prev.dpRate);
      let dpAmt = n(overrides.dpAmt ?? prev.dpAmt);
      let financedRate = n(overrides.financedRate ?? prev.financedRate);
      let financedAmt = n(overrides.financedAmt ?? prev.financedAmt);

      if (sellingPrice === 0) {
        dpRate = 0;
        dpAmt = 0;
        financedRate = 0;
        financedAmt = 0;
      }

      const incidentalAmt = n(overrides.incidentalAmt ?? prev.incidentalAmt);
      const totalDisc = n(overrides.totalDisc ?? prev.totalDisc);
      const totalCashOutlay = round2(dpAmt + incidentalAmt - totalDisc);

      return {
        ...prev,
        ...overrides,
        sellingPrice,
        discAmt,
        vatRate,
        netAmt,
        totalUnitPrice,
        vatAmt,
        netUnitPrice,
        dpRate,
        dpAmt,
        financedRate,
        financedAmt,
        totalCashOutlay,
      };
    });
  }, [getSalesVatRate]);

  const recalcCashOutlay = useCallback((overrides = {}) => {
    setState((prev) => {
      const dpAmt = n(overrides.dpAmt ?? prev.dpAmt);
      const incidentalAmt = n(overrides.incidentalAmt ?? prev.incidentalAmt);
      const totalDisc = n(overrides.totalDisc ?? prev.totalDisc);
      return {
        ...prev,
        ...overrides,
        dpAmt,
        incidentalAmt,
        totalDisc,
        totalCashOutlay: round2(dpAmt + incidentalAmt - totalDisc),
      };
    });
  }, []);

  const recalcFromDpRate = useCallback((value) => {
    setState((prev) => {
      const dpRate = clamp(value, 0, 100);
      const totalUnitPrice = n(prev.totalUnitPrice);
      const dpAmt = round2(totalUnitPrice * dpRate * 0.01);
      const financedRate = round2(100 - dpRate);
      const financedAmt = round2(totalUnitPrice * financedRate * 0.01);
      return {
        ...prev,
        dpRate,
        dpAmt,
        financedRate,
        financedAmt,
        totalCashOutlay: round2(dpAmt + n(prev.incidentalAmt) - n(prev.totalDisc)),
      };
    });
  }, []);

  const recalcFromDpAmount = useCallback((value) => {
    setState((prev) => {
      const dpAmt = Math.max(0, n(value));
      const totalUnitPrice = n(prev.totalUnitPrice);
      const dpRate = totalUnitPrice === 0 ? 0 : round2((dpAmt / totalUnitPrice) * 100);
      const financedRate = round2(100 - dpRate);
      const financedAmt = round2(Math.max(0, totalUnitPrice - dpAmt));
      return {
        ...prev,
        dpAmt,
        dpRate,
        financedRate,
        financedAmt,
        totalCashOutlay: round2(dpAmt + n(prev.incidentalAmt) - n(prev.totalDisc)),
      };
    });
  }, []);

  const recalcFromFinanceRate = useCallback((value) => {
    setState((prev) => {
      const maxFinanceRate = Math.max(0, 100 - n(prev.dpRate));
      const financedRate = clamp(value, 0, maxFinanceRate);
      const financedAmt = round2(n(prev.totalUnitPrice) * financedRate * 0.01);
      return { ...prev, financedRate, financedAmt };
    });
  }, []);

  const recalcInstallmentFromTerm = useCallback((overrides = {}) => {
    setState((prev) => {
      const financedAmt = n(overrides.financedAmt ?? prev.financedAmt);
      const interestRate = n(overrides.interestRate ?? prev.interestRate);
      const enteredMonths = n(overrides.moInstallmentrate ?? prev.moInstallmentrate);
      const calcMonths = enteredMonths === 0 ? 1 : enteredMonths;
      const baseMOInstallment = financedAmt * (interestRate * 0.01 + 1);
      const moInstallment = Math.ceil(baseMOInstallment / calcMonths);
      const financedCharges = round2(moInstallment * calcMonths - financedAmt);
      const contractAmt = round2(moInstallment * calcMonths);
      const moPerce = enteredMonths > 0 ? round2(interestRate / enteredMonths) : 0;
      return {
        ...prev,
        ...overrides,
        financedAmt,
        interestRate,
        moInstallmentrate: enteredMonths,
        moInstallment,
        financedCharges,
        contractAmt,
        netMoInstallment: moInstallment,
        moPerce,
      };
    });
  }, []);

  const recalcInstallmentFromAmount = useCallback((value) => {
    setState((prev) => {
      const moInstallment = Math.max(0, n(value));
      const months = n(prev.moInstallmentrate);
      const financedAmt = n(prev.financedAmt);
      const baseMOInstallment = financedAmt * (n(prev.interestRate) * 0.01 + 1);
      return {
        ...prev,
        moInstallment,
        financedCharges: round2(baseMOInstallment - financedAmt),
        contractAmt: round2(moInstallment * months),
        netMoInstallment: moInstallment,
      };
    });
  }, []);

  const syncOtherGridTotals = useCallback((patch = {}) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      const incidentalAmt = round2((next.incidentalRows || []).reduce((sum, row) => sum + n(row.amount), 0));
      const totalDisc = round2((next.discountRows || []).reduce((sum, row) => sum + n(row.amount), 0));
      return {
        ...next,
        incidentalAmt,
        totalDisc,
        totalCashOutlay: round2(n(next.dpAmt) + incidentalAmt - totalDisc),
      };
    });
  }, []);

  const initializeDefaults = useCallback(async () => {
    updateState({ isLoading: true });
    try {
      const [docControl, fieldLengths, salesTypeRows] = await Promise.all([
        useTopDocControlRow(docType),
        useFieldLenghtCheck("vso_hd,vso_dt1,vso_dt2,vso_oth"),
        Promise.resolve(useTopDocDropDown(docType, "vso_salestype")).catch(() => []),
      ]);
      const vatRate = getSalesVatRate();
      // Dropdown helpers follow the same HS_DROPDOWN contract used by SO.
      const salesTypes = Array.isArray(salesTypeRows) ? salesTypeRows : [];
      const defaultSalesType = salesTypes[0]?.DROPDOWN_CODE || "";
      updateState({
        documentName: docControl?.docName || documentTitle,
        documentSeries: docControl?.docSeries || "S",
        documentDocLen: Number(docControl?.docLen || 8),
        tblFieldArray: Array.isArray(fieldLengths) ? fieldLengths : [],
        salesTypes,
        salesType: defaultSalesType,
        vatRate,
      });
    } catch (error) {
      console.error("VSO initialization error", error);
      useSwalErrorAlert("Initialization Error", error?.message || "Unable to load VSO defaults.");
    } finally {
      updateState({ isLoading: false });
    }
  }, [docType, documentTitle, getSalesVatRate, updateState]);

  const handleReset = useCallback(() => {
    setTopTab("details");
    setGridTab("accessories1");
    setCoMakerTab("cm");
    setState((prev) => ({
      ...prev,
      documentID: null,
      documentNo: "",
      vsoDate: todayISO(),
      cutoffCode: "",
      status: "OPEN",
      vsoStatus: "O",
      cancelled: "",
      branchCode: defaultBranchCode,
      branchName: defaultBranchName,
      custCode: "", custName: "", custAdd1: "", custAdd2: "", emailAdd: "", telNo: "",
      custIdtype: "", custIdno: "", custIddateissued: "", custIddateend: "",
      custLtoclid: "", custLtobussid: "", custBirthdate: "",
      cmCustcode: "", cmCustname: "", cmAdd1: "", cmAdd2: "", cmEmailadd: "", cmTelno: "", cmIdtype: "", cmIdno: "", cmIddateissued: "", cmIddateend: "",
      cm2Custcode: "", cm2Custname: "", cm2Add1: "", cm2Add2: "", cm2Emailadd: "", cm2Telno: "", cm2Idtype: "", cm2Idno: "", cm2Iddateissued: "", cm2Iddateend: "",
      cm3Custcode: "", cm3Custname: "", cm3Add1: "", cm3Add2: "", cm3Emailadd: "", cm3Telno: "", cm3Idtype: "", cm3Idno: "", cm3Iddateissued: "", cm3Iddateend: "",
      csCustname: "", finCustcode: "", finCustname: "", pnRef: "", termsPayment: "",
      vehicleVeId: "", itemCode: "", itemName: "", csNo: "", make: "", modelYr: "", model: "",
      serialNo: "", engineNo: "", prodNo: "", color: "", pnpNo: "", csrNo: "", plateNo: "", mvfileNo: "", cerIns: "",
      sellerVendcode: "", sellerVendname: "", repCode: "", repName: "", mgtRepCode: "", mgtRepName: "", repCode2: "", repName2: "", billTerm: "", billTermName: "", modePayment: "", salesType: "",
      whouseCode: "", whouseName: "", risNo: "", drNo: "", siNo: "",
      sellingPrice: 0, discAmt: 0, netAmt: 0, vatRate: getSalesVatRate(), vatAmt: 0, netUnitPrice: 0, totalUnitPrice: 0,
      dpRate: 0, dpAmt: 0, incidentalAmt: 0, totalDisc: 0, totalCashOutlay: 0,
      financedRate: 0, financedAmt: 0, financedCharges: 0, contractAmt: 0,
      moInstallmentrate: 0, moInstallment: 0, promptDisc: 0, netMoInstallment: 0, interestRate: 0, moPerce: 0,
      dateTimeReleased: "", dateFiled: "", dateInvestigated: "", dateApproved: "",
      particular1: "", particular2: "", particular3: "",
      accessories1Rows: [], accessories2Rows: [], incidentalRows: [], discountRows: [], issueRows: [],
      branchModalOpen: false, customerModalOpen: false, payeeLookupOpen: false, warehouseLookupOpen: false, billTermLookupOpen: false, salesRepLookupOpen: false, salesRepLookupTarget: "rep",
      inventoryLookupOpen: false, inventoryLookupRows: [], inventoryLookupColumns: [],
      showCancelModal: false, showAttachModal: false, showAllTranDocNo: false, showVehicleAvailability: false,
      isFetchDisabled: false,
      isDocNoDisabled: false,
    }));
    initializeDefaults();
  }, [defaultBranchCode, defaultBranchName, getSalesVatRate, initializeDefaults]);

  useEffect(() => { handleReset(); }, []);
  useEffect(() => { if (resetFlag) handleReset(); }, [resetFlag]);

  useEffect(() => {
    let timer;
    if (state.isLoading) timer = setTimeout(() => updateState({ showSpinner: true }), 180);
    else updateState({ showSpinner: false });
    return () => clearTimeout(timer);
  }, [state.isLoading, updateState]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "F1") {
        event.preventDefault();
        updateState({ showAllTranDocNo: true });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [updateState]);

  const fetchTranData = useCallback(async (vsoNo, branchCode, direction = "") => {
    if ((!vsoNo && !direction) || !branchCode) return;
    updateState({ isLoading: true });
    try {
      const data = await useFetchTranData(vsoNo, branchCode, docType, "vsoNo", direction);
      const parsed = data?.result && typeof data.result === "object" ? data.result : data;
      const vsoId = parsed?.vsoId || parsed?.documentID;
      if (!vsoId) {
        useSwalErrorAlert("No Records Found", "Vehicle Sales Order does not exist.");
        return;
      }

      const vehicle = Array.isArray(parsed?.dt1) ? parsed.dt1[0] || {} : {};
      const issueRows = Array.isArray(parsed?.dt2) ? parsed.dt2 : [];
      const otherRows = Array.isArray(parsed?.dt3) ? parsed.dt3 : [];
      const byType = (type) => otherRows
        .filter((row) => String(row?.dtlType || "").toLowerCase() === type.toLowerCase())
        .map((row, index) => ({ ...row, lnNo: index + 1, amount: formatNumber(n(row.amount), 2) }));

      const incidentalRows = byType("Incidental");
      const discountRows = byType("Discounts");
      const incidentalAmt = round2(incidentalRows.reduce((sum, row) => sum + n(row.amount), 0));
      const totalDisc = round2(discountRows.reduce((sum, row) => sum + n(row.amount), 0));
      const totalCashOutlay = round2(n(parsed?.dpAmt) + incidentalAmt - totalDisc);

      updateState({
        documentID: vsoId,
        documentNo: parsed?.vsoNo || vsoNo,
        vsoDate: toDateInput(parsed?.vsoDate) || todayISO(),
        cutoffCode: parsed?.cutoffCode || "",
        vsoStatus: parsed?.vsoStatus || "O",
        cancelled: parsed?.cancelled || "",
        branchCode: parsed?.branchCode || branchCode,
        branchName: parsed?.branchName || "",
        status: parsed?.docStatus || "OPEN",
        custCode: parsed?.custCode || "", custName: parsed?.custName || "", custAdd1: parsed?.custAdd1 || "", custAdd2: parsed?.custAdd2 || "",
        emailAdd: parsed?.emailAdd || "", telNo: parsed?.telNo || "", custIdtype: parsed?.custIdtype || "", custIdno: parsed?.custIdno || "",
        custIddateissued: toDateInput(parsed?.custIddateissued), custIddateend: toDateInput(parsed?.custIddateend),
        custLtoclid: parsed?.custLtoclid || "", custLtobussid: parsed?.custLtobussid || "", custBirthdate: toDateInput(parsed?.custBirthdate),
        cmCustcode: parsed?.cmCustcode || "", cmCustname: parsed?.cmCustname || "", cmAdd1: parsed?.cmAdd1 || "", cmAdd2: parsed?.cmAdd2 || "",
        cmEmailadd: parsed?.cmEmailadd || "", cmTelno: parsed?.cmTelno || "", cmIdtype: parsed?.cmIdtype || "", cmIdno: parsed?.cmIdno || "",
        cmIddateissued: toDateInput(parsed?.cmIddateissued), cmIddateend: toDateInput(parsed?.cmIddateend),
        cm2Custcode: parsed?.cm2Custcode || "", cm2Custname: parsed?.cm2Custname || "", cm2Add1: parsed?.cm2Add1 || "", cm2Add2: parsed?.cm2Add2 || "",
        cm2Emailadd: parsed?.cm2Emailadd || "", cm2Telno: parsed?.cm2Telno || "", cm2Idtype: parsed?.cm2Idtype || "", cm2Idno: parsed?.cm2Idno || "",
        cm2Iddateissued: toDateInput(parsed?.cm2Iddateissued), cm2Iddateend: toDateInput(parsed?.cm2Iddateend),
        cm3Custcode: parsed?.cm3Custcode || "", cm3Custname: parsed?.cm3Custname || "", cm3Add1: parsed?.cm3Add1 || "", cm3Add2: parsed?.cm3Add2 || "",
        cm3Emailadd: parsed?.cm3Emailadd || "", cm3Telno: parsed?.cm3Telno || "", cm3Idtype: parsed?.cm3Idtype || "", cm3Idno: parsed?.cm3Idno || "",
        cm3Iddateissued: toDateInput(parsed?.cm3Iddateissued), cm3Iddateend: toDateInput(parsed?.cm3Iddateend),
        csCustname: parsed?.csCustname || "", finCustcode: parsed?.finCustcode || "", finCustname: parsed?.finCustname || "",
        pnRef: parsed?.pnRef || "", termsPayment: parsed?.termsPayment || "",
        vehicleVeId: vehicle?.veId || "", itemCode: vehicle?.itemCode || "", itemName: vehicle?.itemName || parsed?.itemName || "",
        csNo: vehicle?.csNo || parsed?.csNo || "", make: vehicle?.make || "", modelYr: vehicle?.modelYr || "", model: vehicle?.model || "",
        serialNo: vehicle?.serialNo || "", engineNo: vehicle?.engineNo || "", prodNo: vehicle?.prodNo || "", color: vehicle?.color || "",
        pnpNo: vehicle?.pnpNo || "", csrNo: vehicle?.csrNo || "", plateNo: vehicle?.plateNo || "", mvfileNo: vehicle?.mvfileNo || "", cerIns: vehicle?.cerIns || "",
        sellerVendcode: parsed?.sellerVendcode || "", sellerVendname: parsed?.sellerVendname || "",
        repCode: parsed?.repCode || "", repName: parsed?.repName || "", mgtRepCode: parsed?.mgtRepCode || "", mgtRepName: parsed?.mgtRepName || "", repCode2: parsed?.repCode2 || "", repName2: parsed?.repName2 || "",
        billTerm: parsed?.billTerm || "", billTermName: parsed?.billTermName || "", modePayment: parsed?.modePayment || "", salesType: parsed?.salesType || "",
        whouseCode: parsed?.whouseCode || "", risNo: parsed?.risNo || "", drNo: parsed?.drNo || "", siNo: parsed?.siNo || "",
        sellingPrice: n(parsed?.sellingPrice), discAmt: n(parsed?.discAmt), netAmt: n(parsed?.netAmt),
        vatRate: getSalesVatRate(), vatAmt: n(parsed?.vatAmt), netUnitPrice: n(parsed?.netUnitPrice), totalUnitPrice: n(parsed?.totalUnitPrice),
        dpRate: n(parsed?.dpRate), dpAmt: n(parsed?.dpAmt), incidentalAmt, totalDisc, totalCashOutlay,
        financedRate: n(parsed?.financedRate), financedAmt: n(parsed?.financedAmt), financedCharges: n(parsed?.financedCharges), contractAmt: n(parsed?.contractAmt),
        moInstallmentrate: n(parsed?.moInstallmentrate), moInstallment: n(parsed?.moInstallment), promptDisc: n(parsed?.promptDisc),
        netMoInstallment: n(parsed?.netMoInstallment), interestRate: n(parsed?.interestRate),
        moPerce: n(parsed?.moInstallmentrate) > 0 ? round2(n(parsed?.interestRate) / n(parsed?.moInstallmentrate)) : 0,
        dateTimeReleased: parsed?.dateTimeReleased || "", dateFiled: toDateInput(parsed?.dateFiled), dateInvestigated: toDateInput(parsed?.dateInvestigated), dateApproved: toDateInput(parsed?.dateApproved),
        particular1: parsed?.particular1 || "", particular2: parsed?.particular2 || "", particular3: parsed?.particular3 || "",
        accessories1Rows: byType("Accessories1"), accessories2Rows: byType("Accessories2"), incidentalRows, discountRows,
        issueRows: issueRows.map((row, index) => ({ ...row, lnNo: index + 1 })),
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });
    } catch (error) {
      console.error("VSO fetch error", error);
      useSwalErrorAlert("VSO", error?.message || "Unable to retrieve Vehicle Sales Order.");
    } finally {
      updateState({ isLoading: false });
    }
  }, [docType, getSalesVatRate, updateState]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vsoNo = params.get("vsoNo");
    const branchCode = params.get("branchCode");
    if (!loadedFromUrlRef.current && vsoNo && branchCode) {
      loadedFromUrlRef.current = true;
      fetchTranData(vsoNo, branchCode);
    }
  }, [fetchTranData]);

  const buildOtherRows = useCallback(() => {
    const mapRows = (rows, dtlType) => (rows || []).map((row, index) => ({
      branchCode: state.branchCode,
      vsoNo: state.documentNo,
      vsoDate: state.vsoDate,
      cutoffCode: state.cutoffCode,
      dtlType,
      lnNo: index + 1,
      descrip: row.descrip || "",
      amount: n(row.amount),
      vsoId: state.documentID || "",
    }));
    return [
      ...mapRows(state.accessories1Rows, "Accessories1"),
      ...mapRows(state.accessories2Rows, "Accessories2"),
      ...mapRows(state.incidentalRows, "Incidental"),
      ...mapRows(state.discountRows, "Discounts"),
    ];
  }, [state]);

  const buildPayload = useCallback(() => ({
    vsoId: state.documentID || "",
    branchCode: state.branchCode,
    vsoNo: state.documentNo,
    vsoDate: state.vsoDate,
    cutoffCode: state.cutoffCode,
    custCode: state.custCode, custName: state.custName, custAdd1: state.custAdd1, custAdd2: state.custAdd2,
    emailAdd: state.emailAdd, telNo: state.telNo, custIdtype: state.custIdtype, custIdno: state.custIdno,
    custIddateissued: state.custIddateissued || null, custIddateend: state.custIddateend || null,
    custLtoclid: state.custLtoclid, custLtobussid: state.custLtobussid, custBirthdate: state.custBirthdate || null,
    cmCustcode: state.cmCustcode, cmCustname: state.cmCustname, cmAdd1: state.cmAdd1, cmAdd2: state.cmAdd2, cmEmailadd: state.cmEmailadd, cmTelno: state.cmTelno,
    cmIdtype: state.cmIdtype, cmIdno: state.cmIdno, cmIddateissued: state.cmIddateissued || null, cmIddateend: state.cmIddateend || null,
    cm2Custcode: state.cm2Custcode, cm2Custname: state.cm2Custname, cm2Add1: state.cm2Add1, cm2Add2: state.cm2Add2, cm2Emailadd: state.cm2Emailadd, cm2Telno: state.cm2Telno,
    cm2Idtype: state.cm2Idtype, cm2Idno: state.cm2Idno, cm2Iddateissued: state.cm2Iddateissued || null, cm2Iddateend: state.cm2Iddateend || null,
    cm3Custcode: state.cm3Custcode, cm3Custname: state.cm3Custname, cm3Add1: state.cm3Add1, cm3Add2: state.cm3Add2, cm3Emailadd: state.cm3Emailadd, cm3Telno: state.cm3Telno,
    cm3Idtype: state.cm3Idtype, cm3Idno: state.cm3Idno, cm3Iddateissued: state.cm3Iddateissued || null, cm3Iddateend: state.cm3Iddateend || null,
    csCustname: state.csCustname, finCustcode: state.finCustcode, finCustname: state.finCustname, pnRef: state.pnRef,
    csNo: state.csNo, sellingPrice: n(state.sellingPrice), discAmt: n(state.discAmt), netAmt: n(state.netAmt),
    netUnitPrice: n(state.netUnitPrice), vatAmt: n(state.vatAmt), totalUnitPrice: n(state.totalUnitPrice),
    dpRate: n(state.dpRate), dpAmt: n(state.dpAmt), incidentalAmt: n(state.incidentalAmt), totalDisc: n(state.totalDisc), totalCashOutlay: n(state.totalCashOutlay),
    financedRate: n(state.financedRate), financedAmt: n(state.financedAmt), financedCharges: n(state.financedCharges), contractAmt: n(state.contractAmt),
    termsPayment: state.termsPayment, moInstallmentrate: n(state.moInstallmentrate), moInstallment: n(state.moInstallment), promptDisc: n(state.promptDisc),
    netMoInstallment: n(state.netMoInstallment), interestRate: n(state.interestRate), dateTimeReleased: state.dateTimeReleased,
    repCode: state.repCode, mgtRepCode: state.mgtRepCode, modePayment: state.modePayment, billTerm: state.billTerm, salesType: state.salesType,
    dateFiled: state.dateFiled || null, dateInvestigated: state.dateInvestigated || null, dateApproved: state.dateApproved || null,
    vsoStatus: state.vsoStatus || "O", drNo: state.drNo, siNo: state.siNo, cancelled: state.cancelled,
    particular1: state.particular1, particular2: state.particular2, particular3: state.particular3,
    sellerVendcode: state.sellerVendcode, whouseCode: state.whouseCode, risNo: state.risNo, repCode2: state.repCode2,
    userCode: user?.userCode || "NSI",
    dt1: [{
      veId: state.vehicleVeId || "",
      branchCode: state.branchCode,
      vsoNo: state.documentNo,
      vsoDate: state.vsoDate,
      cutoffCode: state.cutoffCode,
      make: state.make, modelYr: state.modelYr, model: state.model, serialNo: state.serialNo, engineNo: state.engineNo,
      prodNo: state.prodNo, color: state.color, csNo: state.csNo, itemCode: state.itemCode,
      pnpNo: state.pnpNo, csrNo: state.csrNo, plateNo: state.plateNo, mvfileNo: state.mvfileNo, cerIns: state.cerIns,
      vsoId: state.documentID || "",
    }],
    dt2: (state.issueRows || []).map((row, index) => ({
      ...row,
      veId: row.veId || state.vehicleVeId || "",
      branchCode: state.branchCode,
      vsoNo: state.documentNo,
      vsoDate: state.vsoDate,
      cutoffCode: state.cutoffCode,
      lnNo: index + 1,
      quantity: n(row.quantity), unitCost: n(row.unitCost), itemCost: n(row.itemCost), qtyHand: n(row.qtyHand),
      vsoId: state.documentID || "",
    })),
    dt3: buildOtherRows(),
  }), [buildOtherRows, state, user]);

  const handleSave = useCallback(async () => {
    if (isFormDisabled) return;
    const dateErrors = [];
    if (n(state.interestRate) > 99.99) dateErrors.push("Interest Rate cannot exceed 99.99%.");
    if (n(state.financedRate) > 100) dateErrors.push("Finance Rate cannot exceed 100%.");
    if (n(state.moInstallmentrate) > 999) dateErrors.push("Terms (Months) cannot exceed 999.");
    const issuedFields = [
      ["Customer ID Date Issued", state.custIddateissued],
      ["Co-Maker 1 ID Date Issued", state.cmIddateissued],
      ["Co-Maker 2 ID Date Issued", state.cm2Iddateissued],
      ["Co-Maker 3 ID Date Issued", state.cm3Iddateissued],
    ];
    const validUntilFields = [
      ["Customer ID Valid Until", state.custIddateend],
      ["Co-Maker 1 ID Valid Until", state.cmIddateend],
      ["Co-Maker 2 ID Valid Until", state.cm2Iddateend],
      ["Co-Maker 3 ID Valid Until", state.cm3Iddateend],
    ];
    issuedFields.forEach(([label, value]) => { if (value && value > todayISO()) dateErrors.push(`${label} cannot be a future date.`); });
    validUntilFields.forEach(([label, value]) => { if (value && state.vsoDate && value < state.vsoDate) dateErrors.push(`${label} cannot be earlier than the VSO Date.`); });
    if (state.custBirthdate && state.custBirthdate >= todayISO()) dateErrors.push("Birth Date must be earlier than today.");
    [["Date Filed", state.dateFiled], ["Date Investigated", state.dateInvestigated], ["Date Approved", state.dateApproved]].forEach(([label, value]) => {
      if (value && value > todayISO()) dateErrors.push(`${label} cannot be a future date.`);
    });
    if (state.dateTimeReleased && state.vsoDate && state.dateTimeReleased < `${state.vsoDate}T00:00`) dateErrors.push("Date/Time of Release cannot be earlier than the VSO Date.");
    if (dateErrors.length) {
      useSwalErrorAlert("Validation Failed", dateErrors.join("\n"));
      return;
    }
    updateState({ isLoading: true });
    try {
      const response = await useTransactionUpsert(docType, buildPayload(), updateState, "vsoId", "vsoNo");
      if (!response) return;
      const row = Array.isArray(response?.data) ? response.data[0] : Array.isArray(response) ? response[0] : response?.data || response;
      if (Number(row?.errorCount || 0) > 0) {
        useSwalErrorAlert("Validation", row?.errorMsg || "Unable to save Vehicle Sales Order.");
        return;
      }
      const savedId = row?.vsoId || state.documentID;
      const savedNo = row?.vsoNo || state.documentNo;
      if (!savedId || !savedNo) {
        useSwalErrorAlert("Invalid Save Response", "VSO did not return its document number and transaction ID.");
        return;
      }
      updateState({ documentID: savedId, documentNo: savedNo, isDocNoDisabled: true });
      useSwalshowSaveSuccessDialog(
        handleReset,
        () => useHandlePrint(savedId, docType),
      );
    } catch (error) {
      console.error("VSO save error", error);
      useSwalErrorAlert("VSO", error?.message || "Unable to save Vehicle Sales Order.");
    } finally {
      updateState({ isLoading: false });
    }
  }, [buildPayload, docType, handleReset, isFormDisabled, state.documentID, state.documentNo, updateState]);

  const handleCancel = () => {
    if (state.documentID && displayStatus === "OPEN") updateState({ showCancelModal: true });
  };

  const handleCloseCancel = async (confirmation) => {
    if (confirmation && state.documentID && displayStatus === "OPEN") {
      const result = await useHandleCancel(
        docType,
        state.documentID,
        user?.userCode || "NSI",
        confirmation.password,
        confirmation.reason,
        updateState,
      );
      if (result?.success) {
        useSwalSuccessAlert("Success", "Cancellation Completed");
        await fetchTranData(state.documentNo, state.branchCode);
      }
    }
    updateState({ showCancelModal: false });
  };

  const handlePrint = () => {
    if (state.documentID) useHandlePrint(state.documentID, docType);
  };

  const handleAttach = () => {
    if (state.documentID) updateState({ showAttachModal: true });
  };

  const handleAmountGridChange = (key, index, field, value) => {
    const rows = [...(state[key] || [])];
    rows[index] = { ...rows[index], [field]: field === "amount" ? n(value) : value };
    if (key === "incidentalRows" || key === "discountRows") syncOtherGridTotals({ [key]: rows });
    else updateState({ [key]: rows });
  };

  const handleAmountGridAdd = (key, dtlType) => {
    updateState({ [key]: [...(state[key] || []), initialAmountRow((state[key] || []).length, dtlType)] });
  };

  const handleAmountGridDelete = (key, index) => {
    const rows = (state[key] || []).filter((_, i) => i !== index).map((row, i) => ({ ...row, lnNo: i + 1 }));
    if (key === "incidentalRows" || key === "discountRows") syncOtherGridTotals({ [key]: rows });
    else updateState({ [key]: rows });
  };

  const handleIssueChange = (index, field, value) => {
    const rows = [...(state.issueRows || [])];
    const next = { ...rows[index], [field]: ["quantity", "unitCost", "itemCost", "qtyHand"].includes(field) ? n(value) : value };
    if (field === "quantity" || field === "unitCost") next.itemCost = round2(n(next.quantity) * n(next.unitCost));
    rows[index] = next;
    updateState({ issueRows: rows });
  };

  const applyCustomerSelection = async (selected, prefix = "") => {
    if (!selected) return;
    updateState({ isLoading: true });
    try {
      const code = selected.custCode || "";
      const name = selected.custName || "";
      const address = selected.addr || "";
      if (!prefix) {
        let billTerm = selected.billtermCode || "";
        let billTermName = selected.billtermName || "";
        if (!billTerm && code) {
          try {
            const response = await postRequest("getCustomer", JSON.stringify({ custCode: code }));
            const customer = response?.success && response?.data?.[0]?.result
              ? JSON.parse(response.data[0].result)?.[0]
              : null;
            billTerm = customer?.billtermCode || "";
            billTermName = customer?.billtermName || "";
          } catch (error) {
            console.error("Unable to load the customer's billing term", error);
          }
        }
        if (billTerm && !billTermName) {
          const term = await fetchTopBillTermRow(billTerm);
          billTermName = term?.billtermName || "";
        }
        updateState({ custCode: code, custName: name, custAdd1: address, custAdd2: "", billTerm, billTermName });
      } else if (prefix === "cm") {
        updateState({ cmCustcode: code, cmCustname: name, cmAdd1: address, cmAdd2: "" });
      } else if (prefix === "cm2") {
        updateState({ cm2Custcode: code, cm2Custname: name, cm2Add1: address, cm2Add2: "" });
      } else if (prefix === "cm3") {
        updateState({ cm3Custcode: code, cm3Custname: name, cm3Add1: address, cm3Add2: "" });
      } else if (prefix === "fin") {
        updateState({ finCustcode: code, finCustname: name });
      }
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleOpenInventoryLookup = async () => {
    if (!state.whouseCode) {
      useSwalErrorAlert("Warehouse Required", "Select a warehouse before adding Inventory Items.");
      return;
    }
    try {
      updateState({ isLoading: true });
      const response = await fetchDataJson("getInvLookupFG", {
        userCode: user?.userCode || currentUserRow?.userCode || "",
        branchCode: state.branchCode || "",
        whouseCode: state.whouseCode || "",
        locCode: "",
        docType: "FGAJ",
        tranType: "IL",
      });
      const rows = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
      const columns = await useSelectedHSColConfig("getInvLookupFG", user?.userCode || currentUserRow?.userCode || "");
      if (!rows.length) {
        useSwalErrorAlert("FG Location Balance", "No available inventory items were found.");
        return;
      }
      updateState({ inventoryLookupOpen: true, inventoryLookupRows: rows, inventoryLookupColumns: columns });
    } catch (error) {
      useSwalErrorAlert("FG Location Balance", error?.message || "Unable to load FG inventory items.");
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleCloseInventoryLookup = (selected) => {
    const records = selected?.records;
    if (!records) {
      updateState({ inventoryLookupOpen: false });
      return;
    }
    const selectedRows = Array.isArray(records) ? records : [records];
    const issueRows = [
      ...(state.issueRows || []),
      ...selectedRows.map((item, offset) => ({
        ...initialIssueRow((state.issueRows || []).length + offset),
        veId: item.veId || "",
        itemCode: item.itemCode || "",
        itemName: item.itemName || "",
        uomCode: item.uomCode || "",
        quantity: formatNumber(1, 2),
        unitCost: formatNumber(n(item.unitCost), 2),
        itemCost: formatNumber(n(item.unitCost), 2),
        lotNo: item.lotNo || "",
        bbDate: toDateInput(item.bbDate),
        qstatCode: item.qstatCode || item.itemStat || "",
        whouseCode: item.whouseCode || state.whouseCode || "",
        locCode: item.locCode || "",
        qtyHand: formatNumber(n(item.qtyOnHand ?? item.qtyHand), 2),
        rrNo: item.rrNo || "",
        uniqueKey: item.uniqueKey || "",
      })),
    ].map((row, index) => ({ ...row, lnNo: index + 1 }));
    updateState({ issueRows, inventoryLookupOpen: false });
  };

  const handleSalesRepSelection = (selected) => {
    if (!selected) {
      updateState({ salesRepLookupOpen: false, salesRepLookupTarget: "rep" });
      return;
    }
    const code = selected.salesRepCode || "";
    const name = selected.salesRepName || "";
    const patch = state.salesRepLookupTarget === "manager"
      ? { mgtRepCode: code, mgtRepName: name }
      : state.salesRepLookupTarget === "second"
        ? { repCode2: code, repName2: name }
        : { repCode: code, repName: name };
    updateState({ ...patch, salesRepLookupOpen: false, salesRepLookupTarget: "rep" });
  };

  const loadVehicleByCsNo = useCallback(async () => {
    const csNo = String(state.csNo || "").trim();
    if (!csNo || !state.branchCode || isFormDisabled) return;
    updateState({ isLoading: true });
    try {
      const { data: response } = await apiClient.get("/getVEStockCardByCS", {
        params: {
          json_data: JSON.stringify({
            json_data: {
              mode: "FindCSForVSO",
              branchCode: state.branchCode,
              csNo,
              documentID: state.documentID || "",
            },
          }),
        },
      });
      const raw = response?.data?.[0]?.result;
      const rows = raw ? JSON.parse(raw) : [];
      const vehicle = rows?.[0];
      if (!vehicle) {
        updateState({ vehicleVeId: "", itemCode: "", itemName: "", make: "", modelYr: "", model: "", serialNo: "", engineNo: "", prodNo: "", color: "", pnpNo: "", csrNo: "", sellingPrice: 0, discAmt: 0, netAmt: 0 });
        useSwalErrorAlert("CS Number", "The CS number is unavailable, already assigned to another open VSO, or does not belong to this branch.");
        return;
      }
      updateState({
        vehicleVeId: vehicle.veId || "", itemCode: vehicle.itemCode || "", itemName: vehicle.itemName || "",
        csNo: vehicle.csNo || csNo, make: vehicle.make || "", modelYr: vehicle.modelYr || "", model: vehicle.model || "",
        serialNo: vehicle.serialNo || "", engineNo: vehicle.engineNo || "", prodNo: vehicle.prodNo || "", color: vehicle.color || "",
        pnpNo: vehicle.pnpNo || "", csrNo: vehicle.csrNo || "", sellingPrice: n(vehicle.sellingPrice), discAmt: 0,
      });
      recalcSales({ sellingPrice: n(vehicle.sellingPrice), discAmt: 0 });
    } catch (error) {
      useSwalErrorAlert("CS Number", error?.response?.data?.message || error?.message || "Unable to retrieve vehicle information.");
    } finally {
      updateState({ isLoading: false });
    }
  }, [isFormDisabled, recalcSales, state.branchCode, state.csNo, state.documentID, updateState]);

  const handleAvailableVehicleSelection = useCallback((payload) => {
    const vehicle = Array.isArray(payload?.records) ? payload.records[0] : payload?.records || payload;
    if (!vehicle) {
      updateState({ showVehicleAvailability: false });
      return;
    }

    if (String(vehicle.branchCode || "").trim().toUpperCase() !== String(state.branchCode || "").trim().toUpperCase()) {
      useSwalErrorAlert("Vehicle Inventory", "Only vehicles from the current VSO branch can be selected.");
      return;
    }

    if (String(vehicle.availabilityStatus || "").trim().toUpperCase() !== "AVAILABLE") {
      useSwalErrorAlert("Vehicle Inventory", `This vehicle is reserved under VSO ${vehicle.reservedVsoNo || ""} and cannot be selected.`);
      return;
    }

    updateState({
      showVehicleAvailability: false,
      vehicleVeId: vehicle.veId || "",
      itemCode: vehicle.itemCode || "",
      itemName: vehicle.itemName || "",
      csNo: vehicle.csNo || "",
      make: vehicle.make || "",
      modelYr: vehicle.modelYear || "",
      model: vehicle.model || "",
      serialNo: vehicle.serialNo || "",
      engineNo: vehicle.engineNo || "",
      prodNo: vehicle.prodNo || "",
      color: vehicle.color || "",
      pnpNo: vehicle.pnpNo || "",
      csrNo: vehicle.csrNo || "",
      sellingPrice: n(vehicle.sellingPrice),
      discAmt: 0,
    });
    recalcSales({ sellingPrice: n(vehicle.sellingPrice), discAmt: 0 });
  }, [recalcSales, state.branchCode, updateState]);

  const gridTabs = [
    ["accessories1", "Accessories", faCar],
    ["accessories2", "Installed Items", faTag],
    ["issue", "Inventory Items", faWarehouse],
    ["incidental", "Incidental Charges", faReceipt],
    ["discount", "Discounts", faMoneyBill],
  ];

  const renderCustomerFields = ({ prefix = "", title = "Customer", card = true }) => {
    const codeKey = prefix ? `${prefix}Custcode` : "custCode";
    const nameKey = prefix ? `${prefix}Custname` : "custName";
    const add1Key = prefix ? `${prefix}Add1` : "custAdd1";
    const add2Key = prefix ? `${prefix}Add2` : "custAdd2";
    const emailKey = prefix ? `${prefix}Emailadd` : "emailAdd";
    const telKey = prefix ? `${prefix}Telno` : "telNo";
    const idTypeKey = prefix ? `${prefix}Idtype` : "custIdtype";
    const idNoKey = prefix ? `${prefix}Idno` : "custIdno";
    const issuedKey = prefix ? `${prefix}Iddateissued` : "custIddateissued";
    const endKey = prefix ? `${prefix}Iddateend` : "custIddateend";
    const fields = (
      <>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Contact &amp; Address</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Field id={codeKey} label={prefix ? `${title} Code` : "Customer Code"} type="lookup" value={state[codeKey]} disabled={isFormDisabled} onLookup={() => updateState({ customerModalOpen: true, customerLookupTarget: prefix || "customer" })} onChange={(v) => updateState({ [codeKey]: v })} />
              <Field label={prefix ? `${title} Name` : "Customer Name"} value={state[nameKey]} disabled readOnly />
              <Field label="Contact No." value={state[telKey]} disabled={isFormDisabled} onChange={(v) => updateState({ [telKey]: v })} />
              <Field label="Email Address" value={state[emailKey]} disabled={isFormDisabled} onChange={(v) => updateState({ [emailKey]: v })} />
              <Field label="Address 1" value={state[add1Key]} disabled={isFormDisabled} onChange={(v) => updateState({ [add1Key]: v })} />
              <Field label="Address 2" value={state[add2Key]} disabled={isFormDisabled} onChange={(v) => updateState({ [add2Key]: v })} />
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Identification</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Field label="ID Type" value={state[idTypeKey]} disabled={isFormDisabled} onChange={(v) => updateState({ [idTypeKey]: v })} />
              <Field label="ID No." value={state[idNoKey]} disabled={isFormDisabled} onChange={(v) => updateState({ [idNoKey]: v })} />
              <Field label="ID Date Issued" type="date" value={state[issuedKey]} max={todayISO()} disabled={isFormDisabled} onChange={(v) => updateState({ [issuedKey]: v && v > todayISO() ? todayISO() : v })} />
              <Field label="ID Valid Until" type="date" value={state[endKey]} min={state.vsoDate || undefined} disabled={isFormDisabled} onChange={(v) => updateState({ [endKey]: v && state.vsoDate && v < state.vsoDate ? state.vsoDate : v })} />
            </div>
          </section>
        </div>
      </>
    );
    return card ? <FieldGroup title={title} icon={faUser}>{fields}</FieldGroup> : fields;
  };

  const handleHistoryRowPick = (row) => {
    const vsoNo = row?.vsoNo || row?.docNo;
    const branchCode = row?.branchCode || state.branchCode;
    if (!vsoNo || !branchCode) return;
    setTopTab("details");
    fetchTranData(vsoNo, branchCode);
  };

  const printData = { vso_no: state.documentNo, branch: state.branchCode, doc_id: docType };

  return (
    <div className="global-tran-main-div-ui">
      {state.showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header
          docType={docType}
          pdfLink={pdfLink}
          videoLink={videoLink}
          onPrint={handlePrint}
          printData={printData}
          onReset={handleReset}
          onSave={handleSave}
          onCancel={handleCancel}
          onAttach={handleAttach}
          activeTopTab={topTab}
          showActions={topTab === "details"}
          showBIRForm={false}
          showCopyForm={false}
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}
          detailsRoute="/page/VSO"
          isSaveDisabled={isFormDisabled}
          isResetDisabled={false}
          isAttachDisabled={!state.documentID}
          isPrintDisabled={!state.documentID || displayStatus === "CANCELLED"}
          isCancelDisabled={!state.documentID || displayStatus !== "OPEN"}
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
              <h1 className={`global-tran-stat-text-ui uppercase ${displayStatus === "OPEN" ? "global-tran-stat-text-open-ui" : displayStatus === "CANCELLED" ? "global-tran-stat-text-cancelled-ui" : "global-tran-stat-text-posted-ui"}`}>
                {displayStatus}
              </h1>
            </div>
          </div>
        </div>

        <div className="global-tran-tab-div-ui !mt-20 md:!mt-28">
          <div className="grid grid-cols-1 gap-3 rounded-b-md bg-white p-1 dark:bg-slate-800">
            <FieldGroup title="Basic Information" icon={faReceipt}>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-3" id="vso_hd">
                <div className="global-tran-textbox-group-div-ui !space-y-0 !p-0 grid grid-cols-1 gap-2">
                  <Field id="branchName" label="Branch" type="lookup" value={state.branchName} required disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled} onLookup={() => updateState({ branchModalOpen: true })} />
                  <Field id="vsoNo" label="VSO No." type="lookup" value={state.documentNo} required disabled={state.isDocNoDisabled} readOnly={String(state.documentSeries || "S").toUpperCase() !== "M"} onLookup={() => updateState({ showAllTranDocNo: true })} onChange={(v) => updateState({ documentNo: v })} />
                  <Field label="VSO Date" type="date" value={state.vsoDate} required disabled={isFormDisabled} onChange={(v) => updateState({ vsoDate: v })} />
                </div>
                <div className="relative xl:col-span-2">
                  <textarea
                    id="particular1"
                    rows={6}
                    placeholder=" "
                    className="peer global-tran-textbox-remarks-ui min-h-[154px] w-full resize-y pt-3"
                    value={state.particular1 || ""}
                    disabled={isFormDisabled}
                    onChange={(e) => updateState({ particular1: e.target.value })}
                  />
                  <label htmlFor="particular1" className="global-tran-floating-label-remarks">
                    Remarks
                  </label>
                </div>
              </div>
            </FieldGroup>
            {renderCustomerFields({ title: "Customer Information" })}
            <FieldGroup title="Registration Details" icon={faIdCard}>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Customer Registration</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field label="Birth Date" type="date" value={state.custBirthdate} max={yesterdayISO()} required disabled={isFormDisabled} onChange={(v) => updateState({ custBirthdate: v && v >= todayISO() ? yesterdayISO() : v })} />
                  <Field label="LTO Client ID" value={state.custLtoclid} disabled={isFormDisabled} onChange={(v) => updateState({ custLtoclid: v })} />
                  <Field label="LTO Business ID" value={state.custLtobussid} disabled={isFormDisabled} onChange={(v) => updateState({ custLtobussid: v })} />
                  </div>
                </section>
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Vehicle Registration Documents</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field label="PNP No." value={state.pnpNo} disabled={isFormDisabled} readOnly />
                  <Field label="CSR No." value={state.csrNo} disabled={isFormDisabled} readOnly />
                  <Field label="Plate No." value={state.plateNo} disabled={isFormDisabled} onChange={(v) => updateState({ plateNo: v })} />
                  <Field label="MV File No." value={state.mvfileNo} disabled={isFormDisabled} onChange={(v) => updateState({ mvfileNo: v })} />
                  <Field label="Certificate / Insurance" value={state.cerIns} disabled={isFormDisabled} onChange={(v) => updateState({ cerIns: v })} />
                  </div>
                </section>
              </div>
            </FieldGroup>

            <FieldGroup title="Vehicle Information" icon={faCar}>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40 xl:col-span-2">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Vehicle Selection</div>
                    <button
                      type="button"
                      disabled={["CLOSED", "CANCELLED"].includes(displayStatus)}
                      onClick={() => updateState({ showVehicleAvailability: true })}
                      className="inline-flex min-w-[36px] items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-800 dark:hover:bg-blue-700"
                    >
                      <FontAwesomeIcon icon={faMagnifyingGlass} />
                      <span className="ml-2">Check Availability</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Field label="CS / Chassis No." value={state.csNo} required disabled={isFormDisabled} onChange={(v) => updateState({ csNo: v })} onBlur={loadVehicleByCsNo} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); loadVehicleByCsNo(); } }} />
                  <Field label="Item Code" value={state.itemCode} disabled readOnly />
                  <Field label="Item Description" value={state.itemName} disabled readOnly />
                  </div>
                </section>
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Vehicle Specifications</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field label="Make" value={state.make} disabled readOnly />
                  <Field label="Model" value={state.model} disabled readOnly />
                  <Field label="Model Year" value={state.modelYr} disabled readOnly />
                  <Field label="Color" value={state.color} disabled readOnly />
                  </div>
                </section>
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Vehicle Identifiers</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field label="Serial No." value={state.serialNo} disabled readOnly />
                  <Field label="Engine No." value={state.engineNo} disabled readOnly />
                  <Field label="Product No." value={state.prodNo} disabled readOnly />
                  </div>
                </section>
              </div>
            </FieldGroup>

            <FieldGroup title="Sales and Billing Information" icon={faReceipt}>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Sales Setup</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <FieldRenderer
                    id="salesType"
                    label="Sales Type"
                    type="select"
                    value={state.salesType}
                    disabled={isFormDisabled}
                    required
                    onChange={(value) => updateState({ salesType: value })}
                    options={state.salesTypes.map((option) => ({
                      label: option.DROPDOWN_NAME,
                      value: option.DROPDOWN_CODE,
                    }))}
                  />
                  <Field id="sellerVendname" label="Actual Seller" type="lookup" value={state.sellerVendname} required disabled={isFormDisabled} readOnly onLookup={() => updateState({ payeeLookupOpen: true })} />
                  <Field id="billTermName" label="Billing Term" type="lookup" value={state.billTermName} disabled={isFormDisabled} readOnly onLookup={() => updateState({ billTermLookupOpen: true })} />
                  <Field label="Mode of Payment" value={state.modePayment} disabled={isFormDisabled} onChange={(v) => updateState({ modePayment: v })} />
                  </div>
                </section>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Sales Team</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field id="repName" label="Sales Representative" type="lookup" value={state.repName} required disabled={isFormDisabled} readOnly onLookup={() => updateState({ salesRepLookupOpen: true, salesRepLookupTarget: "rep" })} />
                  <Field id="mgtRepName" label="Sales Rep Manager" type="lookup" value={state.mgtRepName} required disabled={isFormDisabled} readOnly onLookup={() => updateState({ salesRepLookupOpen: true, salesRepLookupTarget: "manager" })} />
                  <Field id="repName2" label="Sales Representative 2" placeholder="Sales Representative 2" type="lookup" value={state.repName2} disabled={isFormDisabled} readOnly onLookup={() => updateState({ salesRepLookupOpen: true, salesRepLookupTarget: "second" })} />
                  </div>
                </section>
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Linked Documents</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field label="DR No." value={state.drNo} disabled readOnly />
                  <Field label="VSI No." value={state.siNo} disabled readOnly />
                  </div>
                </section>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Pricing</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <DecimalField id="sellingPrice" label="Selling Price" type="amount" value={formatNumber(state.sellingPrice, 2)} required disabled={isFormDisabled} onChange={(value) => recalcSales({ sellingPrice: value })} />
                  <DecimalField id="discAmt" label="Discount Amount" type="amount" value={formatNumber(state.discAmt, 2)} disabled={isFormDisabled} onChange={(value) => recalcSales({ discAmt: value })} />
                  <DecimalField id="netAmt" label="Net Amount" type="amount" value={formatNumber(state.netAmt, 2)} disabled readOnly />
                  </div>
                </section>
              </div>
            </FieldGroup>

              <FieldGroup title="Financing Computation" icon={faCalculator}>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Unit Price Basis</h4>
                      <p className="text-[0.68rem] text-slate-500 dark:text-slate-400">Calculated from the selling price and discount.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <DecimalField id="totalUnitPrice" label="Total Unit Price" value={formatNumber(state.totalUnitPrice, 2)} disabled readOnly />
                      <DecimalField id="vatAmt" label="VAT Amount" value={formatNumber(state.vatAmt, 2)} disabled readOnly />
                      <DecimalField id="netUnitPrice" label="Net Unit Price" value={formatNumber(state.netUnitPrice, 2)} disabled readOnly />
                    </div>
                  </section>

          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Down Payment &amp; Cash Outlay</h4>
                      <p className="text-[0.68rem] text-slate-500 dark:text-slate-400">Enter either the DP rate or DP amount; related values are recalculated.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      <DecimalField id="dpRate" label="DP Rate %" value={formatNumber(state.dpRate, 2)} disabled={isFormDisabled} onChange={recalcFromDpRate} />
                      <DecimalField id="dpAmt" label="DP Amount" value={formatNumber(state.dpAmt, 2)} disabled={isFormDisabled} onChange={recalcFromDpAmount} />
                      <DecimalField id="incidentalAmt" label="Incidental Charges" value={formatNumber(state.incidentalAmt, 2)} disabled readOnly />
                      <DecimalField id="totalDisc" label="Discounts" value={formatNumber(state.totalDisc, 2)} disabled readOnly />
                      <DecimalField id="totalCashOutlay" label="Total Cash Outlay" value={formatNumber(state.totalCashOutlay, 2)} disabled readOnly />
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40 xl:col-span-2">
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Loan Terms &amp; Installment</h4>
                      <p className="text-[0.68rem] text-slate-500 dark:text-slate-400">Set the financing terms first, then review the computed charges and contract totals.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <DecimalField id="financedRate" label="Finance Rate %" value={formatNumber(state.financedRate, 2)} maxValue={100} disabled={isFormDisabled} onChange={recalcFromFinanceRate} />
                      <DecimalField id="financedAmt" label="Amount Financed" value={formatNumber(state.financedAmt, 2)} disabled={isFormDisabled} onChange={(value) => updateState({ financedAmt: value })} />
                      <DecimalField id="interestRate" label="Interest Rate (AOR) %" value={formatNumber(state.interestRate, 2)} maxValue={99.99} disabled={isFormDisabled} onChange={(value) => { updateState({ interestRate: value }); recalcInstallmentFromTerm({ interestRate: value }); }} />
                      <DecimalField id="moInstallmentrate" label="Terms (Months)" value={formatNumber(state.moInstallmentrate, 2)} maxValue={999} disabled={isFormDisabled} onChange={(value) => { updateState({ moInstallmentrate: value }); recalcInstallmentFromTerm({ moInstallmentrate: value }); }} />
                      <DecimalField id="moPerce" label="Interest per Month %" value={formatNumber(state.moPerce, 2)} disabled readOnly />
                      <DecimalField id="moInstallment" label="Monthly Installment" value={formatNumber(state.moInstallment, 2)} disabled={isFormDisabled} onChange={recalcInstallmentFromAmount} />
                      <DecimalField id="promptDisc" label="Prompt Payment Discount" value={formatNumber(state.promptDisc, 2)} disabled={isFormDisabled} onChange={(value) => updateState({ promptDisc: value })} />
                      <DecimalField id="netMoInstallment" label="Net Monthly Installment" value={formatNumber(state.netMoInstallment, 2)} disabled readOnly />
                      <DecimalField id="financedCharges" label="Financing Charges" value={formatNumber(state.financedCharges, 2)} disabled readOnly />
                      <DecimalField id="contractAmt" label="Amount of Contract" value={formatNumber(state.contractAmt, 2)} disabled readOnly />
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40 xl:col-span-2">
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Application &amp; Release Timeline</h4>
                      <p className="text-[0.68rem] text-slate-500 dark:text-slate-400">Record the financing application milestones in sequence.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Date Filed" type="date" value={state.dateFiled} max={todayISO()} disabled={isFormDisabled} onChange={(v) => updateState({ dateFiled: v && v > todayISO() ? todayISO() : v })} />
                      <Field label="Date Investigated" type="date" value={state.dateInvestigated} max={todayISO()} disabled={isFormDisabled} onChange={(v) => updateState({ dateInvestigated: v && v > todayISO() ? todayISO() : v })} />
                      <Field label="Date Approved" type="date" value={state.dateApproved} max={todayISO()} disabled={isFormDisabled} onChange={(v) => updateState({ dateApproved: v && v > todayISO() ? todayISO() : v })} />
                      <Field label="Date/Time of Release" type="datetime-local" value={state.dateTimeReleased} min={state.vsoDate ? `${state.vsoDate}T00:00` : undefined} required disabled={isFormDisabled} onChange={(v) => updateState({ dateTimeReleased: v && state.vsoDate && v < `${state.vsoDate}T00:00` ? `${state.vsoDate}T00:00` : v })} />
                    </div>
                  </section>
                </div>
            </FieldGroup>

            <FieldGroup title="Co-Maker Information" icon={faUsers}>
              <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
                {[
                  ["cm", "Co-Maker 1"],
                  ["cm2", "Co-Maker 2"],
                  ["cm3", "Co-Maker 3"],
                ].map(([key, label]) => (
                  <TabButton
                    key={key}
                    active={coMakerTab === key}
                    icon={faUser}
                    label={label}
                    onClick={() => setCoMakerTab(key)}
                  />
                ))}
              </div>
              {coMakerTab === "cm" && renderCustomerFields({ prefix: "cm", title: "Co-Maker 1", card: false })}
              {coMakerTab === "cm2" && renderCustomerFields({ prefix: "cm2", title: "Co-Maker 2", card: false })}
              {coMakerTab === "cm3" && renderCustomerFields({ prefix: "cm3", title: "Co-Maker 3", card: false })}
            </FieldGroup>

            <FieldGroup title="Bank Financing Information" icon={faMoneyBill}>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Financing Institution</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field id="finCustcode" label="Bank Financing Code" type="lookup" value={state.finCustcode} disabled={isFormDisabled} onLookup={() => updateState({ customerModalOpen: true, customerLookupTarget: "fin" })} onChange={(v) => updateState({ finCustcode: v })} />
                  <Field label="Bank Financing Name" value={state.finCustname} disabled readOnly />
                  </div>
                </section>
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Loan Reference</div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <Field label="Terms of Payment" value={state.termsPayment} disabled={isFormDisabled} onChange={(v) => updateState({ termsPayment: v })} />
                  <Field label="Loan Reference" value={state.pnRef} disabled={isFormDisabled} onChange={(v) => updateState({ pnRef: v })} />
                  <Field label="Co-Signature" value={state.csCustname} disabled={isFormDisabled} onChange={(v) => updateState({ csCustname: v })} />
                  </div>
                </section>
              </div>
            </FieldGroup>

            <FieldGroup title="Other Information" icon={faEllipsis}>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {["particular1", "particular2", "particular3"].map((key, idx) => (
                    <div key={key} className="relative rounded-lg border border-slate-200 bg-slate-50/60 p-2 dark:border-slate-700 dark:bg-slate-900/40">
                      <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {idx + 1}
                      </span>
                      <textarea
                        id={key}
                        rows={5}
                        placeholder=" "
                        className="peer global-tran-textbox-remarks-ui min-h-[130px] w-full resize-y pt-3 pr-10"
                        value={state[key] || ""}
                        disabled={isFormDisabled}
                        onChange={(e) => updateState({ [key]: e.target.value })}
                      />
                      <label htmlFor={key} className="global-tran-floating-label-remarks">
                        Other Information {idx + 1}
                      </label>
                    </div>
                  ))}
                </div>
            </FieldGroup>
          </div>
        </div>

        <div className="global-tran-tab-div-ui mt-2">
          <div className="global-tran-header-tab-div-ui mb-3 flex-wrap gap-x-2 gap-y-1">
            {gridTabs.map(([key, label, icon]) => (
              <TabButton
                key={key}
                active={gridTab === key}
                icon={icon}
                label={label}
                onClick={() => setGridTab(key)}
              />
            ))}
          </div>
          <div className="rounded-b-md border border-t-0 border-gray-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
            {gridTab === "accessories1" && <AmountGrid title="Accessories Info" rows={state.accessories1Rows} disabled={isFormDisabled} onAdd={() => handleAmountGridAdd("accessories1Rows", "Accessories1")} onDelete={(i) => handleAmountGridDelete("accessories1Rows", i)} onChange={(i, f, v) => handleAmountGridChange("accessories1Rows", i, f, v)} />}
            {gridTab === "accessories2" && <AmountGrid title="Additional Accessories Installed" rows={state.accessories2Rows} disabled={isFormDisabled} onAdd={() => handleAmountGridAdd("accessories2Rows", "Accessories2")} onDelete={(i) => handleAmountGridDelete("accessories2Rows", i)} onChange={(i, f, v) => handleAmountGridChange("accessories2Rows", i, f, v)} />}
            {gridTab === "incidental" && <AmountGrid title="Incidental Charges" rows={state.incidentalRows} disabled={isFormDisabled} onAdd={() => handleAmountGridAdd("incidentalRows", "Incidental")} onDelete={(i) => handleAmountGridDelete("incidentalRows", i)} onChange={(i, f, v) => handleAmountGridChange("incidentalRows", i, f, v)} />}
            {gridTab === "discount" && <AmountGrid title="Discounts" rows={state.discountRows} disabled={isFormDisabled} onAdd={() => handleAmountGridAdd("discountRows", "Discounts")} onDelete={(i) => handleAmountGridDelete("discountRows", i)} onChange={(i, f, v) => handleAmountGridChange("discountRows", i, f, v)} />}
            {gridTab === "issue" && <IssueGrid rows={state.issueRows} disabled={isFormDisabled} warehouseValue={[state.whouseCode, state.whouseName].filter(Boolean).join(" - ")} onWarehouseLookup={() => updateState({ warehouseLookupOpen: true })} onAdd={handleOpenInventoryLookup} onDelete={(i) => updateState({ issueRows: state.issueRows.filter((_, x) => x !== i).map((row, x) => ({ ...row, lnNo: x + 1 })) })} onChange={handleIssueChange} />}
          </div>
        </div>
      </div>

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getVSOHistory"
          cacheKey={`VSO_HISTORY_V3:${state.branchCode || ""}`}
          activeTabKey="VSO_Summary"
          branchCode={state.branchCode}
          startDate={null}
          endDate={null}
          status="All"
          onRowDoubleClick={handleHistoryRowPick}
          historyExportName={`${documentTitle} History`}
        />
      </div>

      {state.branchModalOpen && (
        <BranchLookupModal
          isOpen={state.branchModalOpen}
          onClose={(selected) => {
            if (selected) updateState({ branchCode: selected.branchCode || "", branchName: selected.branchName || "", whouseCode: "", whouseName: "" });
            updateState({ branchModalOpen: false });
          }}
        />
      )}

      {state.customerModalOpen && (
        <CustomerMastLookupModal
          isOpen={state.customerModalOpen}
          onClose={async (selected) => {
            const target = state.customerLookupTarget === "customer" ? "" : state.customerLookupTarget;
            updateState({ customerModalOpen: false, customerLookupTarget: "customer" });
            await applyCustomerSelection(selected, target);
          }}
        />
      )}

      {state.payeeLookupOpen && (
        <PayeeMastLookupModal
          isOpen={state.payeeLookupOpen}
          customParam="ActiveAll"
          onClose={(selected) => {
            if (selected) updateState({ sellerVendcode: selected.vendCode || "", sellerVendname: selected.vendName || "" });
            updateState({ payeeLookupOpen: false });
          }}
        />
      )}

      {state.warehouseLookupOpen && (
        <WarehouseLookupModal
          isOpen={state.warehouseLookupOpen}
          filter={`ByBC${state.branchCode}`}
          branchCode={state.branchCode}
          invType="FG"
          onClose={(selected) => {
            if (selected) {
              const selectedWhouseCode = selected.whCode || "";
              updateState({
                whouseCode: selectedWhouseCode,
                whouseName: selected.whName || "",
                issueRows: selectedWhouseCode === state.whouseCode ? state.issueRows : [],
              });
            }
            updateState({ warehouseLookupOpen: false });
          }}
        />
      )}

      {state.billTermLookupOpen && (
        <BillTermLookupModal
          isOpen={state.billTermLookupOpen}
          onClose={(selected) => {
            if (selected) updateState({
              billTerm: selected.billtermCode || "",
              billTermName: selected.billtermName || "",
            });
            updateState({ billTermLookupOpen: false });
          }}
        />
      )}

      {state.salesRepLookupOpen && (
        <SearchSalesRepRef
          isOpen={state.salesRepLookupOpen}
          onClose={handleSalesRepSelection}
        />
      )}

      {state.inventoryLookupOpen && (
        <GlobalLookupModalv1
          isOpen={state.inventoryLookupOpen}
          data={state.inventoryLookupRows}
          endpoint={state.inventoryLookupColumns}
          title="FG Location Balance"
          btnCaption="Get Selected Items"
          onClose={handleCloseInventoryLookup}
          onCancel={() => updateState({ inventoryLookupOpen: false })}
        />
      )}

      {state.showAllTranDocNo && (
        <AllTranDocNo
          isOpen={state.showAllTranDocNo}
          params={{ branchCode: state.branchCode, branchName: state.branchName, docType, documentTitle, fieldNo: "vsoNo" }}
          onRetrieve={async (data) => {
            await fetchTranData(data.docNo, data.branchCode || state.branchCode, data.key);
            updateState({ showAllTranDocNo: data.modalClose });
            setTopTab("details");
          }}
          onResponse={{ documentNo: state.documentNo }}
          onSelected={(data) => {
            handleReset();
            updateState({ showAllTranDocNo: false, documentNo: data.docNo });
          }}
          onClose={() => updateState({ showAllTranDocNo: false })}
        />
      )}

      {state.showCancelModal && <CancelTranModal isOpen={state.showCancelModal} onClose={handleCloseCancel} />}

      <SearchVEAvailabilityVSO
        isOpen={state.showVehicleAvailability}
        branchCode={state.branchCode}
        onClose={handleAvailableVehicleSelection}
      />

      {state.showAttachModal && (
        <AttachDocumentModal
          isOpen={state.showAttachModal}
          params={{
            DocumentID: state.documentID,
            DocumentName: state.documentName || documentTitle,
            BranchName: state.branchName,
            DocumentNo: state.documentNo,
          }}
          onClose={() => updateState({ showAttachModal: false })}
        />
      )}
    </div>
  );
};

export default VSO;
