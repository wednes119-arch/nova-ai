import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ChatBox from "../components/ChatBox";

import { useAuth } from "../context/AuthContext";
import api from "../api/api";

import "../styles/dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);

  // =====================================================
  // MOBILE SIDEBAR
  // =====================================================

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // =====================================================
  // FETCH CHATS
  // =====================================================

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await api.get("/chat/list");

        const list = res.data.chats || [];

        setChats(list);

        if (list.length > 0) {
          setActiveChat(list[0]);
        }
      } catch (err) {
        console.error("Fetch chats error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchChats();
  }, []);

  // =====================================================
  // CREATE NEW CHAT
  // =====================================================

  const createNewChat = async () => {
    try {
      const res = await api.post("/chat/new", {
        title: "New Chat",
      });

      const newChat = {
        id: res.data.chat_id,
        title: res.data.title || "New Chat",
      };

      setChats((prev) => [
        newChat,
        ...prev.filter(
          (chat) => chat.id !== newChat.id
        ),
      ]);

      setActiveChat(newChat);

      // Mobile par sidebar close
      setSidebarOpen(false);

    } catch (err) {
      console.error("Create chat error:", err);

      if (err.response) {
        console.error(
          "Backend response:",
          err.response.data
        );
      }
    }
  };

  // =====================================================
  // SELECT CHAT
  // =====================================================

  const handleSelectChat = (chat) => {
    setActiveChat(chat);

    // Mobile par chat select hone ke baad drawer close
    setSidebarOpen(false);
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // =====================================================
  // CLOSE SIDEBAR WITH ESC
  // =====================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  // =====================================================
  // LOCK BODY SCROLL WHEN MOBILE SIDEBAR OPEN
  // =====================================================

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add(
        "mobile-sidebar-open"
      );
    } else {
      document.body.classList.remove(
        "mobile-sidebar-open"
      );
    }

    return () => {
      document.body.classList.remove(
        "mobile-sidebar-open"
      );
    };
  }, [sidebarOpen]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div
      className={`dashboard ${
        sidebarOpen ? "sidebar-is-open" : ""
      }`}
    >

      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      <div
        className={`mobile-sidebar-overlay ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`dashboard-sidebar ${
          sidebarOpen ? "mobile-open" : ""
        }`}
      >
        <Sidebar
          chats={chats}
          activeChat={activeChat}

          onSelect={handleSelectChat}

          onNewChat={createNewChat}

          onLogout={handleLogout}

          setChats={setChats}
          setActiveChat={setActiveChat}

          isOpen={sidebarOpen}

          onClose={() =>
            setSidebarOpen(false)
          }
        />
      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="dashboard-main">

        <div className="dashboard-right">

          {/* =================================================
              NAVBAR
          ================================================= */}

          <Navbar
            chat={activeChat}
            onMenuClick={() =>
              setSidebarOpen(true)
            }
          />

          {/* =================================================
              CHAT
          ================================================= */}

          <ChatBox
            chat={activeChat}
            loading={loading}
          />

        </div>

      </main>
    </div>
  );
}