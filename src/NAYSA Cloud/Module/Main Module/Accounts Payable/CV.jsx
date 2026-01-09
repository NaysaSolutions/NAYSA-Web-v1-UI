import React, { useState, useEffect, useRef, useCallback  } from "react";
import Swal from 'sweetalert2';
import { useNavigate } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faSpinner } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import PayeeMastLookupModal from "../../../Lookup/SearchVendMast";
import COAMastLookupModal from "../../../Lookup/SearchCOAMast.jsx";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import VATLookupModal from "../../../Lookup/SearchVATRef.jsx";
import ATCLookupModal from "../../../Lookup/SearchATCRef.jsx";
import SLMastLookupModal from "../../../Lookup/SearchSLMast.jsx";
import BankLookupModal from "../../../Lookup/SearchBankMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import PostTranModal from "../../../Lookup/SearchPostRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";


// Configuration
import { fetchData , postRequest, fetchDataJsonLookup } from '../../../Configuration/BaseURL.jsx'
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
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopVatAmount,
  useTopATCAmount,
  useTopBankRow,
  useTopBankMastRow,
} from '@/NAYSA Cloud/Global/top1RefTable';


import {
  useGetCurrentDay,
  useFormatToDate,
} from '@/NAYSA Cloud/Global/dates';


import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
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


import {
  useSelectedOpenAPBalance,
  useSelectedHSColConfig,
} from '@/NAYSA Cloud/Global/selectedData';


// Header
import Header from '@/NAYSA Cloud/Components/Header';


