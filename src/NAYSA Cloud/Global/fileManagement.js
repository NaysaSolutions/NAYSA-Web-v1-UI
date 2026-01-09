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
    const { data: result } = await apiClient.delete(`/deleteFile/${id}`);
    return result;
  } catch (err) {
    console.error("Delete failed:", err);
    throw err;
  }
};



export const useHandleFileDownload = async (id) => {
  try {
    const response = await apiClient.get(`/downloadFile/${id}`, {
      responseType: "blob", // 👈 important for file downloads
    });

    const blob = response.data;
    const contentDisposition = response.headers["content-disposition"];
    let filename = "download";

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch?.[1]) {
        filename = filenameMatch[1];
      }
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    a.remove();

    return { success: true, message: "Download triggered" };
  } catch (err) {
    console.error("❌ Download failed:", err);
    throw err;
  }
};





export const useHandleFileDownloadAll = async (documentID) => {
  try {
    const response = await apiClient.get(`/downloadAll/${documentID}`, {
      responseType: "blob",
    });

    const blob = response.data;

    // Default filename
    let filename = `attachments_${documentID}.zip`;

    // Try to read from response headers (handles both filename and filename*)
    const cd = response.headers["content-disposition"];
    if (cd) {
      const matchQuoted = cd.match(/filename\*?=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
      const extracted = decodeURIComponent(matchQuoted?.[1] || matchQuoted?.[2] || "");
      if (extracted) filename = extracted;
    }

    // Trigger download
    const url = window.URL.createObjectURL(blob);
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
if (!documentID || !documentID) {
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


