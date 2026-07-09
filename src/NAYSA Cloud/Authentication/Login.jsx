// import React, { useEffect, useState, useRef } from "react";
// import {
//   FiUser,
//   FiLock,
//   FiEye,
//   FiEyeOff,
//   FiGlobe,
// } from "react-icons/fi";
// import { Fingerprint, ScanLine } from "lucide-react";
// import Swal from "sweetalert2";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "./AuthContext.jsx";
// import {
//   apiClient,
//   setTenant,
//   bioLoginOptionsPasswordless,
// } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import {
//   prepareLoginPublicKey,
//   serializeLoginCredential,
// } from "@/NAYSA Cloud/Authentication/webauthn.js";

// function normalizeCompaniesPayload(raw) {
//   let arr = [];
//   if (Array.isArray(raw)) arr = raw;
//   else if (Array.isArray(raw?.data)) arr = raw.data;
//   else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
//   else if (raw && typeof raw === "object") arr = Object.values(raw);

//   return arr.map((r) => {
//     const get = (o, ...keys) => keys.reduce((v, k) => v ?? o?.[k], undefined);
//     const code =
//       get(r, "code", "CODE", "Code") ??
//       get(r, "database", "DATABASE", "Database") ??
//       "";
//     const company =
//       get(r, "company", "COMPANY", "Company") ??
//       get(r, "database", "DATABASE", "Database") ??
//       get(r, "code", "CODE", "Code") ??
//       "";
//     const database = get(r, "database", "DATABASE", "Database") ?? "";

//     return {
//       code: String(code || "").trim(),
//       company: String(company || "").trim(),
//       database: String(database || "").trim(),
//     };
//   });
// }

// export default function Login({ onSwitchToRegister }) {
//   const { login, loginWithBiometric } = useAuth();
//   const navigate = useNavigate();

//   const [form, setForm] = useState({ USER_CODE: "", PASSWORD: "" });
//   const [companies, setCompanies] = useState([]);
//   const [companyCode, setCompanyCode] = useState(
//     localStorage.getItem("companyCode") || ""
//   );
//   const [loadingCompanies, setLoadingCompanies] = useState(true);

//   const [isLoading, setIsLoading] = useState(false);
//   const [isBioLoading, setIsBioLoading] = useState(false);
//   const [showPwd, setShowPwd] = useState(false);
//   const [capsOn, setCapsOn] = useState(false);
//   const pwdRef = useRef(null);

//   useEffect(() => {
//     let alive = true;

//     (async () => {
//       try {
//         setLoadingCompanies(true);
//         const { data } = await apiClient.get("/companies");
//         const options = normalizeCompaniesPayload(data).filter(
//           (x) => x.code || x.database
//         );

//         if (!alive) return;
//         setCompanies(options);

//         if (!companyCode && options.length === 1) {
//           setCompanyCode(options[0].code || options[0].database || "");
//         } else if (
//           companyCode &&
//           !options.some((o) => o.code === companyCode || o.database === companyCode)
//         ) {
//           if (options[0]) {
//             setCompanyCode(options[0].code || options[0].database || "");
//           }
//         }
//       } catch (e) {
//         Swal.fire({
//           icon: "error",
//           title: "Unable to load companies",
//           text:
//             e?.response?.data?.message ||
//             e?.message ||
//             "Please check the /api/companies endpoint.",
//         });
//       } finally {
//         if (alive) setLoadingCompanies(false);
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, [companyCode]);

//   useEffect(() => {
//     if (companyCode) localStorage.setItem("companyCode", companyCode);
//   }, [companyCode]);

//   const setBioAuthInProgress = (value) => {
//     try {
//       if (value) sessionStorage.setItem("bioAuthInProgress", "1");
//       else sessionStorage.removeItem("bioAuthInProgress");
//     } catch {}
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm((s) => ({ ...s, [name]: value }));
//   };

//   const handleCaps = (e) =>
//     setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.USER_CODE.trim() || !form.PASSWORD) return;

//     if (!companyCode) {
//       await Swal.fire({
//         icon: "warning",
//         title: "Select Company",
//         text: "Please choose a company before logging in.",
//       });
//       return;
//     }

//     setIsLoading(true);
//     try {
//       await login({
//         companyCode,
//         USER_CODE: form.USER_CODE.trim(),
//         PASSWORD: form.PASSWORD,
//       });

//       await Swal.fire({
//         toast: true,
//         position: "top-end",
//         icon: "success",
//         title: "Welcome back!",
//         showConfirmButton: false,
//         timer: 1800,
//         timerProgressBar: true,
//       });

//       navigate("/", { replace: true });
//     } catch (err) {
//       const status = err?.response?.status;
//       const code = err?.response?.data?.code;
//       const msg =
//         err?.response?.data?.message ||
//         err?.message ||
//         "Please try again.";

//       if (status === 403 && code === "PENDING") {
//         await Swal.fire({
//           icon: "info",
//           title: "Awaiting System Administrator Approval",
//           html: `
//             <p style="font-size: 14px; color: #1f2937;">
//               Your account is currently <strong>pending activation</strong>.<br/>
//               Please wait for the administrator to approve your account and send a temporary password.
//             </p>
//           `,
//           confirmButtonText: "OK",
//           confirmButtonColor: "#1e3a8a",
//           background: "#f9fafb",
//           iconColor: "#2563eb",
//         });
//         return;
//       }

//       if (status === 403 && code === "INACTIVE") {
//         await Swal.fire({
//           icon: "error",
//           title: "Account Inactive",
//           text:
//             msg ||
//             "Your account has been deactivated. Please contact the administrator.",
//           confirmButtonText: "OK",
//         });
//         return;
//       }

//       if (status === 429 && code === "SEAT_LIMIT") {
//         await Swal.fire({
//           icon: "warning",
//           title: "Login Limit Reached",
//           text:
//             msg || "Maximum concurrent users reached. Please try again later.",
//           confirmButtonText: "OK",
//         });
//         return;
//       }

//       await Swal.fire({
//         icon: "error",
//         title: "Login failed",
//         text: msg,
//         confirmButtonText: "OK",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleBiometricLogin = async () => {
//     try {
//       if (!companyCode) {
//         await Swal.fire({
//           icon: "warning",
//           title: "Select Company",
//           text: "Please choose a company before logging in.",
//         });
//         return;
//       }

//       if (
//         !window.PublicKeyCredential ||
//         typeof navigator.credentials?.get !== "function"
//       ) {
//         await Swal.fire({
//           icon: "error",
//           title: "Biometric Login Not Supported",
//           text: "This browser or device does not support biometric login.",
//         });
//         return;
//       }

//       setBioAuthInProgress(true);
//       setIsBioLoading(true);
//       setTenant(companyCode);

//       const optionRes = await bioLoginOptionsPasswordless();

//       if (!optionRes?.success || !optionRes?.data) {
//         throw new Error(
//           optionRes?.message || "Failed to load biometric login options."
//         );
//       }

//       const publicKey = prepareLoginPublicKey(optionRes.data);

//       const credential = await navigator.credentials.get({ publicKey });

