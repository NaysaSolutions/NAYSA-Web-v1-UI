import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL";
import Swal from "sweetalert2";
import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const REQUIREMENTS = [
  { key: "len",      test: (p) => p.length >= 8,                          label: "At least 8 characters" },
  { key: "lower",    test: (p) => /[a-z]/.test(p),                         label: "Contains a lowercase letter" },
  { key: "upper",    test: (p) => /[A-Z]/.test(p),                         label: "Contains an uppercase letter" },
  { key: "digit",    test: (p) => /\d/.test(p),                            label: "Contains a number" },
  { key: "special",  test: (p) => /[^A-Za-z0-9]/.test(p),                  label: "Contains a special character" },
  { key: "spaces",   test: (p) => !/\s/.test(p),                           label: "No spaces" },
];

function scorePassword(p = "") {
  const baseReqs = REQUIREMENTS.filter((r) => r.key !== "spaces");
  let score = baseReqs.reduce((acc, r) => acc + (r.test(p) ? 1 : 0), 0);
  if (!REQUIREMENTS.find((r) => r.key === "spaces").test(p)) score = Math.max(0, score - 1);
  return Math.min(score, 5);
}

function strengthLabel(score) {
  if (score <= 1) return "Very Weak";
  if (score === 2) return "Weak";
  if (score === 3) return "Fair";
  if (score === 4) return "Strong";
  return "Very Strong";
}

const ChangePassword = () => {
  const navigate = useNavigate();
  const user = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return (p.get("user") || "").trim();
  }, []);

  const [oldPassword, setOldPassword]   = useState("");
  const [newPassword, setNewPassword]   = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showOld, setShowOld]           = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConf, setShowConf]         = useState(false);
  const [loading, setLoading]           = useState(false);

  const score = scorePassword(newPassword);
  const strength = strengthLabel(score);

  const extraRulesOk = useMemo(() => {
    if (!user) return false;
    if (newPassword.toLowerCase() === "password") return false;
    if (oldPassword && newPassword === oldPassword) return false;
    if (user && newPassword.toLowerCase() === user.toLowerCase()) return false;
    return true;
  }, [user, oldPassword, newPassword]);

  const baseReqsOk = REQUIREMENTS.every((r) => r.test(newPassword));
  const canSubmit  = baseReqsOk && extraRulesOk && newPassword && confirm === newPassword && user && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      Swal.fire("Error", "Missing or invalid user in the link (?user=USERCODE).", "error");
      return;
    }
    if (!baseReqsOk || !extraRulesOk) {
      Swal.fire("Error", "Please meet all password requirements.", "error");
      return;
    }
    if (confirm !== newPassword) {
      Swal.fire("Error", "New password and confirmation do not match.", "error");
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post("/users/change-password", {
        userCode: user,
        oldPassword,
        newPassword,
      });

      if (data?.status === "success") {
        await Swal.fire("Success", "Password changed successfully.", "success");
        navigate("/login", { replace: true });
      } else {
        Swal.fire("Error", data?.message || "Password change failed.", "error");
      }
    } catch (err) {
      const payload = err?.response?.data;
      const details = payload?.errors
        ? Object.values(payload.errors).flat().join("\n")
        : (payload?.message || err.message || "Request failed.");
      Swal.fire("Error", details, "error");
    } finally {
      setLoading(false);
    }
  };

  const reqItemClass = (ok) =>
    `flex items-start gap-2 text-sm ${ok ? "text-green-600" : "text-gray-500"}`;

  const strengthWidth = `${(score / 5) * 100}%`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(to_bottom,#7392b7,#d8e1e9)] px-4">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-300/30 to-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-tr from-purple-500/25 to-fuchsia-400/25 blur-3xl" />
      </div>

      {/* center vertically and reduce outer spacing so card is shorter */}
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center py-8">
        <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/40 p-4 shadow-xl backdrop-blur-md">
          {/* Logo and product name inside the card to save vertical space */}
          <div className="mb-3 flex flex-col items-center text-center">
            <img src="/naysa_logo.png" alt="NAYSA Logo" className="w-28 md:w-32 drop-shadow-md" />
            <h1 className="mt-2 text-lg font-bold tracking-tight text-blue-900">NAYSA Financials Cloud</h1>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 text-center">Change Password</h2>
          <p className="text-xs text-center text-gray-500 mt-1">User: <span className="font-medium">{user || "(not set)"}</span></p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {/* Old Password */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Old Password</span>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none"
                  aria-label={showOld ? "Hide password" : "Show password"}
                >
                  {showOld ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            {/* New Password */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">New Password</span>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>

              {/* Strength meter */}
              <div className="mt-2">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${score <= 2 ? "bg-red-500" : score === 3 ? "bg-yellow-500" : "bg-green-600"}`}
                    style={{ width: strengthWidth }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-600">Strength: <span className="font-medium">{strength}</span></div>
              </div>
            </label>

            {/* Confirm */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Confirm New Password</span>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConf ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-10 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConf(!showConf)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none"
                  aria-label={showConf ? "Hide password" : "Show password"}
                >
                  {showConf ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            {/* Requirements checklist */}
            <div className="mt-2 rounded-lg bg-gray-50 border p-3">
              <div className="text-xs font-semibold text-gray-700 mb-2">Password requirements</div>
              <ul className="space-y-1">
                {REQUIREMENTS.map((r) => {
                  const ok = r.test(newPassword);
                  return (
                    <li key={r.key} className={reqItemClass(ok)}>
                      <span className={`mt-0.5 inline-block w-4 h-4 rounded-full ${ok ? "bg-green-600" : "bg-gray-300"}`} />
                      <span>{r.label}</span>
                    </li>
                  );
                })}
                <li className={reqItemClass(newPassword && newPassword !== oldPassword)}>
                  <span className={`mt-0.5 inline-block w-4 h-4 rounded-full ${newPassword && newPassword !== oldPassword ? "bg-green-600" : "bg-gray-300"}`} />
                  <span>Must be different from old password</span>
                </li>
                <li className={reqItemClass(user && newPassword.toLowerCase() !== user.toLowerCase())}>
                  <span className={`mt-0.5 inline-block w-4 h-4 rounded-full ${user && newPassword.toLowerCase() !== user.toLowerCase() ? "bg-green-600" : "bg-gray-300"}`} />
                  <span>Must not be the same as username</span>
                </li>
                <li className={reqItemClass(newPassword === confirm && !!confirm)}>
                  <span className={`mt-0.5 inline-block w-4 h-4 rounded-full ${newPassword === confirm && !!confirm ? "bg-green-600" : "bg-gray-300"}`} />
                  <span>Confirmation matches</span>
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`group relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 font-medium text-white shadow-lg transition ${
                canSubmit ? "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500" : "disabled:cursor-not-allowed disabled:opacity-60 bg-gray-400"
              }`}
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
                </svg>
              ) : (
                <span>{loading ? "Saving..." : "Change Password"}</span>
              )}
            </button>

            <p className="text-[11px] text-gray-500 mt-2 text-center">
              Tip: Use a phrase with mixed case, numbers, and symbols (e.g., <em>RainyDay#204</em>).
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
