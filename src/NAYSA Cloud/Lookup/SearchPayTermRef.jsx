import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSort,
  faSortUp,
  faSortDown,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { fetchData } from "../Configuration/BaseURL";

const PayTermLookupModal = ({ isOpen, onClose }) => {
  const [payterms, setPayterms] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [filters, setFilters] = useState({
    paytermCode: "",
    paytermName: "",
    daysDue: "",
  });

  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes (COA style)
      setPayterms([]);
      setFiltered([]);
      setFilters({ paytermCode: "", paytermName: "", daysDue: "" });
      setSortConfig({ key: "", direction: "asc" });
      setLoading(false);
      return;
    }

    setLoading(true);

    const params = {
      PARAMS: JSON.stringify({
        search: "",
        page: 1,
        pageSize: 1000, // fetch more and filter client-side like COA
      }),
    };

    fetchData("/lookupPayterm", params)
      .then((result) => {
        if (result.success) {
          const resultData = Array.isArray(result?.data) && result.data[0]?.result
            ? JSON.parse(result.data[0].result)
            : [];
          setPayterms(resultData);
          setFiltered(resultData);
        } else {
          alert(result.message || "Failed to fetch Payment Term");
          setPayterms([]);
          setFiltered([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch Payment Term:", err);
        alert(`Error: ${err.message}`);
        setPayterms([]);
        setFiltered([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    let currentFiltered = [...payterms];

    currentFiltered = currentFiltered.filter((item) => {
      const code = String(item?.paytermCode ?? "").toLowerCase();
      const name = String(item?.paytermName ?? "").toLowerCase();
      const days = String(item?.daysDue ?? "").toLowerCase();

      return (
        code.includes(String(filters.paytermCode ?? "").toLowerCase()) &&
        name.includes(String(filters.paytermName ?? "").toLowerCase()) &&
        days.includes(String(filters.daysDue ?? "").toLowerCase())
      );
    });

    if (sortConfig.key) {
      currentFiltered.sort((a, b) => {
        const aValue = String(a?.[sortConfig.key] ?? "").toLowerCase();
        const bValue = String(b?.[sortConfig.key] ?? "").toLowerCase();

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFiltered(currentFiltered);
  }, [filters, payterms, sortConfig]);

  const handleApply = (row) => onClose(row);

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
        {/* Close */}
        <button
          onClick={() => onClose(null)}
          className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
          aria-label="Close modal"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">
          Select Payment Term
        </h2>

        <div className="flex-grow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
              <span>Loading Payment Terms...</span>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(90vh-160px)] custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th
                      className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                      onClick={() => handleSort("paytermCode")}
                    >
                      Payment Term {renderSortIcon("paytermCode")}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                      onClick={() => handleSort("paytermName")}
                    >
                      Description {renderSortIcon("paytermName")}
                    </th>
                    <th
                      className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider cursor-pointer hover:bg-blue-100 transition-colors duration-200"
                      onClick={() => handleSort("daysDue")}
                    >
                      Due Days {renderSortIcon("daysDue")}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      Action
                    </th>
                  </tr>

                  {/* Filter Row */}
                  <tr className="bg-gray-100">
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.paytermCode}
                        onChange={(e) => handleFilterChange(e, "paytermCode")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.paytermName}
                        onChange={(e) => handleFilterChange(e, "paytermName")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.daysDue}
                        onChange={(e) => handleFilterChange(e, "daysDue")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-3 py-1"></th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.length > 0 ? (
                    filtered.map((row, index) => (
                      <tr
                        key={index}
                        className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer text-xs"
                        onClick={() => handleApply(row)}
                      >
                        <td className="px-4 py-1 whitespace-nowrap">{row.paytermCode}</td>
                        <td className="px-4 py-1 whitespace-nowrap">{row.paytermName}</td>
                        <td className="px-4 py-1 whitespace-nowrap text-right">{row.daysDue}</td>
                        <td className="px-4 py-1 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(row);
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
                      <td colSpan="4" className="px-4 py-6 text-center text-gray-500 text-sm">
                        No matching Payment Term found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 text-right text-xs text-gray-600">
          Showing <span className="font-semibold">{filtered.length}</span> of{" "}
          <span className="font-semibold">{payterms.length}</span> entries
        </div>
      </div>

      <style jsx="true">{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }

        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  );
};

export default PayTermLookupModal;
