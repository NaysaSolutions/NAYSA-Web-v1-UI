// src/NAYSA Cloud/UserAccessRights/Lookup/SetUserRole.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner, faSave, faTimes, faSearch } from "@fortawesome/free-solid-svg-icons";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalWarningAlert,
} from "@/NAYSA Cloud/Global/behavior";

export default function UserRoleModal({ isOpen, user, onClose }) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [appliedSet, setAppliedSet] = useState(new Set()); // roles already applied (server truth)
  const [selected, setSelected] = useState([]);            // checkbox state in UI
  const [pendingUnassign, setPendingUnassign] = useState(new Set()); // roles you explicitly unchecked
  const [query, setQuery] = useState("");

  const userCode = user?.userCode || user?.USER_CODE || "";

  // --- Helpers ---------------------------------------------------------------
  const norm = (v) => String(v ?? "").trim();

  const parseRoleRows = (res) => {
    let rows = [];
    if (Array.isArray(res?.data) && res.data[0]?.result) {
      try { rows = JSON.parse(res.data[0].result) || []; } catch { rows = []; }
    } else if (Array.isArray(res?.data)) {
      rows = res.data;
    }
    return rows;
  };

  const loadUserRoles = useCallback(async () => {
    if (!userCode) return;
    setLoading(true);
    try {
      // 1) Load all roles
      const { data: rolesRes } = await apiClient.get("/role");
      const roleData =
        (Array.isArray(rolesRes?.data) && rolesRes.data[0]?.result)
          ? JSON.parse(rolesRes.data[0].result || "[]")
          : (Array.isArray(rolesRes?.data) ? rolesRes.data : []);
      setRoles(Array.isArray(roleData) ? roleData : []);

      // 2) Load this user's existing roles (server truth)
      const { data: urRes } = await apiClient.get("/getUserRoles", {
        params: { json_data: JSON.stringify({ users: [userCode] }) },
      });

      const rows = parseRoleRows(urRes);
      const filteredRows = rows.filter(r =>
        norm(r.userCode ?? r.USER_CODE ?? r.user_code ?? r.UserCode) === norm(userCode)
      );

      const applied = new Set(
        filteredRows
          .map(r => norm(r.roleCode ?? r.ROLE_CODE ?? r.role_code ?? r.RoleCode))
          .filter(Boolean)
      );

      setAppliedSet(applied);
      setSelected(Array.from(applied));     // UI mirrors server
      setPendingUnassign(new Set());        // nothing pending after a fresh load
    } catch (e) {
      console.error("Load user roles error:", e);
      await useSwalErrorAlert("Error", e?.response?.data?.message || e.message || "Failed to load user roles.");
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  // Initial/when opened
  useEffect(() => {
    if (!isOpen || !userCode) return;
    let alive = true;
    (async () => {
      await loadUserRoles();
      if (!alive) return;
    })();
    return () => { alive = false; };
  }, [isOpen, userCode, loadUserRoles]);

  // --- Derived ---------------------------------------------------------------
  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(r =>
      String(r.roleCode || "").toLowerCase().includes(q) ||
      String(r.roleName || "").toLowerCase().includes(q)
    );
  }, [roles, query]);

  // --- UI Actions ------------------------------------------------------------
  const toggle = (roleCode) => {
    setSelected(prev => {
      const isChecked = prev.includes(roleCode);
      // When unchecking an applied role, mark it for unassign
      if (isChecked) {
        // going from checked -> unchecked
        if (appliedSet.has(roleCode)) {
          setPendingUnassign(prevPending => new Set([...prevPending, roleCode]));
        }
        return prev.filter(x => x !== roleCode);
      } else {
        // going from unchecked -> checked
        setPendingUnassign(prevPending => {
          if (prevPending.has(roleCode)) {
            const copy = new Set(prevPending);
            copy.delete(roleCode); // user re-checked: cancel pending unassign
            return copy;
          }
          return prevPending;
        });
        return [...prev, roleCode];
      }
    });
  };

  const handleSave = async () => {
    if (!userCode) {
      await useSwalWarningAlert("No user", "Please pick a user first.");
      return;
    }

    // Full desired set from the UI
    const desired = Array.from(new Set(selected.filter(Boolean)));

    // If nothing changed compared to server truth, skip
    const applied = Array.from(appliedSet);
    const sameSize = desired.length === applied.length;
    const sameItems = sameSize && desired.every(r => appliedSet.has(r));
    if (sameItems) {
      await useSwalWarningAlert("No changes", "Nothing to update.");
      return;
    }

    setLoading(true);
    try {
      // IMPORTANT: send FULL set to avoid accidental removals
      const payload = {
        dt1: desired.map(roleCode => ({ roleCode })), // full selection
        dt2: [{ userCode }],
      };

      const { data: res } = await apiClient.post("/UpsertUserRole", {
        json_data: { json_data: payload },
      });

      if (res?.data?.status !== "success") {
        throw new Error(res?.data?.message || "Failed to save roles.");
      }

      await useSwalSuccessAlert("Saved!", "User roles updated successfully.");

      // Refresh from server so UI matches the true state
      // (or: setAppliedSet(new Set(desired)); setSelected(desired);)
      await loadUserRoles?.();
    } catch (e) {
      console.error("Save roles error:", e);
      await useSwalErrorAlert("Error", e?.response?.data?.message || e.message || "Failed to update user roles.");
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <div>
            <h2 className="text-base md:text-lg font-semibold">
              Set User Role
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              User: <span className="font-medium">{user?.userName || userCode}</span>
            </p>
          </div>
          <button
            onClick={() => onClose?.(false)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Search */}
          <div className="mb-3">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search role code or name…"
                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled pl-8"
              />
              <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div className="global-ref-table-main-div-ui">
            <div className="global-ref-table-main-sub-div-ui">
              <div className="global-ref-table-div-ui max-h-[50vh] overflow-auto">
                <table className="global-ref-table-div-ui">
                  <thead className="global-ref-thead-div-ui">
                    <tr>
                      <th className="global-ref-th-ui">Role Code</th>
                      <th className="global-ref-th-ui">Role Name</th>
                      <th className="global-ref-th-ui text-center">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="global-ref-norecords-ui">
                          <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                          Loading…
                        </td>
                      </tr>
                    ) : filteredRoles.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="global-ref-norecords-ui">
                          No roles found
                        </td>
                      </tr>
                    ) : (
                      filteredRoles.map((r, idx) => {
                        const code = r.roleCode ?? r.role_code ?? r.ROLE_CODE ?? r.RoleCode;
                        const name = r.roleName ?? r.role_name ?? r.ROLE_NAME ?? r.RoleName;
                        const checked = selected.includes(code);
                        return (
                          <tr key={code ?? idx} className="global-tran-tr-ui">
                            <td className="global-ref-td-ui">{code}</td>
                            <td className="global-ref-td-ui">{name}</td>
                            <td className="global-ref-td-ui text-center">
                              <input
                                type="checkbox"
                                className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={checked}
                                onChange={() => toggle(code)}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-end gap-2">
          <button
            onClick={() => onClose?.(false)}
            className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-white"
            disabled={loading}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
            title="Save roles"
          >
            {loading ? <FontAwesomeIcon icon={faSpinner} spin className="mr-2" /> : <FontAwesomeIcon icon={faSave} className="mr-2" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
