// import { fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
// import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";



// export const usehandleFileUpload = async (files, documentID) => {
//   try {
//     const formData = new FormData();

//     files.forEach((f) => {
//       const fileObj = f.file ? f.file : f;
//       const modifiedDate = f.modifiedDate ? new Date(f.modifiedDate) : new Date();
//       const uploadedDate = f.uploadedDate ? new Date(f.uploadedDate) : new Date();

//       formData.append("files[]", fileObj);
//       formData.append("modifiedDate[]", modifiedDate.toISOString());
//       formData.append("uploadedDate[]", uploadedDate.toISOString());
//     });

//     formData.append("documentID", documentID);

//     const { data: result } = await apiClient.post("/attachFile", formData, {
//       headers: { "Content-Type": "multipart/form-data" },
//     });

//     return result;
//   } catch (error) {
//     console.error("❌ Upload failed:", error);
//     throw error;
//   }
// };




// export const useHandleFileDelete = async (id) => {
//   try {
//     const { data: result } = await apiClient.delete(`/deleteFile/${id}`);
//     return result;
//   } catch (err) {
//     console.error("Delete failed:", err);
//     throw err;
//   }
// };



// export const useHandleFileDownload = async (id, fallbackName = "download") => {
//   try {
//     const response = await apiClient.get(`/downloadFile/${encodeURIComponent(id)}`, {
//       responseType: "blob",
//     });
//     const blob = response.data;
//     const disposition = response.headers["content-disposition"] || "";
//     const contentType = response.headers["content-type"] || blob.type || "";
//     const isAttachment = /(?:^|;)\s*attachment(?:;|$)/i.test(disposition);
    // File bytes are always binary. Do not reinterpret legitimate JSON/text attachments as Base64.
//     if (!isAttachment && /application\/(?:problem\+)?json|text\/html/i.test(contentType)) {
//       const text = await blob.text();
//       let message = "Server returned an error instead of the attachment.";
//       try {
//         const result = JSON.parse(text);
//         message = result.message || result.error || message;
//       } catch { /* An HTML error page is not a downloadable attachment. */ }
//       throw new Error(message);
//     }

//     let filename = fallbackName;
//     const extended = disposition.match(/filename\*\s*=\s*(?:UTF-8'[^']*')([^;]+)/i);
//     const ordinary = disposition.match(/(?:^|;)\s*filename\s*=\s*("(?:[^"\\]|\\.)*"|[^;]+)/i);
//     if (extended) {
//       try { filename = decodeURIComponent(extended[1].trim().replace(/^"|"$/g, "")); }
//       catch { filename = fallbackName; }
//     } else if (ordinary) {
//       filename = ordinary[1].trim().replace(/^"|"$/g, "").replace(/\\(.)/g, "$1");
      // Compatibility with earlier API headers that used a generic fallback without an extension.
//       if (filename === "attachment" && fallbackName !== "download") filename = fallbackName;
//     }
//     filename = String(filename || fallbackName).split(/[\\/]/).pop().replace(/[\x00-\x1f]/g, "") || "download";

//     const url = window.URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     link.remove();
    // Let the browser consume the Blob before releasing its URL.
//     setTimeout(() => window.URL.revokeObjectURL(url), 1000);
//     return { success: true, message: "Download triggered" };
//   } catch (error) {
//     console.error("Download failed:", error);
//     throw error;
//   }
// };

// export const useHandleFileDownloadAll = async (documentID) => {
//   try {
//     const response = await apiClient.get(`/downloadAll/${documentID}`, {
//       responseType: "blob",
//     });

//     const blob = response.data;

//     // Default filename
//     let filename = `attachments_${documentID}.zip`;

//     // Try to read from response headers (handles both filename and filename*)
//     const cd = response.headers["content-disposition"];
//     if (cd) {
//       const matchQuoted = cd.match(/filename\*?=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
//       const extracted = decodeURIComponent(matchQuoted?.[1] || matchQuoted?.[2] || "");
//       if (extracted) filename = extracted;
//     }

//     // Trigger download
//     const url = window.URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();

//     window.URL.revokeObjectURL(url);
//     a.remove();

//     return { success: true, message: "All files download triggered" };
//   } catch (err) {
//     console.error("❌ Download all failed:", err);
//     throw err;
//   }
// };





// export const useFetchTranAtt = async (documentID) => {
// if (!documentID || !documentID) {
//     throw new Error("Document ID missing");
//   }

//   try {
//     const response = await fetchData("getAttachFile", { documentID: documentID });
//     if (response.success) {

//      let data = JSON.parse(response.data[0].result || "{}");
//      return data;

  

//     }
//     return null;
//   } catch (error) {
//     console.error("Error fetching File Attachment row:", error);
//     return null;
//   }
// };

