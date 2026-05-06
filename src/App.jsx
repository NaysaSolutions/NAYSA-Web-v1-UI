
// import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
// import {
//   BrowserRouter as Router,
//   Routes,
//   Route,
//   Navigate,
//   useNavigate,
//   useParams,
//   useLocation,
// } from "react-router-dom";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// // import { AnimatePresence, motion } from "motion/react";
// import { AnimatePresence, motion } from "framer-motion";
// import { pageRegistry } from "./pageRegistry.jsx";
// import ErrorBoundary from "./NAYSA Cloud/Components/ErrorBoundary";
// import { fetchData, getTenant } from "./NAYSA Cloud/Configuration/BaseURL.jsx";
// import Navbar from "./NAYSA Cloud/Components/Navbar";
// import Sidebar from "./NAYSA Cloud/Components/Sidebar";
// import { ResetProvider } from "./NAYSA Cloud/Components/ResetContext";
// import Login from "./NAYSA Cloud/Authentication/Login.jsx";
// import Register from "./NAYSA Cloud/Authentication/Register.jsx";
// import Dashboard1 from "./NAYSA Cloud/Components/Dashboard1.jsx";
// import ChangePassword from "./NAYSA Cloud/Authentication/ChangePassword.jsx";
// import ApproveUser from "@/NAYSA Cloud/Authentication/ApproveUser.jsx";
// import BiometricSettingsPage from "./NAYSA Cloud/Authentication/BiometricSettingsPage.jsx";
// import AuthProvider, { useAuth } from "./NAYSA Cloud/Authentication/AuthContext.jsx";
// import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
// import ElectronScannerPage from "@/NAYSA Cloud/Electron/ElectronScannerPage.jsx";

// const queryClient = new QueryClient();

// /* -------------------- Universal Registry Route (The Gatekeeper) -------------------- */
// const UniversalRegistryRoute = ({ routeRows, loadingMenu }) => {
//   const location = useLocation();
//   const { componentKey: paramKey } = useParams();
//   const queryParams = new URLSearchParams(location.search);
//   const isViewMode = queryParams.get("viewDocument") === "true";

//   const normalizedRouteRows = Array.isArray(routeRows) ? routeRows : [];
//   const hasRouteRows = normalizedRouteRows.length > 0;

//   const matchingComponentKey = useMemo(() => {
//     if (paramKey && pageRegistry[paramKey]) return paramKey;

//     const currentPath = location.pathname.replace(/\/$/, "") || "/";
//     const dbMatch = normalizedRouteRows.find((r) => {
//       if (!r.path) return false;
//       const dbPath = (r.path.startsWith("/") ? r.path : `/${r.path}`).replace(/\/$/, "");
//       return dbPath === currentPath;
//     });

//     return dbMatch ? dbMatch.componentKey : null;
//   }, [location.pathname, paramKey, normalizedRouteRows]);

//   const Component = matchingComponentKey ? pageRegistry[matchingComponentKey] : null;

//   if ((loadingMenu || !hasRouteRows) && !Component) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-[60vh]">
//         <LoadingSpinner />
//         <p className="mt-4 text-gray-400 animate-pulse font-medium">
//           Validating Access...
//         </p>
//       </div>
//     );
//   }

//   const isAuthorized = normalizedRouteRows.some(
//     (r) => r.componentKey === matchingComponentKey
//   );

//   if (!Component || (!isAuthorized && !isViewMode)) {
//     return <Navigate to="/" replace />;
//   }

//   return (
//     <ErrorBoundary>
//       <Component key={matchingComponentKey} />
//     </ErrorBoundary>
//   );
// };

// /* -------------------- Modal Host -------------------- */
// const ModalHost = ({ modalKey, onClose }) => {
//   const { user } = useAuth();
//   if (!modalKey) return null;

//   const Cmp = pageRegistry[modalKey];
//   if (!Cmp) return null;

//   return (
//     <div
//       className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
//       onClick={onClose}
//     >
//       <div
//         className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <Cmp isOpen={true} onClose={onClose} userCode={user?.USER_CODE} />
//       </div>
//     </div>
//   );
// };

// /* -------------------- App Content -------------------- */
// const AppContent = () => {
//   const { user, loading, logout } = useAuth();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const isElectronScannerRoute = location.pathname === "/electron-scanner";

