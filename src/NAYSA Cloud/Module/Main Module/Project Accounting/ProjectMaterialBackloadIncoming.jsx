import ProjectMaterialBackload from "./ProjectMaterialBackload.jsx";

const ProjectMaterialBackloadIncoming = () => (
  <ProjectMaterialBackload
    docType="PRJ_BLI"
    transactionType="I"
    componentKey="ProjectMaterialBackloadIncoming"
    detailsRoute="/prj/transaction/project-material-backload-incoming"
    endpoints={{
      load: "/getProjectMaterialBackloadIncoming",
      upsert: "/upsertProjectMaterialBackloadIncoming",
      history: "/getProjectMaterialBackloadIncomingHistory",
      entries: "/generateProjectMaterialBackloadIncomingEntries",
    }}
  />
);

export default ProjectMaterialBackloadIncoming;