import { fetchData, postRequest } from '@/NAYSA Cloud/Configuration/BaseURL';
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

export const usehandleFileUpload = async (files, documentID) => {
  try {
    const formData = new FormData();

    files.forEach((f) => {
      const fileObj = f.file ? f.file : f;
      const modifiedDate = f.modifiedDate ? new Date(f.modifiedDate) : new Date();
      const uploadedDate = f.uploadedDate ? new Date(f.uploadedDate) : new Date();

      formData.append("files[]", fileObj);
      formData.append("modifiedDate[]", modifiedDate.toISOString());
      formData.append("uploadedDate[]", uploadedDate.toISOString());
    });

    formData.append("documentID", documentID);

    const { data: result } = await apiClient.post("/attachFile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return result;
  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
};

export const useHandleFileDelete = async (id) => {
  try {
    const { data: result } = await apiClient.delete(`/deleteFile/${encodeURIComponent(id)}`);
    if (result?.success !== true) {
      throw new Error(result?.message || "The server did not confirm attachment deletion.");
    }
    return result;
  } catch (err) {
    console.error("Delete failed:", err);
    throw err;
  }
};

export const useHandleFileDownload = async (id, fallbackName = "download") => {
  try {
    const response = await apiClient.get(`/downloadFile/${encodeURIComponent(id)}`, {
      responseType: "blob",
    });
    const blob = response.data;
    const disposition = response.headers["content-disposition"] || "";
    const contentType = response.headers["content-type"] || blob.type || "";
    const isAttachment = /(?:^|;)\s*attachment(?:;|$)/i.test(disposition);
    // File bytes are always binary. Do not reinterpret legitimate JSON/text attachments as Base64.
    if (!isAttachment && /application\/(?:problem\+)?json|text\/html/i.test(contentType)) {
      const text = await blob.text();
      let message = "Server returned an error instead of the attachment.";
      try {
        const result = JSON.parse(text);
        message = result.message || result.error || message;
      } catch { /* An HTML error page is not a downloadable attachment. */ }
      throw new Error(message);
    }

    let filename = fallbackName;
    const extended = disposition.match(/filename\*\s*=\s*(?:UTF-8'[^']*')([^;]+)/i);
    const ordinary = disposition.match(/(?:^|;)\s*filename\s*=\s*("(?:[^"\\]|\\.)*"|[^;]+)/i);
    if (extended) {
      try { filename = decodeURIComponent(extended[1].trim().replace(/^"|"$/g, "")); }
      catch { filename = fallbackName; }
    } else if (ordinary) {
      filename = ordinary[1].trim().replace(/^"|"$/g, "").replace(/\\(.)/g, "$1");
      // Compatibility with earlier API headers that used a generic fallback without an extension.
      if (filename === "attachment" && fallbackName !== "download") filename = fallbackName;
    }
    filename = String(filename || fallbackName).split(/[\\/]/).pop().replace(/[\x00-\x1f]/g, "") || "download";

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Let the browser consume the Blob before releasing its URL.
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    return { success: true, message: "Download triggered" };
  } catch (error) {
    console.error("Download failed:", error);
    throw error;
  }
};


export const useHandleFileDownloadAll = async (documentID) => {
  try {
    const response = await apiClient.get(`/downloadAll/${documentID}`, {
      responseType: "blob",
    });

    const blob = response.data;

    // SAFETY CHECK
    if (blob.type === "application/json" || blob.type.includes("text/html")) {
      const text = await blob.text();
      throw new Error("Server returned an error instead of a ZIP file.");
    }

    let filename = `attachments_${documentID}.zip`;

    // Try to read from response headers (handles both filename and filename*)
    const cd = response.headers["content-disposition"];
    if (cd) {
      const matchQuoted = cd.match(/filename\*?=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const extracted = decodeURIComponent(matchQuoted?.[1] || matchQuoted?.[2] || "");
      if (extracted) filename = extracted;
    }

    // EXCEL/ZIP CORRUPTION FIX: Forcefully apply the ZIP MIME type
    const fileType = response.headers['content-type'] || 'application/zip';
    const secureBlob = new Blob([blob], { type: fileType });

    // TRIGGER DOWNLOAD
    const url = window.URL.createObjectURL(secureBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();

    return { success: true, message: "All files download triggered" };
  } catch (err) {
    console.error("❌ Download all failed:", err);
    throw err;
  }
};

export const useFetchTranAtt = async (documentID) => {
  if (!documentID) {
    throw new Error("Document ID missing");
  }

  try {
    const response = await fetchData("getAttachFile", { documentID: documentID });
    if (response.success) {
      let data = JSON.parse(response.data[0].result || "{}");
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching File Attachment row:", error);
    return null;
  }
};