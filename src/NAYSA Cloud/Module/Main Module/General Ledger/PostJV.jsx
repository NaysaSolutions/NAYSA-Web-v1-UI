import { useState, useEffect, useRef } from 'react';
import { fetchDataJson } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostJV = ({ isOpen, onClose, userCode }) => {
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
        const endpoint = "postingJV";
        const response = await fetchDataJson(endpoint);
        
        // Ensure we parse the result correctly as done in PostSVI
        const custData = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (custData.length === 0 && !alertFired.current) {
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
          setData(custData);
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

  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(selectedData, userPw, "JV", userCode, setLoading, onClose);
  };

  // Updated to match the reliable mapping structure in PostSVI[cite: 1]
  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };
    // Ensure these keys (jvNo, branchCode) match exactly what your SQL JSON returns
    const docNo = row.jvNo; 
    const branchCode = row.branchCode;
    return { docNo, branchCode };
  };

  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);
    
    if (!docNo || !branchCode) {
    useSwalValidationAlert({
      icon: "warning",
      title: "Navigation Error",
      message: `Required keys missing. DocNo: ${docNo}, Branch: ${branchCode}`
    });
    return;
  }

    const JV_VIEW_URL = "/page/JV";
  const url =
    `${window.location.origin}${JV_VIEW_URL}` +
    `?jvNo=${encodeURIComponent(docNo)}` +
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
          title="Post Journal Voucher"
          userPassword={userPassword}
          btnCaption="Okay"
          onClose={onClose}
          onPost={handlePost}
          onViewDocument={handleViewDocument}
          remoteLoading={loading}
        />
      )}
      {loading && <LoadingSpinner />}
    </>
  );
};

export default PostJV;