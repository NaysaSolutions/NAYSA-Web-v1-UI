import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faEdit, faTrashAlt, faSave, faUndo, faPrint, faChevronDown,
    faFileCsv, faFileExcel, faFilePdf, faInfoCircle, faVideo, faSpinner,
    faMagnifyingGlass
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
import { 
    reftables, 
    reftablesPDFGuide, 
    reftablesVideoGuide 
} from "@/NAYSA Cloud/Global/reftable";
import { useReset } from "../Components/ResetContext";

const ATCRef = () => {
    const { user } = useAuth();
    const docType = "ATC";
    const documentTitle = reftables[docType] || "Alphanumeric Tax Code";
    const pdfLink = reftablesPDFGuide[docType];
    const videoLink = reftablesVideoGuide[docType];
    const { setOnSave, setOnReset } = useReset();

    // Form state
    const [atcCode, setAtcCode] = useState("");
    const [atcName, setAtcName] = useState("");
    const [ewtCode, setEwtCode] = useState("");
    const [atcRate, setAtcRate] = useState("");
    const [finalTax, setFinalTax] = useState("");
    const [oldCodeATC, setOldCodeATC] = useState("");
    const [oldCodeEWT, setOldCodeEWT] = useState("");
    const [ewtAcct, setEwtAcct] = useState("");
    const [cwtAcct, setCwtAcct] = useState("");
    const [clAcct, setClAcct] = useState("");

    // ATC list state
    const [atcs, setAtcs] = useState([]);
    const [selectedAtc, setSelectedAtc] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState("active");
    
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
    const [showFilters, setShowFilters] = useState(false);

    // Table helpers
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState("atcCode");
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Per-column filters
    const [columnFilters, setColumnFilters] = useState({
        atcCode: "",
        atcName: "",
        ewtCode: "",
        atcRate: "",
        finalTax: "",
        oldCodeATC: "",
        oldCodeEWT: "",
        ewtAcct: "",
        cwtAcct: "",
        clAcct: ""
    });

    // Refs for click-away
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

    // Load ATC data from API
    const fetchAtcs = async () => {
        setLoading(true);
        try {
            const response = await apiClient.post(`/lookupATC`, {
                params: {
                    PARAMS: JSON.stringify({ search: "ActiveAll" }),
                    page: 1,
                    itemsPerPage: 1000 // Get a large number to handle pagination client-side
                }
            });

            if (response.data.success) {
                let atcData;
                // Handle different response formats
                if (response.data.data[0]?.result) {
                    // If result is a JSON string
                    atcData = JSON.parse(response.data.data[0].result);
                } else {
                    // If result is already an array
                    atcData = response.data.data;
                }

                const formattedData = atcData.map(atc => ({
                    atcCode: atc.atcCode || '',
                    atcName: atc.ATC_NAME || atc.atcName || '',
                    ewtCode: atc.ewtCode || '',
                    atcRate: (atc.ATC_RATE || atc.atcRate || '').toString(),
                    finalTax: atc.FINAL_TAX === 'Y' ? 'Yes' : 'No',
                    oldCodeATC: atc.OLD_CODE_ATC || '',
                    oldCodeEWT: atc.OLD_CODE_EWT || '',
                    ewtAcct: atc.ewtAcct || '',
                    cwtAcct: atc.cwt_Acct || '',
                    clAcct: atc.cl_Acct || '',
                    registeredBy: atc.REGISTERED_BY || '',
                    registeredDate: atc.REGISTERED_DATE ? new Date(atc.REGISTERED_DATE).toISOString().split('T')[0] : '',
                    lastUpdatedBy: atc.UPDATED_BY || '',
                    lastUpdatedDate: atc.UPDATED_DATE ? new Date(atc.UPDATED_DATE).toISOString().split('T')[0] : '',
                }));

                setAtcs(formattedData);
            } else {
                throw new Error(response.data.message || 'Failed to load ATC data');
            }
        } catch (error) {
            console.error("Error fetching ATCs:", error);
            await useSwalErrorAlert("Error", "Failed to load ATC data");
        } finally {
            setLoading(false);
        }
    };

    // Get specific ATC by code
    const getAtc = async (atcCode) => {
        setLoading(true);
        try {
            const response = await apiClient.post(`/lookupATC`, {
                params: {
                    PARAMS: JSON.stringify({
                        search: "Single",
                        ATC_CODE: atcCode
                    })
                }
            });

            if (response.data.success) {
                // Parse the result from JSON string if needed
                const atcData = Array.isArray(response.data.data)
                    ? response.data.data[0]
                    : (response.data.data[0]?.result ? JSON.parse(response.data.data[0].result)[0] : null);

                if (atcData) {
                    // Update registration info
                    setRegistrationInfo({
                        registeredBy: atcData.REGISTERED_BY || '',
                        registeredDate: atcData.REGISTERED_DATE ? new Date(atcData.REGISTERED_DATE).toISOString().split('T')[0] : '',
                        lastUpdatedBy: atcData.UPDATED_BY || '',
                        lastUpdatedDate: atcData.UPDATED_DATE ? new Date(atcData.UPDATED_DATE).toISOString().split('T')[0] : ''
                    });

                    return {
                        atcCode: atcData.atcCode || '',
                        atcName: atcData.atcName || '',
                        ewtCode: atcData.ewtCode || '',
                        atcRate: atcData.atcRate?.toString() || '',
                        finalTax: atcData.finalTax === 'Y' ? 'Yes' : 'No',
                        oldCodeATC: atcData.oldCodeATC || '',
                        oldCodeEWT: atcData.oldCodeEWT || '',
                        ewtAcct: atcData.ewtAcct || '',
                        cwtAcct: atcData.cwtAcct || '',
                        clAcct: atcData.clAcct || '',
                    };
                } else {
                    throw new Error('ATC not found');
                }
            } else {
                throw new Error(response.data.message || 'ATC not found');
            }
        } catch (error) {
            console.error("Error fetching ATC details:", error);
            await useSwalErrorAlert("Error", "Failed to get ATC details");
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
                if (!saving && isEditing) handleSaveAtc();
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
        fetchAtcs();
    }, []);

    // Helper function for case-insensitive string includes
    const includesCI = (str, searchValue) => {
        return String(str || "").toLowerCase().includes(String(searchValue).toLowerCase());
    };

    // Filter ATCs
    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();

        // Global search (optional)
        const base = q
            ? atcs.filter((a) =>
                [a.atcCode, a.atcName, a.ewtCode, a.atcRate].some((x) =>
                    String(x || "")
                        .toLowerCase()
                        .includes(q)
                )
            )
            : atcs;

        // Per-column filters (all must match)
        const withColFilters = base.filter((a) => {
            const f = columnFilters;
            if (f.atcCode && !includesCI(a.atcCode, f.atcCode)) return false;
            if (f.atcName && !includesCI(a.atcName, f.atcName)) return false;
            if (f.ewtCode && !includesCI(a.ewtCode, f.ewtCode)) return false;
            if (f.atcRate && !includesCI(a.atcRate, f.atcRate)) return false;
            if (f.finalTax && !includesCI(a.finalTax, f.finalTax)) return false;
            if (f.oldCodeATC && !includesCI(a.oldCodeATC, f.oldCodeATC)) return false;
            if (f.oldCodeEWT && !includesCI(a.oldCodeEWT, f.oldCodeEWT)) return false;
            if (f.ewtAcct && !includesCI(a.ewtAcct, f.ewtAcct)) return false;
            if (f.cwtAcct && !includesCI(a.cwtAcct, f.cwtAcct)) return false;
            if (f.clAcct && !includesCI(a.clAcct, f.clAcct)) return false;
            return true;
        });

        // Sort
        const factor = sortDir === "asc" ? 1 : -1;
        return [...withColFilters].sort((a, b) => {
            const A = String(a?.[sortBy] ?? "");
            const B = String(b?.[sortBy] ?? "");
            return A.localeCompare(B) * factor;
        });
    }, [atcs, query, columnFilters, sortBy, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const pageRows = React.useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const resetForm = () => {
        setAtcCode("");
        setAtcName("");
        setEwtCode("");
        setAtcRate("");
        setFinalTax("");
        setOldCodeATC("");
        setOldCodeEWT("");
        setEwtAcct("");
        setCwtAcct("");
        setClAcct("");
        setSelectedAtc(null);
        setIsEditing(false);
    };

    const handleSaveAtc = async () => {
        setSaving(true);
        if (!atcCode || !atcName || !atcRate) {
            await useSwalErrorAlert("Error!", "Please fill out ATC Code, Description and Tax Rate.");
            setSaving(false);
            return;
        }

        // Validate tax rate is a number
        if (isNaN(parseFloat(atcRate))) {
            await useSwalErrorAlert("Error!", "Tax rate must be a valid number.");
            setSaving(false);
            return;
        }

        try {
            // Prepare data for API
            const payload = {
                entity: "ATC",
                data: {
                    ATC_CODE: atcCode,
                    ATC_NAME: atcName,
                    EWT_CODE: ewtCode || "",
                    ATC_RATE: parseFloat(atcRate),
                    FINAL_TAX: finalTax === "Yes" ? "Y" : "N",
                    OLD_CODE_ATC: oldCodeATC || "",
                    OLD_CODE_EWT: oldCodeEWT || "",
                    EWT_ACCT: ewtAcct || "",
                    CWT_ACCT: cwtAcct || "",
                    CL_ACCT: clAcct || "",
                    USERID: user?.USER_CODE || 'ADMIN',
                    isDelete: "N"
                }
            };

            const { data: res } = await apiClient.get("/upsert", { params: payload });

            if (res.status === "success") {
                useSwalshowSaveSuccessDialog(
                    resetForm,
                    () => { }
                );
                await fetchAtcs();
            } else {
                await useSwalErrorAlert("Error!", res.message || "Something went wrong.");
            }
        } catch (e) {
            console.error(e);
            await useSwalErrorAlert("Error!", e?.response?.data?.message || "Error saving ATC.");
        } finally {
            setSaving(false);
        }
    };

    // Delete ATC
    const handleDeleteAtc = async () => {
        if (!selectedAtc?.atcCode) {
            await useSwalErrorAlert("Error", "Please select an ATC to delete.");
            return;
        }

        const confirm = await useSwalDeleteConfirm(
            "Delete this ATC?",
            `Code: ${selectedAtc.atcCode} | Name: ${selectedAtc.atcName || ""}`,
            "Yes, delete it"
        );

        if (!confirm.isConfirmed) return;

        try {
            const payload = {
                entity: "ATC",
                data: {
                    ATC_CODE: selectedAtc.atcCode,
                    isDelete: "Y",
                    deletedBy: user.USER_CODE
                }
            };

            const { data: response } = await apiClient.get("/upsert", { params: payload });

            if (response.status === "success") {
                await useSwalDeleteSuccess();
                await fetchAtcs();
                resetForm();
            } else {
                await useSwalErrorAlert("Error", response.message || "Failed to delete ATC.");
            }
        } catch (error) {
            console.error("Delete error:", error);
            await useSwalErrorAlert("Error", "Failed to delete ATC.");
        }
    };

    // Start editing an ATC
    const handleEditAtc = async (atc) => {
        // Fetch full ATC details
        const fullDetails = await getAtc(atc.atcCode);
        if (fullDetails) {
            setAtcCode(fullDetails.atcCode);
            setAtcName(fullDetails.atcName);
            setEwtCode(fullDetails.ewtCode || "");
            setAtcRate(fullDetails.atcRate || "");
            setFinalTax(fullDetails.finalTax || "");
            setOldCodeATC(fullDetails.oldCodeATC || "");
            setOldCodeEWT(fullDetails.oldCodeEWT || "");
            setEwtAcct(fullDetails.ewtAcct || "");
            setCwtAcct(fullDetails.cwtAcct || "");
            setClAcct(fullDetails.clAcct || "");
            setSelectedAtc(fullDetails);
            setIsEditing(true);
        }
    };

    // Start new ATC
    const startNew = () => {
        resetForm();
        setIsEditing(true);
    };

    const handleExport = (format) => {
        setOpenExport(false);

        try {
            const payload = {
                entity: "exportATC",
                format: format,
                filter: {
                    query: query,
                    columnFilters: columnFilters
                }
            };

            apiClient.get("/load", { params: payload, responseType: 'blob' })
                .then(response => {
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    const fileName = `atc_export_${format}_${new Date().toISOString().slice(0, 10)}.${format}`;
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
                        onClick={handleSaveAtc}
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
                                    onClick={handlePDFGuide}
                                    className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                                >
                                    <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> User Guide
                                </button>
                                <button
                                    onClick={handleVideoGuide}
                                    className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                                >
                                    <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" /> Video Guide
                                </button>
                            </div>
                        )}
                    </div>

                    {selectedAtc && (
                        <button
                            onClick={handleDeleteAtc}
                            disabled={!selectedAtc}
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
                        {/* ATC Code */}
                        <div className="relative">
                            <input
                                type="text"
                                id="atcCode"
                                placeholder=" "
                                value={atcCode}
                                onChange={(e) => setAtcCode(e.target.value.toUpperCase())}
                                disabled={isEditing && selectedAtc}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} ${isEditing && selectedAtc ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                                maxLength={10}
                            />
                            <label htmlFor="atcCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> ATC Code
                            </label>
                        </div>

                        {/* Description */}
                        <div className="relative">
                            <input
                                type="text"
                                id="atcName"
                                placeholder=" "
                                value={atcName}
                                onChange={(e) => setAtcName(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                                maxLength={100}
                            />
                            <label htmlFor="atcName" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> Description
                            </label>
                        </div>

                        {/* Tax Rate */}
                        <div className="relative">
                            <input
                                type="text"
                                id="atcRate"
                                placeholder=" "
                                value={atcRate}
                                onChange={(e) => {
                                    // Allow only numbers and decimals
                                    const re = /^[0-9]*\.?[0-9]*$/;
                                    if (e.target.value === '' || re.test(e.target.value)) {
                                        setAtcRate(e.target.value);
                                    }
                                }}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="atcRate" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> Tax Rate (%)
                            </label>
                        </div>

                        {/* Final Tax */}
                        <div className="relative">
                            <select
                                id="finalTax"
                                value={finalTax}
                                onChange={(e) => setFinalTax(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            >
                                <option value="">Select...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                            </select>
                            <label htmlFor="finalTax" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                <span className="global-ref-asterisk-ui">*</span> Final Tax?
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
                        {/* EWT Code */}
                        <div className="relative">
                            <input
                                type="text"
                                id="ewtCode"
                                placeholder=" "
                                value={ewtCode}
                                onChange={(e) => setEwtCode(e.target.value.toUpperCase())}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                                maxLength={10}
                            />
                            <label htmlFor="ewtCode" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                EWT Code
                            </label>
                        </div>

                        {/* Old Code ATC */}
                        <div className="relative">
                            <input
                                type="text"
                                id="oldCodeATC"
                                placeholder=" "
                                value={oldCodeATC}
                                onChange={(e) => setOldCodeATC(e.target.value.toUpperCase())}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                                maxLength={10}
                            />
                            <label htmlFor="oldCodeATC" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Old Code (ATC)
                            </label>
                        </div>

                        {/* Old Code EWT */}
                        <div className="relative">
                            <input
                                type="text"
                                id="oldCodeEWT"
                                placeholder=" "
                                value={oldCodeEWT}
                                onChange={(e) => setOldCodeEWT(e.target.value.toUpperCase())}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                                maxLength={10}
                            />
                            <label htmlFor="oldCodeEWT" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Old Code (EWT)
                            </label>
                        </div>
                    </div>

                    {/* Column 3 */}
                    <div className="global-ref-textbox-group-div-ui">
                        {/* EWT Account */}
                        <div className="relative">
                            <input
                                type="text"
                                id="ewtAcct"
                                placeholder=" "
                                value={ewtAcct}
                                onChange={(e) => setEwtAcct(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="ewtAcct" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                EWT Account
                            </label>
                        </div>

                        {/* CWT Account */}
                        <div className="relative">
                            <input
                                type="text"
                                id="cwtAcct"
                                placeholder=" "
                                value={cwtAcct}
                                onChange={(e) => setCwtAcct(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="cwtAcct" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                CWT Account
                            </label>
                        </div>

                        {/* Clearing Account */}
                        <div className="relative">
                            <input
                                type="text"
                                id="clAcct"
                                placeholder=" "
                                value={clAcct}
                                onChange={(e) => setClAcct(e.target.value)}
                                disabled={!isEditing}
                                className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                            />
                            <label htmlFor="clAcct" className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}>
                                Clearing Account
                            </label>
                        </div>
                    </div>
                </div>

                {/* Registration Information (when editing) */}
                {isEditing && selectedAtc && (
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

            {/* ATC List Table */}
            <div className="global-ref-table-main-div-ui mt-6">
                <div className="global-ref-table-main-sub-div-ui">
                    <div className="global-ref-table-div-ui">
                        <table className="global-ref-table-div-ui">
                            <thead className="global-ref-thead-div-ui">
                                {/* Sortable header row */}
                                <tr>
                                    {Object.entries({
                                        "ATC Code": "atcCode",
                                        "Description": "atcName",
                                        "EWT Code": "ewtCode",
                                        "Tax Rate": "atcRate",
                                        "Final Tax": "finalTax",
                                        "Old Code (ATC)": "oldCodeATC",
                                        "Old Code (EWT)": "oldCodeEWT",
                                        "EWT Account": "ewtAcct",
                                        "CWT Account": "cwtAcct",
                                        "Clearing Account": "clAcct"
                                    }).map(([label, key]) => (
                                        <th
                                            key={key}
                                            className={`global-ref-th-ui cursor-pointer select-none`}
                                            onClick={() => {
                                                setSortBy(key);
                                                setSortDir((prev) => (sortBy === key && prev === "asc" ? "desc" : "asc"));
                                            }}
                                            title="Click to sort"
                                        >
                                            {label} {sortBy === key ? (sortDir === "asc" ? "▲" : "▼") : ""}
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
                                            value={columnFilters.atcCode}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, atcCode: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.atcName}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, atcName: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.ewtCode}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, ewtCode: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.atcRate}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, atcRate: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <select
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            value={columnFilters.finalTax}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, finalTax: e.target.value })); setPage(1); }}
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
                                            value={columnFilters.oldCodeATC}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, oldCodeATC: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.oldCodeEWT}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, oldCodeEWT: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.ewtAcct}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, ewtAcct: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.cwtAcct}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, cwtAcct: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui">
                                        <input
                                            className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                            placeholder="Filter…"
                                            value={columnFilters.clAcct}
                                            onChange={(e) => { setColumnFilters(s => ({ ...s, clAcct: e.target.value })); setPage(1); }}
                                        />
                                    </th>
                                    <th className="global-ref-th-ui"></th>
                                    <th className="global-ref-th-ui"></th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="12" className="global-ref-norecords-ui">Loading ATCs...</td>
                                    </tr>
                                ) : pageRows.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="global-ref-norecords-ui">No ATCs found</td>
                                    </tr>
                                ) : (
                                    pageRows.map((atc, idx) => (
                                        <tr
                                            key={idx}
                                            className={`global-tran-tr-ui ${selectedAtc?.atcCode === atc.atcCode ? 'bg-blue-50' : ''}`}
                                            onClick={() => handleEditAtc(atc)}
                                        >
                                            <td className="global-ref-td-ui">{atc.atcCode}</td>
                                            <td className="global-ref-td-ui">{atc.atcName}</td>
                                            <td className="global-ref-td-ui">{atc.ewtCode}</td>
                                            <td className="global-ref-td-ui text-right">{parseFloat(atc.atcRate || 0).toFixed(2)}%</td>
                                            <td className="global-ref-td-ui">{atc.finalTax}</td>
                                            <td className="global-ref-td-ui">{atc.oldCodeATC}</td>
                                            <td className="global-ref-td-ui">{atc.oldCodeEWT}</td>
                                            <td className="global-ref-td-ui">{atc.ewtAcct}</td>
                                            <td className="global-ref-td-ui">{atc.cwtAcct}</td>
                                            <td className="global-ref-td-ui">{atc.clAcct}</td>
                                            <td className="global-ref-td-ui text-center sticky right-10">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditAtc(atc);
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
                                                        setSelectedAtc(atc);
                                                        handleDeleteAtc();
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

export default ATCRef;