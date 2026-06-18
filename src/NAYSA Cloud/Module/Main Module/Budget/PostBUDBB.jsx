import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faMagnifyingGlass,
  faRotateRight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { postRequest } from "../../../Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  formatNumber,
  useSwalErrorAlert,
  useSwalProceedConfirm,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const LIST_ENDPOINT = "postingBUDBB";
const POST_ENDPOINT = "postBUDBB";
const DEC_AMT = 2;

const normalizeString = (value) => String(value ?? "").trim();

const getRowDocId = (row = {}) =>
  normalizeString(row.documentID || row.documentId || row.docId || row.bbId || row.groupId);

const getRowDocNo = (row = {}) =>
  normalizeString(row.docNo || row.documentNo || row.bbNo || row.BB_NO);

const parseJsonMaybe = (value) => {
  if (typeof value !== "string" || !value.trim()) return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const unwrapData = (response) => {
  const payload = response?.data ?? response ?? {};

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.rows)) return payload.rows;

  return payload;
};

const extractRows = (response) => {
  const payload = unwrapData(response);

  if (Array.isArray(payload)) {
    if (payload.length === 1) {
      const first = payload[0] || {};
      const rawResult = first.result ?? first.RESULT;
      const parsedResult = parseJsonMaybe(rawResult);

      if (Array.isArray(parsedResult)) return parsedResult;
      if (Array.isArray(parsedResult?.rows)) return parsedResult.rows;
    }

    return payload;
  }

  const rawResult = payload?.result ?? payload?.RESULT;
  const parsedResult = parseJsonMaybe(rawResult);

  if (Array.isArray(parsedResult)) return parsedResult;
  if (Array.isArray(parsedResult?.rows)) return parsedResult.rows;
  if (Array.isArray(payload?.rows)) return payload.rows;

  return [];
};

const extractError = (response) => {
  const payload = response?.data ?? response ?? {};
  const firstRow = Array.isArray(payload?.data) ? payload.data[0] : Array.isArray(payload) ? payload[0] : null;

  const errorMsg =
    payload?.errorMsg ||
    payload?.errormsg ||
    payload?.message ||
    firstRow?.errorMsg ||
    firstRow?.errormsg ||
    firstRow?.message ||
    "";

  const errorCount = Number(
    payload?.errorCount ??
      payload?.errorcount ??
      firstRow?.errorCount ??
      firstRow?.errorcount ??
      0
  );

  return { errorMsg: normalizeString(errorMsg), errorCount };
};

const displayDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const PostBUDBB = ({
  isOpen = true,
  onClose,
  onPosted,
  branchCode = "",
  listEndpoint = LIST_ENDPOINT,
  postEndpoint = POST_ENDPOINT,
  title = "Post Budget Beginning Upload",
}) => {
  const { companyInfo, currentUserRow } = useAuth();
  const decAmt = companyInfo?.amtDec || companyInfo?.amountDec || DEC_AMT;

  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState({});
  const [searchText, setSearchText] = useState("");

  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter((row) => {
      const haystack = [
        getRowDocNo(row),
        row.docDate,
        row.budgetYear,
        row.refNo,
        row.sourceFileName,
        row.remarks,
        row.totalBudgetAmount,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [rows, searchText]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedDocIds[getRowDocId(row)]),
    [rows, selectedDocIds]
  );

  const selectedTotalAmount = useMemo(
    () =>
      selectedRows.reduce(
        (sum, row) => sum + (Number(String(row.totalBudgetAmount || 0).replace(/,/g, "")) || 0),
        0
      ),
    [selectedRows]
  );

  const loadPostingRows = useCallback(async () => {
    if (!isOpen) return;

    setIsLoading(true);

    try {
      const response = await postRequest(
        listEndpoint,
        JSON.stringify({
          branchCode: branchCode || "",
          userCode: currentUserRow?.userCode || "",
        })
      );

      const { errorMsg, errorCount } = extractError(response);
      if (errorMsg || errorCount > 0) {
        useSwalErrorAlert("Load Error", errorMsg || "Unable to load BUDBB documents for posting.");
        setRows([]);
        return;
      }

      const nextRows = extractRows(response).map((row) => ({
        ...row,
        documentID: getRowDocId(row),
        docNo: getRowDocNo(row),
      }));

      setRows(nextRows);
      setSelectedDocIds({});
    } catch (error) {
      useSwalErrorAlert(
        "Load Error",
        error?.response?.data?.message || error?.message || "Unable to load BUDBB documents for posting."
      );
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [branchCode, currentUserRow?.userCode, isOpen, listEndpoint]);

  useEffect(() => {
    loadPostingRows();
  }, [loadPostingRows]);

  const toggleRow = (row) => {
    const docId = getRowDocId(row);
    if (!docId) return;

    setSelectedDocIds((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const toggleAllVisible = () => {
    const visibleDocIds = filteredRows.map(getRowDocId).filter(Boolean);
    const everyVisibleSelected =
      visibleDocIds.length > 0 && visibleDocIds.every((docId) => selectedDocIds[docId]);

    setSelectedDocIds((prev) => {
      const next = { ...prev };
      visibleDocIds.forEach((docId) => {
        next[docId] = !everyVisibleSelected;
      });
      return next;
    });
  };

  const postRows = async (rowsToPost = []) => {
    const validRows = rowsToPost.filter((row) => getRowDocId(row) && getRowDocNo(row));

    if (!validRows.length) {
      useSwalErrorAlert("Posting Validation", "Please select at least one BUDBB document to post.");
      return;
    }

    const confirm = await useSwalProceedConfirm(
      "Post Budget Beginning?",
      `This will finalize ${validRows.length} selected BUDBB document(s).`,
      "Yes, Post",
      "No"
    );

    if (!confirm?.isConfirmed) return;

    setIsLoading(true);

    try {
      const errors = [];
      let postedCount = 0;

      for (const row of validRows) {
        const documentID = getRowDocId(row);
        const documentNo = getRowDocNo(row);

        const response = await postRequest(
          postEndpoint,
          JSON.stringify({
            json_data: {
              documentID,
              docId: documentID,
              bbId: documentID,
              documentNo,
              docNo: documentNo,
              bbNo: documentNo,
              userCode: currentUserRow?.userCode || "",
            },
          })
        );

        const { errorMsg, errorCount } = extractError(response);
        const isSuccess = response?.success === true || response?.data?.success === true;

        if (errorMsg || errorCount > 0 || response?.data?.success === false || response?.success === false) {
          errors.push(`${documentNo}: ${errorMsg || "Unable to post document."}`);
          continue;
        }

        if (isSuccess || !errorMsg) {
          postedCount += 1;
        }
      }

      if (errors.length) {
        await Swal.fire({
          icon: postedCount > 0 ? "warning" : "error",
          title: postedCount > 0 ? "Posting Partially Completed" : "Posting Failed",
          html: `<div style="text-align:left; white-space:pre-wrap;">${errors
            .map((msg) => `• ${msg}`)
            .join("\n")}</div>`,
        });
      } else {
        useSwalSuccessAlert("Success", "Budget Beginning posting completed.");
      }

      await loadPostingRows();
      onPosted?.({ postedCount, errors });
    } catch (error) {
      useSwalErrorAlert(
        "Posting Error",
        error?.response?.data?.message || error?.message || "Unable to post Budget Beginning document(s)."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-3 backdrop-blur-sm">
      {isLoading && <LoadingSpinner />}

      <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select open BUDBB documents and post/finalize them into budget movement.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
            title="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search document no., year, ref no., source file..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadPostingRows}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faRotateRight} className="mr-2" />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => postRows(selectedRows)}
              disabled={!selectedRows.length || isLoading}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                selectedRows.length && !isLoading
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "cursor-not-allowed bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <FontAwesomeIcon icon={faCheck} className="mr-2" />
              Post Selected
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-blue-50 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <th className="sticky top-0 z-10 w-12 border-b border-slate-200 bg-blue-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={
                      filteredRows.length > 0 &&
                      filteredRows.every((row) => selectedDocIds[getRowDocId(row)])
                    }
                    onChange={toggleAllVisible}
                  />
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-blue-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">Doc No.</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-blue-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">Date</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-blue-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">Budget Year</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-blue-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">Ref No.</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-blue-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">Source File</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-blue-50 px-3 py-3 text-right dark:border-slate-700 dark:bg-slate-800">Total Amount</th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-blue-50 px-3 py-3 dark:border-slate-700 dark:bg-slate-800">Remarks</th>
              </tr>
            </thead>

            <tbody>
              {filteredRows.map((row) => {
                const docId = getRowDocId(row);
                const isSelected = !!selectedDocIds[docId];

                return (
                  <tr
                    key={docId || getRowDocNo(row)}
                    className={`cursor-pointer transition hover:bg-blue-50 dark:hover:bg-slate-800 ${
                      isSelected ? "bg-blue-50 dark:bg-slate-800" : "bg-white dark:bg-slate-900"
                    }`}
                    onClick={() => toggleRow(row)}
                    onDoubleClick={() => postRows([row])}
                  >
                    <td className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 font-semibold text-blue-700 dark:border-slate-800 dark:text-blue-300">
                      {getRowDocNo(row)}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">{displayDate(row.docDate)}</td>
                    <td className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">{row.budgetYear || ""}</td>
                    <td className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">{row.refNo || ""}</td>
                    <td className="max-w-[220px] truncate border-b border-slate-100 px-3 py-2 dark:border-slate-800" title={row.sourceFileName || ""}>
                      {row.sourceFileName || ""}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-right dark:border-slate-800">
                      {formatNumber(row.totalBudgetAmount || 0, decAmt)}
                    </td>
                    <td className="max-w-[320px] truncate border-b border-slate-100 px-3 py-2 dark:border-slate-800" title={row.remarks || ""}>
                      {row.remarks || ""}
                    </td>
                  </tr>
                );
              })}

              {!filteredRows.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No open BUDBB documents found for posting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            Selected: <span className="font-semibold">{selectedRows.length}</span> / {rows.length}
            <span className="mx-2 text-slate-300">|</span>
            Selected Amount: <span className="font-semibold">{formatNumber(selectedTotalAmount, decAmt)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => postRows(selectedRows)}
              disabled={!selectedRows.length || isLoading}
              className={`rounded-xl px-5 py-2 text-sm font-semibold text-white transition ${
                selectedRows.length && !isLoading
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "cursor-not-allowed bg-slate-300 dark:bg-slate-700"
              }`}
            >
              Post Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostBUDBB;
