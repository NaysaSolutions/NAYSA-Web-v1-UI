// src/NAYSA Cloud/Master Data/RMMasterData/RMMast_DataTab.jsx
import React, { useMemo, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faUndo, faTimes, faBoxOpen } from "@fortawesome/free-solid-svg-icons";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

// -------------------- Helpers --------------------
const pick = (obj, keys = []) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== null && val !== undefined && String(val).trim() !== "") return val;
  }
  return "";
};


const RMMast_DataTab = ({
  isLoading = false,
  rows = [],
  onFilter,
  onReset,
  onRowDoubleClick,
}) => {
  const docType = "RMMast";

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("part"); // default to "Contains"

  const tableColumns = useMemo(() => [
    { key: "itemCode",        label: "RM No",                sortable: true, width: 130 },
    { key: "itemDesc",        label: "RM Description",       sortable: true, width: 260 },
    { key: "itemDesc2",       label: "Description 2",        sortable: true, width: 200 },
    { key: "uom",             label: "UOM",                  sortable: true, width: 80  },
    { key: "uom2",            label: "UOM2",                 sortable: true, width: 80  },
    { key: "qtyPerUom2",      label: "Qty Per UOM2",         sortable: true, width: 110 },
    { key: "qtyOnHand",       label: "Qty on Hand",          sortable: true, width: 110 },
    { key: "qtyOrder",        label: "Qty on Order",         sortable: true, width: 110 },
    { key: "qtyAvail",        label: "Qty Available",        sortable: true, width: 110 },
    { key: "lastPurPrice",    label: "Last Purchase Price",  sortable: true, width: 140 },
    { key: "reOrderLevel",    label: "Re-Order Level",       sortable: true, width: 110 },
    { key: "categoryCode",    label: "Category Code",        sortable: true, width: 120 },
    { key: "categoryName",    label: "Category Name",        sortable: true, width: 180 },
    { key: "classCode",       label: "Class Code",           sortable: true, width: 110 },
    { key: "className",       label: "Class Name",           sortable: true, width: 160 },
    { key: "subClass1Code",   label: "Sub Class 1",          sortable: true, width: 120 },
    { key: "subClass2Code",   label: "Sub Class 2",          sortable: true, width: 120 },
    { key: "subClass3Code",   label: "Sub Class 3",          sortable: true, width: 120 },
    { key: "planType",        label: "Plan Type",            sortable: true, width: 120 },
    { key: "mrpFlag",         label: "MRP",                  sortable: true, width: 70  },
    { key: "active",          label: "Active",               sortable: true, width: 80  },
    { key: "inUse",           label: "In Use",               sortable: true, width: 80  },
  ], []);

  const handleLoad = useCallback(() => {
    if (typeof onFilter === "function") onFilter();
  }, [onFilter]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    onReset?.();
  }, [onReset]);

  // 1. DATA MAPPING: Format raw SQL rows into standard React camelCase properties.
  //    Load mode returns rm.* (raw snake_case) + categoryName + className from joins.
  //    Exact SQL columns: rm_code, rm_name, rm2_name, rmuom_code, rmuom2_code,
  //    rmuom2_qty, qty_onhand, qty_order, qty_avail, lastpur_price, reorder_qty,
  //    rmcateg_code, rmclass_code, rmsubclass1_code, rmsubclass2_code,
  //    rmsubclass3_code, plan_type, mrp_flag, rm_stat, in_use
  const tableDataRaw = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((r) => ({
      ...r,
      itemCode:      pick(r, ["rm_code",         "RM_CODE",        "rmCode",       "itemCode"]),
      itemDesc:      pick(r, ["rm_name",          "RM_NAME",        "rmName",       "itemDesc"]),
      itemDesc2:     pick(r, ["rm2_name",         "RM2_NAME",       "rm2Name",      "itemDesc2"]),
      uom:           pick(r, ["rmuom_code",       "RMUOM_CODE",     "rmuomCode",    "uom"]),
      uom2:          pick(r, ["rmuom2_code",      "RMUOM2_CODE",    "rmuom2Code",   "uom2"]),
      qtyPerUom2:    pick(r, ["rmuom2_qty",       "RMUOM2_QTY",     "rmuom2Qty",    "qtyPerUom2"]),
      qtyOnHand:     pick(r, ["qty_onhand",       "QTY_ONHAND",     "qtyOnhand",    "qtyOnHand"]),
      qtyOrder:      pick(r, ["qty_order",        "QTY_ORDER",      "qtyOrder"]),
      qtyAvail:      pick(r, ["qty_avail",        "QTY_AVAIL",      "qtyAvail"]),
      lastPurPrice:  pick(r, ["lastpur_price",    "LASTPUR_PRICE",  "lastpurPrice", "lastPurPrice"]),
      reOrderLevel:  pick(r, ["reorder_qty",      "REORDER_QTY",    "reorderQty",   "reOrderLevel"]),
      categoryCode:  pick(r, ["rmcateg_code",     "RMCATEG_CODE",   "rmcategCode",  "categoryCode"]),
      categoryName:  pick(r, ["categoryName",     "categoryname",   "categ_name",   "CATEG_NAME",  "categName"]),
      classCode:     pick(r, ["rmclass_code",     "RMCLASS_CODE",   "rmclassCode",  "classCode"]),
      className:     pick(r, ["className",        "classname",      "class_name",   "CLASS_NAME"]),
      subClass1Code: pick(r, ["rmsubclass1_code", "RMSUBCLASS1_CODE","rmsubclass1Code","subClass1Code"]),
      subClass2Code: pick(r, ["rmsubclass2_code", "RMSUBCLASS2_CODE","rmsubclass2Code","subClass2Code"]),
      subClass3Code: pick(r, ["rmsubclass3_code", "RMSUBCLASS3_CODE","rmsubclass3Code","subClass3Code"]),
      planType:      pick(r, ["plan_type",        "PLAN_TYPE",      "planType"]),
      mrpFlag:       pick(r, ["mrp_flag",         "MRP_FLAG",       "mrpFlag"]),
      active:        pick(r, ["rm_stat",          "RM_STAT",        "rmStat",       "active"]),
      inUse:         pick(r, ["in_use",           "IN_USE",         "inUse"]),
    }));
  }, [rows]);

  // 2. SEARCH LOGIC
  const tableDataFiltered = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return tableDataRaw;

    const keysToSearch = tableColumns.map((c) => c.key);

    return tableDataRaw.filter((r) =>
      keysToSearch.some((k) => {
        const cell = String(r?.[k] || "").toLowerCase();
        return searchMode === "start" ? cell.startsWith(q) : cell.includes(q);
      })
    );
  }, [tableDataRaw, searchTerm, searchMode, tableColumns]);

  // 3. PERFORMANCE SLICER: Caps rendering at 100 rows to prevent freezing
  const tableData = useMemo(() => tableDataFiltered.slice(0, 100), [tableDataFiltered]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">

        {/* Search Input with Clear Button */}
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faBoxOpen} />
          </span>
          <input
            type="text"
            placeholder="Search RM Name or No..."
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

        {/* Search Modes */}
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

        {/* Buttons */}
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

      {/* Table */}
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

export default RMMast_DataTab;