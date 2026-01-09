import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faSpinner } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import BillCodeLookupModal from "../../../Lookup/SearchBillCodeRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";

// Configuration
import {fetchData , postRequest} from '../../../Configuration/BaseURL.jsx'
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import {
  docTypeNames,
  glAccountFilter,
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from '@/NAYSA Cloud/Global/doctype';

import {
  useTopVatRow,
  useTopATCRow,
  useTopRCRow,
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopVatAmount,
  useTopATCAmount,
  useTopBillCodeRow,
} from '@/NAYSA Cloud/Global/top1RefTable';

import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useFetchTranDataReversal,
  useHandleCancel,
  useHandlePost,
} from '@/NAYSA Cloud/Global/procedure';


import {  
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';


import { 
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from '@/NAYSA Cloud/Global/behavior';

// Header
import Header from '@/NAYSA Cloud/Components/Header';
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";

const JV = () => {
   const loadedFromUrlRef = useRef(false);
   const navigate = useNavigate();
   const [topTab, setTopTab] = useState("details"); // "details" | "history"
   const { user } = useAuth();
   const { resetFlag } = useReset();
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
    // documentDate:useGetCurrentDay(), 
    documentNo: "",
    documentStatus: "",
    status: "OPEN",

    // UI state
    activeTab: "basic",
    GLactiveTab: "entries",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,

    // Header information
    header: {
      jv_date: new Date().toISOString().split('T')[0]
    },

    branchCode: "HO",
    branchName: "Head Office",

    // Vendor information
    custCode: "",
    custName: "",
    attention: "",

    // Currency information
    currCode: "",
    currName: "",
    currRate: "",
    defaultCurrRate: "1.000000",

    // Other Header Info
    jvTypes: [],
    refdocTypes: [],
    refDocNo: "",
    refDocNo2: "",
    fromDate: null,
    toDate: null,
    remarks: "",
    billtermCode: "",
    billtermName: "",
    selectedJVType: "",
    selectedRefDocType: "",
    noReprints:"0",

    userCode: user.USER_CODE, 

    // Detail 1-2
    detailRows: [],
    detailRowsGL: [],

    totalDebit: "0.00",
    totalCredit: "0.00",

    // Modal states
    modalContext: '',
    selectionContext: '',
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal: false,
    showRcModal: false,
    showVatModal: false,
    showAtcModal: false,
    currencyModalOpen: false,
    branchModalOpen: false,
    custModalOpen: false,
    billtermModalOpen: false,
    showCancelModal: false,
    showAttachModal: false,
    showSignatoryModal: false,
    showBillCodeModal: false,
    showSlModal: false,
    showPostModal: false, //new modal
  });

  const updateState = (updates) => {
    setState(prev => ({ ...prev, ...updates }));
  };

const [jvType, setJvType] = useState('');
const [refDocType, setRefDocType] = useState('');


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
    custCode,
    custName,
    currCode,
    currName,
    currRate,
    jvTypes,
    refdocTypes,
    refDocNo,
    refDocNo2,
    fromDate,
    toDate,
    remarks,
    billtermCode,
    billtermName,
    selectedJVType,
    selectedRefDocType,
    noReprints,

    // Transaction details
    detailRows,
    detailRowsGL,
    totalDebit,
    totalCredit,

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
    currencyModalOpen,
    branchModalOpen,
    custModalOpen,
    billtermModalOpen,
    showCancelModal,
    showAttachModal,
    showSignatoryModal,
    showBillCodeModal,
    showSlModal,
    showPostModal, //new modal
  } = state;

  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }

  // Document Global Setup
  const docType = docTypes.JV; 
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || 'Journal Voucher';

  // Status Global Setup
  const displayStatus = status || 'OPEN';
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

  // Variables
  const [totals, setTotals] = useState({
    totalGrossAmount: '0.00',
    totalDiscountAmount: '0.00',
    totalNetAmount: '0.00',
    totalVatAmount: '0.00',
    totalSalesAmount: '0.00',
    totalAtcAmount: '0.00',
    totalAmountDue: '0.00',
  });

  const customParamMap = {
    arAct: glAccountFilter.ActiveAll,
    salesAcct: glAccountFilter.ActiveAll,
    vatAcct: glAccountFilter.VATOutputAcct,
    discAcct: glAccountFilter.ActiveAll
  };
  const customParam = customParamMap[accountModalSource] || null;
  const [header, setHeader] = useState({
    jv_date: new Date().toISOString().split('T')[0]
  });

  const updateTotalsDisplay = (grossAmt, discAmt, netDisc, vat, atc, amtDue) => {
    setTotals({
      totalGrossAmount: formatNumber(grossAmt),
      totalDiscountAmount: formatNumber(discAmt),
      totalNetAmount: formatNumber(netDisc),
      totalVatAmount: formatNumber(vat),
      totalSalesAmount: formatNumber(netDisc - vat),
      totalAtcAmount: formatNumber(atc),
      totalAmountDue: formatNumber(amtDue),
    });
  };

  useEffect(() => {
    const debitSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    updateState({
      totalDebit: formatNumber(debitSum),
      totalCredit: formatNumber(creditSum)
    });
  }, [detailRowsGL]);

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
    // Handle custCode changes if needed
  }, [custCode]);

  useEffect(() => {
    if (glCurrMode && glCurrDefault && currCode) {
      loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
    }
  }, [glCurrMode, glCurrDefault, currCode]);

  useEffect(() => {
    if (custName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map(row => ({
        ...row,
        currency: custName.currCode
      }));
      updateState({ detailRows: updatedRows });
    }
  }, [custName?.currCode]);

  useEffect(() => {
    updateState({ isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);

  useEffect(() => {
    handleReset();
  }, []);

  const LoadingSpinner = () => (
    <div className="global-tran-spinner-main-div-ui">
      <div className="global-tran-spinner-sub-div-ui">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-2" />
        <p>Please wait...</p>
      </div>
    </div>
  ); 

  const handleReset = () => {
    loadDocDropDown();
    loadDocControl();
    loadCompanyData();
    updateState({
      header: { jv_date: new Date().toISOString().split("T")[0] },
      branchCode: "HO",
      branchName: "Head Office",
      refDocNo: "",
      refDocNo2: "",
      fromDate: null,
      toDate: null,
      remarks: "",
      custName: "",
      custCode: "",
      documentNo: "",
      documentID: "",
      detailRows: [],
      detailRowsGL: [],
      documentStatus: "",
      activeTab: "basic",
      GLactiveTab: "entries",
      isLoading: false,
      showSpinner: false,
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status: "Open"
    });
    updateTotalsDisplay(0, 0, 0, 0, 0, 0);
  };   





  const loadCompanyData = async () => {

    updateState({isLoading:true})


    try {
      const [jvType, refDocType] = await Promise.all([
        useTopDocDropDown(docType, "JVTRAN_TYPE"),
        useTopDocDropDown(docType, "JVDOC_TYPE"),
      ]);

      if (jvType) {
        updateState({ jvTypes: jvType, selectedJVType: "JV01" });
      }
      if (refDocType) {
        updateState({ refdocTypes: refDocType, selectedRefDocType: "JV" });
      }

    const hsOption = await useTopHSOption();
    if (hsOption) {
      updateState({
        glCurrMode: hsOption.glCurrMode,
        glCurrDefault: hsOption.glCurrDefault,
        currCode: hsOption.glCurrDefault,
        glCurrGlobal1: hsOption.glCurrGlobal1,
        glCurrGlobal2: hsOption.glCurrGlobal2,
        glCurrGlobal3: hsOption.glCurrGlobal3,
      });

      const curr = await useTopCurrencyRow(hsOption.glCurrDefault);
      if (curr) {
        updateState({
          currName: curr.currName,
          currRate: formatNumber(1, 6)
        });
      }
    }
      } catch (err) {
      console.error("Error fetching data:", err);
    }

  };

  const loadCurrencyMode = (
    mode = glCurrMode,
    defaultCurr = glCurrDefault,
    curr = currCode
  ) => {
    const calcWithCurr3 = mode === "T";
    const calcWithCurr2 = (mode === "M" && defaultCurr !== curr) || mode === "D" || calcWithCurr3;

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

  const loadDocDropDown = async () => {
    const data = await useTopDocDropDown(docType, "JVTRAN_TYPE");
    if (data) {
      updateState({
        jvTypes: data,
        selectedJVType: "JV01",
      });
    }    
  };

  const fetchTranData = async (documentNo, branchCode) => {
    const resetState = () => {
      updateState({ documentNo: '', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
      updateTotalsDisplay(0, 0, 0, 0, 0, 0);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranData(documentNo, branchCode, docType, "jvNo");

      if (!data?.jvId) {
        Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
        return resetState();
      }

      // Format header date
      let jvDateForHeader = '';
      if (data.jvDate) {
        const d = new Date(data.jvDate);
        jvDateForHeader = isNaN(d) ? '' : d.toISOString().split("T")[0];
      } 

      // Format rows
      const retrievedDetailRows = (data.dt1 || []).map(item => ({
        ...item,
        jvAmount: formatNumber(item.jvAmount),
        vatAmount: formatNumber(item.vatAmount),
        atcAmount: formatNumber(item.atcAmount),
      }));   

      const formattedGLRows = (data.dt2 || []).map(glRow => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
      }));

      // Update state with fetched data
      updateState({
        documentStatus: data.jvStatus,
        status: data.docStatus,
        documentID: data.jvId,
        documentNo: data.jvNo,
        branchCode: data.branchCode,
        header: { jv_date: jvDateForHeader },
        selectedJVType: data.jvtranType,
        noReprints:noReprints,
        selectedRefDocType: data.refDocType,
        custCode: data.slCode,
        custName: data.slName,
        refDocNo: data.refDocNo,
        refDocNo2: data.refDocNo1,
        currCode: data.currCode,
        currName: data.currName,
        currRate: formatNumber(data.currRate, 6),
        remarks: data.remarks,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });    

      updateTotals(retrievedDetailRows);

    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };

  const fetchTranDataReversal = async (documentNo, branchCode) => {
    const resetState = () => {
      updateState({ documentNo: '', documentID: '',documentStatus: '',status:'', isDocNoDisabled: false, isFetchDisabled: false });
      updateTotalsDisplay(0, 0, 0, 0, 0, 0);
    };

    updateState({ isLoading: true });

    try {
      const data = await useFetchTranDataReversal(documentNo, branchCode, docType, selectedRefDocType, "refDocNo");

      if (!data?.jvId) {
        Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
        return resetState();
      }

      // Format header date
      // let jvDateForHeader = '';
      // if (data.jvDate) {
      //   const d = new Date(data.jvDate);
      //   jvDateForHeader = isNaN(d) ? '' : d.toISOString().split("T")[0];
      // } 

      // Format rows
      const retrievedDetailRows = (data.dt1 || []).map(item => ({
        ...item,
        jvAmount: formatNumber(item.jvAmount),
        vatAmount: formatNumber(item.vatAmount),
        atcAmount: formatNumber(item.atcAmount),
      }));   

      const formattedGLRows = (data.dt2 || []).map(glRow => ({
        ...glRow,
        debit: formatNumber(glRow.debit),
        credit: formatNumber(glRow.credit),
        debitFx1: formatNumber(glRow.debitFx1),
        creditFx1: formatNumber(glRow.creditFx1),
        debitFx2: formatNumber(glRow.debitFx2),
        creditFx2: formatNumber(glRow.creditFx2),
      }));

      // Update state with fetched data
      updateState({
        custCode: data.slCode,
        custName: data.slName,
        refDocNo2: data.refDocNo1,
        currCode: data.currCode,
        currName: data.currName,
        currRate: formatNumber(data.currRate, 6),
        remarks: data.remarks,
        detailRows: retrievedDetailRows,
        detailRowsGL: formattedGLRows,
        isDocNoDisabled: true,
        isFetchDisabled: true,
      });    

      updateTotals(retrievedDetailRows);

    } catch (error) {
      console.error("Error fetching transaction data:", error);
      Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
      resetState();
    } finally {
      updateState({ isLoading: false });
    }
  };
  

  const handleSviNoBlur = () => {
    if (!state.documentID && state.documentNo && state.branchCode) { 
      fetchTranData(state.documentNo, state.branchCode);
    }
  };

  const handleCurrRateNoBlur = (e) => {
    const num = formatNumber(e.target.value, 6);
    updateState({ 
      currRate: isNaN(num) ? "0.000000" : num,  
      withCurr2: ((glCurrMode === "M" && glCurrDefault !== currCode) || glCurrMode === "D"),
      withCurr3: glCurrMode === "T"
    });
  };

  const handleActivityOption = async (action) => {
    // if (!detailRows || detailRows.length === 0) {
    //   return;
    // }

    if (documentStatus === '') {
      updateState({ isLoading: true });

      const {
        branchCode,
        documentNo,
        documentID,
        header,
        selectedJVType,
        selectedRefDocType,
        custCode,
        custName,
        refDocNo,
        refDocNo2,
        fromDate,
        toDate,
        currCode,
        currName,
        currRate,
        remarks,
        detailRows,
        detailRowsGL
      } = state;      

      const glData = {
        branchCode: branchCode,
        jvNo: documentNo || "",
        jvId: documentID || "",
        jvDate: header.jv_date,
        jvtranType: selectedJVType,
        refDocType: selectedRefDocType,
        slCode: custCode,
        slName: custName,
        refDocNo: refDocNo,
        refDocNo2: refDocNo2,
        fromDate: fromDate,
        toDate: toDate,
        currCode: currCode || "PHP",
        currRate: parseFormattedNumber(currRate),
        remarks: remarks || "",
        userCode: "NSI",
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          jvSpecs: row.jvSpecs || "",
          jvAmount: parseFormattedNumber(row.jvAmount || 0),
          vatCode: row.vatCode,
          vatName: row.vatName,
          vatAmount: parseFormattedNumber(row.vatAmount || 0),
          atcCode: row.atcCode || "",
          atcName: row.atcName || "",
          atcAmount: parseFormattedNumber(row.atcAmount),
          vatAcct: row.vatAcct,
          rcCode: row.rcCode
        })),
        dt2: detailRowsGL.map((entry, index) => ({
          recNo: String(index + 1),
          acctCode: entry.acctCode || "",
          rcCode: entry.rcCode || "",
          sltypeCode: entry.sltypeCode || "",
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
          slRefNo: entry.slRefNo || "",
          slRefDate: entry.slRefDate ? new Date(entry.slRefDate).toISOString().split("T")[0] : null,
          remarks: entry.remarks || "",
          dt1Lineno: entry.dt1Lineno || ""
        }))
      };

      console.log("Payload", glData)

      if (action === "GenerateGL") {
        try {
          const newGlEntries = await useGenerateGLEntries(docType, glData);

          if (newGlEntries) {
            updateState({ detailRowsGL: newGlEntries });
          } else {
            console.warn("GL entries generation failed or returned no data.");
          }
        } catch (error) {
          console.error("Error during GL generation:", error);
        } finally {
          updateState({ isLoading: false });
        }
      }

      if (action === "Upsert") {
        try {
          const response = await useTransactionUpsert(docType, glData, updateState, 'jvId', 'jvNo');
          if (response) {
            useSwalshowSaveSuccessDialog(
              handleReset,
              () => handleSaveAndPrint(response.data[0].jvId)
            );
          }
        } catch (error) {
          console.error("Error during transaction upsert:", error);
        } finally {
          updateState({ isLoading: false });
        }

        updateState({ isDocNoDisabled: true, isFetchDisabled: true });
      }
    }
  };

  const handleAddRow = async () => {
    try {
      const items = await handleFetchDetail(custCode);
      const itemList = Array.isArray(items) ? items : [items];
      const newRows = await Promise.all(itemList.map(async (item) => {
        return {
          lnNo: "",
          atcCode: item.atcCode || "",
          atcName: item.atcName || "",
          atcAmount: "0.00",
          jvAmount: "0.00",       
          vatAcct: item.vatAcctCode,
          rcCode: ""
        };
      }));

      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows });
      updateTotals(updatedRows);

      setTimeout(() => {
        const tableContainer = document.querySelector('.max-h-\\[430px\\]');
        if (tableContainer) {
          tableContainer.scrollTop = tableContainer.scrollHeight;
        }
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
          sltypeCode: "CU",
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
          remarks: "",
        }
      ]
    });
  };

  const handleDeleteRow = (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const handleDeleteRowGL = (index) => {
    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows });
  };

  const handleFetchDetail = async (custCode) => {
    if (!custCode) return [];

    try {
      const custPayload = {
        json_data: {
          custCode: custCode,
        },
      };

      const vendResponse = await postRequest("addCustomerDetail", JSON.stringify(custPayload));
      const rawResult = vendResponse.data[0]?.result;

      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };

  const handlePrint = async () => {
    if (!detailRowsGL) {
      return;
    }
    updateState({ showSignatoryModal: true });
  };

  const handleCancel = async () => {
    // if (!detailRows || detailRows.length === 0) {
    //   return;
    // }

    if (documentID && (documentStatus === '')) {
      updateState({ showCancelModal: true });
    }
  };





const handlePost = async () => {
//  if (!detailRows || detailRows.length === 0) {
//       return;
//       }


  if (documentID && (documentStatus === '')) {
    updateState({ showPostModal: true });
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
      updateState({
        documentNo: "",
        documentID: "",
        documentStatus: "",
        status: "OPEN"
      });
    }
  };

 
 //  ** View Document and Transaction History Retrieval ***
  const cleanUrl = useCallback(() => {
     navigate(location.pathname, { replace: true });
   }, [navigate, location.pathname]);
 
 
   const handleHistoryRowPick = useCallback((row) => {
     const docNo = row?.docNo;
     const branchCode = row?.branchCode;
     if (!docNo || !branchCode) return;
     fetchTranData(docNo, branchCode);
     setTopTab("details");
   });
 
 
   useEffect(() => {
     const params = new URLSearchParams(location.search);
     const docNo = params.get("jvNo");         
     const branchCode = params.get("branchCode");    
     
     if (!loadedFromUrlRef.current && docNo && branchCode) {
       loadedFromUrlRef.current = true;
       handleHistoryRowPick({ docNo, branchCode });
       cleanUrl();
     }
   }, [location.search, handleHistoryRowPick, cleanUrl]);
 

  const printData = {
    jv_no: documentNo,
    branch: branchCode,
    doc_id: docType
  };

  const handleCloseCustModal = async (selectedData) => {
    if (!selectedData) {
      updateState({ custModalOpen: false });
      return;
    }

    updateState({ custModalOpen: false });
    updateState({ isLoading: true });

    try {
      const custDetails = {
        custCode: selectedData?.custCode || '',
        custName: selectedData?.custName || '',
        currCode: selectedData?.currCode || ''
      };

      updateState({
        custName: selectedData.custName,
        custCode: selectedData.custCode
      });      

      if (!selectedData.currCode) {
        const payload = { CUST_CODE: selectedData.custCode };
        const response = await postRequest("getCustomer", JSON.stringify(payload));

        if (response.success) {
          const data = JSON.parse(response.data[0].result);
          custDetails.currCode = data[0]?.currCode;
        } else {
          console.warn("API call for getCustomer returned success: false", response.message);
        }
      } 

      await Promise.all([
        handleSelectCurrency(custDetails.currCode),
        updateState({ attention: custDetails.attention })
      ]);

    } catch (error) {
      console.error("Error fetching customer details:", error);
    } finally {
      updateState({ isLoading: false });
    }
  };     

  const updateTotals = (rows) => {
    let totalVAT = 0;
    let totalATC = 0;
    let totalJvAmt = 0;

    rows.forEach(row => {
      const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
      const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;
      const jvAmount = parseFormattedNumber(row.jvAmount || 0) || 0;

      totalJvAmt += jvAmount;
      totalVAT += vatAmount;
      totalATC += atcAmount;
    });

    updateTotalsDisplay(totalJvAmt + totalVAT + totalATC, 0, totalJvAmt, totalVAT, totalATC, totalJvAmt);
  };

  const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...detailRows];
    let row = { ...updatedRows[index] };

    if (field === 'vatCode') {
      row.vatCode = value.vatCode;
      row.vatAcct = value.acctCode;
      row.vatName = value.vatName;     
    }

    if (field === 'atcCode') {
      row.atcCode = value.atcCode;
      row.atcName = value.atcName;     
    }

    if (field === 'billCode') {
      row.jvAmount = "0.00";
      row.vatAmount = "0.00";
      row.atcAmount = "0.00";
    }

    if (['glAcct', 'discAcct'].includes(field)) {
      row[field] = value.acctCode;
    }

    if (field === 'rcCode') {
      row.rcCode = value.rcCode;
    }

    if (runCalculations) {  
      const origVatCode = row.vatCode || "";
      const origAtcCode = row.atcCode || "";

      // shared calculation logic
      async function recalcRow(newJvAmt) {
        const newVatAmount = origVatCode ? await useTopVatAmount(origVatCode, newJvAmt) : 0;
        const newNetOfVat = +(newJvAmt - newVatAmount).toFixed(2);
        const newATCAmount = origAtcCode ? await useTopATCAmount(origAtcCode, newNetOfVat) : 0;
        const newAmountDue = +(newJvAmt - newATCAmount).toFixed(2);

        row.vatAmount = formatNumber(newVatAmount);
        row.atcAmount = formatNumber(newATCAmount);
        row.jvAmount = formatNumber(newAmountDue);
      }        

      if (field === 'vatCode' || field === 'atcCode') {
        async function updateVatAndAtc() {
          const currentJvAmt = parseFormattedNumber(row.jvAmount) || 0;
          let newVatAmount = parseFormattedNumber(row.vatAmount) || 0;

          if (field === 'vatCode') {
            newVatAmount = row.vatCode ? await useTopVatAmount(row.vatCode, currentJvAmt) : 0;
            row.vatAmount = newVatAmount.toFixed(2);
          }

          const newNetOfVat = +(currentJvAmt - newVatAmount).toFixed(2);
          const newATCAmount = row.atcCode ? await useTopATCAmount(row.atcCode, newNetOfVat) : 0;

          row.atcAmount = newATCAmount.toFixed(2);
          row.jvAmount = +(currentJvAmt - newATCAmount).toFixed(2);
        }

        await updateVatAndAtc();
      }
    }

    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };   

  const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...state.detailRowsGL];
    let row = { ...updatedRowsGL[index] };

    if (['acctCode', 'slCode', 'rcCode', 'sltypeCode', 'vatCode', 'atcCode'].includes(field)) {
      const data = await useUpdateRowGLEntries(row, field, value, custCode, docType);
      if (data) {
        row.acctCode = data.acctCode;
        row.sltypeCode = data.sltypeCode;
        row.slCode = data.slCode;
        row.rcCode = data.rcCode;
        row.vatCode = data.vatCode;
        row.vatName = data.vatName;
        row.atcCode = data.atcCode;
        row.atcName = data.atcName;
        row.particular = data.particular;
      }
    }

    if (['debit', 'credit', 'debitFx1', 'creditFx1', 'debitFx2', 'creditFx2'].includes(field)) {
      row[field] = value;
      const parsedValue = parseFormattedNumber(value);
      const pairs = {
        debit: "credit",
        credit: "debit",
        debitFx1: "creditFx1",
        creditFx1: "debitFx1",
        debitFx2: "creditFx2",
        creditFx2: "debitFx2"
      };

      if (parsedValue > 0 && pairs[field]) {
        row[pairs[field]] = "0.00";
      }
    }

    if (['slRefNo', 'slRefDate', 'remarks'].includes(field)) {
      row[field] = value;
    }

    updatedRowsGL[index] = row;
    updateState({ detailRowsGL: updatedRowsGL });
  };

  const handleBlurGL = async (index, field, value, autoCompute = false) => {
    const updatedRowsGL = [...state.detailRowsGL];
    const row = { ...updatedRowsGL[index] };

    const parsedValue = parseFormattedNumber(value);
    row[field] = formatNumber(parsedValue);

    if (autoCompute && ((withCurr2 && currCode !== glCurrDefault) || (withCurr3))) {
      if (['debit', 'credit', 'debitFx1', 'creditFx1', 'debitFx2', 'creditFx2'].includes(field)) {
        const data = await useUpdateRowEditEntries(row, field, value, currCode, currRate, header.jv_date); 
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
        ["debitFx2", "creditFx2"]
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

  const handleCloseAccountModal = (selectedAccount) => {
    if (selectedAccount && selectedRowIndex !== null) {
      const specialAccounts = ['salesAcct', 'arAcct', 'discAcct', 'vatAcct'];
      if (specialAccounts.includes(accountModalSource)) {
        handleDetailChange(selectedRowIndex, accountModalSource, selectedAccount, false);
      } else {
        handleDetailChangeGL(selectedRowIndex, 'acctCode', selectedAccount);
      }      
    }
    updateState({
      showAccountModal: false,
      selectedRowIndex: null,
      accountModalSource: null
    });
  };

  const handleCloseRcModalGL = async (selectedRc) => {
    if (selectedRc && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, 'rcCode', selectedRc, false);
      } else {
        const result = await useTopRCRow(selectedRc.rcCode);
        if (result) {
          handleDetailChangeGL(selectedRowIndex, 'rcCode', result);
        }
      }
    }
    updateState({
      showRcModal: false,
      selectedRowIndex: null,
      accountModalSource: null
    });
  };

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      if (selectedSl) {
        handleDetailChangeGL(selectedRowIndex, 'slCode', selectedSl);
      }
    }
    updateState({
      showSlModal: false,
      selectedRowIndex: null
    });
  };

  const handleCloseCancel = async (confirmation) => {
  if (confirmation && documentStatus !== "OPEN" && documentID !== null) {
    const result = await useHandleCancel(docType, documentID, "NSI", confirmation.reason, updateState);

    if (result.success) {
      Swal.fire({
        icon: "success",
        title: "Success",
        text: result.message,
      });
    }

    await fetchTranData(documentNo, branchCode);
  }
  updateState({ showCancelModal: false });
};



