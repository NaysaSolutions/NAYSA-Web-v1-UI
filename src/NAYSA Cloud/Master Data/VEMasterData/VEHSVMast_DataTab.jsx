// src/NAYSA Cloud/Master Data/VEHSVServiceMaster/VEHSVMast_DataTab.jsx

import React, { useCallback, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCarSide,
  faFilter,
  faTimes,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const pick = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];

    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
};

const VEHSVMast_DataTab = ({
  isLoading = false,
  rows = [],
  onFilter,
  onReset,
  onRowDoubleClick,
}) => {
  const docType = "VEHSVMast";

  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("part");

  const tableColumns = useMemo(
    () => [
      { key: "plateNo", label: "Plate #", sortable: true, width: 130 },
      { key: "custCode", label: "Customer Code", sortable: true, width: 140 },
      { key: "custName", label: "Customer Name", sortable: true, width: 240 },

      { key: "vehMakeName", label: "Vehicle Make", sortable: true, width: 150 },
      { key: "vehTypeName", label: "Vehicle Type", sortable: true, width: 150 },
      { key: "vehModelName", label: "Vehicle Model", sortable: true, width: 180 },
      { key: "vehClassName", label: "Vehicle Class", sortable: true, width: 150 },
      { key: "year", label: "Year", sortable: true, width: 90 },

      { key: "transmission", label: "Transmission", sortable: true, width: 130 },
      { key: "engineNo", label: "Engine #", sortable: true, width: 160 },
      { key: "chassisNo", label: "Chassis #", sortable: true, width: 160 },
      { key: "motorNo", label: "Motor #", sortable: true, width: 160 },
      { key: "mvrrNo", label: "MVRR #", sortable: true, width: 140 },
      { key: "insuranceName", label: "Insurance Co.", sortable: true, width: 180 },
      { key: "policyNo", label: "Policy No.", sortable: true, width: 150 },
    ],
    []
  );

  const tableDataRaw = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((row) => ({
      ...row,

      plateNo: pick(row, ["plateNo", "plate_no", "PLATE_NO"]),
      custCode: pick(row, ["custCode", "cust_code", "CUST_CODE"]),
      custName: pick(row, ["custName", "cust_name", "CUST_NAME"]),

      vehMakeName: pick(row, [
        "vehMakeName",
        "veh_make_name",
        "VEH_MAKE_NAME",
        "makeName",
      ]),
      vehTypeName: pick(row, [
        "vehTypeName",
        "veh_type_name",
        "VEH_TYPE_NAME",
        "typeName",
      ]),
      vehModelName: pick(row, [
        "vehModelName",
        "veh_model_name",
        "VEH_MODEL_NAME",
        "modelName",
      ]),
      vehClassName: pick(row, [
        "vehClassName",
        "veh_class_name",
        "VEH_CLASS_NAME",
        "className",
      ]),

      year: pick(row, ["year", "YEAR"]),
      transmission: pick(row, ["transmission", "TRANSMISSION"]),
      engineNo: pick(row, ["engineNo", "engine_no", "ENGINE_NO"]),
      chassisNo: pick(row, ["chassisNo", "chassis_no", "CHASSIS_NO"]),
      motorNo: pick(row, ["motorNo", "motor_no", "MOTOR_NO"]),
      mvrrNo: pick(row, ["mvrrNo", "mvrr_no", "MVRR_NO"]),
      insuranceName: pick(row, [
        "insuranceName",
        "insurance_name",
        "INSURANCE_NAME",
        "insuranceCo",
      ]),
      policyNo: pick(row, ["policyNo", "policy_no", "POLICY_NO"]),
    }));
  }, [rows]);

  const tableDataFiltered = useMemo(() => {
    const query = String(searchTerm || "").trim().toLowerCase();
    const searchableKeys = tableColumns.map((column) => column.key);

    if (!query) return tableDataRaw;

    return tableDataRaw.filter((row) =>
      searchableKeys.some((key) => {
        const value = String(row?.[key] ?? "").toLowerCase();

        return searchMode === "start"
          ? value.startsWith(query)
          : value.includes(query);
      })
    );
  }, [searchMode, searchTerm, tableColumns, tableDataRaw]);

  const tableData = useMemo(
    () => tableDataFiltered.slice(0, 100),
    [tableDataFiltered]
  );

  const handleLoad = useCallback(() => {
    onFilter?.({ searchTerm, searchMode });
  }, [onFilter, searchMode, searchTerm]);

  const handleReset = useCallback(() => {
    setSearchTerm("");
    setSearchMode("part");
    onReset?.();
  }, [onReset]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 mb-2 shrink-0">
        <div className="relative flex-grow max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <FontAwesomeIcon icon={faCarSide} />
          </span>

          <input
            type="text"
            placeholder="Search Plate #, Customer or Vehicle..."
            className="block w-full pl-10 pr-10 py-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 outline-none transition-all"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) =>
              event.key === "Enter" && handleLoad()
            }
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-red-500"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 px-3 border-l border-gray-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value="start"
              checked={searchMode === "start"}
              onChange={(event) => setSearchMode(event.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Starts with</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              value="part"
              checked={searchMode === "part"}
              onChange={(event) => setSearchMode(event.target.value)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700">Contains</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          {tableDataFiltered.length > 100 && (
            <span className="text-[11px] text-red-500 font-bold">
              Showing top 100 of {tableDataFiltered.length} records
            </span>
          )}

          <button
            type="button"
            onClick={handleLoad}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faFilter} className="mr-2" />
            Load Records
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faUndo} className="mr-2" />
            Reset
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

export default VEHSVMast_DataTab;
