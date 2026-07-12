import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { authContext } from "../../Context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { token, setToken } = useContext(authContext);
  const navigate = useNavigate();

  function Signout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    navigate("/login");
  }

  return (
    <header className="dh-navbar">
      <div className="dh-navbar-container">

        {/* Left */}

        <div className="dh-left">

          <NavLink to="/home" className="dh-logo">

            <div className="dh-logo-icon">
              <i className="fa-solid fa-paper-plane"></i>
            </div>

            <span className="dh-text">DeployHub</span>

          </NavLink>

          {token && (
            <nav className="dh-links">

              <NavLink to="/home">Home</NavLink>

              <NavLink to="/projects">Projects</NavLink>

              <NavLink to="/services">Services</NavLink>

              <NavLink to="/github-tokens">GitHub Tokens</NavLink>

            </nav>
          )}
        </div>

        {/* Right */}

        <div className="dh-right">

          {token ? (
            <>


              <NavLink className="profile-link" to="/profile">
                <div className="avatar">
                  {JSON.parse(localStorage.getItem("user"))?.name[0].toUpperCase() || "U"}
                </div>
                <span className="dh-text">Profile</span>
              </NavLink>

              <button className="logout-btn" onClick={Signout}>
                Sign out
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

      </div>
    </header>
  );
}