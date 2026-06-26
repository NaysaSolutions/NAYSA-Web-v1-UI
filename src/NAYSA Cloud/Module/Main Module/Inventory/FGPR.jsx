import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMagnifyingGlass,
    faPlus,
    faMinus,
    faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";

import Header from "@/NAYSA Cloud/Components/Header";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { useReset } from "../../../Components/ResetContext.jsx";

import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import QstatLookupModal from "../../../Lookup/SearchQStatRef.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import WOLookupModal from "../../../Lookup/SearchWO.jsx";
import SearchStockCard from "@/NAYSA Cloud/Lookup/SearchStockCard.jsx";

import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig as getSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import {
    docTypeNames,
    docTypes,
    docTypePDFGuide,
    docTypeVideoGuide,
} from "@/NAYSA Cloud/Global/doctype";
import {
    useTransactionUpsert,
    useFetchTranData,
    useHandleCancel,
    useHandlePostTran,
    useGenerateGLEntries,
} from "@/NAYSA Cloud/Global/procedure";
import { useHandlePrint } from "@/NAYSA Cloud/Global/report";
import {
    formatNumber,
    parseFormattedNumber,
    useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const today = () => new Date().toISOString().split("T")[0];

const getValue = (row, ...keys) => {
    if (!row || typeof row !== "object") return "";

    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && value !== "") return value;
    }

    const normalized = Object.entries(row).reduce((acc, [key, value]) => {
        acc[String(key).replace(/[_\s-]/g, "").toLowerCase()] = value;
        return acc;
    }, {});

    for (const key of keys) {
        const value = normalized[String(key).replace(/[_\s-]/g, "").toLowerCase()];
        if (value !== undefined && value !== null && value !== "") return value;
    }

    return "";
};

const toDateInput = (value) => {
    if (!value) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
};

const amountValue = (value, decimal = 2) =>
    formatNumber(parseFormattedNumber(value || 0), decimal);

const amountRaw = (value) => parseFormattedNumber(value || 0) || 0;

const detailConfigKeyMap = {
    line_no: "lineNo",
    item_code: "itemCode",
    item_no: "itemCode",
    item_name: "itemName",
    item_desc: "itemName",
    categ_code: "categCode",
    uom_code: "uomCode",
    quantity: "quantity",
    unit_cost: "unitCost",
    item_amount: "itemAmount",
    amount: "itemAmount",
    lot_no: "lotNo",
    bb_date: "bbDate",
    qstat_code: "qstatCode",
    qs_code: "qstatCode",
    qty_hand: "qtyHand",
    whouse_code: "whouseCode",
    loc_code: "locCode",
    acct_code: "acctCode",
    rc_code: "rcCode",
    act_code: "rcCode",
    sltype_code: "sltypeCode",
    sl_code: "slCode",
    group_id: "groupId",
    tot_matl_cost: "totMatlCost",
    std_labor: "stdLabor",
    std_overhead: "stdOverhead",
    bom_factor: "bomFactor",
    stock_uom: "stockUom",
    uom_qty2: "uomQty2",
    gross_wt: "grossWt",
    core_wt: "coreWt",
    net_wt: "netWt",
    color_code: "colorCode",
    control_no: "controlNo",
};

const summaryConfigKeyMap = {
    line_no: "lineNo",
    rec_no: "lineNo",
    acct_code: "acctCode",
    rc_code: "rcCode",
    act_code: "rcCode",
    sltype_code: "sltypeCode",
    sl_code: "slCode",
    particular: "particular",
    vat_code: "vatCode",
    vat_desc: "vatDesc",
    atc_code: "atcCode",
    atc_desc: "atcDesc",
    ewt_code: "atcCode",
    ewt_desc: "atcDesc",
    debit: "debit",
    credit: "credit",
    debit_fx1: "debitFx1",
    credit_fx1: "creditFx1",
    debit_fx2: "debitFx2",
    credit_fx2: "creditFx2",
    slref_no: "slRefNo",
    slref_date: "slRefDate",
    dt1_lineno: "dt1Lineno",
    remarks: "remarks",
};

const normalizeConfigColumns = (configRows, keyMap) => {
    if (!Array.isArray(configRows) || configRows.length === 0) return [];

    return configRows
        .filter((row) => String(row.hidden ?? row.HIDDEN ?? "0") !== "1")
        .map((row) => {
            const rawKey = String(row.key ?? row.KEY ?? "");
            const uiKey = keyMap[rawKey] || keyMap[rawKey.toLowerCase()] || rawKey;

            return {
                key: uiKey,
                label: row.label ?? row.LABEL ?? rawKey,
                classNames: row.classNames ?? row.classnames ?? "text-left",
                renderType: row.renderType ?? row.RENDERTYPE ?? "text",
                renderFormat: row.renderFormat ?? row.RENDERFORMAT ?? null,
                width: Number(row.width ?? row.WIDTH) || 130,
            };
        })
        .filter((column) => Boolean(column.key));
};

