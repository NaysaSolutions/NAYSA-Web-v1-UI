import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

import { fetchDataJson } from "../Configuration/BaseURL.jsx";

const getValue = (row, ...keys) => {
    if (!row || typeof row !== "object") return "";

    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "") return value;
    }

    const normalized = Object.entries(row).reduce((acc, [key, value]) => {
        acc[String(key).replace(/[_\s-]/g, "").toLowerCase()] = value;
        return acc;
    }, {});

    for (const key of keys) {
        const value = normalized[String(key).replace(/[_\s-]/g, "").toLowerCase()];
        if (value !== undefined && value !== null && value !== "") return value;
    }

    return "";
};

const unwrapResult = (value) => {
    if (value?.data?.data) return unwrapResult(value.data.data);
    if (value?.data) return unwrapResult(value.data);
    if (Array.isArray(value) && value[0]?.result !== undefined) return unwrapResult(value[0].result);
    if (value?.result !== undefined) return unwrapResult(value.result);

    if (typeof value === "string") {
        try {
            return JSON.parse(value);
        } catch {
            return [];
        }
    }

    return value;
};

const toRows = (response) => {
    const parsed = unwrapResult(response);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return [parsed];
    return [];
};

const SearchWO = ({
    isOpen,
    onClose,
    onSelect,
    branchCode = "",
    whouseCode = "",
    locCode = "",
}) => {
    const [filter, setFilter] = useState("");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadRows = async (searchText = filter) => {
        if (!isOpen) return;

        setLoading(true);

        try {
            const response = await fetchDataJson("getFGPRWO", {
                branchCode,
                filter: searchText,
                whouseCode,
                locCode,
            });

            setRows(toRows(response));
        } catch (error) {
            console.error("SearchWO lookup error:", error);
            Swal.fire({
                icon: "error",
                title: "WO Lookup Failed",
                text: error?.message || "Unable to load closed Work Orders.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setFilter("");
            loadRows("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, branchCode, whouseCode, locCode]);

    const filteredRows = useMemo(() => rows, [rows]);

    if (!isOpen) return null;

    const handleSelect = (row) => {
        if (!row) return;
        onSelect?.(row);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">Search Work Order</h2>
                        <p className="text-xs text-slate-500">
                            Closed Work Orders only. Filter: WO_STATUS = C and Remaining Qty &gt; 0.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>

                <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center">
                    <input
                        type="text"
                        className="h-10 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                        placeholder="Search WO No., Item Code, or Item Name"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                loadRows(filter);
                            }
                        }}
                        autoFocus
                    />

                    <button
                        type="button"
                        className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => loadRows(filter)}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : "Search"}
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-auto">
                    <table className="w-full min-w-[980px] border-collapse text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="border-b px-4 py-3">WO No.</th>
                                <th className="border-b px-4 py-3">WO Date</th>
                                <th className="border-b px-4 py-3">Item Code</th>
                                <th className="border-b px-4 py-3">Item Name</th>
                                <th className="border-b px-4 py-3 text-right">WO Qty</th>
                                <th className="border-b px-4 py-3 text-right">WOR Qty</th>
                                <th className="border-b px-4 py-3 text-right">Remaining</th>
                                <th className="border-b px-4 py-3 text-right">Unit Cost</th>
                                <th className="border-b px-4 py-3">Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRows.map((row, index) => {
                                const woNo = getValue(row, "woNo", "WO_NO");
                                const woDate = String(getValue(row, "woDate", "WO_DATE") || "").slice(0, 10);
                                const itemCode = getValue(row, "itemCode", "ITEM_CODE");
                                const itemName = getValue(row, "itemName", "ITEM_NAME");
                                const woQty = Number(getValue(row, "woQty", "WO_QTY") || 0);
                                const worQty = Number(getValue(row, "worQty", "WOR_QTY") || 0);
                                const remainingQty = Number(getValue(row, "remainingQty", "REMAINING_QTY") || 0);
                                const unitCost = Number(getValue(row, "woUnitCost", "unitCost", "WO_UNITCOST") || 0);
                                const status = getValue(row, "woStatus", "WO_STATUS");

                                return (
                                    <tr
                                        key={`${woNo}-${index}`}
                                        className="cursor-pointer border-b hover:bg-blue-50"
                                        onClick={() => handleSelect(row)}
                                        onDoubleClick={() => handleSelect(row)}
                                    >
                                        <td className="px-4 py-3 font-medium text-blue-700">{woNo}</td>
                                        <td className="px-4 py-3">{woDate}</td>
                                        <td className="px-4 py-3">{itemCode}</td>
                                        <td className="px-4 py-3">{itemName}</td>
                                        <td className="px-4 py-3 text-right">{woQty.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">{worQty.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right font-semibold">{remainingQty.toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">{unitCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                                {status || "C"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}

                            {!loading && filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                                        No closed Work Order available for FGPR.
                                    </td>
                                </tr>
                            )}

                            {loading && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                                        Loading closed Work Orders...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                    Tip: click a row to load the Work Order into FGPR.
                </div>
            </div>
        </div>
    );
};

export default SearchWO;
