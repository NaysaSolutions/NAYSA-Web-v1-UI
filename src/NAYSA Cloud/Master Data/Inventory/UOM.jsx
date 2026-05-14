import React, { forwardRef, useImperativeHandle } from "react";

// Use forwardRef to catch the global button clicks from the parent WareMast
const UOM = forwardRef(({ isMobile, onMobileActionOpen }, ref) => {

  // Expose empty/safe methods to the parent WareMast component
  // so it doesn't crash when clicking global Add/Save/Reset buttons.
  useImperativeHandle(ref, () => ({
    handleAdd: () => {},
    handleSave: () => {},
    handleReset: () => {},
    isEditing: false,
    isSaving: false
  }));

  return (
    <div className="flex-1 w-full min-h-[500px] flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg p-8 text-center mt-2">

      {/* Animated Gear Icon */}
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle
            cx="48"
            cy="48"
            r="46"
            className="fill-blue-50 dark:fill-gray-700 stroke-blue-100 dark:stroke-gray-600"
            strokeWidth="1"
          />

          {/* Large gear (spinning) */}
          <g
            style={{
              transformOrigin: "48px 50px",
              animation: "wh-spin 8s linear infinite",
            }}
          >
            <path
              d="M48 30c-1.1 0-2 .9-2 2v2.2a14.1 14.1 0 0 0-4.7 1.9l-1.5-1.5a2 2 0 0 0-2.8 0l-2.8 2.8a2 2 0 0 0 0 2.8l1.5 1.5A14.1 14.1 0 0 0 34 46H31.8a2 2 0 0 0-2 2v4c0 1.1.9 2 2 2H34c.4 1.7 1.1 3.3 2 4.7l-1.5 1.5a2 2 0 0 0 0 2.8l2.8 2.8a2 2 0 0 0 2.8 0l1.5-1.5A14.1 14.1 0 0 0 46 65.8V68c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-2.2a14.1 14.1 0 0 0 4.7-2l1.5 1.5a2 2 0 0 0 2.8 0l2.8-2.8a2 2 0 0 0 0-2.8L64.3 56A14.1 14.1 0 0 0 66.2 52H68c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2h-1.8a14.1 14.1 0 0 0-1.9-4.7l1.5-1.5a2 2 0 0 0 0-2.8l-2.8-2.8a2 2 0 0 0-2.8 0l-1.5 1.5A14.1 14.1 0 0 0 54 34.2V32c0-1.1-.9-2-2-2h-4z"
              className="fill-blue-100 dark:fill-gray-600 stroke-blue-400 dark:stroke-blue-400"
              strokeWidth="0.8"
            />
            <circle
              cx="48"
              cy="50"
              r="6"
              className="fill-white dark:fill-gray-800 stroke-blue-400 dark:stroke-blue-400"
              strokeWidth="1.5"
            />
          </g>

          {/* Small gear (counter-spinning) */}
          <g
            style={{
              transformOrigin: "66px 34px",
              animation: "wh-spin-rev 5s linear infinite",
            }}
          >
            <path
              d="M66 25c-.7 0-1.3.6-1.3 1.3v1.5a9.2 9.2 0 0 0-3.1 1.3l-1-1a1.3 1.3 0 0 0-1.9 0l-1.9 1.9a1.3 1.3 0 0 0 0 1.9l1 1A9.2 9.2 0 0 0 57.5 35H56a1.3 1.3 0 0 0-1.3 1.3v2.7c0 .7.6 1.3 1.3 1.3h1.5a9.2 9.2 0 0 0 1.3 3.1l-1 1a1.3 1.3 0 0 0 0 1.9l1.9 1.9c.5.5 1.4.5 1.9 0l1-1a9.2 9.2 0 0 0 3 1.3V50c0 .7.6 1.3 1.4 1.3h2.7c.7 0 1.3-.6 1.3-1.3v-1.5a9.2 9.2 0 0 0 3.1-1.3l1 1a1.3 1.3 0 0 0 1.9 0l1.9-1.9a1.3 1.3 0 0 0 0-1.9l-1-1a9.2 9.2 0 0 0 1.3-3.1H79c.7 0 1.3-.6 1.3-1.3v-2.7c0-.7-.6-1.3-1.3-1.3h-1.5a9.2 9.2 0 0 0-1.3-3.1l1-1a1.3 1.3 0 0 0 0-1.9l-1.9-1.9a1.3 1.3 0 0 0-1.9 0l-1 1A9.2 9.2 0 0 0 69.3 28v-1.7c0-.7-.6-1.3-1.3-1.3H66z"
              className="fill-sky-50 dark:fill-gray-600 stroke-sky-400 dark:stroke-sky-400"
              strokeWidth="0.8"
            />
            <circle
              cx="66"
              cy="34"
              r="4"
              className="fill-white dark:fill-gray-800 stroke-sky-400 dark:stroke-sky-400"
              strokeWidth="1.5"
            />
          </g>
        </svg>

        {/* Keyframe styles injected once */}
        <style>{`
          @keyframes wh-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes wh-spin-rev {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
          @keyframes wh-pulse {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.35; }
          }
          @keyframes wh-bar {
            from { width: 0%; }
            to   { width: 45%; }
          }
        `}</style>
      </div>

      {/* Badge */}
      <span className="inline-block mb-3 px-3 py-0.5 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 tracking-wide uppercase">
        🚧 Under Construction
      </span>

      {/* Title */}
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
       UOM - Unit of Measure
      </h2>

      {/* Description */}
      <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto text-sm leading-relaxed mb-6">
        This module is currently being built. Our team is working hard to bring it to you. Stay tuned!
      </p>

      {/* Progress Bar */}
      <div className="w-full max-w-xs mb-6">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">Build progress</span>
          <span className="text-xs font-medium text-blue-500 dark:text-blue-400">45%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
          <div
            className="h-full bg-blue-400 dark:bg-blue-500 rounded-full"
            style={{ animation: "wh-bar 2s ease-out forwards" }}
          />
        </div>
      </div>

      {/* Status Steps */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs mb-6">
        {/* Step 1 — Done */}
        <div className="flex flex-col items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-lg py-3 px-2">
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight text-center">Planning</span>
        </div>

        {/* Step 2 — In Progress */}
        <div className="flex flex-col items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg py-3 px-2">
          <div className="flex items-center gap-0.5">
            {[0, 0.3, 0.6].map((delay) => (
              <span
                key={delay}
                className="block w-1.5 h-1.5 rounded-full bg-blue-400"
                style={{ animation: `wh-pulse 1.4s ease-in-out ${delay}s infinite` }}
              />
            ))}
          </div>
          <span className="text-xs text-blue-500 dark:text-blue-400 leading-tight text-center font-medium">Building</span>
        </div>

        {/* Step 3 — Pending */}
        <div className="flex flex-col items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-lg py-3 px-2">
          <svg className="w-4 h-4 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight text-center">Launch</span>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
        Other modules are fully operational. Contact your system admin for assistance.
      </p>

    </div>
  );
});

export default UOM;