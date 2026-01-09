import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faSearch,
  faList,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

/* ---------- Small UI helpers ---------- */
const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
    {/* {subtitle ? (
      <div className="text-xs text-gray-500 mt-0.5 leading-4">{subtitle}</div>
    ) : null} */}
  </div>
);

// keep your white-box fix here
const Card = ({ children, className = "" }) => (
  <div
    className={`global-tran-textbox-group-div-ui self-start !h-fit ${className}`}
  >
    {children}
  </div>
);

const parseSprocJsonResult = (rows) => {
  if (!rows || !rows.length) return null;
  const r = rows[0]?.result;
  if (!r) return null;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
};

/**
 * Generic Reference Maintenance
 * - loadEndpoint: GET list
 * - getEndpoint: GET single (query param)
 * - getParamKey: param name e.g. "BILLTERM_CODE"
 * - upsertEndpoint: POST save (expects { json_data: JSON.stringify(payload) })
 * - mapRow: normalize row to {code,name,daysDue,advances,...}
 * - buildUpsertPayload: from form -> json_data payload object (before stringify wrapper)
 */
export default function RefMaintenance({
  title,
  subtitle,
  loadEndpoint,
  getEndpoint,
  upsertEndpoint,
  getParamKey,
  codeLabel = "Code",
  nameLabel = "Name",
  mapRow,
  emptyForm,
  buildUpsertPayload,
  codeKey = "code",
  nameKey = "name",
  daysKey = "daysDue",

  // ✅ NEW (optional) extra column
  extraColLabel = null,
  extraKey = null,
  extraOptions = null, // [{value,label},...]
  extraDefault = "", // e.g. "N"
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [search, setSearch] = useState("");
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);

  const [selectedCode, setSelectedCode] = useState("");
  const [form, setForm] = useState({ ...(emptyForm || {}) });

  // ✅ Pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const updateForm = (patch) => setForm((p) => ({ ...p, ...patch }));

  const loadList = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(loadEndpoint);
      const parsed = parseSprocJsonResult(res?.data?.data);
      const list = Array.isArray(parsed) ? parsed : [];
      const normalized = mapRow ? list.map(mapRow) : list;

      setAllRows(normalized);
      setRows(normalized);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", `Failed to load ${title}.`, "error");
      setAllRows([]);
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOne = async (code) => {
    if (!code) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(getEndpoint, {
        params: { [getParamKey]: code },
      });
      const parsed = parseSprocJsonResult(res?.data?.data);
      const row = Array.isArray(parsed) ? parsed?.[0] : null;

      if (!row) return Swal.fire("Info", `${title} not found.`, "info");

      const normalized = mapRow ? mapRow(row) : row;
      setSelectedCode(normalized?.[codeKey] ?? code);
      setForm((p) => ({ ...(emptyForm || {}), ...p, ...normalized }));
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", `Failed to fetch ${title}.`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const save = async () => {
    const code = String(form?.[codeKey] ?? "").trim();
    const name = String(form?.[nameKey] ?? "").trim();

    if (!code)
      return Swal.fire("Required", `${codeLabel} is required.`, "warning");
    if (!name)
      return Swal.fire("Required", `${nameLabel} is required.`, "warning");

    setIsLoading(true);
    try {
      const payload = buildUpsertPayload(form);

      await apiClient.post(upsertEndpoint, {
        json_data: JSON.stringify(payload),
      });

      Swal.fire("Saved", `${title} saved successfully.`, "success");
      setSelectedCode(code);
      setIsEditing(false);
      await loadList();
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Error",
        e?.response?.data?.message || `Failed to save ${title}.`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addNew = () => {
    setSelectedCode("");
    setForm({ ...(emptyForm || {}) });
    setIsEditing(true);
  };

  const reset = () => {
    setSelectedCode("");
    setForm({ ...(emptyForm || {}) });
    setIsEditing(false);
  };

  const applySearch = (q) => {
    const s = String(q ?? "").trim().toLowerCase();
    if (!s) return setRows(allRows);

    setRows(
      allRows.filter((r) => {
        const c = String(r?.[codeKey] ?? "").toLowerCase();
        const n = String(r?.[nameKey] ?? "").toLowerCase();
        return c.includes(s) || n.includes(s);
      })
    );
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applySearch(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, allRows]);

  // ✅ Reset page when searching or changing page size
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  // ✅ Pagination computations
  const totalRows = rows?.length || 0;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalRows / pageSize));
  }, [totalRows, pageSize]);

  useEffect(() => {
    // clamp page if rows shrink
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (rows || []).slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const buttons = useMemo(
    () => [
      { key: "add", label: "Add", icon: faPlus, onClick: addNew, disabled: isLoading },
      { key: "save", label: "Save", icon: faSave, onClick: save, disabled: isLoading },
      { key: "reset", label: "Reset", icon: faUndo, onClick: reset, disabled: isLoading },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLoading, form]
  );

  return (
    <>
      {/* Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faList} className="text-gray-500" />
            <div>
              <div className="text-sm font-bold text-gray-800">{title}</div>
              {/* <div className="text-xs text-gray-500">{subtitle}</div> */}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or name..."
                className="global-tran-textbox-ui w-full sm:w-[260px]"
                disabled={isLoading}
              />
            </div>

            <ButtonBar buttons={buttons} />
          </div>
        </div>
      </Card>

      {/* List + Form */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
        {/* FORM */}
        <Card>
          <SectionHeader
            title="Basic Information"
            subtitle={
              isEditing ? "Edit mode enabled." : "View mode. Click Add to create or edit."
            }
          />

          <div className="grid grid-cols-1 gap-3">
            <FieldRenderer
              label={codeLabel}
              required
              type="text"
              value={form?.[codeKey] ?? ""}
              onChange={(v) => updateForm({ [codeKey]: v })}
              readOnly={!isEditing}
              disabled={isLoading}
            />

            <FieldRenderer
              label={nameLabel}
              required
              type="text"
              value={form?.[nameKey] ?? ""}
              onChange={(v) => updateForm({ [nameKey]: v })}
              readOnly={!isEditing}
              disabled={isLoading}
            />

            {/* Optional fields — only show if keys exist in form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FieldRenderer
                label="Due Days"
                required
                type="number"
                value={form?.[daysKey] ?? 0}
                onChange={(v) => updateForm({ [daysKey]: v })}
                readOnly={!isEditing}
                disabled={isLoading}
              />

              {extraKey ? (
                <FieldRenderer
                  label={extraColLabel || "Extra"}
                  type="select"
                  options={extraOptions || []}
                  value={(form?.[extraKey] ?? extraDefault) || extraDefault}
                  onChange={(v) => updateForm({ [extraKey]: v })}
                  readOnly={!isEditing}
                  disabled={isLoading}
                />
              ) : null}
            </div>
          </div>
        </Card>

        {/* LIST */}
        <Card>
          <SectionHeader
            title="List"
            subtitle="Click a row to view. Double-click to load details."
          />

          <div className="overflow-auto border border-gray-100 rounded-md">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="text-gray-600">
                  <th className="text-left px-3 py-2 font-bold">Pay Term Code</th>
                  <th className="text-left px-3 py-2 font-bold">Pay Term Name</th>
                  <th className="text-right px-3 py-2 font-bold">Due Days</th>
                  {extraKey ? (
                    <th className="text-left px-3 py-2 font-bold">
                      {extraColLabel || "Extra"}
                    </th>
                  ) : null}
                </tr>
              </thead>

              <tbody>
                {(pagedRows || []).map((r) => {
                  const code = r?.[codeKey] ?? "";
                  const active = String(code) === String(selectedCode);

                  return (
                    <tr
                      key={code || Math.random()}
                      className={`cursor-pointer border-t ${
                        active ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedCode(code);
                        setForm((p) => ({ ...p, ...r }));
                      }}
                      onDoubleClick={() => fetchOne(code)}
                    >
                      <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                        {code}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r?.[nameKey] ?? ""}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {Number(r?.[daysKey] ?? 0)}
                      </td>
                      {extraKey ? (
                        <td className="px-3 py-2 text-gray-700">
                          {(() => {
                            const raw =
                              (r?.[extraKey] ?? extraDefault) || extraDefault;
                            const opt = (extraOptions || []).find(
                              (o) =>
                                String(o.value).toUpperCase() ===
                                String(raw).toUpperCase()
                            );
                            return opt?.label ?? raw;
                          })()}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}

                {!isLoading && (!rows || rows.length === 0) ? (
                  <tr>
                    <td
                      colSpan={extraKey ? 4 : 3}
                      className="px-3 py-6 text-center text-gray-500"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* ✅ Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>Rows per page:</span>
              <select
                className="global-tran-textbox-ui w-[90px]"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                disabled={isLoading}
              >
                {[10, 20, 30, 40, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <span className="text-gray-500">
                {totalRows === 0
                  ? "0–0 of 0"
                  : `${(page - 1) * pageSize + 1}–${Math.min(
                      page * pageSize,
                      totalRows
                    )} of ${totalRows}`}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={isLoading || page <= 1}
              >
                Prev
              </button>

              <span className="text-xs text-gray-600">
                Page {page} / {totalPages}
              </span>

              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={isLoading || page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
