import { useState, useEffect, useRef } from "react";
import { fetchDataJson } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior";
import ReactDOM from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const PostMSRR = ({ isOpen, onClose, userCode }) => {
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
        const endpoint = "/finalizeMSRR";
        const response = await fetchDataJson(endpoint);

        const rows = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

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

  const pickTranIdAndKeys = (row) => {
    if (!row) return { tranId: null, rrNo: null, branchCode: null };
    const tranId = row.rrId ?? row.rr_id ?? row.tranId ?? row.docId ?? row.rrNo ?? row.rr_no;
    const rrNo = row.rrNo ?? row.rr_no ?? tranId;
    const branchCode = row.branchCode ?? row.branch_code ?? null;
    return { tranId, rrNo, branchCode };
  };

  const postOne = async (tranId, mode = "Finalize") => {
    const res = await fetch(`${window.location.origin}/api/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tranId, mode, userCode }),
      credentials: "include",
    });

    const json = await res.json();
    if (!res.ok || json?.success === false) {
      throw new Error(json?.message || "Posting failed.");
    }
    return json;
  };

  const handlePost = async (selectedData) => {
    if (!selectedData || selectedData.length === 0) {
      useSwalValidationAlert({
        icon: "warning",
        title: "No Selection",
        message: "Please select at least one MSRR to post.",
      });
      return;
    }

    setLoading(true);
    try {
      for (const row of selectedData) {
        const { tranId } = pickTranIdAndKeys(row);
        if (!tranId) continue;
        await postOne(tranId, "Finalize");
      }
      onClose?.();
    } catch (e) {
      useSwalValidationAlert({
        icon: "error",
        title: "Posting Error",
        message: e?.message || "Failed to post MSRR.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (row) => {
    const { rrNo, branchCode } = pickTranIdAndKeys(row);

    if (!rrNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine MSRR keys for viewing.",
      });
      return;
    }

    const MSRR_VIEW_URL = "/tran-ms-msrrtran";
    const url =
      `${window.location.origin}${MSRR_VIEW_URL}` +
      `?rrNo=${encodeURIComponent(rrNo)}&branchCode=${encodeURIComponent(branchCode)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title="Post MS Receiving"
          userPassword={userPassword}
          btnCaption="Ok"
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

export default PostMSRR;
