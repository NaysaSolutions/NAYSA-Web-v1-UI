// src/NAYSA Cloud/Reference File/CustMast.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFolderOpen,
    faPaperclip,
    faList,
    faTags,
    faPlus,
    faSave,
    faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import AttachFileModal from "@/NAYSA Cloud/Lookup/AttachFileModal.jsx";
// ✅ FIXED PATHS (as you requested: MasterData/CustMastTabs under Reference File)
import PayeeSetupTab from "@/NAYSA Cloud/Master Data/CustMastTabs/PayeeSetupTab";
import PayeeMasterDataTab from "@/NAYSA Cloud/Master Data/CustMastTabs/PayeeMasterDataTab";
import ReferenceCodesTab from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodesTab";

const emptyForm = {
    sltypeCode: "CU",
    custCode: "",
    taxClass: "",
    custName: "",
    businessName: "",
    firstName: "",
    middleName: "",
    lastName: "",
    oldCode: "",
    branchCode: "",
    active: "Y",

    custContact: "",
    custPosition: "",
    custTelno: "",
    custMobileno: "",
    custEmail: "",
    custAddr1: "",
    custAddr2: "",
    custAddr3: "",
    custZip: "",

    custTin: "",
    atcCode: "",
    vatCode: "",
    paytermCode: "",
    source: "L",
    currCode: "PHP",
};

