// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import Swal from "sweetalert2";
// import { FiShield, FiTrash2, FiPower, FiRefreshCw } from "react-icons/fi";
// import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
// import {
//   bioRegisterOptions,
//   bioRegisterVerify,
//   bioList,
//   bioDeactivate,
//   bioDelete,
// } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import {
//   prepareRegisterPublicKey,
//   serializeRegisterCredential,
// } from "@/NAYSA Cloud/Authentication/webauthn.js";

// function formatDateTime(value) {
//   if (!value) return "—";
//   const dt = new Date(value);
//   if (Number.isNaN(dt.getTime())) return value;
//   return dt.toLocaleString();
// }

// export default function BiometricSettings() {
//   const { user, currentUserRow, refsLoaded } = useAuth();

//   const [rows, setRows] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [registering, setRegistering] = useState(false);
//   const [busyId, setBusyId] = useState(null);

//   const userCode = useMemo(() => {
//     return (
//       currentUserRow?.USER_CODE?.trim?.() ||
//       user?.USER_CODE?.trim?.() ||
//       user?.userCode?.trim?.() ||
//       ""
//     );
//   }, [currentUserRow, user]);

//   const displayUserName = useMemo(() => {
//     return (
//       currentUserRow?.USER_NAME ||
//       user?.USER_NAME ||
//       user?.userName ||
//       "No user loaded"
//     );
//   }, [currentUserRow, user]);

//   const displayUserCode = useMemo(() => {
//     return (
//       currentUserRow?.USER_CODE ||
//       user?.USER_CODE ||
//       user?.userCode ||
//       ""
//     );
//   }, [currentUserRow, user]);

//   const loadBioList = useCallback(async () => {
//     if (!userCode) {
//       setRows([]);
//       return;
//     }

//     try {
//       setLoading(true);
//       const res = await bioList(userCode);
//       setRows(Array.isArray(res?.data) ? res.data : []);
//     } catch (err) {
//       Swal.fire({
//         icon: "error",
//         title: "Load Failed",
//         text:
//           err?.response?.data?.message ||
//           err?.message ||
//           "Unable to load biometric records.",
//       });
//     } finally {
//       setLoading(false);
//     }
//   }, [userCode]);

//   useEffect(() => {
//     if (refsLoaded === false) return;
//     loadBioList();
//   }, [loadBioList, refsLoaded]);

//   useEffect(() => {
//     console.log("Biometric auth debug:", {
//       user,
//       currentUserRow,
//       refsLoaded,
//       userCode,
//     });
//   }, [user, currentUserRow, refsLoaded, userCode]);

//   const handleRegister = async () => {
//   try {
//     if (!userCode) {
//       throw new Error("No logged in user found.");
//     }

//     if (
//       !window.PublicKeyCredential ||
//       typeof navigator.credentials?.create !== "function"
//     ) {
//       throw new Error(
//         "This browser or device does not support biometric registration."
//       );
//     }

//     setRegistering(true);

//    const optionRes = await bioRegisterOptions(userCode);
//   console.log("OPTION RES", optionRes);

//   if (!optionRes?.success || !optionRes?.data) {
//     throw new Error(
//       optionRes?.message || "Failed to load registration options."
//     );
//   }

//   const rawOptions = optionRes?.data?.publicKey ?? optionRes?.data;

// console.log("RAW REGISTER OPTIONS", rawOptions);
// console.log("RAW challenge", rawOptions?.challenge, typeof rawOptions?.challenge);
// console.log("RAW user.id", rawOptions?.user?.id, typeof rawOptions?.user?.id);
// console.log(
//   "RAW excludeCredentials",
//   rawOptions?.excludeCredentials?.map((x) => ({
//     id: x?.id,
//     type: typeof x?.id,
//   }))
// );

// const publicKey = prepareRegisterPublicKey(rawOptions);

//     const credential = await navigator.credentials.create({
//       publicKey,
//     });

