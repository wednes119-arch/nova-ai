import "../styles/navbar.css";

export default function Navbar({ chat }) {
  return (
    <header className="navbar">

      <div className="navbar-left">

        <div className="navbar-title-row">
          <div className="nova-status-dot"></div>

          <h2 className="navbar-title">
            {chat ? chat.title : "New Chat"}
          </h2>
        </div>

        <span className="navbar-subtitle">
          <span className="subtitle-icon">✦</span>
          Nova AI Assistant
        </span>

      </div>

      <div className="navbar-right">

        <div className="navbar-status">
          <span className="status-pulse"></span>
          Online
        </div>

        <div className="user-avatar">
          U
        </div>

      </div>

    </header>
  );
}