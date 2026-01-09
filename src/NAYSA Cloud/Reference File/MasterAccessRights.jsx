import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faUndo,
  faCheck,
  faPrint,
  faChevronDown,
  faFileCsv,
  faFileExcel,
  faFilePdf,
  faInfoCircle,
  faVideo,
  faSpinner,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalSuccessAlert,
  useSwalWarningAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior";

/** Loading spinner (same as your global style) */
const LoadingSpinner = () => (
  <div className="global-tran-spinner-main-div-ui">
    <div className="global-tran-spinner-sub-div-ui">
      <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-2" />
      <p>Please wait...</p>
    </div>
  </div>
);

// 🔒 Hardcoded Master Data List
const HARDCODED_MASTER_DATA = [
  { masterCode: "ALPHATAX", particular: "Alphanumeric Tax Codes" },
  { masterCode: "BANK", particular: "Bank Master Data" },
  { masterCode: "COA", particular: "Chart of Accounts" },
  { masterCode: "FSCONS", particular: "F/S Consolidation Codes" },
  { masterCode: "PAYEE", particular: "Payee Master Data" },
  { masterCode: "RFP", particular: "Request for Payment Codes" },
  { masterCode: "RC", particular: "Responsibility Center" },
  { masterCode: "SL", particular: "S/L Master Data" },
  { masterCode: "SHIPCOST", particular: "Shipment Cost Code" },
];

function buildUpsertPayload(selectedMasterData, selectedUsers) {
  return {
    dt1: selectedMasterData.map((masterCode) => ({ masterCode })),
    dt2: selectedUsers.map((userCode) => ({ userCode })),
  };
}

function wrapPayload(payload, doubleWrap = false) {
  return doubleWrap ? { json_data: { json_data: payload } } : { json_data: payload };
}

