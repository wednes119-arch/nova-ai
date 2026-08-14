import { useState, useEffect } from "react";
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
        console.error(err);
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
    console.log("Creating new chat...");

    const res = await api.post("/chat/new", {
      title: "New Chat",
    });

    console.log("New chat response:", res.data);

    const newChat = {
      id: res.data.chat_id,
      title: res.data.title || "New Chat",
    };

    // Add new chat at top
    setChats((prev) => [
      newChat,
      ...prev.filter((chat) => chat.id !== newChat.id),
    ]);

    // Make it active
    setActiveChat(newChat);

  } catch (err) {
    console.error("Create chat error:", err);

    if (err.response) {
      console.error("Backend response:", err.response.data);
    }
  }
};

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // =====================================================
  // DASHBOARD
  // =====================================================

  // =====================================================
// DASHBOARD UI
// =====================================================

return (
  <div className="dashboard">

    {/* =================================================
        SIDEBAR
    ================================================= */}

    <aside className="dashboard-sidebar">
  <Sidebar
    chats={chats}
    activeChat={activeChat}
    onSelect={(chat) => {
      setActiveChat(chat);
    }}
    onNewChat={createNewChat}
    onLogout={handleLogout}
    setChats={setChats}
    setActiveChat={setActiveChat}
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

        <Navbar chat={activeChat} />


        {/* =================================================
            CHAT AREA
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