import React, { useState, useEffect } from "react";
import Swal from 'sweetalert2';

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
import AttachDocumentModal from "../../../Lookup/SearchAttachment.jsx";
import DocumentSignatories from "../../../Lookup/SearchSignatory.jsx";

// Configuration
import {fetchData , postRequest} from '../../../Configuration/BaseURL.jsx'
import { useReset } from "../../../Components/ResetContext";

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
  useHandlePrint,
  useHandleCancel,
} from '@/NAYSA Cloud/Global/procedure';


import { 
  formatNumber,
  parseFormattedNumber,
  useSwalshowSaveSuccessDialog,
} from '@/NAYSA Cloud/Global/behavior';


// Header
import Header from '@/NAYSA Cloud/Components/Header';
import { faAdd } from "@fortawesome/free-solid-svg-icons/faAdd";


const CV = () => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSpecs, setCurrentSpecs] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [activeTab, setActiveTab] = useState("basic");
  const [GLactiveTab, setGLActiveTab] = useState("invoice");


  //Document Global Setup
  const docType = 'CV'; 
  const pdfLink = docTypePDFGuide[docType];
  const videoLink = docTypeVideoGuide[docType];
  const documentTitle = docTypeNames[docType] || 'Transaction';

  //Status Global Setup
  const displayStatus = status || 'FINALIZED';
  let statusColor = 'global-tran-stat-text-open-ui';
  if (displayStatus === 'FINALIZED') {
    statusColor = 'global-tran-stat-text-finalized-ui';
  } else if (['CANCELLED', 'CLOSED'].includes(displayStatus)) {
    statusColor = 'global-tran-stat-text-closed-ui';
  }


  const { resetFlag } = useReset();

  const [detailRows, setDetailRows] = useState([]);
  const [detailRowsGL, setDetailRowsGL] = useState([]);
  const [detailData, setDetailData] = useState([]);
  const [isFetchDisabled, setIsFetchDisabled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [modalContext, setModalContext] = useState('');

  // Uncommented: State to control visibility of the Open Balance modal (currently not in use)
  // const [showOpenBalanceModal, setShowOpenBalanceModal] = useState(false);

  // State to identify which context or component made a selection (useful when reusing modals)
  const [selectionContext, setSelectionContext] = useState('');
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [currencyRate, setCurrencyRate] = useState("");

  const [header, setHeader] = useState({
    apv_date: "",
  });

// useEffect to listen for resetFlag changes and clear specific fields when triggered
useEffect(() => {
  if (resetFlag) {
    setCurrencyCode("");
    setCurrencyName("");
    setBranchName("");
    console.log("Fields in CV reset!");
  }
}, [resetFlag]);

// Function to add a new row to the detail section with default empty values
const handleAddRow = () => {
  setDetailRows([
    ...detailRows,
    {
      apType: "",
      rrNo: "",
      poNo: "",
      invoiceNo: "",
      invoiceDate: header.apv_date,
      origAmount: "0.00",
      currency: currencyCode,
      invoiceAmount: "0.00",
      appliedAmount: "0.00",
      unappliedAmount: "",
      drAccount: "",
      rcCode: "",
      rcDescription: "",
      slCode: "",
      vatCode: "",
      vatDescription: "",
      vatAmount: "0.00",
      ewtCode: "",
      ewtDescription: "",
      ewtAmount: "0.00",
    }
  ]);
};

const handleDeleteRow = (index) => {
  const updatedRows = [...detailRows];
  updatedRows.splice(index, 1);
  setDetailRows(updatedRows); // assuming you're using useState
};

// Function to add a new row to the detail section with default empty values
const handleAddRowGL = () => {
  setDetailRowsGL([
    ...detailRowsGL,
    {
      acctCode: "",
      rcCode: "",
      slCode: "",
      particulars: "",
      vatCode: "",
      vatDescription: "",
      ewtCode: "",
      ewtDescription: "",
      debit: "0.00",
      credit: "0.00",
      slRefNo: "",
      remarks: "",
    }
  ]);
};

const handleDeleteRowGL = (index) => {
  const updatedRows = [...detailRowsGL];
  updatedRows.splice(index, 1);
  setDetailRowsGL(updatedRows); // assuming you're using useState
};


// Opens the currency lookup modal
const openCurrencyModal = () => {
  setCurrencyModalOpen(true);
};

// Handles selection of a currency from the modal
const handleCurrencySelect = (selectedCurrency) => {
  if (selectedCurrency) {
    setCurrencyCode(selectedCurrency.currCode);
    setCurrencyName(selectedCurrency.currName);
    setCurrencyRate(selectedCurrency.currRate);
  }
  setCurrencyModalOpen(false); // Close the modal after selection
};

// Set the default APV date to today when component is first mounted
useEffect(() => {
  const today = new Date().toISOString().split("T")[0];
  setHeader((prev) => ({ ...prev, apv_date: today }));
}, []);

// When the branch lookup button is clicked, determine the source context and show the modal
const handleBranchClick = (e) => {
  const parentDiv = e.currentTarget.closest('div[id]');
  const contextId = parentDiv?.id || 'unknown';
  setModalContext(contextId);
  setShowModal(true); // Open the branch modal (which will fetch data on its own)
};

// Handles selection of a branch from the modal
const handleSelectBranch = (selectedBranch) => {
  console.log("Selected branch for context:", selectionContext);
  console.log("Selected branch:", selectedBranch);

  if (selectedBranch) {
    // If the selection context is the header section, set the branch name
    if (selectionContext === 'apv_hd') {
      setBranchName(selectedBranch.branchName || "");
    }
  }

  setShowModal(false);        // Close the branch modal
  setSelectionContext('');    // Clear the context for future use
};


return (

    <div className="global-tran-main-div-ui">

      {/* Transaction Toolbar Section */}

      <div className="global-tran-headerToolbar-ui"><Header docType = {docType} pdfLink={pdfLink} videoLink={videoLink}/></div>


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
          <button
            className={`global-tran-tab-padding-ui ${activeTab === 'check' ? 'global-tran-tab-text_active-ui' : 'global-tran-tab-text_inactive-ui'}`}
            onClick={() => setActiveTab('check')}
          >
            Check Information
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'basic' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2"> {/* Added gap-y-4 for vertical spacing */}
              {/* Column 1 */}
              <div className="global-tran-textbox-group-div-ui">
                
                <div className="relative">
                  <input
                    type="text"
                    id="BranchCode"
                    value="Head Office"  // <-- bind input to state
                    onChange={(e) => setBranchName(e.target.value)} // <-- update state when typed
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="BranchCode"
                    className="global-tran-floating-label"
                  >
                    Branch
                  </label>
                   <button
                    onClick={handleBranchClick}
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled 
                        ? "global-tran-textbox-button-search-disabled-ui" 
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="APVNo"
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="APVNo"
                    className="global-tran-floating-label"
                  >
                    CV No.
                  </label>
                  <button
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled 
                        ? "global-tran-textbox-button-search-disabled-ui" 
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="date"
                    id="APVDate"
                    className="peer global-tran-textbox-ui"
                    value={header.apv_date}
                  />
                  <label
                    htmlFor="APVDate"
                    className="global-tran-floating-label"
                  >
                    CV Date
                  </label>
                </div>
              </div>

              {/* Column 2 */}
              <div className="global-tran-textbox-group-div-ui">
                <div className="relative">
                  <input
                    type="text"
                    id="payeeCode"
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="payeeCode"
                    className="global-tran-floating-label"
                  >
                    <span className="global-tran-asterisk-ui"> * </span>
                    Payee Code 
                  </label>
                  <button
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled 
                        ? "global-tran-textbox-button-search-disabled-ui" 
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="payeeName"
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="payeeName"
                    className="global-tran-floating-label"
                  >
                    <span className="global-tran-asterisk-ui"> * </span>
                    Payee Name
                  </label>
                </div>

                <div className="relative">
                  <select
                    id="refAPV"
                    className="peer global-tran-textbox-ui"
                    defaultValue=""
                  >
                    <option value="Y" disabled hidden></option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                  <label
                    htmlFor="refAPV"
                    className="global-tran-floating-label"
                  >
                    With Ref APV
                  </label>
                </div>

              </div>

              {/* Column 3 */}
              <div className="global-tran-textbox-group-div-ui">
                
              <div className="relative">
                  <select
                    id="apType"
                    className="peer global-tran-textbox-ui"
                    defaultValue=""
                  >
                    <option value="APV001" disabled hidden></option>
                    <option value="APV001">Purchases</option>
                    <option value="APV002">Non-Purchases</option>
                  </select>
                  <label
                    htmlFor="apType"
                    className="global-tran-floating-label"
                  >
                    AP Type
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="refDocNo"
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="refDocNo"
                    className="global-tran-floating-label"
                  >
                    Ref Doc No.
                  </label>
                </div>
              </div>

              {/* Column 4 - Remarks */}
              <div className="col-span-full"> 
                <div className="relative w-full p-2">
                  <textarea
                    id="remarks"
                    placeholder=""
                    rows={5} 
                    className="peer global-tran-textbox-remarks-ui"
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3">
              {/* Column 3 */}
              <div className="global-tran-textbox-group-div-ui">
              <div className="relative">
                  <input
                    type="text"
                    id="bankCode"
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="bankCode"
                    className="global-tran-floating-label"
                  >
                    Bank Name
                  </label>
                  <button
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled 
                        ? "global-tran-textbox-button-search-disabled-ui" 
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    id="bankAcct"
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="bankAcct"
                    className="global-tran-floating-label"
                  >
                    Bank Account No.
                  </label>
                </div>

                <div className="relative">
                  <select
                    id="currName"
                    className="peer global-tran-textbox-ui"
                    defaultValue=""
                  >
                    <option value="CV001" disabled hidden></option>
                    <option value="CV002">Check</option>
                    <option value="CV003">Cash</option>
                    <option value="CV003">Wired</option>
                    <option value="CV003">Authority to Debit</option>
                    <option value="CV003">Bank Transfer</option>
                    <option value="CV003">Gcash/Paymaya</option>
                  </select>
                  <label
                    htmlFor="currName"
                    className="global-tran-floating-label"
                  >
                    Payment Type
                  </label>
                </div>

              </div>

              {/* Column 4 */}
              <div className="global-tran-textbox-group-div-ui">

              <div className="relative">
                  <input
                    type="text"
                    id="APVNo"
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="APVNo"
                    className="global-tran-floating-label"
                  >
                    Check No.
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="date"
                    id="checkDate"
                    value={header.apv_date}
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="checkDate"
                    className="global-tran-floating-label"
                  >
                    Check Date
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    id="currName"
                    placeholder=" "
                    defaultValue="0.00"
                    className="peer global-tran-textbox-ui text-right"
                  />
                  <label
                    htmlFor="currName"
                    className="global-tran-floating-label"
                  >
                    Check Amount (Original)
                  </label>
                </div>
              </div>

              {/* Column 5 */}
              <div className="global-tran-textbox-group-div-ui">

              <div className="relative">
                  <input
                    type="text"
                    id="currCode"
                    value={currencyName}  // <-- bind input to state
                    onChange={(e) => setCurrencyName(e.target.value)} // <-- update state when typed
                    placeholder=" "
                    className="peer global-tran-textbox-ui"
                  />
                  <label
                    htmlFor="currCode"
                    className="global-tran-floating-label"
                  >
                    Currency
                  </label>
                   <button
                    onClick={openCurrencyModal}
                    className={`global-tran-textbox-button-search-padding-ui ${
                      isFetchDisabled 
                        ? "global-tran-textbox-button-search-disabled-ui" 
                        : "global-tran-textbox-button-search-enabled-ui"
                    } global-tran-textbox-button-search-ui`}
                    >
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    id="currRate"
                    value={currencyRate}  // <-- bind input to state
                    onChange={(e) => setCurrencyRate(e.target.value)} // <-- update state when typed
                    placeholder=" "
                    className="peer global-tran-textbox-ui text-right"
                  />
                  <label
                    htmlFor="currRate"
                    className="global-tran-floating-label"
                  >
                    Currency Rate
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    id="currName"
                    placeholder=" "
                    defaultValue="0.00"
                    className="peer global-tran-textbox-ui text-right"
                  />
                  <label
                    htmlFor="currName"
                    className="global-tran-floating-label"
                  >
                    Check Amount (Php)
                  </label>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
      

      {/* Invoice Details Button */}
      <div id="cv_dtl" className="global-tran-tab-div-ui">
      
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
          Invoice Details
        </button>
      </div>

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          // onClick={handleAddRow}
          className="global-tran-button-lookup"
        >
          Get Multiple AP
        </button>
        
      </div>
    </div>


  {/* Invoice Details Table */}
  <div className="global-tran-table-main-div-ui">
    <div className="global-tran-table-main-sub-div-ui"> 
      <table className="min-w-full border-collapse">

        <thead className="global-tran-thead-div-ui">
          <tr>
            <th className="global-tran-th-ui">LN</th>
            <th className="global-tran-th-ui">AP Type</th>
            <th className="global-tran-th-ui">RR No.</th>
            <th className="global-tran-th-ui">PO/JO No.</th>
            <th className="global-tran-th-ui">Invoice No.</th>
            <th className="global-tran-th-ui">Invoice Date</th>
            <th className="global-tran-th-ui">Original Amount</th>
            <th className="global-tran-th-ui">Currency</th>
            <th className="global-tran-th-ui">Invoice Amount</th>
            <th className="global-tran-th-ui">Applied Amount</th>
            <th className="global-tran-th-ui">Unapplied Amount</th>
            <th className="global-tran-th-ui">DR Account</th>
            <th className="global-tran-th-ui">RC Code</th>
            <th className="global-tran-th-ui">RC Name</th>
            <th className="global-tran-th-ui">SL Code</th>
            <th className="global-tran-th-ui">VAT Code</th>
            <th className="global-tran-th-ui">VAT Name</th>
            <th className="global-tran-th-ui">VAT Amount</th>
            <th className="global-tran-th-ui">ATC</th>
            <th className="global-tran-th-ui">ATC Name</th>
            <th className="global-tran-th-ui">ATC Amount</th>
            <th className="global-tran-th-ui sticky right-[43px] bg-blue-300 dark:bg-blue-900 z-30">Add</th>
            <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">Delete</th>
          </tr>
        </thead>

        <tbody className="relative">{detailRows.map((row, index) => (
          <tr key={index} className="global-tran-tr-ui">

            <td className="global-tran-td-ui text-center">{index + 1}</td>
            <td className="global-tran-td-ui">
              <select
                className="w-[120px] global-tran-td-inputclass-ui"
                value={row.aptype || ""}
                onChange={(e) => handleDetailChange(index, 'apType', e.target.value)}
              >
                <option value="APV001">Purchases</option>
                <option value="APV004">Liquidation</option>
                <option value="APV005">Replenishment</option>
                <option value="APV006">Reimbursement</option>
              </select>
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.rrNo || ""}
                onChange={(e) => handleDetailChange(index, 'rrNo', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.poNo || ""}
                onChange={(e) => handleDetailChange(index, 'poNo', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.invoiceNo || ""}
                onChange={(e) => handleDetailChange(index, 'invoiceNo', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="date"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.invoiceDate || ""}
                onChange={(e) => handleDetailChange(index, 'invoiceDate', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="number"
                className="w-[120px] global-tran-td-inputclass-ui text-right"
                value={row.origAmount || "0.00"}
                onChange={(e) => handleDetailChange(index, 'origAmount', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[80px] global-tran-td-inputclass-ui text-center"
                value={row.currency || "PHP"}
                onChange={(e) => handleDetailChange(index, 'currency', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="number"
                className="w-[120px] global-tran-td-inputclass-ui text-right"
                value={row.invoiceAmount || "0.00"}
                onChange={(e) => handleDetailChange(index, 'invoiceAmount', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="number"
                className="w-[120px] global-tran-td-inputclass-ui text-right"
                value={row.appliedAmount || "0.00"}
                onChange={(e) => handleDetailChange(index, 'appliedAmount', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="number"
                className="w-[120px] global-tran-td-inputclass-ui text-right"
                value={row.unappliedAmount || "0.00"}
                onChange={(e) => handleDetailChange(index, 'unappliedAmount', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.drAccount || ""}
                onChange={(e) => handleDetailChange(index, 'drAccount', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.rcCode || ""}
                onChange={(e) => handleDetailChange(index, 'rcCode', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.rcDescription || ""}
                onChange={(e) => handleDetailChange(index, 'rcDescription', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.slCode || ""}
                onChange={(e) => handleDetailChange(index, 'slCode', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.vatCode || ""}
                onChange={(e) => handleDetailChange(index, 'vatCode', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.vatDescription || ""}
                onChange={(e) => handleDetailChange(index, 'vatDescription', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="number"
                className="w-[100px] global-tran-td-inputclass-ui text-right"
                value={row.vatAmount || "0.00"}
                onChange={(e) => handleDetailChange(index, 'vatAmount', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.ewtCode || ""}
                onChange={(e) => handleDetailChange(index, 'ewtCode', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="text"
                className="w-[100px] global-tran-td-inputclass-ui"
                value={row.ewtDescription || ""}
                onChange={(e) => handleDetailChange(index, 'ewtDescription', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui">
              <input
                type="number"
                className="w-[100px] global-tran-td-inputclass-ui text-right"
                value={row.ewtAmount || "0.00"}
                onChange={(e) => handleDetailChange(index, 'ewtAmount', e.target.value)}
              />
            </td>
            <td className="global-tran-td-ui text-center sticky right-12">
              <button
                className="global-tran-td-button-add-ui"
                onClick={() => handleAddRow(index)}
                >
                  {/* Add */}
                   <FontAwesomeIcon icon={faPlus} />
                </button>
            </td>
            <td className="global-tran-td-ui text-center sticky right-0">
              <button
                className="global-tran-td-button-delete-ui"
                onClick={() => handleDeleteRow(index)}
                >
                  {/* Delete                  */}
                  <FontAwesomeIcon icon={faMinus} />
                </button>
            </td>

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
      >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />Add
      </button>
    </div>

    {/* Totals Section */}
    <div className="global-tran-tab-footer-total-main-div-ui">
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalInvoice" className="global-tran-tab-footer-total-label-ui">
          Total Invoice Amount:
        </label>
        <label className="global-tran-tab-footer-total-value-ui">0.00</label>
      </div>
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalVAT" className="global-tran-tab-footer-total-label-ui">
          Total VAT Amount:
        </label>
        <label className="global-tran-tab-footer-total-value-ui">0.00</label>
      </div>
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalATC" className="global-tran-tab-footer-total-label-ui">
          Total ATC Amount:
        </label>
        <label className="global-tran-tab-footer-total-value-ui">0.00</label>
      </div>
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalPayable" className="global-tran-tab-footer-total-label-ui">
          Total Payment Amount:
        </label>
        <label className="global-tran-tab-footer-total-value-ui">0.00</label>
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
          // onClick={handleAddRow}
          className="global-tran-button-generateGL"
        >
          Generate GL Entries
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
            <th className="global-tran-th-ui">SL Code</th>
            <th className="global-tran-th-ui">Particulars</th>
            <th className="global-tran-th-ui">VAT Code</th>
            <th className="global-tran-th-ui">VAT Name</th>
            <th className="global-tran-th-ui">ATC</th>
            <th className="global-tran-th-ui">ATC Name</th>
            <th className="global-tran-th-ui">Debit</th>
            <th className="global-tran-th-ui">Credit</th>
            <th className="global-tran-th-ui">SL Ref. No.</th>
            <th className="global-tran-th-ui">Remarks</th>
            <th className="global-tran-th-ui sticky right-[43px] bg-blue-300 dark:bg-blue-900 z-30">Add</th>
            <th className="global-tran-th-ui sticky right-0 bg-blue-300 dark:bg-blue-900 z-30">Delete</th>
          </tr>
        </thead>
        <tbody className="relative">
          {detailRowsGL.map((row, index) => (
            <tr key={index} className="global-tran-tr-ui">
              
              <td className="global-tran-td-ui text-center">{index + 1}</td>
              <td className="global-tran-td-ui">
              <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.acctCode || ""}
                  onChange={(e) => handleDetailChange(index, 'acctCode', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.rcCode || ""}
                  onChange={(e) => handleDetailChange(index, 'rcCode', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.slCode || ""}
                  onChange={(e) => handleDetailChange(index, 'slCode', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[150px] global-tran-td-inputclass-ui"
                  value={row.particulars || ""}
                  onChange={(e) => handleDetailChange(index, 'particulars', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.vatCode || ""}
                  onChange={(e) => handleDetailChange(index, 'vatCode', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.vatDescription || ""}
                  onChange={(e) => handleDetailChange(index, 'vatDescription', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.ewtCode || ""}
                  onChange={(e) => handleDetailChange(index, 'ewtCode', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[80px] global-tran-td-inputclass-ui"
                  value={row.ewtDescription || ""}
                  onChange={(e) => handleDetailChange(index, 'ewtDescription', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui text-right">
                <input
                  type="number"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.debit || "0.00"}
                  onChange={(e) => handleDetailChange(index, 'debit', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui text-right">
                <input
                  type="number"
                  className="w-[120px] global-tran-td-inputclass-ui text-right"
                  value={row.credit || "0.00"}
                  onChange={(e) => handleDetailChange(index, 'credit', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.slRefNo || ""}
                  onChange={(e) => handleDetailChange(index, 'slRefNo', e.target.value)}
                />
              </td>
              <td className="global-tran-td-ui">
                <input
                  type="text"
                  className="w-[100px] global-tran-td-inputclass-ui"
                  value={row.remarks || ""}
                  onChange={(e) => handleDetailChange(index, 'remarks', e.target.value)}
                />
              </td>
              
              <td className="global-tran-td-ui text-center sticky right-10">
                <button
                  className="global-tran-td-button-add-ui"
                  onClick={() => handleAddRowGL(index)}
                  >
                    {/* Add */}
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
              </td>
              <td className="global-tran-td-ui text-center sticky right-0">
                <button
                  className="global-tran-td-button-delete-ui"
                  onClick={() => handleDeleteRowGL(index)}
                  >
                    {/* Delete                  */}
                    <FontAwesomeIcon icon={faMinus} />
                  </button>
              </td>

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
          0.00
        </label>
      </div>

      {/* Total Credit */}
      <div className="global-tran-tab-footer-total-div-ui">
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-label-ui">
          Total Credit:
        </label>
        <label htmlFor="TotalCredit" className="global-tran-tab-footer-total-value-ui">
          0.00
        </label>
      </div>
    </div>

    </div>



</div>



<BranchLookupModal
  isOpen={showModal}
  branches={branches}
  // params={
  //   //add params here
  // }
  onClose={(selected) => {
    if (selected) {
      console.log(`Branch selected in: ${modalContext}`);
      console.log('Selected branch:', selected);
      
      if (modalContext === 'apv_hd') {
        setBranchName(selected.branchName || "");
      } else if (modalContext === 'apv_dtl') {
      }
    }
    setShowModal(false);
    setModalContext(''); // Reset the context
  }}
/>

{currencyModalOpen && (
        <CurrLookupModal 
          isOpen={currencyModalOpen}
          onClose={handleCurrencySelect}
        />
      )}

    </div>
  );
};

export default CV;