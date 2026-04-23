import { useState, useEffect,useRef,useCallback } from "react";
import Swal from 'sweetalert2';
import { useNavigate,useLocation  } from "react-router-dom";

// UI
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faPlus, faMinus, faTrashAlt, faFolderOpen, faSpinner,faSearch } from "@fortawesome/free-solid-svg-icons";

// Lookup/Modal
import BranchLookupModal from "../../../Lookup/SearchBranchRef";
import CurrLookupModal from "../../../Lookup/SearchCurrRef.jsx";
import CustomerMastLookupModal from "../../../Lookup/SearchCustMast";
import RCLookupModal from "../../../Lookup/SearchRCMast.jsx";
import ItemMastLookupModal from "../../../Lookup/SearchItemMast.jsx";
import BillTermLookupModal from "../../../Lookup/SearchBillTermRef.jsx";
import SearchSalesRepRef from "../../../Lookup/SearchSalesRepRef.jsx";
import CancelTranModal from "../../../Lookup/SearchCancelRef.jsx";
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";
import AllTranHistory from "../../../Lookup/SearchGlobalTranHistory.jsx";
import AllTranDocNo from "../../../Lookup/SearchDocNo.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

// Configuration
import { postRequest} from '../../../Configuration/BaseURL.jsx'
import { useReset } from "../../../Components/ResetContext";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  docTypes,
  docTypeVideoGuide,
  docTypePDFGuide,
} from '@/NAYSA Cloud/Global/doctype';


import {
  useTopBillTermRow,
  useTopForexRate,
  useTopCurrencyRow,
  useTopSalesRepRow,
} from '@/NAYSA Cloud/Global/top1RefTable';

import {
  useTransactionUpsert,
  useFetchTranData,
  useHandleCancel,
  useFieldLenghtCheck,
  useGetFieldLength,
} from '@/NAYSA Cloud/Global/procedure';

import {
  useGetCurrentDayV2,
  useformatToDatev2
} from '@/NAYSA Cloud/Global/dates';

import DateFormatInput from '@/NAYSA Cloud/Global/DateFormatInput.jsx';


import {
  useHandlePrint,
} from '@/NAYSA Cloud/Global/report';


import { 
  formatNumber,
  parseFormattedNumber,
  useSwalConfirmAlert,
  useSwalvalidateRequiredFields,
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert,
  useSwalErrorAlert
} from '@/NAYSA Cloud/Global/behavior.jsx';


import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


// Header
import Header from '@/NAYSA Cloud/Components/Header';
const SO = () => {

  // View Document Const
  const loadedFromUrlRef = useRef(false);
  const customerPoNoRef = useRef("");
  const deliveryDateRef = useRef("");
  const suppressDeliveryDatePromptRef = useRef(true);
  const salesRepRef = useRef({ code: "", name: "" });
  const navigate = useNavigate();
  const location = useLocation(); 
  const { companyInfo, currentUserRow,getAllDropDown,refsLoaded,getAllTopHSDocRow } = useAuth();
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
  const docType = docTypes.SO; 
  const hsDoc = getAllTopHSDocRow(docType);
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = hsDoc.docName + ' Transaction';

  const [state, setState] = useState({
    // Document information
    documentName: hsDoc?.docName||"",
    documentSeries: hsDoc?.docSeries||"Auto",
    documentDocLen: hsDoc?.docLength||8,
    documentID: null,
    documentDate:useGetCurrentDayV2(),   
    documentNo: "",
    documentStatus:"O",
    status: "OPEN",
    noReprints:"0",


    // UI state
    activeTab: "basic",
    isLoading: false,
    showSpinner: false,
    isDocNoDisabled: false,
    isSaveDisabled: false,
    isResetDisabled: false,
    isFetchDisabled: false,



    branchCode: currentUserRow?.branchCode||"",
    branchName: currentUserRow?.branchName||"",
    
    // Customer information
    billToCustCode: "",
    billToCustName: "",
    billToAddress: "",
    shipToCode: "",
    shipToName: "",
    shipToAddress: "",
    contactPerson: "",
    customerPoNo: "",
    customerPoDate: null,
    deliveryDate: null,
    rcCode: "",
    rcName: "",
    salesRepCode: "",
    salesRepName: "",
    
    // Currency information
    currCode: companyInfo?.currCode||"",
    currName: companyInfo?.currName||"",
    currRate: formatNumber(companyInfo?.currRate||1,6),
    defaultCurrRate:formatNumber(companyInfo?.currRate||1,6),


    //Other Header Info
    tblFieldArray :[],
    soStatus: "O",
    salesType: "",
    salesTypeOptions: [],
    soStatusOptions: [],
    refDocNo1: "",
    refDocNo2: "",
    remarks: "",
    billtermCode: "",
    billtermName: "",
    userCode: currentUserRow?.userCode||"", 

    //Detail 1-2
    detailRows  :[],

 
    // Modal states
    modalContext: '',
    selectionContext: '',
    selectedRowIndex: null,
    insertAfterIndex: null,
    showRcModal:false,
    showBilltermModal:false,
    showItemModal:false,
    showSalesRepModal:false,

    currencyModalOpen:false,
    branchModalOpen:false,
    custModalOpen:false,
    billtermModalOpen:false,
    showCancelModal:false,
    showAttachModal:false,
    showSignatoryModal:false,
    showAllTranDocNo:false
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
  isLoading,
  showSpinner,

  // UI states / disable flags
  isDocNoDisabled,
  isSaveDisabled,
  isResetDisabled,
  isFetchDisabled,
  defaultCurrRate,


  // Transaction Header
  branchCode,
  branchName,
  billToCustCode,
  billToCustName,
  billToAddress,
  shipToCode,
  shipToName,
  shipToAddress,
  contactPerson,
  customerPoNo,
  customerPoDate,
  deliveryDate,
  rcCode,
  rcName,
  salesRepCode,
  salesRepName,
  currCode,
  currName,
  currRate,
  salesType,
  salesTypeOptions,
  soStatus,
  soStatusOptions,
  refDocNo1,
  refDocNo2,
  remarks,
  billtermCode,
  billtermName,


  // Transaction details
  tblFieldArray,
  detailRows,


  // Contexts
  modalContext,
  selectionContext,
  selectedRowIndex,
  insertAfterIndex,

  // Modals
  showRcModal,
  showItemModal,
  showSalesRepModal,
  currencyModalOpen,
  branchModalOpen,
  custModalOpen,
  billtermModalOpen,
  showCancelModal,
  showAttachModal,
  showSignatoryModal,
  showAllTranDocNo

} = state;

  const custCode = billToCustCode;
  const custName = billToCustName;
  const attention = contactPerson;


 
 


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
  const isHeaderSoStatusEditable = !!String(documentID || "").trim() && !isFormDisabled;
  const totalDrQuantity = detailRows.reduce(
    (total, row) => total + (parseFormattedNumber(row.drQuantity || 0) || 0),
    0
  );
  const filteredHeaderSoStatusOptions =
    totalDrQuantity > 0
      ? soStatusOptions.filter((option) => ["O", "C"].includes(option.DROPDOWN_CODE))
      : soStatusOptions;

  

  //Variables
  const [totals, setTotals] = useState({
  totalGrossAmount: '0.00',
  totalDiscountAmount: '0.00',
  totalNetAmount: '0.00',
  });
  const glCurrDefault = companyInfo?.currCode || "";
  const sellingPriceDecimals = Number(companyInfo?.item_decsellprice ?? 2);
  const quantityDecimals = Number(companyInfo?.itemDescQtyFG ?? 2);
  const isSellingPriceAndDiscountEditable = true;
  const discountLevel = 8// Math.min(Math.max(Number(companyInfo?.discountLevel ?? 8), 1), 8);
  const showTotalDiscountColumn = discountLevel > 1;
  const visibleDiscountRateFields = Array.from(
    { length: discountLevel },
    (_, index) => `discRate${index + 1}`
  );
  const visibleDiscountAmountFields = Array.from(
    { length: discountLevel },
    (_, index) => `discAmount${index + 1}`
  );
  const SO_PRICE_MATRIX_ENDPOINT = "getPriceMatrixItemPrice";
  const SO_ALLOW_DUPLICATE_ITEMS = false;
  




  const updateTotalsDisplay = (grossAmt, discAmt, netDisc) => {
    setTotals({
          totalGrossAmount: formatNumber(grossAmt),
          totalDiscountAmount: formatNumber(discAmt),
          totalNetAmount: formatNumber(netDisc),
      });
  };

  const combineAddressLines = (...lines) =>
    lines
      .map((line) => String(line || "").trim())
      .filter(Boolean)
      .join(" ");

  const formatFetchedHeaderDate = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [month, day, year] = raw.split("/").map(Number);
      const isValidMonth = month >= 1 && month <= 12;
      const isValidDay = day >= 1 && day <= 31;
      const isValidYear = year >= 1900 && year <= 2999;

      if (isValidMonth && isValidDay && isValidYear) {
        return raw;
      }
    }

    if (/^(19|20)\d{2}-\d{2}-\d{2}(T.*)?$/.test(raw)) {
      return useformatToDatev2(raw);
    }

    const digits = raw.replace(/\D/g, "");

    if (digits.length === 8) {
      const first4 = digits.slice(0, 4);
      const middle2 = digits.slice(4, 6);
      const last2 = digits.slice(6, 8);

      if (/^(19|20)\d{2}$/.test(first4)) {
        return `${middle2}/${last2}/${first4}`;
      }

      const month = digits.slice(0, 2);
      const day = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      return `${month}/${day}/${year}`;
    }

    return "";
  };

  const applyHeaderValueToDetailRows = (detailField, detailValue) => {
    const updatedRows = detailRows.map((row) => ({
      ...row,
      [detailField]: detailValue,
    }));

    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  };

  const confirmApplyHeaderValueToDetails = async ({
    headerLabel,
    detailField,
    detailValue,
  }) => {
    if ((detailRows?.length || 0) === 0) {
      return false;
    }

    const result = await useSwalConfirmAlert(
      `Apply ${headerLabel} changes?`,
      `SO Detail already has record(s).\nDo you want to apply the updated ${headerLabel} to all SO Detail rows?`,
      "Yes"
    );

    if (result?.isConfirmed) {
      applyHeaderValueToDetailRows(detailField, detailValue);
      return true;
    }

    return false;
  };

  const handleHeaderCustomerPoBlur = async () => {
    const currentValue = customerPoNo || "";
    const currentPoDate = String(customerPoDate || "").trim();

    if (currentValue && !currentPoDate) {
      updateState({
        customerPoDate: documentDate || useGetCurrentDayV2(),
      });
    }

    if (currentValue !== customerPoNoRef.current) {
      await confirmApplyHeaderValueToDetails({
        headerLabel: "Customer PO No.",
        detailField: "customerPoNo",
        detailValue: currentValue,
      });
      customerPoNoRef.current = currentValue;
    }
  };

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
  }, [billToCustCode]);

  useEffect(() => {
    if (suppressDeliveryDatePromptRef.current) {
      suppressDeliveryDatePromptRef.current = false;
      deliveryDateRef.current = deliveryDate || "";
      return;
    }

    const currentValue = deliveryDate || "";

    if (currentValue === deliveryDateRef.current) {
      return;
    }

    const isCompleteOrCleared =
      currentValue === "" || /^\d{2}\/\d{2}\/\d{4}$/.test(currentValue);

    if (!isCompleteOrCleared) {
      return;
    }

    const run = async () => {
      await confirmApplyHeaderValueToDetails({
        headerLabel: "Delivery Date",
        detailField: "delDate",
        detailValue: currentValue,
      });
      deliveryDateRef.current = currentValue;
    };

    run();
  }, [deliveryDate]);

 
  useEffect(() => {
    if (billToCustName?.currCode && detailRows.length > 0) {
      const updatedRows = detailRows.map(row => ({
        ...row,
        currency: billToCustName.currCode
      }));
       updateState({ detailRows: updatedRows });
    }
  }, [billToCustName?.currCode]);


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


