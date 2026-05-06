


// Maps DB componentKey -> React component

// --- ACCOUNTS RECEIVABLE ---
import SVI from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/SVI.jsx";
import PostSVI from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostSVI.jsx";
import SOA from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/SOA.jsx";
import PostSOA from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostSOA.jsx";
import ARCM from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/ARCM.jsx";
import PostARCM from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostARCM.jsx";
import ARDM from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/ARDM.jsx";
import PostARDM from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostARDM.jsx";
import CR from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/CR.jsx";
import PostCR from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostCR.jsx";
import AR from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/AR.jsx";
import PostAR from "./NAYSA Cloud/Module/Main Module/Accounts Receivable/PostAR.jsx";

// --- ACCOUNTS PAYABLE ---
import APV from "./NAYSA Cloud/Module/Main Module/Accounts Payable/APV.jsx";
import PostAPV from "./NAYSA Cloud/Module/Main Module/Accounts Payable/PostAPV.jsx";
import APCM from "./NAYSA Cloud/Module/Main Module/Accounts Payable/APCM.jsx";
import PostAPCM from "./NAYSA Cloud/Module/Main Module/Accounts Payable/PostAPCM.jsx";
import APDM from "./NAYSA Cloud/Module/Main Module/Accounts Payable/APDM.jsx";
import PostAPDM from "./NAYSA Cloud/Module/Main Module/Accounts Payable/PostAPDM.jsx";
import PCV from "./NAYSA Cloud/Module/Main Module/Accounts Payable/PCV.jsx";
import PostPCV from "./NAYSA Cloud/Module/Main Module/Accounts Payable/PostPCV.jsx";
import CV from "./NAYSA Cloud/Module/Main Module/Accounts Payable/CV.jsx";
import PostCV from "./NAYSA Cloud/Module/Main Module/Accounts Payable/PostCV.jsx";
import CVHistory from "./NAYSA Cloud/Module/Main Module/Accounts Payable/CVHistory.jsx";

// --- GENERAL LEDGER & MASTER DATA ---
import JV from "./NAYSA Cloud/Module/Main Module/General Ledger/JV.jsx";
import PostJV from "./NAYSA Cloud/Module/Main Module/General Ledger/PostJV.jsx";
import COAMast from "./NAYSA Cloud/Master Data/ChartofAccounts/COAMast.jsx";
import FSConso from "@/NAYSA Cloud/Master Data/ChartofAccounts/FSConsolidation.jsx";
import GLFSMatching from "@/NAYSA Cloud/Master Data/ChartofAccounts/GLFSMatching.jsx";
import CustMast from "./NAYSA Cloud/Master Data/CustMast.jsx";
import VendMast from "./NAYSA Cloud/Master Data/VendMast.jsx";
import BankMast from "./NAYSA Cloud/Master Data/BankMast.jsx";
import RCMast from "./NAYSA Cloud/Master Data/RCMast.jsx";
import SLMast from "./NAYSA Cloud/Master Data/SLMast.jsx";

// --- SALES ---
import SO from "./NAYSA Cloud/Module/Main Module/Sales/SO.jsx";
import DR from "./NAYSA Cloud/Module/Main Module/Sales/DR.jsx";

// --- PURCHASING & INVENTORY ---
import PR from "./NAYSA Cloud/Module/Main Module/Purchasing/PR.jsx";
import PRApprovalModal from "./NAYSA Cloud/Approval/PRApprovalModal.jsx";
import PO from "./NAYSA Cloud/Module/Main Module/Purchasing/PO.jsx";
import JO from "./NAYSA Cloud/Module/Main Module/Purchasing/JO.jsx";
import MSRR from "./NAYSA Cloud/Module/Main Module/Inventory/MSRR.jsx";
import MSIS from "./NAYSA Cloud/Module/Main Module/Inventory/MSIS.jsx";
import MSST from "./NAYSA Cloud/Module/Main Module/Inventory/MSST.jsx";
import MSAJ from "./NAYSA Cloud/Module/Main Module/Inventory/MSAJ.jsx";
import MSRTV from "./NAYSA Cloud/Module/Main Module/Inventory/MSRTV.jsx";
import PostMSRR from "./NAYSA Cloud/Module/Main Module/Inventory/PostMSRR.jsx";
import PostMSRTV from "./NAYSA Cloud/Module/Main Module/Inventory/PostMSRTV.jsx";
import PostMSAJ from "./NAYSA Cloud/Module/Main Module/Inventory/PostMSAJ.jsx";
import MonthendGLProcessingModal from "@/NAYSA Cloud/Processing/MonthendProcessing.jsx";
import YearendGLProcessingModal from "@/NAYSA Cloud/Processing/YearendProcessing.jsx";

