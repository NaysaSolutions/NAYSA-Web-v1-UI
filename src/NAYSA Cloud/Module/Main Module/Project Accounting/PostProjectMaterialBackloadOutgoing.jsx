import PostProjectMaterialBackload from "./PostProjectMaterialBackload.jsx";

const PostProjectMaterialBackloadOutgoing = (props) => (
  <PostProjectMaterialBackload
    {...props}
    endpoint="postingProjectMaterialBackloadOutgoing"
    postingDocCode="ProjectMaterialBackloadOutgoing"
    transactionType="O"
    transactionPath="/prj/transaction/project-material-backload-outgoing"
  />
);

export default PostProjectMaterialBackloadOutgoing;