useEffect(() => {
    if (!refsLoaded) return; 
    const filteredTypes = getAllDropDown("SOTRAN_TYPE", docType) || [];
    const defaultSoType =
      filteredTypes.find((type) => type.DROPDOWN_CODE === "SO01")?.DROPDOWN_CODE ||
      filteredTypes[0]?.DROPDOWN_CODE ||
      "";
    const mapHeaderSoStatus = (value) => {
      const normalizedValue = String(value || "").toUpperCase();
      if (normalizedValue === "OPEN" || normalizedValue === "O") return "O";
      if (normalizedValue === "CANCELLED" || normalizedValue === "X") return "X";
      if (normalizedValue === "CLOSED" || normalizedValue === "C") return "C";
      return "O";
    };

    updateState({
      salesTypeOptions: filteredTypes,
      salesType: defaultSoType,
      soStatusOptions: [
        { DROPDOWN_CODE: "O", DROPDOWN_NAME: "Open" },
        { DROPDOWN_CODE: "X", DROPDOWN_NAME: "Cancelled" },
        { DROPDOWN_CODE: "C", DROPDOWN_NAME: "Closed" },
      ],
      soStatus: mapHeaderSoStatus(state.soStatus),
    });
}, [docType, refsLoaded]);


  
  const handleReset = () => {
      const filteredTypes = getAllDropDown("SOTRAN_TYPE", docType) || [];
      const defaultSoType =
        filteredTypes.find((type) => type.DROPDOWN_CODE === "SO01")?.DROPDOWN_CODE ||
        filteredTypes[0]?.DROPDOWN_CODE ||
        "";

      customerPoNoRef.current = "";
      deliveryDateRef.current = "";
      suppressDeliveryDatePromptRef.current = true;
      salesRepRef.current = { code: "", name: "" };

   
      updateState({
        
      branchCode: currentUserRow?.branchCode||"",
      branchName: currentUserRow?.branchName||"",
      userCode:currentUserRow?.userCode||"",
      documentDate:useGetCurrentDayV2(),
      currCode:companyInfo?.currCode||"",
      glCurrDefault:companyInfo?.currCode||"",
      currName:companyInfo?.currName||"",
      currRate:formatNumber(companyInfo?.currRate||1,6) ,
      refDocNo1: "",
      refDocNo2:"",
      remarks:"",
      billtermCode:"",
      billtermName:"",
      noReprints:"0",

      billToCustCode:"",
      billToCustName:"",
      billToAddress:"",
      shipToCode:"",
      shipToName:"",
      shipToAddress:"",
      contactPerson:"",
      customerPoNo:"",
      customerPoDate:null,
      deliveryDate:null,
      rcCode:"",
      rcName:"",
      salesRepCode:"",
      salesRepName:"",
      documentNo: "",
      documentID: "",
      detailRows: [],
      documentStatus:"O",
      salesType: defaultSoType,
      soStatus:"O",
      
      
      // UI state
      activeTab: "basic",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status:"Open"

    });

      updateTotalsDisplay(0, 0, 0, 0)
  };

   


  
      
    const loadCompanyData = async () => {
        updateState({ isLoading: true });
      
        try {
          const hdtblcol_result = await useFieldLenghtCheck(
            "svi_hd,svi_dt1,svi_dt2"
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
      

const fetchTranData = async (documentNo, branchCode,direction='') => {
  const resetState = () => {
    updateState({documentNo:'', documentID: '', isDocNoDisabled: false, isFetchDisabled: false });
    updateTotals([]);
  };

  updateState({ isLoading: true });

  try {
    const data = await useFetchTranData(documentNo, branchCode,docType,"soNo",direction);


    if (!data?.soId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      soQuantity: formatNumber(item.soQuantity??0),
      sellingPrice: formatNumber(item.sellingPrice??0),
      grossAmount: formatNumber(item.grossAmount),
      discRate1: formatNumber(item.discRate1 ?? 0),
      discRate2: formatNumber(item.discRate2 ?? 0),
      discRate3: formatNumber(item.discRate3 ?? 0),
      discRate4: formatNumber(item.discRate4 ?? 0),
      discRate5: formatNumber(item.discRate5 ?? 0),
      discRate6: formatNumber(item.discRate6 ?? 0),
      discRate7: formatNumber(item.discRate7 ?? 0),
      discRate8: formatNumber(item.discRate8 ?? 0),
      discAmount1: formatNumber(item.discAmount1 ?? 0),
      discAmount2: formatNumber(item.discAmount2 ?? 0),
      discAmount3: formatNumber(item.discAmount3 ?? 0),
      discAmount4: formatNumber(item.discAmount4 ?? 0),
      discAmount5: formatNumber(item.discAmount5 ?? 0),
      discAmount6: formatNumber(item.discAmount6 ?? 0),
      discAmount7: formatNumber(item.discAmount7 ?? 0),
      discAmount8: formatNumber(item.discAmount8 ?? 0),
      totDiscount: formatNumber(item.totDiscount ?? 0),
      netAmount: formatNumber(item.netAmount ?? 0),
      drQuantity: formatNumber(item.drQuantity ?? 0, quantityDecimals),
      siQuantity: formatNumber(item.siQuantity ?? 0, quantityDecimals),
      delDate: useformatToDatev2(item.delDate),
    }));

    updateState({
      documentStatus: data.soStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.soId,
      documentNo: data.soNo,
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.soDate),
      salesType: data.soTranType,
      billToCustCode: data.custCode,
      billToCustName: data.custName,
      billToAddress: data.addr,
      contactPerson:data.attention,
      shipToCode: data.shipToCode,
      shipToName: data.shipToName,
      shipToAddress:data.shipToAddr,
      refDocNo1: data.refDocNo1,
      refDocNo2: data.refDocNo2,
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      remarks: data.remarks,
      billtermCode: data.billtermCode,
      billtermName: data.billtermName,
      customerPoNo: data.customerPoNo ||  "",
      customerPoDate: useformatToDatev2(data.customerPoDate),
      deliveryDate: useformatToDatev2(data.deliveryDate),
      rcCode: data.rcCode || "",
      rcName: data.rcName || "",
      salesRepCode: data.salesRepCode || "",
      salesRepName: data.salesRepName || "",
      soStatus:
        String(data.soStatus || "O").toUpperCase() === "OPEN"
          ? "O"
          : String(data.soStatus || "O").toUpperCase() === "CANCELLED"
          ? "X"
          : String(data.soStatus || "O").toUpperCase() === "CLOSED"
          ? "C"
          : String(data.soStatus ||  "O"),
      detailRows: retrievedDetailRows,
      isDocNoDisabled: true,
      isFetchDisabled: true,
    });

    customerPoNoRef.current = data.customerPoNo ||"";
    deliveryDateRef.current = formatFetchedHeaderDate(data.deliveryDate) || "";
    suppressDeliveryDatePromptRef.current = true;
    salesRepRef.current = {
      code: data.salesRepCode || "",
      name: data.salesRepName || "",
    };

   
    updateTotals(retrievedDetailRows);

  } catch (error) {
    console.error("Error fetching transaction data:", error);
    Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message });
    resetState();
  } finally {
    updateState({ isLoading: false });
  }
};


