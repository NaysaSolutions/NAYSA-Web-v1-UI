import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, X, CheckCircle2, Maximize2, Minimize2, Minus, FileSpreadsheet } from "lucide-react";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalErrorAlert,
  useSwalProceedConfirm,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";

const AP_FIELDS = [
  ["Branch Code", "branchCode", "text"], ["Reference Branch", "refBranchCode", "text"],
  ["Cut-off Code", "cutoffCode", "text"], ["AP Control Account", "apAcct", "text"],
  ["Transaction Account", "acctCode", "text"], ["Account Class", "classCode", "text"],
  ["Payee Code", "vendCode", "text"], ["Inventory Type", "invType", "text"],
  ["Document Type", "docCode", "text"], ["Document No.", "docNo", "text"],
  ["Source Document No.", "sourceNo", "text"], ["Document Date", "docDate", "date"],
  ["PO No.", "poNo", "text"], ["RR No.", "rrNo", "text"], ["JO No.", "joNo", "text"],
  ["SVO No.", "svoNo", "text"], ["Supplier Invoice No.", "siNo", "text"], ["Supplier Invoice Date", "siDate", "date"],
  ["Debit Amount", "debit", "number"], ["Credit Amount", "credit", "number"], ["Remarks", "remarks", "text"],
  ["Currency", "currCode", "text"], ["Currency Rate", "currRate", "number"],
  ["Responsibility Center", "rcCode", "text"], ["SL Code", "slCode", "text"],
  ["VAT Code", "vatCode", "text"], ["VAT Amount", "vatAmount", "number"],
  ["ATC Code", "atcCode", "text"], ["EWT Amount", "atcAmount", "number"],
  ["Payment Term", "paytermCode", "text"], ["Control Date", "ctrDate", "date"],
  ["Due Date", "dueDate", "date"], ["Source Line No.", "apdt1LineNo", "text"],
  ["APV Type", "apvType", "text"], ["Reference Document Type", "refDocCode", "text"],
  ["Source Date", "sourceDate", "date"],
];

const ADVANCE_FIELDS = [
  ["Branch Code", "branchCode", "text"], ["Advances Account", "acctCode", "text"],
  ["Payee Code", "vendCode", "text"], ["Document Type", "docCode", "text"],
  ["Reference No.", "docNo", "text"], ["Reference Date", "docDate", "date"],
  ["Advance Amount", "docAmount", "number"], ["Applied Amount", "appliedAmount", "number"],
  ["ATC Amount", "atcAmount", "number"], ["Applied ATC", "appliedAtc", "number"],
  ["VAT Amount", "vatAmount", "number"], ["Applied VAT", "appliedVat", "number"],
  ["Responsibility Center", "rcCode", "text"], ["Currency", "currCode", "text"],
  ["Currency Rate", "currRate", "number"],
];

const AR_FIELDS = [
  ["Branch Code", "branchCode", "text"], ["Reference Branch", "refBranchCode", "text"],
  ["Reference Document Type", "refDocCode", "text"], ["Cut-off Code", "cutoffCode", "text"],
  ["AR Control Account", "acctCode", "text"], ["Sales Account", "salesAcct", "text"],
  ["Account Class", "classCode", "text"], ["Customer Code", "custCode", "text"],
  ["Document Type", "docCode", "text"], ["Document No.", "docNo", "text"],
  ["Document Date", "docDate", "date"], ["Source Document No.", "sourceNo", "text"],
  ["Source Date", "sourceDate", "date"], ["Debit Amount", "debit", "number"],
  ["Credit Amount", "credit", "number"], ["Remarks", "remarks", "text"],
  ["Currency", "currCode", "text"], ["Currency Rate", "currRate", "number"],
  ["Responsibility Center", "rcCode", "text"], ["SL Code", "slCode", "text"],
  ["VAT Code", "vatCode", "text"], ["VAT Amount", "vatAmount", "number"],
  ["ATC Code", "atcCode", "text"], ["ATC Amount", "atcAmount", "number"],
  ["Billing Term", "billtermCode", "text"], ["Received Date", "receivedDate", "date"],
  ["CWT VAT Code", "cwvatCode", "text"], ["CWT VAT Amount", "cwvatAmount", "number"],
];

