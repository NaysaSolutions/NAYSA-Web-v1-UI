import React, { useState, useEffect, useRef,useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMagnifyingGlass,
  faPlus,
  faMinus,
  faTrashAlt,
  faFolderOpen,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import PaytermLookupModal from "../../../Lookup/SearchPayTermRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostAPV from "./PostAPV.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";

// Configuration
import { fetchData, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Global
import {
  docTypeNames,
  glAccountFilter,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from "@/NAYSA Cloud/Global/doctype";

import {
  useTopVatRow,
  useTopATCRow,
  useTopRCRow,
  useTopPayTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopVatAmount,
  useTopATCAmount,
} from "@/NAYSA Cloud/Global/top1RefTable";

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
} from "@/NAYSA Cloud/Global/procedure";

import {
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';

import {
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior";


// Header
import Header from "@/NAYSA Cloud/Components/Header";


const APV = () => {
  const { resetFlag } = useReset();
  const { user } = useAuth();
  const [topTab, setTopTab] = useState("details"); 
  const [state, setState] = useState({
    // HS Option
    glCurrMode: "M",
    glCurrDefault: "PHP",
    withCurr2: false,
    withCurr3: false,
    glCurrGlobal1: "",
    glCurrGlobal2: "",
    glCurrGlobal3: "",

    // Document information
    documentName: "",
    documentSeries: "Auto",
    documentDocLen: 8,
    documentID: null,
    documentNo: "",
    documentStatus: "",
    status: "OPEN",

    // UI state
    activeTab: "basic",
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,
    triggerGLEntries: false,

    // Header information
    header: {
      apv_date: new Date().toISOString().split("T")[0],
      remarks: "",
      refDocNo1: "",
      refDocNo2: "",
    },

    // Branch information
    branchCode: "HO",
    branchName: "Head Office",

    // Vendor information
    vendName: null,
    vendCode: null,

    // Currency information
    currencyCode: "",
    currencyName: "Philippine Peso",
    currencyRate: "1.000000",
    defaultCurrRate: "1.000000",

    // AP information
    apTypes: [],
    selectedApType: "APV01",
    apAccountName: "",
    apAccountCode: "",
    userCode : user?.USER_CODE,

    // Detail rows
    detailRows: [],
    detailRowsGL: [],

    // Totals
    totalDebit: "0.00",
    totalCredit: "0.00",

    // Field visibility
    fieldVisibility: {
      sltypeCode: true,
      slName: true,
      address: true,
      tin: true,
      invType: true,
      rrNo: true,
      poNo: true,
      siNo: true,
      siDate: true,
    },

    // Modal states
    modalContext: "",
    selectionContext: "",
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal: false,
    showRcModal: false,
    showVatModal: false,
    showAtcModal: false,
    showSlModal: false,
    showPaytermModal: false,
    currencyModalOpen: false,
    branchModalOpen: false,
    payeeModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showPostingModal: false,
  });

  // Helper function to update state
  const updateState = (updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  // Destructure state for easier access
  const {
    // Document info
    documentName,
    documentSeries,
    documentDocLen,
    documentID,
    documentStatus,
    documentNo,
    status,

    // Tabs & loading
    activeTab,
    GLactiveTab,
    isLoading,
    showSpinner,

    // UI states / disable flags
    isDocNoDisabled,
    isSaveDisabled,
    isResetDisabled,
    isFetchDisabled,
    triggerGLEntries,

    // Currency
    glCurrMode,
    glCurrDefault,
    withCurr2,
    withCurr3,
    glCurrGlobal1,
    glCurrGlobal2,
    glCurrGlobal3,
    defaultCurrRate,

    // Transaction Header
    branchCode,
    branchName,
    vendName,
    vendCode,
    currencyCode,
    currencyName,
    currencyRate,
    apTypes,
    selectedApType,
    apAccountName,
    apAccountCode,
    header,
    detailRows,
    detailRowsGL,
    totalDebit,
    totalCredit,
    fieldVisibility,

    // Contexts
    modalContext,
    selectionContext,
    selectedRowIndex,
    accountModalSource,

    // Modals
    showAccountModal,
    showRcModal,
    showVatModal,
    showAtcModal,
    showSlModal,
    showPaytermModal,
    currencyModalOpen,
    branchModalOpen,
    payeeModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showPostingModal,
  } = state;

  const amountRefs = useRef([]);

  const [isLoadingAPTypes, setIsLoadingAPTypes] = useState(false);
  // Document type constants
  const docType = docTypes.APV;
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || "Transaction";

  // Status Global Setup
  const displayStatus = status || "OPEN";
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = ["FINALIZED", "CANCELLED", "CLOSED"].includes(
    displayStatus
  );

  const handleHistoryRowPick = useCallback((row) => {
       const docNo = row?.docNo;
       const branchCode = row?.branchCode;
       if (!docNo || !branchCode) return;
       fetchTranData(docNo, branchCode);
       setTopTab("details");
     });

  // Field visibility based on AP type
  useEffect(() => {
    const shouldHideInvoiceDetails = selectedApType === "APV02";
    updateState({
      fieldVisibility: {
        ...fieldVisibility,
        invoiceDetails: !shouldHideInvoiceDetails,
      },
    });
  }, [selectedApType]);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="global-tran-spinner-main-div-ui">
      <div className="global-tran-spinner-sub-div-ui">
        <FontAwesomeIcon
          icon={faSpinner}
          spin
          size="2x"
          className="text-blue-500 mb-2"
        />
        <p>Please wait...</p>
      </div>
    </div>
  );

  // Effect for reset
  useEffect(() => {
    if (resetFlag) {
      handleReset();
    }

    let timer;
    if (isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }

    return () => clearTimeout(timer);
  }, [resetFlag, isLoading]);

  useEffect(() => {
    if (triggerGLEntries) {
      handleActivityOption("GenerateGL").then(() => {
        updateState({ triggerGLEntries: false });
      });
    }
  }, [triggerGLEntries]);

  // Effect for currency updates in detail rows
  useEffect(() => {
    if (vendName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map((row) => ({
        ...row,
        currency: vendName.currCode,
      }));
      updateState({ detailRows: updatedRows });
    }
  }, [vendName?.currCode]);

  // Effect for GL totals calculation
  useEffect(() => {
    const debitSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.debit) || 0),
      0
    );
    const creditSum = detailRowsGL.reduce(
      (acc, row) => acc + (parseFormattedNumber(row.credit) || 0),
      0
    );
    updateState({
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum),
    });
  }, [detailRowsGL]);

  // Effect for document number disable state
  useEffect(() => {
    updateState({ isDocNoDisabled: !!documentID });
  }, [documentID]);

  // Initialize component
  useEffect(() => {
    handleReset();
  }, []);

  // Currency mode effect
  useEffect(() => {
    if (glCurrMode && glCurrDefault && currencyCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currencyCode);
    }
  }, [glCurrMode, glCurrDefault, currencyCode]);

  // Helper functions
  const updateTotalsDisplay = (invoice, vat, atc, payable) => {
    const totalInvoiceElement = document.getElementById("totalInvoiceAmount");
    const totalVATElement = document.getElementById("totalVATAmount");
    const totalATCElement = document.getElementById("totalATCAmount");
    const totalPayableElement = document.getElementById("totalPayableAmount");

    if (totalInvoiceElement)
      totalInvoiceElement.textContent = formatNumber(invoice);
    if (totalVATElement) totalVATElement.textContent = formatNumber(vat);
    if (totalATCElement) totalATCElement.textContent = formatNumber(atc);
    if (totalPayableElement)
      totalPayableElement.textContent = formatNumber(payable);
  };

  const updateTotals = (rows) => {
    let totalInvoice = 0;
    let totalVAT = 0;
    let totalATC = 0;
    let totalPayable = 0;

    rows.forEach((row) => {
      const invoiceAmount =
        parseFormattedNumber(row.siAmount || row.amount || 0) || 0;
      const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
      const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;

      totalInvoice += invoiceAmount;
      totalVAT += vatAmount;
      totalATC += atcAmount;
    });

    totalPayable = totalInvoice + totalVAT - totalATC;
    updateTotalsDisplay(totalInvoice, totalVAT, totalATC, totalPayable);
  };

  const calculateDueDate = (startDate, daysDue) => {
    if (!startDate || isNaN(daysDue)) return "";
    try {
      const date = new Date(startDate);
      date.setDate(date.getDate() + parseInt(daysDue));
      return date.toISOString().split("T")[0];
    } catch (error) {
      console.error("Error calculating due date:", error);
      return "";
    }
  };

  // API call functions
  const loadCompanyData = async () => {
    const hsOption = await useTopHSOption();
    if (hsOption) {
      updateState({
        glCurrMode: hsOption.glCurrMode,
        glCurrDefault: hsOption.glCurrDefault,
        currencyCode: hsOption.glCurrDefault,
        glCurrGlobal1: hsOption.glCurrGlobal1,
        glCurrGlobal2: hsOption.glCurrGlobal2,
        glCurrGlobal3: hsOption.glCurrGlobal3,
      });

      const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
      if (curr) {
        updateState({
          currencyName: curr.currName,
          currencyRate: formatNumber(1, 6),
        });
      }
    }
  };

  const loadCurrencyMode = (
    mode = glCurrMode,
    defaultCurr = glCurrDefault,
    curr = currencyCode
  ) => {
    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 =
      (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

    updateState({
      glCurrMode: mode,
      withCurr2: calcWithCurr2,
      withCurr3: calcWithCurr3,
    });
  };

  const loadDocControl = async () => {
    const data = await useTopDocControlRow(docType);
    if (data) {
      updateState({
        documentName: data.docName,
        documentSeries: data.docName,
        documentDocLen: data.docName,
      });
    }
  };

  // Effect for reset
  useEffect(() => {
    if (resetFlag) {
      updateState({
        currencyCode: "",
        currencyName: "Philippine Peso",
        branchName: "",
        header: { ...header, apv_date: new Date().toISOString().split("T")[0] },
      });
      console.log("Fields in APV reset!");
    }
    getDocumentControl();

    let timer;
    if (isLoading) {
      timer = setTimeout(() => updateState({ showSpinner: true }), 200);
    } else {
      updateState({ showSpinner: false });
    }

    return () => clearTimeout(timer);
  }, [resetFlag, isLoading]);

  // API call functions
  const getDocumentControl = async () => {
    try {
      const response = await fetchData("getHSDoc", { DOC_ID: "APV" });
      if (response.success) {
        const result = JSON.parse(response.data[0].result);
        updateState({
          documentName: result[0]?.docName,
          documentSeries: result[0]?.docName,
          documentDocLen: result[0]?.docName,
        });
        await fetchApTypes();
      }
    } catch (err) {
      console.error("Document Control API error:", err);
    }
  };

  const fetchApTypes = async () => {
    try {
      const payload = {
        json_data: {
          dropdownColumn: "APVTRAN_TYPE",
          docCode: "APV",
        },
      };

      const response = await postRequest(
        "getHSDropdown",
        JSON.stringify(payload)
      );

      if (response.success) {
        const result = JSON.parse(response.data[0].result);
        const updates = { apTypes: result };

        if (result.length > 0) {
          updates.selectedApType = result[0].DROPDOWN_CODE;
        }

        updateState(updates);
      }
    } catch (error) {
      console.error("Error fetching AP Types:", error);
    }
  };

  const handleReset = () => {
    loadDocControl();
    loadCompanyData();

    updateState({
      header: {
        apv_date: new Date().toISOString().split("T")[0],
        remarks: "",
        refDocNo1: "",
        refDocNo2: "",
      },
      branchCode: "HO",
      branchName: "Head Office",
      currencyCode: "",
      currencyName: "Philippine Peso",
      currencyRate: "1.000000",
      apAccountName: "",
      apAccountCode: "",
      vendName: null,
      vendCode: null,
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      documentStatus: "",
      status: "OPEN",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
    });

    updateTotalsDisplay(0, 0, 0, 0);
  };

  const fetchTranData = async (documentNo, branchCode) => {
    const resetState = () => {
      updateState({
        documentNo: "",
        documentID: "",
        isDocNoDisabled: false,
        isFetchDisabled: false,
      });
      updateTotals([]);
    };

    updateState({ isLoading: true });

    try {
      console.log("Starting fetchTranData:", {
        documentNo,
        branchCode,
        docType,
      });

      const data = await useFetchTranData(
        documentNo,
        branchCode,
        docType,
        "apvNo"
      );

      console.log("Fetched data:", data);

      if (!data?.apvId) {
        console.warn("No apvId found in data:", data);
        Swal.fire({
          icon: "info",
          title: "No Records Found",
          text: "Transaction does not exist.",
        });
        return resetState();
      }

      // Format header date
      let apvDateForHeader = "";
      if (data.apvDate) {
        const d = new Date(data.apvDate);
        apvDateForHeader = isNaN(d) ? "" : d.toISOString().split("T")[0];
      }

      console.log("Formatted APV date:", apvDateForHeader);

      // Format detail rows with proper date handling
      const retrievedDetailRows = (data.dt1 || []).map((item, index) => {
        console.log(`Processing detail row ${index}:`, item);

        // Format invoice date (siDate)
        let formattedSiDate = "";
        if (item.siDate) {
          const siDate = new Date(item.siDate);
          formattedSiDate = isNaN(siDate)
            ? ""
            : siDate.toISOString().split("T")[0];
        }

        // Format due date
        let formattedDueDate = "";
        if (item.dueDate) {
          const dueDate = new Date(item.dueDate);
          formattedDueDate = isNaN(dueDate)
            ? ""
            : dueDate.toISOString().split("T")[0];
        }

        return {
          ...item,
          origAmount: formatNumber(item.origAmount),
          currRate: formatNumber(item.currRate),
          siAmount: formatNumber(item.siAmount),
          discRate: formatNumber(item.discRate),
          unappliedAmount: formatNumber(item.unappliedAmount),
          netDisc: formatNumber(item.netDisc),
          vatAmount: formatNumber(item.vatAmount),
          atcAmount: formatNumber(item.atcAmount),
          apvAmount: formatNumber(item.apvAmount),
          siDate: formattedSiDate,
          dueDate: formattedDueDate,
          REC_RC: item.REC_RC || "N",
          REC_SL: item.REC_SL || "N",
        };
      });

      console.log("Processed detail rows:", retrievedDetailRows);

      const formattedGLRows = (data.dt2 || []).map((glRow, index) => {
        console.log(`Processing GL row ${index}:`, glRow);
        return {
          ...glRow,
          debit: formatNumber(glRow.debit),
          credit: formatNumber(glRow.credit),
          debitFx1: formatNumber(glRow.debitFx1),
          creditFx1: formatNumber(glRow.creditFx1),
          debitFx2: formatNumber(glRow.debitFx2),
          creditFx2: formatNumber(glRow.creditFx2),
        };
      });

      console.log("Processed GL rows:", formattedGLRows);

      // Create vendor object with all necessary properties
      const vendorData = {
        vendCode: data.vendCode || "",
        vendName: data.vendName || "",
        currCode: data.currCode || "",
        tin: data.tin || "",
      };

      console.log("Vendor data:", vendorData);

      // Extract AP account information
      let apAccountCode = "";
      let apAccountName = "";

      // Check various possible field names for AP account data
      if (data.apAcct) {
        apAccountCode = data.apAcct;
      } else if (data.acctCode) {
        apAccountCode = data.acctCode;
      } else if (data.apAccountCode) {
        apAccountCode = data.apAccountCode;
      }

      // Try to get account name from different possible field names
      if (data.apAccountName) {
        apAccountName = data.apAccountName;
      } else if (data.acctName) {
        apAccountName = data.acctName;
      }

      console.log("AP Account info:", { apAccountCode, apAccountName });

      // If we have account code but no name, try to fetch the account name
      if (apAccountCode && !apAccountName) {
        try {
          console.log("Fetching AP account name for code:", apAccountCode);
          const accountResponse = await postRequest("getCOA", {
            ACCT_CODE: apAccountCode,
          });
          if (accountResponse?.success) {
            const accountData = JSON.parse(
              accountResponse.data[0]?.result || "[]"
            );
            if (accountData.length > 0) {
              apAccountName =
                accountData[0]?.acctName || accountData[0]?.ACCT_NAME || "";
              console.log("Fetched AP account name:", apAccountName);
            }
          }
        } catch (error) {
          console.warn("Could not fetch AP account name:", error);
        }
      }

      // Update state with fetched data
      const stateUpdates = {
        documentStatus: data.docStatus || "OPEN",
        status: data.docStatus || "OPEN",
        documentID: data.apvId,
        documentNo: data.apvNo,
        branchCode: data.branchCode,
        header: {
          ...header,
          apv_date: apvDateForHeader,
          remarks: data.remarks || "",
          refDocNo1: data.refapvNo1 || data.refDocNo1 || "",
          refDocNo2: data.refapvNo2 || data.refDocNo2 || "",
        },
        selectedApType: data.apvtranType || data.apvType || "APV01",
        vendCode: data.vendCode,
        vendName: vendorData,
        currencyCode: data.currCode || "PHP",
        currencyName: data.currName || "Philippine Peso",
        currencyRate: formatNumber(data.currRate || 1, 6),
        apAccountCode: apAccountCode,
        apAccountName: apAccountName,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      };

      console.log("Final state updates:", stateUpdates);
      updateState(stateUpdates);

      updateTotals(retrievedDetailRows);
    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({
        icon: "error",
        title: "Fetch Error",
        text: error.message || "Failed to fetch transaction data",
      });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleDocumentNoBlur = () => {
    console.log("Document No blur:", documentNo, "Branch:", branchCode);

    if (!documentID && documentNo && branchCode) {
      console.log("Attempting to fetch data...");
      fetchTranData(documentNo, branchCode);
    } else {
      console.log("Skipped fetch because:", {
        hasDocumentID: !!documentID,
        hasDocumentNo: !!documentNo,
        hasBranchCode: !!branchCode,
      });
    }
  };

  const handleCurrencyRateBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({
      currencyRate: isNaN(num) ? "0.000000" : num,
      withCurr2:
        (glCurrMode === "M" && glCurrDefault !== currencyCode) ||
        glCurrMode === "D",
      withCurr3: glCurrMode === "T",
    });
  };

  // Add this validation function near the other helper functions
  const validateDebitCreditBalance = () => {
    const debitTotal = parseFormattedNumber(totalDebit);
    const creditTotal = parseFormattedNumber(totalCredit);

    // Check if totals are balanced (allowing for small rounding differences)
    return Math.abs(debitTotal - creditTotal) < 0.01;
  };

  // Add this function to show the unbalanced warning
  const showUnbalancedWarning = () => {
    Swal.fire({
      icon: "error",
      title: "Cannot Save Transaction",
      html: `
      <div class="text-left">
        <p class="mb-2">Debit and Credit amounts are not balanced.</p>
        <p class="font-semibold">Total Debit: ${totalDebit}</p>
        <p class="font-semibold">Total Credit: ${totalCredit}</p>
      </div>
    `,
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });
  };

  const handleActivityOption = async (action) => {
    // Basic validation - similar to SVI.jsx
    if (action === "Upsert" && detailRowsGL.length === 0) {
      updateState({ triggerGLEntries: true });
      return;
    }

    if (!vendCode) {
      Swal.fire({
        icon: "error",
        title: "Missing Payee",
        text: "Please select a Payee before saving.",
      });
      return;
    }

    if (action === "Upsert" && !validateDebitCreditBalance()) {
      showUnbalancedWarning();
      return;
    }

    updateState({ isLoading: true });

    try {
      // Create complete data object - simplified like SVI.jsx
      const serializableGlData = {
        branchCode: branchCode,
        apvNo: documentNo || "",
        apvId: documentID || "",
        apvDate: header.apv_date,
        apvtranType: selectedApType || "APV01",
        tranMode: "M",
        apAcct: apAccountCode,
        vendCode: vendCode,
        vendName: vendName?.vendName || "",
        refapvNo1: header.refDocNo1 || "",
        refapvNo2: header.refDocNo2 || "",
        acctCode: apAccountCode,
        currCode: currencyCode || "PHP",
        currRate: parseFormattedNumber(currencyRate) || 1,
        remarks: header.remarks || "",
        userCode: "NSI",
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          invType: row.invType || "FG",
          poNo: row.poNo || "",
          rrNo: row.rrNo || "",
          joNo: "",
          svoNo: "",
          siNo: row.siNo || "",
          siDate: row.siDate || header.apv_date,
          amount: parseFormattedNumber(row.amount || 0),
          siAmount: parseFormattedNumber(row.siAmount || row.amount || 0),
          debitAcct: row.debitAcct || "",
          vatAcct: row.vatAcct || "",
          advAcct: "",
          sltypeCode: row.sltypeCode || "",
          slCode: row.slCode || vendCode || "",
          slName: row.slName || vendName?.vendName || "",
          address1: "",
          address2: "",
          address3: "",
          tin: vendName?.tin || "",
          rcCode: row.rcCode || "",
          vatCode: row.vatCode || "",
          vatAmount: parseFormattedNumber(row.vatAmount || 0),
          atcCode: row.atcCode || "",
          atcAmount: parseFormattedNumber(row.atcAmount || 0),
          paytermCode: row.paytermCode || "",
          dueDate: row.dueDate || "",
          ctrDate: "",
          advpoNo: "",
          advpoAmount: 0,
          advAtcAmount: 0,
          remarks: row.remarks || "",
          lineId: row.line_id || "",
          REC_RC: row.REC_RC || "N",
          REC_SL: row.REC_SL || "N",
        })),
        dt2: detailRowsGL.map((entry, index) => ({
          recNo: String(index + 1),
          acctCode: entry.acctCode || "",
          rcCode: entry.rcCode || "",
          slCode: entry.slCode || "",
          particular: entry.particular || "",
          vatCode: entry.vatCode || "",
          vatName: entry.vatName || "",
          atcCode: entry.atcCode || "",
          atcName: entry.atcName || "",
          debit: parseFormattedNumber(entry.debit || 0),
          credit: parseFormattedNumber(entry.credit || 0),
          debitFx1: parseFormattedNumber(entry.debitFx1 || 0),
          creditFx1: parseFormattedNumber(entry.creditFx1 || 0),
          debitFx2: parseFormattedNumber(entry.debitFx2 || 0),
          creditFx2: parseFormattedNumber(entry.creditFx2 || 0),
          slrefNo: entry.slRefNo || "",
          slrefDate: entry.slrefDate || "",
          remarks: entry.remarks || header.remarks || "",
          dt1Lineno: entry.dt1Lineno || "",
        })),
      };

      console.log("Sending data for", action, ":", serializableGlData);

      if (action === "GenerateGL") {
        const newGlEntries = await useGenerateGLEntries(
          docType,
          serializableGlData
        );
        if (newGlEntries) {
          updateState({ detailRowsGL: newGlEntries });
        }
      }

      if (action === "Upsert") {
        const response = await useTransactionUpsert(
          docType,
          serializableGlData,
          updateState,
          "apvId",
          "apvNo"
        );
        if (response) {
          useSwalshowSaveSuccessDialog(handleReset, () =>
            handleSaveAndPrint(response.data[0].apvId)
          );
          // Update state with new document ID and number
          updateState({
            documentID: response.data[0].apvId,
            documentNo: response.data[0].apvNo,
            isDocNoDisabled: true,
            isFetchDisabled: true,
          });
        }
      }
    } catch (error) {
      console.error("Error during operation:", error);
      Swal.fire({
        icon: "error",
        title: "Operation Failed",
        text: error.message || "An error occurred",
      });
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleAddRow = async () => {
    try {
      const items = await handleFetchDetail(vendCode);
      const itemList = Array.isArray(items) ? items : [items];

      const newRows = await Promise.all(
        itemList.map(async (item) => {
          const amount = parseFormattedNumber(item.origAmount || 0);
          const vatRate = await getVatRate(item.vatCode);

          return {
            lnNo: "",
            invType: "FG",
            rrNo: "",
            poNo: "",
            siNo: "",
            siDate: new Date().toISOString().split("T")[0],
            amount: formatNumber(amount),
            currency: vendName?.currCode || "",
            siAmount: formatNumber(amount),
            debitAcct: "",
            REC_RC: "N",
            rcCode: "",
            rcName: "",
            sltypeCode: item.sltypeCode || "",
            slCode: vendCode || "",
            slName: vendName?.vendName || "",
            vatCode: item.vatCode || "",
            vatName: item.vatName || "",
            vatAmount: formatNumber(amount * vatRate),
            atcCode: item.atcCode || "",
            atcName: item.atcName || "",
            atcAmount: "0.00",
            paytermCode: item.paytermCode || "",
            dueDate: new Date().toISOString().split("T")[0],
            remarks: "",
            REC_RC: item.REC_RC || "N", // Default to 'N' if not provided
            REC_SL: item.REC_SL || "N", // Default to 'N' if not provided
          };
        })
      );

      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);

      setTimeout(() => {
        const tableContainer = document.querySelector(".max-h-\\[430px\\]");
        if (tableContainer)
          tableContainer.scrollTop = tableContainer.scrollHeight;
      }, 100);
    } catch (error) {
      console.error("Error adding new row:", error);
      alert("Failed to add new row. Please select a Payee first.");
    }
  };

  const handleAddRowGL = () => {
    updateState({
      detailRowsGL: [
        ...detailRowsGL,
        {
          acctCode: "",
          rcCode: "",
          REQ_RC: "N",
          sltypeCode: "VE",
          slCode: "",
          particular: "",
          vatCode: "",
          vatName: "",
          atcCode: "",
          atcName: "",
          debit: "0.00",
          credit: "0.00",
          debitFx1: "0.00",
          creditFx1: "0.00",
          debitFx2: "0.00",
          creditFx2: "0.00",
          slRefNo: "",
          slrefDate: "",
          remarks: header.remarks || "",
        },
      ],
    });
  };

  const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
      detailRows: updatedRows,
      triggerGLEntries: true,
    });
    updateTotals(updatedRows);
  };

  const handleDeleteRowGL = (index) => {
    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows });
  };

  const handleFetchDetail = async (vendCode) => {
    if (!vendCode) return [];

    try {
      const vendPayload = {
        json_data: {
          vendCode: vendCode,
        },
      };

      const vendResponse = await postRequest(
        "addPayeeDetail",
        JSON.stringify(vendPayload)
      );
      const rawResult = vendResponse.data[0]?.result;

      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const handlePost = async () => {
    if (documentID) {
      updateState({ showPostingModal: true });
    } else {
      Swal.fire({
        icon: "warning",
        title: "No Document",
        text: "Please save the document first before posting.",
      });
    }
  };

  const handlePrint = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }
    updateState({ showSignatoryModal: true });
  };

  const handleCancel = async () => {
    console.log(
      "Cancel button clicked - Document ID:",
      documentID,
      "Status:",
      documentStatus
    );

    if (documentID) {
      if (documentStatus === "FINALIZED" || documentStatus === "CLOSED") {
        Swal.fire({
          icon: "warning",
          title: "Cannot Cancel",
          text: "This document is already finalized or closed and cannot be cancelled.",
        });
        return;
      }

      updateState({ showCancelModal: true });
    } else {
      Swal.fire({
        icon: "warning",
        title: "No Document",
        text: "Please save the document first before cancelling.",
      });
    }
  };

  const handleAttach = async () => {
    updateState({ showAttachModal: true });
  };

  const handleCopy = async () => {
    if (!detailRows || detailRows.length === 0) {
      return;
    }

    if (documentID) {
      // Clear ALL transaction data including invoice details and GL entries
      const resetDetailRows = detailRows.map((row) => ({
        ...row,
        siNo: "",
      }));

      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "OPEN",
        APVDate: new Date().toISOString().split("T")[0],
        status: "OPEN",
        detailRows: resetDetailRows, // Use the reset rows with cleared invoice numbers
        detailRowsGL: [], // Clear GL entries
      });
    }
  };

  const handleClosePost = async (confirmation) => {
    if (confirmation && documentID !== null) {
      try {
        // You'll need to implement useHandlePost similar to useHandleCancel
        const result = await handlePost(
          docType,
          documentID,
          "NSI",
          updateState
        );
        if (result && result.success) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: result.message,
          });
          await fetchTranData(documentNo, branchCode);
        }
      } catch (error) {
        console.error("Error during posting:", error);
      }
    }
    updateState({ showPostingModal: false });
  };

  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType,
  };

  const handleClosePayeeModal = async (selectedData) => {
    if (!selectedData) {
      updateState({ payeeModalOpen: false });
      return;
    }

    updateState({ payeeModalOpen: false, isLoading: true });

    try {
      // Set basic payee info
      const payeeDetails = {
        vendCode: selectedData?.vendCode || "",
        vendName: selectedData?.vendName || "",
        currCode: selectedData?.currCode || "",
        acctCode: selectedData?.acctCode || "",
      };

      updateState({
        vendName: payeeDetails,
        vendCode: selectedData.vendCode,
        apAccountCode: selectedData.acctCode || "",
        apAccountName: selectedData.acctName || "",
      });

      // Update all existing detail rows with the payee's SL Code
      const updatedRows = detailRows.map((row) => ({
        ...row,
        slCode: selectedData.vendCode,
        slName: selectedData.vendName,
      }));

      updateState({ detailRows: updatedRows });

      // FIX: Use postRequest with the correct payload structure
      if (!selectedData.currCode) {
        // The backend expects VEND_CODE as a field in the request, not wrapped in json_data
        const vendResponse = await postRequest("getVendMast", {
          VEND_CODE: selectedData.vendCode,
        });

        if (vendResponse.success) {
          const vendData = JSON.parse(vendResponse.data[0].result);
          payeeDetails.currCode = vendData[0]?.currCode;
          payeeDetails.acctCode = vendData[0]?.acctCode;
          updateState({
            vendName: payeeDetails,
            apAccountCode: vendData[0]?.acctCode || "",
            apAccountName: vendData[0]?.acctName || "",
          });
        }
      }

      await Promise.all([
        handleSelectCurrency(payeeDetails.currCode),
        handleSelectAPAccount(payeeDetails.acctCode),
      ]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };

  const handleSelectAPAccount = async (accountCode) => {
    if (accountCode) {
      try {
        // FIX: Use fetchData instead of direct axios call
        const coaResponse = await postRequest("getCOA", {
          ACCT_CODE: accountCode,
        });

        if (coaResponse.success) {
          const coaData = JSON.parse(coaResponse.data[0].result);
          updateState({
            apAccountName: coaData[0]?.acctName || coaData[0]?.ACCT_NAME || "",
            apAccountCode: coaData[0]?.acctCode || coaData[0]?.ACCT_CODE || "",
          });

          // Add REC_RC to the row data if available
          const updatedRows = [...detailRows];
          if (selectedRowIndex !== null) {
            updatedRows[selectedRowIndex] = {
              ...updatedRows[selectedRowIndex],
              REC_RC: coaData[0]?.REC_RC || "N",
            };
            updateState({ detailRows: updatedRows });
          }
        }
      } catch (error) {
        console.error("COA API error:", error);
      }
    }
  };

  const getVatRate = async (vatCode) => {
    if (!vatCode) return 0;

    try {
      const response = await fetchData("getVat", { VAT_CODE: vatCode });

      if (response.success) {
        const vatData = JSON.parse(response.data[0].result);
        const rate = vatData[0]?.vatRate;

        if (typeof rate === "number") {
          return rate;
        }

        const parsedRate = parseFloat(rate);
        if (!isNaN(parsedRate)) {
          return parsedRate;
        }

        console.warn("Unrecognized VAT rate format, defaulting to 0");
        return 0;
      }

      console.warn("getVat API failed, defaulting to 0");
      return 0;
    } catch (error) {
      console.error("Error fetching VAT rate:", error);
      return 0;
    }
  };

  const handleDetailChange = async (
    index,
    field,
    value,
    runCalculations = true
  ) => {
    const updatedRows = [...detailRows];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    };

    const row = updatedRows[index];

    // Handle account selection from modal
    if (field === "debitAcct" && typeof value === "object") {
      row.debitAcct = value.acctCode;
      row.REC_RC = value.REC_RC || "N";
    }

    // If REC_RC is No, clear RC and SL fields
    if (value.REC_RC === "N" || value.REC_RC === "No") {
      row.rcCode = "";
      row.rcName = "";
      row.slCode = vendCode || "";
      row.slName = vendName?.vendName || "";
    }

    // Handle RC code selection from modal
    if (field === "rcCode") {
      row.rcCode = value.rcCode;
      row.rcName = value.rcName;
    }

    if (field === "slCode") {
      row.slCode = value.slCode;
    }

    // Handle VAT code selection from modal
    if (field === "vatCode" && typeof value === "object") {
      row.vatCode = value.vatCode;
      row.vatName = value.vatName;
      row.vatAcct = value.acctCode; // Add vat account if available
    }

    // Handle ATC code selection from modal
    if (field === "atcCode" && typeof value === "object") {
      row.atcCode = value.atcCode;
      row.atcName = value.atcName;
    }

    // Always update siAmount when amount changes, even if not calculating yet
    if (field === "amount") {
      row.siAmount = value;
    }

    if (runCalculations) {
      const origAmount = parseFormattedNumber(row.amount) || 0;
      const origVatCode = row.vatCode || "";
      const origAtcCode = row.atcCode || "";

      // Shared calculation logic similar to SVI.jsx
      async function recalcRow(newAmount) {
        const newVatAmount = origVatCode
          ? await useTopVatAmount(origVatCode, newAmount)
          : 0;
        const newNetOfVat = +(newAmount - newVatAmount).toFixed(2);
        const newATCAmount = origAtcCode
          ? await useTopATCAmount(origAtcCode, newNetOfVat)
          : 0;
        const newPayableAmount = +(newAmount - newATCAmount).toFixed(2);

        row.siAmount = formatNumber(newAmount);
        row.vatAmount = formatNumber(newVatAmount);
        row.atcAmount = formatNumber(newATCAmount);
        row.amount = formatNumber(newAmount);
      }

      // Handle amount changes (similar to SVI quantity/unitPrice changes)
      if (field === "amount") {
        const newAmount = parseFormattedNumber(row.amount) || 0;
        await recalcRow(newAmount);
      }

      // Handle VAT code changes
      if (field === "vatCode") {
        async function updateVat() {
          const currentAmount = parseFormattedNumber(row.amount) || 0;
          const newVatAmount = row.vatCode
            ? await useTopVatAmount(row.vatCode, currentAmount)
            : 0;
          const newNetOfVat = +(currentAmount - newVatAmount).toFixed(2);
          const newATCAmount = row.atcCode
            ? await useTopATCAmount(row.atcCode, newNetOfVat)
            : 0;

          row.vatAmount = formatNumber(newVatAmount);
          row.atcAmount = formatNumber(newATCAmount);
        }
        await updateVat();
      }

      // Handle ATC code changes
      if (field === "atcCode") {
        async function updateAtc() {
          const currentAmount = parseFormattedNumber(row.amount) || 0;
          const currentVatAmount = parseFormattedNumber(row.vatAmount) || 0;
          const newNetOfVat = +(currentAmount - currentVatAmount).toFixed(2);
          const newATCAmount = row.atcCode
            ? await useTopATCAmount(row.atcCode, newNetOfVat)
            : 0;

          row.atcAmount = formatNumber(newATCAmount);
        }
        await updateAtc();
      }

      // Due Date recalculation
      if (field === "paytermCode") {
        const paytermData = await useTopPayTermRow(value);
        if (paytermData && paytermData.daysDue && header.apv_date) {
          const newDueDate = calculateDueDate(
            header.apv_date,
            paytermData.daysDue
          );
          row.dueDate = newDueDate;
        } else {
          row.dueDate = "";
        }
      }

      // Format amount and siAmount with 2 decimal places when calculations are run
      if (field === "amount") {
        const num = parseFormattedNumber(value);
        if (!isNaN(num)) {
          row.amount = formatNumber(num);
          row.siAmount = formatNumber(num);
        }
      }
    }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const updatedRowsGL = [...detailRowsGL];
    const row = { ...updatedRowsGL[index] };

    const parsedValue = parseFormattedNumber(value);
    row[field] = formatNumber(parsedValue);

    if (
      autoCompute &&
      ((withCurr2 && currencyCode !== glCurrDefault) || withCurr3)
    ) {
      if (
        [
          "debit",
          "credit",
          "debitFx1",
          "creditFx1",
          "debitFx2",
          "creditFx2",
        ].includes(field)
      ) {
        const data = await useUpdateRowEditEntries(
          row,
          field,
          value,
          currencyCode,
          currencyRate,
          header.apv_date
        );
        if (data) {
          row.debit = formatNumber(data.debit);
          row.credit = formatNumber(data.credit);
          row.debitFx1 = formatNumber(data.debitFx1);
          row.creditFx1 = formatNumber(data.creditFx1);
          row.debitFx2 = formatNumber(data.debitFx2);
          row.creditFx2 = formatNumber(data.creditFx2);
        }
      }
    } else {
      const pairs = [
        ["debit", "credit"],
        ["debitFx1", "creditFx1"],
        ["debitFx2", "creditFx2"],
      ];

      pairs.forEach(([a, b]) => {
        if (field === a && parsedValue > 0) {
          row[b] = formatNumber(0);
        } else if (field === b && parsedValue > 0) {
          row[a] = formatNumber(0);
        }
      });
    }

    updatedRowsGL[index] = row;
    updateState({ detailRowsGL: updatedRowsGL });
  };

  const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...state.detailRowsGL];
    let row = { ...updatedRowsGL[index] };

    if (
      [
        "acctCode",
        "slCode",
        "rcCode",
        "sltypeCode",
        "vatCode",
        "atcCode",
      ].includes(field)
    ) {
      const data = await useUpdateRowGLEntries(
        row,
        field,
        value,
        vendCode,
        docType
      );
      if (data) {
        row.acctCode = data.acctCode;
        row.sltypeCode = data.sltypeCode;
        row.slCode = data.slCode;
        row.rcCode = data.rcCode || (data.REQ_RC === "Y" ? "REQ RC" : "");
        row.rcName = data.rcName;
        row.vatCode = data.vatCode;
        row.vatName = data.vatName;
        row.atcCode = data.atcCode;
        row.atcName = data.atcName;
        row.particular = data.particular;
        row.slRefNo = data.slRefNo;
        row.slRefDate = data.slRefDate;
      }
    }

    if (
      [
        "debit",
        "credit",
        "debitFx1",
        "creditFx1",
        "debitFx2",
        "creditFx2",
      ].includes(field)
    ) {
      row[field] = value;
      const parsedValue = parseFormattedNumber(value);
      const pairs = {
        debit: "credit",
        credit: "debit",
        debitFx1: "creditFx1",
        creditFx1: "debitFx1",
        debitFx2: "creditFx2",
        creditFx2: "debitFx2",
      };

      if (parsedValue > 0 && pairs[field]) {
        row[pairs[field]] = "0.00";
      }
    }

    if (["slRefNo", "slRefDate", "remarks"].includes(field)) {
      row[field] = value;
    }

    updatedRowsGL[index] = row;
    updateState({ detailRowsGL: updatedRowsGL });
  };

  // In your COA lookup component, make sure to include REC_RC in the returned data
  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount && selectedRowIndex !== null) {
      const specialAccounts = ["debitAcct", "apAcct", "vatAcct"];
      if (specialAccounts.includes(accountModalSource)) {
        // Add REC_RC to the row data
        handleDetailChange(
          selectedRowIndex,
          accountModalSource,
          {
            ...selectedAccount,
            REC_RC: selectedAccount.REC_RC || "N", // Ensure this is set
          },
          false
        );
      } else {
        handleDetailChangeGL(selectedRowIndex, "acctCode", selectedAccount);
      }
    }
    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseRcModal = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      const result = await useTopRCRow(selectedRc.rcCode);
      if (result) {
        handleDetailChange(selectedRowIndex, "rcCode", result, false);
      }
    }
    updateState({
      showRcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, "rcCode", selectedRc, false);
      } else {
        const result = await useTopRCRow(selectedRc.rcCode);
        if (result) {
          handleDetailChangeGL(selectedRowIndex, "rcCode", result);
        }
      }
      updateState({
        showRcModal: false,
        selectedRowIndex: null,
        accountModalSource: null,
      });
    }
  };

  const handleCloseSlModal = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      handleDetailChange(selectedRowIndex, "slCode", selectedSl, false);
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null,
    });
  };

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, "slCode", selectedSl, false);
      } else {
        handleDetailChangeGL(selectedRowIndex, "slCode", selectedSl);
        //  const result = await useTopRCRow(selectedSl.slCode);
        //   if (result) {
        //     handleDetailChangeGL(selectedRowIndex, 'slCode', result);
        //   }
      }
      updateState({
        showSlModal: false,
        selectedRowIndex: null,
        accountModalSource: null,
      });
    }
  };

  const handleCloseCancel = async (confirmation) => {
    console.log("Close cancel called with:", confirmation);
    console.log("Document Status:", documentStatus, "Document ID:", documentID);

    if (confirmation && confirmation.reason && documentID) {
      try {
        console.log("Attempting to cancel document:", documentID);

        const result = await useHandleCancel(
          docType,
          documentID,
          "NSI",
          confirmation.reason,
          updateState
        );
        console.log("Cancel result:", result);

        // Check if result exists and has success property
        if (result && result.success) {
          Swal.fire({
            icon: "success",
            title: "Success",
            text: result.message || "Document cancelled successfully",
          });

          // Refresh the data
          if (documentNo && branchCode) {
            await fetchTranData(documentNo, branchCode);
          }
        } else {
          // Handle failure case
          Swal.fire({
            icon: "error",
            title: "Cancel Failed",
            text: result?.message || "Failed to cancel document",
          });
        }
      } catch (error) {
        console.error("Error in handleCloseCancel:", error);
        Swal.fire({
          icon: "error",
          title: "Cancel Error",
          text: error.message || "An unexpected error occurred",
        });
      }
    } else {
      console.log("Cancel cancelled or missing data:", {
        hasConfirmation: !!confirmation,
        hasReason: confirmation?.reason,
        hasDocumentID: !!documentID,
      });
    }

    updateState({ showCancelModal: false });
  };

  const handleCloseSignatory = async (mode) => {
  console.log("ðŸ”„ handleCloseSignatory called with mode:", mode);
  console.log("ðŸ“„ Current document state:", {
    documentID,
    documentNo,
    docType,
    status: documentStatus
  });

  if (!documentID) {
    console.error("âŒ Cannot print: documentID is undefined!");
    Swal.fire({
      icon: "error",
      title: "Cannot Print",
      text: "Document ID is missing. Please save the document first.",
    });
    updateState({ showSignatoryModal: false });
    return;
  }

  updateState({ 
    showSpinner: true,
    showSignatoryModal: false,
    noReprints: mode === "Final" ? 1 : 0, 
  });
  
  try {
    console.log("ðŸ–¨ï¸ Calling useHandlePrint with:", { 
      documentID, 
      docType, 
      mode,
      timestamp: new Date().toISOString()
    });
    
    await useHandlePrint(documentID, docType, mode);
    
    console.log("âœ… Printing completed successfully");
  } catch (error) {
    console.error("âŒ Printing failed:", error);
    Swal.fire({
      icon: "error",
      title: "Print Failed",
      text: error.message || "Failed to generate print document",
    });
  } finally {
    updateState({ showSpinner: false });
  }
};
  

  const handleSaveAndPrint = async (documentID) => {
    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);
    updateState({ showSpinner: false });
  };

  const handleCloseVatModal = async (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      handleDetailChange(selectedRowIndex, "vatCode", result, true);
    }
    updateState({
      showVatModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseVatModalGL = async (selectedVat) => {
    if (selectedVat && selectedRowIndex !== null) {
      const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      handleDetailChangeGL(selectedRowIndex, "vatCode", result);
    }
    updateState({
      showVatModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseAtcModal = async (selectedAtc) => {
    if (selectedAtc && selectedRowIndex !== null) {
      const result = await useTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      handleDetailChange(selectedRowIndex, "atcCode", result, true);
    }
    updateState({
      showAtcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseAtcModalGL = async (selectedAtc) => {
    if (selectedAtc && selectedRowIndex !== null) {
      const result = await useTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      handleDetailChangeGL(selectedRowIndex, "atcCode", result);
    }
    updateState({
      showAtcModal: false,
      selectedRowIndex: null,
      accountModalSource: null,
    });
  };

  const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
        branchCode: selectedBranch.branchCode,
        branchName: selectedBranch.branchName,
      });
    }
    updateState({ branchModalOpen: false });
  };

  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
      handleSelectCurrency(selectedCurrency.currCode);
    }
    updateState({ currencyModalOpen: false });
  };

  const handleSelectCurrency = async (currCode) => {
    if (currCode) {
      const result = await useTopCurrencyRow(currCode);
      if (result) {
        const rate =
          currCode === glCurrDefault
            ? defaultCurrRate
            : await useTopForexRate(currCode, header.apv_date);

        // Make sure to parse and format the rate properly
        const formattedRate = formatNumber(parseFormattedNumber(rate || 1), 6);

        updateState({
          currencyCode: result.currCode,
          currencyName: result.currName,
          currencyRate: formattedRate,
        });
      }
    }
  };

  const handleClosePaytermModal = async (selectedPayterm) => {
    if (selectedPayterm && selectedRowIndex !== null) {
      handleSelectPayTerm(selectedPayterm.paytermCode);
    }
    updateState({ showPaytermModal: false });
  };

  const handleSelectPayTerm = async (paytermCode) => {
    if (paytermCode) {
      const result = await useTopPayTermRow(paytermCode);
      if (result) {
        const updatedRows = [...detailRows];
        if (selectedRowIndex !== null) {
          updatedRows[selectedRowIndex] = {
            ...updatedRows[selectedRowIndex],
            paytermCode: result.paytermCode,
            paytermName: result.paytermName,
            dueDate: calculateDueDate(header.apv_date, result.daysDue),
          };
          updateState({ detailRows: updatedRows });
        }
      }
    }
  };

  const getAtcRate = async (atcCode) => {
    if (!atcCode) return 0;

    try {
      const response = await fetchData("getATC", { ATC_CODE: atcCode });

      if (response.success) {
        const atcData = JSON.parse(response.data[0].result);
        const rate = atcData[0]?.atcRate;

        const parsedRate = parseFloat(rate);
        if (!isNaN(parsedRate)) {
          return parsedRate;
        }

        console.warn("Unrecognized ATC rate format, defaulting to 0");
        return 0;
      }

      console.warn("getATC API failed, defaulting to 0");
      return 0;
    } catch (error) {
      console.error("Error fetching ATC rate:", error);
      return 0;
    }
  };

  // SL Code double-click handler
  const handleSlDoubleClick = (index) => {
    const currentValue = detailRows[index]?.slCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        slCode: vendCode || "",
        slName: vendName?.vendName || "",
      };
      updateState({ detailRows: updatedRows });
    } else {
      updateState({
        selectedRowIndex: index,
        showSlModal: true,
      });
    }
  };

  // DR Account double-click handler
  const handleAccountDoubleDtl1Click = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      debitAcct: "",
      debitAcctName: "",
    };
    updateState({ detailRows: updatedRows });
  };

  // RC Code double-click handler
  const handleRcDoubleDtl1Click = (index) => {
    const currentValue = detailRows[index]?.rcCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        rcCode: "",
        rcName: "",
      };
      updateState({ detailRows: updatedRows });
    } else {
      updateState({
        selectedRowIndex: index,
        showRcModal: true,
      });
    }
  };

  // VAT Code double-click handler
  const handleVatDoubleDtl1Click = (index) => {
    const currentValue = detailRows[index]?.vatCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        vatCode: "",
        vatName: "",
        vatAmount: "0.00",
      };
      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);
    } else {
      updateState({
        selectedRowIndex: index,
        showVatModal: true,
      });
    }
  };

  // ATC double-click handler
  const handleAtcDoubleDtl1Click = (index) => {
    const currentValue = detailRows[index]?.atcCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        atcCode: "",
        atcName: "",
        atcAmount: "0.00",
      };
      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);
    } else {
      updateState({
        selectedRowIndex: index,
        showAtcModal: true,
      });
    }
  };

  // Payment Terms double-click handler
  const handlePaytermDoubleClick = (index) => {
    const currentValue = detailRows[index]?.paytermCode;
    const updatedRows = [...detailRows];

    if (currentValue) {
      updatedRows[index] = {
        ...updatedRows[index],
        paytermCode: "",
        paytermName: "",
        dueDate: new Date().toISOString().split("T")[0],
      };
      updateState({ detailRows: updatedRows });
    } else {
      updateState({
        selectedRowIndex: index,
        showPaytermModal: true,
      });
    }
  };

  // ATC Name double-click handler
  const handleAtcNameDoubleClick = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      atcCode: "",
      atcName: "",
      atcAmount: "0.00",
    };
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  // VAT Name double-click handler
  const handleVatNameDoubleClick = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      vatCode: "",
      vatName: "",
      vatAmount: "0.00",
    };
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  // RC Name double-click handler
  const handleRcNameDoubleClick = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      rcCode: "",
      rcName: "",
    };
    updateState({ detailRows: updatedRows });
  };

  // Payment Terms Name double-click handler
  const handlePaytermNameDoubleClick = (index) => {
    const updatedRows = [...detailRows];
    updatedRows[index] = {
      ...updatedRows[index],
      paytermCode: "",
      paytermName: "",
      dueDate: new Date().toISOString().split("T")[0],
    };
    updateState({ detailRows: updatedRows });
  };

  // Handle AP Type Change
  const handleAPTypeChange = (event) => {
    const selectedType = event.target.value;
    updateState({ selectedApType: selectedType });

    // Default: show all fields
    let visibility = {
      sltypeCode: true,
      slName: true,
      address: true,
      tin: true,
      invType: true,
      rrNo: true,
      poNo: true,
      siNo: true,
      siDate: true,
    };

    switch (selectedType) {
      case "APV01": // purchases
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;
        break;

      case "APV02": // non purchases
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.siNo = false;
        visibility.siDate = false;
        break;

      case "APV03": // advances
        visibility.sltypeCode = false;
        visibility.slName = false;
        visibility.address = false;
        visibility.tin = false;
        break;

      case "APV05": // reimbursements
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.sltypeCode = true;
        visibility.slName = true;
        visibility.address = true;
        visibility.tin = true;
        break;

      case "APV06": // liquidation
        visibility.invType = false;
        visibility.rrNo = false;
        visibility.poNo = false;
        visibility.sltypeCode = true;
        visibility.slName = true;
        visibility.address = true;
        visibility.tin = true;
        break;

      default:
        break;
    }

    updateState({ fieldVisibility: visibility });
  };

  // Render the component
  return (
    <div className="global-tran-main-div-ui">
      {/* Loading spinner overlay */}
      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
        <Header 
              docType={docType} 
              pdfLink={pdfLink} 
              videoLink={videoLink}
              onPrint={handlePrint} 
              onPost={handlePost} 
              printData={printData} 
              onReset={handleReset}
              onSave={() => handleActivityOption("Upsert")}
              onCancel={handleCancel} 
              onCopy={handleCopy} 
              onAttach={handleAttach}
              activeTopTab={topTab} 
              showActions={topTab === "details"} 
              showBIRForm={false}      
              onDetails={() => setTopTab("details")}
              onHistory={() => setTopTab("history")}
              disableRouteNavigation={true}         
              isSaveDisabled={isSaveDisabled} // Pass disabled state
              isResetDisabled={isResetDisabled} // Pass disabled state
              detailsRoute="/page/APV"
        />

      </div>

      <div className={topTab === "details" ? "" : "hidden"}></div>

      {/* Page title and subheading */}
      {/* Header Section */}
      <div className="global-tran-header-ui">
        <div className="global-tran-headertext-div-ui">
          <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="global-tran-headerstat-div-ui">
          <div>
            <p className="global-tran-headerstat-text-ui">Transaction Status</p>
            <h1 className={`global-tran-stat-text-ui ${statusColor}`}>
              {displayStatus}
            </h1>
          </div>
        </div>
      </div>

      {/* Form Layout with Tabs */}
      <div className="global-tran-header-div-ui">
        {/* Tab Navigation */}
        <div className="global-tran-header-tab-div-ui">
          <button
            className={`global-tran-tab-padding-ui ${
              activeTab === "basic"
                ? "global-tran-tab-text_active-ui"
                : "global-tran-tab-text_inactive-ui"
            }`}
            onClick={() => updateState({ activeTab: "basic" })}
          >
            Basic Information
          </button>
        </div>

        {/* APV Header Form Section */}
        <div
          id="apv_hd"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative"
        >
          {/* Column 1 */}
          <div className="global-tran-textbox-group-div-ui">
            {/* Branch Name Input with lookup button */}
            <div className="relative">
              <input
                type="text"
                id="branchName"
                placeholder=" "
                value={branchName || ""}
                readOnly
                className="peer global-tran-textbox-ui"
                disabled={isFormDisabled}
              />
              <label
                htmlFor="branchName"
                className="global-tran-floating-label"
              >
                Branch
              </label>

              {/* Button to open branch lookup modal */}
              <button
                type="button"
                onClick={() => updateState({ branchModalOpen: true })}
                className={`global-tran-textbox-button-search-padding-ui ${
                  isFetchDisabled
                    ? "global-tran-textbox-button-search-disabled-ui"
                    : "global-tran-textbox-button-search-enabled-ui"
                } global-tran-textbox-button-search-ui`}
                disabled={isFormDisabled}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>

            {/* APV Number Field */}
            <div className="relative">
              <input
                type="text"
                id="apvNo"
                value={documentNo}
                onChange={(e) => updateState({ documentNo: e.target.value })}
                onBlur={handleDocumentNoBlur}
                placeholder=" "
                className={`peer global-tran-textbox-ui ${
                  isDocNoDisabled ? "bg-gray-100 cursor-not-allowed" : ""
                }`}
                disabled={isDocNoDisabled}
              />
              <label htmlFor="apvNo" className="global-tran-floating-label">
                APV No.
              </label>
              <button
                onClick={() => fetchTranData(documentNo, branchCode)}
                className={`global-tran-textbox-button-search-padding-ui ${
                  isFetchDisabled || isDocNoDisabled
                    ? "global-tran-textbox-button-search-disabled-ui"
                    : "global-tran-textbox-button-search-enabled-ui"
                } global-tran-textbox-button-search-ui`}
                disabled={isDocNoDisabled}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>

            {/* APV Date Picker */}
            <div className="relative">
              <input
                type="date"
                id="APVDate"
                className="peer global-tran-textbox-ui"
                value={header.apv_date}
                onChange={(e) =>
                  updateState({
                    header: { ...header, apv_date: e.target.value },
                  })
                }
                disabled={isFormDisabled}
              />
              <label htmlFor="APVDate" className="global-tran-floating-label">
                APV Date
              </label>
            </div>
          </div>

          {/* Column 2 */}
          <div className="global-tran-textbox-group-div-ui">
            {/* Payee Code Input with optional lookup */}
            <div className="relative">
              <input
                type="text"
                id="payeeCode"
                value={vendName?.vendCode || ""}
                readOnly
                placeholder=" "
                className="peer global-tran-textbox-ui"
                disabled={isFormDisabled}
              />
              <label htmlFor="payeeCode" className="global-tran-floating-label">
                <span className="global-tran-asterisk-ui"> * </span>
                Payee Code
              </label>
              <button
                type="button"
                onClick={() => updateState({ payeeModalOpen: true })}
                className={`global-tran-textbox-button-search-padding-ui ${
                  isFetchDisabled
                    ? "global-tran-textbox-button-search-disabled-ui"
                    : "global-tran-textbox-button-search-enabled-ui"
                } global-tran-textbox-button-search-ui`}
                disabled={isFormDisabled}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>

            {/* Payee Name Display */}
            <div className="relative">
              <input
                type="text"
                id="payeeName"
                placeholder=" "
                value={vendName?.vendName || ""}
                className="peer global-tran-textbox-ui"
                disabled={isFormDisabled}
              />
              <label htmlFor="payeeName" className="global-tran-floating-label">
                <span className="global-tran-asterisk-ui"> * </span>
                Payee Name
              </label>
            </div>

            {/* AP Account Code Input */}
            <div className="relative">
              <input
                type="hidden"
                id="apAccountCode"
                value={apAccountCode || ""}
              />
              <input
                type="text"
                id="apAccountName"
                value={apAccountName || ""}
                placeholder=" "
                readOnly
                className="peer global-tran-textbox-ui"
                disabled={isFormDisabled}
              />
              <label
                htmlFor="apAccountName"
                className="global-tran-floating-label"
              >
                AP Account
              </label>
              <button
                type="button"
                onClick={() =>
                  updateState({
                    showAccountModal: true,
                    accountModalSource: "apAccount",
                  })
                }
                className={`global-tran-textbox-button-search-padding-ui ${
                  isFetchDisabled
                    ? "global-tran-textbox-button-search-disabled-ui"
                    : "global-tran-textbox-button-search-enabled-ui"
                } global-tran-textbox-button-search-ui`}
                disabled={isFormDisabled}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>
          </div>

          {/* Column 3 */}
          <div className="global-tran-textbox-group-div-ui">
            <div className="relative">
              <input
                type="text"
                id="currCode"
                placeholder=" "
                value={currencyName}
                readOnly
                className="peer global-tran-textbox-ui"
                disabled={isFormDisabled}
              />
              <label htmlFor="currCode" className="global-tran-floating-label">
                Currency
              </label>
              <button
                onClick={() => updateState({ currencyModalOpen: true })}
                className={`global-tran-textbox-button-search-padding-ui ${
                  isFetchDisabled
                    ? "global-tran-textbox-button-search-disabled-ui"
                    : "global-tran-textbox-button-search-enabled-ui"
                } global-tran-textbox-button-search-ui`}
                disabled={isFormDisabled}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                id="currRate"
                value={currencyRate}
                onChange={(e) => updateState({ currencyRate: e.target.value })}
                onBlur={handleCurrencyRateBlur}
                placeholder=" "
                className="peer global-tran-textbox-ui"
                disabled={isFormDisabled || glCurrDefault === currencyCode}
              />
              <label htmlFor="currRate" className="global-tran-floating-label">
                Currency Rate
              </label>
            </div>

            <div className="relative">
              <select
                id="apType"
                className="peer global-tran-textbox-ui"
                value={selectedApType}
                onChange={handleAPTypeChange}
              >
                <option value="">Select AP Type</option>
                {apTypes.map((type) => (
                  <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                    {type.DROPDOWN_NAME}
                  </option>
                ))}
              </select>
              <label htmlFor="apType" className="global-tran-floating-label">
                AP Type
              </label>

              {/* Dropdown Icon */}
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg
                  className="h-4 w-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Column 4 */}
          <div className="global-tran-textbox-group-div-ui">
            <div className="relative">
              <input
                type="text"
                id="refDocNo1"
                placeholder=" "
                value={header.refDocNo1 || ""}
                onChange={(e) =>
                  updateState({
                    header: { ...header, refDocNo1: e.target.value },
                  })
                }
                className="peer global-tran-textbox-ui"
                disabled={isFormDisabled}
              />
              <label htmlFor="refDocNo1" className="global-tran-floating-label">
                Ref Doc No. 1
              </label>
            </div>

            <div className="relative">
              <input
                type="text"
                id="refDocNo2"
                placeholder=" "
                value={header.refDocNo2 || ""}
                onChange={(e) =>
                  updateState({
                    header: { ...header, refDocNo2: e.target.value },
                  })
                }
                className="peer global-tran-textbox-ui"
                disabled={isFormDisabled}
              />
              <label htmlFor="refDocNo2" className="global-tran-floating-label">
                Ref Doc No. 2
              </label>
            </div>
          </div>

          {/* Remarks Section */}
          {/* Column 4 - Remarks */}
          <div className="col-span-full">
            <div className="relative w-full p-2">
              <textarea
                id="remarks"
                placeholder=""
                rows={5}
                className="peer global-tran-textbox-remarks-ui"
                value={header.remarks || ""}
                onChange={(e) =>
                  updateState({
                    header: { ...header, remarks: e.target.value },
                  })
                }
                disabled={isFormDisabled}
              />
              <label
                htmlFor="remarks"
                className="global-tran-floating-label-remarks"
              >
                Remarks
              </label>
            </div>
          </div>
        </div>
      </div>
      <br />

      {fieldVisibility.invoiceDetails && (
        <>
          {/* APV Detail Section */}
          <div id="apv_dtl" className="global-tran-tab-div-ui">
            {/* Tab Navigation */}
            <div className="global-tran-tab-nav-ui">
              {/* Tabs */}
              <div className="flex flex-row sm:flex-row">
                <button
                  className={`global-tran-tab-padding-ui ${
                    GLactiveTab === "invoice"
                      ? "global-tran-tab-text_active-ui"
                      : "global-tran-tab-text_inactive-ui"
                  }`}
                  onClick={() => updateState({ GLactiveTab: "invoice" })}
                  disabled={isFormDisabled}
                >
                  Invoice Details
                </button>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  className="global-tran-button-lookup"
                  disabled={isFormDisabled}
                >
                  Get Reference RR
                </button>
              </div>
            </div>

            {/* Invoice Details Button */}
            <div className="global-tran-table-main-div-ui">
              <div className="global-tran-table-main-sub-div-ui">
                <table className="min-w-full border-collapse">
                  <thead className="global-tran-thead-div-ui">
                    <tr>
                      <th className="global-tran-th-ui">LN</th>
                      {fieldVisibility.invType && (
                        <th className="global-tran-th-ui">Type</th>
                      )}
                      {fieldVisibility.rrNo && (
                        <th className="global-tran-th-ui">RR No.</th>
                      )}
                      {fieldVisibility.poNo && (
                        <th className="global-tran-th-ui">PO/JO No.</th>
                      )}
                      <th className="global-tran-th-ui">Invoice No.</th>
                      <th className="global-tran-th-ui">Invoice Date</th>
                      <th className="global-tran-th-ui">Original Amount</th>
                      <th className="global-tran-th-ui">Currency</th>
                      <th className="global-tran-th-ui">Invoice Amount</th>
                      <th className="global-tran-th-ui">DR Account</th>
                      <th className="global-tran-th-ui">RC Code</th>
                      <th className="global-tran-th-ui">RC Name</th>
                      {fieldVisibility.sltypeCode && (
                        <th className="global-tran-th-ui" id="sltypeCode">
                          SL Type Code
                        </th>
                      )}
                      {fieldVisibility.slName && (
                        <th className="global-tran-th-ui">SL Code</th>
                      )}
                      <th className="global-tran-th-ui">VAT Code</th>
                      <th className="global-tran-th-ui">VAT Name</th>
                      <th className="global-tran-th-ui">VAT Amount</th>
                      <th className="global-tran-th-ui">ATC</th>
                      <th className="global-tran-th-ui">ATC Name</th>
                      <th className="global-tran-th-ui">ATC Amount</th>
                      <th className="global-tran-th-ui">Payment Terms</th>
                      <th className="global-tran-th-ui">Due Date</th>
                      {!isFormDisabled && (
                        <th className="global-tran-th-ui sticky right-[43px] bg-blue-300 dark:bg-blue-900 z-30">
                          Add
                        </th>
                      )}
                      {!isFormDisabled && (
                        <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                          Delete
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="relative">
                    {detailRows.map((row, index) => (
                      <tr key={index} className="global-tran-tr-ui">
                        <td className="global-tran-td-ui text-center">
                          {index + 1}
                        </td>
                        {fieldVisibility.invType && (
                          <td className="global-tran-td-ui">
                            <select
                              className="w-[50px] global-tran-td-inputclass-ui"
                              value={row.invType || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "invType",
                                  e.target.value,
                                  false
                                )
                              }
                              disabled={isFormDisabled}
                            >
                              <option value="FG">FG</option>
                              <option value="MS">MS</option>
                              <option value="RM">RM</option>
                            </select>
                          </td>
                        )}
                        {fieldVisibility.rrNo && (
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui"
                              value={row.rrNo || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "rrNo",
                                  e.target.value,
                                  false
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>
                        )}
                        {fieldVisibility.poNo && (
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui"
                              value={row.poNo || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "poNo",
                                  e.target.value,
                                  false
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>
                        )}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[100px] global-tran-td-inputclass-ui"
                            value={row.siNo || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "siNo",
                                e.target.value,
                                false
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>
                        <td className="global-tran-td-ui">
                          <input
                            type="date"
                            className="w-[100px] global-tran-td-inputclass-ui text-center"
                            value={row.siDate || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "siDate",
                                e.target.value,
                                false
                              )
                            }
                            disabled={isFormDisabled}
                          />
                        </td>
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            ref={(el) => (amountRefs.current[index] = el)}
                            className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                            value={row.amount}
                            onFocus={(e) => {
                              if (
                                (e.target.value === "0.00" ||
                                  e.target.value === "0") &&
                                !row.touched
                              ) {
                                handleDetailChange(index, "amount", "", false, {
                                  touched: true,
                                });
                              }
                            }}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (
                                /^\d{0,12}(\.\d{0,2})?$/.test(value) ||
                                value === ""
                              ) {
                                handleDetailChange(
                                  index,
                                  "amount",
                                  value,
                                  false,
                                  { touched: true }
                                );
                              }
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const value = e.target.value;
                                const num = parseFormattedNumber(value);

                                if (!isNaN(num)) {
                                  await handleDetailChange(
                                    index,
                                    "amount",
                                    value,
                                    true,
                                    { touched: true }
                                  );
                                }

                                if (index === detailRows.length - 1) {
                                  handleAddRow(index);
                                  setTimeout(() => {
                                    if (amountRefs.current[index + 1]) {
                                      amountRefs.current[index + 1].focus();
                                    }
                                  }, 100);
                                } else {
                                  if (amountRefs.current[index + 1]) {
                                    amountRefs.current[index + 1].focus();
                                  }
                                }
                              }
                            }}
                            onBlur={async (e) => {
                              const value = e.target.value;
                              const num = parseFormattedNumber(value);
                              if (!isNaN(num) && value !== "") {
                                await handleDetailChange(
                                  index,
                                  "amount",
                                  value,
                                  true,
                                  { touched: true }
                                );
                              } else {
                                // restore 0.00 only if left empty
                                handleDetailChange(
                                  index,
                                  "amount",
                                  "0.00",
                                  true,
                                  { touched: false }
                                );
                              }
                            }}
                            disabled={isFormDisabled}
                          />
                        </td>
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[80px] global-tran-td-inputclass-ui text-center"
                            value={
                              vendName?.currCode
                                ? `${vendName.currCode}`
                                : "PHP"
                            }
                            readOnly
                            disabled={isFormDisabled}
                          />
                        </td>
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                            value={row.siAmount || row.amount || ""}
                            readOnly
                            disabled={isFormDisabled}
                          />
                        </td>
                        {/* DR Account */}
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                              value={row.debitAcct || ""}
                              readOnly
                              disabled={isFormDisabled}
                            />
                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showAccountModal: true,
                                    accountModalSource: "debitAcct",
                                  });
                                }}
                              />
                            )}
                          </div>
                        </td>
                        {/* RC Code */}
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                              value={row.rcCode || ""}
                              readOnly
                            />
                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showRcModal: true,
                                    accountModalSource: "rcCode",
                                  });
                                }}
                              />
                            )}
                          </div>
                        </td>
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[250px] global-tran-td-inputclass-ui"
                            value={row.rcName || ""}
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "rcDescription",
                                e.target.value,
                                false
                              )
                            }
                            disabled={isFormDisabled}
                            S
                          />
                        </td>
                        {fieldVisibility.sltypeCode && (
                          <td className="global-tran-td-ui">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui"
                              value={row.sltypeCode || ""}
                              onChange={(e) =>
                                handleDetailChange(
                                  index,
                                  "sltypeCode",
                                  e.target.value,
                                  false
                                )
                              }
                              disabled={isFormDisabled}
                            />
                          </td>
                        )}
                        {/* SL Field */}
                        {/* SL Code */}
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                              value={row.slCode || ""}
                              readOnly
                            />
                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showSlModal: true,
                                    accountModalSource: "slCode",
                                  });
                                }}
                              />
                            )}
                          </div>
                        </td>
                        {/* VAT Code */}
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                              value={row.vatCode || ""}
                              readOnly
                            />
                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showVatModal: true,
                                    accountModalSource: "vatCode",
                                  });
                                }}
                              />
                            )}
                          </div>
                        </td>

                        {/* VAT Name */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[250px] global-tran-td-inputclass-ui"
                            value={row.vatName || ""}
                            readOnly
                          />
                        </td>

                        {/* VAT Amount */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                            value={
                              formatNumber(
                                parseFormattedNumber(row.vatAmount)
                              ) ||
                              formatNumber(
                                parseFormattedNumber(row.vatAmount)
                              ) ||
                              ""
                            }
                            readOnly
                          />
                        </td>

                        {/* ATC Code */}
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                              value={row.atcCode || ""}
                              readOnly
                            />
                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showAtcModal: true,
                                    accountModalSource: "atcCode",
                                  });
                                }}
                              />
                            )}
                          </div>
                        </td>

                        {/* ATC Name */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[250px] global-tran-td-inputclass-ui"
                            value={row.atcName || ""}
                            readOnly
                          />
                        </td>

                        {/* ATC Amount */}
                        <td className="global-tran-td-ui">
                          <input
                            type="text"
                            className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                            value={
                              formatNumber(
                                parseFormattedNumber(row.atcAmount)
                              ) ||
                              formatNumber(
                                parseFormattedNumber(row.atcAmount)
                              ) ||
                              ""
                            }
                            onChange={(e) =>
                              handleDetailChange(
                                index,
                                "atcAmount",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="global-tran-td-ui relative">
                          <div className="flex items-center">
                            <input
                              type="text"
                              className="w-[100px] global-tran-td-inputclass-ui text-center pr-6"
                              value={row.paytermCode || ""}
                              readOnly
                              onDoubleClick={() =>
                                handlePaytermDoubleClick(index)
                              }
                              disabled={isFormDisabled}
                            />
                            {!isFormDisabled && (
                              <FontAwesomeIcon
                                icon={faMagnifyingGlass}
                                className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                onClick={() => {
                                  updateState({
                                    selectedRowIndex: index,
                                    showPaytermModal: true,
                                  });
                                }}
                              />
                            )}
                          </div>
                        </td>
                        <td className="global-tran-td-ui">
                          <input
                            type="date"
                            className="w-[100px] global-tran-td-inputclass-ui text-center"
                            value={row.dueDate || ""}
                            readOnly
                            disabled={isFormDisabled}
                          />
                        </td>
                        {!isFormDisabled && (
                          <td className="global-tran-td-ui text-center sticky right-12">
                            <button
                              className="global-tran-td-button-add-ui"
                              onClick={() => handleAddRow(index)}
                            >
                              <FontAwesomeIcon icon={faPlus} />
                            </button>
                          </td>
                        )}
                        {!isFormDisabled && (
                          <td className="global-tran-td-ui text-center sticky right-0">
                            <button
                              className="global-tran-td-button-delete-ui"
                              onClick={() => handleDeleteRow(index)}
                            >
                              <FontAwesomeIcon icon={faMinus} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Details Footer */}
            <div className="global-tran-tab-footer-main-div-ui">
              {/* Add Button */}
              <div className="global-tran-tab-footer-button-div-ui">
                <button
                  onClick={handleAddRow}
                  className="global-tran-tab-footer-button-add-ui"
                  disabled={isFormDisabled}
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Add
                </button>
              </div>

              {/* Totals Section */}
              <div className="global-tran-tab-footer-total-main-div-ui">
                {/* Total Invoice Amount */}
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">
                    Total Invoice Amount:
                  </label>
                  <label
                    id="totalInvoiceAmount"
                    className="global-tran-tab-footer-total-value-ui"
                  >
                    0.00
                  </label>
                </div>

                {/* Total VAT Amount */}
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">
                    Total VAT Amount:
                  </label>
                  <label
                    id="totalVATAmount"
                    className="global-tran-tab-footer-total-value-ui"
                  >
                    0.00
                  </label>
                </div>

                {/* Total ATC Amount */}
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">
                    Total ATC Amount:
                  </label>
                  <label
                    id="totalATCAmount"
                    className="global-tran-tab-footer-total-value-ui"
                  >
                    0.00
                  </label>
                </div>

                {/* Total Payable Amount (Invoice + VAT - ATC) */}
                <div className="global-tran-tab-footer-total-div-ui">
                  <label className="global-tran-tab-footer-total-label-ui">
                    Total Payable Amount:
                  </label>
                  <label
                    id="totalPayableAmount"
                    className="global-tran-tab-footer-total-value-ui"
                  >
                    0.00
                  </label>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* General Ledger Button */}
      <div className="global-tran-tab-div-ui">
        {/* Tab Navigation */}
        <div className="global-tran-tab-nav-ui">
          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className={`global-tran-tab-padding-ui ${
                GLactiveTab === "invoice"
                  ? "global-tran-tab-text_active-ui"
                  : "global-tran-tab-text_inactive-ui"
              }`}
              onClick={() => updateState({ GLactiveTab: "invoice" })}
            >
              General Ledger
            </button>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={() => handleActivityOption("GenerateGL")}
              className="global-tran-button-generateGL"
              disabled={isLoading || isFormDisabled}
            >
              {isLoading ? "Generating..." : "Generate GL Entries"}
            </button>
          </div>
        </div>

        {/* GL Details Table */}
        <div className="global-tran-table-main-div-ui">
          <div className="global-tran-table-main-sub-div-ui">
            <table className="min-w-full border-collapse">
              <thead className="global-tran-thead-div-ui">
                <tr>
                  <th className="global-tran-th-ui">LN</th>
                  <th className="global-tran-th-ui">Account Code</th>
                  <th className="global-tran-th-ui">RC Code</th>
                  <th className="global-tran-th-ui">SL Type Code</th>
                  <th className="global-tran-th-ui">SL Code</th>
                  <th className="global-tran-th-ui">Particulars</th>
                  <th className="global-tran-th-ui">VAT Code</th>
                  <th className="global-tran-th-ui">VAT Name</th>
                  <th className="global-tran-th-ui">ATC Code</th>
                  <th className="global-tran-th-ui ">ATC Name</th>

                  <th className="global-tran-th-ui">Debit ({glCurrDefault})</th>
                  <th className="global-tran-th-ui">
                    Credit ({glCurrDefault})
                  </th>

                  <th
                    className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}
                  >
                    Debit ({withCurr3 ? glCurrGlobal2 : currencyCode})
                  </th>
                  <th
                    className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}
                  >
                    Credit ({withCurr3 ? glCurrGlobal2 : currencyCode})
                  </th>
                  <th
                    className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}
                  >
                    Debit ({glCurrGlobal3})
                  </th>
                  <th
                    className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}
                  >
                    Credit ({glCurrGlobal3})
                  </th>

                  <th className="global-tran-th-ui">SL Ref. No.</th>
                  <th className="global-tran-th-ui">SL Ref. Date</th>
                  <th className="global-tran-th-ui">Remarks</th>

                  {!isFormDisabled && (
                    <>
                      <th className="global-tran-th-ui sticky right-[43px] bg-blue-300 dark:bg-blue-900 z-30">
                        Add
                      </th>
                      <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                        Delete
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="relative">
                {detailRowsGL.map((row, index) => (
                  <tr key={index} className="global-tran-tr-ui">
                    <td className="global-tran-td-ui text-center">
                      {index + 1}
                    </td>

                    <td className="global-tran-td-ui">
                      <div className="relative w-fit">
                        <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.acctCode || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "acctCode",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                        {!isFormDisabled && (
                          <FontAwesomeIcon
                            icon={faMagnifyingGlass}
                            className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                            onClick={() => {
                              updateState({
                                selectedRowIndex: index,
                                showAccountModal: true,
                                accountModalSource: "acctCode",
                              });
                            }}
                          />
                        )}
                      </div>
                    </td>

                    <td className="global-tran-td-ui">
                      <div className="relative w-fit">
                        <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.rcCode || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "rcCode",
                              e.target.value
                            )
                          }
                          readOnly
                          disabled={isFormDisabled}
                        />
                        {!isFormDisabled &&
                          (row.rcCode === "REQ RC" ||
                            (row.rcCode && row.rcCode !== "REQ RC")) && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showRcModal: true,
                                });
                              }}
                            />
                          )}
                      </div>
                    </td>

                    <td className="global-tran-td-ui">
                      <input
                        type="text"
                        className="w-[100px] global-tran-td-inputclass-ui"
                        value={row.sltypeCode || ""}
                        onChange={(e) =>
                          handleDetailChangeGL(
                            index,
                            "sltypeCode",
                            e.target.value
                          )
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td className="global-tran-td-ui">
                      <div className="relative w-fit">
                        <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.slCode || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "slCode",
                              e.target.value
                            )
                          }
                          readOnly
                          disabled={isFormDisabled}
                        />
                        {!isFormDisabled &&
                          (row.slCode === "REQ SL" || row.slCode) && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                if (row.slCode === "REQ SL" || row.slCode) {
                                  updateState({
                                    selectedRowIndex: index,
                                    showSlModal: true,
                                  });
                                }
                              }}
                            />
                          )}
                      </div>
                    </td>

                    <td className="global-tran-td-ui">
                      <div className="relative inline-block">
                        {/* Hidden span to measure text width */}
                        <span className="invisible absolute whitespace-pre px-2">
                          {row.particular || " "}
                        </span>

                        <input
                          type="text"
                          className="global-tran-td-inputclass-ui"
                          style={{
                            width: `${(row.particular?.length || 1) * 7}px`,
                          }}
                          value={row.particular || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "particular",
                              e.target.value
                            )
                          }
                          disabled={isFormDisabled}
                        />
                      </div>
                    </td>

                    <td className="global-tran-td-ui">
                      <div className="relative w-fit">
                        <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.vatCode || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "vatCode",
                              e.target.value
                            )
                          }
                          readOnly
                          disabled={isFormDisabled}
                        />
                        {!isFormDisabled &&
                          row.vatCode &&
                          row.vatCode.length > 0 && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                updateState({
                                  selectedRowIndex: index,
                                  showVatModal: true,
                                });
                              }}
                            />
                          )}
                      </div>
                    </td>

                    <td className="global-tran-td-ui">
                      <input
                        type="text"
                        className="w-[200px] global-tran-td-inputclass-ui"
                        value={row.vatName || ""}
                        readOnly
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td className="global-tran-td-ui">
                      <div className="relative w-fit">
                        <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.atcCode || ""}
                          onChange={(e) =>
                            handleDetailChangeGL(
                              index,
                              "atcCode",
                              e.target.value
                            )
                          }
                          readOnly
                          disabled={isFormDisabled}
                        />
                        {!isFormDisabled &&
                          (row.atcCode !== "" || row.atcCode) && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                              onClick={() => {
                                if (row.atcCode !== "" || row.atcCode) {
                                  updateState({
                                    selectedRowIndex: index,
                                    showAtcModal: true,
                                  });
                                }
                              }}
                            />
                          )}
                      </div>
                    </td>

                    <td className="global-tran-td-ui">
                      <input
                        type="text"
                        className="w-[200px] global-tran-td-inputclass-ui"
                        value={row.atcName || ""}
                        onChange={(e) =>
                          handleDetailChangeGL(index, "atcName", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td className="global-tran-td-ui text-right">
                      <input
                        type="text"
                        className="w-[120px] global-tran-td-inputclass-ui text-right"
                        value={row.debit || ""}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const sanitizedValue = inputValue.replace(
                            /[^0-9.]/g,
                            ""
                          );
                          if (
                            /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                            sanitizedValue === ""
                          ) {
                            handleDetailChangeGL(
                              index,
                              "debit",
                              sanitizedValue
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBlurGL(index, "debit", e.target.value, true);
                          }
                        }}
                        onFocus={(e) => {
                          if (
                            e.target.value === "0.00" ||
                            e.target.value === "0"
                          ) {
                            e.target.value = "";
                            handleDetailChangeGL(index, "debit", "");
                          }
                        }}
                        onBlur={(e) =>
                          handleBlurGL(index, "debit", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td className="global-tran-td-ui text-right">
                      <input
                        type="text"
                        className="w-[120px] global-tran-td-inputclass-ui text-right"
                        value={row.credit || ""}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const sanitizedValue = inputValue.replace(
                            /[^0-9.]/g,
                            ""
                          );
                          if (
                            /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                            sanitizedValue === ""
                          ) {
                            handleDetailChangeGL(
                              index,
                              "credit",
                              sanitizedValue
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBlurGL(index, "credit", e.target.value, true);
                          }
                        }}
                        onFocus={(e) => {
                          if (
                            e.target.value === "0.00" ||
                            e.target.value === "0"
                          ) {
                            e.target.value = "";
                            handleDetailChangeGL(index, "credit", "");
                          }
                        }}
                        onBlur={(e) =>
                          handleBlurGL(index, "credit", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td
                      className={`global-tran-td-ui text-right ${
                        withCurr2 ? "" : "hidden"
                      }`}
                    >
                      <input
                        type="text"
                        className="w-[120px] global-tran-td-inputclass-ui text-right"
                        value={row.debitFx1 || ""}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const sanitizedValue = inputValue.replace(
                            /[^0-9.]/g,
                            ""
                          );
                          if (
                            /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                            sanitizedValue === ""
                          ) {
                            handleDetailChangeGL(
                              index,
                              "debitFx1",
                              sanitizedValue
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBlurGL(
                              index,
                              "debitFx1",
                              e.target.value,
                              true
                            );
                          }
                        }}
                        onFocus={(e) => {
                          if (
                            e.target.value === "0.00" ||
                            e.target.value === "0"
                          ) {
                            e.target.value = "";
                            handleDetailChangeGL(index, "debitFx1", "");
                          }
                        }}
                        onBlur={(e) =>
                          handleBlurGL(index, "debitFx1", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>
                    <td
                      className={`global-tran-td-ui text-right ${
                        withCurr2 ? "" : "hidden"
                      }`}
                    >
                      <input
                        type="text"
                        className="w-[120px] global-tran-td-inputclass-ui text-right"
                        value={row.creditFx1 || ""}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const sanitizedValue = inputValue.replace(
                            /[^0-9.]/g,
                            ""
                          );
                          if (
                            /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                            sanitizedValue === ""
                          ) {
                            handleDetailChangeGL(
                              index,
                              "creditFx1",
                              sanitizedValue
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBlurGL(
                              index,
                              "creditFx1",
                              e.target.value,
                              true
                            );
                          }
                        }}
                        onFocus={(e) => {
                          if (
                            e.target.value === "0.00" ||
                            e.target.value === "0"
                          ) {
                            e.target.value = "";
                            handleDetailChangeGL(index, "creditFx1", "");
                          }
                        }}
                        onBlur={(e) =>
                          handleBlurGL(index, "creditFx1", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td
                      className={`global-tran-td-ui text-right ${
                        withCurr3 ? "" : "hidden"
                      }`}
                    >
                      <input
                        type="text"
                        className="w-[120px] global-tran-td-inputclass-ui text-right"
                        value={row.debitFx2 || ""}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const sanitizedValue = inputValue.replace(
                            /[^0-9.]/g,
                            ""
                          );
                          if (
                            /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                            sanitizedValue === ""
                          ) {
                            handleDetailChangeGL(
                              index,
                              "debitFx2",
                              sanitizedValue
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBlurGL(
                              index,
                              "debitFx2",
                              e.target.value,
                              true
                            );
                          }
                        }}
                        onFocus={(e) => {
                          if (
                            e.target.value === "0.00" ||
                            e.target.value === "0"
                          ) {
                            e.target.value = "";
                            handleDetailChangeGL(index, "debitFx2", "");
                          }
                        }}
                        onBlur={(e) =>
                          handleBlurGL(index, "debitFx2", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>
                    <td
                      className={`global-tran-td-ui text-right ${
                        withCurr3 ? "" : "hidden"
                      }`}
                    >
                      <input
                        type="text"
                        className="w-[120px] global-tran-td-inputclass-ui text-right"
                        value={row.creditFx2 || ""}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const sanitizedValue = inputValue.replace(
                            /[^0-9.]/g,
                            ""
                          );
                          if (
                            /^\d*\.?\d{0,2}$/.test(sanitizedValue) ||
                            sanitizedValue === ""
                          ) {
                            handleDetailChangeGL(
                              index,
                              "creditFx2",
                              sanitizedValue
                            );
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleBlurGL(
                              index,
                              "creditFx2",
                              e.target.value,
                              true
                            );
                          }
                        }}
                        onFocus={(e) => {
                          if (
                            e.target.value === "0.00" ||
                            e.target.value === "0"
                          ) {
                            e.target.value = "";
                            handleDetailChangeGL(index, "creditFx2", "");
                          }
                        }}
                        onBlur={(e) =>
                          handleBlurGL(index, "creditFx2", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td className="global-tran-td-ui">
                      <input
                        type="text"
                        className="w-[100px] global-tran-td-inputclass-ui"
                        value={row.slRefNo || ""}
                        maxLength={25}
                        onChange={(e) =>
                          handleDetailChangeGL(index, "slRefNo", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td className="global-tran-td-ui">
                      <input
                        type="date"
                        className="w-[100px] global-tran-td-inputclass-ui"
                        value={row.slrefDate || ""}
                        onChange={(e) =>
                          handleDetailChangeGL(
                            index,
                            "slrefDate",
                            e.target.value
                          )
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    <td className="global-tran-td-ui">
                      <input
                        type="text"
                        className="w-[100px] global-tran-td-inputclass-ui"
                        value={row.remarks || header.remarks || ""}
                        style={{
                          width: `${(row.particular?.length || 1) * 8}px`,
                        }}
                        onChange={(e) =>
                          handleDetailChangeGL(index, "remarks", e.target.value)
                        }
                        disabled={isFormDisabled}
                      />
                    </td>

                    {!isFormDisabled && (
                      <td className="global-tran-td-ui text-center sticky right-10">
                        <button
                          className="global-tran-td-button-add-ui"
                          onClick={() => handleAddRowGL(index)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      </td>
                    )}

                    {!isFormDisabled && (
                      <td className="global-tran-td-ui text-center sticky right-0">
                        <button
                          className="global-tran-td-button-delete-ui"
                          onClick={() => handleDeleteRowGL(index)}
                        >
                          <FontAwesomeIcon icon={faMinus} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="global-tran-tab-footer-main-div-ui">
          {/* Add Button */}
          <div className="global-tran-tab-footer-button-div-ui">
            <button
              onClick={handleAddRowGL}
              className="global-tran-tab-footer-button-add-ui"
              disabled={isFormDisabled}
            >
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Add
            </button>
          </div>

          {/* Totals Section */}
          <div className="global-tran-tab-footer-total-main-div-ui">
            {/* Total Debit */}
            <div className="global-tran-tab-footer-total-div-ui">
              <label
                htmlFor="TotalDebit"
                className="global-tran-tab-footer-total-label-ui"
              >
                Total Debit:
              </label>
              <label
                htmlFor="TotalDebit"
                className="global-tran-tab-footer-total-value-ui"
              >
                {totalDebit}
              </label>
            </div>

            {/* Total Credit */}
            <div className="global-tran-tab-footer-total-div-ui">
              <label
                htmlFor="TotalCredit"
                className="global-tran-tab-footer-total-label-ui"
              >
                Total Credit:
              </label>
              <label
                htmlFor="TotalCredit"
                className="global-tran-tab-footer-total-value-ui"
              >
                {totalCredit}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}

      {currencyModalOpen && (
        <CurrLookupModal
          isOpen={currencyModalOpen}
          onClose={handleCloseCurrencyModal}
        />
      )}

      {payeeModalOpen && (
        <PayeeMastLookupModal
          isOpen={payeeModalOpen}
          onClose={handleClosePayeeModal}
        />
      )}

      {/* COA Account Modal */}
      {showAccountModal && (
        <COAMastLookupModal
          isOpen={showAccountModal}
          onClose={handleCloseAccountModal}
          source={accountModalSource}
        />
      )}

      {/* RC Code Modal */}
      {showRcModal && (
        <RCLookupModal
          isOpen={showRcModal}
          onClose={handleCloseRcModalGL}
          source={accountModalSource}
        />
      )}

      {/* VAT Code Modal */}
      {showVatModal && (
        <VATLookupModal isOpen={showVatModal} onClose={handleCloseVatModal} />
      )}

      {/* ATC Code Modal */}
      {showAtcModal && (
        <ATCLookupModal isOpen={showAtcModal} onClose={handleCloseAtcModal} />
      )}

      {/* SL Code Lookup Modal */}
      {showSlModal && (
        <SLMastLookupModal
          isOpen={showSlModal}
          onClose={handleCloseSlModalGL}
        />
      )}

      {/* Payment Terms Lookup Modal */}
      {showPaytermModal && (
        <PaytermLookupModal
          isOpen={showPaytermModal}
          onClose={handleClosePaytermModal}
        />
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <CancelTranModal isOpen={showCancelModal} onClose={handleCloseCancel} />
      )}

      {showAttachModal && (
        <AttachDocumentModal
          isOpen={showAttachModal}
          params={{
            DocumentID: documentID,
            DocumentName: documentName,
            BranchName: branchName,
            DocumentNo: documentNo,
          }}
          onClose={() => updateState({ showAttachModal: false })}
        />
      )}

      {showSignatoryModal && (
  <DocumentSignatories
    isOpen={showSignatoryModal}
    params={{
      documentID: documentID,        // âœ… Pass the actual document ID
      noReprints: 0,                 // âœ… Add this if needed
      docType: docType               // âœ… Add this if needed
    }}
    onClose={handleCloseSignatory}
    onCancel={() => updateState({ showSignatoryModal: false })}
  />
)}



      {/* Post Modal */}
       {showPostingModal && (
    <PostAPV
      isOpen={showPostingModal}
      userCode={userCode} // This should now work
      onClose={() => updateState({ showPostingModal: false })}
    />
  )}
      {showSpinner && <LoadingSpinner />}

      <div className={topTab === "history" ? "" : "hidden"}>
        <AllTranHistory
          showHeader={false}
          endpoint="/getAPVHistory"
          cacheKey={`APV:${state.branchCode || ""}:${state.docNo || ""}`}  // âœ… per-transaction
          activeTabKey="APV_Summary"
          branchCode={state.branchCode}
          startDate={state.fromDate}
          endDate={state.toDate}
            status={(() => {
              const s = (state.status || "").toUpperCase();
              if (s === "FINALIZED") return "F";
              if (s === "CANCELLED") return "X";
              if (s === "CLOSED")    return "C";
              if (s === "OPEN")      return "";
              return "All";
            })()}
            onRowDoubleClick={handleHistoryRowPick}
            historyExportName={`${documentTitle} History`} 
      />
    </div>
    </div>
  );

};

export default APV;
