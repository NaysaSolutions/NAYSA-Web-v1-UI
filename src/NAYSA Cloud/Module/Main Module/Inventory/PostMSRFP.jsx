import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostMSRFP = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [userPassword, setUserPassword] = useState(null);
  const alertFired = useRef(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isOpen) return;
      setLoading(true);
      setModalReady(false);
      alertFired.current = false;
      try {
        const response = await fetchDataJson("postingMSRFP");
        const rows = typeof response?.data?.[0]?.result === "string"
          ? JSON.parse(response.data[0].result || "[]")
          : Array.isArray(response?.data) ? response.data : [];
        if (!rows.length) {
          useSwalValidationAlert({ icon: "info", title: "No Transactions to Finalize", message: "There are no open MSRFP records to display." });
          alertFired.current = true;
          onClose?.();
          return;
        }
        const columns = await useSelectedHSColConfig("postingMSRFP");
        if (mounted) {
          setData(rows);
          setColConfigData(columns);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Unable to load MSRFP finalization records.", error);
        if (!alertFired.current) useSwalValidationAlert({ icon: "error", title: "MSRFP Finalization", message: "Unable to load transactions for finalization." });
        onClose?.();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [isOpen, onClose]);

  const handlePost = async (selectedRows, password) => {
    setUserPassword(password || null);
    await useHandlePostTran(selectedRows, password, "MSRFP", userCode, setLoading, onClose);
  };

  const handleViewDocument = (row) => {
    const docNo = row?.msrfpNo || row?.rfpNo || row?.rfp_no || row?.RFP_NO || row?.documentNo || row?.docNo;
    const branchCode = row?.branchCode || row?.branch_code || row?.BRANCH_CODE || row?.bCode || row?.BC;
    if (!docNo || !branchCode) {
      useSwalValidationAlert({ icon: "warning", title: "Missing Document Information", message: "Cannot determine the MSRFP number or branch." });
      return;
    }
    const url = `${window.location.origin}/page/MSRFP?rfpNo=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}&viewDocument=true`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return <>
    {modalReady && <GlobalGLPostingModalv1 data={data} colConfigData={colConfigData} title="Finalize MS Return from Production" userPassword={userPassword} btnCaption="Finalize" onClose={onClose} onPost={handlePost} onViewDocument={handleViewDocument} remoteLoading={loading} />}
    {ReactDOM.createPortal(loading ? <LoadingSpinner /> : null, document.body)}
  </>;
};

export default PostMSRFP;
