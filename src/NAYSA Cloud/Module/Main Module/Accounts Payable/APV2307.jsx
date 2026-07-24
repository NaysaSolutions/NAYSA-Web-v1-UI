import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import bir2307Page1 from "./bir-2307-page1.svg";
import { postRequest } from "../../../Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

/**
 * APV2307.jsx
 *
 * Live NAYSA preview/print page for BIR Form 2307 January 2018 (ENCS).
 *
 * Supported document sources:
 * - APV
 * - CV  (requires CV rows in dbo.fntbl_ExpandedWtax)
 * - PCV
 *
 * The official BIR first page is used as the fixed SVG background. Values are
 * placed using the original PDF coordinates. The native page size is
 * 612 x 936 points, equivalent to 8.5 x 13 inches.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 936;
const ROWS_PER_SECTION = 10;

const DATE_FROM_X = [157.94, 171.14, 184.75, 197.86, 210.58, 223.78, 237.38, 250.5];
const DATE_TO_X = [405.5, 418.73, 432.35, 445.48, 458.2, 471.42, 485.05, 498.17];

const PAYEE_TIN_X = [
  213.79,
  226.98,
  240.16,
  265.44,
  278.63,
  291.81,
  316.79,
  329.98,
  343.16,
  368.7,
  383.46,
  399.02,
  414.43,
  428.64,
];
const PAYOR_TIN_X = PAYEE_TIN_X.map((value) => value + 0.81);

const PAYEE_ZIP_X = [548.07, 560.57, 573.07, 585.57];
const PAYOR_ZIP_X = PAYEE_ZIP_X;

const EXPANDED_ROW_Y = Array.from(
  { length: ROWS_PER_SECTION },
  (_, index) => 372.15 + index * 13.68,
);
const BUSINESS_ROW_Y = Array.from(
  { length: ROWS_PER_SECTION },
  (_, index) => 541.63 + index * 13.68,
);

const PAYOR_ISSUE_DATE_X = [
  323.62,
  336.74,
  349.86,
  362.98,
  376.06,
  389.18,
  402.3,
  415.42,
];
const PAYOR_EXPIRY_DATE_X = [
  493.86,
  507.02,
  520.18,
  533.34,
  546.48,
  559.64,
  572.8,
  585.96,
];
const PAYEE_ISSUE_DATE_X = PAYOR_ISSUE_DATE_X.map((value) => value + 0.08);
const PAYEE_EXPIRY_DATE_X = PAYOR_EXPIRY_DATE_X.map((value) => value + 0.09);

const EMPTY_TOTALS = Object.freeze({
  month1Amount: 0,
  month2Amount: 0,
  month3Amount: 0,
  totalAmount: 0,
  taxWithheld: 0,
});

export const SAMPLE_2307_DATA = {
  formKey: "HO|SAMPLE|202601",
  sourceTranId: "SAMPLE-TRANSACTION",
  periodFrom: "2026-01-01",
  periodTo: "2026-03-31",
  payee: {
    tin: "123-456-789-00000",
    registeredName: "SAMPLE SUPPLIER CORPORATION",
    registeredAddress: "123 SAMPLE STREET, BARANGAY SAMPLE, MAKATI CITY",
    zipCode: "1200",
    foreignAddress: "",
  },
  payor: {
    tin: "987-654-321-00000",
    registeredName: "NAYSA SAMPLE COMPANY",
    registeredAddress: "456 BUSINESS AVENUE, QUEZON CITY",
    zipCode: "1100",
  },
  expandedWithholdingDetails: [
    {
      incomeDescription: "PROFESSIONAL FEES",
      atcCode: "WC010",
      month1Amount: 100000,
      month2Amount: 120000,
      month3Amount: 80000,
      taxWithheld: 30000,
    },
  ],
  businessTaxDetails: [],
  payorSignatory: {
    printedName: "",
    title: "",
    tin: "",
    accreditationNo: "",
    dateIssued: "",
    dateExpiry: "",
  },
  payeeSignatory: {
    printedName: "",
    title: "",
    tin: "",
    accreditationNo: "",
    dateIssued: "",
    dateExpiry: "",
  },
};

const toNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const cleanUpper = (value) => String(value ?? "").trim().toUpperCase();

const normalizeTin = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";

  return [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 14),
  ]
    .filter(Boolean)
    .join("-");
};

const normalizeDate = (value) => {
  if (!value) return "";

  const source = String(value).trim();
  const iso = source.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;

  const slashDate = source.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashDate) return source;

  const digits = source.replace(/\D/g, "").slice(0, 8);
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  return source;
};

const parseJsonValue = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeSignatory = (value) => {
  if (typeof value === "string") {
    const displayText = cleanUpper(value);
    const [printedName = "", title = "", tin = ""] = displayText
      .split("/")
      .map((part) => part.trim());

    return {
      displayText,
      printedName,
      title,
      tin: normalizeTin(tin),
      accreditationNo: "",
      dateIssued: "",
      dateExpiry: "",
    };
  }

  const source = value && typeof value === "object" ? value : {};
  const printedName = cleanUpper(source?.printedName ?? source?.name);
  const title = cleanUpper(source?.title ?? source?.position);
  const tin = normalizeTin(source?.tin);
  const displayText = cleanUpper(
    source?.displayText ??
      source?.value ??
      [printedName, title, tin].filter(Boolean).join(" / "),
  );

  return {
    displayText,
    printedName,
    title,
    tin,
    accreditationNo: cleanUpper(source?.accreditationNo),
    dateIssued: source?.dateIssued ?? "",
    dateExpiry: source?.dateExpiry ?? "",
  };
};

const normalizeRows = (rows) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    incomeDescription: cleanUpper(
      row?.incomeDescription ??
        row?.incomePaymentDescription ??
        row?.atcName ??
        row?.description,
    ),
    atcCode: cleanUpper(row?.atcCode ?? row?.atc),
    month1Amount: toNumber(row?.month1Amount ?? row?.firstMonthAmount),
    month2Amount: toNumber(row?.month2Amount ?? row?.secondMonthAmount),
    month3Amount: toNumber(row?.month3Amount ?? row?.thirdMonthAmount),
    taxWithheld: toNumber(row?.taxWithheld ?? row?.withholdingTax),
  }));

export const normalize2307Data = (value = {}) => ({
  formKey:
    value?.formKey ||
    [value?.branchCode, value?.payeeCode, value?.startingCutoff]
      .filter(Boolean)
      .join("|") ||
    `FORM-${Date.now()}`,
  sourceTranId: value?.sourceTranId ?? "",
  sourceTransactionCount: toNumber(value?.sourceTransactionCount),
  branchCode: value?.branchCode ?? "",
  periodFrom: value?.periodFrom ?? "",
  periodTo: value?.periodTo ?? "",
  payee: {
    code: value?.payee?.code ?? value?.payeeCode ?? "",
    tin: normalizeTin(value?.payee?.tin ?? value?.payeeTin),
    registeredName: cleanUpper(
      value?.payee?.registeredName ?? value?.payee?.name ?? value?.payeeName,
    ),
    registeredAddress: cleanUpper(
      value?.payee?.registeredAddress ?? value?.payee?.address ?? value?.payeeAddress,
    ),
    zipCode: String(value?.payee?.zipCode ?? value?.payeeZipCode ?? "")
      .replace(/\D/g, "")
      .slice(0, 4),
    foreignAddress: cleanUpper(value?.payee?.foreignAddress),
  },
  payor: {
    code: value?.payor?.code ?? value?.payorCode ?? "",
    tin: normalizeTin(value?.payor?.tin ?? value?.payorTin),
    registeredName: cleanUpper(
      value?.payor?.registeredName ?? value?.payor?.name ?? value?.payorName,
    ),
    registeredAddress: cleanUpper(
      value?.payor?.registeredAddress ?? value?.payor?.address ?? value?.payorAddress,
    ),
    zipCode: String(value?.payor?.zipCode ?? value?.payorZipCode ?? "")
      .replace(/\D/g, "")
      .slice(0, 4),
  },
  expandedWithholdingDetails: normalizeRows(
    value?.expandedWithholdingDetails ?? value?.details,
  ),
  businessTaxDetails: normalizeRows(value?.businessTaxDetails),
  payorSignatory: normalizeSignatory(value?.payorSignatory),
  payeeSignatory: {
    printedName: cleanUpper(value?.payeeSignatory?.printedName),
    title: cleanUpper(value?.payeeSignatory?.title),
    tin: normalizeTin(value?.payeeSignatory?.tin),
    accreditationNo: cleanUpper(value?.payeeSignatory?.accreditationNo),
    dateIssued: value?.payeeSignatory?.dateIssued ?? "",
    dateExpiry: value?.payeeSignatory?.dateExpiry ?? "",
  },
});

/**
 * Converts one AP_2307 dt1 record returned by sproc_PHP_AP_Inq into the exact
 * form model. Only this mapping needs adjustment if the API field names change.
 */
