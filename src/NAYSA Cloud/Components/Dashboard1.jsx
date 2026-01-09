import React, { useMemo } from "react";
import { useAuth } from "../Authentication/AuthContext.jsx";

export default function Dashboard1({ user: propUser }) {
  const { user: ctxUser } = useAuth();
  const user = useMemo(() => propUser ?? ctxUser ?? null, [propUser, ctxUser]);
  const name = user?.USER_NAME || user?.USER_CODE || "User";

  return (
    <section className="relative mt-[50px] min-h-[65vh] flex items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 z-10">
        <div className="absolute inset-0" />
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full  blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full  blur-3xl" />
      </div>

      <div className="group relative w-full max-w-3xl">
        <div className="relative rounded-[28px] border border-white/30 bg-white/70 backdrop-blur-xl shadow-2xl dark:bg-white/10">
          <div className="px-8 py-10 md:px-12 md:py-12 text-center flex flex-col items-center gap-6">
            <h1 className="text-[35px] font-extrabold tracking-tight text-slate-800 dark:text-slate-100 leading-tight">
              Welcome, <span className="bg-clip-text text-gray-800">{name}</span>!
            </h1>

            <img
              src="/NAYSA.jpg"
              alt="NAYSA Financials Cloud"
              className="w-90 md:w-100 lg:w-96 select-none"
              draggable="false"
            />

            <div className="h-px w-56 md:w-72 lg:w-80 bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-white/20" />

            <p className="max-w-2xl font-bold text-base md:text-lg text-slate-600 dark:text-slate-300">
              We make life easier through business applications
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
