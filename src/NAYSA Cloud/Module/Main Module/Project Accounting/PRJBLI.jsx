import PRJBL from "./PRJBL.jsx";

const PRJBLI = () => (
  <PRJBL
    docType="PRJ_BLI"
    transactionType="I"
    componentKey="PRJBLI"
    detailsRoute="/prj/transaction/project-material-backload-incoming"
    endpoints={{
      load: "/getPRJBLI",
      upsert: "/upsertPRJBLI",
      history: "/getPRJBLIHistory",
      entries: "/generatePRJBLIEntries",
    }}
  />
);

export default PRJBLI;
