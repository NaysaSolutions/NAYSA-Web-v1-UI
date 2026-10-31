import PostPRJBL from "./PostPRJBL.jsx";

const PostPRJBLO = (props) => (
  <PostPRJBL
    {...props}
    endpoint="postingPRJBLO"
    postingDocCode="PRJBLO"
    transactionType="O"
    transactionPath="/prj/transaction/project-material-backload-outgoing"
  />
);

export default PostPRJBLO;
