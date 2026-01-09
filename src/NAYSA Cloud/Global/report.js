import { apiClient ,postPdfRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
import { useTopDocControlRow,useTopHSRptRow } from '@/NAYSA Cloud/Global/top1RefTable';
import { formatNumber } from "@/NAYSA Cloud/Global/behavior";
import { stringify } from 'postcss';
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";


export function injectLoadingSpinner(printWindow) {
  if (!printWindow || !printWindow.document) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Preparing Document...</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #eef2f3, #d9e2ec);
            color: #333;
          }
          .spinner {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            border: 6px solid transparent;
            border-top: 6px solid #4a90e2;
            border-left: 6px solid #6fb1fc;
            background: linear-gradient(145deg, #ffffff, #cfd9df);
            box-shadow:
              inset 2px 2px 4px rgba(0,0,0,0.15),
              inset -2px -2px 4px rgba(255,255,255,0.6),
              0 0 12px rgba(74,144,226,0.4);
            animation: spin 1s linear infinite;
            margin-bottom: 18px;
          }
          .caption {
            font-size: 1rem;
            font-weight: 500;
            opacity: 0.85;
            letter-spacing: 0.4px;
            text-shadow: 1px 1px 2px rgba(255,255,255,0.8);
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <div class="caption">Preparing document...</div>
      </body>
    </html>
  `);
}





export async function useHandlePrint(documentID, docCode, printMode, userCode) {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Popup blocked — please allow popups for this site.");
    }

    injectLoadingSpinner(printWindow);
    const responseDocControl = await useTopDocControlRow(docCode);
    const formName = responseDocControl?.formName;

    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { tranId: documentID, formName, docCode, printMode ,userCode};
    const pdfBlob = await postPdfRequest("/printForm", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    const fileURL = URL.createObjectURL(pdfBlob);
    printWindow.location.href = fileURL;

  } catch (error) {
    console.error("Error printing report:", error);
  }
}






export async function useHandlePrintARReport(params) {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Popup blocked — please allow popups for this site.");
    }

    injectLoadingSpinner(printWindow);

  
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { 
              branchCode: params.branchCode,
              startDate: params.startDate,
              endDate: params.endDate,
              sCustCode: params.sCustCode,
              eCustCode: params.eCustCode,
              reportName: formName,
              sprocMode:"",
              sprocName : "",
              export :"" };

        console.log(JSON.stringify(payload))

    const pdfBlob = await postPdfRequest("/printARReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    const fileURL = URL.createObjectURL(pdfBlob);
    printWindow.location.href = fileURL;

  } catch (error) {
    console.error("Error printing report:", error);
  }
}





export async function useHandleDownloadExcelARReport(params) {
 
   try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      sCustCode: params.sCustCode,
      eCustCode: params.eCustCode,
      formName: responseDocRpt.crptName,
      sprocMode: responseDocRpt.sprocMode,
      sprocName: responseDocRpt.sprocName,
      export: responseDocRpt.export,
      reportName: responseDocRpt.reportName,
      userCode:params.userCode
    };

    // ⬇️ override only for this request
    const response = await apiClient.post("/printARReport", payload, {
      responseType: "blob",
    });

    if (!response || !response.data) {
      return false; // no data received
    }

    // Determine filename from headers or fallback
    let filename = responseDocRpt.reportName + ".xlsx";
    const disposition = response.headers["content-disposition"];
    if (disposition && disposition.includes("filename=")) {
      filename = disposition
        .split("filename=")[1]
        .replace(/["']/g, "")
        .trim();
    }

    // Create a blob and trigger download
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup URL object
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    return true;
  } catch (error) {
    console.error("Error downloading report:", error);
    return false;
  }
}








export async function useHandlePrintAPReport(params) {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Popup blocked — please allow popups for this site.");
    }

    injectLoadingSpinner(printWindow);

  
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { 
              branchCode: params.branchCode,
              startDate: params.startDate,
              endDate: params.endDate,
              sPayee: params.sVendCode,
              ePayee: params.eVendCode,
              reportName: formName,
              sprocMode:"",
              sprocName : "",
              export :"" };

        console.log(JSON.stringify(payload))

    const pdfBlob = await postPdfRequest("/printAPReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    const fileURL = URL.createObjectURL(pdfBlob);
    printWindow.location.href = fileURL;

  } catch (error) {
    console.error("Error printing report:", error);
  }
}





export async function useHandleDownloadExcelAPReport(params) {
 
   try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      sPayee: params.sVendCode,
      ePayee: params.eVendCode,
      formName: responseDocRpt.crptName,
      sprocMode: responseDocRpt.sprocMode,
      sprocName: responseDocRpt.sprocName,
      export: responseDocRpt.export,
      reportName: responseDocRpt.reportName,
      userCode:params.userCode
    };


    console.log(JSON.stringify(payload))

    // ⬇️ override only for this request
    const response = await apiClient.post("/printAPReport", payload, {
      responseType: "blob",
    });

    if (!response || !response.data) {
      return false; // no data received
    }

    // Determine filename from headers or fallback
    let filename = responseDocRpt.reportName + ".xlsx";
    const disposition = response.headers["content-disposition"];
    if (disposition && disposition.includes("filename=")) {
      filename = disposition
        .split("filename=")[1]
        .replace(/["']/g, "")
        .trim();
    }

    // Create a blob and trigger download
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup URL object
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    return true;
  } catch (error) {
    console.error("Error downloading report:", error);
    return false;
  }
}








export async function useHandlePrintGLReport(params) {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Popup blocked — please allow popups for this site.");
    }

    injectLoadingSpinner(printWindow);

  
    const responseDocRpt = await useTopHSRptRow(params.reportId);
    const formName = responseDocRpt?.reportName;
    if (!formName) {
      throw new Error("Report Name not defined");
    }

    const payload = { 
              branchCode: params.branchCode,
              startDate: params.startDate,
              endDate: params.endDate,
              sGL: params.sAcctCode,
              eGL: params.eAcctCode,
              sSL: params.sSLCode,
              eSL: params.eSLCode,
              sRC: params.sRCCode,
              eRC: params.eRCCode,
              reportName: formName,
              sprocMode:"",
              sprocName : "",
              export :"" };

        console.log(JSON.stringify(payload))

    const pdfBlob = await postPdfRequest("/printGLReport", payload);

    if (!(pdfBlob instanceof Blob) || pdfBlob.type !== "application/pdf") {
      throw new Error("Expected a PDF file but received something else.");
    }

    const fileURL = URL.createObjectURL(pdfBlob);
    printWindow.location.href = fileURL;

  } catch (error) {
    console.error("Error printing report:", error);
  }
}





export async function useHandleDownloadExcelGLReport(params) {
 
   try {
    const responseDocRpt = await useTopHSRptRow(params.reportId);

    const payload = {
      branchCode: params.branchCode,
      startDate: params.startDate,
      endDate: params.endDate,
      sGL: params.sGL,
      eGL: params.eGL,
      sSL: params.sSL,
      eSL: params.eSL,
      sRC: params.sRC,
      eRC: params.eRC,
      formName: responseDocRpt.crptName,
      sprocMode: responseDocRpt.sprocMode,
      sprocName: responseDocRpt.sprocName,
      export: responseDocRpt.export,
      reportName: responseDocRpt.reportName,
      userCode:params.userCode
    };


  

    // ⬇️ override only for this request
    const response = await apiClient.post("/printGLReport", payload, {
      responseType: "blob",
    });

    if (!response || !response.data) {
      return false; // no data received
    }

    // Determine filename from headers or fallback
    let filename = responseDocRpt.reportName + ".xlsx";
    const disposition = response.headers["content-disposition"];
    if (disposition && disposition.includes("filename=")) {
      filename = disposition
        .split("filename=")[1]
        .replace(/["']/g, "")
        .trim();
    }

    // Create a blob and trigger download
    const blob = new Blob([response.data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup URL object
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);

    return true;
  } catch (error) {
    console.error("Error downloading report:", error);
    return false;
  }
}






export function exportToTabbedJson(jsonSheets = []) {
  const data = {};
  for (const tab of jsonSheets) {
    const key = tab.sheetName || "Sheet";
    data[key] = Array.isArray(tab.rows) ? tab.rows : [];
  }
  return { Data: data };
}




export function exportBuildJsonSheets(sheetConfigs = []) {
  return (sheetConfigs || []).map(cfg => ({
    sheetName: cfg.sheetName || "Sheet",
    rows: Array.isArray(cfg.data) ? cfg.data : [],
  }));
}



export function projectRowsByColumnsRaw(rows = [], columns = []) {
 
  const isVisible = (col) => col && col.hidden !== true;

  function formatByColumn(value, col) {
    if (value === null || value === undefined) return "";
    if (col.renderType === "number" || col.renderType === "currency") {
      const digits =
        typeof col.roundingOff === "number" ? col.roundingOff : 2;
      return formatNumber(value, digits);
    }
    return String(value);
  }


  if (!Array.isArray(rows) || rows.length === 0) return [];
  if (!Array.isArray(columns) || columns.length === 0) return rows;

  const visibleCols = columns.filter(isVisible);
  if (visibleCols.length === 0) return rows;

  return rows.map((r) => {
    const out = {};
    for (const col of visibleCols) {
      const header = col.label || col.key;
      const rawValue = r?.[col.key];
      out[header] = formatByColumn(rawValue, col); 
    }
    return out;
  });
}



export function makeSheet(sheetName, rows, columns) {
  return {
    sheetName: sheetName || "Sheet",
    data: projectRowsByColumnsRaw(rows, columns),
  };
}




export async function exportHistoryExcel(endPoint,payload,setExporting,reportName) {
 
   try {
        const res = await apiClient.post(endPoint, payload, { responseType: "blob" });
        const cd = res.headers["content-disposition"] || "";
        const match = cd.match(/filename=("?)([^"]+)\1/i);
        const filename = match ? match[2] : `${reportName}.xlsx`;
  
        const blob = new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      } catch (err) {
        try {
          const text = await err?.response?.data?.text?.();
          console.error("Export failed:", text || err);
          alert("Export failed.\n" + (text || err.message));
        } catch {
          console.error("Export failed:", err);
          alert("Export failed.\n" + err.message);
        }
      } finally {
        setExporting(false);
      }
}







export function useDownloadTextFile(filename, text) {
   try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    // Create a temporary hidden <a> tag
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;

    // In some browsers, setting rel="noopener" and target="_self"
    // ensures same-name overwriting behavior instead of appending (1)
    a.rel = "noopener";
    a.target = "_self";
    a.style.display = "none";

    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Download failed:", err);
  }
}





export const useNormalizeDat = (src) => {
  if (src == null) return "";

  // If it's already a string, normalize CRLF and return
  if (typeof src === "string") {
    return src.replace(/\r?\n/g, "\r\n");
  }

  // If it's a flat array (strings/numbers), join as lines
  if (Array.isArray(src) && src.every(v => typeof v !== "object" || v === null)) {
    return src.map(v => String(v ?? "")).join("\r\n").replace(/\r?\n/g, "\r\n");
  }

  // If it's an array of objects, pick a sensible line for each object
  if (Array.isArray(src) && src.some(v => v && typeof v === "object")) {
    const preferredKeys = ["line", "LINE", "dat", "DAT", "text", "TEXT", "value", "VALUE", "data", "DATA"];

    const objToLine = (obj) => {
      if (obj == null) return "";

      // 1) If there's a single obvious text field, use it
      for (const k of preferredKeys) {
        if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] != null) {
          return String(obj[k]);
        }
      }

      // 2) Otherwise, build a pipe-delimited line from values (stable key order)
      const keys = Object.keys(obj); // JS preserves insertion order
      const vals = keys.map((k) => {
        const v = obj[k];
        if (v == null) return "";
        if (typeof v === "object") return JSON.stringify(v); // last resort
        return String(v);
      });
      return vals.join("|");
    };

    const text = src.map(objToLine).join("\r\n");
    return text.replace(/\r?\n/g, "\r\n");
  }

  // Last resort: stringify
  return String(src).replace(/\r?\n/g, "\r\n");
};




const cleanStr = (s) => (s == null ? "" : String(s).trim());
const getFormattedDateTime = () => {
    const now = new Date();
    const date = now.getFullYear() + '-' +
      ('0' + (now.getMonth() + 1)).slice(-2) + '-' +
      ('0' + now.getDate()).slice(-2);
    const time = ('0' + now.getHours()).slice(-2) + ':' +
      ('0' + now.getMinutes()).slice(-2) + ':' +
      ('0' + now.getSeconds()).slice(-2);
    return date + ' ' + time;
  };





export async function exportGenericHistoryExcel(payload, columnConfigsMap, groupingKeys = []) {
  const {
    ReportName,
    UserCode,
    Branch,
    StartDate,
    EndDate,
    JsonData,
    companyName,
    companyAddress,
    companyTelNo,
  } = payload;

  const sheetsData = JsonData?.Data || {};
  const sheetKeys = Object.keys(sheetsData);

  if (sheetKeys.length === 0) {
    alert("No data found to export.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = UserCode || "System";
  workbook.created = new Date();
  workbook.properties.defaultFont = { name: "Aptos", size: 10 };

  // --- Constants ---
  const MAX_COL_WIDTH = 60; // ~400px max
  const MIN_COL_WIDTH = 10; 
  const PADDING = 2; 

  // Fixed color for the header background
  const HEADER_COLOR = "4E56C0"; // Light Blue
  
  // Request 4: Subtotal Color changed to Light Gray
  const SUBTOTAL_COLOR = "FFEEEEEE"; // Light Gray fill
  const GRAND_TOTAL_COLOR = "FFF5F5F5"; // Final Total Row color

  // Colors used for Sheet Tab only
  const SHEET_COLORS = [
    "FFADD8E6", 
    "FF98FB98", 
    "FFFFB6C1", 
    "FF87CEFA", 
    "FFFFE4B5", 
    "FFDDA0DD", 
    "FFB0C4DE", 
    "FFF0E68C", 
    "FFFFDAB9", 
    "FF40E0D0", 
  ];

  const getColLetter = (colIndex) => {
    let letter = "";
    let temp = colIndex;
    while (temp > 0) {
      let modulo = (temp - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      temp = Math.floor((temp - 1) / 26);
    }
    return letter;
  };

  

  // --- Loop through Tabs ---
  for (let i = 0; i < sheetKeys.length; i++) {
    const sheetKey = sheetKeys[i];
    const safeSheetName = sheetKey.replace(/[*?:\/\[\]]/g, " ").substring(0, 31);
    
    const tabColorArgb = SHEET_COLORS[i % SHEET_COLORS.length];

    const ws = workbook.addWorksheet(safeSheetName || "Sheet", {
      properties: {
        tabColor: { argb: tabColorArgb }
      }
    });

    const rawRows = sheetsData[sheetKey] || [];
    
    let columnsDef = columnConfigsMap[sheetKey];
    if (!columnsDef || columnsDef.length === 0) {
        if(rawRows.length > 0) {
             columnsDef = Object.keys(rawRows[0]).map(k => ({
                 key: k,
                 label: k.toUpperCase(),
                 renderType: "text"
             }));
        } else {
            continue; 
        }
    }

    const activeCols = columnsDef.filter(c => !c.hidden);

    // --- Calculate Column Widths ---
    const colWidths = activeCols.map(col => {
        let maxLen = (col.label || col.key).length;
        for (let r = 0; r < rawRows.length; r++) {
            const val = rawRows[r][col.key];
            const valLen = val ? String(val).length : 0;
            const buffer = (col.renderType === 'number' || col.renderType === 'currency') ? 4 : 0;
            if (valLen + buffer > maxLen) maxLen = valLen + buffer;
            if (maxLen >= MAX_COL_WIDTH) break;
        }
        const finalWidth = Math.min(Math.max(maxLen + PADDING, MIN_COL_WIDTH), MAX_COL_WIDTH);
        return { width: finalWidth };
    });
    ws.columns = colWidths;

    // --- Header Metadata (Dynamic Rows) ---
    const setMeta = (r, c, val, bold = false) => {
      const cell = ws.getCell(r, c);
      cell.value = val;
      cell.font = { name: "Aptos", size: 10, bold: bold };
      cell.alignment = { horizontal: "left", wrapText: false };
    };

    let currentRowIndex = 1;

    // Company/Report Info
    ws.getCell(currentRowIndex, 1).value = companyName || "";
    ws.getCell(currentRowIndex, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(currentRowIndex, 1).font = { name: "Aptos" , size: 16, bold: true, color: { argb: "FF0000FF" }};
    currentRowIndex++; 
    setMeta(currentRowIndex, 1, companyAddress || "");
    currentRowIndex++; 
    setMeta(currentRowIndex, 1, `Tel No: ${companyTelNo || ""}`);
    currentRowIndex++; 
    ws.getCell(currentRowIndex, 1).value = ReportName || "";
    ws.getCell(currentRowIndex, 1).alignment = { horizontal: "left", vertical: "middle" };
    ws.getCell(currentRowIndex, 1).font = { name: "Aptos" , size: 11, bold: true, italic: true, color: { argb: "#800080" }};
    currentRowIndex++; 
    setMeta(currentRowIndex, 1, `Extracted By: ${UserCode || ""} | Date/Time: ${getFormattedDateTime()}`);
    currentRowIndex++; 

    // Conditional Row: Date Range
    if (StartDate && EndDate) {
        setMeta(currentRowIndex, 1, `Date Range: ${StartDate} - ${EndDate}`);
        currentRowIndex++; 
    }
    
    // --- Render Headers (Dynamic Row) ---
    
    // Blank Row Insertion
    const headerRowIdx = currentRowIndex + 1; 
    const headerRow = ws.getRow(headerRowIdx);

    // Set Frozen Pane Dynamically
    ws.views = [{ state: "frozen", ySplit: headerRowIdx }]; 
    
    activeCols.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.label || col.key;
      cell.font = { name: "Aptos", size: 10, bold: true,color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
      
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_COLOR }, 
      };
    });
    
    headerRow.height = 25; 

    // --- AutoFilter ---
    ws.autoFilter = {
        from: { row: headerRowIdx, column: 1 },
        to: { row: headerRowIdx, column: activeCols.length }
    };

    // --- Data Grouping and Subtotal Calculation Setup ---
    
    // Identify columns that should be totaled
    const totalableColumns = activeCols
        .filter(col => 
            (col.renderType === "number" || col.renderType === "currency") && 
            col.key.toLowerCase() !== 'currrate' // Skip currRate
        )
        .map(col => col.key);

    let processedRows = rawRows; 
    let grandTotalAccumulator = {}; // Used only if grouping is enabled
    let isGroupedMode = Array.isArray(groupingKeys) && groupingKeys.length > 0 && rawRows.length > 0;
    
    // --- Grouping Logic (for Grouped Mode) ---
    if (isGroupedMode) {
        // Initialize Grand Total accumulator
        totalableColumns.forEach(key => grandTotalAccumulator[key] = 0);
        
        // 1. Sort the data by the grouping keys
        const sortedRows = [...rawRows].sort((a, b) => {
            for (const key of groupingKeys) {
                if (a[key] < b[key]) return -1;
                if (a[key] > b[key]) return 1;
            }
            return 0;
        });

        processedRows = [];
        let currentGroup = {};
        let currentGroupRows = [];

        const calculateSubtotal = (groupValue) => {
            if (currentGroupRows.length === 0) return null;

            const subtotalRow = { __isSubtotal: true, __groupingValue: groupValue };
            
            // Calculate totals and accumulate to Grand Total
            totalableColumns.forEach(key => {
                const subtotal = currentGroupRows.reduce((sum, row) => sum + (parseFloat(row[key]) || 0), 0);
                subtotalRow[key] = subtotal;
                grandTotalAccumulator[key] += subtotal; // Request 3: Accumulate for Grand Total
            });
            
            return subtotalRow;
        };
        
        const isGroupChange = (row) => {
            if (currentGroupRows.length === 0) return true;
            for (const key of groupingKeys) {
                if (row[key] !== currentGroup[key]) {
                    return true;
                }
            }
            return false;
        };

        sortedRows.forEach((row, index) => {
            if (isGroupChange(row)) {
                // End of previous group: Calculate and push subtotal
                const subtotalRow = calculateSubtotal(currentGroup[groupingKeys[0]]);
                if (subtotalRow) {
                    processedRows.push({ __isBlank: true }); 
                    processedRows.push(subtotalRow);
                }
                
                // Start new group
                currentGroup = {};
                groupingKeys.forEach(key => currentGroup[key] = row[key]);
                currentGroupRows = [];
                
                // Request 1: Group Header Row is REMOVED
            }
            
            currentGroupRows.push(row);
            processedRows.push(row);

            // Handle the last group after the loop finishes
            if (index === sortedRows.length - 1) {
                const subtotalRow = calculateSubtotal(currentGroup[groupingKeys[0]]);
                if (subtotalRow) {
                    processedRows.push({ __isBlank: true }); 
                    processedRows.push(subtotalRow);
                }
            }
        });
    }

    // --- Render Data and Subtotals ---
    const dataStartRowIdx = headerRowIdx + 1; 
    let dataRowCounter = dataStartRowIdx; 

    processedRows.forEach((rowItem) => {
      const wsRow = ws.getRow(dataRowCounter);
      const isSubtotalRow = rowItem.__isSubtotal;
      const isBlank = rowItem.__isBlank; 

      if (isBlank) {
          dataRowCounter++;
          return;
      }
      
      // The isGroupHeader rendering block was removed as per Request 1

      // Normal Data Row or Subtotal Row
      activeCols.forEach((col, colIdx) => {
        const cell = wsRow.getCell(colIdx + 1);
        const rawVal = rowItem[col.key];
        const type = col.renderType || "text";
        
        cell.font = { name: "Aptos", size: 10, bold: isSubtotalRow };

        if (isSubtotalRow) {
            // Subtotal Formatting (Request 4 applied)
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBTOTAL_COLOR } };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
            
            if (type === "number" || type === "currency") {
                const num = parseFloat(rawVal);
                if (!isNaN(num)) {
                    cell.value = num; // Value is already the calculated total
                    const digits = col.roundingOff ?? 2; 
                    const zeros = "0".repeat(digits);
                    cell.numFmt = `#,##0.${zeros};[Red]-#,##0.${zeros};0.${zeros}`;
                    cell.alignment = { horizontal: "right", wrapText: false };
                }
            } else if (colIdx === 0) {
                // Place the subtotal label in the first column
                cell.value = `SUBTOTAL for ${rowItem.__groupingValue}`;
                cell.alignment = { horizontal: "left", wrapText: false };
                
            } else {
                 cell.value = ""; // Clear other non-totalable subtotal cells
            }
            
        } else { 
            // Normal Data Row Formatting
            if (type === "number" || type === "currency") {
                const num = parseFloat(rawVal);
                if (!isNaN(num)) {
                    cell.value = num;
                    const digits = col.roundingOff ?? 2; 
                    const zeros = "0".repeat(digits);
                    cell.numFmt = `#,##0.${zeros};[Red]-#,##0.${zeros};0.${zeros}`;
                    cell.alignment = { horizontal: "right", wrapText: false };
                } else {
                    cell.value = rawVal ?? "";
                    cell.alignment = { horizontal: "right", wrapText: false };
                }
            } 
            else if (type === "date") {
                cell.value = rawVal ? new Date(rawVal) : "";
                cell.numFmt = 'mm/dd/yyyy';
                cell.alignment = { horizontal: "center", wrapText: false };
            } 
            else {
                cell.value = rawVal ?? "";
                cell.alignment = { horizontal: "left", wrapText: false };
            }
        }
      });
      dataRowCounter++;
    });

    // --- Grand Total Row Logic (Requests 2 & 3) ---
    const lastDataRow = dataRowCounter - 1;
    const firstDataRow = dataStartRowIdx; 
    
    // Only render a total row if there is at least one data row
    if (lastDataRow >= firstDataRow) { 
        // Add a blank row before the final total for separation
        if (isGroupedMode) {
            dataRowCounter++;
        }
        
        const totalRow = ws.getRow(dataRowCounter);
        const totalLabelCell = totalRow.getCell(1);

        // Request 2 & 3: Label adjustment
        if (isGroupedMode) {
            totalLabelCell.value = "GRAND TOTAL";
        } else {
            totalLabelCell.value = "TOTAL";
        }
        
        totalLabelCell.font = { bold: true, name: "Aptos" };
        totalLabelCell.alignment = { horizontal: "right", wrapText: false };

        activeCols.forEach((col, idx) => {
            const colIdx = idx + 1;
            const cell = totalRow.getCell(colIdx);
            
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAND_TOTAL_COLOR } };

            const type = col.renderType;
            
            // Skip summation for 'currRate'
            if (col.key.toLowerCase() === 'currrate' || col.key.toLowerCase().includes('rate') ) {
                cell.value = ''; 
                return;
            }
            
            if (type === "number" || type === "currency") {
                cell.font = { bold: true, name: "Aptos" };
                cell.alignment = { horizontal: "right", wrapText: false };
                
                const digits = col.roundingOff ?? 2; 
                const zeros = "0".repeat(digits);
                cell.numFmt = `#,##0.${zeros};[Red]-#,##0.${zeros};0.${zeros}`;

                if (isGroupedMode) {
                    // Use the pre-calculated Grand Total (Request 3)
                    cell.value = grandTotalAccumulator[col.key] || 0;
                } else {
                    // Use Excel SUM formula for non-grouped mode (Request 2)
                    const letter = getColLetter(colIdx);
                    cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` };
                }
            }
        });
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  const fileName = `${ReportName || "Export"}.xlsx`;
  
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    fileName
  );
}





export const exportGenericQueryExcel = async (
    data,
    grandTotals,
    visibleCols,
    groupBy,
    columns,
    expandedGroups,
    startHeaderRow = 7, // Header is in Row 7
    fileName,
    userName,
    compName,
    compAddr,
    telNo
    ) => {
    if (!data || data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Report Export");

    // --- Constants for Formatting ---
    const DETAIL_FONT = { name: "Aptos", size: 10 };
    const HEADER_FONT = {
    name: "Aptos",
    size: 10,
    bold: true,
    color: { argb: "FFFFFFFF" },
    };
    // REQUIRED: Header row height set to 25
    const HEADER_ROW_HEIGHT = 25;
        
        // Subtotal Row Fill Style (Light Yellow)
    const SUB_TOTAL_FILL_STYLE = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFFFE0" }, 
    };
        // Grand Total Row Fill Style (Light Gray)
        const TOTAL_FILL_STYLE = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFD3D3D3" },
        };

    const headerKeys = visibleCols.map((c) => c.key);
    const headerLabels = visibleCols.map((c) => c.label);
    const colCount = headerKeys.length;

    // Excel date format: MM/dd/yyyy
    const DATE_NUMFMT = "mm/dd/yyyy";

    // --- Helpers using columns metadata ---
    const getFullCol = (key) =>
    columns.find((c) => c.key === key) ||
    visibleCols.find((c) => c.key === key);

    const getNumberFormatForCol = (col) => {
    if (col?.renderType === "number" || col?.renderType === "currency") {
    const digits =
      typeof col.roundingOff === "number" ? col.roundingOff : 2;
    const decimalPart = digits > 0 ? "." + "0".repeat(digits) : "";
    return `#,##0${decimalPart}`;
    }
    return undefined;
    };

    const getRoundedNumericValue = (col, rawVal) => {
    if (rawVal === null || rawVal === undefined || rawVal === "") return null;

    const num = parseFloat(String(rawVal).replace(/,/g, ""));
    if (isNaN(num)) return null;

    const digits =
    typeof col.roundingOff === "number" ? col.roundingOff : 2;
    const factor = Math.pow(10, digits);
    const rounded = Math.round(num * factor) / factor;

    return rounded;
    };

    const prepareCellValue = (key, node) => {
    const col = getFullCol(key);
    const rawVal = node[key];

    if (rawVal === null || rawVal === undefined || rawVal === "") return null;

    if (col?.renderType === "number" || col?.renderType === "currency") {
    return getRoundedNumericValue(col, rawVal);
    }

    if (col?.renderType === "date") {
    const str = String(rawVal);
    const datePart = str.split("T")[0].split(" ")[0];

    const d = new Date(datePart);
    return isNaN(d.getTime()) ? rawVal : d;
    }

    return rawVal;
    };

    // --- 1. Column definitions ---
    worksheet.columns = visibleCols.map((col) => {
    const fullCol = getFullCol(col.key);
    let numFmt;

    if (fullCol?.renderType === "date") {
    numFmt = DATE_NUMFMT;
    } else {
    numFmt = getNumberFormatForCol(fullCol);
    }

    return {
    header: col.label,
    key: col.key,
    width: col.width ? Number(col.width) / 6 : 15,
    numFmt,
    style: { font: DETAIL_FONT }, // Aptos 10 style for column data
    };
    });

    // --- 2. Report Header/Metadata rows ---
    const setMeta = (r, c, val, bold = false) => {
    const cell = worksheet.getCell(r, c);
    cell.value = val;
    cell.font = { name: "Aptos", size: 10, bold: bold }; // Aptos 10 for metadata
    cell.alignment = { horizontal: "left", wrapText: false };
    };

    let currentRowIndex = 1;

    // Company/Report Info
    worksheet.getCell(currentRowIndex, 1).value = compName || "";
    worksheet.getCell(currentRowIndex, 1).alignment = {
    horizontal: "left",
    vertical: "middle",
    };
    worksheet.getCell(currentRowIndex, 1).font = {
    name: "Aptos",
    size: 16,
    bold: true,
    color: { argb: "FF0000FF" },
    };
    currentRowIndex++;
    setMeta(currentRowIndex, 1, compAddr || "");
    currentRowIndex++;
    setMeta(currentRowIndex, 1, `Tel No: ${telNo || ""}`);
    currentRowIndex++;
    worksheet.getCell(currentRowIndex, 1).value = fileName || "";
    worksheet.getCell(currentRowIndex, 1).alignment = {
    horizontal: "left",
    vertical: "middle",
    };
    worksheet.getCell(currentRowIndex, 1).font = {
    name: "Aptos",
    size: 11,
    bold: true,
    italic: true,
    color: { argb: "#800080" },
    };
    currentRowIndex++;
    setMeta(
    currentRowIndex,
    1,
    `Extracted By: ${userName || ""} | Date/Time: ${getFormattedDateTime()}`
    );
    currentRowIndex++;

    // --- 3. Column Header Row (Row 7) ---
    const headerRow = worksheet.getRow(startHeaderRow);
    headerRow.height = HEADER_ROW_HEIGHT; // Set Row Height to 25
    headerRow.values = [, ...headerLabels];

    headerRow.eachCell((cell) => {
    cell.font = HEADER_FONT; // Aptos 10 Bold White
    cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: false,
    };
    cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "4E56C0" },
    };
    });

    // --- 3.5. AutoFilter ---
    // Apply autofilter if the report is NOT grouped.
    if (groupBy.length === 0) {
    // Define the range from A7 (Column 1, Row startHeaderRow) to the last column/same row
    const filterRange = `A${startHeaderRow}:${worksheet.getColumn(colCount).letter}${startHeaderRow}`;
    worksheet.autoFilter = filterRange;
    }

    // --- 4. Data + Group rows (Starting at Row 8) ---
    currentRowIndex = startHeaderRow + 1; // Start data at Row 8

    const addRows = (nodes, currentLevel = 0) => {
    nodes.forEach((node) => {
    if (node.isGroup) {
      const uniqueId = `${node.key}-${node.value}-${node.level}`;

      // Group Row
      const groupRow = worksheet.getRow(currentRowIndex++);
      groupRow.getCell(1).value = `${
      columns.find((c) => c.key === node.key)?.label
      }: ${node.value} (${node.count} items)`;
      groupRow.getCell(1).font = { ...DETAIL_FONT, bold: true };
      groupRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
      };

      worksheet.mergeCells(groupRow.number, 1, groupRow.number, colCount);

      if (expandedGroups[uniqueId] || groupBy.length === 1) {
      addRows(node.children, currentLevel + 1);

      // Subtotal Row
      const subtotalRow = worksheet.getRow(currentRowIndex++);
      
            // --------------------------------------------------------
            // ✅ FIX: Apply fill across the entire data width (1 to colCount)
            for (let i = 1; i <= colCount; i++) {
                subtotalRow.getCell(i).fill = SUB_TOTAL_FILL_STYLE;
            }
            // --------------------------------------------------------
      
      // Set label/font for the first cell (Column A)
      subtotalRow.getCell(1).value = "Subtotal:";
      subtotalRow.getCell(1).font = { ...DETAIL_FONT, bold: true };
      
      headerKeys.forEach((key, index) => {
      const aggregateValue = node.aggregates[key];
      if (aggregateValue !== undefined) {
      const fullCol = getFullCol(key);
      let val = aggregateValue;
      const cell = subtotalRow.getCell(index + 1);

      cell.font = DETAIL_FONT;
            // The fill is already applied above, no need to apply it here.

      if (
        fullCol?.renderType === "number" ||
        fullCol?.renderType === "currency"
      ) {
        val = getRoundedNumericValue(fullCol, aggregateValue);
        cell.value = val;
        const numFmt = getNumberFormatForCol(fullCol);
        if (numFmt) cell.numFmt = numFmt;
      } else {
        cell.value = val;
      }
      }
      });
      }
    } else {
      const dataRow = worksheet.getRow(currentRowIndex++);

      headerKeys.forEach((key, index) => {
      const fullCol = getFullCol(key);
      const cell = dataRow.getCell(index + 1);
      const value = prepareCellValue(key, node);

      cell.value = value;
      cell.font = DETAIL_FONT;

      if (
      fullCol?.renderType === "number" ||
      fullCol?.renderType === "currency"
      ) {
      const numFmt = getNumberFormatForCol(fullCol);
      if (numFmt) cell.numFmt = numFmt;
      }

      if (fullCol?.renderType === "date" && value instanceof Date) {
      cell.numFmt = DATE_NUMFMT;
      }
      });
    }
    });
    };

    addRows(data);

    // --- 5. Grand Total Row ---
    const totalRow = worksheet.getRow(currentRowIndex++);

    // Set the value and font for the first cell (Column A)
    totalRow.getCell(1).value = groupBy.length > 0 ? "GRAND TOTAL" : "TOTAL";
    totalRow.getCell(1).font = { ...DETAIL_FONT, bold: true };

    // Apply the fill to ALL cells from Column 1 up to the last column (`colCount`)
    for (let i = 1; i <= colCount; i++) {
    totalRow.getCell(i).fill = TOTAL_FILL_STYLE;
    }

    headerKeys.forEach((key, index) => {
    const totalValue = grandTotals[key];
    if (totalValue !== undefined) {
    const fullCol = getFullCol(key);
    const cell = totalRow.getCell(index + 1);
    let val = totalValue;

    cell.font = DETAIL_FONT;

    if (
      fullCol?.renderType === "number" ||
      fullCol?.renderType === "currency"
    ) {
      val = getRoundedNumericValue(fullCol, totalValue);
      cell.value = val;
      const numFmt = getNumberFormatForCol(fullCol);
      if (numFmt) cell.numFmt = numFmt;
    } else {
      cell.value = val;
    }
    }
    });



    const MAX_TEXT_CHAR_WIDTH = 40; // max characters for general text
    const MAX_NUM_CHAR_WIDTH = 25; // max characters for number and currency
    const MAX_DATE_CHAR_WIDTH = 15; // ✅ NEW: max characters for date columns
    const FIRST_COL_CHAR_WIDTH = 15; // fixed width for first column

    worksheet.columns.forEach((column, colIndex) => {
    const colNumber = colIndex + 1;

    if (colNumber === 1) {
    column.width = FIRST_COL_CHAR_WIDTH;
    return;
    }

    const headerKey = headerKeys[colNumber - 1];
    const fullCol = getFullCol(headerKey);

        // ✅ REVISION: Separate width calculation for number, date, and text
        let maxAllowedWidth = MAX_TEXT_CHAR_WIDTH; // Default to 40

        if (fullCol?.renderType === "number" || fullCol?.renderType === "currency") {
            maxAllowedWidth = MAX_NUM_CHAR_WIDTH; // 20
        } else if (fullCol?.renderType === "date") {
            maxAllowedWidth = MAX_DATE_CHAR_WIDTH; // 15
        }

    let maxLength = 0;

    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
    // ---- Skip group, subtotal, and total rows in width calculation ----
    const firstColVal = worksheet.getRow(rowNumber).getCell(1).value;
    if (typeof firstColVal === "string") {
    const t = firstColVal.trim().toUpperCase();
    if (
    t.startsWith("SUBTOTAL") ||
    t.startsWith("TOTAL") ||
    t.startsWith("GRAND TOTAL") ||
    t.includes(" ITEMS)")
    ) {
    return;
    }
    }

    let cellValue = cell.value;
    if (cellValue == null) return;

    if (typeof cellValue === "object") {
    if (cellValue.text) {
    cellValue = cellValue.text;
    } else if (cellValue.richText) {
    cellValue = cellValue.richText.map((r) => r.text).join("");
    } else if (cellValue.result != null) {
    cellValue = cellValue.result;
    } else if (
    cellValue.year != null &&
    cellValue.month != null &&
    cellValue.day != null
    ) {
    cellValue = `${cellValue.month}/${cellValue.day}/${cellValue.year}`;
    }
    }

    const text = String(cellValue);
    if (text.length > maxLength) {
    maxLength = text.length;
    }
    });
    column.width = Math.min(maxLength + 2, maxAllowedWidth);
    });




    // --- 7. View Setup: Freeze and Clear Row 1 ---
    // Freeze Rows 1-7 (ySplit: startHeaderRow + 1)
    worksheet.views = [{ state: "frozen", ySplit: startHeaderRow  }];

    // Remove all values in Row 1 except A1
    const row1 = worksheet.getRow(1);
    for (let col = 2; col <= colCount; col++) {
    row1.getCell(col).value = null;
    }

    // --- 8. Download ---
    const safeFileName =
    (fileName && fileName.trim()) || "Query_Export";

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
    type:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
};