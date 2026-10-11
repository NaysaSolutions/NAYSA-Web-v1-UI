// RoleAccessTab.jsx — Simplified role-based access (permission_type stored in rolemenu_ref)
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
  faLockOpen,
  faEye,
  faChevronDown,
  faChevronRight,
  faSearch,
  faFolder,
  faBan,
  faExpand,
  faCompress,
} from "@fortawesome/free-solid-svg-icons";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// ─── Permission defaults ──────────────────────────────────────────────────────
const DEFAULT_PERMISSIONS = {
  access: false,
  fullAccess: false,
  readOnly: false,
};

const truthy = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value || "").toUpperCase() === "Y" ||
  String(value || "").toLowerCase() === "true";

const normalizeRows = (data) => {
  try {
    if (Array.isArray(data?.data) && data.data[0]?.result) {
      const parsed =
        typeof data.data[0].result === "string"
          ? JSON.parse(data.data[0].result)
          : data.data[0].result;
      return Array.isArray(parsed) ? parsed : [];
    }
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.result)) return data.result;
    if (typeof data?.result === "string") {
      const parsed = JSON.parse(data.result);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("normalizeRows failed:", error);
    return [];
  }
  console.warn("normalizeRows: unrecognized shape", data);
  return [];
};

const getMenuCode = (row) =>
  row?.menuCode ?? row?.MENU_CODE ?? row?.menu_code ?? row?.code ?? "";

const getMenuName = (row) =>
  row?.menuName ?? row?.MENU_NAME ?? row?.menu_name ?? row?.name ?? "";

const getModuleName = (row) =>
  row?.moduleName ?? row?.MODULE_NAME ?? row?.module ?? row?.MODULE ?? "";

const getSubMenu = (row) =>
  row?.subMenu ?? row?.SUB_MENU ?? row?.sub_menu ?? row?.submenu ?? "";

// Build permission from rolemenu_ref.permission_type and selectedMenu flag
const buildInitialPermission = (row) => {
  const selected = truthy(row?.selectedMenu);
  if (!selected) return { ...DEFAULT_PERMISSIONS };

  const permType = String(
    row?.permissionType ?? row?.PERMISSION_TYPE ?? row?.permission_type ?? "FULL"
  ).toUpperCase();

  if (permType === "READ") {
    return { access: true, fullAccess: false, readOnly: true };
  }
  // Default to FULL
  return { access: true, fullAccess: true, readOnly: false };
};

const permissionLabel = (permission) => {
  if (!permission?.access) return "No Access";
  if (permission?.fullAccess) return "Full Access";
  if (permission?.readOnly) return "Read Only";
  return "No Access";
};

