// RoleAccessTab.jsx — DB-driven menus via MenuController + role overlay via AccessRights sproc
import { useState, forwardRef, useImperativeHandle, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faSpinner, faList } from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  useSwalWarningAlert,
  useSwalSuccessAlert,
  useSwalErrorAlert,
  useSwalInfoAlert,
} from "@/NAYSA Cloud/Global/behavior";


const RoleAccessTab = forwardRef(({ roles }, ref) => {
  const { user } = useAuth(); // expecting user?.userCode
  const currentUserCode = useMemo(() => user?.userCode || user?.USER_CODE || "", [user]);

  // left table (roles)
  const [selectedRoles, setSelectedRoles] = useState([]);

  // right table (menus)
  const [menus, setMenus] = useState([]); // [{menuCode, menuName}]
  const [checkedMenus, setCheckedMenus] = useState(new Set()); // Set<string>
  const [showMenus, setShowMenus] = useState(false);

  // UX
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [saving, setSaving] = useState(false);




  const loadRoleMenus = async (roleCode) => {
    setLoadingMenus(true);
    setShowMenus(false);
    setMenus([]);
    setCheckedMenus(new Set());

    try {
      const rc = String(roleCode ?? "").trim();
      if (!rc) {
        await useSwalWarningAlert("No Role Selected", "Please select one role to continue.");
        return;
      }

      const { data } = await apiClient.get("/getRoleMenu", {
        params: { ROLE_CODE: rc }  // <-- uppercase, matches controller validator
      });

      const rows =
        Array.isArray(data?.data) && data.data[0]?.result
          ? JSON.parse(data.data[0].result)
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];

      setMenus(rows || []);
      setCheckedMenus(
        new Set(
          (rows || [])
            .filter((r) => Number(r?.selectedMenu) === 1 || r?.selectedMenu === true)
            .map((r) => r?.menuCode)
            .filter(Boolean)
        )
      );
      setShowMenus(true);
    } catch (err) {
      console.error("getRoleMenu failed:", err);
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.detail ||
        err?.message ||
        "Unable to load menus for the selected role.";
      await useSwalErrorAlert("Error", detail);
    } finally {
      setLoadingMenus(false);
    }
  };



  /** Header action: View Modules */
  const handleViewMenus = async () => {
    if (selectedRoles.length === 0) {
      await useSwalWarningAlert("No Role Selected", "Please select one role to continue.");
      return;
    }
    if (selectedRoles.length > 1) {
      await useSwalInfoAlert("Multiple Roles Selected", "Please select only one role when configuring access.");
      return;
    }
    await loadRoleMenus(selectedRoles[0]);
  };

  /** Header action: Save Access (AccessRights:UpsertRoleMenu) */
  const handleSaveAccess = async () => {
    if (selectedRoles.length !== 1) {
      await useSwalWarningAlert("Select Exactly One Role", "Pick a single role, then click Save Access.");
      return;
    }
    if (!showMenus) {
      await useSwalWarningAlert("Nothing to Save", "Click View Modules first, then modify and save.");
      return;
    }

    const rc = String(selectedRoles[0] ?? "").trim();
    const dt1 = Array.from(checkedMenus).map((menuCode) => ({ menuCode }));

    setSaving(true);
    try {
      // EXACT shape the controller/sproc reads:
      const payload = { json_data: { roleCode: rc, dt1 } };

      const { data: res } = await apiClient.post("/upsertRoleMenu", payload);

      // many of your controllers return { success, data:{status}, message }
      const ok =
        res?.success === true ||
        res?.data?.status === "success" ||
        res?.message?.toLowerCase?.().includes("saved");

      if (!ok) {
        throw new Error(res?.message || "Error executing Role Menu Upsert.");
      }

      await useSwalSuccessAlert("Saved!", "Role menu access has been updated.");
      await loadRoleMenus(rc);
    } catch (err) {
      console.error("UpsertRoleMenu failed:", err);
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.errors?.[0]?.detail ||
        err?.message ||
        "Error executing Role Menu Upsert.";
      await useSwalErrorAlert("Save Failed", detail);
    } finally {
      setSaving(false);
    }
  };


  /** Header action: Reset */
  const handleReset = () => {
    setSelectedRoles([]);
    setMenus([]);
    setCheckedMenus(new Set());
    setShowMenus(false);
  };

  /** Expose actions to the header container (UserAccessRights.jsx) */
  useImperativeHandle(ref, () => ({
    viewModules: handleViewMenus,
    saveAccess: handleSaveAccess,
    reset: handleReset,
  }));

  /** Toggle a menu checkbox */
  const toggleMenu = (menuCode) => {
    setCheckedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuCode)) next.delete(menuCode);
      else next.add(menuCode);
      return next;
    });
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Roles (left) */}
        <div className="w-full md:w-1/3">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Roles</h2>
          <div className="global-ref-table-main-div-ui">
            <div className="global-ref-table-main-sub-div-ui">
              <div className="global-ref-table-div-ui">
                <table className="global-ref-table-div-ui">
                  <thead className="global-ref-thead-div-ui">
                    <tr>
                      <th className="global-ref-th-ui">Role Code</th>
                      <th className="global-ref-th-ui">Role Name</th>
                      <th className="global-ref-th-ui text-center">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles?.length ? (
                      roles.map((role, idx) => (
                        <tr key={role.roleCode ?? idx} className="global-tran-tr-ui">
                          <td className="global-ref-td-ui">{role.roleCode}</td>
                          <td className="global-ref-td-ui">{role.roleName}</td>
                          <td className="global-ref-td-ui text-center">
                            <input
                              type="checkbox"
                              className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={selectedRoles.includes(role.roleCode)}
                              onChange={() =>
                                setSelectedRoles((prev) =>
                                  prev.includes(role.roleCode)
                                    ? prev.filter((rc) => rc !== role.roleCode)
                                    : [...prev, role.roleCode]
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="global-ref-norecords-ui">
                          No roles found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {selectedRoles.length > 0 && (
            <div className="mt-3 bg-blue-50 p-2 rounded text-xs">
              {selectedRoles.length === 1
                ? `Selected role: ${selectedRoles[0]}`
                : `Selected roles: ${selectedRoles.join(", ")}`}
            </div>
          )}
        </div>

        {/* Menus (right) */}
        <div className="w-full md:w-2/3">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Menus (Access Rights)</h2>
          <div className="global-ref-table-main-div-ui">
            <div className="global-ref-table-main-sub-div-ui">
              <div className="global-ref-table-div-ui">

                {!showMenus ? (
                  // --- Match the 'Role selection hidden' design ---
                  <div className="py-16 text-center text-gray-500 bg-gray-50 rounded-lg">
                    <FontAwesomeIcon icon={faList} className="text-xl mb-2 text-gray-400" />
                    <h3 className="font-medium text-sm mb-1">Module Selection Hidden</h3>
                    <p className="text-xs">
                      Select exactly one role and click <strong>View Modules</strong> to see and configure access rights.
                    </p>
                  </div>
                ) : (
                  // --- Actual table when modules are visible ---
                  <table className="global-ref-table-div-ui">
                    <thead className="global-ref-thead-div-ui">
                      <tr>
                        <th className="global-ref-th-ui">Menu Code</th>
                        <th className="global-ref-th-ui">Menu Name</th>
                        <th className="global-ref-th-ui text-center">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menus?.length ? (
                        menus.map((m, i) => (
                          <tr key={m.menuCode ?? i} className="global-tran-tr-ui">
                            <td className="global-ref-td-ui">{m.menuCode}</td>
                            <td className="global-ref-td-ui">{m.menuName}</td>
                            <td className="global-ref-td-ui text-center">
                              <input
                                type="checkbox"
                                className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={checkedMenus.has(m.menuCode)}
                                onChange={() => toggleMenu(m.menuCode)}
                              />
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="global-ref-norecords-ui">No menus found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}

              </div>
            </div>
          </div>

          {showMenus && checkedMenus.size > 0 && (
            <div className="mt-2 bg-green-50 p-2 rounded text-xs">
              {`${checkedMenus.size} menu(s) selected for access.`}
            </div>
          )}
        </div>

      </div>

      {(saving || loadingMenus) && (
        <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-xl text-sm">
            <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
            {saving ? "Saving…" : "Loading…"}
          </div>
        </div>
      )}
    </div>
  );
});

export default RoleAccessTab;
