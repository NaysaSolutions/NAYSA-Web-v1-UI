import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostVESR = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);
  const [userPassword] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPostingRows = async () => {
      if (!isOpen) return;

      setLoading(true);
      alertFired.current = false;

      try {
        const endpoint = "postingVESR";
        const response = await fetchDataJson(endpoint);

        let rawData = [];

        if (Array.isArray(response?.data)) {
          if (response.data?.[0]?.result) {
            try {
              rawData = JSON.parse(response.data[0].result || "[]");
            } catch (err) {
              console.error("VESR posting JSON parse error:", err);
              rawData = [];
            }
          } else {
            rawData = response.data;
          }
        }

        if (!rawData.length && !alertFired.current) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no Vehicle Sales Returns available for posting.",
          });

          alertFired.current = true;
          onClose?.();
          return;
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(rawData);
          setcolConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching VESR posting records:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPostingRows();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(
      selectedData,
      userPw,
      "VESR",
      userCode,
      setLoading,
      onClose,
    );
  };

  const pickDocAndBranch = (row) => ({
    docNo: row?.srNo || row?.docNo || null,
    branchCode: row?.branchCode || null,
  });

  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine VESR No. or Branch Code",
      });
      return;
    }

    const TRAN_VIEW_URL = "/page/VESR";

    const url =
      `${window.location.origin}${TRAN_VIEW_URL}` +
      `?srNo=${encodeURIComponent(docNo)}` +
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
          title="Finalize Vehicle Sales Return"
          userPassword={userPassword}
          btnCaption="Okay"
          onClose={onClose}
          onPost={handlePost}
          onViewDocument={handleViewDocument}
          remoteLoading={loading}
        />
      )}

      {ReactDOM.createPortal(
        loading ? <LoadingSpinner /> : null,
        document.body,
      )}
    </>
  );
};

export default PostVESR;