//     if (!credential) {
//       throw new Error("Biometric registration was cancelled.");
//     }

//     const payload = {
//       userCode,
//       credential: serializeRegisterCredential(credential),
//     };

//     console.log("VERIFY PAYLOAD", payload);

//     const verifyRes = await bioRegisterVerify(payload);
//     console.log("VERIFY RES", verifyRes);

//     if (!verifyRes?.success) {
//       throw new Error(
//         verifyRes?.message || "Biometric registration failed."
//       );
//     }

//     await Swal.fire({
//       icon: "success",
//       title: "Biometric Registered",
//       text: verifyRes?.message || "Biometric login has been enabled.",
//       confirmButtonText: "OK",
//     });

//     await loadBioList();
//   } catch (err) {
//     if (err?.name === "NotAllowedError") {
//       await Swal.fire({
//         icon: "info",
//         title: "Registration Cancelled",
//         text: "Biometric registration was cancelled or timed out.",
//       });
//       return;
//     }

//     console.error("BIO REGISTER ERROR:", err?.response?.data || err);

//     await Swal.fire({
//       icon: "error",
//       title: "Registration Failed",
//       text:
//         err?.response?.data?.message ||
//         err?.message ||
//         "Unable to register biometrics.",
//     });
//   } finally {
//     setRegistering(false);
//   }
// };

//   const handleDeactivate = async (row) => {
//     const confirm = await Swal.fire({
//       icon: "warning",
//       title: "Deactivate Biometric?",
//       text: "This credential will no longer be usable for biometric login.",
//       showCancelButton: true,
//       confirmButtonText: "Deactivate",
//     });

//     if (!confirm.isConfirmed) return;

//     try {
//       setBusyId(row.ID);
//       const res = await bioDeactivate(row.ID);

//       await Swal.fire({
//         icon: "success",
//         title: "Deactivated",
//         text: res?.message || "Biometric credential deactivated.",
//       });

//       await loadBioList();
//     } catch (err) {
//       await Swal.fire({
//         icon: "error",
//         title: "Deactivate Failed",
//         text:
//           err?.response?.data?.message ||
//           err?.message ||
//           "Unable to deactivate biometric credential.",
//       });
//     } finally {
//       setBusyId(null);
//     }
//   };

//   const handleDelete = async (row) => {
//     const confirm = await Swal.fire({
//       icon: "warning",
//       title: "Delete Biometric?",
//       text: "This action cannot be undone.",
//       showCancelButton: true,
//       confirmButtonText: "Delete",
//       confirmButtonColor: "#dc2626",
//     });

//     if (!confirm.isConfirmed) return;

//     try {
//       setBusyId(row.ID);
//       const res = await bioDelete(row.ID);

//       await Swal.fire({
//         icon: "success",
//         title: "Deleted",
//         text: res?.message || "Biometric credential deleted.",
//       });

//       await loadBioList();
//     } catch (err) {
//       await Swal.fire({
//         icon: "error",
//         title: "Delete Failed",
//         text:
//           err?.response?.data?.message ||
//           err?.message ||
//           "Unable to delete biometric credential.",
//       });
//     } finally {
//       setBusyId(null);
//     }
//   };

//   if (refsLoaded === false) {
//     return (
//       <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//         <div className="text-sm text-slate-500">Loading user information...</div>
//       </div>
//     );
//   }

//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div>
//           <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
//             <FiShield className="h-5 w-5" />
//             Biometric Login
//           </h2>

//           <p className="mt-1 text-sm text-slate-500">
//             Register this device for fingerprint, face ID, or Windows Hello sign-in.
//           </p>

//           <div className="mt-2 space-y-1 text-sm text-slate-600">
//             <div>
//               <span className="font-medium">User:</span> {displayUserName}
//             </div>
//             <div>
//               <span className="font-medium">User Code:</span>{" "}
//               {displayUserCode || "—"}
//             </div>
//           </div>
//         </div>