export const mapApiRecordTo2307 = (source = {}) => {
  const rawDetails = parseJsonValue(source?.details, source?.details);
  const details = Array.isArray(rawDetails) ? rawDetails : [];

  const expandedWithholdingDetails = details.filter((row) => {
    const sectionCode = cleanUpper(row?.sectionCode);
    const classCode = cleanUpper(row?.classCode);
    return sectionCode === "EXPANDED_WITHHOLDING_TAX" || classCode === "EWT";
  });

  const businessTaxDetails = details.filter((row) => {
    const sectionCode = cleanUpper(row?.sectionCode);
    const classCode = cleanUpper(row?.classCode);
    return sectionCode === "BUSINESS_TAX" || classCode === "FTAX";
  });

  return normalize2307Data({
    ...source,
    payee: {
      code: source?.payeeCode,
      tin: source?.payeeTin,
      registeredName: source?.payeeName,
      registeredAddress: source?.payeeAddress,
      zipCode: source?.payeeZipCode,
      foreignAddress: "",
    },
    payor: {
      code: source?.payorCode,
      tin: source?.payorTin,
      registeredName: source?.payorName,
      registeredAddress: source?.payorAddress,
      zipCode: source?.payorZipCode,
    },
    expandedWithholdingDetails,
    businessTaxDetails,
    payorSignatory: source?.payorSignatory,
    payeeSignatory: source?.payeeSignatory,
  });
};

