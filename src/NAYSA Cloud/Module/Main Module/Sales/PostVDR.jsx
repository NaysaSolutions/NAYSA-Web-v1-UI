import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalInfoAlert, useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostVDR = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const alertFired = useRef(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isOpen) return;
      setLoading(true);
      setReady(false);
      alertFired.current = false;
      try {
        const endpoint = "postingVDR";
        const response = await fetchDataJson(endpoint);
        const rows = response?.data?.[0]?.result ? JSON.parse(response.data[0].result) : response?.data || [];
        if (!rows.length) {
          if (!alertFired.current) useSwalInfoAlert("No Records Found", "There are no Vehicle Delivery Receipts to finalize.");
          alertFired.current = true;
          onClose?.();
          return;
        }
        const config = await useSelectedHSColConfig(endpoint);
        if (mounted) {
          setData(rows);
          setColumns(config);
          setReady(true);
        }
      } catch (error) {
        console.error("Error fetching VDR posting data:", error);
        useSwalValidationAlert({ icon: "error", title: "Posting Load Error", message: "Unable to load Vehicle Delivery Receipt records for posting." });
        onClose?.();
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [isOpen, onClose]);

  const handlePost = async (selectedData, password) => {
    await useHandlePostTran(selectedData, password, "VDR", userCode, setLoading, onClose);
  };

  const handleViewDocument = (row) => {
    const docNo = row?.docNo;
    const branchCode = row?.branchCode;
    if (!docNo || !branchCode) return;
    window.open(`${window.location.origin}/page/VDR?vdrNo=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}&viewDocument=true`, "_blank", "noopener,noreferrer");
  };

  return <>
    {ready && <GlobalGLPostingModalv1 data={data} colConfigData={columns} title="Finalize Vehicle Delivery Receipt" btnCaption="Okay" onClose={onClose} onPost={handlePost} onViewDocument={handleViewDocument} remoteLoading={loading} />}
    {ReactDOM.createPortal(loading ? <LoadingSpinner /> : null, document.body)}
  </>;
};

export default PostVDR;