// --- REFERENCE FILES ---
import Company from "./NAYSA Cloud/Reference File/Company.jsx";
import BranchRef from "./NAYSA Cloud/Reference File/BranchRef.jsx";
import BankRef from "./NAYSA Cloud/Reference File/BankRef.jsx";
import CurrRef from "./NAYSA Cloud/Reference File/CurrRef.jsx";
import ATaxCode from "./NAYSA Cloud/Reference File/ATCRef.jsx";
import UpdateUser from "./NAYSA Cloud/Reference File/UpdateUser.jsx";
import UserAccessRights from "./NAYSA Cloud/Reference File/UserAccessRights.jsx";
import MasterAccessRights from "./NAYSA Cloud/Reference File/MasterAccessRights.jsx";
import CutoffRef from "./NAYSA Cloud/Reference File/CutoffRef.jsx";
import DForexRef from "./NAYSA Cloud/Reference File/DForexRef.jsx";
import VATRef from "./NAYSA Cloud/Reference File/VATRef.jsx";
import BillCodeRef from "./NAYSA Cloud/Reference File/BillCodeRef.jsx";

// --- QUERIES & LOOKUPS ---
import AllTranHistory from "./NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";
import GLINQ from "./NAYSA Cloud/Query/GLInq/GLInq.jsx";
import ARINQ from "./NAYSA Cloud/Query/ARInq/ARINQ.jsx";
import APINQ from "./NAYSA Cloud/Query/APInq/APINQ.jsx";
import EWTINQ from "./NAYSA Cloud/Query/EWTInq/EWTINQ.jsx";
import CWTINQ from "./NAYSA Cloud/Query/CWTInq/CWTINQ.jsx";
import CheckRL from "./NAYSA Cloud/Query/CheckRL/CheckRL.jsx";
import CWTMonitoring from "./NAYSA Cloud/Query/CWTInq/CWTMonitoring.jsx";
import INTAXINQ from "./NAYSA Cloud/Query/INTAXInq/INTAXINQ.jsx";
import OUTAXINQ from "./NAYSA Cloud/Query/OUTAXInq/OUTAXINQ.jsx";
import AuditTrail from "./NAYSA Cloud/Query/AuditTrail/AuditTail.jsx";
import MSINQ from "./NAYSA Cloud/Query/INVInq/MSStockCard.jsx";


//Matrix
import SalesPMCustomerItem from "./NAYSA Cloud/Matrix/SalesPMCustomerItem.jsx"

// --- PRINTING / MODALS ---
// import ARReportModal from "./NAYSA Cloud/Printing/ARReport.jsx";
// import APReportModal from "./NAYSA Cloud/Printing/APReport.jsx";
// import GLReportModal from "./NAYSA Cloud/Printing/GLReport.jsx";
// import VIReportModal from "./NAYSA Cloud/Printing/VIReport.jsx";
// import EWTReportModal from "./NAYSA Cloud/Printing/EWTReport.jsx";
// import VOReportModal from "./NAYSA Cloud/Printing/VOReport.jsx";
// import CWTReportModal from "./NAYSA Cloud/Printing/CWTReport.jsx";
// import UniversalReportModal from "./NAYSA Cloud/Printing/UniversalReport"



// export const pageRegistry = {
//   // Accounts Receivable
//   SVI,
//   SOA,
//   ARCM,
//   ARDM,
//   CR,
//   AR,

//   // Accounts Payable
//   APV,
//   APCM,
//   APDM,
//   PCV,
//   CV,
//   CVHistory,

//   // Purchasing
//   PR,
//   PO,
//   JO,

//   // Inventory
//   MSRR,
//   MSIS,
//   MSST,
//   MSAJ,
//   MSRTV,

//   // General Ledger & Master Data
//   JV,
//   COAMast,
//   BankMast,
//   RCMast,
//   CustMast,
//   VendMast,

