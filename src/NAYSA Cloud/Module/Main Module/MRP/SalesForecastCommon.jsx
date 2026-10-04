export const permissionMode = (item) =>
  String(
    item?.permissionType ||
    item?.permission ||
    "FULL",
  ).toUpperCase();
