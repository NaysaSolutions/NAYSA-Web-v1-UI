import { useState, useEffect,useRef } from 'react';
import { fetchDataJson, postRequest } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import  GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';

const PostAPDM = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false); // controls modal display
  const alertFired = useRef(false);


  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isOpen) return;
      setLoading(true);
      alertFired.current = false; 

      try {
        const endpoint = "postingAPDM";
        const response = await fetchDataJson(endpoint);
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
          onClose();
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
  }, [isOpen]);




  const handlePost = async (selectedData) => {
    try {
      const payload = {
        json_data: {
          userCode: userCode,
          dt1: selectedData.map((item, index) => ({
            lnNo: String(index + 1),
            groupId: item,
          })),
        },
      };

      const response = await postRequest("finalizeAPDM", payload);

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

      onClose();
    } catch (error) {
      console.error("Error posting APDM:", error);
    }
  };

  return modalReady ? (
    <GlobalGLPostingModalv1 
      data={data} 
      colConfigData={colConfigData} 
      title="Post AP Debit Memo" 
      btnCaption="Confirm Post"
      onClose={onClose}
      onPost={handlePost} 
    />
  ) : null;
};

export default PostAPDM;