//   const [menuItems, setMenuItems] = useState(
//     () => JSON.parse(sessionStorage.getItem("menuItems")) || []
//   );
//   const [routeRows, setRouteRows] = useState(
//     () => JSON.parse(sessionStorage.getItem("routeRows")) || []
//   );
//   const [loadingMenu, setLoadingMenu] = useState(false);
//   const [isSidebarVisible, setIsSidebarVisible] = useState(false);
//   const [activeModalKey, setActiveModalKey] = useState(null);
//   const [pendingModalKey, setPendingModalKey] = useState(null);

//   const menuFetchedRef = useRef(null);

//   const [navDirection, setNavDirection] = useState(1);
//   const pathnameHistoryRef = useRef([location.pathname]);

//   const resetAppData = useCallback(() => {
//     setMenuItems([]);
//     setRouteRows([]);
//     setLoadingMenu(false);
//     setIsSidebarVisible(false);
//     setActiveModalKey(null);
//     setPendingModalKey(null);
//     menuFetchedRef.current = null;
//     sessionStorage.removeItem("menuItems");
//     sessionStorage.removeItem("routeRows");
//   }, []);

//   const handleLogout = useCallback(async () => {
//     resetAppData();
//     await logout();
//     navigate("/", { replace: true });
//   }, [logout, resetAppData, navigate]);

//   useEffect(() => {
//     let alive = true;
//     const tenant = getTenant();

//     if (!user) {
//       resetAppData();
//       return;
//     }

//     if (loading || !tenant || menuFetchedRef.current === user.USER_CODE) return;

//     if (routeRows.length === 0) {
//       setLoadingMenu(true);
//     }

//     (async () => {
//       try {
//         const [menuResp, routesResp] = await Promise.all([
//           fetchData("menu-items", { USER_CODE: user.USER_CODE }),
//           fetchData("menu-routes", { USER_CODE: user.USER_CODE }),
//         ]);

//         if (!alive) return;

//         const mData = menuResp?.menuItems ?? menuResp?.data ?? [];
//         const rData = routesResp?.routes ?? routesResp?.data ?? [];

//         const safeMenu = Array.isArray(mData) ? mData : [];
//         const safeRoutes = Array.isArray(rData) ? rData : [];

//         setMenuItems(safeMenu);
//         setRouteRows(safeRoutes);
//         sessionStorage.setItem("menuItems", JSON.stringify(safeMenu));
//         sessionStorage.setItem("routeRows", JSON.stringify(safeRoutes));
//         menuFetchedRef.current = user.USER_CODE;
//       } catch (e) {
//         console.error("Metadata Fetch Error:", e);
//       } finally {
//         if (alive) setLoadingMenu(false);
//       }
//     })();

//     return () => {
//       alive = false;
//     };
//   }, [user, loading, resetAppData, routeRows.length]);

//   useEffect(() => {
//     document.body.style.overflow = activeModalKey ? "hidden" : "auto";
//     return () => { document.body.style.overflow = "auto"; };
//   }, [activeModalKey]);

//   useEffect(() => {
//     if (pendingModalKey && location.pathname === "/") {
//       const id = requestAnimationFrame(() => {
//         setActiveModalKey(pendingModalKey);
//         setPendingModalKey(null);
//       });

//       return () => cancelAnimationFrame(id);
//     }
//   }, [pendingModalKey, location.pathname]);

//   useEffect(() => {
//     const history = pathnameHistoryRef.current;
//     const currentPath = location.pathname;
//     const existingIndex = history.indexOf(currentPath);
//     const lastPath = history[history.length - 1];

//     if (currentPath === lastPath) return;

//     if (existingIndex !== -1) {
//       setNavDirection(-1);
//       pathnameHistoryRef.current = history.slice(0, existingIndex + 1);
//     } else {
//       setNavDirection(1);
//       pathnameHistoryRef.current = [...history, currentPath];
//     }
//   }, [location.pathname]);

//   const pageVariants = {
//     initial: (direction) => ({
//       x: direction > 0 ? 50 : -50,
//       opacity: 1,
//     }),
//     animate: {
//       x: 0,
//       opacity: 1,
//       transition: {
//         duration: 0.26,
//         ease: [0.22, 1, 0.36, 1],
//       },
//     },
//     exit: (direction) => ({
//       x: direction > 0 ? -50 : 50,
//       opacity: 1,
//       transition: {
//         duration: 0.2,
//         ease: [0.4, 0, 0.2, 1],
//       },
//     }),
//   };

