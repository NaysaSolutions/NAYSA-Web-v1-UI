export const docTypes = {
  SVI: "SVI",
  CV: "CV",
  JV: "JV",
  APV:"APV",
  PCV:"PCV",
  SOA:"SOA",
  ARCM:"ARCM",
  ARDM:"ARDM",
  APCM:"APCM",
  APDM:"APDM",
  CR:"CR",
  AR:"AR"

};



export const docTypeNames = {

    // General Ledger Module
    JV: "Journal Voucher Transaction",
    PCV: "Petty Cash Voucher Transaction",
    // Accounts Payable Module
    APV: "Accounts Payable Voucher Transaction",
    APDM: "AP Debit Memo Voucher Transaction",
    APCM: "AP Credit Memo Voucher Transaction",
    CV: "Check Voucher Transaction",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "Service Invoice Transaction",
    ARDM: "AR Debit Memo Transaction",
    ARCM: "AR Credit Memo Transaction",
    CR: "Collection Receipt Transaction",
    AR: "Acknowledgement Receipt Transaction",
    SOA: "Statement of Account Transaction",
  };




  export const docTypeVideoGuide = {
    
    // General Ledger Module
    JV: "https://www.youtube.com/watch?v=NtA7iqQ5tu0&ab_channel=Learn%40NAYSA",
    PCV: "https://www.youtube.com/watch?v=VsITqPlYIjM&ab_channel=Learn%40NAYSA",

    // Accounts Payable Module
    APV: "https://www.youtube.com/watch?v=e5gBnrL-3u4&list=PLfNvt59xJjIgoEopcrnnG9fWfz76EMIxO&index=5&t=9s",
    APDM: "https://youtu.be/ZzFMbTBLp-I",
    APCM: "https://youtu.be/ULTdHwSylLs",
    CV: "https://www.youtube.com/watch?v=x8CsG1pHSM8&ab_channel=Learn%40NAYSA",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "https://www.youtube.com/watch?v=x8CsG1pHSM8&ab_channel=Learn%40NAYSA",
    ARDM: "AR Debit Memo Voucher Transaction",
    ARCM: "AR Credit Memo Voucher Transaction",
    CR: "Collection Receipt Transaction",
    SOA: "Statement of Account Transaction",

  };

  export const docTypePDFGuide = {
    
    // General Ledger Module
    JV: "/public/Guide/NAYSA GL Journal Voucher.pdf",
    PCV: "/public/Guide/NAYSA GL Petty Cash Voucher.pdf",

    // Accounts Payable Module
    APV: "/public/Guide/NAYSA AP Accounts Payable Voucher.pdf",
    APDM: "/public/Guide/NAYSA AP Debit Memo.pdf",
    APCM: "/public/Guide/NAYSA AP Credit Memo.pdf",
    CV: "/public/Guide/NAYSA AP Check Voucher.pdf",

    // Accounts Receivable Module
    SI: "Sales Invoice Transaction",
    SVI: "/public/Guide/NAYSA AR Billing Invoice.pdf",
    ARDM: "AR Debit Memo Voucher Transaction",
    ARCM: "AR Credit Memo Voucher Transaction",
    CR: "Collection Receipt Transaction",
    SOA: "Statement of Account Transaction",
  };








  export const glAccountFilter = {
    ActiveAll: "ActiveAll",
    PayableAcct: "APGL",
    VATOutputAcct:"VATOutputAcct",
    VATInputAcct:"VATInputAcct"
  };