const handlesoNoBlur = () => {

    if (!state.documentID && state.documentNo && state.branchCode) { 
        fetchTranData(state.documentNo,state.branchCode);
    }
};




const handleCurrRateNoBlur = (e) => {
  
  const num = formatNumber(e.target.value, 6);
  updateState({ 
        currRate: isNaN(num) ? "0.000000" : num
        })

};






const moveFocusBeforeSave = async () => {
  document.activeElement?.blur?.();
  return true;
};





const handleActivityOption = async (action) => {
   if ((detailRows?.length || 0) === 0) {
    return;
  }



  if (action === "Upsert") {
   await moveFocusBeforeSave();
  }


  
  if (documentStatus === "O") {
    updateState({ isLoading: true });


    try {
        const {
        branchCode,
        documentNo,
        documentID,
        billtermCode,
        billToCustCode,
        billToCustName,
        billToAddress,
        shipToCode,
        shipToName,
        shipToAddress,
        refDocNo1,
        refDocNo2,
        currCode,
        currRate,
        remarks,
        userCode,
        contactPerson,
        customerPoNo,
        customerPoDate,
        deliveryDate,
        rcCode,
        salesRepCode,
        salesRepName,
        salesType,
        soStatus,
        detailRows,
      } = state;

      const buildSoData = () => ({
        branchCode: branchCode,
        soNo: documentNo || "",
        soId: documentID || "",
        soDate: documentDate,
        sotranType: salesType,
        billtermCode: billtermCode,
        custCode: billToCustCode,
        custName: billToCustName,
        billToAddress,
        shipToCode,
        shipToName,
        shipToAddress,
        attention: contactPerson,
        refDocNo1: refDocNo1,
        refDocNo2: refDocNo2,
        currCode: currCode || "PHP",
        currRate: parseFormattedNumber(currRate),
        remarks: remarks || "",
        userCode: userCode,
        customerPoNo,
        customerPoDate,
        deliveryDate,
        rcCode,
        salesRepCode,
        salesRepName,
        soStatus,
        dt1: detailRows.map((row, index) => ({
          lnNo: String(index + 1),
          soStat: row.soStat || "O",
          itemCode: row.itemCode || "",
          itemName: row.itemName || "",
          itemSpecs: row.itemSpecs || "",
          uomCode: row.uomCode || "",
          pmType: row.pmType || "",
          groupId: row.groupId || "",
          pmId: row.pmId || "",
          soQuantity: parseFormattedNumber(row.soQuantity || 0),
          sellingPrice: parseFormattedNumber(row.sellingPrice || 0),
          grossAmount: parseFormattedNumber(row.grossAmount || 0),
          discRate1: parseFormattedNumber(row.discRate1 || 0),
          discRate2: parseFormattedNumber(row.discRate2 || 0),
          discRate3: parseFormattedNumber(row.discRate3 || 0),
          discRate4: parseFormattedNumber(row.discRate4 || 0),
          discRate5: parseFormattedNumber(row.discRate5 || 0),
          discRate6: parseFormattedNumber(row.discRate6 || 0),
          discRate7: parseFormattedNumber(row.discRate7 || 0),
          discRate8: parseFormattedNumber(row.discRate8 || 0),
          discAmount1: parseFormattedNumber(row.discAmount1 || 0),
          discAmount2: parseFormattedNumber(row.discAmount2 || 0),
          discAmount3: parseFormattedNumber(row.discAmount3 || 0),
          discAmount4: parseFormattedNumber(row.discAmount4 || 0),
          discAmount5: parseFormattedNumber(row.discAmount5 || 0),
          discAmount6: parseFormattedNumber(row.discAmount6 || 0),
          discAmount7: parseFormattedNumber(row.discAmount7 || 0),
          discAmount8: parseFormattedNumber(row.discAmount8 || 0),
          totDiscount: parseFormattedNumber(row.totDiscount || 0),
          netAmount: parseFormattedNumber(row.netAmount || 0),
          delDate: row.delDate || null,
          customerPoNo: row.customerPoNo || "",
          salesRepCode: row.salesRepCode || "",
          freeItem: row.freeItem || "",
          drQuantity: parseFormattedNumber(row.drQuantity || 0),
          siQuantity: parseFormattedNumber(row.siQuantity || 0),
        })),
        dt2: [],
      });

     

      if (action === "Upsert") {
        const response = await useTransactionUpsert(
          docType,
          buildSoData(),
          updateState,
          "soId",
          "soNo"
        );

        if (response) {
          const responseDocNo =  response.data[0].soNo;
          const responseDocId =  response.data[0].soId;

          await fetchTranData(responseDocNo,branchCode);

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);          
        }
        updateState({
          documentNo: response?.data?.[0]?.soNo || "",
          documentID: response?.data?.[0]?.soId || "",
          isDocNoDisabled: true,
          isFetchDisabled: true,
        });
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
    } finally {   
      updateState({ isLoading: false });
    }
  }
};





  const createSODetailRow = (overrides = {}) => ({
      lnNo: "",
      soStat: "O",
      itemCode: "",
      itemName: "",
      itemSpecs: "",
      uomCode: "",
      pmType: "",
      groupId: "",
      pmId: "",
      soQuantity: Number(0).toFixed(quantityDecimals),
      sellingPrice: Number(0).toFixed(sellingPriceDecimals),
      grossAmount: "0.00",
      discRate1: "0.00",
      discRate2: "0.00",
      discRate3: "0.00",
      discRate4: "0.00",
      discRate5: "0.00",
      discRate6: "0.00",
      discRate7: "0.00",
      discRate8: "0.00",
      discAmount1: "0.00",
      discAmount2: "0.00",
      discAmount3: "0.00",
      discAmount4: "0.00",
      discAmount5: "0.00",
      discAmount6: "0.00",
      discAmount7: "0.00",
      discAmount8: "0.00",
      totDiscount: "0.00",
      netAmount: "0.00",
      delDate: deliveryDate || "",
      customerPoNo: customerPoNo || "",
      salesRepCode: salesRepCode || "",
      freeItem: "",
      drQuantity: Number(0).toFixed(quantityDecimals),
      siQuantity: Number(0).toFixed(quantityDecimals),
      ...overrides,
    });

  const insertDetailRows = (rowsToInsert = [], insertIndex = null) => {
    if (!Array.isArray(rowsToInsert) || rowsToInsert.length === 0) {
      return;
    }

    const updatedRows = [...detailRows];
    const normalizedInsertRows = rowsToInsert.map((row) => createSODetailRow(row));

    if (insertIndex !== null && insertIndex >= 0) {
      updatedRows.splice(insertIndex + 1, 0, ...normalizedInsertRows);
    } else {
      updatedRows.push(...normalizedInsertRows);
    }

    const normalizedRows = updatedRows.map((row, index) => ({
      ...row,
      lnNo: String(index + 1),
    }));

    updateState({
      detailRows: normalizedRows,
    });
    updateTotals(normalizedRows);

    setTimeout(() => {
      const tableContainer = document.querySelector(".max-h-\\[430px\\]");
      if (!tableContainer) return;

      if (insertIndex === null || insertIndex >= detailRows.length - 1) {
        tableContainer.scrollTop = tableContainer.scrollHeight;
      }
    }, 100);
  };

  const handleInsertBlankRow = (insertIndex = null) => {
    insertDetailRows([createSODetailRow()], insertIndex);
  };

  const normalizeItemModalRecords = (selectedItems) => {
    if (Array.isArray(selectedItems?.records)) {
      return selectedItems.records;
    }
    if (selectedItems?.records) {
      return [selectedItems.records];
    }
    return selectedItems ? [selectedItems] : [];
  };

  const normalizeItemCode = (itemCode) => String(itemCode || "").trim().toUpperCase();

  const getFilteredDuplicateFreeItems = (records = [], currentRowIndex = null) => {
    if (SO_ALLOW_DUPLICATE_ITEMS) {
      return records;
    }

    const existingItemCodes = new Set(
      detailRows
        .filter((_, index) => index !== currentRowIndex)
        .map((row) => normalizeItemCode(row?.itemCode))
        .filter(Boolean)
    );

    const selectedItemCodes = new Set();
    const skippedItemCodes = [];

    const filteredRecords = records.filter((record) => {
      const itemCode = normalizeItemCode(record?.itemCode);
      if (!itemCode) {
        return true;
      }

      if (existingItemCodes.has(itemCode) || selectedItemCodes.has(itemCode)) {
        skippedItemCodes.push(itemCode);
        return false;
      }

      selectedItemCodes.add(itemCode);
      return true;
    });

    if (skippedItemCodes.length > 0) {
      useSwalErrorAlert(
        "Duplicate Item Not Allowed",
        `These item(s) already exist in SO Detail: ${[...new Set(skippedItemCodes)].join(", ")}`
      );
    }

    return filteredRecords;
  };

  const parsePriceMatrixResponse = (response) => {
    const directResult =
      response?.data?.[0]?.result ??
      response?.result ??
      response?.data?.result;

    if (typeof directResult === "string") {
      try {
        const parsed = JSON.parse(directResult);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Error parsing SO price matrix result:", error);
        return [];
      }
    }

    const rawData = response?.data ?? [];

    if (Array.isArray(rawData)) {
      return rawData;
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  };

  const fetchPriceMatrixRows = async (selectedRecords = []) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return [];
    }

    const payload = {
      json_data: {
        docDate: documentDate,
        custCode: billToCustCode || "",
        items: selectedRecords.map((item, index) => ({
          sequence: index + 1,
          itemCode: item?.itemCode || "",
        })),
      },
    };

    console.log( JSON.stringify(payload))

    try {
      updateState({ isLoading: true });
      const response = await postRequest(
        SO_PRICE_MATRIX_ENDPOINT,
        JSON.stringify(payload)
      );
      return parsePriceMatrixResponse(response);
    } catch (error) {
      console.error("Error fetching SO price matrix:", error);
      return [];
    } finally {
      updateState({ isLoading: false });
    }
  };




  const getPriceMatrixRowForItem = (priceMatrixRows = [], item = {}, index = 0) => {
    const itemCode = normalizeItemCode(item?.itemCode);
    const getMatrixItemCode = (priceRow) =>
      priceRow?.itemCode ??
      "";

    return (
      priceMatrixRows.find(
        (priceRow) => normalizeItemCode(getMatrixItemCode(priceRow)) === itemCode
      ) ||
      priceMatrixRows.find(
        (priceRow) => Number(priceRow?.sequence) === index + 1
      ) ||
      {}
    );
  };

  const calculateRowAmountsFromRates = (row) => {
    const discountRateFields = visibleDiscountRateFields;
    const discountAmountFields = visibleDiscountAmountFields;
    const roundTo2 = (num) => Number((Number(num) || 0).toFixed(2));
    const quantity = parseFormattedNumber(row.soQuantity || 0) || 0;
    const sellingPrice = parseFormattedNumber(row.sellingPrice || 0) || 0;
    const grossAmount = roundTo2(quantity * sellingPrice);
    let runningBase = grossAmount;
    let totalDiscount = 0;
    const updatedAmounts = {};

    discountRateFields.forEach((rateField, index) => {
      const amountField = discountAmountFields[index];
      const rateValue = parseFormattedNumber(row[rateField] || 0) || 0;
      const discountAmount = roundTo2(runningBase * (rateValue * 0.01));

      updatedAmounts[amountField] = formatNumber(discountAmount);
      totalDiscount += discountAmount;
      runningBase = roundTo2(runningBase - discountAmount);
    });

    return {
      ...row,
      grossAmount: formatNumber(grossAmount),
      ...updatedAmounts,
      totDiscount: formatNumber(totalDiscount),
      netAmount: formatNumber(roundTo2(grossAmount - totalDiscount)),
    };
  };



  const applyPriceMatrixToDetailRow = (baseRow, priceRow = {}) => {
    if (baseRow.freeItem === "Y") {
      return calculateRowAmountsFromRates({
        ...baseRow,
        sellingPrice: formatNumber(0, sellingPriceDecimals),
        ...Object.fromEntries(
          visibleDiscountRateFields.map((field) => [field, formatNumber(0)])
        ),
      });
    }

    const getPriceValue = () => priceRow?.sellingPrice ||0 
    const getPmTypeValue = () => priceRow?.pmType||"";
    const getPmIdValue = () =>   priceRow?.pmId ||"";
    const getDiscountRateValue = (discountNo) =>  priceRow?.[`discRate${discountNo}`] ||0;
    const updatedRow = {
      ...baseRow,
      pmType: getPmTypeValue() ?? baseRow.pmType ?? "",
      pmId: getPmIdValue() ?? baseRow.pmId ?? "",
      sellingPrice: formatNumber(
        getPriceValue() ?? baseRow.sellingPrice ?? 0,
        sellingPriceDecimals
      ),
    };

    visibleDiscountRateFields.forEach((field, index) => {
      updatedRow[field] = formatNumber(
        getDiscountRateValue(index + 1) ?? baseRow[field] ?? 0
      );
    });

    return calculateRowAmountsFromRates(updatedRow);
  };

  const mapItemRecordToDetailRow = (item = {}) => createSODetailRow({
    itemCode: item?.itemCode || "",
    itemName: item?.itemName || "",
    itemSpecs: item?.itemSpecs || "",
    uomCode: item?.uomCode || "",
    pmType: item?.pmType || "",
    groupId: "",
    pmId: item?.pmId || "",
    soQuantity: formatNumber(
      item?.soQuantity ?? item?.quantity ?? item?.soQty ?? 0,
      quantityDecimals
    ),
    sellingPrice: formatNumber(
      item?.sellingPrice ?? item?.unitPrice ?? 0,
      sellingPriceDecimals
    ),
    grossAmount: formatNumber(item?.grossAmount ?? 0),
    discRate1: formatNumber(item?.discRate1 ?? 0),
    discRate2: formatNumber(item?.discRate2 ?? 0),
    discRate3: formatNumber(item?.discRate3 ?? 0),
    discRate4: formatNumber(item?.discRate4 ?? 0),
    discRate5: formatNumber(item?.discRate5 ?? 0),
    discRate6: formatNumber(item?.discRate6 ?? 0),
    discRate7: formatNumber(item?.discRate7 ?? 0),
    discRate8: formatNumber(item?.discRate8 ?? 0),
    discAmount1: formatNumber(item?.discAmount1 ?? 0),
    discAmount2: formatNumber(item?.discAmount2 ?? 0),
    discAmount3: formatNumber(item?.discAmount3 ?? 0),
    discAmount4: formatNumber(item?.discAmount4 ?? 0),
    discAmount5: formatNumber(item?.discAmount5 ?? 0),
    discAmount6: formatNumber(item?.discAmount6 ?? 0),
    discAmount7: formatNumber(item?.discAmount7 ?? 0),
    discAmount8: formatNumber(item?.discAmount8 ?? 0),
    totDiscount: formatNumber(item?.totDiscount ?? 0),
    netAmount: formatNumber(item?.netAmount ?? 0),
    delDate: item?.delDate || deliveryDate || "",
    customerPoNo: item?.customerPoNo || customerPoNo || "",
    salesRepCode: item?.salesRepCode || item?.repCode || salesRepCode || "",
    freeItem: item?.freeItem || "",
    drQuantity: formatNumber(item?.drQuantity ?? 0, quantityDecimals),
    siQuantity: formatNumber(item?.siQuantity ?? 0, quantityDecimals),
  });

  const handleInsertSelectedItems = async (selectedRecords = []) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return;
    }

    const priceMatrixRows = await fetchPriceMatrixRows(selectedRecords);
    const rowsToInsert = selectedRecords.map((item, index) => {
      const baseRow = mapItemRecordToDetailRow(item);
      const priceRow = getPriceMatrixRowForItem(priceMatrixRows, item, index);
      return applyPriceMatrixToDetailRow(baseRow, priceRow);
    });

    insertDetailRows(rowsToInsert, insertAfterIndex);
  };




