import React, { useEffect, useState, useRef } from "react";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiUserPlus, FiGlobe } from "react-icons/fi";
import Swal from "sweetalert2";
import { apiClient, getTenant, setTenant } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

function normalizeCompaniesPayload(raw) {
  const toArray = (x) =>
    Array.isArray(x) ? x : x && typeof x === "object" ? Object.values(x) : [];
  let arr = [];
  if (Array.isArray(raw)) arr = raw;
  else if (Array.isArray(raw?.data)) arr = raw.data;
  else if (raw?.data && typeof raw.data === "object") arr = Object.values(raw.data);
  else if (raw && typeof raw === "object") arr = Object.values(raw);


  
  return arr.map((r) => {
    const get = (o, ...keys) => keys.reduce((v, k) => (v ?? o?.[k]), undefined);
    const code =
      get(r, "code", "CODE", "Code") ??
      get(r, "database", "DATABASE", "Database") ??
      "";
    const company =
      get(r, "company", "COMPANY", "Company") ??
      get(r, "database", "DATABASE", "Database") ??
      get(r, "code", "CODE", "Code") ??
      "";
    const database = get(r, "database", "DATABASE", "Database") ?? "";
    return {
      code: String(code || "").trim(),
      company: String(company || "").trim(),
      database: String(database || "").trim(),
    };
  });
}

export default function Register({ onRegister, onSwitchToLogin }) {
  const [form, setForm] = useState({
    USER_CODE: "",
    USER_NAME: "",
    EMAIL_ADD: "",
    PASSWORD: "",
  });


  const [companies, setCompanies] = useState([]);
  const [companyCode, setCompanyCode] = useState(getTenant() || "");
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const pwdRef = useRef(null);


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
        await Swal.fire({
          icon: "error",
          title: "Unable to load companies",
          text: e?.response?.data?.message || e?.message || "Please check /api/companies.",
        });
      } finally {
        if (alive) setLoadingCompanies(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []); // once



  useEffect(() => {
    if (companyCode) setTenant(companyCode);
  }, [companyCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleCaps = (e) =>
    setCapsOn(e.getModifierState && e.getModifierState("CapsLock"));

  const alertSwal = async (text) => {
    await Swal.fire({ title: "Error", text, icon: "error", confirmButtonText: "OK" });
    return false;
  };

  const validate = async () => {
    if (!companyCode) return alertSwal("Please select a company.");
    if (!form.USER_CODE.trim()) return alertSwal("User ID is required");
    if (!form.USER_NAME.trim()) return alertSwal("Username is required");
    if (!form.EMAIL_ADD.trim()) return alertSwal("Email is required");
    if (!/\S+@\S+\.\S+/.test(form.EMAIL_ADD)) return alertSwal("Please enter a valid email address");
    if (form.PASSWORD.length < 6) return alertSwal("Password must be at least 6 characters long");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const ok = await validate();
      if (!ok) return;

      
      setTenant(companyCode);
      const { data, status } = await apiClient.post("/register", {
        USER_CODE: form.USER_CODE.trim(),
        USER_NAME: form.USER_NAME.trim(),
        EMAIL_ADD: form.EMAIL_ADD.trim(),
        PASSWORD: form.PASSWORD,
      });

      const success = data?.status === "success" || status === 201;
      if (!success) throw new Error(data?.message || "Registration failed");

      onRegister?.(
        data?.data || {
          USER_CODE: form.USER_CODE,
          USER_NAME: form.USER_NAME,
          EMAIL_ADD: form.EMAIL_ADD,
        }
      );

      await Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        text: "You can now log in to your account.",
        confirmButtonText: "OK",
      });
      onSwitchToLogin?.();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text: err?.response?.data?.message || err?.message || "Something went wrong during registration",
        confirmButtonText: "OK",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(to_bottom,#7392b7,#d8e1e9)]">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-300/30 to-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-tr from-purple-500/25 to-fuchsia-400/25 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center justify-start px-4 pt-6 md:pt-10 lg:pt-12 pb-24">
        <div className="mb-4 md:mb-6 flex flex-col items-center text-center">
          <img src="/naysa_logo.png" alt="NAYSA Logo" className="w-40 md:w-44 drop-shadow-md" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-blue-900 md:text-3xl">
            NAYSA Financials Cloud
          </h1>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/40 dark:bg-white/10 p-6 shadow-xl backdrop-blur-md">
          <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Company
                {!loadingCompanies && (
                  <span className="ml-2 text-xs text-slate-500">({companies.length} found)</span>
                )}
              </span>
              <div className="relative">
                <FiGlobe className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={companyCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompanyCode(v);
                    setTenant(v); 
                  }}
                  disabled={loadingCompanies}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  required
                >
                  <option value="" disabled>
                    {loadingCompanies ? "Loading companies…" : "Select a company"}
                  </option>
                  {companies.map((c) => {
                    const value = c.code || c.database;
                    const label = c.company || "(Unnamed company)";
                    return (
                      <option key={value || label} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </label>

            {/* USER_CODE */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">User ID</span>
              <div className="relative">
                <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="USER_CODE"
                  value={form.USER_CODE}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 shadow-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="Enter your user ID"
                />
              </div>
            </label>

            {/* USER_NAME */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Username</span>
              <div className="relative">
                <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  name="USER_NAME"
                  value={form.USER_NAME}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 shadow-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="Choose a username"
                />
              </div>
            </label>

            {/* EMAIL_ADD */}
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  name="EMAIL_ADD"
                  value={form.EMAIL_ADD}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-slate-900 shadow-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            {/* PASSWORD */}
            <label className="block">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Password</span>
                {capsOn && <span className="text-xs font-semibold text-white">Caps Lock is ON</span>}
              </div>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={pwdRef}
                  type={showPwd ? "text" : "password"}
                  name="PASSWORD"
                  value={form.PASSWORD}
                  onChange={handleChange}
                  onKeyUp={handleCaps}
                  onKeyDown={handleCaps}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white/90 py-3 pl-10 pr-12 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={
                isLoading ||
                loadingCompanies ||
                !companyCode ||
                !form.USER_CODE.trim() ||
                !form.USER_NAME.trim() ||
                !form.EMAIL_ADD.trim() ||
                !form.PASSWORD
              }
              className="group relative inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 font-medium text-white shadow-lg shadow-sky-600/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0A12 12 0 002 12h2z" />
                </svg>
              ) : (
                <>
                  <FiUserPlus className="h-5 w-5" />
                  <span>Register</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={onSwitchToLogin} className="text-sm text-slate-700 hover:underline">
              Already have an account? <span className="text-sky-700">Log in</span>
            </button>
            <p className="mt-3 text-xs text-slate-500">© {new Date().getFullYear()} NAYSA. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