const CV = () => {
   const loadedFromUrlRef = useRef(false);
   const navigate = useNavigate();
   const [topTab, setTopTab] = useState("details"); // "details" | "history"
   const { user } = useAuth();
   const { resetFlag } = useReset();
   const [state, setState] = useState({

    // HS Option
    glCurrMode:"M",
    glCurrDefault:"PHP",
    withCurr2:false,
    withCurr3:false,
    glCurrGlobal1:"",
    glCurrGlobal2:"",
    glCurrGlobal3:"",


    
    // Document information
    documentName: "",
    documentSeries: "Auto",
    documentDocLen: 8,
    documentID: null,
    documentNo: "",
    documentStatus:"",
    documentDate:useGetCurrentDay(),   
    status: "OPEN",
    noReprints:"0",


    // UI state
    activeTab: "basic",
    GLactiveTab: "invoice",
    isLoading: false,
    showSpinner: false,
    triggerGLEntries:false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,


     // Header information
    header: {
      cv_date: new Date().toISOString().split('T')[0],
      ck_date: new Date().toISOString().split('T')[0]
    },

    branchCode: "HO",
    branchName: "Head Office",
    
    // Vendor information
    vendCode: "",
    vendName: "",
    
    // Currency information
    currCode: "PHP",
    currName: "Philippine Peso",
    currRate: "1.000000",
    defaultCurrRate:"1.000000",


    //Other Header Info
    cvWithApvDd :[],
    cvTranTypeDd:[],
    cvPayTypeDd:[],

    selectedWithAPV : "Y",
    selectedCvType : "APV01",
    selectedPayType : "CV01",


    refDocNo1: "",
    refDocNo2: "",
    fromDate: null,
    toDate: null,
    remarks: "",

    bankCode: "",
    bankAcctNo: "",
    checkNo: "",

    userCode: user.USER_CODE, 


    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],
    apTypeDd:[],
    
    globalLookupRow:[],
    globalLookupHeader:[],

    selectedApType : "APV01",

    totalDebit:"0.00",
    totalCredit:"0.00",

    totalDebitFx1:"0.00",
    totalCreditFx1:"0.00",

    totalDebitFx2:"0.00",
    totalCreditFx2:"0.00",

 
    // Modal states
    modalContext: '',
    selectionContext: '',
    selectedRowIndex: null,
    accountModalSource: null,
    showAccountModal:false,
    showRcModal:false,
    showVatModal:false,
    showAtcModal:false,
    showBillCodeModal:false,
    showSlModal:false,
    showBilltermModal:false,
    showAPBalanceModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    payeeModalOpen:false,
    billtermModalOpen:false,
    paytermModalOpen:false,
    bankModalOpen:false,
    showCancelModal:false,
    showPostModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
   });

  const updateState = (updates) => {
      setState(prev => ({ ...prev, ...updates }));
    };

  const {
  // Document info
  documentName,
  documentSeries,
  documentDocLen,
  documentID,
  documentStatus,
  documentNo,
  documentDate,
  status,
  userCode,
  noReprints,

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
  vendCode,
  vendName,
  currCode,
  currName,
  currRate,
  refDocNo1,
  refDocNo2,
  remarks,
  bankCode,
  bankAcctNo,
  checkNo,

  selectedWithAPV,
  selectedPayType,
  selectedCvType,

  withAPV,
  paymentType,
  cvType,

  cvWithApvDd,
  cvTranTypeDd,
  cvPayTypeDd,

  // Transaction details
  detailRows,
  detailRowsGL,
  globalLookupRow,
  globalLookupHeader,
  totalDebit,
  totalCredit,
  totalDebitFx1,
  totalCreditFx1,
  totalDebitFx2,
  totalCreditFx2,

  selectedApType,
  apType,
  cvApTypeDd,


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
  currencyModalOpen,
  branchModalOpen,
  payeeModalOpen,
  bankModalOpen,
  showCancelModal,
  showPostModal,
  showAttachModal,
  showSignatoryModal,
  showAPBalanceModal,


} = state;


  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }

  //Document Global Setup
  const docType = docTypes.CV; 
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || 'Transaction';
 


  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);
  

  //Variables


  const [totals, setTotals] = useState({
  totalOriginalAmount: '0.00',
  totalInvoiceAmount: '0.00',
  totalAppliedAmount: '0.00',
  totalUnappliedAmount: '0.00',
  TotalBalanceAmount: '0.00',
  totalVatAmount: '0.00',
  totalAtcAmount: '0.00',
  totalAmountDue: '0.00',

  totalFxOriginalAmount: '0.00',
  totalFxInvoiceAmount: '0.00',
  totalFxAppliedAmount: '0.00',
  totalFxUnappliedAmount: '0.00',
  TotalFxBalanceAmount: '0.00',
  totalFxVatAmount: '0.00',
  totalFxAtcAmount: '0.00',
  totalFxAmountDue: '0.00',

  });

  const customParamMap = {
        debitAcct: glAccountFilter.ActiveAll,
        apAcct: glAccountFilter.ActiveAll,
        vatAcct: glAccountFilter.VATOutputAcct
  };
  const customParam = customParamMap[accountModalSource] || null;
  const [header, setHeader] = useState({
  cv_date: new Date().toISOString().split('T')[0],
  ck_date: new Date().toISOString().split('T')[0]
  });



  const updateTotalsDisplay = (originalAmt, invoiceAmt, appliedAmt, unappliedAmt, balanceAmt, vat, atc, amtDue) => {
  //console.log("updateTotalsDisplay received RAW totals:", { InvoiceAmt, discAmt, netDisc, vat, atc, amtDue });
    setTotals({
          totalOriginalAmount: formatNumber(originalAmt),
          totalInvoiceAmount: formatNumber(invoiceAmt),
          totalAppliedAmount: formatNumber(appliedAmt),
          totalUnappliedAmount: formatNumber(unappliedAmt),
          TotalBalance: formatNumber(balanceAmt),
          totalVatAmount: formatNumber(vat),
          totalAtcAmount: formatNumber(atc),
          totalAmountDue: formatNumber(amtDue),

          totalFxOriginalAmount: formatNumber(originalAmt),
          totalFxInvoiceAmount: formatNumber(invoiceAmt / currRate),
          totalFxAppliedAmount: formatNumber(appliedAmt / currRate),
          totalFxUnappliedAmount: formatNumber(unappliedAmt / currRate),
          TotalFxBalance: formatNumber(balanceAmt / currRate),
          totalFxVatAmount: formatNumber(vat / currRate),
          totalFxAtcAmount: formatNumber(atc / currRate),
          totalFxAmountDue: formatNumber(amtDue / currRate),

      });
  };



  useEffect(() => {
    const debitSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
    const debitFx1Sum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debitFx1) || 0), 0);
    const creditFx1Sum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.creditFx1) || 0), 0);
  updateState({
    totalDebit: formatNumber(debitSum),
    totalCredit: formatNumber(creditSum),
    totalDebitFx1: formatNumber(debitFx1Sum),
    totalCreditFx1: formatNumber(creditFx1Sum)
  })
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
  }, [vendCode]);




  useEffect(() => {
  if (glCurrMode && glCurrDefault && currCode) {
    loadCurrencyMode(glCurrMode, glCurrDefault, currCode);
  }
}, [glCurrMode, glCurrDefault, currCode]);



  useEffect(() => {
    if (vendName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map(row => ({
        ...row,
        currency: vendName.currCode
      }));
       updateState({ detailRows: updatedRows });
    }
  }, [vendName?.currCode]);


  useEffect(() => {
      updateState({isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);
  

  useEffect(() => {
    loadCompanyData();
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
    
    // Correct way to update the state with a single header object
    updateState({
        header: { 
            cv_date: new Date().toISOString().split("T")[0],
            ck_date: new Date().toISOString().split("T")[0]
        },
        branchCode: "HO",
        branchName: "Head Office",
        withAPV: "Y",
        bankCode: "",
        bankAcctNo: "",
        checkNo: "",
        paymentType: "Y",
        cvType: "APV01",
        refDocNo1: "",
        refDocNo2:"",
        fromDate:null,
        toDate:null,
        remarks:"",
        vendName:"",
        vendCode:"",
        documentNo: "",
        documentID: "",
        detailRows: [],
        detailRowsGL:[],
        documentStatus:"",
        
        // UI state
        activeTab: "basic",
        GLactiveTab: "invoice",
        isDocNoDisabled: false,
        isSaveDisabled: false,
        isResetDisabled: false,
        isFetchDisabled: false,
        status:"Open"
    });

    updateTotalsDisplay(0, 0, 0, 0, 0, 0, 0, 0);
};

const loadCompanyData = async () => {


    updateState({isLoading:true})

    try {
      // 🔹 1. Run these in parallel since they don’t depend on each other
      const [cvPayType, cvTranType, cvWithApv, cvApType] = await Promise.all([
        useTopDocDropDown(docType, "PAY_TYPE"),
        useTopDocDropDown(docType, "CVTRAN_TYPE"),
        useTopDocDropDown(docType, "WITH_APV"),
        useTopDocDropDown("APV", "APVTRAN_TYPE"),
      ]);

      if (cvPayType) {
        updateState({ cvPayTypeDd: cvPayType, selectedPayType: "CV01" });
      }
      if (cvTranType) {
        updateState({ cvTranTypeDd: cvTranType, selectedCvType: "APV01" });
      }
      if (cvWithApv) {
        updateState({ cvWithApvDd: cvWithApv, selectedWithAPV: "Y" });
      }
      if (cvApType) {
        updateState({ cvApTypeDd: cvApType, selectedApType: "APV01" });
      }



      // 🔹 2. Document row (independent)
      const docRow = await useTopDocControlRow(docType);
      if (docRow) {
        updateState({
          documentName: docRow.docName,
          documentSeries: docRow.docName,
          tdocumentDocLen: docRow.docName,
        });
      }



      // 🔹 3. HS Options + Currency row (dependent chain)
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
            currRate: formatNumber(1, 6),
          });
        }
      }



      // 🔹 4. Company + Bank row (dependent chain)
      const company = await useTopCompanyRow();
      if (company) {
        updateState({ depBankCode: company.depBankcode });

        const bank = await useTopBankMastRow(company.depBankcode);
        if (bank) {
          updateState({
            depBankCode: bank.bankCode,
            depAcctName: bank.acctName,
            depAcctNo: bank.bankAcctNo,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }

     updateState({isLoading:false})
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
      if(data){
      updateState({
        documentName: data.docName,
        documentSeries: data.docName,
        tdocumentDocLen: data.docName,
        });
      };
  };



  // const loadDocDropDown = async () => {
  //  const data = await useTopDocDropDown(docType,"SVITRAN_TYPE");
  //     if(data){
  //       updateState({
  //        sviTypes: data,
  //        selectedSVIType: "REG",
  //         });
  //       };    
  //  };
 



const fetchTranData = async (documentNo, branchCode) => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"cvNo");

    if (!data?.cvId) {
      Swal.fire({ icon: 'info', 
        // title: 'No Records Found', 
        text: 'No Records Found.' });
      return resetState();
    }

    // // Format header date
    // let cvDateForHeader = '';
    // if (data.cvDate) {
    //   const d = new Date(data.cvDate);
    //   cvDateForHeader = isNaN(d) ? '' : d.toISOString().split("T")[0];
    // }

    // // Format header date
    // let checkDateForHeader = '';
    // if (data.checkDate) {
    //   const d = new Date(data.checkDate);
    //   checkDateForHeader = isNaN(d) ? '' : d.toISOString().split("T")[0];
    // }

    let cvDateForHeader = data.cvDate ? new Date(data.cvDate).toISOString().split("T")[0] : '';
    let checkDateForHeader = data.checkDate ? new Date(data.checkDate).toISOString().split("T")[0] : '';

    setHeader({
          cv_date: cvDateForHeader,
          ck_date: checkDateForHeader
      });

    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      siDate: item.siDate ? new Date(item.siDate).toISOString().split('T')[0] : '',
      origAmount: formatNumber(item.origAmount),
      currRate: formatNumber(item.currRate),
      siAmount: formatNumber(item.siAmount),
      appliedAmount: formatNumber(item.appliedAmount),
      unappliedAmount: formatNumber(item.unappliedAmount),
      balance: formatNumber(item.balance),
      vatAmount: formatNumber(item.vatAmount),
      atcAmount: formatNumber(item.atcAmount),
      amountDue: formatNumber(item.amountDue),
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
      documentStatus: data.cvStatus,
      status: data.docStatus,
      noReprints: data.noReprints,
      documentID: data.cvId,
      documentNo: data.cvNo,
      branchCode: data.branchCode,
      header: {
        cvDate: cvDateForHeader,
        checkDate: checkDateForHeader,
        cv_date: cvDateForHeader,
        ck_date: checkDateForHeader,
      },
      selectedCvType: data.cvtranType,
      selectedWithAPV: data.withAPV,
      selectedPayType: data.payType,
      vendCode: data.vendCode,
      vendName: data.vendName,
      bankCode: data.bankCode,
      bankAcctNo: data.bankAcctNo,
      checkNo: data.checkNo,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      currAmount: formatNumber(data.currAmount, 2),
      currRate: formatNumber(data.currRate, 6),
      currCode: data.currCode,
      currName: data.currName,
      amount: formatNumber(data.amount, 2),
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


const handleCvNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};

const handleWithAPVChange = (e) => {
  const selectedWithAPV = e.target.value; 
  updateState({ selectedWithAPV: selectedWithAPV }); 
};

const handlePayTypeChange = (e) => {
  const selectedPayType = e.target.value; 
  updateState({ selectedPayType: selectedPayType }); 
};

const handleCvTypeChange = (e) => {
  const selectedCvType = e.target.value;
  updateState({ selectedCvType: selectedCvType });
};




const handleCurrRateNoBlur = (e) => {
  
  const num = formatNumber(e.target.value, 6);
  updateState({ 
        currRate: isNaN(num) ? "1.000000" : num,  
        withCurr2:((glCurrMode === "M" && glCurrDefault !== currCode) || glCurrMode === "D"),
        withCurr3:glCurrMode === "T"
        })

};




 const handleActivityOption = async (action) => {
   
    // if (!detailRows || detailRows.length === 0) {
    //   return;
    //   }

  if (action === "Upsert" && detailRowsGL.length === 0) {
    updateState({ triggerGLEntries: true });
    return;
  }

  if (documentStatus === '') {
   
  updateState({ isLoading: true });

    const {
        branchCode,
        documentNo,
        documentID,
        header,
        selectedWithAPV,
        selectedCvType,
        selectedPayType,
        vendCode,
        vendName,
        bankCode,
        bankAcctNo,
        checkNo,
        refDocNo1,
        refDocNo2,
        OrigAmt,
        currCode,
        currName,
        currRate,
        CheckAmt,
        remarks,
        // userCode, // Assuming userCode is also part of your state
        detailRows,
        detailRowsGL
    } = state;

    // updateState({ isLoading: true });

    const glData = {
      branchCode: branchCode,
      cvNo: documentNo || "",
      cvId: documentID || "",
      cvDate: header.cv_date,
      checkDate: header.ck_date,
      withAPV: selectedWithAPV,
      vendCode: vendCode,
      vendName: vendName,
      cvtranType: selectedCvType,
      payType: selectedPayType,
      bankCode: bankCode,
      bankAcctNo: bankAcctNo,
      checkNo: checkNo,
      refDocNo1: refDocNo1,
      refDocNo2: refDocNo2,
      currAmount: parseFormattedNumber(totals.totalAmountDue),
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      checkAmt: parseFormattedNumber(totals.totalFxAmountDue),
      remarks: remarks || "",
      userCode: "NSI",
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),       
        apvNo: row.apvNo,
        apvDate: row.apvDate,
        rrNo: row.rrNo || "",
        poNo: row.poNo || "",
        siNo: row.siNo || "",
        siDate: row.siDate || header.cv_date,
        origAmount: parseFormattedNumber(row.origAmount || 0),
        currCode: row.currCode || "",
        currRate: parseFormattedNumber(row.currRate),
        siAmount: parseFormattedNumber(row.siAmount || 0),
        appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
        appliedFx: parseFormattedNumber(row.appliedFx || 0),
        unappliedAmount: parseFormattedNumber(row.unappliedAmount || 0),
        balance: parseFormattedNumber(row.balance || 0),
        apAcct: row.apAcct,
        debitAcct: row.debitAcct,
        vatAcct: row.vatAcct,
        rcCode: row.rcCode,
        rcName: row.rcName,
        slCode: row.slCode,
        vatCode: row.vatCode,
        vatName: row.vatName,
        vatAmount: parseFormattedNumber(row.vatAmount || 0),
        atcCode: row.atcCode || "",
        atcName: row.atcName || "",
        atcAmount: parseFormattedNumber(row.atcAmount),
        amountDue: parseFormattedNumber(row.amountDue || 0),
        groupId: row.groupId || ""
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

          console.log("GL Data Payload glData:", glData);
          console.log("GL Data Payload cvDate:", header.cv_date);

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

          console.log("GL Data Payload glData:", glData);

          const response = await useTransactionUpsert(docType, glData, updateState, 'cvId', 'cvNo');
          if (response) {

            useSwalshowSaveSuccessDialog(
              handleReset,
              () => handleSaveAndPrint(response.data[0].cvId)
            );
          }

         
           
        } catch (error) {
            console.error("Error during transaction upsert:", error);
        } finally {
            updateState({ isLoading: false});
        }

        updateState({isDocNoDisabled: true,isFetchDisabled: true,});
    }
  }

};


  const handleAddRow = async () => {

 if(selectedWithAPV ==="Y" ) {
      await handleOpenAPBalance();
      return;
    }

  try {
    const items = await handleFetchDetail(vendCode);
    const itemList = Array.isArray(items) ? items : [items];
    const newRows = await Promise.all(itemList.map(async (item) => {

      return {
        lnNo: "",
        siDate: header.cv_date,
        origAmount:"0.00",
        uomCode: "",
        siAmount: "0.00",
        appliedAmount: "0.00",
        unappliedAmount: "0.00",
        balance: "0.00",
        currCode: currCode,
        currRate: currRate,
        vatCode: selectedCvType === "APV02" ? "" : (item.vatCode || ""),
        vatName: selectedCvType === "APV02" ? "" : (item.vatName || ""),
        vatAmount: selectedCvType === "APV02"
          ? "0.00"
          : (formatNumber(parseFormattedNumber(item.vatAmount)) || "0.00"),

        atcCode: selectedCvType === "APV02" ? "" : (item.atcCode || ""),
        atcName: selectedCvType === "APV02" ? "" :  (item.atcName || ""),
        atcAmount: selectedCvType === "APV02"
          ? "0.00"
          : (formatNumber(parseFormattedNumber(item.atcAmount)) || "0.00"),

        sviAmount: "0.00",
        amountDue: "0.00",
        apAcct: "",
        debitAcct: "",       
        vatAcct: item.vatAcct || "",
        discAcct: "",
        rcCode: "",
        rcName: "",
        slCode: vendCode
        
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
      sltypeCode:"SU",
      slCode: "",
      particulars: "",
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




  const handleFetchDetail = async (vendCode) => {
    if (!vendCode) return [];
  
    try {
      const vendPayload = {
        json_data: {
          vendCode: vendCode,
        },
      };
  
      const vendResponse = await postRequest("addPayeeDetail", JSON.stringify(vendPayload));
      const rawResult = vendResponse.data[0]?.result;
  
      const parsed = JSON.parse(rawResult);
      return parsed;
    } catch (error) {
      console.error("Error fetching data:", error);
      return [];
    }
  };



const handlePrint = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }
  if (documentID) {
    updateState({ showSignatoryModal: true });
  }
};


const handleCancel = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }


  if (documentID && (documentStatus === '')) {
    updateState({ showCancelModal: true });
  }
};


const handlePost = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }


  if (documentID && (documentStatus === '')) {
    updateState({ showPostModal: true });
  }
};





