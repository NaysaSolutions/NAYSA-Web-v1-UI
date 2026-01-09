import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast";
import UserRoleModal from "@/NAYSA Cloud/Lookup/SetUserRole";

// FontAwesome Icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEdit, faTrashAlt, faPlus, faPrint, faChevronDown,
    faFileCsv, faFileExcel, faFilePdf, faSave, faUndo,
    faUsers, faKey, faMagnifyingGlass, faSpinner, faInfoCircle, faVideo, faUserShield
} from "@fortawesome/free-solid-svg-icons";

// Global components and utilities
import { useReset } from "../Components/ResetContext";
import {
    reftables,
    reftablesPDFGuide,
    reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

// Alert utilities
import {
    useSwalErrorAlert,
    useSwalSuccessAlert,
    useSwalWarningAlert,
    useSwalDeleteConfirm,
    useSwalDeleteSuccess,
    useSwalshowSaveSuccessDialog
} from "@/NAYSA Cloud/Global/behavior";

const UpdateUser = () => {
    const docType = "UserUpdate";
    const { user } = useAuth();
    const documentTitle = reftables[docType];
    const pdfLink = reftablesPDFGuide[docType];
    const videoLink = reftablesVideoGuide[docType];

    // Form state
    const [userId, setUserId] = useState("");
    const [userName, setUserName] = useState("");
    const [userType, setUserType] = useState("");
    const [branchCode, setBranchCode] = useState("");
    const [branchName, setBranchName] = useState(""); // Add this for displaying branch name
    const [branchModalOpen, setBranchModalOpen] = useState(false); // Add this for modal control
    const [rcCode, setRcCode] = useState("");
    const [rcName, setRcName] = useState(""); // Add this for displaying RC name
    const [rcModalOpen, setRcModalOpen] = useState(false); // Add this for RC modal control
    const [showUserRoleModal, setShowUserRoleModal] = useState(false);
    const [position, setPosition] = useState("");
    const [emailAdd, setEmailAdd] = useState("");
    const [viewCostamt, setViewCostamt] = useState("N");
    const [editUprice, setEditUprice] = useState("N");
    const [active, setActive] = useState("Yes");

    // Users list
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("active");

    // UX state
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [isOpenExport, setOpenExport] = useState(false);
    const [isOpenGuide, setOpenGuide] = useState(false);

    // Table helpers
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("userId");
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Dropdowns data

    // With this:
    const [userTypes, setUserTypes] = useState([""]); // Start with at least one default

    // Then add this after your fetchUsers function completes:
    useEffect(() => {
        if (users.length > 0) {
            // Extract unique user types from existing users - include all types including "S"
            const uniqueTypes = [...new Set(users.map(user => user.userType).filter(type => type))];
            setUserTypes(["", ...uniqueTypes]); // Add empty option for "All" in filters
        }
    }, [users]);

    // Per-column filters
    const [columnFilters, setColumnFilters] = useState({
        userId: "",
        userName: "",
        userType: "",
        branch: "",
        rcCode: "",
        position: "",
        emailAdd: "",
        active: "",
    });

    // Refs for click-away
    const exportRef = useRef(null);
    const guideRef = useRef(null);

    // Handle Branch Lookup Modal
    const handleOpenBranchModal = () => {
        if (isEditing) {
            setBranchModalOpen(true);
        }
    };

    const handleCloseBranchModal = (selectedBranch = null) => {
        setBranchModalOpen(false);
        if (selectedBranch) {
            console.log("Selected branch:", selectedBranch);
            setBranchCode(selectedBranch.branchCode || "");
            setBranchName(selectedBranch.branchName || "");
        }
    };

    // Handle RC Lookup Modal
    const handleOpenRCModal = () => {
        if (isEditing) {
            setRcModalOpen(true);
        }
    };

    const handleCloseRCModal = (selectedRC = null) => {
        setRcModalOpen(false);
        if (selectedRC) {
            console.log("Selected RC:", selectedRC);
            setRcCode(selectedRC.rcCode || "");
            setRcName(selectedRC.rcName || "");
        }
    };

    const LoadingSpinner = () => (
        <div className="global-tran-spinner-main-div-ui">
            <div className="global-tran-spinner-sub-div-ui">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-2" />
                <p>Please wait...</p>
            </div>
        </div>
    );

    // Fetch users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get("/load", {
                params: {
                    Status:
                        activeTab === "active" ? "Active" :
                            activeTab === "pending" ? "Pending" :
                                "Inactive"
                }
            });

            let userData = [];

            if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
                if (data.data[0]?.result) {
                    try {
                        userData = JSON.parse(data.data[0].result);
                    } catch (parseError) {
                        console.error("Error parsing JSON result:", parseError);
                        userData = [];
                    }
                }
            } else if (data?.result) {
                try {
                    userData = JSON.parse(data.result);
                } catch (parseError) {
                    console.error("Error parsing JSON result:", parseError);
                    userData = [];
                }
            } else if (Array.isArray(data)) {
                userData = data;
            }

            if (Array.isArray(userData)) {
                // 1) keep only valid rows
                const filteredUsers = userData.filter(
                    (u) =>
                        u &&
                        (u.userCode ||
                            u.userName ||
                            u.userType ||
                            u.emailAdd ||
                            u.branchCode ||
                            u.position ||
                            u.rcCode ||
                            u.active ||
                            u.viewCostamt ||
                            u.editUprice)
                );

                // 2) 🔧 FLATTEN names even if SQL used FOR JSON AUTO (nested under table aliases b/c)
                const normalized = filteredUsers.map((u) => ({
                    ...u,
                    branchName:
                        u.branchName ?? u.b?.branchName ?? u.b?.branchname ?? u.branchCode ?? "",
                    rcName:
                        u.rcName ?? u.c?.rcName ?? u.c?.rcname ?? u.rcCode ?? "",
                }));

                setUsers(normalized);

            } else {
                console.log("userData is not an array:", userData);
                setUsers([]);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            setUsers([]);
            await useSwalErrorAlert(
                "Error",
                `Failed to load users: ${error?.response?.data?.message || error.message}`
            );
        } finally {
            setLoading(false);
        }
    };


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

    // Global Ctrl+S
    useEffect(() => {
        const onKey = (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (!saving && isEditing) {
                    console.log("Ctrl+S triggered - calling handleSaveUser");
                    handleSaveUser();
                } else {
                    console.log("Ctrl+S blocked:", { saving, isEditing });
                }
            }
        };

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }); // Remove the dependency array to make it work with current state

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

    // Load users when component mounts
    useEffect(() => {
        fetchUsers();
    }, [activeTab]);

    // Helper function for case-insensitive string includes - MOVED UP
    const includesCI = (str, searchValue) => {
        return String(str || "").toLowerCase().includes(String(searchValue).toLowerCase());
    };

    // Filter users
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        // 1) global search (optional) - include all user types
        const base = q
            ? users.filter((u) =>
                [u.userCode, u.userName, u.userType, u.emailAdd, u.position, u.branchName || u.branchCode, u.rcName || u.rcCode].some((x) =>
                    String(x || "")
                        .toLowerCase()
                        .includes(q)
                )
            )
            : users; // Include all users

        // 2) per-column filters (all must match)
        const withColFilters = base.filter((u) => {
            const f = columnFilters;
            if (f.userId && !includesCI(u.userCode, f.userId)) return false;
            if (f.userName && !includesCI(u.userName, f.userName)) return false;
            if (f.userType && !includesCI(u.userType, f.userType)) return false;
            if (f.branch && !includesCI(u.branchName || u.branchCode, f.branch)) return false;
            if (f.rcCode && !includesCI(u.rcName || u.rcCode, f.rcCode)) return false;
            if (f.position && !includesCI(u.position, f.position)) return false;
            if (f.emailAdd && !includesCI(u.emailAdd, f.emailAdd)) return false;
            if (f.active && !includesCI(activeLabel(u.active), f.active)) return false;

            return true;
        });

        // 3) sort - update to sort by names when available
        const factor = sortDir === "asc" ? 1 : -1;
        return [...withColFilters].sort((a, b) => {
            let A, B;
            if (sortBy === 'branchName') {
                A = String(a?.branchName || a?.branchCode || "");
                B = String(b?.branchName || b?.branchCode || "");
            } else if (sortBy === 'rcName') {
                A = String(a?.rcName || a?.rcCode || "");
                B = String(b?.rcName || b?.rcCode || "");
            } else {
                A = String(a?.[sortBy] ?? "");
                B = String(b?.[sortBy] ?? "");
            }
            return A.localeCompare(B) * factor;
        });
    }, [users, query, columnFilters, sortBy, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageRows = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const resetForm = () => {
        // Reset form fields
        setUserId("");
        setUserName("");
        setUserType("");
        setBranchCode("");
        setBranchName("");
        setRcCode("");
        setRcName("");
        setPosition("");
        setEmailAdd("");
        setActive("Yes");
        setViewCostamt("N");
        setEditUprice("N");
        setSelectedUser(null);
        setIsEditing(false);

        // Reset table filters
        setQuery("");
        setColumnFilters({
            userId: "",
            userName: "",
            userType: "",
            branch: "",
            rcCode: "",
            position: "",
            emailAdd: "",
            active: "",
        });

        // Reset table pagination and sorting
        setPage(1);
        setSortBy("userCode");
        setSortDir("asc");

        console.log("Form and table filters have been reset");
    };


    const handleSaveUser = async () => {
        setSaving(true);
        if (!userId || !userName) {
            await useSwalErrorAlert("Error!", "Please fill out User ID and User Name.");
            setSaving(false);
            return;
        }
        try {
            // Send the data structure that matches your controller expectations
            const payload = {
                json_data: {
                    userCode: userId.trim(),
                    userName: userName.trim(),
                    emailAdd: emailAdd ? emailAdd.trim() : "",
                    userType: userType || "",
                    branchCode: branchCode || "",
                    rcCode: rcCode || "",
                    viewCostamt: viewCostamt || "N", // Ensure single character
                    editUprice: editUprice || "N",   // Ensure single character
                    active:
                        active === "Yes" ? "Y" :
                            active === "Pending" ? "P" :
                                "N", // Convert Yes/No to Y/N
                    position: position ? position.trim() : ""
                }
            };

            console.log("Sending payload:", payload);

            const response = await apiClient.post("users/upsert", payload);

            const res = response.data;

            // Check the response structure from your controller
            if (res?.success === true || res?.data?.status === "success") {
                await fetchUsers();

                await useSwalSuccessAlert(
                    "Success!",
                    res?.message || "User saved successfully."
                );

                resetForm();
            } else {
                const errorMsg = res?.message || res?.details || "Failed to save user. Please check your data and try again.";
                await useSwalErrorAlert("Error!", errorMsg);
            }
        } catch (e) {
            console.error("Save error:", e);

            // Handle different error scenarios
            if (e?.response?.status === 500) {
                const errorMsg = e?.response?.data?.message || e?.response?.data?.details || "Server error occurred.";
                await useSwalErrorAlert("Error!", errorMsg);
            } else {
                await useSwalErrorAlert("Error!", e?.response?.data?.message || e.message || "Error saving user.");
            }
        } finally {
            setSaving(false);
        }
    };
    // Updated handleDeleteUser function to accept user parameter
    const handleDeleteUser = async (userToDelete = null) => {
        // Use the passed user or fall back to selectedUser
        const targetUser = userToDelete || selectedUser;

        if (!targetUser?.userCode) {
            await useSwalErrorAlert("Error", "Please select a user to delete.");
            return;
        }

        const confirm = await useSwalDeleteConfirm(
            "Delete this user?",
            `ID: ${targetUser.userCode} | Name: ${targetUser.userName || ""}`,
            "Yes, delete it"
        );

        if (!confirm.isConfirmed) return;

        try {
            // Use the same structure as save - just mark as inactive
            const payload = {
                json_data: {
                    userCode: targetUser.userCode,
                    userName: targetUser.userName,
                    userType: targetUser.userType,
                    branchCode: targetUser.branchCode,
                    rcCode: targetUser.rcCode,
                    viewCostamt: targetUser.viewCostamt || "N",
                    editUprice: targetUser.editUprice || "N",
                    emailAdd: targetUser.emailAdd || "",
                    position: targetUser.position || "",
                    active: "N" // Set to inactive instead of deleting
                }
            };

            // Updated endpoint to users/upsert
            const response = await apiClient.post("users/upsert", payload);
            console.log("Delete response:", response);

            const res = response.data;

            if (res?.success === true || res?.data?.status === "success") {
                await useSwalDeleteSuccess();
                await fetchUsers();

                // Clear form if the deleted user was being edited
                if (selectedUser?.userCode === targetUser.userCode) {
                    resetForm();
                }
            } else {
                const errorMsg = res?.message || res?.details || "Failed to deactivate user.";
                await useSwalErrorAlert("Error", errorMsg);
            }
        } catch (error) {
            console.error("Delete error:", error);
            const errorMsg = error?.response?.data?.message || error?.response?.data?.details || "Failed to deactivate user.";
            await useSwalErrorAlert("Error", errorMsg);
        }
    };

    const handleEditUser = async (user) => {
        console.log("Editing user:", user);

        // If the user doesn't have branchName or rcName, fetch them from the Get endpoint
        if ((!user.branchName && user.branchCode) || (!user.rcName && user.rcCode)) {
            try {
                const { data } = await apiClient.get("/get", {
                    params: {
                        userCode: user.userCode
                    }
                });

                console.log("Get user response:", data);

                let fullUserData = null;
                if (data?.data && Array.isArray(data.data) && data.data[0]?.result) {
                    const parsedResult = JSON.parse(data.data[0].result);
                    if (Array.isArray(parsedResult) && parsedResult.length > 0) {
                        fullUserData = parsedResult[0];
                    }
                } else if (data?.result) {
                    const parsedResult = JSON.parse(data.result);
                    if (Array.isArray(parsedResult) && parsedResult.length > 0) {
                        fullUserData = parsedResult[0];
                    }
                }

                if (fullUserData) {
                    user = { ...user, ...fullUserData };
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
            }
        }

        // Set all form fields with proper null/undefined handling
        setUserId(user.userCode || "");
        setUserName(user.userName || "");
        setUserType(user.userType || "");
        setBranchCode(user.branchCode || "");
        setBranchName(user.branchName || "");
        setRcCode(user.rcCode || "");
        setRcName(user.rcName || "");
        setPosition(user.position || "");
        setEmailAdd(user.emailAdd || "");

        // Handle the active field properly - your sproc returns Y/N, but form expects Yes/No
        setActive(
            user.active === "Y" ? "Yes" :
                user.active === "P" ? "Pending" :
                    "No"
        );

        // Handle the permission fields - ensure they default to "N" if not set
        setViewCostamt(user.viewCostamt === "Y" ? "Y" : "N");
        setEditUprice(user.editUprice === "Y" ? "Y" : "N");

        setSelectedUser(user);
        setIsEditing(true);

        // Debug log to verify the values are set correctly
        console.log("Form values set to:", {
            userId: user.userCode,
            userName: user.userName,
            userType: user.userType,
            branchCode: user.branchCode,
            branchName: user.branchName,
            rcCode: user.rcCode,
            rcName: user.rcName,
            position: user.position,
            emailAdd: user.emailAdd,
            active: user.active === "Y" ? "Yes" : "No",
            viewCostamt: user.viewCostamt === "Y" ? "Y" : "N",
            editUprice: user.editUprice === "Y" ? "Y" : "N"
        });
    };

    // Start new user
    const startNew = () => {
        resetForm();
        setIsEditing(true);
    };

    // Reset Password (tokenless email link)
    const handleResetPassword = async () => {
        if (!selectedUser?.userCode) {
            await useSwalWarningAlert("Warning", "Please select a user to reset password");
            return;
        }

        const confirmRes = await useSwalDeleteConfirm(
            "Reset Password",
            `Are you sure you want to reset the password for ${selectedUser.userName}?`,
            "Yes, reset it"
        );
        if (!confirmRes.isConfirmed) return;

        try {
            // optional global spinner (remove if you don't use it)
            setShowSpinner?.(true);

            // 🔑 Call the new Laravel endpoint that sends the email (purpose='reset')
            const { data } = await apiClient.post("/users/request-password-reset", {
                userCode: selectedUser.userCode,
                // resetBy: user.USER_CODE, // include only if you log this server-side
            });

            if (data?.status === "success") {
                await useSwalSuccessAlert(
                    "Success",
                    "Password reset link has been emailed to the user."
                );
            } else {
                await useSwalErrorAlert(
                    "Error",
                    data?.message || "Failed to send the reset email."
                );
            }
        } catch (error) {
            console.error("Password reset error:", error);
            const msg = error?.response?.data?.message || error.message || "Request failed.";
            await useSwalErrorAlert("Error", msg);
        } finally {
            setShowSpinner?.(false);
        }
    };


    // Release Account
    const handleReleaseAccount = async () => {
        if (!selectedUser?.userCode) {
            await useSwalWarningAlert("Warning", "Please select a user to approve account");
            return;
        }

        const confirmRes = await useSwalDeleteConfirm(
            "Approve Account",
            `Are you sure you want to approve the account for ${selectedUser.userName}?`,
            "Yes, approve it"
        );
        if (!confirmRes.isConfirmed) return;

        try {
            setShowSpinner(true); // you already have this spinner flag

            // 🔑 Call the new Laravel endpoint that sets bcrypt hash + tpword_date and emails the temp password
            const { data } = await apiClient.post("/users/approve", {
                userCode: selectedUser.userCode,
            });

            if (data?.status === "success") {
                await useSwalSuccessAlert("Success", "Temporary password sent");
                // (optional) refresh the selected user to show the new tpwordDate on screen
                // await reloadUser(selectedUser.userCode);
            } else {
                await useSwalErrorAlert("Error", data?.message || "Failed to approve account");
            }
        } catch (error) {
            console.error("Account approval error:", error);
            const msg = error?.response?.data?.message || error?.message || "Failed to approve account";
            await useSwalErrorAlert("Error", msg);
        } finally {
            setShowSpinner(false);
        }
    };


    const handleExport = (format) => {
        setOpenExport(false);

        try {
            const payload = {
                json_data: {
                    filter: activeTab === "active" ? "Active" : "Inactive"
                },
                format: format,
                exportFilter: {
                    query: query,
                    columnFilters: columnFilters
                }
            };

            apiClient.post("/users/export", payload, { responseType: 'blob' })
                .then(response => {
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    const fileName = `users_export_${format}_${new Date().toISOString().slice(0, 10)}.${format}`;
                    link.setAttribute('download', fileName);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                });
        } catch (error) {
            console.error(`Error exporting to ${format}:`, error);
            useSwalErrorAlert("Export Error", `Failed to export to ${format.toUpperCase()}`);
        }
    };

    const activeLabel = (code) => {
        if (code === "Y") return "Yes";
        if (code === "P") return "Pending";
        if (code === "N") return "No";
        return "-";
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

    return (
        <div className="global-ref-main-div-ui mt-24">
            {(loading || saving) && <LoadingSpinner />}

            {/* Branch Lookup Modal */}
            {branchModalOpen && (
                <BranchLookupModal
                    isOpen={branchModalOpen}
                    onClose={handleCloseBranchModal}
                />
            )}

            {/* RC Lookup Modal */}
            {rcModalOpen && (
                <RCLookupModal
                    isOpen={rcModalOpen}
                    onClose={handleCloseRCModal}
                />
            )}
            {/* User Role Modal */}
            {showUserRoleModal && selectedUser && (
                <UserRoleModal
                    isOpen={showUserRoleModal}
                    user={selectedUser}
                    onClose={() => setShowUserRoleModal(false)}
                />
            )}

            <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h1 className="global-ref-headertext-ui">{documentTitle}</h1>

                </div>

                <div className="flex gap-2 justify-center text-xs">
                    <button
                        onClick={startNew}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                    >
                        <FontAwesomeIcon icon={faPlus} /> Add
                    </button>

                    <button
                        onClick={handleSaveUser}
                        className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!isEditing || saving ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={!isEditing || saving}
                        title="Ctrl+S to Save"
                    >
                        <FontAwesomeIcon icon={faSave} /> Save
                    </button>

                    <button
                        onClick={resetForm}
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                        disabled={saving}
                    >
                        <FontAwesomeIcon icon={faUndo} /> Reset
                    </button>

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
                            <FontAwesomeIcon icon={faInfoCircle} /> Info <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
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

                    {selectedUser && (
                        <>
                            <button
                                onClick={handleResetPassword}
                                disabled={!selectedUser}
                                className="bg-purple-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700"
                            >
                                <FontAwesomeIcon icon={faKey} /> Reset Password
                            </button>
                            <button
                                onClick={handleReleaseAccount}
                                disabled={!selectedUser}
                                className="bg-orange-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-orange-700"
                            >
                                <FontAwesomeIcon icon={faUsers} /> Approve
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Form Layout with Tabs */}
            <div className="global-tran-tab-div-ui">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1 */}
                    <div className="global-ref-textbox-group-div-ui">
                        {/* User ID */}
                        <div className="relative">
                            <input
                                type="text"
                                id="userId"
                                placeholder=" "
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                disabled={isEditing && selectedUser}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} ${isEditing && selectedUser ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                            />
                            <label htmlFor="userId" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> User ID
                            </label>
                        </div>

                        {/* User Name */}
                        <div className="relative">
                            <input
                                type="text"
                                id="userName"
                                placeholder=" "
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="userName" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> User Name
                            </label>
                        </div>

                        {/* User Type */}
                        <div className="relative">
                            <select
                                id="userType"
                                value={userType}
                                onChange={(e) => setUserType(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="">Select Type</option>
                                {userTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <label htmlFor="userType" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                User Type
                            </label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Active */}
                        <div className="relative">
                            <select
                                id="active"
                                value={active}
                                onChange={(e) => setActive(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="Yes">Yes</option>
                                <option value="Pending">Pending</option>
                                <option value="No">No</option>
                            </select>
                            <label htmlFor="active" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>Active?</label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="global-ref-textbox-group-div-ui">
                        {/* Branch - Replace the dropdown with lookup field */}
                        <div className="relative">
                            <div className={`flex items-center global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled cursor-pointer" : "global-ref-textbox-disabled"}`}
                                onClick={handleOpenBranchModal}>
                                <input
                                    type="text"
                                    id="branchName"
                                    placeholder=" "
                                    value={branchName || ""}
                                    readOnly
                                    className="flex-grow bg-transparent border-none focus:outline-none cursor-pointer"
                                />
                                <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className={`ml-2 ${isEditing ? "text-blue-600" : "text-gray-400"}`}
                                />
                            </div>
                            <label htmlFor="branchCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Branch
                            </label>
                        </div>

                        {/* Department (RC Code) - Replace dropdown with lookup */}
                        <div className="relative">
                            <div className={`flex items-center global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled cursor-pointer" : "global-ref-textbox-disabled"}`}
                                onClick={handleOpenRCModal}>
                                <input
                                    type="text"
                                    id="rcCode"
                                    placeholder=" "
                                    value={rcName || ""}
                                    readOnly
                                    className="flex-grow bg-transparent border-none focus:outline-none cursor-pointer"
                                />
                                <FontAwesomeIcon
                                    icon={faMagnifyingGlass}
                                    className={`ml-2 ${isEditing ? "text-blue-600" : "text-gray-400"}`}
                                />
                            </div>
                            <label htmlFor="rcCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Department
                            </label>
                        </div>


                        {/* Position */}
                        <div className="relative">
                            <input
                                type="text"
                                id="position"
                                placeholder=" "
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="position" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>Position</label>
                        </div>

                        {/* Email */}
                        <div className="relative">
                            <input
                                type="email"
                                id="emailAdd"
                                placeholder=" "
                                value={emailAdd}
                                onChange={(e) => setEmailAdd(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="emailAdd" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>Email Address</label>
                        </div>
                    </div>

                    {/* Column 3 */}
                    <div className="global-ref-textbox-group-div-ui">

                        <div className="relative">
                            <select
                                id="viewCostamt"
                                value={viewCostamt || "N"}
                                onChange={(e) => setViewCostamt(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="Y">Yes</option>
                                <option value="N">No</option>
                            </select>
                            <label htmlFor="viewCostamt" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>View Cost Amount</label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Edit Unit Price */}
                        <div className="relative">
                            <select
                                id="editUprice"
                                value={editUprice}
                                onChange={(e) => setEditUprice(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="Y">Yes</option>
                                <option value="N">No</option>
                            </select>
                            <label htmlFor="editUprice" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>Can Edit Unit Price?</label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User List Section */}
            <div className="global-ref-tab-div-ui mt-6">
                {/* Tab Navigation */}
                <div className="flex flex-row sm:flex-row mb-2">
                    <button
                        onClick={() => {
                            setActiveTab('active');
                            fetchUsers();
                        }}
                        className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'active'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Active Users
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('pending');
                            fetchUsers();
                        }}
                        className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'pending'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Pending Users
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab('inactive');
                            fetchUsers();
                        }}
                        className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'inactive'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        Inactive Users
                    </button>
                </div>

                {/* Users Table */}
                <div className="global-ref-table-main-div-ui">
                    <div className="global-ref-table-main-sub-div-ui">
                        <div className="global-ref-table-div-ui">
                            <table className="global-ref-table-div-ui">
                                <thead className="global-ref-thead-div-ui">
                                    {/* Sortable header row */}
                                    <tr>
                                        {[
                                            ["userCode", "User ID"],
                                            ["userName", "User Name"],
                                            ["userType", "User Type"],
                                            ["branchName", "Branch"], // Changed from branchCode to branchName
                                            ["rcName", "Department"], // Changed from rcCode to rcName
                                            ["position", "Position"],
                                            ["emailAdd", "Email Address"],
                                            ["active", "Active"],
                                            ["_edit", "Edit"],
                                            ["_roles", "Set Role"],
                                            ["_delete", "Delete"],

                                        ].map(([key, label]) => (
                                            <th
                                                key={key}
                                                className={`global-ref-th-ui ${key.startsWith("_") ? "" : "cursor-pointer select-none"}`}
                                                onClick={() => {
                                                    if (key.startsWith("_")) return;
                                                    setSortBy(key);
                                                    setSortDir((prev) => (sortBy === key && prev === "asc" ? "desc" : "asc"));
                                                }}
                                                title={!key.startsWith("_") ? "Click to sort" : undefined}
                                            >
                                                {label} {sortBy === key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                                            </th>
                                        ))}
                                    </tr>

                                    {/* Filter row */}
                                    <tr>
                                        <th className="global-ref-th-ui">
                                            <input
                                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                                placeholder="Filter…"
                                                value={columnFilters.userId}
                                                onChange={(e) => { setColumnFilters(s => ({ ...s, userId: e.target.value })); setPage(1); }}
                                            />
                                        </th>
                                        <th className="global-ref-th-ui">
                                            <input
                                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                                placeholder="Filter…"
                                                value={columnFilters.userName}
                                                onChange={(e) => { setColumnFilters(s => ({ ...s, userName: e.target.value })); setPage(1); }}
                                            />
                                        </th>
                                        <th className="global-ref-th-ui">
                                            <select
                                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                                value={columnFilters.userType}
                                                onChange={(e) => { setColumnFilters(s => ({ ...s, userType: e.target.value })); setPage(1); }}
                                            >
                                                <option value="">All</option>
                                                {userTypes.filter(type => type !== "").map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </th>
                                        <th className="global-ref-th-ui">
                                            <input
                                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                                placeholder="Filter…"
                                                value={columnFilters.branch}
                                                onChange={(e) => { setColumnFilters(s => ({ ...s, branch: e.target.value })); setPage(1); }}
                                            />
                                        </th>
                                        <th className="global-ref-th-ui">
                                            <input
                                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                                placeholder="Filter…"
                                                value={columnFilters.rcCode}
                                                onChange={(e) => { setColumnFilters(s => ({ ...s, rcCode: e.target.value })); setPage(1); }}
                                            />
                                        </th>
                                        <th className="global-ref-th-ui">
                                            <input
                                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                                placeholder="Filter…"
                                                value={columnFilters.position}
                                                onChange={(e) => { setColumnFilters(s => ({ ...s, position: e.target.value })); setPage(1); }}
                                            />
                                        </th>
                                        <th className="global-ref-th-ui">
                                            <input
                                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                                placeholder="Filter…"
                                                value={columnFilters.emailAdd}
                                                onChange={(e) => { setColumnFilters(s => ({ ...s, emailAdd: e.target.value })); setPage(1); }}
                                            />
                                        </th>
                                        <select
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            value={columnFilters.active}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, active: e.target.value })); setPage(1); }}
                                        >
                                            <option value="">All</option>
                                            <option value="Yes">Yes</option>
                                            <option value="Pending">Pending</option>
                                            <option value="No">No</option>
                                        </select>

                                        <th className="global-ref-th-ui"></th>
                                        <th className="global-ref-th-ui"></th>
                                        <th className="global-ref-th-ui"></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="11" className="global-ref-norecords-ui">Loading users...</td>
                                        </tr>
                                    ) : pageRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className="global-ref-norecords-ui">No users found</td>
                                        </tr>
                                    ) : (
                                        pageRows
                                            .filter(user =>
                                                activeTab === 'active' ? user.active === 'Y' :
                                                    activeTab === 'pending' ? user.active === 'P' :
                                                        user.active === 'N'
                                            )

                                            .map((user, idx) => (
                                                <tr
                                                    key={idx}
                                                    className={`global-tran-tr-ui ${selectedUser?.userCode === user.userCode ? 'bg-blue-50' : ''}`}
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    <td className="global-ref-td-ui">{user.userCode || "-"}</td>
                                                    <td className="global-ref-td-ui">{user.userName || "-"}</td>
                                                    <td className="global-ref-td-ui">{user.userType || "-"}</td>
                                                    <td className="global-ref-td-ui">{user.branchName || user.branchCode || "-"}</td>
                                                    <td className="global-ref-td-ui">{user.rcName || user.rcCode || "-"}</td>
                                                    <td className="global-ref-td-ui">{user.position || "-"}</td>
                                                    <td className="global-ref-td-ui">{user.emailAdd || "-"}</td>
                                                    {/* <td className="global-ref-td-ui">
                                                        {user.active === 'Y' ? 'Yes' : 'No'}
                                                    </td> */}
                                                    <td className="global-ref-td-ui">
                                                        {activeLabel(user.active)}
                                                    </td>

                                                    {/* Edit */}
                                                    <td className="sticky right-[110px] px-2 py-0.5 bg-blue-50 z-[30]">
                                                        <div className="flex justify-center items-center h-full">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEditUser(user); }}
                                                                title="Edit"
                                                                className="
        flex items-center justify-center
        h-7 w-7
        rounded
        bg-blue-500 text-white hover:bg-blue-600
        shadow-sm transition
        focus:outline-none focus:ring-1 focus:ring-blue-300
      "
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} className="text-[12px]" />
                                                            </button>
                                                        </div>
                                                    </td>

                                                    {/* Set Role */}
                                                    <td className="sticky right-[55px] px-2 py-0.5 bg-blue-50 z-[40]">
                                                        <div className="flex justify-center items-center h-full">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedUser(user);
                                                                    setShowUserRoleModal(true);
                                                                }}
                                                                title="Set Role"
                                                                className="
        flex items-center justify-center
        h-7 w-7
        rounded
        bg-blue-500 text-white hover:bg-blue-600
        shadow-sm transition
        focus:outline-none focus:ring-1 focus:ring-blue-300
      "
                                                            >
                                                                <FontAwesomeIcon icon={faUserShield} className="text-[12px]" />
                                                            </button>
                                                        </div>
                                                    </td>

                                                    {/* Delete */}
                                                    <td className="sticky right-0 px-1 py-0.5 bg-blue-50 z-[50]">
                                                        <div className="flex justify-center items-center h-full">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedUser(user);
                                                                    handleDeleteUser(user);
                                                                }}
                                                                title="Delete"
                                                                className="
        flex items-center justify-center
        h-7 w-7
        rounded
        bg-red-500 text-white hover:bg-red-600
        shadow-sm transition
        focus:outline-none focus:ring-1 focus:ring-red-300
      "
                                                            >
                                                                <FontAwesomeIcon icon={faTrashAlt} className="text-[12px]" />
                                                            </button>
                                                        </div>
                                                    </td>


                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            <div className="flex items-center justify-between p-3">
                                <div className="text-xs opacity-80 font-semibold">
                                    Total Records: {
                                        filtered.filter(user =>
                                            activeTab === 'active' ? user.active === 'Y' :
                                                activeTab === 'pending' ? user.active === 'P' :
                                                    user.active === 'N'
                                        ).length

                                    }
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
    );
};

export default UpdateUser;