import { FiMenu } from "react-icons/fi";

import "../styles/navbar.css";

export default function Navbar({ chat, onMenuClick }) {
  return (
    <header className="navbar">

      {/* =================================================
          LEFT SIDE
      ================================================= */}

      <div className="navbar-left">

        {/* Mobile Menu */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onMenuClick}
          aria-label="Open menu"
          title="Open menu"
        >
          <FiMenu />
        </button>

        <div className="navbar-left-content">

          <div className="navbar-title-row">

            <div className="nova-status-dot"></div>

            <h2 className="navbar-title">
              {chat ? chat.title : "New Chat"}
            </h2>

          </div>

          <span className="navbar-subtitle">

            <span className="subtitle-icon">
              ✦
            </span>

            Nova AI Assistant

          </span>

        </div>

      </div>


      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div className="navbar-right">

        <div className="navbar-status">

          <span className="status-pulse"></span>

          Online

        </div>


        <div
          className="user-avatar"
          title="User"
        >
          U
        </div>

      </div>

    </header>
  );
}