//       if (!credential) {
//         throw new Error("Biometric authentication was cancelled.");
//       }

//       const payload = {
//         credential: serializeLoginCredential(credential),
//       };

//       await loginWithBiometric({
//         companyCode,
//         payload,
//       });

//       await Swal.fire({
//         toast: true,
//         position: "top-end",
//         icon: "success",
//         title: "Welcome back!",
//         showConfirmButton: false,
//         timer: 1800,
//         timerProgressBar: true,
//       });

//       navigate("/", { replace: true });
//     } catch (err) {
//       const msg =
//         err?.response?.data?.message ||
//         err?.message ||
//         "Unable to login using biometrics.";

//       if (err?.name === "NotAllowedError") {
//         await Swal.fire({
//           icon: "info",
//           title: "Biometric Login Cancelled",
//           text: "Authentication was cancelled or timed out.",
//           confirmButtonText: "OK",
//         });
//         return;
//       }

//       await Swal.fire({
//         icon: "error",
//         title: "Biometric Login Failed",
//         text: msg,
//         confirmButtonText: "OK",
//       });
//     } finally {
//       setBioAuthInProgress(false);
//       setIsBioLoading(false);
//     }
//   };

//   return (
//     <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(to_bottom,#7392b7,#d8e1e9)]">
//       <div className="pointer-events-none absolute inset-0 -z-10">
//         <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-300/30 to-sky-200/30 blur-3xl" />
//         <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-tr from-purple-500/25 to-fuchsia-400/25 blur-3xl" />
//       </div>

//       <div className="mx-auto flex max-w-6xl flex-col items-center justify-start px-4 pt-6 pb-24 md:pt-10 lg:pt-12">
//         <div className="mb-3 flex flex-col items-center text-center md:mb-4">
//           <img
//             src="/naysa_logo.png"
//             alt="NAYSA Logo"
//             className="w-40 drop-shadow-md md:w-44"
//           />
//           <h1 className="mt-2 text-2xl font-bold tracking-tight text-blue-900 md:text-3xl">
//             NAYSA Financials Cloud
//           </h1>
//           <p className="mt-2 text-sm text-slate-700">
//             Sign in with your account or use biometrics for faster access.
//           </p>
//         </div>

//         <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/40 p-6 shadow-xl backdrop-blur-md dark:bg-white/10">
//           <form onSubmit={handleSubmit} noValidate className="mt-3 space-y-4">
//             <label className="block">
//               <span className="mb-1 block text-sm font-medium text-slate-700">
//                 Company
//                 {!loadingCompanies && (
//                   <span className="ml-2 text-xs text-slate-500">
//                     ({companies.length} found)
//                   </span>
//                 )}
//               </span>
//               <div className="relative">
//                 <FiGlobe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <select
//                   value={companyCode}
//                   onChange={(e) => setCompanyCode(e.target.value)}
//                   disabled={loadingCompanies || isLoading || isBioLoading}
//                   className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
//                   required
//                 >
//                   <option value="" disabled>
//                     {loadingCompanies ? "Loading companies…" : "Select a company"}
//                   </option>
//                   {companies.map((c) => {
//                     const value = c.code || c.database;
//                     const label = c.company || value || "(unnamed)";
//                     return (
//                       <option key={value || label} value={value}>
//                         {label}
//                       </option>
//                     );
//                   })}
//                 </select>
//               </div>
//             </label>

//             <label className="block">
//               <span className="mb-1 block text-sm font-medium text-slate-700">
//                 User ID
//               </span>
//               <div className="relative">
//                 <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   type="text"
//                   name="USER_CODE"
//                   autoComplete="username"
//                   value={form.USER_CODE}
//                   onChange={handleChange}
//                   className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   placeholder="Enter your user ID"
//                 />
//               </div>
//             </label>

//             <label className="block">
//               <div className="mb-1 flex items-center justify-between">
//                 <span className="text-sm font-medium text-slate-700">
//                   Password
//                 </span>
//                 {capsOn && (
//                   <span className="text-xs font-semibold text-white">
//                     Caps Lock is ON
//                   </span>
//                 )}
//               </div>
//               <div className="relative">
//                 <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//                 <input
//                   ref={pwdRef}
//                   type={showPwd ? "text" : "password"}
//                   name="PASSWORD"
//                   autoComplete="current-password"
//                   value={form.PASSWORD}
//                   onChange={handleChange}
//                   onKeyUp={handleCaps}
//                   onKeyDown={handleCaps}
//                   className="w-full rounded-xl border border-slate-200 bg-white/90 py-3 pl-10 pr-12 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
//                   placeholder="••••••••"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPwd((s) => !s)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
//                   aria-label={showPwd ? "Hide password" : "Show password"}
//                 >
//                   {showPwd ? (
//                     <FiEyeOff className="h-5 w-5" />
//                   ) : (
//                     <FiEye className="h-5 w-5" />
//                   )}
//                 </button>
//               </div>
//             </label>

//             <div className="flex justify-end pt-1">
//               <button
//                 type="button"
//                 onClick={() => setShowForgot(true)}
//                 className="text-sm font-medium text-sky-700 hover:text-sky-600"
//               >
//                 Forgot password?
//               </button>
//             </div>

//             <button
//               type="submit"
//               disabled={
//                 isLoading ||
//                 isBioLoading ||
//                 loadingCompanies ||
//                 !companyCode ||
//                 !form.USER_CODE.trim() ||
//                 !form.PASSWORD
//               }
//               className="group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 font-medium text-white shadow-lg shadow-sky-600/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
//             >
//               {isLoading ? (
//                 <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
//                   <circle
//                     cx="12"
//                     cy="12"
//                     r="10"
//                     stroke="currentColor"
//                     strokeWidth="4"
//                     fill="none"
//                     className="opacity-25"
//                   />
//                   <path
//                     className="opacity-75"
//                     fill="currentColor"
//                     d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z"
//                   />
//                 </svg>
//               ) : (
//                 <>Log In</>
//               )}
//             </button>

//             <div className="pt-2">
//               <div className="mb-3 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
//                 or use biometrics
//               </div>

//               <button
//                 type="button"
//                 onClick={handleBiometricLogin}
//                 disabled={isLoading || isBioLoading || loadingCompanies || !companyCode}
//                 className="group w-full rounded-2xl border border-sky-200/80 bg-white/80 p-5 shadow-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
//               >
//                 <div className="flex flex-col items-center justify-center gap-3">
//                   <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-blue-200 shadow-inner">
//                     <ScanLine className="absolute h-12 w-12 text-sky-500/40" />
//                     <Fingerprint className="relative h-12 w-12 text-sky-700" />
//                   </div>

//                   <div className="text-center">
//                     <div className="text-base font-semibold text-slate-800">
//                       Login with Biometrics
//                     </div>
//                     <div className="mt-1 text-xs text-slate-500">
//                       Touch fingerprint or face recognition to sign in automatically
//                     </div>
//                   </div>

