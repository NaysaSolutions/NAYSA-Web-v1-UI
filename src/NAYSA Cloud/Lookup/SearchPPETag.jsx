import { useEffect, useMemo, useRef, useState } from "react";
import Barcode from "react-barcode";
import { renderToStaticMarkup } from "react-dom/server";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCompress,
  faDownload,
  faExpand,
  faFloppyDisk,
  faFolderOpen,
  faPrint,
  faRotateLeft,
  faTimes,
  faUpload,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const formatDisplayValue = (value, fallback = "-") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const normalizeTagRows = ({ serialRow = {}, serialRows = [] }) => {
  if (Array.isArray(serialRows) && serialRows.length > 0) {
    return serialRows;
  }

  return [serialRow].filter((row) => row && Object.keys(row).length > 0);
};

const defaultDisplayFields = [
  { key: "propertyTagNo", label: "Tag No.", visible: true, emphasis: true },
  { key: "serialNo", label: "Serial No.", visible: true },
  { key: "location", label: "Location", visible: true },
  { key: "assignedTo", label: "Assigned To", visible: true },
  { key: "department", label: "Department", visible: true },
  { key: "acquiredOn", label: "Acquired On", visible: true },
  { key: "category", label: "Category", visible: false },
  { key: "subCategory", label: "Sub Category", visible: false },
  { key: "brandModel", label: "Brand / Model", visible: false },
  { key: "acqCost", label: "Acq Cost", visible: false },
];



const getDefaultFieldPositions = () =>
  defaultDisplayFields.reduce((acc, field) => {
    acc[field.key] = { x: 0, y: 0 };
    return acc;
  }, {});

const normalizeFieldPositions = (value = {}) => {
  const defaults = getDefaultFieldPositions();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  Object.keys(value).forEach((key) => {
    defaults[key] = {
      x: Number(value[key]?.x) || 0,
      y: Number(value[key]?.y) || 0,
    };
  });

  return defaults;
};

const getDefaultCodeLayout = () => ({
  qr: { x: 0, y: 0, width: 144, height: 144 },
  barcode: { x: 0, y: 0, width: 168, height: 51 },
});

const normalizeCodeLayout = (value = {}) => {
  const defaults = getDefaultCodeLayout();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  Object.keys(defaults).forEach((key) => {
    defaults[key] = {
      x: Number(value[key]?.x) || 0,
      y: Number(value[key]?.y) || 0,
      width: Math.max(24, Number(value[key]?.width) || defaults[key].width),
      height: Math.max(18, Number(value[key]?.height) || defaults[key].height),
    };
  });

  return defaults;
};

const paperPresets = [
  { label: "Custom", width: "", height: "" },
  { label: "90mm x 50mm", width: "90", height: "50" },
  { label: "80mm x 40mm", width: "80", height: "40" },
  { label: "70mm x 35mm", width: "70", height: "35" },
  { label: "50mm x 30mm", width: "50", height: "30" },
];



const sheetPaperPresets = [
  { key: "letter", label: "Letter (8.5 x 11)", width: 215.9, height: 279.4 },
  { key: "legal", label: "Legal (8.5 x 14)", width: 215.9, height: 355.6 },
  { key: "a4", label: "A4", width: 210, height: 297 },
  { key: "folio", label: "8.5 x 13", width: 215.9, height: 330.2 },
];

const sheetTagCountOptions = [
  { value: "4", label: "x4 / 4 tags per sheet", columns: 2, rows: 2 },
  { value: "6", label: "x6 / 6 tags per sheet", columns: 2, rows: 3 },
  { value: "8", label: "x8 / 8 tags per sheet", columns: 2, rows: 4 },
  { value: "10", label: "x10 / 10 tags per sheet", columns: 2, rows: 5 },
];

const getSheetPaperPreset = (key) =>
  sheetPaperPresets.find((item) => item.key === key) || sheetPaperPresets[0];

const getSheetTagCountOption = (value) =>
  sheetTagCountOptions.find((item) => item.value === String(value)) || sheetTagCountOptions[0];

const TEMPLATE_LAYOUT_API = "/template-layouts/ppe-tag";
const DEFAULT_LAYOUT_NAME = "default";
const SETTINGS_FILE_VERSION = 1;

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sanitizeLayoutName = (value, fallback = DEFAULT_LAYOUT_NAME) => {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9 _.-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60);

  return clean || fallback;
};

const downloadJsonFile = (fileName, payload) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getQzConnectOptions = () => {
  const usingSecure = typeof window !== "undefined" && window.location.protocol === "https:";

  return {
    host: "localhost",
    port: usingSecure ? { secure: [8181] } : { insecure: [8182] },
    usingSecure,
    retries: 0,
    delay: 0,
  };
};

const getQzEndpointLabel = () => {
  const usingSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  return usingSecure ? "localhost:8181" : "localhost:8182";
};