//   const handleOpenModalFromMenu = useCallback(
//     (key) => {
//       setIsSidebarVisible(false);
//       setActiveModalKey(null);

//       if (location.pathname !== "/") {
//         setPendingModalKey(key);
//         navigate("/", { replace: false });
//       } else {
//         setActiveModalKey(key);
//       }
//     },
//     [location.pathname, navigate]
//   );

//   if (isElectronScannerRoute) {
//     return <ElectronScannerPage />;
//   }

//   if (loading) {
//     return (
//       <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
//         <LoadingSpinner />
//       </div>
//     );
//   }

//   if (!user) {
//     return (
//       <Routes>
//         <Route path="/register" element={<Register />} />
//         <Route path="/change-password" element={<ChangePassword />} />
//         <Route path="/approve-user" element={<ApproveUser />} />
//         <Route
//           path="*"
//           element={<Login onSwitchToRegister={() => navigate("/register")} />}
//         />
//       </Routes>
//     );
//   }

//   return (
//     <div className="relative min-h-screen flex flex-col bg-gray-50 dark:bg-black font-roboto overflow-hidden">
//       <div className="sticky top-0 z-40">
//         <Navbar
//           onMenuClick={() => setIsSidebarVisible(!isSidebarVisible)}
//           onLogout={handleLogout}
//         />
//       </div>

//       {isSidebarVisible && (
//         <div className="fixed inset-0 z-50 flex">
//           <Sidebar
//             menuItems={menuItems}
//             onNavigate={() => setIsSidebarVisible(false)}
//             onOpenModal={handleOpenModalFromMenu}
//           />
//           <div
//             className="flex-1 bg-black/40 backdrop-blur-sm"
//             onClick={() => setIsSidebarVisible(false)}
//           />
//         </div>
//       )}

//       <div className="flex-1 p-4 overflow-hidden">
//         <AnimatePresence mode="wait" initial={false} custom={navDirection}>
//           <motion.div
//             key={location.pathname}
//             custom={navDirection}
//             variants={pageVariants}
//             initial="initial"
//             animate="animate"
//             exit="exit"
//             className="h-full overflow-y-auto"
//           >
//             <Routes location={location}>
//               <Route path="/" element={<Dashboard1 user={user} />} />
//               <Route path="/change-password" element={<ChangePassword />} />
//               <Route path="/approve-user" element={<ApproveUser />} />
//               <Route
//                 path="/security-settings/biometric"
//                 element={<BiometricSettingsPage />}
//               />
//               <Route
//                 path="/page/:componentKey"
//                 element={
//                   <UniversalRegistryRoute
//                     routeRows={routeRows}
//                     loadingMenu={loadingMenu}
//                   />
//                 }
//               />
//               <Route
//                 path="*"
//                 element={
//                   <UniversalRegistryRoute
//                     routeRows={routeRows}
//                     loadingMenu={loadingMenu}
//                   />
//                 }
//               />
//             </Routes>
//           </motion.div>
//         </AnimatePresence>
//       </div>

//       <ModalHost
//         modalKey={activeModalKey}
//         onClose={() => setActiveModalKey(null)}
//       />
//     </div>
//   );
// };

// /* -------------------- App Root -------------------- */
// const App = () => (
//   <Router>
//     <QueryClientProvider client={queryClient}>
//       <AuthProvider>
//         <ResetProvider>
//           <AppContent />
//         </ResetProvider>
//       </AuthProvider>
//     </QueryClientProvider>
//   </Router>
// );

// export default App;






import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { AnimatePresence, motion } from "motion/react";
import { AnimatePresence, motion } from "framer-motion";
import { pageRegistry } from "./pageRegistry.jsx";
import ErrorBoundary from "./NAYSA Cloud/Components/ErrorBoundary";
import { fetchData, getTenant } from "./NAYSA Cloud/Configuration/BaseURL.jsx";
import Navbar from "./NAYSA Cloud/Components/Navbar";
import Sidebar from "./NAYSA Cloud/Components/Sidebar";
import { ResetProvider } from "./NAYSA Cloud/Components/ResetContext";
import Login from "./NAYSA Cloud/Authentication/Login.jsx";
import Register from "./NAYSA Cloud/Authentication/Register.jsx";
import Dashboard1 from "./NAYSA Cloud/Components/Dashboard1.jsx";
import ChangePassword from "./NAYSA Cloud/Authentication/ChangePassword.jsx";
import ApproveUser from "@/NAYSA Cloud/Authentication/ApproveUser.jsx";
import BiometricSettingsPage from "./NAYSA Cloud/Authentication/BiometricSettingsPage.jsx";
import AuthProvider, { useAuth } from "./NAYSA Cloud/Authentication/AuthContext.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import ElectronScannerPage from "@/NAYSA Cloud/Electron/ElectronScannerPage.jsx";