const extract2307Records = (response) => {
  // postRequest normally returns the response body directly. The additional
  // body resolution also supports an Axios-style { data: responseBody } value.
  const responseBody =
    response?.data &&
    typeof response.data === "object" &&
    !Array.isArray(response.data) &&
    (Object.prototype.hasOwnProperty.call(response.data, "success") ||
      Object.prototype.hasOwnProperty.call(response.data, "data"))
      ? response.data
      : response;

  const storedProcedureResult =
    responseBody?.data?.[0]?.result ??
    responseBody?.data?.[0]?.RESULT ??
    responseBody?.data?.[0]?.JsonResult ??
    responseBody?.data?.result ??
    responseBody?.result ??
    responseBody?.RESULT ??
    responseBody?.JsonResult ??
    responseBody?.data ??
    responseBody;

  const parsedResult = parseJsonValue(storedProcedureResult, storedProcedureResult);
  const resultContainer = Array.isArray(parsedResult) ? parsedResult[0] : parsedResult;
  const dt1 = parseJsonValue(resultContainer?.dt1, resultContainer?.dt1);

  if (Array.isArray(dt1)) return dt1;
  if (Array.isArray(resultContainer)) return resultContainer;

  return [];
};

const DESCRIPTION_COLUMN_X = 20.4;
// Keep a deliberate right-side allowance before the ATC code column.
// The official cell is wider, but this conservative writing width prevents
// wide uppercase glyphs from visually touching/overlapping the ATC code.
const DESCRIPTION_COLUMN_WIDTH = 143.5;
const DESCRIPTION_COLUMN_CLIP_X = 18.8;
const DESCRIPTION_COLUMN_CLIP_RIGHT = 173.5;
const DESCRIPTION_AVERAGE_GLYPH_FACTOR = 0.64;
const DESCRIPTION_PREFERRED_FONT_SIZE = 5.6;
const DESCRIPTION_MINIMUM_FONT_SIZE = 4.6;
const DESCRIPTION_TARGET_MAX_LINES = 4;

const wrapWordsForWidth = (text, width, fontSize) => {
  const value = cleanUpper(text);
  if (!value) return [];

  const maxChars = Math.max(1, Math.floor(width / (fontSize * DESCRIPTION_AVERAGE_GLYPH_FACTOR)));
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    // Protect against an unusually long unbroken word/code.
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }

      let remainingWord = word;
      while (remainingWord.length > maxChars) {
        lines.push(remainingWord.slice(0, maxChars));
        remainingWord = remainingWord.slice(maxChars);
      }
      current = remainingWord;
      return;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (!current || candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) lines.push(current);
  return lines;
};

const buildDescriptionLayout = (text) => {
  for (
    let fontSize = DESCRIPTION_PREFERRED_FONT_SIZE;
    fontSize >= DESCRIPTION_MINIMUM_FONT_SIZE;
    fontSize -= 0.2
  ) {
    const lines = wrapWordsForWidth(text, DESCRIPTION_COLUMN_WIDTH, fontSize);
    if (lines.length <= DESCRIPTION_TARGET_MAX_LINES) {
      return {
        lines: lines.length > 0 ? lines : [""],
        fontSize: Number(fontSize.toFixed(1)),
      };
    }
  }

  const lines = wrapWordsForWidth(
    text,
    DESCRIPTION_COLUMN_WIDTH,
    DESCRIPTION_MINIMUM_FONT_SIZE,
  );

  return {
    lines: lines.length > 0 ? lines : [""],
    fontSize: DESCRIPTION_MINIMUM_FONT_SIZE,
  };
};

