import PostPRJBL from "./PostPRJBL.jsx";

const PostPRJBLI = (props) => (
  <PostPRJBL
    {...props}
    endpoint="postingPRJBLI"
    postingDocCode="PRJBLI"
    transactionType="I"
    transactionPath="/prj/transaction/project-material-backload-incoming"
  />
);

export default PostPRJBLI;