//                   {isBioLoading && (
//                     <svg className="h-5 w-5 animate-spin text-sky-700" viewBox="0 0 24 24" aria-hidden="true">
//                       <circle
//                         cx="12"
//                         cy="12"
//                         r="10"
//                         stroke="currentColor"
//                         strokeWidth="4"
//                         fill="none"
//                         className="opacity-25"
//                       />
//                       <path
//                         className="opacity-75"
//                         fill="currentColor"
//                         d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z"
//                       />
//                     </svg>
//                   )}
//                 </div>
//               </button>
//             </div>
//           </form>

//           <div className="mt-6 text-center">
//             <button
//               onClick={onSwitchToRegister}
//               className="text-sm text-slate-700 hover:underline"
//             >
//               Don’t have an account? <span className="text-sky-700">Register</span>
//             </button>
//             <p className="mt-3 text-xs text-slate-500">
//               © {new Date().getFullYear()} NAYSA. All rights reserved.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// import React, { useEffect, useState, useRef } from "react";
// import { FiUser, FiLock, FiEye, FiEyeOff, FiChevronDown } from "react-icons/fi";
// import { Fingerprint, Building2 } from "lucide-react";
// import { motion, AnimatePresence } from "framer-motion";
// import Swal from "sweetalert2";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "./AuthContext.jsx";
// import {
//   apiClient,
//   setTenant,
//   bioLoginOptionsPasswordless,
//   ensureCsrf,
// } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
// import {
//   prepareLoginPublicKey,
//   serializeLoginCredential,
// } from "@/NAYSA Cloud/Authentication/webauthn.js";
// import {
//   useSwalErrorAlert,
//   useSwalSuccessAlert,
//   useSwalWarningAlert,
// } from "@/NAYSA Cloud/Global/behavior.jsx";

// /* ─── Animation variants ─────────────────────────────────────────── */
// const fadeUp = {
//   hidden: { opacity: 0, y: 16 },
//   show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
// };

// const staggerContainer = {
//   hidden: {},
//   show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
// };

// const floatAnim = {
//   animate: {
//     y: [0, -6, 0],
//     transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
//   },
// };

// const pulseRing = {
//   animate: {
//     scale: [1, 1.22, 1.22],
//     opacity: [0.5, 0, 0],
//     transition: { duration: 2.2, repeat: Infinity, ease: [0.215, 0.61, 0.355, 1] },
//   },
// };

// const pulseRing2 = {
//   animate: {
//     scale: [1, 1.22, 1.22],
//     opacity: [0.3, 0, 0],
//     transition: { duration: 2.2, repeat: Infinity, ease: [0.215, 0.61, 0.355, 1], delay: 0.5 },
//   },
// };

// const scanLine = {
//   animate: {
//     top: ["12%", "78%", "12%"],
//     opacity: [0.9, 0.4, 0.9],
//     transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
//   },
// };

// const blob1 = {
//   animate: {
//     x: [0, 25, -18, 0],
//     y: [0, -18, 14, 0],
//     scale: [1, 1.04, 0.97, 1],
//     transition: { duration: 14, repeat: Infinity, ease: "easeInOut" },
//   },
// };

// const blob2 = {
//   animate: {
//     x: [0, -22, 18, 0],
//     y: [0, 18, -12, 0],
//     scale: [1, 1.03, 0.98, 1],
//     transition: { duration: 18, repeat: Infinity, ease: "easeInOut" },
//   },
// };

// /* ─── Helpers ────────────────────────────────────────────────────── */
// function normalizeCompaniesPayload(raw) {
//   let arr = [];
//   if (Array.isArray(raw)) arr = raw;
//   else if (Array.isArray(raw?.data)) arr = raw.data;
//   else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
//   else if (raw && typeof raw === "object") arr = Object.values(raw);
//   return arr.map((r) => {
//     const get = (o, ...keys) => keys.reduce((v, k) => v ?? o?.[k], undefined);
//     const code     = get(r, "code", "CODE", "Code") ?? get(r, "database", "DATABASE", "Database") ?? "";
//     const company  = get(r, "company", "COMPANY", "Company") ?? get(r, "database", "DATABASE", "Database") ?? get(r, "code", "CODE", "Code") ?? "";
//     const database = get(r, "database", "DATABASE", "Database") ?? "";
//     return {
//       code:     String(code || "").trim(),
//       company:  String(company || "").trim(),
//       database: String(database || "").trim(),
//     };
//   });
// }

// function Spinner({ size = 18 }) {
//   return (
//     <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
//       <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
//       <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
//     </svg>
//   );
// }

// /* ─── Field wrapper ──────────────────────────────────────────────── */
// function Field({ label, right, children }) {
//   return (
//     <motion.div variants={fadeUp}>
//       {(label || right) && (
//         <div className="mb-1.5 flex items-center justify-between">
//           {label && (
//             <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
//               {label}
//             </span>
//           )}
//           {right}
//         </div>
//       )}
//       {children}
//     </motion.div>
//   );
// }

// /* ─── Input box with animated focus underline ────────────────────── */
// function InputBox({ icon: Icon, children }) {
//   const [focused, setFocused] = useState(false);
//   return (
//     <div
//       className="relative"
//       onFocus={() => setFocused(true)}
//       onBlur={() => setFocused(false)}
//     >
//       <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
//         <Icon
//           size={14}
//           className={focused ? "text-sky-500" : "text-slate-400"}
//           style={{ transition: "color .2s" }}
//         />
//       </div>
//       {children}
//       <motion.span
//         className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl origin-left"
//         style={{ background: "linear-gradient(90deg,#38bdf8,#6366f1)" }}
//         animate={{ scaleX: focused ? 1 : 0 }}
//         transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
//       />
//     </div>
//   );
// }

// const inputCls =
//   "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 " +
//   "text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm " +
//   "transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 " +
//   "disabled:opacity-50 disabled:cursor-not-allowed";

// /* ════════════════════════════════════════════════════════════════════
//    Login
//    ════════════════════════════════════════════════════════════════════ */
// export default function Login({ onSwitchToRegister }) {
//   const { login, loginWithBiometric } = useAuth();
//   const navigate = useNavigate();

//   const [form, setForm] = useState({ USER_CODE: "", PASSWORD: "" });
//   const [companies, setCompanies] = useState([]);
//   const [companyCode, setCompanyCode] = useState(localStorage.getItem("companyCode") || "");
//   const [loadingCompanies, setLoadingCompanies] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isBioLoading, setIsBioLoading] = useState(false);
//   const [showPwd, setShowPwd] = useState(false);
//   const [capsOn, setCapsOn] = useState(false);
//   const pwdRef = useRef(null);

//   /* ── Load companies ── */
//   useEffect(() => {
//     let alive = true;
//     (async () => {
//       try {
//         setLoadingCompanies(true);
//         const { data } = await apiClient.get("/companies");
//         const options = normalizeCompaniesPayload(data).filter((x) => x.code || x.database);
//         if (!alive) return;
//         setCompanies(options);
//         if (!companyCode && options.length === 1) {
//           setCompanyCode(options[0].code || options[0].database || "");
//         } else if (
//           companyCode &&
//           !options.some((o) => o.code === companyCode || o.database === companyCode)
//         ) {
//           if (options[0]) setCompanyCode(options[0].code || options[0].database || "");
//         }
//       } catch (e) {
//         useSwalErrorAlert(
//           "Unable to load companies",
//           e?.response?.data?.message || e?.message || "Please check the /api/companies endpoint."
//         );
//       } finally {
//         if (alive) setLoadingCompanies(false);
//       }
//     })();
//     return () => { alive = false; };
//   }, [companyCode]);

