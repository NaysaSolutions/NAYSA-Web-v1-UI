import ProjectMaterialBackload from "./ProjectMaterialBackload.jsx";

const ProjectMaterialBackloadOutgoing = () => (
  <ProjectMaterialBackload
    docType="PRJ_BLO"
    transactionType="O"
    componentKey="ProjectMaterialBackloadOutgoing"
    detailsRoute="/prj/transaction/project-material-backload-outgoing"
    endpoints={{
      load: "/getProjectMaterialBackloadOutgoing",
      upsert: "/upsertProjectMaterialBackloadOutgoing",
      history: "/getProjectMaterialBackloadOutgoingHistory",
      entries: "/generateProjectMaterialBackloadOutgoingEntries",
      stock: "/getProjectMaterialBackloadOutgoingOpenStock",
      allocation: "/saveProjectMaterialBackloadOutgoingAllocation",
    }}
  />
);

export default ProjectMaterialBackloadOutgoing;
