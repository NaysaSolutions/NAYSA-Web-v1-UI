import React from "react";

const RegistrationInfo = ({ data, disabled = true }) => {
  const v = data || {};

  return (
    <div className="space-y-4">
      {/* Registered By */}
      <div className="relative">
        <input
          type="text"
          name="registeredBy"
          placeholder=" "
          value={v.registeredBy || ""}
          disabled={disabled}
          readOnly
          className={`peer global-ref-textbox-ui ${
            disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"
          }`}
        />
        <label
          className={`global-ref-floating-label ${
            disabled ? "global-ref-label-disabled" : "global-ref-label-enabled"
          }`}
        >
          Registered By
        </label>
      </div>

      {/* Registered Date */}
      <div className="relative">
        <input
          type="text"
          name="registeredDate"
          placeholder=" "
          value={v.registeredDate || ""}
          disabled={disabled}
          readOnly
          className={`peer global-ref-textbox-ui ${
            disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"
          }`}
        />
        <label
          className={`global-ref-floating-label ${
            disabled ? "global-ref-label-disabled" : "global-ref-label-enabled"
          }`}
        >
          Registered Date
        </label>
      </div>

      {/* Last Updated By */}
      <div className="relative">
        <input
          type="text"
          name="lastUpdatedBy"
          placeholder=" "
          value={v.lastUpdatedBy || ""}
          disabled={disabled}
          readOnly
          className={`peer global-ref-textbox-ui ${
            disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"
          }`}
        />
        <label
          className={`global-ref-floating-label ${
            disabled ? "global-ref-label-disabled" : "global-ref-label-enabled"
          }`}
        >
          Last Updated By
        </label>
      </div>

      {/* Last Updated Date */}
      <div className="relative">
        <input
          type="text"
          name="lastUpdatedDate"
          placeholder=" "
          value={v.lastUpdatedDate || ""}
          disabled={disabled}
          readOnly
          className={`peer global-ref-textbox-ui ${
            disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"
          }`}
        />
        <label
          className={`global-ref-floating-label ${
            disabled ? "global-ref-label-disabled" : "global-ref-label-enabled"
          }`}
        >
          Last Updated Date
        </label>
      </div>
    </div>
  );
};

export default RegistrationInfo;
