import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { fetchDataJson, postRequest } from "../../../Configuration/BaseURL.jsx";
import { useSelectedHSColConfig } from "@/NAYSA Cloud/Global/selectedData";
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { useSwalValidationAlert } from "@/NAYSA Cloud/Global/behavior";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const POSTING_AUTH_FLAG = "naysa_posting_auth_in_progress";

const getVESTPostingRows = (response) => {
  const body = response?.data ?? response;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (body && typeof body === "object") return [body];

  return [];
};

const getVESTPostingResult = (response) => {
  const rows = getVESTPostingRows(response);

  return (
    rows.find(
      (row) =>
        row &&
        (Object.prototype.hasOwnProperty.call(row, "result") ||
          Object.prototype.hasOwnProperty.call(row, "errorMsg") ||
          Object.prototype.hasOwnProperty.call(row, "errorCount")),
    ) ||
    rows[0] ||
    {}
  );
};

const PostVEST = ({ isOpen, onClose, userCode }) => {
  const [data, setData] = useState([]);
  const [colConfigData, setColConfigData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalReady, setModalReady] = useState(false);
  const alertFired = useRef(false);
  const [userPassword] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    try {
      sessionStorage.setItem(POSTING_AUTH_FLAG, "1");
    } catch {}

    return () => {
      try {
        sessionStorage.removeItem(POSTING_AUTH_FLAG);
      } catch {}
    };
  }, [isOpen]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!isOpen) return;

      setLoading(true);
      alertFired.current = false;

      try {
        const endpoint = "postingVEST";
        const response = await fetchDataJson(endpoint);
        const postingData = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (postingData.length === 0 && !alertFired.current) {
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
          setData(postingData);
          setColConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching VEST posting data:", error);
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

  const handlePost = async (selectedData, userPw) => {
    const selectedRows = Array.isArray(selectedData)
      ? selectedData
      : Array.isArray(selectedData?.records)
        ? selectedData.records
        : selectedData
          ? [selectedData]
          : [];

    const dt1 = selectedRows
      .map((row, index) => ({
        lnNo: index + 1,
        groupId:
          row?.groupId ||
          row?.vestId ||
          row?.documentID ||
          row?.docId ||
          "",
      }))
      .filter((row) => row.groupId);

    if (dt1.length === 0) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Posting failed",
        message: "No valid VEST transaction was selected for posting.",
      });
      return false;
    }

    setLoading(true);

    try {
      const response = await postRequest("finalizeVEST", {
        userCode,
        userPassword: userPw,
        json_data: {
          userCode,
          dt1,
        },
      });
      const result = getVESTPostingResult(response);
      const errorCount = Number(result?.errorCount || 0);
      const errorMessage = String(
        result?.errorMsg || (errorCount > 0 ? result?.result : "") || "",
      ).trim();

      if (errorCount > 0 || errorMessage) {
        useSwalValidationAlert({
          icon: "error",
          title: "Posting failed",
          message: errorMessage || "VEST finalization failed.",
        });
        return false;
      }

      useSwalValidationAlert({
        icon: "success",
        title: "Posting successful",
        message:
          String(result?.result || "").trim() ||
          "The selected VEST transaction was posted successfully.",
      });
      onClose?.();
      return true;
    } catch (error) {
      const serverResult = getVESTPostingResult(error?.response?.data);
      const message = String(
        serverResult?.errorMsg ||
          serverResult?.result ||
          error?.response?.data?.message ||
          error?.message ||
          "Unable to finalize VEST.",
      ).trim();

      console.error("VEST finalize error:", error);
      useSwalValidationAlert({
        icon: "error",
        title: "Posting failed",
        message,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (row) => {
    const docNo = row?.vestNo;
    const branchCode = row?.branchCode;

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine Document No Column Index",
      });
      return;
    }

    const url =
      `${window.location.origin}/page/VEST` +
      `?vestNo=${encodeURIComponent(docNo)}&branchCode=${encodeURIComponent(branchCode)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {modalReady && (
        <GlobalGLPostingModalv1
          data={data}
          colConfigData={colConfigData}
          title="Finalize VE Stock Transfer"
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

export default PostVEST;
