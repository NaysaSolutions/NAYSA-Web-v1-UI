import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faList,
  faTrashAlt,
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

import {
  useSwalErrorAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalshowSave,
  useSwalValidationAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useGlobalDeleteRefTable
} from "@/NAYSA Cloud/Global/reftable";

/* ================= HELPERS ================= */

const Card = ({ children }) => (
  <div className="global-tran-textbox-group-div-ui self-start !h-fit">{children}</div>
);

const SectionHeader = ({ title }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
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

/* ================= COMPONENT ================= */

export default function BillTermRef() {
  const title = "Billing Terms";
  const { user } = useAuth();


  const userCode =
    user?.userCode || user?.user_code || user?.USER_CODE || user?.UserCode || user?.code || "";

  const emptyForm = {
    code: "",
    name: "",
    daysDue: "",
    advances: "",
    active: "Y",
  };

  const [form, setForm] = useState(emptyForm);
  const formRef = useRef(form);
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");





  const [isDupCode, setIsDupCode] = useState(false);

  const codeInputRef = useRef(null); // to refocus after clearing
  const dupAlertingRef = useRef(false);

  const isDuplicateLocal = (code) => {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return false;

    return allRows.some(
      (r) => String(r?.code || "").trim().toUpperCase() === c
    );
  };

  const showValidation = async (title, lines) => {
    const msg = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
    return useSwalValidationAlert({
      icon: "error",
      title,
      message: msg,
    });
  };

  const checkDuplicate = async (code) => {
    const c = (code || "").trim();
    if (!c) return false;

    const res = await apiClient.post("/checkDuplicateBillterm", {
      json_data: { billtermCode: c },
    });

    const raw =
      res?.data?.data?.[0]?.result ??
      res?.data?.data?.[0]?.[""] ??
      '{"result":"0"}';

    const parsed = JSON.parse(raw);
    return parsed.result === "1";
  };


  const handleBillTermCodeBlur = async (e) => {
    // ✅ If blur happens right after Enter, skip blur validation
    if (e?.type === "blur" && e?.relatedTarget === null) {
      // still allow normal blur (mouse click, tab out, etc.)
    }

    // ✅ If this is blur but Enter was just pressed, ignore it
    if (e?.type === "blur" && e?.target?.dataset?.enterValidated === "1") {
      e.target.dataset.enterValidated = "0";
      return;
    }

    // ✅ Only handle Enter on keydown
    if (e?.type === "keydown") {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.target.dataset.enterValidated = "1"; // mark Enter validation happened
    }

    const code = (form.code || "").trim();
    if (!code) return;

    const isAddMode = !selectedCode;
    if (!isAddMode || !isEditing) return;

    try {
      const dup = await checkDuplicate(code);
      setIsDupCode(dup);

      if (dup) {
        await showValidation("Duplicate Entry", ["Duplicate Code is not allowed."]);
        updateForm({ code: "" });
        setIsDupCode(false);
        setTimeout(() => codeInputRef.current?.focus?.(), 0);
        return;
      }
    } catch (err) {
      console.error(err);
    }
  };


  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const updateForm = (patch) => {
    formRef.current = { ...formRef.current, ...patch };
    setForm((p) => ({ ...p, ...patch }));
  };

  /* ================= NORMALIZER ================= */

  const normalizeRow = (x) => ({
    code: x?.billtermCode ?? x?.billterm_code ?? "",
    name: x?.billtermName ?? x?.billterm_name ?? "",
    daysDue: x?.daysDue ?? x?.days_due ?? 0,
    advances: x?.advances === "Y" ? "Y" : "",
    active: x?.active === "N" ? "N" : "Y",
    registeredBy: x?.registeredBy ?? "",
    registeredDate: x?.registeredDate ?? "",
    lastUpdatedBy: x?.lastUpdatedBy ?? "",
    lastUpdatedDate: x?.lastUpdatedDate ?? "",
  });

  /* ================= LOAD LIST ================= */

  const loadList = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await apiClient.get("/billterm");

      const raw = Array.isArray(res.data?.data)
        ? parseSprocJsonResult(res.data.data) || []
        : [];

      const normalized = raw.map(normalizeRow);

      setRows(normalized);
      setAllRows(normalized);
    } catch (err) {
      console.error(err);
      useSwalErrorAlert("Error", "Failed to load Billing Terms.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ================= FETCH ONE ================= */

  const fetchOne = async (code) => {
    if (!code) return;

    try {
      // setIsLoading(true);

      const res = await apiClient.get("/getBillterm", {
        params: { BILLTERM_CODE: code },
      });

      const parsed = parseSprocJsonResult(res?.data?.data);
      const row = parsed?.[0];

      if (!row) return;

      const normalized = normalizeRow(row);

      setForm(normalized);
      setSelectedCode(normalized.code);
      setIsDupCode(false);
    } catch (e) {
      console.error(e);
      await useSwalErrorAlert("Error", "Failed to fetch record.");
    } finally {
      setIsLoading(false);
    }
  };



  /* ================= SAVE ================= */
  const save = async () => {
    const f = form;

    // ✅ still ok to block only on pure duplicate in ADD mode (optional)
    const isAddMode = !selectedCode;
    if (isAddMode) {
      const dup = await checkDuplicate(f.code);
      setIsDupCode(dup);
      if (dup) {
        await showValidation("Duplicate Entry", ["Duplicate Billing Term Code is not allowed."]);
        updateForm({ code: "" });
        setIsDupCode(false);
        return;
      }
    }

    
    const payload = {
      json_data: {
        billtermCode: String(f.code ?? "").trim(),
        billtermName: String(f.name ?? "").trim(),
        dueDays: String(f.daysDue ?? "").trim() === "" ? null : Number(f.daysDue),
        userCode,
      },
    };

    try {
      const resp = await apiClient.post("/upsertBillterm", {
        json_data: JSON.stringify(payload),
      });

      // ✅ SQL-driven validation
      if (Number(resp?.data?.errorcount || 0) > 0) {
        await showValidation("Save Failed", [resp?.data?.errormsg || "Validation error."]);
        return;
      }

      await useSwalshowSave();
      setIsEditing(false);

      const updatedRow = {
        code: payload.json_data.billtermCode,
        name: payload.json_data.billtermName,
        daysDue: payload.json_data.dueDays ?? "",
        advances: f.advances ?? "",
        active: f.active ?? "Y",
        lastUpdatedBy: userCode,
        lastUpdatedDate: new Date().toISOString(),
      };

      // ✅ Update list immediately (NO reload)
      setAllRows((prevAll) => {
        const exists = prevAll.some((r) => r.code === updatedRow.code);
        const nextAll = exists
          ? prevAll.map((r) => (r.code === updatedRow.code ? { ...r, ...updatedRow } : r))
          : [...prevAll, updatedRow];

        nextAll.sort((a, b) =>
          String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
        );

        const s = (search || "").trim().toLowerCase();
        setRows(
          !s
            ? nextAll
            : nextAll.filter(
              (r) =>
                String(r.code || "").toLowerCase().includes(s) ||
                String(r.name || "").toLowerCase().includes(s)
            )
        );

        return nextAll;
      });

      setSelectedCode(updatedRow.code);
      setForm((prev) => ({ ...prev, ...updatedRow }));
      setIsDupCode(false);
    } catch (e) {
      console.error(e);
      await useSwalErrorAlert("Error", "Failed to save record.");
    }
  };
  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!search) return setRows(allRows);

    const s = search.toLowerCase();
    setRows(
      allRows.filter(
        (r) => r.code.toLowerCase().includes(s) || r.name.toLowerCase().includes(s)
      )
    );
  }, [search, allRows]);

  /* ================= BUTTONS ================= */

  const buttons = [
    {
      key: "add", label: "Add", icon: faPlus, onClick: () => {
        setForm(emptyForm);
        setSelectedCode("");
        setIsEditing(true);
        setIsDupCode(false);
      }
    },
    { key: "save", label: "Save", icon: faSave, onClick: save, disabled: !isEditing || isDupCode },
    {
      key: "reset",
      label: "Reset",
      icon: faUndo,
      onClick: () => {
        setForm(emptyForm);
        setSelectedCode("");
        setIsEditing(false);
        setIsDupCode(false);
      },
    }
  ];

  const columns = useMemo(
    () => [
      { key: "code", label: "Billing Term Code", sortable: true },
      { key: "name", label: "Billing Term Name", sortable: true },
      {
        key: "daysDue",
        label: "Due Days",
        sortable: true,
        renderType: "number",
        render: (row) => {
          const v = row?.daysDue;
          if (v === null || v === undefined || v === "") return "";
          const n = Number(v);
          return Number.isFinite(n) ? String(Math.trunc(n)) : "";
        },
      },
      { key: "active", label: "Active" },
      {
        key: "action",
        label: "Actions",
        render: (row) => (
          <div className="flex gap-3 items-center justify-center">

            {/* EDIT ICON */}
            <FontAwesomeIcon
              icon={faPenToSquare}
              className="cursor-pointer text-blue-600 hover:text-blue-800"
              onClick={() => {
                fetchOne(row.code);
                setIsEditing(true);
              }}
              title="Edit"
            />

            <FontAwesomeIcon
              icon={faTrashAlt}
              className="cursor-pointer text-red-600 hover:text-red-800"
              title="Delete"
              onClick={async () => {
                await useGlobalDeleteRefTable({
                  rowParam: row,
                  selectedAccount: form,
                  tblCode: "Billterm",
                  idKey: "code",
                  fieldcaption: "Billing Term",

                  payload: {
                    json_data: {
                      billtermCode: row.code,
                      userCode: userCode,
                    },
                  },

                  onSuccess: async () => {
                    setRows(prev => prev.filter(r => r.code !== row.code));
                    setAllRows(prev => prev.filter(r => r.code !== row.code));
                  },
                  onReset: () => {
                    if (selectedCode === row.code) {
                      setForm(emptyForm);
                      setSelectedCode("");
                    }
                  },
                });
              }}
            />

          </div>
        ),
      },
    ],
    [selectedCode, loadList]
  );
  /* ================= UI ================= */

  return (
    <>
      <Card>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faList} />
            <div className="font-bold">{title}</div>
          </div>

          <div className="flex gap-3 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="global-tran-textbox-ui w-[250px]"
            />
            <ButtonBar buttons={buttons} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

        {/* FORM */}
        <Card>
          <SectionHeader title="Basic Information" />
          <FieldRenderer
            label="Billing Term Code"
            type="text"
            value={form.code}
            inputRef={codeInputRef}
            onChange={(v) => {
              updateForm({ code: v });
              setIsDupCode(false);
            }}
            onBlur={handleBillTermCodeBlur}
            onKeyDown={handleBillTermCodeBlur}
            disabled={!isEditing || selectedCode !== ""}
          />

          <FieldRenderer
            label="Billing Term Name"
            type="text"
            value={form.name}
            onChange={(v) => updateForm({ name: v })}
            disabled={!isEditing}
          />

          <FieldRenderer
            label="Due Days"
            type="number"
            value={form.daysDue}
            onChange={(v) => updateForm({ daysDue: v })}
            disabled={!isEditing}
          />

          <FieldRenderer
            label="Active"
            type="select"
            options={[
              { value: "Y", label: "Yes" },
              { value: "N", label: "No" },
            ]}
            value={form.active}
            onChange={(v) => updateForm({ active: v })}
            disabled={!isEditing}
          />

          <SectionHeader title="Registration Information" />
          <RegistrationInfo data={form} disabled />
        </Card>

        {/* LIST */}
        <div>
          <h2 className="text-base font-semibold mb-4">List</h2>

          <SearchGlobalReferenceTable
            columns={columns}
            data={rows}
            docType="BILLTERM"
            isLoading={isLoading}
            showFilters={true}
            itemsPerPage={20}
            onRowDoubleClick={async (row) => {
              await fetchOne(row.code);
              setIsEditing(true);
            }}
          />
        </div>
      </div>
    </>
  );
}