const queryClient = new QueryClient();

/* -------------------- Universal Registry Route (The Gatekeeper) -------------------- */
const UniversalRegistryRoute = ({ routeRows, loadingMenu }) => {
  const location = useLocation();
  const { componentKey: paramKey } = useParams();
  const queryParams = new URLSearchParams(location.search);
  const isViewMode = queryParams.get("viewDocument") === "true";

  const normalizedRouteRows = Array.isArray(routeRows) ? routeRows : [];
  const hasRouteRows = normalizedRouteRows.length > 0;

  const matchingComponentKey = useMemo(() => {
    if (paramKey && pageRegistry[paramKey]) return paramKey;

    const currentPath = location.pathname.replace(/\/$/, "") || "/";
    const dbMatch = normalizedRouteRows.find((r) => {
      if (!r.path) return false;
      const dbPath = (r.path.startsWith("/") ? r.path : `/${r.path}`).replace(/\/$/, "");
      return dbPath === currentPath;
    });

    return dbMatch ? dbMatch.componentKey : null;
  }, [location.pathname, paramKey, normalizedRouteRows]);

  const Component = matchingComponentKey ? pageRegistry[matchingComponentKey] : null;

  if ((loadingMenu || !hasRouteRows) && !Component) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
        <p className="mt-4 text-gray-400 animate-pulse font-medium">
          Validating Access...
        </p>
      </div>
    );
  }

  const isAuthorized = normalizedRouteRows.some(
    (r) => r.componentKey === matchingComponentKey
  );

  if (!Component || (!isAuthorized && !isViewMode)) {
    return <Navigate to="/" replace />;
  }

  return (
    <ErrorBoundary>
      <Component key={matchingComponentKey} />
    </ErrorBoundary>
  );
};

/* -------------------- Modal Host -------------------- */
const ModalHost = ({ modalKey, onClose }) => {
  const { user } = useAuth();
  if (!modalKey) return null;

  const Cmp = pageRegistry[modalKey];
  if (!Cmp) return null;

  return (
    <div
      className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Cmp isOpen={true} onClose={onClose} userCode={user?.USER_CODE} />
      </div>
    </div>
  );
};

