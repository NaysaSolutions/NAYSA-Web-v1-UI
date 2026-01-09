import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faEdit, faTrashAlt, faSave, faUndo, faPrint, faChevronDown,
    faFileCsv, faFileExcel, faFilePdf, faInfoCircle, faVideo, faSpinner,
    faMagnifyingGlass, faSort, faSortUp, faSortDown, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { 
    useSwalErrorAlert, 
    useSwalSuccessAlert, 
    useSwalWarningAlert,
    useSwalDeleteConfirm, 
    useSwalDeleteSuccess,
    useSwalshowSaveSuccessDialog
} from "@/NAYSA Cloud/Global/behavior";
import { formatNumber, parseFormattedNumber } from '@/NAYSA Cloud/Global/behavior';

const COAMast = () => {
    // Auth and user context
    const { user } = useAuth();
    const docType = "COA";
    const documentTitle = "Chart of Accounts";
    
    // Form fields state
    const [formData, setFormData] = useState({
        acctCode: '',
        acctName: '',
        acctType: '',
        acctGroup: '',
        acctBalance: '',
        reqSL: 'N',
        reqRC: 'N',
        reqBudget: 'N',
        acctClassification: '',
        fsConsCode: '',
        fsConsDesc: '',
        oldCode: '',
        contraAccount: '',
        isActive: 'Y'
    });
    
    // COA list state
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Registration information
    const [registrationInfo, setRegistrationInfo] = useState({
        registeredBy: '',
        registeredDate: '',
        lastUpdatedBy: '',
        lastUpdatedDate: ''
    });
    
    // UX state
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSpinner, setShowSpinner] = useState(false);
    const [isOpenExport, setOpenExport] = useState(false);
    const [isOpenGuide, setOpenGuide] = useState(false);
    
    // Table helpers
    const [sortConfig, setSortConfig] = useState({ key: 'acctCode', direction: 'asc' });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    
    // Filters state
    const [columnFilters, setColumnFilters] = useState({
        acctCode: '',
        acctName: '',
        acctType: '',
        acctGroup: '',
        acctBalance: '',
        reqSL: '',
        reqRC: '',
        reqBudget: '',
        acctClassification: '',
        fsConsCode: '',
        fsConsDesc: '',
        oldCode: '',
        contraAccount: '',
        isActive: ''
    });
    
    // Refs for dropdown menus
    const exportRef = useRef(null);
    const guideRef = useRef(null);
    
    // Loading spinner component
    const LoadingSpinner = () => (
        <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-xl">
                {saving ? "Saving…" : "Loading…"}
            </div>
        </div>
    );
    
    // Fetch accounts data from API
    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const response = await apiClient.post("/lookupCOA", {
                PARAMS: JSON.stringify({
                    search: "",
                    page: 1,
                    pageSize: 1000
                })
            });
    
            const result = response.data;
            if (result.success && result.data && result.data.length > 0 && result.data[0].result) {
                const accountData = JSON.parse(result.data[0].result);
                
                // Process and standardize the account data
                const processedAccounts = accountData.map(account => ({
                    id: account.id || '',
                    acctCode: account.acctCode || '',
                    acctName: account.acctName || '',
                    acctType: account.acctType || '',
                    acctGroup: account.acctGroup || '',
                    acctBalance: account.acctBalance || '',
                    reqSL: account.reqSL || 'N',
                    reqRC: account.reqRC || 'N',
                    reqBudget: account.reqBudget || 'N',
                    acctClassification: account.acctClassification || '',
                    fsConsCode: account.fsConsCode || '',
                    fsConsDesc: account.fsConsDesc || '',
                    oldCode: account.oldCode || '',
                    contraAccount: account.contraAccount || '',
                    isActive: account.isActive || 'Y',
                    registeredBy: account.REGISTERED_BY || '',
                    registeredDate: account.REGISTERED_DATE ? new Date(account.REGISTERED_DATE).toISOString().split('T')[0] : '',
                    lastUpdatedBy: account.UPDATED_BY || '',
                    lastUpdatedDate: account.UPDATED_DATE ? new Date(account.UPDATED_DATE).toISOString().split('T')[0] : ''
                }));
                
                setAccounts(processedAccounts);
            } else {
                await useSwalErrorAlert("Error", result.message || "No Chart of Accounts found.");
                setAccounts([]);
            }
        } catch (err) {
            console.error("Error fetching accounts:", err);
            await useSwalErrorAlert("Error", `Failed to fetch accounts: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    // Get specific account by code
    const getAccount = async (acctCode) => {
        setLoading(true);
        try {
            const response = await apiClient.post(`/lookupCOA`, {
                PARAMS: JSON.stringify({
                    search: "Single",
                    acctCode: acctCode
                })
            });
    
            if (response.data.success) {
                const accountData = Array.isArray(response.data.data)
                    ? response.data.data[0]
                    : (response.data.data[0]?.result ? JSON.parse(response.data.data[0].result)[0] : null);
    
                if (accountData) {
                    // Update registration info
                    setRegistrationInfo({
                        registeredBy: accountData.REGISTERED_BY || '',
                        registeredDate: accountData.REGISTERED_DATE ? new Date(accountData.REGISTERED_DATE).toISOString().split('T')[0] : '',
                        lastUpdatedBy: accountData.UPDATED_BY || '',
                        lastUpdatedDate: accountData.UPDATED_DATE ? new Date(accountData.UPDATED_DATE).toISOString().split('T')[0] : ''
                    });
    
                    return {
                        id: accountData.id || '',
                        acctCode: accountData.acctCode || '',
                        acctName: accountData.acctName || '',
                        acctType: accountData.acctType || '',
                        acctGroup: accountData.acctGroup || '',
                        acctBalance: accountData.acctBalance || '',
                        reqSL: accountData.reqSL || 'N',
                        reqRC: accountData.reqRC || 'N',
                        reqBudget: accountData.reqBudget || 'N',
                        acctClassification: accountData.acctClassification || '',
                        fsConsCode: accountData.fsConsCode || '',
                        fsConsDesc: accountData.fsConsDesc || '',
                        oldCode: accountData.oldCode || '',
                        contraAccount: accountData.contraAccount || '',
                        isActive: accountData.isActive || 'Y',
                    };
                } else {
                    throw new Error('Account not found');
                }
            } else {
                throw new Error(response.data.message || 'Account not found');
            }
        } catch (error) {
            console.error("Error fetching account details:", error);
            await useSwalErrorAlert("Error", "Failed to get account details");
            return null;
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
                if (!saving && isEditing) handleSaveAccount();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [saving, isEditing]);
    
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
    
    // Initial data load
    useEffect(() => {
        fetchAccounts();
    }, []);
    
    // Helper function for case-insensitive string includes
    const includesCI = (str, searchValue) => {
        return String(str || "").toLowerCase().includes(String(searchValue).toLowerCase());
    };
    
    // Filter accounts based on column filters
    const filtered = React.useMemo(() => {
        // Filter by column filters
        const filtered = accounts.filter(account => {
            const f = columnFilters;
            if (f.acctCode && !includesCI(account.acctCode, f.acctCode)) return false;
            if (f.acctName && !includesCI(account.acctName, f.acctName)) return false;
            if (f.acctType && !includesCI(account.acctType, f.acctType)) return false;
            if (f.acctGroup && !includesCI(account.acctGroup, f.acctGroup)) return false;
            if (f.acctBalance && !includesCI(account.acctBalance, f.acctBalance)) return false;
            if (f.reqSL && !includesCI(account.reqSL === 'Y' ? 'Yes' : 'No', f.reqSL)) return false;
            if (f.reqRC && !includesCI(account.reqRC === 'Y' ? 'Yes' : 'No', f.reqRC)) return false;
            if (f.reqBudget && !includesCI(account.reqBudget === 'Y' ? 'Yes' : 'No', f.reqBudget)) return false;
            if (f.acctClassification && !includesCI(account.acctClassification, f.acctClassification)) return false;
            if (f.fsConsCode && !includesCI(account.fsConsCode, f.fsConsCode)) return false;
            if (f.fsConsDesc && !includesCI(account.fsConsDesc, f.fsConsDesc)) return false;
            if (f.oldCode && !includesCI(account.oldCode, f.oldCode)) return false;
            if (f.contraAccount && !includesCI(account.contraAccount, f.contraAccount)) return false;
            if (f.isActive && !includesCI(account.isActive === 'Y' ? 'Yes' : 'No', f.isActive)) return false;
            return true;
        });
    
        // Apply sorting
        const { key, direction } = sortConfig;
        if (key) {
            filtered.sort((a, b) => {
                const aValue = (a[key] || '').toLowerCase();
                const bValue = (b[key] || '').toLowerCase();
    
                if (aValue < bValue) {
                    return direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
    
        return filtered;
    }, [accounts, columnFilters, sortConfig]);
    
    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageRows = React.useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);
    
    // Form handling functions
    const resetForm = () => {
        setFormData({
            acctCode: '',
            acctName: '',
            acctType: '',
            acctGroup: '',
            acctBalance: '',
            reqSL: 'N',
            reqRC: 'N',
            reqBudget: 'N',
            acctClassification: '',
            fsConsCode: '',
            fsConsDesc: '',
            oldCode: '',
            contraAccount: '',
            isActive: 'Y'
        });
        setSelectedAccount(null);
        setIsEditing(false);
        setRegistrationInfo({
            registeredBy: '',
            registeredDate: '',
            lastUpdatedBy: '',
            lastUpdatedDate: ''
        });
    };
    
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Save account data
    const handleSaveAccount = async () => {
        setSaving(true);
        
        // Validate form data
        if (!formData.acctCode || !formData.acctName || !formData.acctBalance) {
            await useSwalErrorAlert("Error", "Please fill in all required fields: Account Code, Name, and Balance Type.");
            setSaving(false);
            return;
        }
        
        try {
            // Prepare API payload
            const payload = {
                ...formData,
                id: selectedAccount?.id || null,
                USERID: user?.USER_CODE || 'ADMIN'
            };
            
            // Determine if it's an update or create operation
            const apiEndpoint = selectedAccount ? "/updateCOA" : "/createCOA";
            
            const response = await apiClient.post(apiEndpoint, payload);
            
            if (response.data.success) {
                await useSwalshowSaveSuccessDialog(
                    resetForm,
                    () => {} // No additional action on cancel
                );
                await fetchAccounts();
            } else {
                await useSwalErrorAlert("Error", response.data.message || "Operation failed");
            }
        } catch (err) {
            console.error("Error saving account:", err);
            await useSwalErrorAlert("Error", err.message || "Failed to save account");
        } finally {
            setSaving(false);
        }
    };
    
    // Delete account
    const handleDeleteAccount = async () => {
        if (!selectedAccount?.acctCode) {
            await useSwalErrorAlert("Error", "Please select an account to delete.");
            return;
        }
    
        const confirm = await useSwalDeleteConfirm(
            "Delete this account?",
            `Code: ${selectedAccount.acctCode} | Name: ${selectedAccount.acctName || ""}`,
            "Yes, delete it"
        );
    
        if (!confirm.isConfirmed) return;
    
        try {
            const response = await apiClient.post("/deleteCOA", {
                id: selectedAccount.id,
                acctCode: selectedAccount.acctCode,
                USERID: user?.USER_CODE || 'ADMIN'
            });
    
            if (response.data.success) {
                await useSwalDeleteSuccess();
                await fetchAccounts();
                resetForm();
            } else {
                await useSwalErrorAlert("Error", response.data.message || "Failed to delete account.");
            }
        } catch (error) {
            console.error("Delete error:", error);
            await useSwalErrorAlert("Error", "Failed to delete account.");
        }
    };
    
    // Start editing an account
    const handleEditAccount = async (account) => {
        // Fetch full account details
        const fullDetails = await getAccount(account.acctCode);
        if (fullDetails) {
            setFormData(fullDetails);
            setSelectedAccount(fullDetails);
            setIsEditing(true);
        }
    };
    
    // Start new account
    const startNew = () => {
        resetForm();
        setIsEditing(true);
    };
    
    // Handle sorting
    const handleSort = (key) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    
    // Export data functions
    const handleExport = (format) => {
        setOpenExport(false);
    
        try {
            const payload = {
                entity: "exportCOA",
                format: format,
                filter: {
                    columnFilters: columnFilters
                }
            };
    
            apiClient.get("/load", { params: payload, responseType: 'blob' })
                .then(response => {
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    const fileName = `coa_export_${format}_${new Date().toISOString().slice(0, 10)}.${format}`;
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

    return (
        <div className="global-ref-main-div-ui mt-24">
            {(loading || saving) && showSpinner && <LoadingSpinner />}

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
                        onClick={handleSaveAccount}
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
                                    onClick={() => handleExport("csv")}
                                    className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                                >
                                    <FontAwesomeIcon icon={faFileCsv} className="mr-2 text-green-600" /> CSV
                                </button>
                                <button
                                    onClick={() => handleExport("excel")}
                                    className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                                >
                                    <FontAwesomeIcon icon={faFileExcel} className="mr-2 text-green-600" /> Excel
                                </button>
                                <button
                                    onClick={() => handleExport("pdf")}
                                    className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                                >
                                    <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> PDF
                                </button>
                            </div>
                        )}
                    </div>

                    {selectedAccount && (
                        <button
                            onClick={handleDeleteAccount}
                            disabled={!selectedAccount}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700"
                        >
                            <FontAwesomeIcon icon={faTrashAlt} /> Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Form Layout */}
            <div className="global-tran-tab-div-ui">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Column 1 */}
                    <div className="global-ref-textbox-group-div-ui">
                        {/* Account Code */}
                        <div className="relative">
                            <input
                                type="text"
                                id="acctCode"
                                name="acctCode"
                                placeholder=" "
                                value={formData.acctCode}
                                onChange={handleFormChange}
                                disabled={isEditing && selectedAccount}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} ${isEditing && selectedAccount ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                                maxLength={20}
                            />
                            <label htmlFor="acctCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> Account Code
                            </label>
                        </div>

                        {/* Account Name */}
                        <div className="relative">
                            <input
                                type="text"
                                id="acctName"
                                name="acctName"
                                placeholder=" "
                                value={formData.acctName}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                                maxLength={100}
                            />
                            <label htmlFor="acctName" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> Account Name
                            </label>
                        </div>

                        {/* Account Type */}
                        <div className="relative">
                            <input
                                type="text"
                                id="acctType"
                                name="acctType"
                                placeholder=" "
                                value={formData.acctType}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="acctType" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Account Type
                            </label>
                        </div>

                        {/* Account Group */}
                        <div className="relative">
                            <input
                                type="text"
                                id="acctGroup"
                                name="acctGroup"
                                placeholder=" "
                                value={formData.acctGroup}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="acctGroup" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Account Group
                            </label>
                        </div>

                        {/* Account Balance */}
                        <div className="relative">
                            <select
                                id="acctBalance"
                                name="acctBalance"
                                value={formData.acctBalance}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="">Select Balance Type</option>
                                <option value="Debit">Debit</option>
                                <option value="Credit">Credit</option>
                            </select>
                            <label htmlFor="acctBalance" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> Account Balance
                            </label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="global-ref-textbox-group-div-ui">
                        {/* Requires SL */}
                        <div className="relative">
                            <select
                                id="reqSL"
                                name="reqSL"
                                value={formData.reqSL}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                            <label htmlFor="reqSL" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Requires Subsidiary Ledger
                            </label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Requires RC */}
                        <div className="relative">
                            <select
                                id="reqRC"
                                name="reqRC"
                                value={formData.reqRC}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                            <label htmlFor="reqRC" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Requires Responsibility Center
                            </label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Requires Budget */}
                        <div className="relative">
                            <select
                                id="reqBudget"
                                name="reqBudget"
                                value={formData.reqBudget}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="N">No</option>
                                <option value="Y">Yes</option>
                            </select>
                            <label htmlFor="reqBudget" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Requires Budget
                            </label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Account Classification */}
                        <div className="relative">
                            <input
                                type="text"
                                id="acctClassification"
                                name="acctClassification"
                                placeholder=" "
                                value={formData.acctClassification}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="acctClassification" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Account Classification
                            </label>
                        </div>

                        {/* Is Active */}
                        <div className="relative">
                            <select
                                id="isActive"
                                name="isActive"
                                value={formData.isActive}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="Y">Yes</option>
                                <option value="N">No</option>
                            </select>
                            <label htmlFor="isActive" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Is Active
                            </label>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Column 3 */}
                    <div className="global-ref-textbox-group-div-ui">
                        {/* FS Cons Code */}
                        <div className="relative">
                            <input
                                type="text"
                                id="fsConsCode"
                                name="fsConsCode"
                                placeholder=" "
                                value={formData.fsConsCode}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="fsConsCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                FS Cons Code
                            </label>
                        </div>

                        {/* FS Cons Description */}
                        <div className="relative">
                            <input
                                type="text"
                                id="fsConsDesc"
                                name="fsConsDesc"
                                placeholder=" "
                                value={formData.fsConsDesc}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="fsConsDesc" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                FS Cons Description
                            </label>
                        </div>

                        {/* Old Code */}
                        <div className="relative">
                            <input
                                type="text"
                                id="oldCode"
                                name="oldCode"
                                placeholder=" "
                                value={formData.oldCode}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="oldCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Old Code
                            </label>
                        </div>

                        {/* Contra Account */}
                        <div className="relative">
                            <input
                                type="text"
                                id="contraAccount"
                                name="contraAccount"
                                placeholder=" "
                                value={formData.contraAccount}
                                onChange={handleFormChange}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="contraAccount" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Contra Account
                            </label>
                        </div>
                    </div>
                </div>

                {/* Registration Information (when editing) */}
                {isEditing && selectedAccount && (
                    <div className="mt-6 p-3 border border-gray-300 rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="font-medium">Registered By:</span> {registrationInfo.registeredBy}
                            </div>
                            <div>
                                <span className="font-medium">Registered Date:</span> {registrationInfo.registeredDate}
                            </div>
                            <div>
                                <span className="font-medium">Last Updated By:</span> {registrationInfo.lastUpdatedBy}
                            </div>
                            <div>
                                <span className="font-medium">Last Updated Date:</span> {registrationInfo.lastUpdatedDate}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Accounts List Table */}
            <div className="global-ref-table-main-div-ui mt-6">
                <div className="global-ref-table-main-sub-div-ui">
                    <div className="global-ref-table-div-ui">
                        <table className="global-ref-table-div-ui">
                            <thead className="global-ref-thead-div-ui">
                                {/* Sortable header row */}
                                <tr>
                                    {Object.entries({
                                        "Account Code": "acctCode",
                                        "Account Name": "acctName",
                                        "Account Type": "acctType",
                                        "Account Group": "acctGroup",
                                        "Balance Type": "acctBalance",
                                        "SL Required": "reqSL",
                                        "RC Required": "reqRC",
                                        "Budget Required": "reqBudget",
                                        "Classification": "acctClassification",
                                        "FS Code": "fsConsCode",
                                        "Old Code": "oldCode",
                                        "Active": "isActive"
                                    }).map(([label, key]) => (
                                        <th
                                            key={key}
                                            className={`global-ref-th-ui cursor-pointer select-none`}
                                            onClick={() => handleSort(key)}
                                            title="Click to sort"
                                        >
                                            {label} {sortConfig.key === key ? (sortConfig.direction === 'asc' ? "▲" : "▼") : ""}
                                        </th>
                                    ))}
                                    <th className="global-ref-th-ui">Edit</th>
                                    <th className="global-ref-th-ui">Delete</th>
                                </tr>

                                {/* Filter row */}
                                <tr>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.acctCode}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, acctCode: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.acctName}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, acctName: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.acctType}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, acctType: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.acctGroup}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, acctGroup: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <select
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            value={columnFilters.acctBalance}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, acctBalance: e.target.value })); setPage(1); }}
                                        >
                                            <option value="">All</option>
                                            <option value="Debit">Debit</option>
                                            <option value="Credit">Credit</option>
                                        </select>
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <select
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            value={columnFilters.reqSL}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, reqSL: e.target.value })); setPage(1); }}
                                        >
                                            <option value="">All</option>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <select
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            value={columnFilters.reqRC}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, reqRC: e.target.value })); setPage(1); }}
                                        >
                                            <option value="">All</option>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <select
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            value={columnFilters.reqBudget}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, reqBudget: e.target.value })); setPage(1); }}
                                        >
                                            <option value="">All</option>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.acctClassification}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, acctClassification: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.fsConsCode}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, fsConsCode: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.oldCode}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, oldCode: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <select
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            value={columnFilters.isActive}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, isActive: e.target.value })); setPage(1); }}
                                        >
                                            <option value="">All</option>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </th>
                                    <th className="global-ref-th-ui"></th>
                                    <th className="global-ref-th-ui"></th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="14" className="global-ref-norecords-ui">Loading accounts...</td>
                                    </tr>
                                ) : pageRows.length === 0 ? (
                                    <tr>
                                        <td colSpan="14" className="global-ref-norecords-ui">No accounts found</td>
                                    </tr>
                                ) : (
                                    pageRows.map((account, idx) => (
                                        <tr
                                            key={idx}
                                            className={`global-tran-tr-ui ${selectedAccount?.acctCode === account.acctCode ? 'bg-blue-50' : ''}`}
                                            onClick={() => handleEditAccount(account)}
                                        >
                                            <td className="global-ref-td-ui">{account.acctCode}</td>
                                            <td className="global-ref-td-ui">{account.acctName}</td>
                                            <td className="global-ref-td-ui">{account.acctType}</td>
                                            <td className="global-ref-td-ui">{account.acctGroup}</td>
                                            <td className="global-ref-td-ui">{account.acctBalance}</td>
                                            <td className="global-ref-td-ui">{account.reqSL === 'Y' ? 'Yes' : 'No'}</td>
                                            <td className="global-ref-td-ui">{account.reqRC === 'Y' ? 'Yes' : 'No'}</td>
                                            <td className="global-ref-td-ui">{account.reqBudget === 'Y' ? 'Yes' : 'No'}</td>
                                            <td className="global-ref-td-ui">{account.acctClassification}</td>
                                            <td className="global-ref-td-ui">{account.fsConsCode}</td>
                                            <td className="global-ref-td-ui">{account.oldCode}</td>
                                            <td className="global-ref-td-ui">
                                                <span className={`inline-block rounded-full px-2 py-1 text-xs font-bold ${
                                                    account.isActive === 'Y' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {account.isActive === 'Y' ? 'Yes' : 'No'}
                                                </span>
                                            </td>
                                            <td className="global-ref-td-ui text-center sticky right-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditAccount(account);
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
                                                        setSelectedAccount(account);
                                                        handleDeleteAccount();
                                                    }}
                                                    className="global-ref-td-button-delete-ui"
                                                >
                                                    <FontAwesomeIcon icon={faTrashAlt} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
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
    );
};

export default COAMast;