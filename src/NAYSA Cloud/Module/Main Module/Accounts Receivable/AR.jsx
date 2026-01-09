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
import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import PostCR from "../../../Module/Main Module/Accounts Receivable/PostCR.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";

// Configuration
import {fetchData , postRequest,fetchDataJson} from '../../../Configuration/BaseURL.jsx'
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
  useTopAccountRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopHSOption,
  useTopCompanyRow,
  useTopDocControlRow,
  useTopDocDropDown,
  useTopBankMastRow,
} from '@/NAYSA Cloud/Global/top1RefTable';


import {
  useGetCurrentDay,
  useFormatToDate,
} from '@/NAYSA Cloud/Global/dates';



import {
  useSelectedOpenARBalance,
  useSelectedHSColConfig,
} from '@/NAYSA Cloud/Global/selectedData';


import {
  useUpdateRowGLEntries,
  useTransactionUpsert,
  useGenerateGLEntries,
  useUpdateRowEditEntries,
  useFetchTranData,
  useHandleCancel,
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


const AR = () => {
   const loadedFromUrlRef = useRef(false);
   const navigate = useNavigate();
   const [topTab, setTopTab] = useState("details"); // "details" | "history"
   const { resetFlag } = useReset();
   const { user } = useAuth();
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



    branchCode: "HO",
    branchName: "Head Office",
    
    // Vendor information
    custCode: "",
    custName: "",
    chainCode:"",
    chainName:"",

    
    // Currency information
    currCode: "",
    currName: "",
    currRate: "",
    defaultCurrRate:"1.000000",


    //Other Header Info
    prcNo:"",
    arTypes :[],
    paymentTypes:[],
    checkTypes:[],
    depBankCode:"",
    depAcctName:"",
    depAcctNo:"",
    currAmount:"0.00",
    checkAmount:"0.00",
    checkNo:"",
    checkDate:null,
    bank:"",
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",

    selectedARType : "REG",
    selectedPayType : "AR01",
    selectedCheckType:"AR21",

    userCode: user.USER_CODE, 

    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],
    globalLookupRow:[],
    globalLookupHeader:[],

  
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
    showSlModal:false,
    showARBalanceModal:false,
    showPostingModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showBankMastModal:false,
    showAllTranDocNo:false,
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
  custCode,
  custName,
  chainCode,
  chainName,
  currCode,
  currName,
  currRate,
  selectedARType,
  selectedPayType,
  selectedCheckType,

  prcNo,
  arTypes,
  paymentTypes,
  checkTypes,
  depBankCode,
  depAcctName,
  depAcctNo,
  currAmount,
  checkAmount,
  checkNo,
  checkDate,
  bank,
  refDocNo1,
  refDocNo2,
  remarks,



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
  showBankMastModal,
  currencyModalOpen,
  branchModalOpen,
  custModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showARBalanceModal,
  showPostingModal,
  showAllTranDocNo


} = state;


  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }

  //Document Global Setup
  const docType = docTypes.AR; 
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
  totalSIAmount: '0.00',
  totalAppliedAmount: '0.00',
  totalBalanceAmount: '0.00',
  totalUnappliedAmount: '0.00',
  currAmount:"0.00"
  });




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
  if (resetFlag) handleReset();

  const timer = isLoading
    ? setTimeout(() => updateState({ showSpinner: true }), 200)
    : (updateState({ showSpinner: false }), null);

  return () => timer && clearTimeout(timer);
}, [resetFlag, isLoading]);




  useEffect(() => {
  }, [custCode]);