//   useEffect(() => {
//     if (companyCode) localStorage.setItem("companyCode", companyCode);
//   }, [companyCode]);

//   const setBioAuthInProgress = (v) => {
//     try {
//       if (v) sessionStorage.setItem("bioAuthInProgress", "1");
//       else sessionStorage.removeItem("bioAuthInProgress");
//     } catch {}
//   };

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm((s) => ({ ...s, [name]: value }));
//   };
//   const handleCaps = (e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));

//   /* ── Password login ── */
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!form.USER_CODE.trim() || !form.PASSWORD) return;

//     if (!companyCode) {
//       useSwalWarningAlert("Select Company", "Please choose a company before logging in.");
//       return;
//     }

//     setTenant(companyCode);
//     await ensureCsrf();
//     setIsLoading(true);

//     try {
//       await login({ companyCode, USER_CODE: form.USER_CODE.trim(), PASSWORD: form.PASSWORD });
//       useSwalSuccessAlert("Welcome back!", "You have successfully signed in.");
//       navigate("/", { replace: true });
//     } catch (err) {
//       const status = err?.response?.status;
//       const code   = err?.response?.data?.code;
//       const msg    = err?.response?.data?.message || err?.message || "Please try again.";

//       if (status === 403 && code === "PENDING") {
//         useSwalErrorAlert(
//           "Awaiting Administrator Approval",
//           "Your account is pending activation.\nPlease wait for the administrator to approve your account and send a temporary password."
//         );
//         return;
//       }

//       if (status === 403 && code === "INACTIVE") {
//         useSwalErrorAlert(
//           "Account Inactive",
//           msg || "Your account has been deactivated. Please contact the administrator."
//         );
//         return;
//       }

//       if (status === 429 && code === "SEAT_LIMIT") {
//         useSwalWarningAlert(
//           "Login Limit Reached",
//           msg || "Maximum concurrent users reached. Please try again later."
//         );
//         return;
//       }

//       useSwalErrorAlert("Login failed", msg);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   /* ── Biometric login ── */
//   const handleBiometricLogin = async () => {
//     try {
//       if (!companyCode) {
//         useSwalWarningAlert("Select Company", "Please choose a company before logging in.");
//         return;
//       }

//       if (!window.PublicKeyCredential || typeof navigator.credentials?.get !== "function") {
//         useSwalErrorAlert(
//           "Biometric Login Not Supported",
//           "This browser or device does not support biometric login."
//         );
//         return;
//       }

//       setBioAuthInProgress(true);
//       setIsBioLoading(true);
//       setTenant(companyCode);

//       const optionRes = await bioLoginOptionsPasswordless();
//       if (!optionRes?.success || !optionRes?.data) {
//         throw new Error(optionRes?.message || "Failed to load biometric login options.");
//       }

//       const publicKey  = prepareLoginPublicKey(optionRes.data);
//       const credential = await navigator.credentials.get({ publicKey });
//       if (!credential) throw new Error("Biometric authentication was cancelled.");

//       await loginWithBiometric({
//         companyCode,
//         payload: { credential: serializeLoginCredential(credential) },
//       });

//       useSwalSuccessAlert("Welcome back!", "Biometric authentication successful.");
//       navigate("/", { replace: true });
//     } catch (err) {
//       const msg = err?.response?.data?.message || err?.message || "Unable to login using biometrics.";

//       if (err?.name === "NotAllowedError") {
//         useSwalErrorAlert("Biometric Login Cancelled", "Authentication was cancelled or timed out.");
//         return;
//       }

//       useSwalErrorAlert("Biometric Login Failed", msg);
//     } finally {
//       setBioAuthInProgress(false);
//       setIsBioLoading(false);
//     }
//   };

//   /* ════════════════════════════════════════════════════════════════
//      Render
//      ════════════════════════════════════════════════════════════════ */
//   return (
//     <div
//       className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-10"
//       style={{ background: "linear-gradient(to bottom, #7392b7, #d8e1e9)" }}
//     >
//       {/* Blobs */}
//       <motion.div
//         {...blob1}
//         className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl"
//         style={{ background: "radial-gradient(circle, rgba(99,102,241,.28) 0%, rgba(56,189,248,.18) 100%)" }}
//       />
//       <motion.div
//         {...blob2}
//         className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl"
//         style={{ background: "radial-gradient(circle, rgba(168,85,247,.22) 0%, rgba(217,70,239,.18) 100%)" }}
//       />

//       <div className="relative w-full max-w-md">

//         {/* ── Logo + Title ── */}
//         <div className="mb-5 flex flex-col items-center text-center">
//           <motion.div {...floatAnim} className="mb-2">
//             <img src="/naysa_logo.png" alt="NAYSA Logo" className="w-40 drop-shadow-md md:w-44" />
//           </motion.div>
//           <motion.h1
//             initial={{ opacity: 0, y: 10 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.4, delay: 0.05 }}
//             className="mt-1 text-2xl font-bold tracking-tight text-blue-900 md:text-3xl"
//           >
//             NAYSA Financials Cloud
//           </motion.h1>
//           <motion.p
//             initial={{ opacity: 0, y: 8 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.4, delay: 0.1 }}
//             className="mt-1.5 text-sm text-slate-700"
//           >
//             Sign in with your account or use biometrics for faster access.
//           </motion.p>
//         </div>

//         {/* ── Card ── */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
//           className="relative w-full rounded-2xl p-7"
//           style={{
//             background: "rgba(255,255,255,0.52)",
//             border: "1px solid rgba(255,255,255,0.65)",
//             backdropFilter: "blur(20px)",
//             WebkitBackdropFilter: "blur(20px)",
//             boxShadow: "0 20px 60px rgba(55,90,140,.18), inset 0 1px 0 rgba(255,255,255,.85)",
//           }}
//         >
//           {/* Top shimmer line */}
//           <div
//             className="absolute top-0 left-10 right-10 h-px rounded-full"
//             style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent)" }}
//           />

//           <motion.form
//             onSubmit={handleSubmit}
//             noValidate
//             variants={staggerContainer}
//             initial="hidden"
//             animate="show"
//             className="space-y-4"
//           >

//             {/* Company */}
//             <Field
//               label={
//                 <>
//                   Company
//                   {!loadingCompanies && companies.length > 0 && (
//                     <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">
//                       ({companies.length} found)
//                     </span>
//                   )}
//                 </>
//               }
//             >
//               <div className="relative">
//                 <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
//                   <Building2 size={14} className="text-slate-400" />
//                 </div>
//                 <select
//                   value={companyCode}
//                   onChange={(e) => setCompanyCode(e.target.value)}
//                   disabled={loadingCompanies || isLoading || isBioLoading}
//                   className={inputCls + " appearance-none cursor-pointer pr-9"}
//                   required
//                 >
//                   <option value="" disabled>
//                     {loadingCompanies ? "Loading companies…" : "Select a company"}
//                   </option>
//                   {companies.map((c) => {
//                     const value = c.code || c.database;
//                     const label = c.company || value || "(unnamed)";
//                     return <option key={value || label} value={value}>{label}</option>;
//                   })}
//                 </select>
//                 <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
//                   <FiChevronDown size={14} />
//                 </span>
//               </div>
//             </Field>

