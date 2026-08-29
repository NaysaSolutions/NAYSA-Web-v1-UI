import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostVERTV = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);

  useEffect(() => {
    let mounted = true;
    if (!isOpen) return undefined;
    setLoading(true);
    alertFired.current = false;
    (async () => {
      try {
        const endpoint = "postingVERTV";
        const response = await fetchDataJson(endpoint);
        let rows = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result || "[]")
          : (Array.isArray(response?.data) ? response.data : []);
        if (!rows.length) {
          if (!alertFired.current) useSwalValidationAlert({ icon: "info", title: "No Records Found", message: "There are no Vehicle Returns to Vendor available for posting." });
          alertFired.current = true;
          onClose?.();
          return;
        }
        const columns = await useSelectedHSColConfig(endpoint);
        if (mounted) { setData(rows); setColConfigData(columns); setModalReady(true); }
      } catch (error) {
        console.error("Error fetching VERTV posting records:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; setModalReady(false); };
  }, [isOpen, onClose]);

  const handlePost = async (selectedData, userPw) =>
    useHandlePostTran(selectedData, userPw, "VERTV", userCode, setLoading, onClose);

  const handleViewDocument = (row) => {
    const docNo = row?.vertvNo || row?.rtvNo || row?.docNo;
    const branchCode = row?.branchCode;
    if (!docNo || !branchCode) {
      useSwalValidationAlert({ icon: "warning", title: "Missing keys", message: "Cannot determine VERTV No. or Branch Code" });
      return;
    }
    window.open(`${window.location.origin}/page/VERTV?vertvNo=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}&viewDocument=true`, "_blank", "noopener,noreferrer");
  };

  return <>
    {modalReady && <GlobalGLPostingModalv1 data={data} colConfigData={colConfigData} title="Finalize Vehicle Return to Vendor" btnCaption="Okay" onClose={onClose} onPost={handlePost} onViewDocument={handleViewDocument} remoteLoading={loading} />}
    {ReactDOM.createPortal(loading ? <LoadingSpinner /> : null, document.body)}
  </>;
};

export default PostVERTV;
