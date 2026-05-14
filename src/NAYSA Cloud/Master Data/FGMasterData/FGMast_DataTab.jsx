import React, { useMemo, useState, useCallback, useEffect } from "react";
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

const toSnake = (s) => String(s || "").replace(/[A-Z]/g, (m) => `_${m}`).toLowerCase();

const pickAnyCase = (row, key) => {
  const k = String(key || "");
  return pick(row, [k, k.toLowerCase(), k.toUpperCase(), toSnake(k), toSnake(k).toUpperCase()]);
};

const FGMast_DataTab = ({ 
  isLoading = false,
  rows = [], 
  onFilter,
  onReset,
  onRowDoubleClick 
}) => {
  const docType = "FGMast";

  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("part"); 

  const tableColumns = useMemo(() => [
    { key: "itemCode", label: "Item No", sortable: true, width: 140 },
    { key: "itemDesc", label: "Item Description", sortable: true, width: 300 },
    { key: "uom", label: "UOM", sortable: true, width: 100 },
    { key: "categoryCode", label: "Category", sortable: true, width: 120 },
    { key: "classCode", label: "Classification", sortable: true, width: 150 },
    { key: "active", label: "Active", sortable: true, width: 90 },
  ], []);

  const handleLoad = useCallback(() => {
    onFilter?.();
  }, [onFilter]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    onReset?.();
  }, [onReset]);

  // 1. DATA MAPPING
  const tableDataRaw = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((r) => ({
      ...r,
      itemCode: pickAnyCase(r, "itemCode") || pick(r, ["ITEM_CODE", "item_code"]),
      itemDesc: pickAnyCase(r, "itemName") || pickAnyCase(r, "itemDesc") || pick(r, ["ITEM_NAME", "item_name"]),
      uom: pickAnyCase(r, "uomCode") || pickAnyCase(r, "uom") || pick(r, ["UOM_CODE", "uom_code"]),
      categoryCode: pickAnyCase(r, "categCode") || pickAnyCase(r, "categoryCode") || pick(r, ["CATEG_CODE", "categ_code"]),
      classCode: pickAnyCase(r, "classCode") || pick(r, ["CLASS_CODE", "class_code"]),
      active: pickAnyCase(r, "active") || pick(r, ["ACTIVE", "active"]),
    }));
  }, [rows]);

  // 2. SEARCH LOGIC
  const tableDataFiltered = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();
    if (!q) return tableDataRaw;

    const keysToSearch = tableColumns.map(c => c.key);
    
    return tableDataRaw.filter(r => keysToSearch.some(k => {
      const cell = String(r?.[k] || "").toLowerCase();
      return searchMode === "start" ? cell.startsWith(q) : cell.includes(q);
    }));
  }, [tableDataRaw, searchTerm, searchMode, tableColumns]);

  // 3. PERFORMANCE SLICER
  const tableData = useMemo(() => {
    return tableDataFiltered.slice(0, 100);
  }, [tableDataFiltered]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">
        
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faBoxOpen} />
          </span>
          <input
            type="text"
            placeholder="Search FG Item Name or No..."
            className="block w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500 transition-colors">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 px-3 border-l border-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" value="start" checked={searchMode === "start"} onChange={(e) => setSearchMode(e.target.value)} className="accent-blue-600" />
            <span className="text-xs text-gray-700">Starts with</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" value="part" checked={searchMode === "part"} onChange={(e) => setSearchMode(e.target.value)} className="accent-blue-600" />
            <span className="text-xs text-gray-700">Contains</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {tableDataFiltered.length > 100 && (
             <span className="text-[11px] text-red-500 font-bold mr-2 animate-pulse uppercase tracking-wider">
                Showing top 100 of {tableDataFiltered.length} records
             </span>
          )}

          <button onClick={handleLoad} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors">
            <FontAwesomeIcon icon={faFilter} className="mr-2" /> Load Records
          </button>

          <button onClick={handleReset} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors">
            <FontAwesomeIcon icon={faUndo} className="mr-2" /> Reset
          </button>
        </div>
      </div>

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

export default FGMast_DataTab;