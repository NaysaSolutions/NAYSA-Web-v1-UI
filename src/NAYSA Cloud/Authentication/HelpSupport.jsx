import React from "react";
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  Headphones,
  LoaderCircle,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useHelpSupportResources from "./useHelpSupportResources";

const HelpSupport = () => {
  const navigate = useNavigate();
  const { manuals, videos, loading } =
    useHelpSupportResources();

  const cards = [
    {
      title: "User Manuals",
      description:
        "Browse complete user guides and step-by-step documentation for every available module.",
      detail: `${manuals.length} manuals available`,
      icon: BookOpen,
      buttonLabel: "View Manuals",
      route: "/help-support/manuals",
      accent: "blue",
      iconClass:
        "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
      buttonClass:
        "bg-blue-600 hover:bg-blue-700 shadow-blue-200/70 dark:shadow-none",
      glowClass:
        "from-blue-500/15 via-blue-400/5 to-transparent",
    },
    {
      title: "Video Tutorials",
      description:
        "Watch guided demonstrations and learn system processes through visual walkthroughs.",
      detail: `${videos.length} videos available`,
      icon: PlayCircle,
      buttonLabel: "View Videos",
      route: "/help-support/videos",
      accent: "sky",
      iconClass:
        "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
      buttonClass:
        "bg-sky-600 hover:bg-sky-700 shadow-sky-200/70 dark:shadow-none",
      glowClass:
        "from-sky-500/15 via-cyan-400/5 to-transparent",
    },
    {
      title: "Support Ticket",
      description:
        "Submit a concern, attach details, and monitor the progress of your support requests.",
      icon: Ticket,
      buttonLabel: "Create Ticket",
      route: "/help-support/ticket",
      accent: "indigo",
      iconClass:
        "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
      buttonClass:
        "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/70 dark:shadow-none",
      glowClass:
        "from-indigo-500/15 via-violet-400/5 to-transparent",
    },
    {
      title: "Contact Us",
      description:
        "Reach our support team directly for product assistance and technical concerns.",
      icon: Headphones,
      buttonLabel: "Contact Support",
      route: "/help-support/contact",
      accent: "cyan",
      iconClass:
        "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300",
      buttonClass:
        "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200/70 dark:shadow-none",
      glowClass:
        "from-cyan-500/15 via-teal-400/5 to-transparent",
    },
  ];

  return (
    <div className="min-h-full w-full bg-slate-50 px-3 py-4 dark:bg-slate-950 sm:px-4 lg:px-5">
      <div className="w-full">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-700 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-[0.16em]">
                  NAYSA Assistance
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                Help &amp; Support Center
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                Access manuals, video guides, technical support,
                and direct assistance in one centralized workspace.
              </p>
            </div>

            <div className="grid min-w-[280px] grid-cols-2 gap-3 sm:min-w-[360px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {loading ? (
                    <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />
                  ) : (
                    manuals.length
                  )}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Manuals
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {loading ? (
                    <LoaderCircle className="h-5 w-5 animate-spin text-sky-600" />
                  ) : (
                    videos.length
                  )}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tutorials
                </div>
              </div>

              <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/50 dark:bg-emerald-500/10">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div>
                  <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    Support resources ready
                  </div>
                  <div className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
                    Select an option below to get started.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(
            ({
              title,
              description,
              detail,
              icon: Icon,
              buttonLabel,
              route,
              iconClass,
              buttonClass,
              glowClass,
            }) => (
              <article
                key={title}
                className="group relative flex min-h-[330px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${glowClass}`}
                />

                <div className="relative">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconClass} shadow-sm`}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.9} />
                  </div>

                  <div className="mt-5 flex items-start justify-between gap-3">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      {title}
                    </h2>

                    <div className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition group-hover:border-blue-200 group-hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {description}
                  </p>

                  {detail && (
                    <div className="mt-4 inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {loading ? (
                        <span className="inline-flex items-center gap-1.5">
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        detail
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={() => navigate(route)}
                  className={`relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] ${buttonClass}`}
                >
                  {buttonLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;