const handleAttach = async () => {
//  if (!detailRows || detailRows.length === 0) {
//       return;
//       }


//   if (documentID ) {
    updateState({ showAttachModal: true });
  // }
};




const handleCopy = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }


  if (documentID ) {
    updateState({ documentNo:"",
                  documentID:"",
                  documentStatus:"",
                  status:"OPEN",
      // Reset detailRows fields
      detailRows: detailRows.map((row) => ({
        ...row,
        siNo: "",
        // siDate: cvDate,
        poNo: "",
        // add more fields here if needed
      })),
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
     const docNo = params.get("cvNo");         
     const branchCode = params.get("branchCode");    
     
     if (!loadedFromUrlRef.current && docNo && branchCode) {
       loadedFromUrlRef.current = true;
       handleHistoryRowPick({ docNo, branchCode });
       cleanUrl();
     }
   }, [location.search, handleHistoryRowPick, cleanUrl]);
 


  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType
  };


  const handleClosePayeeModal = async (selectedData) => {
    if (!selectedData) {
        updateState({ payeeModalOpen: false });
        return;
    }

    updateState({ payeeModalOpen: false });
    updateState({ isLoading: true });

    try {
        const payeeDetails = {
            vendCode: selectedData?.vendCode || '',
            vendName: selectedData?.vendName || '',
            currCode: selectedData?.currCode || '',
        };

        updateState({
            vendName: selectedData.vendName,
            vendCode: selectedData.vendCode
        });
        
        if (!selectedData.currCode) {
            const payload = { VEND_CODE: selectedData.vendCode };
            const response = await postRequest("getPayee", JSON.stringify(payload));

            if (response.success) {
                const data = JSON.parse(response.data[0].result);
                payeeDetails.currCode = data[0]?.currCode;
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }
        }

        await Promise.all([
            handleSelectCurrency(payeeDetails.currCode)
        ]);

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
        updateState({ isLoading: false });
    }
};


  const updateTotals = (rows) => {
  //console.log("updateTotals received rows:", rows); // STEP 5: Check rows passed to updateTotals

  let totalOriginal = 0;
  let totalInvoice = 0;
  let totalApplied = 0;
  let totalUnpplied = 0;
  let totalBalance = 0;
  let totalVAT = 0;
  let totalATC = 0;
  let totalAmtDue = 0;

  rows.forEach(row => {
        // console.log("Row values before parseFormattedNumber:", {
        //     vatAmountRaw: row.vatAmount,
        //     atcAmountRaw: row.atcAmount,
        //     siAmountRaw: row.siAmount,
        //     netDiscRaw: row.netDisc,
        //     unappliedAmountRaw: row.unappliedAmount
        // });
    const originalAmount = parseFormattedNumber(row.origAmount || 0) || 0;
    const invoiceAmount = parseFormattedNumber(row.siAmount || 0) || 0;
    const appliedAmount = parseFormattedNumber(row.appliedAmount || 0) || 0;
    const unappliedAmount = parseFormattedNumber(row.unappliedAmount || 0) || 0;
    const vatAmount = parseFormattedNumber(row.vatAmount || 0) || 0;
    const atcAmount = parseFormattedNumber(row.atcAmount || 0) || 0;
    const balanceAmount = parseFormattedNumber(row.amountDue || 0) || 0;

        // console.log("Row values after parseFormattedNumber:", {
        //     vatAmount, atcAmount, invoiceGross, invoiceNetDisc, invoiceDiscount
        // });
    totalOriginal+= originalAmount;
    totalInvoice+= invoiceAmount;
    totalApplied+= appliedAmount;
    totalUnpplied+= unappliedAmount;
    totalBalance+= balanceAmount;
    totalVAT += vatAmount;
    totalATC += atcAmount;
  });

  if (selectedWithAPV === "Y") {
  totalAmtDue = totalBalance; // <--- POTENTIAL CORRECTION HERE
};
  if (selectedWithAPV === "N") {
  totalAmtDue = totalBalance; // <--- POTENTIAL CORRECTION HERE
};

    updateTotalsDisplay (totalOriginal, totalInvoice, totalApplied, totalUnpplied, totalBalance, totalVAT, totalATC, totalAmtDue);

  };


// const handleDetailChange = async (index, field, value, runCalculations = true) => {
//   const updatedRows = [...detailRows];

//   updatedRows[index] = {
//     ...updatedRows[index],
//     [field]: value,
//   };

//   const row = updatedRows[index];

//   // Map picker payloads → codes/names
//   if (field === "vatCode") {
//     row.vatCode = value.vatCode;
//     row.vatAcct = value.acctCode;
//     row.vatName = value.vatName;
//   }
//   if (field === "atcCode") {
//     row.atcCode = value.atcCode;
//     row.atcName = value.atcName;
//   }
//   if (["debitAcct", "apAcct", "vatAcct"].includes(field)) {
//     row[field] = value.acctCode;
//   }
//   if (field === "rcCode") {
//     row.rcCode = value.rcCode;
//     row.rcName = value.rcName;
//   }
//   if (field === "slCode") {
//     row.slCode = value.slCode;
//   }

//   // ---- NEW: simple balance rule (applied - unapplied) ----
//   if (runCalculations) {
//     // always parse fresh from the row (may be string-formatted)
//     const invoiceAmount = parseFormattedNumber(row.origAmount) || 0;
//     const applied = parseFormattedNumber(row.appliedAmount) || 0;
//     const unapplied = parseFormattedNumber(row.unappliedAmount) || 0;

//     // balance per requirement
//     const newBalance = +(applied - unapplied).toFixed(2);

//     // keep these two aligned if you display both
//     row.balance = formatNumber(newBalance);
//     row.balanceAmount = formatNumber(newBalance);
//     row.siAmount = formatNumber(invoiceAmount);

//     // (optional) if VAT/ATC depend on balance, recompute here:
//     // Only if you want VAT/ATC to follow balance. Otherwise delete this block.
//     if (row.vatCode) {
//       const vatAmt = await useTopVatAmount(row.vatCode, newBalance);
//       row.vatAmount = formatNumber(vatAmt);
//     } else {
//       row.vatAmount = formatNumber(0);
//     }

//     const netOfVat = +(newBalance - (parseFormattedNumber(row.vatAmount) || 0)).toFixed(2);
//     if (row.atcCode) {
//       const atcAmt = await useTopATCAmount(row.atcCode, netOfVat);
//       row.atcAmount = formatNumber(atcAmt);
//     } else {
//       row.atcAmount = formatNumber(0);
//     }

//     // If you show amountDue = balance - ATC (or any rule), update here:
//     const atc = parseFormattedNumber(row.atcAmount) || 0;

//     // row.amountDue = +(newBalance - atc).toFixed(2);

//     if (selectedWithAPV === "Y") {
//       row.amountDue = +(newBalance).toFixed(2);
//     }
//     if (selectedWithAPV === "N") {
//       row.amountDue = +(newBalance - atc).toFixed(2);
//     }

//   }

//   updatedRows[index] = row;
//   updateState({ detailRows: updatedRows });
//   updateTotals(updatedRows);
// };


