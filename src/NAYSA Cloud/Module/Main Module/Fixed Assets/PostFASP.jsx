import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const PostFASP = ({ isOpen, onClose, userCode = "" }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchPostingData = async () => {
      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const endpoint = "postingFASP";
        const response = await fetchDataJson(endpoint);

        const postingRows = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (postingRows.length === 0 && !alertFired.current) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no FA Split records to post.",
          });

          alertFired.current = true;
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
        console.error("Error fetching FASP posting data:", error);

        useSwalValidationAlert({
          icon: "error",
          title: "Posting Load Error",
          message: "Unable to load FA Split records for posting.",
        });

        onClose?.();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPostingData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(
      selectedData,
      userPw,
      "FASP",
      userCode,
      setLoading,
      onClose
    );
  };

  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };

    const docNo = row.faspNo || row.docNo || row.FASPNo || row.FASP_NO || null;
    const branchCode = row.branchCode || row.branch_code || null;

    return { docNo, branchCode };
  };

  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing Keys",
        message: "Cannot determine FASP No. or Branch Code.",
      });
      return;
    }

    const VIEW_URL = "/page/FASP";
    const url =
      `${window.location.origin}${VIEW_URL}` +
      `?faspNo=${encodeURIComponent(docNo)}` +
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
          title="Post FA Split"
          btnCaption="Okay"
          onClose={onClose}
          onPost={handlePost}
          onViewDocument={handleViewDocument}
          remoteLoading={loading}
        />
      )}

      {ReactDOM.createPortal(
        loading ? <LoadingSpinner /> : null,
        document.body
      )}
    </>
  );
};

export default PostFASP;
