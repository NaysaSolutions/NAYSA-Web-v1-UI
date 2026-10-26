import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import GlobalGLPostingModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalGLPostingv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData.js";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure.js";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const fallbackColumns = [
  { key: "branchName", label: "Branch Name", renderType: "text" },
  { key: "docNo", label: "Backload No.", renderType: "text" },
  { key: "docDate", label: "Backload Date", renderType: "date" },
  { key: "transactionType", label: "Transaction Type", renderType: "text" },
  { key: "projCode", label: "Project Code", renderType: "text" },
  { key: "projName", label: "Project Name", renderType: "text" },
  { key: "custName", label: "Customer Name", renderType: "text" },
  { key: "whCode", label: "Warehouse", renderType: "text" },
  { key: "locCode", label: "Location", renderType: "text" },
  { key: "referenceNo", label: "Reference No.", renderType: "text" },
  { key: "totalAmount", label: "Total Amount", classNames: "text-right", renderType: "number", renderFormat: "2" },
];

const FinalizeProjectMaterialBackload = ({ isOpen, onClose, userCode }) => {
  const [rows,setRows]=useState([]),[columns,setColumns]=useState([]),[loading,setLoading]=useState(false),[ready,setReady]=useState(false);
  useEffect(() => {
    if (!isOpen) return;
    let alive=true; setLoading(true); setReady(false);
    Promise.all([apiClient.get("/finalizingProjectMaterialBackload"),useSelectedHSColConfig("finalizingProjectMaterialBackload",userCode || "")])
      .then(([response,config]) => {
        const raw=response?.data?.data?.[0]?.result; const data=raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
        if (!data.length) { useSwalValidationAlert({icon:"info",title:"No Transactions to Finalize",message:"There are no open Project Material Backload records."}); onClose?.(); return; }
        if (alive) { setRows(data.map((row,i)=>({...row,lineNo:i+1,lnNo:i+1,documentID:row.groupId}))); setColumns(config?.length ? config : fallbackColumns); setReady(true); }
      }).catch((error)=>useSwalValidationAlert({icon:"error",title:"Finalization Load Error",message:error?.response?.data?.details || error.message})).finally(()=>alive && setLoading(false));
    return ()=>{alive=false;};
  },[isOpen,onClose,userCode]);
  const finalize=async(selectedRows,password)=>{
    const result=await useHandlePostTran(selectedRows,password,"ProjectMaterialBackload",userCode,setLoading,onClose);
    if(result?.success) window.dispatchEvent(new CustomEvent("project-backload-finalized"));
  };
  if(!isOpen) return null;
  return <>{ready && <GlobalGLPostingModalv1 data={rows} colConfigData={columns} title="Finalize Project Material Backload" btnCaption="Finalize" onClose={onClose} onPost={finalize} remoteLoading={loading}/>} {ReactDOM.createPortal(loading ? <LoadingSpinner/> : null,document.body)}</>;
};
export default FinalizeProjectMaterialBackload;
