import PostProjectMaterialBackload from "./PostProjectMaterialBackload.jsx";

const PostProjectMaterialBackloadIncoming = (props) => (
  <PostProjectMaterialBackload
    {...props}
    endpoint="postingProjectMaterialBackloadIncoming"
    postingDocCode="ProjectMaterialBackloadIncoming"
    transactionType="I"
    transactionPath="/prj/transaction/project-material-backload-incoming"
  />
);

export default PostProjectMaterialBackloadIncoming;
