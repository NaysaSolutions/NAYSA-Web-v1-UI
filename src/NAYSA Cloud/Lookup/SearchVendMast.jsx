import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSort,
  faSortUp,
  faSortDown,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const itemsPerPage = 50;

const initialFilters = {
  vendCode: "",
  vendName: "",
  source: "",
  vendTin: "",
  atcCode: "",
  vatCode: "",
  addr: "",
};

const PayeeMastLookupModal = ({ isOpen, onClose, customParam }) => {
  const [rows, setRows] = useState([]); // current page rows (server-side)
  const [filters, setFilters] = useState(initialFilters);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // server paging state
  const [hasNextPage, setHasNextPage] = useState(false);

  // Reset when modal closes/opens or param changes
  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setFilters(initialFilters);
      setSortConfig({ key: "", direction: "asc" });
      setCurrentPage(1);
      setHasNextPage(false);
      return;
    }
    // whenever you open OR customParam changes, go back to page 1
    setCurrentPage(1);
  }, [isOpen, customParam]);

  // Fetch current page from server
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: result } = await apiClient.get("/lookupVendMast", {
          params: {
            PARAMS: JSON.stringify({
              search: customParam ?? "ActiveAll",
              page: currentPage,
              itemsPerPage,
            }),
          },
          signal: controller.signal,
        });

        // Expecting: result.data[0].result = JSON string
        const pageData =
          Array.isArray(result?.data) && result.data[0]?.result
            ? JSON.parse(result.data[0].result || "[]")
            : [];

        setRows(Array.isArray(pageData) ? pageData : []);
        setHasNextPage(Array.isArray(pageData) && pageData.length === itemsPerPage);
      } catch (err) {
        // Ignore abort errors
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;

        console.error("Failed to fetch payee:", err);
        setRows([]);
        setHasNextPage(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [isOpen, customParam, currentPage]);

  const handleApply = (vend) => onClose(vend);

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const direction =
        prev.key === key && prev.direction === "asc" ? "desc" : "asc";
      return { key, direction };
    });
  };

  const renderSortIcon = (column) => {
    if (sortConfig.key === column) {
      return sortConfig.direction === "asc" ? (
        <FontAwesomeIcon icon={faSortUp} className="ml-1 text-blue-500" />
      ) : (
        <FontAwesomeIcon icon={faSortDown} className="ml-1 text-blue-500" />
      );
    }
    return <FontAwesomeIcon icon={faSort} className="ml-1 text-gray-400" />;
  };

  // Filter + sort ONLY within the currently loaded page
  const filteredRows = useMemo(() => {
    let current = [...rows];

    const f = (v) => String(v ?? "").toLowerCase();
    const inc = (value, needle) => f(value).includes(f(needle));

    current = current.filter((item) => {
      return (
        inc(item.vendCode, filters.vendCode) &&
        inc(item.vendName, filters.vendName) &&
        inc(item.source, filters.source) &&
        inc(item.vendTin, filters.vendTin) &&
        inc(item.atcCode, filters.atcCode) &&
        inc(item.vatCode, filters.vatCode) &&
        inc(item.addr, filters.addr)
      );
    });

    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      current.sort((a, b) => {
        const av = String(a?.[key] ?? "");
        const bv = String(b?.[key] ?? "");
        if (av < bv) return direction === "asc" ? -1 : 1;
        if (av > bv) return direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return current;
  }, [rows, filters, sortConfig]);

  const handleNextPage = () => {
    if (!hasNextPage) return;
    setCurrentPage((p) => p + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  if (!isOpen) return null;

  const showingCount = filteredRows.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-8xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
        {/* Close Icon */}
        <button
          onClick={() => onClose(null)}
          className="absolute top-1 right-2 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
          aria-label="Close modal"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-sm font-semibold text-blue-800 px-3 py-2 border-b border-gray-100 dark:bg-gray-800 dark:text-white">
          Select Payee
        </h2>

        <div className="flex-grow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
              <span>Loading payee...</span>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(90vh-160px)] custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm select-none">
                  <tr>
                    <th
                      className="w-[140px] px-3 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200 dark:bg-gray-800 dark:text-white"
                      onClick={() => handleSort("vendCode")}
                    >
                      Payee Code {renderSortIcon("vendCode")}
                    </th>
                    <th
                      className="px-3 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200 dark:bg-gray-800 dark:text-white"
                      onClick={() => handleSort("vendName")}
                    >
                      Payee Name {renderSortIcon("vendName")}
                    </th>
                    <th
                      className="px-3 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200 dark:bg-gray-800 dark:text-white"
                      onClick={() => handleSort("source")}
                    >
                      Source {renderSortIcon("source")}
                    </th>
                    <th
                      className="px-3 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200 dark:bg-gray-800 dark:text-white"
                      onClick={() => handleSort("vendTin")}
                    >
                      TIN {renderSortIcon("vendTin")}
                    </th>
                    <th
                      className="px-3 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200 dark:bg-gray-800 dark:text-white"
                      onClick={() => handleSort("atcCode")}
                    >
                      ATC {renderSortIcon("atcCode")}
                    </th>
                    <th
                      className="px-3 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200 dark:bg-gray-800 dark:text-white"
                      onClick={() => handleSort("vatCode")}
                    >
                      VAT {renderSortIcon("vatCode")}
                    </th>
                    <th
                      className="px-3 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200 dark:bg-gray-800 dark:text-white"
                      onClick={() => handleSort("addr")}
                    >
                      Address {renderSortIcon("addr")}
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-blue-900 tracking-wider dark:bg-gray-800 dark:text-white">
                      Action
                    </th>
                  </tr>

                  {/* Filter Row */}
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="px-2 pb-1 pt-0">
                      <input
                        type="text"
                        value={filters.vendCode}
                        onChange={(e) => handleFilterChange(e, "vendCode")}
                        placeholder="Filter..."
                        className="block w-full px-1 py-1 text-xs text-gray-700 bg-white dark:bg-gray-900 dark:text-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-2 pb-1 pt-0">
                      <input
                        type="text"
                        value={filters.vendName}
                        onChange={(e) => handleFilterChange(e, "vendName")}
                        placeholder="Filter..."
                        className="block w-full px-1 py-1 text-xs text-gray-700 bg-white dark:bg-gray-900 dark:text-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-2 pb-1 pt-0">
                      <input
                        type="text"
                        value={filters.source}
                        onChange={(e) => handleFilterChange(e, "source")}
                        placeholder="Filter..."
                        className="block w-full px-1 py-1 text-xs text-gray-700 bg-white dark:bg-gray-900 dark:text-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-2 pb-1 pt-0">
                      <input
                        type="text"
                        value={filters.vendTin}
                        onChange={(e) => handleFilterChange(e, "vendTin")}
                        placeholder="Filter..."
                        className="block w-full px-1 py-1 text-xs text-gray-700 bg-white dark:bg-gray-900 dark:text-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-2 pb-1 pt-0">
                      <input
                        type="text"
                        value={filters.atcCode}
                        onChange={(e) => handleFilterChange(e, "atcCode")}
                        placeholder="Filter..."
                        className="block w-full px-1 py-1 text-xs text-gray-700 bg-white dark:bg-gray-900 dark:text-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-2 pb-1 pt-0">
                      <input
                        type="text"
                        value={filters.vatCode}
                        onChange={(e) => handleFilterChange(e, "vatCode")}
                        placeholder="Filter..."
                        className="block w-full px-1 py-1 text-xs text-gray-700 bg-white dark:bg-gray-900 dark:text-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-2 pb-1 pt-0">
                      <input
                        type="text"
                        value={filters.addr}
                        onChange={(e) => handleFilterChange(e, "addr")}
                        placeholder="Filter..."
                        className="block w-full px-1 py-1 text-xs text-gray-700 bg-white dark:bg-gray-900 dark:text-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-2 pb-1 pt-0"></th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((vend, index) => (
                      <tr
                        key={`${vend.vendCode ?? "ROW"}-${index}`}
                        className="hover:bg-blue-50 transition-colors duration-50 cursor-pointer text-xs dark:bg-gray-800 dark:text-white dark:hover:bg-blue-900"
                        onDoubleClick={() => handleApply(vend)}
                      >
                        <td className="px-3 py-1 whitespace-nowrap text-[11px]">
                          {vend.vendCode}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap text-[11px]">
                          {vend.vendName}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap text-[11px]">
                          {vend.source}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap text-[11px]">
                          {vend.vendTin}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap text-[11px]">
                          {vend.atcCode}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap text-[11px]">
                          {vend.vatCode}
                        </td>
                        <td className="px-3 py-1 whitespace-normal text-[11px]">
                          {vend.addr}
                        </td>
                        <td className="px-3 py-1 whitespace-nowrap text-[11px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(vend);
                            }}
                            className="px-6 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-150"
                          >
                            Apply
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-6 text-center text-gray-500 text-lg"
                      >
                        No matching payee found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer / Paging */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-600 dark:bg-gray-800 dark:text-white">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
            className="px-7 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            Previous
          </button>

          <div className="font-semibold">
            Page {currentPage} • Showing {showingCount} row(s)
          </div>

          <button
            onClick={handleNextPage}
            disabled={!hasNextPage || loading}
            className="px-7 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          >
            Next
          </button>
        </div>
      </div>

      {/* Tailwind CSS Animations */}
      <style jsx="true">{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
};

export default PayeeMastLookupModal;
