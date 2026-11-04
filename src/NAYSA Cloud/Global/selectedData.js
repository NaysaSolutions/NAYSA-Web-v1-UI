import { apiClient, fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
import { formatNumber } from '@/NAYSA Cloud/Global/behavior';
import { parseFormattedNumber } from '@/NAYSA Cloud/Global/behavior';
import Swal from 'sweetalert2';

const defaultItemConversionCache = new Map();

export const useSelectedDefaultItemConversion = async ({
  invType,
  itemCode,
  baseUomCode,
  quantity = 0,
}) => {
  const fallback = {
    convertedUomCode: baseUomCode || "",
    convertedQuantity: Number(quantity) || 0,
    conversionFactor: 1,
    autoSelected: false,
  };

  if (!invType || !itemCode || !baseUomCode || !["FG", "RM", "MS"].includes(String(invType).toUpperCase())) {
    return fallback;
  }

  try {
    const cacheKey = `${String(invType).toUpperCase()}|${String(itemCode).toUpperCase()}`;
    let rows = defaultItemConversionCache.get(cacheKey);
    if (!rows) {
      const response = await apiClient.get("/itemConversion", {
        params: { invType, itemCode },
      });
      const rawResult = response?.data?.data?.[0]?.result;
      rows = typeof rawResult === "string"
        ? JSON.parse(rawResult || "[]")
        : Array.isArray(response?.data?.data) ? response.data.data : [];
      defaultItemConversionCache.set(cacheKey, rows);
    }
    const sequenceTwo = rows.find(
      (row) => Number(row?.seqNo ?? row?.SEQ_NO) === 2 && String(row?.active ?? row?.ACTIVE ?? "Y").toUpperCase() === "Y",
    );

    if (!sequenceTwo?.uomCode) return fallback;

    const conversionFactor =
      parseFormattedNumber(sequenceTwo?.convQty) ||
      (parseFormattedNumber(sequenceTwo?.baseQtyRatio) /
        (parseFormattedNumber(sequenceTwo?.uomQtyRatio) || 1)) ||
      1;

    return {
      convertedUomCode: sequenceTwo.uomCode,
      convertedQuantity: (Number(quantity) || 0) / conversionFactor,
      conversionFactor,
      autoSelected: true,
    };
  } catch (error) {
    console.warn("Unable to apply the default item conversion:", error);
    return fallback;
  }
};





export const useSelectedHSColConfig = async (endpoint,userCode, all = "") => {
  try {
    const payload ={
      json_data :{
      endpoint,userCode,all
    }
  }

    const response = await fetchData("getHSColConfig", { json_data: JSON.stringify(payload) });
    
    if (response?.success && response.data?.[0]?.result) {
      return JSON.parse(response.data[0].result);
    }
    throw new Error(response?.message || "No getHSColConfig found.");
  } catch (error) {
    console.error("Error in getHSColConfig:", error);
    Swal.fire({
      icon: "error",
      title: "Fetch Failed",
      text: error.message || "Unknown error occurred",
      confirmButtonColor: "#3085d6",
    });
    return null;
  }
};






export const useSelectedOpenARBalance = async (glData,transactionType) => {
  try {
    const payload = { json_data: glData,
                      filterTranType: transactionType
     };

    const response = await fetchData("getSelectedARBalance", { json_data: JSON.stringify(payload) } );

    if (response?.success && response.data?.[0]?.result) {
      return JSON.parse(response.data[0].result);
    }

    throw new Error(response?.message || "No AR entries found.");
  } catch (error) {
    console.error("Error in useSelectedOpenARBalance:", error);
    Swal.fire({
      icon: "error",
      title: "Fetch Failed",
      text: error.message || "Unknown error occurred",
      confirmButtonColor: "#3085d6",
    });
    return null;
  }
};






export const useSelectedGLPosting = async (docCode) => {
  try {
    const response = await fetchData("posting"+docCode);
    console.log(response)

    if (response?.success && response.data?.[0]?.result) {
      return JSON.parse(response.data[0].result);
    }

    throw new Error(response?.message || "No records found.");
  } catch (error) {
    console.error("Error in useSelectedGLPosting:", error);
    Swal.fire({
      icon: "error",
      title: "Fetch Failed",
      text: error.message || "Unknown error occurred",
      confirmButtonColor: "#3085d6",
    });
    return null;
  }
};



export const useSelectedOpenAPBalance = async (glData,transactionType) => {
  try {
    const payload = { json_data: glData,
                      filterTranType: transactionType
     };

     console.log(JSON.stringify(payload))
    const response = await fetchData("getSelectedAPBalance", { json_data: JSON.stringify(payload) } );

    if (response?.success && response.data?.[0]?.result) {
      return JSON.parse(response.data[0].result);
    }

    throw new Error(response?.message || "No AP entries found.");
  } catch (error) {
    console.error("Error in useSelectedOpenAPBalance:", error);
    Swal.fire({
      icon: "error",
      title: "Fetch Failed",
      text: error.message || "Unknown error occurred",
      confirmButtonColor: "#3085d6",
    });
    return null;
  }
};






export const useSelectedIteBranchBalance = async (data) => {
  try {
    const payload = { json_data: data };

    const response = await postRequest("getBranchItemBalance", JSON.stringify(payload));
    const rawResult = response?.data?.[0]?.result;
    const message = String(response?.message || "").toLowerCase();

    if (!response || message.includes("no records")) {
      return [];
    }

    if (response?.status === "success") {
      if (!rawResult) return [];

      const parsed = typeof rawResult === "string" ? JSON.parse(rawResult) : rawResult;
      return Array.isArray(parsed) ? parsed : [];
    }

    if (!response?.data?.length) {
      return [];
    }

    throw new Error(response?.message || "No records found.");
  } catch (error) {
    if (String(error?.message || "").toLowerCase().includes("no records")) {
      return [];
    }

    console.error("Error in GetItemBranchBalance:", error);
    Swal.fire({
      icon: "error",
      title: "Fetch Failed",
      text: error.message || "Unknown error occurred",
      confirmButtonColor: "#3085d6",
    });
    return null;
  }
};