/**
 * A long ATC description consumes the next physical BIR detail line(s).
 * Example: a two-line description occupies slots 1 and 2, so the following
 * ATC starts at slot 3. This also controls pagination by available form lines,
 * not merely by the number of ATC records.
 */
const paginateRowsByOccupiedLines = (rows, capacity = ROWS_PER_SECTION) => {
  const source = Array.isArray(rows) ? rows : [];
  if (source.length === 0) return [[]];

  const pages = [];
  let page = [];
  let occupiedLines = 0;

  source.forEach((row, rowIndex) => {
    const description = buildDescriptionLayout(row?.incomeDescription);
    const lineCount = Math.max(1, Math.min(description.lines.length, capacity));

    if (page.length > 0 && occupiedLines + lineCount > capacity) {
      pages.push(page);
      page = [];
      occupiedLines = 0;
    }

    page.push({
      row,
      rowIndex,
      startSlot: occupiedLines,
      lineCount,
      descriptionLines: description.lines.slice(0, capacity),
      descriptionFontSize: description.fontSize,
    });

    occupiedLines += lineCount;
  });

  if (page.length > 0) pages.push(page);
  return pages.length > 0 ? pages : [[]];
};

const expandFormPages = (forms) =>
  (Array.isArray(forms) ? forms : []).flatMap((form) => {
    const expandedPages = paginateRowsByOccupiedLines(form.expandedWithholdingDetails);
    const businessPages = paginateRowsByOccupiedLines(form.businessTaxDetails);
    const pageCount = Math.max(expandedPages.length, businessPages.length, 1);

    return Array.from({ length: pageCount }, (_, pageIndex) => {
      const expandedLayout = expandedPages[pageIndex] || [];
      const businessLayout = businessPages[pageIndex] || [];

      return {
        ...form,
        pageKey: `${form.formKey || "FORM"}|PAGE-${pageIndex + 1}`,
        pageNumber: pageIndex + 1,
        pageCount,
        expandedWithholdingDetails: expandedLayout.map((entry) => entry.row),
        businessTaxDetails: businessLayout.map((entry) => entry.row),
        expandedWithholdingLayout: expandedLayout,
        businessTaxLayout: businessLayout,
      };
    });
  });

const rowTotal = (row) =>
  toNumber(row?.month1Amount) +
  toNumber(row?.month2Amount) +
  toNumber(row?.month3Amount);

const sumRows = (rows) =>
  (Array.isArray(rows) ? rows : []).reduce(
    (total, row) => ({
      month1Amount: total.month1Amount + toNumber(row?.month1Amount),
      month2Amount: total.month2Amount + toNumber(row?.month2Amount),
      month3Amount: total.month3Amount + toNumber(row?.month3Amount),
      totalAmount: total.totalAmount + rowTotal(row),
      taxWithheld: total.taxWithheld + toNumber(row?.taxWithheld),
    }),
    { ...EMPTY_TOTALS },
  );

const formatAmount = (value) => {
  const amount = toNumber(value);
  if (!amount) return "";

  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const fitFontSize = (text, width, preferred, minimum = 4.2) => {
  const length = Math.max(String(text ?? "").length, 1);
  const estimated = width / (length * 0.57);
  return Math.max(minimum, Math.min(preferred, estimated));
};

function SvgText({
  x,
  y,
  width,
  text,
  align = "left",
  fontSize = 7.2,
  minFontSize = 4.2,
  fontWeight = 600,
  italic = false,
}) {
  if (text === null || text === undefined || String(text).trim() === "") return null;

  const value = String(text);
  const resolvedSize = fitFontSize(value, width, fontSize, minFontSize);
  const anchor = align === "right" ? "end" : align === "center" ? "middle" : "start";
  const textX =
    align === "right" ? x + width - 1 : align === "center" ? x + width / 2 : x + 1;

  return (
    <text
      x={textX}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize={resolvedSize}
      fontWeight={fontWeight}
      fontStyle={italic ? "italic" : "normal"}
      fill="#000"
    >
      {value}
    </text>
  );
}

function DigitBoxes({ value, xPositions, y, fontSize = 8.2 }) {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, xPositions.length);

  return digits.split("").map((digit, index) => (
    <text
      key={`${y}-${index}`}
      x={xPositions[index]}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize={fontSize}
      fontWeight="600"
      fill="#000"
    >
      {digit}
    </text>
  ));
}

