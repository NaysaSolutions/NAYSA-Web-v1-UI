import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Headset,
  Loader2,
  MessageSquareText,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  Ticket,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import apiClient from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import {
  useSwalErrorAlert,
  useSwalInfoAlert,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const SUPPORT_ENDPOINTS = {
  list: "/freshdesk/tickets",
  sync: "/freshdesk/sync",
  create: "/freshdesk/tickets",
  detail: (ticketId) => `/freshdesk/tickets/${ticketId}`,
  reply: (ticketId) => `/freshdesk/tickets/${ticketId}/reply`,
};

const PAGE_SIZE = 8;
const allowedExtensions = ["png", "jpg", "jpeg", "pdf", "xls", "xlsx", "doc", "docx", "txt"];

const safeString = (value, fallback = "") => {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
};

const toDisplayText = (value, fallback = "-") => {
  const result = safeString(value, fallback);
  return result === "" ? fallback : result;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusTone = (status) => {
  const normalized = safeString(status).toLowerCase();

  if (normalized.includes("open") || normalized.includes("new")) {
    return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  }

  if (normalized.includes("pending") || normalized.includes("waiting") || normalized.includes("on hold")) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  if (normalized.includes("resolve") || normalized.includes("closed") || normalized.includes("done")) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
};

const priorityTone = (priority) => {
  const normalized = safeString(priority).toLowerCase();

  if (normalized.includes("urgent") || normalized.includes("high")) {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }

  if (normalized.includes("medium") || normalized.includes("normal")) {
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  if (normalized.includes("low")) {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
};

const normalizeStatus = (value) => {
  const raw = safeString(value, "");
  if (!raw) return "Open";
  const normalized = raw.toLowerCase();

  if (normalized.includes("pending") || normalized.includes("waiting") || normalized.includes("hold")) {
    return "Pending";
  }

  if (normalized.includes("resolve") || normalized.includes("closed") || normalized.includes("done")) {
    return "Resolved";
  }

  if (normalized.includes("new")) {
    return "Open";
  }

  return "Open";
};

const normalizePriority = (value) => {
  const raw = safeString(value, "");
  if (!raw) return "Normal";
  const normalized = raw.toLowerCase();

  if (normalized.includes("urgent")) return "Urgent";
  if (normalized.includes("high")) return "High";
  if (normalized.includes("low")) return "Low";
  return "Normal";
};

const normalizeTicket = (rawTicket) => {
  if (!rawTicket || typeof rawTicket !== "object") return null;

  const id =
    rawTicket.id ??
    rawTicket.ticket_id ??
    rawTicket.TICKET_ID ??
    rawTicket.ticketId ??
    rawTicket.idNumber ??
    null;

  if (id === null && rawTicket.ticket_number === undefined && rawTicket.number === undefined) {
    return null;
  }

  const number =
    rawTicket.ticket_number ??
    rawTicket.ticketNumber ??
    rawTicket.TICKET_NUMBER ??
    rawTicket.number ??
    rawTicket.TICKET_NO ??
    rawTicket.id ??
    "";

  const subject =
    rawTicket.subject ??
    rawTicket.SUBJECT ??
    rawTicket.title ??
    "No subject available";

  const requester =
    rawTicket.requester ??
    rawTicket.requester_name ??
    rawTicket.requesterName ??
    rawTicket.requester_email ??
    rawTicket.email ??
    rawTicket.REQUESTER ??
    rawTicket.requesterEmail ??
    "Unknown";

  const priority =
    rawTicket.priority ??
    rawTicket.PRIORITY ??
    rawTicket.priority_name ??
    rawTicket.priorityName ??
    "Normal";

  const status =
    rawTicket.status ??
    rawTicket.STATUS ??
    rawTicket.ticket_status ??
    rawTicket.status_name ??
    rawTicket.statusName ??
    "Open";

  const createdAt =
    rawTicket.created_at ??
    rawTicket.createdAt ??
    rawTicket.CREATED_AT ??
    rawTicket.created_date ??
    rawTicket.createdDate ??
    null;

  const updatedAt =
    rawTicket.updated_at ??
    rawTicket.updatedAt ??
    rawTicket.UPDATED_AT ??
    rawTicket.updated_date ??
    rawTicket.updatedDate ??
    rawTicket.last_updated ??
    createdAt ??
    null;

  return {
    id: String(id ?? number ?? ""),
    number: String(number || id || ""),
    subject: String(subject || "No subject available"),
    requester: safeString(requester, "Unknown"),
    priority: normalizePriority(priority),
    status: normalizeStatus(status),
    createdAt,
    updatedAt,
    category:
      rawTicket.category ??
      rawTicket.category_name ??
      rawTicket.type ??
      rawTicket.ticket_type ??
      rawTicket.categoryType ??
      "General",
    description:
      rawTicket.description ??
      rawTicket.description_text ??
      rawTicket.DESC ??
      rawTicket.ticket_description ??
      "",
    requesterEmail:
      rawTicket.requester_email ??
      rawTicket.requesterEmail ??
      rawTicket.email ??
      rawTicket.EMAIL ??
      "",
    company:
      rawTicket.company ??
      rawTicket.company_name ??
      rawTicket.COMPANY ??
      rawTicket.companyValue ??
      "",
    userCode:
      rawTicket.user_code ??
      rawTicket.userCode ??
      rawTicket.USER_CODE ??
      "",
  };
};

const getPayloadData = (responseData) => {
  if (Array.isArray(responseData)) return responseData;
  if (!responseData || typeof responseData !== "object") return [];

  if (Array.isArray(responseData.tickets)) return responseData.tickets;
  if (Array.isArray(responseData.data)) return responseData.data;
  if (Array.isArray(responseData.result)) return responseData.result;
  if (Array.isArray(responseData.items)) return responseData.items;

  if (responseData.ticket) return [responseData.ticket];
  if (responseData.data && typeof responseData.data === "object") return [responseData.data];

  return [];
};

const requestSupport = async ({ method = "GET", endpoint, data, headers, allowEmpty = false }) => {
  const candidates = Array.isArray(endpoint) ? endpoint : [endpoint];
  let lastError = null;

  for (const candidate of candidates) {
    if (!candidate) continue;

    try {
      const response = await apiClient.request({
        method,
        url: candidate,
        data,
        headers,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      if (status === 404 || status === 405) continue;
      if (status === 422 || status === 400) continue;
      if (status === 401 || status === 403) throw error;
      continue;
    }
  }

  if (allowEmpty && lastError) {
    return null;
  }

  if (lastError) {
    throw lastError;
  }

  return null;
};

const getStatusCountKey = (status) => {
  const normalized = normalizeStatus(status).toLowerCase();
  if (normalized.includes("pending")) return "pending";
  if (normalized.includes("resolved")) return "resolved";
  return "open";
};

const Freshdesk = () => {
  const navigate = useNavigate();
  const { user, companyInfo } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynchronized, setLastSynchronized] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketConversation, setTicketConversation] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    category: "General",
    priority: "Normal",
    module: "",
    description: "",
    company: "",
    requesterName: "",
    requesterEmail: "",
    userCode: "",
  });
  const [ticketFiles, setTicketFiles] = useState([]);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setTicketForm((prev) => ({
      ...prev,
      company:
        prev.company ||
        companyInfo?.COMPANY ||
        companyInfo?.companyName ||
        companyInfo?.compName ||
        "",
      requesterName:
        prev.requesterName || user?.USER_NAME || user?.FULL_NAME || user?.USER_CODE || "",
      requesterEmail:
        prev.requesterEmail || user?.EMAIL_ADD || user?.EMAIL || user?.EMAIL_ADDRESS || "",
      userCode: prev.userCode || user?.USER_CODE || "",
    }));
  }, [companyInfo, user]);

  const normalizeResponseTickets = (data) => {
    const payload = getPayloadData(data);
    const normalized = payload
      .map((entry) => normalizeTicket(entry))
      .filter(Boolean);
    return normalized;
  };

  const fetchTickets = async ({ silent = false, synced = false } = {}) => {
    if (!silent) setLoadingTickets(true);

    try {
      const response = await requestSupport({
        method: "GET",
        endpoint: SUPPORT_ENDPOINTS.list,
        allowEmpty: true,
      });

      const normalized = normalizeResponseTickets(response ?? []);
      setTickets(normalized);

      if (synced) {
        setLastSynchronized(new Date());
      }

      if (!silent && normalized.length === 0) {
        useSwalInfoAlert("No support tickets found", "No support tickets were available in the Freshdesk queue.");
      }
    } catch (error) {
      console.error("Failed to load Freshdesk tickets:", error);
      setTickets([]);
      if (!silent) {
        useSwalErrorAlert(
          "Unable to load tickets",
          "We couldn't load support tickets right now."
        );
      }
    } finally {
      if (!silent) setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((ticket) => getStatusCountKey(ticket.status) === "open").length;
    const pending = tickets.filter((ticket) => getStatusCountKey(ticket.status) === "pending").length;
    const resolved = tickets.filter((ticket) => getStatusCountKey(ticket.status) === "resolved").length;

    return { total, open, pending, resolved };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const q = safeString(searchTerm).toLowerCase();

    return tickets.filter((ticket) => {
      const ticketNumber = String(ticket.number || "").toLowerCase();
      const subject = String(ticket.subject || "").toLowerCase();
      const requester = String(ticket.requester || "").toLowerCase();

      const matchesSearch =
        !q ||
        ticketNumber.includes(q) ||
        subject.includes(q) ||
        requester.includes(q);

      const matchesStatus =
        statusFilter === "All" || normalizeStatus(ticket.status) === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || normalizePriority(ticket.priority) === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, searchTerm, statusFilter, tickets]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const currentRows = filteredTickets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  const handleReload = async () => {
    setIsSyncing(true);

    try {
      await fetchTickets({ silent: true, synced: true });
      useSwalSuccessAlert("Sync complete", "Freshdesk tickets were refreshed successfully.");
    } catch (error) {
      console.error("Failed to sync Freshdesk tickets:", error);
      useSwalErrorAlert(
        "Sync failed",
        "Support tickets could not be refreshed from Freshdesk at this time."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const openTicketDetails = async (ticketId) => {
    if (!ticketId) return;
    setSelectedTicketId(ticketId);
    setLoadingTicket(true);
    setReplyText("");

    try {
      const response = await requestSupport({
        method: "GET",
        endpoint: SUPPORT_ENDPOINTS.detail(ticketId),
        allowEmpty: true,
      });

      const result = response?.ticket ?? response?.data ?? response ?? {};
      const nextTicket = normalizeTicket(result.ticket ?? result);
      const conversation = Array.isArray(result.conversation)
        ? result.conversation
        : Array.isArray(result.conversations)
          ? result.conversations
          : Array.isArray(result.replies)
            ? result.replies
            : Array.isArray(result.messages)
              ? result.messages
              : [];

      setSelectedTicket(nextTicket ?? normalizeTicket(result) ?? null);
      setTicketConversation(conversation);
    } catch (error) {
      console.error("Failed to load ticket details:", error);
      useSwalErrorAlert("Ticket unavailable", "This ticket could not be loaded right now.");
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    const requiredFields = {
      "Subject": ticketForm.subject,
      "Description": ticketForm.description,
      "Priority": ticketForm.priority,
      "Requester Email": ticketForm.requesterEmail,
    };

    const missing = Object.entries(requiredFields).filter(([, value]) => !String(value || "").trim());
    if (missing.length > 0) {
      useSwalErrorAlert("Required fields missing", `Please complete: ${missing.map(([label]) => label).join(", ")}.`);
      return;
    }

    setIsSubmittingTicket(true);

    try {
      const payload = {
        subject: ticketForm.subject,
        category: ticketForm.category || "General",
        priority: ticketForm.priority,
        module: ticketForm.module || "General",
        description: ticketForm.description,
        requester_name: ticketForm.requesterName || user?.USER_NAME || user?.USER_CODE || "",
        requester_email: ticketForm.requesterEmail || user?.EMAIL_ADD || "",
        user_code: ticketForm.userCode || user?.USER_CODE || "",
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      ticketFiles.forEach((file) => {
        formData.append("attachments[]", file, file.name);
      });

      const response = await requestSupport({
        method: "POST",
        endpoint: SUPPORT_ENDPOINTS.create,
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const createdTicket = response?.ticket ?? response?.data ?? response;
      const ticket = normalizeTicket(createdTicket);

      setIsCreateModalOpen(false);
      setTicketFiles([]);
      setTicketForm({
        subject: "",
        category: "General",
        priority: "Normal",
        module: "",
        description: "",
        company: ticketForm.company,
        requesterName: ticketForm.requesterName,
        requesterEmail: ticketForm.requesterEmail,
        userCode: ticketForm.userCode,
      });

      await fetchTickets({ silent: true, synced: true });
      if (ticket?.number) {
        useSwalSuccessAlert("Ticket created", `Ticket #${ticket.number} created successfully.`);
      } else {
        useSwalSuccessAlert("Ticket created", "Your support ticket was created successfully.");
      }
    } catch (error) {
      console.error("Failed to create Freshdesk ticket:", error);
      useSwalErrorAlert("Ticket creation failed", "Your support request could not be submitted at this time.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicketId || !replyText.trim()) {
      useSwalErrorAlert("Reply required", "Please type a reply before sending.");
      return;
    }

    setIsSendingReply(true);

    try {
      const ticketId = selectedTicketId;
      await requestSupport({
        method: "POST",
        endpoint: SUPPORT_ENDPOINTS.reply(ticketId),
        data: {
          ticket_id: ticketId,
          reply: replyText,
          message: replyText,
          body: replyText,
        },
        headers: { "Content-Type": "application/json" },
      });

      setReplyText("");
      await openTicketDetails(ticketId);
      await fetchTickets({ silent: true, synced: true });
      useSwalSuccessAlert("Reply sent", "Your reply was sent successfully.");
    } catch (error) {
      console.error("Failed to send reply:", error);
      useSwalErrorAlert("Reply failed", "The reply could not be sent to Freshdesk right now.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((file) => {
      const extension = String(file.name.split(".").pop() || "").toLowerCase();
      const sizeOk = file.size <= 5 * 1024 * 1024;
      return sizeOk && allowedExtensions.includes(extension);
    });

    if (validFiles.length !== files.length) {
      useSwalErrorAlert(
        "Unsupported attachment",
        "Only PNG, JPG, PDF, Excel, Word, and TXT files up to 5 MB are allowed."
      );
    }

    setTicketFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index) => {
    setTicketFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/help-support")}
              className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
              aria-label="Back to Help & Support"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Headset className="h-5 w-5 text-blue-600" />
                <h1 className="text-2xl font-black uppercase tracking-[0.08em] text-slate-900">
                  Support Center
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Create and monitor your NAYSA support requests
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            NEW TICKET
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {[
            { label: "OPEN", value: summary.open },
            { label: "PENDING", value: summary.pending },
            { label: "RESOLVED", value: summary.resolved },
            { label: "TOTAL", value: summary.total },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {card.label}
              </div>
              <div className="mt-3 text-3xl font-black tracking-tight text-slate-900">
                {card.value}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
              <div className="relative w-full md:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option>All</option>
                  <option>Open</option>
                  <option>Pending</option>
                  <option>Resolved</option>
                </select>
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option>All</option>
                  <option>Urgent</option>
                  <option>High</option>
                  <option>Normal</option>
                  <option>Low</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Last synchronized: {lastSynchronized ? formatDateTime(lastSynchronized) : "Not yet synced"}
              </span>

              <button
                type="button"
                onClick={handleReload}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {isSyncing ? "Syncing..." : "Reload"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loadingTickets ? (
              <div className="flex min-h-[180px] items-center justify-center text-sm font-medium text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading tickets...
              </div>
            ) : currentRows.length === 0 ? (
              <div className="flex min-h-[180px] flex-col items-center justify-center px-6 py-10 text-center">
                <Ticket className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-base font-semibold text-slate-600">
                  No support tickets found for your company.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  NEW TICKET
                </button>
              </div>
            ) : (
              <div className="min-w-[1000px]">
                <table className="w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Ticket #</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Requester</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((ticket) => (
                      <tr key={`${ticket.id}-${ticket.number}`} className="border-b border-slate-200 odd:bg-white even:bg-slate-50">
                        <td className="px-4 py-3 align-top font-semibold text-blue-700">
                          <button
                            type="button"
                            onClick={() => openTicketDetails(ticket.id)}
                            className="hover:underline"
                          >
                            #{ticket.number}
                          </button>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600">{formatDate(ticket.createdAt)}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="max-w-[280px] font-medium text-slate-800">{ticket.subject}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600">{ticket.requester}</td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityTone(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600">{formatDateTime(ticket.updatedAt || ticket.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {filteredTickets.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-medium text-slate-700">{currentPage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="relative w-full max-w-2xl rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create a Support Ticket</h2>
                <p className="text-xs text-slate-500">Company data is automatically populated from your account.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Subject *
                  <input
                    value={ticketForm.subject}
                    onChange={(event) => setTicketForm((prev) => ({ ...prev, subject: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                    placeholder="Issue summary"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Category / Type
                  <input
                    value={ticketForm.category}
                    onChange={(event) => setTicketForm((prev) => ({ ...prev, category: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                    placeholder="General"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Priority *
                  <select
                    value={ticketForm.priority}
                    onChange={(event) => setTicketForm((prev) => ({ ...prev, priority: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Module
                  <input
                    value={ticketForm.module}
                    onChange={(event) => setTicketForm((prev) => ({ ...prev, module: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                    placeholder="Main Module"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Company
                  <input
                    value={ticketForm.company}
                    readOnly
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  NAYSA User Code
                  <input
                    value={ticketForm.userCode}
                    readOnly
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Requester Name
                  <input
                    value={ticketForm.requesterName}
                    readOnly
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-600"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Requester Email *
                  <input
                    value={ticketForm.requesterEmail}
                    onChange={(event) => setTicketForm((prev) => ({ ...prev, requesterEmail: event.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                    placeholder="name@naysa.com"
                  />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Description *
                <textarea
                  value={ticketForm.description}
                  onChange={(event) => setTicketForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows="6"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:bg-white"
                  placeholder="Describe the issue, steps taken, and any error details."
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Attachments</label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Add file
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.pdf,.xls,.xlsx,.doc,.docx,.txt"
                  onChange={handleAttachmentChange}
                />

                <div className="min-h-[48px] rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                  {ticketFiles.length === 0 ? (
                    <div className="text-sm text-slate-500">No attachments selected.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {ticketFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">
                          <span className="max-w-[170px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  {isSubmittingTicket ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTicketId(null);
                    setSelectedTicket(null);
                    setTicketConversation([]);
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Ticket</div>
                  <div className="mt-1 text-xl font-black text-slate-900">
                    #{selectedTicket?.number || selectedTicketId}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(null);
                  setSelectedTicket(null);
                  setTicketConversation([]);
                }}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingTicket ? (
              <div className="flex min-h-[220px] items-center justify-center text-sm font-medium text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading conversation...
              </div>
            ) : (
              <div className="grid gap-0 lg:grid-cols-[1.4fr_0.6fr]">
                <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900">{selectedTicket?.subject || "No subject"}</h3>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusTone(selectedTicket?.status || "Open")}`}>
                      {selectedTicket?.status || "Open"}
                    </span>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${priorityTone(selectedTicket?.priority || "Normal")}`}>
                      {selectedTicket?.priority || "Normal"}
                    </span>
                  </div>

                  <div className="mb-5 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Created</div>
                      <div className="mt-1 font-medium text-slate-800">{formatDateTime(selectedTicket?.createdAt)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Last Updated</div>
                      <div className="mt-1 font-medium text-slate-800">{formatDateTime(selectedTicket?.updatedAt || selectedTicket?.createdAt)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Requester</div>
                      <div className="mt-1 font-medium text-slate-800">{selectedTicket?.requester || "Unknown"}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Category / Type</div>
                      <div className="mt-1 font-medium text-slate-800">{toDisplayText(selectedTicket?.category, "General")}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Description</div>
                    <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {selectedTicket?.description || "No description provided."}
                    </div>
                  </div>

                  {selectedTicket?.attachments?.length > 0 && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Attachments</div>
                      <div className="space-y-2">
                        {selectedTicket.attachments.map((file, index) => (
                          <a
                            key={`${file.name || "attachment"}-${index}`}
                            href={file.url || file.downloadUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-blue-200 hover:text-blue-700"
                          >
                            <span className="truncate">{file.name || `Attachment ${index + 1}`}</span>
                            <Paperclip className="h-4 w-4" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-600">
                      <MessageSquareText className="h-4 w-4 text-blue-600" />
                      Conversation
                    </div>

                    <div className="space-y-3">
                      {ticketConversation.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                          No conversation history available for this ticket yet.
                        </div>
                      ) : (
                        ticketConversation.map((entry, index) => {
                          const author = entry.author || entry.requester || entry.user || entry.name || "NAYSA SUPPORT";
                          const text = entry.message || entry.body || entry.content || entry.description || "";
                          const time = entry.created_at || entry.createdAt || entry.updated_at || entry.updatedAt || "";
                          const isCustomer = author.toLowerCase().includes("you") || author.toLowerCase().includes("customer");

                          return (
                            <div
                              key={`${author}-${time || index}`}
                              className={`rounded-xl border p-3 ${isCustomer ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="text-sm font-bold text-slate-800">{author}</div>
                                <div className="text-[11px] text-slate-500">{formatDateTime(time)}</div>
                              </div>
                              <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{text || "No message available."}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-slate-600">
                    <Send className="h-4 w-4 text-blue-600" />
                    Reply
                  </div>

                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    rows={8}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                    placeholder="Write a response to the customer..."
                  />

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      <Paperclip className="h-4 w-4" />
                      Attach File
                    </button>

                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={isSendingReply || !replyText.trim()}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {isSendingReply ? "Sending..." : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Freshdesk;