//             {/* User ID */}
//             <Field label="User ID">
//               <InputBox icon={FiUser}>
//                 <input
//                   type="text"
//                   name="USER_CODE"
//                   autoComplete="username"
//                   value={form.USER_CODE}
//                   onChange={handleChange}
//                   placeholder="Enter your user ID"
//                   className={inputCls}
//                 />
//               </InputBox>
//             </Field>

//             {/* Password */}
//             <Field
//               label="Password"
//               right={
//                 <AnimatePresence>
//                   {capsOn && (
//                     <motion.span
//                       key="caps"
//                       initial={{ opacity: 0, scale: 0.85 }}
//                       animate={{ opacity: 1, scale: 1 }}
//                       exit={{ opacity: 0, scale: 0.85 }}
//                       transition={{ duration: 0.18 }}
//                       className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-600 border border-amber-200"
//                     >
//                       CAPS LOCK ON
//                     </motion.span>
//                   )}
//                 </AnimatePresence>
//               }
//             >
//               <InputBox icon={FiLock}>
//                 <input
//                   ref={pwdRef}
//                   type={showPwd ? "text" : "password"}
//                   name="PASSWORD"
//                   autoComplete="current-password"
//                   value={form.PASSWORD}
//                   onChange={handleChange}
//                   onKeyUp={handleCaps}
//                   onKeyDown={handleCaps}
//                   placeholder="••••••••"
//                   className={inputCls + " pr-11"}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPwd((s) => !s)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
//                   aria-label={showPwd ? "Hide password" : "Show password"}
//                 >
//                   {showPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
//                 </button>
//               </InputBox>
//             </Field>

//             {/* Forgot */}
//             <motion.div variants={fadeUp} className="flex justify-end -mt-1">
//               <button
//                 type="button"
//                 onClick={() => setShowForgot(true)}
//                 className="text-sm font-medium text-sky-700 hover:text-sky-600 transition-colors"
//               >
//                 Forgot password?
//               </button>
//             </motion.div>

//             {/* Submit */}
//             <motion.div variants={fadeUp}>
//               <motion.button
//                 type="submit"
//                 disabled={isLoading || isBioLoading || loadingCompanies || !companyCode || !form.USER_CODE.trim() || !form.PASSWORD}
//                 whileHover={{ y: -1, boxShadow: "0 8px 20px rgba(29,78,216,.35)" }}
//                 whileTap={{ y: 0 }}
//                 className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
//                 style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)" }}
//               >
//                 {isLoading ? (
//                   <span className="flex items-center justify-center gap-2">
//                     <Spinner size={16} /> Signing in…
//                   </span>
//                 ) : "Log In"}
//               </motion.button>
//             </motion.div>

//             {/* Divider */}
//             <motion.div variants={fadeUp} className="flex items-center gap-3">
//               <div
//                 className="h-px flex-1"
//                 style={{ background: "linear-gradient(90deg,transparent,rgba(148,163,184,.3),transparent)" }}
//               />
//               <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 whitespace-nowrap">
//                 or use biometrics
//               </span>
//               <div
//                 className="h-px flex-1"
//                 style={{ background: "linear-gradient(90deg,transparent,rgba(148,163,184,.3),transparent)" }}
//               />
//             </motion.div>

//             {/* Biometric button */}
//             <motion.div variants={fadeUp}>
//               <motion.button
//                 type="button"
//                 onClick={handleBiometricLogin}
//                 disabled={isLoading || isBioLoading || loadingCompanies || !companyCode}
//                 whileHover={{ y: -2, boxShadow: "0 10px 28px rgba(56,189,248,.2)" }}
//                 whileTap={{ y: 0 }}
//                 className="w-full rounded-2xl py-5 disabled:opacity-50 disabled:cursor-not-allowed"
//                 style={{
//                   background: "rgba(255,255,255,0.72)",
//                   border: "1.5px solid rgba(56,189,248,0.35)",
//                   backdropFilter: "blur(8px)",
//                 }}
//               >
//                 <div className="flex flex-col items-center gap-3">

//                   {/* Fingerprint with rings */}
//                   <div className="relative flex h-20 w-20 items-center justify-center">
//                     <AnimatePresence>
//                       {!isBioLoading && (
//                         <>
//                           <motion.span
//                             key="ring1"
//                             {...pulseRing}
//                             className="absolute inset-0 rounded-full"
//                             style={{ border: "1.5px solid rgba(14,165,233,.4)" }}
//                           />
//                           <motion.span
//                             key="ring2"
//                             {...pulseRing2}
//                             className="absolute inset-0 rounded-full"
//                             style={{ border: "1.5px solid rgba(14,165,233,.22)" }}
//                           />
//                         </>
//                       )}
//                     </AnimatePresence>

//                     {/* Circle bg — original sky-100 → blue-200 */}
//                     <div
//                       className="absolute inset-0 rounded-full shadow-inner"
//                       style={{
//                         background: "linear-gradient(135deg,#e0f2fe 0%,#bfdbfe 100%)",
//                         border: "1px solid rgba(56,189,248,.3)",
//                       }}
//                     />

//                     {/* Scan line */}
//                     <AnimatePresence>
//                       {!isBioLoading && (
//                         <motion.span
//                           key="scan"
//                           {...scanLine}
//                           className="absolute left-[14%] right-[14%] h-px rounded-full"
//                           style={{ background: "linear-gradient(90deg,transparent,#38bdf8,transparent)" }}
//                         />
//                       )}
//                     </AnimatePresence>

//                     {/* Icon swap */}
//                     <div className="relative z-10">
//                       <AnimatePresence mode="wait">
//                         {isBioLoading ? (
//                           <motion.span
//                             key="spinner"
//                             initial={{ opacity: 0, scale: 0.8 }}
//                             animate={{ opacity: 1, scale: 1 }}
//                             exit={{ opacity: 0, scale: 0.8 }}
//                             transition={{ duration: 0.2 }}
//                           >
//                             <Spinner size={30} />
//                           </motion.span>
//                         ) : (
//                           <motion.span
//                             key="fp"
//                             initial={{ opacity: 0, scale: 0.8 }}
//                             animate={{ opacity: 1, scale: 1 }}
//                             exit={{ opacity: 0, scale: 0.8 }}
//                             transition={{ duration: 0.2 }}
//                           >
//                             <Fingerprint size={32} strokeWidth={1.5} className="text-sky-700" />
//                           </motion.span>
//                         )}
//                       </AnimatePresence>
//                     </div>
//                   </div>

//                   <div className="text-center">
//                     <p className="text-sm font-semibold text-slate-800">
//                       {isBioLoading ? "Authenticating…" : "Login with Biometrics"}
//                     </p>
//                     <p className="mt-0.5 text-xs text-slate-500">
//                       Touch fingerprint to sign in automatically
//                     </p>
//                   </div>
//                 </div>
//               </motion.button>
//             </motion.div>

