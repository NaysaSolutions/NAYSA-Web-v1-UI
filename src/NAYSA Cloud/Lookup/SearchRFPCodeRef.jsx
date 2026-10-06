/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faTimes } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

const pickCode = (row) => row?.rfpCode ?? row?.RfpCode ?? row?.RFP_CODE ?? "";
const pickName = (row) => row?.rfpName ?? row?.RfpName ?? row?.RFP_NAME ?? "";
const pickActive = (row) => row?.active ?? row?.Active ?? row?.ACTIVE ?? "Y";
const normalizeActive = (value) => String(value ?? "Y").trim().toUpperCase();
const isActiveCode = (row) =>
  !["N", "NO", "FALSE", "0"].includes(normalizeActive(pickActive(row)));

const RFPCodeLookupModal = ({ isOpen, onClose, activeOnly = true }) => {
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ rfpCode: "", rfpName: "" });
  const [loading, setLoading] = useState(false);

  const parseLookupResult = (result) => {
    const raw =
      result?.data?.data?.[0]?.result ??
      result?.data?.[0]?.result ??
      result?.data?.result ??
      result?.result ??
      result;

    if (Array.isArray(raw)) return raw;
    if (!raw) return [];

    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Invalid RFP Code lookup JSON:", error, raw);
      return [];
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setRows([]);
      setFilters({ rfpCode: "", rfpName: "" });
      return undefined;
    }

    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const { data: result } = await apiClient.get("/lookupRFPCode", {
          params: {
            PARAMS: JSON.stringify({
              search: "",
              page: 1,
              pageSize: 200,
              activeOnly,
            }),
          },
        });

        if (!alive) return;
        const data = parseLookupResult(result);
        setRows(activeOnly ? data.filter(isActiveCode) : data);
      } catch (error) {
        console.error("Failed to fetch RFP Codes:", error);
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [activeOnly, isOpen]);

  const filtered = useMemo(() => {
    const codeFilter = filters.rfpCode.toLowerCase();
    const nameFilter = filters.rfpName.toLowerCase();

    return rows.filter((row) => {
      const code = String(pickCode(row)).toLowerCase();
      const name = String(pickName(row)).toLowerCase();
      return code.includes(codeFilter) && name.includes(nameFilter);
    });
  }, [filters, rows]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl animate-scale-in">
        <button
          type="button"
          onClick={() => onClose(null)}
          className="absolute right-3 top-3 text-blue-500 hover:text-blue-700"
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faTimes} size="lg" />
        </button>

        <h2 className="border-b p-3 text-sm font-semibold text-blue-800">
          Select Request for Payment Code
        </h2>

        {loading ? (
          <div className="flex h-52 items-center justify-center text-blue-500">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
            Loading Request for Payment Codes...
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full divide-y divide-gray-100 text-xs">
              <thead className="sticky top-0 bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">RFP Code</th>
                  <th className="px-4 py-2 text-left font-bold text-blue-900">RFP Description</th>
                </tr>
                <tr>
                  <th className="px-2 py-1">
                    <input
                      className="w-full rounded border px-2 py-1 font-normal"
                      placeholder="Filter code..."
                      value={filters.rfpCode}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, rfpCode: event.target.value }))
                      }
                    />
                  </th>
                  <th className="px-2 py-1">
                    <input
                      className="w-full rounded border px-2 py-1 font-normal"
                      placeholder="Filter description..."
                      value={filters.rfpName}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, rfpName: event.target.value }))
                      }
                    />
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.length ? (
                  filtered.map((row, index) => (
                    <tr
                      key={`${pickCode(row)}-${index}`}
                      className="cursor-pointer hover:bg-blue-50"
                      onClick={() => onClose(row)}
                    >
                      <td className="px-4 py-1">{pickCode(row)}</td>
                      <td className="px-4 py-1">{pickName(row)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="py-6 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t p-3 text-right text-xs text-gray-600">
          Showing <b>{filtered.length}</b> of {rows.length}
        </div>
      </div>
    </div>
  );
};

export default RFPCodeLookupModal;
