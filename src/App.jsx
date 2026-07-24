import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { pageRegistry } from "./pageRegistry.jsx";
import ErrorBoundary from "./NAYSA Cloud/Components/ErrorBoundary";
import {
  fetchData,
  getTenant,
} from "./NAYSA Cloud/Configuration/BaseURL.jsx";
import Navbar from "./NAYSA Cloud/Components/Navbar";
import Sidebar from "./NAYSA Cloud/Components/Sidebar";
import { ResetProvider } from "./NAYSA Cloud/Components/ResetContext";
import Login from "./NAYSA Cloud/Authentication/Login.jsx";
import Register from "./NAYSA Cloud/Authentication/Register.jsx";
import Dashboard1 from "./NAYSA Cloud/Components/Dashboard1.jsx";
import ChangePassword from "./NAYSA Cloud/Authentication/ChangePassword.jsx";
import ApproveUser from "@/NAYSA Cloud/Authentication/ApproveUser.jsx";
import BiometricSettingsPage from "./NAYSA Cloud/Authentication/BiometricSettingsPage.jsx";
import HS from "./NAYSA Cloud/Authentication/HS.jsx";
import AuthProvider, {
  useAuth,
} from "./NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import ElectronScannerPage from "@/NAYSA Cloud/Electron/ElectronScannerPage.jsx";

const LICENSE_ADMIN_MODE = "LICENSE_ADMIN";
const SYSTEM_ADMIN_MODE = "SYSTEM_ADMIN";

const readSessionArray = (key) => {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const PageFallback = ({ label = "Loading..." }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center">
    <LoadingSpinner />
    <p className="mt-4 animate-pulse font-medium text-gray-400">{label}</p>
  </div>
);

/* -------------------- Universal Registry Route -------------------- */
const UniversalRegistryRoute = ({ routeRows, loadingMenu }) => {
  const location = useLocation();
  const { componentKey: paramKey } = useParams();

  const queryParams = new URLSearchParams(location.search);
  const isViewMode = queryParams.get("viewDocument") === "true";

  const normalizedRouteRows = Array.isArray(routeRows) ? routeRows : [];
  const hasRouteRows = normalizedRouteRows.length > 0;

  const matchingComponentKey = useMemo(() => {
    if (paramKey && pageRegistry[paramKey]) {
      return paramKey;
    }

    const currentPath = location.pathname.replace(/\/$/, "") || "/";

    const dbMatch = normalizedRouteRows.find((row) => {
      if (!row?.path) return false;

      const dbPath = (
        row.path.startsWith("/") ? row.path : `/${row.path}`
      ).replace(/\/$/, "");

      return dbPath === currentPath;
    });

    return dbMatch?.componentKey || null;
  }, [location.pathname, normalizedRouteRows, paramKey]);

  const Component = matchingComponentKey
    ? pageRegistry[matchingComponentKey]
    : null;

  if ((loadingMenu || !hasRouteRows) && !Component) {
    return <PageFallback label="Validating Access..." />;
  }

  const isAuthorized = normalizedRouteRows.some(
    (row) => row?.componentKey === matchingComponentKey
  );

  if (!Component || (!isAuthorized && !isViewMode)) {
    return <Navigate to="/" replace />;
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback label="Loading Page..." />}>
        <Component key={matchingComponentKey} />
      </Suspense>
    </ErrorBoundary>
  );
};

/* -------------------- Modal Host -------------------- */
const ModalHost = ({ modalKey, onClose }) => {
  const { user } = useAuth();

  if (!modalKey) return null;

  const Component = pageRegistry[modalKey];
  if (!Component) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
        role="presentation"
      >
        <Suspense fallback={<PageFallback />}>
          <Component
            isOpen
            onClose={onClose}
            userCode={user?.USER_CODE}
          />
        </Suspense>
      </div>
    </div>
  );
};

