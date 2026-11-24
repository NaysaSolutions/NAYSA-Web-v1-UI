import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import Swal from "sweetalert2";
import {
  useSwalSuccessAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Confirmation dialogs retain an explicit confirmation before changing access.
// Shared behavior.jsx exports shown in the other tabs do not include a save-confirm helper.
const confirmBranchAction = (options) => Swal.fire({
  width: 400,
  showCancelButton: true,
  confirmButtonText: "Confirm",
  cancelButtonText: "Cancel",
  buttonsStyling: false,
  focusCancel: true,
  customClass: {
    popup: "!rounded-xl !p-5",
    title: "!text-lg !font-semibold !text-gray-800",
    htmlContainer: "!text-sm !text-gray-600",
    actions: "!gap-2",
    confirmButton: "px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium",
    cancelButton: "px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 text-sm font-medium",
  },
  ...options,
});

const showBranchError = async (error, title, fallback) => {
  const isRateLimited = error?.response?.status === 429;
  const retryAfter = error?.response?.headers?.["retry-after"];
  const message = isRateLimited
    ? (retryAfter ? `Too many requests. Please wait ${retryAfter} seconds before trying again.` : "Too many requests. Please wait before trying again.")
    : error?.code === "ECONNABORTED"
      ? "The request timed out. Please try again."
      : error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
  await useSwalErrorAlert(isRateLimited ? "Too Many Attempts" : title, message);
};

const norm = v => String(v ?? "").trim().toUpperCase();
const regular = u => ["R", "REGULAR", "REGULAR USER", "REG", "USER"].includes(norm(u.userType ?? u.USER_TYPE ?? u.user_type ?? u.userTypeCode ?? u.USER_TYPE_CODE ?? u.user_type_code ?? u.type ?? u.TYPE));
const UserBranchTab = forwardRef(({ users = [], tableSize = "Half" }, ref) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadedUsers, setLoadedUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [changes, setChanges] = useState({});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const userRows = useMemo(() => (Array.isArray(users) ? users : []).filter(regular).filter(u => {
    const active = u.active ?? u.ACTIVE ?? u.userActive ?? u.USER_ACTIVE;
    return active == null || ["Y", "1", "TRUE", "ACTIVE"].includes(norm(active));
  }).map(u => ({ ...u, userCode: String(u.userCode ?? u.USER_CODE ?? u.user_code ?? "").trim(), userName: u.userName ?? u.USER_NAME ?? u.user_name ?? "" })).filter(u => u.userCode), [users]);
  const clear = () => { setLoadedUsers([]); setBranches([]); setChanges({}); };
  const reset = () => { if (lock.current) return; setSelectedUsers([]); clear(); };
  const toggleUser = code => { if (lock.current || loadedUsers.length) return; setSelectedUsers(p => p.includes(code) ? p.filter(x => x !== code) : [...p, code]); };
  const allCodes = [...new Set(userRows.map(u => u.userCode))];
  const allSelected = allCodes.length > 0 && allCodes.every(c => selectedUsers.includes(c));
  const view = async () => {
    if (lock.current) return;
    if (!selectedUsers.length) return useSwalErrorAlert("No Users Selected", "Please select at least one regular user before viewing branches.");
    if (Object.keys(changes).length) {
      const answer = await confirmBranchAction({ title: "Discard Unsaved Changes?", text: "Your pending branch access changes will be lost.", icon: "warning", confirmButtonText: "Discard" });
      if (!answer.isConfirmed || lock.current) return;
    }
    lock.current = true; setBusy(true); clear();
    try {
      const { data } = await apiClient.post("/getUserBranches", { json_data: { dt2: selectedUsers.map(userCode => ({ userCode })) } }, { timeout: 60000 });
      if (data?.success !== true || !Array.isArray(data.branches)) throw new Error(data?.message || "Invalid branch response");
      setBranches(data.branches.map(b => {
        const count = Number(b.assignedCount);
        if (!b.branchCode || !Number.isInteger(count) || count < 0 || count > selectedUsers.length) throw new Error("Invalid branch assignment count");
        return { ...b, assignedCount: count, active: b.active === true || b.active === 1 || b.active === "1" || b.active === "Y" };
      }));
      setLoadedUsers([...selectedUsers]);
    } catch(e) { setBusy(false); await showBranchError(e, "Unable to Load Branches", "Unable to load branches for the selected users."); }
    finally { lock.current = false; setBusy(false); }
  };
  const count = b => changes[b.branchCode] === "GRANT" ? loadedUsers.length : changes[b.branchCode] === "REVOKE" ? 0 : b.assignedCount;
  const change = (b, action) => {
    if (lock.current || !loadedUsers.length || (action === "GRANT" && !b.active)) return;
    setChanges(p => { const n = {...p}; if (action === "KEEP" || (action === "GRANT" && b.assignedCount === loadedUsers.length) || (action === "REVOKE" && b.assignedCount === 0)) delete n[b.branchCode]; else n[b.branchCode] = action; return n; });
  };
  const save = async () => {
    if (lock.current) return;
    if (!loadedUsers.length) return useSwalErrorAlert("Nothing to Save", "Click View Branches first, then modify and save.");
    const dt1 = Object.entries(changes).map(([branchCode, action]) => ({ branchCode, action }));
    if (!dt1.length) return useSwalSuccessAlert("No Changes", "No branch permissions were changed.");
    lock.current = true;
    try {
      const answer = await confirmBranchAction({ title: "Save Branch Access?", text: `Apply ${dt1.filter(x => x.action === "GRANT").length} grant(s) and ${dt1.filter(x => x.action === "REVOKE").length} revocation(s) to ${loadedUsers.length} user(s)? Unchanged branches will be preserved.`, icon: "question", showCancelButton: true, confirmButtonText: "Save Access" });
      if (!answer.isConfirmed) return;
      setBusy(true);
      const { data } = await apiClient.post("/upsertUserBranches", { json_data: { dt1, dt2: loadedUsers.map(userCode => ({ userCode })) } }, { timeout: 60000 });
      if (data?.success !== true) throw new Error(data?.message || "Save failed");
      // Reload before further edits to avoid stale permission counts.
      clear();
      setBusy(false);
      await useSwalSuccessAlert("Saved!", "Branch access rights have been updated. Click View Branches to reload.");
    } catch(e) { setBusy(false); await showBranchError(e, "Save Failed", "Unable to save branch assignments."); }
    finally { lock.current = false; setBusy(false); }
  };
  useImperativeHandle(ref, () => ({ view, save, reset, getExportData: () => ({ fileName: "User Branch Access", rows: branches.map(b => ({ users: loadedUsers.join(", "), branchCode: b.branchCode, branchName: b.branchName, regionCode: b.regionCode, regionName: b.regionName, assigned: `${count(b)} / ${loadedUsers.length}`, pending: changes[b.branchCode] || "" })), columns: [{key:"users",label:"Selected Users"},{key:"branchCode",label:"Branch Code"},{key:"branchName",label:"Branch Name"},{key:"regionCode",label:"Region Code"},{key:"regionName",label:"Region Name"},{key:"assigned",label:"Assigned Users"},{key:"pending",label:"Pending Change"}] }) }));
  const userCols = [{key:"__select",label:"Select",width:75,sortable:false,filterable:false,render: row => <div className="flex items-center justify-center w-full py-1"><input type="checkbox" className="accent-blue-600 h-4 w-4" checked={selectedUsers.includes(row.userCode)} disabled={busy || !!loadedUsers.length} onClick={e=>e.stopPropagation()} onChange={()=>toggleUser(row.userCode)} /></div>},{key:"userCode",label:"User Code",sortable:true},{key:"userName",label:"Username",sortable:true}];
  const branchCols = [{key:"__select",label:"Access",width:90,sortable:false,filterable:false,render:b=> <div className="flex items-center justify-center w-full py-1"><input type="checkbox" className="accent-blue-600 h-4 w-4" ref={el=>{if(el) el.indeterminate=count(b)>0 && count(b)<loadedUsers.length;}} checked={count(b)===loadedUsers.length} disabled={busy || (!b.active && count(b)===0)} onClick={e=>e.stopPropagation()} onChange={()=>change(b, !b.active || count(b)===loadedUsers.length ? "REVOKE":"GRANT")} /></div>},{key:"branchCode",label:"Branch Code",sortable:true},{key:"branchName",label:"Branch Name",sortable:true,render:b=><span>{b.branchName}{!b.active && <span className="ml-2 text-xs text-gray-500">(Inactive)</span>}</span>},{key:"regionCode",label:"Region Code",sortable:true},{key:"regionName",label:"Region Name",sortable:true}];
  return <div className="w-full md:pt-10 relative">
    {busy && <LoadingSpinner />}
    <div className="flex flex-col md:flex-row md:items-stretch gap-4">
      <section className="w-full md:w-[35%] min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col">
        <div className="flex justify-between gap-2"><h2 className="text-lg font-semibold text-gray-800">Regular Users</h2><button type="button" disabled={busy || !!loadedUsers.length || !allCodes.length} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" onClick={()=>setSelectedUsers(allSelected?[]:allCodes)}>{allSelected?"Unselect All":"Select All"}</button></div>
        <p className="text-xs text-gray-500 mb-3">{selectedUsers.length} selected. {loadedUsers.length ? "Reset to change users." : "Select user(s) and click View Branches."}</p>
        <div className="flex-1 min-h-0"><SearchGlobalReferenceTable className="h-full" docType="UserAccRight" columns={userCols} data={userRows} showFilters={true} itemsPerPage={50} onRowClick={row=>toggleUser(row.userCode)} onRowDoubleClick={()=>{}} selectedRowChecker={row=>selectedUsers.includes(row.userCode)} tableSize={tableSize}/></div>
      </section>
      <section className="w-full md:w-[65%] min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col">
        <h2 className="text-lg font-semibold text-gray-800">Branch Access</h2>
        {loadedUsers.length ? <><p className="text-xs text-gray-500 mb-3">{loadedUsers.length} user(s). A dash indicates mixed access. Only explicit changes are saved.</p><div className="flex-1 min-h-0"><SearchGlobalReferenceTable className="h-full" docType="UserAccRight" columns={branchCols} data={branches} showFilters={true} itemsPerPage={50} onRowClick={()=>{}} onRowDoubleClick={()=>{}} tableSize={tableSize}/></div><p className="text-xs text-blue-700 mt-2">{Object.keys(changes).length} pending branch change(s)</p></> : <div className="flex-1 min-h-[320px] flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm">Branch selection hidden until View Branches.</div>}
      </section>
    </div>
  </div>;
});
export default UserBranchTab;
