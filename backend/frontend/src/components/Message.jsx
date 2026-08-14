import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import toast from "react-hot-toast";
import api from "../api/api";

import {
  FiCopy,
  FiThumbsUp,
  FiThumbsDown,
  FiRefreshCw,
  FiVolume2,
  FiEdit2,
  FiX,
  FiCheck,
} from "react-icons/fi";

import CodeBlock from "./CodeBlock";

import "../styles/message.css";

export default function Message({
  role,
  content,
  onRegenerate,
  onEdit,
}) {
  const isUser = role === "user";

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(content || "");
  const [saving, setSaving] = useState(false);

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const [speaking, setSpeaking] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!editing) {
      setEditText(content || "");
    }
  }, [content, editing]);

  // =====================================================
  // COPY
  // =====================================================

  async function copyMessage() {
    if (!content) {
      toast.error("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      toast.success("Response copied!");
    } catch (err) {
      console.error("Copy Error:", err);
      toast.error("Copy failed");
    }
  }

  // =====================================================
  // TTS
  // =====================================================

  async function playTTS() {
    if (!content) {
      toast.error("Nothing to read");
      return;
    }

    if (speaking) {
      return;
    }

    let audioURL = null;
    let player = null;

    try {
      setSpeaking(true);

      const res = await api.post(
        "/files/tts",
        {
          text: content,
        },
        {
          responseType: "blob",
        }
      );

      audioURL = URL.createObjectURL(res.data);

      player = new Audio(audioURL);

      player.onended = () => {
        if (audioURL) {
          URL.revokeObjectURL(audioURL);
        }

        setSpeaking(false);
      };

      player.onerror = () => {
        if (audioURL) {
          URL.revokeObjectURL(audioURL);
        }

        setSpeaking(false);

        toast.error("Audio playback failed");
      };

      await player.play();
    } catch (err) {
      console.error("TTS Error:", err);

      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }

      setSpeaking(false);

      toast.error(
        err.response?.data?.detail ||
          "TTS failed"
      );
    }
  }

  // =====================================================
  // LIKE
  // =====================================================

  function handleLike() {
    setLiked((prev) => {
      const newValue = !prev;

      if (newValue) {
        toast.success("Thanks for the feedback");
      }

      return newValue;
    });

    setDisliked(false);
  }

  // =====================================================
  // DISLIKE
  // =====================================================

  function handleDislike() {
    setDisliked((prev) => {
      const newValue = !prev;

      if (newValue) {
        toast.success("Feedback received");
      }

      return newValue;
    });

    setLiked(false);
  }

  // =====================================================
  // START EDIT
  // =====================================================

  function startEditing() {
    setEditText(content || "");
    setEditing(true);
  }

  // =====================================================
  // CANCEL EDIT
  // =====================================================

  function cancelEditing() {
    setEditText(content || "");
    setEditing(false);
  }

  // =====================================================
  // SAVE EDIT
  // =====================================================

  async function saveEdit() {
    const trimmedText = editText.trim();

    if (!trimmedText) {
      toast.error("Message cannot be empty");
      return;
    }

    if (
      trimmedText ===
      (content || "").trim()
    ) {
      setEditing(false);
      return;
    }

    if (!onEdit) {
      toast.error("Edit is not available");
      return;
    }

    try {
      setSaving(true);

      await onEdit(trimmedText);

      setEditing(false);
    } catch (err) {
      console.error("Edit Error:", err);
      toast.error("Edit failed");
    } finally {
      setSaving(false);
    }
  }

  // =====================================================
  // EDIT KEYBOARD
  // =====================================================

  function handleEditKeyDown(e) {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      saveEdit();

      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();

      cancelEditing();
    }
  }

  // =====================================================
  // REGENERATE
  // =====================================================

  async function handleRegenerate() {
    if (
      !onRegenerate ||
      regenerating
    ) {
      return;
    }

    try {
      setRegenerating(true);

      await onRegenerate();
    } catch (err) {
      console.error(
        "Regenerate Error:",
        err
      );

      toast.error("Regenerate failed");
    } finally {
      setRegenerating(false);
    }
  }

  // =====================================================
  // USER MESSAGE
  // =====================================================

  if (isUser) {
    return (
      <div className="nova-user-message-wrapper">

        {!editing ? (
          <>
            {/* USER BUBBLE */}

            <div className="nova-user-message-bubble">

              <div className="nova-user-message-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                >
                  {content || ""}
                </ReactMarkdown>
              </div>

            </div>

            {/* EDIT BUTTON */}

            {onEdit && (
              <button
                type="button"
                className="nova-user-edit-btn"
                onClick={startEditing}
                title="Edit message"
              >
                <FiEdit2 />

                <span>
                  Edit
                </span>
              </button>
            )}
          </>
        ) : (
          /* EDIT MODE */

          <div className="nova-edit-message-box">

            <textarea
              autoFocus
              value={editText}
              onChange={(e) =>
                setEditText(e.target.value)
              }
              onKeyDown={handleEditKeyDown}
              disabled={saving}
              placeholder="Edit your message..."
            />

            <div className="nova-edit-message-actions">

              <button
                type="button"
                className="nova-edit-cancel-btn"
                onClick={cancelEditing}
                disabled={saving}
              >
                <FiX />

                <span>
                  Cancel
                </span>
              </button>

              <button
                type="button"
                className="nova-edit-save-btn"
                onClick={saveEdit}
                disabled={
                  saving ||
                  !editText.trim()
                }
              >
                <FiCheck />

                <span>
                  {saving
                    ? "Saving..."
                    : "Save"}
                </span>
              </button>

            </div>

          </div>
        )}

      </div>
    );
  }

  // =====================================================
  // AI MESSAGE
  // =====================================================

  return (
    <div className="nova-ai-message-wrapper">

      <div className="nova-ai-message">

        {/* AI HEADER */}

        <div className="nova-ai-message-header">

          <div className="nova-ai-avatar">
            N
          </div>

          <div className="nova-ai-name">
            Nova AI
          </div>

        </div>

        {/* AI CONTENT */}

        <div className="nova-ai-message-content">

          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({
                inline,
                className,
                children,
                ...props
              }) {
                const match =
                  /language-(\w+)/.exec(
                    className || ""
                  );

                if (
                  !inline &&
                  match
                ) {
                  return (
                    <CodeBlock
                      language={match[1]}
                      code={String(
                        children
                      ).replace(
                        /\n$/,
                        ""
                      )}
                    />
                  );
                }

                return (
                  <code
                    className={className}
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
            }}
          >
            {content || ""}
          </ReactMarkdown>

        </div>

        {/* AI ACTIONS */}

        <div className="nova-message-actions">

          {/* COPY */}

          <button
            type="button"
            className="nova-message-action-btn"
            onClick={copyMessage}
            title="Copy response"
          >
            <FiCopy />

            <span>
              Copy
            </span>
          </button>

          {/* LIKE */}

          <button
            type="button"
            className={`nova-message-action-icon ${
              liked
                ? "active-like"
                : ""
            }`}
            onClick={handleLike}
            title="Good response"
          >
            <FiThumbsUp />
          </button>

          {/* DISLIKE */}

          <button
            type="button"
            className={`nova-message-action-icon ${
              disliked
                ? "active-dislike"
                : ""
            }`}
            onClick={handleDislike}
            title="Bad response"
          >
            <FiThumbsDown />
          </button>

          {/* TTS */}

          <button
            type="button"
            className={`nova-message-action-icon ${
              speaking
                ? "speaking-active"
                : ""
            }`}
            onClick={playTTS}
            disabled={speaking}
            title={
              speaking
                ? "Playing..."
                : "Listen"
            }
          >
            <FiVolume2 />
          </button>

          {/* REGENERATE */}

          <button
            type="button"
            className={`nova-message-action-icon ${
              regenerating
                ? "regenerating-active"
                : ""
            }`}
            onClick={handleRegenerate}
            disabled={
              regenerating ||
              !onRegenerate
            }
            title={
              regenerating
                ? "Regenerating..."
                : "Regenerate"
            }
          >
            <FiRefreshCw
              className={
                regenerating
                  ? "icon-spinning"
                  : ""
              }
            />
          </button>

        </div>

      </div>

    </div>
  );
}