/* -------------------- App Content -------------------- */
const AppContent = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isElectronScannerRoute =
    location.pathname === "/electron-scanner";

  const accountMode = String(user?.ACCOUNT_MODE || "").toUpperCase();
  const isLicenseAdmin = accountMode === LICENSE_ADMIN_MODE;
  const canAccessHeartStrong =
    accountMode === LICENSE_ADMIN_MODE ||
    accountMode === SYSTEM_ADMIN_MODE;

  // MIRACLE receives PERMISSION_USER_CODE=NAYSA.
  // Normal users fall back to their own USER_CODE.
  const permissionUserCode =
    user?.PERMISSION_USER_CODE ||
    user?.AUTH_USER_CODE ||
    user?.USER_CODE ||
    "";

  const menuFetchKey = user
    ? `${user.USER_CODE || ""}:${permissionUserCode}:${accountMode}`
    : "";

  const [menuItems, setMenuItems] = useState(() =>
    readSessionArray("menuItems")
  );
  const [routeRows, setRouteRows] = useState(() =>
    readSessionArray("routeRows")
  );
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [activeModalKey, setActiveModalKey] = useState(null);
  const [pendingModalKey, setPendingModalKey] = useState(null);
  const [navDirection, setNavDirection] = useState(1);

  const menuFetchedRef = useRef(null);
  const pathnameHistoryRef = useRef([location.pathname]);

  const resetAppData = useCallback(() => {
    setMenuItems([]);
    setRouteRows([]);
    setLoadingMenu(false);
    setIsSidebarVisible(false);
    setActiveModalKey(null);
    setPendingModalKey(null);

    menuFetchedRef.current = null;

    try {
      sessionStorage.removeItem("menuItems");
      sessionStorage.removeItem("routeRows");
    } catch {
      // Ignore browser storage errors.
    }
  }, []);

  const handleLogout = useCallback(async () => {
    resetAppData();
    await logout();
    navigate("/", { replace: true });
  }, [logout, navigate, resetAppData]);

  /* HEARTSTRONG is restricted to the HeartStrong setup page. */
  useEffect(() => {
    if (loading || !user) return;

    if (
      isLicenseAdmin &&
      location.pathname !== "/heartstrong"
    ) {
      navigate("/heartstrong", { replace: true });
      return;
    }

    if (
      location.pathname === "/heartstrong" &&
      !canAccessHeartStrong
    ) {
      navigate("/", { replace: true });
    }
  }, [
    canAccessHeartStrong,
    isLicenseAdmin,
    loading,
    location.pathname,
    navigate,
    user,
  ]);

  /* Load menu and route metadata using the permission account. */
  useEffect(() => {
    let alive = true;
    const tenant = getTenant();

    if (!user) {
      resetAppData();
      return undefined;
    }

    // HEARTSTRONG must not load the normal Financials menu.
    if (isLicenseAdmin) {
      setMenuItems([]);
      setRouteRows([]);
      setLoadingMenu(false);
      setIsSidebarVisible(false);
      menuFetchedRef.current = menuFetchKey;

      try {
        sessionStorage.removeItem("menuItems");
        sessionStorage.removeItem("routeRows");
      } catch {
        // Ignore browser storage errors.
      }

      return undefined;
    }

    if (
      loading ||
      !tenant ||
      !permissionUserCode ||
      menuFetchedRef.current === menuFetchKey
    ) {
      return undefined;
    }

    if (routeRows.length === 0) {
      setLoadingMenu(true);
    }

    const loadMenuMetadata = async () => {
      try {
        const [menuResponse, routesResponse] = await Promise.all([
          fetchData("menu-items", {
            USER_CODE: permissionUserCode,
          }),
          fetchData("menu-routes", {
            USER_CODE: permissionUserCode,
          }),
        ]);

        if (!alive) return;

        const menuData =
          menuResponse?.menuItems ?? menuResponse?.data ?? [];
        const routesData =
          routesResponse?.routes ?? routesResponse?.data ?? [];

        const safeMenu = Array.isArray(menuData) ? menuData : [];
        const safeRoutes = Array.isArray(routesData)
          ? routesData
          : [];

        setMenuItems(safeMenu);
        setRouteRows(safeRoutes);

        try {
          sessionStorage.setItem(
            "menuItems",
            JSON.stringify(safeMenu)
          );
          sessionStorage.setItem(
            "routeRows",
            JSON.stringify(safeRoutes)
          );
        } catch {
          // Ignore browser storage errors.
        }

        menuFetchedRef.current = menuFetchKey;
      } catch (error) {
        console.error("Metadata Fetch Error:", error);

        if (!alive) return;

        setMenuItems([]);
        setRouteRows([]);
      } finally {
        if (alive) {
          setLoadingMenu(false);
        }
      }
    };

    loadMenuMetadata();

    return () => {
      alive = false;
    };
  }, [
    isLicenseAdmin,
    loading,
    menuFetchKey,
    permissionUserCode,
    resetAppData,
    routeRows.length,
    user,
  ]);

  useEffect(() => {
    document.body.style.overflow = activeModalKey
      ? "hidden"
      : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activeModalKey]);

  /* Open supported approval modals from URL query parameters. */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const page = params.get("page");

    if (!["PRApprovalModal", "JOApprovalModal"].includes(page)) {
      return;
    }

    if (!user) {
      sessionStorage.setItem("pendingModalFromUrl", page);
      return;
    }

    if (isLicenseAdmin) {
      sessionStorage.removeItem("pendingModalFromUrl");
      navigate("/heartstrong", { replace: true });
      return;
    }

    if (location.pathname !== "/") {
      setPendingModalKey(page);
      navigate("/", { replace: false });
      return;
    }

    setActiveModalKey(page);

    params.delete("page");
    const nextSearch = params.toString();

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true }
    );
  }, [
    isLicenseAdmin,
    location.pathname,
    location.search,
    navigate,
    user,
  ]);

  useEffect(() => {
    if (!user || isLicenseAdmin) return;

    const pendingModalFromUrl = sessionStorage.getItem(
      "pendingModalFromUrl"
    );

    if (!pendingModalFromUrl) return;

    if (location.pathname !== "/") {
      setPendingModalKey(pendingModalFromUrl);
      sessionStorage.removeItem("pendingModalFromUrl");
      navigate("/", { replace: false });
      return;
    }

    setActiveModalKey(pendingModalFromUrl);
    sessionStorage.removeItem("pendingModalFromUrl");
  }, [isLicenseAdmin, location.pathname, navigate, user]);

  useEffect(() => {
    if (pendingModalKey && location.pathname === "/") {
      const animationFrameId = requestAnimationFrame(() => {
        setActiveModalKey(pendingModalKey);
        setPendingModalKey(null);
      });

      return () => cancelAnimationFrame(animationFrameId);
    }

    return undefined;
  }, [location.pathname, pendingModalKey]);

  useEffect(() => {
    const history = pathnameHistoryRef.current;
    const currentPath = location.pathname;
    const existingIndex = history.indexOf(currentPath);
    const lastPath = history[history.length - 1];

    if (currentPath === lastPath) return;

    if (existingIndex !== -1) {
      setNavDirection(-1);
      pathnameHistoryRef.current = history.slice(
        0,
        existingIndex + 1
      );
    } else {
      setNavDirection(1);
      pathnameHistoryRef.current = [...history, currentPath];
    }
  }, [location.pathname]);

  const pageVariants = {
    initial: (direction) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 1,
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.26,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: (direction) => ({
      x: direction > 0 ? -50 : 50,
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      },
    }),
  };

  const handleOpenModalFromMenu = useCallback(
    (key) => {
      if (isLicenseAdmin) return;

      setIsSidebarVisible(false);
      setActiveModalKey(null);

      if (location.pathname !== "/") {
        setPendingModalKey(key);
        navigate("/", { replace: false });
      } else {
        setActiveModalKey(key);
      }
    },
    [isLicenseAdmin, location.pathname, navigate]
  );

  const handleSidebarNavigate = useCallback(() => {
    setIsSidebarVisible(false);
  }, []);

  if (isElectronScannerRoute) {
    return <ElectronScannerPage />;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route
          path="/change-password"
          element={<ChangePassword />}
        />
        <Route path="/approve-user" element={<ApproveUser />} />
        <Route
          path="*"
          element={
            <Login
              onSwitchToRegister={() => navigate("/register")}
            />
          }
        />
      </Routes>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gray-50 font-roboto dark:bg-black">
      <div className="sticky top-0 z-40">
        <Navbar
          onMenuClick={() => {
            if (isLicenseAdmin) {
              window.dispatchEvent(
                new CustomEvent("heartstrong:toggle-sidebar")
              );
              return;
            }

            setIsSidebarVisible((current) => !current);
          }}
          onLogout={handleLogout}
        />
      </div>

      {!isLicenseAdmin && isSidebarVisible && (
        <div className="fixed inset-0 z-50 flex">
          <Sidebar
            menuItems={menuItems}
            onNavigate={handleSidebarNavigate}
            onOpenModal={handleOpenModalFromMenu}
          />

          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsSidebarVisible(false)}
            role="presentation"
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden p-4">
        <AnimatePresence
          mode="wait"
          initial={false}
          custom={navDirection}
        >
          <motion.div
            key={location.pathname}
            custom={navDirection}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full overflow-y-auto"
          >
            <Routes location={location}>
              <Route
                path="/"
                element={
                  isLicenseAdmin ? (
                    <Navigate
                      to="/heartstrong"
                      replace
                    />
                  ) : (
                    <Dashboard1 user={user} />
                  )
                }
              />

              <Route
                path="/heartstrong"
                element={
                  canAccessHeartStrong ? (
                    <HS />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />

              <Route
                path="/license-management"
                element={<Navigate to="/heartstrong" replace />}
              />

              <Route
                path="/change-password"
                element={
                  isLicenseAdmin ? (
                    <Navigate
                      to="/heartstrong"
                      replace
                    />
                  ) : (
                    <ChangePassword />
                  )
                }
              />

              <Route
                path="/approve-user"
                element={
                  isLicenseAdmin ? (
                    <Navigate
                      to="/heartstrong"
                      replace
                    />
                  ) : (
                    <ApproveUser />
                  )
                }
              />

              <Route
                path="/security-settings/biometric"
                element={
                  isLicenseAdmin ? (
                    <Navigate
                      to="/heartstrong"
                      replace
                    />
                  ) : (
                    <BiometricSettingsPage />
                  )
                }
              />

              <Route
                path="/page/:componentKey"
                element={
                  isLicenseAdmin ? (
                    <Navigate
                      to="/heartstrong"
                      replace
                    />
                  ) : (
                    <UniversalRegistryRoute
                      routeRows={routeRows}
                      loadingMenu={loadingMenu}
                    />
                  )
                }
              />

              <Route
                path="*"
                element={
                  isLicenseAdmin ? (
                    <Navigate
                      to="/heartstrong"
                      replace
                    />
                  ) : (
                    <UniversalRegistryRoute
                      routeRows={routeRows}
                      loadingMenu={loadingMenu}
                    />
                  )
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>

      {!isLicenseAdmin && (
        <ModalHost
          modalKey={activeModalKey}
          onClose={() => setActiveModalKey(null)}
        />
      )}
    </div>
  );
};

/* -------------------- App Root -------------------- */
const App = () => (
  <Router>
    <AuthProvider>
      <ResetProvider>
        <AppContent />
      </ResetProvider>
    </AuthProvider>
  </Router>
);

export default App;