//         <div className="flex gap-2">
//           <button
//             type="button"
//             onClick={loadBioList}
//             disabled={loading || registering || !userCode}
//             className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
//           >
//             <FiRefreshCw className="h-4 w-4" />
//             Refresh
//           </button>

//           <button
//             type="button"
//             onClick={handleRegister}
//             disabled={registering || loading || !userCode}
//             className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60"
//           >
//             <FiShield className="h-4 w-4" />
//             {registering ? "Registering..." : "Register Biometric"}
//           </button>
//         </div>
//       </div>

//       {!userCode ? (
//         <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
//           No logged in user found. Please make sure your AuthContext already exposes
//           USER_CODE from either <span className="font-medium">user</span> or{" "}
//           <span className="font-medium">currentUserRow</span>.
//         </div>
//       ) : null}

//       <div className="mt-5 overflow-x-auto">
//         <table className="min-w-full border-separate border-spacing-y-2">
//           <thead>
//             <tr className="text-left text-sm text-slate-500">
//               <th className="px-3 py-2">Credential ID</th>
//               <th className="px-3 py-2">Status</th>
//               <th className="px-3 py-2">Sign Count</th>
//               <th className="px-3 py-2">Date Added</th>
//               <th className="px-3 py-2">Last Used</th>
//               <th className="px-3 py-2 text-right">Action</th>
//             </tr>
//           </thead>

//           <tbody>
//             {!loading && rows.length === 0 ? (
//               <tr>
//                 <td
//                   colSpan={6}
//                   className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500"
//                 >
//                   {userCode
//                     ? "No biometric credentials registered."
//                     : "User information not available."}
//                 </td>
//               </tr>
//             ) : null}

//             {rows.map((row) => {
//               const isBusy = busyId === row.ID;

//               return (
//                 <tr
//                   key={row.ID}
//                   className="rounded-xl bg-slate-50 text-sm text-slate-700"
//                 >
//                   <td className="rounded-l-xl px-3 py-3 font-mono text-xs">
//                     {row.CREDENTIAL_ID
//                       ? `${String(row.CREDENTIAL_ID).slice(0, 18)}...`
//                       : "—"}
//                   </td>

//                   <td className="px-3 py-3">
//                     <span
//                       className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
//                         row.IS_ACTIVE === "Y"
//                           ? "bg-emerald-100 text-emerald-700"
//                           : "bg-slate-200 text-slate-700"
//                       }`}
//                     >
//                       {row.IS_ACTIVE === "Y" ? "Active" : "Inactive"}
//                     </span>
//                   </td>

//                   <td className="px-3 py-3">{row.SIGN_COUNT ?? 0}</td>
//                   <td className="px-3 py-3">{formatDateTime(row.DATE_ADDED)}</td>
//                   <td className="px-3 py-3">
//                     {formatDateTime(row.LAST_USED_AT)}
//                   </td>

//                   <td className="rounded-r-xl px-3 py-3">
//                     <div className="flex justify-end gap-2">
//                       <button
//                         type="button"
//                         onClick={() => handleDeactivate(row)}
//                         disabled={isBusy || row.IS_ACTIVE !== "Y"}
//                         className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
//                       >
//                         <FiPower className="h-3.5 w-3.5" />
//                         Deactivate
//                       </button>

//                       <button
//                         type="button"
//                         onClick={() => handleDelete(row)}
//                         disabled={isBusy}
//                         className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
//                       >
//                         <FiTrash2 className="h-3.5 w-3.5" />
//                         Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}

//             {loading ? (
//               <tr>
//                 <td
//                   colSpan={6}
//                   className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500"
//                 >
//                   Loading biometric credentials...
//                 </td>
//               </tr>
//             ) : null}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }



