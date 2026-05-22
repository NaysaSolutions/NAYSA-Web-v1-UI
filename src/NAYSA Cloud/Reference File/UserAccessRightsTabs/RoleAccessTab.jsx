// RoleAccessTab.jsx — DB-driven menus via MenuController + role overlay via AccessRights sproc
import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList,
  faArrowLeft,
  faShieldAlt,
  faSquare,
  faCheckSquare,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const RoleAccessTab = forwardRef(({ roles = [], tableSize = "Half" }, ref) => {
  const { user } = useAuth();

  const currentUserCode = useMemo(
    () => user?.userCode || user?.USER_CODE || "",
    [user]
  );

  const [selectedRoles, setSelectedRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [checkedMenus, setCheckedMenus] = useState(new Set());
  const [showMenus, setShowMenus] = useState(false);

  const [loadingMenus, setLoadingMenus] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mobileStep, setMobileStep] = useState("roles");

  /* ================= FILTER ACTIVE ROLES ================= */
  const activeRoles = useMemo(() => {
    return (Array.isArray(roles) ? roles : []).filter((r) => r.active === "Y");
  }, [roles]);

  const selectedRoleDetails = useMemo(() => {
    return activeRoles.filter((r) => selectedRoles.includes(r.roleCode));
  }, [activeRoles, selectedRoles]);

  const allMenuCodes = useMemo(
    () =>
      (Array.isArray(menus) ? menus : [])
        .map((m) => m.menuCode)
        .filter(Boolean),
    [menus]
  );

  const allMenusSelected =
    allMenuCodes.length > 0 && checkedMenus.size === allMenuCodes.length;

  const loadRoleMenus = async (roleCode) => {
    setLoadingMenus(true);
    setShowMenus(false);
    setMenus([]);
    setCheckedMenus(new Set());

    try {
      const rc = String(roleCode ?? "").trim();
      if (!rc) {
        await useSwalErrorAlert(
          "No Role Selected",
          "Please select one role to continue."
        );
        return;
      }

      const { data } = await apiClient.get("/getRoleMenu", {
        params: { ROLE_CODE: rc },
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
            .filter(
              (r) => Number(r?.selectedMenu) === 1 || r?.selectedMenu === true
            )
            .map((r) => r?.menuCode)
            .filter(Boolean)
        )
      );
      setShowMenus(true);
      setMobileStep("menus");
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

  const handleViewMenus = useCallback(async () => {
    if (selectedRoles.length === 0) {
      await useSwalErrorAlert(
        "No Role Selected",
        "Please select one role to continue."
      );
      return;
    }
    if (selectedRoles.length > 1) {
      await useSwalErrorAlert(
        "Multiple Roles Selected",
        "Please select only one role when configuring access."
      );
      return;
    }
    await loadRoleMenus(selectedRoles[0]);
  }, [selectedRoles]);

  const handleSaveAccess = useCallback(async () => {
    if (selectedRoles.length !== 1) {
      await useSwalErrorAlert(
        "Select Exactly One Role",
        "Pick a single role, then click Save Access."
      );
      return;
    }
    if (!showMenus) {
      await useSwalErrorAlert(
        "Nothing to Save",
        "Click View Modules first, then modify and save."
      );
      return;
    }

    const rc = String(selectedRoles[0] ?? "").trim();
    const dt1 = Array.from(checkedMenus).map((menuCode) => ({ menuCode }));

    setSaving(true);
    try {
      const payload = {
        json_data: {
          roleCode: rc,
          dt1,
          userCode: currentUserCode,
        },
      };

      const { data: res } = await apiClient.post("/upsertRoleMenu", payload);

      const ok =
        res?.success === true ||
        res?.data?.status === "success" ||
        res?.message?.toLowerCase?.().includes("saved");

      if (!ok) {
        throw new Error(res?.message || "Error executing Role Menu Upsert.");
      }

      await useSwalSuccessAlert(
        "Saved!",
        "Role menu access has been updated."
      );
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
  }, [selectedRoles, showMenus, checkedMenus, currentUserCode]);

  const handleReset = useCallback(() => {
    setSelectedRoles([]);
    setMenus([]);
    setCheckedMenus(new Set());
    setShowMenus(false);
    setMobileStep("roles");
  }, []);

  useImperativeHandle(ref, () => ({
    viewModules: handleViewMenus,
    saveAccess: handleSaveAccess,
    reset: handleReset,
    getExportData: () => {
      const selectedRole = selectedRoleDetails?.[0] || null;

      const rows = (Array.isArray(menus) ? menus : []).map((m) => ({
        roleCode:   selectedRole?.roleCode || "",
        roleName:   selectedRole?.roleName || "",
        moduleName: m.moduleName || "",
        subMenu:    m.subMenu    || "",
        menuCode:   m.menuCode   || "",
        menuName:   m.menuName   || "",
        access:     checkedMenus.has(m.menuCode) ? "Yes" : "No",
      }));

      return {
        fileName: "Role Access Rights",
        rows,
        columns: [
          { key: "roleCode",   label: "Role Code"   },
          { key: "roleName",   label: "Role Name"   },
          { key: "moduleName", label: "Module"       },
          { key: "subMenu",    label: "Sub Menu"     },
          { key: "menuName",   label: "Menu Name"   },
          { key: "access",     label: "Access"       },
        ],
      };
    },
  }));

  const toggleRole = useCallback((roleCode) => {
    setSelectedRoles((prev) =>
      prev.includes(roleCode)
        ? prev.filter((rc) => rc !== roleCode)
        : [...prev, roleCode]
    );
  }, []);

  const toggleMenu = useCallback((menuCode) => {
    setCheckedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(menuCode)) next.delete(menuCode);
      else next.add(menuCode);
      return next;
    });
  }, []);

  const toggleSelectAllMenus = useCallback(() => {
    setCheckedMenus((prev) => {
      if (menus.length > 0 && prev.size === menus.length) {
        return new Set();
      }
      return new Set(menus.map((m) => m.menuCode).filter(Boolean));
    });
  }, [menus]);

  const roleColumns = useMemo(
    () => [
      {
        key: "__select",
        label: "Select",
        sortable: false,
        filterable: false,
        width: 90,
        render: (row) => (
          <div className="flex justify-end md:justify-center py-1">
            <input
              type="checkbox"
              className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={selectedRoles.includes(row.roleCode)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleRole(row.roleCode)}
            />
          </div>
        ),
      },
      {
        key: "roleCode",
        label: "Role Code",
        sortable: true,
        width: 160,
      },
      {
        key: "roleName",
        label: "Role Name",
        sortable: true,
        width: 260,
      },
    ],
    [selectedRoles, toggleRole]
  );

  // ✅ Menu Code column removed; Module and Sub Menu columns retained
  const menuColumns = useMemo(
    () => [
      {
        key: "__select",
        label: "Access",
        sortable: false,
        filterable: false,
        width: 90,
        render: (row) => (
          <div className="flex justify-end md:justify-center py-1">
            <input
              type="checkbox"
              className="h-6 w-6 md:h-4 md:w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={checkedMenus.has(row.menuCode)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleMenu(row.menuCode)}
            />
          </div>
        ),
      },
      {
        // ⚠️ Blank if your hs_menu column is NOT named "module_name".
        // Run: SELECT TOP 1 * FROM hs_menu — then tell us the real column name
        // and update the SQL alias:  a.YOUR_COLUMN AS moduleName
        key: "moduleName",
        label: "Module",
        sortable: true,
        width: 200,
      },
      {
        key: "subMenu",
        label: "Sub Menu",
        sortable: true,
        width: 200,
      },
      {
        key: "menuName",
        label: "Menu Name",
        sortable: true,
        width: 380,
      },
    ],
    [checkedMenus, toggleMenu]
  );

  const roleTableData = useMemo(
    () =>
      activeRoles.map((row, index) => ({
        ...row,
        __idx: index,
      })),
    [activeRoles]
  );

  const menuTableData = useMemo(
    () =>
      (Array.isArray(menus) ? menus : []).map((row, index) => ({
        ...row,
        __idx: index,
      })),
    [menus]
  );

  return (
    <div className="w-full md:pt-10">
      <div className="md:hidden mb-3">
        {mobileStep === "menus" && (
          <button
            type="button"
            onClick={() => setMobileStep("roles")}
            className="text-blue-600 text-sm font-medium flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back to Roles
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-stretch gap-4">
        {/* ROLES PANEL */}
        <div
          className={`w-full md:w-1/2 ${mobileStep === "roles" ? "block" : "hidden md:block"}`}
        >
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold mb-2 text-gray-700">Roles</h2>

            <div className="flex-1 min-h-0">
              <SearchGlobalReferenceTable
                docType="UserAccRight"
                columns={roleColumns}
                data={roleTableData}
                isLoading={false}
                itemsPerPage={10}
                showFilters={true}
                onRowDoubleClick={(row) => toggleRole(row.roleCode)}
                onRowClick={(row) => toggleRole(row.roleCode)}
                mobileSelectable={true}
                selectedRowChecker={(row) =>
                  selectedRoles.includes(row.roleCode)
                }
                tableSize={tableSize}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* MENUS PANEL */}
        <div
          className={`w-full md:w-1/2 ${mobileStep === "menus" ? "block" : "hidden md:block"}`}
        >
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 gap-3">
              <h2 className="text-lg font-semibold text-gray-700">
                Menus (Access Rights)
              </h2>

              {showMenus && (
                <button
                  type="button"
                  onClick={toggleSelectAllMenus}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  <FontAwesomeIcon
                    icon={allMenusSelected ? faSquare : faCheckSquare}
                  />
                  {allMenusSelected ? "Unselect All" : "Select All"}
                </button>
              )}
            </div>

            {showMenus ? (
              <>
                <div className="mb-2">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                    <FontAwesomeIcon
                      icon={faShieldAlt}
                      className="text-blue-600 text-sm shrink-0"
                    />
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 shrink-0">
                        Selected Role
                      </span>

                      {selectedRoleDetails.length === 0 ? (
                        <span className="text-xs text-gray-500">None</span>
                      ) : selectedRoleDetails.length === 1 ? (
                        <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800 max-w-[260px] truncate">
                          {selectedRoleDetails[0].roleCode} -{" "}
                          {selectedRoleDetails[0].roleName}
                        </span>
                      ) : (
                        <>
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-800">
                            {selectedRoleDetails.length} roles
                          </span>
                          {selectedRoleDetails.slice(0, 1).map((role) => (
                            <span
                              key={role.roleCode}
                              className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700"
                            >
                              {role.roleCode}
                            </span>
                          ))}
                          {selectedRoleDetails.length > 1 && (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] text-blue-700">
                              +{selectedRoleDetails.length - 1} more
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <SearchGlobalReferenceTable
                    docType="UserAccRight"
                    columns={menuColumns}
                    data={menuTableData}
                    isLoading={loadingMenus}
                    itemsPerPage={50}
                    showFilters={true}
                    onRowDoubleClick={(row) => toggleMenu(row.menuCode)}
                    onRowClick={(row) => toggleMenu(row.menuCode)}
                    mobileSelectable={true}
                    selectedRowChecker={(row) => checkedMenus.has(row.menuCode)}
                    tableSize={tableSize}
                    className="h-full"
                  />
                </div>
              </>
            ) : (
              <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <FontAwesomeIcon
                    icon={faList}
                    className="text-xl mb-2 text-gray-400"
                  />
                  <h3 className="font-medium text-sm mb-1">
                    Module Selection Hidden
                  </h3>
                  <p className="text-xs px-4">
                    Select exactly one role and click "View Modules" to see and
                    configure access rights.
                  </p>
                </div>
              </div>
            )}
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

      {showMenus && checkedMenus.size > 0 && (
        <div className="mt-2 bg-green-50 p-2 rounded text-xs">
          {`${checkedMenus.size} menu(s) selected for access.`}
        </div>
      )}

      {(saving || loadingMenus) && <LoadingSpinner />}
    </div>
  );
});

export default RoleAccessTab;