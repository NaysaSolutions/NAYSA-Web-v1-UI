import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import { pageRegistry } from "./pageRegistry";
import AllTranHistory from "@/NAYSA Cloud/Lookup/SearchGlobalTranHistory.jsx";

// API helpers (sessionStorage-based tenant, cookie auth)
import { fetchData, getTenant } from "./NAYSA Cloud/Configuration/BaseURL.jsx";

import Navbar from "./NAYSA Cloud/Components/Navbar";
import Sidebar from "./NAYSA Cloud/Components/Sidebar";
import { ResetProvider } from "./NAYSA Cloud/Components/ResetContext";

import Login from "./NAYSA Cloud/Authentication/Login.jsx";
import Register from "./NAYSA Cloud/Authentication/Register.jsx";
import Dashboard1 from "./NAYSA Cloud/Components/Dashboard1.jsx";
import { useAuth } from "./NAYSA Cloud/Authentication/AuthContext.jsx";

/* -------------------- Modal Host -------------------- */
const ModalHost = ({ modalKey, onClose }) => {
  const { user } = useAuth();

  if (!modalKey) return null;
  const Cmp = pageRegistry[modalKey];
  if (!Cmp) {
    console.warn("[ModalHost] No component found for key:", modalKey);
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-[999] bg-black/50 flex items-center justify-center p-4"
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
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const { user, loading, logout } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [routeRows, setRouteRows] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [activeModalKey, setActiveModalKey] = useState(null);
  const routesHydrating = loadingMenu;
  const normPath = (p = "") => (p.startsWith("/") ? p : `/${p}`);
  const navigate = useNavigate();

  const toggleSidebar = () => setIsSidebarVisible((prev) => !prev);
  const openModal = (componentKey) => setActiveModalKey(componentKey);
  const handleCloseModal = () => {
    setActiveModalKey(null);
    navigate("/", { replace: true, state: {} });
  };


  const handleLogout = async () => {
    // Delegate to AuthContext (will call /api/logout, broadcast, clear per-tab state)
    await logout();
    setIsSidebarVisible(false);
    navigate("/", { replace: true });
  };

  
  // Renders any component from pageRegistry by URL key
  const RegistryRoute = () => {
    const { componentKey } = useParams();
    const Cmp = pageRegistry[componentKey];
    if (!Cmp) return <Navigate to="/" replace />;
    return <Cmp />;
  };
  

  /* -------- Load menu + routes when user & tenant are present -------- */
  useEffect(() => {
    let alive = true;
    const tenant = getTenant();

    if (loading || !user || !tenant) {
      setMenuItems([]);
      setRouteRows([]);
      return;
    }

    (async () => {
      try {
        setLoadingMenu(true);

        const [menuResp, routesResp] = await Promise.all([
          fetchData("menu-items", { USER_CODE: user?.USER_CODE }),
          fetchData("menu-routes", { USER_CODE: user?.USER_CODE }),
        ]);

        if (!alive) return;

        setMenuItems(
          menuResp?.menuItems ??
            menuResp?.data ??
            (Array.isArray(menuResp) ? menuResp : [])
        );
        setRouteRows(
          routesResp?.routes ??
            routesResp?.data ??
            (Array.isArray(routesResp) ? routesResp : [])
        );
         setRoutesLoaded(true); 
      } catch (e) {
        if (!alive) return;
        console.error("[App] Failed to load menu/routes:", e);
        setMenuItems([]);
        setRouteRows([]);
        setRoutesLoaded(true);
      } finally {
        if (alive) setLoadingMenu(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loading, user]);



  /* -------- Lock body scroll when a modal is open -------- */
  useEffect(() => {
    document.body.style.overflow = activeModalKey ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [activeModalKey]);

  /* -------- Block UI until AuthProvider finishes bootstrap -------- */
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="bg-white dark:bg-gray-900 rounded-xl px-6 py-4 shadow">
          Initializing…
        </div>
      </div>
    );
  }

  /* -------- Auth pages (no navbar/sidebar) -------- */
  if (!user) {
    return (
      <Routes>
        <Route
          path="/"
          element={<Login onSwitchToRegister={() => navigate("/register")} />}
        />
        <Route
          path="/register"
          element={
            <Register
              onRegister={() => navigate("/")}
              onSwitchToLogin={() => navigate("/")}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  /* -------- App pages (with navbar + sidebar) -------- */
  return (
    <div className="relative min-h-screen flex flex-col bg-gray-100 font-roboto dark:bg-black">
      {/* Top navbar */}
      <div className="sticky top-0 z-40">
        <Navbar onMenuClick={toggleSidebar} onLogout={handleLogout} />
      </div>

      {/* Sidebar overlay (mobile) */}
      {isSidebarVisible && (
        <div className="fixed inset-0 z-50 flex">
          <Sidebar
            menuItems={menuItems}
            onNavigate={() => setIsSidebarVisible(false)}
            onOpenModal={(key) => {
              setIsSidebarVisible(false);
              openModal(key);
            }}
          />
          <div
            className="flex-1 bg-black/50"
            onClick={toggleSidebar}
            aria-hidden
          />
        </div>
      )}

      {/* Routed pages */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Lightweight overlay while loading menus */}
        {loadingMenu && (
          <div className="fixed inset-0 z-[70] bg-black/10 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-xl">
              Loading menu…
            </div>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Dashboard1 user={user} />} />      


          {/* generic registry route */}
          <Route path="/page/:componentKey" element={<RegistryRoute />} />
          {/* <Route path="/AllTranHistory" element={<AllTranHistory />} /> */}

            {routeRows
              ?.filter((r) => r.path && r.componentKey && !r.isModal)
              .map(({ code, path, componentKey }) => {
                const Cmp = pageRegistry[componentKey];
                if (!Cmp) {
                  console.warn("[App] No page component for key:", componentKey, "path:", path);
                  return null;
                }
                return <Route key={code ?? path} path={normPath(path)} element={<Cmp />} />;
              })}

          {/* Fallback: go home */}
          {routesLoaded && <Route path="*" element={<Navigate to="/" replace />} />}
        </Routes>
      </div>

      {/* Modal host */}
      <ModalHost modalKey={activeModalKey} onClose={handleCloseModal} />
    </div>
  );
};

/* -------------------- App Root -------------------- */
import AuthProvider from "./NAYSA Cloud/Authentication/AuthContext.jsx";
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
















































































































