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
  useSwalshowSaveSuccessDialog,
  useSwalSuccessAlert
} from '@/NAYSA Cloud/Global/behavior.jsx';


import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";


// Header
import Header from '@/NAYSA Cloud/Components/Header';
const SO = () => {

  // View Document Const
  const loadedFromUrlRef = useRef(false);
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
  const docType = docTypes.SVI; 
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
    documentStatus:"",
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
    billToAddress1: "",
    billToAddress2: "",
    shipToCode: "",
    shipToName: "",
    shipToAddress1: "",
    shipToAddress2: "",
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
    soStatus: "OPEN",
    salesType: "",
    salesTypeOptions: [],
    soStatusOptions: [],
    refDocNo1: "",
    refDocNo2: "",
    fromDate: null,
    toDate: null,
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
  billToAddress1,
  billToAddress2,
  shipToCode,
  shipToName,
  shipToAddress1,
  shipToAddress2,
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
  fromDate,
  toDate,
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
  const SO_DETAIL_INSERT_ENDPOINT = "addSODetail";
  


  const updateTotalsDisplay = (grossAmt, discAmt, netDisc) => {
    setTotals({
          totalGrossAmount: formatNumber(grossAmt),
          totalDiscountAmount: formatNumber(discAmt),
          totalNetAmount: formatNumber(netDisc),
      });
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
    const salesTypes = getAllDropDown("SOTRAN_TYPE", docType) || [];
    updateState({
      salesTypeOptions: salesTypes,
      salesType: salesTypes[0]?.DROPDOWN_CODE || "",
      soStatusOptions: [
        { DROPDOWN_CODE: "OPEN", DROPDOWN_NAME: "Open" },
        { DROPDOWN_CODE: "FINALIZED", DROPDOWN_NAME: "Finalized" },
        { DROPDOWN_CODE: "CANCELLED", DROPDOWN_NAME: "Cancelled" },
        { DROPDOWN_CODE: "CLOSED", DROPDOWN_NAME: "Closed" },
      ],
    });
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
      refDocNo1: "",
      refDocNo2:"",
      fromDate:null,
      toDate:null,
      remarks:"",
      noReprints:"0",

      billToCustCode:"",
      billToCustName:"",
      billToAddress1:"",
      billToAddress2:"",
      shipToCode:"",
      shipToName:"",
      shipToAddress1:"",
      shipToAddress2:"",
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
      documentStatus:"",
      salesType:"",
      soStatus:"OPEN",
      
      
      // UI state
      activeTab: "basic",
      isDocNoDisabled: false,
      isSaveDisabled: false,
      isResetDisabled: false,
      isFetchDisabled: false,
      status:"Open"

    });

      updateTotalsDisplay (0, 0, 0, 0, 0, 0)
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
    const data = await useFetchTranData(documentNo, branchCode,docType,"sviNo",direction);


    if (!data?.sviId) {
      Swal.fire({ icon: 'info', title: 'No Records Found', text: 'Transaction does not exist.' });
      return resetState();
    }


    // Format rows
    const retrievedDetailRows = (data.dt1 || []).map(item => ({
      ...item,
      quantity: formatNumber(item.quantity),
      unitPrice: formatNumber(item.unitPrice),
      grossAmount: formatNumber(item.grossAmount),
      discRate: formatNumber(item.discRate),
      discAmount: formatNumber(item.discAmount),
      netDisc: formatNumber(item.netDisc),
      vatAmount: formatNumber(item.vatAmount),
      atcAmount: formatNumber(item.atcAmount),
      sviAmount: formatNumber(item.sviAmount),
    }));

    updateState({
      documentStatus: data.sviStatus,
      status: data.docStatus,
      noReprints:data.noReprints,
      documentID: data.sviId,
      documentNo: data.sviNo,
      branchCode: data.branchCode,
      branchName:data.branchName,
      documentDate: useformatToDatev2(data.sviDate),
      salesType: data.svitranType,
      billToCustCode: data.custCode,
      billToCustName: data.custName,
      contactPerson:data.attention,
      shipToCode: data.shipToCode || data.custCode || "",
      shipToName: data.shipToName || data.custName || "",
      billToAddress1: data.billToAddress1 || data.address1 || "",
      billToAddress2: data.billToAddress2 || data.address2 || "",
      shipToAddress1: data.shipToAddress1 || data.deliveryAddress1 || data.address1 || "",
      shipToAddress2: data.shipToAddress2 || data.deliveryAddress2 || data.address2 || "",
      refDocNo1: data.refDocNo1,
      fromDate:useformatToDatev2(data.fromDate),
      toDate:useformatToDatev2(data.toDate),
      refDocNo2: data.refDocNo2,
      currCode: data.currCode,
      currName: data.currName,
      currRate: formatNumber(data.currRate, 6),
      remarks: data.remarks,
      billtermCode: data.billtermCode,
      billtermName: data.billtermName,
      customerPoNo: data.customerPoNo || data.custPoNo || "",
      customerPoDate: useformatToDatev2(data.customerPoDate || data.custPoDate),
      deliveryDate: useformatToDatev2(data.deliveryDate),
      rcCode: data.rcCode || "",
      rcName: data.rcName || "",
      salesRepCode: data.salesRepCode || "",
      salesRepName: data.salesRepName || "",
      soStatus: data.soStatus || data.docStatus || "OPEN",
      detailRows: retrievedDetailRows,
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


  
  if (documentStatus === "") {
    updateState({ isLoading: true });


    try {
        const {
        branchCode,
        documentNo,
        documentID,
        billtermCode,
        billToCustCode,
        billToCustName,
        refDocNo1,
        refDocNo2,
        fromDate,
        toDate,
        currCode,
        currRate,
        remarks,
        userCode,
        contactPerson,
        customerPoNo,
        customerPoDate,
        deliveryDate,
        rcCode,
        salesType,
        soStatus,
        detailRows,
      } = state;

      const buildSoData = () => ({
        branchCode: branchCode,
        sviNo: documentNo || "",
        sviId: documentID || "",
        sviDate: documentDate,
        svitranType: salesType,
        billtermCode: billtermCode,
        custCode: billToCustCode,
        custName: billToCustName,
        attention: contactPerson,
        refDocNo1: refDocNo1,
        refDocNo2: refDocNo2,
        fromDate: fromDate,
        toDate: toDate,
        currCode: currCode || "PHP",
        currRate: parseFormattedNumber(currRate),
        remarks: remarks || "",
        userCode: userCode,
        customerPoNo,
        customerPoDate,
        deliveryDate,
        rcCode,
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
          repCode: row.repCode || "",
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
          "sviId",
          "sviNo"
        );

        if (response) {
          const responseDocNo =  response.data[0].sviNo;
          const responseDocId =  response.data[0].sviId;

          await fetchTranData(responseDocNo,branchCode);

          const isZero = Number(noReprints) === 0;
          const onSaveAndPrint = isZero
            ? () => updateState({ showSignatoryModal: true })
            : () => handleSaveAndPrint(responseDocId);

          useSwalshowSaveSuccessDialog(handleReset, onSaveAndPrint);          
        }
        updateState({
          documentNo: response?.data?.[0]?.sviNo || "",
          documentID: response?.data?.[0]?.sviId || "",
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
      delDate: "",
      customerPoNo: customerPoNo || "",
      repCode: salesRepCode || "",
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

  const parseInsertDetailResponse = (response) => {
    const rawResult =
      response?.data?.[0]?.result ??
      response?.result ??
      response?.data ??
      [];

    if (Array.isArray(rawResult)) {
      return rawResult;
    }

    if (typeof rawResult === "string") {
      try {
        const parsed = JSON.parse(rawResult);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Error parsing inserted SO detail rows:", error);
        return [];
      }
    }

    return [];
  };

  const mapItemRecordToDetailRow = (item = {}) => createSODetailRow({
    itemCode: item?.itemCode || item?.item_code || "",
    itemName: item?.itemName || item?.item_name || "",
    itemSpecs: item?.itemSpecs || item?.item_specs || "",
    uomCode: item?.uomCode || item?.uom_code || "",
    pmType: item?.pmType || item?.pm_type || "",
    groupId: item?.groupId || item?.group_id || "",
    pmId: item?.pmId || item?.pm_id || "",
    soQuantity: formatNumber(
      item?.soQuantity ?? item?.quantity ?? item?.soQty ?? 0,
      quantityDecimals
    ),
    sellingPrice: formatNumber(
      item?.sellingPrice ?? item?.unitPrice ?? item?.selling_price ?? 0,
      sellingPriceDecimals
    ),
    grossAmount: formatNumber(item?.grossAmount ?? item?.gross_amount ?? 0),
    discRate1: formatNumber(item?.discRate1 ?? item?.disc_rate1 ?? 0),
    discRate2: formatNumber(item?.discRate2 ?? item?.disc_rate2 ?? 0),
    discRate3: formatNumber(item?.discRate3 ?? item?.disc_rate3 ?? 0),
    discRate4: formatNumber(item?.discRate4 ?? item?.disc_rate4 ?? 0),
    discRate5: formatNumber(item?.discRate5 ?? item?.disc_rate5 ?? 0),
    discRate6: formatNumber(item?.discRate6 ?? item?.disc_rate6 ?? 0),
    discRate7: formatNumber(item?.discRate7 ?? item?.disc_rate7 ?? 0),
    discRate8: formatNumber(item?.discRate8 ?? item?.disc_rate8 ?? 0),
    discAmount1: formatNumber(item?.discAmount1 ?? item?.disc_amount1 ?? 0),
    discAmount2: formatNumber(item?.discAmount2 ?? item?.disc_amount2 ?? 0),
    discAmount3: formatNumber(item?.discAmount3 ?? item?.disc_amount3 ?? 0),
    discAmount4: formatNumber(item?.discAmount4 ?? item?.disc_amount4 ?? 0),
    discAmount5: formatNumber(item?.discAmount5 ?? item?.disc_amount5 ?? 0),
    discAmount6: formatNumber(item?.discAmount6 ?? item?.disc_amount6 ?? 0),
    discAmount7: formatNumber(item?.discAmount7 ?? item?.disc_amount7 ?? 0),
    discAmount8: formatNumber(item?.discAmount8 ?? item?.disc_amount8 ?? 0),
    totDiscount: formatNumber(item?.totDiscount ?? item?.tot_discount ?? 0),
    netAmount: formatNumber(item?.netAmount ?? item?.net_amount ?? 0),
    delDate: item?.delDate || item?.del_date || "",
    customerPoNo: item?.customerPoNo || item?.customer_po_no || customerPoNo || "",
    repCode: item?.repCode || item?.rep_code || salesRepCode || "",
    freeItem: item?.freeItem || item?.free_item || "",
    drQuantity: formatNumber(item?.drQuantity ?? item?.dr_quantity ?? 0, quantityDecimals),
    siQuantity: formatNumber(item?.siQuantity ?? item?.si_quantity ?? 0, quantityDecimals),
  });

  const handleInsertSelectedItems = async (selectedRecords = []) => {
    if (!Array.isArray(selectedRecords) || selectedRecords.length === 0) {
      return;
    }

    const itemSequence = selectedRecords.map((item, index) => ({
      sequence: index + 1,
      itemCode: item?.itemCode || "",
      itemName: item?.itemName || "",
      uomCode: item?.uomCode || "",
      groupId: item?.groupId || "",
    }));

    const payload = {
      json_data: {
        branchCode,
        custCode: billToCustCode || "",
        currCode,
        currRate: parseFormattedNumber(currRate),
        svitranType: salesType,
        sviDate: documentDate,
        items: itemSequence,
      },
    };

    console.log(JSON.stringify(payload))
    let rowsFromResponse = [];

    try {
      updateState({ isLoading: true });
      const response = await postRequest(
        SO_DETAIL_INSERT_ENDPOINT,
        JSON.stringify(payload)
      );
      rowsFromResponse = parseInsertDetailResponse(response);
    } catch (error) {
      console.error("Error inserting SO detail items:", error);
    } finally {
      updateState({ isLoading: false });
    }

    const rowsToInsert = (rowsFromResponse.length > 0
      ? rowsFromResponse
      : selectedRecords
    ).map(mapItemRecordToDetailRow);

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

  if (documentID) {
    updateState({
      documentNo: "",
      documentID: "",
      documentStatus: "",
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
  const docNo = params.get("sviNo");
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
        const address1 =
          selectedData?.billAddress1 ||
          selectedData?.custAddress1 ||
          selectedData?.address1 ||
          selectedData?.addr1 ||
          "";
        const address2 =
          selectedData?.billAddress2 ||
          selectedData?.custAddress2 ||
          selectedData?.address2 ||
          selectedData?.addr2 ||
          "";
        const custDetails = {
            custCode: selectedData?.custCode || '',
            custName: selectedData?.custName || '',
            currCode: selectedData?.currCode || '',
            attention: selectedData?.attention || '',
            billtermCode: selectedData?.billtermCode || '',
            billtermName: selectedData?.billtermName || ''
        };
        const isShipTo = modalContext === "shipTo";
        updateState(
          isShipTo
            ? {
                shipToName: selectedData.custName,
                shipToCode: selectedData.custCode,
                shipToAddress1: address1,
                shipToAddress2: address2,
                custModalOpen: false,
                modalContext: "",
              }
            : {
                billToCustName: selectedData.custName,
                billToCustCode: selectedData.custCode,
                billToAddress1: address1,
                billToAddress2: address2,
                custModalOpen: false,
                modalContext: "",
              }
        );
        
        if (!selectedData.currCode) {
            const payload = { CUST_CODE: selectedData.custCode };
            const response = await postRequest("getCustomer", JSON.stringify(payload));

            if (response.success) {
                const data = JSON.parse(response.data[0].result);
                custDetails.currCode = data[0]?.currCode;
                custDetails.attention = data[0]?.custContact;
                custDetails.billtermCode = data[0]?.billtermCode;
                custDetails.billtermName = data[0]?.billtermName;
            } else {
                console.warn("API call for getCustomer returned success: false", response.message);
            }
        }

        await Promise.all([
            handleSelectCurrency(custDetails.currCode),
            handleSelectBillTerm(custDetails.billtermCode),
            updateState({ contactPerson: custDetails.attention })
        ]);

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


const handleCloseItemModal = (selectedItems) => {
  const records = normalizeItemModalRecords(selectedItems);

  if (selectionContext === "rowItemLookup" && selectedRowIndex !== null && records.length > 0) {
    const selectedItem = records[0];
    const updatedRows = [...detailRows];
    updatedRows[selectedRowIndex] = {
      ...updatedRows[selectedRowIndex],
      itemCode: selectedItem?.itemCode || "",
      itemName: selectedItem?.itemName || "",
      itemSpecs: selectedItem?.itemSpecs || updatedRows[selectedRowIndex]?.itemSpecs || "",
      uomCode: selectedItem?.uomCode || "",
      pmType: selectedItem?.pmType || updatedRows[selectedRowIndex]?.pmType || "",
      groupId: selectedItem?.groupId || updatedRows[selectedRowIndex]?.groupId || "",
      pmId: selectedItem?.pmId || updatedRows[selectedRowIndex]?.pmId || "",
    };
    updateState({ detailRows: updatedRows });
  }

  if (selectionContext === "multiAdd" && records.length > 0) {
    handleInsertSelectedItems(records);
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
              onBlur={handleSviNoBlur}
              onLookup={() => updateState({ showAllTranDocNo: true })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSviNoBlur();
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
              id="billToAddress1"
              label="Bill To Address"
              type="text"
              value={billToAddress1 || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ billToAddress1: val })}
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

            <FieldRenderer
              id="shipToAddress1"
              label="Ship To Address"
              type="lookup"
              value={shipToAddress1 || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled={isFetchDisabled}
              onLookup={() => {}}
            />
          </div>

          <div className="global-tran-textbox-group-div-ui">

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
              type="lookup"
              value={salesRepName || ""}
              disabled={isFormDisabled}
              readOnly
              lookupDisabled
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
              id="contactPerson"
              label="Contact Person"
              type="text"
              value={contactPerson || ""}
              disabled={isFormDisabled}
              onChange={(val) => updateState({ contactPerson: val })}
            />

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
                  disabled={isFormDisabled}
                  readOnly
                  type="lookup"
                  onLookup={() => updateState({ currencyModalOpen: true })}
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
                    if (parseFormattedNumber(e.target.value) === 0) {
                      e.target.value = "";
                    }
                  }}
                />
              </div>
            </div>

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
              disabled={isFormDisabled}
              onChange={(val) => updateState({ soStatus: val })}
              options={soStatusOptions.map((t) => ({
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
              <th className="global-tran-th-ui">Disc Rate 1</th>
              <th className="global-tran-th-ui">Disc Rate 2</th>
              <th className="global-tran-th-ui">Disc Rate 3</th>
              <th className="global-tran-th-ui">Disc Rate 4</th>
              <th className="global-tran-th-ui">Disc Rate 5</th>
              <th className="global-tran-th-ui">Disc Rate 6</th>
              <th className="global-tran-th-ui">Disc Rate 7</th>
              <th className="global-tran-th-ui">Disc Rate 8</th>
              <th className="global-tran-th-ui">Disc Amount 1</th>
              <th className="global-tran-th-ui">Disc Amount 2</th>
              <th className="global-tran-th-ui">Disc Amount 3</th>
              <th className="global-tran-th-ui">Disc Amount 4</th>
              <th className="global-tran-th-ui">Disc Amount 5</th>
              <th className="global-tran-th-ui">Disc Amount 6</th>
              <th className="global-tran-th-ui">Disc Amount 7</th>
              <th className="global-tran-th-ui">Disc Amount 8</th>
              <th className="global-tran-th-ui">Total Discount</th>
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



          <tbody className="relative">{detailRows.map((row, index) => (
            <tr key={index} className="global-tran-tr-ui">
              
              {/* LN */}
              <td className="global-tran-td-ui text-center">{index + 1}</td>
              
              <td className="global-tran-td-ui">
                <select
                  className="w-[90px] global-tran-td-inputclass-ui text-center"
                  value={row.soStat || "O"}
                  disabled={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "soStat", e.target.value)}
                >
                  <option value="O">Open</option>
                  <option value="C">Closed</option>
                  <option value="X">Cancelled</option>
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
                    if (parseFormattedNumber(e.target.value) === 0) {
                      e.target.value = "";
                    }
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
                  readOnly={isFormDisabled || !isSellingPriceAndDiscountEditable}
                  onChange={(e) => {
                    if (!isSellingPriceAndDiscountEditable) return;
                    const inputValue = e.target.value;
                    const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                    const regex = new RegExp(`^\\d*\\.?\\d{0,${sellingPriceDecimals}}$`);
                    if (regex.test(sanitizedValue) || sanitizedValue === "") {
                      handleSODetailRowChange(index, "sellingPrice", sanitizedValue);
                    }
                  }}
                  onFocus={(e) => {
                    if (parseFormattedNumber(e.target.value) === 0) {
                      e.target.value = "";
                    }
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

              {["discRate1","discRate2","discRate3","discRate4","discRate5","discRate6","discRate7","discRate8"].map((field) => (
                <td key={field} className="global-tran-td-ui">
                  <input
                    type="text"
                    id={`${field}-${index}`}
                    className="w-[90px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row[field] || ""}
                    readOnly={isFormDisabled || !isSellingPriceAndDiscountEditable}
                    onChange={(e) => {
                      if (!isSellingPriceAndDiscountEditable) return;
                      const inputValue = e.target.value;
                      const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                      const regex = /^\d*\.?\d{0,2}$/;
                      if (regex.test(sanitizedValue) || sanitizedValue === "") {
                        handleSODetailRowChange(index, field, sanitizedValue);
                      }
                    }}
                    onFocus={(e) => {
                      if (parseFormattedNumber(e.target.value) === 0) {
                        e.target.value = "";
                      }
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

              {["discAmount1","discAmount2","discAmount3","discAmount4","discAmount5","discAmount6","discAmount7","discAmount8"].map((field) => (
                <td key={field} className="global-tran-td-ui">
                  <input
                    type="text"
                    id={`${field}-${index}`}
                    className="w-[100px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                    value={row[field] || ""}
                    readOnly={isFormDisabled || !isSellingPriceAndDiscountEditable}
                    onChange={(e) => {
                      if (!isSellingPriceAndDiscountEditable) return;
                      const inputValue = e.target.value;
                      const sanitizedValue = inputValue.replace(/[^0-9.]/g, "");
                      const regex = /^\d*\.?\d{0,2}$/;
                      if (regex.test(sanitizedValue) || sanitizedValue === "") {
                        handleSODetailRowChange(index, field, sanitizedValue);
                      }
                    }}
                    onFocus={(e) => {
                      if (parseFormattedNumber(e.target.value) === 0) {
                        e.target.value = "";
                      }
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

              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[110px] h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0"
                  value={row.totDiscount || ""}
                  readOnly={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "totDiscount", e.target.value)}
                />
              </td>

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
                  className="w-[110px] global-tran-td-inputclass-ui text-center"
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
                    value={row.repCode || ""}
                    readOnly
                  />
                  {!isFormDisabled && (
                    <FontAwesomeIcon
                      icon={faMagnifyingGlass}
                      className="absolute top-1/2 right-2 -translate-y-1/2 text-blue-600 text-lg cursor-pointer hover:text-blue-900"
                    />
                  )}
                </div>
              </td>

              <td className="global-tran-td-ui">
                <select
                  className="w-[90px] global-tran-td-inputclass-ui text-center"
                  value={row.freeItem || ""}
                  disabled={isFormDisabled}
                  onChange={(e) => handleSODetailRowChange(index, "freeItem", e.target.value)}
                >
                  <option value=""></option>
                  <option value="Y">Yes</option>
                </select>
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
        onClick={() =>
          updateState({
            showItemModal: true,
            selectionContext: "multiAdd",
            selectedRowIndex: null,
            insertAfterIndex: null,
          })
        }
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

        {/* Total Invoice Amount */}
        <div className="global-tran-tab-footer-total-label-ui">
          Total Invoice Amount:
        </div>
        <div id="totInvoiceAmount" className="global-tran-tab-footer-total-value-ui">
          {currRate === 1
            ? totals.totalNetAmount
            : formatNumber( parseFormattedNumber(totals.totalNetAmount)  * currRate)}
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
        params={{branchCode,branchName,docType,documentTitle,fieldNo : "sviNo"}}
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
    endpoint="/getSVIHistory"
    cacheKey={`SVI:${state.branchCode || ""}:${state.fromDate || ""}:${state.toDate || ""}`}
    activeTabKey="SVI_Summary"
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


</>
);
// End of Return



};

export default SO;
