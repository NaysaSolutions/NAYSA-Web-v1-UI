import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";

const PostVEAJ = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadPostingRows = async () => {
      if (!isOpen) return;

      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const endpoint = "postingVEAJ";
        const response = await fetchDataJson(endpoint);
        let postingRows = [];

        if (Array.isArray(response?.data)) {
          postingRows = response.data?.[0]?.result
            ? JSON.parse(response.data[0].result || "[]")
            : response.data;
        }

        if (!postingRows.length) {
          if (!alertFired.current) {
            useSwalValidationAlert({
              icon: "info",
              title: "No Records Found",
              message: "There are no Vehicle Inventory Adjustment records to post.",
            });
            alertFired.current = true;
          }
          onClose?.();
          return;
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(postingRows);
          setColConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching VEAJ posting records:", error);
        useSwalValidationAlert({
          icon: "error",
          title: "Posting Load Error",
          message: "Unable to load Vehicle Inventory Adjustment records for posting.",
        });
        onClose?.();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPostingRows();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  const handlePost = async (selectedData, userPassword) => {
    await useHandlePostTran(
      selectedData,
      userPassword,
      "VEAJ",
      userCode,
      setLoading,
      onClose,
    );
  };

  const handleViewDocument = (row) => {
    const docNo = row?.adjNo;
    const branchCode = row?.branchCode;

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing Keys",
        message: "Cannot determine VEAJ No. or Branch Code.",
      });
      return;
    }

    const url =
      `${window.location.origin}/page/VEAJ` +
      `?adjNo=${encodeURIComponent(docNo)}` +
      `&branchCode=${encodeURIComponent(branchCode)}` +
      `&viewDocument=true`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title="Finalize Vehicle Inventory Adjustment"
          btnCaption="Okay"
          onClose={onClose}
          onPost={handlePost}
          onViewDocument={handleViewDocument}
          remoteLoading={loading}
        />
      )}

      {ReactDOM.createPortal(loading ? <LoadingSpinner /> : null, document.body)}
    </>
  );
};

export default PostVEAJ;
