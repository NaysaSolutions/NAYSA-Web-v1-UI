import React, { useCallback, useEffect, useMemo, useState } from "react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDatabase,
  faHistory,
  faIdCard,
  faRotateLeft,
  faQrcode,
  faExpand,
  faCompress,
  faTimes,
  faTag,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSelectedHSColConfig as getSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import BarcodeQrReaderModal from "@/NAYSA Cloud/Lookup/SearchGlobalQRBarCodeReader.jsx";
import SearchPPETag from "@/NAYSA Cloud/Lookup/SearchPPETag.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const AMOUNT_KEYS = new Set([
  "acqCost",
  "deprMonth",
  "accumDepr",
  "nbValue",
  "salvageValue",
  "acqCostFx1",
  "acqCostFx2",
  "deprMonthFx1",
  "deprMonthFx2",
  "accumDeprFx1",
  "accumDeprFx2",
  "nbValueFx1",
  "nbValueFx2",
  "salvageValueFx1",
  "salvageValueFx2",
  "deprAmount",
  "accumDeprBefore",
  "accumDeprAfter",
  "nbValueBefore",
  "nbValueAfter",
]);

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";

const formatAmount = (value, decimals = 2) => {
  const parsed = Number(String(value ?? 0).replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return Number(0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return parsed.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const openPathUrlDocument = (row) => {
  if (!row?.pathUrl) return;
  const url = `${window.location.origin}${row.pathUrl}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

const normalizeApiRows = (response) => {
  const result =
    response?.data?.[0]?.result ??
    response?.data?.[0]?.RESULT ??
    response?.data?.result ??
    response?.data?.RESULT ??
    response?.result ??
    response?.RESULT ??
    response?.data ??
    response;

  if (!result) return [];

  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.data)) return parsed.data;
      return parsed && typeof parsed === "object" ? [parsed] : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  return result && typeof result === "object" ? [result] : [];
};

const getStatusLabel = (asset = {}) => {
  if (asset.faStatusName) return asset.faStatusName;

  switch (String(asset.faStatus || "").toUpperCase()) {
    case "A":
      return "Active";
    case "I":
      return "Inactive";
    case "D":
      return "Disposed";
    case "F":
      return "Fully Depreciated";
    case "X":
      return "Cancelled";
    default:
      return asset.faStatus || "Unknown";
  }
};

const DetailSection = ({ title, children, className = "" }) => (
  <section className={`rounded-lg border border-slate-200 bg-slate-50/60 p-3 ${className}`}>
    <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-blue-700">
      {title}
    </div>
    {children}
  </section>
);

const ReadOnlyField = ({ id, label, value, type = "text", className = "" }) => (
  <div className={className}>
    <FieldRenderer
      id={id}
      label={label}
      type={type}
      value={value || ""}
      disabled
      readOnly
      labelClassName="!text-[10px]"
    />
  </div>
);

const FinancialMetricCard = ({ label, value, accent = false }) => (
  <div
    className={`min-w-0 rounded-lg border px-3 py-2 shadow-sm ${
      accent ? "border-blue-100 bg-blue-50" : "border-gray-200 bg-white"
    }`}
  >
    <div
      className={`truncate text-[10px] font-medium uppercase ${
        accent ? "text-blue-700" : "text-gray-500"
      }`}
      title={label}
    >
      {label}
    </div>
    <div
      className={`mt-1 truncate text-right text-[11px] font-semibold tabular-nums sm:text-xs ${
        accent ? "text-blue-900" : "text-gray-800"
      }`}
      title={value}
    >
      {value}
    </div>
  </div>
);

const AssetTagPreviewCard = ({ tagInfo, onOpenPreview }) => {
  const tagNo = tagInfo?.serialRow?.assetTag || "System-Generated";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-blue-700">
          <FontAwesomeIcon icon={faTag} />
          <span className="truncate">Property Tag Preview</span>
        </div>

        <button
          type="button"
          className="inline-flex min-w-[84px] items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          onClick={onOpenPreview}
        >
          <FontAwesomeIcon icon={faEye} />
          Preview
        </button>
      </div>

      <div className="mx-auto w-full max-w-[320px] rounded-md border-2 border-slate-900 bg-white p-2 text-slate-900">
        <div className="grid grid-cols-[minmax(0,1fr)_74px] gap-2">
          <div className="min-w-0">
            <div className="text-lg font-black leading-none text-blue-700">NAYSA</div>
            <div className="text-[9px] font-black uppercase text-slate-600">Property Tag</div>
            <div className="mt-1 truncate text-[10px] font-extrabold" title={tagInfo.companyInfo.companyName}>
              {tagInfo.companyInfo.companyName}
            </div>
            <div className="truncate text-[9px] font-semibold text-slate-500" title={tagInfo.documentInfo.branchName}>
              {tagInfo.documentInfo.branchName}
            </div>
            <div className="mt-2 max-h-[30px] min-h-[28px] overflow-hidden text-[11px] font-extrabold leading-tight" title={tagInfo.detailRow.assetDescription}>
              {tagInfo.detailRow.assetDescription}
            </div>
          </div>

          <div className="flex flex-col items-center justify-start gap-1">
            <div className="border border-slate-900 bg-white p-1">
              <QRCode value={tagNo} size={56} bgColor="#ffffff" fgColor="#111827" level="M" />
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-center overflow-hidden bg-white [&_svg]:mx-auto">
          <Barcode
            value={tagNo}
            format="CODE128"
            height={24}
            width={1.1}
            margin={0}
            displayValue={false}
            background="#ffffff"
            lineColor="#111827"
          />
        </div>
        <div className="mt-1 truncate text-center text-[11px] font-black" title={tagNo}>
          {tagNo}
        </div>
      </div>
    </div>
  );
};

const SearchField = ({
  label,
  value,
  onChange,
  onSearch,
  onLookup,
  onQr,
  placeholder,
  showQr = false,
  disabled = false,
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <FieldRenderer
          id={`fa_find_search_${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`}
          label={label}
          type="lookup"
          value={value || ""}
          onChange={onChange}
          onLookup={() => {
            const cleanValue = String(value || "").trim();
            if (cleanValue) {
              onSearch(cleanValue);
              return;
            }
            onLookup?.();
          }}
          onClear={() => onChange("")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSearch(value);
            }
          }}
          disabled={disabled}
          editableLookup
          allowLookupInput
          placeholder=" "
          labelClassName="!text-[10px]"
        />
      </div>
      {showQr && (
        <button
          type="button"
          className="inline-flex h-8 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-transparent text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
          onClick={onQr}
          disabled={disabled}
          title="Scan Property Tag No. QR Code"
        >
          <FontAwesomeIcon icon={faQrcode} className="text-[16px]" />
        </button>
      )}
    </div>
  </div>
);

const SearchFAFind = ({
  isOpen,
  onClose,
  initialBranchCode = "",
  initialBranchName = "",
  initialAssetCode = "",
  initialTagNo = "",
  endingCutoff = "",
}) => {
  const { currentUserRow, companyInfo } = useAuth();
  const withCostAmount = currentUserRow?.viewCostamt !== "N";

  const [branchCode, setBranchCode] = useState(initialBranchCode || currentUserRow?.branchCode || "");
  const [branchName, setBranchName] = useState(initialBranchName || currentUserRow?.branchName || "");
  const [assetCode, setAssetCode] = useState(initialAssetCode || "");
  const [tagNo, setTagNo] = useState(initialTagNo || "");
  const [asset, setAsset] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyCols, setHistoryCols] = useState([]);
  const [showFAMastLookup, setShowFAMastLookup] = useState(false);
  const [faLookupRows, setFaLookupRows] = useState([]);
  const [faLookupColumns, setFaLookupColumns] = useState([]);
  const [faLookupSource, setFaLookupSource] = useState("");
  const [showQrReader, setShowQrReader] = useState(false);
  const [showPpeTagPreview, setShowPpeTagPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [message, setMessage] = useState("");

  const currentCutoff = firstValue(endingCutoff, companyInfo?.cutoffCode, companyInfo?.CUTOFF_CODE);

  useEffect(() => {
    if (!isOpen) return;

    setBranchCode(initialBranchCode || currentUserRow?.branchCode || "");
    setBranchName(initialBranchName || currentUserRow?.branchName || "");
    setAssetCode(initialAssetCode || "");
    setTagNo(initialTagNo || "");
    setAsset(null);
    setHistoryRows([]);
    setHistoryCols([]);
    setFaLookupRows([]);
    setFaLookupColumns([]);
    setFaLookupSource("");
    setShowFAMastLookup(false);
    setShowQrReader(false);
    setShowPpeTagPreview(false);
    setIsLoading(false);
    setMessage("");
    setIsMaximized(false);

    if (initialAssetCode || initialTagNo) {
      setTimeout(() => {
        loadAsset({
          faCode: initialAssetCode || "",
          tagNo: initialTagNo || "",
        });
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialAssetCode, initialTagNo]);

  useEffect(() => {
    if (!isOpen || !isMaximized) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen, isMaximized]);

  const visibleHistoryCols = useMemo(() => {
    const source = Array.isArray(historyCols) ? historyCols : [];
    if (withCostAmount) return source;
    return source.filter((column) => !AMOUNT_KEYS.has(column?.key));
  }, [historyCols, withCostAmount]);

  const assetTagPreviewInfo = useMemo(() => {
    if (!asset) return null;

    const assetTag = firstValue(asset.assetTag, asset.tagNo, asset.barCode, asset.faCode, "System-Generated");
    const assetDescription = firstValue(asset.faName, asset.faDesc, asset.faSpecs, asset.faCode, "-");
    const branchCodeValue = firstValue(asset.branchCode, branchCode, "");
    const branchNameValue = firstValue(asset.branchName, branchName, branchCodeValue, "-");
    const location = firstValue(asset.flocName, asset.flocCode, "-");
    const assignedTo = firstValue(asset.empName, asset.empNo, "-");
    const department = firstValue(asset.rcName, asset.rcCode, "-");
    const brandModel = firstValue(asset.brandModel, asset.modelNo, "-");

    return {
      companyInfo: {
        ...companyInfo,
        companyName: firstValue(companyInfo?.companyName, companyInfo?.compName, companyInfo?.name, "NAYSA Financials"),
      },
      documentInfo: {
        documentDate: firstValue(asset.acqDate, asset.documentDate, "-"),
        branchCode: branchCodeValue,
        branchName: branchNameValue,
      },
      detailRow: {
        assetDescription,
        categName: firstValue(asset.categName, asset.categCode, "-"),
        className: firstValue(asset.className, asset.classCode, "-"),
        location,
        brandModel,
        acqCost: asset.acqCost,
      },
      serialRow: {
        assetTag,
        serialNo: firstValue(asset.serialNo, "-"),
        location,
        assignedTo,
        empName: assignedTo,
        rcCode: department,
        brandModel,
        acqCost: asset.acqCost,
      },
    };
  }, [asset, branchCode, branchName, companyInfo]);

  const loadHistory = useCallback(async (assetRow) => {
    const faCode = assetRow?.faCode || "";
    if (!faCode) {
      setHistoryRows([]);
      return;
    }

    const endCutoff = firstValue(currentCutoff, assetRow?.dcutoffCode, assetRow?.cutoffCode);

    const [cols, response] = await Promise.all([
      getSelectedHSColConfig("getFAAssetHistory"),
      postRequest("getFAAssetHistory", {
        json_data: {
          mode: "data",
          branchCode: assetRow?.branchCode || branchCode || "",
          flocCode: assetRow?.flocCode || "",
          rcCode: assetRow?.rcCode || "",
          categCode: assetRow?.categCode || "",
          classCode: assetRow?.classCode || "",
          faCode,
          startingCutoff: "190001",
          endingCutoff: endCutoff,
        },
      }),
    ]);

    setHistoryCols(Array.isArray(cols) ? cols : []);
    setHistoryRows(normalizeApiRows(response));
  }, [branchCode, currentCutoff]);

  const loadAsset = useCallback(async ({ faCode = "", tagNo: searchTagNo = "", searchSource = "" } = {}) => {
    const cleanFaCode = String(faCode || "").trim();
    const cleanTagNo = String(searchTagNo || "").trim();

    if (!cleanFaCode && !cleanTagNo) {
      setMessage("Please enter Asset Code or Property Tag No.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await postRequest("getFAAssetQuery", {
        json_data: {
          mode: "data",
          branchCode: branchCode || "",
          faCode: cleanFaCode,
          tagNo: cleanTagNo,
        },
      });

      const rows = normalizeApiRows(response);
      const selectedAsset =
        rows.find((row) =>
          cleanFaCode
            ? String(row?.faCode || "").toUpperCase() === cleanFaCode.toUpperCase()
            : String(row?.tagNo || "").toUpperCase() === cleanTagNo.toUpperCase()
        ) || rows[0] || null;

      if (!selectedAsset) {
        setAsset(null);
        setHistoryRows([]);
        setHistoryCols([]);
        setMessage("No asset found.");
        return;
      }

      setAsset(selectedAsset);

      if (searchSource === "assetCode") {
        setAssetCode(selectedAsset.faCode || cleanFaCode);
      } else if (searchSource === "tagNo") {
        setTagNo(selectedAsset.tagNo || cleanTagNo);
      } else {
        setAssetCode(selectedAsset.faCode || cleanFaCode);
        setTagNo(selectedAsset.tagNo || cleanTagNo);
      }

      setBranchCode(selectedAsset.branchCode || branchCode || "");
      setBranchName(selectedAsset.branchName || branchName || "");

      await loadHistory(selectedAsset);
    } catch (error) {
      console.error("Search FA Find error:", error);
      setMessage(error?.message || "Unable to load asset information.");
    } finally {
      setIsLoading(false);
    }
  }, [branchCode, branchName, loadHistory]);

  const buildFaLookupParams = (source = "") => ({
    branchCode: branchCode || "",
    faCode: source === "assetCode" ? assetCode || "" : "",
    tagNo: source === "tagNo" ? tagNo || "" : "",
  });

  const openFAMastLookup = async (source = "") => {
    setIsLoading(true);
    setMessage("");
    setFaLookupSource(source);

    try {
      const [response, colConfig] = await Promise.all([
        postRequest("lookupFAMast", {
          PARAMS: JSON.stringify({
            json_data: buildFaLookupParams(source),
          }),
        }),
        getSelectedHSColConfig("lookupFAMast", currentUserRow?.userCode || currentUserRow?.USER_CODE || ""),
      ]);

      const searchText = String(source === "assetCode" ? assetCode : source === "tagNo" ? tagNo : "")
        .trim()
        .toLowerCase();
      const rawLookupRows = normalizeApiRows(response);
      const filteredLookupRows = searchText
        ? rawLookupRows.filter((row) => {
            const searchableValues = source === "tagNo"
              ? [row?.tagNo, row?.assetTag, row?.TAG_NO]
              : [row?.faCode, row?.assetNo, row?.FA_CODE];

            return searchableValues.some((value) =>
              String(value || "").toLowerCase().includes(searchText)
            );
          })
        : rawLookupRows;

      const lookupRows = filteredLookupRows.map((row, index) => ({
        ...row,
        groupId: row?.groupId || row?.faCode || row?.FA_CODE || String(index + 1),
      }));

      if (lookupRows.length === 0) {
        setMessage("No fixed assets found for the selected lookup filters.");
        return;
      }

      setFaLookupRows(lookupRows);
      setFaLookupColumns(Array.isArray(colConfig) ? colConfig : []);
      setShowFAMastLookup(true);
    } catch (error) {
      console.error("Fixed Asset Master lookup error:", error);
      setMessage(error?.message || "Unable to load fixed asset records.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseFAMastLookup = (selectedItems) => {
    setShowFAMastLookup(false);

    if (!selectedItems?.records) return;

    const selectedRecords = Array.isArray(selectedItems.records)
      ? selectedItems.records
      : [selectedItems.records];

    const row = selectedRecords[0];
    if (!row) return;

    const faCode = firstValue(row.faCode, row.assetNo, row.FA_CODE);
    const selectedTagNo = firstValue(row.tagNo, row.assetTag, row.TAG_NO);

    if (faLookupSource === "tagNo") {
      setTagNo(selectedTagNo);
      loadAsset({ tagNo: selectedTagNo, searchSource: "tagNo" });
      return;
    }

    setAssetCode(faCode);
    loadAsset({ faCode, searchSource: "assetCode" });
  };

  const handleQrScan = (value) => {
    const scannedValue = String(value || "").trim();
    if (!scannedValue) return;

    setTagNo(scannedValue);
    setShowQrReader(false);
    loadAsset({ tagNo: scannedValue, searchSource: "tagNo" });
  };

  if (!isOpen) return null;

  return (
    <>
      {isLoading && <LoadingSpinner />}

      <div
        className={`fixed inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px] ${
          isMaximized ? "z-[9999] h-[100dvh] w-screen overflow-hidden p-0" : "z-[80] p-2 sm:p-4"
        }`}
        onClick={onClose}
      >
        <div
          className={`flex w-full flex-col overflow-hidden bg-white shadow-2xl ${
            isMaximized
              ? "h-[100dvh] max-h-[100dvh] max-w-none rounded-none"
              : "max-h-[88vh] max-w-6xl rounded-xl"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 py-1">
            <div className="flex min-w-0 items-center gap-2 pl-2 sm:pl-3">
              <FontAwesomeIcon icon={faIdCard} className="text-slate-500" />
              <div className="global-lookup-headertext-ui">
                Asset Finder
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="p-2 text-slate-400 transition-colors hover:text-slate-700"
                onClick={() => setIsMaximized((value) => !value)}
                title={isMaximized ? "Restore" : "Maximize"}
              >
                <FontAwesomeIcon
                  icon={isMaximized ? faCompress : faExpand}
                />
              </button>

              <button
                type="button"
                className="p-2 mr-2 text-slate-400 transition-colors hover:text-red-600"
                onClick={onClose}
                title="Close"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <SearchField
                label="Asset Code"
                value={assetCode}
                onChange={setAssetCode}
                onSearch={(value) => loadAsset({ faCode: value, searchSource: "assetCode" })}
                onLookup={() => openFAMastLookup("assetCode")}
                placeholder=""
                disabled={isLoading}
              />

              <SearchField
                label="Property Tag No."
                value={tagNo}
                onChange={setTagNo}
                onSearch={(value) => loadAsset({ tagNo: value, searchSource: "tagNo" })}
                onLookup={() => openFAMastLookup("tagNo")}
                onQr={() => setShowQrReader(true)}
                placeholder=""
                showQr
                disabled={isLoading}
              />
            </div>

            {message && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {message}
              </div>
            )}

            <div className="mt-4 rounded-xl border bg-white shadow-sm">
              <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                    <FontAwesomeIcon icon={faIdCard} />
                    Asset Information
                  </div>

                  <button
                    type="button"
                    className="inline-flex min-w-[84px] items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    onClick={() => {
                      setAsset(null);
                      setHistoryRows([]);
                      setAssetCode("");
                      setTagNo("");
                      setShowPpeTagPreview(false);
                      setMessage("");
                    }}
                    disabled={isLoading}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} />
                    Reset
                  </button>
                </div>
              </div>

              {!asset ? (
                <div className="flex items-center gap-2 p-8 text-sm text-gray-500">
                  <FontAwesomeIcon icon={faDatabase} className="text-blue-300" />
                  Search by Asset Code, Property Tag No., lookup, or QR reader to display asset details.
                </div>
              ) : (
                <div className="p-3">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.75fr)]">
                    <div className="grid grid-cols-1 gap-3">
                      <DetailSection title="Asset Identity">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                          <ReadOnlyField id="fa_find_code" label="Asset Code" value={asset.faCode} />
                          <ReadOnlyField id="fa_find_tag" label="Property Tag No." value={asset.tagNo} />
                          <ReadOnlyField id="fa_find_barcode" label="Bar Code" value={asset.barCode} />
                          <ReadOnlyField id="fa_find_status" label="Status" value={getStatusLabel(asset)} />
                          <ReadOnlyField id="fa_find_name" label="Asset Name" value={asset.faName} className="md:col-span-2" />
                          <ReadOnlyField id="fa_find_specs" label="Specifications" value={asset.faSpecs} className="md:col-span-2" />
                          <ReadOnlyField id="fa_find_serial" label="Serial No." value={asset.serialNo} />
                          <ReadOnlyField id="fa_find_model" label="Model No." value={asset.modelNo} />
                          <ReadOnlyField id="fa_find_old_code" label="Old Code" value={asset.oldCode} />
                          <ReadOnlyField id="fa_find_acq_date" label="Acq Date" value={asset.acqDate} />
                        </div>
                      </DetailSection>

                      <DetailSection title="Assignment">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                          <ReadOnlyField id="fa_find_branch" label="Branch" value={asset.branchCode} />
                          <ReadOnlyField
                            id="fa_find_location"
                            label="Location"
                            value={asset.flocName ? `${asset.flocCode || ""} - ${asset.flocName}` : asset.flocCode}
                          />
                          <ReadOnlyField
                            id="fa_find_department"
                            label="Department"
                            value={asset.rcName ? `${asset.rcCode || ""} - ${asset.rcName}` : asset.rcCode}
                          />
                          <ReadOnlyField
                            id="fa_find_employee"
                            label="Employee"
                            value={asset.empName ? `${asset.empNo || ""} - ${asset.empName}` : asset.empNo}
                          />
                          <ReadOnlyField
                            id="fa_find_category"
                            label="Category"
                            value={asset.categName ? `${asset.categCode || ""} - ${asset.categName}` : asset.categCode}
                          />
                          <ReadOnlyField
                            id="fa_find_class"
                            label="Classification"
                            value={asset.className ? `${asset.classCode || ""} - ${asset.className}` : asset.classCode}
                          />
                        </div>
                      </DetailSection>

                      <DetailSection title="Source References">
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                          <ReadOnlyField
                            id="fa_find_vendor"
                            label="Vendor"
                            value={asset.vendName ? `${asset.vendCode || ""} - ${asset.vendName}` : asset.vendCode}
                            className="md:col-span-2"
                          />
                          <ReadOnlyField id="fa_find_farr" label="FARR No." value={asset.farrNo} />
                          <ReadOnlyField id="fa_find_po" label="PO No." value={asset.poNo} />
                          <ReadOnlyField id="fa_find_cutoff" label="Acquisition Month" value={asset.cutoffCode} />
                          <ReadOnlyField id="fa_find_depr_cutoff" label="Depreciation Start" value={asset.dcutoffCode} />
                        </div>
                      </DetailSection>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <DetailSection title="Financial Summary" className="h-fit">
                        {withCostAmount ? (
                          <div className="grid grid-cols-2 gap-2">
                            <FinancialMetricCard
                              label="NB Value"
                              value={formatAmount(asset.nbValue)}
                              accent
                            />
                            <FinancialMetricCard
                              label="Acq. Cost"
                              value={formatAmount(asset.acqCost)}
                            />
                            <FinancialMetricCard
                              label="Depr. Month"
                              value={formatAmount(asset.deprMonth)}
                            />
                            <FinancialMetricCard
                              label="Accum. Depr."
                              value={formatAmount(asset.accumDepr)}
                            />
                            <FinancialMetricCard
                              label="Salvage Value"
                              value={formatAmount(asset.salvageValue)}
                            />
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
                            Amount fields are hidden for your user access.
                          </div>
                        )}
                      </DetailSection>

                      {assetTagPreviewInfo && (
                        <AssetTagPreviewCard
                          tagInfo={assetTagPreviewInfo}
                          onOpenPreview={() => setShowPpeTagPreview(true)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border bg-white shadow-sm">
              <div className="border-b bg-gradient-to-r from-blue-50 to-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                    <FontAwesomeIcon icon={faHistory} />
                    Historical Data / Asset Move History
                  </div>
                </div>
              </div>

              <div className="global-tran-table-main-div-ui max-h-[420px] overflow-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-sm text-gray-500">Loading asset information...</div>
                ) : !asset ? (
                  <div className="p-8 text-sm text-gray-500">No asset selected.</div>
                ) : historyRows.length === 0 ? (
                  <div className="p-8 text-sm text-gray-500">No asset history found.</div>
                ) : (
                  <SearchGlobalReportTable
                    key={`${asset?.faCode || "asset"}-${historyRows.length}`}
                    columns={visibleHistoryCols}
                    data={historyRows}
                    itemsPerPage={10}
                    rightActionLabel="View"
                    onRowAction={openPathUrlDocument}
                  />
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {showFAMastLookup && (
        <GlobalLookupModalv1
          isOpen={showFAMastLookup}
          title="Fixed Asset Master"
          data={faLookupRows}
          endpoint={faLookupColumns}
          btnCaption="Get Selected Assets"
          idKey="groupId"
          onClose={handleCloseFAMastLookup}
          onCancel={() => setShowFAMastLookup(false)}
          singleSelect={false}
          overlayZIndexClass="z-[120]"
        />
      )}

      {showQrReader && (
        <BarcodeQrReaderModal
          isOpen={showQrReader}
          title="Scan Property Tag QR Code"
          scanOnce={true}
          onScan={handleQrScan}
          onClose={() => setShowQrReader(false)}
        />
      )}

      {showPpeTagPreview && assetTagPreviewInfo && (
        <SearchPPETag
          isOpen={showPpeTagPreview}
          companyInfo={assetTagPreviewInfo.companyInfo}
          documentInfo={assetTagPreviewInfo.documentInfo}
          detailRow={assetTagPreviewInfo.detailRow}
          serialRow={assetTagPreviewInfo.serialRow}
          onClose={() => setShowPpeTagPreview(false)}
        />
      )}
    </>
  );
};

export default SearchFAFind;
