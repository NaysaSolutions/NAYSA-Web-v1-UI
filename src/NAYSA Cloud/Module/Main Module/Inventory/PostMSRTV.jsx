import { useState, useEffect, useRef } from "react";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const PostMSRTV = ({ isOpen, onClose, userCode }) => {
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
        const endpoint = "postingMSRTV";
        const response = await fetchDataJson(endpoint);
        // const rows = Array.isArray(response?.data)
        // ? response.data
        // : response?.data?.[0]?.result
        //   ? JSON.parse(response.data[0].result)
        //   : [];
        const rows = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];
          
          console.log("Fetched MSRTV Data:", rows);

        if (rows.length === 0 && !alertFired.current) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no records to display.",
          });
          alertFired.current = true;
          onClose?.();
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(rows);
          setcolConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      setModalReady(false);
    };
  }, [isOpen, onClose]);

  const pickDocAndBranch = (row) => {
  if (!row) return { docNo: null, branchCode: null };
  const docNo = row.rtvNo;
  const branchCode = row.branchCode;
  return { docNo, branchCode };
};


  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(selectedData, userPw, "MSRTV", userCode, setLoading, onClose);
  };

  const handleViewDocument = (row) => {
    const { rtvNo, branchCode } = pickDocAndBranch(row);

    if (!rtvNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine MSRTV keys for viewing.",
      });
      return;
    }

    const MSRTV_VIEW_URL = "/inventory/transactions/msrtv";
    const url =
      `${window.location.origin}${MSRTV_VIEW_URL}` +
      `?rtvNo=${encodeURIComponent(rtvNo)}&branchCode=${encodeURIComponent(branchCode)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title="Post MS Return to Vendor"
          userPassword={userPassword}
          btnCaption="Okay"
          onClose={onClose}
          onPost={handlePost}
          onViewDocument={handleViewDocument}
          remoteLoading={loading}
        />
      )}

      {ReactDOM.createPortal(
        loading ? (
          <div className="global-tran-spinner-main-div-ui">
            <div className="global-tran-spinner-sub-div-ui">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-2" />
              <p>Please wait...</p>
            </div>
          </div>
        ) : null,
        document.body
      )}
    </>
  );
};

export default PostMSRTV;