//           </motion.form>

//           {/* Footer */}
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             transition={{ delay: 0.5, duration: 0.4 }}
//             className="mt-5 text-center"
//           >
//             <button
//               onClick={onSwitchToRegister}
//               className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
//             >
//               Don't have an account?{" "}
//               <span className="font-semibold text-sky-700 hover:text-sky-600">Register</span>
//             </button>
//             <p className="mt-3 text-xs text-slate-400">
//               © {new Date().getFullYear()} NAYSA. All rights reserved.
//             </p>
//           </motion.div>
//         </motion.div>
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useState, useRef } from "react";
import { FiUser, FiLock, FiEye, FiEyeOff, FiChevronDown } from "react-icons/fi";
import { Fingerprint, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import {
  apiClient,
  setTenant,
  bioLoginOptionsPasswordless,
  ensureCsrf,
} from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  prepareLoginPublicKey,
  serializeLoginCredential,
} from "@/NAYSA Cloud/Authentication/webauthn.js";
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalWarningAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import ForgotPassword from "./ForgotPassword.jsx";

/* ─── Animation variants ─────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const floatAnim = {
  animate: {
    y: [0, -6, 0],
    transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
  },
};

const pulseRing = {
  animate: {
    scale: [1, 1.22, 1.22],
    opacity: [0.5, 0, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: [0.215, 0.61, 0.355, 1] },
  },
};

const pulseRing2 = {
  animate: {
    scale: [1, 1.22, 1.22],
    opacity: [0.3, 0, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: [0.215, 0.61, 0.355, 1], delay: 0.5 },
  },
};

const scanLine = {
  animate: {
    top: ["12%", "78%", "12%"],
    opacity: [0.9, 0.4, 0.9],
    transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
  },
};

const blob1 = {
  animate: {
    x: [0, 25, -18, 0],
    y: [0, -18, 14, 0],
    scale: [1, 1.04, 0.97, 1],
    transition: { duration: 14, repeat: Infinity, ease: "easeInOut" },
  },
};

const blob2 = {
  animate: {
    x: [0, -22, 18, 0],
    y: [0, 18, -12, 0],
    scale: [1, 1.03, 0.98, 1],
    transition: { duration: 18, repeat: Infinity, ease: "easeInOut" },
  },
};

/* ─── Helpers ────────────────────────────────────────────────────── */
function normalizeCompaniesPayload(raw) {
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw?.data)) arr = raw.data;
  else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
  else if (raw && typeof raw === "object") arr = Object.values(raw);
  return arr.map((r) => {
    const get = (o, ...keys) => keys.reduce((v, k) => v ?? o?.[k], undefined);
    const code     = get(r, "code", "CODE", "Code") ?? get(r, "database", "DATABASE", "Database") ?? "";
    const company  = get(r, "company", "COMPANY", "Company") ?? get(r, "database", "DATABASE", "Database") ?? get(r, "code", "CODE", "Code") ?? "";
    const database = get(r, "database", "DATABASE", "Database") ?? "";
    return {
      code:     String(code || "").trim(),
      company:  String(company || "").trim(),
      database: String(database || "").trim(),
    };
  });
}

function Spinner({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" className="opacity-25" />
      <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
    </svg>
  );
}

/* ─── Field wrapper ──────────────────────────────────────────────── */
function Field({ label, right, children }) {
  return (
    <motion.div variants={fadeUp}>
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </span>
          )}
          {right}
        </div>
      )}
      {children}
    </motion.div>
  );
}