const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...detailRows];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    }
   
     const row = updatedRows[index];

      if (field === 'vatCode') {
          row.vatCode = value.vatCode,
          row.vatAcct = value.acctCode,
          row.vatName = value.vatName;     
        };

      if (field === 'atcCode' ){
          row.atcCode = value.atcCode,
          row.atcName = value.atcName;     
        };


    if (['debitAcct', 'apAcct', 'vatAcct'].includes(field)) {
      row[field] = value.acctCode;
    }



    if (field === 'rcCode' ){
          row.rcCode = value.rcCode   
          row.rcName = value.rcName  
          
    };


    if (field === 'slCode' ){
          row.slCode = value.slCode   
          
    };

  if (runCalculations) {  
  const origAmount = parseFormattedNumber(row.origAmount) || 0;
  const origCurrRate = parseFormattedNumber(row.currRate) || 0;
  const origInvoiceAmount = parseFormattedNumber(row.siAmount) || 0;
  const origApplied = parseFormattedNumber(row.appliedAmount) || 0;
  const origUnapplied = parseFormattedNumber(row.unappliedAmount) || 0;
  const origBalance = parseFormattedNumber(row.balanceAmount) || 0;
  const origAmtDue = parseFormattedNumber(row.amountDue) || 0;
  const origVatCode = row.vatCode || "";
  const origAtcCode = row.atcCode || "";
  const cvType = row.cvType || "APV01"; // Make sure cvType is assigned correctly
  const withAPV = row.withAPV || "Y";

    const applied = parseFormattedNumber(row.appliedAmount) || 0;
    const unapplied = parseFormattedNumber(row.unappliedAmount) || 0;

  // Shared calculation logic
  async function recalcRow(newAppliedAmount, newUnapplied) {
    const newInvoiceAmount = (origAmount * origCurrRate).toFixed(2);
    const finalAppliedAmount = cvType === "APV01" && withAPV === "Y" ? newInvoiceAmount : newAppliedAmount; // Use a final variable to avoid redeclaring
    const newBalance = +(finalAppliedAmount - newUnapplied).toFixed(2);
    const newVatAmount = origVatCode ? await useTopVatAmount(origVatCode, newBalance) : 0;
    const newNetOfVat = +(newBalance - newVatAmount).toFixed(2);
    const newATCAmount = origAtcCode ? await useTopATCAmount(origAtcCode, newNetOfVat) : 0;

    row.siAmount = formatNumber(newInvoiceAmount);
    row.balanceAmount = formatNumber(newBalance);
    row.vatAmount = formatNumber(newVatAmount);
    row.atcAmount = formatNumber(newATCAmount);
    row.appliedAmount = formatNumber(applied);
    row.unappliedAmount = formatNumber(unapplied);
    // row.balance = formatNumber(newBalance);
    row.balance = +(applied - unapplied).toFixed(2);
    row.origAmount = formatNumber(parseFormattedNumber(row.origAmount));
    row.currRate = formatNumber(parseFormattedNumber(row.currRate));
    // row.amountDue = +(newInvoiceAmount - newATCAmount).toFixed(2);

    
  if (selectedWithAPV === "Y") {
      row.amountDue = +(applied - unapplied).toFixed(2);
  };
  if (selectedWithAPV === "N") {
      row.amountDue = +(newInvoiceAmount - newATCAmount).toFixed(2);
  } 

  }

  if (field === 'origAmount' || field === 'currRate' || field === 'appliedAmount' || field === 'unappliedAmount') {
    const newAppliedAmount = cvType === "APV01" && withAPV === "Y" ? row.appliedAmount : origInvoiceAmount; // Adjust based on condition
    const newUnapplied = parseFormattedNumber(row.unappliedAmount) || 0;
    const newATCAmount = parseFormattedNumber(row.atcAmount) || 0;
    const newInvoiceAmount = +(origAmount * origCurrRate).toFixed(2);
    const newBalance = +(newInvoiceAmount - newAppliedAmount - newUnapplied).toFixed(2);

    row.siAmount = newInvoiceAmount.toFixed(2);
    row.balanceAmount = newBalance.toFixed(2);

  if (selectedWithAPV === "Y") {
      row.amountDue = +(applied - unapplied).toFixed(2);
  };
  if (selectedWithAPV === "N") {
      row.amountDue = +(newBalance - newATCAmount).toFixed(2);
  } 

    await recalcRow(newAppliedAmount, newUnapplied);
  }

  // Handling VAT and ATC code updates
  if (field === 'vatCode' || field === 'atcCode') {
    async function updateVatAndAtc() {
      const newInvoiceBal = +(parseFormattedNumber(row.siAmount) - parseFormattedNumber(row.unappliedAmount)).toFixed(2);
      let newVatAmount = parseFormattedNumber(row.vatAmount) || 0;

      if (field === 'vatCode') {
        newVatAmount = row.vatCode ? await useTopVatAmount(row.vatCode, newInvoiceBal) : 0;
        row.vatAmount = newVatAmount.toFixed(2);
      }

      const newNetOfVat = +(newInvoiceBal - newVatAmount).toFixed(2);
      const newATCAmount = row.atcCode ? await useTopATCAmount(row.atcCode, newNetOfVat) : 0;

      row.atcAmount = newATCAmount.toFixed(2);
      // row.amountDue = +(newInvoiceBal - newATCAmount).toFixed(2);


      if (selectedWithAPV === "Y") {
          row.amountDue = +(newInvoiceBal).toFixed(2)
      }

      if (selectedWithAPV === "N") {
          row.amountDue = +(newInvoiceBal - newATCAmount).toFixed(2);
      } 

    }

    await updateVatAndAtc();
  }
}



    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);

};


