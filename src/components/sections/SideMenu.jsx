import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./SideMenu.css";

function SideMenu() {
  const {
    isAuthenticated,
    isBusiness,
    isCourier,
    isAdmin,
    isSuperAdmin,
    displayName,
    logout,
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active"); // Default tab for business/courier
  const menuRef = useRef(null);
  const location = useLocation();

  // Sync with dashboard tabs when location changes
  useEffect(() => {
    // Get tab from URL query parameter if available
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    } else if (
      location.pathname === "/superadmin" ||
      location.pathname === "/admin"
    ) {
      // Default tab for admin dashboards
      setActiveTab("dashboard");
    } else {
      // Default tab for business/courier dashboards
      setActiveTab("active");
    }
  }, [location]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        isOpen
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Don't render the menu on the login page
  if (location.pathname === "/login") {
    return null;
  }

  return (
    <>
      {/* Hamburger menu button for mobile */}
      <button
        className={`hamburger-menu ${isOpen ? "hidden" : ""}`}
        onClick={() => setIsOpen(true)}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Side menu */}
      <div className={`side-menu ${isOpen ? "open" : ""}`} ref={menuRef}>
        <nav className="menu-nav">
          <ul>
            {/* Show links based on authentication status */}
            {!isAuthenticated ? (
              <li>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  התחברות
                </Link>
              </li>
            ) : (
              <>
                {/* Business Dashboard Links */}
                {isBusiness && (
                  <>
                    <li className="menu-section-title">לוח בקרה לעסקים</li>
                    <li>
                      <Link
                        to="/business?tab=active"
                        className={
                          location.pathname === "/business" &&
                          activeTab === "active"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("active");
                          setIsOpen(false);
                        }}
                      >
                        משלוחים פעילים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/business?tab=history"
                        className={
                          location.pathname === "/business" &&
                          activeTab === "history"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("history");
                          setIsOpen(false);
                        }}
                      >
                        היסטוריית משלוחים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/business?tab=settings"
                        className={
                          location.pathname === "/business" &&
                          activeTab === "settings"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("settings");
                          setIsOpen(false);
                        }}
                      >
                        הגדרות עסק
                      </Link>
                    </li>
                  </>
                )}

                {/* Courier Dashboard Links */}
                {isCourier && (
                  <>
                    <li className="menu-section-title">לוח בקרה לשליחים</li>
                    <li>
                      <Link
                        to="/courier?tab=active"
                        className={
                          location.pathname === "/courier" &&
                          activeTab === "active"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("active");
                          setIsOpen(false);
                        }}
                      >
                        משלוחים פעילים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/courier?tab=history"
                        className={
                          location.pathname === "/courier" &&
                          activeTab === "history"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("history");
                          setIsOpen(false);
                        }}
                      >
                        היסטוריית משלוחים
                      </Link>
                    </li>
                  </>
                )}

                {/* SuperAdmin Dashboard Links */}
                {isSuperAdmin && (
                  <>
                    <li className="menu-section-title">
                      ניהול מערכת (סופר אדמין)
                    </li>
                    <li>
                      <Link
                        to="/superadmin?tab=dashboard"
                        className={
                          location.pathname === "/superadmin" &&
                          activeTab === "dashboard"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("dashboard");
                          localStorage.setItem('lastSuperAdminTab', 'dashboard');
                          setIsOpen(false);
                        }}
                      >
                        סטטיסטיקות
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/superadmin?tab=companies"
                        className={
                          location.pathname === "/superadmin" &&
                          activeTab === "companies"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("companies");
                          setIsOpen(false);
                        }}
                      >
                        חברות משלוחים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/superadmin?tab=users"
                        className={
                          location.pathname === "/superadmin" &&
                          activeTab === "users"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("users");
                          setIsOpen(false);
                        }}
                      >
                        משתמשים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/superadmin?tab=businesses"
                        className={
                          location.pathname === "/superadmin" &&
                          activeTab === "businesses"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("businesses");
                          setIsOpen(false);
                        }}
                      >
                        עסקים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/superadmin?tab=couriers"
                        className={
                          location.pathname === "/superadmin" &&
                          activeTab === "couriers"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("couriers");
                          setIsOpen(false);
                        }}
                      >
                        שליחים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/superadmin?tab=deliveries"
                        className={
                          location.pathname === "/superadmin" &&
                          activeTab === "deliveries"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("deliveries");
                          setIsOpen(false);
                        }}
                      >
                        משלוחים
                      </Link>
                    </li>
                  </>
                )}

                {/* Admin Dashboard Links */}
                {isAdmin && !isSuperAdmin && (
                  <>
                    <li className="menu-section-title">ניהול מערכת</li>
                    <li>
                      <Link
                        to="/admin?tab=dashboard"
                        className={
                          location.pathname === "/admin" &&
                          activeTab === "dashboard"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("dashboard");
                          setIsOpen(false);
                        }}
                      >
                        סטטיסטיקות
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/admin?tab=businesses"
                        className={
                          location.pathname === "/admin" &&
                          activeTab === "businesses"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("businesses");
                          setIsOpen(false);
                        }}
                      >
                        עסקים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/admin?tab=couriers"
                        className={
                          location.pathname === "/admin" &&
                          activeTab === "couriers"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("couriers");
                          setIsOpen(false);
                        }}
                      >
                        שליחים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/admin?tab=deliveries"
                        className={
                          location.pathname === "/admin" &&
                          activeTab === "deliveries"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("deliveries");
                          setIsOpen(false);
                        }}
                      >
                        משלוחים
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/admin?tab=users"
                        className={
                          location.pathname === "/admin" &&
                          activeTab === "users"
                            ? "active"
                            : ""
                        }
                        onClick={() => {
                          setActiveTab("users");
                          setIsOpen(false);
                        }}
                      >
                        משתמשים
                      </Link>
                    </li>
                  </>
                )}
              </>
            )}
          </ul>
        </nav>

        {/* User info at the bottom */}
        {isAuthenticated && (
          <div className="menu-footer">
            <div className="user-info">
              <span className="user-name">{displayName || "משתמש"}</span>
              <button onClick={handleLogout} className="logout-btn">
                התנתקות
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="menu-overlay" onClick={() => setIsOpen(false)}></div>
      )}
    </>
  );
}

export default SideMenu;
