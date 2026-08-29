import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { fetchDataJson } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostVERR = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);
  const [userPassword, setUserPassword] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isOpen) return;

      setLoading(true);
      alertFired.current = false;

      try {
        const endpoint = "postingVERR";
        const response = await fetchDataJson(endpoint);

        let rawData = [];

        if (Array.isArray(response?.data)) {
          // Case 1: JSON string response
          if (response.data?.[0]?.result) {
            try {
              rawData = JSON.parse(response.data[0].result || "[]").map((row) => ({
                ...row,
                groupId: row.verrId,
              }));
            } catch (err) {
              console.error("VERR posting JSON parse error:", err);
              rawData = [];
            }
          }
          // Case 2: direct SQL rows
          else {
            rawData = response.data;
          }
        }

        if (!rawData.length && !alertFired.current) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no Vehicle Receiving Reports available for posting.",
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
        console.error("Error fetching VERR posting records:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  // =========================================
  // POST SELECTED VERR
  // =========================================
  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(
      selectedData.map((row) => ({ ...row, groupId: row.verrId })),
      userPw,
      "VERR",
      userCode,
      setLoading,
      onClose
    );
  };

 const pickDocAndBranch = (row) => ({
  docNo: row?.rrNo || null,
  branchCode: row?.branchCode || null,
});

  // =========================================
  // VIEW DOCUMENT
  // =========================================
  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine VERR No. or Branch Code",
      });
      return;
    }

    const TRAN_VIEW_URL = "/page/VERR";

    const url =
      `${window.location.origin}${TRAN_VIEW_URL}` +
      `?rrNo=${encodeURIComponent(docNo)}` +
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
          title="Finalize Vehicle Receiving Report"
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
        document.body
      )}
    </>
  );
};

export default PostVERR;
