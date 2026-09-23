import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const POSTING_ENDPOINT = "postingPC";

const PostPC = ({ isOpen, onClose, userCode, invType = "FG" }) => {
  const normalizedInvType = String(invType || "FG").toUpperCase();
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadPostingData = async () => {
      if (!isOpen) return;

      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const response = await fetchDataJson(POSTING_ENDPOINT, {
          invType: normalizedInvType,
        });
        const postingRows = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (postingRows.length === 0) {
          if (!alertFired.current) {
            useSwalValidationAlert({
              icon: "info",
              title: `Finalize ${normalizedInvType} Physical Count`,
              message: "There are no Physical Count transactions to post.",
            });
            alertFired.current = true;
          }
          onClose?.();
          return;
        }

        const columnConfig = await useSelectedHSColConfig(POSTING_ENDPOINT);

        if (isMounted) {
          setData(postingRows);
          setColConfigData(columnConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching Physical Count posting data:", error);
        useSwalValidationAlert({
          icon: "error",
          title: "Physical Count Posting",
          message: "Unable to load Physical Count transactions for posting.",
        });
        onClose?.();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPostingData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, normalizedInvType, onClose]);

  const handlePost = async (selectedData, userPassword) => {
    await useHandlePostTran(
      selectedData,
      userPassword,
      "PC",
      userCode,
      setLoading,
      onClose,
    );
  };

  const handleViewDocument = (row) => {
    const docNo = row?.pcNo || row?.docNo;
    const branchCode = row?.branchCode;

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing Keys",
        message: "Cannot determine the Physical Count No. or Branch Code.",
      });
      return;
    }

    const url =
      `${window.location.origin}/tran/${normalizedInvType}PC` +
      `?pcNo=${encodeURIComponent(docNo)}` +
      `&branchCode=${encodeURIComponent(branchCode)}` +
      `&invType=${encodeURIComponent(normalizedInvType)}` +
      `&viewDocument=true`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title={`Finalize ${normalizedInvType} Physical Count`}
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

export const PostFGPC = (props) => <PostPC {...props} invType="FG" />;
export const PostRMPC = (props) => <PostPC {...props} invType="RM" />;
export const PostMSPC = (props) => <PostPC {...props} invType="MS" />;

export default PostPC;
