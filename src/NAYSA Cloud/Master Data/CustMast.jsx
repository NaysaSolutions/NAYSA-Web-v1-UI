// src/NAYSA Cloud/Reference File/CustMast.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
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
    faPenToSquare,
    faTrash,
    faInfoCircle,
    faChevronDown,
    faFilePdf,
    faVideo
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import SearchAttachment from "@/NAYSA Cloud/Lookup/SearchAttachment.jsx";
import SearchCusMast from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";

import { reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";

import {
    useSwalErrorAlert,
    useSwalValidationAlert,
    useSwalSuccessAlert,
    useSwalErrorAlertAPI,
    useSwalDeleteConfirm,
    useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import CustSetupTab from "./CustSetupTab";
import CustMasterDataTab from "@/NAYSA Cloud/Master Data/CustMasterDataTab.jsx";
import ReferenceCodesTab from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodesTab";

const normalizeSlType = (v) => {
    const s = String(v ?? "").toUpperCase().trim();
    if (!s) return "";
    if (["CU", "AG", "OT"].includes(s)) return s;
    if (s === "CUSTOMER") return "CU";
    if (s === "AGENCY") return "AG";
    if (s === "OTHERS") return "OT";
    return s;
};

const sltypeOptions = [
    { value: "CU", label: "CUSTOMER" },
    { value: "AG", label: "AGENCY" },
    { value: "OT", label: "OTHERS" },
];

const activeOptions = [
    { value: "Y", label: "Yes" },
    { value: "N", label: "No" },
];

const sourceOptions = [
    { value: "L", label: "Local" },
    { value: "F", label: "Foreign" },
];

const mappedTaxClassOptions = [
    { value: "WC", label: "Corporate" },
    { value: "WI", label: "Individual" },
];

const payeeTypeOptions = [];

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
    billtermCode: "",
    source: "L",
    currCode: "PHP",
    registeredBy: "",
    registeredDate: "",
    updatedBy: "",
    updatedDate: "",
    creditInvestigator: "",
    creditLimit: "0",
    totalAR: "",
    creditBalance: "0",
    customerRemarks: "",
    customizedDrForm: "",
    customizedSiForm: "",
    customizedDrcForm: "",
    customizedBsForm: "",
    customizedSviForm: "",
    taxSignatoryName: "",
    taxSignatoryTin: "",
    taxSignatoryPosition: "",
    taxSignatoryEmail: "",
    taxSignatoryZip: "",
    shipmentCode1: "",
    shipmentCode2: "",
    shipmentCode3: "",
    shipmentCode4: "",
    destination2: "",
    __isNew: false,
};

const CustMast = () => {
    const [activeTab, setActiveTab] = useState("setup");
    const [isLoading, setIsLoading] = useState(false);

    const docType = "CustMast";
    const guideRef = useRef(null);
    const pdfLink = reftablesPDFGuide?.[docType] || "#";
    const videoLink = reftablesVideoGuide?.[docType] || "#";
    const [isOpenGuide, setOpenGuide] = useState(false);


    useEffect(() => {
        const handleClick = (e) => {
            if (guideRef.current && !guideRef.current.contains(e.target)) {
                setOpenGuide(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => {
            document.removeEventListener("mousedown", handleClick);
        };
    }, []);

    const { user } = useAuth();
    const userCode = user?.userCode || user?.USER_CODE || user?.code || "";

    const [form, setForm] = useState({ ...emptyForm });
    const [selectedCustCode, setSelectedCustCode] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const [subsidiaryType, setSubsidiaryType] = useState("");
    const [masterFilters, setMasterFilters] = useState({});
    const [masterAllRows, setMasterAllRows] = useState([]);
    const [masterRows, setMasterRows] = useState([]);

    const updateForm = (patch) => {
        setForm((prev) => ({ ...prev, ...patch }));
    };

    const showValidation = async (title, lines) => {
        const msg = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
        return useSwalValidationAlert({ icon: "error", title, message: msg });
    };

    const checkDuplicateCustomer = async (custCode) => {
        const payload = {
            json_data: JSON.stringify({
                json_data: { custCode: String(custCode || "").trim() },
            }),
        };
        const res = await apiClient.post("/checkDuplicateCustomer", payload);
        const rows = res?.data?.data || [];
        return Number(rows?.[0]?.result ?? 0) === 1;
    };

    const checkInUsedCustomer = async (custCode) => {
        const payload = {
            json_data: JSON.stringify({
                json_data: { custCode: String(custCode || "").trim() },
            }),
        };
        const res = await apiClient.post("/checkInUsedCustomer", payload);
        const rows = res?.data?.data || [];
        return Number(rows?.[0]?.result ?? 0) === 1;
    };

    const extractSprocValidation = (axiosResponse) => {
        const payload = axiosResponse?.data ?? axiosResponse;
        const data = payload?.data;

        if (
            Array.isArray(data) &&
            data[0] &&
            (data[0].errorCount !== undefined ||
                data[0].errorMsg !== undefined ||
                data[0].errorcount !== undefined ||
                data[0].errormsg !== undefined)
        ) {
            return {
                errorCount: Number(data[0].errorCount ?? data[0].errorcount ?? 0),
                errorMsg: String(data[0].errorMsg ?? data[0].errormsg ?? ""),
                generatedCode: String(data[0].generatedCode ?? data[0].generatedcode ?? "")
            };
        }

        if (Array.isArray(data) && data[0]?.result) {
            try {
                const parsed = JSON.parse(data[0].result);
                const row = Array.isArray(parsed) ? parsed[0] : parsed;
                if (
                    row &&
                    (row.errorCount !== undefined ||
                        row.errorMsg !== undefined ||
                        row.errorcount !== undefined ||
                        row.errormsg !== undefined)
                ) {
                    return {
                        errorCount: Number(row.errorCount ?? row.errorcount ?? 0),
                        errorMsg: String(row.errorMsg ?? row.errormsg ?? ""),
                        generatedCode: String(row.generatedCode ?? row.generatedcode ?? "")
                    };
                }
            } catch { }
        }

        const fallbackMsg = payload?.message || payload?.error || payload?.msg;
        if (fallbackMsg) return { errorCount: 1, errorMsg: String(fallbackMsg) };

        return null;
    };

    const documentNo = useMemo(() => {
        return String(form?.custCode || "").trim();
    }, [form]);

    const parseSprocJsonResult = (rows) => {
        if (!rows) return [];
        const r = rows?.[0]?.result;
        if (typeof r === "string") {
            try {
                return JSON.parse(r);
            } catch {
                return [];
            }
        }
        if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") {
            return rows;
        }
        return [];
    };

    const handleTaxClassChange = (v) => updateForm({ taxClass: v });
    const handleBusinessNameChange = (v) => updateForm({ businessName: v });
    const handleCheckNameChange = () => { };

    const applyAutoNames = (updates = {}, baseName = "") => {
        const reg = String(baseName || "").trim();
        const currentBusiness = form?.businessName ?? "";
        const currentCheck = form?.checkName ?? "";

        if (!String(currentBusiness).trim()) updates.businessName = reg;
        if (!String(currentCheck).trim()) updates.checkName = reg;

        return updates;
    };

    const loadMasterList = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get("/customer");
            const parsed = parseSprocJsonResult(res?.data?.data);
            const list = Array.isArray(parsed) ? parsed : [];

            const normalized = list.map((x) => ({
                ...x,
                sltypeCode: normalizeSlType(x?.sltypeCode ?? "CU"),
                custCode: x?.custCode ?? "",
                custName: x?.custName ?? "",
                address:
                    x?.address ??
                    [x?.custAddr1, x?.custAddr2, x?.custAddr3].filter(Boolean).join(" "),
            }));

            setMasterAllRows(normalized);
            setMasterRows(normalized);
        } catch (e) {
            console.error(e);
            await useSwalErrorAlert("Error", "Failed to load customer list.");
            setMasterAllRows([]);
            setMasterRows([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadMasterList();
    }, []);

    const handleOpenAttach = async () => {
        const code = String(form?.custCode || "").trim();
        if (!code) {
            await useSwalValidationAlert({
                icon: "warning",
                title: "Required",
                message: "Customer Code is required.",
            });
            return;
        }
        setIsAttachOpen(true);
    };

    const fetchCustomerByCode = async (custCode) => {
        const code = String(custCode || "").trim();
        if (!code) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/getCustomer", { CUST_CODE: code });
            const parsed = parseSprocJsonResult(res?.data?.data);
            const row = Array.isArray(parsed) ? parsed?.[0] : null;

            if (!row) {
                await useSwalErrorAlert("Info", "Customer not found.");
                return;
            }

            const sl = normalizeSlType(row?.sltypeCode ?? "CU");

            updateForm({
                ...emptyForm,
                __isNew: false,
                sltypeCode: sl,
                custCode: code,
                custName: row?.custName ?? "",
                businessName: row?.businessName ?? "",
                firstName: row?.firstName ?? "",
                middleName: row?.middleName ?? "",
                lastName: row?.lastName ?? "",
                taxClass: row?.taxClass ?? "",
                custAddr1: row?.custAddr1 ?? "",
                custAddr2: row?.custAddr2 ?? "",
                custAddr3: row?.custAddr3 ?? "",
                custZip: row?.custZip ?? "",
                custTin: row?.custTin ?? "",
                branchCode: row?.branchCode ?? "",
                custContact: row?.custContact ?? "",
                custPosition: row?.custPosition ?? "",
                custTelno: row?.custTelno ?? "",
                custMobileno: row?.custMobileno ?? "",
                custEmail: row?.custEmail ?? "",
                source: row?.source ?? "L",
                currCode: row?.currCode ?? "PHP",
                vatCode: row?.vatCode ?? "",
                atcCode: row?.atcCode ?? "",
                billtermCode: row?.billtermCode ?? row?.paytermCode ?? "",
                active: row?.active ?? "Y",
                oldCode: row?.oldcode ?? row?.oldCode ?? "",
                creditInvestigator: row?.creditInvestigator ?? "",
                creditLimit: row?.creditLimit ?? "0",
                totalAR: row?.totalAR ?? "",
                creditBalance: row?.creditBalance ?? "0",
                customerRemarks: row?.customerRemarks ?? "",
                customizedDrForm: row?.customizedDrForm ?? "",
                customizedSiForm: row?.customizedSiForm ?? "",
                customizedDrcForm: row?.customizedDrcForm ?? "",
                customizedBsForm: row?.customizedBsForm ?? "",
                customizedSviForm: row?.customizedSviForm ?? "",
                taxSignatoryName: row?.taxSignatoryName ?? "",
                taxSignatoryTin: row?.taxSignatoryTin ?? "",
                taxSignatoryPosition: row?.taxSignatoryPosition ?? "",
                taxSignatoryEmail: row?.taxSignatoryEmail ?? "",
                taxSignatoryZip: row?.taxSignatoryZip ?? "",
                shipmentCode1: row?.shipmentCode1 ?? "",
                shipmentCode2: row?.shipmentCode2 ?? "",
                shipmentCode3: row?.shipmentCode3 ?? "",
                shipmentCode4: row?.shipmentCode4 ?? "",
                destination2: row?.destination2 ?? "",
                registeredBy: row?.registeredBy ?? row?.registered_by ?? "",
                registeredDate: row?.registeredDate ?? row?.registered_date ?? "",
                updatedBy: row?.updatedBy ?? row?.updated_by ?? "",
                updatedDate: row?.updatedDate ?? row?.updated_date ?? "",
            });

            setSelectedCustCode(code);
        } catch (e) {
            console.error(e);
            await useSwalErrorAlertAPI("Fetch Error", e?.message || "Failed to fetch customer.");
        } finally {
            setIsLoading(false);
        }
    };

    const deleteCustomer = async () => {
        const code = String(form?.custCode || "").trim();

        if (!code) {
            await showValidation("Missing Required Field(s)", ["• Customer Code"]);
            return;
        }

        const isUsed = await checkInUsedCustomer(code);
        if (isUsed) {
            await useSwalErrorAlert(
                "Delete Not Allowed",
                `Customer Code ${code} is already used in transaction(s).`
            );
            return;
        }

        const confirm = await useSwalDeleteConfirm(
            "Delete Customer?",
            `This will permanently delete Customer Code ${code}. This action cannot be undone.`
        );
        if (!confirm?.isConfirmed) return;

        setIsLoading(true);
        try {
            const res = await apiClient.post("/deleteCustomer", {
                CUST_CODE: code,
            });

            const row = res?.data?.data?.[0] || {};
            const errorCount = Number(row?.errorcount ?? row?.errorCount ?? 0);
            const errorMsg = String(row?.errormsg ?? row?.errorMsg ?? "");

            if (res?.data?.success === false || errorCount > 0) {
                await useSwalErrorAlert("Delete Not Allowed", errorMsg || res?.data?.message || "Failed to delete customer.");
                return;
            }

            await useSwalDeleteRecord("Deleted", `Customer Code ${code} has been successfully removed.`);

            setForm({ ...emptyForm });
            setSelectedCustCode("");
            setIsEditing(false);

            await loadMasterList();
        } catch (e) {
            console.error(e);
            const row = e?.response?.data?.data?.[0] || {};
            const errorMsg = row?.errormsg || row?.errorMsg || e?.response?.data?.message || "Failed to delete customer.";
            await useSwalErrorAlert("Delete Not Allowed", String(errorMsg));
        } finally {
            setIsLoading(false);
        }
    };

    const upsertCustomer = async () => {
        let code = String(form?.custCode || "").trim();
        const isAddMode = !selectedCustCode;

        if (isAddMode && code) {
            const isDuplicate = await checkDuplicateCustomer(code);
            if (isDuplicate) {
                await useSwalErrorAlert("Duplicate Record", `Customer Code ${code} already exists.`);
                return;
            }
        }

        setIsLoading(true);
        try {
            const jsonData = {
                json_data: {
                    action: selectedCustCode ? "edit" : "add",
                    custCode: code,
                    custName: form.custName || "",
                    businessName: form.businessName || "",
                    firstName: form.firstName || "",
                    middleName: form.middleName || "",
                    lastName: form.lastName || "",
                    taxClass: form.taxClass || "",
                    custAddr1: form.custAddr1 || "",
                    custAddr2: form.custAddr2 || "",
                    custAddr3: form.custAddr3 || "",
                    custZip: form.custZip || "",
                    custTin: form.custTin || "",
                    branchCode: form.branchCode || "",
                    custContact: form.custContact || "",
                    custPosition: form.custPosition || "",
                    custTelno: form.custTelno || "",
                    custMobileno: form.custMobileno || "",
                    custEmail: form.custEmail || "",
                    source: form.source || "",
                    currCode: form.currCode || "",
                    vatCode: form.vatCode || "",
                    atcCode: form.atcCode || "",
                    billtermCode: form.billtermCode || "",
                    sltypeCode: normalizeSlType(form.sltypeCode || "CU"),
                    active: form.active || "Y",
                    oldCode: form.oldCode || "",
                    creditInvestigator: form.creditInvestigator || "",
                    creditLimit: form.creditLimit || 0,
                    customerRemarks: form.customerRemarks || "",
                    customizedDrForm: form.customizedDrForm || "",
                    customizedSiForm: form.customizedSiForm || "",
                    customizedDrcForm: form.customizedDrcForm || "",
                    customizedBsForm: form.customizedBsForm || "",
                    customizedSviForm: form.customizedSviForm || "",
                    taxSignatoryName: form.taxSignatoryName || "",
                    taxSignatoryTin: form.taxSignatoryTin || "",
                    taxSignatoryPosition: form.taxSignatoryPosition || "",
                    taxSignatoryEmail: form.taxSignatoryEmail || "",
                    taxSignatoryZip: form.taxSignatoryZip || "",
                    shipmentCode1: form.shipmentCode1 || "",
                    shipmentCode2: form.shipmentCode2 || "",
                    shipmentCode3: form.shipmentCode3 || "",
                    shipmentCode4: form.shipmentCode4 || "",
                    destination2: form.destination2 || "",
                    userCode,
                },
            };

            const payload = {
                json_data: JSON.stringify(jsonData),
            };

            const res = await apiClient.post("/upsertCustomer", payload);
            const sprocValidation = extractSprocValidation(res);

            if (Number(sprocValidation?.errorCount ?? 0) > 0) {
                await useSwalErrorAlert(
                    "Validation Failed",
                    String(sprocValidation?.errorMsg || "Please complete the required fields.")
                );
                return;
            }

            const finalCode = sprocValidation?.generatedCode || code;

            await useSwalSuccessAlert("Success!", "Customer saved successfully.");
            setSelectedCustCode(finalCode);
            setIsEditing(false);
            await loadMasterList();
            await fetchCustomerByCode(finalCode);
        } catch (e) {
            console.error(e);
            const sprocValidation = extractSprocValidation(e?.response);
            if (Number(sprocValidation?.errorCount ?? 0) > 0) {
                await useSwalErrorAlert("Save Failed", String(sprocValidation?.errorMsg));
                return;
            }
            const msg = e?.response?.data?.message || e?.message || "Failed to save customer.";
            await useSwalErrorAlert("Save Failed", msg);
        } finally {
            setIsLoading(false);
        }
    };

    const applyMasterFilters = () => {
        const selectedType = normalizeSlType(subsidiaryType);

        const filtered = masterAllRows.filter((row) => {
            const rowType = normalizeSlType(row?.sltypeCode || "CU");
            if (selectedType && rowType !== selectedType) return false;

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
        setSubsidiaryType("");
        setMasterFilters({});
        setMasterRows(masterAllRows);
    };

    const handleChangeMasterFilter = (key, value) => {
        setMasterFilters((p) => ({ ...p, [key]: value }));
    };

    const handleAdd = () => {
        const sl = normalizeSlType(form?.sltypeCode || "CU") || "CU";
        setSelectedCustCode("");
        setForm({
            ...emptyForm,
            sltypeCode: sl,
            custCode: "",
            __isNew: true,
        });
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleEdit = async () => {
        const code = String(form?.custCode || "").trim();
        if (!code) {
            await useSwalErrorAlert("Required", "Please select a Customer record first.");
            return;
        }
        setIsEditing(true);
        setActiveTab("setup");
    };

    const handleResetSetup = () => {
        setSelectedCustCode("");
        setForm({ ...emptyForm });
        setIsEditing(false);
    };

    const tabs = useMemo(
        () => [
            { id: "setup", label: "Customer Set-Up", icon: faFolderOpen },
            { id: "master", label: "Customer Master Data", icon: faList },
            { id: "ref", label: "Reference Codes", icon: faTags },
        ],
        []
    );

    const handleMasterRowDoubleClick = async (row) => {
        const code = String(row?.custCode || row?.code || "").trim();
        if (!code) return;
        setActiveTab("setup");
        setIsEditing(false);
        await fetchCustomerByCode(code);
    };

    const headerButtons = useMemo(() => {
        if (activeTab !== "setup") return [];

        const hasRecord = String(form?.custCode || "").trim() && !form.__isNew;

        return [
            {
                key: "add",
                label: <span className="hidden sm:inline ml-1">Add</span>,
                icon: faPlus,
                onClick: handleAdd,
                disabled: isLoading,
                className: "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm",
            },
            {
                key: "save",
                label: <span className="hidden sm:inline ml-1">Save</span>,
                icon: faSave,
                onClick: upsertCustomer,
                disabled: isLoading || !isEditing,
                className: `flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md transition-all shadow-sm ${isLoading || !isEditing
                    ? "bg-blue-500 opacity-50 cursor-not-allowed text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                    }`,
            },
            {
                key: "reset",
                label: <span className="hidden sm:inline ml-1">Reset</span>,
                icon: faUndo,
                onClick: handleResetSetup,
                disabled: isLoading,
                className: "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-sm",
            },
            {
                key: "edit",
                label: <span className="hidden sm:inline ml-1">Edit</span>,
                icon: faPenToSquare,
                onClick: handleEdit,
                disabled: isLoading,
                className: "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm",
            },
            {
                key: "attach",
                label: <span className="hidden sm:inline ml-1">Attach File</span>,
                icon: faPaperclip,
                onClick: handleOpenAttach,
                disabled: isLoading || !hasRecord,
                className: "flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm",
            },
            {
                key: "delete",
                label: <span className="hidden sm:inline ml-1">Delete</span>,
                icon: faTrash,
                onClick: deleteCustomer,
                disabled: isLoading || isEditing || !hasRecord,
                className: `flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md transition-all shadow-sm ${isLoading || isEditing || !hasRecord
                    ? "bg-red-400 opacity-50 cursor-not-allowed text-white"
                    : "bg-red-500 text-white hover:bg-red-600"
                    }`,
            },
        ];
    }, [activeTab, isLoading, isEditing, form]);

    return (
        <div className="global-ref-main-div-ui">
            <div className="global-ref-header-ui">
                <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-3">
                    <div className="flex-shrink-0 w-full lg:w-auto text-center lg:text-left">
                        <h1 className="global-ref-headertext-ui truncate">
                            {activeTab === "setup" && "Customer Master Data"}
                            {activeTab === "master" && "Customer Master Data"}
                            {activeTab === "ref" && "Reference Codes"}
                        </h1>
                    </div>

                    <div className="flex-1 flex justify-center w-full overflow-x-auto no-scrollbar">
                        <div className="flex flex-nowrap border-b border-blue-300 dark:border-gray-700">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md
                                        ${activeTab === tab.id
                                            ? "border-blue-700 text-blue-700 bg-blue-50/50"
                                            : "border-transparent text-gray-500 hover:text-blue-500"
                                        }`}
                                >
                                    <FontAwesomeIcon icon={tab.icon} className="mr-1.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-shrink-0 w-full lg:w-auto flex flex-wrap items-center justify-center lg:justify-end gap-1.5">
                        {!!headerButtons.length && (
                            <ButtonBar buttons={headerButtons} />
                        )}

                        {activeTab === "setup" && (
                            <div ref={guideRef} className="relative z-[60]">
                                <button
                                    onClick={() => setOpenGuide((v) => !v)}
                                    className="flex items-center justify-center h-8 w-8 sm:w-auto sm:h-8 sm:px-4 text-[12px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
                                >
                                    <FontAwesomeIcon icon={faInfoCircle} className="text-[14px] sm:text-[12px]" />
                                    <span className="hidden sm:inline ml-1">Info</span>
                                    <FontAwesomeIcon icon={faChevronDown} className="hidden sm:inline ml-1 text-[10px] opacity-80" />
                                </button>

                                {isOpenGuide && (
                                    <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] overflow-hidden">
                                        <button onClick={() => { window.open(pdfLink, "_blank"); setOpenGuide(false); }} className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 border-b border-gray-100 transition-colors">
                                            <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" /> PDF Guide
                                        </button>
                                        <button onClick={() => { window.open(videoLink, "_blank"); setOpenGuide(false); }} className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 transition-colors">
                                            <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" /> Video Guide
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div
                className="global-tran-tab-div-ui mt-36 sm:mt-32 md:mt-28 lg:mt-24"
                style={{ minHeight: "calc(100vh - 170px)" }}
            >
                {activeTab === "setup" && (
                    <CustSetupTab
                        form={form}
                        isEditing={isEditing}
                        isLoading={isLoading}
                        onChangeForm={updateForm}
                        onLookupCode={() => setIsSearchOpen(true)}
                        onSelectCustomerCode={fetchCustomerByCode}
                        sltypeOptions={sltypeOptions}
                        activeOptions={activeOptions}
                        sourceOptions={sourceOptions}
                        mappedTaxClassOptions={mappedTaxClassOptions}
                        payeeTypeOptions={payeeTypeOptions}
                        handleTaxClassChange={handleTaxClassChange}
                        handleBusinessNameChange={handleBusinessNameChange}
                        handleCheckNameChange={handleCheckNameChange}
                        applyAutoNames={applyAutoNames}
                    />
                )}

                {activeTab === "master" && (
                    <CustMasterDataTab
                        isLoading={isLoading}
                        rows={masterRows}
                        onRowDoubleClick={handleMasterRowDoubleClick}
                        subsidiaryType={subsidiaryType}
                        onChangeSubsidiaryType={setSubsidiaryType}
                        filters={masterFilters}
                        onChangeFilter={handleChangeMasterFilter}
                        onFilter={applyMasterFilters}
                        onReset={resetMasterFilters}
                    />
                )}

                {activeTab === "ref" && <ReferenceCodesTab variant="customer" />}
            </div>

            <SearchAttachment
                isOpen={isAttachOpen}
                onClose={() => setIsAttachOpen(false)}
                params={{
                    DocumentID: documentNo,
                    CodeLabel: "Customer Code",
                    Code: documentNo,
                    NameLabel: "Customer Name",
                    Name: form.custName || form.businessName || "N/A"
                }}
            />

            <SearchCusMast
                isOpen={isSearchOpen}
                customParam="ActiveAll"
                onClose={async (selected) => {
                    setIsSearchOpen(false);
                    if (!selected) return;
                    const code = getValue(selected?.custCode) || getValue(selected?.cust_code);
                    if (code) {
                        await fetchCustomerByCode(code);
                    }
                }}
            />
        </div>
    );
};

export default CustMast;