const handleClosePost = async (confirmation) => {
    if(documentStatus !== "OPEN" && documentID !== null ) {

      const result = await useHandlePost(docType,documentID,"NSI",updateState);
      if (result.success) 
      {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: result.message,
        });       
      } 
     await fetchTranData(documentNo,branchCode);
    }
    updateState({showPostModal: false});
};


const handleCloseSignatory = async (mode) => {
  
    updateState({ 
        showSpinner: true,
        showSignatoryModal: false,
        noReprints: mode === "Final" ? 1 : 0, });
    await useHandlePrint(documentID, docType, mode );
    updateState({
      showSpinner: false 
    });

};

const handleSaveAndPrint = async (documentID) => {
  updateState({ showSpinner: true });
  await useHandlePrint(documentID, docType);
  updateState({ showSpinner: false });
};



const handleCloseBillCodeModal = async (selectedBillCode) => {
  if (selectedBillCode && selectedRowIndex !== null) {
    const result = await useTopBillCodeRow(selectedBillCode.billCode);
    if (result) {
      handleDetailChange(selectedRowIndex, "billCode", result);
    }
  }
  updateState({
    showBillCodeModal: false,
    selectedRowIndex: null,
  });
};

const handleCloseVatModal = async (selectedVat) => {
  if (selectedVat && selectedRowIndex !== null) {
    const result = await useTopVatRow(selectedVat.vatCode);
    if (!result) return;

    accountModalSource !== null
      ? handleDetailChange(selectedRowIndex, "vatCode", result, true)
      : handleDetailChangeGL(selectedRowIndex, "vatCode", result);
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

    accountModalSource !== null
      ? handleDetailChange(selectedRowIndex, "atcCode", result, true)
      : handleDetailChangeGL(selectedRowIndex, "atcCode", result);
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
          : await useTopForexRate(currCode, header.jv_date);

      updateState({
        currCode: result.currCode,
        currName: result.currName,
        currRate: formatNumber(parseFormattedNumber(rate), 6),
      });
    }
  }
};

