import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

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
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import PostSVI from "../../../Module/Main Module/Accounts Receivable/PostSVI.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import WarehouseLookupModal from "../../../Lookup/SearchWareMast.jsx";
import LocationLookupModal from "../../../Lookup/SearchLocation.jsx";


// Configuration
import { postRequest,fetchDataJson} from '../../../Configuration/BaseURL.jsx'
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
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from '@/NAYSA Cloud/Global/procedure';

import {
  useGetCurrentDay,
  useFormatToDate,
} from '@/NAYSA Cloud/Global/dates';

import {
  useSelectedHSColConfig,
} from '@/NAYSA Cloud/Global/selectedData';


import {
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';


import { 
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalErrorAlert,
} from '@/NAYSA Cloud/Global/behavior';


// Header
import Header from '@/NAYSA Cloud/Components/Header';
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";
import { User } from "lucide-react";


const MSAJ = () => {

  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation(); 
  const [isViewDocument, setIsViewDocument] = useState(false);
  const { companyInfo, currentUserRow } = useAuth();
  const decQty = companyInfo?.itemDecqtyMS ?? 2;
  const decUcost = companyInfo?.itemDecUcostMS ?? 6;


  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
    }, []); 
  const isViewDocumentUrl = isViewDocument;



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
    documentDate:useGetCurrentDay(),   
    documentNo: "",
    documentStatus:"",
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
    

    
    // Currency information
    currCode: "PHP",
    currName: "Philippine Peso",
    currRate: "1.000000",
    defaultCurrRate:"1.000000",


    //Other Header Info
    tblFieldArray :[],
    ajTypes :[],
    refDocNo1: "",
    refDocNo2: "", 
    remarks: "",
    selectedAJType : "REG",
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
    msLookupModalOpen:false,
    warehouseLookupOpen:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showPostingModal:false,
    showAllTranDocNo:false,
    locationLookupOpen:false
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
  currCode,
  currName,
  currRate,
  ajTypes,
  refDocNo1,
  refDocNo2,
  remarks,
  selectedAJType,


  // Transaction details
  tblFieldArray,
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
  currencyModalOpen,
  branchModalOpen,
  custModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showPostingModal,
  showAllTranDocNo,
  msLookupModalOpen,
  warehouseLookupOpen,
  locationLookupOpen

} = state;


  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }

  //Document Global Setup
  const docType = docTypes.MSAJ; 
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
  const isFormDisabled =
  isViewDocumentUrl ||
  ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);

  

  //Variables


  const [totals, setTotals] = useState({
  totalQuantity: '0.00',
  totalAmount: '0.00',
  });

  const customParamMap = {
        invAcct: glAccountFilter.ActiveAll,
  };
  const customParam = customParamMap[accountModalSource] || null;
  


  const updateTotalsDisplay = (quantity, amount) => {
    setTotals({
          totalQuantity: formatNumber(quantity,decQty),
          totalAmount: formatNumber(amount),
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
  if (triggerGLEntries) {
    handleActivityOption("GenerateGL").then(() => {
      updateState({ triggerGLEntries: false });
    });
  }
}, [triggerGLEntries]);







  useEffect(() => {
      updateState({isDocNoDisabled: !!state.documentID });
  }, [state.documentID]);
  




  useEffect(() => {
    loadCompanyData();
    handleReset();
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

  
  const handleReset = () => {

      updateState({
        
      branchCode: "HO",
      branchName: "Head Office",
      userCode:user.USER_CODE,
      documentDate:useGetCurrentDay(),

      refDocNo1: "",
      refDocNo2:"", 
      remarks:"",
      noReprints:"0",   
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
      updateTotalsDisplay (0, 0)
  };



   const loadCompanyData = async () => {

    updateState({isLoading:true})

    try {
      // 🔹 1. Run these in parallel since they don’t depend on each other      
      const data = await useTopDocDropDown(docType,"AJTRAN_TYPE");
      if(data){
        updateState({
         ajTypes: data,
         selectedAJType: "",
          });
        };   

        

      // 🔹 2. Document row (independent)
      const docRow = await useTopDocControlRow(docType);

      if (docRow) {
        updateState({
          documentName: docRow.docName,
          documentSeries: docRow.docName,
          documentDocLen: docRow.docName,
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

      
     const tbls = 'msaj_hd,msaj_dt1,msaj_dt2'
     const hdtblcol_result = await useFieldLenghtCheck(tbls);
     if (hdtblcol_result){
       updateState({tblFieldArray :hdtblcol_result })
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




const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"msajNo",direction);


    if (!data?.msajId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      quantity: formatNumber(item.quantity,decQty),
      unitCost: formatNumber(item.unitCost,decUcost),
      itemAmount: formatNumber(item.itemAmount,2),
      qtyHand: formatNumber(item.qtyHand,decQty),
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
      documentStatus: data.sviStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.msajId,
      documentNo: data.msajNo,
      branchCode: data.branchCode,
      documentDate: useFormatToDate(data.msajDate),
      selectedAJType: data.ajtranType,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,   
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


const handleDocNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};


const handleActivityOption = async (action) => {
  // Prevent execution if document is already processed
  if (documentStatus !== '') return;

  // 1. Helper function for formatting payload 
  // This is synchronous to prevent Babel 'await' errors during mapping
  const getFormattedPayload = (targetGLRows) => {
    const {
      branchCode,
      documentNo,
      documentID,
      documentDate,
      selectedAJType,
      refDocNo1,
      refDocNo2,
      remarks,
      userCode,
      detailRows
    } = state;

    return {
      branchCode: branchCode,
      msajNo: documentNo || "",
      msajId: documentID || "",
      msajDate: documentDate,
      ajtranType: selectedAJType,
      refDocNo1: refDocNo1,
      refDocNo2: refDocNo2,
      remarks: remarks || "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        itemCode: row.itemCode || "",
        itemName: row.itemName || "",
        categCode: row.categCode || "",
        quantity: parseFormattedNumber(row.quantity || 0),
        uomCode: row.uomCode || "",
        unitCost: parseFormattedNumber(row.unitCost || 0),
        itemAmount: parseFormattedNumber(row.itemAmount || 0),
        lotNo: row.lotNo || "",
        qstatCode: row.qstatCode || "",
        bbDate: row.bbDate ? new Date(row.bbDate).toISOString().split("T")[0] : null,
        qtyHand: parseFormattedNumber(row.qtyHand || 0),
        whouseCode: row.whouseCode || "",
        locCode: row.locCode || "",
        acctCode: row.acctCode || "",
        rcCode: row.rcCode || "",
        slTypeCode: row.sltypeCode || "",
        slCode: row.slCode || "",
        uniqueKey: row.uniqueKey || "",
        operation: row.operation || ""
      })),
      dt2: targetGLRows.map((entry, index) => ({
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
        remarks: entry.remarks || ""
      }))
    };
  };

  updateState({ isLoading: true });

  try {
    let currentGL = state.detailRowsGL;

    // --- STEP 1: AUTO-GENERATE IF UPSERTING WITH EMPTY GL ---
    // This allows "Generate then Save" in one click
    if (action === "Upsert" && currentGL.length === 0) {
      const genPayload = getFormattedPayload([]);
      const newGlEntries = await useGenerateGLEntries(docType, genPayload);

      if (newGlEntries && newGlEntries.length > 0) {
        currentGL = newGlEntries;
        updateState({ detailRowsGL: newGlEntries });
      } else {
        updateState({ isLoading: false });
        console.warn("GL Generation failed. Upsert cancelled.");
        return; 
      }
    }

    // --- STEP 2: MANUAL GENERATE GL ---
    if (action === "GenerateGL") {
      const genPayload = getFormattedPayload(currentGL);
      const newGlEntries = await useGenerateGLEntries(docType, genPayload);
      if (newGlEntries) {
        updateState({ detailRowsGL: newGlEntries });
      }
    }

    // --- STEP 3: UPSERT (SAVE) ---
    if (action === "Upsert") {
      // We use currentGL variable because state updates are async 
      // and wouldn't be available yet if we just generated them.
      const savePayload = getFormattedPayload(currentGL);
      const response = await useTransactionUpsert(docType, savePayload, updateState, 'msajId', 'msajNo');

      if (response) {
        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(response.data[0].msajId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);
        updateState({ isDocNoDisabled: true, isFetchDisabled: true });
      }
    }
  } catch (error) {
    console.error("Error in transaction flow:", error);
  } finally {
    updateState({ isLoading: false });
  }
};





const handleGetItem = async () => {
 if (!selectedAJType) {
    return;
  }

    updateState({
      detailRows: [
        ...detailRows,
        {
        lnNo: "",
        itemCode: "",
        itemName: "",
        categCode: "",   
        quantity:"1.00",
        uomCode: "",
        unitCost: "0.00",
        itemAmount: "0.00",    
        lotNo: "",  
        qstatCode: "",  
        bbDate: "",  
        qtyHand: "0.00",    
        whouseCode: "",   
        locCode: "",  
        acctCode: "",  
        rcCode: "",  
        sltypeCode: "",       
        slCode: "",
        uniqueKey: "",
        operation:""
      }
      ]
    });
  };



  const handleAddRow = async () => {
  if (!selectedAJType) return;

    await handleOpenMSLookup();
    return;

  // const lookupTypes = ["IL", "IR", "CA"];  
  // if (lookupTypes.includes(selectedAJType)) { 
  //   await handleOpenMSLookup();
  //   return;
  // }


  const newRow = {
    lnNo: detailRows.length + 1, 
    itemCode: "",
    itemName: "",
    categCode: "",   
    quantity: "1.00",
    uomCode: "",
    unitCost: "0.00",
    itemAmount: "0.00",    
    lotNo: "",  
    qstatCode: "",  
    bbDate: "",  
    qtyHand: "0.00",    
    whouseCode: "",   
    locCode: "",  
    acctCode: "",  
    rcCode: "",  
    sltypeCode: "",       
    slCode: "",
    uniqueKey: ""
  };

  updateState({
    detailRows: [...detailRows, newRow]
  });
};




const handleAddRowGL = () => {

 if (!selectedAJType) {
    return;
  }


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
  if (documentID ) {
    updateState({ showAttachModal: true });
   }
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
                  documentDate:useGetCurrentDay(), 
                  noReprints:"0",
     });
  }
};





const handleFieldBehavior = (option) => {
  switch (option) {

    case "disableOnNonCheckPay":
      // return (
      //   isFormDisabled ||
      //   selectedPayType !== "CR01" ||
      //   selectedCheckType === "CR22"
      // );

    case "hiddenBBMode":
     return (
        selectedAJType === "BB" 
      );

      case "hiddenCAMode":
     return (
        selectedAJType === "CA" 
      );


    default:
      return false; 
  }
};



const handleColumnLabel = (columnName) =>{
  switch (columnName) {

     case "UnitCost":
      if(selectedAJType === "CA") {
        return "Amount"
      }
      return "Unit Cost"

       default:
      return ""; 
  }
}
  





//  ** View Document and Transaction History Retrieval ***
const cleanUrl = useCallback(() => {
  window.history.replaceState({}, "", window.location.origin);
}, []);

const handleHistoryRowPick = useCallback(
  async (row) => {
    const docNo = row?.docNo;
    const branchCode = row?.branchCode;
    if (!docNo || !branchCode) return;

    await fetchTranData(docNo, branchCode); 
    setTopTab("details");
    cleanUrl(); // 
  },
  [fetchTranData, cleanUrl]
);


useEffect(() => {
  const params = new URLSearchParams(location.search);
  const docNo = params.get("msajNo");
  const branchCode = params.get("branchCode");

  if (!loadedFromUrlRef.current && docNo && branchCode) {
    loadedFromUrlRef.current = true;
    handleHistoryRowPick({ docNo, branchCode });
  }
}, [location.search, handleHistoryRowPick]);






  const printData = {
    apv_no: documentNo,
    branch: branchCode,
    doc_id: docType
  };



 

  const updateTotals = (rows) => {
  //console.log("updateTotals received rows:", rows); // STEP 5: Check rows passed to updateTotals

  let totalQuantity = 0;
  let totalItemAmount = 0;

  rows.forEach(row => {
    const item_Quantity = parseFormattedNumber(row.quantity || 0) || 0;
    const item_ItemAmount = parseFormattedNumber(row.itemAmount || 0) || 0;

    totalQuantity+= item_Quantity;
    totalItemAmount+= item_ItemAmount;
  });
    updateTotalsDisplay (totalQuantity,totalItemAmount);
};



const handleDetailChange = async (index, field, value, runCalculations = true) => {
  const updatedRows = [...detailRows];

  updatedRows[index] = {
    ...updatedRows[index],
    [field]: value,
  };

  const row = updatedRows[index];

  const autoFillBlanks = (fieldName, newValue, extraData = {}) => {
    if (index === 0) {
      updatedRows.forEach((r, i) => {
        if (i !== 0 && (!r[fieldName] || r[fieldName].toString().trim() === "")) {
          updatedRows[i] = {
            ...r,
            [fieldName]: newValue,
            ...extraData
          };
        }
      });
    }
  };

  if (field === 'acctCode') {
    row.acctCode = value.acctCode;
    autoFillBlanks('acctCode', value.acctCode);
  }

  if (field === 'rcCode') {
    row.rcCode = value.rcCode;
    autoFillBlanks('rcCode', value.rcCode);
  }

  if (field === 'slCode') {
    row.slCode = value.slCode;
    row.sltypeCode = value.sltypeCode;
    autoFillBlanks('slCode', value.slCode, { sltypeCode: value.sltypeCode });
  }


  
   if (['bbDate'].includes(field)) {
        row[field] = value;
    }

  if (runCalculations) {
    const origQuantity = parseFormattedNumber(row.quantity) || 0;
    const origUnitCost = parseFormattedNumber(row.unitCost) || 0;
    const origQtyHand = parseFormattedNumber(row.qtyHand) || 0;
    const origOperation = row.operation;

    const recalcRow = async () => {
      let processedQty = Math.abs(origQuantity);

      if (origOperation === "S" && (selectedAJType === "IL" || selectedAJType === "IR")) {
        if (processedQty > origQtyHand) {
          useSwalErrorAlert('Exceeds Stock', `Quantity (${processedQty}) exceeds Quantity on Hand (${origQtyHand}). Value has been adjusted.`);
          processedQty = origQtyHand;
        }
        processedQty = processedQty * -1;
      } else {
        processedQty = Math.abs(processedQty);
      }

      const finalQtyForMath = (selectedAJType === "CA") ? 1 : processedQty;
      const calculatedAmount = +(finalQtyForMath * origUnitCost).toFixed(2);

      row.itemAmount = formatNumber(calculatedAmount);
      row.quantity = formatNumber(selectedAJType === "CA" ? 0 : processedQty, decQty);
      row.unitCost = formatNumber(origUnitCost, decUcost);
    };

    if (field === 'quantity' || field === 'unitCost') {
      await recalcRow();
    }
  }

  updatedRows[index] = row;
  updateState({ detailRows: updatedRows,
                detailRowsGL :[],
   });
  updateTotals(updatedRows);
};





const handleDetailChangeGL = async (index, field, value) => {
    const updatedRowsGL = [...state.detailRowsGL];
    let row = { ...updatedRowsGL[index] };


    if (['acctCode', 'slCode', 'rcCode', 'sltypeCode', 'vatCode', 'atcCode'].includes(field)) {
        const data = await useUpdateRowGLEntries(row,field,value,"",docType);
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

        const specialAccounts = ['invAcct'];
        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(selectedRowIndex, "acctCode", selectedAccount,false);
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

      const updateFn = accountModalSource !== null ? handleDetailChange : handleDetailChangeGL;
      updateFn(selectedRowIndex, 'slCode', selectedSl, false);

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
    await useHandlePrint(documentID, docType, mode,userCode);

    updateState({
      showSpinner: false 
    });

};






const handleSaveAndPrint = async (documentID) => {

    updateState({ showSpinner: true });
    await useHandlePrint(documentID, docType);

    updateState({showSpinner: false});
};









  const handleCloseWarehouseLookup = (row) => {
    if (!row) {
      updateState({ warehouseLookupOpen: false });
      return;
    }
  };

  const handleCloseLocationLookup = (row) => {
    if (!row) {
      updateState({ locationLookupOpen: false });
      return;
    }
  };



const handleCloseVatModal = async (selectedVat) => { 
  if (selectedVat && selectedRowIndex !== null) {
    
     const result = await useTopVatRow(selectedVat.vatCode);
      if (!result) return;

      handleDetailChangeGL(selectedRowIndex, 'vatCode', result);   
  }
  updateState({ showVatModal: false ,
                selectedRowIndex: null,
                accountModalSource: null });
};






const handleCloseAtcModal = async (selectedAtc) => {
  if (selectedAtc && selectedRowIndex !== null) {  

    const result = await useTopATCRow(selectedAtc.atcCode);
      if (!result) return;

      handleDetailChangeGL(selectedRowIndex, 'atcCode', result);   
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




  
  const handleOpenMSLookup = async () => {
    try {
      updateState({ isLoading: true });
  
      const endpoint ="getInvLookupMS"
      const response = await fetchDataJson(endpoint, { userCode, whouseCode :state.whouseCode || "", locCode: state.locCode || "", docType:"MSAJ" ,tranType :selectedAJType });
      const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];
  

      const lookupTypes = ["BB", "IG"];  
      const colConfig = await useSelectedHSColConfig(lookupTypes.includes(selectedAJType) ? "AllMastItemLookup" : "getInvLookupMS");


     if (custData.length === 0) {
        useSwalErrorAlert("MS Location Balance","No records found")
         updateState({ isLoading: false });
        return; 
      }
  
      updateState({ globalLookupRow: custData,
                    globalLookupHeader:colConfig,
                    msLookupModalOpen: true
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
  
  








  const handleCloseMSLookup = (selectedItems) => {
  updateState({ msLookupModalOpen: false });

  if (!selectedItems) return;

  const itemsArray = Array.isArray(selectedItems.records) ? selectedItems.records : [selectedItems.records];
  if (itemsArray.length === 0) return;

  const newRows = itemsArray.map((item) => ({
    itemCode: item?.itemCode ?? "",
    itemName: item?.itemName ?? "",
    categCode: item?.categCode ?? "",
    uomCode: item?.uomCode ?? "",
    quantity: formatNumber(0, decQty),
    unitCost: formatNumber(parseFormattedNumber(item?.unitCost ?? 0), decUcost),
    amount: formatNumber(0, 2),
    lotNo: item?.lotNo ?? "",
    bbDate: item?.bbDate ? new Date(item.bbDate).toISOString().split("T")[0] : "",
    qstatCode: item?.qstatCode ?? "",
    whouseCode: item?.whouseCode ?? state.WHcode ?? "",
    locCode: item?.locCode ?? state.locCode ?? "",
    qtyHand: formatNumber(parseFormattedNumber(item?.qtyHand ?? 0), decQty),
    uniqueKey: item?.uniqueKey ?? "",
    operation:  (selectedAJType === "IL" || selectedAJType === "IR") ? "S" : "A",
    acctCode: "",
    sltypeCode: "",
    rcCode: "",
    slCode: ""
  }));


setState((prev) => {
    const updated = [...(prev.detailRows || []), ...newRows];
    updateTotalsDisplay(0,0);
    return { ...prev, detailRows: updated };
  });
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
        isViewDocument={isViewDocument}  
        onDetails={() => setTopTab("details")}
        onHistory={() => setTopTab("history")}
        disableRouteNavigation={true}         
        isSaveDisabled={isSaveDisabled} 
        isResetDisabled={isResetDisabled} 
        detailsRoute="/page/MSAJ"
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
       <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg relative"
            id="pr_hd"
          >
            {/* Columns 1–3 (Header fields) */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

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
                            id="msajNo"
                            value={state.documentNo}
                            onChange={(e) => updateState({ documentNo: e.target.value })}
                            // onBlur={handleDocNoBlur}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleDocNoBlur();
                                e.preventDefault(); 
                                document.getElementById("SVIDate")?.focus();
                              }}}
                            placeholder=" "
                            className={`peer global-tran-textbox-ui ${state.isDocNoDisabled ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                            disabled={state.isDocNoDisabled}
                        />
                        <label htmlFor="msajNo" className="global-tran-floating-label">
                            MSAJ No.
                        </label>
                        <button
                            className={`global-tran-textbox-button-search-padding-ui ${
                                (state.isFetchDisabled || state.isDocNoDisabled)
                                ? "global-tran-textbox-button-search-disabled-ui"
                                : "global-tran-textbox-button-search-enabled-ui"
                            } global-tran-textbox-button-search-ui`}
                            // disabled={state.isFetchDisabled || state.isDocNoDisabled}
                            onClick={() => {updateState({showAllTranDocNo:true})}}
                        >
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                        </button>
                    </div>

                    {/* SVI Date Picker */}
                    <div className="relative">
                        <input type="date"
                            id="msajDate"
                            className="peer global-tran-textbox-ui"
                            value={documentDate}
                            onChange={(e) => updateState({ documentDate: e.target.value })} 
                            disabled={isFormDisabled} 
                        />
                        <label htmlFor="msajDate" className="global-tran-floating-label">MSAJ Date</label>
                    </div>

                   
                </div>

                {/* Column 2 */}
                <div className="global-tran-textbox-group-div-ui">
                    <div className="relative">
                        <select id="ajType"
                            className="peer global-tran-textbox-ui"
                            value={selectedAJType}
                            onChange={(e) => updateState({ selectedAJType: e.target.value })}
                            disabled={isFormDisabled} 
                        >
                            {ajTypes.length > 0 ?
                            (
                                <>
                                    <option value="">Select Adjustment Type</option>
                                    {ajTypes.map((type) =>
                                    (
                                        <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                            {type.DROPDOWN_NAME}
                                        </option>
                                    ))}
                                </>
                            ) : (<option value="">Loading Adjustment Types...</option>)}
                        </select>
                        <label htmlFor="sviType" className="global-tran-floating-label">Adj Type</label>
                        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                   
                     <div className="relative">
                        <input type="text" id="refDocNo1"  value={refDocNo1} placeholder=" " onChange={(e) => updateState({ refDocNo1: e.target.value })} className="peer global-tran-textbox-ui " disabled={isFormDisabled} maxLength={useGetFieldLength(tblFieldArray, "refsvi_no1")} />
                        <label htmlFor="refDocNo1" className="global-tran-floating-label">Ref Doc No. 1</label>
                    </div>

                    <div className="relative">
                        <input type="text" id="refDocNo2" value={refDocNo2} placeholder=" " onChange={(e) => updateState({ refDocNo2: e.target.value })}  className="peer global-tran-textbox-ui" disabled={isFormDisabled} maxLength={useGetFieldLength(tblFieldArray, "refsvi_no2")} />
                        <label htmlFor="refDocNo2" className="global-tran-floating-label">Ref Doc No. 2</label>
                    </div>
            

                   
                </div>

                {/* Column 3 */}
                <div className="global-tran-textbox-group-div-ui">
                   
               <div className="relative group flex-[1.3]">
                   <input
                     type="text"
                     id="WHcode"
                     value={state.WHname || state.WHcode || ""}
                     readOnly
                     placeholder=" "
                     className="peer global-tran-textbox-ui"
                   />
                   <label
                     htmlFor="WHcode"
                     className="global-tran-floating-label"
                   >
                     Warehouse <span className="text-red-500">*</span>
                   </label>
                   <button
                     type="button"
                     className={`global-tran-textbox-button-search-padding-ui ${
                       isFetchDisabled
                         ? "global-tran-textbox-button-search-disabled-ui"
                         : "global-tran-textbox-button-search-enabled-ui"
                     } global-tran-textbox-button-search-ui`}
                     disabled={isFormDisabled}
                     onClick={() =>
                       !isFormDisabled &&
                       updateState({ warehouseLookupOpen: true })
                     }
                   >
                     <FontAwesomeIcon icon={faMagnifyingGlass} />
                   </button>
                 </div>
 
                 <div className="relative group flex-[1.3]">
                   <input
                     type="text"
                     id="locName"
                     value={state.locName || state.locCode || ""}
                     readOnly
                     placeholder=" "
                     className="peer global-tran-textbox-ui"
                     onClick={() =>
                       !isFormDisabled &&
                       updateState({ locationLookupOpen: true })
                     }
                   />
                   <label
                     htmlFor="locName"
                     className="global-tran-floating-label"
                   >
                     Location <span className="text-red-500">*</span>
                   </label>
                   <button
                     type="button"
                     className={`global-tran-textbox-button-search-padding-ui ${
                       isFetchDisabled
                         ? "global-tran-textbox-button-search-disabled-ui"
                         : "global-tran-textbox-button-search-enabled-ui"
                     } global-tran-textbox-button-search-ui`}
                     disabled={isFormDisabled}
                     onClick={() =>
                       !isFormDisabled &&
                       updateState({ locationLookupOpen: true })
                     }
                   >
                     <FontAwesomeIcon icon={faMagnifyingGlass} />
                   </button>
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
                            maxLength={useGetFieldLength(tblFieldArray, "remarks")} 
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
               
              
             
            </div>

        </div>
    </div>
          
          {/* APV Detail Section */}
          <div id="apv_dtl" className="global-tran-tab-div-ui">

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
              <th className="global-tran-th-ui">Item Code</th>
              <th className="global-tran-th-ui">Item Name</th>
              <th className="global-tran-th-ui">UOM</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenCAMode")}>Quantity</th>
              <th className="global-tran-th-ui">{handleColumnLabel("UnitCost")}</th>



              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenCAMode")}>Amount</th>
              <th className="global-tran-th-ui">Lot No</th>
              <th className="global-tran-th-ui">BB Date</th>
              <th className="global-tran-th-ui">Quality Status</th>
              <th className="global-tran-th-ui">Warehouse</th>
              <th className="global-tran-th-ui">Location</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenBBMode")}>Account Code</th>
              <th className="global-tran-th-ui" hidden={handleFieldBehavior("hiddenBBMode")}>RC Code</th>
              <th className="global-tran-th-ui hidden">SL Type Code</th>
              <th className="global-tran-th-ui"hidden={handleFieldBehavior("hiddenBBMode")}>SL Code</th>
              <th className="global-tran-th-ui">Qty On Hand</th>
              <th className="global-tran-th-ui hidden">Category</th>
              <th className="global-tran-th-ui hidden">Unique Key</th>        
              <th className="global-tran-th-ui hidden">Operation</th>                     
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
            

            {/* Item Code */}
              <td className="global-tran-td-ui relative">
                <div className="flex items-center">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                    value={row.itemCode || ""}
                    readOnly
                  />
                  {!isFormDisabled && (
                  <FontAwesomeIcon 
                    icon={faMagnifyingGlass} 
                    className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                    onClick={() => {
                      updateState({ selectedRowIndex: index });
                    //   updateState({ showBillCodeModal: true }); 
                  
                    }}
                    
                  />)}
                </div>
              </td>


                {/* Description */}
              <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[200px] global-tran-td-inputclass-ui"
                    value={row.itemName || ""}
                    readOnly={isFormDisabled}
                    onChange={(e) => handleDetailChange(index, 'itemName', e.target.value)}
                  />
                </td>

                
          
               
                {/* UOM */}
              <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[50px] text-center global-tran-td-inputclass-ui"
                    value={row.uomCode || ""}
                    readOnly={isFormDisabled}
                    onChange={(e) => handleDetailChange(index, 'uomCode', e.target.value)}
                  />
                </td>


                 <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenCAMode")} >
                    <input
                        type="text"
                        className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                        value={row.quantity || ""}
                        readOnly={isFormDisabled}
                        onChange={(e) => {
                            const inputValue = e.target.value;
                             const sanitizedValue = inputValue.replace(/[^0-9.-]/g, '');
                            if (/^-?\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                                handleDetailChange(index, "quantity", sanitizedValue, false);
                            }
                        }}                   
                        onFocus={(e) => {
                            if (e.target.value === "0.00" || parseFormattedNumber(e.target.value) === 0) {
                              e.target.value = "";
                            }
                          }}                   
                        onBlur={async (e) => {
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                                await handleDetailChange(index, "quantity", num, true);
                            }
                            setFocusedCell(null);
                        }}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                const value = e.target.value;
                                const num = parseFormattedNumber(value);
                                if (!isNaN(num)) {
                                    await handleDetailChange(index, "quantity", num, true);
                                }
                                e.target.blur();
                            }
                        }}
                    />
                </td>



                <td className="global-tran-td-ui">
                    <input
                        type="text"
                        className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                        value={row.unitCost || ""}
                        readOnly={isFormDisabled}
                        onChange={(e) => {
                            const inputValue = e.target.value;
                            const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                            if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                                handleDetailChange(index, "unitCost", sanitizedValue, false);
                            }
                        }}
                        onFocus={(e) => {
                            if (e.target.value === "0.00" || parseFormattedNumber(e.target.value) === 0) {
                              e.target.value = "";
                            }
                          }}   
                        onBlur={async (e) => {
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                                await handleDetailChange(index, "unitCost", num, true);
                            }
                            setFocusedCell(null);
                        }}
                        onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                const value = e.target.value;
                                const num = parseFormattedNumber(value);
                                if (!isNaN(num)) {
                                    await handleDetailChange(index, "unitCost", num, true);
                                }
                                e.target.blur();
                            }
                        }}
                    />
                </td>


                <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenCAMode")} >
                  <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                    value={formatNumber(parseFormattedNumber(row.itemAmount)) || formatNumber(parseFormattedNumber(row.itemAmount)) || ""}
                    readOnly
                  />
                </td>

                <td className="global-tran-td-ui">
                    <input
                    type="text"
                    className="w-[200px] global-tran-td-inputclass-ui"
                    value={row.lotNo || ""}
                    readOnly={isFormDisabled}
                    onChange={(e) => handleDetailChange(index, "lotNo", e.target.value)}
                    maxLength={useGetFieldLength(tblFieldArray, "lot_no")}
                    />
                </td>
                          
                 <td className="global-tran-td-ui">
                    <input
                      type="date"
                      className="w-[100px] global-tran-td-inputclass-ui"
                      value={row.bbDate || ""}
                      readOnly={isFormDisabled}
                      onChange={(e) => handleDetailChange(index, 'bbDate', e.target.value)}
                    />
                </td>



                <td className="global-tran-td-ui relative">
                  <div className="flex items-center">
                    <input
                      type="text"
                      className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                      value={row.qstatCode || ""}
                      readOnly
                    />
                    {!isFormDisabled && (
                    <FontAwesomeIcon 
                      icon={faMagnifyingGlass} 
                      className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                      onClick={() => {
                    //   updateState({ selectedRowIndex: index,
                    //                 showRcModal: true,
                    //                 accountModalSource: "rcCode"}); 
                      }}
                    />)}
                  </div>
                </td>



                
                <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.whouseCode || ""}
                    readOnly
                  />
                </td>


                 <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    value={row.locCode || ""}
                    readOnly
                  />
                </td>
              
   
                <td className="global-tran-td-ui relative " hidden={handleFieldBehavior("hiddenBBMode")} >
                  <div className="flex items-center">
                    <input
                      type="text"
                      className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                      value={row.acctCode || ""}
                      readOnly
                    />
                    {!isFormDisabled && (
                    <FontAwesomeIcon 
                      icon={faMagnifyingGlass} 
                      className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                      onClick={() => {
                      updateState({ selectedRowIndex: index,
                                    showAccountModal: true,
                                    accountModalSource: "invAcct" }); 

                      
                      }}
                    />)}
                  </div>
                </td>
            

                
                <td className="global-tran-td-ui relative" hidden={handleFieldBehavior("hiddenBBMode")}>
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


                <td className="global-tran-td-ui hidden">
                  <input
                    type="text"
                    className="w-[200px] global-tran-td-inputclass-ui"
                    value={row.sltypeCode || ""}
                    readOnly
                  />
                </td>


                 <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenBBMode")}>
                      <div className="relative w-fit">
                          <input
                              type="text"
                              className="w-[100px] pr-6 global-tran-td-inputclass-ui cursor-pointer"
                              value={row.slCode || ""}
                              onChange={(e) => handleDetailChange(index, 'slCode', e.target.value)}
                              readOnly
                          />                       
                              <FontAwesomeIcon
                                  icon={faMagnifyingGlass}
                                  className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                                  onClick={() => {     
                                          updateState({
                                              selectedRowIndex: index,
                                              showSlModal: true,
                                              accountModalSource: "slCode"
                                          });
                                  }}
                              />                       
                      </div>
                  </td>
                


                 <td className="global-tran-td-ui">
                    <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0 cursor-pointer"
                    value={row.qtyHand || ""}
                    readOnly
                    />
                </td>
                

                 <td className="global-tran-td-ui hidden">
                  <input
                    type="text"
                    className="w-[200px] global-tran-td-inputclass-ui"
                    value={row.categCode || ""}
                    readOnly
                  />
                </td>


                 <td className="global-tran-td-ui hidden">
                  <input
                    type="text"
                    className="w-[200px] global-tran-td-inputclass-ui"
                    value={row.uniqueKey || ""}
                    readOnly
                  />
                </td>



                 <td className="global-tran-td-ui hidden">
                  <input
                    type="text"
                    className="w-[200px] global-tran-td-inputclass-ui"
                    value={row.operation || ""}
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
        onClick={() =>handleAddRow()}
        className="global-tran-tab-footer-button-add-ui"
        style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
      </button>
    </div>



    {/* Totals Section */}
    <div className="global-tran-tab-footer-total-main-div-ui">

      {/* Total Invoice Amount */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Quantity:
        </label>
        <label id="totalQuantity" className="global-tran-tab-footer-total-value-ui">
          {totals.totalQuantity}
        </label>
      </div>

      {/* Total VAT Amount */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label className="global-tran-tab-footer-total-label-ui">
          Total Amount:
        </label>
        <label id="totalItemAmount" className="global-tran-tab-footer-total-value-ui">
          {totals.totalItemAmount}
        </label>
      </div>

     
    </div>
    </div>

    </div>


    
        {/* General Ledger Button */}
        <div className="global-tran-tab-div-ui" hidden={handleFieldBehavior("hiddenBBMode")}>

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
                      readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debit", "");
                            }
                          }}
                      onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, 'debit', e.target.value);
                          }}  
                      
                    /> 
                </td>

                  <td className="global-tran-td-ui text-right">
                    <input
                      type="text"
                      className="w-[120px] global-tran-td-inputclass-ui text-right"
                      value={row.credit || ""}
                      readOnly={isFormDisabled}
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
                             if (isFormDisabled) return;
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "credit", "");
                            }
                          }}
                      onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, 'credit', e.target.value);
                          }}      


                    />
                  </td>

                  <td className={`global-tran-td-ui text-right ${withCurr2? "" : "hidden"}`}>
                    <input
                      type="text"
                      className="w-[120px] global-tran-td-inputclass-ui text-right"
                      value={row.debitFx1 || ""}
                      readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx1", "");
                            }
                          }}
                      onBlur={(e) => {
                            if (isFormDisabled) return;
                            handleBlurGL(index, 'debitFx1', e.target.value);
                          }}
                      
                    />
                  </td>
                  <td className={`global-tran-td-ui text-right ${withCurr2? "" : "hidden"}`}>
                    <input
                      type="text"
                      className="w-[120px] global-tran-td-inputclass-ui text-right"
                      value={row.creditFx1 || ""}
                      readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx1", "");
                            }
                          }}
                      onBlur={(e) => {
                                      if (isFormDisabled) return;
                                      handleBlurGL(index, 'creditFx1', e.target.value);
                                    }}      

                    />
                  </td>

                  <td className={`global-tran-td-ui text-right ${withCurr3? "": "hidden"}`}>
                    <input
                      type="text"
                      className="w-[120px] global-tran-td-inputclass-ui text-right"
                      value={row.debitFx2 || ""}
                      readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "debitFx2", "");
                            }
                          }}
                      onBlur={(e) => {
                                      if (isFormDisabled) return;
                                      handleBlurGL(index, 'debitFx2', e.target.value);
                                    }}

                    />
                  </td>
                  <td className={`global-tran-td-ui text-right ${withCurr3? "": "hidden"}`}>
                    <input
                      type="text"
                      className="w-[120px] global-tran-td-inputclass-ui text-right"
                      value={row.creditFx2 || ""}
                      readOnly={isFormDisabled}
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
                            if (isFormDisabled) return;
                            if (e.target.value === "0.00" || e.target.value === "0") {
                              e.target.value = "";
                              handleDetailChangeGL(index, "creditFx2", "");
                            }
                          }}
                      onBlur={(e) => {
                                      if (isFormDisabled) return;
                                      handleBlurGL(index, 'creditFx2', e.target.value);
                                    }}
                    />
                  </td>
                  <td className="global-tran-td-ui">
                    <input
                      type="text"
                      className="w-[100px] global-tran-td-inputclass-ui"
                      value={row.slRefNo || ""}
                      readOnly={isFormDisabled}
                      maxLength={useGetFieldLength(tblFieldArray, "slref_no")} 
                      onChange={(e) => handleDetailChangeGL(index, 'slRefNo', e.target.value)}
                    />
                  </td>
                  <td className="global-tran-td-ui">
                    <input
                      type="date"
                      className="w-[100px] global-tran-td-inputclass-ui"
                      value={row.slRefDate || ""}
                      readOnly={isFormDisabled}
                      onChange={(e) => handleDetailChangeGL(index, 'slRefDate', e.target.value)}
                    />

                  </td>
                    <td className="global-tran-td-ui">
                    <input
                      type="text"
                      className="w-[100px] global-tran-td-inputclass-ui"
                      value={row.remarks || ""}
                      readOnly={isFormDisabled}
                      maxLength={useGetFieldLength(tblFieldArray, "remarks")} 
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



    {showPostingModal && (
      <PostSVI
        isOpen={showPostingModal}
        userCode={userCode}
        docType={docType}
        branchCode={branchCode}
        onClose={() => updateState({ showPostingModal: false })}
      />
    )} 




    {showAllTranDocNo && (
      <AllTranDocNo
        isOpen={showAllTranDocNo}
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "msajNo"}}
        onRetrieve={handleTranDocNoRetrieval}
        onResponse={{documentNo}}
        onSelected={handleTranDocNoSelection}
        onClose={() => updateState({ showAllTranDocNo: false })}
      />
    )} 



      {msLookupModalOpen && (
              <GlobalLookupModalv1
                isOpen={msLookupModalOpen}
                data={globalLookupRow}
                btnCaption="Get Selected Items"
                title="MS Location Balance"
                endpoint={globalLookupHeader}
                onClose={handleCloseMSLookup}
                onCancel={() => updateState({ msLookupModalOpen: false })}
              />
        )}
        


        {warehouseLookupOpen && (
            <WarehouseLookupModal
              isOpen={warehouseLookupOpen}
              onClose={handleCloseWarehouseLookup}
              filter="ActiveAll"
            />
          )}  
   
      {locationLookupOpen && (
        <LocationLookupModal
          isOpen={locationLookupOpen}
          onClose={handleCloseLocationLookup}
          filter="ActiveAll"
        />
      )}

      {showSpinner && <LoadingSpinner />}
    </div>


    <div className={topTab === "history" ? "" : "hidden"}>
      <AllTranHistory
        showHeader={false}
        endpoint="/getSVIHistory"
        cacheKey={`SVI:${state.branchCode || ""}:${state.docNo || ""}`}  // ✅ per-transaction
        activeTabKey="SVI_Summary"
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

export default MSAJ;