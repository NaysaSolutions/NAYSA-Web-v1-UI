import { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt, faPlus, faSave, faUndo } from "@fortawesome/free-solid-svg-icons";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalDeleteConfirm,
  useSwalDeleteSuccess
} from "@/NAYSA Cloud/Global/behavior";

const UsersTab = forwardRef(({ roles, fetchRoles, user, saving, setSaving }, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [roleCode, setRoleCode] = useState("");
  const [roleName, setRoleName] = useState("");
  const [active, setRoleActive] = useState("Y");
  const [editingRole, setEditingRole] = useState(null);

  // Table helpers
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("code");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Per-column filters
  const [columnFilters, setColumnFilters] = useState({
    code: "",
    description: "",
    active: "",
  });

  const isEditingExisting = !!editingRole;

  // Global Ctrl+S
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveRole();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, isEditing, editingRole]);

  // Helper function for case-insensitive string includes
  const includesCI = (str, searchValue) => {
    return String(str || "").toLowerCase().includes(String(searchValue).toLowerCase());
  };

  // Search + COLUMN FILTERS + sort + pagination
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = q
      ? roles.filter((r) =>
          [r.roleCode, r.roleName].some((x) =>
            String(x || "")
              .toLowerCase()
              .includes(q)
          )
        )
      : roles;

    const withColFilters = base.filter((r) => {
      const f = columnFilters;
      if (f.code && !includesCI(r.roleCode, f.code)) return false;
      if (f.description && !includesCI(r.roleName, f.description)) return false;
      if (f.active && String(r.active ?? "") !== String(f.active)) return false;
      return true;
    });

    const factor = sortDir === "asc" ? 1 : -1;
    return [...withColFilters].sort((a, b) => {
      const A = String(a?.[sortBy] ?? "");
      const B = String(b?.[sortBy] ?? "");
      return A.localeCompare(B) * factor;
    });
  }, [roles, query, columnFilters, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleSaveRole = async () => {
    setSaving(true);
    if (!roleCode || !roleName) {
      await useSwalErrorAlert("Error!", "Please fill out Role Code and Description.");
      setSaving(false);
      return;
    }
    try {
      const payload = {
        roleCode: roleCode,
        roleName: roleName,
        active: active || "Y",
        userCode: user.USER_CODE
      };
      
      const { data: res } = await apiClient.post("/upsertRole", { 
        json_data: { json_data: payload } 
      });
      
      if (res.data?.status === "success") {
        await useSwalSuccessAlert("Success!", "Role saved successfully!");
        await fetchRoles();
        resetForm();
        setIsEditing(false);
      } else {
        await useSwalErrorAlert("Error!", res.data?.message || "Something went wrong.");
      }
    } catch (e) {
      console.error("Error saving role:", e);
      await useSwalErrorAlert(
        "Error!", 
        e?.response?.data?.message || "Error saving role. Please check the console for details."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (index) => {
    const r = roles[index];
    if (!r?.roleCode) return;
    
    const confirm = await useSwalDeleteConfirm(
      "Delete this role?",
      `Code: ${r.roleCode} | Description: ${r.roleName || ""}`,
      "Yes, delete it"
    );
    
    if (!confirm.isConfirmed) return;

    try {
      const { data: response } = await apiClient.post("/deleteRole", { ROLE_CODE: r.roleCode });

      if (response.data.status === "success") {
        await useSwalDeleteSuccess();
        await fetchRoles();
      } else {
        await useSwalErrorAlert("Error", response.data.message || "Failed to delete role.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      await useSwalErrorAlert("Error", "Failed to delete role.");
    }
  };

  const resetForm = () => {
    setRoleCode("");
    setRoleName("");
    setRoleActive("Y");
    setEditingRole(null);
    setIsEditing(false);
  };

  const handleEditRow = (index) => {
    const role = roles[index];
    setRoleCode(role.roleCode);
    setRoleName(role.roleName);
    setRoleActive(role.active);
    setEditingRole(role);
    setIsEditing(true);
  };

  const startNew = () => {
    resetForm();
    setIsEditing(true);
  };

   useImperativeHandle(ref, () => ({
    add: startNew,
    save: handleSaveRole,
    reset: resetForm,
  }));

  return (
    <div className="w-full">
      

      {/* Two Columns Side by Side */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Form Column */}
        <div className="w-full md:w-1/3">
          <div className="global-ref-textbox-group-div-ui">
            {/* Role Code */}
            <div className="relative">
              <input
                type="text"
                id="roleCode"
                placeholder=" "
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value.toUpperCase())}
                disabled={!isEditing || isEditingExisting}
                className={`peer global-ref-textbox-ui ${
                  isEditing && !isEditingExisting ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
                } ${isEditingExisting ? 'bg-blue-100 cursor-not-allowed' : ''}`}
              />
              <label htmlFor="roleCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                <span className="global-ref-asterisk-ui">*</span> Role Code
              </label>
            </div>

            {/* Role Name */}
            <div className="relative">
              <input
                type="text"
                id="roleName"
                placeholder=" "
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={!isEditing}
                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
              />
              <label htmlFor="roleName" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                <span className="global-ref-asterisk-ui">*</span> Role Name
              </label>
            </div>

            {/* Active */}
            <div className="relative">
              <select
                id="active"
                value={active}
                onChange={(e) => setRoleActive(e.target.value)}
                disabled={!isEditing}
                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
              >
                <option value="Y">Yes</option>
                <option value="N">No</option>
              </select>
              <label htmlFor="active" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>Active?</label>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div className="w-full md:w-2/3">
          <div className="global-ref-table-main-div-ui">
            <div className="global-ref-table-main-sub-div-ui">
              <div className="global-ref-table-div-ui">
                <table className="global-ref-table-div-ui">
                  <thead className="global-ref-thead-div-ui">
                    <tr>
                      <th className="global-ref-th-ui">Role Code</th>
                      <th className="global-ref-th-ui">Role Name</th>
                      <th className="global-ref-th-ui">Status</th>
                      <th className="global-ref-th-ui">Edit</th>
                      <th className="global-ref-th-ui">Delete</th>
                    </tr>
                    {/* Filter row */}
                    <tr>
                      <th className="global-ref-th-ui">
                        <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.code}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, code: e.target.value })); setPage(1); }}
                        />
                      </th>
                      <th className="global-ref-th-ui">
                        <input
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          placeholder="Filter…"
                          value={columnFilters.description}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, description: e.target.value })); setPage(1); }}
                        />
                      </th>
                      <th className="global-ref-th-ui">
                        <select
                          className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                          value={columnFilters.active}
                          onChange={(e) => { setColumnFilters(s => ({ ...s, active: e.target.value })); setPage(1); }}
                        >
                          <option value="">All</option>
                          <option value="Y">Yes</option>
                          <option value="N">No</option>
                        </select>
                      </th>
                      <th className="global-ref-th-ui"></th>
                      <th className="global-ref-th-ui"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.length > 0 ? (
                      roles.map((role, index) => (
                        <tr
                          key={index}
                          className={`global-tran-tr-ui ${editingRole?.roleCode === role.roleCode ? 'bg-blue-50' : ''}`}
                          onClick={() => handleEditRow(index)}
                        >
                          <td className="global-ref-td-ui">{role.roleCode}</td>
                          <td className="global-ref-td-ui">{role.roleName || "-"}</td>
                          <td className="global-ref-td-ui text-center">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${
                                role.active === "Y"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {role.active === "Y" ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="global-ref-td-ui text-center sticky right-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditRow(index);
                              }}
                              className="global-ref-td-button-edit-ui"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                          </td>
                          <td className="global-ref-td-ui text-center sticky right-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRole(index);
                              }}
                              className="global-ref-td-button-delete-ui"
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </td>
                        </tr>
                      ))
                     ) : (
                      <tr>
                        <td colSpan="5" className="global-ref-norecords-ui">
                          No User Roles found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between p-3">
                  <div className="text-xs opacity-80 font-semibold">
                    Total Records: {filtered.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="px-7 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                    >
                      {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}/page
                        </option>
                      ))}
                    </select>
                    <div className="text-xs opacity-80 font-semibold">
                      Page {page} of {totalPages}
                    </div>
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-7 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      Prev
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-7 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default UsersTab;