import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { authContext } from "../../Context/AuthContext";
import { useTheme } from "../../Context/ThemeContext";
import "./Navbar.css";

export default function Navbar() {
  const { token, setToken } = useContext(authContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  function Signout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    navigate("/login");
  }

  return (
    <aside className="dh-sidebar">

      {/* Brand + theme toggle */}
      <div className="dh-sidebar-top">
        <NavLink to="/home" className="dh-logo">
          <div className="dh-logo-icon">
            <i className="fa-solid fa-paper-plane"></i>
          </div>
          <span className="dh-text">DeployHub</span>
        </NavLink>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle dark / light theme"
          title="Toggle dark / light theme"
        >
          <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`}></i>
        </button>
      </div>

      {/* Nav links */}
      {token && (
        <nav className="dh-links">
          <NavLink to="/home" className="dh-link">
            <i className="fa-solid fa-gauge dh-link-icon"></i>
            <span>Home</span>
          </NavLink>

          <NavLink to="/projects" className="dh-link">
            <i className="fa-solid fa-diagram-project dh-link-icon"></i>
            <span>Projects</span>
          </NavLink>

          <NavLink to="/services" className="dh-link">
            <i className="fa-solid fa-layer-group dh-link-icon"></i>
            <span>Services</span>
          </NavLink>

          <NavLink to="/github-tokens" className="dh-link">
            <i className="fa-brands fa-github dh-link-icon"></i>
            <span>GitHub Tokens</span>
          </NavLink>
        </nav>
      )}

      <div className="dh-sidebar-spacer"></div>

      {/* Bottom: profile / auth */}
      <div className="dh-sidebar-bottom">
        {token ? (
          <>
            <NavLink className="profile-link" to="/profile">
              <div className="avatar">
                {JSON.parse(localStorage.getItem("user"))?.name[0].toUpperCase() || "U"}
              </div>
              <span className="dh-text">Profile</span>
            </NavLink>

            <button className="logout-btn" onClick={Signout}>
              <i className="fa-solid fa-right-from-bracket"></i>
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <>
            <NavLink className="auth-link" to="/login">
              Login
            </NavLink>

            <NavLink className="register-btn" to="/register">
              Register
            </NavLink>
          </>
        )}
      </div>

    </aside>
  );
}
