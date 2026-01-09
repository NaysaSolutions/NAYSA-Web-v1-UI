import { useState, forwardRef, useImperativeHandle } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner, faUserShield
} from "@fortawesome/free-solid-svg-icons";

import {
  useSwalSuccessAlert,
  useSwalWarningAlert,
  useSwalErrorAlert,
} from "@/NAYSA Cloud/Global/behavior";

const RolesTab = forwardRef(({ users, roles, appliedUserRoles, setAppliedUserRoles, fetchUserRoles }, ref) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [viewingRoles, setViewingRoles] = useState(false);
  const [usersLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);

  const handleViewRole = () => {
    if (selectedUsers.length === 0) {
      useSwalWarningAlert("No Users Selected", "Please select at least one user before viewing roles.");
      return;
    }

    // Auto-select roles that are already applied to selected users
    const preSelectedRoles = new Set();
    selectedUsers.forEach(userCode => {
      roles.forEach(role => {
        if (appliedUserRoles.has(`${userCode}-${role.roleCode}`)) {
          preSelectedRoles.add(role.roleCode);
        }
      });
    });

    setSelectedRoles(Array.from(preSelectedRoles));
    setViewingRoles(true);
  };
  const handleResetUserRoleMatching = () => {
    setSelectedUsers([]);
    setSelectedRoles([]);
    setViewingRoles(false);
  };

  const handleApplyRoles = async () => {
    if (selectedUsers.length === 0) {
      useSwalWarningAlert("No Users Selected", "Please select at least one user before applying roles.");
      return;
    }

    // Find roles to add and remove
    const rolesToApply = selectedRoles;
    const rolesToRemove = [];
    selectedUsers.forEach(userCode => {
      roles.forEach(role => {
        const combo = `${userCode}-${role.roleCode}`;
        if (appliedUserRoles.has(combo) && !rolesToApply.includes(role.roleCode)) {
          rolesToRemove.push({ userCode, roleCode: role.roleCode });
        }
      });
    });

    try {
      let anyChange = false;

      // Apply new roles
      if (rolesToApply.length > 0) {
        const payload = {
          dt1: rolesToApply.map((code) => ({
            roleCode: code || "",
          })),
          dt2: selectedUsers.map((code) => ({
            userCode: code
          }))
        };

        const { data: res } = await apiClient.post("/UpsertUserRole", { json_data: { json_data: payload } });
        if (res.data?.status === "success") {
          anyChange = true;
        } else {
          await useSwalErrorAlert("Error!", res.data?.message || "Something went wrong.");
          return;
        }
      }

      // Remove unchecked roles
      for (const { userCode, roleCode } of rolesToRemove) {
        const payload = {
          dt1: [{ roleCode }],
          dt2: [{ userCode }]
        };
        await apiClient.post("/deleteUserRole", { json_data: { json_data: payload } });
        anyChange = true;
      }

      // Update appliedUserRoles state to persist checkboxes
      const newAppliedCombinations = new Set(appliedUserRoles);
      selectedUsers.forEach(userCode => {
        roles.forEach(role => {
          const combo = `${userCode}-${role.roleCode}`;
          if (rolesToApply.includes(role.roleCode)) {
            newAppliedCombinations.add(combo);
          } else {
            newAppliedCombinations.delete(combo);
          }
        });
      });
      setAppliedUserRoles(newAppliedCombinations);

      // Refresh from server
      await fetchUserRoles(selectedUsers);

      // Always show success alert if apply was clicked
      await useSwalSuccessAlert("Success!", "Users-Role updated successfully!");
    } catch (e) {
      console.error(e);
      await useSwalErrorAlert("Error!", e?.response?.data?.message || "Error saving role.");
    }
  };

  useImperativeHandle(ref, () => ({
    viewRole: handleViewRole,
    apply: handleApplyRoles,
    reset: handleResetUserRoleMatching,
  }));

  return (
    <div className="w-full">
      

      {/* Two Tables Side by Side */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Users Table */}
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Users</h2>
          <div className="global-ref-table-main-div-ui">
            <div className="global-ref-table-main-sub-div-ui">
              <div className="global-ref-table-div-ui">
                <table className="global-ref-table-div-ui">
                  <thead className="global-ref-thead-div-ui">
                    <tr>
                      <th className="global-ref-th-ui">User Code</th>
                      <th className="global-ref-th-ui">Username</th>
                      <th className="global-ref-th-ui text-center">Select</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr>
                        <td colSpan="3" className="global-ref-norecords-ui">
                          <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                          Loading users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="global-ref-norecords-ui">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user, index) => (
                        <tr
                          key={user.userCode || index}
                          className="global-tran-tr-ui"
                        >
                          <td className="global-ref-td-ui">{user.userCode}</td>
                          <td className="global-ref-td-ui">{user.userName}</td>
                          <td className="global-ref-td-ui text-center">
                            <input
                              type="checkbox"
                              className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              checked={selectedUsers.includes(user.userCode)}
                              onChange={() => {
                                if (viewingRoles) return;
                                setSelectedUsers((prev) =>
                                  prev.includes(user.userCode)
                                    ? prev.filter((id) => id !== user.userCode)
                                    : [...prev, user.userCode]
                                );
                              }}
                              disabled={viewingRoles}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Roles Table */}
        <div className="w-full md:w-1/2">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Roles</h2>
          <div className="global-ref-table-main-div-ui">
            <div className="global-ref-table-main-sub-div-ui">
              <div className="global-ref-table-div-ui">
                {viewingRoles ? (
                  <table className="global-ref-table-div-ui">
                    <thead className="global-ref-thead-div-ui">
                      <tr>
                        <th className="global-ref-th-ui">Role Code</th>
                        <th className="global-ref-th-ui">Role Description</th>
                        <th className="global-ref-th-ui text-center">Select</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role, index) => {
                        const isAppliedToSelectedUsers = selectedUsers.some(userCode =>
                          appliedUserRoles.has(`${userCode}-${role.roleCode}`)
                        );

                        return (
                          <tr
                            key={index}
                            className="global-tran-tr-ui"
                          >
                            <td className="global-ref-td-ui">{role.roleCode}</td>
                            <td className="global-ref-td-ui">{role.roleName}</td>
                            <td className="global-ref-td-ui text-center">
                              <input
                                type="checkbox"
                                className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={selectedRoles.includes(role.roleCode)}
                                onChange={() => {
                                  setSelectedRoles((prev) => {
                                    if (prev.includes(role.roleCode)) {
                                      return prev.filter(
                                        (roleCode) => roleCode !== role.roleCode
                                      );
                                    } else {
                                      return [...prev, role.roleCode];
                                    }
                                  });
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-16 text-center text-gray-500 bg-gray-50 rounded-lg">
                    <FontAwesomeIcon icon={faUserShield} className="text-xl mb-2 text-gray-400" />
                    <h3 className="font-medium text-sm mb-1">Role Selection Hidden</h3>
                    <p className="text-xs">
                      Please select user(s) from the users table and click "View Role" to see and assign roles
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Display */}
      {selectedUsers.length > 0 && (
        <div className="mt-4 bg-blue-50 p-2 rounded text-xs">
          {viewingRoles
            ? `Assigning roles to ${selectedUsers.length} selected user(s). Please select roles and click Apply.`
            : `${selectedUsers.length} user(s) selected. Click "View Role" to continue.`}
        </div>
      )}

      {viewingRoles && selectedRoles.length > 0 && (
        <div className="mt-2 bg-green-50 p-2 rounded text-xs">
          {`${selectedRoles.length} role(s) selected to apply.`}
        </div>
      )}


    </div>
  );
});

export default RolesTab;