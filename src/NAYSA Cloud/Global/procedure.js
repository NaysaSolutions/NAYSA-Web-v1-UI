import { fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
import { formatNumber } from '@/NAYSA Cloud/Global/behavior';
import { useSwalValidationAlert,} from '@/NAYSA Cloud/Global/behavior';
import Swal from 'sweetalert2';
import { parseFormattedNumber } from './behavior';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";





export const useGenerateGLEntries = async (docCode, glData) => {
  const payload = { json_data: glData };

    console.log("Payload for GL generation:", JSON.stringify(payload, null, 2));

  try {
    const response = await postRequest("generateGL" + docCode, JSON.stringify(payload));
   
    //console.log("Raw response from generateGL API:", response);

       const returnedErrorCount = response.data[0]['errorCount'];
       const returnedErrorMsg = response.data[0]['errorMsg'];
        if (returnedErrorMsg && returnedErrorCount >0) {
            useSwalValidationAlert({
                icon: "error",
                title: "Generate GL Failed",
                message: returnedErrorMsg || "An error occurred while saving the Transaction"
                        });    
                return null;
          }

    if (response?.status === 'success' && Array.isArray(response.data) && response.data.length > 0) {
      let glEntries;

      try {
        if (response.data[0] && response.data[0].result) {
          glEntries = JSON.parse(response.data[0].result);
          if (!Array.isArray(glEntries)) {
            glEntries = [glEntries];
          }
        } else {
          glEntries = [];
          console.warn("API response data[0].result was null or undefined for GL entries.");
        }
      } catch (parseError) {
        console.error("Error parsing GL entries:", parseError);
        throw new Error("Failed to parse GL entries due to malformed JSON.");
      }

      const transformedEntries = glEntries
        .filter(entry => entry !== null && typeof entry === 'object')
        .map((entry, idx) => ({
          id: idx + 1,
          acctCode: entry.acctCode || "",
          rcCode: entry.rcCode || "",
          sltypeCode: entry.sltypeCode || "",
          slCode: entry.slCode || "",
          particular: entry.particular || "",
          vatCode: entry.vatCode || "",
          vatName: entry.vatName || "",
          atcCode: entry.atcCode || "",
          atcName: entry.atcName || "",
          debit: entry.debit ? formatNumber(entry.debit) : "0.00",
          credit: entry.credit ? formatNumber(entry.credit) : "0.00",
          debitFx1: entry.debit ? formatNumber(entry.debitFx1) : "0.00",
          creditFx1: entry.credit ? formatNumber(entry.creditFx1) : "0.00",
          debitFx2: entry.debit ? formatNumber(entry.debitFx2) : "0.00",
          creditFx2: entry.credit ? formatNumber(entry.creditFx2) : "0.00",
          slRefNo: entry.slRefNo || "",
          slRefDate: entry.slRefDate || "",
          remarks: entry.remarks || "",
          dt1Lineno: entry.dt1Lineno || ""
        }));

      return transformedEntries;
    } else {
      let errorMessage = response?.message || "Failed to generate GL entries. Unexpected API response format.";
      if (response?.status === 'success' && (!Array.isArray(response.data) || response.data.length === 0)) {
         errorMessage = "API returned success but no data for GL entries.";
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error("Error in generateGLEntries:", error);
    Swal.fire({
      icon: 'error',
      title: 'Generation Failed',
      text: error.message || 'Unknown error occurred',
      confirmButtonColor: '#3085d6',
    });
    return null;
  }
};





// Add idKey and noKey as parameters
export const useTransactionUpsert = async (docCode, glData, updateState, idKey, noKey) => {
    try {
        updateState({ isLoading: true });

        const payload = { json_data: glData };

        console.log("Sending data to API for Upsert:", JSON.stringify(payload, null, 2));

        const response = await postRequest("upsert" + docCode, JSON.stringify(payload));

        if (response?.status === 'success') {
           
             if (response.data && response.data.length > 0) {
                const returnedId = response.data[0][idKey];
                const returnedNo = response.data[0][noKey];
                const returnedErrorCount = response.data[0]['errorCount'];
                const returnedErrorMsg = response.data[0]['errorMsg'];

                const wasNewDocCreated = !glData[idKey] && !!returnedId;
                if (returnedErrorMsg && returnedErrorCount >0) {
                  useSwalValidationAlert({
                        icon: "error",
                        title: "Save Failed",
                        message: returnedErrorMsg || "An error occurred while saving the Transaction"
                      });    
                  return null;
                }

                if (returnedNo && returnedId) {
                    const updates = {
                        documentID: returnedId,
                        documentNo: returnedNo,
                        isDocNoDisabled: wasNewDocCreated
                    };

                    updateState(updates);
                    console.log(`Updated ${idKey}: ${returnedId}, ${noKey}: ${returnedNo} in state.`);
                } else {
                    console.warn(`Upsert successful, but returned ${idKey} or ${noKey} was null/undefined.`);
                }
            } else {
                console.warn("Upsert successful, but no document ID/No returned from SPROC data.");
            }

            
            return response;
        } else {
              Swal.fire({
                  icon: 'error',
                  title: 'Save Failed',
                  text: response.details || response.message || 'An error occurred while saving the Transaction',
                });
            // console.error("❌ SQL Error:", response?.error || response?.message);
            // throw new Error(response?.error || response?.message || 'Failed to save Transaction');
        }
    } catch (error) {
        console.error("Error saving Transaction:", error);
        Swal.fire({
            icon: 'error',
            title: 'Save Failed',
            text: error.message || 'An error occurred while saving the Transaction',
        });
        return null;
    } finally {
        updateState({
            isSaveDisabled: false,
            isResetDisabled: false,
            isLoading: false
        });
    }
};






// global update of GL Entries per record
export const useUpdateRowGLEntries = async (row, field, value, custVendCode,docCode) => {
  const payload = {
    json_data: {
      acctCode: field === "acctCode" ? value.acctCode : row.acctCode,
      slCode: field === "slCode" ? value.slCode : row.slCode,
      rcCode: field === "rcCode" ? value.rcCode : row.rcCode,
      sltypeCode: field === "slCode" ? value.sltypeCode : row.sltypeCode, 
      vatCode: field === "vatCode" ? value.vatCode : row.vatCode, 
      vatName: row.vatName,
      atcCode: field === "atcCode" ? value.atcCode : row.atcCode,  
      atcName: row.atcName,
      atcName: row.atcName,
      custVendCode:custVendCode,
      docCode: docCode
    }
  };


  try {
    const response = await postRequest("lookupGL", JSON.stringify(payload));

    // ✅ Match actual API format
    if (!response || response.status !== "success" || !Array.isArray(response.data)) {
      console.warn("Invalid API response structure", response);
      return [];
    }



    // ✅ Parse the JSON string inside result
    let parsedData;
    try {
      parsedData = JSON.parse(response.data[0]?.result || "[]");
    } catch (parseError) {
      console.error("Error parsing response data:", parseError);
      return [];
    }

    // ✅ Always return array (even if backend sends a single object)
     return Array.isArray(parsedData) && parsedData.length > 0
      ? parsedData[0]
      : null;

  } catch (error) {
    console.error("Error fetching LookupGL:", error);
    return [];
  }
};






// global update of GL Entries per record
export const useUpdateRowEditEntries = async (row, field, value,currCode,currRate,docDate) => {
  const payload = {
    json_data: {
      fieldName:field,
      debit: parseFormattedNumber(row.debit),
      credit: parseFormattedNumber(row.credit),
      debitFx1: parseFormattedNumber(row.debitFx1),
      creditFx1: parseFormattedNumber(row.creditFx1),
      debitFx2:parseFormattedNumber(row.debitFx2),
      creditFx2:parseFormattedNumber(row.creditFx2),
      currCode: currCode,
      currRate: currRate,
      docDate: docDate
    }
  };
  

  try {
    const response = await postRequest("editEntries", JSON.stringify(payload));

    // ✅ Match actual API format
    if (!response || response.status !== "success" || !Array.isArray(response.data)) {
      console.warn("Invalid API response structure", response);
      return [];
    }



    // ✅ Parse the JSON string inside result
    let parsedData;
    try {
      parsedData = JSON.parse(response.data[0]?.result || "[]");
    } catch (parseError) {
      console.error("Error parsing response data:", parseError);
      return [];
    }

    // ✅ Always return array (even if backend sends a single object)
     return Array.isArray(parsedData) && parsedData.length > 0
      ? parsedData[0]
      : null;

  } catch (error) {
    console.error("Error fetching editEntries:", error);
    return [];
  }
};







// global update of GL Entries per record
export const useFetchTranData = async (documentNo,branchCode,docType,fieldName,direction='') => {

  
if ((!documentNo || !branchCode) && direction === '') {
    throw new Error("Document No. or Branch Code missing.");
  }

  const response = await fetchData(`get${docType}?${fieldName}=${documentNo}&branchCode=${branchCode}&direction=${direction}`);
  if (!response?.success || !response.data?.length) {
    return null; // no record
  }

  let data = JSON.parse(response.data[0].result || "{}");
  return data;

};






export const useIsTranExist = async (documentNo, branchCode, docType, fieldName) => {
  try {
    const query = `${fieldName}=${encodeURIComponent(documentNo)}&branchCode=${encodeURIComponent(branchCode)}`;
    const endpoint = `get${docType}?${query}`;

    const response = await fetchData(endpoint);

    // Basic validation
    if (!response?.success || !Array.isArray(response.data) || response.data.length === 0) {
      return 0; // not found
    }

    const result = response.data[0]?.result;

    // Handle stringified null result
    if (!result || result === '{"result":null}') {
      return 0; // not found
    }

    return 1; // exists
  } catch (error) {
    console.error("Error checking transaction existence:", error);
    return 0;
  }
};








// global update of GL Entries per record
export const useFetchTranDataReversal = async (documentNo,branchCode,docType,refDocType,fieldName) => {
  
if (!documentNo || !branchCode) {
    throw new Error("Document No. or Branch Code missing.");
  }

  const response = await fetchData(`reversal${docType}?${fieldName}=${documentNo}&refDocType=${refDocType}&branchCode=${branchCode}`);
  if (!response?.success || !response.data?.length) {
    return null; // no record
  }

  let data = JSON.parse(response.data[0].result || "{}");
  return data;

};






export async function useHandleCancel(docCode, documentID, userCode, password, reason, updateState) {
 
  const payload = {
    userPassword: password,
    userCode,
    json_data: {      
      docCode,
      documentID,
      userCode,
      reason,
    },
  };

  updateState({ isLoading: true });

  try {

    const { data: res } = await apiClient.post("/cancel"+docCode, payload);
    if (res?.status === "success" || res?.success) {
      // You can standardize the return here
      return { success: true, data: res };
    } else {
      Swal.fire("Cancellation failed", res?.message ?? "Cancellation failed.", "error");
      return { success: false, message: res?.message || "Unexpected response" };
    } 

} catch (err) {
  const status = err?.response?.status;
  const data   = err?.response?.data || {};
  const code   = data.error || "";
  const msg    = data.message || "Something went wrong.";

  // Wrong or missing password only
  if (status === 422 && code === "INVALID_CREDENTIALS") {
    Swal.fire("Incorrect password","Please try again.", "warning");
    return { success: false, code, message: msg };
  }

  if (status === 422 && code === "MISSING_CREDENTIALS") {
    Swal.fire("Password required", "Please enter your password.", "info");
    return { success: false, code, message: msg };
  }

  // Anything else — generic error
  Swal.fire("Error", msg, "error");
  return { success: false, code: code || "UNKNOWN", message: msg };
  } finally {
    updateState({
      isSaveDisabled: false,
      isResetDisabled: false,
      isLoading: false,
    });
  }
}




// moved to printing.js
export async function useHandlePrint(documentID, docCode) {

}



//use global posting from Post SVI
export async function useHandlePost(documentID, docCode) {

}




//use global posting from Post Tran
export const useHandlePostTran = async (selectedData, userPw,docCode,userCode,setLoading,onClose) => {

  setLoading(true);

  try {
    const payload = {
      userCode,
      userPassword: userPw,
      json_data: {
        userCode,
        dt1: selectedData.map((groupId, idx) => ({
          lnNo: idx + 1, // number (safer for SQL)
          groupId,
        })),
      },
    };

    const { data: res } = await apiClient.post("/finalize"+docCode, payload);

    if (res?.success) {
      const postedSummary = res?.data?.[0]?.result ?? "No summary returned.";
      useSwalValidationAlert({
        icon: "info",
        title: "Posting Summary",
        message: postedSummary,
      });
      onClose?.();
      return;
    }

    // 200 but success=false
    Swal.fire("Posting failed", res?.message ?? "Finalize failed.", "error");

  } catch (err) {
    const status = err?.response?.status;
    const data   = err?.response?.data || {};
    const code   = data.error || "";
    const msg    = data.message || "Something went wrong.";

   

    // --- Soft/business validation (do NOT logout) ---
    if (status === 422) {
      if (code === "INVALID_CREDENTIALS") {
        Swal.fire("Invalid password", msg || "Please try again.", "warning");
        return { success: false, code, message: msg };
      }
      if (code === "MISSING_CREDENTIALS" || code === "VALIDATION_ERROR" || !data?.error) {
        Swal.fire("Missing credentials", msg, "info");
        return { success: false, code: code || "MISSING_CREDENTIALS", message: msg };
      }
    }

    // --- True permission issues (still no auto-logout here; interceptor handles that globally) ---
    if (status === 403 && (code === "USER_INACTIVE" || code === "USER_MISMATCH")) {
      const title = code === "USER_INACTIVE" ? "Blocked" : "Blocked";
      const text  = code === "USER_INACTIVE" ? (msg || "User is inactive.") : "Authenticated user does not match userCode.";
      Swal.fire(title, text, "warning");
      return { success: false, code, message: text };
    }

    // Unknown errors
    Swal.fire("Error", msg, "error");
    return { success: false, code: code || "UNKNOWN", message: msg };

  } finally {
    setLoading(false);
  }
};









export const useFieldLenghtCheck = async (tableName) => {

  try {

    const payload = {tableName}
    const response = await fetchData("getHSTblColLen",payload );
    // ✅ Match actual API format
    if (!response || !response.success ) {
      console.warn("Invalid API response structure", response);
      return [];
    }

    // ✅ Parse the JSON string inside result
    let parsedData;
    try {
      parsedData = JSON.parse(response.data[0]?.result || "[]");

    } catch (parseError) {
      console.error("Error parsing response data:", parseError);
      return [];
    }

    // ✅ Always return array (even if backend sends a single object)
     return Array.isArray(parsedData) && parsedData.length > 0
      ? parsedData
      : null;

  } catch (error) {
    console.error("Error fetching Table Field lenght:", error);
    return [];
  }
};





export const useGetFieldLength = (fieldsArray, fieldName) => {
  if (!Array.isArray(fieldsArray) || !fieldName) return 0;

  const field = fieldsArray.find(
    (item) => item.fieldname?.toLowerCase() === fieldName.toLowerCase()
  );

  return field ? parseInt(field.fieldlength, 10) : 0;
};



// export const useFieldLenghtCheck = async (tableName) => {
//   try {
//     const payload = { tableName };
//     const response = await fetchData("getHSTblColLen", payload);

//     // ✅ Validate API response
//     if (!response || !response.success) {
//       console.warn("Invalid API response structure:", response);
//       return [];
//     }

//     // ✅ Parse safely
//     let parsedData = [];
//     try {
//       const rawResult = response.data?.[0]?.result || "[]";
//       const json = JSON.parse(rawResult);

//       // Convert to array if backend returns single object
//       parsedData = Array.isArray(json) ? json : [json];
//     } catch (parseError) {
//       console.error("Error parsing response data:", parseError);
//       return [];
//     }

//     return parsedData;
//   } catch (error) {
//     console.error("Error fetching table field length:", error);
//     return [];
//   }
// };