useEffect(() => {
  if (triggerGLEntries) {
    handleActivityOption("GenerateGL").then(() => {
      updateState({ triggerGLEntries: false });
    });
  }
}, [triggerGLEntries]);







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
      updateState({isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);
  



  useEffect(() => {
    handleReset();
    loadCompanyData(); 
  }, []);


  
    useEffect(() => {
      const onKey = (e) => {
        if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);
  
  
  


  const LoadingSpinner = () => (
    <div className="global-tran-spinner-main-div-ui">
      <div className="global-tran-spinner-sub-div-ui">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-2" />
        <p>Please wait...</p>
      </div>
    </div>
  );


  


  const updateTotalsDisplay = (siAmt, applied, balance, unapplied) => {
    setTotals({
          totalSIAmount: formatNumber(siAmt),
          totalAppliedAmount: formatNumber(applied),
          totalBalanceAmount: formatNumber(balance),
          totalUnappliedAmount: formatNumber(unapplied),
          currAmount:formatNumber(applied+unapplied),
      });


      updateState({checkAmount:formatNumber((applied+unapplied) * currRate)})
  };



  const handleReset = () => { 
      updateState({

      branchCode: "HO",
      branchName: "Head Office",
      userCode: user.USER_CODE, 
      documentDate:useGetCurrentDay(),
      
      refDocNo1: "",
      refDocNo2:"",
      checkDate:null,
      remarks:"",

      custName:"",
      custCode:"",
      chainCode:"",
      chainName:"",
      prcNo:"",
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
      updateTotalsDisplay (0, 0, 0, 0)

  };


  
   const loadCompanyData = async () => {

    updateState({isLoading:true})

    try {
      // 🔹 1. Run these in parallel since they don’t depend on each other
      const [crTran, crType, crCheck] = await Promise.all([
        useTopDocDropDown(docType, "ARTRAN_TYPE"),
        useTopDocDropDown(docType, "AR_TYPE"),
        useTopDocDropDown(docType, "ARCHECK_TYPE"),
      ]);

      if (crTran) {
        updateState({ arTypes: crTran, selectedARType: "AR11" });
      }
      if (crType) {
        updateState({ paymentTypes: crType, selectedPayType: "AR01" });
      }
      if (crCheck) {
        updateState({ checkTypes: crCheck, selectedCheckType: "AR21" });
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




const fetchTranData = async (documentNo, branchCode,direction="") => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"arNo",direction);
    console.log(data)

    if (!data?.arId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }

    // Format header date
    let arDateForHeader = '';
    if (data.arDate) { 
      const d = new Date(data.arDate);
      arDateForHeader = isNaN(d) ? '' : d.toISOString().split("T")[0];
    }

   

    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      siAmount: formatNumber(item.siAmount),
      appliedAmount: formatNumber(item.appliedAmount),
      balance: formatNumber(item.balance),
      unappliedAmount: formatNumber(item.unappliedAmount),
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
      documentStatus: data.crStatus,
      status: data.docStatus,
      documentID: data.arId,
      documentNo: data.arNo,
      branchCode: data.branchCode,
      documentDate: useFormatToDate(data.arDate),
      selectedARType: data.artranType,
      selectedPayType:data.paymentType,
      selectedCheckType:data.ckType,
      chainCode: data.chainCode,
      chainName: data.chainName,
      custCode: data.custCode,
      custName: data.custName,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      checkNo:data.checkNo,
      checkDate:data.checkDate,
      bank:data.bank,
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


const handleCrNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};




const handleCurrRateNoBlur = (e) => {
  
  const num = formatNumber(e.target.value, 6);
  updateState({ 
        currRate: isNaN(num) ? "0.000000" : num,  
        withCurr2:((glCurrMode === "M" && glCurrDefault !== currCode) || glCurrMode === "D"),
        withCurr3:glCurrMode === "T",
        })

   const checkAmount = formatNumber(
      parseFormattedNumber(totals.currAmount) * parseFormattedNumber(currRate)
      );
  updateState({ checkAmount });

};





 const handleActivityOption = async (action) => {
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
        selectedARType,
        selectedPayType,
        selectedCheckType,
        chainCode,
        chainName,
        custCode,
        custName,
        depBankCode,
        depAcctName,
        depAcctNo,
        currAmount,
        checkAmount,
        refDocNo1,
        refDocNo2,
        bank,
        checkNo,
        checkDate, 
        prcNo,    
        currCode,
        currName,
        currRate,
        remarks,
        userCode, // Assuming userCode is also part of your state
        detailRows,
        detailRowsGL
    } = state;

    updateState({ isLoading: true });

    const glData = {
      branchCode: branchCode,
      arNo: documentNo || "",
      arId: documentID || "",
      arDate: documentDate,
      artranType: selectedARType,
      paymentType:selectedPayType,
      ckType:selectedCheckType,
      chainCode :chainCode,
      chainName:chainName,
      custCode: custCode,
      custName: custName,
      refDocNo1: refDocNo1,
      refDocNo2: refDocNo2,
      depBankCode:depBankCode,
      depAcctName:depAcctName,
      depAcctNo:depAcctNo,
      bank:bank,
      checkNo:checkNo,
      checkDate:checkDate,
      currAmount:parseFormattedNumber(totals.currAmount),
      amount:parseFormattedNumber(checkAmount),
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      remarks: remarks|| "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        siNo: row.siNo || "",
        siDate: row.siDate || "",
        siAmount: parseFormattedNumber(row.siAmount || 0),
        appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
        balance: parseFormattedNumber(row.balance || 0),
        unappliedAmount: parseFormattedNumber(row.unappliedAmount || 0),
        currCode: row.currCode,
        currRate: parseFormattedNumber(row.currRate || 0),
        bank: row.bank,
        checkNo: row.checkNo,
        checkDate: row.checkDate,
        checkAmount: parseFormattedNumber(row.checkAmount || 0),
        refBranchcode: row.refBranchcode,
        refDocCode: row.refDocCode,
        arAcct: row.arAcct,
        w2307: row.w2307,
        custCode:  row.custCode,
        custName: row.custName,
        groupId: row.groupId,
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

          const response = await useTransactionUpsert(docType, glData, updateState, 'arId', 'arNo');
          if (response) {

                const isZero = Number(noReprints) === 0;
                const onSaveAndPrint =
                  isZero
                    ? () => updateState({ showSignatoryModal: true })                  
                    : () => handleSaveAndPrint(response.data[0].arId); 
                useSwalshowSaveSuccessDialog(
                  handleReset,          
                  onSaveAndPrint       
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

    if(selectedARType ==="AR11" ) {
      await handleOpenARBalance();
      return;
    }
   

  try {
    const items = await handleFetchDetail(custCode);
    const itemList = Array.isArray(items) ? items : [items];
    const newRows = await Promise.all(itemList.map(async (item) => {

      return {
        lnNo: "",
        w2307: "",
        siNo: "00000000",
        siDate: documentDate,
        siAmount:"0.00",
        appliedAmount: "0.00",
        unappliedAmount: "0.00",
        balance: "0.00",
        arAcct: "",
        currCode: currCode,
        currRate: formatNumber(currRate,6) ,
        checkAmount: "0.00",
        custCode: custCode,
        custName: custName,
        refBranchcode: branchCode,
        refDocCode:  "AR",
        groupId: "",
      };
    }));

      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows,
                    detailRowsGL: []
       });
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
      sltypeCode:"CU",
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


  

  const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
        detailRows: updatedRows,
        triggerGLEntries:true });
    updateTotals(updatedRows);

  };



  
  const handleDeleteRowGL =  (index) => {
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
 if (!detailRows || detailRows.length === 0) {
      return;
      }
  if (documentID) {
    updateState({ showSignatoryModal: true });
  }
};




const handlePost = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }

  if (documentID && (documentStatus === '')) {
    updateState({ showPostingModal: true });
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




const handleAttach = async () => {
  if(documentID){
    updateState({ showAttachModal: true });
  }
};




const handleCopy = async () => {
 if (!detailRows || selectedARType === "AR11" ) {
      return;
      }


  if (documentID ) {
    updateState({ documentNo:"",
                  documentID:"",
                  documentStatus:"",
                  status:"OPEN",
                  documentDate:useGetCurrentDay(), 
                  noReprints:"0",
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
       const docNo = params.get("arNo");         
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
            currCode: selectedData?.currCode || '',
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



          // Replace Customer Info in Invoice Details on Change of Customer
        const responseCurrRate = await handleSelectCurrency(custDetails.currCode)
        if (responseCurrRate) {
          if (detailRows && selectedARType !== "AR11" ) {
          const updatedRows = detailRows.map((row) => ({
            ...row,
            custCode: custDetails.custCode,
            custName: custDetails.custName,
            currCode: custDetails.currCode,
            currRate: responseCurrRate
          }));

          updateState({ detailRows: updatedRows , detailRowsGL: [] });
        }
        }

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
        updateState({ isLoading: false });
    }
};



  const updateTotals = (rows) => {
  //console.log("updateTotals received rows:", rows); // STEP 5: Check rows passed to updateTotals

  let totalSIAmt = 0;
  let totalApplied = 0;
  let totalUnApplied = 0;
  let totalBalance = 0;


  rows.forEach(row => {

    const perSIAmt = parseFormattedNumber(row.siAmount || 0) || 0;
    const perApplied = parseFormattedNumber(row.appliedAmount || 0) || 0;
    const perUnApplied = parseFormattedNumber(row.unappliedAmount || 0) || 0;
    const perBalance = parseFormattedNumber(row.balance  || 0) || 0;


    totalSIAmt+= perSIAmt;
    totalApplied+= perApplied;
    totalUnApplied+= perUnApplied;
    totalBalance += perBalance;
  });


    updateTotalsDisplay (totalSIAmt,totalApplied, totalBalance,totalUnApplied);

};




const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...detailRows];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    }
   
     const row = updatedRows[index];

     
    if (['arAcct'].includes(field)) {
      row[field] = value.acctCode;
    }

if (runCalculations) {
  const origSIAmt = parseFormattedNumber(row.siAmount) || 0;
  const origUnApplied = parseFormattedNumber(row.unappliedAmount) || 0;
  const origApplied = parseFormattedNumber(row.appliedAmount) || 0;
  const newCheckAmt = origApplied + origUnApplied;


  if (field === "appliedAmount") {
    if (selectedARType === "AR11") {
      const newBalance = origSIAmt - origApplied;
      row.checkAmount = formatNumber(newCheckAmt);
      row.balance = formatNumber(origApplied > origSIAmt ? 0 : newBalance);


     const applied =
      origSIAmt < 0
        ? (Math.abs(origApplied) <= Math.abs(origSIAmt) ? origApplied : origSIAmt)
        : Math.min(origApplied, origSIAmt);
        row.appliedAmount = formatNumber(applied);    
        }


    if (selectedARType === "AR13" || selectedARType === "AR12" ) {
      row.checkAmount = formatNumber(newCheckAmt);
      row.balance = formatNumber(0);
      row.siAmount = formatNumber(newCheckAmt);
      row.appliedAmount = formatNumber(origApplied);
    }
  }

  if (field === "unappliedAmount") {
    row.checkAmount = formatNumber(newCheckAmt);
    row.balance = formatNumber(selectedARType === "AR11" ? origSIAmt - origApplied : 0);
    row.unappliedAmount = formatNumber(origUnApplied);
  }
}


    updatedRows[index] = row;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
};





const handleFieldBehavior = (option) => {
  switch (option) {

    case "disableOnNonCheckPay":
      return (
        isFormDisabled ||
        selectedPayType !== "AR01" ||
        selectedCheckType === "AR22"
      );

    case "hiddenDetailSingleCheck":
     return (
        selectedCheckType !== "AR22" || selectedPayType !== "AR01"
      );


    case "hiddenDetailAdvaces":
     return (
        selectedARType === "AR13" ||  selectedARType === "AR12"
      );


    case "disableOnSaved":
     return (
        isFormDisabled ||
        (selectedARType === "AR11" && state.documentNo !== "" )
      );



    default:
      return false; 
  }
};




const handleColumnLabel = (columnName) =>{
  switch (columnName) {

     case "SINo":
      if(selectedARType === "AR13"  ||  selectedARType === "AR12") {
        return "Reference No"
      }
      return "SOA No."


      case "SIDate":
      if(selectedARType === "AR13"||  selectedARType === "AR12") {
        return "Reference Date"
      }
      return "SOA Date"

      case "Applied":
      if(selectedARType === "AR13") {
        return "Advances Amount"
      }

      else if(selectedARType === "AR12") {
        return "Amount"
      }
      return "Applied Amount"



       case "ARAcct":
      if(selectedARType === "AR13") {
        return "Advances Account"
      }
      return "AR Account"



       default:
      return ""; 
  }
}
  



  const handlePaymentTypeChange = (e) => {
    const selectedType = e.target.value;
    updateState({selectedPayType:selectedType})
 
  };

  
  const handleCheckTypeChange = (e) => {
    const selectedType = e.target.value;
    updateState({selectedCheckType:selectedType})
    
  };


  
  const handleARTypeChange = (e) => {
   const selectedType = e.target.value;
    updateState({selectedARType:selectedType})
     
  };

  









const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...state.detailRowsGL];
    let row = { ...updatedRowsGL[index] };


    if (['acctCode', 'slCode', 'rcCode', 'sltypeCode', 'vatCode', 'atcCode'].includes(field)) {
        const data = await useUpdateRowGLEntries(row,field,value,custCode,docType);
        if(data) {
            row.acctCode = data.acctCode
            row.sltypeCode = data.sltypeCode
            row.slCode = data.slCode
            row.rcCode = data.rcCode
            row.vatCode = data.vatCode
            row.vatName = data.vatName
            row.atcCode = data.atcCode
            row.atcName = data.atcName
            row.particular = data.particular
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
    const data = await useUpdateRowEditEntries(row,field,value,currCode,currRate,documentDate); 
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

        const specialAccounts = ['arAcct'];
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

        if (selectedSl) {
          handleDetailChangeGL(selectedRowIndex, 'slCode', selectedSl);
        }
    }
    updateState({
        showSlModal: false,
        selectedRowIndex: null
    });
};




const handleTranDocNoRetrieval = async (data) => {
    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({showAllTranDocNo: data.modalClose});
};


const handleTranDocNoSelection = async (data) => {

    handleReset();
    updateState({showAllTranDocNo: false, documentNo:data.docNo });
};




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





const handleCloseSignatory = async (mode) => {
  
    updateState({ 
        showSpinner: true,
        showSignatoryModal: false,
        noReprints: mode === "Final" ? 1 : 0, });
    await useHandlePrint(documentID, docType, mode, userCode );

    updateState({
      showSpinner: false 
    });

};




const handleCloseBankMast = async (selectedBankCode) => {
    if (selectedBankCode && selectedBankCode !== null) {
     const result = await useTopAccountRow(selectedBankCode.acctCode);
     if (result) {   
      updateState({ depBankCode: selectedBankCode.bankCode,
                    depAcctName:result.acctName,
                    depAcctNo:selectedBankCode.bankAcctNo,
                    detailRowsGL: []
             });
    }  
  }
  updateState({ showBankMastModal: false});  
};




const handleOpenARBalance = async () => {
  try {
    updateState({ isLoading: true });


    const endpoint ="getOpenARBalance"
    const response = await fetchDataJson(endpoint, { custCode, branchCode });
    const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];

    const colConfig = await useSelectedHSColConfig(endpoint);

   if (custData.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "Open AR Balance",
        text: "There are no AR balance records for the selected customer/branch.",
      });
       updateState({ isLoading: false });
      return; 
    }

    updateState({ globalLookupRow: custData,
                  globalLookupHeader:colConfig,
                  showARBalanceModal: true
      });

  } catch (error) {
    console.error("Failed to fetch Open AR Balance:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to fetch Open AR Balance.",
    });
    updateState({ 
        globalLookupRow: [] ,
        globalLookupHeader: [] });
  }

   updateState({ isLoading: false });
};