import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  FiShield,
  FiTrash2,
  FiPower,
  FiRefreshCw,
  FiCheckCircle,
  FiMonitor,
  FiClock,
  FiUser,
} from "react-icons/fi";
import { Fingerprint, ScanFace, ShieldCheck } from "lucide-react";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  bioRegisterOptions,
  bioRegisterVerify,
  bioList,
  bioDeactivate,
  bioDelete,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  prepareRegisterPublicKey,
  serializeRegisterCredential,
} from "@/NAYSA Cloud/Authentication/webauthn.js";

function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

function maskCredential(value) {
  if (!value) return "—";
  const str = String(value);
  if (str.length <= 18) return str;
  return `${str.slice(0, 10)}...${str.slice(-6)}`;
}

export default function BiometricSettings() {
  const { user, currentUserRow, refsLoaded } = useAuth();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const userCode = useMemo(() => {
    return (
      currentUserRow?.USER_CODE?.trim?.() ||
      user?.USER_CODE?.trim?.() ||
      user?.userCode?.trim?.() ||
      ""
    );
  }, [currentUserRow, user]);

  const displayUserName = useMemo(() => {
    return (
      currentUserRow?.USER_NAME ||
      user?.USER_NAME ||
      user?.userName ||
      "No user loaded"
    );
  }, [currentUserRow, user]);

  const displayUserCode = useMemo(() => {
    return (
      currentUserRow?.USER_CODE ||
      user?.USER_CODE ||
      user?.userCode ||
      ""
    );
  }, [currentUserRow, user]);

  const activeCount = useMemo(
    () => rows.filter((row) => row.IS_ACTIVE === "Y").length,
    [rows]
  );

  const loadBioList = useCallback(async () => {
    if (!userCode) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      const res = await bioList(userCode);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Load Failed",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Unable to load biometric records.",
      });
    } finally {
      setLoading(false);
    }
  }, [userCode]);

  useEffect(() => {
    if (refsLoaded === false) return;
    loadBioList();
  }, [loadBioList, refsLoaded]);

  const handleRegister = async () => {
    try {
      if (!userCode) {
        throw new Error("No logged in user found.");
      }

      if (
        !window.PublicKeyCredential ||
        typeof navigator.credentials?.create !== "function"
      ) {
        throw new Error(
          "This browser or device does not support biometric registration."
        );
      }

      const confirm = await Swal.fire({
        title: "Register this device?",
        html: `
          <div style="text-align:left; font-size:14px; line-height:1.6; color:#334155;">
            <p style="margin:0 0 8px 0;">
              This will register your current browser and device for biometric login.
            </p>
            <ul style="margin:0; padding-left:18px;">
              <li>Fingerprint, face ID, or Windows Hello may be used</li>
              <li>You may need to register again on another device or browser</li>
              <li>You can remove this credential anytime later</li>
            </ul>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Continue",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#0284c7",
      });

      if (!confirm.isConfirmed) return;

      setRegistering(true);

      const optionRes = await bioRegisterOptions(userCode);

      if (!optionRes?.success || !optionRes?.data) {
        throw new Error(
          optionRes?.message || "Failed to load registration options."
        );
      }

      const rawOptions = optionRes?.data?.publicKey ?? optionRes?.data;
      const publicKey = prepareRegisterPublicKey(rawOptions);

      const credential = await navigator.credentials.create({
        publicKey,
      });

      if (!credential) {
        throw new Error("Biometric registration was cancelled.");
      }

      const payload = {
        userCode,
        credential: serializeRegisterCredential(credential),
      };

      const verifyRes = await bioRegisterVerify(payload);

      if (!verifyRes?.success) {
        throw new Error(
          verifyRes?.message || "Biometric registration failed."
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Device Registered",
        text:
          verifyRes?.message ||
          "Biometric login has been enabled for this device.",
        confirmButtonText: "OK",
      });

      await loadBioList();
    } catch (err) {
      if (err?.name === "NotAllowedError") {
        await Swal.fire({
          icon: "info",
          title: "Registration Cancelled",
          text: "Biometric registration was cancelled or timed out.",
        });
        return;
      }

      await Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Unable to register biometrics.",
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleDeactivate = async (row) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Deactivate this device?",
      text: "This credential will no longer be usable for biometric login.",
      showCancelButton: true,
      confirmButtonText: "Deactivate",
      confirmButtonColor: "#d97706",
    });

    if (!confirm.isConfirmed) return;

    try {
      setBusyId(row.ID);
      const res = await bioDeactivate(row.ID);

      await Swal.fire({
        icon: "success",
        title: "Deactivated",
        text: res?.message || "Biometric credential deactivated.",
      });

      await loadBioList();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Deactivate Failed",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Unable to deactivate biometric credential.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Delete this credential?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!confirm.isConfirmed) return;

    try {
      setBusyId(row.ID);
      const res = await bioDelete(row.ID);

      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: res?.message || "Biometric credential deleted.",
      });

      await loadBioList();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          err?.response?.data?.message ||
          err?.message ||
          "Unable to delete biometric credential.",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (refsLoaded === false) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-500">Loading user information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main register card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
              <ShieldCheck className="h-4 w-4" />
              Device Registration
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              Register this browser for biometric login
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Set up a biometric credential on this device so you can use
              fingerprint, face recognition, or Windows Hello when signing in.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Fingerprint className="h-5 w-5 text-sky-700" />
                <div className="mt-2 text-sm font-semibold text-slate-800">
                  Fingerprint
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use your device’s fingerprint sensor if available.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <ScanFace className="h-5 w-5 text-sky-700" />
                <div className="mt-2 text-sm font-semibold text-slate-800">
                  Face Recognition
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Works with supported camera-based sign-in systems.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <FiMonitor className="h-5 w-5 text-sky-700" />
                <div className="mt-2 text-sm font-semibold text-slate-800">
                  Windows Hello
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Common on modern Windows laptops and desktops.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRegister}
                disabled={registering || loading || !userCode}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiShield className="h-4 w-4" />
                {registering ? "Registering Device..." : "Register This Device"}
              </button>

              <button
                type="button"
                onClick={loadBioList}
                disabled={loading || registering || !userCode}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <FiRefreshCw className="h-4 w-4" />
                Refresh Devices
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
            <h3 className="text-sm font-semibold text-slate-900">
              Account Information
            </h3>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <FiUser className="h-4 w-4" />
                  User
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-800">
                  {displayUserName}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  User Code
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-800">
                  {displayUserCode || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Active Credentials
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {activeCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!userCode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          No logged in user found. Please make sure your AuthContext exposes
          USER_CODE from either <span className="font-medium">user</span> or{" "}
          <span className="font-medium">currentUserRow</span>.
        </div>
      ) : null}

      {/* Registered devices */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Registered Devices
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage biometric credentials associated with your account.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            <FiClock className="h-4 w-4" />
            {loading ? "Refreshing..." : `${rows.length} credential(s) found`}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {!loading && rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FiShield className="h-6 w-6" />
              </div>
              <h4 className="mt-4 text-sm font-semibold text-slate-800">
                No biometric credentials yet
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Register this device to start using biometric login.
              </p>
            </div>
          ) : null}

          {rows.map((row) => {
            const isBusy = busyId === row.ID;
            const isActive = row.IS_ACTIVE === "Y";

            return (
              <div
                key={row.ID}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        <FiMonitor className="h-3.5 w-3.5" />
                        Registered Device
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Credential ID
                        </div>
                        <div className="mt-1 break-all font-mono text-xs text-slate-700">
                          {maskCredential(row.CREDENTIAL_ID)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Sign Count
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {row.SIGN_COUNT ?? 0}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Date Added
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          {formatDateTime(row.DATE_ADDED)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Last Used
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          {formatDateTime(row.LAST_USED_AT)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => handleDeactivate(row)}
                      disabled={isBusy || !isActive}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiPower className="h-3.5 w-3.5" />
                      Deactivate
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              Loading biometric credentials...
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}