export default function MasterAccessRights() {
  const docType = "MasterAccRight";
  const documentTitle = reftables?.[docType] ?? "Master Access Rights";
  const pdfLink = reftablesPDFGuide?.[docType];
  const videoLink = reftablesVideoGuide?.[docType];

  // header dropdown refs
  const exportRef = useRef(null);
  const guideRef = useRef(null);

  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // data
  const [users, setUsers] = useState([]);
  const [appliedUserMasterData, setAppliedUserMasterData] = useState(new Set());

  // UI selection
  const masterData = HARDCODED_MASTER_DATA;
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedMasterData, setSelectedMasterData] = useState([]);
  const [viewingMasterData, setViewingMasterData] = useState(false);
  const [loadingMasterData, setLoadingMasterData] = useState(false);

  // endpoints / wrapper behavior (adjust if needed)
  const upsertEndpoint = "/UpsertUserMasterData";
  const deleteEndpoint = "/deleteUserMasterData";
  const doubleWrap = false;

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setOpenExport(false);
      if (guideRef.current && !guideRef.current.contains(e.target)) setOpenGuide(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allMasterCodes = useMemo(() => masterData.map((m) => m.masterCode), [masterData]);
  const isAllSelected =
    viewingMasterData && allMasterCodes.length > 0 && selectedMasterData.length === allMasterCodes.length;

  // --- fetch users ---
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/load", { params: { Status: "Active" } });

      let userData = [];
      if (Array.isArray(data?.data) && data.data[0]?.result) {
        const parsed =
          typeof data.data[0].result === "string"
            ? JSON.parse(data.data[0].result)
            : data.data[0].result;
        if (Array.isArray(parsed)) userData = parsed;
      }
      setUsers(userData);
    } catch (e) {
      console.error("fetchUsers failed", e);
      setUsers([]);
      await useSwalErrorAlert("Error!", "Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  // --- fetch overlay (assigned access) ---
  const fetchUserMasterData = async (userCodes = []) => {
    if (!userCodes?.length) {
      setAppliedUserMasterData(new Set());
      return;
    }
    try {
      const { data } = await apiClient.post("/getUserMasterData", {
        json_data: { users: userCodes },
      });

      const rows = data?.data ?? [];
      const set = new Set(
        rows
          .map((r) => {
            const u = r.USER_CODE ?? r.user_code ?? r.userCode ?? r.usercode;
            const m = r.MASTER_CODE ?? r.master_code ?? r.masterCode ?? r.mastercode;
            return u && m ? `${u}-${m}` : null;
          })
          .filter(Boolean)
      );

      setAppliedUserMasterData(set);
    } catch (e) {
      console.error("fetchUserMasterData failed", e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- actions ---
  const handleViewRights = async () => {
    if (selectedUsers.length === 0) {
      await useSwalWarningAlert(
        "No Users Selected",
        'Please select at least one user before viewing master data.'
      );
      return;
    }

    try {
      setLoadingMasterData(true);

      // refresh overlay first
      await fetchUserMasterData(selectedUsers);

      // pre-check applied (OR logic)
      const preSelected = new Set();
      selectedUsers.forEach((userCode) => {
        masterData.forEach((md) => {
          if (appliedUserMasterData.has(`${userCode}-${md.masterCode}`)) {
            preSelected.add(md.masterCode);
          }
        });
      });

      setSelectedMasterData(Array.from(preSelected));
      setViewingMasterData(true);
    } catch (e) {
      console.error(e);
      await useSwalErrorAlert("Error!", "Failed to load master data access.");
    } finally {
      setLoadingMasterData(false);
    }
  };

  const handleReset = () => {
    setSelectedUsers([]);
    setSelectedMasterData([]);
    setViewingMasterData(false);
  };

  const handleToggleSelectAll = () => {
    if (!viewingMasterData) return;
    setSelectedMasterData(isAllSelected ? [] : allMasterCodes);
  };

  const handleApply = async () => {
    if (selectedUsers.length === 0) {
      await useSwalWarningAlert(
        "No Users Selected",
        "Please select at least one user before applying master data."
      );
      return;
    }

    // removals: applied but now unchecked
    const toRemove = [];
    selectedUsers.forEach((userCode) => {
      masterData.forEach((md) => {
        const combo = `${userCode}-${md.masterCode}`;
        if (appliedUserMasterData.has(combo) && !selectedMasterData.includes(md.masterCode)) {
          toRemove.push({ userCode, masterCode: md.masterCode });
        }
      });
    });

    try {
      setSaving(true);

      // upsert checked
      if (selectedMasterData.length > 0) {
        const payload = buildUpsertPayload(selectedMasterData, selectedUsers);
        const { data: res } = await apiClient.post(
          upsertEndpoint,
          wrapPayload(payload, doubleWrap)
        );

        const status = res?.data?.status ?? res?.status;
        if (status && status !== "success") {
          await useSwalErrorAlert(
            "Error!",
            res?.data?.message || res?.message || "Something went wrong."
          );
          return;
        }
      }

      // delete unchecked
      for (const { userCode, masterCode } of toRemove) {
        const payload = { dt1: [{ masterCode }], dt2: [{ userCode }] };
        await apiClient.post(deleteEndpoint, wrapPayload(payload, doubleWrap));
      }

      // update overlay immediately
      const updated = new Set(appliedUserMasterData);
      selectedUsers.forEach((userCode) => {
        masterData.forEach((md) => {
          const combo = `${userCode}-${md.masterCode}`;
          if (selectedMasterData.includes(md.masterCode)) updated.add(combo);
          else updated.delete(combo);
        });
      });
      setAppliedUserMasterData(updated);

      // refresh from server
      await fetchUserMasterData(selectedUsers);

      await useSwalSuccessAlert("Success!", "User Master Data Access updated successfully!");
    } catch (e) {
      console.error(e);
      await useSwalErrorAlert(
        "Error!",
        e?.response?.data?.message || "Error saving master data access."
      );
    } finally {
      setSaving(false);
    }
  };

  // --- export/help ---
  const handleExport = async (type) => {
    await useSwalWarningAlert("Export", `Export (${type}) not yet wired for Master Access Rights.`);
  };
  const handlePDFGuide = () => pdfLink && window.open(pdfLink, "_blank");
  const handleVideoGuide = () => videoLink && window.open(videoLink, "_blank");

  return (
    <div className="global-ref-main-div-ui mt-24">
      {(loading || saving || loadingMasterData) && <LoadingSpinner />}

      {/* Header buttons + guides (NO TABS) */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-center text-xs flex-wrap">
          <button
            onClick={handleViewRights}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faEye} /> View Rights
          </button>

          <button
            onClick={handleReset}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
          >
            <FontAwesomeIcon icon={faUndo} /> Reset
          </button>

          <button
            onClick={handleApply}
            className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <FontAwesomeIcon icon={faCheck} /> Apply
          </button>

          {/* Export */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setOpenExport((v) => !v)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faPrint} /> Export{" "}
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>

            {isOpenExport && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={() => { handleExport("csv"); setOpenExport(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFileCsv} className="mr-2 text-green-600" /> CSV
                </button>
                <button
                  onClick={() => { handleExport("excel"); setOpenExport(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" /> Excel
                </button>
                <button
                  onClick={() => { handleExport("pdf"); setOpenExport(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> PDF
                </button>
              </div>
            )}
          </div>

          {/* Help */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((v) => !v)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} /> Help{" "}
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>

            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={() => { handlePDFGuide(); setOpenGuide(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> User Guide
                </button>
                <button
                  onClick={() => { handleVideoGuide(); setOpenGuide(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" /> Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* spacer under header */}
      <div style={{ height: "15px" }} aria-hidden="true" />

      {/* Body content */}
      <div className="global-ref-body-ui">
        {/* ✅ ONE PANEL for BOTH tables */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* USERS */}
            <div className="w-full md:w-1/2">
              <h2 className="text-lg font-semibold mb-2 text-gray-700">Users</h2>

              <div className="global-ref-table-main-div-ui">
                <div className="global-ref-table-main-sub-div-ui">
                  <div className="global-ref-table-div-ui">
                    <table className="global-ref-table-div-ui">
                      <thead className="global-ref-thead-div-ui">
                        <tr>
                          <th className="global-ref-th-ui">User Code</th>
                          <th className="global-ref-th-ui">Username</th>
                          <th className="global-ref-th-ui text-center">Select</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="global-ref-norecords-ui">No users found</td>
                          </tr>
                        ) : (
                          users.map((u, idx) => (
                            <tr key={u.userCode || idx} className="global-tran-tr-ui">
                              <td className="global-ref-td-ui">{u.userCode}</td>
                              <td className="global-ref-td-ui">{u.userName}</td>
                              <td className="global-ref-td-ui text-center">
                                <input
                                  type="checkbox"
                                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  checked={selectedUsers.includes(u.userCode)}
                                  disabled={viewingMasterData}
                                  onChange={() => {
                                    if (viewingMasterData) return;
                                    setSelectedUsers((prev) =>
                                      prev.includes(u.userCode)
                                        ? prev.filter((x) => x !== u.userCode)
                                        : [...prev, u.userCode]
                                    );
                                  }}
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* MASTER DATA */}
            <div className="w-full md:w-1/2">
              <h2 className="text-lg font-semibold mb-2 text-gray-700">Master Data</h2>

              <div className="global-ref-table-main-div-ui">
                <div className="global-ref-table-main-sub-div-ui">
                  <div className="global-ref-table-div-ui">
                    {!viewingMasterData ? (
                      <div className="py-16 text-center text-gray-500 bg-gray-50 rounded-lg">
                        <FontAwesomeIcon icon={faDatabase} className="text-xl mb-2 text-gray-400" />
                        <h3 className="font-medium text-sm mb-1">Master Data Selection Hidden</h3>
                        <p className="text-xs">
                          Please select user(s) from the users table and click "View Rights" to see and assign master data.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* <div className="flex items-center justify-end mb-2">
                          <label className="text-xs text-gray-600 flex items-center gap-2 select-none">
                            <input
                              type="checkbox"
                              className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={isAllSelected}
                              onChange={handleToggleSelectAll}
                              disabled={loadingMasterData || allMasterCodes.length === 0}
                            />
                            Select All
                          </label>
                        </div> */}

                        <table className="global-ref-table-div-ui">
                          <thead className="global-ref-thead-div-ui">
                            <tr>
                              <th className="global-ref-th-ui">Particular</th>
                              <th className="global-ref-th-ui text-center">Full Access</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loadingMasterData ? (
                              <tr>
                                <td colSpan="2" className="global-ref-norecords-ui">
                                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                  Loading / Updating...
                                </td>
                              </tr>
                            ) : (
                              masterData.map((md, idx) => (
                                <tr key={md.masterCode || idx} className="global-tran-tr-ui">
                                  <td className="global-ref-td-ui">{md.particular}</td>
                                  <td className="global-ref-td-ui text-center">
                                    <input
                                      type="checkbox"
                                      className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      checked={selectedMasterData.includes(md.masterCode)}
                                      onChange={() =>
                                        setSelectedMasterData((prev) =>
                                          prev.includes(md.masterCode)
                                            ? prev.filter((x) => x !== md.masterCode)
                                            : [...prev, md.masterCode]
                                        )
                                      }
                                    />
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedUsers.length > 0 && (
            <div className="mt-4 bg-blue-50 p-2 rounded text-xs">
              {viewingMasterData
                ? `Assigning master data access to ${selectedUsers.length} selected user(s). Select master data and click Apply.`
                : `${selectedUsers.length} user(s) selected. Click "View Rights" to continue.`}
            </div>
          )}

          {viewingMasterData && selectedMasterData.length > 0 && (
            <div className="mt-2 bg-green-50 p-2 rounded text-xs">
              {`${selectedMasterData.length} master data item(s) selected for Full Access.`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
