import { useState, useEffect, useRef } from "react";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior";
import { useHandlePostTran } from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import ReactDOM from "react-dom";

/*
================================================================================
POST FARR WORKFLOW
================================================================================
1. Modal opens from FARR transaction page.
2. System loads open Fixed Asset Receiving records from endpoint: postingFARR.
3. System loads table column setup from hs_colconfig using endpoint postingFARR.
4. User selects one or more FARR records.
5. User clicks Okay/Post.
6. System calls global posting function with doc code FARR.
7. Posting procedure finalizes selected records and updates FG inventory movement.
================================================================================
*/

const PostFARR = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [userPassword, setUserPassword] = useState(null);

  const alertFired = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Load records for posting
  |--------------------------------------------------------------------------
  | endpoint: postingFARR
  | This should call sproc_PHP_FARR @mode = 'Posting'
  */
  useEffect(() => {
    let isMounted = true;

    const fetchPostingData = async () => {
      if (!isOpen) return;

      setLoading(true);
      setModalReady(false);
      alertFired.current = false;

      try {
        const endpoint = "postingFARR";
        const response = await fetchDataJson(endpoint);

        const postingRows = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (postingRows.length === 0 && !alertFired.current) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no Fixed Asset Receiving records to post.",
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
        console.error("Error fetching FARR posting data:", error);

        useSwalValidationAlert({
          icon: "error",
          title: "Posting Load Error",
          message: "Unable to load Fixed Asset Receiving records for posting.",
        });

        onClose?.();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPostingData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  /*
  |--------------------------------------------------------------------------
  | Post selected records
  |--------------------------------------------------------------------------
  | useHandlePostTran will call posting API/procedure using doc code FARR.
  */
  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(
      selectedData,
      userPw,
      "FARR",
      userCode,
      setLoading,
      onClose
    );
  };

  /*
  |--------------------------------------------------------------------------
  | View document helper
  |--------------------------------------------------------------------------
  | Accepts both possible key names:
  | - farrNo from FARR posting endpoint
  | - docNo from generic posting endpoint
  */
  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };

    const docNo = row.farrNo || row.docNo || row.FARRNo || row.FARR_NO || null;
    const branchCode = row.branchCode || row.branch_code || null;

    return { docNo, branchCode };
  };

  /*
  |--------------------------------------------------------------------------
  | Open FARR document in new tab
  |--------------------------------------------------------------------------
  | Make sure this route matches your React Router path.
  */
  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing Keys",
        message: "Cannot determine FARR No. or Branch Code.",
      });
      return;
    }

    const FARR_VIEW_URL = "/page/FARR";
    const url =
      `${window.location.origin}${FARR_VIEW_URL}` +
      `?farrNo=${encodeURIComponent(docNo)}` +
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
          title="Post Fixed Asset Receiving"
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

export default PostFARR;
