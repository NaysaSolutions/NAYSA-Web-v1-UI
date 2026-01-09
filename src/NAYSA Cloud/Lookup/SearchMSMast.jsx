import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { fetchData } from "../Configuration/BaseURL";

const MSLookupModal = ({ isOpen, onClose, customParam }) => {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({
    itemNo: "",
    itemDesc: "",
    categCode: "",
    categDesc: "",
    classCode: "",
    classDesc: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ===== LOAD DATA WHEN OPEN =====
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setFiltered([]);
      setFilters({
        itemNo: "",
        itemDesc: "",
        categCode: "",
        categDesc: "",
        classCode: "",
        classDesc: "",
      });
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const params = {
      PARAMS: JSON.stringify({
        search: "", // currently only used to decide "Active" etc. in sproc
        page: 1,
        pageSize: 10,
      }),
    };

    console.log("📤 MS LOOKUP fetchData() ROUTE:", "lookupMSMast");
console.log("📤 MS LOOKUP PARAMS (raw):", params);
try {
  console.log("📤 MS LOOKUP PARAMS.JSON_DATA:", JSON.parse(params?.PARAMS || "{}"));
} catch (e) {
  console.warn("⚠️ MS LOOKUP PARAMS is not valid JSON:", params?.PARAMS);
}

fetchData("lookupMSMast", params)
  .then((result) => {
    console.log("📥 MS LOOKUP RAW RESULT FROM API:", result);

    if (result.success) {
      // data is [{ result: '...[json]...' }]
      const raw = result.data?.[0]?.result || "[]";

      console.log("📥 MS LOOKUP result.data[0].result (raw string):", raw);

      let msData = [];
      try {
        msData = JSON.parse(raw);
      } catch (e) {
        console.error("❌ MS LOOKUP JSON.parse FAILED. Raw was:", raw, e);
        msData = [];
      }

      console.log("📊 MS LOOKUP PARSED msData (array):", msData);
      console.log("📊 MS LOOKUP FIRST ROW SAMPLE:", msData?.[0]);

      setItems(msData);
      setFiltered(msData);
    } else {
      console.warn("⚠️ MS LOOKUP API returned success=false:", result.message);
      setError(result.message || "Failed to fetch MS items.");
      setItems([]);
      setFiltered([]);
    }
  })
  .catch((err) => {
    console.error("❌ Failed to fetch MS items:", err);
    setError(`Error: ${err.message || "An unexpected error occurred."}`);
  })
  .finally(() => setLoading(false));

  }, [isOpen, customParam]);

  // ===== FILTERING =====
  useEffect(() => {
    const toLower = (v) => (v ?? "").toString().toLowerCase();

    const f = items.filter((row) => {
      const itemNo = toLower(row.itemCode);
      const itemDesc = toLower(row.itemName);
      const categCode = toLower(row.categCode);
      const categDesc = toLower(row.categDesc);
      const classCode = toLower(row.classCode);
      const classDesc = toLower(row.classDesc);

      return (
        itemNo.includes(filters.itemNo.toLowerCase()) &&
        itemDesc.includes(filters.itemDesc.toLowerCase()) &&
        categCode.includes(filters.categCode.toLowerCase()) &&
        categDesc.includes(filters.categDesc.toLowerCase()) &&
        classCode.includes(filters.classCode.toLowerCase()) &&
        classDesc.includes(filters.classDesc.toLowerCase())
      );
    });

    setFiltered(f);
  }, [filters, items]);

  const handleApply = (selectedItem) => {
    onClose(selectedItem);
  };

  const handleFilterChange = (e, key) => {
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col relative overflow-hidden transform scale-95 animate-scale-in">
        {/* Close Icon */}
        <button
          onClick={() => onClose(null)}
          className="absolute top-3 right-3 text-blue-500 hover:text-blue-700 transition duration-200 focus:outline-none p-1 rounded-full hover:bg-blue-100"
          aria-label="Close modal"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-sm font-semibold text-blue-800 p-3 border-b border-gray-100">
          Select Item (MS)
        </h2>

        <div className="flex-grow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
              <span>Loading items...</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center bg-red-100 border border-red-400 text-red-700" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(90vh-120px)] custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      Item No
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      Item Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      UOM
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      Qty Hand
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      Categ Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      Categ Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      Class Code
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900 tracking-wider">
                      Class Description
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-bold text-blue-900">
                      Action
                    </th>
                  </tr>

                  {/* Filter row */}
                  <tr className="bg-gray-100">
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.itemNo}
                        onChange={(e) => handleFilterChange(e, "itemNo")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.itemDesc}
                        onChange={(e) => handleFilterChange(e, "itemDesc")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th></th>
                    <th></th>
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.categCode}
                        onChange={(e) => handleFilterChange(e, "categCode")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.categDesc}
                        onChange={(e) => handleFilterChange(e, "categDesc")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.classCode}
                        onChange={(e) => handleFilterChange(e, "classCode")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th className="px-3 py-1">
                      <input
                        type="text"
                        value={filters.classDesc}
                        onChange={(e) => handleFilterChange(e, "classDesc")}
                        placeholder="Filter..."
                        className="block w-full px-2 py-1 text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </th>
                    <th></th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200 text-xs">
                  {filtered.length > 0 ? (
                    filtered.map((row, index) => (
                      <tr
                        key={index}
                        className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
                        onClick={() => handleApply(row)}
                      >
                        <td className="px-4 py-1 whitespace-nowrap">
                          {row.itemCode}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap">
                          {row.itemName}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap">
                          {row.uom}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap text-right">
                          {row.qtyHand}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap">
                          {row.categCode}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap">
                          {row.categDesc}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap">
                          {row.classCode}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap">
                          {row.classDesc}
                        </td>
                        <td className="px-4 py-1 whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApply(row);
                            }}
                            className="px-4 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            Apply
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-6 text-center text-gray-500 text-sm">
                        No matching items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end items-center text-xs text-gray-600">
          <div className="font-semibold">
            Showing <strong>{filtered.length}</strong> of {items.length} entries
          </div>
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

export default MSLookupModal;
