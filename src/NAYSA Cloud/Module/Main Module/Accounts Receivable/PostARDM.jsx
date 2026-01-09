import { useState, useEffect,useRef } from 'react';
import { fetchDataJson, postRequest } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import  GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from '@/NAYSA Cloud/Global/behavior';
import { useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import ReactDOM from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';



const PostARDM = ({ isOpen, onClose,userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setcolConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false); // controls modal display
  const alertFired = useRef(false);
  const [userPassword, setUserPassword] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isOpen) return;
      setLoading(true);
      alertFired.current = false; 

      try {
        const endpoint = "postingARDM";
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




  const handlePost = async (selectedData, userPw) => {
    await useHandlePostTran(selectedData,userPw,"ARDM",userCode,setLoading,onClose)
  }


  
const pickDocAndBranch = (row) => {
  if (!row) return { docNo: null, branchCode: null };
  const docNo = row.ardmNo;
  const branchCode = row.branchCode;
  return { docNo, branchCode };
};


const handleViewDocument = (row) => {
  const { docNo, branchCode } = pickDocAndBranch(row, colConfigData);
  if (!docNo || !branchCode) {
    useSwalValidationAlert({
      icon: "warning",
      title: "Missing keys",
      message: "Cannot determine Document No Column Index"
    });
    return;
  }

  const SVI_VIEW_URL = "/tran-ar-ardmtran";
  const url =
    `${window.location.origin}${SVI_VIEW_URL}` +
    `?ardmNo=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}`;
    window.open(url, "_blank", "noopener,noreferrer");
};



return (
  <>
    {/* Mount the modal only when ready */}
    {modalReady && (
      <GlobalGLPostingModalv1
      data={data} 
      colConfigData={colConfigData} 
      title="Post AR Debit Memo" 
      userPassword ={userPassword}
      btnCaption="Ok"
      onClose={onClose}
      onPost={handlePost} 
      onViewDocument={handleViewDocument}
      remoteLoading={loading}
      />
    )}

    {/* Always allow the overlay to render while loading (no modalReady / isOpen gate) */}
    {ReactDOM.createPortal(
      loading ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center text-blue-600">
            <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mb-3" />
            <span className="text-sm font-medium tracking-wide">Please wait…</span>
          </div>
        </div>
      ) : null,
      document.body
    )}
  </>
);
};



export default PostARDM;

