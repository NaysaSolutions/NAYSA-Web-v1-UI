// src/NAYSA Cloud/Master Data/FAMasterData/FAMast_DataTab.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faUndo, faTimes, faDesktop } from "@fortawesome/free-solid-svg-icons";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";

// -------------------- Helpers --------------------
const pick = (obj, keys = []) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== null && val !== undefined && String(val).trim() !== "") return val;
  }
  return "";
};

const FAMast_DataTab = ({
  isLoading = false,
  rows = [],
  onFilter,
  onReset,
  onRowDoubleClick,
  userCode = "",
}) => {
  const docType = "FAMastLookup";

  // Search state
  const [searchTerm, setSearchTerm]   = useState("");
  const [searchMode, setSearchMode]   = useState("part"); // default "Contains"

  // ── Column definitions from hs_colconfig / selectedData.js ────────────────
  const fallbackColumns = useMemo(() => [
    { key: "faCode",            label: "FA Code",           classNames: "text-left",  renderType: "text" },
    { key: "faName",            label: "Asset Name",        classNames: "text-left",  renderType: "text" },
    { key: "categCode",         label: "Category Code",     classNames: "text-left",  renderType: "text" },
    { key: "categName",         label: "Category Name",     classNames: "text-left",  renderType: "text" },
    { key: "classCode",         label: "Sub Category Code",        classNames: "text-left",  renderType: "text" },
    { key: "className",         label: "Sub Category Name",        classNames: "text-left",  renderType: "text" },
    { key: "flocCode",          label: "Location Code",     classNames: "text-left",  renderType: "text" },
    { key: "flocName",          label: "Location Name",     classNames: "text-left",  renderType: "text" },
    { key: "serialNo",          label: "Serial No",         classNames: "text-left",  renderType: "text" },
    { key: "modelNo",           label: "Model No",          classNames: "text-left",  renderType: "text" },
    { key: "tagNo",             label: "Tag No",            classNames: "text-left",  renderType: "text" },
    { key: "rcCode",            label: "RC Code",           classNames: "text-left",  renderType: "text" },
    { key: "rcName",            label: "RC Name",           classNames: "text-left",  renderType: "text" },
    { key: "empNo",             label: "Employee No",       classNames: "text-left",  renderType: "text" },
    { key: "empName",           label: "Employee Name",     classNames: "text-left",  renderType: "text" },
    { key: "acqDate",           label: "Acquisition Date",  classNames: "text-left",  renderType: "date",   renderFormat: "MM/DD/YYYY" },
    { key: "acqCost",           label: "Acquisition Cost",  classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "accumDepr",         label: "Accum Depr",        classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "deprMonth",         label: "Monthly Depr",      classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "nbValue",           label: "Net Book Value",    classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "salvageValue",      label: "Salvage Value",     classNames: "text-right", renderType: "number", renderFormat: "2" },
    { key: "faStatus",          label: "Status",            classNames: "text-left",  renderType: "text" },
    { key: "warrantyStartDate", label: "Warranty Start",    classNames: "text-left",  renderType: "date",   renderFormat: "MM/DD/YYYY" },
    { key: "warrantyExpiry",    label: "Warranty Expiry",   classNames: "text-left",  renderType: "date",   renderFormat: "MM/DD/YYYY" },
    { key: "lockedTranCode",    label: "Locked Tran Code",  classNames: "text-left",  renderType: "text", hidden: true },
    { key: "lockedTranId",      label: "Locked Tran ID",    classNames: "text-left",  renderType: "text", hidden: true },
    { key: "lockedTranNo",      label: "Locked Tran No",    classNames: "text-left",  renderType: "text", hidden: true },
    { key: "lockedTranDate",    label: "Locked Tran Date",  classNames: "text-left",  renderType: "date", renderFormat: "MM/DD/YYYY", hidden: true },
    { key: "lockedBy",          label: "Locked By",         classNames: "text-left",  renderType: "text", hidden: true },
    { key: "lockedDate",        label: "Locked Date",       classNames: "text-left",  renderType: "date", renderFormat: "MM/DD/YYYY", hidden: true },
  ], []);

  const [selectedColumns, setSelectedColumns] = useState([]);

  useEffect(() => {
    let alive = true;

    const loadColumns = async () => {
      const config = await useSelectedHSColConfig(docType, userCode || "", "");

      if (!alive) return;

      const mapped = Array.isArray(config)
        ? config.map((c) => ({
            key: c.key,
            label: c.label,
            classNames: c.classNames || "text-left",
            hidden: String(c.hidden ?? "0") === "1" || c.hidden === true,
            renderType: c.renderType || "text",
            renderFormat: c.renderFormat ?? null,
            sortable: true,
          }))
        : [];

      setSelectedColumns(mapped.length ? mapped : fallbackColumns);
    };

    loadColumns();

    return () => {
      alive = false;
    };
  }, [docType, userCode, fallbackColumns]);

  const tableColumns = useMemo(() => {
    return (selectedColumns.length ? selectedColumns : fallbackColumns).map((c) => ({
      ...c,
      width:
        c.hidden ? 0 :
        c.key === "faName" ? 240 :
        c.key?.toLowerCase?.().includes("name") ? 180 :
        c.renderType === "number" ? 140 :
        c.renderType === "date" ? 140 :
        120,
    }));
  }, [selectedColumns, fallbackColumns]);

  const handleLoad = useCallback(() => {
    if (typeof onFilter === "function") {
      onFilter({ search: searchTerm, searchMode });
    }
  }, [onFilter, searchTerm, searchMode]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    onReset?.();
  }, [onReset]);

  // ── DATA MAPPING ─────────────────────────────────────────────────────────────
  //  Accepts both raw snake_case SQL columns and camelCase sproc aliases.
  //  SQL columns: fa_code, fa_name, categ_code, class_code, floc_code,
  //  serial_no, model_no, tag_no, rc_code, emp_no, emp_name,
  //  acq_date, acq_cost, accum_depr, depr_month, nb_value, salvage_value,
  //  fa_status, warranty_start_date, warranty_expiry_date,
  //  locked_tran_code, locked_tran_id, locked_tran_no, locked_tran_date,
  //  locked_by, locked_date  (+ joined name columns from sproc)
  const tableDataRaw = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((r) => ({
      ...r,
      faCode:            pick(r, ["fa_code",              "FA_CODE",              "faCode"            ]),
      faName:            pick(r, ["fa_name",              "FA_NAME",              "faName"            ]),
      categCode:         pick(r, ["categ_code",           "CATEG_CODE",           "categCode"         ]),
      categName:         pick(r, ["categ_name",           "CATEG_NAME",           "categName"         ]),
      classCode:         pick(r, ["class_code",           "CLASS_CODE",           "classCode"         ]),
      className:         pick(r, ["class_name",           "CLASS_NAME",           "className"         ]),
      flocCode:          pick(r, ["floc_code",            "FLOC_CODE",            "flocCode"          ]),
      flocName:          pick(r, ["floc_name",            "FLOC_NAME",            "flocName"          ]),
      serialNo:          pick(r, ["serial_no",            "SERIAL_NO",            "serialNo"          ]),
      modelNo:           pick(r, ["model_no",             "MODEL_NO",             "modelNo"           ]),
      tagNo:             pick(r, ["tag_no",               "TAG_NO",               "tagNo"             ]),
      rcCode:            pick(r, ["rc_code",              "RC_CODE",              "rcCode"            ]),
      rcName:            pick(r, ["rc_name",              "RC_NAME",              "rcName"            ]),
      empNo:             pick(r, ["emp_no",               "EMP_NO",               "empNo"             ]),
      empName:           pick(r, ["emp_name",             "EMP_NAME",             "empName"           ]),
      acqDate:           pick(r, ["acq_date",             "ACQ_DATE",             "acqDate"           ]),
      acqCost:           pick(r, ["acq_cost",             "ACQ_COST",             "acqCost"           ]),
      accumDepr:         pick(r, ["accum_depr",           "ACCUM_DEPR",           "accumDepr"         ]),
      deprMonth:         pick(r, ["depr_month",           "DEPR_MONTH",           "deprMonth"         ]),
      nbValue:           pick(r, ["nb_value",             "NB_VALUE",             "nbValue"           ]),
      salvageValue:      pick(r, ["salvage_value",        "SALVAGE_VALUE",        "salvageValue"      ]),
      faStatus:          pick(r, ["fa_status",            "FA_STATUS",            "faStatus"          ]),
      warrantyStartDate: pick(r, ["warranty_start_date",  "WARRANTY_START_DATE",  "warrantyStartDate", "warrantyStart" ]),
      warrantyExpiry:    pick(r, ["warranty_expiry_date", "WARRANTY_EXPIRY_DATE", "warrantyExpiryDate","warrantyExpiry"]),
      // lock fields (hidden, passed through for parent consumption)
      lockedTranCode:    pick(r, ["locked_tran_code",     "LOCKED_TRAN_CODE",     "lockedTranCode"    ]),
      lockedTranId:      pick(r, ["locked_tran_id",       "LOCKED_TRAN_ID",       "lockedTranId"      ]),
      lockedTranNo:      pick(r, ["locked_tran_no",       "LOCKED_TRAN_NO",       "lockedTranNo"      ]),
      lockedTranDate:    pick(r, ["locked_tran_date",     "LOCKED_TRAN_DATE",     "lockedTranDate"    ]),
      lockedBy:          pick(r, ["locked_by",            "LOCKED_BY",            "lockedBy"          ]),
      lockedDate:        pick(r, ["locked_date",          "LOCKED_DATE",          "lockedDate"        ]),
    }));
  }, [rows]);

  // ── SEARCH LOGIC ─────────────────────────────────────────────────────────────
  const tableDataFiltered = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return tableDataRaw;

    // Only search visible columns (skip hidden lock fields)
    const visibleKeys = tableColumns
      .filter((c) => !c.hidden)
      .map((c) => c.key);

    return tableDataRaw.filter((r) =>
      visibleKeys.some((k) => {
        const cell = String(r?.[k] || "").toLowerCase();
        return searchMode === "start" ? cell.startsWith(q) : cell.includes(q);
      })
    );
  }, [tableDataRaw, searchTerm, searchMode, tableColumns]);

  // ── PERFORMANCE SLICER: cap at 100 rows ──────────────────────────────────────
  const tableData = useMemo(() => tableDataFiltered.slice(0, 100), [tableDataFiltered]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">

        {/* Search input with clear button */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faDesktop} />
          </span>
          <input
            type="text"
            placeholder="Search FA Code or Asset Name..."
            className="block w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        {/* Search mode toggles */}
        <div className="flex items-center gap-3 px-3 border-l border-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value="start"
              checked={searchMode === "start"}
              onChange={(e) => setSearchMode(e.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Starts with</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value="part"
              checked={searchMode === "part"}
              onChange={(e) => setSearchMode(e.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Contains</span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {tableDataFiltered.length > 100 && (
            <span className="text-[11px] text-red-500 font-bold mr-2 animate-pulse uppercase tracking-wider">
              Showing top 100 of {tableDataFiltered.length} records
            </span>
          )}

          <button
            type="button"
            onClick={handleLoad}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
            title="Load Records"
          >
            <FontAwesomeIcon icon={faFilter} className="mr-2" />
            Load Records
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
            title="Reset"
          >
            <FontAwesomeIcon icon={faUndo} className="mr-2" />
            Reset
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <SearchGlobalReferenceTable
        columns={tableColumns}
        data={tableData}
        itemsPerPage={50}
        showFilters
        rightActionLabel="View"
        docType={docType}
        onRowDoubleClick={onRowDoubleClick}
      />
    </div>
  );
};

export default FAMast_DataTab;