const handleCloseARBalance = async (payload) => {
    if (payload && payload !== null) {
      
       updateState({ isLoading: true });

      const result = await useSelectedOpenARBalance(payload);
      if (result) {   
      const newRows = result.map((entry, idx) => ({    
        lnNo: idx + 1,
        w2307: "",
        siNo: entry.siNo,
        siDate: entry.siDate,
        siAmount: formatNumber(entry.balance,2),
        appliedAmount: formatNumber(entry.balance,2),
        unappliedAmount: "0.00",
        balance: "0.00",
        arAcct: entry.arAcct,
        currCode: entry.currCode,
        currRate: formatNumber(entry.currRate,6) ,
        bank:bank,
        checkNo:checkNo,
        checkDate:checkDate,
        checkAmount: formatNumber(entry.balance,2),
        custCode: entry.custCode,
        custName: entry.custName,
        refBranchcode: branchCode,
        refDocCode: entry.refDocCode,
        groupId: entry.groupId,
      
      }));

      
      const updatedRows = [...detailRows, ...newRows];
      updateState({ detailRows: updatedRows});
      updateTotals(updatedRows);
    }  
  }
  updateState({ showARBalanceModal: false,
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
          : await useTopForexRate(currCode, documentDate);

        updateState({
          currCode: result.currCode,
          currName: result.currName,
          currRate: formatNumber(parseFormattedNumber(rate),6)
        });
        

        // Recompute Check Amount on Change of Currency
        const checkAmount = formatNumber(
          parseFormattedNumber(totals.currAmount) * parseFormattedNumber(rate)
          );
        updateState({ checkAmount });  


        // Replace Currency on Change of Currecy
        if (detailRows && selectedARType !== "AR11" ) {
          const updatedRows = detailRows.map((row) => ({
            ...row,
            currCode: currCode,
            currRate: formatNumber(parseFormattedNumber(rate),6)
          }));

          updateState({ detailRows: updatedRows , detailRowsGL:[]});
        }

          


        return formatNumber(parseFormattedNumber(rate),6)
      }  
    }
   return formatNumber(1,6)
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
              isSaveDisabled={isSaveDisabled} 
              isResetDisabled={isResetDisabled} 
              detailsRoute="/page/CR"
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

        {/* SVI Header Form Section - Main Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative items-stretch" id="svi_hd">

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
                            onClick={() => updateState({ branchModalOpen: true })}
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                    </div>

                    {/* SVI Number Field */}
                    <div className="relative">
                        <input
                            type="text"
                            id="arNo"
                            value={state.documentNo}
                            onChange={(e) => updateState({ documentNo: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleCrNoBlur();
                                e.preventDefault(); 
                                document.getElementById("arDate")?.focus();
                              }}}
                            placeholder=" "
                            className={`peer global-tran-textbox-ui ${state.isDocNoDisabled ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                            disabled={state.isDocNoDisabled}
                        />
                        <label htmlFor="arNo" className="global-tran-floating-label">
                            AR No.
                        </label>
                        <button
                            className={`global-tran-textbox-button-search-padding-ui ${
                                (state.isFetchDisabled || state.isDocNoDisabled)
                                ? "global-tran-textbox-button-search-disabled-ui"
                                : "global-tran-textbox-button-search-enabled-ui"
                            } global-tran-textbox-button-search-ui`}
                            onClick={() => {updateState({showAllTranDocNo:true})}}
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                    </div>

                    {/* SVI Date Picker */}
                    <div className="relative">
                        <input type="date"
                            id="arDate"
                            className="peer global-tran-textbox-ui"
                            value={documentDate}
                            onChange={(e) => updateState({ documentDate: e.target.value })} 
                            disabled={isFormDisabled} 
                        />
                        <label htmlFor="arDate" className="global-tran-floating-label">AR Date</label>
                    </div>

                    
                            
                    {/* Transaction Type */}
                    <div className="relative">
                        <select id="crType"
                            className="peer global-tran-textbox-ui"
                            value={selectedARType}
                            disabled={handleFieldBehavior("disableOnSaved")} 
                            onChange={(e) => handleARTypeChange(e)}
                        >
                            {arTypes.length > 0 ?
                            (
                                <>  
                                    {arTypes.map((type) =>
                                    (
                                        <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                            {type.DROPDOWN_NAME}
                                        </option>
                                    ))}
                                </>
                            ) : (<option value="">Loading Transaction Types...</option>)}
                        </select>
                        <label htmlFor="crType" className="global-tran-floating-label">AR Type</label>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>


                </div>



                {/* Column 2 */}
                <div className="global-tran-textbox-group-div-ui">

                    
                    {/* Chain Code */}
                    <div className="relative">
                        <input type="text"
                            id="chainCode"
                            value={chainCode}
                            readOnly
                            placeholder=" "
                            className="peer global-tran-textbox-ui"
                        />
                        <label htmlFor="chainCode"className="global-tran-floating-label">
                            <span className="global-tran-asterisk-ui"> * </span>Chain Code
                        </label>
                        <button
                            type="button"
                            onClick={() => updateState({ custModalOpen: true })}
                            className={`global-tran-textbox-button-search-padding-ui ${
                                isFetchDisabled
                                ? "global-tran-textbox-button-search-disabled-ui"
                                : "global-tran-textbox-button-search-enabled-ui"
                            } global-tran-textbox-button-search-ui`}
                            disabled={handleFieldBehavior("disableOnSaved")} 
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                    </div>

                    {/* Customer Name Display - Make this wider */}
                    <div className="relative w-full md:w-6/6 lg:w-4/4"> {/* Added width classes here */}
                        <input type="text" id="chainName" placeholder=" " value={chainName} className="peer global-tran-textbox-ui"/>
                        <label htmlFor="chainName"className="global-tran-floating-label">
                            <span className="global-tran-asterisk-ui"> * </span>Chain Name
                        </label>
                    </div>            

                    

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
                            <span className="global-tran-asterisk-ui"> * </span>Customer Code
                        </label>
                        <button
                            type="button"
                            onClick={() => updateState({ custModalOpen: true })}
                            className={`global-tran-textbox-button-search-padding-ui ${
                                isFetchDisabled
                                ? "global-tran-textbox-button-search-disabled-ui"
                                : "global-tran-textbox-button-search-enabled-ui"
                            } global-tran-textbox-button-search-ui`}
                            disabled={handleFieldBehavior("disableOnSaved")} 
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                    </div>

                    {/* Customer Name Display - Make this wider */}
                    <div className="relative w-full md:w-6/6 lg:w-4/4"> {/* Added width classes here */}
                        <input type="text" id="custName" placeholder=" " value={custName} className="peer global-tran-textbox-ui"/>
                        <label htmlFor="custName"className="global-tran-floating-label">
                            <span className="global-tran-asterisk-ui"> * </span>Customer Name
                        </label>
                    </div>

                    

                </div>

                {/* Column 3 */}
                <div className="global-tran-textbox-group-div-ui">

                    
                    <div className="relative">
                        <input
                            type="text"
                            id="depAcctName"
                            placeholder=" "
                            value={depAcctName}
                            readOnly
                            onFocus={(e) => e.target.blur()}
                            className="peer global-tran-textbox-ui cursor-pointer select-none"
                        />
                        <label htmlFor="depAcctName" className="global-tran-floating-label">
                            Bank Name
                        </label>
                        <button
                            type="button"
                            className={`global-tran-textbox-button-search-padding-ui ${
                                isFetchDisabled
                                ? "global-tran-textbox-button-search-disabled-ui"
                                : "global-tran-textbox-button-search-enabled-ui"
                            } global-tran-textbox-button-search-ui`}
                            onClick={() => updateState({ showBankMastModal: true })}
                            disabled={isFormDisabled}
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                    </div>

                    <div className="relative">
                        <input type="text" id="depAcctNo" value={depAcctNo} placeholder=" " onChange={(e) => updateState({ refDocNo2: e.target.value })}  className="peer global-tran-textbox-ui" disabled={isFormDisabled} />
                        <label htmlFor="depAcctNo" className="global-tran-floating-label">Bank Account No.</label>
                    </div>
                    

                    <div className="relative">
                    <input
                        type="text"
                        id="currAmount"
                        value={totals.currAmount}
                        placeholder=" "               
                        className="peer global-tran-textbox-ui text-right" 
                        disabled={isFormDisabled}
                    />
                    <label
                        htmlFor="currAmount"
                        className="global-tran-floating-label text-right"
                    >
                        Original Amount
                    </label>
                    </div>


                    
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
                                disabled={isFormDisabled || custCode} 
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
                                if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
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


                    <div className="relative text-right">
                    <input
                        type="text"
                        id="checkAmount"
                        value={checkAmount}
                        placeholder=" "
                        className="peer global-tran-textbox-ui text-right" 
                        disabled={isFormDisabled}
                    />
                    <label
                        htmlFor="checkAmount"
                        className="global-tran-floating-label text-right"
                    >
                        Check Amount
                    </label>
                    </div>
            
                </div>


                {/* Remarks Section - Now inside the 3-column container, spanning all 3 */}
                <div className="col-span-full">
                    <div className="relative p-2"> 
                        <textarea
                            id="remarks"
                            placeholder=""
                            rows={6}
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
            <div className="global-tran-textbox-group-div-ui flex flex-col">
                    
                    
                    <div className="relative">
                        <input
                            type="text"
                            id="prcNo"
                            placeholder=" "
                            value={prcNo}
                            readOnly
                            onFocus={(e) => e.target.blur()}
                            className="peer global-tran-textbox-ui cursor-pointer select-none"
                        />
                        <label htmlFor="prcNo" className="global-tran-floating-label">
                            Prov. Receipt No.
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

                  
                    <div className="relative">
                        <select id="payType"
                            className="peer global-tran-textbox-ui"
                            value={selectedPayType}
                            disabled={isFormDisabled} 
                            onChange={(e) => handlePaymentTypeChange(e)}
                        >
                            {paymentTypes.length > 0 ?
                            (
                                <>
                                    {paymentTypes.map((type) =>
                                    (
                                        <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                            {type.DROPDOWN_NAME}
                                        </option>
                                    ))}
                                </>
                            ) : (<option value="">Loading Payment Types...</option>)}
                        </select>
                        <label htmlFor="payType" className="global-tran-floating-label">Payment Type</label>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>



                    <div className="relative">
                        <select id="checkType"
                            className="peer global-tran-textbox-ui"
                            value={selectedCheckType}
                            disabled={isFormDisabled} 
                            onChange={(e) => handleCheckTypeChange(e)}
                        >
                            {checkTypes.length > 0 ?
                            (
                                <>
                                    {checkTypes.map((type) =>
                                    (
                                        <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                            {type.DROPDOWN_NAME}
                                        </option>
                                    ))}
                                </>
                            ) : (<option value="">Loading Check Types...</option>)}
                        </select>
                        <label htmlFor="payType" className="global-tran-floating-label">Check Type</label>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <input type="text" id="checkNo"  
                              value={checkNo} placeholder=" " 
                              onChange={(e) => updateState({ checkNo: e.target.value })} 
                              className="peer global-tran-textbox-ui " 
                              disabled={handleFieldBehavior("disableOnNonCheckPay")} 
                          />
                        <label htmlFor="checkNo" className="global-tran-floating-label">Check No</label>
                    </div>

                    <div className="relative">
                        <input type="date"
                            id="checkDate" 
                            value={checkDate} 
                            onChange={(e) => updateState({ checkDate: e.target.value })} 
                            className="peer global-tran-textbox-ui"
                            disabled={handleFieldBehavior("disableOnNonCheckPay")} 
                        />
                        <label htmlFor="checkDate" className="global-tran-floating-label">Check Date</label>
                    </div>

                    <div className="relative">
                        <input type="text" 
                              id="bank"  
                              value={bank} 
                              placeholder=" " 
                              onChange={(e) => updateState({ bank: e.target.value })} 
                              className="peer global-tran-textbox-ui " 
                              disabled={handleFieldBehavior("disableOnNonCheckPay")}  
                            />
                        <label htmlFor="bank" className="global-tran-floating-label">Bank</label>
                    </div>

                    <div className="relative">
                        <input type="text" id="refDocNo1"  
                              value={refDocNo1} 
                              placeholder=" " 
                              onChange={(e) => updateState({ refDocNo1: e.target.value })} 
                              className="peer global-tran-textbox-ui " 
                              disabled={isFormDisabled} />
                        <label htmlFor="refDocNo1" className="global-tran-floating-label">Ref Doc No. 1</label>
                    </div>

                    <div className="relative">
                        <input type="text" 
                              id="refDocNo2" 
                              value={refDocNo2} 
                              placeholder=" " 
                              onChange={(e) => updateState({ refDocNo2: e.target.value })}  
                              className="peer global-tran-textbox-ui" 
                              disabled={isFormDisabled} />
                        <label htmlFor="refDocNo2" className="global-tran-floating-label">Ref Doc No. 2</label>
                    </div>

                  
        
            {/* Remarks Section - Now inside the 3-column container, spanning all 3 */}
                {/* <div className="col-span-full h-full"> */}
                    {/* <div className="relative flex-1 p-2"> 
                        <textarea
                            id="remarks"
                            placeholder=""
                            rows={4}
                            className="peer global-tran-textbox-remarks-ui pt-4 h-full resize"
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
                    </div> */}
                {/* </div> */}

            </div>

        </div>
    </div>
          
          {/* APV Detail Section */}
          <div id="apv_dtl" className="global-tran-tab-div-ui" >

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
        </div>

      {/* Invoice Details Button */}
      <div className="global-tran-table-main-div-ui">
      <div className="global-tran-table-main-sub-div-ui"> 
        <table className="min-w-full border-collapse">
          <thead className="global-tran-thead-div-ui">
            <tr>
              <th className="global-tran-th-ui">LN</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenDetailAdvaces")}>With 2307?</th>
              <th className="global-tran-th-ui">{handleColumnLabel("SINo")}</th>
              <th className="global-tran-th-ui">{handleColumnLabel("SIDate")}</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenDetailAdvaces")}>SI Amount</th>
              <th className="global-tran-th-ui">{handleColumnLabel("Applied")}</th>
              <th className="global-tran-th-ui">UnApplied</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenDetailAdvaces")}>Balance</th>
              <th className="global-tran-th-ui">{handleColumnLabel("ARAcct")}</th>
              <th className="global-tran-th-ui">Curr Code</th>
              <th className="global-tran-th-ui">Curr Rate</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")} >Bank</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")}>Check No</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")} >Check Date</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")} >Check Amount</th>
              <th className="global-tran-th-ui">Customer Code</th>
              <th className="global-tran-th-ui">Customer Name</th>
              <th className="global-tran-th-ui hidden">Ref Branch</th>
              <th className="global-tran-th-ui hidden">Ref Doc Code</th>
              <th className="global-tran-th-ui hidden">Group ID</th>
                    
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



          <tbody className="relative">{detailRows.map((row, index) => (
            <tr key={index} className="global-tran-tr-ui">
              
              {/* LN */}
              <td className="global-tran-td-ui text-center">{index + 1}</td>

              
              {/* With 2307 */}
              <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenDetailAdvaces")} >
                              <select
                                className="w-[50px] global-tran-td-inputclass-ui"
                                value={""}
                              >
                                <option value=""></option>
                                <option value="Y">Yes</option>
                              </select>
                            </td>
            

            {/* SI No */}
              <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.siNo || ""}
                    onChange={(e) => handleDetailChange(index, 'siNo', e.target.value)}
                    readOnly={row.groupId !== null && row.groupId !== ""}
                  />
                </td>
                

                {/* SI Date */}
              <td className="global-tran-td-ui">
                    <input
                      type="date"
                      className="w-[100px] global-tran-td-inputclass-ui"
                      value={row.siDate || ""}
                      onChange={(e) => handleDetailChange(index, 'siDate', e.target.value)}
                      readOnly={row.groupId !== null && row.groupId !== ""}
                    />
                </td>



                {/* SI Amount */}
                <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenDetailAdvaces")}>
                  <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={formatNumber(parseFormattedNumber(row.siAmount)) || formatNumber(parseFormattedNumber(row.siAmount)) || ""}
                    readOnly={row.groupId !== null && row.groupId !== ""}
                  />
                </td>

                

                {/* Applied */}
                <td className="global-tran-td-ui">
                    <input
                        type="text"
                        className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                        value={row.appliedAmount || ""}
                        // onChange={(e) => {
                        //     const inputValue = e.target.value;
                        //     const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        //     if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                        //         handleDetailChange(index, "appliedAmount", sanitizedValue, false);
                        //     }
                        // }}   
                        onChange={(e) => {
                            const raw = e.target.value;

                            const siAmt = parseFormattedNumber(row.siAmount); // or from state
                            const allowNegative = siAmt < 0;

                            // Keep digits + dot; if negatives are allowed, also keep '-'
                            let sanitized = raw.replace(allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g, "");

                            // If negatives allowed, ensure at most one leading '-' (move it to the front)
                            if (allowNegative) {
                              const hasMinus = sanitized.includes("-");
                              sanitized = sanitized.replace(/-/g, "");
                              if (hasMinus) sanitized = "-" + sanitized;
                            }

                            // Valid number (up to 2 decimals). Allow "" or "-" as intermediate while typing.
                            const re = allowNegative ? /^-?\d*(\.\d{0,2})?$/ : /^\d*(\.\d{0,2})?$/;
                            const isIntermediate = sanitized === "" || (allowNegative && sanitized === "-");

                            if (re.test(sanitized) || isIntermediate) {
                              handleDetailChange(index, "appliedAmount", sanitized, false);
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

                
                {/* UnApplied */}
                <td className="global-tran-td-ui">
                    <input
                        type="text"
                        className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                        value={row.unappliedAmount || ""}
                        // onChange={(e) => { handleDetailChange(index, "unappliedAmount", e.target.value, false) }}   
                        onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.-]/g, '');
                            if (/^-?\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
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
                <td className="global-tran-td-ui"  hidden={handleFieldBehavior("hiddenDetailAdvaces")}>
                  <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={formatNumber(parseFormattedNumber(row.balance)) || formatNumber(parseFormattedNumber(row.balance)) || ""}
                    readOnly
                  />
                </td>


                {/* AR Account */}          
                <td className="global-tran-td-ui relative">
                <div className="flex items-center">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                    value={row.arAcct || ""}
                    readOnly
                  />
                  {(!isFormDisabled && (row.groupId == null || row.groupId === "")) && (
                    <FontAwesomeIcon 
                      icon={faMagnifyingGlass} 
                      className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                      onClick={() => {
                        updateState({ selectedRowIndex: index ,
                                      showAccountModal: true,
                                      accountModalSource: "arAcct"  });
                      }}
                    />
                  )}
                </div>        
                </td>

                {/* Curr Code */}
              <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.currCode || ""}
                    readOnly
                  />
                </td>

                

                {/* Curr Rate */}
                <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={formatNumber(parseFormattedNumber(row.currRate),6) || formatNumber(parseFormattedNumber(row.currRate),6) || ""}
                    readOnly
                  />
                </td>



                {/* Bank */}
              <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")}>
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.bank || ""}
                    onChange={(e) => handleDetailChange(index, 'bank', e.target.value)}
                  />
                </td>


                
                {/* Check No */}
              <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")}>
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.checkNo || ""}
                    onChange={(e) => handleDetailChange(index, 'checkNo', e.target.value)}
                  />
                </td>



                {/* Check Date */}
                <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")}>
                    <input
                      type="date"
                      className="w-[100px] global-tran-td-inputclass-ui"
                      value={row.checkDate || ""}
                      onChange={(e) => handleDetailChangeGL(index, 'checkDate', e.target.value)}
                    />
                </td>


                {/* Check Amount */}
                <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")}>
                  <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={formatNumber(parseFormattedNumber(row.checkAmount)) || formatNumber(parseFormattedNumber(row.checkAmount)) || ""}
                    readOnly
                  />
                </td>


                {/* Customer Code */}
              <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.custCode || ""}
                    readOnly
                  />
                </td>


                {/* Customer Name */}
              <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[250px] global-tran-td-inputclass-ui"
                    value={row.custName || ""}
                    readOnly
                  />
                </td>


                {/* Ref Branch */}
              <td className="global-tran-td-ui hidden">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.refBranchcode || ""}
                    readOnly
                  />
                </td>


                {/* Ref Doc Code */}
              <td className="global-tran-td-ui hidden">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.refDocCode || ""}
                    readOnly
                  />
                </td>


                  {/* Group ID */}
              <td className="global-tran-td-ui hidden">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.groupId || ""}                
                    readOnly
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
        //  onClick={() =>handleAddRow()}
        onClick={() => handleAddRow()}
        className="global-tran-tab-footer-button-add-ui"
        style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
      </button>
    </div>



    {/* Totals Section */}
    <div className="global-tran-tab-footer-total-main-div-ui">

      {!handleFieldBehavior("hiddenDetailAdvaces") && (
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Invoice Amount:
        </label>
        <label id="totalSIAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalSIAmount}
        </label>
      </div>
      )}
      {/* Total VAT Amount */}
      <div className="global-tran-tab-footer-total-div-ui" >
        <label className="global-tran-tab-footer-total-label-ui">
          {handleFieldBehavior("hiddenDetailAdvaces")? "Total Advances Amount:" : "Total Applied Amount:"}
        </label>
        <label id="totalAppliedAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalAppliedAmount}
        </label>
      </div>

      {/* Total ATC Amount */}
      <div className="global-tran-tab-footer-total-div-ui" >
        <label className="global-tran-tab-footer-total-label-ui">
          Total UnApplied Amount:
        </label>
        <label id="totalUnappliedAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalUnappliedAmount}
        </label>
      </div>

      {/* Total Payable Amount (Invoice + VAT - ATC) */}
      {!handleFieldBehavior("hiddenDetailAdvaces") && (
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Balance:
        </label>
        <label id="totalBalanceAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalBalanceAmount}
        </label>
      </div>
      )}
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
                      value={row.remarks || ""}
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
      {currRate !== 1 && (
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




    {custModalOpen && (
      <CustomerMastLookupModal
        isOpen={custModalOpen}
        onClose={handleCloseCustModal}
      />
    )}



    {showBankMastModal && (
      <BankMastLookupModal
        isOpen={showBankMastModal}
        onClose={handleCloseBankMast}
      />
    )}



    {showARBalanceModal && (
      <GlobalLookupModalv1
        isOpen={showARBalanceModal}
        data={globalLookupRow}
        btnCaption="Get Selected Invoice"
        title="Open AR Balance"
        endpoint={globalLookupHeader}
        onClose={handleCloseARBalance}
        onCancel={() => updateState({ showARBalanceModal: false })}
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


    {showPostingModal && (
      <PostCR
        isOpen={showPostingModal}
        onClose={() => updateState({ showPostingModal: false })}
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


    
    {showAllTranDocNo && (
          <AllTranDocNo
            isOpen={showAllTranDocNo}
            params={{branchCode,branchName,docType,documentTitle,fieldNo : "arNo"}}
            onRetrieve={handleTranDocNoRetrieval}
            onResponse={{documentNo}}
            onSelected={handleTranDocNoSelection}
            onClose={() => updateState({ showAllTranDocNo: false })}
          />
      )} 
       



    {showSpinner && <LoadingSpinner />}
  </div>


  <div className={topTab === "history" ? "" : "hidden"}>
      <AllTranHistory
        showHeader={false}
        endpoint="/getARHistory"
        cacheKey={`AR:${state.branchCode || ""}:${state.docNo || ""}`}  // ✅ per-transaction
        activeTabKey="AR_Summary"
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
// End of Return



};
export default AR;