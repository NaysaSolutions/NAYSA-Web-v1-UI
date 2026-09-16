import { useState, useEffect, useRef } from 'react';
import { fetchDataJson } from '../../../Configuration/BaseURL.jsx';
import { useSelectedHSColConfig } from '@/NAYSA Cloud/Global/selectedData';
import GlobalGLPostingModalv1 from "../../../Lookup/SearchGlobalGLPostingv1.jsx";
import { parseFormattedNumber, useSwalValidationAlert, useSwalInfoAlert } from '@/NAYSA Cloud/Global/behavior.jsx';
import { useFetchTranData, useHandlePostTran } from '@/NAYSA Cloud/Global/procedure';
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const PostSI = ({ isOpen, onClose, userCode }) => {
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
        const endpoint = "postingSI";
        const response = await fetchDataJson(endpoint);

        const siData = response?.data?.[0]?.result
          ? JSON.parse(response.data[0].result)
          : [];

        if (siData.length === 0 && !alertFired.current) {
          useSwalInfoAlert("No Transactions to Post", "There are no records to display.");
          alertFired.current = true;
          onClose?.();
        }

        const colConfig = await useSelectedHSColConfig(endpoint);

        if (isMounted) {
          setData(siData);
          setcolConfigData(colConfig);
          setModalReady(true);
        }
      } catch (error) {
        console.error("Error fetching SI posting data:", error);
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

  const getSiDocumentKeys = (row) => ({
    docNo: row?.siNo || row?.docNo || row?.documentNo || "",
    branchCode: row?.branchCode || row?.branch || "",
  });

  const getRowsNeedingPicking = (transaction) => {
    const siTranType = String(
      transaction?.siTranType || transaction?.sitranType || ""
    ).toUpperCase();

    if (siTranType !== "SI02") {
      return [];
    }

    return (transaction?.dt1 || []).filter((row) => {
      const rowStatus = String(row?.pickStat || row?.siStat || "").toUpperCase();
      const siQty = parseFormattedNumber(row?.siQuantity || 0) || 0;
      const pickedQty = parseFormattedNumber(row?.quantityPicked ?? row?.qtyPicked ?? 0) || 0;

      return rowStatus !== "X" && siQty > 0 && pickedQty < siQty;
    });
  };

  const validatePickingBeforePost = async (selectedData = []) => {
    const invalidDocs = [];

    for (const row of selectedData) {
      const { docNo, branchCode } = getSiDocumentKeys(row);

      if (!docNo || !branchCode) {
        continue;
      }

      const transaction = await useFetchTranData(docNo, branchCode, "SI", "siNo", "");
      const rowsNeedingPicking = getRowsNeedingPicking(transaction);

      if (rowsNeedingPicking.length > 0) {
        invalidDocs.push({
          docNo,
          rows: rowsNeedingPicking,
        });
      }
    }

    if (invalidDocs.length === 0) {
      return true;
    }

    const detailLines = invalidDocs.flatMap(({ docNo, rows }) =>
      rows.map((row) => {
        const lineNo = row?.lnNo || row?.lineNo || row?.ln || "";
        const itemCode = row?.itemCode ? ` - ${row.itemCode}` : "";
        return ` - SI No. ${docNo}${lineNo ? ` LN # ${lineNo}` : ""}${itemCode}`;
      })
    );

    useSwalValidationAlert({
      icon: "warning",
      title: "Picking Required",
      message: `The following SI detail(s) still need to be picked before posting:\n\n${detailLines.join("\n")}`,
    });

    return false;
  };

  const handlePost = async (selectedData, userPw) => {
    const isValidForPosting = await validatePickingBeforePost(selectedData);
    if (!isValidForPosting) {
      return { success: false, code: "PICKING_REQUIRED" };
    }

    await useHandlePostTran(selectedData, userPw, "SI", userCode, setLoading, onClose);
  };

  const pickDocAndBranch = (row) => {
    if (!row) return { docNo: null, branchCode: null };

    const { docNo, branchCode } = getSiDocumentKeys(row);

    return { docNo, branchCode };
  };

  const handleViewDocument = (row) => {
    const { docNo, branchCode } = pickDocAndBranch(row);

    if (!docNo || !branchCode) {
      useSwalValidationAlert({
        icon: "warning",
        title: "Missing keys",
        message: "Cannot determine Document No Column Index"
      });
      return;
    }

    const SI_VIEW_URL = "/page/SI";

    const url =
      `${window.location.origin}${SI_VIEW_URL}` +
      `?siNo=${encodeURIComponent(docNo)}` +
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
          title="Finalize Sales Invoice"
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

export default PostSI;