const CustMast = () => {
    const [activeTab, setActiveTab] = useState("setup");
    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState({ ...emptyForm });
    const [selectedCustCode, setSelectedCustCode] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const documentNo = useMemo(() => {
        if (!form) return "";
        const code = form.custCode || form.vendCode || "";
        return `${form.sltypeCode}${code}`;
    }, [form]);
    // Attachments state
    const [attachmentRows, setAttachmentRows] = useState([]);
    const handleOpenAttach = () => {
        if (!form?.custCode || !form.custCode.trim()) {
            Swal.fire({
                icon: "warning",
                title: "Required",
                text: "Customer Code is required.",
            });
            return;
        }

        setIsAttachOpen(true);
    };


    // MASTER DATA GRID STATES
    const [subsidiaryType, setSubsidiaryType] = useState(""); // ✅ ALL
    const [masterFilters, setMasterFilters] = useState({});
    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows] = useState([]);

    // Lookup modal
    const [isCustLookupOpen, setIsCustLookupOpen] = useState(false);
    const [custLookupParam, setCustLookupParam] = useState("ActiveAll");

    const updateForm = (patch) => setForm((p) => ({ ...p, ...patch }));

    const parseSprocJsonResult = (rows) => {
        if (!rows || !rows.length) return null;
        const r = rows[0]?.result;
        if (!r) return null;
        try {
            return JSON.parse(r);
        } catch {
            return null;
        }
    };

    const loadMasterList = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get("/customer"); // mode Load
            const parsed = parseSprocJsonResult(res?.data?.data);
            const list = Array.isArray(parsed) ? parsed : [];

            // normalize address column for your grid
            const normalized = list.map((x) => ({
                ...x,
                address:
                    x.address ??
                    [x.custAddr1, x.custAddr2, x.custAddr3].filter(Boolean).join(" ") ??
                    x.addr ??
                    "",
            }));

            setMasterAllRows(normalized);
            setMasterRows(normalized);
        } catch (e) {
            console.error(e);
            Swal.fire("Error", "Failed to load payee list.", "error");
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCustomerByCode = async (custCode) => {
        if (!custCode) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/getCustomer", { CUST_CODE: custCode });
            const parsed = parseSprocJsonResult(res?.data?.data);
            const row = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                Swal.fire("Info", "Payee not found.", "info");
                return;
            }

            updateForm({
                custCode,
                custName: row.custName ?? "",
                businessName: row.businessName ?? "",
                firstName: row.firstName ?? "",
                middleName: row.middleName ?? "",
                lastName: row.lastName ?? "",
                taxClass: row.taxClass ?? "",
                custAddr1: row.custAddr1 ?? "",
                custAddr2: row.custAddr2 ?? "",
                custAddr3: row.custAddr3 ?? "",
                custZip: row.custZip ?? "",
                branchCode: row.branchCode ?? "",
                custContact: row.custContact ?? "",
                custPosition: row.custPosition ?? "",
                custTelno: row.custTelno ?? "",
                custMobileno: row.custMobileno ?? "",
                custEmail: row.custEmail ?? "",
                source: row.source ?? "L",
                currCode: row.currCode ?? "PHP",
                vatCode: row.vatCode ?? "",
                atcCode: row.atcCode ?? "",
                paytermCode: row.billtermCode ?? row.paytermCode ?? "",
                sltypeCode: (row.sltypeCode ?? form.sltypeCode ?? "CU"),
                active: row.active ?? "Y",
                oldCode: row.oldcode ?? "",
                custTin: row.custTin ?? "",

                // extra fields if returned
                checkName: row.checkName ?? "",
                custFaxNo: row.custFaxNo ?? "",
                payeeType: row.payeeType ?? "",
                apAccount: row.apAccount ?? "",
                registeredBy: row.registeredBy ?? "",
                registeredDate: row.registeredDate ?? "",
                updatedBy: row.updatedBy ?? "",
                updatedDate: row.updatedDate ?? "",
            });

            setSelectedCustCode(custCode);
        } catch (e) {
            console.error(e);
            Swal.fire("Error", "Failed to fetch payee.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const upsertCustomer = async () => {
        if (!form.custCode?.trim()) {
            return Swal.fire("Required", "Payee Code is required.", "warning");
        }
        if (!form.custName?.trim()) {
            return Swal.fire("Required", "Registered Name is required.", "warning");
        }

        setIsLoading(true);
        try {
            const payload = {
                json_data: {
                    custCode: form.custCode,
                    custName: form.custName,
                    businessName: form.businessName,
                    firstName: form.firstName,
                    middleName: form.middleName,
                    lastName: form.lastName,
                    taxClass: form.taxClass,
                    custAddr1: form.custAddr1,
                    custAddr2: form.custAddr2,
                    custAddr3: form.custAddr3,
                    custZip: form.custZip,
                    custTin: form.custTin,
                    branchCode: form.branchCode,
                    custContact: form.custContact,
                    custPosition: form.custPosition,
                    custTelno: form.custTelno,
                    custMobileno: form.custMobileno,
                    custEmail: form.custEmail,
                    custSince: form.custSince,
                    source: form.source,
                    currCode: form.currCode,
                    vatCode: form.vatCode,
                    atcCode: form.atcCode,
                    paytermCode: form.paytermCode,
                    billtermCode: form.paytermCode,
                    sltypeCode: form.sltypeCode,
                    active: form.active,
                    oldCode: form.oldCode,
                    userCode: "", // optional
                },
            };

            await apiClient.post("/upsertCustomer", {
                json_data: JSON.stringify(payload),
            });

            Swal.fire("Saved", "Payee saved successfully.", "success");
            setSelectedCustCode(form.custCode);
            setIsEditing(false); // 🔒 LOCK AFTER SAVE
            await loadMasterList();
        } catch (e) {
            console.error(e);
            Swal.fire("Error", "Failed to save payee.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const applyMasterFilters = () => {
        const selectedType = String(subsidiaryType || "").toUpperCase().trim();

        const filtered = masterAllRows.filter((row) => {
            const rowType = String(row?.sltypeCode || "").toUpperCase().trim();

            // ✅ HARD FILTER BY SL TYPE
            if (selectedType !== "" && rowType !== selectedType) {
                return false; // ❌ DO NOT RETRIEVE
            }

            // ✅ Apply column filters only AFTER SLTYPE matches
            for (const [key, val] of Object.entries(masterFilters || {})) {
                const q = String(val || "").trim().toLowerCase();
                if (!q) continue;

                const cell = String(row?.[key] || "").toLowerCase();
                if (!cell.includes(q)) return false;
            }

            return true;
        });

        setMasterRows(filtered);
    };


    const resetMasterFilters = () => {
        setSubsidiaryType(""); // ✅ ALL
        setMasterFilters({});
        setMasterRows(masterAllRows);
    };


    const handleChangeMasterFilter = (key, value) => {
        setMasterFilters((p) => ({ ...p, [key]: value }));
    };

    const handleAdd = () => {
        setSelectedCustCode("");
        setForm({ ...emptyForm });
        setIsEditing(true); // ✅ EDIT MODE
        setActiveTab("setup");
    };

    const handleResetSetup = () => {
        setSelectedCustCode("");
        setForm({ ...emptyForm });
        setIsEditing(false); // 🔒 VIEW MODE
    };

    const handleOpenCustLookup = () => {
        setCustLookupParam("ActiveAll");
        setIsCustLookupOpen(true);
    };

    const handleCustLookupClose = async (selected) => {
        setIsCustLookupOpen(false);
        if (!selected) return;

        const code = selected?.custCode || "";
        if (!code) return;

        updateForm({ custCode: code });
        await fetchCustomerByCode(code);
    };

    useEffect(() => {
        loadMasterList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const tabs = useMemo(
        () => [
            { id: "setup", label: "Customer Set-Up", icon: faFolderOpen },
            { id: "master", label: "Customer Master Data", icon: faList },
            { id: "ref", label: "Reference Codes", icon: faTags },
        ],
        []
    );

    const handleMasterRowDoubleClick = async ({ code }) => {
        if (!code) return;
        setActiveTab("setup");
        setIsEditing(false);
        await fetchCustomerByCode(code); // POST /getCustMast (your customer fetch)
    };


    const headerButtons = useMemo(() => {
        if (activeTab !== "setup") return [];

        return [
            {
                key: "add",
                label: "Add",
                icon: faPlus,
                onClick: handleAdd,
                disabled: isLoading,
            },
            {
                key: "save",
                label: "Save",
                icon: faSave,
                onClick: upsertCustomer,
                disabled: isLoading,
            },
            {
                key: "reset",
                label: "Reset",
                icon: faUndo,
                onClick: handleResetSetup,
                disabled: isLoading,
            },
            {
                key: "attach",
                label: "Attach File",
                icon: faPaperclip,
                onClick: handleOpenAttach,
            },

        ];
    }, [activeTab, isLoading]);

    return (
        <div className="global-ref-main-div-ui mt-24">
            {/* Header + Tabs (AccessRights-like) */}
            <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <h1 className="global-ref-headertext-ui">Customer Master Data</h1>
                </div>

                <div className="flex overflow-x-auto scrollbar-hide">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200 mr-1
                ${activeTab === t.id
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
                                }`}
                        >
                            <FontAwesomeIcon icon={t.icon} className="w-4 h-4 mr-2" />
                            <span className="whitespace-nowrap">{t.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 justify-center text-xs">
                    {!!headerButtons.length && <ButtonBar buttons={headerButtons} />}
                </div>
            </div>

            {/* TAB CONTENT */}
            <div
                className="global-tran-tab-div-ui mt-5"
                style={{ minHeight: "calc(100vh - 170px)" }}
            >


                {activeTab === "setup" && (
                    <PayeeSetupTab
                        isLoading={isLoading}
                        isEditing={isEditing}
                        form={form}
                        sltypeOptions={[
                            { value: "", label: "ALL" },
                            { value: "AG", label: "AGENCY" },
                            { value: "CU", label: "CUSTOMER" },
                            { value: "EM", label: "EMPLOYEE" },
                            { value: "OT", label: "OTHERS" },
                            { value: "SU", label: "SUPPLIER" },
                            { value: "TN", label: "TENANT" },
                        ]}

                        sourceOptions={[
                            { value: "L", label: "Local" },
                            { value: "F", label: "Foreign" },
                        ]}
                        activeOptions={[
                            { value: "Y", label: "Yes" },
                            { value: "N", label: "No" },
                        ]}
                        onChangeForm={updateForm}
                        onSelectCustomerCode={fetchCustomerByCode}   // ✅ ADD THIS
                    />

                )}

                {activeTab === "master" && (
                    <PayeeMasterDataTab
                        isLoading={isLoading}
                        subsidiaryType={subsidiaryType}
                        onChangeSubsidiaryType={setSubsidiaryType}
                        filters={masterFilters}
                        onChangeFilter={handleChangeMasterFilter}
                        rows={masterRows}
                        onFilter={applyMasterFilters}
                        onReset={resetMasterFilters}
                        onPrint={() => Swal.fire("Info", "Print not yet wired.", "info")}
                        onExport={() => Swal.fire("Info", "Export not yet wired.", "info")}
                        onRowDoubleClick={handleMasterRowDoubleClick}
                    />
                )}

                {activeTab === "ref" && <ReferenceCodesTab variant="customer" />}

            </div>

            <CustomerMastLookupModal
                isOpen={isCustLookupOpen}
                customParam={custLookupParam}
                onClose={handleCustLookupClose}
            />

            <AttachFileModal
                isOpen={isAttachOpen}
                onClose={() => setIsAttachOpen(false)}
                transaction="Customer Master Data"
                branch={form.branchCode || "HO"}
                documentNo={documentNo}
                rows={attachmentRows} // later from API
            />

        </div>
    );
};

export default CustMast;