const SearchPPETag = ({
  isOpen,
  onClose,
  companyInfo = {},
  documentInfo = {},
  detailRow = {},
  serialRow = {},
  serialRows = [],
}) => {
  const [paperWidth, setPaperWidth] = useState("90");
  const [paperHeight, setPaperHeight] = useState("50");
  const [paperPreset, setPaperPreset] = useState("90mm x 50mm");
  const [orientation, setOrientation] = useState("landscape");
  const [showBorder, setShowBorder] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(140);
  const [displayFields, setDisplayFields] = useState(defaultDisplayFields);
  const [showDisplayFields, setShowDisplayFields] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [printOutputMode, setPrintOutputMode] = useState("label"); // label | sheet
  const [sheetPaperSize, setSheetPaperSize] = useState("letter");
  const [sheetTagCount, setSheetTagCount] = useState("4");
  const [sheetMarginMm, setSheetMarginMm] = useState("8");
  const [sheetGapMm, setSheetGapMm] = useState("4");
  const [pdfQualityDpi, setPdfQualityDpi] = useState("200"); // 200 = faster, 300 = sharper
  const [isCapturingPrint, setIsCapturingPrint] = useState(false);
  const tagPreviewRefs = useRef({});
  const sheetPreviewRefs = useRef({});
  const qzRef = useRef(null);
  const [qzPrinters, setQzPrinters] = useState([]);
  const [selectedQzPrinter, setSelectedQzPrinter] = useState("");
  const [qzPrintType, setQzPrintType] = useState("image"); // image | html | zpl
  const [qzDpi, setQzDpi] = useState("203");
  const [isQzBusy, setIsQzBusy] = useState(false);
  const [qzStatus, setQzStatus] = useState("QZ Tray not connected.");
  const layoutImportRef = useRef(null);
  const autoLoadedServerLayoutRef = useRef(false);
  const [layoutSettingsTab, setLayoutSettingsTab] = useState("formats"); // formats | setup
  const [layoutName, setLayoutName] = useState(DEFAULT_LAYOUT_NAME);
  const [serverLayouts, setServerLayouts] = useState([]);
  const [selectedServerLayout, setSelectedServerLayout] = useState(DEFAULT_LAYOUT_NAME);
  const [layoutStatus, setLayoutStatus] = useState("Layout settings are not loaded yet.");
  const [isLayoutBusy, setIsLayoutBusy] = useState(false);
  const dragFieldRef = useRef(null);
  const dragCodeRef = useRef(null);
  const [fieldPositions, setFieldPositions] = useState(getDefaultFieldPositions);
  const [codeLayout, setCodeLayout] = useState(getDefaultCodeLayout);
  const [sectionPositions, setSectionPositions] = useState({
    brand: { x: 0, y: 0 },
    company: { x: 0, y: 0 },
    asset: { x: 0, y: 0 },
    fields: { x: 0, y: 0 },
    code: { x: 0, y: 0 },
  });

  const buildLayoutSettings = () => ({
    version: SETTINGS_FILE_VERSION,
    layoutName: sanitizeLayoutName(layoutName),
    savedAt: new Date().toISOString(),
    paperWidth,
    paperHeight,
    paperPreset,
    orientation,
    showBorder,
    displayFields,
    fieldPositions,
    codeLayout,
    printOutputMode,
    sheetPaperSize,
    sheetTagCount,
    sheetMarginMm,
    sheetGapMm,
    pdfQualityDpi,
    sectionPositions,
    qzPrintType,
    qzDpi,
    selectedQzPrinter,
  });

  const applyLayoutSettings = (settings = {}) => {
    if (!settings || typeof settings !== "object") return;

    setLayoutName(sanitizeLayoutName(settings.layoutName || layoutName));
    setSelectedServerLayout(sanitizeLayoutName(settings.layoutName || selectedServerLayout));
    setPaperWidth(String(settings.paperWidth || "90"));
    setPaperHeight(String(settings.paperHeight || "50"));
    setPaperPreset(settings.paperPreset || "Custom");
    setOrientation(settings.orientation || "landscape");
    setShowBorder(settings.showBorder !== false);
    setDisplayFields(Array.isArray(settings.displayFields) ? settings.displayFields : defaultDisplayFields);
    setFieldPositions(normalizeFieldPositions(settings.fieldPositions));
    setCodeLayout(normalizeCodeLayout(settings.codeLayout));
    setPrintOutputMode(settings.printOutputMode || "label");
    setSheetPaperSize(settings.sheetPaperSize || "letter");
    setSheetTagCount(String(settings.sheetTagCount || "4"));
    setSheetMarginMm(String(settings.sheetMarginMm ?? "8"));
    setSheetGapMm(String(settings.sheetGapMm ?? "4"));
    setPdfQualityDpi(String(settings.pdfQualityDpi || "200"));
    setSectionPositions(settings.sectionPositions || {
      brand: { x: 0, y: 0 },
      company: { x: 0, y: 0 },
      asset: { x: 0, y: 0 },
      fields: { x: 0, y: 0 },
      code: { x: 0, y: 0 },
    });
    setQzPrintType(settings.qzPrintType || "image");
    setQzDpi(String(settings.qzDpi || "203"));
    setSelectedQzPrinter(settings.selectedQzPrinter || "");
  };

  const handleSaveLayoutToBrowser = () => {
    const settings = buildLayoutSettings();
    localStorage.setItem("naysa:ppeg-tag-layout", JSON.stringify(settings));
    setLayoutStatus(`Layout "${settings.layoutName}" saved to this browser.`);
  };

  const handleLoadLayoutFromBrowser = () => {
    const settings = safeJsonParse(localStorage.getItem("naysa:ppeg-tag-layout"));

    if (!settings) {
      setLayoutStatus("No saved layout found in this browser.");
      return;
    }

    applyLayoutSettings(settings);
    setLayoutStatus(`Layout "${settings.layoutName || DEFAULT_LAYOUT_NAME}" loaded from this browser.`);
  };

  const handleDownloadLayoutFile = () => {
    const settings = buildLayoutSettings();
    const cleanName = sanitizeLayoutName(settings.layoutName).replace(/\s+/g, "_");
    downloadJsonFile(`ppe-tag-layout-${cleanName}.json`, settings);
    setLayoutStatus(`Layout "${settings.layoutName}" downloaded as JSON file.`);
  };

  const handleImportLayoutFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const text = await file.text();
      const settings = safeJsonParse(text);

      if (!settings || typeof settings !== "object") {
        throw new Error("Invalid PPE tag layout JSON file.");
      }

      applyLayoutSettings(settings);
      setLayoutStatus(`Layout "${settings.layoutName || DEFAULT_LAYOUT_NAME}" imported from file.`);
    } catch (error) {
      setLayoutStatus(error?.message || "Unable to import layout file.");
    }
  };

  const loadServerLayoutByName = async (name, { silent = false, setBusy = true } = {}) => {
    const cleanName = sanitizeLayoutName(name || DEFAULT_LAYOUT_NAME);

    if (!cleanName) return false;
    if (setBusy) setIsLayoutBusy(true);

    try {
      const response = await apiClient.get(`${TEMPLATE_LAYOUT_API}/${encodeURIComponent(cleanName)}`);
      const payload = response?.data || {};
      const settings = payload?.data?.settings || payload?.settings || payload?.data;

      if (!settings || typeof settings !== "object") {
        throw new Error("Server layout file has invalid settings content.");
      }

      applyLayoutSettings(settings);
      setSelectedServerLayout(cleanName);
      if (!silent) setLayoutStatus(`Layout "${cleanName}" loaded from server file.`);
      return true;
    } catch (error) {
      if (!silent) setLayoutStatus(error?.message || "Unable to load layout from server.");
      return false;
    } finally {
      if (setBusy) setIsLayoutBusy(false);
    }
  };

  const handleLoadServerLayouts = async ({ autoLoadFirst = false } = {}) => {
    setIsLayoutBusy(true);

    try {
      const response = await apiClient.get(TEMPLATE_LAYOUT_API);
      const payload = response?.data || {};
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      setServerLayouts(rows);

      if (rows.length > 0) {
        const firstLayoutName = rows[0].layoutName || DEFAULT_LAYOUT_NAME;
        setSelectedServerLayout((prev) => prev || firstLayoutName);

        if (autoLoadFirst && !autoLoadedServerLayoutRef.current) {
          autoLoadedServerLayoutRef.current = true;
          await loadServerLayoutByName(firstLayoutName, { silent: true, setBusy: false });
          setLayoutStatus(`Default layout "${firstLayoutName}" loaded automatically.`);
        } else {
          setLayoutStatus(`${rows.length} server layout(s) loaded.`);
        }
      } else {
        setLayoutStatus("No layout file found on server. Use Setup tab to save a new format.");
      }
    } catch (error) {
      setLayoutStatus(error?.message || "Unable to load server layouts.");
    } finally {
      setIsLayoutBusy(false);
    }
  };

  const handleSaveLayoutToServer = async () => {
    setIsLayoutBusy(true);

    try {
      const settings = buildLayoutSettings();
      await apiClient.post(TEMPLATE_LAYOUT_API, {
        layoutName: settings.layoutName,
        settings,
      });

      setSelectedServerLayout(settings.layoutName);
      setLayoutSettingsTab("formats");
      setLayoutStatus(`Layout "${settings.layoutName}" saved to server file.`);
      await handleLoadServerLayouts();
    } catch (error) {
      setLayoutStatus(error?.message || "Unable to save layout file to server.");
    } finally {
      setIsLayoutBusy(false);
    }
  };

  const handleLoadLayoutFromServer = async () => {
    const name = sanitizeLayoutName(selectedServerLayout || layoutName);
    await loadServerLayoutByName(name);
  };

  const handleResetLayoutSettings = () => {
    setPaperWidth("90");
    setPaperHeight("50");
    setPaperPreset("90mm x 50mm");
    setOrientation("landscape");
    setShowBorder(true);
    setDisplayFields(defaultDisplayFields);
    setFieldPositions(getDefaultFieldPositions());
    setCodeLayout(getDefaultCodeLayout());
    setPrintOutputMode("label");
    setSheetPaperSize("letter");
    setSheetTagCount("4");
    setSheetMarginMm("8");
    setSheetGapMm("4");
    setSectionPositions({
      brand: { x: 0, y: 0 },
      company: { x: 0, y: 0 },
      asset: { x: 0, y: 0 },
      fields: { x: 0, y: 0 },
      code: { x: 0, y: 0 },
    });
    setQzPrintType("image");
    setQzDpi("203");
    setLayoutStatus("Layout settings reset to default values.");
  };

  useEffect(() => {
    if (!isOpen) {
      autoLoadedServerLayoutRef.current = false;
      return;
    }

    handleLoadServerLayouts({ autoLoadFirst: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const tagInfos = useMemo(() => {
    const rows = normalizeTagRows({ serialRow, serialRows });

    return rows.map((row, index) => {
      const propertyTagNo = formatDisplayValue(row.assetTag, "System-Generated");
      const serialNo = formatDisplayValue(row.serialNo, "-");
      const assetDescription = formatDisplayValue(detailRow.assetDescription, "-");
      const category = formatDisplayValue(detailRow.categName || detailRow.assetCategory, "-");
      const subCategory = formatDisplayValue(detailRow.className || detailRow.assetSubCategory, "-");
      const location = formatDisplayValue(row.location || detailRow.location, "-");
      const assignedTo = formatDisplayValue(row.assignedTo || row.empName, "-");
      const department = formatDisplayValue(row.rcCode || detailRow.rcCode, "-");
      const acquiredOn = formatDisplayValue(documentInfo.documentDate, "-");
      const brandModel = formatDisplayValue(row.brandModel || detailRow.brandModel, "-");
      const acqCost = formatDisplayValue(row.acqCost || detailRow.acqCost, "-");
      const companyName = formatDisplayValue(
        companyInfo.companyName || companyInfo.compName || companyInfo.name,
        "NAYSA Financials"
      );
      const branchName = formatDisplayValue(documentInfo.branchName || documentInfo.branchCode, "-");

      return {
        rowKey: `${propertyTagNo}-${serialNo}-${index}`,
        propertyTagNo,
        serialNo,
        assetDescription,
        category,
        subCategory,
        location,
        assignedTo,
        department,
        acquiredOn,
        brandModel,
        acqCost,
        companyName,
        branchName,
      };
    });
  }, [companyInfo, detailRow, documentInfo, serialRow, serialRows]);

  if (!isOpen) return null;

  const isMultipleTags = tagInfos.length > 1;
  const visibleDisplayFields = displayFields.filter((field) => field.visible);
  const finalWidth = orientation === "landscape" ? paperWidth : paperHeight;
  const finalHeight = orientation === "landscape" ? paperHeight : paperWidth;
  const numericFinalWidth = Number(finalWidth) || 90;
  const numericFinalHeight = Number(finalHeight) || 50;
  const sheetPaper = getSheetPaperPreset(sheetPaperSize);
  const sheetLayout = getSheetTagCountOption(sheetTagCount);
  const numericSheetMarginMm = Math.max(0, Number(sheetMarginMm) || 0);
  const numericSheetGapMm = Math.max(0, Number(sheetGapMm) || 0);
  const sheetTagsPerPage = sheetLayout.columns * sheetLayout.rows;
  const sheetPreviewPages = [];

  for (let i = 0; i < tagInfos.length; i += sheetTagsPerPage) {
    sheetPreviewPages.push(tagInfos.slice(i, i + sheetTagsPerPage));
  }

  const scaleFactor = 1;
  const previewScale = isMultipleTags ? 3.25 : (numericFinalWidth >= 120 ? 3.25 : 5);
  const previewPixelWidth = numericFinalWidth * previewScale;
  const previewPixelHeight = numericFinalHeight * previewScale;
  const capturePixelWidth = numericFinalWidth * 6;
  const capturePixelHeight = numericFinalHeight * 6;

  const previewStyle = {
    width: `${previewPixelWidth}px`,
    minWidth: `${previewPixelWidth}px`,
    height: `${previewPixelHeight}px`,
    minHeight: `${previewPixelHeight}px`,
    maxWidth: "none",
    flex: "0 0 auto",
  };

  const sheetPreviewScale = isMaximized ? 1.9 : 1.35;
  const sheetPreviewPaperWidthPx = sheetPaper.width * sheetPreviewScale;
  const sheetPreviewPaperHeightPx = sheetPaper.height * sheetPreviewScale;
  const sheetPreviewMarginPx = numericSheetMarginMm * sheetPreviewScale;
  const sheetPreviewGapPx = numericSheetGapMm * sheetPreviewScale;
  const sheetPreviewCellWidthPx =
    (sheetPreviewPaperWidthPx - (sheetPreviewMarginPx * 2) - (sheetPreviewGapPx * (sheetLayout.columns - 1))) / sheetLayout.columns;
  const sheetPreviewCellHeightPx =
    (sheetPreviewPaperHeightPx - (sheetPreviewMarginPx * 2) - (sheetPreviewGapPx * (sheetLayout.rows - 1))) / sheetLayout.rows;
  const sheetPreviewTagFitScale = Math.max(0.05, Math.min(1, sheetPreviewCellWidthPx / previewPixelWidth, sheetPreviewCellHeightPx / previewPixelHeight));
  const PRINT_DPI = Math.max(150, Math.min(300, Number(pdfQualityDpi) || 200));
  const PRINT_PX_PER_MM = PRINT_DPI / 25.4;
  const HIGH_RES_TAG_CAPTURE_SCALE = PRINT_DPI >= 300 ? 2.75 : 2;

  const singleTagModalSizeClass = "max-w-[min(98vw,1320px)]";
  const modalSizeClass = isMultipleTags ? "max-w-[99vw]" : singleTagModalSizeClass;

  const modalClassName = isMaximized
    ? "h-[100dvh] w-screen rounded-none"
    : `max-h-[97vh] w-full ${modalSizeClass} overflow-hidden rounded-2xl`;
  const previewZoomFactor = Math.max(25, Math.min(300, Number(previewZoom) || 100)) / 100;
  const previewZoomWrapperStyle = {
    transform: `scale(${previewZoomFactor})`,
    transformOrigin: "top center",
  };

  const previewGridClass = isMultipleTags
    ? "grid grid-cols-1 justify-items-center gap-4 xl:grid-cols-2"
    : "flex h-full items-center justify-center";

  const getCodeMarkup = (tagInfo) => {
    const tagNoValue = tagInfo.propertyTagNo;
    const qrValue = tagNoValue;

    return {
      qrValue,
      tagNoValue,
      printQrMarkup: renderToStaticMarkup(
        <QRCode value={qrValue} size={112} bgColor="#ffffff" fgColor="#111827" level="M" />
      ),
      printBarcodeMarkup: renderToStaticMarkup(
        <Barcode
          value={tagNoValue}
          format="CODE128"
          height={38}
          width={1.45}
          margin={0}
          displayValue={false}
          background="#ffffff"
          lineColor="#111827"
        />
      ),
    };
  };

  const handlePaperPresetChange = (value) => {
    setPaperPreset(value);
    const preset = paperPresets.find((item) => item.label === value);

    if (preset?.width && preset?.height) {
      setPaperWidth(preset.width);
      setPaperHeight(preset.height);
    }
  };

  const handleFieldVisibleChange = (key, checked) => {
    setDisplayFields((prev) =>
      prev.map((field) => (field.key === key ? { ...field, visible: checked } : field))
    );
  };

  const moveDisplayField = (index, direction) => {
    setDisplayFields((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  };

  const updateSectionPosition = (sectionKey, axis, value) => {
    const cleanValue = value.replace(/[^0-9.-]/g, "");
    setSectionPositions((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [axis]: cleanValue,
      },
    }));
  };

  const resetSectionPositions = () => {
    setSectionPositions({
      brand: { x: 0, y: 0 },
      company: { x: 0, y: 0 },
      asset: { x: 0, y: 0 },
      fields: { x: 0, y: 0 },
      code: { x: 0, y: 0 },
    });
  };

  const resetFieldPositions = () => {
    setFieldPositions(getDefaultFieldPositions());
  };

  const getFieldPosition = (key) => fieldPositions[key] || { x: 0, y: 0 };

  const getFieldTransformStyle = (key, { draggable = false } = {}) => {
    const position = getFieldPosition(key);
    const hasOffset = Boolean(Number(position.x) || Number(position.y));

    return {
      transform: `translate(${Number(position.x) || 0}px, ${Number(position.y) || 0}px)`,
      position: "relative",
      zIndex: hasOffset ? 8 : 1,
      cursor: draggable ? "grab" : undefined,
      touchAction: draggable ? "none" : undefined,
      userSelect: draggable ? "none" : undefined,
    };
  };

  const updateFieldPosition = (fieldKey, axis, value) => {
    const cleanValue = String(value ?? "").replace(/[^0-9.-]/g, "");

    setFieldPositions((prev) => ({
      ...prev,
      [fieldKey]: {
        ...getFieldPosition(fieldKey),
        [axis]: cleanValue === "" || cleanValue === "-" ? cleanValue : Number(cleanValue) || 0,
      },
    }));
  };

  const handleFieldDragStart = (event, fieldKey) => {
    if (event.button !== undefined && event.button !== 0) return;

    const position = getFieldPosition(fieldKey);
    dragFieldRef.current = {
      fieldKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number(position.x) || 0,
      originY: Number(position.y) || 0,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleFieldDragMove = (event) => {
    const drag = dragFieldRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setFieldPositions((prev) => ({
      ...prev,
      [drag.fieldKey]: {
        x: Math.round(drag.originX + event.clientX - drag.startX),
        y: Math.round(drag.originY + event.clientY - drag.startY),
      },
    }));
  };

  const handleFieldDragEnd = (event) => {
    const drag = dragFieldRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragFieldRef.current = null;
  };


  const getCodeItem = (itemKey) => codeLayout[itemKey] || getDefaultCodeLayout()[itemKey];

  const getCodeItemStyle = (itemKey, { draggable = false } = {}) => {
    const item = getCodeItem(itemKey);
    return {
      position: "absolute",
      left: `${Number(item.x) || 0}px`,
      top: `${Number(item.y) || 0}px`,
      width: `${Math.max(24, Number(item.width) || 24)}px`,
      height: `${Math.max(18, Number(item.height) || 18)}px`,
      cursor: draggable ? "move" : undefined,
      touchAction: draggable ? "none" : undefined,
      userSelect: draggable ? "none" : undefined,
      zIndex: itemKey === "qr" ? 5 : 4,
    };
  };

  const updateCodeLayoutValue = (itemKey, field, value) => {
    const cleanValue = String(value ?? "").replace(/[^0-9.-]/g, "");

    setCodeLayout((prev) => {
      const current = prev[itemKey] || getDefaultCodeLayout()[itemKey];
      const parsed = cleanValue === "" || cleanValue === "-" ? cleanValue : Number(cleanValue) || 0;

      return {
        ...prev,
        [itemKey]: {
          ...current,
          [field]: ["width", "height"].includes(field) ? Math.max(1, Number(parsed) || 1) : parsed,
        },
      };
    });
  };

  const resetCodeLayout = () => {
    setCodeLayout(getDefaultCodeLayout());
  };

  const handleCodeDragStart = (event, itemKey) => {
    if (event.button !== undefined && event.button !== 0) return;

    const item = getCodeItem(itemKey);
    dragCodeRef.current = {
      itemKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: Number(item.x) || 0,
      originY: Number(item.y) || 0,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleCodeDragMove = (event) => {
    const drag = dragCodeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setCodeLayout((prev) => {
      const current = prev[drag.itemKey] || getDefaultCodeLayout()[drag.itemKey];

      if (drag.mode === "resize") {
        const nextWidth = Math.max(24, Math.round(drag.originWidth + event.clientX - drag.startX));
        const nextHeightRaw = Math.max(18, Math.round(drag.originHeight + event.clientY - drag.startY));

        if (drag.itemKey === "qr") {
          const nextSize = Math.max(32, Math.max(nextWidth, nextHeightRaw));
          return {
            ...prev,
            [drag.itemKey]: {
              ...current,
              width: nextSize,
              height: nextSize,
            },
          };
        }

        return {
          ...prev,
          [drag.itemKey]: {
            ...current,
            width: nextWidth,
            height: nextHeightRaw,
          },
        };
      }

      return {
        ...prev,
        [drag.itemKey]: {
          ...current,
          x: Math.round(drag.originX + event.clientX - drag.startX),
          y: Math.round(drag.originY + event.clientY - drag.startY),
        },
      };
    });
  };

  const handleCodeDragEnd = (event) => {
    const drag = dragCodeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragCodeRef.current = null;
  };

  const handleCodeResizeStart = (event, itemKey) => {
    if (event.button !== undefined && event.button !== 0) return;

    const item = getCodeItem(itemKey);
    dragCodeRef.current = {
      mode: "resize",
      itemKey,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: Number(item.width) || getDefaultCodeLayout()[itemKey].width,
      originHeight: Number(item.height) || getDefaultCodeLayout()[itemKey].height,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };

  const getPreviewFieldTransform = (fieldKey) => {
    const position = getFieldPosition(fieldKey);
    return `translate(${Number(position.x) || 0}px, ${Number(position.y) || 0}px)`;
  };

  const getSectionTransformStyle = (sectionKey) => {
    const position = sectionPositions[sectionKey] || { x: 0, y: 0 };
    return {
      transform: `translate(${Number(position.x) || 0}px, ${Number(position.y) || 0}px)`,
    };
  };

  const getPrintTransform = (sectionKey) => {
    const position = sectionPositions[sectionKey] || { x: 0, y: 0 };
    const x = Number(position.x) || 0;
    const y = Number(position.y) || 0;
    return `translate(${x * 0.264583}mm, ${y * 0.264583}mm)`;
  };

  const sectionPositionList = [
    { key: "brand", label: "Header / Brand" },
    { key: "company", label: "Company / Branch" },
    { key: "asset", label: "Asset Description" },
    { key: "fields", label: "Tag Information" },
    { key: "code", label: "QR / Barcode" },
  ];

  const getTagFieldsHtml = (tagInfo) =>
    visibleDisplayFields
      .map((field) => {
        const safeLabel = escapeHtml(field.label);
        const safeValue = escapeHtml(tagInfo[field.key]);
        const emphasisClass = field.emphasis ? "emphasis" : "";

        return `<div class="${emphasisClass}"><b>${safeLabel}</b><span>${safeValue}</span></div>`;
      })
      .join("");

  const getTagHtml = (tagInfo) => {
    const safeTagInfo = Object.fromEntries(Object.entries(tagInfo).map(([key, value]) => [key, escapeHtml(value)]));
    const { printQrMarkup, printBarcodeMarkup } = getCodeMarkup(tagInfo);

    return `
      <div class="ppe-tag ${showBorder ? "with-border" : ""}">
        <div class="tag-shell">
          <div class="tag-main">
            <div class="print-section brand-section">
              <div class="brand-row">
                <div class="brand">NAYSA</div>
                <div class="tag-title">PROPERTY TAG</div>
              </div>
            </div>
            <div class="print-section company-section">
              <div class="company-name">${safeTagInfo.companyName}</div>
              <div class="branch-name">${safeTagInfo.branchName}</div>
            </div>
            <div class="print-section asset-section">
              <div class="asset-name">${safeTagInfo.assetDescription}</div>
            </div>
            <div class="print-section fields-section">
              <div class="tag-fields">${getTagFieldsHtml(tagInfo)}</div>
            </div>
          </div>
          <div class="code-panel print-section code-section">
            <div class="qr-box">${printQrMarkup}</div>
            <div class="barcode-box">${printBarcodeMarkup}</div>
            <div class="barcode-text">${safeTagInfo.propertyTagNo}</div>
          </div>
        </div>
      </div>
    `;
  };

  const getPreviewPrintScale = () => {
    // The screen preview uses 6px per millimeter. Browser print uses 1px = 0.264583mm.
    // This scale lets the printed fast-layout use the same pixel layout as the modal preview.
    const pxPerMm = 6;
    const mmPerCssPx = 0.264583;
    return 1 / (pxPerMm * mmPerCssPx);
  };

  const getPreviewSectionTransform = (sectionKey) => {
    const position = sectionPositions[sectionKey] || { x: 0, y: 0 };
    const x = Number(position.x) || 0;
    const y = Number(position.y) || 0;
    return `translate(${x}px, ${y}px)`;
  };

  const getPreviewLikeTagHtml = (tagInfo) => {
    const safeTagInfo = Object.fromEntries(Object.entries(tagInfo).map(([key, value]) => [key, escapeHtml(value)]));
    const { printQrMarkup, printBarcodeMarkup } = getCodeMarkup(tagInfo);
    const previewWidthPx = numericFinalWidth * 6;
    const previewHeightPx = numericFinalHeight * 6;

    const fieldRows = visibleDisplayFields
      .map((field) => {
        const emphasisClass = field.emphasis ? "emphasis" : "";
        return `
          <div class="preview-field-row ${emphasisClass}" style="transform:${getPreviewFieldTransform(field.key)};position:relative;">
            <span class="preview-field-label">${escapeHtml(field.label)}</span>
            <span class="preview-field-value">${escapeHtml(tagInfo[field.key] || "-")}</span>
          </div>`;
      })
      .join("");

    return `
      <div class="preview-tag-box" style="width:${previewWidthPx}px;height:${previewHeightPx}px;">
        <div class="preview-tag-inner ${showBorder ? "with-border" : ""}">
          <div class="preview-shell">
            <div class="preview-main">
              <div class="preview-brand-row" style="transform:${getPreviewSectionTransform("brand")};">
                <div class="preview-brand" style="font-size:${28 * scaleFactor}px;">NAYSA</div>
                <div class="preview-title" style="font-size:${15 * scaleFactor}px;">PROPERTY TAG</div>
              </div>

              <div class="preview-company" style="transform:${getPreviewSectionTransform("company")};">
                <div class="preview-company-name" style="font-size:${14 * scaleFactor}px;">${safeTagInfo.companyName}</div>
                <div class="preview-branch-name" style="font-size:${12 * scaleFactor}px;">${safeTagInfo.branchName}</div>
              </div>

              <div class="preview-asset-name" style="transform:${getPreviewSectionTransform("asset")};font-size:${15 * scaleFactor}px;">
                ${safeTagInfo.assetDescription}
              </div>

              <div class="preview-fields" style="transform:${getPreviewSectionTransform("fields")};font-size:${12 * scaleFactor}px;">
                ${fieldRows}
              </div>
            </div>

            <div class="preview-code" style="transform:${getPreviewSectionTransform("code")};">
              <div class="preview-qr-box" style="left:${Number(getCodeItem("qr").x) || 0}px;top:${Number(getCodeItem("qr").y) || 0}px;width:${Math.max(24, Number(getCodeItem("qr").width) || 144)}px;height:${Math.max(24, Number(getCodeItem("qr").height) || 144)}px;">
                ${printQrMarkup}
              </div>
              <div class="preview-barcode-box" style="left:${Number(getCodeItem("barcode").x) || 0}px;top:${Number(getCodeItem("barcode").y) || 0}px;width:${Math.max(24, Number(getCodeItem("barcode").width) || 168)}px;height:${Math.max(18, Number(getCodeItem("barcode").height) || 51)}px;">
                ${printBarcodeMarkup}
              </div>
              <div class="preview-barcode-text" style="left:${Number(getCodeItem("barcode").x) || 0}px;top:${(Number(getCodeItem("barcode").y) || 0) + Math.max(18, Number(getCodeItem("barcode").height) || 51) + 4}px;width:${Math.max(24, Number(getCodeItem("barcode").width) || 168)}px;">${safeTagInfo.propertyTagNo}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const getPreviewPrintCss = () => {
    const previewWidthPx = numericFinalWidth * 6;
    const previewHeightPx = numericFinalHeight * 6;
    const fitScale = getPreviewPrintScale();

    return `
      @page { size: ${numericFinalWidth}mm ${numericFinalHeight}mm; margin: 0; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #ffffff; }
            .print-page {
        width: ${numericFinalWidth}mm;
        height: ${numericFinalHeight}mm;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #ffffff;
        position: relative;
      }
      body.per-page .print-page { page-break-after: always; break-after: page; }
      body.per-page .print-page:last-child { page-break-after: auto; break-after: auto; }
            .print-fit {
        width: ${previewWidthPx}px;
        height: ${previewHeightPx}px;
        transform: scale(${fitScale});
        transform-origin: left top;
      }
      .preview-tag-box {
        background: #ffffff;
        box-shadow: none;
        font-family: Aptos, Arial, sans-serif;
        color: #0f172a;
        overflow: hidden;
      }
      .preview-tag-inner {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #ffffff;
        padding: 18px;
        color: #0f172a;
      }
      .preview-tag-inner.with-border {
        border: 2px solid #1f2937;
        border-radius: 8px;
      }
      .preview-shell {
        height: 100%;
        display: grid;
        grid-template-columns: 1fr 174px;
        gap: 18px;
      }
      .preview-main {
        min-width: 0;
        padding-right: 15px;
      }
      .preview-brand-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 2px solid #1d4ed8;
        padding-bottom: 8px;
      }
      .preview-brand {
        font-weight: 900;
        line-height: 1;
        color: #1d4ed8;
      }
      .preview-title {
        white-space: nowrap;
        font-weight: 900;
        line-height: 1;
        color: #0f172a;
      }
      .preview-company { margin-top: 8px; }
      .preview-company-name {
        overflow: visible;
        text-overflow: unset;
        white-space: nowrap;
        font-weight: 800;
        line-height: 1.12;
        color: #0f172a;
      }
      .preview-branch-name {
        overflow: visible;
        text-overflow: unset;
        white-space: nowrap;
        line-height: 1.12;
        color: #475569;
      }
      .preview-asset-name {
        margin: 12px 0;
        min-height: 38px;
        overflow: visible;
        font-weight: 800;
        line-height: 1.16;
        color: #0f172a;
      }
      .preview-fields {
        display: flex;
        flex-direction: column;
        gap: 4px;
        line-height: 1.12;
      }
      .preview-field-row {
        display: inline-grid;
        grid-template-columns: 86px max-content;
        gap: 8px;
        align-items: baseline;
        min-width: max-content;
      }
      .preview-field-label {
        font-weight: 800;
        color: #334155;
        white-space: nowrap;
      }
      .preview-field-value {
        min-width: max-content;
        overflow: visible;
        text-overflow: unset;
        white-space: nowrap;
        font-weight: 700;
        color: #0f172a;
      }
      .preview-field-row.emphasis .preview-field-value {
        color: #b91c1c;
        font-size: ${14 * scaleFactor}px;
        font-weight: 900;
      }
      .preview-code {
        min-width: 0;
        position: relative;
        height: 100%;
      }
      .preview-qr-box {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #111827;
        background: #ffffff;
        padding: 6px;
      }
      .preview-qr-box svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .preview-barcode-box {
        position: absolute;
        overflow: hidden;
        background: #ffffff;
      }
      .preview-barcode-box svg {
        display: block;
        width: 100%;
        height: 100%;
      }
      .preview-barcode-text {
        position: absolute;
        overflow: visible;
        text-overflow: unset;
        white-space: nowrap;
        text-align: center;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        color: #0f172a;
      }
    `;
  };

  const printTagWithCss = () => {
    if (tagInfos.length === 0) return;

    const printWindow = window.open("", "_blank", "width=600,height=500");
    if (!printWindow) return;

    const tagTitle = isMultipleTags
      ? `Property Tags - ${tagInfos.length} Tags`
      : `Property Tag - ${tagInfos[0]?.propertyTagNo || ""}`;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(tagTitle)}</title>
          <style>${getPreviewPrintCss()}</style>
        </head>
        <body class="per-page">
          ${tagInfos.map((tagInfo) => `<div class="print-page"><div class="print-fit">${getPreviewLikeTagHtml(tagInfo)}</div></div>`).join("")}
          <script>
            window.onload = function () {
              setTimeout(function () {
                window.focus();
                window.print();
              }, 180);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  const loadImage = (imageUrl) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageUrl;
    });

  const capturePreviewTag = async (tagInfo) => {
    const element = tagPreviewRefs.current[tagInfo.rowKey];

    if (!element) {
      throw new Error("PPE tag preview content was not found.");
    }

    await document.fonts?.ready;
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));

    // Capture the actual tag design at high resolution.
    // Do not stretch the clone to paper pixels here because that changes the layout.
    // Instead, keep the current preview proportions and increase html2canvas scale.
    // Sheet printing will place this sharp tag image into the correct sheet cell.
    const rect = element.getBoundingClientRect();
    const captureWidth = Math.ceil(Math.max(element.scrollWidth, rect.width));
    const captureHeight = Math.ceil(Math.max(element.scrollHeight, rect.height));

    const captureHost = document.createElement("div");
    captureHost.style.position = "fixed";
    captureHost.style.left = "-100000px";
    captureHost.style.top = "0";
    captureHost.style.width = `${captureWidth}px`;
    captureHost.style.height = `${captureHeight}px`;
    captureHost.style.overflow = "hidden";
    captureHost.style.background = "#ffffff";
    captureHost.style.zIndex = "-1";

    const clone = element.cloneNode(true);
    clone.style.width = `${captureWidth}px`;
    clone.style.minWidth = `${captureWidth}px`;
    clone.style.maxWidth = "none";
    clone.style.height = `${captureHeight}px`;
    clone.style.minHeight = `${captureHeight}px`;
    clone.style.flex = "0 0 auto";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";
    clone.style.overflow = "hidden";
    clone.style.backgroundColor = "#ffffff";

    clone.querySelectorAll(".ppe-edit-control").forEach((element) => element.remove());

    captureHost.appendChild(clone);
    document.body.appendChild(captureHost);

    try {
      const canvas = await html2canvas(clone, {
        onclone: (clonedDocument) => {
          clonedDocument.querySelectorAll(".ppe-edit-control").forEach((element) => element.remove());
        },
        scale: HIGH_RES_TAG_CAPTURE_SCALE,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        removeContainer: true,
        logging: false,
        width: captureWidth,
        height: captureHeight,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        scrollX: 0,
        scrollY: 0,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("PPE tag preview capture is empty.");
      }

      return canvas.toDataURL("image/png");
    } finally {
      document.body.removeChild(captureHost);
    }
  };

  const composeHighResolutionSheetPage = async (page, pageIndex) => {
    const sheetPixelWidth = Math.round(sheetPaper.width * PRINT_PX_PER_MM);
    const sheetPixelHeight = Math.round(sheetPaper.height * PRINT_PX_PER_MM);
    const marginPx = Math.round(numericSheetMarginMm * PRINT_PX_PER_MM);
    const gapPx = Math.round(numericSheetGapMm * PRINT_PX_PER_MM);
    const cellWidthPx = Math.floor((sheetPixelWidth - (marginPx * 2) - (gapPx * (sheetLayout.columns - 1))) / sheetLayout.columns);
    const cellHeightPx = Math.floor((sheetPixelHeight - (marginPx * 2) - (gapPx * (sheetLayout.rows - 1))) / sheetLayout.rows);
    const totalCells = sheetLayout.columns * sheetLayout.rows;
    const paddedPage = [
      ...page,
      ...Array.from({ length: Math.max(0, totalCells - page.length) }, (_, index) => ({
        rowKey: `empty-print-${pageIndex}-${index}`,
        isEmpty: true,
      })),
    ];

    const canvas = document.createElement("canvas");
    canvas.width = sheetPixelWidth;
    canvas.height = sheetPixelHeight;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sheetPixelWidth, sheetPixelHeight);

    ctx.save();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = Math.max(1, Math.round(0.25 * PRINT_PX_PER_MM));
    ctx.setLineDash([Math.max(4, Math.round(1.4 * PRINT_PX_PER_MM)), Math.max(3, Math.round(1.0 * PRINT_PX_PER_MM))]);

    for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
      const col = cellIndex % sheetLayout.columns;
      const row = Math.floor(cellIndex / sheetLayout.columns);
      const x = marginPx + (col * (cellWidthPx + gapPx));
      const y = marginPx + (row * (cellHeightPx + gapPx));
      ctx.strokeRect(x, y, cellWidthPx, cellHeightPx);
    }
    ctx.restore();

    for (let cellIndex = 0; cellIndex < paddedPage.length; cellIndex += 1) {
      const tagInfo = paddedPage[cellIndex];
      if (tagInfo.isEmpty) continue;

      const col = cellIndex % sheetLayout.columns;
      const row = Math.floor(cellIndex / sheetLayout.columns);
      const x = marginPx + (col * (cellWidthPx + gapPx));
      const y = marginPx + (row * (cellHeightPx + gapPx));

      const tagImageUrl = await capturePreviewTag(tagInfo);
      const tagImage = await loadImage(tagImageUrl);
      const imageRatio = tagImage.width / tagImage.height;
      const cellRatio = cellWidthPx / cellHeightPx;
      let drawWidth = cellWidthPx;
      let drawHeight = cellHeightPx;

      if (imageRatio > cellRatio) {
        drawWidth = cellWidthPx;
        drawHeight = Math.round(cellWidthPx / imageRatio);
      } else {
        drawHeight = cellHeightPx;
        drawWidth = Math.round(cellHeightPx * imageRatio);
      }

      const drawX = x + Math.round((cellWidthPx - drawWidth) / 2);
      const drawY = y + Math.round((cellHeightPx - drawHeight) / 2);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(tagImage, drawX, drawY, drawWidth, drawHeight);
    }

    return canvas.toDataURL("image/png");
  };

  const captureSheetPreviewPage = async (pageIndex) => {
    const page = sheetPreviewPages[pageIndex] || [];

    if (!Array.isArray(page)) {
      throw new Error("PPE tag sheet page was not found.");
    }

    return composeHighResolutionSheetPage(page, pageIndex);
  };

  const printTag = async () => {
    if (tagInfos.length === 0 || isCapturingPrint) return;

    // Always use Preview Match / Image Capture so the printout follows the current preview.
    // Open the print window immediately while still inside the click event.
    const printWindow = window.open("", "_blank", "width=700,height=600");
    if (!printWindow) {
      window.alert("Print window was blocked. Please allow popups for this site.");
      return;
    }

    const tagTitle = isMultipleTags
      ? `Property Tags - ${tagInfos.length} Tags`
      : `Property Tag - ${tagInfos[0]?.propertyTagNo || ""}`;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(tagTitle)}</title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              font-family: Aptos, Arial, sans-serif;
              background: #ffffff;
              color: #1e293b;
            }
            .loading {
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="loading">Preparing high-resolution PPE tag print preview...</div>
        </body>
      </html>
    `);
    printWindow.document.close();

    setIsCapturingPrint(true);

    try {
      const capturedTags = [];
      const capturedSheetPages = [];

      if (printOutputMode === "sheet") {
        for (let pageIndex = 0; pageIndex < sheetPreviewPages.length; pageIndex += 1) {
          capturedSheetPages.push({
            title: `Sheet ${pageIndex + 1}`,
            imageUrl: await captureSheetPreviewPage(pageIndex),
          });
        }
      } else {
        for (const tagInfo of tagInfos) {
          capturedTags.push({
            title: tagInfo.propertyTagNo,
            imageUrl: await capturePreviewTag(tagInfo),
          });
        }
      }

      const renderLabelPrintHtml = () => `
        <!doctype html>
        <html>
          <head>
            <title>${escapeHtml(tagTitle)}</title>
            <style>
              @page { size: ${numericFinalWidth}mm ${numericFinalHeight}mm; margin: 0; }
              * { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; background: #ffffff; }
                            .print-page {
                width: ${numericFinalWidth}mm;
                height: ${numericFinalHeight}mm;
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                background: #ffffff;
              }
              body.per-page .print-page { page-break-after: always; break-after: page; }
              body.per-page .print-page:last-child { page-break-after: auto; break-after: auto; }
                            .tag-image { width: ${numericFinalWidth}mm; height: ${numericFinalHeight}mm; display: block; object-fit: fill; margin: 0; padding: 0; }
            </style>
          </head>
          <body class="per-page">
            ${capturedTags.map((item) => `<div class="print-page"><img class="tag-image" src="${item.imageUrl}" alt="${escapeHtml(item.title)}" /></div>`).join("")}
            <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},150);};</script>
          </body>
        </html>
      `;

      const renderSheetPrintHtml = () => `
        <!doctype html>
        <html>
          <head>
            <title>${escapeHtml(tagTitle)}</title>
            <style>
              @page { size: ${sheetPaper.width}mm ${sheetPaper.height}mm; margin: 0; }
              * { box-sizing: border-box; }
              html, body { margin: 0; padding: 0; background: #ffffff; }
              .sheet-page {
                width: ${sheetPaper.width}mm;
                height: ${sheetPaper.height}mm;
                margin: 0;
                padding: 0;
                display: flex;
                align-items: stretch;
                justify-content: stretch;
                overflow: hidden;
                break-after: page;
                page-break-after: always;
                background: #ffffff;
              }
              .sheet-page:last-child { break-after: auto; page-break-after: auto; }
              .sheet-page-image { width: 100%; height: 100%; display: block; object-fit: fill; margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            ${capturedSheetPages.map((item) => `<div class="sheet-page"><img class="sheet-page-image" src="${item.imageUrl}" alt="${escapeHtml(item.title)}" /></div>`).join("")}
            <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},150);};</script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(printOutputMode === "sheet" ? renderSheetPrintHtml() : renderLabelPrintHtml());
      printWindow.document.close();
    } catch (error) {
      console.error("PPE tag exact preview print failed:", error);
      printWindow.document.open();
      printWindow.document.write(`
        <!doctype html>
        <html>
          <body style="font-family:Aptos, Arial, sans-serif;padding:20px;color:#b91c1c;">
            <b>PPE tag print failed.</b><br />
            Please try again.
          </body>
        </html>
      `);
      printWindow.document.close();
    } finally {
      setIsCapturingPrint(false);
    }
  };


  const handleDownloadPdf = async () => {
    if (tagInfos.length === 0 || isCapturingPrint) return;

    setIsCapturingPrint(true);

    try {
      const jsPdfModule = await import("jspdf");
      const JsPDF = jsPdfModule.jsPDF || jsPdfModule.default;

      if (!JsPDF) {
        throw new Error("jsPDF library was not found. Please install it using npm install jspdf.");
      }

      const now = new Date();
      const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

      if (printOutputMode === "sheet") {
        const pdf = new JsPDF({
          orientation: sheetPaper.width > sheetPaper.height ? "landscape" : "portrait",
          unit: "mm",
          format: [sheetPaper.width, sheetPaper.height],
          compress: true,
        });

        for (let pageIndex = 0; pageIndex < sheetPreviewPages.length; pageIndex += 1) {
          if (pageIndex > 0) {
            pdf.addPage([sheetPaper.width, sheetPaper.height], sheetPaper.width > sheetPaper.height ? "landscape" : "portrait");
          }

          const imageUrl = await captureSheetPreviewPage(pageIndex);
          pdf.addImage(imageUrl, "PNG", 0, 0, sheetPaper.width, sheetPaper.height, undefined, "FAST");
        }

        pdf.save(`PPE-Tags-Sheet-${sheetLayout.value || sheetTagCount}-${stamp}.pdf`);
        return;
      }

      const pdf = new JsPDF({
        orientation: numericFinalWidth > numericFinalHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [numericFinalWidth, numericFinalHeight],
        compress: true,
      });

      for (let index = 0; index < tagInfos.length; index += 1) {
        if (index > 0) {
          pdf.addPage([numericFinalWidth, numericFinalHeight], numericFinalWidth > numericFinalHeight ? "landscape" : "portrait");
        }

        const imageUrl = await capturePreviewTag(tagInfos[index]);
        pdf.addImage(imageUrl, "PNG", 0, 0, numericFinalWidth, numericFinalHeight, undefined, "FAST");
      }

      pdf.save(`PPE-Tags-${stamp}.pdf`);
    } catch (error) {
      console.error("PPE tag PDF download failed:", error);
      window.alert(error?.message || "Unable to download PPE tag PDF.");
    } finally {
      setIsCapturingPrint(false);
    }
  };


  const getQzTray = async () => {
    if (qzRef.current) return qzRef.current;

    const module = await import("qz-tray");
    const qz = module.default || module;

    if (qz?.api?.setPromiseType) {
      qz.api.setPromiseType((resolver) => new Promise(resolver));
    }

    qzRef.current = qz;
    return qz;
  };

  const connectQzTray = async () => {
    const qz = await getQzTray();

    if (qz.websocket.isActive()) {
      setQzStatus("QZ Tray already connected.");
      return qz;
    }

    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";

    try {
      // IMPORTANT:
      // host must NOT include the port. QZ Tray appends the port internally.
      // Correct: host: "127.0.0.1" + port: { insecure: [8182] }
      // Wrong:   host: "127.0.0.1:8182" because it becomes ws://127.0.0.1:8182:8182
      await qz.websocket.connect({
        host: isSecure
          ? ["localhost.qz.io", "localhost", "127.0.0.1"]
          : ["127.0.0.1", "localhost", "localhost.qz.io"],
        port: {
          secure: [8181, 8282, 8383, 8484],
          insecure: [8182, 8283, 8384, 8485],
        },
        usingSecure: isSecure,
        retries: 2,
        delay: 1,
      });

      setQzStatus("QZ Tray connected.");
      return qz;
    } catch (error) {
      setQzStatus("Unable to connect to QZ Tray. Make sure QZ Tray is running near the Windows clock.");
      throw error;
    }
  };


  const handleLoadQzPrinters = async () => {
    setIsQzBusy(true);

    try {
      const qz = await connectQzTray();
      const printers = await qz.printers.find();
      const printerList = Array.isArray(printers) ? printers : [printers].filter(Boolean);

      setQzPrinters(printerList);
      setSelectedQzPrinter((prev) => prev || printerList[0] || "");
      setQzStatus(printerList.length > 0 ? `${printerList.length} printer(s) loaded.` : "No printer found.");
    } catch (error) {
      setQzStatus(`QZ Tray is not running or is not listening on ${getQzEndpointLabel()}.`);
      console.warn("QZ Tray connection failed:", error?.message || error);
    } finally {
      setIsQzBusy(false);
    }
  };

  const buildQzConfig = (qz) =>
    qz.configs.create(selectedQzPrinter, {
      units: "mm",
      size: {
        width: numericFinalWidth,
        height: numericFinalHeight,
      },
      margins: 0,
      orientation,
      scaleContent: false,
      rasterize: false,
    });

  const buildPrintableHtml = () => {
    const tagTitle = isMultipleTags
      ? `Property Tags - ${tagInfos.length} Tags`
      : `Property Tag - ${tagInfos[0]?.propertyTagNo || ""}`;

    return `
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(tagTitle)}</title>
          <style>
            @page { size: ${numericFinalWidth}mm ${numericFinalHeight}mm; margin: 0; }
            * { box-sizing: border-box; }
            :root { --tag-scale: ${scaleFactor}; }
            html, body { margin: 0; padding: 0; font-family: Aptos, Arial, sans-serif; color: #111827; background: #fff; }
                        .print-page { width: ${numericFinalWidth}mm; height: ${numericFinalHeight}mm; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            body.per-page .print-page { page-break-after: always; break-after: page; }
            body.per-page .print-page:last-child { page-break-after: auto; break-after: auto; }
                        .ppe-tag { width: ${numericFinalWidth}mm; height: ${numericFinalHeight}mm; padding: 3mm; overflow: hidden; background: #fff; }
            .ppe-tag.with-border { border: 0.35mm solid #111827; border-radius: 1.8mm; }
            .tag-shell { height: 100%; display: grid; grid-template-columns: 1fr 29mm; gap: 3mm; align-items: stretch; }
            .tag-main { min-width: 0; padding-right: 2.5mm; }
            .print-section { position: relative; }
            .brand-section { transform: ${getPrintTransform("brand")}; }
            .company-section { transform: ${getPrintTransform("company")}; }
            .asset-section { transform: ${getPrintTransform("asset")}; }
            .fields-section { transform: ${getPrintTransform("fields")}; }
            .code-section { transform: ${getPrintTransform("code")}; }
            .brand-row { display: flex; align-items: baseline; justify-content: space-between; gap: 2mm; border-bottom: 0.35mm solid #1d4ed8; padding-bottom: 1mm; }
            .brand { font-size: ${14 * scaleFactor}pt; font-weight: 900; color: #1d4ed8; letter-spacing: 0; line-height: 1; }
            .tag-title { font-size: ${7.5 * scaleFactor}pt; font-weight: 900; color: #111827; line-height: 1; white-space: nowrap; }
            .company-name { margin-top: 1.4mm; font-size: ${7.2 * scaleFactor}pt; font-weight: 800; line-height: 1.08; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .branch-name { margin-top: 0.4mm; font-size: ${6 * scaleFactor}pt; color: #475569; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .asset-name { margin: 1.7mm 0 1.5mm; min-height: 6.2mm; font-size: ${7.2 * scaleFactor}pt; font-weight: 800; line-height: 1.12; overflow: hidden; }
            .tag-fields { font-size: ${5.8 * scaleFactor}pt; line-height: 1.22; }
            .tag-fields div { display: inline-grid; grid-template-columns: 14.5mm max-content; gap: 1.4mm; align-items: baseline; min-width: max-content; }
            .tag-fields b { font-weight: 800; color: #334155; white-space: nowrap; }
            .tag-fields span { min-width: max-content; overflow: visible; text-overflow: unset; white-space: nowrap; font-weight: 700; }
            .tag-fields div.emphasis span { color: #b91c1c; font-size: ${7 * scaleFactor}pt; font-weight: 900; }
            .code-panel { display: flex; min-width: 0; flex-direction: column; align-items: center; justify-content: flex-start; }
            .qr-box { width: 24mm; height: 24mm; padding: 1mm; border: 0.3mm solid #111827; background: #fff; }
            .qr-box svg { display: block; width: 100%; height: 100%; }
            .barcode-box { width: 28mm; height: 8.5mm; margin-top: 2mm; overflow: hidden; background: #fff; }
            .barcode-box svg { display: block; width: 100%; height: 100%; }
            .barcode-text { width: 28mm; margin-top: 0.7mm; text-align: center; font-size: ${5.6 * scaleFactor}pt; font-weight: 900; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          </style>
        </head>
        <body class="per-page">
          ${tagInfos.map((tagInfo) => `<div class="print-page">${getTagHtml(tagInfo)}</div>`).join("")}
        </body>
      </html>
    `;
  };

  const zplSafe = (value) =>
    String(value ?? "")
      .replace(/[\^~]/g, " ")
      .replace(/[\r\n]+/g, " ")
      .trim();

  const mmToDots = (mm, dpiValue = qzDpi) => Math.round((Number(mm) || 0) * (Number(dpiValue) || 203) / 25.4);

  const buildZplTag = (tagInfo) => {
    const dpi = Number(qzDpi) || 203;
    const widthDots = mmToDots(numericFinalWidth, dpi);
    const heightDots = mmToDots(numericFinalHeight, dpi);
    const scale = Math.max(0.6, Math.min(1.4, scaleFactor));
    const x = mmToDots(3, dpi);
    const y = mmToDots(3, dpi);
    const qrX = widthDots - mmToDots(30, dpi);
    const qrY = mmToDots(5, dpi);
    const barcodeY = heightDots - mmToDots(14, dpi);
    const fields = visibleDisplayFields
      .slice(0, 6)
      .map((field, index) => {
        const yy = y + mmToDots(22 + index * 4.4, dpi);
        const label = zplSafe(field.label).slice(0, 15);
        const value = zplSafe(tagInfo[field.key]).slice(0, 32);
        return `^FO${x},${yy}^A0N,${Math.round(18 * scale)},${Math.round(16 * scale)}^FD${label}: ${value}^FS`;
      })
      .join("\n");

    return `
^XA
^PW${widthDots}
^LL${heightDots}
^CI28
^FO${x},${y}^A0N,${Math.round(30 * scale)},${Math.round(28 * scale)}^FDNAYSA^FS
^FO${x + mmToDots(28, dpi)},${y + mmToDots(1, dpi)}^A0N,${Math.round(20 * scale)},${Math.round(18 * scale)}^FDPROPERTY TAG^FS
^FO${x},${y + mmToDots(7, dpi)}^GB${widthDots - mmToDots(36, dpi)},2,2^FS
^FO${x},${y + mmToDots(10, dpi)}^A0N,${Math.round(17 * scale)},${Math.round(16 * scale)}^FD${zplSafe(tagInfo.companyName).slice(0, 40)}^FS
^FO${x},${y + mmToDots(15, dpi)}^A0N,${Math.round(16 * scale)},${Math.round(15 * scale)}^FD${zplSafe(tagInfo.assetDescription).slice(0, 42)}^FS
${fields}
^FO${qrX},${qrY}^BQN,2,4^FDQA,${zplSafe(tagInfo.propertyTagNo)}^FS
^FO${qrX - mmToDots(2, dpi)},${barcodeY}^BY2,2,${Math.round(42 * scale)}^BCN,${Math.round(42 * scale)},N,N,N^FD${zplSafe(tagInfo.propertyTagNo)}^FS
^FO${qrX - mmToDots(2, dpi)},${heightDots - mmToDots(5, dpi)}^A0N,${Math.round(15 * scale)},${Math.round(14 * scale)}^FD${zplSafe(tagInfo.propertyTagNo).slice(0, 24)}^FS
^XZ
`;
  };

  const handleQzPrint = async () => {
    if (!selectedQzPrinter) {
      window.alert("Please load QZ printers and select a printer first.");
      return;
    }

    if (tagInfos.length === 0 || isQzBusy) return;

    setIsQzBusy(true);

    try {
      const qz = await connectQzTray();
      const config = buildQzConfig(qz);
      let data = [];

      if (qzPrintType === "zpl") {
        data = [
          {
            type: "raw",
            format: "command",
            flavor: "plain",
            data: tagInfos.map((tagInfo) => buildZplTag(tagInfo)).join("\n"),
          },
        ];
      } else if (qzPrintType === "html") {
        data = [
          {
            type: "pixel",
            format: "html",
            flavor: "plain",
            data: buildPrintableHtml(),
          },
        ];
      } else {
        const capturedTags = [];

        for (const tagInfo of tagInfos) {
          const imageUrl = await capturePreviewTag(tagInfo);
          capturedTags.push(imageUrl.replace(/^data:image\/png;base64,/, ""));
        }

        data = capturedTags.map((imageBase64) => ({
          type: "pixel",
          format: "image",
          flavor: "base64",
          data: imageBase64,
        }));
      }

      await qz.print(config, data);
      setQzStatus(`Print job sent to ${selectedQzPrinter}.`);
    } catch (error) {
      console.error("QZ print failed:", error);
      setQzStatus("QZ print failed. Check QZ Tray, printer name, and printer driver.");
      window.alert(error?.message || "Unable to print using QZ Tray.");
    } finally {
      setIsQzBusy(false);
    }
  };

  const renderDisplayField = (tagInfo, field) => (
    <div
      key={field.key}
      className={`inline-grid grid-cols-[86px_max-content] gap-2 rounded px-1 py-0.5 ${
        isEditMode ? "cursor-grab ring-blue-300 hover:bg-blue-50/80 hover:ring-2 active:cursor-grabbing" : ""
      }`}
      style={getFieldTransformStyle(field.key, { draggable: isEditMode })}
      onPointerDown={isEditMode ? (event) => handleFieldDragStart(event, field.key) : undefined}
      onPointerMove={isEditMode ? handleFieldDragMove : undefined}
      onPointerUp={isEditMode ? handleFieldDragEnd : undefined}
      onPointerCancel={isEditMode ? handleFieldDragEnd : undefined}
      title={isEditMode ? "Drag this field to adjust its print position" : "Switch to Edit Mode to move this field"}
    >
      <span className="font-extrabold text-slate-700">{field.label}</span>
      <span
        className={`${field.emphasis ? "font-black text-red-700" : "font-bold"} whitespace-nowrap overflow-visible`}
        style={field.emphasis ? { fontSize: `${14 * scaleFactor}px` } : undefined}
      >
        {tagInfo[field.key] || "-"}
      </span>
    </div>
  );

  const renderPreviewTag = (tagInfo) => {
    const { qrValue, tagNoValue } = getCodeMarkup(tagInfo);

    return (
      <div
        key={tagInfo.rowKey}
        ref={(element) => {
          if (element) tagPreviewRefs.current[tagInfo.rowKey] = element;
          else delete tagPreviewRefs.current[tagInfo.rowKey];
        }}
        className="bg-white shadow-lg"
        style={previewStyle}
      >
        <div className={`relative h-full w-full overflow-hidden bg-white p-[18px] text-slate-900 ${showBorder ? "rounded-lg border-2 border-slate-800" : ""}`}>
          {isEditMode && (
            <div
              className="ppe-edit-control pointer-events-none absolute inset-0 z-20"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(37, 99, 235, 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.18) 1px, transparent 1px), linear-gradient(to right, rgba(37, 99, 235, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.35) 1px, transparent 1px)",
                backgroundSize: "10px 10px, 10px 10px, 50px 50px, 50px 50px",
              }}
            />
          )}
          <div className="relative z-10 grid h-full grid-cols-[1fr_174px] gap-[18px]">
            <div className="min-w-0 pr-[15px]">
              <div style={getSectionTransformStyle("brand")} className="flex items-baseline justify-between gap-3 border-b-2 border-blue-700 pb-2">
                <div className="font-black leading-none text-blue-700" style={{ fontSize: `${28 * scaleFactor}px` }}>NAYSA</div>
                <div className="whitespace-nowrap font-black leading-none" style={{ fontSize: `${15 * scaleFactor}px` }}>PROPERTY TAG</div>
              </div>

              <div style={getSectionTransformStyle("company")}>
                <div className="mt-2 whitespace-nowrap font-extrabold leading-tight" style={{ fontSize: `${14 * scaleFactor}px` }}>{tagInfo.companyName}</div>
                <div className="whitespace-nowrap leading-tight text-slate-600" style={{ fontSize: `${12 * scaleFactor}px` }}>{tagInfo.branchName}</div>
              </div>
              <div className="my-3 min-h-[38px] whitespace-normal font-extrabold leading-tight" style={{ ...getSectionTransformStyle("asset"), fontSize: `${15 * scaleFactor}px` }}>
                {tagInfo.assetDescription}
              </div>

              <div className="space-y-1 leading-tight" style={{ ...getSectionTransformStyle("fields"), fontSize: `${12 * scaleFactor}px` }}>
                {visibleDisplayFields.map((field) => renderDisplayField(tagInfo, field))}
              </div>
            </div>

            <div className="relative min-w-0" style={{ ...getSectionTransformStyle("code"), height: "100%" }}>
              <div
                className={`relative flex items-center justify-center border-2 border-slate-900 bg-white p-[6px] ring-blue-300 ${
                  isEditMode ? "hover:ring-2" : ""
                }`}
                style={getCodeItemStyle("qr", { draggable: isEditMode })}
                onPointerDown={isEditMode ? (event) => handleCodeDragStart(event, "qr") : undefined}
                onPointerMove={isEditMode ? handleCodeDragMove : undefined}
                onPointerUp={isEditMode ? handleCodeDragEnd : undefined}
                onPointerCancel={isEditMode ? handleCodeDragEnd : undefined}
                title={isEditMode ? "Drag QR code to move it" : "Switch to Edit Mode to move QR code"}
              >
                <QRCode
                  value={qrValue}
                  size={Math.max(16, Math.min(getCodeItem("qr").width, getCodeItem("qr").height) - 16)}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  level="M"
                />
                {isEditMode && (
                  <span
                    className="ppe-edit-control absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
                    title="Drag to resize QR code"
                    onPointerDown={(event) => handleCodeResizeStart(event, "qr")}
                    onPointerMove={handleCodeDragMove}
                    onPointerUp={handleCodeDragEnd}
                    onPointerCancel={handleCodeDragEnd}
                  />
                )}
              </div>
              <div
                className={`relative overflow-hidden bg-white ring-blue-300 ${isEditMode ? "hover:ring-2" : ""}`}
                style={getCodeItemStyle("barcode", { draggable: isEditMode })}
                onPointerDown={isEditMode ? (event) => handleCodeDragStart(event, "barcode") : undefined}
                onPointerMove={isEditMode ? handleCodeDragMove : undefined}
                onPointerUp={isEditMode ? handleCodeDragEnd : undefined}
                onPointerCancel={isEditMode ? handleCodeDragEnd : undefined}
                title={isEditMode ? "Drag barcode to move it" : "Switch to Edit Mode to move barcode"}
              >
                <Barcode
                  value={tagNoValue}
                  format="CODE128"
                  height={Math.max(12, Number(getCodeItem("barcode").height) - 9)}
                  width={1.45}
                  margin={0}
                  displayValue={false}
                  background="#ffffff"
                  lineColor="#111827"
                />
                {isEditMode && (
                  <span
                    className="ppe-edit-control absolute bottom-[-7px] right-[-7px] h-4 w-4 cursor-nwse-resize rounded-sm border border-blue-700 bg-white shadow ring-1 ring-blue-200"
                    title="Drag to resize barcode"
                    onPointerDown={(event) => handleCodeResizeStart(event, "barcode")}
                    onPointerMove={handleCodeDragMove}
                    onPointerUp={handleCodeDragEnd}
                    onPointerCancel={handleCodeDragEnd}
                  />
                )}
              </div>
              <div
                className="absolute whitespace-nowrap overflow-visible text-center text-[12px] font-black leading-none"
                style={{
                  left: `${Number(getCodeItem("barcode").x) || 0}px`,
                  top: `${(Number(getCodeItem("barcode").y) || 0) + Math.max(18, Number(getCodeItem("barcode").height) || 51) + 4}px`,
                  width: `${Math.max(24, Number(getCodeItem("barcode").width) || 168)}px`,
                }}
              >
                {tagNoValue}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSheetPreviewPage = (page, pageIndex) => {
    const totalCells = sheetLayout.columns * sheetLayout.rows;
    const paddedPage = [
      ...page,
      ...Array.from({ length: Math.max(0, totalCells - page.length) }, (_, index) => ({
        rowKey: `empty-${pageIndex}-${index}`,
        isEmpty: true,
      })),
    ];

    return (
      <div
        key={`sheet-page-${pageIndex}`}
        ref={(element) => {
          if (element) sheetPreviewRefs.current[pageIndex] = element;
          else delete sheetPreviewRefs.current[pageIndex];
        }}
        className="bg-white shadow-lg"
        style={{
          width: `${sheetPreviewPaperWidthPx}px`,
          minWidth: `${sheetPreviewPaperWidthPx}px`,
          height: `${sheetPreviewPaperHeightPx}px`,
          minHeight: `${sheetPreviewPaperHeightPx}px`,
          padding: `${sheetPreviewMarginPx}px`,
          display: "grid",
          gridTemplateColumns: `repeat(${sheetLayout.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${sheetLayout.rows}, minmax(0, 1fr))`,
          gap: `${sheetPreviewGapPx}px`,
          flex: "0 0 auto",
        }}
      >
        {paddedPage.map((tagInfo, cellIndex) => (
          <div
            key={tagInfo.rowKey || `sheet-cell-${cellIndex}`}
            className="relative flex items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-white/95"
          >
            {!tagInfo.isEmpty && (
              <div
                style={{
                  width: `${previewPixelWidth}px`,
                  height: `${previewPixelHeight}px`,
                  transform: `scale(${sheetPreviewTagFitScale})`,
                  transformOrigin: "center center",
                  flex: "0 0 auto",
                }}
              >
                {renderPreviewTag(tagInfo)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSheetPreview = () => (
    <div className="flex flex-col items-center gap-5">
      <div className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-extrabold text-slate-600 shadow-sm">
        {sheetPaper.label} - {sheetLayout.label} - {sheetPreviewPages.length || 1} page(s)
      </div>
      {(sheetPreviewPages.length > 0 ? sheetPreviewPages : [[]]).map((page, pageIndex) =>
        renderSheetPreviewPage(page, pageIndex)
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 px-2 py-2" style={{ fontFamily: "Aptos, Arial, sans-serif" }}>
      <div className={`${modalClassName} border border-slate-200 bg-white shadow-2xl`}>
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-blue-700">
              {isMultipleTags ? "Property Tags Preview" : "Property Tag Preview"}
            </h3>
            <p className="text-xs font-medium text-slate-500">
              {isMultipleTags
                ? `Preview and print ${tagInfos.length} fixed asset tags.`
                : "Preview and print the selected fixed asset tag."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? "Restore modal" : "Maximize modal"}
            >
              <FontAwesomeIcon icon={isMaximized ? faCompress : faExpand} />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={onClose}
              title="Close"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        <div className={`grid gap-4 bg-slate-50 p-3 ${isMaximized ? "h-[calc(100dvh-58px)]" : "h-[calc(97vh-58px)]"} lg:grid-cols-[minmax(0,1fr)_320px]`}>
          <div className="relative min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-slate-100/80 p-4 shadow-inner">
            {isCapturingPrint && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white/75 text-xs font-bold text-blue-700 backdrop-blur-[1px]">
                <LoadingSpinner />
                <span>Preparing print preview...</span>
              </div>
            )}
            {isEditMode && (
              <div className="absolute left-3 top-3 z-20 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white shadow">
                Edit Mode
              </div>
            )}
            <div className="flex min-h-full justify-center" style={previewZoomWrapperStyle}>
              {printOutputMode === "sheet" ? renderSheetPreview() : <div className={previewGridClass}>{tagInfos.map((tagInfo) => renderPreviewTag(tagInfo))}</div>}
            </div>
          </div>

          <div className="min-h-0 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-3">
              <p className="text-sm font-extrabold text-blue-700">Print / Preview Settings</p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">Total Tags: <span className="text-slate-800">{tagInfos.length}</span></p>
            </div>

            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
              <div className="grid grid-cols-2 rounded-xl bg-slate-200/80 p-1 text-[11px] font-bold text-slate-600">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 transition ${!isEditMode ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                  onClick={() => setIsEditMode(false)}
                  title="Preview only. Dragging is disabled."
                >
                  Preview Mode
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-2 transition ${isEditMode ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                  onClick={() => setIsEditMode(true)}
                  title="Edit mode. Drag fields, QR code, and barcode directly on the tag."
                >
                  Edit Mode
                </button>
              </div>
            </div>

            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600">Preview Zoom</span>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-50"
                  onClick={() => setPreviewZoom(100)}
                >
                  {previewZoom}%
                </button>
              </div>
              <input
                type="range"
                min="40"
                max="300"
                step="5"
                className="w-full"
                value={previewZoom}
                onChange={(e) => setPreviewZoom(Number(e.target.value) || 100)}
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>Zoom Out</span>
                <span>100%</span>
                <span>Zoom In</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">Paper Size</span>
                <select
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={paperPreset}
                  onChange={(e) => handlePaperPresetChange(e.target.value)}
                >
                  {paperPresets.map((preset) => (
                    <option key={preset.label} value={preset.label}>{preset.label}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block font-semibold text-slate-600">Width (mm)</span>
                  <input
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={paperWidth}
                    onChange={(e) => {
                      setPaperPreset("Custom");
                      setPaperWidth(e.target.value.replace(/[^0-9.]/g, ""));
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block font-semibold text-slate-600">Height (mm)</span>
                  <input
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={paperHeight}
                    onChange={(e) => {
                      setPaperPreset("Custom");
                      setPaperHeight(e.target.value.replace(/[^0-9.]/g, ""));
                    }}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block font-semibold text-slate-600">Orientation</span>
                <select
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value)}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                <span className="mb-2 block font-semibold text-slate-700">Print Output Type</span>
                <div className="mb-3 grid grid-cols-2 rounded-lg bg-slate-200 p-1 text-[11px] font-bold text-slate-600">
                  <button
                    type="button"
                    className={`rounded-md px-2 py-1.5 transition ${printOutputMode === "label" ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                    onClick={() => setPrintOutputMode("label")}
                  >
                    Custom Label Printer
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-2 py-1.5 transition ${printOutputMode === "sheet" ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                    onClick={() => setPrintOutputMode("sheet")}
                  >
                    Normal Printer / Sheet
                  </button>
                </div>

                {printOutputMode === "sheet" && (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="mb-1 block font-semibold text-slate-600">Bond Paper Size</span>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={sheetPaperSize}
                        onChange={(e) => setSheetPaperSize(e.target.value)}
                      >
                        {sheetPaperPresets.map((preset) => (
                          <option key={preset.key} value={preset.key}>{preset.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-semibold text-slate-600">Tags Per Sheet</span>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={sheetTagCount}
                        onChange={(e) => setSheetTagCount(e.target.value)}
                      >
                        {sheetTagCountOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block font-semibold text-slate-600">Margin (mm)</span>
                        <input
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={sheetMarginMm}
                          onChange={(e) => setSheetMarginMm(e.target.value.replace(/[^0-9.]/g, ""))}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-semibold text-slate-600">Gap (mm)</span>
                        <input
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          value={sheetGapMm}
                          onChange={(e) => setSheetGapMm(e.target.value.replace(/[^0-9.]/g, ""))}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block font-semibold text-slate-600">PDF Quality</span>
                      <select
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={pdfQualityDpi}
                        onChange={(e) => setPdfQualityDpi(e.target.value)}
                      >
                        <option value="200">Standard / Faster - 200 DPI</option>
                        <option value="300">High Quality - 300 DPI</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={showBorder} onChange={(e) => setShowBorder(e.target.checked)} />
                <span className="font-semibold text-slate-600">Show Border</span>
              </label>
            </div>

            <div className="mt-4 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50"
                onClick={() => setShowDisplayFields((prev) => !prev)}
              >
                <span>Display Fields</span>
                <span className="text-[11px] font-extrabold text-slate-500">{showDisplayFields ? "Hide" : "Show"}</span>
              </button>

              {showDisplayFields && (
                <div className="mt-2 max-h-64 space-y-1 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
                  {displayFields.map((field) => (
                    <label key={field.key} className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs transition hover:bg-blue-50">
                      <input
                        type="checkbox"
                        checked={field.visible}
                        onChange={(e) => handleFieldVisibleChange(field.key, e.target.checked)}
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{field.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {false && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-blue-700">Drag Field Position</p>
                  <p className="text-[10px] text-slate-500">
                    Drag each visible field directly inside the tag preview. Positions are saved with the selected template layout.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={resetFieldPositions}
                >
                  Reset
                </button>
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                <div className="rounded-md bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                  Tip: drag the rows under Tag Information on the preview. Use the X/Y values below only for fine adjustment.
                </div>

                <div className="max-h-52 space-y-1 overflow-auto">
                  {displayFields.map((field) => {
                    const position = getFieldPosition(field.key);

                    return (
                      <div key={field.key} className="grid grid-cols-[1fr_54px_54px] items-center gap-2 rounded-md bg-white px-2 py-1.5 text-xs">
                        <span className={`truncate font-semibold ${field.visible ? "text-slate-700" : "text-slate-400"}`}>
                          {field.label}
                        </span>
                        <input
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                          value={position.x ?? 0}
                          onChange={(event) => updateFieldPosition(field.key, "x", event.target.value)}
                          title={`${field.label} X position`}
                        />
                        <input
                          className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                          value={position.y ?? 0}
                          onChange={(event) => updateFieldPosition(field.key, "y", event.target.value)}
                          title={`${field.label} Y position`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

            {false && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-blue-700">QR / Barcode Position and Size</p>
                  <p className="text-[10px] text-slate-500">
                    Drag the QR or barcode directly on the tag preview. Adjust width/height here for exact sizing.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
                  onClick={resetCodeLayout}
                >
                  Reset
                </button>
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
                {[
                  { key: "qr", label: "QR Code" },
                  { key: "barcode", label: "Barcode" },
                ].map((item) => {
                  const layout = getCodeItem(item.key);

                  return (
                    <div key={item.key} className="rounded-md bg-white p-2">
                      <div className="mb-2 font-bold text-slate-700">{item.label}</div>
                      <div className="grid grid-cols-4 gap-2">
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500">X</span>
                          <input
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                            value={layout.x ?? 0}
                            onChange={(event) => updateCodeLayoutValue(item.key, "x", event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500">Y</span>
                          <input
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                            value={layout.y ?? 0}
                            onChange={(event) => updateCodeLayoutValue(item.key, "y", event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500">W</span>
                          <input
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                            value={layout.width ?? 0}
                            onChange={(event) => updateCodeLayoutValue(item.key, "width", event.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[10px] font-semibold text-slate-500">H</span>
                          <input
                            className="w-full rounded border border-slate-300 px-1.5 py-1 text-right"
                            value={layout.height ?? 0}
                            onChange={(event) => updateCodeLayoutValue(item.key, "height", event.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2">
                <p className="text-xs font-bold text-blue-700">Layout File Settings</p>
                <p className="text-[10px] text-slate-500">Select an existing format or create a new tag layout file.</p>
              </div>

              <input
                ref={layoutImportRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportLayoutFile}
              />

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="mb-3 grid grid-cols-2 rounded-lg bg-slate-200 p-1 text-[11px] font-bold text-slate-600">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-2 transition ${layoutSettingsTab === "formats" ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                    onClick={() => setLayoutSettingsTab("formats")}
                  >
                    Available Formats
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-2 transition ${layoutSettingsTab === "setup" ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/60"}`}
                    onClick={() => setLayoutSettingsTab("setup")}
                  >
                    Setup / Add New
                  </button>
                </div>

                {layoutSettingsTab === "formats" ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value={selectedServerLayout}
                        onChange={(e) => setSelectedServerLayout(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">Select Available Format</option>
                        {serverLayouts.map((layout) => (
                          <option key={layout.layoutName || layout.fileName} value={layout.layoutName}>
                            {layout.layoutName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleLoadServerLayouts()}
                        disabled={isLayoutBusy}
                      >
                        Refresh
                      </button>
                    </div>

                    <button
                      type="button"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      onClick={handleLoadLayoutFromServer}
                      disabled={isLayoutBusy || !selectedServerLayout}
                    >
                      <FontAwesomeIcon icon={faFolderOpen} />
                      Load Selected Format
                    </button>

                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block">
                      <span className="mb-1 block font-semibold text-slate-600">New / Update Format Name</span>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        value={layoutName}
                        onChange={(e) => setLayoutName(e.target.value)}
                        placeholder="default"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={handleSaveLayoutToBrowser}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        Save Browser
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={handleLoadLayoutFromBrowser}
                      >
                        <FontAwesomeIcon icon={faFolderOpen} />
                        Load Browser
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={handleDownloadLayoutFile}
                      >
                        <FontAwesomeIcon icon={faDownload} />
                        Download JSON
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={() => layoutImportRef.current?.click()}
                      >
                        <FontAwesomeIcon icon={faUpload} />
                        Import JSON
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-2 text-[11px] font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        onClick={handleSaveLayoutToServer}
                        disabled={isLayoutBusy}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        Save Server Format
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100"
                        onClick={handleResetLayoutSettings}
                        disabled={isLayoutBusy}
                      >
                        <FontAwesomeIcon icon={faRotateLeft} />
                        Reset Setup
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2 rounded-md bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                  {isLayoutBusy ? "Processing layout file..." : layoutStatus}
                </div>
              </div>
            </div>


            {printOutputMode === "label" && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <div className="mb-2">
                <p className="text-xs font-bold text-blue-700">QZ Tray Direct Printing</p>
                <p className="text-[10px] text-slate-500">Use this for sticker/thermal printers installed on the client PC.</p>
              </div>

              <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={selectedQzPrinter}
                    onChange={(e) => setSelectedQzPrinter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select QZ Printer</option>
                    {qzPrinters.map((printer) => (
                      <option key={printer} value={printer}>
                        {printer}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleLoadQzPrinters}
                    disabled={isQzBusy}
                  >
                    {isQzBusy ? "Loading..." : "Load"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block font-semibold text-slate-600">QZ Print Type</span>
                    <select
                      value={qzPrintType}
                      onChange={(e) => setQzPrintType(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="image">Image Capture</option>
                      <option value="html">HTML</option>
                      <option value="zpl">ZPL / Zebra Compatible</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-semibold text-slate-600">ZPL DPI</span>
                    <select
                      value={qzDpi}
                      onChange={(e) => setQzDpi(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      disabled={qzPrintType !== "zpl"}
                    >
                      <option value="203">203 DPI</option>
                      <option value="300">300 DPI</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-md bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                  {qzStatus}
                </div>

                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                  onClick={handleQzPrint}
                  disabled={isQzBusy || !selectedQzPrinter || tagInfos.length === 0}
                >
                  <FontAwesomeIcon icon={faPrint} />
                  {isQzBusy ? "Sending..." : "Print via QZ Tray"}
                </button>
              </div>
            </div>

            )}

            <div className={`mt-5 grid ${printOutputMode === "sheet" ? "grid-cols-[0.85fr_1fr_1fr]" : "grid-cols-2"} gap-2 border-t border-slate-200 bg-white pt-4`}>
              <button type="button" className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50" onClick={onClose}>
                Close
              </button>
              {printOutputMode === "sheet" && (
                <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300" onClick={handleDownloadPdf} disabled={tagInfos.length === 0 || isCapturingPrint}>
                  <FontAwesomeIcon icon={faDownload} />
                  {isCapturingPrint ? "Preparing..." : "Download PDF"}
                </button>
              )}
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300" onClick={printTag} disabled={tagInfos.length === 0 || isCapturingPrint}>
                <FontAwesomeIcon icon={faPrint} />
                {isCapturingPrint ? "Preparing..." : "Print Preview"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPPETag;





