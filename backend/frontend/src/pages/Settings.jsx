import { useEffect, useState } from "react";

import {
  FiArrowLeft,
  FiUser,
  FiLock,
  FiShield,
  FiDatabase,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiSave,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiLogOut,
  FiMonitor,
  FiMoon,
  FiSun,
  FiInfo,
  FiX,
  FiAlertTriangle,
  FiCode,
  FiLayers,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import api from "../api/api";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";

import "../styles/settings.css";

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState("profile");

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);

  const [chatHistory, setChatHistory] = useState(true);
  const [savingHistory, setSavingHistory] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("nova-theme") || "light";
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function applyTheme(selectedTheme) {
    const root = document.documentElement;

    if (selectedTheme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

      root.setAttribute(
        "data-theme",
        prefersDark ? "dark" : "light"
      );

      localStorage.setItem("nova-theme", "system");
      return;
    }

    root.setAttribute("data-theme", selectedTheme);
    localStorage.setItem("nova-theme", selectedTheme);
  }

  function handleThemeChange(selectedTheme) {
    setTheme(selectedTheme);
    applyTheme(selectedTheme);

    const themeName =
      selectedTheme === "dark"
        ? "Dark mode"
        : selectedTheme === "light"
        ? "Light mode"
        : "System theme";

    toast.success(`${themeName} enabled`);
  }

  async function loadUser() {
    try {
      setLoadingUser(true);

      const res = await api.get("/me");

      const currentUser = res.data.user;

      setUser(currentUser);

      setFullname(currentUser.fullname || "");
      setEmail(currentUser.email || "");

      setChatHistory(
        currentUser.chat_history_enabled !== false
      );
    } catch (err) {
      console.error("Load user error:", err);

      toast.error(
        getErrorMessage(
          err,
          "Failed to load profile"
        )
      );
    } finally {
      setLoadingUser(false);
    }
  }

  function getErrorMessage(err, fallback) {
    const detail = err?.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          return item?.msg || item?.message || "";
        })
        .filter(Boolean);

      return messages.join(", ") || fallback;
    }

    if (detail && typeof detail === "object") {
      return (
        detail.msg ||
        detail.message ||
        fallback
      );
    }

    return fallback;
  }

  function handleBackToChat() {
    navigate("/dashboard");
  }

  function handleLogout() {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  function changeTab(tab) {
    setActiveTab(tab);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }

    if (!newPassword) {
      toast.error("Enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error(
        "New password must be at least 6 characters"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);

      await api.put("/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      toast.success(
        "Password changed successfully"
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err) {
      console.error("Password error:", err);

      toast.error(
        getErrorMessage(
          err,
          "Failed to change password"
        )
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleHistoryToggle() {
    const nextValue = !chatHistory;

    setChatHistory(nextValue);

    try {
      setSavingHistory(true);

      await api.put("/chat-history", {
        enabled: nextValue,
      });

      toast.success(
        nextValue
          ? "Chat history enabled"
          : "Chat history disabled"
      );
    } catch (err) {
      console.error(
        "History setting error:",
        err
      );

      setChatHistory(!nextValue);

      toast.error(
        getErrorMessage(
          err,
          "Failed to update chat history"
        )
      );
    } finally {
      setSavingHistory(false);
    }
  }

  function openDeleteModal() {
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (clearingData) return;

    setDeleteModalOpen(false);
  }

  async function handleClearData() {
    if (clearingData) return;

    try {
      setClearingData(true);

      await api.delete("/chat/clear-all");

      toast.success(
        "All chats deleted successfully"
      );

      setDeleteModalOpen(false);

      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error(
        "Clear all chats error:",
        err
      );

      toast.error(
        getErrorMessage(
          err,
          "Failed to delete all chats"
        )
      );
    } finally {
      setClearingData(false);
    }
  }

  useEffect(() => {
    function handleEscape(e) {
      if (
        e.key === "Escape" &&
        deleteModalOpen &&
        !clearingData
      ) {
        setDeleteModalOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [deleteModalOpen, clearingData]);

  const avatarLetter = fullname
    ? fullname.charAt(0).toUpperCase()
    : "N";

  const tabInfo = {
    profile: {
      eyebrow: "ACCOUNT",
      title: "Profile",
      description:
        "Manage your personal account information.",
    },

    security: {
      eyebrow: "PROTECTION",
      title: "Security",
      description:
        "Keep your Nova AI account protected.",
    },

    privacy: {
      eyebrow: "CONTROL",
      title: "Data & Privacy",
      description:
        "Control how Nova AI stores and handles your data.",
    },

    appearance: {
      eyebrow: "PERSONALIZATION",
      title: "Appearance",
      description:
        "Customize how Nova AI looks on your device.",
    },

    about: {
      eyebrow: "NOVA AI",
      title: "About",
      description:
        "Learn more about Nova AI and the person behind it.",
    },
  };

  const currentTab = tabInfo[activeTab];

  if (loadingUser) {
    return (
      <div className="settings-page">
        <div className="settings-loading">
          <div className="loading-orb">
            <span>N</span>
          </div>

          <div className="loading-content">
            <h3>Nova AI</h3>

            <p>
              Loading your settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">

      <aside className="settings-sidebar">

        <div className="sidebar-top">

          <div className="settings-brand">

            <div className="settings-brand-logo">
              N
            </div>

            <div className="settings-brand-text">
              <strong>Nova AI</strong>
              <span>Settings</span>
            </div>

          </div>

          <nav className="settings-nav">

            <button
              type="button"
              className={`settings-nav-item ${
                activeTab === "profile"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changeTab("profile")
              }
            >
              <span className="nav-icon">
                <FiUser />
              </span>

              <span className="nav-label">
                Profile
              </span>

              <FiChevronRight className="nav-arrow" />
            </button>

            <button
              type="button"
              className={`settings-nav-item ${
                activeTab === "security"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changeTab("security")
              }
            >
              <span className="nav-icon">
                <FiShield />
              </span>

              <span className="nav-label">
                Security
              </span>

              <FiChevronRight className="nav-arrow" />
            </button>

            <button
              type="button"
              className={`settings-nav-item ${
                activeTab === "privacy"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changeTab("privacy")
              }
            >
              <span className="nav-icon">
                <FiDatabase />
              </span>

              <span className="nav-label">
                Data & Privacy
              </span>

              <FiChevronRight className="nav-arrow" />
            </button>

            <button
              type="button"
              className={`settings-nav-item ${
                activeTab === "appearance"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changeTab("appearance")
              }
            >
              <span className="nav-icon">
                <FiMonitor />
              </span>

              <span className="nav-label">
                Appearance
              </span>

              <FiChevronRight className="nav-arrow" />
            </button>

            <button
              type="button"
              className={`settings-nav-item ${
                activeTab === "about"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changeTab("about")
              }
            >
              <span className="nav-icon">
                <FiInfo />
              </span>

              <span className="nav-label">
                About
              </span>

              <FiChevronRight className="nav-arrow" />
            </button>

          </nav>

        </div>

        <div className="sidebar-bottom">

          <div className="sidebar-user-mini">

            <div className="sidebar-user-avatar">
              {avatarLetter}
            </div>

            <div className="sidebar-user-info">

              <strong>
                {fullname || "Nova User"}
              </strong>

              <span>
                {email || "Account"}
              </span>

            </div>

          </div>

          <button
            type="button"
            className="settings-logout"
            onClick={handleLogout}
          >
            <FiLogOut />
            <span>Logout</span>
          </button>

        </div>

      </aside>

      <main className="settings-content">

        <header className="settings-header">

          <div className="settings-header-left">

            <button
              type="button"
              className="settings-back-btn"
              onClick={handleBackToChat}
            >
              <FiArrowLeft />
              <span>Back to chat</span>
            </button>

            <div className="settings-heading">

              <span className="settings-eyebrow">
                {currentTab.eyebrow}
              </span>

              <h1>
                {currentTab.title}
              </h1>

              <p>
                {currentTab.description}
              </p>

            </div>

          </div>

          <div className="settings-header-avatar">
            {avatarLetter}
          </div>

        </header>

        {activeTab === "profile" && (
          <section className="settings-tab-content">

            <div className="section-title">

              <div className="section-icon profile-icon">
                <FiUser />
              </div>

              <div>
                <h2>
                  Account Information
                </h2>

                <p>
                  Your personal account details
                </p>
              </div>

            </div>

            <div className="profile-card">

              <div className="profile-hero-card">

                <div className="profile-hero-left">

                  <div className="profile-avatar-large">

                    <span>
                      {avatarLetter}
                    </span>

                    <div className="avatar-status-dot" />

                  </div>

                  <div className="profile-hero-info">

                    <h3>
                      {fullname || "Nova User"}
                    </h3>

                    <p>
                      {email ||
                        "No email available"}
                    </p>

                    <div className="profile-verified">

                      <FiCheckCircle />

                      <span>
                        Verified account
                      </span>

                    </div>

                  </div>

                </div>

                <div className="profile-account-type">

                  <span>
                    ACCOUNT STATUS
                  </span>

                  <strong>
                    <i />
                    Active
                  </strong>

                </div>

              </div>

              <div className="profile-form-grid">

                <div className="profile-field">

                  <label>
                    Full Name
                  </label>

                  <div className="profile-input-wrap">

                    <FiUser />

                    <input
                      type="text"
                      value={fullname}
                      readOnly
                    />

                  </div>

                </div>

                <div className="profile-field">

                  <label>
                    Email Address
                  </label>

                  <div className="profile-input-wrap">

                    <FiShield />

                    <input
                      type="email"
                      value={email}
                      readOnly
                    />

                  </div>

                </div>

              </div>

            </div>

          </section>
        )}

        {activeTab === "security" && (
          <section className="settings-tab-content">

            <div className="section-title">

              <div className="section-icon security-icon">
                <FiShield />
              </div>

              <div>

                <h2>
                  Password & Security
                </h2>

                <p>
                  Keep your account protected
                </p>

              </div>

            </div>

            <div className="profile-security-card">

              <div className="security-card-header">

                <div className="security-card-title">

                  <div className="security-mini-icon">
                    <FiLock />
                  </div>

                  <div>

                    <h3>
                      Change your password
                    </h3>

                    <p>
                      Use a strong password with
                      at least 6 characters.
                    </p>

                  </div>

                </div>

                <div className="security-badge">
                  <FiShield />
                  Secure
                </div>

              </div>

              <form
                className="profile-password-form"
                onSubmit={handleChangePassword}
              >

                <div className="password-form-grid">

                  <div className="password-field-group">

                    <label>
                      Current Password
                    </label>

                    <div className="password-input-wrapper">

                      <FiLock className="password-leading-icon" />

                      <input
                        type={
                          showCurrent
                            ? "text"
                            : "password"
                        }
                        value={currentPassword}
                        onChange={(e) =>
                          setCurrentPassword(
                            e.target.value
                          )
                        }
                        placeholder="Enter current password"
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        className="password-eye-btn"
                        onClick={() =>
                          setShowCurrent(
                            (v) => !v
                          )
                        }
                      >
                        {showCurrent ? (
                          <FiEyeOff />
                        ) : (
                          <FiEye />
                        )}
                      </button>

                    </div>

                  </div>

                  <div className="password-field-group">

                    <label>
                      New Password
                    </label>

                    <div className="password-input-wrapper">

                      <FiLock className="password-leading-icon" />

                      <input
                        type={
                          showNew
                            ? "text"
                            : "password"
                        }
                        value={newPassword}
                        onChange={(e) =>
                          setNewPassword(
                            e.target.value
                          )
                        }
                        placeholder="Enter new password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className="password-eye-btn"
                        onClick={() =>
                          setShowNew(
                            (v) => !v
                          )
                        }
                      >
                        {showNew ? (
                          <FiEyeOff />
                        ) : (
                          <FiEye />
                        )}
                      </button>

                    </div>

                  </div>

                  <div className="password-field-group">

                    <label>
                      Confirm Password
                    </label>

                    <div className="password-input-wrapper">

                      <FiLock className="password-leading-icon" />

                      <input
                        type={
                          showConfirm
                            ? "text"
                            : "password"
                        }
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className="password-eye-btn"
                        onClick={() =>
                          setShowConfirm(
                            (v) => !v
                          )
                        }
                      >
                        {showConfirm ? (
                          <FiEyeOff />
                        ) : (
                          <FiEye />
                        )}
                      </button>

                    </div>

                  </div>

                </div>

                <div className="password-save-area">

                  <div className="password-tip">

                    <FiShield />

                    <span>
                      Never share your password
                      with anyone.
                    </span>

                  </div>

                  <button
                    type="submit"
                    className="profile-password-btn"
                    disabled={
                      changingPassword
                    }
                  >

                    {changingPassword ? (
                      <>
                        <span className="button-spinner" />
                        Changing...
                      </>
                    ) : (
                      <>
                        <FiSave />
                        Change Password
                      </>
                    )}

                  </button>

                </div>

              </form>

            </div>

          </section>
        )}

        {activeTab === "privacy" && (
          <section className="settings-tab-content">

            <div className="section-title">

              <div className="section-icon data-icon">
                <FiDatabase />
              </div>

              <div>

                <h2>
                  Data & Privacy
                </h2>

                <p>
                  Manage your conversation data
                </p>

              </div>

            </div>

            <div className="settings-data-card">

              <div className="setting-row">

                <div className="setting-row-info">

                  <div className="setting-row-icon">
                    <FiDatabase />
                  </div>

                  <div>

                    <strong>
                      Chat History
                    </strong>

                    <p>
                      Save your conversations
                      so you can access them later.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className={`settings-toggle ${
                    chatHistory ? "active" : ""
                  }`}
                  onClick={
                    handleHistoryToggle
                  }
                  disabled={
                    savingHistory
                  }
                >
                  <span>
                    {chatHistory && <FiCheck />}
                  </span>
                </button>

              </div>

              <div className="data-divider" />

              <div className="privacy-info-row">

                <div className="privacy-info-icon">
                  <FiShield />
                </div>

                <div>

                  <strong>
                    Your data stays under
                    your control
                  </strong>

                  <p>
                    You can disable chat history
                    or permanently remove saved
                    conversations at any time.
                  </p>

                </div>

              </div>

              <div className="profile-danger-card">

                <div className="danger-content">

                  <div className="danger-icon">
                    <FiTrash2 />
                  </div>

                  <div>

                    <strong>
                      Clear all chat data
                    </strong>

                    <p>
                      Permanently delete all saved
                      conversations and messages.
                      This action cannot be undone.
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  className="profile-danger-btn"
                  onClick={openDeleteModal}
                >
                  <FiTrash2 />
                  Clear Data
                </button>

              </div>

            </div>

          </section>
        )}

        {activeTab === "appearance" && (
          <section className="settings-tab-content">

            <div className="section-title">

              <div className="section-icon appearance-icon">
                <FiMonitor />
              </div>

              <div>

                <h2>
                  Appearance
                </h2>

                <p>
                  Customize your Nova AI experience
                </p>

              </div>

            </div>

            <div className="appearance-card">

              <div className="appearance-card-header">

                <div>

                  <h3>
                    Theme
                  </h3>

                  <p>
                    Choose how Nova AI should
                    appear on your screen.
                  </p>

                </div>

                <div className="appearance-current">

                  {theme === "dark" ? (
                    <FiMoon />
                  ) : theme === "light" ? (
                    <FiSun />
                  ) : (
                    <FiMonitor />
                  )}

                  <span>
                    {theme === "dark"
                      ? "Dark"
                      : theme === "light"
                      ? "Light"
                      : "System"}
                  </span>

                </div>

              </div>

              <div className="theme-options">

                <button
                  type="button"
                  className={`theme-option ${
                    theme === "light"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleThemeChange("light")
                  }
                >

                  <div className="theme-preview light-preview">

                    <div className="preview-top" />

                    <div className="preview-body">
                      <span />
                      <span />
                      <span />
                    </div>

                  </div>

                  <div className="theme-option-footer">

                    <div>
                      <FiSun />
                      <strong>Light</strong>
                    </div>

                    {theme === "light" && (
                      <span className="theme-check">
                        <FiCheck />
                      </span>
                    )}

                  </div>

                </button>

                <button
                  type="button"
                  className={`theme-option ${
                    theme === "dark"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleThemeChange("dark")
                  }
                >

                  <div className="theme-preview dark-preview">

                    <div className="preview-top" />

                    <div className="preview-body">
                      <span />
                      <span />
                      <span />
                    </div>

                  </div>

                  <div className="theme-option-footer">

                    <div>
                      <FiMoon />
                      <strong>Dark</strong>
                    </div>

                    {theme === "dark" && (
                      <span className="theme-check">
                        <FiCheck />
                      </span>
                    )}

                  </div>

                </button>

                <button
                  type="button"
                  className={`theme-option ${
                    theme === "system"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    handleThemeChange("system")
                  }
                >

                  <div className="theme-preview system-preview">

                    <div className="preview-half light-half" />

                    <div className="preview-half dark-half" />

                    <div className="system-center">
                      <FiMonitor />
                    </div>

                  </div>

                  <div className="theme-option-footer">

                    <div>
                      <FiMonitor />
                      <strong>System</strong>
                    </div>

                    {theme === "system" && (
                      <span className="theme-check">
                        <FiCheck />
                      </span>
                    )}

                  </div>

                </button>

              </div>

            </div>

            <div className="appearance-note">

              <div className="appearance-note-icon">
                <FiInfo />
              </div>

              <div>

                <strong>
                  Theme preference
                </strong>

                <p>
                  Your theme preference is saved
                  automatically and remembered
                  when you return to Nova AI.
                </p>

              </div>

            </div>

          </section>
        )}

        {activeTab === "about" && (
          <section className="settings-tab-content about-tab">

            <div className="section-title">

              <div className="section-icon about-icon">
                <FiInfo />
              </div>

              <div>

                <h2>
                  About Nova AI
                </h2>

                <p>
                  Information about Nova AI
                  and its creator
                </p>

              </div>

            </div>

            <div className="about-card">

              <div className="about-hero">

                <div className="about-logo">
                  N
                </div>

                <div className="about-hero-info">

                  <span className="about-small-label">
                    NOVA AI
                  </span>

                  <h2>
                    Nova AI
                  </h2>

                  <p>
                    Your intelligent AI assistant
                  </p>

                  <span className="version-badge">
                    Version 1.0.0
                  </span>

                </div>

              </div>

              <div className="about-divider" />

              <div className="creator-section">

                <div className="creator-badge">
                  <FiCode />
                </div>

                <div className="creator-main">

                  <span className="creator-label">
                    CREATED & DEVELOPED BY
                  </span>

                  <h2>
                    Syed Ali Ahsan
                  </h2>

                  <p>
                    The creator and developer
                    behind Nova AI.
                  </p>

                </div>

              </div>

              <div className="about-detail-grid">

                <div className="about-detail-card">

                  <div className="about-detail-icon">
                    <FiLayers />
                  </div>

                  <div>

                    <strong>
                      Nova AI
                    </strong>

                    <p>
                      A modern AI assistant designed
                      to provide intelligent,
                      helpful and conversational
                      experiences.
                    </p>

                  </div>

                </div>

                <div className="about-detail-card">

                  <div className="about-detail-icon">
                    <FiCode />
                  </div>

                  <div>

                    <strong>
                      Information
                    </strong>

                    <p>
                      Nova AI is part of the
                      development and detailing
                      work created by
                      Syed Ali Ahsan.
                    </p>

                  </div>

                </div>

              </div>

              <div className="about-description">

                <h3>
                  About the Creator
                </h3>

                <p>
                  Nova AI was designed and developed
                  by <strong>Syed Ali Ahsan</strong>,
                  with the goal of creating a clean,
                  modern and practical AI experience.
                </p>

                <p>
                  From the interface and settings
                  experience to the conversational
                  workflow, Nova AI brings together
                  thoughtful product design and
                  technical development.
                </p>

              </div>

              <div className="about-tech-row">

                <span>
                  Designed & Developed with
                  passion
                </span>

                <div className="about-tech-badges">

                  <span>Nova AI</span>
                  <span>KCX</span>
                  <span>1.0.0</span>

                </div>

              </div>

              <div className="about-footer">

                <span>
                  © 2026 Nova AI
                </span>

                <span>
                  Created by Syed Ali Ahsan
                </span>

              </div>

            </div>

          </section>
        )}

        <footer className="settings-footer">

          <div className="footer-brand">

            <span className="footer-logo">
              N
            </span>

            <strong>
              Nova AI
            </strong>

          </div>

          <span>
            {currentTab.title}
          </span>

        </footer>

      </main>

      {deleteModalOpen && (
        <div
          className="delete-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget &&
              !clearingData
            ) {
              closeDeleteModal();
            }
          }}
        >

          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >

            <button
              type="button"
              className="modal-close-btn"
              onClick={closeDeleteModal}
              disabled={clearingData}
              aria-label="Close"
            >
              <FiX />
            </button>

            <div className="modal-danger-icon">
              <FiAlertTriangle />
            </div>

            <div className="modal-content">

              <h2 id="delete-modal-title">
                Delete all chats?
              </h2>

              <p>
                This will permanently delete all
                your saved conversations and
                messages. This action cannot be
                undone.
              </p>

            </div>

            <div className="modal-warning">

              <FiTrash2 />

              <span>
                All conversation history will
                be permanently removed.
              </span>

            </div>

            <div className="modal-actions">

              <button
                type="button"
                className="modal-cancel-btn"
                onClick={closeDeleteModal}
                disabled={clearingData}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-delete-btn"
                onClick={handleClearData}
                disabled={clearingData}
              >

                {clearingData ? (
                  <>
                    <span className="button-spinner dark-spinner" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <FiTrash2 />
                    Yes, Delete All
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}