//   // Global & Queries
//   AllTranHistory,
//   ARINQ,
//   APINQ,
//   EWTINQ,
//   CWTINQ,
//   INTAXINQ,
//   OUTAXINQ,
//   CWTMonitoring,
//   CheckRL,
//   GLINQ,

//   // Global Reference
//   Company,
//   CutoffRef,
//   VATRef,
//   CurrRef,
//   DForexRef,
//   BranchRef,
//   BankRef,
//   UpdateUser,
//   UserAccessRights,
//   MasterAccessRights,
//   ATaxCode,

//   // Posting
//   PostSVI,
//   PostSOA,
//   PostARCM,
//   PostARDM,
//   PostCR,
//   PostAR,
//   PostCV,
//   PostPCV,
//   PostJV,
//   PostAPV,
//   PostAPCM,
//   PostAPDM,
//   PostMSRR,
//   PostMSRTV,
//   PostMSAJ,

//   // Printing
//   // GLReportModal,
//   // ARReportModal,
//   // APReportModal,
//   // VIReportModal,
//   // EWTReportModal,
//   // CWTReportModal,
//   // VOReportModal,

//   APReportModal: (props) => <UniversalReportModal {...props} module="AP" />,
//   VIReportModal: (props) => <UniversalReportModal {...props} module="VI" />,
//   EWTReportModal: (props) => <UniversalReportModal {...props} module="EWT" />,
  
//   ARReportModal: (props) => <UniversalReportModal {...props} module="AR" />,
//   VOReportModal: (props) => <UniversalReportModal {...props} module="VO" />,
//   CWTReportModal: (props) => <UniversalReportModal {...props} module="CWT" />,
  
//   GLReportModal: (props) => <UniversalReportModal {...props} module="GL" />,
// };

// import UniversalReportModal from "./NAYSA Cloud/Printing/UniversalReport"
import UniversalReportModal from "./NAYSA Cloud/Printing/UniversalReportModal.jsx";


// ... ensure all other components (SVI, SOA, etc.) are imported above ...

export const pageRegistry = {
  // Accounts Receivable
  SVI,
  SOA,
  ARCM,
  ARDM,
  CR,
  AR,

  // Accounts Payable
  APV,
  APCM,
  APDM,
  PCV,
  CV,
  CVHistory,

  // Purchasing
  PR,
  PRApprovalModal,
  PO,
  JO,

  //Sales
  SO,
  DR,

  // Inventory
  MSRR,
  MSIS,
  MSST,
  MSAJ,
  MSRTV,

  // General Ledger & Master Data
  JV,
  COAMast,FSConso,GLFSMatching,
  BankMast,
  RCMast,
  CustMast,
  VendMast,
  SLMast,

  // Global & Queries
  AllTranHistory,
  ARINQ,
  APINQ,
  EWTINQ,
  CWTINQ,
  INTAXINQ,
  OUTAXINQ,
  CWTMonitoring,
  CheckRL,
  GLINQ,
  AuditTrail,
  MSINQ,

  // Global Reference
  Company,
  CutoffRef,
  VATRef,
  CurrRef,
  DForexRef,
  BranchRef,
  BankRef,
  UpdateUser,
  UserAccessRights,
  MasterAccessRights,
  ATaxCode,
  BillCodeRef,

  // Posting
  PostSVI,
  PostSOA,
  PostARCM,
  PostARDM,
  PostCR,
  PostAR,
  PostCV,
  PostPCV,
  PostJV,
  PostAPV,
  PostAPCM,
  PostAPDM,
  PostMSRR,
  PostMSRTV,
  PostMSAJ,
  MonthendGLProcessingModal,
  YearendGLProcessingModal,


  //Matrix
  SalesPMCustomerItem,

  // Printing
  // These keys now point to the Universal component but inject the specific module prop
  APReportModal: (props) => <UniversalReportModal {...props} module="AP" />,
  VIReportModal: (props) => <UniversalReportModal {...props} module="VI" />,
  EWTReportModal: (props) => <UniversalReportModal {...props} module="EWT" />,
  
  ARReportModal: (props) => <UniversalReportModal {...props} module="AR" />,
  VOReportModal: (props) => <UniversalReportModal {...props} module="VO" />,
  CWTReportModal: (props) => <UniversalReportModal {...props} module="CWT" />,
  
  GLReportModal: (props) => <UniversalReportModal {...props} module="GL" />,
  BIRReportModal: (props) => <UniversalReportModal {...props} module="BIR" />,
};