const AR_ADVANCE_FIELDS = [
  ["Branch Code", "branchCode", "text"], ["Advances Account", "acctCode", "text"],
  ["Customer Code", "custCode", "text"], ["Document Type", "docCode", "text"],
  ["Reference No.", "docNo", "text"], ["Reference Date", "docDate", "date"],
  ["Advance Amount", "docAmount", "number"], ["ATC Amount", "atcAmount", "number"],
  ["Applied Amount", "appliedAmount", "number"], ["Applied ATC", "appliedAtc", "number"],
  ["JV Applied", "jvApplied", "number"], ["In-Transit Applied", "inTransitApplied", "number"],
  ["In-Transit ATC", "inTransitAtc", "number"], ["Responsibility Center", "rcCode", "text"],
  ["Currency", "currCode", "text"], ["Currency Rate", "currRate", "number"],
  ["VAT Code", "vatCode", "text"], ["VAT Amount", "vatAmount", "number"],
];

const normalize = (value) => String(value ?? "").trim();
const excelDate = (value) => {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? normalize(value) : date.toISOString().slice(0, 10);
};

export default function APBeginningBalanceModal({ isOpen, onClose, balanceType, branchCode, userCode, onFinalized, ledgerType = "AP" }) {
  const fileRef = useRef(null);
  const interactionRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [validated, setValidated] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [modalRect, setModalRect] = useState(null);

  useEffect(() => {
    if (!isOpen || isMinimized) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (!isOpen || modalRect) return;
    const width = Math.min(1152, Math.max(320, window.innerWidth - 32));
    const height = Math.min(720, Math.max(320, Math.round(window.innerHeight * 0.9)));
    setModalRect({ x: Math.max(0, (window.innerWidth - width) / 2), y: Math.max(0, (window.innerHeight - height) / 2), width, height });
  }, [isOpen, modalRect]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const interaction = interactionRef.current;
      if (!interaction) return;
      const dx = event.clientX - interaction.startX;
      const dy = event.clientY - interaction.startY;
      if (interaction.type === "drag") {
        setModalRect((current) => current && ({
          ...current,
          x: Math.min(Math.max(0, interaction.rect.x + dx), Math.max(0, window.innerWidth - current.width)),
          y: Math.min(Math.max(0, interaction.rect.y + dy), Math.max(0, window.innerHeight - current.height)),
        }));
      } else {
        setModalRect((current) => current && ({
          ...current,
          width: Math.min(Math.max(720, interaction.rect.width + dx), window.innerWidth - current.x),
          height: Math.min(Math.max(420, interaction.rect.height + dy), window.innerHeight - current.y),
        }));
      }
    };
    const stopInteraction = () => { interactionRef.current = null; };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopInteraction);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopInteraction);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setFileName("");
      setValidated(false);
      setIsMaximized(false);
      setIsMinimized(false);
      setModalRect(null);
    }
  }, [isOpen]);

  const isAR = ledgerType === "AR";
  const isAdvance = balanceType === "ADVANCES";
  const fields = isAR ? (isAdvance ? AR_ADVANCE_FIELDS : AR_FIELDS) : (isAdvance ? ADVANCE_FIELDS : AP_FIELDS);
  const ledgerLabel = `${isAR ? "AR" : "AP"}${isAdvance ? " Advances" : ""}`;
  const headers = fields.map(([header]) => header);
  const reportColumns = useMemo(() => [
    { key: "rowNo", label: "Excel Row", classNames: "text-center", total: false },
    ...fields.map(([label, key, type]) => ({
      key,
      label,
      classNames: type === "number" ? "text-right" : "text-left",
      renderType: type === "number" ? "number" : type === "date" ? "date" : "text",
      total: false,
    })),
    { key: "validationMessage", label: "Validation Result", classNames: "text-left", total: false },
  ], [fields]);

  const startDrag = (event) => {
    if (isMaximized || event.target.closest("button") || !modalRect) return;
    event.preventDefault();
    interactionRef.current = { type: "drag", startX: event.clientX, startY: event.clientY, rect: modalRect };
  };

  const startResize = (event) => {
    if (isMaximized || !modalRect) return;
    event.preventDefault();
    interactionRef.current = { type: "resize", startX: event.clientX, startY: event.clientY, rect: modalRect };
  };

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const sampleRecord = isAR
      ? isAdvance
        ? { branchCode, acctCode: "21001", custCode: "CU000001", docCode: "ARAB", docNo: "ADV-0001", docDate: new Date(), docAmount: 10000, atcAmount: 0, appliedAmount: 0, appliedAtc: 0, jvApplied: 0, inTransitApplied: 0, inTransitAtc: 0, currCode: "PHP", currRate: 1, vatAmount: 0 }
        : { branchCode, refBranchCode: branchCode, refDocCode: "ARBB", cutoffCode: "202610", acctCode: "11001", salesAcct: "40001", classCode: "BB", custCode: "CU000001", docCode: "ARBB", docNo: "OPEN-0001", docDate: new Date(), sourceNo: "OPEN-0001", sourceDate: new Date(), debit: 10000, credit: 0, remarks: "Opening receivable", currCode: "PHP", currRate: 1, slCode: "CU000001" }
      : balanceType === "AP"
      ? { branchCode, refBranchCode: branchCode, cutoffCode: "202610", apAcct: "20001", acctCode: "20001", classCode: "BB", vendCode: "SU000001", docCode: "APBB", docNo: "OPEN-0001", sourceNo: "OPEN-0001", docDate: new Date(), siNo: "OPEN-0001", siDate: new Date(), debit: 0, credit: 10000, remarks: "Opening payable", currCode: "PHP", currRate: 1, slCode: "SU000001", dueDate: new Date(), refDocCode: "APBB", sourceDate: new Date() }
      : { branchCode, acctCode: "12001", vendCode: "SU000001", docCode: "APAB", docNo: "ADV-0001", docDate: new Date(), docAmount: 10000, appliedAmount: 0, atcAmount: 0, appliedAtc: 0, vatAmount: 0, appliedVat: 0, currCode: "PHP", currRate: 1 };
    const sample = fields.map(([, key]) => sampleRecord[key] ?? "");
    const sheet = XLSX.utils.aoa_to_sheet([headers, sample]);
    sheet["!cols"] = headers.map((header) => ({ wch: Math.max(14, header.length + 3) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, `${ledgerLabel} Beginning Balance`);
    XLSX.writeFile(workbook, `${ledgerLabel.replace(/ /g, "_")}_Beginning_Balance_Template.xlsx`);
  };

  const readFile = async (file) => {
    if (!file || !/\.xlsx$/i.test(file.name)) {
      useSwalErrorAlert("Invalid File", "Please upload an .xlsx file generated from the latest template.");
      return;
    }
    try {
      setBusy(true);
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
      const actualHeaders = (matrix[0] || []).map(normalize);
      if (headers.some((header, index) => actualHeaders[index] !== header) || actualHeaders.length !== headers.length) {
        throw new Error("The worksheet columns do not match the latest template.");
      }
      const parsed = matrix.slice(1).filter((row) => row.some((value) => normalize(value) !== "")).map((row, index) => {
        const record = { rowNo: index + 2, isValid: null, validationMessage: "Not validated" };
        fields.forEach(([, key, type], columnIndex) => {
          record[key] = type === "date" ? excelDate(row[columnIndex]) : type === "number" ? Number(row[columnIndex] || 0) : normalize(row[columnIndex]);
        });
        record.branchCode ||= branchCode;
        return record;
      });
      if (!parsed.length) throw new Error("The uploaded worksheet has no detail rows.");
      setRows(parsed);
      setFileName(file.name);
      setValidated(false);
    } catch (error) {
      useSwalErrorAlert("Upload Failed", error.message || "Unable to read the Excel file.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const callImport = async (endpoint) => {
    setBusy(true);
    try {
      const response = await postRequest(endpoint, { json_data: { balanceType, userCode, rows } });
      if (response?.success === false) throw new Error(response?.details || response?.message);
      return response?.data ?? response;
    } finally {
      setBusy(false);
    }
  };

  const validate = async () => {
    try {
      const result = await callImport(isAR ? "validateARBeginningBalance" : "validateAPBeginningBalance");
      const parseRows = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === "string") {
          try { return parseRows(JSON.parse(value)); } catch { return []; }
        }
        return parseRows(value?.data ?? value?.result ?? []);
      };
      const validationRows = parseRows(result);
      const validationByRow = new Map(validationRows.map((row) => [Number(row.rowNo ?? row.ROW_NO), row]));
      const mergedRows = rows.map((originalRow) => {
        const validationRow = validationByRow.get(Number(originalRow.rowNo));
        if (!validationRow) {
          return { ...originalRow, isValid: false, validationMessage: "Validation result was not returned for this row." };
        }
        const mergedRow = { ...originalRow, ...validationRow };
        return { ...mergedRow, validationMessage: mergedRow.isValid ? "Valid" : (mergedRow.validationMessage || "Validation failed.") };
      });
      setRows(mergedRows);
      setValidated(mergedRows.length > 0 && mergedRows.every((row) => Boolean(row.isValid)));
      if (mergedRows.some((row) => !row.isValid)) useSwalErrorAlert("Validation Failed", "Correct the highlighted records, then upload and validate the file again.");
      else useSwalSuccessAlert("Validation Complete", `${mergedRows.length} record(s) are ready to finalize.`);
    } catch (error) {
      useSwalErrorAlert("Validation Failed", error?.response?.data?.details || error.message);
    }
  };

  const finalize = async () => {
    const confirmed = await useSwalProceedConfirm("Finalize Beginning Balance?", `Finalize ${rows.length} ${ledgerLabel} opening record(s)?`);
    if (!confirmed?.isConfirmed) return;
    try {
      const result = await callImport(isAR ? "finalizeARBeginningBalance" : "finalizeAPBeginningBalance");
      useSwalSuccessAlert("Beginning Balance Finalized", `${result?.finalizedRows || rows.length} record(s) were finalized successfully.`);
      onFinalized?.();
      onClose();
    } catch (error) {
      useSwalErrorAlert("Finalization Failed", error?.response?.data?.details || error.message);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[1200] flex min-w-[320px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xl">
        <FileSpreadsheet className="h-4 w-4 text-blue-600" />
        <span className="flex-1 text-xs font-semibold text-slate-700">{ledgerLabel} Beginning Balance</span>
        <button type="button" onClick={() => setIsMinimized(false)} className="p-1.5 text-slate-400 hover:text-blue-600" title="Restore"><Maximize2 size={16} /></button>
        <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-red-600" title="Close"><X size={16} /></button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[1200] overflow-hidden bg-black/45">
      {busy && <LoadingSpinner />}
      <div
        className={`absolute flex flex-col overflow-hidden bg-white shadow-2xl ${isMaximized ? "inset-0 rounded-none" : "rounded-xl"}`}
        style={isMaximized ? undefined : modalRect ? { left: modalRect.x, top: modalRect.y, width: modalRect.width, height: modalRect.height } : { visibility: "hidden" }}
      >
        <div onPointerDown={startDrag} className={`flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-100 py-1 ${isMaximized ? "" : "cursor-move select-none"}`}>
          <div className="flex min-w-0 items-center gap-2 pl-3"><FileSpreadsheet className="h-4 w-4 text-slate-500" /><div><h2 className="global-lookup-headertext-ui">{ledgerLabel} Beginning Balance</h2></div></div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setIsMinimized(true)} className="p-2 text-slate-400 hover:text-slate-700" title="Minimize"><Minus size={17} /></button>
            <button type="button" onClick={() => setIsMaximized((value) => !value)} className="p-2 text-slate-400 hover:text-slate-700" title={isMaximized ? "Restore" : "Maximize"}>{isMaximized ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
            <button onClick={onClose} className="mr-2 p-2 text-slate-400 hover:text-red-600" title="Close"><X size={18} /></button>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-3">
          <button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Download size={15} /> Download Template</button>
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Upload size={15} /> Upload Excel</button>
          <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(event) => readFile(event.target.files?.[0])} />
          <span className="ml-2 text-xs text-slate-500">{fileName || "No file selected"}</span>
          <div className="ml-auto flex gap-2">
            <button disabled={!rows.length || busy} onClick={validate} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"><CheckCircle2 size={15} /> Validate</button>
            <button disabled={!validated || busy} onClick={finalize} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Finalize</button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden p-4">
          <SearchGlobalReportTable className="h-full" columns={reportColumns} data={rows} itemsPerPage={100} showFilters showGlobalSearch showGroupBy pagination alwaysShowHorizontalScroll={isMaximized} totalExemptions={reportColumns.map((column) => column.key)} docType={`${ledgerLabel} Beginning Balance Preview`} />
          {!rows.length && <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-sm text-slate-500">Download the template, complete it, and upload the Excel file to begin.</div>}
        </div>
        {!isMaximized && <div onPointerDown={startResize} className="absolute bottom-0 right-0 z-30 h-5 w-5 cursor-se-resize border-b-2 border-r-2 border-blue-500" title="Resize" />}
      </div>
    </div>
  );
}