// ─── AccessToggleButton — cycles: No Access → Read Only → Full Access ─────────
const AccessToggleButton = ({ permission, onCycle }) => {
  const state = !permission?.access
    ? "none"
    : permission?.fullAccess
    ? "full"
    : "read";

  const styles = {
    none: "border-gray-200 bg-gray-100 text-gray-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600",
    read: "border-amber-300 bg-amber-50 text-amber-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700",
    full: "border-blue-300 bg-blue-50 text-blue-700 hover:border-gray-200 hover:bg-gray-100 hover:text-gray-400",
  };

  const labels = {
    none: "No Access",
    read: "Read Only",
    full: "Full Access",
  };

  return (
    <div className="flex justify-center py-0.5">
      <button
        type="button"
        title={`Click to cycle: No Access → Read Only → Full Access (current: ${labels[state]})`}
        onClick={(event) => {
          event.stopPropagation();
          onCycle(state);
        }}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all min-w-[86px] justify-center ${styles[state]}`}
      >
        {state === "full" && <FontAwesomeIcon icon={faLockOpen} className="text-[10px]" />}
        {state === "read" && <FontAwesomeIcon icon={faEye} className="text-[10px]" />}
        {labels[state]}
      </button>
    </div>
  );
};

// ─── RoleAccessTab ────────────────────────────────────────────────────────────
const RoleAccessTab = forwardRef(({ roles = [], tableSize = "Half" }, ref) => {
  const { user } = useAuth();

  const currentUserCode = useMemo(
    () => user?.userCode || user?.USER_CODE || "",
    [user]
  );

  const [selectedRoles, setSelectedRoles] = useState([]);
  const [menus, setMenus] = useState([]);
  const [permissionMap, setPermissionMap] = useState({});
  const [showMenus, setShowMenus] = useState(false);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mobileStep, setMobileStep] = useState("roles");
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [expandedModules, setExpandedModules] = useState({});
  const [tableFilter, setTableFilter] = useState(null); // null | "FULL" | "READ"

  // ─── Derived data ──────────────────────────────────────────────────────────
  const activeRoles = useMemo(
    () => (Array.isArray(roles) ? roles : []).filter((role) => role.active === "Y"),
    [roles]
  );

  const selectedRoleDetails = useMemo(
    () => activeRoles.filter((role) => selectedRoles.includes(role.roleCode)),
    [activeRoles, selectedRoles]
  );

  const normalizedMenus = useMemo(
    () =>
      (Array.isArray(menus) ? menus : []).map((row, index) => ({
        ...row,
        __idx: index,
        menuCode: getMenuCode(row),
        menuName: getMenuName(row),
        moduleName: getModuleName(row),
        subMenu: getSubMenu(row),
      })),
    [menus]
  );

  const selectedMenuCount = useMemo(
    () => Object.values(permissionMap).filter((p) => p?.access).length,
    [permissionMap]
  );

  const fullAccessCount = useMemo(
    () => Object.values(permissionMap).filter((p) => p?.fullAccess).length,
    [permissionMap]
  );

  const readOnlyCount = useMemo(
    () => Object.values(permissionMap).filter((p) => p?.readOnly).length,
    [permissionMap]
  );

  const fullAccessMenus = useMemo(
    () => normalizedMenus.filter((m) => permissionMap[m.menuCode]?.fullAccess),
    [normalizedMenus, permissionMap]
  );

  const readOnlyMenus = useMemo(
    () => normalizedMenus.filter((m) => permissionMap[m.menuCode]?.readOnly),
    [normalizedMenus, permissionMap]
  );

  const filteredMenus = useMemo(() => {
    if (tableFilter === "FULL") return fullAccessMenus;
    if (tableFilter === "READ") return readOnlyMenus;
    return normalizedMenus;
  }, [tableFilter, normalizedMenus, fullAccessMenus, readOnlyMenus]);

  const allMenuCodes = useMemo(
    () => normalizedMenus.map((m) => m.menuCode).filter(Boolean),
    [normalizedMenus]
  );

  const noAccessCount = normalizedMenus.length - selectedMenuCount;

  const groupedMenus = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();
    const groups = new Map();
    normalizedMenus.forEach((menu) => {
      const permission = permissionMap[menu.menuCode] || DEFAULT_PERMISSIONS;
      const state = !permission.access ? "NONE" : permission.fullAccess ? "FULL" : "READ";
      if (tableFilter && tableFilter !== state) return;
      if (query && ![menu.moduleName, menu.subMenu, menu.menuCode, menu.menuName]
        .some((value) => String(value || "").toLowerCase().includes(query))) return;
      const moduleName = String(menu.moduleName || "Other Modules").trim() || "Other Modules";
      if (!groups.has(moduleName)) groups.set(moduleName, []);
      groups.get(moduleName).push(menu);
    });
    return [...groups.entries()].map(([name, rows]) => ({ name, rows }));
  }, [normalizedMenus, permissionMap, tableFilter, menuSearch]);

  const isModuleExpanded = (name) => expandedModules[name] !== false;
  const setAllModulesExpanded = (expanded) => {
    setExpandedModules(Object.fromEntries(groupedMenus.map((group) => [group.name, expanded])));
  };

  const cycleModulePermissions = useCallback((rows) => {
    const codes = rows.map((row) => row.menuCode).filter(Boolean);
    if (!codes.length) return;
    const states = codes.map((code) => permissionMap[code] || DEFAULT_PERMISSIONS);
    const allNone = states.every((p) => !p.access);
    const allRead = states.every((p) => p.access && p.readOnly);
    const preset = allNone ? "READ" : allRead ? "FULL" : "NONE";
    setPermissionMap((previous) => {
      const next = { ...previous };
      codes.forEach((code) => {
        next[code] = preset === "FULL"
          ? { access: true, fullAccess: true, readOnly: false }
          : preset === "READ"
          ? { access: true, fullAccess: false, readOnly: true }
          : { ...DEFAULT_PERMISSIONS };
      });
      return next;
    });
  }, [permissionMap]);

  // Reflect all menu permissions, including mixed combinations.
  const bulkPermissionState = useMemo(() => {
    if (allMenuCodes.length === 0) return "none";
    const permissions = allMenuCodes.map(
      (code) => permissionMap[code] || DEFAULT_PERMISSIONS
    );
    if (permissions.every((p) => p.access && p.fullAccess)) return "full";
    if (permissions.every((p) => p.access && p.readOnly)) return "read";
    if (permissions.every((p) => !p.access)) return "none";
    return "mixed";
  }, [allMenuCodes, permissionMap]);

  const getPermission = useCallback(
    (menuCode) => permissionMap[menuCode] || DEFAULT_PERMISSIONS,
    [permissionMap]
  );

  // ─── Load role menus ───────────────────────────────────────────────────────
  const loadRoleMenus = useCallback(async (roleCode) => {
    setLoadingMenus(true);
    setShowMenus(false);
    setMenus([]);
    setPermissionMap({});
    setTableFilter(null);
    setMenuSearch("");
    setSelectedModule("");
    setExpandedModules({});

    try {
      const rc = String(roleCode ?? "").trim();
      if (!rc) {
        await useSwalErrorAlert(
          "No Role Selected",
          "Please select one role to continue."
        );
        return;
      }

      // /getRoleMenu must return only menus currently present in HS_MENU.
      // Do not call the administrator-only /heartstrong/modules API here.
      const { data } = await apiClient.get("/getRoleMenu", {
        params: { ROLE_CODE: rc },
      });

      const rawMenus = Array.isArray(data?.data?.menus)
        ? data.data.menus
        : normalizeRows(data);

      const normalized = rawMenus.map((row) => ({
        ...row,
        menuCode: getMenuCode(row),
        menuName: getMenuName(row),
        moduleName: getModuleName(row),
        subMenu: getSubMenu(row),
      }));

      const nextPermissionMap = {};
      normalized.forEach((row) => {
        if (row.menuCode) {
          nextPermissionMap[row.menuCode] = buildInitialPermission(row);
        }
      });

      setMenus(normalized);
      setPermissionMap(nextPermissionMap);
      setShowMenus(true);
      setMobileStep("menus");
    } catch (err) {
      console.error("getRoleMenu failed:", err);
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unable to load menus for the selected role.";
      await useSwalErrorAlert(
          "Error",
          detail
        );
    } finally {
      setLoadingMenus(false);
    }
  }, []);

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
  }, [selectedRoles, loadRoleMenus]);

  // ─── Permission updates ────────────────────────────────────────────────────
  const applyPermissionPreset = useCallback((menuCode, preset) => {
    if (!menuCode) return;
    setPermissionMap((previous) => ({
      ...previous,
      [menuCode]:
        preset === "FULL"
          ? { access: true, fullAccess: true, readOnly: false }
          : preset === "READ"
          ? { access: true, fullAccess: false, readOnly: true }
          : { ...DEFAULT_PERMISSIONS },
    }));
  }, []);

  // Bulk permissions: None → Read Only → Full Access → None.
  // For mixed permissions, first click sets all to No Access.
  const cycleAllPermissions = useCallback(() => {
    if (allMenuCodes.length === 0) return;
    const nextPreset =
      bulkPermissionState === "none"
        ? "READ"
        : bulkPermissionState === "read"
        ? "FULL"
        : "NONE";

    setPermissionMap((previous) => {
      const next = { ...previous };
      allMenuCodes.forEach((menuCode) => {
        next[menuCode] =
          nextPreset === "FULL"
            ? { access: true, fullAccess: true, readOnly: false }
            : nextPreset === "READ"
            ? { access: true, fullAccess: false, readOnly: true }
            : { ...DEFAULT_PERMISSIONS };
      });
      return next;
    });
    // Make all rows visible after a bulk action, regardless of previous filter.
    setTableFilter(null);
  }, [allMenuCodes, bulkPermissionState]);

  // ─── Save ──────────────────────────────────────────────────────────────────
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

    // dt1: all menus that have access, with their permission_type
    const dt1 = normalizedMenus
      .filter((menu) => permissionMap[menu.menuCode]?.access)
      .map((menu) => {
        const p = permissionMap[menu.menuCode] || DEFAULT_PERMISSIONS;
        return {
          menuCode: menu.menuCode,
          permissionType: p.fullAccess ? "FULL" : "READ",
        };
      });

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
        res?.message?.toLowerCase?.().includes("saved") ||
        res?.errorcount === 0;

      if (!ok) {
        throw new Error(res?.message || "Error executing Role Menu Upsert.");
      }

      await useSwalSuccessAlert(
        "Saved!",
        "Role access rights have been updated."
      );
      await loadRoleMenus(rc);
    } catch (err) {
      console.error("UpsertRoleMenu failed:", err);
      const detail =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Error executing Role Menu Upsert.";
      await useSwalErrorAlert(
        "Save Failed",
        detail
      );
    } finally {
      setSaving(false);
    }
  }, [selectedRoles, showMenus, normalizedMenus, permissionMap, currentUserCode, loadRoleMenus]);

  // ─── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSelectedRoles([]);
    setMenus([]);
    setPermissionMap({});
    setShowMenus(false);
    setMobileStep("roles");
    setTableFilter(null);
    setMenuSearch("");
    setSelectedModule("");
    setExpandedModules({});
  }, []);

  // ─── Exposed ref methods ───────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    viewModules: handleViewMenus,
    saveAccess: handleSaveAccess,
    reset: handleReset,
    getExportData: () => {
      const selectedRole = selectedRoleDetails?.[0] || null;
      const rows = normalizedMenus.map((menu) => {
        const permission = permissionMap[menu.menuCode] || DEFAULT_PERMISSIONS;
        return {
          roleCode: selectedRole?.roleCode || "",
          roleName: selectedRole?.roleName || "",
          moduleName: menu.moduleName || "",
          subMenu: menu.subMenu || "",
          menuCode: menu.menuCode || "",
          menuName: menu.menuName || "",
          permission: permissionLabel(permission),
        };
      });
      return {
        fileName: "Role Access Rights",
        rows,
        columns: [
          { key: "roleCode", label: "Role Code" },
          { key: "roleName", label: "Role Name" },
          { key: "moduleName", label: "Module" },
          { key: "subMenu", label: "Sub Menu" },
          { key: "menuCode", label: "Menu Code" },
          { key: "menuName", label: "Menu Name" },
          { key: "permission", label: "Permission" },
        ],
      };
    },
  }));

  // ─── Role table ────────────────────────────────────────────────────────────
  const toggleRole = useCallback((roleCode) => {
    setSelectedRoles((previous) =>
      previous.includes(roleCode)
        ? previous.filter((r) => r !== roleCode)
        : [...previous, roleCode]
    );
  }, []);

  const roleColumns = useMemo(
    () => [
      {
        key: "__select",
        label: "Select",
        sortable: false,
        filterable: false,
        width: 90,
        render: (row) => {
          const isSelected = selectedRoles.includes(row.roleCode);
          return (
            <div className="flex justify-center py-0.5">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => { e.stopPropagation(); toggleRole(row.roleCode); }}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 cursor-pointer accent-blue-600 rounded"
              />
            </div>
          );
        },
      },
      { key: "roleCode", label: "Role Code", sortable: true, width: 160 },
      { key: "roleName", label: "Role Name", sortable: true, width: 260 },
    ],
    [selectedRoles, toggleRole]
  );

  // ─── Menu table ────────────────────────────────────────────────────────────
  const menuColumns = useMemo(
    () => [
      {
        key: "__access",
        label: "Permission",
        sortable: false,
        filterable: false,
        width: 130,
        render: (row) => {
          const permission = getPermission(row.menuCode);
          const handleCycle = (currentState) => {
            if (currentState === "none") {
              applyPermissionPreset(row.menuCode, "READ");
            } else if (currentState === "read") {
              applyPermissionPreset(row.menuCode, "FULL");
            } else {
              applyPermissionPreset(row.menuCode, "NONE");
            }
          };
          return <AccessToggleButton permission={permission} onCycle={handleCycle} />;
        },
      },
      { key: "moduleName", label: "Module", sortable: true, width: 180 },
      { key: "subMenu",    label: "Sub Menu", sortable: true, width: 180 },
      { key: "menuCode",   label: "Menu Code", sortable: true, width: 120 },
      { key: "menuName",   label: "Menu Name", sortable: true, width: 300 },
    ],
    [getPermission, applyPermissionPreset]
  );

  const moduleOptions = useMemo(() =>
    [...new Set(normalizedMenus.map((m) => String(m.moduleName || "Other Modules").trim() || "Other Modules"))]
      .sort((a, b) => a.localeCompare(b)), [normalizedMenus]);

  const moduleRows = useMemo(() => normalizedMenus.filter((menu) =>
    (String(menu.moduleName || "Other Modules").trim() || "Other Modules") === selectedModule
  ), [normalizedMenus, selectedModule]);

  const matrixRows = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();
    return filteredMenus.filter((menu) =>
      (!selectedModule || (String(menu.moduleName || "Other Modules").trim() || "Other Modules") === selectedModule) &&
      (!query || [menu.moduleName, menu.subMenu, menu.menuCode, menu.menuName]
        .some((value) => String(value || "").toLowerCase().includes(query)))
    );
  }, [filteredMenus, menuSearch, selectedModule]);

  const roleTableData = useMemo(
    () => activeRoles.map((row, index) => ({ ...row, __idx: index })),
    [activeRoles]
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full md:pt-10">
      {/* Mobile back button */}
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
        {/* ── Roles panel ── */}
        <div
          className={`w-full md:w-[35%] ${
            mobileStep === "roles" ? "block" : "hidden md:block"
          }`}
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Roles</h2>
                <p className="text-xs text-gray-500">
                  Select one role, then view and configure access.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                {selectedRoles.length} selected
              </span>
            </div>

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
                selectedRowChecker={(row) => selectedRoles.includes(row.roleCode)}
                tableSize={tableSize}
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* ── Menus panel ── */}
        <div
          className={`w-full md:w-[65%] ${
            mobileStep === "menus" ? "block" : "hidden md:block"
          }`}
        >
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 h-full flex flex-col">
            <div className="flex flex-col gap-3 mb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Role Access Matrix</h2>
                  <p className="text-xs text-slate-500">Click a permission to cycle No Access → Read Only → Full Access.</p>
                </div>
                {showMenus && (
                  <button type="button" onClick={cycleAllPermissions}
                    disabled={saving || loadingMenus || !allMenuCodes.length}
                    title="Set permission for all menus (Mixed → No Access → Read Only → Full Access)"
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                    <FontAwesomeIcon icon={bulkPermissionState === "full" ? faLockOpen : faEye} />
                    All: {bulkPermissionState === "full" ? "Full Access" : bulkPermissionState === "read" ? "Read Only" : bulkPermissionState === "none" ? "No Access" : "Mixed"}
                  </button>
                )}
              </div>
              {showMenus && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {[
                      { key: null, label: "Total Menus", count: normalizedMenus.length, color: "slate", base: "border-slate-200 bg-slate-50 text-slate-700" },
                      { key: "FULL", label: "Full Access", count: fullAccessCount, color: "blue", base: "border-blue-200 bg-blue-50 text-blue-700" },
                      { key: "READ", label: "Read Only", count: readOnlyCount, color: "amber", base: "border-amber-200 bg-amber-50 text-amber-700" },
                      { key: "NONE", label: "No Access", count: noAccessCount, color: "rose", base: "border-rose-200 bg-rose-50 text-rose-700" },
                    ].map((stat) => (
                      <button key={stat.label} type="button" onClick={() => setTableFilter(stat.key)}
                        className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${stat.base} ${tableFilter === stat.key ? "ring-2 ring-offset-1 ring-blue-300" : ""}`}>
                        <div className="text-[11px] font-semibold">{stat.label}</div>
                        <div className="text-2xl font-bold tabular-nums">{stat.count}</div>
                        <div className="mt-2 h-1.5 rounded-full bg-white/80 overflow-hidden">
                          <div className="h-full rounded-full bg-current opacity-60" style={{ width: `${normalizedMenus.length ? (stat.count / normalizedMenus.length) * 100 : 0}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <FontAwesomeIcon icon={faShieldAlt} className="text-blue-600" />
                      <span className="font-semibold text-blue-700">Selected Role</span>
                      <span className="min-w-0 truncate rounded-full border border-blue-200 bg-white px-2 py-1 text-blue-800">
                        {selectedRoleDetails.length === 1 ? `${selectedRoleDetails[0].roleCode} - ${selectedRoleDetails[0].roleName}` : "No single role selected"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        aria-label="Filter matrix by module"
                        className="max-w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
                      >
                        <option value="">All Modules</option>
                        {moduleOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                      </select>
                      {selectedModule && (
                        <button
                          type="button"
                          title={`Cycle permissions for all menus in ${selectedModule}`}
                          onClick={() => cycleModulePermissions(moduleRows)}
                          disabled={saving || loadingMenus}
                          className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        >
                          Change Module Access ({moduleRows.length})
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {showMenus ? (
              <div className="flex-1 min-h-0">
                <SearchGlobalReferenceTable
                  docType="UserAccRight"
                  columns={menuColumns}
                  data={matrixRows}
                  isLoading={loadingMenus}
                  itemsPerPage={50}
                  showFilters={true}
                  onRowDoubleClick={() => {}}
                  onRowClick={() => {}}
                  mobileSelectable={true}
                  selectedRowChecker={(row) => getPermission(row.menuCode).access}
                  tableSize={tableSize}
                  className="h-full"
                />
              </div>
            ) : (
              <div className="h-full min-h-[320px] flex items-center justify-center text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <FontAwesomeIcon icon={faList} className="text-xl mb-2 text-gray-400" />
                  <h3 className="font-medium text-sm mb-1">Access Matrix Hidden</h3>
                  <p className="text-xs px-4">
                    Select exactly one role and click "View Modules" to see and configure access rights.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRoles.length > 0 && (
        <div className="mt-3 bg-blue-50 p-2 rounded text-xs text-blue-800">
          {selectedRoles.length === 1
            ? `Selected role: ${selectedRoles[0]}`
            : `Selected roles: ${selectedRoles.join(", ")}`}
        </div>
      )}

      {showMenus && selectedMenuCount > 0 && (
        <div className="mt-2 bg-green-50 p-2 rounded text-xs text-green-800">
          {`${selectedMenuCount} menu(s) granted access.`}
        </div>
      )}

      {(saving || loadingMenus) && <LoadingSpinner />}
    </div>
  );
});

export default RoleAccessTab;