const handleCloseBillTermModal = async (selectedBillTerm) => {
  if (selectedBillTerm) {
    handleSelectBillTerm(selectedBillTerm.billtermCode);
  }
  updateState({ billtermModalOpen: false });
};

const handleSelectBillTerm = async (billtermCode) => {
  if (billtermCode) {
    const result = await useTopBillTermRow(billtermCode);
    if (result) {
      updateState({
        billtermCode: result.billtermCode,
        billtermName: result.billtermName,
        daysDue: result.daysDue,
      })
    }
  }
};


// const handleFieldBehavior = (option) => {
//   switch (option) {

//     case "disableOnSaved":
//      return (
//         isFormDisabled ||
//         (selectedJVType === "CR11" && state.documentNo !== "" )
//       );



//     default:
//       return false; 
//   }
// };

  const handleJVTypeChange = (e) => {
   const selectedType = e.target.value;
    updateState({selectedJVType:selectedType})
     
  };

  const handleRefDocTypeChange = (e) => {
   const selectedType = e.target.value;
    updateState({selectedRefDocType:selectedType})
     
  };

return (

    <div className="global-tran-main-div-ui">

      {showSpinner && <LoadingSpinner />}

      <div className="global-tran-headerToolbar-ui">
      <Header 
  docType={docType} 
  pdfLink={pdfLink} 
  videoLink={videoLink}
  onPrint={handlePrint} 
  printData={printData} 
  onReset={handleReset}
  onSave={() => handleActivityOption("Upsert")}
  onPost={handlePost} 
  onCancel={handleCancel} 
  onCopy={handleCopy} 
  // onAttach={handleAttach}
  // onHistory={() => setTopTab("history")}
  // isSaveDisabled={isSaveDisabled} // Pass disabled state
  // isResetDisabled={isResetDisabled} // Pass disabled state

          onAttach={handleAttach}
          activeTopTab={topTab} 
          showActions={topTab === "details"} 
          showBIRForm={false}      
          onDetails={() => setTopTab("details")}
          onHistory={() => setTopTab("history")}
          disableRouteNavigation={true}         
          isSaveDisabled={isSaveDisabled} 
          isResetDisabled={isResetDisabled} 
          detailsRoute="/page/SOA"


/>
      </div>

  <div className={topTab === "details" ? "" : "hidden"}>
      {/* Page title and subheading */} 

      {/* Header Section */}
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


{/* Form Layout with Tabs */}
<div className="global-tran-header-div-ui">

    {/* Tab Navigation */}
    <div className="global-tran-header-tab-div-ui">
        <button
            className={`global-tran-tab-padding-ui ${
                activeTab === 'basic'
                ? 'global-tran-tab-text_active-ui'
                : 'global-tran-tab-text_inactive-ui'
            }`}
            onClick={() => setActiveTab('basic')}
        >
            Basic Information
        </button>
        {/* Provision for Other Tabs */}
    </div>

    {/* JV Header Form Section - Main Grid Container */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="jv_hd">

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Nested grid for 2 columns */}

            {/* Column 1 */}
            <div className="global-tran-textbox-group-div-ui">
                {/* Branch Name Input with lookup button */}
                <div className="relative">
                    <input
                        type="text"
                        id="branchName"
                        placeholder=" "
                        value={branchName}
                        readOnly
                        onFocus={(e) => e.target.blur()}
                        className="peer global-tran-textbox-ui cursor-pointer select-none"
                    />
                    <label htmlFor="branchName" className="global-tran-floating-label">
                        Branch
                    </label>
                    <button
                        type="button"
                        className={`global-tran-textbox-button-search-padding-ui ${
                            isFetchDisabled
                            ? "global-tran-textbox-button-search-disabled-ui"
                            : "global-tran-textbox-button-search-enabled-ui"
                        } global-tran-textbox-button-search-ui`}
                        disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                {/*  Number Field */}
                <div className="relative">
                    <input
                        type="text"
                        id="jvNo"
                        value={state.documentNo}
                        onChange={(e) => updateState({ documentNo: e.target.value })}
                        onBlur={handleSviNoBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            document.getElementById("JVDate")?.focus();
                          }}}
                        placeholder=" "
                        className={`peer global-tran-textbox-ui ${state.isDocNoDisabled ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                        disabled={state.isDocNoDisabled}
                    />
                    <label htmlFor="jvNo" className="global-tran-floating-label">
                        JV No.
                    </label>
                    <button
                        className={`global-tran-textbox-button-search-padding-ui ${
                            (state.isFetchDisabled || state.isDocNoDisabled)
                            ? "global-tran-textbox-button-search-disabled-ui"
                            : "global-tran-textbox-button-search-enabled-ui"
                        } global-tran-textbox-button-search-ui`}
                        disabled={state.isFetchDisabled || state.isDocNoDisabled}
                        onClick={() => {
                            if (!state.isDocNoDisabled) {
                                fetchTranData(state.documentNo,state.branchCode);
                            }
                        }}
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                {/* JV Date Picker */}
                <div className="relative">
                    <input type="date"
                        id="JVDate"
                        className="peer global-tran-textbox-ui"
                        value={header.jv_date}
                        onChange={(e) => setHeader((prev) => ({ ...prev, jv_date: e.target.value }))}
                        disabled={isFormDisabled} 
                    />
                    <label htmlFor="JVDate" className="global-tran-floating-label">JV Date</label>
                </div>

                
            </div>





            {/* Column 2 */}
            <div className="global-tran-textbox-group-div-ui">
              {/* Customer Code */}
                <div className="relative">
                    <input type="text"
                        id="custCode"
                        value={custCode}
                        readOnly
                        placeholder=" "
                        className="peer global-tran-textbox-ui"
                    />
                    <label htmlFor="CustCode"className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui">  </span>Customer Code
                    </label>
                    <button
                        type="button"
                        onClick={() => updateState({ custModalOpen: true })}
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

                {/* Customer Name Display - Make this wider */}
                <div className="relative w-full md:w-6/6 lg:w-4/4"> {/* Added width classes here */}
                    <input type="text" id="custName" placeholder=" " value={custName} className="peer global-tran-textbox-ui"/>
                    <label htmlFor="custName"className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui">  </span>Customer Name
                    </label>
                </div>
                
                <div className="relative">
                    <select id="jvType"
                        className="peer global-tran-textbox-ui"
                        value={selectedJVType}
                        // disabled={handleFieldBehavior("disableOnSaved")} 
                        onChange={(e) => handleJVTypeChange(e)}
                    >
                        {jvTypes.length > 0 ?
                        (
                            <>  
                                {jvTypes.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading Transaction Types...</option>)}
                    </select>
                    <label htmlFor="jvType" className="global-tran-floating-label">JV Type</label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>


                  </div>


            {/* Column 3 */}
            {/* Ref Doc Type */}
            <div className="global-tran-textbox-group-div-ui">
       
          
                <div className="relative">
                    <select id="refDocType"
                        className="peer global-tran-textbox-ui"
                        value={selectedRefDocType}
                        // disabled={handleFieldBehavior("disableOnSaved")} 
                        onChange={(e) => handleRefDocTypeChange(e)}
                    >
                        {refdocTypes.length > 0 ?
                        (
                            <>  
                                {refdocTypes.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading Ref Doc Types...</option>)}
                    </select>
                    <label htmlFor="refDocType" className="global-tran-floating-label">JV Type</label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>


                          


                       {/* Ref Doc No */}
                       <div className="relative">
                        <input
                         type="text"
                         id="refDocNo"
                        value={refDocNo}
                        placeholder=" "
                     onChange={(e) => updateState({ refDocNo: e.target.value })}
                    //  onClick={() => {
                    //         if (!state.isDocNoDisabled) {
                    //             fetchTranData(state.documentNo,state.branchCode);
                    //         }
                    //     }}
                     className="peer global-tran-textbox-ui"
                     onKeyDown ={(e) => {
                      if (e.key === "Enter"){
                        e.preventDefault ();
                        // reversal(refDocNo)
                        fetchTranDataReversal(state.refDocNo,state.branchCode);
                      }
                     }}
                     disabled={isFormDisabled}
                     />
                    <label
                     htmlFor="refDocNo"
                     className="global-tran-floating-label"
                    >
                   Ref Doc No. 
                    </label>
                    </div>

                          {/* Ref Amount No. */}
                       <div className="relative">
                <input type="text" id="totalGrossAmount" value={totals.totalGrossAmount} placeholder=" " className="peer global-tran-textbox-ui text-right"/>
                <label htmlFor="totalGrossAmount" className="global-tran-floating-label">Reference Amount</label>
            </div>
                    </div>

         
            {/* Remarks Section - Now inside the 3-column container, spanning all 3 */}
            <div className="col-span-full">
                <div className="relative p-2"> 
                    <textarea
                        id="remarks"
                        placeholder=""
                        rows={4}
                        className="peer global-tran-textbox-remarks-ui pt-2"
                        value={remarks}
                        onChange={(e) => updateState({ remarks: e.target.value })}
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

        </div> {/* End of the 3-column container */}

        {/* Column 4 - Totals (remains unchanged, but its parent is now the main 4-column grid) */}
        <div className="global-tran-textbox-group-div-ui">
           {/* NEW FLEX CONTAINER FOR CURRENCY AND CURRENCY RATE */}
                <div className="flex space-x-4"> {/* Added flex container with spacing */}

                    {/* Currency */}
                    <div className="relative flex-grow w-2/3"> {/* Used flex-grow to make it longer */}
                        <input type="text" 
                            id="currCode" 
                            value={currCode}  
                            className="peer global-tran-textbox-ui hidden"/>
                            
                          <input type="text" 
                            id="currName" 
                            value={currName}  
                            className="peer global-tran-textbox-ui"/>

                        <label htmlFor="currCode" className="global-tran-floating-label">Currency</label>
                        <button onClick={() => {updateState({ currencyModalOpen: true })}}                        
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

 

                    {/* Currency Rate */}
                    <div className="relative flex-grow"> {/* Used flex-grow to take remaining space (or you can use w-1/3) */}
                        <input type="text" id="currRate" value={currRate} 
                            onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                                updateState({ currRate: sanitizedValue })
                            }}}
                            onBlur={handleCurrRateNoBlur}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault(); 
                                document.getElementById("refDocNo1")?.focus();
                              }}}
                            onFocus={(e) => {
                              if (parseFormattedNumber(e.target.value) === 0) {
                                e.target.value = "";
                              }
                            }} 

                            placeholder=" "
                            className="peer global-tran-textbox-ui text-right" disabled={isFormDisabled || glCurrDefault === currCode} />
                            
                        <label htmlFor="currName" className="global-tran-floating-label"> Currency Rate
                        </label>
                    </div>
                </div>
        </div>

    </div>
</div>
     
 
    {/* General Ledger Button */}
    <div className="global-tran-tab-div-ui">

      {/* Tab Navigation */}
      <div className="global-tran-tab-nav-ui">

      {/* Tabs */}
      <div className="flex flex-row sm:flex-row">
        <button
          className={`global-tran-tab-padding-ui ${
            GLactiveTab === 'invoice'
              ? 'global-tran-tab-text_active-ui'
              : 'global-tran-tab-text_inactive-ui'
          }`}
          onClick={() => setGLActiveTab('invoice')}
        >
          General Ledger
        </button>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={() => handleActivityOption("GenerateGL")}
          className="global-tran-button-generateGL"
          disabled={isLoading} // Optionally disable button while loading
          style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
        >
          {isLoading ? 'Generating...' : 'Generate GL Entries'}
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
            <th className="global-tran-th-ui w-[2000px]">Particulars</th>
            <th className="global-tran-th-ui">VAT Code</th>
            <th className="global-tran-th-ui">VAT Name</th>
            <th className="global-tran-th-ui">ATC Code</th>
            <th className="global-tran-th-ui ">ATC Name</th>

            <th className="global-tran-th-ui">Debit ({glCurrDefault})</th>
            <th className="global-tran-th-ui">Credit ({glCurrDefault})</th>
            
            <th className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}>
              Debit ({withCurr3 ? glCurrGlobal2 : currCode})
            </th>
            <th className={`global-tran-th-ui ${withCurr2 ? "" : "hidden"}`}>
              Credit ({withCurr3 ? glCurrGlobal2 : currCode})
            </th>
            <th className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}>
              Debit ({glCurrGlobal3})
            </th>
            <th className={`global-tran-th-ui ${withCurr3 ? "" : "hidden"}`}>
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
              
              <td className="global-tran-td-ui text-center">{index + 1}</td>

              <td className="global-tran-td-ui">
                <div className="relative w-fit">
                  <input
                    type="text"
                    className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                    value={row.acctCode || ""}
                    onChange={(e) => handleDetailChangeGL(index, 'acctCode', e.target.value)}      
      
                  />
                  {!isFormDisabled && (
                  <FontAwesomeIcon 
                    icon={faMagnifyingGlass} 
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                    onClick={() => {
                        updateState({
                            selectedRowIndex: index,
                            showAccountModal: true,
                            accountModalSource: "acctCode" 
                        });
                    }}
                  />)}
                </div>
              </td>



              <td className="global-tran-td-ui">
                <div className="relative w-fit">
                    <input
                        type="text"
                        className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                        value={row.rcCode || ""}
                        onChange={(e) => handleDetailChangeGL(index, 'rcCode', e.target.value)}
                        readOnly
                    />
                   {!isFormDisabled && (row.rcCode === "REQ RC" || (row.rcCode && row.rcCode !== "REQ RC")) && (
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
                  onChange={(e) => handleDetailChangeGL(index, 'sltypeCode', e.target.value)}
                />
              </td>

            

              <td className="global-tran-td-ui">
                  <div className="relative w-fit">
                      <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.slCode || ""}
                          onChange={(e) => handleDetailChangeGL(index, 'slCode', e.target.value)}
                          readOnly
                      />

                      {!isFormDisabled && (row.slCode === "REQ SL" || row.slCode) && ( 
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
                      <input
                        type="text"
                        className="w-[300px] global-tran-td-inputclass-ui"
                        value={row.particular || ""}
                        onChange={(e) => handleDetailChange(index, 'particular', e.target.value)}
                      />
                </td>
             

               <td className="global-tran-td-ui">
                  <div className="relative w-fit">
                      <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.vatCode || ""}
                          onChange={(e) => handleDetailChangeGL(index, 'vatCode', e.target.value)}
                          readOnly
                      />

                      {!isFormDisabled && row.vatCode && row.vatCode.length > 0 && (
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
                />
              </td>
             


               <td className="global-tran-td-ui">
                  <div className="relative w-fit">
                      <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.atcCode || ""}
                          onChange={(e) => handleDetailChangeGL(index, 'atcCode', e.target.value)}
                          readOnly
                      />

                      {!isFormDisabled && (row.atcCode !== "" || row.atcCode) && ( 
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
                  onChange={(e) => handleDetailChange(index, 'atcName', e.target.value)}
                />
              </td>




              <td className="global-tran-td-ui text-right">             
              <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.debit || ""}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debit", sanitizedValue);
                        }}}

                  onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debit', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "debit", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'debit', e.target.value)}
                  
                /> 
            </td>

              <td className="global-tran-td-ui text-right">
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.credit || ""}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "credit", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'credit', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "credit", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'credit', e.target.value)}
                />
              </td>

               <td className={`global-tran-td-ui text-right ${withCurr2? "" : "hidden"}`}>
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.debitFx1 || ""}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debitFx1", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debitFx1', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "debitFx1", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'debitFx1', e.target.value)}
                />
              </td>
               <td className={`global-tran-td-ui text-right ${withCurr2? "" : "hidden"}`}>
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.creditFx1 || ""}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "creditFx1", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'creditFx1', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "creditFx1", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'creditFx1', e.target.value)}
                />
              </td>

               <td className={`global-tran-td-ui text-right ${withCurr3? "": "hidden"}`}>
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.debitFx2 || ""}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debitFx2", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debitFx2', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "debitFx2", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'debitFx2', e.target.value)}
                />
              </td>
              <td className={`global-tran-td-ui text-right ${withCurr3? "": "hidden"}`}>
                <input
                  type="text"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.creditFx2 || ""}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "creditFx2", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'creditFx2', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                          handleDetailChangeGL(index, "creditFx2", "");
                        }
                      }}
                  onBlur={(e) => handleBlurGL(index, 'creditFx2', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.slRefNo || ""}
                  maxLength={25}
                  onChange={(e) => handleDetailChangeGL(index, 'slRefNo', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="date"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.slRefDate || ""}
                  onChange={(e) => handleDetailChangeGL(index, 'slRefDate', e.target.value)}
                />

              </td>
                <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.remarks || header.remarks || ""}
                  onChange={(e) => handleDetailChangeGL(index, 'remarks', e.target.value)}
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
          style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
        >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
        </button>
      </div>

      

      {/* Totals Section */}
      <div className="global-tran-tab-footer-total-main-div-ui">

      {/* Total Debit */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
          Total Debit:
        </label>
        <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
      {totalDebit}
      </label>
      </div>

      {/* Total Credit */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
          Total Credit:
        </label>
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
      {totalCredit}
      </label>
      </div>
    </div>

    

  </div>



</div>




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


{billtermModalOpen && (
  <BillTermLookupModal 
      isOpen={billtermModalOpen}
      onClose={handleCloseBillTermModal}
    />
)}



{custModalOpen && (
  <CustomerMastLookupModal
    isOpen={custModalOpen}
    onClose={handleCloseCustModal}
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


{/* Billing Codes Modal  Invoice Detail */}
{showBillCodeModal && (
  <BillCodeLookupModal  
    isOpen={showBillCodeModal}
    onClose={handleCloseBillCodeModal}
  />
)}



{/* VAT Code Modal */}
{showVatModal && (
  <VATLookupModal  
    isOpen={showVatModal}
    onClose={handleCloseVatModal}
    customParam="OutputService"
  />
)}



{/* ATC Code Modal */}
{showAtcModal && (
  <ATCLookupModal  
    isOpen={showAtcModal}
    onClose={handleCloseAtcModal}
  />
)}


{/* SL Code Lookup Modal */}
{showSlModal && (
  <SLMastLookupModal
    isOpen={showSlModal}
    onClose={handleCloseSlModalGL}
  />
)}


{/* Cancellation Modal */}
{showCancelModal && (
  <CancelTranModal
    isOpen={showCancelModal}
    onClose={handleCloseCancel}
  />
)}


{/* Post Modal */}
{showPostModal && (
  <PostTranModal
    isOpen={showPostModal}
    onClose={handleClosePost}
  />
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
    params={{noReprints,documentID,docType}}
    onClose={handleCloseSignatory}
    onCancel={() => updateState({ showSignatoryModal: false })}
  />
)}



    {showSpinner && <LoadingSpinner />}
     </div>



  <div className={topTab === "history" ? "" : "hidden"}>
      <AllTranHistory
        showHeader={false}
        endpoint="/getJVHistory"
        cacheKey={`JV:${state.branchCode || ""}:${state.docNo || ""}`}  // ✅ per-transaction
        activeTabKey="JV_Summary"
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







export default JV;

