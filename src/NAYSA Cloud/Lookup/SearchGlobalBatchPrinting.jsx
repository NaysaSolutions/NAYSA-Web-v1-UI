import { useEffect, useMemo, useState } from "react";
import { CheckCircle, CheckSquare, ChevronDown, FileText, Printer, Search, Square, X } from "lucide-react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useSwalErrorAlert, useSwalWarningAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useHandleBatchPrint } from "@/NAYSA Cloud/Global/report.js";
import { useTopDocControlRow } from "@/NAYSA Cloud/Global/top1RefTable";

const SearchGlobalBatchPrinting = ({
  isOpen,
  onClose,
  docCode,
  docDescription,
  formName,
  branchCode,
  branchName,
  initialStartNo = "",
  initialEndNo = "",
  printMode = "Final",
}) => {
  const { user } = useAuth();
  const userCode = user?.USER_CODE || user?.userCode || user?.user_code || "";
  const [startNo, setStartNo] = useState(initialStartNo);
  const [endNo, setEndNo] = useState(initialEndNo || initialStartNo);
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const [resolvedFormName, setResolvedFormName] = useState(formName || "");

  useEffect(() => {
    if (!isOpen) return;
    setStartNo(initialStartNo);
    setEndNo(initialEndNo || initialStartNo);
    setRows([]);
    setSelectedIds([]);
    setPrintMenuOpen(false);
  }, [isOpen, initialStartNo, initialEndNo]);

  useEffect(() => {
    if (!isOpen) return;

    if (formName) {
      setResolvedFormName(formName);
      return;
    }

    let active = true;
    useTopDocControlRow(docCode)
      .then((documentControl) => {
        if (active) setResolvedFormName(documentControl?.formName || "");
      })
      .catch(() => {
        if (active) setResolvedFormName("");
      });

    return () => {
      active = false;
    };
  }, [isOpen, docCode, formName]);

  const allSelected = useMemo(
    () => rows.length > 0 && selectedIds.length === rows.length,
    [rows, selectedIds],
  );

  const handleStartNoChange = (event) => {
    const value = event.target.value;
    setStartNo(value);
    if (!endNo || endNo === startNo) setEndNo(value);
  };

  const handleFind = async () => {
    if (!docCode || !branchCode || !startNo.trim() || !endNo.trim()) {
      useSwalErrorAlert(
        "Batch Printing",
        "Branch, starting document number, and ending document number are required.",
      );
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get("/getBatchPrintDocuments", {
        params: {
          docCode,
          branchCode,
          startNo: startNo.trim(),
          endNo: endNo.trim(),
        },
      });
      const documents = response?.data?.data;
      const nextRows = Array.isArray(documents) ? documents : [];
      setRows(nextRows);
      setSelectedIds(nextRows.map((row) => String(row.tranId)));
    } catch (error) {
      setRows([]);
      setSelectedIds([]);
      useSwalErrorAlert(
        "Batch Printing",
        error?.response?.data?.message || "Unable to load documents.",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (tranId) => {
    const key = String(tranId);
    setSelectedIds((current) =>
      current.includes(key)
        ? current.filter((id) => id !== key)
        : [...current, key],
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : rows.map((row) => String(row.tranId)));
  };

  const handlePrint = async (selectedPrintMode) => {
    if (!selectedIds.length) {
      useSwalErrorAlert("Batch Printing", "Select at least one document to print.");
      return;
    }

    if (!resolvedFormName) {
      useSwalErrorAlert("Batch Printing", "Report Name not defined.");
      return;
    }

    const effectivePrintMode = selectedPrintMode || printMode;
    let transactionIdsToPrint = selectedIds;

    if (effectivePrintMode === "Draft") {
      const selectedRows = rows.filter((row) => selectedIds.includes(String(row.tranId)));
      const excludedRows = selectedRows.filter((row) => Number(row.noReprints || 0) > 0);
      transactionIdsToPrint = selectedRows
        .filter((row) => Number(row.noReprints || 0) === 0)
        .map((row) => String(row.tranId));

      if (excludedRows.length) {
        useSwalWarningAlert(
          "Draft Printing",
          `Final-printed document(s) were excluded: ${excludedRows.map((row) => row.docNo).join(", ")}.`,
        );
      }

      if (!transactionIdsToPrint.length) return;
    }

    try {
      setPrinting(true);
      await useHandleBatchPrint({
        transactionIds: transactionIdsToPrint,
        formName: resolvedFormName,
        docCode,
        printMode: effectivePrintMode,
        userCode,
      });

      if (effectivePrintMode === "Final") {
        await handleFind();
      }
    } catch (error) {
      useSwalErrorAlert(
        "Batch Printing",
        error?.response?.data?.message || error?.message || "Unable to generate the batch report.",
      );
    } finally {
      setPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4">
      {(loading || printing) && <LoadingSpinner />}
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              {docDescription || docCode} Batch Printing
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Select the documents to include in one combined PDF preview.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50/70 p-4 md:grid-cols-3 dark:border-slate-700 dark:bg-slate-800/30">
          <label className="relative block">
            <span className="absolute -top-2 left-3 bg-slate-50 px-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-900">
              Branch
            </span>
            <input
              value={branchName ? `${branchCode} - ${branchName}` : branchCode || ""}
              disabled
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 text-sm text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          <label className="relative block">
            <span className="absolute -top-2 left-3 bg-slate-50 px-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-900">
              Starting Document No.
            </span>
            <input
              value={startNo}
              onChange={handleStartNoChange}
              onKeyDown={(event) => event.key === "Enter" && handleFind()}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <div className="flex gap-2">
            <label className="relative block min-w-0 flex-1">
              <span className="absolute -top-2 left-3 bg-slate-50 px-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-900">
                Ending Document No.
              </span>
              <input
                value={endNo}
                onChange={(event) => setEndNo(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleFind()}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <button
              type="button"
              onClick={handleFind}
              disabled={loading || printing}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Search size={16} /> Find
            </button>
          </div>
        </div>

        <div className="min-h-[260px] flex-1 overflow-auto p-4">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-blue-100 text-slate-700 dark:bg-blue-950 dark:text-slate-200">
              <tr>
                <th className="w-14 border border-slate-200 px-3 py-2 text-center dark:border-slate-700">
                  <button type="button" onClick={toggleAll} aria-label="Select all documents">
                    {allSelected ? <CheckSquare size={17} className="text-blue-600" /> : <Square size={17} />}
                  </button>
                </th>
                <th className="border border-slate-200 px-3 py-2 text-left dark:border-slate-700">Document No.</th>
                <th className="border border-slate-200 px-3 py-2 text-left dark:border-slate-700">Print Status</th>
                <th className="border border-slate-200 px-3 py-2 text-left dark:border-slate-700">Prepared By</th>
                <th className="border border-slate-200 px-3 py-2 text-left dark:border-slate-700">Checked By</th>
                <th className="border border-slate-200 px-3 py-2 text-left dark:border-slate-700">Noted By</th>
                <th className="border border-slate-200 px-3 py-2 text-left dark:border-slate-700">Approved By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const key = String(row.tranId);
                const selected = selectedIds.includes(key);
                return (
                  <tr
                    key={key}
                    onClick={() => toggleRow(key)}
                    className={`cursor-pointer ${selected ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}
                  >
                    <td className="border border-slate-200 px-3 py-2 text-center dark:border-slate-700">
                      {selected ? <CheckSquare size={17} className="mx-auto text-blue-600" /> : <Square size={17} className="mx-auto text-slate-400" />}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 font-medium dark:border-slate-700">{row.docNo}</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">
                      {Number(row.noReprints || 0) > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Final Printed
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                          Draft Available
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{row.preparedBy || ""}</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{row.checkedBy || ""}</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{row.notedBy || ""}</td>
                    <td className="border border-slate-200 px-3 py-2 dark:border-slate-700">{row.approvedBy || ""}</td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                    <FileText size={28} className="mx-auto mb-2 opacity-60" />
                    Enter a document range and click Find.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/40">
          <span className="text-xs text-slate-500">
            {selectedIds.length} of {rows.length} document(s) selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
            >
              Cancel
            </button>
            <div className="relative">
              {printMenuOpen && !printing && (
                <div className="absolute bottom-full right-0 z-50 mb-2 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => {
                      setPrintMenuOpen(false);
                      handlePrint("Draft");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <FileText size={13} className="text-blue-500" /> Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintMenuOpen(false);
                      handlePrint("Final");
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <CheckCircle size={13} className="text-blue-500" /> Final
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPrintMenuOpen((open) => !open)}
                disabled={!selectedIds.length || loading || printing}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Printer size={15} /> {printing ? "Generating..." : "Preview Batch"}
                {!printing && <ChevronDown size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchGlobalBatchPrinting;