const handleDeleteRow = async (index) => {
    const updatedRows = [...detailRows];
    updatedRows.splice(index, 1);

    updateState({
        detailRows: updatedRows });
    updateTotals(updatedRows);

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

  const handleOpenAddItemModal = () => {
    const fieldsToCheck = {
      "Header : Bill To Customer Code": billToCustCode,
      "Header : Ship To Customer Code": shipToCode,
      "Header : Billing Term": billtermCode,
      "Header : Sales Rep": salesRepCode,
    };

    const isValid = useSwalvalidateRequiredFields(fieldsToCheck, "Add Item");
    if (!isValid) return;

    updateState({
      showItemModal: true,
      selectionContext: "multiAdd",
      selectedRowIndex: null,
      insertAfterIndex: null,
    });
  };











const handleCancel = async () => {
 if (!detailRows || detailRows.length === 0) {
      return;
      }


  if (documentID && (documentStatus === 'O')) {
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

  if (documentID) {
    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "O",
      status: "OPEN",
      documentDate: useGetCurrentDayV2(),
      noReprints: "0",
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
  const docNo = params.get("soNo");
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





  

const handleTranDocNoRetrieval = async (data) => {

    await fetchTranData(data.docNo, branchCode, data.key);
    updateState({showAllTranDocNo: data.modalClose});
};




const handleTranDocNoSelection = async (data) => {
    
    handleReset();
    updateState({showAllTranDocNo: false, documentNo:data.docNo });
};




const handleCloseCancel = async (confirmation) => {
    if(confirmation && documentStatus !== "O" && documentID !== null ) {

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




  const handleCloseCustModal = async (selectedData) => {
    if (!selectedData) {
        updateState({ custModalOpen: false });
        return;
    }

    updateState({ custModalOpen: false });
    updateState({ isLoading: true });

    try {
        const address = selectedData?.addr ||  "";
        const custDetails = {
            custCode: selectedData?.custCode || '',
            custName: selectedData?.custName || '',
            currCode: selectedData?.currCode || '',
            attention: selectedData?.attention || '',
            billtermCode: selectedData?.billtermCode || '',
            billtermName: selectedData?.billtermName || '',
            salesRepCode: selectedData?.salesRepCode || '',
            salesRepName: selectedData?.salesRepName || ''
        };
        const isShipTo = modalContext === "shipTo";
        const shouldSyncShipTo = !isShipTo && !String(shipToCode || "").trim();
        const shouldSyncBillTo = isShipTo && !String(billToCustCode || "").trim();
        updateState(
          isShipTo
            ? {
                shipToName: selectedData.custName,
                shipToCode: selectedData.custCode,
                shipToAddress: address,
                ...(shouldSyncBillTo
                  ? {
                      billToCustName: selectedData.custName,
                      billToCustCode: selectedData.custCode,
                      billToAddress: address,
                    }
                  : {}),
                custModalOpen: false,
                modalContext: "",
              }
            : {
                billToCustName: selectedData.custName,
                billToCustCode: selectedData.custCode,
                billToAddress: address,
                ...(shouldSyncShipTo
                  ? {
                      shipToName: selectedData.custName,
                      shipToCode: selectedData.custCode,
                      shipToAddress: address,
                    }
                  : {}),
                custModalOpen: false,
                modalContext: "",
              }
        );
        
        if (!selectedData.currCode || (!isShipTo && !custDetails.salesRepCode)) {
            const payload = { CUST_CODE: selectedData.custCode };
            const response = await postRequest("getCustomer", JSON.stringify(payload));

            if (response.success) {
                const customerRow = JSON.parse(response.data[0].result)?.[0] || {};
                custDetails.currCode = customerRow?.currCode || custDetails.currCode;
                custDetails.attention = customerRow?.custContact || custDetails.attention;
                custDetails.billtermCode = customerRow?.billtermCode || custDetails.billtermCode;
                custDetails.billtermName = customerRow?.billtermName || custDetails.billtermName;
                if (!isShipTo) {
                  custDetails.salesRepCode =
                    customerRow?.salesRepCode ||  custDetails.salesRepCode;
                }
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }
        }

        if (!isShipTo && custDetails.salesRepCode) {
            const salesRepRow = await useTopSalesRepRow(custDetails.salesRepCode);
            custDetails.salesRepName =
              salesRepRow?.salesRepName || custDetails.salesRepName;
        }

        await Promise.all([
            handleSelectCurrency(custDetails.currCode),
            handleSelectBillTerm(custDetails.billtermCode),
            updateState({
              contactPerson: custDetails.attention,
              ...(!isShipTo
                ? {
                    salesRepCode: custDetails.salesRepCode,
                    salesRepName: custDetails.salesRepName,
                  }
                : {}),
            })
        ]);

        if (!isShipTo && custDetails.salesRepCode !== salesRepRef.current.code) {
            await confirmApplyHeaderValueToDetails({
              headerLabel: "Sales Rep",
              detailField: "salesRepCode",
              detailValue: custDetails.salesRepCode,
            });
        }

        if (!isShipTo) {
            salesRepRef.current = {
              code: custDetails.salesRepCode,
              name: custDetails.salesRepName,
            };
        }

    } catch (error) {
        console.error("Error fetching customer details:", error);
    } finally {
       updateState({ isLoading: false });
    }
};



  const updateTotals = (rows) => {
  let totalNetAmount = 0;
  let totalGrossAmt =0;
  let totalDiscAmt=0;

  rows.forEach(row => {
    const invoiceGross = parseFormattedNumber(row.grossAmount || 0) || 0;
    const invoiceNetAmount = parseFormattedNumber(row.netAmount || 0) || 0;
    const invoiceDiscount = parseFormattedNumber(row.totDiscount || 0) || 0;

    totalGrossAmt+= invoiceGross;
    totalDiscAmt+= invoiceDiscount;
    totalNetAmount+= invoiceNetAmount;
  });
    updateTotalsDisplay(totalGrossAmt, totalDiscAmt, totalNetAmount);

};




const handleCloseRcModal = async (selectedRc) => {
  if (modalContext === "headerRc" && selectedRc) {
    updateState({
      rcCode: selectedRc.rcCode || "",
      rcName: selectedRc.rcName || "",
      showRcModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });
    return;
  }

  updateState({
    showRcModal: false,
    selectedRowIndex: null,
    modalContext: "",
  });
};

const handleCloseSalesRepModal = (selectedSalesRep) => {
  if (modalContext === "headerSalesRep" && selectedSalesRep) {
    const nextSalesRepCode = selectedSalesRep.salesRepCode || "";
    const nextSalesRepName = selectedSalesRep.salesRepName || "";

    updateState({
      salesRepCode: nextSalesRepCode,
      salesRepName: nextSalesRepName,
      showSalesRepModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });

    if (nextSalesRepCode !== salesRepRef.current.code) {
      confirmApplyHeaderValueToDetails({
        headerLabel: "Sales Rep",
        detailField: "salesRepCode",
        detailValue: nextSalesRepCode,
      });
    }

    salesRepRef.current = {
      code: nextSalesRepCode,
      name: nextSalesRepName,
    };
    return;
  }

  if (modalContext === "detailSalesRep" && selectedRowIndex !== null && selectedSalesRep) {
    const updatedRows = [...detailRows];
    updatedRows[selectedRowIndex] = {
      ...updatedRows[selectedRowIndex],
      salesRepCode: selectedSalesRep.salesRepCode || "",
    };

    updateState({
      detailRows: updatedRows,
      showSalesRepModal: false,
      selectedRowIndex: null,
      modalContext: "",
    });
    return;
  }

  updateState({
    showSalesRepModal: false,
    selectedRowIndex: null,
    modalContext: "",
  });
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
      }
    }
  };




const handleCloseBillTermModal = async (selectedBillTerm) => {
    if (selectedBillTerm) {
    handleSelectBillTerm(selectedBillTerm.billtermCode);
  };
    updateState({ billtermModalOpen: false });
}


const handleCloseItemModal = async (selectedItems) => {
  const records = normalizeItemModalRecords(selectedItems);

  if (selectionContext === "rowItemLookup" && selectedRowIndex !== null && records.length > 0) {
    const [selectedItem] = getFilteredDuplicateFreeItems(records, selectedRowIndex);
    if (!selectedItem) {
      updateState({
        showItemModal: false,
        selectedRowIndex: null,
        insertAfterIndex: null,
        selectionContext: "",
      });
      return;
    }
    const priceMatrixRows = await fetchPriceMatrixRows([selectedItem]);
    const updatedRows = [...detailRows];
    const baseRow = {
      ...updatedRows[selectedRowIndex],
      itemCode: selectedItem?.itemCode || "",
      itemName: selectedItem?.itemName || "",
      itemSpecs: selectedItem?.itemSpecs || updatedRows[selectedRowIndex]?.itemSpecs || "",
      uomCode: selectedItem?.uomCode || "",
      pmType: selectedItem?.pmType || updatedRows[selectedRowIndex]?.pmType || "",
      groupId: updatedRows[selectedRowIndex]?.groupId || "",
      pmId: selectedItem?.pmId || updatedRows[selectedRowIndex]?.pmId || "",
    };
    const priceRow = getPriceMatrixRowForItem(priceMatrixRows, selectedItem);
    updatedRows[selectedRowIndex] = applyPriceMatrixToDetailRow(baseRow, priceRow);
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
  }

  if (selectionContext === "multiAdd" && records.length > 0) {
    const filteredRecords = getFilteredDuplicateFreeItems(records);
    if (filteredRecords.length > 0) {
      await handleInsertSelectedItems(filteredRecords);
    }
  }

  updateState({
    showItemModal: false,
    selectedRowIndex: null,
    insertAfterIndex: null,
    selectionContext: "",
  });
};



const handleSelectBillTerm = async (billtermCode) => {
    if (billtermCode) {

     const result = await useTopBillTermRow(billtermCode);
      if (result) {
      updateState({
        billtermCode:result.billtermCode,
        billtermName:result.billtermName,
        daysDue: result.daysDue 
        })     
      }
    }
  };





const handleSODetailRowChange = (index, field, value) => {
  const discountRateFields = [
    "discRate1",
    "discRate2",
    "discRate3",
    "discRate4",
    "discRate5",
    "discRate6",
    "discRate7",
    "discRate8",
  ];
  const discountAmountFields = [
    "discAmount1",
    "discAmount2",
    "discAmount3",
    "discAmount4",
    "discAmount5",
    "discAmount6",
    "discAmount7",
    "discAmount8",
  ];
  const calculationTriggerFields = [
    "soQuantity",
    "sellingPrice",
    ...discountRateFields,
    ...discountAmountFields,
  ];
  const roundTo2 = (num) => Number((Number(num) || 0).toFixed(2));
  const zeroValueByField = (targetField) => {
    if (targetField === "sellingPrice") {
      return formatNumber(0, sellingPriceDecimals);
    }

    if (targetField === "soQuantity" || targetField === "drQuantity" || targetField === "siQuantity") {
      return formatNumber(0, quantityDecimals);
    }

    return formatNumber(0);
  };

  const buildFreeItemRow = (row, isFree) => {
    if (!isFree) {
      return {
        ...row,
        freeItem: "",
      };
    }

    const zeroedRow = {
      ...row,
      freeItem: "Y",
      sellingPrice: formatNumber(0, sellingPriceDecimals),
      grossAmount: formatNumber(0),
      totDiscount: formatNumber(0),
      netAmount: formatNumber(0),
    };

    discountRateFields.forEach((discountField) => {
      zeroedRow[discountField] = formatNumber(0);
    });

    discountAmountFields.forEach((discountField) => {
      zeroedRow[discountField] = formatNumber(0);
    });

    return zeroedRow;
  };

  const recalculateSODetailRow = (row, changedField) => {
    const quantity = parseFormattedNumber(row.soQuantity || 0) || 0;
    const sellingPrice = parseFormattedNumber(row.sellingPrice || 0) || 0;
    const grossAmount = roundTo2(quantity * sellingPrice);

    let runningBase = grossAmount;
    let totalDiscount = 0;
    const updatedDiscountAmounts = {};
    const updatedDiscountRates = {};

    if (discountAmountFields.includes(changedField)) {
      discountAmountFields.forEach((amountField, index) => {
        const discountNo = index + 1;
        const rateField = `discRate${discountNo}`;
        const discountAmount = roundTo2(parseFormattedNumber(row[amountField] || 0));
        const discountRate =
          runningBase !== 0 ? roundTo2((discountAmount / runningBase) * 100) : 0;

        updatedDiscountAmounts[amountField] =
          amountField === changedField ? row[amountField] : formatNumber(discountAmount);
        updatedDiscountRates[rateField] = formatNumber(discountRate);
        totalDiscount += discountAmount;
        runningBase = roundTo2(runningBase - discountAmount);
      });
    } else {
      discountRateFields.forEach((rateField, index) => {
        const discountNo = index + 1;
        const amountField = `discAmount${discountNo}`;
        const rateValue = parseFormattedNumber(row[rateField] || 0) || 0;
        const discountAmount = roundTo2(runningBase * (rateValue * 0.01));

        updatedDiscountRates[rateField] =
          rateField === changedField ? row[rateField] : formatNumber(rateValue);
        updatedDiscountAmounts[amountField] = formatNumber(discountAmount);
        totalDiscount += discountAmount;
        runningBase = roundTo2(runningBase - discountAmount);
      });
    }

    const netAmount = roundTo2(grossAmount - totalDiscount);

    return {
      ...row,
      grossAmount: formatNumber(grossAmount),
      ...updatedDiscountRates,
      ...updatedDiscountAmounts,
      totDiscount: formatNumber(totalDiscount),
      netAmount: formatNumber(netAmount),
    };
  };

  const updatedRows = [...detailRows];
  let updatedRow = {
    ...updatedRows[index],
    [field]: value,
  };

  if (field === "freeItem") {
    updatedRow = buildFreeItemRow(updatedRow, value === "Y");
    updatedRows[index] = updatedRow;
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
    return;
  }

  if (
    updatedRows[index]?.freeItem === "Y" &&
    ["sellingPrice", ...discountRateFields, ...discountAmountFields].includes(field)
  ) {
    updatedRow = {
      ...updatedRows[index],
      [field]: zeroValueByField(field),
    };
    updatedRows[index] = buildFreeItemRow(updatedRow, true);
    updateState({ detailRows: updatedRows });
    updateTotals(updatedRows);
    return;
  }

  if (calculationTriggerFields.includes(field)) {
    updatedRow = recalculateSODetailRow(updatedRow, field);
  }

  updatedRows[index] = updatedRow;

  updateState({ detailRows: updatedRows });
  updateTotals(updatedRows);
};

const focusNextSODetailField = (currentIndex, field) => {
  const nextIndex = currentIndex + 1;
  const nextRow = detailRows[nextIndex];
  if (!nextRow) return;

  const zeroClearFields = [
    "soQuantity",
    "sellingPrice",
    "discRate1",
    "discRate2",
    "discRate3",
    "discRate4",
    "discRate5",
    "discRate6",
    "discRate7",
    "discRate8",
    "discAmount1",
    "discAmount2",
    "discAmount3",
    "discAmount4",
    "discAmount5",
    "discAmount6",
    "discAmount7",
    "discAmount8",
  ];

  const nextValue = parseFormattedNumber(nextRow[field]);
  if (zeroClearFields.includes(field) && nextValue === 0) {
    handleSODetailRowChange(nextIndex, field, "");
  }

  requestAnimationFrame(() => {
    document.getElementById(`${field}-${nextIndex}`)?.focus();
  });
};

const handleEditableZeroClearOnFocus = (event, isEditable) => {
  if (!isEditable) return;

  if (parseFormattedNumber(event.target.value) === 0) {
    event.target.value = "";
  }
};


return (
<>
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
 
        detailsRoute="/page/SVI"

        isSaveDisabled={state.isSaveDisabled || isFormDisabled || (detailRows?.length || 0) === 0} 
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
              
        

        {/* SO Header Form Section - Main Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 rounded-lg relative" id="so_hd">

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="branchName"
              label="Branch"
              type="lookup"
              value={branchName || ""}
              disabled={state.isFetchDisabled || state.isDocNoDisabled || isFormDisabled}
              onLookup={() => updateState({ branchModalOpen: true })}
            />

            <FieldRenderer
              id="soNo"
              label="SO No."
              type="lookup"
              value={state.documentNo || documentNo || ""}
              disabled={state.isDocNoDisabled}
              onChange={(val) => updateState({ documentNo: val })}
              onBlur={handlesoNoBlur}
              onLookup={() => updateState({ showAllTranDocNo: true })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handlesoNoBlur();
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
                SO Date
              </label>
            </div>

            <FieldRenderer
              id="billToCustCode"
              label="Bill To Customer Code"
              required
              type="lookup"
              value={billToCustCode || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ custModalOpen: true, modalContext: "billTo" })}
            />

            <FieldRenderer
              id="billToCustName"
              label="Bill To Customer Name"
              required
              type="text"
              value={billToCustName || ""}
              disabled
              readOnly
            />

            <FieldRenderer
              id="billToAddress"
              label="Bill To Address"
              type="text"
              value={billToAddress || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ billToAddress: val })}
            />
          </div>

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="salesType"
              label="SO Type"
              type="select"
              value={salesType || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ salesType: val })}
              options={salesTypeOptions.map((t) => ({
                label: t.DROPDOWN_NAME,
                value: t.DROPDOWN_CODE,
              }))}
            />

            <FieldRenderer
              id="customerPoNo"
              label="Customer PO No."
              type="text"
              value={customerPoNo || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ customerPoNo: val })}
              onBlur={handleHeaderCustomerPoBlur}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  await handleHeaderCustomerPoBlur();
                  e.currentTarget?.blur();
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
                  id="customerPoDate"
                  className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                  value={customerPoDate}
                  disabled={isFormDisabled}
                  updateState={updateState}
                />
              </div>
              <label htmlFor="customerPoDate" className="global-ref-floating-label">
                Customer PO Date
              </label>
            </div>

            <FieldRenderer
              id="shipToCode"
              label="Ship To Customer Code"
              required
              type="lookup"
              value={shipToCode || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ custModalOpen: true, modalContext: "shipTo" })}
            />

            <FieldRenderer
              id="shipToName"
              label="Ship To Customer Name"
              required
              type="text"
              value={shipToName || ""}
              disabled
              readOnly
            />

            <div className="relative w-full">
              <div className="relative flex items-center w-full">
                <input
                  id="shipToAddress"
                  type="text"
                  value={shipToAddress || ""}
                  disabled={isFormDisabled}
                  onChange={(e) => updateState({ shipToAddress: e.target.value })}
                  className={`peer w-full h-8 sm:h-8 global-ref-textbox-ui !px-2 !font-normal rounded-lg pr-12 ${
                    !isFormDisabled
                      ? "global-ref-textbox-enabled"
                      : "global-ref-textbox-disabled"
                  } focus-visible:ring-0 focus-visible:ring-offset-0 border shadow-none transition-all`}
                />
                <button
                  type="button"
                  onClick={() =>
                    !isFormDisabled &&
                    !isFetchDisabled &&
                    updateState({ custModalOpen: true, modalContext: "shipTo" })
                  }
                  disabled={isFormDisabled || isFetchDisabled}
                  title="Search"
                  className={`absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center rounded-r-lg border border-l-0 transition-colors ${
                    !isFormDisabled && !isFetchDisabled
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="text-sm" />
                </button>
              </div>
              <label
                htmlFor="shipToAddress"
                className={`global-ref-floating-label ${
                  !isFormDisabled
                    ? "global-ref-label-enabled"
                    : "global-ref-label-disabled"
                }`}
              >
                Ship To Address
              </label>
            </div>
          </div>

          <div className="global-tran-textbox-group-div-ui">

            <div className="flex gap-4">
              <input type="hidden" id="currCode" value={currCode || ""} readOnly />

              <div className="flex-grow w-2/3">
                <FieldRenderer
                  id="currName"
                  label="Currency"
                  value={
                    currCode
                      ? `${currCode}${currName ? ` - ${currName}` : ""}`
                      : ""
                  }
                  disabled
                  readOnly
                  type="text"
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
                    if (/^\d*\.?\d{0,6}$/.test(sanitizedValue) || sanitizedValue === "") {
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
                    handleEditableZeroClearOnFocus(e, !isFormDisabled);
                  }}
                />
              </div>
            </div>

            <FieldRenderer
              id="contactPerson"
              label="Contact Person"
              type="text"
              value={contactPerson || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ contactPerson: val })}
            />

            <FieldRenderer
              id="billtermName"
              label="Billing Term"
              required
              type="lookup"
              value={billtermName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ billtermModalOpen: true })}
            />

            <FieldRenderer
              id="salesRepName"
              label="Sales Rep"
              required
              type="lookup"
              value={salesRepName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ showSalesRepModal: true, modalContext: "headerSalesRep" })}
            />

            <FieldRenderer
              id="rcName"
              label="Responsibility Center"
              type="lookup"
              value={rcName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => updateState({ showRcModal: true, modalContext: "headerRc" })}
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
                  id="deliveryDate"
                  className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
                  value={deliveryDate}
                  disabled={isFormDisabled}
                  updateState={updateState}
                />
              </div>
              <label htmlFor="deliveryDate" className="global-ref-floating-label">
                Delivery Date
              </label>
            </div>
          </div>

          <div className="global-tran-textbox-group-div-ui">
            <FieldRenderer
              id="refDocNo1"
              label="Ref SO No. 1"
              type="text"
              value={refDocNo1 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refDocNo1: val })}
              maxLength={useGetFieldLength(tblFieldArray, "refsvi_no1")}
            />

            <FieldRenderer
              id="refDocNo2"
              label="Ref SO No. 2"
              type="text"
              value={refDocNo2 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ refDocNo2: val })}
              maxLength={useGetFieldLength(tblFieldArray, "refsvi_no2")}
            />

            <FieldRenderer
              id="soStatus"
              label="SO Status"
              type="select"
              value={soStatus || ""}
              disabled={!isHeaderSoStatusEditable}
              onChange={(val) => updateState({ soStatus: val })}
              options={filteredHeaderSoStatusOptions.map((t) => ({
                label: t.DROPDOWN_NAME,
                value: t.DROPDOWN_CODE,
              }))}
            />
          </div>

          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <div className="relative p-2">
              <textarea
                id="remarks"
                placeholder=""
                rows={6}
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
        </div>
   
   
    </div>
          
          {/* APV Detail Section */}
          <div id="apv_dtl" className="global-tran-tab-div-ui">

          {/* Tab Navigation */}
          <div className="global-tran-tab-nav-ui">

          {/* Tabs */}
          <div className="flex flex-row sm:flex-row">
            <button
              className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            >
              SO Details
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
              <th className="global-tran-th-ui">SO Status</th>
              <th className="global-tran-th-ui">Item Code</th>
              <th className="global-tran-th-ui">Item Name</th>
              <th className="global-tran-th-ui">Specification</th>
              <th className="global-tran-th-ui">UOM</th>
              <th className="global-tran-th-ui">SO Quantity</th>
              <th className="global-tran-th-ui">Selling Price</th>
              <th className="global-tran-th-ui">Gross Amount</th>
              {visibleDiscountRateFields.map((field, index) => (
                <th key={field} className="global-tran-th-ui">
                  {discountLevel === 1 ? "Disc Rate" : `Disc Rate ${index + 1}`}
                </th>
              ))}
              {visibleDiscountAmountFields.map((field, index) => (
                <th key={field} className="global-tran-th-ui">
                  {discountLevel === 1 ? "Disc Amount" : `Disc Amount ${index + 1}`}
                </th>
              ))}
              {showTotalDiscountColumn && (
                <th className="global-tran-th-ui">Total Discount</th>
              )}
              <th className="global-tran-th-ui">Net Amount</th>
              <th className="global-tran-th-ui">Delivery Date</th>
              <th className="global-tran-th-ui">Customer PO No.</th>
              <th className="global-tran-th-ui">Sales Rep Code</th>
              <th className="global-tran-th-ui">Free Item</th>
              <th className="global-tran-th-ui">DR Quantity</th>
              <th className="global-tran-th-ui">SI Quantity</th> 
                    
                {!isFormDisabled && (
                  <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">
                    Actions
                  </th>
                )}

            </tr>
          </thead>

          <tbody className="relative">{detailRows.map((row, index) => {
            const isExistingDocument = !!documentID;
            const isStatusLocked = !isExistingDocument || ["X", "C"].includes(row.soStat || "O");
            const hasDrQuantity = parseFormattedNumber(row.drQuantity || 0) > 0;
            const canDeleteRow = !hasDrQuantity && (row.soStat || "O") === "O";
            const soStatusOptions = hasDrQuantity
              ? [
                  { value: "O", label: "Open" },
                  { value: "C", label: "Closed" },
                ]
              : [
                  { value: "O", label: "Open" },
                  { value: "C", label: "Closed" },
                  { value: "X", label: "Cancelled" },
                ];

            return (
            <tr key={index} className="global-tran-tr-ui">
              
              {/* LN */}
              <td className="global-tran-td-ui text-center">{index + 1}</td>
              
              <td className="global-tran-td-ui">
                <select
                  className="w-[90px] global-tran-td-inputclass-ui text-left"
                  value={row.soStat || "O"}
                  disabled={isFormDisabled || isStatusLocked}
                  onChange={(e) => handleSODetailRowChange(index, "soStat", e.target.value)}
                >
                  {soStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </td>

              <td className="global-tran-td-ui">
                <div className="relative w-fit">
                  <input
                    type="text"
                    className="w-[120px] pr-6 global-tran-td-inputclass-ui text-center cursor-pointer"
                    value={row.itemCode || ""}
                    readOnly
                  />
                  {!isFormDisabled && (
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                      onClick={() => {
                        updateState({
                          selectedRowIndex: index,
                          selectionContext: "rowItemLookup",
                          insertAfterIndex: null,
                          showItemModal: true,
                        });
                      }}
                    />
                  )}
                </div>
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[220px] global-tran-td-inputclass-ui"
                  value={row.itemName || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "itemName", e.target.value)}
                />
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[220px] global-tran-td-inputclass-ui"
                  value={row.itemSpecs || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "itemSpecs", e.target.value)}
                />
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[90px] text-center global-tran-td-inputclass-ui"
                  value={row.uomCode || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "uomCode", e.target.value)}
                />
                <input
                  type="hidden"
                  value={row.pmType || ""}
                  readOnly
                />
                <input
                  type="hidden"
                  value={row.groupId || ""}
                  readOnly
                />
                <input
                  type="hidden"
                  value={row.pmId || ""}
                  readOnly
                />
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  id={`soQuantity-${index}`}
                  className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                  value={row.soQuantity || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                    const regex = new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`);
                    if (regex.test(sanitizedValue) || sanitizedValue === "") {
                      handleSODetailRowChange(index, "soQuantity", sanitizedValue);
                    }
                  }}
                  onFocus={(e) => {
                    handleEditableZeroClearOnFocus(
                      e,
                      !isFormDisabled
                    );
                  }}
                  onBlur={(e) => {
                    const num = parseFormattedNumber(e.target.value);
                    handleSODetailRowChange(
                      index,
                      "soQuantity",
                      Number.isFinite(num) ? formatNumber(num, quantityDecimals) : formatNumber(0, quantityDecimals)
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const num = parseFormattedNumber(e.target.value);
                      handleSODetailRowChange(
                        index,
                        "soQuantity",
                        Number.isFinite(num) ? formatNumber(num, quantityDecimals) : formatNumber(0, quantityDecimals)
                      );
                      focusNextSODetailField(index, "soQuantity");
                    }
                  }}
                />
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  id={`sellingPrice-${index}`}
                  className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                  value={row.sellingPrice || ""}
                  readOnly={isFormDisabled || !isSellingPriceAndDiscountEditable || row.freeItem === "Y"}
                  onChange={(e) => {
                    if (!isSellingPriceAndDiscountEditable || row.freeItem === "Y") return;
                    const inputValue = e.target.value;
                    const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                    const regex = new RegExp(`^\\d*\\.?\\d{0,${sellingPriceDecimals}}$`);
                    if (regex.test(sanitizedValue) || sanitizedValue === "") {
                      handleSODetailRowChange(index, "sellingPrice", sanitizedValue);
                    }
                  }}
                  onFocus={(e) => {
                    handleEditableZeroClearOnFocus(
                      e,
                      !isFormDisabled && isSellingPriceAndDiscountEditable && row.freeItem !== "Y"
                    );
                  }}
                  onBlur={(e) => {
                    const num = parseFormattedNumber(e.target.value);
                    handleSODetailRowChange(
                      index,
                      "sellingPrice",
                      Number.isFinite(num) ? formatNumber(num, sellingPriceDecimals) : formatNumber(0, sellingPriceDecimals)
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const num = parseFormattedNumber(e.target.value);
                      handleSODetailRowChange(
                        index,
                        "sellingPrice",
                        Number.isFinite(num) ? formatNumber(num, sellingPriceDecimals) : formatNumber(0, sellingPriceDecimals)
                      );
                      focusNextSODetailField(index, "sellingPrice");
                    }
                  }}
                />
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                  value={row.grossAmount || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "grossAmount", e.target.value)}
                />
              </td>

              {visibleDiscountRateFields.map((field) => (
                <td key={field} className="global-tran-td-ui">
                  <input
                    type="text"
                    id={`${field}-${index}`}
                    className="w-[90px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row[field] || ""}
                    readOnly={isFormDisabled || !isSellingPriceAndDiscountEditable || row.freeItem === "Y"}
                    onChange={(e) => {
                      if (!isSellingPriceAndDiscountEditable || row.freeItem === "Y") return;
                      const inputValue = e.target.value;
                      const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                      const regex = /^\d*\.?\d{0,2}$/;
                      if (regex.test(sanitizedValue) || sanitizedValue === "") {
                        handleSODetailRowChange(index, field, sanitizedValue);
                      }
                    }}
                    onFocus={(e) => {
                      handleEditableZeroClearOnFocus(
                        e,
                        !isFormDisabled && isSellingPriceAndDiscountEditable && row.freeItem !== "Y"
                      );
                    }}
                    onBlur={(e) => {
                      const num = parseFormattedNumber(e.target.value);
                      handleSODetailRowChange(
                        index,
                        field,
                        Number.isFinite(num) ? formatNumber(num) : formatNumber(0)
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const num = parseFormattedNumber(e.target.value);
                        handleSODetailRowChange(
                          index,
                          field,
                          Number.isFinite(num) ? formatNumber(num) : formatNumber(0)
                        );
                        focusNextSODetailField(index, field);
                      }
                    }}
                  />
                </td>
              ))}

              {visibleDiscountAmountFields.map((field) => (
                <td key={field} className="global-tran-td-ui">
                  <input
                    type="text"
                    id={`${field}-${index}`}
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row[field] || ""}
                    readOnly={isFormDisabled || !isSellingPriceAndDiscountEditable || row.freeItem === "Y"}
                    onChange={(e) => {
                      if (!isSellingPriceAndDiscountEditable || row.freeItem === "Y") return;
                      const inputValue = e.target.value;
                      const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                      const regex = /^\d*\.?\d{0,2}$/;
                      if (regex.test(sanitizedValue) || sanitizedValue === "") {
                        handleSODetailRowChange(index, field, sanitizedValue);
                      }
                    }}
                    onFocus={(e) => {
                      handleEditableZeroClearOnFocus(
                        e,
                        !isFormDisabled && isSellingPriceAndDiscountEditable && row.freeItem !== "Y"
                      );
                    }}
                    onBlur={(e) => {
                      const num = parseFormattedNumber(e.target.value);
                      handleSODetailRowChange(
                        index,
                        field,
                        Number.isFinite(num) ? formatNumber(num) : formatNumber(0)
                      );
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const num = parseFormattedNumber(e.target.value);
                        handleSODetailRowChange(
                          index,
                          field,
                          Number.isFinite(num) ? formatNumber(num) : formatNumber(0)
                        );
                        focusNextSODetailField(index, field);
                      }
                    }}
                  />
                </td>
              ))}

              {showTotalDiscountColumn && (
                <td className="global-tran-td-ui">
                  <input
                    type="text"
                    className="w-[110px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row.totDiscount || ""}
                    readOnly={isFormDisabled}
                    onChange={(e) => handleSODetailRowChange(index, "totDiscount", e.target.value)}
                  />
                </td>
              )}

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[110px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                  value={row.netAmount || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "netAmount", e.target.value)}
                />
              </td>

              <td className="global-tran-td-ui">
                <DateFormatInput
                  id={`delDate${index}`}
                  value={row.delDate || ""}
                  disabled={isFormDisabled}
                  className="w-[110px] global-tran-td-inputclass-ui pr-7 text-center"
                  updateState={(updates) => {
                    if (updates[`delDate${index}`] !== undefined) {
                      handleSODetailRowChange(index, "delDate", updates[`delDate${index}`]);
                    }
                  }}
                />
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  id={`customerPoNo-${index}`}
                  className="w-[130px] global-tran-td-inputclass-ui"
                  value={row.customerPoNo || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "customerPoNo", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusNextSODetailField(index, "customerPoNo");
                    }
                  }}
                />
              </td>

              <td className="global-tran-td-ui">
                <div className="relative w-fit">
                  <input
                    type="text"
                    className="w-[110px] pr-6 global-tran-td-inputclass-ui text-center cursor-pointer"
                    value={row.salesRepCode || ""}
                    readOnly
                  />
                  {!isFormDisabled && (
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                      onClick={() =>
                        updateState({
                          showSalesRepModal: true,
                          selectedRowIndex: index,
                          modalContext: "detailSalesRep",
                        })
                      }
                    />
                  )}
                </div>
              </td>

              <td className="global-tran-td-ui">
                <button
                  type="button"
                  className={`w-[90px] h-7 rounded-full border text-[11px] font-semibold transition-colors ${
                    row.freeItem === "Y"
                      ? "border-blue-500 bg-blue-500/15 text-blue-700"
                      : "border-slate-300 bg-white text-slate-600"
                  } ${isFormDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                  disabled={isFormDisabled}
                  onClick={() =>
                    handleSODetailRowChange(
                      index,
                      "freeItem",
                      row.freeItem === "Y" ? "" : "Y"
                    )
                  }
                >
                  {row.freeItem === "Y" ? "Yes" : "No"}
                </button>
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                  value={row.drQuantity || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                    const regex = new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`);
                    if (regex.test(sanitizedValue) || sanitizedValue === "") {
                      handleSODetailRowChange(index, "drQuantity", sanitizedValue);
                    }
                  }}
                />
              </td>

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                  value={row.siQuantity || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                    const regex = new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`);
                    if (regex.test(sanitizedValue) || sanitizedValue === "") {
                      handleSODetailRowChange(index, "siQuantity", sanitizedValue);
                    }
                  }}
                />
              </td>
                

               {!isFormDisabled && (
                    <td className="global-tran-td-ui text-center sticky right-0">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="global-tran-td-button-add-ui"
                          onClick={() => handleInsertBlankRow(index)}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>

                        <button
                          type="button"
                          className="global-tran-td-button-delete-ui"
                          onClick={() => handleDeleteRow(index)}
                          disabled={!canDeleteRow}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      </div>
                    </td>
                  )}

                        
              </tr>
            );
          })}
          </tbody>


        </table>
      </div>
      </div>
 


    {/* Invoice Details Footer */}
    <div className="global-tran-tab-footer-main-div-ui">


    {/* Add Button */}
    <div className="global-tran-tab-footer-button-div-ui">
      <button
        onClick={handleOpenAddItemModal}
        className="global-tran-tab-footer-button-add-ui"
        style={{ visibility: isFormDisabled ? "hidden" : "visible" }}
      >
        <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
      </button>
    </div>


      <div
    className={`global-tran-tab-footer-total-main-div-ui grid gap-1 ${
      currRate > 1 ? "grid-cols-3" : "grid-cols-2"
    }`}
      >
        {/* Header Row */}
        <div></div>
        <div className="global-tran-tab-footer-total-label-ui text-right">
          Currency ({glCurrDefault})
        </div>
        {currRate > 1 && (
          <div className="global-tran-tab-footer-total-label-ui text-right">
            Currency ({currCode})
          </div>
        )}

        {/* Total Gross Amount */}
        <div className="global-tran-tab-footer-total-label-ui">
          Total Gross Amount:
        </div>
        <div className="global-tran-tab-footer-total-value-ui">
          {currRate === 1
            ? totals.totalGrossAmount
            : formatNumber(parseFormattedNumber(totals.totalGrossAmount) * currRate)}
        </div>
        {currRate > 1 && (
          <div className="global-tran-tab-footer-total-value-ui">
            {totals.totalGrossAmount}
          </div>
        )}

        <div className="global-tran-tab-footer-total-label-ui">
          Total Discount Amount:
        </div>
        <div className="global-tran-tab-footer-total-value-ui">
          {currRate === 1
            ? totals.totalDiscountAmount
            : formatNumber(parseFormattedNumber(totals.totalDiscountAmount) * currRate)}
        </div>
        {currRate > 1 && (
          <div className="global-tran-tab-footer-total-value-ui">
            {totals.totalDiscountAmount}
          </div>
        )}

        <div className="global-tran-tab-footer-total-label-ui">
          Total Net Amount:
        </div>
        <div className="global-tran-tab-footer-total-value-ui">
          {currRate === 1
            ? totals.totalNetAmount
            : formatNumber(parseFormattedNumber(totals.totalNetAmount) * currRate)}
        </div>
        {currRate > 1 && (
          <div className="global-tran-tab-footer-total-value-ui">
            {totals.totalNetAmount}
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

    {showItemModal && (
      <ItemMastLookupModal
        isOpen={showItemModal}
        endpoint="getInvLookupFG"
        docType="SO"
        onClose={handleCloseItemModal}
        onCancel={() =>
          updateState({
            showItemModal: false,
            selectedRowIndex: null,
            insertAfterIndex: null,
            selectionContext: "",
          })
        }
        enableMultiSelect={selectionContext === "multiAdd"}
      />
    )}

    {showSalesRepModal && (
      <SearchSalesRepRef
        isOpen={showSalesRepModal}
        onClose={handleCloseSalesRepModal}
      />
    )}

    {/* RC Code Modal */}
    {showRcModal && (
      <RCLookupModal 
        isOpen={showRcModal}
        onClose={handleCloseRcModal}
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
    {showAllTranDocNo && (
      <AllTranDocNo
        isOpen={showAllTranDocNo}
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "soNo"}}
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
    endpoint="/getSOHistory"
    cacheKey={`SO:${state.branchCode || ""}`}
    activeTabKey="SO_Summary"
    branchCode={state.branchCode}
    status={(() => {
      const s = (state.status || "").toUpperCase();
      if (s === "CANCELLED") return "X";
      if (s === "CLOSED") return "C";
      if (s === "OPEN") return "";
      return "All";
    })()}
    onRowDoubleClick={handleHistoryRowPick}
    historyExportName={`${documentTitle} History`}
  />
</div>


</>
);
// End of Return



};

export default SO;
