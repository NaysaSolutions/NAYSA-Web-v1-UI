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
import BankMastLookupModal from "../../../Lookup/SearchBankMast.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import GlobalLookupModalv1 from "../../../Lookup/SearchGlobalLookupv1.jsx";
import PostCR from "../../../Module/Main Module/Accounts Receivable/PostCR.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

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
  useTopRCRow,
  useTopAccountRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopDocControlRow,
} from '@/NAYSA Cloud/Global/top1RefTable';


import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';

import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';



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
  useFieldLenghtCheck,
  useGetFieldLength,
} from '@/NAYSA Cloud/Global/procedure';


import {
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';


import { 
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
  useSwalvalidateRequiredFields,
  useSwalErrorAlert,
  useSwalSuccessAlert
} from '@/NAYSA Cloud/Global/behavior.jsx';


import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

// Header
import Header from '@/NAYSA Cloud/Components/Header';
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";


const AR = () => {

  const loadedFromUrlRef = useRef(false);
  const navigate = useNavigate();
  const location = useLocation(); 
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded ,getAllTopATCRow, getAllTopVatRow,getAllTopVatAmount,getAllTopATCAmount,getAllTopHSDocRow } = useAuth();
  const [isViewDocument, setIsViewDocument] = useState(false);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("viewDocument") === "true") {
      setIsViewDocument(true);
    }
    }, []); 
  const isViewDocumentUrl = isViewDocument;



  const [topTab, setTopTab] = useState("details"); // "details" | "history"
  const { resetFlag } = useReset();
  
  const [focusedCell, setFocusedCell] = useState(null); // { index: number, field: string }
  const docType = docTypes.AR; 
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc.docName + ' Transaction';
 

  const [state, setState] = useState({
    // HS Option
    glCurrMode:companyInfo?.glCurrMode||"",
    glCurrDefault:companyInfo?.currCode||"",
    withCurr2:false,
    withCurr3:false,
    glCurrGlobal1:companyInfo?.glCurrGlobal1||"",
    glCurrGlobal2:companyInfo?.glCurrGlobal2||"",
    glCurrGlobal3:companyInfo?.glCurrGlobal3||"",


    
    // Document information
    documentName: hsDoc?.docName||"",
    documentSeries: hsDoc?.docSeries||"Auto",
    documentDocLen: hsDoc?.docLength||8,
    documentID: null,
    documentNo: "",
    documentStatus:"",
    documentDate:useGetCurrentDayV2(),
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


    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",
    
    
    // Vendor information
    custCode: "",
    custName: "",
    chainCode:"",
    chainName:"",

    
    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),


    //Other Header Info
    tblFieldArray :[],
    prcNo:"",
    arTypes :[],
    paymentTypes:[],
    checkTypes:[],
    depBankCode:companyInfo?.depBankcode||"", 
    depAcctName:companyInfo?.depositBankName||"", 
    depAcctNo:companyInfo?.depositBankAcctNo||"", 
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

    userCode: currentUserRow?.userCode||"", 


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
    custModalParams:"ActiveAll",
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
  showBankMastModal,
  currencyModalOpen,
  branchModalOpen,
  custModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showARBalanceModal,
  showPostingModal,
  showAllTranDocNo,
  custModalParams,


} = state;

  //Status Global Setup
  const displayStatus = status || 'OPEN';
  const statusMap = {
    FINALIZED: "global-tran-stat-text-finalized-ui",
    CANCELLED: "global-tran-stat-text-closed-ui",
    CLOSED: "global-tran-stat-text-closed-ui",
  };
  const statusColor = statusMap[displayStatus] || "";
  const isFormDisabled = isViewDocumentUrl || ["FINALIZED", "CANCELLED", "CLOSED"].includes(displayStatus);
  

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
  



 
const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    handleReset();
    loadCompanyData();
    isInitialMount.current = false;
  }
}, []);

  
    useEffect(() => {
      const onKey = (e) => {
        if (e.key === "F1") { e.preventDefault(); updateState({showAllTranDocNo:true}); }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);
  
  

  


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


useEffect(() => {
  if (!refsLoaded) return;

  // Fetch all dropdown data synchronously
  const crTran = getAllDropDown("ARTRAN_TYPE", docType);
  const crType = getAllDropDown("AR_TYPE", docType);
  const crCheck = getAllDropDown("ARCHECK_TYPE", docType);

  // Initialize an object to batch updates
  const updates = {};

  if (crTran.length > 0) {
    updates.arTypes = crTran;
    updates.selectedARType = "AR11";
  }

  if (crType.length > 0) {
    updates.paymentTypes = crType;
    updates.selectedPayType = "AR01";
  }

  if (crCheck.length > 0) {
    updates.checkTypes = crCheck;
    updates.selectedCheckType = "AR21";
  }

  // Only trigger updateState if we found valid data
  if (Object.keys(updates).length > 0) {
    updateState(updates);
  }
}, [docType, refsLoaded]);



  const handleReset = () => { 
      updateState({

      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate:useGetCurrentDayV2(),
      currCode:companyInfo?.currCode||"",
      glCurrDefault:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,

      depBankCode:companyInfo?.depBankcode||"", 
      depAcctName:companyInfo?.depositBankName||"", 
      depAcctNo:companyInfo?.depositBankAcctNo||"", 

      selectedARType:"AR11",
      selectedPayType:"AR01",
      selectedCheckType: "AR21",
      
      refDocNo1: "",
      refDocNo2:"",
      checkDate:null,
      remarks:"",
      checkNo:"",
      bank:"",
      
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
              updateState({ isLoading: true });
            
              try {
                const hdtblcol_result = await useFieldLenghtCheck(
                  "ar_hd,ar_dt1,ar_dt2"
                );
            
                if (hdtblcol_result) {
                  updateState({ tblFieldArray: hdtblcol_result });
                }
              } catch (err) {
                console.error("Error fetching data:", err);
              } finally {
                updateState({ isLoading: false });
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
      slRefDate:useformatToDatev2(glRow.slRefDate),
    }));

  
    // Update state with fetched data

   
    updateState({
      documentStatus: data.arStatus,
      status: data.docStatus,
      documentID: data.arId,
      documentNo: data.arNo,
      branchCode: data.branchCode,
      branchName: data.branchName,
      documentDate: useformatToDatev2(data.arDate),
      selectedARType: data.artranType,
      selectedPayType:data.paymentType,
      selectedCheckType:data.ckType,
      depBankCode:data.depBankCode,
      depAcctName:data.depAcctName,
      depAcctNo:data.depAcctNo,
      chainCode: data.chainCode,
      chainName: data.chainName,
      custCode: data.custCode,
      custName: data.custName,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      checkNo:data.checkNo,
      checkDate:useformatToDatev2(data.checkDate),
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
  if ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0) {
    return;
  }



  if (documentStatus !== "") return;

  updateState({ isLoading: true });

  try {
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
      userCode,
      detailRows,
      detailRowsGL,
    } = state;

    let finalDetailRowsGL = [...detailRowsGL];

    const buildGlData = (glRows) => ({
      branchCode: branchCode,
      arNo: documentNo || "",
      arId: documentID || "",
      arDate: documentDate,
      artranType: selectedARType,
      paymentType: selectedPayType,
      ckType: selectedCheckType,
      chainCode: chainCode || "",
      chainName: chainName || "",
      custCode: custCode || "",
      custName: custName || "",
      refDocNo1: refDocNo1 || "",
      refDocNo2: refDocNo2 || "",
      depBankCode: depBankCode || "",
      depAcctName: depAcctName || "",
      depAcctNo: depAcctNo || "",
      bank: bank || "",
      checkNo: checkNo || "",
      checkDate: checkDate || null,
      currAmount: parseFormattedNumber(totals.currAmount || currAmount || 0),
      amount: parseFormattedNumber(checkAmount || 0),
      currCode: currCode || "PHP",
      currRate: parseFormattedNumber(currRate),
      remarks: remarks || "",
      userCode: userCode,
      dt1: detailRows.map((row, index) => ({
        lnNo: String(index + 1),
        siNo: row.siNo || "",
        siDate: row.siDate || "",
        siAmount: parseFormattedNumber(row.siAmount || 0),
        appliedAmount: parseFormattedNumber(row.appliedAmount || 0),
        balance: parseFormattedNumber(row.balance || 0),
        unappliedAmount: parseFormattedNumber(row.unappliedAmount || 0),
        currCode: row.currCode || "",
        currRate: parseFormattedNumber(row.currRate || 0),
        bank: row.bank || "",
        checkNo: row.checkNo || "",
        checkDate: row.checkDate || "",
        checkAmount: parseFormattedNumber(row.checkAmount || 0),
        refBranchcode: row.refBranchcode || "",
        refDocCode: row.refDocCode || "",
        arAcct: row.arAcct || "",
        w2307: row.w2307 || "",
        custCode: row.custCode || "",
        custName: row.custName || "",
        groupId: row.groupId || "",
      })),
      dt2: glRows.map((entry, index) => ({
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
        slRefDate: entry.slRefDate || null,
        remarks: entry.remarks || "",
        dt1Lineno: entry.dt1Lineno || "",
      })),
    });




        if (action === "GenerateGL") {
            const newGlEntries = await useGenerateGLEntries(
              docType,
              buildGlData(finalDetailRowsGL)
            );


            const formattedGlEntries = newGlEntries.map((entry) => ({
              ...entry,        
              slRefDate: useformatToDatev2(entry.slRefDate),
            }));

    
            if (newGlEntries) {
              updateState({ detailRowsGL: formattedGlEntries });
            } else {
              console.warn("GL entries generation failed or returned no data.");
            }
            return;
          }

    


    if (action === "Upsert") {
      if (finalDetailRowsGL.length === 0) {
        const newGlEntries = await useGenerateGLEntries(
          docType,
          buildGlData([])
        );

        if (!newGlEntries || newGlEntries.length === 0) {
          console.warn("GL entries generation failed or returned no data.");
          return;
        }

         const formattedGlEntries = newGlEntries.map((entry) => ({
              ...entry,        
              slRefDate: useformatToDatev2(entry.slRefDate),
            }));

      
        finalDetailRowsGL = newGlEntries;
        updateState({ detailRowsGL: formattedGlEntries });
      }


      const response = await useTransactionUpsert(
        docType,
        buildGlData(finalDetailRowsGL),
        updateState,
        "arId",
        "arNo"
      );

      if (response) {
        const responseDocNo =  response.data[0].arNo;
        const responseDocId =  response.data[0].arId;

        await fetchTranData(responseDocNo,branchCode);

        const isZero = Number(noReprints) === 0;
        const onSaveAndPrint = isZero
          ? () => updateState({ showSignatoryModal: true })
          : () => handleSaveAndPrint(responseDocId);

        useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);

        updateState({
          documentNo: response?.data?.[0]?.arNo || "",
          documentID: response?.data?.[0]?.arId || "",
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      }
    }
  } catch (error) {
    console.error(`Error during ${action}:`, error);
  } finally {
    updateState({ isLoading: false });
  }
};


const handleAddRow = async () => {
 

 const fieldsToCheck = {
          "Header : Customer or Chain": custCode || chainCode,
        };
        const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Add Invoice");
        if (!isValid) return;
    
    


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




const handleAddRowGL = (index = null) => {
    if (!Array.isArray(detailRows) || detailRows.length === 0) {
    return;
  }
  const newRow = {
    acctCode: "",
    rcCode: "",
    sltypeCode: "CU",
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
  };

  const updatedRows = [...detailRowsGL];

  if (index !== null && index >= 0) {
    updatedRows.splice(index + 1, 0, newRow);
  } else {
    updatedRows.push(newRow);
  }

  updateState({
    detailRowsGL: updatedRows,
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
                  documentDate:useGetCurrentDayV2(), 
                  noReprints:"0",
     });
  }
};



     
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
  const docNo = params.get("arNo");
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
  const originalRow = { ...updatedRows[index] };

  const numericFields = [
    "appliedAmount",
    "unappliedAmount",
    "siAmount",
    "checkAmount",
    "balance",
  ];

  const lookupFields = ["arAcct"];

  const normalizeValue = (fld, val) => {
    if (lookupFields.includes(fld)) {
      return val?.acctCode ?? val ?? "";
    }

    if (numericFields.includes(fld)) {
      return parseFormattedNumber(val) || 0;
    }

    return val ?? "";
  };

  const originalFieldValue = normalizeValue(field, originalRow?.[field]);
  const incomingFieldValue = normalizeValue(field, value);

  const glTriggerFields = ["appliedAmount", "unappliedAmount", "arAcct"];
  const shouldClearGL =
    glTriggerFields.includes(field) && originalFieldValue !== incomingFieldValue;

  updatedRows[index] = {
    ...updatedRows[index],
    [field]: value,
  };

  const row = updatedRows[index];

  if (field === "arAcct") {
    row[field] = value?.acctCode ?? "";
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
            ? Math.abs(origApplied) <= Math.abs(origSIAmt)
              ? origApplied
              : origSIAmt
            : Math.min(origApplied, origSIAmt);

        row.appliedAmount = formatNumber(applied);
      }

      if (selectedARType === "AR13" || selectedARType === "AR12") {
        row.checkAmount = formatNumber(newCheckAmt);
        row.balance = formatNumber(0);
        row.siAmount = formatNumber(newCheckAmt);
        row.appliedAmount = formatNumber(origApplied);
      }
    }

    if (field === "unappliedAmount") {
      row.checkAmount = formatNumber(newCheckAmt);
      row.balance = formatNumber(
        selectedARType === "AR11" ? origSIAmt - origApplied : 0
      );
      row.unappliedAmount = formatNumber(origUnApplied);
    }
  }

  updatedRows[index] = row;

  updateState({
    detailRows: updatedRows,
    ...(shouldClearGL ? { detailRowsGL: [] } : {}),
  });

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
  const rowIndex = selectedRowIndex;
  const modalSource = accountModalSource;

  if (selectedRc && rowIndex !== null) {
    if (modalSource !== null) {
      handleDetailChange(rowIndex, "rcCode", selectedRc, false);
    } else {
      const result = await useTopRCRow(selectedRc.rcCode);
      if (result) {
        handleDetailChangeGL(rowIndex, "rcCode", result);
      }
    }
  }

  updateState({
    showRcModal: false,
    selectedRowIndex: null,
    accountModalSource: null,
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

      const result = await useHandleCancel(docType,documentID,currentUserRow.userCode,confirmation.password,confirmation.reason,updateState);
      if (result.success) 
      {
       useSwalSuccessAlert("Success","Cancellation Completed")  
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
       useSwalErrorAlert("Open AR Balance", "There are no AR balance records for the selected customer/branch.")
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
    
     const result = getAllTopVatRow(selectedVat.vatCode);
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

    const result = getAllTopATCRow(selectedAtc.atcCode);
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
              isViewDocument={isViewDocument}  
              onDetails={() => setTopTab("details")}
              onHistory={() => setTopTab("history")}
              disableRouteNavigation={true}         
              detailsRoute="/page/CR"

              isSaveDisabled={state.isSaveDisabled || isFormDisabled ||  ((detailRows?.length || 0) + (detailRowsGL?.length || 0) === 0)} 
              isResetDisabled={state.isResetDisabled}
              isAttachDisabled={!documentID}
              isPrintDisabled={!documentID || displayStatus === "CANCELLED"}
              isCopyDisabled={!documentID || displayStatus === "CANCELLED"}
              isCancelDisabled={!documentID || displayStatus === "CANCELLED" || displayStatus === "FINALIZED"|| displayStatus === "CLOSED"}


            />
      </div>

      <div className={topTab === "details" ? "" : "hidden"}>

        
          {/* Page title and subheading */} 
          <div className={`global-tran-header-ui ${isViewDocument ? "max-md:!mt-12 max-md:!pt-2 max-md:!pb-2" : ""}`}>
            <div className={`global-tran-headertext-div-ui ${isViewDocument ? "max-md:!mb-1" : ""}`}>
              <h1 className="global-tran-headertext-ui">{documentTitle}</h1>
            </div>
            <div className={`global-tran-headerstat-div-ui ${isViewDocument ? "max-md:!mt-0" : ""}`}>
              <div>
                <p className="global-tran-headerstat-text-ui">Transaction Status</p>
                <h1 className={`global-tran-stat-text-ui ${statusColor}`}>{displayStatus}</h1>
              </div>
            </div>
          </div>

          {/* Form Layout with Tabs */}
          <div className={`global-tran-header-div-ui ${isViewDocument ? "max-md:!mt-10 max-md:!pt-0 max-md:!pb-0" : ""}`}>
            {/* Tab Navigation */}
            <div className={`global-tran-header-tab-div-ui ${isViewDocument ? "max-md:!mt-0 max-md:!pt-0 max-md:!pb-4 max-md:!mb-4 max-md:!justify-start max-md:!text-left" : ""}`}>
              <button
                className={`global-tran-tab-padding-ui ${
                  activeTab === "basic"
                    ? "global-tran-tab-text_active-ui"
                    : "global-tran-tab-text_inactive-ui"
                }`}
                onClick={() => setActiveTab("basic")}
              >
                Basic Information
              </button>
              {/* Provision for Other Tabs */}
            </div>
                  

          {/* AR Header Form Section - Main Grid Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative items-stretch" id="ar_hd">
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Column 1 */}
                  <div className="global-tran-textbox-group-div-ui">
                    <FieldRenderer
                      id="branchName"
                      label="Branch"
                      type="lookup"
                      value={branchName || ""}
                      disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                      readOnly
                      lookupDisabled={isFetchDisabled}
                      onLookup={() => updateState({ branchModalOpen: true })}
                    />

                    <FieldRenderer
                      id="arNo"
                      label="AR No."
                      type="lookup"
                      value={state.documentNo || ""}
                      disabled={state.isDocNoDisabled}
                      onChange={(val) => updateState({ documentNo: val })}
                      onLookup={() => updateState({ showAllTranDocNo: true })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleCrNoBlur();
                          e.preventDefault();
                          document.getElementById("documentDate")?.focus();
                        }
                      }}
                    />

                    <div className="relative w-full">
                      <div
                        className={`flex items-stretch global-ref-textbox-ui ${
                          !isFormDisabled
                            ? "global-ref-textbox-enabled"
                            : "global-ref-textbox-disabled"
                        }`}
                      >
                        <DateFormatInput
                          id="documentDate"
                          className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                          value={documentDate}
                          disabled={isFormDisabled}
                          updateState={updateState}
                        />
                      </div>
                      <label
                        htmlFor="documentDate"
                        className={`global-ref-floating-label ${
                          !isFormDisabled
                            ? "global-ref-label-enabled"
                            : "global-ref-label-disabled"
                        }`}
                      >
                        AR Date
                      </label>
                    </div>

                    <FieldRenderer
                      id="selectedARType"
                      label="AR Type"
                      type="select"
                      value={selectedARType || ""}
                      disabled={handleFieldBehavior("disableOnSaved")}
                      onChange={(val) => handleARTypeChange({ target: { value: val } })}
                      options={arTypes.map((t) => ({
                                label: t.DROPDOWN_NAME,
                                value: t.DROPDOWN_CODE,
                                }))}
                    />
                  </div>

                  {/* Column 2 */}
                  <div className="global-tran-textbox-group-div-ui">
                    <FieldRenderer
                      id="chainCode"
                      label="Chain Code"
                      required
                      type="lookup"
                      value={chainCode || ""}
                      disabled={handleFieldBehavior("disableOnSaved")}
                      readOnly
                      lookupDisabled={isFetchDisabled}
                      onLookup={() => updateState({ custModalOpen: true })}
                    />

                    <FieldRenderer
                      id="chainName"
                      label="Chain Name"
                      required
                      type="text"
                      value={chainName || ""}
                      disabled
                      readOnly
                    />

                    <FieldRenderer
                      id="custCode"
                      label="Customer Code"
                      required
                      type="lookup"
                      value={custCode || ""}
                      disabled={handleFieldBehavior("disableOnSaved")}
                      readOnly
                      lookupDisabled={isFetchDisabled}
                       onLookup={() => updateState({ custModalOpen: true,                                
                                                     custModalParams : selectedARType==="AR11"?"OpenAR":"ActiveAll" })}
                    />

                    <FieldRenderer
                      id="custName"
                      label="Customer Name"
                      required
                      type="text"
                      value={custName || ""}
                      disabled
                      readOnly
                    />
                  </div>

                  {/* Column 3 */}
                  <div className="global-tran-textbox-group-div-ui">
                    <FieldRenderer
                      id="depAcctName"
                      label="Bank Name"
                      type="lookup"
                      value={depAcctName || ""}
                      disabled={isFormDisabled}
                      readOnly
                      lookupDisabled={isFetchDisabled}
                      onLookup={() => updateState({ showBankMastModal: true })}
                    />

                    <FieldRenderer
                      id="depAcctNo"
                      label="Bank Account No."
                      type="text"
                      value={depAcctNo || ""}
                      disabled={isFormDisabled}
                      onChange={(val) => updateState({ depAcctNo: val })}
                    />

                    <FieldRenderer
                      id="currAmount"
                      label="Original Amount"
                      type="amount"
                      value={totals.currAmount || ""}
                      disabled={isFormDisabled}
                      readOnly
                    />

                    <div className="flex gap-4">
                      <input type="hidden" id="currCode" value={currCode || ""} readOnly />

                      <div className="flex-grow w-2/3">
                        <FieldRenderer
                          id="currName"
                          label="Currency"
                          type="lookup"
                          value={
                              currCode
                                ? `${currCode}${currName ? ` - ${currName}` : ""}`
                                : ""
                            }
                          disabled={isFormDisabled}
                          onLookup={() => updateState({ currencyModalOpen: true })}
                          readOnly
                        />
                      </div>

                      <div className="flex-grow">
                        <FieldRenderer
                          id="currRate"
                          label="Currency Rate"
                          type="amount"
                          value={currRate || ""}
                          disabled={isFormDisabled || glCurrDefault === currCode}
                          onChange={(val) => {
                            const sanitizedValue = String(val).replace(/[^0-9.]/g, "");
                            if (
                              /^\d*\.?\d{0,6}$/.test(sanitizedValue) ||
                              sanitizedValue === ""
                            ) {
                              updateState({ currRate: sanitizedValue });
                            }
                          }}
                          onBlur={handleCurrRateNoBlur}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              document.getElementById("refDocNo1")?.focus();
                            }
                          }}
                          onFocus={(e) => {
                            if (parseFormattedNumber(e.target.value) === 0) {
                              e.target.value = "";
                            }
                          }}
                        />
                      </div>
                    </div>

                    <FieldRenderer
                      id="checkAmount"
                      label="Check Amount"
                      type="amount"
                      value={checkAmount || ""}
                      disabled
                    />
                  </div>

                  {/* Remarks */}
                  <div className="col-span-full">
                    <div className="relative p-2">
                      <textarea
                        id="remarks"
                        placeholder=""
                        rows={6}
                        className="peer global-tran-textbox-remarks-ui pt-2"
                        value={remarks}
                        onChange={(e) => updateState({ remarks: e.target.value })}
                        maxLength={useGetFieldLength(tblFieldArray, "remarks")}
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

                {/* Column 4 */}
                <div className="global-tran-textbox-group-div-ui flex flex-col">
                  <FieldRenderer
                    id="prcNo"
                    label="Prov. Receipt No."
                    type="lookup"
                    value={prcNo || ""}
                    disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
                    readOnly
                    lookupDisabled={isFetchDisabled}
                  />

                  <FieldRenderer
                    id="payType"
                    label="Payment Type"
                    type="select"
                    value={selectedPayType || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => handlePaymentTypeChange({ target: { value: val } })}
                    options={paymentTypes.map((t) => ({
                                label: t.DROPDOWN_NAME,
                                value: t.DROPDOWN_CODE,
                                }))}
                  />

                  <FieldRenderer
                    id="checkType"
                    label="Check Type"
                    type="select"
                    value={selectedCheckType || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => handleCheckTypeChange({ target: { value: val } })}
                    options={checkTypes.map((t) => ({
                                label: t.DROPDOWN_NAME,
                                value: t.DROPDOWN_CODE,
                                }))}
                  />

                  <FieldRenderer
                    id="checkNo"
                    label="Check No"
                    type="text"
                    value={checkNo || ""}
                    disabled={handleFieldBehavior("disableOnNonCheckPay")}
                    onChange={(val) => updateState({ checkNo: val })}
                    maxLength={useGetFieldLength(tblFieldArray, "check_no")}
                  />

                  <div className="relative w-full">
                    <div
                      className={`flex items-stretch global-ref-textbox-ui ${
                        !handleFieldBehavior("disableOnNonCheckPay")
                          ? "global-ref-textbox-enabled"
                          : "global-ref-textbox-disabled"
                      }`}
                    >
                      <DateFormatInput
                        id="checkDate"
                        className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                        value={checkDate}
                        disabled={handleFieldBehavior("disableOnNonCheckPay")}
                        updateState={updateState}
                      />
                    </div>
                    <label
                      htmlFor="checkDate"
                      className={`global-ref-floating-label ${
                        !handleFieldBehavior("disableOnNonCheckPay")
                          ? "global-ref-label-enabled"
                          : "global-ref-label-disabled"
                      }`}
                    >
                      Check Date
                    </label>
                  </div>

                  <FieldRenderer
                    id="bank"
                    label="Bank"
                    type="text"
                    value={bank || ""}
                    disabled={handleFieldBehavior("disableOnNonCheckPay")}
                    onChange={(val) => updateState({ bank: val })}
                    maxLength={useGetFieldLength(tblFieldArray, "bank")}
                  />

                  <FieldRenderer
                    id="refDocNo1"
                    label="Ref Doc No. 1"
                    type="text"
                    value={refDocNo1 || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ refDocNo1: val })}
                    maxLength={useGetFieldLength(tblFieldArray, "refar_no1")}
                  />

                  <FieldRenderer
                    id="refDocNo2"
                    label="Ref Doc No. 2"
                    type="text"
                    value={refDocNo2 || ""}
                    disabled={isFormDisabled}
                    onChange={(val) => updateState({ refDocNo2: val })}
                    maxLength={useGetFieldLength(tblFieldArray, "refar_no2")}
                  />
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
                  <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                    Actions
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
                                value={row.w2307 || ""}
                                disabled={isFormDisabled}
                                onChange={(e) => handleDetailChange(index, 'w2307', e.target.value)}
                               
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
                    maxLength={useGetFieldLength(tblFieldArray, "si_no")} 
                    readOnly={(row.groupId !== null && row.groupId !== "") || isFormDisabled}
                  />
                </td>
                

                {/* SI Date */}
              <td className="global-tran-td-ui">
                    <input
                      type="date"
                      className="w-[100px] global-tran-td-inputclass-ui"
                      value={row.siDate || ""}
                      onChange={(e) => handleDetailChange(index, 'siDate', e.target.value)}
                      readOnly={(row.groupId !== null && row.groupId !== "") || isFormDisabled}
                    />
                </td>



                {/* SI Amount */}
                <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenDetailAdvaces")}>
                  <input
                    type="text"
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={formatNumber(parseFormattedNumber(row.siAmount)) || formatNumber(parseFormattedNumber(row.siAmount)) || ""}
                    readOnly={(row.groupId !== null && row.groupId !== "") || isFormDisabled}
                  />
                </td>

                

                {/* Applied */}
                <td className="global-tran-td-ui">
                    <input
                        type="text"
                        className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                        value={row.appliedAmount || ""}
                        disabled={isFormDisabled} 
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
                    disabled={isFormDisabled} 
                    value={row.bank || ""}
                    onChange={(e) => handleDetailChange(index, 'bank', e.target.value)}
                  />
                </td>


                
                {/* Check No */}
              <td className="global-tran-td-ui" hidden={handleFieldBehavior("hiddenDetailSingleCheck")}>
                  <input
                    type="text"
                    className="w-[100px] global-tran-td-inputclass-ui"
                    disabled={isFormDisabled} 
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
                      disabled={isFormDisabled} 
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
                    <td className="global-tran-td-ui text-center sticky right-0">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="global-tran-td-button-add-ui"
                          onClick={() => handleAddRow(index)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>

                        <button
                          type="button"
                          className="global-tran-td-button-delete-ui"
                          onClick={() => handleDeleteRow(index)}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      </div>
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
                  <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                    Actions
                  </th>
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
                            readOnly
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
                      readOnly
                      onChange={(e) => handleDetailChange(index, 'atcName', e.target.value)}
                    />
                  </td>




                  <td className="global-tran-td-ui text-right">             
                  <input
                      type="text"
                      className="w-[120px] global-tran-td-inputclass-ui text-right"
                      value={row.debit || ""}
                      disabled={isFormDisabled} 
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
                      disabled={isFormDisabled} 
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
                      disabled={isFormDisabled} 
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
                      disabled={isFormDisabled} 
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
                      disabled={isFormDisabled} 
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
                      disabled={isFormDisabled} 
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
                      maxLength={useGetFieldLength(tblFieldArray, "slref_no")}
                      disabled={isFormDisabled} 
                      onChange={(e) => handleDetailChangeGL(index, 'slRefNo', e.target.value)}
                    />
                  </td>
                  <td className="global-tran-td-ui">

                  <DateFormatInput
                    id={`slRefDate${index}`}
                    value={row.slRefDate || ""}
                    disabled={isFormDisabled}
                    className="w-[100px] global-tran-td-inputclass-ui text-center pr-7"
                    updateState={(updates) => {
                    if (updates[`slRefDate${index}`] !== undefined) { handleDetailChangeGL(index,"slRefDate", updates[`slRefDate${index}`], false,); }}}
                    />

                  </td>
                    <td className="global-tran-td-ui">
                    <input
                      type="text"
                      className="w-[100px] global-tran-td-inputclass-ui"
                      value={row.remarks || ""}
                      disabled={isFormDisabled}
                      maxLength={useGetFieldLength(tblFieldArray, "remarks")}  
                      onChange={(e) => handleDetailChangeGL(index, 'remarks', e.target.value)}
                    />
                </td>
                  
                 {!isFormDisabled && (
                  <td className="global-tran-td-ui text-center sticky right-0">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className="global-tran-td-button-add-ui"
                        onClick={() => handleAddRowGL(index)}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>

                      <button
                        type="button"
                        className="global-tran-td-button-delete-ui"
                        onClick={() => handleDeleteRowGL(index)}
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    </div>
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

          {/* Show base currency totals only when different from selected currency */}
          {glCurrDefault !== currCode && (
            <>
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
            </>
          )}

          {/* Totals in Forex Section */}
          {currRate !== 1 && (
            <div className="global-tran-tab-footer-total-main-div-ui">
              {/* Total Debit in Forex */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-label-ui">
                  Total Debit ({currCode}):
                </label>
                <label htmlFor="TotalDebitFx" className="global-tran-tab-footer-total-value-ui">
                  {totalDebitFx1}
                </label>
              </div>

              {/* Total Credit in Forex */}
              <div className="global-tran-tab-footer-total-div-ui">
                <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-label-ui">
                  Total Credit ({currCode}):
                </label>
                <label htmlFor="TotalCreditFx" className="global-tran-tab-footer-total-value-ui">
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
        customParam={custModalParams}
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
    isActive={topTab === "history"}
    endpoint="/getARHistory"
    cacheKey={`AR:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
    activeTabKey="AR_Summary"
    branchCode={state.branchCode}
    startDate={state.fromDate}
    endDate={state.toDate}
    status={(() => {
      const s = (state.status || "").toUpperCase();
      if (s === "FINALIZED") return "F";
      if (s === "CANCELLED") return "X";
      if (s === "CLOSED") return "C";
      if (s === "OPEN") return "";
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