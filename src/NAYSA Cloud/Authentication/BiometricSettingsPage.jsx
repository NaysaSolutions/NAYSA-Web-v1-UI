// import React from "react";
// import { FiShield, FiAlertTriangle } from "react-icons/fi";
// import BiometricSettings from "@/NAYSA Cloud/Authentication/BiometricSettings.jsx";

// export default function BiometricSettingsPage() {
//   const supportsBiometric =
//     typeof window !== "undefined" &&
//     !!window.PublicKeyCredential &&
//     typeof navigator.credentials?.create === "function";

//   return (
//     <div className="w-full p-4 sm:p-6">
//       <div className="mx-auto max-w-6xl space-y-6">
//         {/* Header */}
//         <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//           <div className="flex items-start gap-3">
//             <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
//               <FiShield className="h-6 w-6" />
//             </div>

//             <div className="min-w-0">
//               <h1 className="text-xl font-semibold text-slate-800 sm:text-2xl">
//                 Biometric Settings
//               </h1>
//               <p className="mt-1 text-sm text-slate-500">
//                 Register and manage fingerprint, face ID, or Windows Hello login
//                 for your account.
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Notes */}
//         <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
//           <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
//             <h2 className="text-sm font-semibold text-slate-800">
//               Secure Sign-In
//             </h2>
//             <p className="mt-1 text-sm text-slate-500">
//               Biometric login lets you sign in using your device’s built-in
//               authentication instead of typing your password every time.
//             </p>
//           </div>

//           <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
//             <h2 className="text-sm font-semibold text-slate-800">
//               Per Device Registration
//             </h2>
//             <p className="mt-1 text-sm text-slate-500">
//               Each browser or device may need to be registered separately for
//               biometric login.
//             </p>
//           </div>

//           <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
//             <h2 className="text-sm font-semibold text-slate-800">
//               Manage Access
//             </h2>
//             <p className="mt-1 text-sm text-slate-500">
//               You can deactivate or delete previously registered biometric
//               credentials anytime.
//             </p>
//           </div>
//         </div>

//         {/* Main content */}
//         {supportsBiometric ? (
//           <BiometricSettings />
//         ) : (
//           <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
//             <div className="flex items-start gap-3">
//               <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
//                 <FiAlertTriangle className="h-5 w-5" />
//               </div>

//               <div>
//                 <h2 className="text-sm font-semibold text-amber-800">
//                   Biometric login is not available
//                 </h2>
//                 <p className="mt-1 text-sm text-amber-700">
//                   This browser or device does not support biometric registration.
//                   Try using a supported browser on a device with Windows Hello,
//                   fingerprint, or face authentication.
//                 </p>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

import React from "react";
import {
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiSmartphone,
  FiLock,
} from "react-icons/fi";
import { Fingerprint, ScanFace, Laptop2 } from "lucide-react";
import BiometricSettings from "@/NAYSA Cloud/Authentication/BiometricSettings.jsx";

export default function BiometricSettingsPage() {
  const supportsBiometric =
    typeof window !== "undefined" &&
    !!window.PublicKeyCredential &&
    typeof navigator.credentials?.create === "function";

  return (
    <div className="w-full p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Hero */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_35%)]" />
            <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                  <FiShield className="h-4 w-4" />
                  Biometric Security
                </div>

                <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Register this device for faster and more secure sign-in
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                  Use fingerprint, face recognition, or Windows Hello to sign in
                  without typing your password every time. Each browser or device
                  can be registered separately for your account.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    <Fingerprint className="h-4 w-4" />
                    Fingerprint
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    <ScanFace className="h-4 w-4" />
                    Face Recognition
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                    <Laptop2 className="h-4 w-4" />
                    Windows Hello
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 self-start lg:min-w-[260px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <Fingerprint className="mx-auto h-7 w-7 text-sky-700" />
                  <div className="mt-2 text-xs font-semibold text-slate-800">
                    Secure
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <FiSmartphone className="mx-auto h-7 w-7 text-sky-700" />
                  <div className="mt-2 text-xs font-semibold text-slate-800">
                    Device-Based
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <FiLock className="mx-auto h-7 w-7 text-sky-700" />
                  <div className="mt-2 text-xs font-semibold text-slate-800">
                    Fast Access
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <FiCheckCircle className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">
              Register Per Device
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Biometric login is tied to the current browser and device. If you
              use another laptop, browser, or profile, register again there.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <FiShield className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">
              Passwordless Experience
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              After setup, supported devices can sign in using built-in biometric
              authentication with a smoother login experience.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
              <FiLock className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">
              You Stay in Control
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You can refresh, deactivate, or permanently remove any registered
              biometric credential anytime from this page.
            </p>
          </div>
        </div>

        {/* Main content */}
        {supportsBiometric ? (
          <BiometricSettings />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                <FiAlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-amber-800">
                  Biometric registration is not available
                </h2>
                <p className="mt-1 text-sm leading-6 text-amber-700">
                  This browser or device does not support biometric registration.
                  Try using a supported browser on a device with Windows Hello,
                  fingerprint, or face authentication.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}