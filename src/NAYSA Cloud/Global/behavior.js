import Swal from 'sweetalert2';

export function focusNextRowField(fieldName, currentIndex) {
  const selector = `#${fieldName}-input-${currentIndex + 1}`;
  const nextInput = document.querySelector(selector);
  if (nextInput) nextInput.focus();
}

export function formatNumber(num, decimals = 2) {
  if (isNaN(num) || num === null || num === undefined) return '0.00';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export const parseFormattedNumber = (value) => {
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  }
  return value || 0;
};

export const parseAndFormat = (value, decimals = 2) => {
  return formatNumber(parseFormattedNumber(value), decimals);
};

export const useSwalValidationAlert = ({ icon = "info", title = "", message = "" }) => {
  const formattedMessage = (message || "")
    .toString()
    .replace(/\r?\n/g, "<br/>");

  Swal.fire({
    icon,
    title,
    html: formattedMessage,
    didOpen: () => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.maxWidth = "400px";
        popup.style.width = "auto";
        popup.style.padding = "1rem";
        popup.style.fontSize = "14px";

        const titleEl = popup.querySelector(".swal2-title");
        if (titleEl) titleEl.style.fontSize = "16px";

        const body = popup.querySelector(".swal2-html-container");
        if (body) {
          body.style.fontSize = "13px";
          body.style.textAlign = "left";
          body.style.whiteSpace = "pre-wrap";
          body.style.maxHeight = "300px";
          body.style.overflowY = "auto";
        }
      }
    },
  });
};

export const useSwalReturnSummary = ({ icon = "info", title = "", message = "" }) => {
  const formattedMessage = (message || "")
    .toString()
    .replace(/\r?\n/g, "<br/>");

  Swal.fire({
    icon,
    title,
    html: formattedMessage,
    didOpen: () => {
      const popup = Swal.getPopup();
      if (popup) {
        popup.style.maxWidth = "400px";
        popup.style.width = "auto";
        popup.style.padding = "1rem";
        popup.style.fontSize = "14px";

        const titleEl = popup.querySelector(".swal2-title");
        if (titleEl) titleEl.style.fontSize = "16px";

        const body = popup.querySelector(".swal2-html-container");
        if (body) {
          body.style.fontSize = "13px";
          body.style.textAlign = "left";
          body.style.whiteSpace = "pre-wrap";
          body.style.maxHeight = "300px";
          body.style.overflowY = "auto";
        }
      }
    },
  });
};

export const useSwalshowSaveSuccessDialog = (onConfirm, onPrint) => {
  Swal.fire({
    title: "Record Saved.",
    text: "What would you like to do next?",
    icon: "success",
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonColor: "#3085d6",
    denyButtonColor: "#6c757d",
    cancelButtonColor: "#28a745",
    confirmButtonText: "Create New Transaction",
    denyButtonText: "Print Preview",
    cancelButtonText: "Completed",
    timer: 5000,
    timerProgressBar: true
  }).then((result) => {
    if (result.isConfirmed && typeof onConfirm === "function") {
      onConfirm();
    } else if (result.isDenied && typeof onPrint === "function") {
      onPrint();
    } else if (
      (result.dismiss === Swal.DismissReason.cancel || result.dismiss === Swal.DismissReason.timer) &&
      typeof onComplete === "function"
    ) {
      Swal.close();
    }
  });
};

// Add these missing SweetAlert utility functions
export const useSwalErrorAlert = (title = "Error!", message = "Something went wrong.") => {
  return Swal.fire({
    icon: "error",
    title,
    text: message,
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
  });
};

export const useSwalSuccessAlert = (title = "Success!", message = "Operation completed successfully!") => {
  return Swal.fire({
    icon: "success",
    title,
    text: message,
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
  });
};

export const useSwalWarningAlert = (title = "Warning!", message = "Please check your input.") => {
  return Swal.fire({
    icon: "warning",
    title,
    text: message,
    confirmButtonText: "OK",
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
  });
};

export const useSwalInfoAlert = (title = "No data", message = "There is no data to export.") => {
  return Swal.fire({
    icon: "info",
    title,
    text: message,
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
  });
};

export const useSwalDeleteConfirm = async (title = "Delete this item?", text = "", confirmText = "Yes, delete it") => {
  return await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#dc2626",
    confirmButtonText: confirmText,
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
  });
};

export const useSwalDeleteSuccess = () => {
  return Swal.fire({
    title: "Deleted",
    text: "The item has been deleted.",
    icon: "success",
    customClass: {
      popup: "rounded-xl shadow-2xl",
    },
  });
};