const FGPR = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const loadedFromUrlRef = useRef(false);
    const { resetFlag } = useReset();
    const { user, companyInfo } = useAuth();

    const endpointDocType = docTypes?.FGPR || "FGPR";
    const docType = docTypes?.FGPR || "FGPR";
    const reportDocType = docType;
    const documentTitle = docTypeNames?.[docType] || "FG Production Receipt";
    const pdfLink = docTypePDFGuide?.[docType];
    const videoLink = docTypeVideoGuide?.[docType];

    const initialState = useMemo(
        () => ({
            topTab: "details",
            activeTab: "basic",
            isLoading: false,
            showSpinner: false,
            isDocNoDisabled: true,
            isFetchDisabled: true,
            isSaveDisabled: false,
            isResetDisabled: false,
            isViewDocument: false,

            documentID: "",
            documentNo: "",
            documentStatus: "",
            status: "OPEN",
            fgprDate: today(),
            cutoffCode: "",
            refNo: "",
            woNo: "",
            particular: "",
            remarks: "",
            noReprints: "0",

            branchCode:
                user?.BRANCH_CODE || user?.branchCode || companyInfo?.branchCode || "HO",
            branchName:
                user?.BRANCH_NAME || user?.branchName || companyInfo?.branchName || "Head Office",
            WHCode: "",
            WHName: "",
            LocCode: "",
            LocName: "",
            vendCode: "",
            vendName: "",
            userCode: user?.USER_CODE || user?.userCode || "NSI",

            detailRows: [],
            detailRowsGL: [],
            detailColumns: [],
            summaryColumns: [],

            selectedRowIndex: null,
            glRowIndex: null,
            lookupSource: "",
            selectedWH: "",

            showAllTranDocNo: false,
            branchModalOpen: false,
            warehouseLookupOpen: false,
            locationLookupOpen: false,
            itemLookupOpen: false,
            showQstatModal: false,
            showRCLookup: false,
            showCOALookup: false,
            showSLLookup: false,
            showVATLookup: false,
            showEWTLookup: false,
            payeeLookupOpen: false,
            showCancelModal: false,
            showPostModal: false,
            showWOLookup: false,
            showStockCard: false,
        }),
        [companyInfo?.branchCode, companyInfo?.branchName, user],
    );

    const [state, setState] = useState(initialState);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const detailRowsRef = useRef([]);
    const summaryRowsRef = useRef([]);

    const updateState = useCallback((updates) => {
        setState((prev) => ({ ...prev, ...updates }));
    }, []);

    const displayStatus = useMemo(() => {
        const raw = String(state.documentStatus || state.status || "OPEN").trim().toUpperCase();
        const map = {
            "": "OPEN",
            O: "OPEN",
            OPEN: "OPEN",
            C: "CLOSED",
            CLOSED: "CLOSED",
            X: "CANCELLED",
            CANCELLED: "CANCELLED",
            CANCELED: "CANCELLED",
            F: "FINALIZED",
            FINALIZED: "FINALIZED",
            P: "POSTED",
            POSTED: "POSTED",
        };
        return map[raw] || raw || "OPEN";
    }, [state.documentStatus, state.status]);

    const statusColor = {
        FINALIZED: "global-tran-stat-text-finalized-ui",
        CANCELLED: "global-tran-stat-text-closed-ui",
        CLOSED: "global-tran-stat-text-closed-ui",
        POSTED: "global-tran-stat-text-finalized-ui",
    }[displayStatus] || "";

    const isFormDisabled =
        state.isViewDocument || ["FINALIZED", "CANCELLED", "CLOSED", "POSTED"].includes(displayStatus);

    const totals = useMemo(() => {
        const detailRows = state.detailRows || [];
        const summaryRows = state.detailRowsGL || [];

        return {
            quantity: formatNumber(
                detailRows.reduce((sum, row) => sum + amountRaw(row.quantity), 0),
                2,
            ),
            amount: formatNumber(
                detailRows.reduce((sum, row) => sum + amountRaw(row.itemAmount ?? row.amount), 0),
                2,
            ),
            debit: formatNumber(
                summaryRows.reduce((sum, row) => sum + amountRaw(row.debit), 0),
                2,
            ),
            credit: formatNumber(
                summaryRows.reduce((sum, row) => sum + amountRaw(row.credit), 0),
                2,
            ),
        };
    }, [state.detailRows, state.detailRowsGL]);

    useEffect(() => {
        detailRowsRef.current = state.detailRows || [];
    }, [state.detailRows]);

    useEffect(() => {
        summaryRowsRef.current = state.detailRowsGL || [];
    }, [state.detailRowsGL]);

    useEffect(() => {
        const p = new URLSearchParams(location.search);
        updateState({ isViewDocument: p.get("viewDocument") === "true" });
    }, [location.search, updateState]);

    useEffect(() => {
        let timer;
        if (state.isLoading) {
            timer = setTimeout(() => updateState({ showSpinner: true }), 200);
        } else {
            updateState({ showSpinner: false });
        }
        return () => clearTimeout(timer);
    }, [state.isLoading, updateState]);

    useEffect(() => {
        if (resetFlag) handleReset();
    }, [resetFlag]);

    useEffect(() => {
        loadColumnConfig();
    }, []);

    const loadColumnConfig = async () => {
        updateState({ isLoading: true });
        const userCode = user?.USER_CODE || user?.userCode || "";

        try {
            const [detailConfig, generalLedgerConfig] = await Promise.all([
                getSelectedHSColConfig("FGPR_Item_Detail", userCode, ""),
                getSelectedHSColConfig("FGPR_General_Ledger", userCode, ""),
            ]);

            // FGPR_Item_Detail is shared with Transaction History.
            // Hide history-only columns from Transaction Details > Item Details
            // without creating another HS_COLCONFIG endpoint.
            const transactionDetailHiddenKeys = new Set([
                "fgpr_id",
                "branch_code",
                "fgpr_no",
                "fgpr_date",
                "wo_no",
                "fgprId",
                "branchCode",
                "fgprNo",
                "fgprDate",
                "woNo",
            ]);

            const transactionDetailConfig = Array.isArray(detailConfig)
                ? detailConfig.filter((row) => {
                    const rawKey = String(row.key ?? row.KEY ?? "").trim();
                    return !transactionDetailHiddenKeys.has(rawKey) &&
                        !transactionDetailHiddenKeys.has(rawKey.toLowerCase());
                })
                : [];

            // Transaction Details > General Ledger columns.
            // FGPR_Summary is for History/Header only.
            const summaryColumnOrder = [
                'lineNo', 'acctCode', 'rcCode', 'slCode', 'particular',
                'vatCode', 'vatDesc', 'atcCode', 'atcDesc',
                'debit', 'credit', 'slRefNo', 'slRefDate', 'remarks',
            ];

            const rawSummaryColumns = normalizeConfigColumns(generalLedgerConfig, summaryConfigKeyMap);
            const sortedSummaryColumns = [...rawSummaryColumns].sort((a, b) => {
                const ai = summaryColumnOrder.indexOf(a.key);
                const bi = summaryColumnOrder.indexOf(b.key);
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            });

            updateState({
                detailColumns: normalizeConfigColumns(transactionDetailConfig, detailConfigKeyMap),
                summaryColumns: sortedSummaryColumns,
            });
        } finally {
            updateState({ isLoading: false });
        }
    };

    const normalizeDetailRow = (row = {}, index = 0) => {
        const quantity = amountRaw(getValue(row, "quantity", "QUANTITY", "qty", "worQty", "WOR_QTY"));
        const unitCost = amountRaw(getValue(row, "unitCost", "unit_cost", "UNIT_COST"));
        const itemAmount = amountRaw(getValue(row, "itemAmount", "item_amount", "ITEM_AMOUNT", "amount", "AMOUNT")) || quantity * unitCost;

        return {
            id: getValue(row, "id", "ID", "groupId", "GROUP_ID") || `${Date.now()}-${index}`,
            lineNo: getValue(row, "lineNo", "line_no", "LINE_NO", "ln", "LN") || String(index + 1),
            itemCode: getValue(row, "itemCode", "item_code", "ITEM_CODE", "itemNo", "item_no", "ITEM_NO"),
            itemName: getValue(row, "itemName", "item_name", "ITEM_NAME", "itemDesc", "item_desc", "ITEM_DESC"),
            categCode: getValue(row, "categCode", "categ_code", "CATEG_CODE"),
            uomCode: getValue(row, "uomCode", "uom_code", "UOM_CODE"),
            quantity: amountValue(quantity, 2),
            unitCost: amountValue(unitCost, 6),
            itemAmount: amountValue(itemAmount, 6),
            amount: amountValue(itemAmount, 6),
            lotNo: getValue(row, "lotNo", "lot_no", "LOT_NO"),
            bbDate: toDateInput(getValue(row, "bbDate", "bb_date", "BB_DATE")),
            qstatCode: getValue(row, "qstatCode", "qstat_code", "QSTAT_CODE", "qsCode", "qs_code", "QS_CODE"),
            qtyHand: amountValue(getValue(row, "qtyHand", "qty_hand", "QTY_HAND"), 6),
            whouseCode: getValue(row, "whouseCode", "whouse_code", "WHOUSE_CODE", "WH_CODE", "whCode") || state.WHCode,
            locCode: getValue(row, "locCode", "loc_code", "LOC_CODE", "LocCode") || state.LocCode,
            acctCode: getValue(row, "acctCode", "acct_code", "ACCT_CODE"),
            rcCode: getValue(row, "rcCode", "rc_code", "RC_CODE", "actCode", "act_code", "ACT_CODE"),
            sltypeCode: getValue(row, "sltypeCode", "sltype_code", "SLTYPE_CODE"),
            slCode: getValue(row, "slCode", "sl_code", "SL_CODE"),
            groupId: getValue(row, "groupId", "group_id", "GROUP_ID"),
            totMatlCost: amountValue(getValue(row, "totMatlCost", "tot_matl_cost", "TOT_MATL_COST"), 6),
            stdLabor: amountValue(getValue(row, "stdLabor", "std_labor", "STD_LABOR"), 6),
            stdOverhead: amountValue(getValue(row, "stdOverhead", "std_overhead", "STD_OVERHEAD"), 6),
            bomFactor: amountValue(getValue(row, "bomFactor", "bom_factor", "BOM_FACTOR"), 6),
            stockUom: getValue(row, "stockUom", "stock_uom", "STOCK_UOM"),
            uomQty2: amountValue(getValue(row, "uomQty2", "uom_qty2", "UOM_QTY2"), 6),
            grossWt: amountValue(getValue(row, "grossWt", "gross_wt", "GROSS_WT"), 6),
            coreWt: amountValue(getValue(row, "coreWt", "core_wt", "CORE_WT"), 6),
            netWt: amountValue(getValue(row, "netWt", "net_wt", "NET_WT"), 6),
            colorCode: getValue(row, "colorCode", "color_code", "COLOR_CODE"),
            controlNo: getValue(row, "controlNo", "control_no", "CONTROL_NO"),
        };
    };

    const normalizeSummaryRow = (row = {}, index = 0) => {
        const atcCode = getValue(row, "atcCode", "atc_code", "ATC_CODE", "ewtCode", "ewt_code", "EWT_CODE");
        const atcDesc = getValue(row, "atcDesc", "atc_desc", "ATC_DESC", "ewtDesc", "ewt_desc", "EWT_DESC", "atcName", "atc_name", "ATC_NAME");

        return {
            id: getValue(row, "id", "ID") || `gl-${Date.now()}-${index}`,
            lineNo: getValue(row, "lineNo", "line_no", "LINE_NO", "recNo", "rec_no", "REC_NO") || String(index + 1),
            acctCode: getValue(row, "acctCode", "acct_code", "ACCT_CODE"),
            rcCode: getValue(row, "rcCode", "rc_code", "RC_CODE", "actCode", "act_code", "ACT_CODE"),
            sltypeCode: getValue(row, "sltypeCode", "sltype_code", "SLTYPE_CODE"),
            slCode: getValue(row, "slCode", "sl_code", "SL_CODE"),
            particular: getValue(row, "particular", "PARTICULAR"),
            vatCode: getValue(row, "vatCode", "vat_code", "VAT_CODE"),
            vatDesc: getValue(row, "vatDesc", "vat_desc", "VAT_DESC"),
            atcCode,
            atcDesc,
            ewtCode: atcCode,
            ewtDesc: atcDesc,
            debit: amountValue(getValue(row, "debit", "DEBIT"), 2),
            credit: amountValue(getValue(row, "credit", "CREDIT"), 2),
            debitFx1: amountValue(getValue(row, "debitFx1", "debit_fx1", "DEBIT_FX1"), 2),
            creditFx1: amountValue(getValue(row, "creditFx1", "credit_fx1", "CREDIT_FX1"), 2),
            debitFx2: amountValue(getValue(row, "debitFx2", "debit_fx2", "DEBIT_FX2"), 2),
            creditFx2: amountValue(getValue(row, "creditFx2", "credit_fx2", "CREDIT_FX2"), 2),
            slRefNo: getValue(row, "slRefNo", "slref_no", "SLREF_NO"),
            slRefDate: toDateInput(getValue(row, "slRefDate", "slref_date", "SLREF_DATE")),
            remarks: getValue(row, "remarks", "REMARKS"),
            dt1Lineno: getValue(row, "dt1Lineno", "dt1_lineno", "DT1_LINENO"),
        };
    };

    const mapDetailForSave = (row = {}, index = 0) => ({
        lineNo: String(index + 1),
        lnNo: String(index + 1),
        itemCode: row.itemCode || "",
        itemNo: row.itemCode || "",
        itemName: row.itemName || "",
        itemDesc: row.itemName || "",
        categCode: row.categCode || "",
        uomCode: row.uomCode || "",
        quantity: amountRaw(row.quantity),
        unitCost: amountRaw(row.unitCost),
        itemAmount: amountRaw(row.itemAmount ?? row.amount),
        amount: amountRaw(row.itemAmount ?? row.amount),
        lotNo: row.lotNo || "",
        bbDate: row.bbDate || null,
        qstatCode: row.qstatCode || "",
        qsCode: row.qstatCode || "",
        qtyHand: amountRaw(row.qtyHand),
        whouseCode: row.whouseCode || state.WHCode || "",
        locCode: row.locCode || state.LocCode || "",
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
        actCode: row.rcCode || "",
        sltypeCode: row.sltypeCode || "",
        slCode: row.slCode || "",
        groupId: row.groupId || "",
        totMatlCost: amountRaw(row.totMatlCost),
        stdLabor: amountRaw(row.stdLabor),
        stdOverhead: amountRaw(row.stdOverhead),
        bomFactor: amountRaw(row.bomFactor),
        stockUom: row.stockUom || row.uomCode || "",
        uomQty2: amountRaw(row.uomQty2),
        grossWt: amountRaw(row.grossWt),
        coreWt: amountRaw(row.coreWt),
        netWt: amountRaw(row.netWt),
        colorCode: row.colorCode || "",
        controlNo: row.controlNo || "",
    });

    const mapSummaryForSave = (row = {}, index = 0) => ({
        recNo: String(index + 1),
        lineNo: String(index + 1),
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
        actCode: row.rcCode || "",
        sltypeCode: row.sltypeCode || "",
        slCode: row.slCode || "",
        particular: row.particular || "",
        vatCode: row.vatCode || "",
        vatDesc: row.vatDesc || "",
        atcCode: row.atcCode || row.ewtCode || "",
        atcDesc: row.atcDesc || row.ewtDesc || "",
        ewtCode: row.atcCode || row.ewtCode || "",
        ewtDesc: row.atcDesc || row.ewtDesc || "",
        debit: amountRaw(row.debit),
        credit: amountRaw(row.credit),
        debitFx1: amountRaw(row.debitFx1),
        creditFx1: amountRaw(row.creditFx1),
        debitFx2: amountRaw(row.debitFx2),
        creditFx2: amountRaw(row.creditFx2),
        slRefNo: row.slRefNo || "",
        slRefDate: row.slRefDate || null,
        remarks: row.remarks || "",
        dt1Lineno: row.dt1Lineno || "",
    });

    const buildPayload = (summaryOverride = null) => ({
        branchCode: state.branchCode,
        fgprNo: state.documentNo || "",
        fgprId: state.documentID || "",
        fgprHdId: state.documentID || "",
        docNo: state.documentNo || "",
        docId: state.documentID || "",
        fgprDate: state.fgprDate || today(),
        cutoffCode: state.cutoffCode || "",
        refNo: state.refNo || "",
        woNo: state.woNo || "",
        whouseCode: state.WHCode || "",
        whCode: state.WHCode || "",
        locCode: state.LocCode || "",
        LocCode: state.LocCode || "",
        particular: state.particular || "",
        remarks: state.remarks || "",
        vendCode: state.vendCode || "",
        vendName: state.vendName || "",
        userCode: state.userCode || user?.USER_CODE || "",
        currCode: state.currCode || "PHP",
        currRate: amountRaw(state.currRate || 1) || 1,
        noReprints: state.noReprints || "0",
        dt1: (state.detailRows || []).map(mapDetailForSave),
        dt2: (summaryOverride || state.detailRowsGL || []).map(mapSummaryForSave),
    });

    const validateBeforeSave = () => {
        if (!state.branchCode) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select Branch." });
            return false;
        }
        if (!state.fgprDate) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select FGPR Date." });
            return false;
        }
        if (!state.WHCode) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select Warehouse." });
            return false;
        }
        if (!state.LocCode) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please select Location." });
            return false;
        }
        if (!Array.isArray(state.detailRows) || state.detailRows.length === 0) {
            Swal.fire({ icon: "warning", title: "Required", text: "Please add at least one item detail." });
            return false;
        }

        const invalidRowIndex = state.detailRows.findIndex(
            (row) => !row.itemCode || amountRaw(row.quantity) <= 0,
        );
        if (invalidRowIndex >= 0) {
            Swal.fire({
                icon: "warning",
                title: "Invalid Detail",
                text: `Line ${invalidRowIndex + 1}: Item No. and WOR Quantity are required.`,
            });
            return false;
        }

        return true;
    };

    const fetchTranData = async (docNo, branchCode = state.branchCode, direction = "") => {
        if (!docNo && !direction) return;
        updateState({ isLoading: true });

        try {
            const data = await useFetchTranData(docNo, branchCode, endpointDocType, "fgprNo", direction);
            const parsed = Array.isArray(data) ? data[0] : data;

            if (!parsed || (!parsed.fgprNo && !parsed.docNo && !parsed.FGPR_NO && !parsed.documentNo)) {
                Swal.fire({ icon: "info", title: "No Records Found", text: "Transaction does not exist." });
                return;
            }

            const dt1 = getValue(parsed, "dt1", "details", "dtl") || [];
            const dt2 = getValue(parsed, "dt2", "dtlb", "summary", "gl") || [];

            updateState({
                documentID: getValue(parsed, "fgprHdId", "fgprId", "FGPR_ID", "documentID", "docId"),
                documentNo: getValue(parsed, "fgprNo", "FGPR_NO", "docNo", "documentNo"),
                documentStatus: getValue(parsed, "fgprStatus", "fgpr_status", "FGPR_STATUS", "stat", "status", "STAT"),
                status: getValue(parsed, "fgprStatus", "fgpr_status", "FGPR_STATUS", "stat", "status", "STAT") || "OPEN",
                fgprDate: toDateInput(getValue(parsed, "fgprDate", "fgpr_date", "FGPR_DATE")) || today(),
                cutoffCode: getValue(parsed, "cutoffCode", "cutoff_code", "CUTOFF_CODE"),
                refNo: getValue(parsed, "refNo", "ref_no", "REF_NO"),
                woNo: getValue(parsed, "woNo", "wo_no", "WO_NO"),
                branchCode: getValue(parsed, "branchCode", "branch_code", "BRANCH_CODE") || branchCode,
                branchName: getValue(parsed, "branchName", "branch_name", "BRANCH_NAME") || state.branchName,
                WHCode: getValue(parsed, "whouseCode", "whouse_code", "WHOUSE_CODE", "whCode", "WH_CODE"),
                WHName: getValue(parsed, "whouseName", "whouse_name", "WHOUSE_NAME", "whName", "WH_NAME"),
                LocCode: getValue(parsed, "locCode", "loc_code", "LOC_CODE", "LocCode"),
                LocName: getValue(parsed, "locName", "loc_name", "LOC_NAME", "LocName"),
                particular: getValue(parsed, "particular", "PARTICULAR"),
                remarks: getValue(parsed, "remarks", "REMARKS"),
                vendCode: getValue(parsed, "vendCode", "vend_code", "VEND_CODE"),
                vendName: getValue(parsed, "vendName", "vend_name", "VEND_NAME"),
                currCode: getValue(parsed, "currCode", "curr_code", "CURR_CODE") || "PHP",
                currRate: getValue(parsed, "currRate", "curr_rate", "CURR_RATE") || 1,
                noReprints: getValue(parsed, "noReprints", "no_reprints", "NO_REPRINTS") || "0",
                detailRows: Array.isArray(dt1) ? dt1.map(normalizeDetailRow) : [],
                detailRowsGL: Array.isArray(dt2) ? dt2.map(normalizeSummaryRow) : [],
                isDocNoDisabled: true,
                isFetchDisabled: true,
            });
        } catch (error) {
            console.error("FGPR fetch error:", error);
            Swal.fire({ icon: "error", title: "Fetch Failed", text: error?.message || "Unable to load FGPR." });
        } finally {
            updateState({ isLoading: false });
        }
    };

    const handleActivityOption = async (action) => {
        if (isFormDisabled && action !== "GenerateGL") return;
        if (action === "Upsert" && !validateBeforeSave()) return;

        updateState({ isLoading: true });

        try {
            if (action === "GenerateGL") {
                const entries = await useGenerateGLEntries(endpointDocType, buildPayload([]));
                if (Array.isArray(entries)) {
                    updateState({ detailRowsGL: entries.map(normalizeSummaryRow) });
                }
                return;
            }

            let glRowsForSave = state.detailRowsGL || [];

            if (!Array.isArray(glRowsForSave) || glRowsForSave.length === 0) {
                const generated = await useGenerateGLEntries(endpointDocType, buildPayload([]));
                if (Array.isArray(generated) && generated.length > 0) {
                    glRowsForSave = generated.map(normalizeSummaryRow);
                    updateState({ detailRowsGL: glRowsForSave });
                }
            }

            const payload = buildPayload(glRowsForSave);
            const result = await useTransactionUpsert(
                endpointDocType,
                payload,
                updateState,
                "fgprHdId",
                "fgprNo",
            );

            const row = Array.isArray(result)
                ? result[0]
                : Array.isArray(result?.data)
                    ? result.data[0]
                    : result?.data || result;

            if (row?.errorCount && Number(row.errorCount) > 0) {
                Swal.fire({
                    icon: "warning",
                    title: "Validation",
                    html: String(row.errorMsg || "Please complete required fields.").replace(/\r?\n/g, "<br/>")
                });
                return;
            }

            const savedNo = getValue(
                row,
                "fgprNo",
                "FGPR_NO",
                "docNo",
                "documentNo",
                "tranNo",
            ) || state.documentNo;
            const savedId = getValue(
                row,
                "fgprHdId",
                "fgprId",
                "FGPR_ID",
                "docId",
                "documentID",
            ) || state.documentID;

            updateState({
                documentNo: savedNo,
                documentID: savedId,
                isDocNoDisabled: true,
                isFetchDisabled: true,
            });

            useSwalshowSaveSuccessDialog(
                () => {
                    handleReset();
                    updateState({ topTab: "history" });
                },
                () => handleSaveAndPrint(savedId),
            );
        } catch (error) {
            console.error("FGPR save error:", error);
            Swal.fire({ icon: "error", title: "Error", text: error?.message || "Something went wrong during save." });
        } finally {
            updateState({ isLoading: false });
        }
    };

    const handleSaveAndPrint = async (docId = state.documentID) => {
        if (!docId) return;
        updateState({ showSpinner: true });
        await useHandlePrint(docId, reportDocType);
        updateState({ showSpinner: false });
    };

    const handlePrint = async () => {
        if (!state.documentID) return;
        await handleSaveAndPrint(state.documentID);
    };

    const handlePost = () => {
        if (!state.documentID) return;
        updateState({ showPostModal: true });
    };

    const handleCancel = () => {
        if (!state.documentID) return;
        updateState({ showCancelModal: true });
    };

    const handleClosePost = async (confirmation) => {
        if (!confirmation || !state.documentID) {
            updateState({ showPostModal: false });
            return;
        }

        await useHandlePostTran(
            [state.documentID],
            confirmation.password,
            endpointDocType,
            state.userCode || user?.USER_CODE || "NSI",
            (loading) => updateState({ isLoading: loading }),
            () => updateState({ showPostModal: false }),
        );

        await fetchTranData(state.documentNo, state.branchCode);
    };

    const handleCloseCancel = async (confirmation) => {
        if (!confirmation || !state.documentID) {
            updateState({ showCancelModal: false });
            return;
        }

        const result = await useHandleCancel(
            endpointDocType,
            state.documentID,
            state.userCode || user?.USER_CODE || "NSI",
            confirmation.password,
            confirmation.reason,
            updateState,
        );

        if (result?.success) await fetchTranData(state.documentNo, state.branchCode);
        updateState({ showCancelModal: false });
    };

    const handleReset = () => {
        setShowTypeDropdown(false);
        setState((prev) => ({
            ...initialState,
            detailColumns: prev.detailColumns || [],
            summaryColumns: prev.summaryColumns || [],
            topTab: prev.topTab === "history" ? "history" : "details",
        }));
    };

    const handleCopy = () => {
        updateState({ documentID: "", documentNo: "", documentStatus: "", status: "OPEN" });
    };

    const handleAttach = () => {
        Swal.fire({ icon: "info", title: "Attachment", text: "Attach document modal can be connected here if needed." });
    };

    const handleDocNoBlur = () => {
        if (state.documentNo) fetchTranData(state.documentNo, state.branchCode);
    };

    const addDetailRow = (index = null) => {
        if (isFormDisabled) return;
        const next = normalizeDetailRow(
            {
                whouseCode: state.WHCode,
                locCode: state.LocCode,
                quantity: 0,
                unitCost: 0,
                amount: 0,
            },
            state.detailRows.length,
        );

        const rows = [...state.detailRows];
        if (index === null || index === undefined) rows.push(next);
        else rows.splice(index + 1, 0, next);

        updateState({ detailRows: rows.map((row, i) => ({ ...row, lineNo: String(i + 1) })) });
    };

    const handleAddRowClick = () => {
        if (isFormDisabled) return;
        setShowTypeDropdown((prev) => !prev);
    };

    const handleOpenFGLookup = () => {
        if (isFormDisabled) return;
        setShowTypeDropdown(false);
        updateState({
            itemLookupOpen: true,
            selectedRowIndex: null,
            lookupSource: "detailItem",
        });
    };

    const handleOpenWOReferenceLookup = () => {
        if (isFormDisabled) return;

        if (!state.branchCode) {
            Swal.fire({
                icon: "info",
                title: "Branch Required",
                text: "Please select a branch first before opening Reference WO.",
            });
            return;
        }

        setShowTypeDropdown(false);
        updateState({ showWOLookup: true });
    };

    const deleteDetailRow = (index) => {
        if (isFormDisabled) return;
        const rows = state.detailRows.filter((_, i) => i !== index)
            .map((row, i) => ({ ...row, lineNo: String(i + 1) }));
        updateState({ detailRows: rows });
    };

    const addSummaryRow = (index = null) => {
        if (isFormDisabled) return;
        const next = normalizeSummaryRow({ particular: state.particular }, state.detailRowsGL.length);
        const rows = [...state.detailRowsGL];
        if (index === null || index === undefined) rows.push(next);
        else rows.splice(index + 1, 0, next);
        updateState({ detailRowsGL: rows.map((row, i) => ({ ...row, lineNo: String(i + 1) })) });
    };

    const deleteSummaryRow = (index) => {
        if (isFormDisabled) return;
        const rows = state.detailRowsGL.filter((_, i) => i !== index)
            .map((row, i) => ({ ...row, lineNo: String(i + 1) }));
        updateState({ detailRowsGL: rows });
    };

    const updateDetailRow = (index, field, value, extra = {}) => {
        const rows = [...state.detailRows];
        const row = { ...rows[index], [field]: value, ...extra };

        if (["quantity", "unitCost"].includes(field)) {
            const amount = amountRaw(row.quantity) * amountRaw(row.unitCost);
            row.itemAmount = amountValue(amount, 6);
            row.amount = row.itemAmount;
            row.totMatlCost = row.totMatlCost || row.itemAmount;
        }

        if (field === "itemAmount") {
            row.amount = value;
        }

        rows[index] = row;
        updateState({ detailRows: rows });
    };

    const updateSummaryRow = (index, field, value, extra = {}) => {
        const rows = [...state.detailRowsGL];
        rows[index] = { ...rows[index], [field]: value, ...extra };
        updateState({ detailRowsGL: rows });
    };

    const applyHeaderWarehouseToDetails = async (whCode, whName) => {
        updateState({ WHCode: whCode, WHName: whName, LocCode: "", LocName: "" });

        if (!state.detailRows.length) return;
        const result = await Swal.fire({
            icon: "question",
            title: "Apply to Details?",
            text: "Do you want to apply this Warehouse to all item details?",
            showCancelButton: true,
            confirmButtonText: "Yes, update all",
            cancelButtonText: "Header only",
        });

        if (result.isConfirmed) {
            updateState({
                detailRows: state.detailRows.map((row) => ({
                    ...row,
                    whouseCode: whCode,
                    whouseName: whName,
                    locCode: "",
                })),
            });
        }
    };

    const applyHeaderLocationToDetails = async (locCode, locName) => {
        updateState({ LocCode: locCode, LocName: locName });

        if (!state.detailRows.length) return;
        const result = await Swal.fire({
            icon: "question",
            title: "Apply to Details?",
            text: "Do you want to apply this Location to all item details?",
            showCancelButton: true,
            confirmButtonText: "Yes, update all",
            cancelButtonText: "Header only",
        });

        if (result.isConfirmed) {
            updateState({
                detailRows: state.detailRows.map((row) => ({ ...row, locCode, locName })),
            });
        }
    };

    const handleCloseBranchModal = (row) => {
        if (row) {
            updateState({
                branchCode: getValue(row, "branchCode", "BRANCH_CODE"),
                branchName: getValue(row, "branchName", "BRANCH_NAME"),
            });
        }
        updateState({ branchModalOpen: false });
    };

    const handleCloseWarehouseLookup = (row) => {
        if (row) {
            const whCode = getValue(row, "whCode", "WHCode", "WH_CODE", "whouseCode", "WHOUSE_CODE");
            const whName = getValue(row, "whName", "WHName", "WH_NAME", "whouseName", "WHOUSE_NAME");

            if (state.lookupSource === "detailWh" && state.selectedRowIndex !== null) {
                updateDetailRow(state.selectedRowIndex, "whouseCode", whCode, {
                    whouseName: whName,
                    locCode: "",
                });
            } else {
                applyHeaderWarehouseToDetails(whCode, whName);
            }
        }
        updateState({ warehouseLookupOpen: false, lookupSource: "", selectedRowIndex: null });
    };

    const handleCloseLocationLookup = (row) => {
        if (row) {
            const locCode = getValue(row, "locCode", "LocCode", "LOC_CODE");
            const locName = getValue(row, "locName", "LocName", "LOC_NAME");

            if (state.lookupSource === "detailLoc" && state.selectedRowIndex !== null) {
                updateDetailRow(state.selectedRowIndex, "locCode", locCode, { locName });
            } else {
                applyHeaderLocationToDetails(locCode, locName);
            }
        }
        updateState({ locationLookupOpen: false, lookupSource: "", selectedRowIndex: null, selectedWH: "" });
    };

    const handleCloseItemLookup = (payload) => {
        if (!payload) {
            updateState({ itemLookupOpen: false, selectedRowIndex: null });
            return;
        }

        const selectedItems = Array.isArray(payload?.records)
            ? payload.records
            : Array.isArray(payload)
                ? payload
                : [payload];

        const rows = [...state.detailRows];
        const startIndex = state.selectedRowIndex ?? rows.length;

        selectedItems.forEach((item, offset) => {
            const targetIndex = startIndex + offset;
            const normalized = normalizeDetailRow(
                {
                    ...item,
                    itemCode: getValue(item, "itemCode", "ITEM_CODE", "itemNo", "ITEM_NO"),
                    itemName: getValue(item, "itemName", "ITEM_NAME", "itemDesc", "ITEM_DESC", "fgName", "FG_NAME", "fgDesc", "FG_DESC"),
                    categCode: getValue(item, "categCode", "CATEG_CODE"),
                    uomCode: getValue(item, "uomCode", "UOM_CODE", "uom", "UOM"),
                    acctCode: getValue(item, "acctCode", "ACCT_CODE", "invacctCode", "INVACCT_CODE"),
                    whouseCode: state.WHCode,
                    locCode: state.LocCode,
                    quantity: getValue(item, "quantity", "qty") || 0,
                    unitCost: getValue(item, "unitCost", "UNIT_COST", "unitPrice", "UNIT_PRICE", "stdCost", "STD_COST", "aveCost", "AVE_COST", "avgCost", "AVG_COST", "lastCost", "LAST_COST") || 0,
                    qtyHand: getValue(item, "qtyHand", "QTY_HAND", "qtyOnHand", "QTY_ON_HAND") || 0,
                },
                targetIndex,
            );

            if (rows[targetIndex]) rows[targetIndex] = { ...rows[targetIndex], ...normalized };
            else rows.push(normalized);
        });

        updateState({
            detailRows: rows.map((row, index) => ({ ...row, lineNo: String(index + 1) })),
            itemLookupOpen: false,
            selectedRowIndex: null,
        });
    };

    const handleCloseQStatLookup = (row) => {
        if (row && state.selectedRowIndex !== null) {
            updateDetailRow(state.selectedRowIndex, "qstatCode", getValue(row, "qstatCode", "QSTAT_CODE"));
        }
        updateState({ showQstatModal: false, selectedRowIndex: null });
    };

    const handleCloseRCModal = (row) => {
        if (row) {
            const rcCode = getValue(row, "rcCode", "RC_CODE", "actCode", "ACT_CODE");
            const rcName = getValue(row, "rcName", "RC_NAME", "actName", "ACT_NAME");

            if (state.lookupSource === "detailRc" && state.selectedRowIndex !== null) {
                updateDetailRow(state.selectedRowIndex, "rcCode", rcCode, { rcName });
            } else if (state.lookupSource === "summaryRc" && state.glRowIndex !== null) {
                updateSummaryRow(state.glRowIndex, "rcCode", rcCode, { rcName });
            }
        }

        updateState({ showRCLookup: false, lookupSource: "", selectedRowIndex: null, glRowIndex: null });
    };

    const handleCloseCOALookup = (row) => {
        if (row && state.glRowIndex !== null) {
            updateSummaryRow(state.glRowIndex, "acctCode", getValue(row, "acctCode", "ACCT_CODE"), {
                acctName: getValue(row, "acctName", "ACCT_NAME"),
            });
        }
        updateState({ showCOALookup: false, glRowIndex: null });
    };

    const handleCloseSLLookup = (row) => {
        if (row) {
            const slCode = getValue(row, "slCode", "SL_CODE");
            const slName = getValue(row, "slName", "SL_NAME");

            if (state.lookupSource === "detailSl" && state.selectedRowIndex !== null) {
                updateDetailRow(state.selectedRowIndex, "slCode", slCode, { slName });
            } else if (state.lookupSource === "summarySl" && state.glRowIndex !== null) {
                updateSummaryRow(state.glRowIndex, "slCode", slCode, { slName });
            }
        }
        updateState({ showSLLookup: false, lookupSource: "", selectedRowIndex: null, glRowIndex: null });
    };

    const handleCloseVATLookup = (row) => {
        if (row && state.glRowIndex !== null) {
            updateSummaryRow(state.glRowIndex, "vatCode", getValue(row, "vatCode", "VAT_CODE"), {
                vatDesc: getValue(row, "vatDesc", "VAT_DESC", "vatName", "VAT_NAME"),
            });
        }
        updateState({ showVATLookup: false, glRowIndex: null });
    };

    const handleCloseEWTLookup = (row) => {
        if (row && state.glRowIndex !== null) {
            const atcCode = getValue(row, "atcCode", "ATC_CODE", "ewtCode", "EWT_CODE");
            const atcDesc = getValue(row, "atcName", "ATC_NAME", "atcDesc", "ATC_DESC", "ewtDesc", "EWT_DESC");
            updateSummaryRow(state.glRowIndex, "atcCode", atcCode, {
                atcDesc,
                ewtCode: atcCode,
                ewtDesc: atcDesc,
            });
        }
        updateState({ showEWTLookup: false, glRowIndex: null });
    };

    const handleClosePayeeLookup = (row) => {
        if (row) {
            updateState({
                vendCode: getValue(row, "vendCode", "vend_code", "VEND_CODE"),
                vendName: getValue(row, "vendName", "vend_name", "VEND_NAME"),
            });
        }
        updateState({ payeeLookupOpen: false });
    };

    const openAllTranDocNoLookup = useCallback((event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        updateState({ showAllTranDocNo: true });
    }, [updateState]);

    useEffect(() => {
        const handleF1Key = (event) => {
            if (event.key === "F1" || event.keyCode === 112) {
                openAllTranDocNoLookup(event);
            }
        };

        window.addEventListener("keydown", handleF1Key);

        return () => {
            window.removeEventListener("keydown", handleF1Key);
        };
    }, [openAllTranDocNoLookup]);

    const handleTranDocNoRetrieval = async (data) => {
        await fetchTranData(data.docNo, data.branchCode || state.branchCode, data.key || "");
        updateState({ showAllTranDocNo: data.modalClose });
    };

    const handleTranDocNoSelection = async (data) => {
        const docNo = getValue(data, "docNo", "fgprNo", "fgpr_no", "FGPR_NO", "documentNo");
        const branchCode = getValue(data, "branchCode", "branch_code", "BRANCH_CODE") || state.branchCode;

        handleReset();
        updateState({
            showAllTranDocNo: false,
            documentNo: docNo,
            branchCode,
        });

        if (docNo) {
            await fetchTranData(docNo, branchCode);
        }
    };

    const handleHistoryRowPick = useCallback((row) => {
        const docNo = row?.docNo || row?.fgprNo || row?.FGPR_NO;
        const branchCode = row?.branchCode || row?.BRANCH_CODE || state.branchCode;
        if (!docNo || !branchCode) return;
        fetchTranData(docNo, branchCode);
        updateState({ topTab: "details" });
    }, [state.branchCode]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const docNo = params.get("fgprNo") || params.get("fgrpNo") || params.get("docNo");
        const brCode = params.get("branchCode");

        if (!loadedFromUrlRef.current && docNo && brCode) {
            loadedFromUrlRef.current = true;
            handleHistoryRowPick({ docNo, branchCode: brCode });
            navigate(location.pathname, { replace: true });
        }
    }, [location.search, location.pathname, navigate, handleHistoryRowPick]);

    const parseWOResponse = (response) => {
        const unwrap = (value) => {
            if (value?.data?.data) return unwrap(value.data.data);
            if (value?.data) return unwrap(value.data);
            if (Array.isArray(value) && value[0]?.result !== undefined) return unwrap(value[0].result);
            if (value?.result !== undefined) return unwrap(value.result);

            if (typeof value === "string") {
                try {
                    return JSON.parse(value);
                } catch {
                    return [];
                }
            }

            return value;
        };

        const parsed = unwrap(response);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") return [parsed];

        return [];
    };

    const applyWOReference = (header, detailRowsFromResponse = null) => {
        if (!header) return;

        const rows = Array.isArray(detailRowsFromResponse)
            ? detailRowsFromResponse
            : header?.dt1 || header?.details || header?.detailRows || [];
        const woStatus = String(getValue(header, "woStatus", "WO_STATUS")).toUpperCase();

        if (woStatus && woStatus !== "C") {
            Swal.fire({
                icon: "warning",
                title: "Invalid WO Status",
                text: "Only closed Work Orders with status C are allowed for FGPR.",
            });
            return;
        }

        const woNo = getValue(header, "woNo", "WO_NO", "WoNo", "WONo", "wo_no", "worNo", "WOR_NO") || state.woNo;
        const normalizedRows = Array.isArray(rows)
            ? rows.map((row, index) => normalizeDetailRow(
                {
                    ...row,
                    whouseCode: getValue(row, "whouseCode", "WHOUSE_CODE", "whCode", "WH_CODE") || state.WHCode,
                    locCode: getValue(row, "locCode", "LOC_CODE", "LocCode") || state.LocCode,
                },
                index,
            ))
            : state.detailRows;

        updateState({
            woNo,
            refNo: woNo || state.refNo,
            particular: getValue(header, "remarks", "particular", "PARTICULAR") || state.particular,
            remarks: getValue(header, "remarks", "particular", "PARTICULAR") || state.remarks,
            vendCode: getValue(header, "vendCode", "VEND_CODE") || state.vendCode,
            vendName: getValue(header, "vendName", "VEND_NAME") || state.vendName,
            detailRows: normalizedRows.map((row, index) => ({ ...row, lineNo: String(index + 1) })),
            showWOLookup: false,
        });
    };

    const loadWOReference = async (selectedWO = null) => {
        const selectedWoNo =
            typeof selectedWO === "string"
                ? selectedWO
                : getValue(selectedWO, "woNo", "WO_NO", "WoNo", "WONo", "wo_no", "worNo", "WOR_NO");
        const selectedBranchCode =
            getValue(selectedWO, "branchCode", "BRANCH_CODE") || state.branchCode;

        if (!selectedBranchCode) {
            Swal.fire({ icon: "info", title: "Branch Required", text: "Please select a branch first." });
            return;
        }

        const woNoToLoad = selectedWoNo || state.woNo;

        if (!woNoToLoad) {
            updateState({ showWOLookup: true });
            return;
        }

        updateState({ isLoading: true });

        try {
            const response = await fetchDataJson("getFGPRWO", {
                branchCode: selectedBranchCode,
                woNo: woNoToLoad,
                whouseCode: state.WHCode,
                locCode: state.LocCode,
            });

            const rows = parseWOResponse(response);
            const header = rows[0];

            if (!header) {
                Swal.fire({
                    icon: "info",
                    title: "No Records",
                    text: "Work Order was not found, has no remaining quantity, or is not yet closed. Only WO_STATUS = C can be loaded for FGPR.",
                });
                return;
            }

            const details = Array.isArray(header?.dt1) || Array.isArray(header?.details) || Array.isArray(header?.detailRows)
                ? null
                : rows;

            applyWOReference(
                {
                    ...selectedWO,
                    ...header,
                    woNo: getValue(header, "woNo", "WO_NO", "WoNo", "WONo", "wo_no", "worNo", "WOR_NO") || woNoToLoad,
                    branchCode: selectedBranchCode,
                },
                details,
            );
        } catch (error) {
            console.error("FGPR WO load error:", error);
            Swal.fire({ icon: "error", title: "WO Load Failed", text: error?.message || "Unable to load Work Order." });
        } finally {
            updateState({ isLoading: false });
        }
    };

    const handleCloseWOLookup = async (row) => {
        if (!row) {
            updateState({ showWOLookup: false });
            return;
        }

        const selectedWoNo = getValue(row, "woNo", "WO_NO", "WoNo", "WONo", "wo_no", "worNo", "WOR_NO");

        if (!selectedWoNo || row?.dt1 || row?.details || row?.detailRows) {
            applyWOReference(row);
            return;
        }

        await loadWOReference(row);
    };

    const textInput = (value, onChange, options = {}) => (
        <input
            type="text"
            className={`w-full global-tran-td-inputclass-ui ${options.className || ""}`}
            value={value || ""}
            readOnly={options.readOnly || isFormDisabled}
            disabled={options.disabled || isFormDisabled}
            onChange={(e) => onChange(e.target.value)}
        />
    );

    const numberInput = (value, onChange, decimal = 2) => (
        <input
            type="text"
            className="w-full global-tran-td-inputclass-ui text-right"
            value={value || ""}
            readOnly={isFormDisabled}
            disabled={isFormDisabled}
            onFocus={(e) => {
                const raw = amountRaw(e.target.value);
                e.target.value = raw === 0 ? "" : String(raw);
            }}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.-]/g, ""))}
            onBlur={(e) => onChange(amountValue(e.target.value, decimal))}
        />
    );

    const lookupCell = (value, onLookup, onChange = null) => (
        <div className="relative flex items-center">
            <input
                type="text"
                className="w-full global-tran-td-inputclass-ui pr-7"
                value={value || ""}
                readOnly={!onChange || isFormDisabled}
                disabled={isFormDisabled}
                onChange={(e) => onChange?.(e.target.value)}
            />
            {!isFormDisabled && (
                <FontAwesomeIcon
                    icon={faMagnifyingGlass}
                    className="absolute right-2 cursor-pointer text-blue-600 hover:text-blue-900"
                    onClick={onLookup}
                />
            )}
        </div>
    );

    const renderDetailCell = (column, row, index) => {
        const key = column.key;
        const width = column.width || 120;
        const tdClass = `global-tran-td-ui ${column.classNames || ""}`;
        const style = { minWidth: width, width };

        const openDetailLookup = (source, modalKey) => {
            updateState({
                selectedRowIndex: index,
                lookupSource: source,
                [modalKey]: true,
                selectedWH: row.whouseCode || state.WHCode || "",
            });
        };

        const renderers = {
            lineNo: () => <span>{index + 1}</span>,
            itemCode: () => lookupCell(row.itemCode, () => openDetailLookup("detailItem", "itemLookupOpen")),
            itemName: () => textInput(row.itemName, (v) => updateDetailRow(index, "itemName", v)),
            uomCode: () => textInput(row.uomCode, (v) => updateDetailRow(index, "uomCode", v)),
            quantity: () => numberInput(row.quantity, (v) => updateDetailRow(index, "quantity", v), 2),
            unitCost: () => numberInput(row.unitCost, (v) => updateDetailRow(index, "unitCost", v), 6),
            itemAmount: () => numberInput(row.itemAmount ?? row.amount, (v) => updateDetailRow(index, "itemAmount", v), 6),
            amount: () => numberInput(row.itemAmount ?? row.amount, (v) => updateDetailRow(index, "itemAmount", v), 6),
            categCode: () => textInput(row.categCode, (v) => updateDetailRow(index, "categCode", v), { readOnly: true }),
            lotNo: () => textInput(row.lotNo, (v) => updateDetailRow(index, "lotNo", v)),
            bbDate: () => (
                <input
                    type="date"
                    className="w-full global-tran-td-inputclass-ui"
                    value={row.bbDate || ""}
                    readOnly={isFormDisabled}
                    disabled={isFormDisabled}
                    onChange={(e) => updateDetailRow(index, "bbDate", e.target.value)}
                />
            ),
            qstatCode: () => lookupCell(row.qstatCode, () => openDetailLookup("detailQstat", "showQstatModal")),
            qtyHand: () => numberInput(row.qtyHand, (v) => updateDetailRow(index, "qtyHand", v), 6),
            acctCode: () => textInput(row.acctCode, (v) => updateDetailRow(index, "acctCode", v), { readOnly: true }),
            rcCode: () => lookupCell(row.rcCode, () => openDetailLookup("detailRc", "showRCLookup")),
            sltypeCode: () => textInput(row.sltypeCode, (v) => updateDetailRow(index, "sltypeCode", v)),
            slCode: () => lookupCell(row.slCode, () => openDetailLookup("detailSl", "showSLLookup")),
            totMatlCost: () => numberInput(row.totMatlCost, (v) => updateDetailRow(index, "totMatlCost", v), 6),
            stdLabor: () => numberInput(row.stdLabor, (v) => updateDetailRow(index, "stdLabor", v), 6),
            stdOverhead: () => numberInput(row.stdOverhead, (v) => updateDetailRow(index, "stdOverhead", v), 6),
            whouseCode: () => lookupCell(row.whouseCode, () => openDetailLookup("detailWh", "warehouseLookupOpen")),
            locCode: () =>
                lookupCell(row.locCode, () => {
                    const whCode = row.whouseCode || state.WHCode || "";
                    if (!whCode) {
                        Swal.fire({
                            icon: "warning",
                            title: "Warehouse Required",
                            text: "Please select Warehouse first before selecting Location.",
                        });
                        return;
                    }
                    openDetailLookup("detailLoc", "locationLookupOpen");
                }),
        };

        return (
            <td key={`${key}-${index}`} className={tdClass} style={style}>
                {renderers[key]?.() || textInput(row[key], (v) => updateDetailRow(index, key, v))}
            </td>
        );
    };

    const renderSummaryCell = (column, row, index) => {
        const key = column.key;
        const width = column.width || 120;
        const tdClass = `global-tran-td-ui ${column.classNames || ""}`;
        const style = { minWidth: width, width };

        const renderers = {
            lineNo: () => <span>{index + 1}</span>,
            acctCode: () => lookupCell(row.acctCode, () => updateState({ glRowIndex: index, showCOALookup: true })),
            rcCode: () => lookupCell(row.rcCode, () => updateState({ glRowIndex: index, lookupSource: "summaryRc", showRCLookup: true })),
            sltypeCode: () => textInput(row.sltypeCode, (v) => updateSummaryRow(index, "sltypeCode", v)),
            slCode: () => lookupCell(row.slCode, () => updateState({ glRowIndex: index, lookupSource: "summarySl", showSLLookup: true })),
            particular: () => textInput(row.particular, (v) => updateSummaryRow(index, "particular", v)),
            vatCode: () => lookupCell(row.vatCode, () => updateState({ glRowIndex: index, showVATLookup: true })),
            vatDesc: () => textInput(row.vatDesc, (v) => updateSummaryRow(index, "vatDesc", v), { readOnly: true }),
            atcCode: () => lookupCell(row.atcCode || row.ewtCode, () => updateState({ glRowIndex: index, showEWTLookup: true })),
            atcDesc: () => textInput(row.atcDesc || row.ewtDesc, (v) => updateSummaryRow(index, "atcDesc", v), { readOnly: true }),
            ewtCode: () => lookupCell(row.atcCode || row.ewtCode, () => updateState({ glRowIndex: index, showEWTLookup: true })),
            ewtDesc: () => textInput(row.atcDesc || row.ewtDesc, (v) => updateSummaryRow(index, "ewtDesc", v), { readOnly: true }),
            debit: () => numberInput(row.debit, (v) => updateSummaryRow(index, "debit", v), 2),
            credit: () => numberInput(row.credit, (v) => updateSummaryRow(index, "credit", v), 2),
            slRefNo: () => textInput(row.slRefNo, (v) => updateSummaryRow(index, "slRefNo", v)),
            slRefDate: () => (
                <input
                    type="date"
                    className="w-full global-tran-td-inputclass-ui"
                    value={row.slRefDate || ""}
                    readOnly={isFormDisabled}
                    disabled={isFormDisabled}
                    onChange={(e) => updateSummaryRow(index, "slRefDate", e.target.value)}
                />
            ),
            dt1Lineno: () => textInput(row.dt1Lineno, (v) => updateSummaryRow(index, "dt1Lineno", v)),
            remarks: () => textInput(row.remarks, (v) => updateSummaryRow(index, "remarks", v)),
        };

        return (
            <td key={`${key}-${index}`} className={tdClass} style={style}>
                {renderers[key]?.() || textInput(row[key], (v) => updateSummaryRow(index, key, v))}
            </td>
        );
    };

    const printData = {
        doc_id: reportDocType,
        branch: state.branchCode,
        pr_no: state.documentNo,
        fgpr_no: state.documentNo,
    };

    if (state.isLoading || (state.detailColumns.length === 0 && state.summaryColumns.length === 0)) {
        return <LoadingSpinner />;
    }

    return (
        <div className="global-tran-main-div-ui">
            {state.showSpinner && <LoadingSpinner />}

            <div className="global-tran-headerToolbar-ui">
                <Header
                    docType={docType}
                    pdfLink={pdfLink}
                    videoLink={videoLink}
                    onPrint={handlePrint}
                    printData={printData}
                    onReset={handleReset}
                    onSave={() => handleActivityOption("Upsert")}
                    onGenerateGL={() => handleActivityOption("GenerateGL")}
                    onPost={handlePost}
                    onCancel={handleCancel}
                    onCopy={handleCopy}
                    onAttach={handleAttach}
                    activeTopTab={state.topTab}
                    showActions={state.topTab === "details"}
                    onDetails={() => updateState({ topTab: "details" })}
                    onHistory={() => updateState({ topTab: "history" })}
                    disableRouteNavigation
                    detailsRoute="/page/FGPR"
                    isSaveDisabled={state.isSaveDisabled || isFormDisabled}
                    isResetDisabled={state.isResetDisabled}
                    isViewDocument={state.isViewDocument}
                    isCancelDisabled={!state.documentID || isFormDisabled}
                />
            </div>

            <div className={state.topTab === "details" ? "" : "hidden"}>
                <div className="global-tran-header-ui">
                    <div className="global-tran-headertext-div-ui">
                        <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
                    </div>
                    <div className="global-tran-headerstat-div-ui">
                        <div>
                            <p className="global-tran-headerstat-text-ui">Transaction Status</p>
                            <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
                        </div>
                    </div>
                </div>

                <div className="global-tran-header-div-ui">
                    <div className="global-tran-header-tab-div-ui flex items-center justify-between">
                        <button
                            type="button"
                            className={`global-tran-tab-padding-ui ${state.activeTab === "basic"
                                    ? "global-tran-tab-text_active-ui"
                                    : "global-tran-tab-text_inactive-ui"
                                }`}
                            onClick={() => updateState({ activeTab: "basic" })}
                        >
                            Basic Information
                        </button>

                        <button
                            type="button"
                            onClick={() => updateState({ showStockCard: true })}
                            className="mr-2 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:border-blue-300 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/70"
                            title="View FG Stock Card"
                        >
                            <FontAwesomeIcon icon={faBoxesStacked} />
                            FG Stock Card
                        </button>
                    </div>

                    {state.activeTab === "basic" && (
                        <>
                            <div className="grid grid-cols-1 gap-4 rounded-lg md:grid-cols-2 lg:grid-cols-3">
                                <div className="global-tran-textbox-group-div-ui">
                                    <FieldRenderer
                                        id="branchName"
                                        label="Branch"
                                        type="lookup"
                                        value={state.branchName || ""}
                                        readOnly
                                        disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                                        lookupDisabled={state.isFetchDisabled || isFormDisabled}
                                        onLookup={() => updateState({ branchModalOpen: true })}
                                    />
                                    <FieldRenderer
                                        id="fgprNo"
                                        label="FGPR No."
                                        type="lookup"
                                        value={state.documentNo || ""}
                                        readOnly={state.isDocNoDisabled}
                                        disabled={false}
                                        lookupDisabled={false}
                                        onChange={(val) => updateState({ documentNo: val })}
                                        onLookup={openAllTranDocNoLookup}
                                        onKeyDown={(e) => {
                                            if (e.key === "F1" || e.keyCode === 112) {
                                                openAllTranDocNoLookup(e);
                                                return;
                                            }

                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleDocNoBlur();
                                            }
                                        }}
                                    />
                                    <FieldRenderer
                                        id="fgprDate"
                                        label="FGPR Date"
                                        type="date"
                                        value={state.fgprDate}
                                        onChange={(val) => updateState({ fgprDate: val })}
                                        disabled={isFormDisabled}
                                    />
                                </div>

                                <div className="global-tran-textbox-group-div-ui">
                                    <FieldRenderer
                                        id="vendCode"
                                        label="Payee Code"
                                        type="lookup"
                                        value={state.vendCode || ""}
                                        readOnly
                                        disabled={isFormDisabled}
                                        onLookup={() => updateState({ payeeLookupOpen: true })}
                                    />
                                    <FieldRenderer
                                        id="vendName"
                                        label="Payee Name"
                                        type="text"
                                        value={state.vendName || ""}
                                        onChange={(val) => updateState({ vendName: val })}
                                        disabled={isFormDisabled}
                                    />

                                    <FieldRenderer
                                        id="refNo"
                                        label="Reference No."
                                        type="text"
                                        value={state.refNo || ""}
                                        onChange={(val) => updateState({ refNo: val })}
                                        disabled={isFormDisabled}
                                    />
                                    
                                </div>

                                <div className="global-tran-textbox-group-div-ui">
                                    <FieldRenderer
                                        id="woNo"
                                        label="WO No."
                                        type="lookup"
                                        value={state.woNo || ""}
                                        onChange={(val) => updateState({ woNo: val })}
                                        onLookup={loadWOReference}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                loadWOReference();
                                            }
                                        }}
                                        disabled={isFormDisabled}
                                    />
                                    <FieldRenderer
                                        id="WHCode"
                                        label="Warehouse"
                                        type="lookup"
                                        value={state.WHCode || ""}
                                        readOnly
                                        disabled={isFormDisabled}
                                        onLookup={() => updateState({ warehouseLookupOpen: true })}
                                    />

                                    <FieldRenderer
                                        id="LocCode"
                                        label="Location"
                                        type="lookup"
                                        value={state.LocCode || ""}
                                        readOnly
                                        disabled={isFormDisabled}
                                        onLookup={() => {
                                            if (!state.WHCode) {
                                                Swal.fire({
                                                    icon: "warning",
                                                    title: "Warehouse Required",
                                                    text: "Please select Warehouse first before selecting Location.",
                                                });
                                                return;
                                            }
                                            updateState({ locationLookupOpen: true, selectedWH: state.WHCode });
                                        }}
                                    />


                                </div>

                                <div className="col-span-full">
                                    <label
                                        htmlFor="remarks"
                                        className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
                                    >
                                        Remarks
                                    </label>
                                    <textarea
                                        id="remarks"
                                        className="w-full min-h-[95px] resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                                        value={state.remarks || ""}
                                        onChange={(e) => updateState({ remarks: e.target.value })}
                                        disabled={isFormDisabled}
                                    />
                                </div>
                            </div>

                            <div className="global-tran-tab-div-ui mt-4">
                                <div className="global-tran-tab-nav-ui">
                                    <div className="flex flex-row sm:flex-row">
                                        <button
                                            type="button"
                                            className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
                                        >
                                            Item Details
                                        </button>
                                    </div>
                                </div>

                                <div className="global-tran-table-main-div-ui">
                                    <div className="global-tran-table-main-sub-div-ui">
                                        <table className="global-tran-table-ui">
                                            <thead className="global-tran-thead-div-ui">
                                                <tr>
                                                    {state.detailColumns.map((column) => (
                                                        <th
                                                            key={column.key}
                                                            className={`global-tran-th-ui ${column.classNames || ""}`}
                                                            style={{ minWidth: column.width || 120, width: column.width || 120 }}
                                                        >
                                                            {column.label}
                                                        </th>
                                                    ))}
                                                    {!isFormDisabled && (
                                                        <th className="global-tran-th-ui" style={{ minWidth: 90 }}>Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {state.detailRows.length === 0 ? (
                                                    <tr>
                                                        <td
                                                            className="global-tran-td-ui text-center text-gray-500"
                                                            colSpan={state.detailColumns.length + 1}
                                                        >
                                                            No item details yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    state.detailRows.map((row, index) => (
                                                        <tr key={row.id || index} className="global-tran-tr-ui">
                                                            {state.detailColumns.map((column) => renderDetailCell(column, row, index))}
                                                            {!isFormDisabled && (
                                                                <td className="global-tran-td-ui text-center" style={{ minWidth: 90 }}>
                                                                    <button
                                                                        type="button"
                                                                        className="global-tran-td-button-delete-ui"
                                                                        onClick={() => deleteDetailRow(index)}
                                                                        disabled={isFormDisabled}
                                                                    >
                                                                        <FontAwesomeIcon icon={faMinus} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="global-tran-tab-footer-main-div-ui">
                                    <div className="global-tran-tab-footer-button-div-ui">
                                        <div className="relative inline-block">
                                            {showTypeDropdown && (
                                                <div className="absolute bottom-[110%] left-0 z-[9999] mb-2 w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-800">
                                                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-700">
                                                        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                                                            Add Item
                                                        </div>
                                                    </div>

                                                    <div className="p-1.5">
                                                        <button
                                                            type="button"
                                                            className="mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-700"
                                                            onClick={handleOpenFGLookup}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                                                    <FontAwesomeIcon icon={faBoxesStacked} />
                                                                </span>
                                                                <div className="flex flex-col items-start">
                                                                    <span>Finished Goods</span>
                                                                    <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                                                        Add FG item
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                                                FG
                                                            </span>
                                                        </button>

                                                        <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />

                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-all duration-150 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-300 dark:hover:bg-slate-700"
                                                            onClick={handleOpenWOReferenceLookup}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                                                                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                                                                </span>
                                                                <div className="flex flex-col items-start">
                                                                    <span>Open Reference WO</span>
                                                                    <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                                                                        Pull items from WO
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-slate-700 dark:text-blue-300">
                                                                WO
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={handleAddRowClick}
                                                className="global-tran-tab-footer-button-add-ui"
                                                disabled={isFormDisabled}
                                                style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                                            >
                                                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    <div className="global-tran-tab-footer-total-main-div-ui">
                                        <div className="global-tran-tab-footer-total-div-ui">
                                            <label className="global-tran-tab-footer-total-label-ui">Total Net Amount:</label>
                                            <label className="global-tran-tab-footer-total-value-ui">{totals.amount}</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="global-tran-tab-div-ui mt-4">
                                <div className="global-tran-tab-nav-ui">
                                    <div className="flex flex-row sm:flex-row">
                                        <button
                                            type="button"
                                            className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
                                        >
                                            General Ledger
                                        </button>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleActivityOption("GenerateGL")}
                                            className="global-tran-button-generateGL"
                                            disabled={isFormDisabled}
                                            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                                        >
                                            Generate GL Entries
                                        </button>
                                    </div>
                                </div>

                                <div className="global-tran-table-main-div-ui">
                                    <div className="global-tran-table-main-sub-div-ui">
                                        <table className="global-tran-table-ui">
                                            <thead className="global-tran-thead-div-ui">
                                                <tr>
                                                    {state.summaryColumns.map((column) => (
                                                        <th
                                                            key={column.key}
                                                            className={`global-tran-th-ui ${column.classNames || ""}`}
                                                            style={{ minWidth: column.width || 120, width: column.width || 120 }}
                                                        >
                                                            {column.label}
                                                        </th>
                                                    ))}
                                                    {!isFormDisabled && (
                                                        <th className="global-tran-th-ui" style={{ minWidth: 90 }}>Actions</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {state.detailRowsGL.length === 0 ? (
                                                    <tr>
                                                        <td
                                                            className="global-tran-td-ui text-center text-gray-500"
                                                            colSpan={state.summaryColumns.length + 1}
                                                        >
                                                            No general ledger entries yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    state.detailRowsGL.map((row, index) => (
                                                        <tr key={row.id || index} className="global-tran-tr-ui">
                                                            {state.summaryColumns.map((column) => renderSummaryCell(column, row, index))}
                                                            {!isFormDisabled && (
                                                                <td className="global-tran-td-ui text-center" style={{ minWidth: 90 }}>
                                                                    <button
                                                                        type="button"
                                                                        className="global-tran-td-button-delete-ui"
                                                                        onClick={() => deleteSummaryRow(index)}
                                                                        disabled={isFormDisabled}
                                                                    >
                                                                        <FontAwesomeIcon icon={faMinus} />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="global-tran-tab-footer-main-div-ui">
                                    <div className="global-tran-tab-footer-button-div-ui">
                                        <button
                                            type="button"
                                            onClick={() => addSummaryRow()}
                                            className="global-tran-tab-footer-button-add-ui"
                                            disabled={isFormDisabled}
                                            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
                                        >
                                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                            Add
                                        </button>
                                    </div>

                                    <div className="global-tran-tab-footer-total-main-div-ui">
                                        <div className="global-tran-tab-footer-total-div-ui">
                                            <label className="global-tran-tab-footer-total-label-ui">Total Debit (PHP):</label>
                                            <label className="global-tran-tab-footer-total-value-ui">{totals.debit}</label>
                                        </div>
                                        <div className="global-tran-tab-footer-total-div-ui">
                                            <label className="global-tran-tab-footer-total-label-ui">Total Credit (PHP):</label>
                                            <label className="global-tran-tab-footer-total-value-ui">{totals.credit}</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                </div>
            </div>

            <div className={state.topTab === "history" ? "" : "hidden"}>
                <AllTranHistory
                    showHeader={false}
                    endpoint="/getFGPRHistory"
                    cacheKey={`FGPR:${state.branchCode || ""}:${state.documentNo || ""}`}
                    activeTabKey="FGPR_Summary"
                    branchCode={state.branchCode}
                    startDate={null}
                    endDate={null}
                    status="All"
                    onRowDoubleClick={handleHistoryRowPick}
                    historyExportName={`${documentTitle} History`}
                />
            </div>

            {state.branchModalOpen && (
                <BranchLookupModal
                    isOpen={state.branchModalOpen}
                    onClose={handleCloseBranchModal}
                    onSelect={handleCloseBranchModal}
                />
            )}

            {state.showWOLookup && (
                <WOLookupModal
                    isOpen={state.showWOLookup}
                    branchCode={state.branchCode}
                    whouseCode={state.WHCode}
                    locCode={state.LocCode}
                    onClose={() => updateState({ showWOLookup: false })}
                    onSelect={handleCloseWOLookup}
                />
            )}

            {state.warehouseLookupOpen && (
                <WarehouseLookupModal
                    isOpen={state.warehouseLookupOpen}
                    onClose={handleCloseWarehouseLookup}
                    onSelect={handleCloseWarehouseLookup}
                    filter="ActiveAll"
                />
            )}

            {state.locationLookupOpen && (
                <LocationLookupModal
                    isOpen={state.locationLookupOpen}
                    onClose={handleCloseLocationLookup}
                    onSelect={handleCloseLocationLookup}
                    filter="ActiveAll"
                    whCode={state.selectedWH || state.WHCode || ""}
                    WHCode={state.selectedWH || state.WHCode || ""}
                    whouseCode={state.selectedWH || state.WHCode || ""}
                />
            )}

            {state.itemLookupOpen && (
                <ItemMastLookupModal
                    isOpen={state.itemLookupOpen}
                    endpoint="getInvLookupFG"
                    onClose={handleCloseItemLookup}
                    onGetSelectedItems={handleCloseItemLookup}
                    onCancel={() => updateState({ itemLookupOpen: false, selectedRowIndex: null })}
                    enableMultiSelect
                    customParam="ActiveAll"
                    docType="PRFG"
                />
            )}

            {state.showQstatModal && (
                <QstatLookupModal
                    isOpen={state.showQstatModal}
                    onClose={handleCloseQStatLookup}
                    onSelect={handleCloseQStatLookup}
                    filter="ActiveAll"
                />
            )}

            {state.showRCLookup && (
                <RCLookupModal
                    isOpen={state.showRCLookup}
                    onClose={handleCloseRCModal}
                    onSelect={handleCloseRCModal}
                    customParam="ActiveDept"
                />
            )}

            <COAMastLookupModal
                isOpen={state.showCOALookup}
                onClose={handleCloseCOALookup}
                onSelect={handleCloseCOALookup}
            />

            <SLMastLookupModal
                isOpen={state.showSLLookup}
                onClose={handleCloseSLLookup}
                onSelect={handleCloseSLLookup}
            />

            <VATLookupModal
                isOpen={state.showVATLookup}
                onClose={handleCloseVATLookup}
                onSelect={handleCloseVATLookup}
                customParam="ActiveAll"
            />

            <ATCLookupModal
                isOpen={state.showEWTLookup}
                onClose={handleCloseEWTLookup}
                onSelect={handleCloseEWTLookup}
            />

            {state.payeeLookupOpen && (
                <PayeeMastLookupModal
                    isOpen={state.payeeLookupOpen}
                    onClose={handleClosePayeeLookup}
                    onSelect={handleClosePayeeLookup}
                />
            )}



            {state.showCancelModal && (
                <CancelTranModal
                    isOpen={state.showCancelModal}
                    onClose={handleCloseCancel}
                    onCancel={() => updateState({ showCancelModal: false })}
                />
            )}

            {state.showPostModal && (
                <PostTranModal
                    isOpen={state.showPostModal}
                    onClose={handleClosePost}
                    onCancel={() => updateState({ showPostModal: false })}
                />
            )}

            {state.showStockCard && (
                <SearchStockCard
                    isOpen={state.showStockCard}
                    module="FG"
                    onClose={() => updateState({ showStockCard: false })}
                />
            )}

            {state.showAllTranDocNo && (
                <AllTranDocNo
                    isOpen={state.showAllTranDocNo}
                    params={{
                        branchCode: state.branchCode,
                        branchName: state.branchName,
                        docType,
                        documentTitle,
                        fieldNo: "fgprNo",
                    }}
                    onRetrieve={handleTranDocNoRetrieval}
                    onResponse={{ documentNo: state.documentNo }}
                    onSelected={handleTranDocNoSelection}
                    onClose={() => updateState({ showAllTranDocNo: false })}
                />
            )}
        </div>
    );
};

export default FGPR;