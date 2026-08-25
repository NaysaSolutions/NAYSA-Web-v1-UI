import React, { useCallback, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxOpen, faFilter, faTimes, faUndo } from "@fortawesome/free-solid-svg-icons";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const pick = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return "";
};

const VEMast_DataTab = ({
  isLoading = false,
  rows = [],
  onFilter,
  onReset,
  onRowDoubleClick,
}) => {
  const docType = "VEMast";
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("part");
  const [vehicleMake, setVehicleMake] = useState("");

  const tableColumns = useMemo(
    () => [
      { key: "itemCode", label: "Vehicle No", sortable: true, width: 140 },
      { key: "itemDesc", label: "Vehicle Description", sortable: true, width: 260 },
      { key: "vehicleMake", label: "Vehicle Make", sortable: true, width: 130 },
      { key: "uom", label: "UOM", sortable: true, width: 90 },
      { key: "categoryCode", label: "Category Code", sortable: true, width: 140 },
      { key: "categoryName", label: "Category Name", sortable: true, width: 180 },
      { key: "classCode", label: "Class Code", sortable: true, width: 120 },
      { key: "className", label: "Class Name", sortable: true, width: 180 },
      { key: "qtyOnHand", label: "Qty on Hand", sortable: true, width: 120, className: "text-right", renderType: "number", roundingOff: 0 },
      { key: "sellingPrice", label: "Selling Price", sortable: true, width: 120, className: "text-right", renderType: "number", roundingOff: 2 },
      { key: "stdPoPrice", label: "STD PO Price", sortable: true, width: 120, className: "text-right", renderType: "number", roundingOff: 2 },
      { key: "unitCost", label: "Unit Cost", sortable: true, width: 120, className: "text-right", renderType: "number", roundingOff: 2 },
      { key: "lastPurPrice", label: "Last Purchase Price", sortable: true, width: 140, className: "text-right", renderType: "number", roundingOff: 2 },
      { key: "active", label: "Active", sortable: true, width: 80 },
    ],
    []
  );

  const tableDataRaw = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((row) => ({
      ...row,
      itemCode: pick(row, ["itemCode", "item_code", "ITEM_CODE"]),
      itemDesc: pick(row, ["itemDesc", "item_name", "ITEM_NAME", "itemName"]),
      vehicleMake: pick(row, ["vehicleMake", "vehMake", "veh_make", "VEH_MAKE"]),
      uom: pick(row, ["uom", "UOM", "uomCode", "uom_code"]),
      categoryCode: pick(row, ["categoryCode", "categCode", "categ_code", "CATEGORY_CODE"]),
      categoryName: pick(row, ["categoryName", "categName", "categ_name", "CATEGORY_NAME"]),
      classCode: pick(row, ["classCode", "class_code", "CLASS_CODE"]),
      className: pick(row, ["className", "class_name", "CLASS_NAME"]),
      qtyOnHand: pick(row, ["qtyOnHand", "qty_onhand", "QTY_ONHAND"]),
      sellingPrice: pick(row, ["sellingPrice", "selling_price", "SELLING_PRICE"]),
      stdPoPrice: pick(row, ["stdPoPrice", "std_po_price", "STD_PO_PRICE"]),
      unitCost: pick(row, ["unitCost", "unit_cost", "UNIT_COST"]),
      lastPurPrice: pick(row, ["lastPurPrice", "lastpur_price", "LASTPUR_PRICE"]),
      active: pick(row, ["active", "ACTIVE"]),
    }));
  }, [rows]);

  const vehicleMakeOptions = useMemo(() => {
    return [...new Set(tableDataRaw.map((row) => String(row.vehicleMake || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }, [tableDataRaw]);

  const tableDataFiltered = useMemo(() => {
    const query = String(searchTerm || "").trim().toLowerCase();
    const selectedMake = String(vehicleMake || "").trim().toLowerCase();
    const searchableKeys = tableColumns.map((column) => column.key);

    return tableDataRaw.filter((row) => {
      if (selectedMake && String(row.vehicleMake || "").trim().toLowerCase() !== selectedMake) return false;
      if (!query) return true;

      return searchableKeys.some((key) => {
        const value = String(row?.[key] ?? "").toLowerCase();
        return searchMode === "start" ? value.startsWith(query) : value.includes(query);
      });
    });
  }, [searchTerm, searchMode, tableColumns, tableDataRaw, vehicleMake]);

  const tableData = useMemo(() => tableDataFiltered.slice(0, 100), [tableDataFiltered]);

  const handleLoad = useCallback(() => {
    onFilter?.({ searchTerm, searchMode, vehicleMake });
  }, [onFilter, searchMode, searchTerm, vehicleMake]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    setVehicleMake("");
    onReset?.();
  }, [onReset]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faBoxOpen} />
          </span>
          <input
            type="text"
            placeholder="Search VE Item Name or No..."
            className="block w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleLoad()}
          />
          {searchTerm && (
            <button type="button" onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        <select
          value={vehicleMake}
          onChange={(event) => setVehicleMake(event.target.value)}
          className="min-w-44 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none"
          aria-label="Vehicle Make"
        >
          <option value="">All Vehicle Makes</option>
          {vehicleMakeOptions.map((make) => <option key={make} value={make}>{make}</option>)}
        </select>

        <div className="flex items-center gap-3 px-3 border-l border-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" value="start" checked={searchMode === "start"} onChange={(event) => setSearchMode(event.target.value)} className="accent-blue-600" />
            <span className="text-xs text-gray-700">Starts with</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" value="part" checked={searchMode === "part"} onChange={(event) => setSearchMode(event.target.value)} className="accent-blue-600" />
            <span className="text-xs text-gray-700">Contains</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {tableDataFiltered.length > 100 && <span className="text-[11px] text-red-500 font-bold">Showing top 100 of {tableDataFiltered.length} records</span>}
          <button type="button" onClick={handleLoad} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            <FontAwesomeIcon icon={faFilter} className="mr-2" />Load Records
          </button>
          <button type="button" onClick={handleReset} disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            <FontAwesomeIcon icon={faUndo} className="mr-2" />Reset
          </button>
        </div>
      </div>

      <SearchGlobalReferenceTable
        columns={tableColumns}
        data={tableData}
        itemsPerPage={50}
        showFilters
        showGlobalSearch={false}
        rightActionLabel="View"
        docType={docType}
        onRowDoubleClick={onRowDoubleClick}
        isLoading={isLoading}
      />
    </div>
  );
};

export default VEMast_DataTab;
