import PRJBL from "./PRJBL.jsx";

const PRJBLO = () => (
  <PRJBL
    docType="PRJ_BLO"
    transactionType="O"
    componentKey="PRJBLO"
    detailsRoute="/prj/transaction/project-material-backload-outgoing"
    endpoints={{
      load: "/getPRJBLO",
      upsert: "/upsertPRJBLO",
      history: "/getPRJBLOHistory",
      entries: "/generatePRJBLOEntries",
      stock: "/getPRJBLOOpenStock",
      allocation: "/savePRJBLOAllocation",
    }}
  />
);

export default PRJBLO;