/* -------------------- App Content -------------------- */
const AppContent = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isElectronScannerRoute = location.pathname === "/electron-scanner";

  const [menuItems, setMenuItems] = useState(
    () => JSON.parse(sessionStorage.getItem("menuItems")) || []
  );
  const [routeRows, setRouteRows] = useState(
    () => JSON.parse(sessionStorage.getItem("routeRows")) || []
  );
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [activeModalKey, setActiveModalKey] = useState(null);
  const [pendingModalKey, setPendingModalKey] = useState(null);

  const menuFetchedRef = useRef(null);

  const [navDirection, setNavDirection] = useState(1);
  const pathnameHistoryRef = useRef([location.pathname]);

  const resetAppData = useCallback(() => {
    setMenuItems([]);
    setRouteRows([]);
    setLoadingMenu(false);
    setIsSidebarVisible(false);
    setActiveModalKey(null);
    setPendingModalKey(null);
    menuFetchedRef.current = null;
    sessionStorage.removeItem("menuItems");
    sessionStorage.removeItem("routeRows");
  }, []);

  const handleLogout = useCallback(async () => {
    resetAppData();
    await logout();
    navigate("/", { replace: true });
  }, [logout, resetAppData, navigate]);

  useEffect(() => {
    let alive = true;
    const tenant = getTenant();

    if (!user) {
      resetAppData();
      return;
    }

    if (loading || !tenant || menuFetchedRef.current === user.USER_CODE) return;

    if (routeRows.length === 0) {
      setLoadingMenu(true);
    }

    (async () => {
      try {
        const [menuResp, routesResp] = await Promise.all([
          fetchData("menu-items", { USER_CODE: user.USER_CODE }),
          fetchData("menu-routes", { USER_CODE: user.USER_CODE }),
        ]);

        if (!alive) return;

        const mData = menuResp?.menuItems ?? menuResp?.data ?? [];
        const rData = routesResp?.routes ?? routesResp?.data ?? [];

        const safeMenu = Array.isArray(mData) ? mData : [];
        const safeRoutes = Array.isArray(rData) ? rData : [];

        setMenuItems(safeMenu);
        setRouteRows(safeRoutes);
        sessionStorage.setItem("menuItems", JSON.stringify(safeMenu));
        sessionStorage.setItem("routeRows", JSON.stringify(safeRoutes));
        menuFetchedRef.current = user.USER_CODE;
      } catch (e) {
        console.error("Metadata Fetch Error:", e);
      } finally {
        if (alive) setLoadingMenu(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user, loading, resetAppData, routeRows.length]);

  useEffect(() => {
    document.body.style.overflow = activeModalKey ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [activeModalKey]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const page = params.get("page");

    if (page !== "PRApprovalModal") return;

    if (!user) {
      sessionStorage.setItem("pendingModalFromUrl", page);
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
  }, [location.search, location.pathname, user, navigate]);

  useEffect(() => {
    if (!user) return;

    const pendingModalFromUrl = sessionStorage.getItem("pendingModalFromUrl");
    if (!pendingModalFromUrl) return;

    if (location.pathname !== "/") {
      setPendingModalKey(pendingModalFromUrl);
      sessionStorage.removeItem("pendingModalFromUrl");
      navigate("/", { replace: false });
      return;
    }

    setActiveModalKey(pendingModalFromUrl);
    sessionStorage.removeItem("pendingModalFromUrl");
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    if (pendingModalKey && location.pathname === "/") {
      const id = requestAnimationFrame(() => {
        setActiveModalKey(pendingModalKey);
        setPendingModalKey(null);
      });

      return () => cancelAnimationFrame(id);
    }
  }, [pendingModalKey, location.pathname]);

  useEffect(() => {
    const history = pathnameHistoryRef.current;
    const currentPath = location.pathname;
    const existingIndex = history.indexOf(currentPath);
    const lastPath = history[history.length - 1];

    if (currentPath === lastPath) return;

    if (existingIndex !== -1) {
      setNavDirection(-1);
      pathnameHistoryRef.current = history.slice(0, existingIndex + 1);
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
      setIsSidebarVisible(false);
      setActiveModalKey(null);

      if (location.pathname !== "/") {
        setPendingModalKey(key);
        navigate("/", { replace: false });
      } else {
        setActiveModalKey(key);
      }
    },
    [location.pathname, navigate]
  );

  if (isElectronScannerRoute) {
    return <ElectronScannerPage />;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/approve-user" element={<ApproveUser />} />
        <Route
          path="*"
          element={<Login onSwitchToRegister={() => navigate("/register")} />}
        />
      </Routes>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-gray-50 dark:bg-black font-roboto overflow-hidden">
      <div className="sticky top-0 z-40">
        <Navbar
          onMenuClick={() => setIsSidebarVisible(!isSidebarVisible)}
          onLogout={handleLogout}
        />
      </div>

      {isSidebarVisible && (
        <div className="fixed inset-0 z-50 flex">
          <Sidebar
            menuItems={menuItems}
            onNavigate={() => setIsSidebarVisible(false)}
            onOpenModal={handleOpenModalFromMenu}
          />
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsSidebarVisible(false)}
          />
        </div>
      )}

      <div className="flex-1 p-4 overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={navDirection}>
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
              <Route path="/" element={<Dashboard1 user={user} />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/approve-user" element={<ApproveUser />} />
              <Route
                path="/security-settings/biometric"
                element={<BiometricSettingsPage />}
              />
              <Route
                path="/page/:componentKey"
                element={
                  <UniversalRegistryRoute
                    routeRows={routeRows}
                    loadingMenu={loadingMenu}
                  />
                }
              />
              <Route
                path="*"
                element={
                  <UniversalRegistryRoute
                    routeRows={routeRows}
                    loadingMenu={loadingMenu}
                  />
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>

      <ModalHost
        modalKey={activeModalKey}
        onClose={() => setActiveModalKey(null)}
      />
    </div>
  );
};

/* -------------------- App Root -------------------- */
const App = () => (
  <Router>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ResetProvider>
          <AppContent />
        </ResetProvider>
      </AuthProvider>
    </QueryClientProvider>
  </Router>
);

export default App;



























































































































































































































































































































































































































































































































































































































































































































































