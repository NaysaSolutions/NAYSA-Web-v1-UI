import { useState, useEffect, useRef } from 'react';
import { fetchDataJson, postRequest } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useAuth } from '@/NAYSA Cloud/Authentication/AuthContext.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const PostAPV = ({ isOpen = false, onClose }) => { 
  const { user } = useAuth();
  const userCode = user?.USER_CODE;
  
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const alertFired = useRef(false);

  // Debug logging
  console.log("PostAPV props - isOpen:", isOpen, "userCode:", userCode);

  useEffect(() => {
    let isMounted = true;

    // Reset states when modal opens
    if (isOpen) {
      setModalReady(false);
      setHasError(false);
      console.log("PostAPV useEffect - Modal opened");
    }

    // Don't proceed if modal is not open
    if (!isOpen) {
      console.log("PostAPV useEffect - Modal not open, skipping");
      return;
    }

    // Add validation for userCode
    if (!userCode) {
      console.error("userCode is undefined or null");
      useSwalValidationAlert({
        icon: "error",
        title: "Authentication Error",
        message: "User code is missing. Please ensure you are logged in.",
      });
      setHasError(true);
      setModalReady(true);
      return;
    }

    const fetchData = async () => {
      console.log("PostAPV fetchData - Starting data fetch");
      setLoading(true);
      alertFired.current = false; 
      setHasError(false);

      try {
        const endpoint = "postingAPV";
        console.log("PostAPV fetchData - Calling endpoint:", endpoint);
        const response = await fetchDataJson(endpoint);
        console.log("PostAPV fetchData - Response:", response);
        
        const custData = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        console.log("PostAPV fetchData - Parsed data:", custData);

        if (custData.length === 0 && !alertFired.current && isMounted) {
          useSwalValidationAlert({
            icon: "info",
            title: "No Records Found",
            message: "There are no records to display.",
          });
          alertFired.current = true; 
        }

        const colConfig = await useSelectedHSColConfig(endpoint);
        console.log("PostAPV fetchData - Column config:", colConfig);

        if (isMounted) {
          setData(custData);
          setcolConfigData(colConfig);
          setModalReady(true);
          console.log("PostAPV fetchData - Data set, modal ready");
        }
      } catch (error) {
        console.error("PostAPV fetchData - Error:", error);
        if (isMounted) {
          setHasError(true);
          setModalReady(true);
          useSwalValidationAlert({
            icon: "error",
            title: "Data Load Error",
            message: "Failed to load posting data. Please try again.",
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log("PostAPV fetchData - Loading complete");
        }
      }
    };

    fetchData();

    return () => {
      console.log("PostAPV useEffect - Cleanup");
      isMounted = false;
    };
  }, [isOpen, userCode]);

  const handlePost = async (selectedData) => {
    try {
      if (!userCode) {
        useSwalValidationAlert({
          icon: "error",
          title: "Authentication Error",
          message: "User code is required for posting.",
        });
        return;
      }

      const payload = {
        json_data: {
          userCode: userCode,
          dt1: selectedData.map((item, index) => ({
            lnNo: String(index + 1),
            groupId: item,
          })),
        },
      };

      console.log("PostAPV handlePost - Payload:", payload);
      const response = await postRequest("finalizeAPV", payload);

      if (response?.success) {
        const postedSummary = response.data[0]?.result || "No summary returned.";
        useSwalValidationAlert({
          icon: "info",
          title: "Posting Summary",
          message: postedSummary,
        });
        console.log("Finalize success:", response.data);
      } else {
        console.warn("Finalize failed:", response);
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error posting APV:", error);
    }
  };

  // Debug render conditions
  console.log("PostAPV render - isOpen:", isOpen, "modalReady:", modalReady, "hasError:", hasError);

  if (!isOpen) {
    console.log("PostAPV not rendering - isOpen is false");
    return null;
  }

  if (!modalReady && !hasError) {
    console.log("PostAPV not rendering - modal not ready and no error");
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white p-8 rounded-lg">
          <div className="flex flex-col items-center">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-blue-500 mb-4" />
            <p>Loading posting data...</p>
          </div>
        </div>
      </div>
    );
  }

  console.log("PostAPV rendering modal");
  return (
    <GlobalGLPostingModalv1 
      data={data} 
      colConfigData={colConfigData} 
      title="Post Accounts Payable Voucher" 
      btnCaption="Ok"
      onClose={onClose}
      onPost={handlePost} 
    />
  );
};

export default PostAPV;