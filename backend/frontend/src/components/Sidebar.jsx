import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiLogOut,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiMessageSquare,
  FiSettings,
  FiUser,
} from "react-icons/fi";

import api from "../api/api";
import "../styles/sidebar.css";

export default function Sidebar({
  chats,
  activeChat,
  onSelect,
  onNewChat,
  onLogout,
  setChats,
  setActiveChat,
}) {

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);

  const [editingChat, setEditingChat] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const [deleteChatData, setDeleteChatData] = useState(null);

  // =====================================================
  // SELECT CHAT
  // =====================================================

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setMenuOpen(null);
  };

  // =====================================================
  // RENAME CHAT
  // =====================================================

  async function saveRename(chat) {
    const newTitle = editTitle.trim();

    if (!newTitle) {
      setEditingChat(null);
      return;
    }

    try {
      await api.put(`/chat/rename/${chat.id}`, {
        title: newTitle,
      });

      setChats((prev) =>
        prev.map((c) =>
          c.id === chat.id
            ? {
                ...c,
                title: newTitle,
              }
            : c
        )
      );

      if (activeChat?.id === chat.id) {
        setActiveChat({
          ...activeChat,
          title: newTitle,
        });
      }

      setEditingChat(null);
    } catch (err) {
      console.error("Rename chat error:", err);
    }
  }

  // =====================================================
  // DELETE CHAT
  // =====================================================

  async function deleteChat(chat) {
    try {
      await api.delete(`/chat/${chat.id}`);

      const updatedChats = chats.filter(
        (c) => c.id !== chat.id
      );

      setChats(updatedChats);

      if (activeChat?.id === chat.id) {
        setActiveChat(updatedChats[0] || null);
      }

      setDeleteChatData(null);
    } catch (err) {
      console.error("Delete chat error:", err);
    }
  }

  // =====================================================
  // FILTER CHATS
  // =====================================================

  const filteredChats = chats.filter((chat) =>
    (chat.title || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // =====================================================
  // JSX
  // =====================================================

  return (
    <>
      <aside className="sidebar">

        {/* =================================================
            SIDEBAR HEADER
        ================================================= */}

        <div className="sidebar-header">

          <div className="sidebar-brand">
            <div className="brand-icon">
              N
            </div>

            <div>
              <h1>Nova AI</h1>
              <span>AI Assistant</span>
            </div>
          </div>

        </div>

        {/* =================================================
            NEW CHAT
        ================================================= */}

        <div className="sidebar-new-chat">

          <button
  type="button"
  className="new-chat-btn"
  onClick={onNewChat}
>
  <FiPlus />
  <span>New Chat</span>
</button>

        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="search-wrapper">
  <FiSearch className="search-icon" />

  <input
    type="text"
    className="search-input"
    placeholder="Search chats..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
</div>

        {/* =================================================
            CHAT LIST HEADER
        ================================================= */}

        <div className="chat-list-header">
          <span>YOUR CHATS</span>
          <span className="chat-count">
            {filteredChats.length}
          </span>
        </div>

        {/* =================================================
            CHAT LIST
        ================================================= */}

        <div className="chat-list">

          {filteredChats.length === 0 ? (

            <div className="empty-chat">

              <FiMessageSquare size={24} />

              <span>
                {search
                  ? "No chats found"
                  : "No chats yet"}
              </span>

              {!search && (
                <small>
                  Start a new conversation
                </small>
              )}

            </div>

          ) : (

            filteredChats.map((chat) => (

              <div
                key={chat.id}
                className={`chat-item ${
                  activeChat?.id === chat.id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  handleSelectChat(chat)
                }
              >

                {/* CHAT ICON */}

                <div className="chat-item-icon">
                  <FiMessageSquare size={15} />
                </div>

                {/* CHAT TITLE */}

                <div className="chat-title">

                  {editingChat === chat.id ? (

                    <input
                      autoFocus
                      className="rename-input"
                      value={editTitle}
                      onChange={(e) =>
                        setEditTitle(e.target.value)
                      }
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                      onBlur={() =>
                        saveRename(chat)
                      }
                      onKeyDown={(e) => {

                        if (e.key === "Enter") {
                          saveRename(chat);
                        }

                        if (e.key === "Escape") {
                          setEditingChat(null);
                        }

                      }}
                    />

                  ) : (

                    <span title={chat.title}>
                      {chat.title || "New Chat"}
                    </span>

                  )}

                </div>

                {/* MORE MENU */}

                <div
                  className="chat-menu"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >

                  <button
                    className="menu-button"
                    onClick={() =>
                      setMenuOpen(
                        menuOpen === chat.id
                          ? null
                          : chat.id
                      )
                    }
                  >
                    <FiMoreVertical size={17} />
                  </button>

                  {menuOpen === chat.id && (

                    <div className="menu-dropdown">

                      <button
                        onClick={() => {

                          setEditingChat(chat.id);
                          setEditTitle(
                            chat.title || ""
                          );
                          setMenuOpen(null);

                        }}
                      >
                        <FiEdit2 size={15} />
                        <span>Rename</span>
                      </button>

                      <button
                        className="delete-option"
                        onClick={() => {

                          setDeleteChatData(chat);
                          setMenuOpen(null);

                        }}
                      >
                        <FiTrash2 size={15} />
                        <span>Delete</span>
                      </button>

                    </div>

                  )}

                </div>

              </div>

            ))

          )}

        </div>

        {/* =================================================
            SIDEBAR FOOTER
        ================================================= */}

        <div className="sidebar-bottom">

  <button
    className="settings-btn"
    onClick={() => navigate("/settings")}
  >
    <FiSettings />
    Settings
  </button>

  <button
    className="logout-btn"
    onClick={onLogout}
  >
    <FiLogOut />
    Logout
  </button>

</div>

      </aside>

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {deleteChatData && (

        <div
          className="modal-overlay"
          onClick={() =>
            setDeleteChatData(null)
          }
        >

          <div
            className="delete-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="delete-modal-icon">
              <FiTrash2 size={22} />
            </div>

            <h2>
              Delete Chat?
            </h2>

            <p>
              Are you sure you want to delete
              <strong>
                {" "}
                "{deleteChatData.title}"
              </strong>
              ?
            </p>

            <div className="modal-buttons">

              <button
                className="cancel-btn"
                onClick={() =>
                  setDeleteChatData(null)
                }
              >
                Cancel
              </button>

              <button
                className="delete-btn"
                onClick={() =>
                  deleteChat(deleteChatData)
                }
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}
    </>
  );
}