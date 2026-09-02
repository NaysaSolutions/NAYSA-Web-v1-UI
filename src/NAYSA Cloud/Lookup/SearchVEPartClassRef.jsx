// src/NAYSA Cloud/Lookup/SearchVEPartClassRef.jsx

import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEraser,
  faSearch,
  faSort,
  faSpinner,
  faSyncAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) return [];
  if (Array.isArray(res)) return res;

  if (typeof res === "string") {
    try {
      return JSON.parse(res) || [];
    } catch {
      return [];
    }
  }

  return [];
};

const normalizeRecord = (row = {}) => ({
  code:
    row.code ??
    row.partClassCode ??
    row.part_class_code ??
    row.PART_CLASS_CODE ??
    "",

  description:
    row.description ??
    row.partClassDescription ??
    row.part_class_description ??
    row.PART_CLASS_DESCRIPTION ??
    "",
});

const SearchVEPartClassRef = ({
  isOpen,
  onClose,
  title = "Search Vehicle Part Class",
}) => {
  const [filters, setFilters] = useState({
    code: "",
    description: "",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "asc",
  });

  const debouncedFilters = useDebounce(filters, 300);

  const {
    data: records = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["lookupVEPartClass"],
    queryFn: async () => {
      const response = await apiClient.get("/vePartClass");
      return extractRows(response)
        .map(normalizeRecord)
        .filter((row) => String(row.code || "").trim() !== "");
    },
    enabled: Boolean(isOpen),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });

  const filteredData = useMemo(() => {
    let result = records.filter((row) => {
      const code = String(row.code || "").toLowerCase();
      const description = String(row.description || "").toLowerCase();

      return (
        code.includes(String(debouncedFilters.code || "").toLowerCase()) &&
        description.includes(
          String(debouncedFilters.description || "").toLowerCase()
        )
      );
    });

    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aValue = String(a?.[sortConfig.key] ?? "");
        const bValue = String(b?.[sortConfig.key] ?? "");

        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue, undefined, { numeric: true })
          : bValue.localeCompare(aValue, undefined, { numeric: true });
      });
    }

    return result;
  }, [records, debouncedFilters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">

        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-2 pl-3">
            <h2 className="global-lookup-headertext-ui">{title}</h2>
            {isFetching && (
              <span className="text-[10px] text-blue-500">Syncing...</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {(filters.code || filters.description) && (
              <button
                type="button"
                onClick={() => setFilters({ code: "", description: "" })}
                className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 rounded"
              >
                <FontAwesomeIcon icon={faEraser} className="mr-1" />
                CLEAR
              </button>
            )}

            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 text-slate-400 hover:text-blue-600"
            >
              <FontAwesomeIcon icon={faSyncAlt} spin={isFetching} />
            </button>

            <button
              type="button"
              onClick={() => onClose?.(null)}
              className="p-2 text-slate-400 hover:text-red-600"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-auto">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="2x"
                className="mb-3 text-blue-500"
              />
              Loading...
            </div>
          ) : (
            <table className="min-w-full table-fixed">
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    {
                      key: "code",
                      label: "Part Class Code",
                      width: "w-[170px]",
                    },
                    {
                      key: "description",
                      label: "Part Class Description",
                    },
                  ].map((column) => (
                    <th
                      key={column.key}
                      className={`global-lookup-th-ui ${column.width || ""}`}
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer mb-1"
                        onClick={() => handleSort(column.key)}
                      >
                        <span className="global-lookup-th-text-ui">
                          {column.label}
                        </span>
                        <FontAwesomeIcon icon={faSort} className="text-[10px]" />
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={filters[column.key]}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              [column.key]: e.target.value,
                            }))
                          }
                          placeholder="Filter..."
                          className="global-lookup-filter-text-ui"
                        />
                        <FontAwesomeIcon
                          icon={faSearch}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((row, index) => (
                    <tr
                      key={row.code || index}
                      onClick={() =>
                        onClose?.({
                          ...row,
                          partClassCode: row.code || "",
                          partClassName: row.description || "",
                        })
                      }
                      className="hover:bg-blue-50 cursor-pointer"
                    >
                      <td className="global-lookup-td-ui font-bold">
                        {row.code}
                      </td>
                      <td className="global-lookup-td-ui">
                        {row.description}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="2"
                      className="px-4 py-20 text-center text-slate-400 italic text-sm"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="global-lookup-footer-records-div-ui">
          <span className="global-lookup-footer-records-text-ui">
            Total Records: {filteredData.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchVEPartClassRef;