// Single source of truth per column
const FIELD_CONFIG = {
  // Visible only when withAPV === 'Y'; also hide on APV02
  apType:     { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
  apvNo:      { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
  rrNo:       { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
  poNo:       { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
  appliedAmount:   { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
  unappliedAmount: { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
  balance:         { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },
  apAcct:          { requireWithAPV: "Y", hideOnCvTypes: ["APV02"] },

  // Always shown unless APV02 (adjust if you want these tied to withAPV)
  siNo:    { requireWithAPV: "ANY", hideOnCvTypes: ["APV02"] },
  siDate:  { requireWithAPV: "ANY", hideOnCvTypes: ["APV02"] },
  origAmount: { requireWithAPV: "ANY", hideOnCvTypes: [] },
  currCode:   { requireWithAPV: "ANY", hideOnCvTypes: [] },
  currRate:   { requireWithAPV: "ANY", hideOnCvTypes: [] },
  siAmount:   { requireWithAPV: "ANY", hideOnCvTypes: [] },
  debitAcct:  { requireWithAPV: "ANY", hideOnCvTypes: [] },
  rcCode:     { requireWithAPV: "ANY", hideOnCvTypes: [] },
  rcName:     { requireWithAPV: "ANY", hideOnCvTypes: [] },
  slCode:     { requireWithAPV: "ANY", hideOnCvTypes: [] },

  // VAT/ATC fields visible only when withAPV === 'N' (per your comment);
  // remove APV02 in hideOnCvTypes if you want them shown for Non-Purchases too
  vatCode:   { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
  vatName:   { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
  vatAmount: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
  atcCode:   { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
  atcName:   { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
  atcAmount: { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },
  vatAcct:   { requireWithAPV: "N", hideOnCvTypes: ["APV02"] },

  amountDue: { requireWithAPV: "ANY", hideOnCvTypes: [] },
};

const isVisible_Dtl1 = (field, cvType, withAPV) => {
  const cfg = FIELD_CONFIG[field];
  if (!cfg) return true;

  // Respect withAPV requirement
  if (cfg.requireWithAPV === "Y" && withAPV !== "Y") return false;
  if (cfg.requireWithAPV === "N" && withAPV !== "N") return false;

  // Respect cvType hide list
  if (cfg.hideOnCvTypes?.includes(cvType)) return false;

  return true;
};


// const isVisible_Dtl1 = (field, cvType, withAPV) => {
//   const rules = {
//     // These fields are visible when withAPV is "Y"
//     apvNo: !["N", "special-case"].includes(withAPV),
//     rrNo: !["N", "special-case"].includes(withAPV),
//     poNo: !["N", "special-case"].includes(withAPV),
//     appliedAmount: !["N", "special-case"].includes(withAPV),
//     unappliedAmount: !["N", "special-case"].includes(withAPV),
//     balance: !["N", "special-case"].includes(withAPV),
//     apAcct: !["N", "special-case"].includes(withAPV),
//     apType: !["N", "special-case"].includes(withAPV),
    
//     // These fields are visible when withAPV is "N"
//     // vatCode: !["Y", "special-case"].includes(withAPV),
//     // vatName: !["Y", "special-case"].includes(withAPV),
//     // vatAmount: !["Y", "special-case"].includes(withAPV),
//     // atcCode: !["Y", "special-case"].includes(withAPV),
//     // atcName: !["Y", "special-case"].includes(withAPV),
//     // atcAmount: !["Y", "special-case"].includes(withAPV),
//     // amountDue: !["Y", "special-case"].includes(withAPV),
//     // vatAcct: !["Y", "special-case"].includes(withAPV),

//     // // These fields are hidden when cvType is "Non Purchases"
//     apvNo: !["APV02", "special-case"].includes(cvType),
//     rrNo: !["APV02", "special-case"].includes(cvType),
//     poNo: !["APV02", "special-case"].includes(cvType),
//     appliedAmount: !["APV02", "special-case"].includes(cvType),
//     unappliedAmount: !["APV02", "special-case"].includes(cvType),
//     balance: !["APV02", "special-case"].includes(cvType),
//     apAcct: !["APV02", "special-case"].includes(cvType),
//     apType: !["APV02", "special-case"].includes(cvType), // Add the missing 'apType' rule here
    
//     siNo: !["APV02", "special-case"].includes(cvType),
//     siDate: !["APV02", "special-case"].includes(cvType),

//     // // These fields are visible when withAPV is "N"
//     vatCode: !["APV02", "special-case"].includes(cvType),
//     vatName: !["APV02", "special-case"].includes(cvType),
//     vatAmount: !["APV02", "special-case"].includes(cvType),
//     atcCode: !["APV02", "special-case"].includes(cvType),
//     atcName: !["APV02", "special-case"].includes(cvType),
//     atcAmount: !["APV02", "special-case"].includes(cvType),
//     vatAcct: !["APV02", "special-case"].includes(cvType),
    
//   };

//   return rules[field] ?? true;
// };


const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...state.detailRowsGL];
    let row = { ...updatedRowsGL[index] };


    if (['acctCode', 'slCode', 'rcCode', 'sltypeCode', 'vatCode', 'atcCode'].includes(field)) {
        const data = await useUpdateRowGLEntries(row,field,value,vendCode,docType);
        if(data) {
            row.acctCode = data.acctCode
            row.sltypeCode = data.sltypeCode
            row.slCode = data.slCode
            row.rcCode = data.rcCode
            row.rcName= data.rcName
            row.vatCode = data.vatCode
            row.vatName = data.vatName
            row.atcCode = data.atcCode
            row.atcName = data.atcName
            row.particular = data.particular
            row.slRefNo = data.slRefNo
            row.slRefDate = data.slRefDate
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

  if(autoCompute && ((withCurr2 && currCode !== glCurrDefault) || (withCurr3))){
  if (['debit', 'credit', 'debitFx1', 'creditFx1', 'debitFx2', 'creditFx2'].includes(field)) {
    const data = await useUpdateRowEditEntries(row,field,value,currCode,currRate,header.cv_date); 
        if(data) {
           row.debit = formatNumber(data.debit)
           row.credit = formatNumber(data.credit)
           row.debitFx1 = formatNumber(data.debitFx1)
           row.creditFx1 = formatNumber(data.creditFx1)
           row.debitFx2 = formatNumber(data.debitFx2)
           row.creditFx2 = formatNumber(data.creditFx2)
        }
    }
  }
  else{
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

        const specialAccounts = ['debitAcct', 'apAcct', 'vatAcct'];
        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(selectedRowIndex, accountModalSource, selectedAccount,false);
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
    updateState({
        showRcModal: false,
        selectedRowIndex: null,
        accountModalSource: null
    })};
};

  const handleCloseSlModalGL = async (selectedSl) => {
    if (selectedSl && selectedRowIndex !== null) {
      if (accountModalSource !== null) {
        handleDetailChange(selectedRowIndex, 'slCode', selectedSl, false);
     
     
      } else {

        handleDetailChangeGL(selectedRowIndex, 'slCode', selectedSl);
          //  const result = await useTopRCRow(selectedSl.slCode);
          //   if (result) {
          //     handleDetailChangeGL(selectedRowIndex, 'slCode', result);
          //   }
    }
    updateState({
        showSlModal: false,
        selectedRowIndex: null,
        accountModalSource: null
    })};
};


//   const handleCloseSlModalGL = async (selectedSl) => {
//     if (selectedSl && selectedRowIndex !== null) {

//         if (selectedSl) {
//           handleDetailChangeGL(selectedRowIndex, 'slCode', selectedSl);
//         }
//     }
//     updateState({
//         showSlModal: false,
//         selectedRowIndex: null
//     });
// };




const handleCloseCancel = async (confirmation) => {
    if(confirmation && documentStatus !== "OPEN" && documentID !== null ) {

      const result = await useHandleCancel(docType,documentID,userCode,confirmation.password,confirmation.reason,updateState);
      if (result.success) 
      {
       Swal.fire({
          icon: "success",
          title: "Success",
          text: "Cancellation Completed",
          timer: 5000, 
          timerProgressBar: true,
          showConfirmButton: false,
        });    
      }    
     await fetchTranData(documentNo,branchCode);
    }
    updateState({showCancelModal: false});
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
        console.log("handleCloseSignatory", { documentID, docType, mode });
    await useHandlePrint(documentID, docType, mode );

    updateState({
      showSpinner: false 
    });

};

const handleOpenAPBalance = async () => {
  console.log('[APBAL] handler fired');

  updateState({ isLoading: true });

  const endpoint = 'getOpenAPBalance';
  console.log('[APBAL] params', { vendCode, branchCode, endpoint });

  try {
    console.log('[APBAL] before fetchDataJson');
    const response = await fetchDataJsonLookup(endpoint, { vendCode, branchCode });
    // Log a safe snapshot so DevTools doesn’t “live mutate” objects
    console.log('[APBAL] response(raw)', response);
    try {
      console.log('[APBAL] response(safe)', JSON.parse(JSON.stringify(response)));
    } catch {
      console.log('[APBAL] response not JSON-serializable (circular/BigInt)');
    }

    const rawResult = response?.data?.[0]?.result;
    console.log('[APBAL] rawResult', rawResult);

    let payeeData = [];
    try {
      payeeData = rawResult ? JSON.parse(rawResult) : [];
    } catch (e) {
      console.warn('[APBAL] JSON.parse failed on result:', e);
      payeeData = [];
    }

    console.log('[APBAL] parsed payeeData length', payeeData.length);

    console.log('[APBAL] fetching colConfig');
    const colConfig = await useSelectedHSColConfig(endpoint);
    console.log('[APBAL] colConfig', colConfig);

    if (!Array.isArray(payeeData) || payeeData.length === 0) {
      await Swal.fire({
        icon: 'info',
        title: 'Open AP Balance',
        text: 'There are no AP balance records for the selected payee/branch.',
      });
      return;
    }

    updateState({
      globalLookupRow: payeeData,
      globalLookupHeader: colConfig ?? [],
      showAPBalanceModal: true,
    });
  } catch (error) {
    console.error('[APBAL] Failed to fetch Open AP Balance:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to fetch Open AP Balance.',
    });
    updateState({
      globalLookupRow: [],
      globalLookupHeader: [],
    });
  } finally {
    updateState({ isLoading: false });
    console.log('[APBAL] done');
  }
};




const handleCloseAPBalance = async (payload) => {
    if (payload && payload !== null) {
      
       updateState({ isLoading: true });

      const result = await useSelectedOpenAPBalance(payload);
      if (result) {   
      const newRows = result.map((entry, idx) => ({    
        lnNo: idx + 1,
        apvNo: entry.apvNo,
        apvDate: entry.apvDate,
        siNo: entry.siNo,
        siDate: entry.siDate,
        poNo: entry.poNo,
        rrNo: entry.rrNo,
        siAmount: formatNumber(entry.balance,2),
        origAmount: formatNumber(entry.balance,2),
        appliedAmount: formatNumber(entry.balance,2),
        appliedFx: formatNumber(entry.balance,2),
        unappliedAmount: "0.00",
        balance: formatNumber(entry.balance,2),
        amountDue: formatNumber(entry.balance,2),
        vatCode: entry.vatCode,
        vatName: entry.vatName,
        vatAmount: formatNumber(entry.vatAmount,2),
        atcCode: entry.atcCode,
        atcName: entry.atcName,
        atcAmount: formatNumber(entry.atcAmount,2),
        rcCode: entry.rcCode,
        rcName: entry.rcName,
        slCode: entry.slCode,
        debitAcct: entry.drAccount,
        apAcct: entry.apAccount,
        vatAcct: entry.vatAccount,
        currCode: entry.currCode,
        currRate: formatNumber(entry.currRate,6) ,
        vendCode: entry.vendCode,
        vendName: entry.vendName,
        refBranchcode: branchCode,
        refDocCode: entry.refDocCode,
        groupId: entry.groupId,
      
      }));

      
      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows});
      updateTotals(updatedRows);
    }  
  }
  updateState({ showAPBalanceModal: false,
                isLoading:false
  });  
};



const handleSaveAndPrint = async (documentID) => {

    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({showSpinner: false});
};




const handleCloseVatModal = async (selectedVat) => { 
  if (selectedVat && selectedRowIndex !== null) {
    
     const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      accountModalSource !== null
        ? handleDetailChange(selectedRowIndex, 'vatCode', result, true)
        : handleDetailChangeGL(selectedRowIndex, 'vatCode', result);   
  }
  updateState({ showVatModal: false ,
                selectedRowIndex: null,
                accountModalSource: null });
};






const handleCloseAtcModal = async (selectedAtc) => {
  if (selectedAtc && selectedRowIndex !== null) {  

    const result = await useTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      accountModalSource !== null
        ? handleDetailChange(selectedRowIndex, 'atcCode', result, true)
        : handleDetailChangeGL(selectedRowIndex, 'atcCode', result);   
  }
  updateState({ showAtcModal: false ,
                selectedRowIndex: null,
                accountModalSource: null });
};



  


const handleCloseBranchModal = (selectedBranch) => {
    if (selectedBranch) {
      updateState({
      branchCode: selectedBranch.branchCode,
      branchName:selectedBranch.branchName
      })
    }
    updateState({ branchModalOpen: false });
  };





  const handleCloseCurrencyModal = async (selectedCurrency) => {
    if (selectedCurrency) {
    handleSelectCurrency(selectedCurrency.currCode);
  };
    updateState({ currencyModalOpen: false });
  }



  const handleSelectCurrency = async (currCode) => {
    if (currCode) {

     const result = await useTopCurrencyRow(currCode);
      if (result) {
        const rate = currCode === glCurrDefault
          ? defaultCurrRate
          : await useTopForexRate(currCode, header.cv_date);
        console.log("Currency Select",glCurrDefault)
        updateState({
          currCode: result.currCode,
          currName: result.currName,
          currRate: formatNumber(parseFormattedNumber(rate),6)
        });
      }
    }
  };



const handleCloseBankModal = async (selectedBank) => {
    if (selectedBank) {
    handleSelectBank(selectedBank.bankCode);
  };
    updateState({ bankModalOpen: false });
}



  const handleSelectBank = async (bankCode) => {
    if (bankCode) {

     const result = await useTopBankRow(bankCode);
      if (result) {
      updateState({
        bankCode:result.bankCode,
        bankAcctNo:result.bankAcctNo,
        checkNo: result.nextCheckNo 
        })     
      }
    }
  };

  
  
// ... assuming `updateState`, `bankCode`, and `documentID` are defined in your component's scope

const handleCheckNoChange = async (e) => {
    const newCheckNo = e.target.value;
    const docId = documentID; // Use a correctly scoped variable

    // Immediately update state to reflect user input
    updateState({ checkNo: newCheckNo });

    // Wait a brief moment to avoid API calls on every keystroke
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const isDuplicate = await checkDuplicateCheckNo(newCheckNo, docId);

        if (isDuplicate) {
            Swal.fire({
                icon: 'error',
                text: 'Duplicate Check Number is not allowed!',
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            });
            // Clear the input only if it's a duplicate
            updateState({ checkNo: "" });
            return;
        }

    } catch (error) {
        console.error('Error in handleCheckNoChange:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred while checking the duplicate check number. Please try again later.',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK'
        });
    }
};

const checkDuplicateCheckNo = async (checkNo, docId) => {
    const selectedBankCode = bankCode;  // Replace with the actual bank code
    console.log('Checking for duplicate with BankCode:', selectedBankCode, 'CheckNo:', checkNo, 'DocId:', docId);

    try {
        // Construct the query parameters
        let params = { bankCode: selectedBankCode, checkNo: checkNo };

        // Append docId if it's provided
        if (docId) {
            params.docId = docId;
        }

        // Make the GET request using the global fetchData function (Axios)
        const data = await fetchData('/getDuplicate', params);

        console.log('API Response Data:', data);
        return data.result === 1; // Return true if duplicate, false otherwise
    } catch (error) {
        console.error('Error fetching data from API:', error);
        Swal.fire({
            icon: 'error',
            title: 'API Error',
            text: 'An error occurred. Please try again later.',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'OK'
        });
        return false;
    }
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
              detailsRoute="/page/CV"
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
            onClick={() => setState(prevState => ({ ...prevState, activeTab: 'basic' }))}
        >
            Basic Information
        </button>
        {/* <button
            className={`global-tran-tab-padding-ui ${activeTab === 'check' ? 'global-tran-tab-text_active-ui' : 'global-tran-tab-text_inactive-ui'}`}
            onClick={() => setState(prevState => ({ ...prevState, activeTab: 'check' }))}
          >
            Check Information
          </button> */}
    </div>

    {/* SVI Header Form Section - Main Grid Container */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="cv_hd">

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"> {/* Nested grid for 3 columns */}

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

                {/* CV Number Field */}
                <div className="relative">
                    <input
                        type="text"
                        id="cvNo"
                        value={state.documentNo}
                        onChange={(e) => updateState({ documentNo: e.target.value })}
                        onBlur={handleCvNoBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            document.getElementById("cvDate")?.focus();
                          }}}
                        placeholder=" "
                        className={`peer global-tran-textbox-ui ${state.isDocNoDisabled ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                        disabled={state.isDocNoDisabled}
                    />
                    <label htmlFor="cvNo" className="global-tran-floating-label">
                        CV No.
                    </label>
                    <button
                        className={`global-tran-textbox-button-search-padding-ui ${
                            (state.isFetchDisabled || state.isDocNoDisabled)
                            ? "global-tran-textbox-button-search-disabled-ui"
                            : "global-tran-textbox-button-search-enabled-ui"
                        } global-tran-textbox-button-search-ui`}
                        // disabled={state.isFetchDisabled || state.isDocNoDisabled}
                        // onClick={() => {
                        //     if (!state.isDocNoDisabled) {
                        //         fetchTranData(state.documentNo,state.branchCode);
                        //     }
                        // }}
                        
                        onClick={() => navigate("/tran-ap-cvtran-history")}
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                {/* CV Date Picker */}
                <div className="relative">
                    <input type="date"
                        id="cvDate"
                        className="peer global-tran-textbox-ui"
                        value={header.cv_date}
                        onChange={(e) => setHeader((prev) => ({ ...prev, cv_date: e.target.value }))}
                        disabled={isFormDisabled} 
                    />
                    <label htmlFor="cvDate" className="global-tran-floating-label">CV Date</label>
                </div>


                {/* With APV */}
                <div className="relative">
                    <select id="withAPV"
                        className="peer global-tran-textbox-ui"
                        value={selectedWithAPV}
                        onChange={handleWithAPVChange}
                        disabled={isFormDisabled} 
                    >
                        {cvWithApvDd.length > 0 ?
                        (
                            <>
                                {cvWithApvDd.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading...</option>)}
                    </select>
                    <label htmlFor="withAPV" className="global-tran-floating-label">With APV</label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>


                {/* Payee Code */}
                <div className="relative">
                    <input type="text"
                        id="vendCode"
                        value={vendCode}
                        readOnly
                        placeholder=" "
                        className="peer global-tran-textbox-ui"
                    />
                    <label htmlFor="CustCode"className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui"> * </span>Payee Code
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

            </div>

            {/* Column 2 */}
            <div className="global-tran-textbox-group-div-ui lg:col-span-2">


                <div className="flex space-x-4"> {/* Added flex container with spacing */}

                {/* Bank Code */}
                <div className="relative flex-grow w-2/4">
                    <input type="hidden" id="bankCode" placeholder="" readOnly value={bankCode || ""}/>
                    <input type="text" id="bankAcctNo" value={bankAcctNo || ""} placeholder="" readOnly className="peer global-tran-textbox-ui"/>
                    <label htmlFor="bankAcctNo" className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui"> * </span>Bank Name
                    </label>
                    <button onClick={() => {updateState({ bankModalOpen: true })}}   
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

                {/* Payment Type */}
                <div className="relative flex-grow w-2/4">
                    <select id="paymentType"
                        className="peer global-tran-textbox-ui"
                        value={selectedPayType}
                        onChange={handlePayTypeChange}
                        disabled={isFormDisabled} 
                    >
                        {cvPayTypeDd.length > 0 ?
                        (
                            <>
                                {cvPayTypeDd.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading...</option>)}
                    </select>
                    <label htmlFor="paymentType" className="global-tran-floating-label">Payment Type</label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>                

                </div>


                <div className="flex space-x-4"> {/* Added flex container with spacing */}

{/*                 
                <div className="relative flex-grow w-2/4">
                    <input type="text" 
                        id="checkNo" 
                        placeholder=" " 
                        value={checkNo} 
                        onChange={(e) => { updateState({ checkNo: e.target.value }); handleCheckNoChange(e); }} 
                        className="peer global-tran-textbox-ui" 
                        disabled={isFormDisabled} />
                    <label htmlFor="checkNo" className="global-tran-floating-label">Check No.</label>
                </div> */}

                <div className="relative flex-grow w-2/4">
                    <input 
                        type="text" 
                        id="checkNo" 
                        placeholder=" " 
                        value={checkNo} 
                        onChange={(e) => handleCheckNoChange(e)}  // Call handleCheckNoChange instead of updateState
                        className="peer global-tran-textbox-ui" 
                        disabled={isFormDisabled} 
                    />
                    <label htmlFor="checkNo" className="global-tran-floating-label">Check No.</label>
                </div>


                {/* Check Date Picker */}
                <div className="relative flex-grow w-2/4">
                    <input type="date"
                        id="checkDate"
                        className="peer global-tran-textbox-ui"
                        value={header.ck_date}
                        onChange={(e) => setHeader((prev) => ({ ...prev, ck_date: e.target.value }))}
                        disabled={isFormDisabled} 
                    />
                    <label htmlFor="checkDate" className="global-tran-floating-label">Check Date</label>
                </div>
                
                </div>


                {/* CV Type */}
                <div className="relative">
                    <select id="cvType"
                        className="peer global-tran-textbox-ui"
                        value={selectedCvType}
                        onChange={handleCvTypeChange}
                        disabled={isFormDisabled} 
                    >
                        {cvTranTypeDd.length > 0 ?
                        (
                            <>
                                {cvTranTypeDd.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading...</option>)}
                    </select>
                    <label htmlFor="cvType" className="global-tran-floating-label">CV Type</label>
                    <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>          

                
                <div className="flex space-x-4"> {/* Added flex container with spacing */}

                  <div className="relative flex-grow w-2/4">
                      <input type="text" id="refDocNo1"  value={refDocNo1} placeholder=" " onChange={(e) => updateState({ refDocNo1: e.target.value })} className="peer global-tran-textbox-ui " disabled={isFormDisabled} />
                      <label htmlFor="refDocNo1" className="global-tran-floating-label">Ref Doc No. 1</label>
                  </div>

                  <div className="relative flex-grow w-2/4">
                      <input type="text" id="refDocNo2" value={refDocNo2} placeholder=" " onChange={(e) => updateState({ refDocNo2: e.target.value })}  className="peer global-tran-textbox-ui" disabled={isFormDisabled} />
                      <label htmlFor="refDocNo2" className="global-tran-floating-label">Ref Doc No. 2</label>
                  </div>

                </div>

                {/* Payee Name */}
                <div className="relative">
                    <input
                        type="text"
                        id="vendName"
                        placeholder=" "
                        value={vendName}
                        className="peer global-tran-textbox-ui w-full"
                        
                    />
                    <label htmlFor="vendName" className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui"> * </span>Payee Name
                    </label>
                </div>




            </div>

            {/* Remarks Section - Now inside the 3-column container, spanning all 3 */}
            <div className="col-span-full">
              
                <div className="relative p-2"> 
                    <textarea
                        id="remarks"
                        placeholder=""
                        rows={5}
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
            <div className="relative">
                <input type="text" id="totalFxAmountDue" value={totals.totalFxAmountDue} placeholder=" " className="peer global-tran-textbox-ui text-right"/>
                <label htmlFor="totalFxAmountDue" className="global-tran-floating-label">Check Amount (Orig.)</label>
            </div>

    
                    {/* Currency */}
                    <div className="relative"> {/* Used flex-grow to make it longer */}
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
                    <div className="relative"> {/* Used flex-grow to take remaining space (or you can use w-1/3) */}
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

            <div className="relative">
                <input type="text" id="totalAmountDue" value={totals.totalAmountDue} placeholder=" " className="peer global-tran-textbox-ui text-right"/>
                <label htmlFor="totalAmountDue" className="global-tran-floating-label">Check Amount (PHP)</label>
            </div>
        </div>

    </div>
</div>
      

      {/* APV Detail Section */}
      {/* <div id="cv_dtl" className="global-tran-tab-div-ui" > */}
      {/* <div id="cv_dtl" className="global-tran-tab-div-ui" style={{ display: (selectedWithAPV === 'Y' && selectedCvType === 'APV02') || selectedWithAPV === 'N' && selectedCvType === 'APV02' ? 'none' : 'block' }}> */}
      <div id="cv_dtl" className="global-tran-tab-div-ui" >


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
          // onClick={() => setGLActiveTab('invoice')}
        >
          Invoice Details
        </button>
      </div>

      {selectedWithAPV === 'Y' && (
        <div className="flex justify-end">
          <button
            onClick={() => handleOpenAPBalance()}
            className="global-tran-button-generateGL"
            disabled={isLoading}
            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
          >
            Get Reference APV
          </button>
        </div>
      )}

    </div>

  {/* Invoice Details Button */}
  <div className="global-tran-table-main-div-ui">
  <div className="global-tran-table-main-sub-div-ui"> 
    <table className="min-w-full border-collapse">
      <thead className="global-tran-thead-div-ui">
        <tr>

          <th className="global-tran-th-ui">LN</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("apType", selectedCvType, selectedWithAPV)}>AP Type</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("apvNo", selectedCvType, selectedWithAPV)}>APV No.</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("rrNo", selectedCvType, selectedWithAPV)}>RR No.</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("poNo", selectedCvType, selectedWithAPV)}>PO/JO No.</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("siNo", selectedCvType, selectedWithAPV)}>Invoice No.</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("siDate", selectedCvType, selectedWithAPV)}>Invoice Date</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("origAmount", selectedCvType, selectedWithAPV)}>Original Amount</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("currCode", selectedCvType, selectedWithAPV)}>Currency</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("currRate", selectedCvType, selectedWithAPV)}>Currency Rate</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("siAmount", selectedCvType, selectedWithAPV)}>Invoice Amount</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("appliedAmount", selectedCvType, selectedWithAPV)}>Applied</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("unappliedAmount", selectedCvType, selectedWithAPV)}>Unapplied</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("balance", selectedCvType, selectedWithAPV)}>Balance</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("debitAcct", selectedCvType, selectedWithAPV)}>DR Account</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("apAcct", selectedCvType, selectedWithAPV)}>AP Account</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("vatAcct", selectedCvType, selectedWithAPV)}>VAT Account</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("rcCode", selectedCvType, selectedWithAPV)}>RC Code</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("rcName", selectedCvType, selectedWithAPV)}>RC Name</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("slCode", selectedCvType, selectedWithAPV)}>SL Code</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("vatCode", selectedCvType, selectedWithAPV)}>VAT Code</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("vatName", selectedCvType, selectedWithAPV)}>VAT Name</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("vatAmount", selectedCvType, selectedWithAPV)}>VAT Amount</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("atcCode", selectedCvType, selectedWithAPV)}>ATC</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("atcName", selectedCvType, selectedWithAPV)}>ATC Name</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("atcAmount", selectedCvType, selectedWithAPV)}>ATC Amount</th>
            <th className="global-tran-th-ui" hidden={!isVisible_Dtl1("amountDue", selectedCvType, selectedWithAPV)}>Amount Due</th>

         {!isFormDisabled && (
          <th className="global-tran-th-ui sticky right-[43px] bg-blue-200 dark:bg-blue-900 z-30">
            Add
          </th>
        )}

        {!isFormDisabled && (
          <th className="global-tran-th-ui sticky right-0 bg-blue-200 dark:bg-blue-900 z-30">
            Delete
          </th>
        )}
        </tr>
      </thead>



      <tbody className="relative">{detailRows.map((row, index) => (
        <tr key={index} className="global-tran-tr-ui">
          
          {/* LN */}
          <td className="global-tran-td-ui text-center">{index + 1}</td>
         
         {/* AP Type */}
          <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("apType", selectedCvType, selectedWithAPV)}>
            <select
                  className="w-[120px] global-tran-td-inputclass-ui"
                  value={row.apType || ""}
                  onChange={(e) => handleDetailChange(index, 'apType', e.target.value)}
            >
                  {cvApTypeDd.length > 0 ?
                      (
                          <>
                              {cvApTypeDd.map((type) => (
                                  <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                      {type.DROPDOWN_NAME}
                                  </option>
                              ))}
                          </>
                      ) : (<option value="">Loading...</option>)}
              </select>
          </td>

          {/* APV No */}
           <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("apvNo", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.apvNo || ""}
                onChange={(e) => handleDetailChange(index, 'apvNo', e.target.value)}
              />
            </td>

          {/* RR No */}
           <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("rrNo", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.rrNo || ""}
                onChange={(e) => handleDetailChange(index, 'rrNo', e.target.value)}
              />
            </td>

          {/* PO No */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("poNo", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.poNo || ""}
                onChange={(e) => handleDetailChange(index, 'poNo', e.target.value)}
              />
            </td>

          {/* Invoice No */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("siNo", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.siNo || ""}
                onChange={(e) => handleDetailChange(index, 'siNo', e.target.value)}
              />
            </td>

          {/* Invoice Date */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("siDate", selectedCvType, selectedWithAPV)}>
              <input
                type="date"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.siDate || ""}
                onChange={(e) => handleDetailChange(index, 'siDate', e.target.value)}
              />
            </td>


          {/* Original Amount */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("origAmount", selectedCvType, selectedWithAPV)}>
                <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row.origAmount || ""}
                    onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChange(index, "origAmount", sanitizedValue, false);
                        }
                    }}                   
                     onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                        }
                      }}                   
                    onBlur={async (e) => {
                        const value = e.target.value;
                        const num = parseFormattedNumber(value);
                        if (!isNaN(num)) {
                            await handleDetailChange(index, "origAmount", num, true);
                        }
                        setFocusedCell(null);
                    }}
                    onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                                await handleDetailChange(index, "origAmount", num, true);
                            }
                            e.target.blur();
                        }
                    }}
                />
            </td>


            {/* Currency Code */}
           <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("currCode", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[100px] text-center global-tran-td-inputclass-ui"
                value={row.currCode || currCode}
                onChange={(e) => handleDetailChange(index, 'currCode', e.target.value)}
              />
            </td>

            {/* Currency Rate */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("currRate", selectedCvType, selectedWithAPV)}>
                <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row.currRate || ""}
                    onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChange(index, "currRate", sanitizedValue, false);
                        }
                    }}
                     onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                        }
                      }}   
                    onBlur={async (e) => {
                        const value = e.target.value;
                        const num = parseFormattedNumber(value);
                        if (!isNaN(num)) {
                            await handleDetailChange(index, "currRate", num, true);
                        }
                        setFocusedCell(null);
                    }}
                    onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                                await handleDetailChange(index, "currRate", num, true);
                            }
                            e.target.blur();
                        }
                    }}
                />
            </td>          

            {/* Invoice Amount */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("siAmount", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                value={formatNumber(parseFormattedNumber(row.siAmount)) || formatNumber(parseFormattedNumber(row.siAmount)) || ""}
                readOnly
              />
            </td>

            {/* Applied Amount */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("appliedAmount", selectedCvType, selectedWithAPV)}>
                <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row.appliedAmount || ""}
                    onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChange(index, "appliedAmount", sanitizedValue, false);
                        }
                    }}
                     onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                        }
                      }}   
                    onBlur={async (e) => {
                        const value = e.target.value;
                        const num = parseFormattedNumber(value);
                        if (!isNaN(num)) {
                            await handleDetailChange(index, "appliedAmount", num, true);
                        }
                        setFocusedCell(null);
                    }}
                    onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                                await handleDetailChange(index, "appliedAmount", num, true);
                            }
                            e.target.blur();
                        }
                    }}
                />
            </td>

            {/* Unapplied Amount */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("unappliedAmount", selectedCvType, selectedWithAPV)}>
                <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row.unappliedAmount || ""}
                    onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChange(index, "unappliedAmount", sanitizedValue, false);
                        }
                    }}
                     onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                        }
                      }}   
                    onBlur={async (e) => {
                        const value = e.target.value;
                        const num = parseFormattedNumber(value);
                        if (!isNaN(num)) {
                            await handleDetailChange(index, "unappliedAmount", num, true);
                        }
                        setFocusedCell(null);
                    }}
                    onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                                await handleDetailChange(index, "unappliedAmount", num, true);
                            }
                            e.target.blur();
                        }
                    }}
                />
            </td>

            {/* Balance */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("balance", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                value={formatNumber(parseFormattedNumber(row.balance)) || formatNumber(parseFormattedNumber(row.balance)) || ""}
                readOnly
              />
            </td>


            {/* DR Account */}
            <td className="global-tran-td-ui relative" hidden={!isVisible_Dtl1("debitAcct", selectedCvType, selectedWithAPV)}>
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.debitAcct || ""}
                  readOnly
                />
                {!isFormDisabled && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                  updateState({ selectedRowIndex: index,
                                showAccountModal: true,
                                accountModalSource: "debitAcct" }); 
                  }}
                />)}
              </div>
            </td>

            {/* AP Account */}
            <td className="global-tran-td-ui relative" hidden={!isVisible_Dtl1("apAcct", selectedCvType, selectedWithAPV)}>
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.apAcct || ""}
                  readOnly
                />
                {!isFormDisabled && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                  updateState({ selectedRowIndex: index,
                                showAccountModal: true,
                                accountModalSource: "apAcct" }); 
                  }}
                />)}
              </div>
            </td>

            {/* VAT Account */}
            <td className="global-tran-td-ui relative" hidden={!isVisible_Dtl1("vatAcct", selectedCvType, selectedWithAPV)}>
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.vatAcct || ""}
                  readOnly
                />
                {!isFormDisabled && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                  updateState({ selectedRowIndex: index,
                                showAccountModal: true,
                                accountModalSource: "vatAcct" }); 
                  }}
                />)}
              </div>
            </td>

            {/* RC Code */}
              <td className="global-tran-td-ui relative" hidden={!isVisible_Dtl1("rcCode", selectedCvType, selectedWithAPV)}>
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
                  updateState({ selectedRowIndex: index,
                                showRcModal: true,
                                accountModalSource: "rcCode"}); 
                  }}
                />)}
              </div>
            </td>

            {/* RC Name */}
            <td className="global-tran-td-ui relative" hidden={!isVisible_Dtl1("rcName", selectedCvType, selectedWithAPV)}>
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[300px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.rcName || ""}
                  readOnly
                />
              </div>
            </td>

            {/* SL Code */}
            {/* <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("slCode", cvType, withAPV)}>
                  <div className="relative w-fit">
                      <input
                          type="text"
                          className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                          value={row.slCode || ""}
                          onChange={(e) => handleDetailChangeGL(index, 'slCode', e.target.value)}
                          readOnly
                      />

                      {!isFormDisabled && ( 
                                        <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                  updateState({ selectedRowIndex: index,
                                showSlModal: true,
                                accountModalSource: "slCode"}); 
                  }}

                          />
                      )}
                  </div>
              </td> */}

              {/* SL Code */}
              <td className="global-tran-td-ui relative" hidden={!isVisible_Dtl1("slCode", selectedCvType, selectedWithAPV)}>
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
                  updateState({ selectedRowIndex: index,
                                showSlModal: true,
                                accountModalSource: "slCode"}); 
                  }}
                />)}
              </div>
            </td>

            {/* VAT Code */}
             <td className="global-tran-td-ui relative" hidden={!isVisible_Dtl1("vatCode", selectedCvType, selectedWithAPV)}>
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
                    updateState({ selectedRowIndex: index,
                                  showVatModal: true,
                                  accountModalSource: "vatCode" }); 
                  }}
                />)}
              </div>
            </td>

            {/* VAT Name */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("vatName", selectedCvType, selectedWithAPV)}>
                <input
                    type="text"
                    className="w-[250px] global-tran-td-inputclass-ui"
                    value={row.vatName || ""}
                    readOnly
                />
            </td>

            {/* VAT Amount */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("vatAmount", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                value={formatNumber(parseFormattedNumber(row.vatAmount)) || formatNumber(parseFormattedNumber(row.vatAmount)) || ""}
                readOnly
              />
            </td>

            {/* ATC Code */}
            <td className="global-tran-td-ui relative" hidden={!isVisible_Dtl1("atcCode", selectedCvType, selectedWithAPV)}>
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
                    updateState({ selectedRowIndex: index ,
                                  showAtcModal: true,
                                  accountModalSource: "atcCode" }); 
                  }}
                />)}
              </div>
            </td>

            
            {/* ATC Name */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("atcName", selectedCvType, selectedWithAPV)}>
              <input
                type="text"
                className="w-[250px] global-tran-td-inputclass-ui"
                value={row.atcName || ""}
                readOnly
              />
            </td>

            {/* ATC Amount */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("atcAmount", selectedCvType, selectedWithAPV)}>
                <input
                   type="text"
                   className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                   value={formatNumber(parseFormattedNumber(row.atcAmount)) || formatNumber(parseFormattedNumber(row.atcAmount)) || ""}
                   onChange={(e) => handleDetailChange(index, 'atcAmount', e.target.value)}
                />
            </td>

            {/* Amount Due */}
            <td className="global-tran-td-ui" hidden={!isVisible_Dtl1("amountDue", selectedCvType, selectedWithAPV)}>
                <input
                   type="text"
                   className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={formatNumber(parseFormattedNumber(row.amountDue)) || formatNumber(parseFormattedNumber(row.amountDue)) || "0"}
                   onChange={(e) => handleDetailChange(index, 'amountDue', e.target.value)}
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


<div className="global-tran-tab-footer-main-div-ui flex flex-col sm:flex-row gap-4 sm:justify-between items-end">
    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
        <button
            onClick={() => handleAddRow()}
            className="global-tran-tab-footer-button-add-ui"
            style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
        >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
        </button>
    </div>

    {/* Totals Grid */}
    <div className={`global-tran-tab-footer-total-main-div-ui grid gap-1 ${currRate > 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {/* Header Row */}
        <div className="col-span-1 sm:col-span-1"></div>
        <div className="global-tran-tab-footer-total-label-ui text-right">Currency ({glCurrDefault})</div>
        {currRate > 1 && <div className="global-tran-tab-footer-total-label-ui text-right">Currency ({currCode})</div>}

        {/* Total Invoice Amount */}
        {/* <div className="global-tran-tab-footer-total-label-ui">Total Invoice Amount:</div>
        <div className="global-tran-tab-footer-total-value-ui">{totals.totalInvoiceAmount}</div>
        {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxOriginalAmount}</div>}
         */}
        {!(selectedWithAPV === "N" && selectedCvType === "APV02") && selectedWithAPV !== "Y" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total Invoice Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalInvoiceAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxOriginalAmount}</div>}
            </>
        )}

        {/* Total Applied Amount */}
        {!(selectedWithAPV === "Y" && selectedCvType === "APV02") && selectedWithAPV !== "N" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total Applied Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalAppliedAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxAppliedAmount}</div>}
            </>
        )}

        {/* Total Unapplied Amount */}
        {!(selectedWithAPV === "Y" && selectedCvType === "APV02") && selectedWithAPV !== "N" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total Unapplied Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalUnappliedAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxUnappliedAmount}</div>}
            </>
        )}

        {/* Total VAT Amount */}
        {!(selectedWithAPV === "N" && selectedCvType === "APV02") && selectedWithAPV !== "Y" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total VAT Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalVatAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxVatAmount}</div>}
            </>
        )}

        {/* Total ATC Amount */}
        {!(selectedWithAPV === "N" && selectedCvType === "APV02") && selectedWithAPV !== "Y" && (
            <>
                <div className="global-tran-tab-footer-total-label-ui">Total ATC Amount:</div>
                <div className="global-tran-tab-footer-total-value-ui">{totals.totalAtcAmount}</div>
                {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxAtcAmount}</div>}
            </>
        )}

        {/* Total Amount Due */}
        <div className="global-tran-tab-footer-total-label-ui">Total Amount Due:</div>
        <div className="global-tran-tab-footer-total-value-ui">{totals.totalAmountDue}</div>
        {currRate > 1 && <div className="global-tran-tab-footer-total-value-ui">{totals.totalFxAmountDue}</div>}
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
                <th className="global-tran-th-ui sticky right-[43px] bg-blue-200 dark:bg-blue-900 z-30">
                  Add
                </th>
                <th className="global-tran-th-ui sticky right-0 bg-blue-200 dark:bg-blue-900 z-30">
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
      Total Debit ({glCurrDefault}):
    </label>
    <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
      {totalDebit}
    </label>
  </div>

  {/* Total Credit */}
  <div className="global-tran-tab-footer-total-div-ui">
    <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
      Total Credit ({glCurrDefault}):
    </label>
    <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
      {totalCredit}
    </label>
  </div>

  {/* Totals in Forex Section (if currRate > 1) */}
  {currRate > 1 && (
    <div className="global-tran-tab-footer-total-main-div-ui">

      {/* Total Debit in Forex */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-label-ui">
          Total Debit ({currCode}):
        </label>
        <label htmlFor="TotalDebit" className="global-tran-tab-footer-total-value-ui">
          {totalDebitFx1}
        </label>
      </div>

      {/* Total Credit in Forex */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
          Total Credit ({currCode}):
        </label>
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
          {totalCreditFx1}
        </label>
      </div>

    </div>
  )}

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

{payeeModalOpen && (
  <PayeeMastLookupModal
    isOpen={payeeModalOpen}
    onClose={handleClosePayeeModal}
  />
)}

{bankModalOpen && (
  <BankLookupModal
    isOpen={bankModalOpen}
    onClose={handleCloseBankModal}
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
  <VATLookupModal  
    isOpen={showVatModal}
    onClose={handleCloseVatModal}
    customParam="Input"
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

{showAPBalanceModal && (
  <GlobalLookupModalv1
    isOpen={showAPBalanceModal}
    data={globalLookupRow}
    btnCaption="Get Selected APV"
    title="Open AP Balance"
    endpoint={globalLookupHeader}
    onClose={handleCloseAPBalance}
    onCancel={() => updateState({ showAPBalanceModal: false })}
  />
)}

{showSpinner && <LoadingSpinner />}
    </div>
    

  <div className={topTab === "history" ? "" : "hidden"}>
      <AllTranHistory
        showHeader={false}
        endpoint="/getCVHistory"
        cacheKey={`CV:${state.branchCode || ""}:${state.docNo || ""}`}  // ✅ per-transaction
        activeTabKey="CV_Summary"
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

export default CV;