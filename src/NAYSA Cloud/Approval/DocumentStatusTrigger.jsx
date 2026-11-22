import { useState } from "react";
import GlobalDocumentStatus from "./GlobalDocumentStatus.jsx";

export default function DocumentStatusTrigger({ className = "global-tran-headerstat-text-ui", label = "Transaction Status", ...document }) {
  const [open, setOpen] = useState(false);
  const identity = JSON.stringify([document.docType, document.tranId, document.branchCode]);
  return <>
    <button type="button" disabled={!document.tranId} onClick={() => setOpen(true)}
      className={`${className} rounded px-1 transition-colors hover:bg-sky-50 hover:text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-default`}
      title="View document audit trail">{label}</button>
    <GlobalDocumentStatus key={identity} {...document} isOpen={open} onClose={() => setOpen(false)} />
  </>;
}
