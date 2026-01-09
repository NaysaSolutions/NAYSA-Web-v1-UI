import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faPrint, faChevronDown, faInfoCircle, faSpinner,
  faFileCsv, faFileExcel, faFilePdf, faVideo, faSave, faUndo, faUsers, faShield, faKey,
  faUserShield, faCheck, faEye
} from "@fortawesome/free-solid-svg-icons";

// Global
import { useReset } from "../Components/ResetContext";
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

// Import SweetAlert utilities from behavior.js
import {
  useSwalInfoAlert,
} from "@/NAYSA Cloud/Global/behavior";

// Exports
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Import tab components
import UsersTab from "./UserAccessRightsTabs/UsersTab";
import RolesTab from "./UserAccessRightsTabs/RolesTab";
import RoleAccessTab from "./UserAccessRightsTabs/RoleAccessTab";
import UserRoleTab from "./UserAccessRightsTabs/UserRoleTab";


const UserAccessRights = () => {
  const docType = "UserAccRight";
  const { user } = useAuth();
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];
  const usersTabRef = useRef(null);
  const rolesTabRef = useRef(null);
  const roleAccessTabRef = useRef(null);
  const userAccessTabRef = useRef(null);

  const [activeTab, setActiveTab] = useState("userRoles");

  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [appliedUserRoles, setAppliedUserRoles] = useState(new Set());

  // UX state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  // Refs for click-away
  const exportRef = useRef(null);
  const guideRef = useRef(null);

  // Loading spinner component
 const LoadingSpinner = () => (
     <div className="global-tran-spinner-main-div-ui">
       <div className="global-tran-spinner-sub-div-ui">
         <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-2" />
         <p>Please wait...</p>
       </div>
     </div>
   );

  // Fetch roles 
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/role");
      const roleData =
        Array.isArray(data?.data) && data.data[0]?.result
          ? JSON.parse(data.data[0].result)
          : [];
      setRoles(roleData);
    } catch (error) {
      console.error("Error fetching roles:", error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/load", { params: { Status: "Active" } });
      const { data } = response;

      let userData = [];
      if (Array.isArray(data?.data) && data.data[0]?.result) {
        try {
          const resultData = typeof data.data[0].result === 'string'
            ? JSON.parse(data.data[0].result)
            : data.data[0].result;

          if (Array.isArray(resultData)) {
            userData = resultData.filter(u => u.userCode || u.userName || u.userType);
          }
        } catch (parseError) {
          console.error("Error parsing user data:", parseError);
        }
      }

      setUsers(userData);

      if (userData.length === 0) {
        await useSwalInfoAlert("No Users", "No active users found in the system.");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async (userCodes) => {
    try {
      const { data } = await apiClient.get('/getUserRoles', {
        json_data: { users: userCodes },
      });

      const rows = data?.data ?? [];
      // Accept USER_CODE/ROLE_CODE or user_code/role_code
      const s = new Set(
        rows
          .map(r => {
            const u = r.USER_CODE ?? r.user_code ?? r.userCode;
            const rc = r.ROLE_CODE ?? r.role_code ?? r.roleCode;
            return (u && rc) ? `${u}-${rc}` : null;
          })
          .filter(Boolean)
      );

      setAppliedUserRoles(s); // <- the Set your RolesTab consumes
    } catch (e) {
      console.error('fetchUserRoles failed', e);
    }
  };


  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (activeTab === "roleUserMatch" || activeTab === "userAccess") {
      fetchUsers();
      if (activeTab === "roleUserMatch") {
        fetchUserRoles();
      }
    }
  }, [activeTab]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideExport =
        exportRef.current && !exportRef.current.contains(event.target);
      const clickedOutsideGuide =
        guideRef.current && !guideRef.current.contains(event.target);
      if (clickedOutsideExport) setOpenExport(false);
      if (clickedOutsideGuide) setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Loading spinner timer
  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => setShowSpinner(true), 200);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Exports
  const handleExport = (type) => {
    if (!roles.length) {
      useSwalInfoAlert("No data", "There is no data to export.");
      return;
    }

    const headers = ["Code", "Description", "Active"];
    const rows = roles.map((role) => [
      role.roleCode || "",
      role.roleName || "",
      role.active || "",
    ]);

    if (type === "csv" || type === "excel") {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "User Roles");
      if (type === "csv") {
        XLSX.writeFile(wb, "user_roles.csv", { bookType: "csv" });
      } else {
        XLSX.writeFile(wb, "user_roles.xlsx", { bookType: "xlsx" });
      }
    } else if (type === "pdf") {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "A4",
      });
      doc.setFontSize(15);
      doc.text("User Roles", 40, 40);
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 60,
        margin: { top: 50 },
        theme: "grid",
        styles: {
          fontSize: 8,
          textColor: [40, 40, 40],
          lineColor: [60, 60, 60],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [0, 0, 128],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
      });
      doc.save("user_roles.pdf");
    }
    setOpenExport(false);
  };

  // Guides
  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // Define the tabs structure
  const tabs = [
    { id: "userRoles", label: "User Roles", icon: faUsers, color: "blue" },
    { id: "roleUserMatch", label: "Role-User Matching", icon: faUserShield, color: "green" },
    { id: "roleAccess", label: "Role Access Rights", icon: faShield, color: "purple" },
    // { id: "userAccess", label: "User Access Rights", icon: faKey, color: "orange" },
  ];

  const renderActionButtons = () => {
    switch (activeTab) {
      case "userRoles":
        return (
          <>
            <button
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              onClick={() => usersTabRef.current?.add?.()}
            >
              <FontAwesomeIcon icon={faPlus} /> Add
            </button>
            <button
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              onClick={() => usersTabRef.current?.save?.()}
            >
              <FontAwesomeIcon icon={faSave} /> Save
            </button>
            <button
              className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
              onClick={() => usersTabRef.current?.reset?.()}
            >
              <FontAwesomeIcon icon={faUndo} /> Reset
            </button>
          </>
        );

      case "roleUserMatch":
        return (
          <>
            <button
              className="bg-purple-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
              onClick={() => rolesTabRef.current?.viewRole?.()}
            >
              <FontAwesomeIcon icon={faEye} /> View Role
            </button>
            <button
              className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
              onClick={() => rolesTabRef.current?.reset?.()}
            >
              <FontAwesomeIcon icon={faUndo} /> Reset
            </button>
            <button
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              onClick={() => rolesTabRef.current?.apply?.()}
            >
              <FontAwesomeIcon icon={faCheck} /> Apply
            </button>
          </>
        );

      case "roleAccess":
        return (
          <>
            <button
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              onClick={() => roleAccessTabRef.current?.viewModules?.()}
            >
              <FontAwesomeIcon icon={faEye} /> View Modules
            </button>
            <button
              className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
              onClick={() => roleAccessTabRef.current?.reset?.()}
            >
              <FontAwesomeIcon icon={faUndo} /> Reset
            </button>
            <button
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
              onClick={() => roleAccessTabRef.current?.saveAccess?.()}
            >
              <FontAwesomeIcon icon={faSave} /> Save Access
            </button>
          </>
        );

      case "userAccess":
        return (
          <>
            <button
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              onClick={() => userAccessTabRef.current?.viewRights?.()}
            >
              <FontAwesomeIcon icon={faEye} /> View Rights
            </button>
            <button
              className="bg-gray-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
              onClick={() => userAccessTabRef.current?.reset?.()}
            >
              <FontAwesomeIcon icon={faUndo} /> Reset
            </button>
            <button
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
              onClick={() => userAccessTabRef.current?.apply?.()}
            >
              <FontAwesomeIcon icon={faCheck} /> Apply
            </button>
          </>
        );

      default:
        return null;
    }
  };


  return (
    <div className="global-ref-main-div-ui mt-24">
      {(loading || saving) && <LoadingSpinner />}

      {/* Header with Tabs */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        {/* Tab Navigation in Header */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 group mr-1
          ${activeTab === tab.id
                  ? `bg-${tab.color}-100 text-${tab.color}-700 dark:bg-${tab.color}-900 dark:text-${tab.color}-300`
                  : 'text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300'
                }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="w-4 h-4 mr-2" />
              <span className="group-hover:block whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-center text-xs">
          {/* Common buttons across all tabs */}
          {renderActionButtons()}

          <div ref={exportRef} className="relative">
            <button
              onClick={() => setOpenExport((v) => !v)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faPrint} /> Export <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
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

          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((v) => !v)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} /> Help <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
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

      {/* Tab Content */}
      <div className="global-tran-tab-div-ui mt-5">
        {activeTab === "userRoles" && (
          <UsersTab
            ref={usersTabRef}
            roles={roles}
            fetchRoles={fetchRoles}
            user={user}
            saving={saving}
            setSaving={setSaving}
          />
        )}

        {activeTab === "roleUserMatch" && (
          <RolesTab
            ref={rolesTabRef}
            users={users}
            roles={roles}
            appliedUserRoles={appliedUserRoles}
            setAppliedUserRoles={setAppliedUserRoles}
            fetchUserRoles={fetchUserRoles}
          />
        )}

        {activeTab === "roleAccess" && (
          <RoleAccessTab ref={roleAccessTabRef} roles={roles} />
        )}

        {activeTab === "userAccess" && (
          <UserRoleTab ref={userAccessTabRef} users={users} />
        )}
      </div>
    </div>
  );
};

export default UserAccessRights;