function DescriptionLine({ x, y, text, fontSize, clipId }) {
  if (!String(text || "").trim()) return null;

  return (
    <g clipPath={clipId ? `url(#${clipId})` : undefined}>
      <text
        x={x + 1}
        y={y}
        textAnchor="start"
        dominantBaseline="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize={fontSize}
        fontWeight="600"
        fill="#000"
      >
        {text}
      </text>
    </g>
  );
}

function DetailRows({ layoutRows, yPositions, descriptionClipId }) {
  return (Array.isArray(layoutRows) ? layoutRows : []).map((entry, index) => {
    const row = entry?.row;
    const startSlot = Number(entry?.startSlot) || 0;
    const valueY = yPositions[startSlot];

    if (!row || valueY === undefined) return null;

    return (
      <g key={`detail-${entry?.rowIndex ?? index}-${startSlot}`}>
        {(entry?.descriptionLines || [row.incomeDescription]).map((line, lineIndex) => {
          const lineY = yPositions[startSlot + lineIndex];
          if (lineY === undefined) return null;

          return (
            <DescriptionLine
              key={`description-${lineIndex}`}
              x={DESCRIPTION_COLUMN_X}
              y={lineY}
              text={line}
              fontSize={entry?.descriptionFontSize || DESCRIPTION_PREFERRED_FONT_SIZE}
              clipId={descriptionClipId}
            />
          );
        })}

        <SvgText
          x={177.4}
          y={valueY}
          width={41.2}
          text={row.atcCode}
          align="center"
          fontSize={6.8}
          minFontSize={5.2}
          fontWeight={700}
        />
        <SvgText
          x={220.6}
          y={valueY}
          width={70.1}
          text={formatAmount(row.month1Amount)}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
        <SvgText
          x={292.6}
          y={valueY}
          width={72.4}
          text={formatAmount(row.month2Amount)}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
        <SvgText
          x={366.9}
          y={valueY}
          width={70.1}
          text={formatAmount(row.month3Amount)}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
        <SvgText
          x={438.9}
          y={valueY}
          width={70.1}
          text={formatAmount(rowTotal(row))}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
        <SvgText
          x={510.9}
          y={valueY}
          width={84.2}
          text={formatAmount(row.taxWithheld)}
          align="right"
          fontSize={7.0}
          minFontSize={5.4}
          fontWeight={700}
        />
      </g>
    );
  });
}

function SignatureValue({ text, y }) {
  return (
    <SvgText
      x={24}
      y={y}
      width={568}
      text={text}
      align="center"
      fontSize={8.2}
      minFontSize={5.8}
      fontWeight={600}
    />
  );
}

function DateField({ value, xPositions, y }) {
  return <DigitBoxes value={normalizeDate(value)} xPositions={xPositions} y={y} fontSize={7.2} />;
}

