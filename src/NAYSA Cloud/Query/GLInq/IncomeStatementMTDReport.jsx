import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";

const FIXED_COLUMNS = [
  {
    key: "fsCode",
    label: "FS Code",
    minWidth: 100,
    maxWidth: 100,
  },
  {
    key: "fsName",
    label: "Description",
    minWidth: 240,
    maxWidth: 240,
  },
];

const safeArray = (value) => (Array.isArray(value) ? value : []);

const TOTAL_COLUMN = {
  key: "totalAmount",
  label: "Total",
  renderType: "currency",
  roundingOff: 2,
  minWidth: 145,
  maxWidth: 190,
};

const REPORT_VIEWS = [
  ["perMonth", "Per Month MTD"],
  ["perMonthYTD", "Per Month YTD"],
  ["perRC", "Per RC MTD"],
  ["perRCYTD", "Per RC YTD"],
];

const ReportViewTabs = ({ activeView, onChange, className = "" }) => (
  <div className={`grid grid-cols-2 gap-1.5 sm:grid-cols-4 ${className}`}>
    {REPORT_VIEWS.map(([key, label]) => (
      <button
        key={key}
        type="button"
        onClick={() => onChange?.(key)}
        className={`w-[108px] rounded-md px-2 py-2 text-xs font-medium transition-colors sm:w-[116px] ${
          activeView === key
            ? "bg-blue-600 text-white shadow-sm hover:opacity-90"
            : "border border-slate-200 bg-white text-slate-600 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const parseResultBlock = (response) => {
  const result = response?.data?.[0]?.result;
  if (!result) return {};

  const parsed = typeof result === "string" ? JSON.parse(result) : result;
  return Array.isArray(parsed) ? parsed[0] || {} : parsed || {};
};

const createAmountColumns = (dimensions, type) =>
  safeArray(dimensions).map((dimension) => ({
    key: `amount_${dimension.key}`,
    label:
      type === "rc"
        ? dimension.key
          ? `${dimension.key} - ${dimension.label || dimension.key}`
          : dimension.label || "Unassigned"
        : String(dimension.label || dimension.key || "").toUpperCase(),
    renderType: "currency",
    roundingOff: 2,
    minWidth: 135,
    maxWidth: 190,
  }));

const pivotRows = (sourceRows, dimensions) => {
  const rowsByFsCode = new Map();

  safeArray(sourceRows).forEach((source) => {
    const fsCode = String(source?.fsCode ?? "");
    if (!rowsByFsCode.has(fsCode)) {
      rowsByFsCode.set(fsCode, {
        fsCode,
        fsName: String(source?.fsName ?? "").replace(/\t/g, "    "),
        bottomLine: source?.bottomLine || "",
      });
    }

    rowsByFsCode.get(fsCode)[`amount_${source?.dimensionKey}`] =
      Number(source?.amount) || 0;
  });

  const dimensionKeys = safeArray(dimensions).map(
    (dimension) => `amount_${dimension.key}`,
  );

  return Array.from(rowsByFsCode.values()).map((row) => {
    dimensionKeys.forEach((key) => {
      if (!(key in row)) row[key] = 0;
    });
    row.totalAmount = dimensionKeys.reduce(
      (total, key) => total + (Number(row[key]) || 0),
      0,
    );
    return row;
  });
};

const parseIncomeStatementMTDResponse = (response) => {
  const block = parseResultBlock(response);
  const monthDimensions = safeArray(block.monthColumns);
  const rcDimensions = safeArray(block.rcColumns);

  const perMonth = {
    columns: [
      ...FIXED_COLUMNS,
      ...createAmountColumns(monthDimensions, "month"),
      TOTAL_COLUMN,
    ],
    rows: pivotRows(block.perMonth, monthDimensions),
  };
  const perMonthYTD = {
    columns: [...FIXED_COLUMNS, ...createAmountColumns(monthDimensions, "month")],
    rows: pivotRows(block.perMonthYTD, monthDimensions),
  };
  const perRC = {
    columns: [
      ...FIXED_COLUMNS,
      ...createAmountColumns(rcDimensions, "rc"),
      TOTAL_COLUMN,
    ],
    rows: pivotRows(block.perRC, rcDimensions),
  };
  const perRCYTD = {
    columns: [...FIXED_COLUMNS, ...createAmountColumns(rcDimensions, "rc")],
    rows: pivotRows(block.perRCYTD, rcDimensions),
  };

  return {
    cols: perMonth.columns,
    rows: perMonth.rows,
    reportData: { perMonth, perMonthYTD, perRC, perRCYTD },
  };
};

function IncomeStatementMTDReport({
  view,
  tabConfig,
  SearchGlobalReportTable,
  NoRecordsState,
  activeView = "perMonth",
  onActiveViewChange,
}) {
  const reportViews = useMemo(
    () =>
      view?.reportData || {
        perMonth: { columns: [], rows: [] },
        perMonthYTD: { columns: [], rows: [] },
        perRC: { columns: [], rows: [] },
        perRCYTD: { columns: [], rows: [] },
      },
    [view?.reportData],
  );

  if (!view.hasLoaded) {
    return (
      <div className="p-8 text-sm text-gray-500 flex items-center gap-2">
        <FontAwesomeIcon icon={faCalendarDay} className="text-blue-300" />
        <span>
          Click <b>Filter</b> then <b>Apply Filters</b> to load <b>{tabConfig.label}</b>.
        </span>
      </div>
    );
  }

  if (view.isEmpty) {
    return (
      <NoRecordsState
        title="No records found"
        subtitle={view.emptyMessage || "Try adjusting your filters."}
        hint={`Report: ${tabConfig.label}`}
      />
    );
  }

  const selectedView = reportViews[activeView] || {
    columns: [],
    rows: [],
  };

  return (
    <div className="income-statement-mtd-scope relative flex min-h-0 flex-1 flex-col">
      <style>{`
        .income-statement-mtd-table {
          background: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        .income-statement-mtd-table > .global-tran-table-main-sub-div-ui {
          background: white !important;
          border-left: 0 !important;
          border-right: 0 !important;
          border-bottom: 0 !important;
          border-radius: 0 !important;
        }

        .income-statement-mtd-table table {
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }

        @media (min-width: 769px) {
          .income-statement-mtd-table .global-tran-table-main-sub-div-ui > div.relative.isolate.flex-1.h-0::before {
            content: "";
            position: sticky;
            left: 0;
            top: 0;
            z-index: 100;
            display: block;
            width: 340px;
            min-width: 340px;
            height: 31px;
            margin-bottom: -31px;
            box-sizing: border-box;
            padding: 0;
            overflow: hidden;
            white-space: pre;
            background-color: rgb(219 234 254);
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='340' height='31'%3E%3Ctext x='12' y='20' font-family='Arial,sans-serif' font-size='11' font-weight='700' fill='%231e40af'%3EFS Code%3C/text%3E%3Ctext x='108' y='20' font-family='Arial,sans-serif' font-size='11' font-weight='700' fill='%231e40af'%3EDescription%3C/text%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: left top;
            border-bottom: 1px solid rgb(191 219 254);
            box-shadow: 3px 0 4px -3px rgb(15 23 42 / 35%);
            pointer-events: none;
          }

          .income-statement-mtd-table table thead {
            position: static !important;
          }

          .income-statement-mtd-table table thead tr:first-child > th {
            position: sticky !important;
            top: 0 !important;
            z-index: 21 !important;
            background: rgb(219 234 254) !important;
            background-clip: padding-box !important;
          }

          .income-statement-mtd-table table thead tr:nth-child(2) > th {
            position: sticky !important;
            top: 31px !important;
            z-index: 20 !important;
            background: rgb(243 244 246) !important;
            background-clip: padding-box !important;
          }

          .income-statement-mtd-table table thead tr > :nth-child(1) {
            left: 0 !important;
            z-index: 62 !important;
            background-color: rgb(219 234 254) !important;
            width: 100px !important;
            min-width: 100px !important;
            max-width: 100px !important;
            transform: translateZ(0);
          }

          .income-statement-mtd-table table thead tr > :nth-child(2) {
            left: 100px !important;
            z-index: 61 !important;
            background-color: rgb(219 234 254) !important;
            box-shadow: 3px 0 4px -3px rgb(15 23 42 / 35%);
            width: 240px !important;
            min-width: 240px !important;
            max-width: 240px !important;
            transform: translateZ(0);
          }

          .income-statement-mtd-table table thead tr:nth-child(2) > :nth-child(-n+2) {
            background-color: rgb(243 244 246) !important;
            z-index: 120 !important;
            transform: translateZ(0);
          }

          .income-statement-mtd-table table thead tr > :nth-child(n+3) {
            left: auto !important;
            right: auto !important;
            z-index: 10 !important;
          }

          .income-statement-mtd-table table tbody tr > :nth-child(1) {
            position: sticky !important;
            left: 0 !important;
            z-index: 18 !important;
            width: 100px !important;
            min-width: 100px !important;
            max-width: 100px !important;
          }

          .income-statement-mtd-table table tbody tr > :nth-child(2) {
            position: sticky !important;
            left: 100px !important;
            z-index: 17 !important;
            width: 240px !important;
            min-width: 240px !important;
            max-width: 240px !important;
          }

          .income-statement-mtd-table table tbody tr > :nth-child(-n+2) {
            background: white;
          }

          .income-statement-mtd-table table tbody tr > td {
            border-bottom: 1px solid rgb(229 231 235) !important;
          }

          .income-statement-mtd-table table tbody tr:last-child > td {
            position: sticky !important;
            bottom: 0 !important;
            z-index: 7;
            background: rgb(239 246 255);
            font-weight: 700;
            box-shadow: 0 -3px 6px rgb(15 23 42 / 12%);
          }

          .income-statement-mtd-table table tbody tr:last-child > :nth-child(1) {
            left: 0 !important;
            z-index: 20 !important;
            background: rgb(239 246 255);
          }

          .income-statement-mtd-table table tbody tr:last-child > :nth-child(2) {
            left: 100px !important;
            z-index: 19 !important;
            background: rgb(239 246 255);
          }
        }
      `}</style>

      <ReportViewTabs
        activeView={activeView}
        onChange={onActiveViewChange}
        className="mb-2 xl:hidden"
      />
      <ReportViewTabs
        activeView={activeView}
        onChange={onActiveViewChange}
        className="absolute left-2 top-2 z-30 hidden xl:grid"
      />

      {selectedView.rows.length === 0 ? (
        <NoRecordsState
          title={`No ${activeView.startsWith("perMonth") ? "monthly" : "RC"} records found`}
          subtitle="Try adjusting the selected filters."
          hint={`Report: ${tabConfig.label}`}
        />
      ) : (
        <div className="min-h-0 flex-1">
          <SearchGlobalReportTable
            key={`isMTD-${activeView}-${view.loadedAt || "idle"}`}
            columns={selectedView.columns}
            data={selectedView.rows}
            itemsPerPage={50}
            showGroupBy={false}
            rightActionLabel={null}
            className="income-statement-mtd-table"
            totalExemptions={selectedView.columns
              .filter(
                (column) =>
                  column.renderType === "number" ||
                  column.renderType === "currency",
              )
              .map((column) => String(column.key).toLowerCase())}
            docType={`Income Statement - ${
              activeView === "perMonth"
                ? "Per Month MTD"
                : activeView === "perMonthYTD"
                  ? "Per Month YTD"
                  : activeView === "perRC"
                    ? "Per RC MTD"
                    : "Per RC YTD"
            }`}
          />
        </div>
      )}
    </div>
  );
}

IncomeStatementMTDReport.meta = {
  key: "isMTD",
  label: "Income Statement (MTD)",
  icon: faCalendarDay,
  filters: [
    "Branch",
    "Start Cut Off",
    "End Cut Off",
    "Starting RC",
    "Ending RC",
    "Currency",
  ],
  endpoint: "getGLINQ_IncomeStmtMTD",
  dynamicColumns: true,
};

IncomeStatementMTDReport.buildPayload = (f) => ({
  branchCode: f.branchCode || "",
  cutoffStart: f.cutoffStartCode || "",
  cutoffEnd: f.cutoffEndCode || "",
  rcCodeStart: f.rcCodeStart || "",
  rcCodeEnd: f.rcCodeEnd || "",
  currCode: f.currCode || "PHP",
});

IncomeStatementMTDReport.buildJsonData = (payload) => ({
  branchCode: payload.branchCode || "",
  cutoffStart: payload.cutoffStart || "",
  cutoffEnd: payload.cutoffEnd || "",
  rcCodeStart: payload.rcCodeStart || "",
  rcCodeEnd: payload.rcCodeEnd || "",
  currCode: payload.currCode || "PHP",
});

IncomeStatementMTDReport.parseResponse = parseIncomeStatementMTDResponse;

export default IncomeStatementMTDReport;
