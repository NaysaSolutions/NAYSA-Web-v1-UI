import { useState, useEffect,useRef,useCallback } from "react";
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
import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";


// Configuration
import {fetchData , postRequest, fetchDataJson} from '../../../Configuration/BaseURL.jsx'
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
  useTopVatAmount,
  useTopATCAmount,
  useTopBillCodeRow,
  useTopBankMastRow,
} from '@/NAYSA Cloud/Global/top1RefTable';


import {
  useSelectedOpenAPBalance,
  useSelectedHSColConfig,
} from '@/NAYSA Cloud/Global/selectedData';


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


const APDM = () => {
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
    documentDate:useGetCurrentDay(),    
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
    
    // Vendor information
    vendCode: "",
    vendName: "",
    chainCode:"",
    chainName:"",

    
    // Currency information
    currCode: "",
    currName: "",
    currRate: "",
    defaultCurrRate:"1.000000",


    //Other Header Info
    prcNo:"",
    apdmTypes :[],
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

    selectedAPDMType : "APDM01",
    userCode: user.USER_CODE, 

    //Detail 1-2
    detailRows  :[],
    detailRowsGL :[],
    globalLookupRow:[],
    globalLookupHeader:[],

    totalDebit:"0.00",
    totalCredit:"0.00",

 
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
    showAPBalanceModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    payeeModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showBankMastModal:false,
    showPostingModal:false,
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
  userCode,




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
  selectedAPDMType,
  apdmTypes,
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


  // Contexts
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
  payeeModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showAPBalanceModal,
  showPostingModal,

} = state;


  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }

  //Document Global Setup
  const docType = docTypes.APDM; 
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
  totalVATAmount: '0.00',
  totalATCAmount: '0.00'
  });




  useEffect(() => {
    const debitSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.debit) || 0), 0);
    const creditSum = detailRowsGL.reduce((acc, row) => acc + (parseFormattedNumber(row.credit) || 0), 0);
  updateState({
    totalDebit: formatNumber(debitSum),
    totalCredit: formatNumber(creditSum)
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
  }, [vendCode]);




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
    handleReset();
    loadCompanyData(); 
  }, []);


  


  const LoadingSpinner = () => (
    <div className="global-tran-spinner-main-div-ui">
      <div className="global-tran-spinner-sub-div-ui">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-2" />
        <p>Please wait...</p>
      </div>
    </div>
  );


  


  const updateTotalsDisplay = (siAmt, applied, vat, atc) => {
    setTotals({
          totalSIAmount: formatNumber(siAmt),
          totalAppliedAmount: formatNumber(applied),
          totalVATAmount: formatNumber(vat),
          totalATCAmount: formatNumber(atc)
      });
  };



  const handleReset = () => { 
      updateState({

      branchCode: "HO",
      branchName: "Head Office",
      userCode: user.USER_CODE, 
      documentDate:useGetCurrentDay(),
      selectedAPDMType : "APDM01",
      noReprints:"0",


      refDocNo1: "",
      refDocNo2:"",
      checkDate:null,
      remarks:"",

      vendName:"",
      vendCode:"",
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
      const [ apdmType] = await Promise.all([
        useTopDocDropDown(docType, "APDMTRAN_TYPE"),
      ]);
      if (apdmType) {
        updateState({ apdmTypes: apdmType, selectedARMType: "APDM01" });
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




const fetchTranData = async (documentNo, branchCode) => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"apdmNo");


    if (!data?.apdmId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
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
      documentStatus: data.apdmStatus,
      status: data.docStatus,
      documentID: data.apdmId,
      documentNo: data.apdmNo,
      branchCode: data.branchCode,
      documentDate: useFormatToDate(data.apdmDate),
      selectedAPDMType: data.apdmtranType,
      vendCode: data.vendCode,
      vendName: data.vendName,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
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
        vendCode,
        vendName,
        refDocNo1,
        refDocNo2,  
        currCode,
        currRate,
        remarks,
        detailRows,
        detailRowsGL
    } = state;

    updateState({ isLoading: true });

    const glData = {
      branchCode: branchCode,
      apdmNo: documentNo || "",
      apdmId: documentID || "",
      apdmDate: documentDate,
      apdmtranType: selectedAPDMType,   
      vendCode: vendCode,
      vendName: vendName,
      refDocNo1: refDocNo1 || "",
      refDocNo2: refDocNo2 || "",
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      remarks: remarks|| "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          apvNo: row.apvNo,
          siNo: row.siNo,
          siDate: row.siDate,
          siAmount: parseFormattedNumber(row.siAmount), 
          appliedAmount: parseFormattedNumber(row.appliedAmount), 
          vatCode: row.vatCode,
          vatName: row.vatName,
          vatRate: row.vatRate,
          vatAmount: parseFormattedNumber(row.vatAmount, 2),
          atcCode: row.atcCode,
          atcName: row.atcName,
          atcRate: row.atcRate,
          atcAmount: parseFormattedNumber(row.atcAmount, 2),
          apAcct: row.apAcct,
          crAcct:row.crAcct,
          rcCode: row.rcCode,
          currCode: row.currCode,
          currRate: parseFormattedNumber(row.currRate, 6),
          refBranchcode: row.refBranchcode,
          refDocCode: row.refDocCode,
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

          const response = await useTransactionUpsert(docType, glData, updateState, 'apdmId', 'apdmNo');
          if (response) {

            useSwalshowSaveSuccessDialog(
              handleReset,
              () => handleSaveAndPrint(response.data[0].crId)
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
   
    if (!vendCode) {
      return;
    }


    if (['APDM01'].includes(selectedAPDMType)) {
      await handleOpenAPBalance();
      return;
    }
   


  try {
    const items = await handleFetchDetail(vendCode);
    const itemList = Array.isArray(items) ? items : [items];
    const newRows = await Promise.all(itemList.map(async (item) => {

      return {
        lnNo: "",
        apvNo: "00000000",
        siNo: "00000000",
        siDate: documentDate,
        siAmount:"0.00",
        appliedAmount: "0.00",
        vatCode: item.vatCode || "",
        vatName: item.vatName || "",
        vatAmount:"0.00",
        atcCode: item.atcCode || "",
        atcName: item.atcName || "",
        atcAmount:"0.00",
        currCode: currCode,
        currRate: formatNumber(currRate,6) ,
        apAcct:"",
        crAcct:"",
        rcCode:"",
        refBranchcode: branchCode,
        refDocCode:  "APDM",
        groupId: "",
        atcRate:"0.00",
        vatRate:"0.00"
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
    if(handleFieldBehavior("CWTReversal")){
      return;
    }


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
    if(handleFieldBehavior("CWTReversal")){
      return;
    }

    const updatedRows = [...detailRowsGL];
    updatedRows.splice(index, 1);
    updateState({ detailRowsGL: updatedRows }); 
  };




  const handleFetchDetail = async (vendCode) => {
    if (!vendCode) return [];
  
    try {
      const custPayload = {
        json_data: {
          vendCode: vendCode,
        },
      };
      const vendResponse = await postRequest("addPayeeDetail", JSON.stringify(custPayload));
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
  updateState({ showSignatoryModal: true });

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
if (selectedAPDMType !== "APDM02" || !detailRows?.length) {
  return;
  }

  if (documentID ) {
    updateState({ documentNo:"",
                  documentID:"",
                  documentStatus:"",
                  status:"OPEN",
                  documentDate:useGetCurrentDay(),    
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
        const docNo = params.get("apdmNo");         
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
                console.warn("API call for getPayee returned success: false", response.message);
            }
        }
 

     updateState({
          detailRowsGL: [],
          ...(selectedAPDMType !== "APDM02" && { detailRows: [] }),
          ...updateTotalsDisplay (0, 0, 0, 0),
        });

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
  let totalVAT = 0;
  let totalATC = 0;


  rows.forEach(row => {

    const perSIAmt = parseFormattedNumber(row.siAmount || 0) || 0;
    const perApplied = parseFormattedNumber(row.appliedAmount || 0) || 0;
    const perVAT = parseFormattedNumber(row.vatAmount || 0) || 0;
    const perATC = parseFormattedNumber(row.atcAmount  || 0) || 0;


    totalSIAmt+= perSIAmt;
    totalApplied+= perApplied;
    totalVAT+= perVAT;
    totalATC += perATC;
  });


    updateTotalsDisplay (totalSIAmt,totalApplied, totalVAT,totalATC);

};




const handleDetailChange = async (index, field, value, runCalculations = true) => {
    const updatedRows = [...detailRows];

    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value,
    }
   
     const row = updatedRows[index];

     
    if (['apAcct','crAcct'].includes(field)) {
      row[field] = value.acctCode;
    }


    if (field === 'vatCode') {
          row.vatCode = value.vatCode,
          row.vatName = value.vatName;     
      };

    
    if (field === 'atcCode' ){
          row.atcCode = value.atcCode,
          row.atcName = value.atcName;     
        };


    if (field === 'rcCode' ){
          row.rcCode = value.rcCode;
        };





if (runCalculations) {
let vatRate      = parseFormattedNumber(row.vatRate)      || 0;
let atcRate      = parseFormattedNumber(row.atcRate)      || 0;
let origApplied  = parseFormattedNumber(row.appliedAmount) || 0;
let siAmount     = parseFormattedNumber(row.siAmount)     || 0;

const isAPDM02 = selectedAPDMType === "APDM02";
const isAllTypes = isAPDM02 || selectedAPDMType === "APDM01";


if (field === "appliedAmount") {
  if (isAPDM02) {
    siAmount = parseFormattedNumber(row.appliedAmount);
    row.siAmount = formatNumber(siAmount);
  }

  if (isAllTypes) {
    row.vatAmount      = formatNumber(origApplied * vatRate);
    row.atcAmount      = formatNumber(origApplied * atcRate);
    row.appliedAmount  = formatNumber(origApplied);
  }
}



if ((field === "vatCode" || field === "atcCode") || field === "appliedAmount") {
  const appliedAmt = parseFormattedNumber(row.appliedAmount);

  const vatAmt = row.vatCode
    ? await useTopVatAmount(row.vatCode, appliedAmt)
    : 0;
  row.vatAmount = formatNumber(vatAmt);

  const netOfVat = +(appliedAmt - vatAmt).toFixed(2);
  const atcAmt = row.atcCode
    ? await useTopATCAmount(row.atcCode, netOfVat)
    : 0;
  row.atcAmount = formatNumber(atcAmt);
}



}


    updatedRows[index] = row;
    updateState({ detailRows: updatedRows});
    updateTotals(updatedRows);
};





const handleFieldBehavior = (option) => {
  switch (option) {

 case "withoutInvoice":
      return (
        !isFormDisabled ||
        selectedAPDMType === "APDM02" 
      );


 case "wInvoice":
      return (
        !isFormDisabled ||
        selectedAPDMType !== "APDM02" 
      );


 case "disableOnSaved" :
   return (
        isFormDisabled ||
        (selectedAPDMType !== "APDM02" && state.documentNo !== "" )
      );



  case "CWTReversal" :
    return (
      isFormDisabled ||
      ["APDM03"].includes(selectedAPDMType)
      );



    default:
      return false; 
  }
};




  
  const handleAPDMTypeChange = (e) => {
   const selectedType = e.target.value;

   updateState({
      detailRowsGL: [],
      selectedAPDMType:selectedType,
      ...(selectedAPDMType !== "APDM02" && { detailRows: [] }),
      ...updateTotalsDisplay (0, 0, 0, 0),
    });
  };

  









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

        const specialAccounts = ['apAcct','crAcct'];
        if (specialAccounts.includes(accountModalSource)) {
          handleDetailChange(selectedRowIndex, accountModalSource, selectedAccount,false);
          updateState({detailRowsGL: []})
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



const handleCloseSignatory = async () => {

    updateState({ showSpinner: true,
      showSignatoryModal: false,
     });
    await useHandlePrint(documentID, docType);

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




const handleOpenAPBalance = async () => {
  try {
    updateState({ isLoading: true });

    const groupIdSelected = {
         dt1: detailRows.map((row, index) => ({
          groupId:row.groupId
         }))
    }


    const endpoint ="getOpenAPBalance"
    const response = await fetchDataJson(endpoint, { vendCode, branchCode, tranType:selectedAPDMType, groupIdSelected });
    const custData = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : [];

    const colConfig = await useSelectedHSColConfig(endpoint);

   if (custData.length === 0) {
      await Swal.fire({
        icon: "info",
        title: "Open AP Balance",
        text: "There are no AR balance records for the selected customer/branch.",
      });
       updateState({ isLoading: false });
      return; 
    }

    updateState({ globalLookupRow: custData,
                  globalLookupHeader:colConfig,
                  showAPBalanceModal: true
      });

  } catch (error) {
    console.error("Failed to fetch Open AP Balance:", error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to fetch Open AP Balance.",
    });
    updateState({ 
        globalLookupRow: [] ,
        globalLookupHeader: [] });
  }

   updateState({ isLoading: false });
};




const handleCloseAPBalance = async (payload) => {


  if (payload && payload !== null) {
    updateState({ isLoading: true });

      const result = await useSelectedOpenAPBalance(payload,selectedAPDMType);
      if (result) {
        const newRows = result.map((entry, idx) => {
        const netDisc = parseFormattedNumber(entry.balance);
        const vatRate = parseFormattedNumber(entry.vatCalcRate);
        const atcRate = parseFormattedNumber(entry.atcCalcRate);

        const vatAmount = parseFormattedNumber(entry.vatAmount);
        const atcAmount = parseFormattedNumber(entry.atcAmount);

        // const vatAmount = netDisc * vatRate;   
        // const atcAmount = netDisc * atcRate;   

        return {
          lnNo: idx + 1,
          apvNo: entry.apvNo,
          siNo: entry.siNo,
          siDate: entry.siDate,
          siAmount: formatNumber(netDisc), 
          appliedAmount: formatNumber(netDisc), 
          vatCode: entry.vatCode,
          vatName: entry.vatName,
          vatRate: entry.vatCalcRate,
          vatAmount: formatNumber(vatAmount, 2),
          atcCode: entry.atcCode,
          atcName: entry.atcName,
          atcRate: entry.atcCalcRate,
          atcAmount: formatNumber(atcAmount, 2),
          apAcct: entry.apAccount,
          crAcct:entry.drAccount,
          rcCode: entry.rcCode,
          currCode: entry.currCode,
          currRate: formatNumber(entry.currRate, 6),
          refBranchcode: branchCode,
          refDocCode: entry.refDocCode,
          groupId: entry.groupId,
          };
        });

        const updatedRows = [...detailRows, ...newRows];
        updateState({ detailRows: updatedRows });
        updateTotals(updatedRows);
        
      }  
  }

  updateState({ 
    showAPBalanceModal: false,
    isLoading: false
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
              detailsRoute="/page/APDM"
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
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                {/* SVI Number Field */}
                <div className="relative">
                    <input
                        type="text"
                        id="apdmNo"
                        value={state.documentNo}
                        onChange={(e) => updateState({ documentNo: e.target.value })}
                        onBlur={handleCrNoBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            document.getElementById("apdmDate")?.focus();
                          }}}
                        placeholder=" "
                        className={`peer global-tran-textbox-ui ${state.isDocNoDisabled ? 'bg-blue-100 cursor-not-allowed' : ''}`}
                        disabled={state.isDocNoDisabled}
                    />
                    <label htmlFor="apdmNo" className="global-tran-floating-label">
                        APDM No.
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

                {/* APDM Date Picker */}
                <div className="relative">
                    <input type="date"
                        id="apdmDate"
                        className="peer global-tran-textbox-ui"
                        value={documentDate}
                        onChange={(e) => updateState({ documentDate: e.target.value })} 
                        disabled={isFormDisabled} 
                    />
                    <label htmlFor="apdmDate" className="global-tran-floating-label">APDM Date</label>
                </div>

                
                         
              


            </div>



            {/* Column 2 */}
            <div className="global-tran-textbox-group-div-ui">

                  {/* Transaction Type */}
                <div className="relative">
                    <select id="apdmType"
                        className="peer global-tran-textbox-ui"
                        value={selectedAPDMType}
                        disabled={handleFieldBehavior("disableOnSaved")} 
                        onChange={(e) => handleAPDMTypeChange(e)}
                    >
                        {apdmTypes.length > 0 ?
                        (
                            <>  
                                {apdmTypes.map((type) =>
                                (
                                    <option key={type.DROPDOWN_CODE} value={type.DROPDOWN_CODE}>
                                        {type.DROPDOWN_NAME}
                                    </option>
                                ))}
                            </>
                        ) : (<option value="">Loading Transaction Types...</option>)}
                    </select>
                    <label htmlFor="apdmType" className="global-tran-floating-label">Tran Type</label>
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
                        disabled={handleFieldBehavior("disableOnSaved")} 
                    >
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                {/* Payee Name Display - Make this wider */}
                <div className="relative w-full md:w-6/6 lg:w-4/4"> {/* Added width classes here */}
                    <input type="text" id="vendName" placeholder=" " value={vendName} className="peer global-tran-textbox-ui"/>
                    <label htmlFor="vendName"className="global-tran-floating-label">
                        <span className="global-tran-asterisk-ui"> * </span>Payee Name
                    </label>
                </div>

                 

            </div>

            {/* Column 3 */}
            <div className="global-tran-textbox-group-div-ui">

                
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
                    <input type="text" id="refDocNo1"  
                           value={refDocNo1 || ""} 
                           placeholder=" " 
                           onChange={(e) => updateState({ refDocNo1: e.target.value })} 
                           className="peer global-tran-textbox-ui " 
                           disabled={isFormDisabled} />
                    <label htmlFor="refDocNo1" className="global-tran-floating-label">Ref Doc No. 1</label>
                </div>

                <div className="relative">
                    <input type="text" 
                          id="refDocNo2" 
                          value={refDocNo2 || ""} 
                          placeholder=" " 
                          onChange={(e) => updateState({ refDocNo2: e.target.value })}  
                          className="peer global-tran-textbox-ui" 
                          disabled={isFormDisabled} />
                    <label htmlFor="refDocNo2" className="global-tran-floating-label">Ref Doc No. 2</label>
                </div>     
        </div>

    </div>
</div>
      
      {/* APV Detail Section */}
      <div id="apdm_dtl" className="global-tran-tab-div-ui" >

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
          <th className="global-tran-th-ui">APV No.</th>
          <th className="global-tran-th-ui">Invoice No.</th>
          <th className="global-tran-th-ui">Invoice Date</th>
          <th className="global-tran-th-ui">Invoice Amount</th>
          <th className="global-tran-th-ui">Applied Amount</th>
          <th className="global-tran-th-ui">VAT Code</th>
          <th className="global-tran-th-ui">VAT Name</th>
          <th className="global-tran-th-ui">VAT Amount</th>
          <th className="global-tran-th-ui">ATC</th>
          <th className="global-tran-th-ui">ATC Name</th>
          <th className="global-tran-th-ui">ATC Amount</th>
          <th className="global-tran-th-ui">Curr Code</th>
          <th className="global-tran-th-ui">Curr Rate</th>
          <th className="global-tran-th-ui">AP Account</th>
          <th className="global-tran-th-ui">CR Account</th>
          <th className="global-tran-th-ui">RC Code</th>
          <th className="global-tran-th-ui hidden">Ref Branch</th>
          <th className="global-tran-th-ui hidden">Ref Doc Code</th>
          <th className="global-tran-th-ui hidden">Group ID</th>
          <th className="global-tran-th-ui hidden">VAT Rate</th>
          <th className="global-tran-th-ui hidden">ATC Rate</th>
                 
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

         {/* APV No */}
          <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.apvNo || ""}
                onChange={(e) => handleDetailChange(index, 'apvNo', e.target.value)}
                readOnly
              />
            </td>
          
         {/* SI No */}
          <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.siNo || ""}
                onChange={(e) => handleDetailChange(index, 'siNo', e.target.value)}
                readOnly
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
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                value={row.siAmount || ""}
                readOnly
              />
            </td>

            

            {/* Applied */}
            <td className="global-tran-td-ui">
                <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row.appliedAmount || ""}
                    readOnly={handleFieldBehavior("CWTReversal")}
                    onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChange(index, "appliedAmount", sanitizedValue, false);
                        }
                    }}                   
                     onFocus={(e) => {
                        if (e.target.value === "0.00" || e.target.value === "0") {
                          e.target.value = "";
                        }
                      }}  

                    onBlur={async (e) => {
                         if (handleFieldBehavior("CWTReversal")) {
                                  return;
                                }

                        const value = e.target.value;
                        const num = parseFormattedNumber(value);
                        if (!isNaN(num)) {
                            await handleDetailChange(index, "appliedAmount", num, true);
                        }
                        setFocusedCell(null);
                    }}
                    onKeyDown={async (e) => {
                         if (handleFieldBehavior("CWTReversal")) {
                                  return;
                                }

                        if (e.key === "Enter") {
                            e.preventDefault();
                            const value = e.target.value;
                            const num = parseFormattedNumber(value);
                            if (!isNaN(num)) {
                                await handleDetailChange(index, "appliedAmount", num, true);
                            }
                            e.target.blur();
                            updateState({detailRowsGL: []})
                        }
                    }}
                />
            </td>

             <td className="global-tran-td-ui relative">
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.vatCode || ""}
                  readOnly
                />
                {!handleFieldBehavior("CWTReversal") && (
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

            <td className="global-tran-td-ui">
                <input
                    type="text"
                    className="w-[200px] global-tran-td-inputclass-ui"
                    value={row.vatName || ""}
                    readOnly
                />
            </td>

            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                value={formatNumber(parseFormattedNumber(row.vatAmount)) || formatNumber(parseFormattedNumber(row.vatAmount)) || ""}
                readOnly
              />
            </td>

            <td className="global-tran-td-ui relative">
              <div className="flex items-center">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                  value={row.atcCode || ""}
                  readOnly
                />
                {!handleFieldBehavior("CWTReversal") && (
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

            
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[200px] global-tran-td-inputclass-ui"
                value={row.atcName || ""}
                readOnly
              />
            </td>

            <td className="global-tran-td-ui">
                <input
                   type="text"
                   className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={formatNumber(parseFormattedNumber(row.atcAmount)) || formatNumber(parseFormattedNumber(row.atcAmount)) || ""}
                   onChange={(e) => handleDetailChange(index, 'ewtAmount', e.target.value)}
                />
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

            
            {/* AR Account */}          
            <td className="global-tran-td-ui relative">
            <div className="flex items-center">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                value={row.apAcct || ""}
                readOnly
              />
              {(handleFieldBehavior("withoutInvoice") && (row.groupId == null || row.groupId === "")) && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                    updateState({ selectedRowIndex: index ,
                                  showAccountModal: true,
                                  accountModalSource: "apAcct"  });
                  }}
                />
              )}
            </div>        
            </td>



             {/* Sales Account */}          
            <td className="global-tran-td-ui relative">
            <div className="flex items-center">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui text-center pr-6 cursor-pointer"
                value={row.crAcct || ""}
                readOnly
              />
              {(!handleFieldBehavior("CWTReversal") && handleFieldBehavior("wInvoice")) && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                    updateState({ selectedRowIndex: index ,
                                  showAccountModal: true,
                                  accountModalSource: "crAcct"  });
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
                {(handleFieldBehavior("withoutInvoice") && (row.groupId == null || row.groupId === "")) && (
                <FontAwesomeIcon 
                  icon={faMagnifyingGlass} 
                  className="absolute right-2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                  onClick={() => {
                  updateState({ selectedRowIndex: index,
                                showRcModal: true,
                                accountModalSource: "rcCode" }); 
                  }}
                />)}
              </div>
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

            {/* VAT Rate */}
           <td className="global-tran-td-ui hidden">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.vatRate || ""}                
                readOnly
              />
            </td>

            {/* ATC Rate */}
           <td className="global-tran-td-ui hidden">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.atcRate || ""}                
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

 
  <div className="global-tran-tab-footer-total-div-ui">
    <label className="global-tran-tab-footer-total-label-ui">
      Total Invoice Amount:
    </label>
    <label id="totalSIAmount" className="global-tran-tab-footer-total-value-ui">
      {totals.totalSIAmount}
    </label>
  </div>

  {/* Total VAT Amount */}
  <div className="global-tran-tab-footer-total-div-ui" >
    <label className="global-tran-tab-footer-total-label-ui">
       {"Total Applied Amount:"}
    </label>
    <label id="totalAppliedAmount" className="global-tran-tab-footer-total-value-ui">
      {totals.totalAppliedAmount}
    </label>
  </div>

  {/* Total ATC Amount */}
  <div className="global-tran-tab-footer-total-div-ui" >
    <label className="global-tran-tab-footer-total-label-ui">
      Total VAT Amount:
    </label>
    <label id="totalUnappliedAmount" className="global-tran-tab-footer-total-value-ui">
      {totals.totalVATAmount}
    </label>
  </div>

  {/* Total Payable Amount (Invoice + VAT - ATC) */}

  <div className="global-tran-tab-footer-total-div-ui">
    <label className="global-tran-tab-footer-total-label-ui">
      Total ATC Amount:
    </label>
    <label id="totalBalanceAmount" className="global-tran-tab-footer-total-value-ui">
      {totals.totalATCAmount}
    </label>
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
                  {!handleFieldBehavior("CWTReversal") && (
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
                   {!handleFieldBehavior("CWTReversal") && (row.rcCode === "REQ RC" || (row.rcCode && row.rcCode !== "REQ RC")) && (
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

                      {!handleFieldBehavior("CWTReversal") && (row.slCode === "REQ SL" || row.slCode) && ( 
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

                      {!handleFieldBehavior("CWTReversal") && row.vatCode && row.vatCode.length > 0 && (
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

                      {!handleFieldBehavior("CWTReversal") && (row.atcCode !== "" || row.atcCode) && ( 
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
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debit", sanitizedValue);
                        }}}

                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debit', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
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
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "credit", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                        if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'credit', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
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
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debitFx1", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debitFx1', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
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
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "creditFx1", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'creditFx1', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
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
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "debitFx2", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                            
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'debitFx2', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
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
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => {   
                        const inputValue = e.target.value;
                        const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
                        if (/^\d*\.?\d{0,2}$/.test(sanitizedValue) || sanitizedValue === "") {
                            handleDetailChangeGL(index, "creditFx2", sanitizedValue);
                        }}}
                  onKeyDown={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault(); 
                            handleBlurGL(index, 'creditFx2', e.target.value,true);
                          }}}
                  onFocus={(e) => {
                    if(handleFieldBehavior("CWTReversal")) {
                            return;
                          }
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
                  readOnly={handleFieldBehavior("CWTReversal")}
                  maxLength={25}
                  onChange={(e) => handleDetailChangeGL(index, 'slRefNo', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="date"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.slRefDate || ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
                  onChange={(e) => handleDetailChangeGL(index, 'slRefDate', e.target.value)}
                />

              </td>
                <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.remarks ||  ""}
                  readOnly={handleFieldBehavior("CWTReversal")}
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




{payeeModalOpen && (
  <PayeeMastLookupModal
    isOpen={payeeModalOpen}
    onClose={handleClosePayeeModal}
  />
)}



{showBankMastModal && (
  <BankMastLookupModal
    isOpen={showBankMastModal}
    onClose={handleCloseBankMast}
  />
)}



{showAPBalanceModal && (
  <GlobalLookupModalv1
    isOpen={showAPBalanceModal}
    data={globalLookupRow}
    btnCaption="Get Selected Invoice"
    title="Open AP Balance"
    endpoint={globalLookupHeader}
    onClose={handleCloseAPBalance}
    onCancel={() => updateState({ showAPBalanceModal: false })}
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




 {/* {showPostingModal && (
  <PostAPDM
    isOpen={showPostingModal}
    onClose={() => updateState({ showPostingModal: false })}
  />
)}  */}


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
    params={documentID}
    onClose={handleCloseSignatory}
    onCancel={() => updateState({ showSignatoryModal: false })}
  />
)}




    {showSpinner && <LoadingSpinner />}
  </div>


  <div className={topTab === "history" ? "" : "hidden"}>
      <AllTranHistory
        showHeader={false}
        endpoint="/getAPDMHistory"
        cacheKey={`APDM:${state.branchCode || ""}:${state.docNo || ""}`}  // ✅ per-transaction
        activeTabKey="APDM_Summary"
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

export default APDM;