function BIR2307Page({ form, backgroundSrc }) {
  const descriptionClipId = `ap2307-description-clip-${String(
    form?.pageKey || "page",
  ).replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  const expandedTotals = useMemo(
    () => sumRows(form.expandedWithholdingDetails),
    [form.expandedWithholdingDetails],
  );
  const businessTotals = useMemo(
    () => sumRows(form.businessTaxDetails),
    [form.businessTaxDetails],
  );

  return (
    <div className="ap2307-paper-wrap">
      <svg
        className="ap2307-paper"
        viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
        role="img"
        aria-label={`Completed BIR Form 2307 for ${form.payee.registeredName || "payee"}`}
      >
        <defs>
          <clipPath id={descriptionClipId} clipPathUnits="userSpaceOnUse">
            <rect
              x={DESCRIPTION_COLUMN_CLIP_X}
              y="0"
              width={DESCRIPTION_COLUMN_CLIP_RIGHT - DESCRIPTION_COLUMN_CLIP_X}
              height={PAGE_HEIGHT}
            />
          </clipPath>
        </defs>

        <image href={backgroundSrc} x="0" y="0" width={PAGE_WIDTH} height={PAGE_HEIGHT} />

        <g id={`ap2307-values-${form.pageKey}`}>
          <DigitBoxes value={normalizeDate(form.periodFrom)} xPositions={DATE_FROM_X} y={114.3} />
          <DigitBoxes value={normalizeDate(form.periodTo)} xPositions={DATE_TO_X} y={113.6} />

          <DigitBoxes value={form.payee.tin} xPositions={PAYEE_TIN_X} y={146.1} />
          <SvgText
            x={34.9}
            y={173.2}
            width={556.5}
            text={form.payee.registeredName}
            fontSize={8.2}
            minFontSize={5.2}
          />
          <SvgText
            x={35.4}
            y={201.7}
            width={499.9}
            text={form.payee.registeredAddress}
            fontSize={7.9}
            minFontSize={4.8}
          />
          <DigitBoxes value={form.payee.zipCode} xPositions={PAYEE_ZIP_X} y={201.8} fontSize={7.8} />
          <SvgText
            x={35.4}
            y={230.1}
            width={554.9}
            text={form.payee.foreignAddress}
            fontSize={7.7}
            minFontSize={4.8}
          />

          <DigitBoxes value={form.payor.tin} xPositions={PAYOR_TIN_X} y={261.3} />
          <SvgText
            x={34.9}
            y={288.4}
            width={556.5}
            text={form.payor.registeredName}
            fontSize={8.2}
            minFontSize={5.2}
          />
          <SvgText
            x={35.4}
            y={316.9}
            width={499.9}
            text={form.payor.registeredAddress}
            fontSize={7.9}
            minFontSize={4.8}
          />
          <DigitBoxes value={form.payor.zipCode} xPositions={PAYOR_ZIP_X} y={317.0} fontSize={7.8} />

          <DetailRows
            layoutRows={form.expandedWithholdingLayout}
            yPositions={EXPANDED_ROW_Y}
            descriptionClipId={descriptionClipId}
          />
          <SvgText
            x={220.6}
            y={508.9}
            width={70.1}
            text={formatAmount(expandedTotals.month1Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={292.6}
            y={508.9}
            width={72.4}
            text={formatAmount(expandedTotals.month2Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={366.9}
            y={508.9}
            width={70.1}
            text={formatAmount(expandedTotals.month3Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={438.9}
            y={508.9}
            width={70.1}
            text={formatAmount(expandedTotals.totalAmount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={510.9}
            y={508.9}
            width={84.2}
            text={formatAmount(expandedTotals.taxWithheld)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />

          <DetailRows
            layoutRows={form.businessTaxLayout}
            yPositions={BUSINESS_ROW_Y}
            descriptionClipId={descriptionClipId}
          />
          <SvgText
            x={220.6}
            y={678.5}
            width={70.1}
            text={formatAmount(businessTotals.month1Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={292.6}
            y={678.5}
            width={72.4}
            text={formatAmount(businessTotals.month2Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={366.9}
            y={678.5}
            width={70.1}
            text={formatAmount(businessTotals.month3Amount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={438.9}
            y={678.5}
            width={70.1}
            text={formatAmount(businessTotals.totalAmount)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />
          <SvgText
            x={510.9}
            y={678.5}
            width={84.2}
            text={formatAmount(businessTotals.taxWithheld)}
            align="right"
            fontSize={7.1}
            minFontSize={5.5}
            fontWeight={700}
          />

          <SignatureValue
            text={form.payorSignatory?.displayText || form.payor.registeredName}
            y={744.0}
          />
          <SvgText
            x={136.2}
            y={780.1}
            width={120.6}
            text={form.payorSignatory.accreditationNo}
            align="center"
            fontSize={6.5}
          />
          <DateField
            value={form.payorSignatory.dateIssued}
            xPositions={PAYOR_ISSUE_DATE_X}
            y={780.7}
          />
          <DateField
            value={form.payorSignatory.dateExpiry}
            xPositions={PAYOR_EXPIRY_DATE_X}
            y={780.7}
          />

          <SignatureValue
            text={form.payee.registeredName || form.payeeSignatory?.printedName}
            y={821.3}
          />
          <SvgText
            x={136.2}
            y={857.4}
            width={120.6}
            text={form.payeeSignatory.accreditationNo}
            align="center"
            fontSize={6.5}
          />
          <DateField
            value={form.payeeSignatory.dateIssued}
            xPositions={PAYEE_ISSUE_DATE_X}
            y={858.0}
          />
          <DateField
            value={form.payeeSignatory.dateExpiry}
            xPositions={PAYEE_EXPIRY_DATE_X}
            y={858.0}
          />
        </g>
      </svg>
    </div>
  );
}

export default function APV2307({
  data = null,
  backgroundSrc = bir2307Page1,
  showToolbar = true,
  className = "",
}) {
  const location = useLocation();
  const printRootRef = useRef(null);
  const [apiForms, setApiForms] = useState([]);
  const [isLoading, setIsLoading] = useState(!data);
  const [errorMessage, setErrorMessage] = useState("");

  const requestParams = useMemo(() => {
    const query = new URLSearchParams(location.search);

    return {
      viewDocument: query.get("viewDocument") === "true",
      branchCode: String(query.get("branchCode") || "").trim(),
      docCode: String(query.get("docCode") || "").trim().toUpperCase(),
      tranId: String(query.get("tranId") || "").trim(),
      documentNo: String(query.get("documentNo") || "").trim(),
    };
  }, [location.search]);

  useEffect(() => {
    let isMounted = true;

    const load2307 = async () => {
      if (data) {
        setApiForms([]);
        setErrorMessage("");
        setIsLoading(false);
        return;
      }

      if (!requestParams.branchCode || !requestParams.docCode || !requestParams.tranId) {
        setApiForms([]);
        setErrorMessage(
          "Missing BIR 2307 request information. Branch, document type, and transaction ID are required.",
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await postRequest(
          "getAP2307",
          JSON.stringify({
            json_data: {
              branchCode: requestParams.branchCode,
              docCode: requestParams.docCode,
              tranId: requestParams.tranId,
              vendCode: null,
              startingCutoff: null,
              endingCutoff: null,
            },
          }),
        );

        const responseBody =
          response?.data &&
          typeof response.data === "object" &&
          !Array.isArray(response.data) &&
          Object.prototype.hasOwnProperty.call(response.data, "success")
            ? response.data
            : response;

        if (responseBody?.success === false) {
          throw new Error(responseBody?.message || "Unable to retrieve BIR 2307 data.");
        }

        const records = extract2307Records(response);
        const mappedForms = records.map(mapApiRecordTo2307);

        if (!isMounted) return;

        setApiForms(mappedForms);
        if (mappedForms.length === 0) {
          setErrorMessage("No BIR 2307 data was found for this transaction.");
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("Failed to load BIR 2307:", error);
        setApiForms([]);
        setErrorMessage(error?.message || "Unable to retrieve BIR 2307 data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load2307();

    return () => {
      isMounted = false;
    };
  }, [data, requestParams]);

  useEffect(() => {
    if (isLoading || typeof window === "undefined") return;

    const baseUrl = import.meta.env.BASE_URL || "/";
    window.history.replaceState(window.history.state, "", baseUrl);
  }, [isLoading]);

  const normalizedForms = useMemo(() => {
    if (data) {
      const source = Array.isArray(data) ? data : [data];
      return source.map((item) => normalize2307Data(item));
    }

    return apiForms;
  }, [apiForms, data]);

  const printPages = useMemo(() => expandFormPages(normalizedForms), [normalizedForms]);

  const handlePrint = () => {
    if (printPages.length === 0 || !printRootRef.current) return;

    const pageElements = Array.from(
      printRootRef.current.querySelectorAll(".ap2307-paper-wrap"),
    );

    if (pageElements.length === 0) return;

    const docLabel = requestParams.documentNo || requestParams.tranId || "TRANSACTION";
    const printTitle = `BIR_2307_${requestParams.docCode || "AP"}_${docLabel}`.replace(
      /[^A-Z0-9_-]+/gi,
      "_",
    );

    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "BIR 2307 Print");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "8.5in";
    iframe.style.height = "13in";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const printDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!printDocument) {
      iframe.remove();
      return;
    }

    const pagesHtml = pageElements.map((element) => element.outerHTML).join("");

    printDocument.open();
    printDocument.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <base href="${document.baseURI}" />
          <title>${printTitle}</title>
          <style>
            @page { size: 8.5in 13in; margin: 0; }
            * { box-sizing: border-box; }
            html, body {
              width: 8.5in;
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .ap2307-paper-wrap {
              display: block;
              position: relative;
              width: 8.5in;
              height: 13in;
              margin: 0;
              padding: 0;
              overflow: hidden;
              break-inside: avoid;
              page-break-inside: avoid;
              break-after: page;
              page-break-after: always;
            }
            .ap2307-paper-wrap:last-child {
              break-after: auto;
              page-break-after: auto;
            }
            .ap2307-paper {
              display: block;
              width: 8.5in;
              height: 13in;
              margin: 0;
              padding: 0;
              background: #fff;
              box-shadow: none;
            }
          </style>
        </head>
        <body>${pagesHtml}</body>
      </html>`);
    printDocument.close();

    const cleanup = () => {
      window.setTimeout(() => iframe.remove(), 1000);
    };

    const printAllPages = async () => {
      try {
        if (printDocument.fonts?.ready) {
          await printDocument.fonts.ready;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 700));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        cleanup();
      }
    };

    if (printDocument.readyState === "complete") {
      printAllPages();
    } else {
      iframe.onload = printAllPages;
    }
  };

  return (
    <div ref={printRootRef} className={`ap2307-root ${className}`.trim()}>
      <style>{`
        .ap2307-root {
          --ap2307-paper-width: 8.5in;
          --ap2307-paper-height: 13in;
          box-sizing: border-box;
          min-height: 100vh;
          padding: 16px;
          background: #eef1f5;
          font-family: Arial, Helvetica, sans-serif;
        }

        .ap2307-toolbar {
          position: fixed;
          top: 56px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 40;
          width: min(calc(100% - 32px), var(--ap2307-paper-width));
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid #d4d8de;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 3px 14px rgba(16, 24, 40, 0.08);
        }

        .ap2307-toolbar-placeholder {
          height: 94px;
        }

        @media (max-width: 640px) {
          .ap2307-toolbar {
            top: 72px;
            align-items: stretch;
            flex-direction: column;
          }

          .ap2307-toolbar-placeholder {
            height: 150px;
          }

          .ap2307-print-button {
            width: 100%;
          }
        }

        .ap2307-toolbar-title {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .ap2307-toolbar-title strong {
          color: #1f2937;
          font-size: 14px;
        }

        .ap2307-toolbar-title span {
          color: #667085;
          font-size: 12px;
        }

        .ap2307-print-button {
          flex: 0 0 auto;
          border: 1px solid #1d4ed8;
          border-radius: 6px;
          padding: 8px 14px;
          background: #1d4ed8;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .ap2307-print-button:hover:not(:disabled) {
          background: #1e40af;
        }

        .ap2307-print-button:disabled {
          border-color: #9ca3af;
          background: #9ca3af;
          cursor: not-allowed;
        }

        .ap2307-preview-scroll {
          width: 100%;
          overflow: auto;
          padding-bottom: 12px;
        }

        .ap2307-paper-wrap {
          width: min(100%, var(--ap2307-paper-width));
          margin: 0 auto 18px;
        }

        .ap2307-paper {
          display: block;
          width: 100%;
          height: auto;
          aspect-ratio: ${PAGE_WIDTH} / ${PAGE_HEIGHT};
          background: #fff;
          box-shadow: 0 5px 24px rgba(16, 24, 40, 0.18);
        }

        .ap2307-message {
          width: min(100%, var(--ap2307-paper-width));
          margin: 20px auto;
          padding: 18px;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #fff;
          color: #344054;
          font-size: 13px;
          text-align: center;
        }

        .ap2307-message-error {
          border-color: #f1aeb5;
          background: #fff5f5;
          color: #b42318;
        }

        @page {
          size: 8.5in 13in;
          margin: 0;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .ap2307-root,
          .ap2307-root * {
            visibility: visible !important;
          }

          .ap2307-root {
            position: static;
            width: 8.5in;
            min-height: 0;
            padding: 0;
            margin: 0;
            background: #fff;
            overflow: visible;
          }

          .ap2307-toolbar,
          .ap2307-toolbar-placeholder,
          .ap2307-message {
            display: none !important;
          }

          .ap2307-preview-scroll {
            width: 8.5in;
            padding: 0;
            margin: 0;
            overflow: visible;
          }

          .ap2307-paper-wrap {
            width: 8.5in;
            height: 13in;
            margin: 0;
            padding: 0;
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: page;
            page-break-after: always;
            overflow: hidden;
          }

          .ap2307-paper-wrap:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          .ap2307-paper {
            width: 8.5in;
            height: 13in;
            margin: 0;
            box-shadow: none;
          }
        }
      `}</style>

      {isLoading ? <LoadingSpinner /> : null}

      {showToolbar ? (
        <div className="ap2307-toolbar">
          <div className="ap2307-toolbar-title">
            <strong>BIR Form 2307 - January 2018 (ENCS)</strong>
            <span>
              {requestParams.docCode || "AP"}
              {requestParams.documentNo ? ` No. ${requestParams.documentNo}` : ""}
              {normalizedForms.length > 0
                ? ` · ${normalizedForms.length} payee form${normalizedForms.length === 1 ? "" : "s"}`
                : ""}
              {printPages.length > normalizedForms.length
                ? ` · ${printPages.length} printable pages`
                : ""}
            </span>
          </div>

          <button
            type="button"
            className="ap2307-print-button"
            onClick={handlePrint}
            disabled={isLoading || printPages.length === 0}
          >
            Print / Save PDF
          </button>
        </div>
      ) : null}
      {showToolbar ? <div className="ap2307-toolbar-placeholder" aria-hidden="true" /> : null}

      {!isLoading && errorMessage ? (
        <div className="ap2307-message ap2307-message-error">{errorMessage}</div>
      ) : null}

      {!isLoading && !errorMessage && printPages.length === 0 ? (
        <div className="ap2307-message">No BIR 2307 form is available.</div>
      ) : null}

      <div className="ap2307-preview-scroll">
        {printPages.map((form) => (
          <BIR2307Page key={form.pageKey} form={form} backgroundSrc={backgroundSrc} />
        ))}
      </div>
    </div>
  );
}
