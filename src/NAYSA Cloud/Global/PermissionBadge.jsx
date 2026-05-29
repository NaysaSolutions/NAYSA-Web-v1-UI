import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faShieldHalved } from "@fortawesome/free-solid-svg-icons";

const normalizePermission = (permission, isReadOnly, isFullAccess) => {
  if (isReadOnly) return "READ ONLY";
  if (isFullAccess) return "FULL ACCESS";

  const value = String(permission || "").trim().toUpperCase();

  if (value === "READ") return "READ ONLY";
  if (value === "FULL") return "FULL ACCESS";
  if (value === "READ ONLY") return "READ ONLY";
  if (value === "FULL ACCESS") return "FULL ACCESS";

  return "READ ONLY";
};

const PermissionBadge = ({
  permission = "READ",
  isReadOnly = false,
  isFullAccess = false,
  className = "",
}) => {
  const label = normalizePermission(permission, isReadOnly, isFullAccess);
  const isRead = label === "READ ONLY";
  const icon = isRead ? faEye : faShieldHalved;

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-blue-100/70 px-2 py-1 text-blue-900 ${className}`}
      title={`Access Right: ${label}`}
    >
      <FontAwesomeIcon icon={icon} className="text-[11px] text-blue-800" />

      <div className="flex flex-col leading-none">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-blue-900/80 sm:text-[10px]">
          ACCESS RIGHT
        </span>
        <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-900 sm:text-[11px]">
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{isRead ? "READ ONLY" : "FULL ACCESS"}</span>
        </span>
      </div>
    </div>
  );
};

export default PermissionBadge;