/* ─── Input box with animated focus underline ────────────────────── */
function InputBox({ icon: Icon, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="relative"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
        <Icon
          size={14}
          className={focused ? "text-sky-500" : "text-slate-400"}
          style={{ transition: "color .2s" }}
        />
      </div>
      {children}
      <motion.span
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl origin-left"
        style={{ background: "linear-gradient(90deg,#38bdf8,#6366f1)" }}
        animate={{ scaleX: focused ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 " +
  "text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-sm " +
  "transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  width: "22rem",
  customClass: {
    popup: "rounded-xl shadow-lg text-sm",
    title: "text-sm font-semibold",
  },
});

const showToast = (icon, title, text = "") => {
  Toast.fire({ icon, title, text });
};

const waitForLoginApproval = async (
  requestId,
  maxWaitMs = 60000,
  shouldCancel = () => false
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    if (shouldCancel()) return "cancelled";

    const { data } = await apiClient.get(`/login/request-status/${requestId}`);

    if (shouldCancel()) return "cancelled";
    if (data?.status === "approved") return "approved";
    if (data?.status === "denied") return "denied";
    if (data?.status === "expired") return "expired";

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return shouldCancel() ? "cancelled" : "expired";
};

/* ════════════════════════════════════════════════════════════════════
   Login
   ════════════════════════════════════════════════════════════════════ */
export default function Login({ onSwitchToRegister }) {
  const { setUser, loginWithBiometric } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ USER_CODE: "", PASSWORD: "" });
  const [companies, setCompanies] = useState([]);
  const [companyCode, setCompanyCode] = useState(localStorage.getItem("companyCode") || "");
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const pwdRef = useRef(null);

  /* ── Load companies ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCompanies(true);
        const { data } = await apiClient.get("/companies");
        const options = normalizeCompaniesPayload(data).filter((x) => x.code || x.database);
        if (!alive) return;
        setCompanies(options);
        
        if (!companyCode && options.length === 1) {
          setCompanyCode(options[0].code || options[0].database || "");
        } else if (
          companyCode &&
          !options.some((o) => o.code === companyCode || o.database === companyCode)
        ) {
          if (options[0]) setCompanyCode(options[0].code || options[0].database || "");
        }
      } catch (e) {
        useSwalErrorAlert(
          "Unable to load companies",
          e?.response?.data?.message || e?.message || "Please check the /api/companies endpoint."
        );
      } finally {
        if (alive) setLoadingCompanies(false);
      }
    })();
    return () => { alive = false; };
  }, [companyCode]);

  useEffect(() => {
    if (companyCode) localStorage.setItem("companyCode", companyCode);
  }, [companyCode]);

  const setBioAuthInProgress = (v) => {
    try {
      if (v) sessionStorage.setItem("bioAuthInProgress", "1");
      else sessionStorage.removeItem("bioAuthInProgress");
    } catch {}
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };
  const handleCaps = (e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));

  /* ── Password login ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.USER_CODE.trim() || !form.PASSWORD) return;

    if (!companyCode) {
      showToast("warning", "Select Company", "Please choose a company before logging in.");
      return;
    }

    setIsLoading(true);

    try {
<<<<<<< HEAD
      setTenant(companyCode); 
      
      const { data } = await apiClient.post("/login", {
=======
      await login({
        companyCode,
>>>>>>> 44b5327e3b903f6be4ec22f691571cec8184c7e7
        USER_CODE: form.USER_CODE.trim(),
        PASSWORD: form.PASSWORD,
      });

<<<<<<< HEAD
      if (data?.status !== "success") {
        throw new Error(data?.message || "Login failed.");
      }

      const d = data?.data || {};
      const normalized = {
        USER_CODE: d.USER_CODE ?? form.USER_CODE.trim(),
        USER_NAME: d.USER_NAME ?? d.username ?? form.USER_CODE.trim(),
        USER_TYPE: d.USER_TYPE ?? "", 
      };

      setUser(normalized);

      useSwalSuccessAlert("Welcome back!", `You have successfully signed in as ${normalized.USER_NAME}.`);
=======
      showToast("success", "Welcome back!", "You have successfully signed in.");
>>>>>>> 44b5327e3b903f6be4ec22f691571cec8184c7e7
      navigate("/", { replace: true });

    } catch (err) {
      const status = err?.response?.status;
      const code   = err?.response?.data?.code;
      const msg    = err?.response?.data?.message || err?.message || "Please try again.";

      const isApprovalRequired =
        status === 409 &&
        (code === "LOGIN_APPROVAL_REQUIRED" || code === "ACTIVE_SESSION");

      if (isApprovalRequired) {
        const requestId = err?.response?.data?.requestId;

        if (!requestId) {
          showToast(
            "error",
            "Login blocked",
            "Active session detected but no approval request was created."
          );
          return;
        }

        let approvalCancelled = false;

Swal.fire({
  title: "",
  html: `
    <div style="text-align:center;">
      <div style="height:36px;width:36px;margin:0 auto 10px;border-radius:999px;background:linear-gradient(135deg,#dbeafe,#bfdbfe);display:flex;align-items:center;justify-content:center;color:#1d4ed8;font-size:17px;font-weight:800;">
        ⏳
      </div>
      <div style="font-size:15px;font-weight:800;color:#0f172a;line-height:1.2;">
        Account Already Logged In
      </div>
      <div style="font-size:12px;color:#64748b;line-height:1.45;margin-top:8px;">
        Your account is currently active in another session. Please approve the login request from that session to continue.
      </div>
    </div>
  `,
  width: "min(320px, calc(100vw - 28px))",
  padding: "0.9rem",
  background: "#ffffff",
  backdrop: "rgba(15, 23, 42, 0.30)",
  allowOutsideClick: false,
  allowEscapeKey: false,
  heightAuto: false,
  showCancelButton: true,
  showConfirmButton: false,
  cancelButtonText: "Cancel",
  buttonsStyling: false,
  customClass: {
    popup: "rounded-2xl shadow-2xl border border-slate-200",
    htmlContainer: "m-0",
    actions: "mt-3 w-full",
    cancelButton:
      "w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200",
  },
}).then((res) => {
  if (res.dismiss) approvalCancelled = true;
});

const approvalStatus = await waitForLoginApproval(
  requestId,
  60000,
  () => approvalCancelled
);

Swal.close();
        

        if (approvalStatus === "approved") {
          try {
            await login({
              companyCode,
              USER_CODE: form.USER_CODE.trim(),
              PASSWORD: form.PASSWORD,
              approvalRequestId: requestId,
            });

            showToast("success", "Welcome back!", "You have successfully signed in.");
            navigate("/", { replace: true });
          } catch (approvedLoginErr) {
            showToast(
              "error",
              "Login failed",
              approvedLoginErr?.response?.data?.message ||
                approvedLoginErr?.message ||
                "Please try again."
            );
          }

          return;
        }

        if (approvalStatus === "denied") {
          showToast("error", "Login denied", "The active session denied your login request.");
          return;
        }

        if (approvalStatus === "cancelled") {
          showToast("info", "Login cancelled", "You cancelled the approval request.");
          return;
        }

        showToast("warning", "Approval expired", "No response was received from the active session.");
        return;
      }

      if (status === 403 && code === "PENDING") {
        showToast("info", "Awaiting Administrator Approval", "Your account is pending activation.");
        return;
      }

      if (status === 403 && code === "INACTIVE") {
        showToast("error", "Account Inactive", msg || "Your account has been deactivated.");
        return;
      }

<<<<<<< HEAD
      if (status === 403 && code === "PASSWORD_EXPIRED") {
    useSwalErrorAlert(
        "Password Expired",
        msg || "Your password has expired. Please set a new password."
    );
    navigate(
        `/change-password?user=${encodeURIComponent(form.USER_CODE.trim())}&mode=expired&company=${encodeURIComponent(companyCode)}`
    );
    return;
}

      if (status === 429 && code === "SEAT_LIMIT") {
        useSwalErrorAlert(
          "Login Limit Reached",
          msg || "Maximum concurrent users reached. Please try again later."
        );
=======
      if (status === 403 && code === "LOCKED") {
        showToast("error", "Account Locked", msg || "Your account has been locked.");
        return;
      }

      if (status === 403 && code === "PASSWORD_EXPIRED") {
        showToast("warning", "Password Expired", msg || "Your password has expired.");
        navigate(
          `/change-password?user=${encodeURIComponent(form.USER_CODE.trim())}&mode=expired&company=${encodeURIComponent(companyCode)}`
        );
        return;
      }

      if (status === 429 && code === "SEAT_LIMIT") {
        showToast("warning", "Login Limit Reached", msg || "Maximum concurrent users reached.");
>>>>>>> 44b5327e3b903f6be4ec22f691571cec8184c7e7
        return;
      }

      showToast("error", "Login failed", msg);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Biometric login ── */
  const handleBiometricLogin = async () => {
    try {
      if (!companyCode) {
        showToast("warning", "Select Company", "Please choose a company before logging in.");
        return;
      }

      if (!window.PublicKeyCredential || typeof navigator.credentials?.get !== "function") {
        showToast("error", "Biometric Login Not Supported", "This browser or device does not support biometric login.");
        return;
      }

      setBioAuthInProgress(true);
      setIsBioLoading(true);
      setTenant(companyCode);

      const optionRes = await bioLoginOptionsPasswordless();
      if (!optionRes?.success || !optionRes?.data) {
        throw new Error(optionRes?.message || "Failed to load biometric login options.");
      }

      const publicKey  = prepareLoginPublicKey(optionRes.data);
      const credential = await navigator.credentials.get({ publicKey });
      if (!credential) throw new Error("Biometric authentication was cancelled.");

      await loginWithBiometric({
        companyCode,
        payload: { credential: serializeLoginCredential(credential) },
      });

      showToast("success", "Welcome back!", "Biometric authentication successful.");
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Unable to login using biometrics.";

      if (err?.name === "NotAllowedError") {
        showToast("info", "Biometric Login Cancelled", "Authentication was cancelled or timed out.");
        return;
      }

      showToast("error", "Biometric Login Failed", msg);
    } finally {
      setBioAuthInProgress(false);
      setIsBioLoading(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════
     Render
     ════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(to bottom, #7392b7, #d8e1e9)" }}
    >
      {/* Blobs */}
      <motion.div
        {...blob1}
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,.28) 0%, rgba(56,189,248,.18) 100%)" }}
      />
      <motion.div
        {...blob2}
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,.22) 0%, rgba(217,70,239,.18) 100%)" }}
      />

      <div className="relative w-full max-w-md">

        {/* ── Logo + Title ── */}
        <div className="mb-5 flex flex-col items-center text-center">
          <motion.div {...floatAnim} className="mb-2">
            <img src="/naysa_logo.png" alt="NAYSA Logo" className="w-40 drop-shadow-md md:w-44" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mt-1 text-2xl font-bold tracking-tight text-blue-900 md:text-3xl"
          >
            NAYSA Financials Cloud
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-1.5 text-sm text-slate-700"
          >
            Sign in with your account or use biometrics for faster access.
          </motion.p>
        </div>

        {/* ── Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full rounded-2xl p-7"
          style={{
            background: "rgba(255,255,255,0.52)",
            border: "1px solid rgba(255,255,255,0.65)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(55,90,140,.18), inset 0 1px 0 rgba(255,255,255,.85)",
          }}
        >
          {/* Top shimmer line */}
          <div
            className="absolute top-0 left-10 right-10 h-px rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.9), transparent)" }}
          />

          <motion.form
            onSubmit={handleSubmit}
            noValidate
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >

            {/* Company */}
            <Field
              label={
                <>
                  Company
                  {!loadingCompanies && companies.length > 0 && (
                    <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">
                      ({companies.length} found)
                    </span>
                  )}
                </>
              }
            >
              <div className="relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10">
                  <Building2 size={14} className="text-slate-400" />
                </div>
                <select
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  disabled={loadingCompanies || isLoading || isBioLoading}
                  className={inputCls + " appearance-none cursor-pointer pr-9"}
                  required
                >
                  <option value="" disabled>
                    {loadingCompanies ? "Loading companies…" : "Select a company"}
                  </option>
                  {companies.map((c) => {
                    const value = c.code || c.database;
                    const label = c.company || value || "(unnamed)";
                    return <option key={value || label} value={value}>{label}</option>;
                  })}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <FiChevronDown size={14} />
                </span>
              </div>
            </Field>

            {/* User ID */}
            <Field label="User ID">
              <InputBox icon={FiUser}>
                <input
                  type="text"
                  name="USER_CODE"
                  autoComplete="username"
                  value={form.USER_CODE}
                  onChange={handleChange}
                  placeholder="Enter your user ID"
                  className={inputCls}
                />
              </InputBox>
            </Field>

            {/* Password */}
            <Field
              label="Password"
              right={
                <AnimatePresence>
                  {capsOn && (
                    <motion.span
                      key="caps"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{ duration: 0.18 }}
                      className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-600 border border-amber-200"
                    >
                      CAPS LOCK ON
                    </motion.span>
                  )}
                </AnimatePresence>
              }
            >
              <InputBox icon={FiLock}>
                <input
                  ref={pwdRef}
                  type={showPwd ? "text" : "password"}
                  name="PASSWORD"
                  autoComplete="current-password"
                  value={form.PASSWORD}
                  onChange={handleChange}
                  onKeyUp={handleCaps}
                  onKeyDown={handleCaps}
                  placeholder="••••••••"
                  className={inputCls + " pr-11"}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-md p-1 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </InputBox>
            </Field>

            {/* Forgot */}
            <motion.div variants={fadeUp} className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-sm font-medium text-sky-700 hover:text-sky-600 transition-colors"
              >
                Forgot password?
              </button>
            </motion.div>

            {/* Submit */}
            <motion.div variants={fadeUp}>
              <motion.button
                type="submit"
                disabled={isLoading || isBioLoading || loadingCompanies || !companyCode || !form.USER_CODE.trim() || !form.PASSWORD}
                whileHover={{ y: -1, boxShadow: "0 8px 20px rgba(29,78,216,.35)" }}
                whileTap={{ y: 0 }}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg,#0369a1 0%,#1d4ed8 100%)" }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size={16} /> Signing in…
                  </span>
                ) : "Log In"}
              </motion.button>
            </motion.div>

            {/* Divider */}
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <div
                className="h-px flex-1"
                style={{ background: "linear-gradient(90deg,transparent,rgba(148,163,184,.3),transparent)" }}
              />
              <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 whitespace-nowrap">
                or use biometrics
              </span>
              <div
                className="h-px flex-1"
                style={{ background: "linear-gradient(90deg,transparent,rgba(148,163,184,.3),transparent)" }}
              />
            </motion.div>

            {/* Biometric button */}
            <motion.div variants={fadeUp}>
              <motion.button
                type="button"
                onClick={handleBiometricLogin}
                disabled={isLoading || isBioLoading || loadingCompanies || !companyCode}
                whileHover={{ y: -2, boxShadow: "0 10px 28px rgba(56,189,248,.2)" }}
                whileTap={{ y: 0 }}
                className="w-full rounded-2xl py-5 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1.5px solid rgba(56,189,248,0.35)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="flex flex-col items-center gap-3">

                  {/* Fingerprint with rings */}
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <AnimatePresence>
                      {!isBioLoading && (
                        <>
                          <motion.span
                            key="ring1"
                            {...pulseRing}
                            className="absolute inset-0 rounded-full"
                            style={{ border: "1.5px solid rgba(14,165,233,.4)" }}
                          />
                          <motion.span
                            key="ring2"
                            {...pulseRing2}
                            className="absolute inset-0 rounded-full"
                            style={{ border: "1.5px solid rgba(14,165,233,.22)" }}
                          />
                        </>
                      )}
                    </AnimatePresence>

                    {/* Circle bg */}
                    <div
                      className="absolute inset-0 rounded-full shadow-inner"
                      style={{
                        background: "linear-gradient(135deg,#e0f2fe 0%,#bfdbfe 100%)",
                        border: "1px solid rgba(56,189,248,.3)",
                      }}
                    />

                    {/* Scan line */}
                    <AnimatePresence>
                      {!isBioLoading && (
                        <motion.span
                          key="scan"
                          {...scanLine}
                          className="absolute left-[14%] right-[14%] h-px rounded-full"
                          style={{ background: "linear-gradient(90deg,transparent,#38bdf8,transparent)" }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Icon swap */}
                    <div className="relative z-10">
                      <AnimatePresence mode="wait">
                        {isBioLoading ? (
                          <motion.span
                            key="spinner"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Spinner size={30} />
                          </motion.span>
                        ) : (
                          <motion.span
                            key="fp"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Fingerprint size={32} strokeWidth={1.5} className="text-sky-700" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-800">
                      {isBioLoading ? "Authenticating…" : "Login with Biometrics"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Touch fingerprint to sign in automatically
                    </p>
                  </div>
                </div>
              </motion.button>
            </motion.div>

          </motion.form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-5 text-center"
          >
            <button
              onClick={onSwitchToRegister}
              className="text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Don't have an account?{" "}
              <span className="font-semibold text-sky-700 hover:text-sky-600">Register</span>
            </button>
            <p className="mt-3 text-xs text-slate-400">
              © {new Date().getFullYear()} NAYSA. All rights reserved.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPassword
        open={showForgot}
        onClose={() => setShowForgot(false)}
        companies={companies}
        defaultCompanyCode={companyCode}
      />
    </div>
  );
}