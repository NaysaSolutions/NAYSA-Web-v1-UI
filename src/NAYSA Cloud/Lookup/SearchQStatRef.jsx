import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const SearchQStatRef = ({ isOpen, onClose, customParam }) => {
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ qstatCode: "", qstatName: "" });
  const [loading, setLoading] = useState(false);

  const pickCode = (r) => r?.qstatCode ?? r?.QSTAT_CODE ?? "";
  const pickName = (r) => r?.qstatName ?? r?.QSTAT_NAME ?? "";

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setFiltered([]);
      setFilters({ qstatCode: "", qstatName: "" });
      return;
    }

    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const { data: result } = await apiClient.get("/lookupQStat", {
          params: {
            PARAMS: JSON.stringify({
              search: "",
              page: 1,
              pageSize: 50,
            }),
          },
        });

        const data =
          Array.isArray(result?.data) && result.data[0]?.result
            ? JSON.parse(result.data[0].result)
            : [];

        if (!alive) return;
        setRows(data);
        setFiltered(data);
      } catch (err) {
        console.error("Failed to fetch QStat:", err);
        if (!alive) return;
        setRows([]);
        setFiltered([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, customParam]);

  useEffect(() => {
    const codeFilter = (filters.qstatCode || "").toLowerCase();
    const nameFilter = (filters.qstatName || "").toLowerCase();

    setFiltered(
      rows.filter((r) => {
        const code = String(pickCode(r) || "").toLowerCase();
        const name = String(pickName(r) || "").toLowerCase();
        return code.includes(codeFilter) && name.includes(nameFilter);
      })
    );
  }, [filters, rows]);

  const handleApply = (row) => onClose(row);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col relative overflow-hidden animate-scale-in">
        {/* Close */}
        <button
          onClick={() => onClose(null)}
          className="absolute top-3 right-3 text-blue-500 hover:text-blue-700"
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="text-sm font-semibold text-blue-800 p-3 border-b">
          Select Quality Status
        </h2>

        {loading ? (
          <div className="flex items-center justify-center h-52 text-blue-500">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
            Loading Quality Status...
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">
                    QStat Code
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">
                    QStat Name
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">
                    Action
                  </th>
                </tr>
                <tr>
                  <th className="px-2 py-1">
                    <input
                      className="w-full border rounded px-2 py-1"
                      placeholder="Filter..."
                      value={filters.qstatCode}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, qstatCode: e.target.value }))
                      }
                    />
                  </th>
                  <th className="px-2 py-1">
                    <input
                      className="w-full border rounded px-2 py-1"
                      placeholder="Filter..."
                      value={filters.qstatName}
                      onChange={(e) =>
                        setFilters((p) => ({ ...p, qstatName: e.target.value }))
                      }
                    />
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.length ? (
                  filtered.map((r, i) => (
                    <tr
                      key={`${pickCode(r)}-${i}`}
                      className="hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleApply(r)}
                    >
                      <td className="px-4 py-1">{pickCode(r)}</td>
                      <td className="px-4 py-1">{pickName(r)}</td>
                      <td className="px-4 py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(r);
                          }}
                          className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-gray-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-3 border-t text-xs text-right text-gray-600">
          Showing <b>{filtered.length}</b> of {rows.length}
        </div>
      </div>
    </div>
  );
};

export default SearchQStatRef;
