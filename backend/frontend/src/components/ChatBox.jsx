import { useEffect, useRef, useState } from "react";

import {
  FiPlus,
  FiPaperclip,
  FiMic,
  FiSend,
  FiX,
  FiImage,
  FiFileText,
  FiHeadphones,
} from "react-icons/fi";

import api from "../api/api";

import toast from "react-hot-toast";

import Message from "./Message";

import TypingIndicator from "./TypingIndicator";

import VoiceModal from "./VoiceModal";

import "../styles/chat.css";

export default function ChatBox({ chat, loading }) {
  // =====================================================
  // CHAT STATE
  // =====================================================

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // =====================================================
  // WELCOME
  // =====================================================

  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // =====================================================
  // HISTORY
  // =====================================================

  const [chatHistoryEnabled, setChatHistoryEnabled] =
    useState(() => {
      const saved = localStorage.getItem(
        "nova_chat_history_enabled"
      );

      return saved === null ? true : saved === "true";
    });

  useEffect(() => {
    const handleHistoryChange = (event) => {
      const enabled = event.detail?.enabled ?? true;
      setChatHistoryEnabled(enabled);
    };

    window.addEventListener(
      "nova-chat-history-changed",
      handleHistoryChange
    );

    return () => {
      window.removeEventListener(
        "nova-chat-history-changed",
        handleHistoryChange
      );
    };
  }, []);

  // =====================================================
  // FILE STATE
  // =====================================================

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [uploadedFileType, setUploadedFileType] = useState(null);

  // =====================================================
  // IMAGE GENERATION
  // =====================================================

  const [imageGenerationMode, setImageGenerationMode] =
    useState(false);

  const [generatingImage, setGeneratingImage] =
    useState(false);

  // =====================================================
  // VOICE STATE
  // =====================================================

  const [recording, setRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceData, setVoiceData] = useState([]);

  // =====================================================
  // REFS
  // =====================================================

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const audioRef = useRef(null);

  const silenceTimer = useRef(null);

  const messagesContainerRef = useRef(null);

  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationRef = useRef(null);

  // =====================================================
  // SCROLL
  // =====================================================

  const scrollToBottom = (smooth = false) => {
    const container = messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    if (!messages.length) return;

    requestAnimationFrame(() => {
      scrollToBottom(false);
    });
  }, [messages]);

  // =====================================================
  // LOAD CHAT
  // =====================================================

  useEffect(() => {
    if (!chat) {
      setMessages([]);
      setSelectedFile(null);
      setUploadedFileId(null);
      setUploadedFileType(null);
      return;
    }

    loadMessages(chat.id);
  }, [chat]);

  // =====================================================
  // VOICE MODE
  // =====================================================

  useEffect(() => {
    if (!voiceMode) return;

    if (!recording && !isSpeaking && !isThinking) {
      startRecording();
    }
  }, [voiceMode]);

  // =====================================================
  // CLEANUP
  // =====================================================

  useEffect(() => {
    return () => {
      clearTimeout(silenceTimer.current);

      cancelAnimationFrame(animationRef.current);

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }

      // Revoke generated image URLs
      messages.forEach((message) => {
        if (message?.imageUrl) {
          URL.revokeObjectURL(message.imageUrl);
        }
      });
    };
  }, []);

  // =====================================================
  // LOAD HISTORY
  // =====================================================

  async function loadMessages(chatId) {
    try {
      const res = await api.get(`/chat/history/${chatId}`);

      setMessages(res.data.messages || []);

      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    } catch (err) {
      console.log("Load messages error:", err);
      toast.error("Failed to load conversation");
    }
  }

  // =====================================================
  // FILE UPLOAD
  // =====================================================

  async function uploadFile(file) {
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Only PDF, JPG, JPEG, PNG and WEBP files are supported."
      );
      return;
    }

    const maxSize = 20 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("File must be smaller than 20MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsThinking(true);

      const res = await api.post(
        "/files/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSelectedFile(file);
      setUploadedFileId(res.data.file_id);
      setUploadedFileType(res.data.file_category);

      if (res.data.file_category === "image") {
        toast.success("Image uploaded successfully");
      } else {
        toast.success("PDF uploaded successfully");
      }
    } catch (err) {
      console.log("File upload error:", err);

      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "File upload failed"
      );

      setSelectedFile(null);
      setUploadedFileId(null);
      setUploadedFileType(null);
    } finally {
      setIsThinking(false);
    }
  }

  // =====================================================
  // ASK IMAGE
  // =====================================================

  async function askUploadedImage(question) {
    if (!uploadedFileId) {
      toast.error("Please upload an image first.");
      return null;
    }

    const res = await api.post(
      "/files/ask-image",
      {
        file_id: uploadedFileId,
        question,
      }
    );

    return res.data.answer || "";
  }

  // =====================================================
  // GENERATE IMAGE
  // =====================================================

  async function generateAIImage(prompt) {
    const cleanPrompt = prompt?.trim();

    if (!cleanPrompt) {
      toast.error("Please enter an image prompt.");
      return;
    }

    if (!chat) {
      toast.error("Please create a conversation first.");
      return;
    }

    if (generatingImage || sending) return;

    try {
      setGeneratingImage(true);
      setSending(true);
      setIsThinking(true);

      // User prompt
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: cleanPrompt,
        },
      ]);

      setText("");

      requestAnimationFrame(() => {
        scrollToBottom(true);
      });

      const res = await api.post(
        "/files/generate-image",
        {
          prompt: cleanPrompt,
        },
        {
          responseType: "blob",
        }
      );

      if (!res.data || !res.data.size) {
        throw new Error("No image was returned by the server.");
      }

      const imageUrl = URL.createObjectURL(res.data);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          imageUrl,
          isGeneratedImage: true,
        },
      ]);

      toast.success("Image generated successfully!");
    } catch (err) {
      console.log("Image generation error:", err);

      let message = "Image generation failed.";

      if (err.response?.data instanceof Blob) {
        try {
          const errorText =
            await err.response.data.text();

          const parsed = JSON.parse(errorText);

          message =
            parsed.detail ||
            parsed.message ||
            message;
        } catch {
          // Keep default message
        }
      } else {
        message =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          message;
      }

      toast.error(message);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't generate that image. Please try again.",
        },
      ]);
    } finally {
      setGeneratingImage(false);
      setSending(false);
      setIsThinking(false);
    }
  }

  // =====================================================
  // SILENCE TIMER
  // =====================================================

  function resetSilenceTimer() {
    clearTimeout(silenceTimer.current);

    silenceTimer.current = setTimeout(() => {
      if (recording) {
        stopRecording();
      }
    }, 6000);
  }

  // =====================================================
  // MIC
  // =====================================================

  const handleMic = async () => {
    try {
      if (recording) {
        stopRecording();
      } else {
        await startRecording();
      }
    } catch (err) {
      console.log("Microphone error:", err);
      toast.error("Microphone access failed");
    }
  };

  // =====================================================
  // START RECORDING
  // =====================================================

  async function startRecording() {
    if (recording) return;

    if (isSpeaking) {
      stopSpeaking();
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      toast.error("Microphone is not supported");
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      audioContextRef.current =
        new AudioContext();

      const source =
        audioContextRef.current.createMediaStreamSource(
          stream
        );

      analyserRef.current =
        audioContextRef.current.createAnalyser();

      analyserRef.current.fftSize = 256;

      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(
        analyserRef.current.frequencyBinCount
      );

      function detectVoice() {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(
          dataArray
        );

        let sum = 0;

        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }

        const average =
          sum / dataArray.length;

        setVoiceLevel(average);

        setVoiceData(
          Array.from(dataArray).slice(0, 32)
        );

        animationRef.current =
          requestAnimationFrame(detectVoice);
      }

      detectVoice();

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }

        resetSilenceTimer();
      };

      recorder.onstart = () => {
        setRecording(true);
        setIsListening(true);

        resetSilenceTimer();
      };

      recorder.onstop = async () => {
        cancelAnimationFrame(animationRef.current);

        setVoiceLevel(0);
        setVoiceData([]);

        clearTimeout(silenceTimer.current);

        stream.getTracks().forEach((track) => {
          track.stop();
        });

        if (audioContextRef.current) {
          await audioContextRef.current
            .close()
            .catch(() => {});

          audioContextRef.current = null;
        }

        setRecording(false);
        setIsListening(false);

        const blob = new Blob(
          chunksRef.current,
          {
            type: "audio/webm",
          }
        );

        if (!blob.size) {
          setIsThinking(false);
          return;
        }

        const formData = new FormData();

        formData.append(
          "file",
          blob,
          "voice.webm"
        );

        try {
          setIsThinking(true);

          const res = await api.post(
            "/files/speech",
            formData,
            {
              headers: {
                "Content-Type":
                  "multipart/form-data",
              },
            }
          );

          const convertedText =
            res.data.text || "";

          if (!convertedText.trim()) {
            setIsThinking(false);

            if (voiceMode) {
              setTimeout(() => {
                startRecording();
              }, 200);
            }

            return;
          }

          setText(convertedText);

          toast.success("Voice converted!");

          if (voiceMode) {
            setTimeout(() => {
              sendMessage(convertedText);
            }, 150);
          } else {
            setIsThinking(false);
          }
        } catch (err) {
          console.log("Speech error:", err);

          setIsThinking(false);

          toast.error(
            err.response?.data?.detail ||
              "Speech recognition failed"
          );
        }
      };

      recorder.start();
    } catch (err) {
      console.log("Recording error:", err);

      setRecording(false);
      setIsListening(false);

      toast.error(
        "Please allow microphone access"
      );
    }
  }

  // =====================================================
  // STOP RECORDING
  // =====================================================

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }

  // =====================================================
  // TOGGLE RECORDING
  // =====================================================

  function toggleRecording() {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // =====================================================
  // REGENERATE
  // =====================================================

  async function regenerateMessage() {
    if (!chat || sending) return;

    try {
      setSending(true);
      setIsThinking(true);

      await api.post("/chat/regenerate", {
        chat_id: chat.id,
      });

      await loadMessages(chat.id);

      toast.success("Response regenerated");
    } catch (err) {
      console.log("Regenerate error:", err);

      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Regenerate failed"
      );
    } finally {
      setSending(false);
      setIsThinking(false);
    }
  }

  // =====================================================
  // CONTINUE
  // =====================================================

  async function continueResponse() {
    if (!chat || sending) return;

    try {
      setSending(true);
      setIsThinking(true);

      const res = await api.post(
        "/chat/continue",
        {
          chat_id: chat.id,
        }
      );

      const answer =
        res.data.assistant || "";

      setMessages((prev) => {
        const updated = [...prev];

        for (
          let i = updated.length - 1;
          i >= 0;
          i--
        ) {
          if (
            updated[i].role === "assistant"
          ) {
            updated[i] = {
              ...updated[i],
              content: answer,
            };

            break;
          }
        }

        return updated;
      });
    } catch (err) {
      console.log(err);

      toast.error(
        err.response?.data?.detail ||
          "Continue failed"
      );
    } finally {
      setSending(false);
      setIsThinking(false);
    }
  }

  // =====================================================
  // CLEAR CHAT
  // =====================================================

  async function clearConversation() {
    if (!chat) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear this conversation?"
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/chat/clear/${chat.id}`
      );

      setMessages([]);

      toast.success(
        "Conversation cleared"
      );
    } catch (err) {
      console.log(err);

      toast.error(
        err.response?.data?.detail ||
          "Failed to clear conversation"
      );
    }
  }

  // =====================================================
  // EDIT MESSAGE
  // =====================================================

  async function editMessage(
    messageId,
    newText
  ) {
    if (
      !newText.trim() ||
      sending ||
      !chat
    ) {
      return;
    }

    try {
      setSending(true);
      setIsThinking(true);

      await api.put(
        `/chat/edit-message/${messageId}`,
        {
          chat_id: chat.id,
          message: newText,
        }
      );

      await loadMessages(chat.id);

      toast.success("Message updated");
    } catch (err) {
      console.log(err);

      toast.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Edit failed"
      );
    } finally {
      setSending(false);
      setIsThinking(false);
    }
  }

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  async function sendMessage(customText = null) {
    const message =
      customText !== null
        ? customText
        : text;

    if (
      !message?.trim() ||
      !chat ||
      sending
    ) {
      return;
    }

    const cleanMessage = message.trim();

    // ===================================================
    // IMAGE GENERATION MODE
    // ===================================================

    if (imageGenerationMode) {
      await generateAIImage(cleanMessage);
      return;
    }

    setText("");
    setSending(true);
    setIsThinking(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: cleanMessage,
      },
      {
        role: "assistant",
        content: "",
      },
    ]);

    requestAnimationFrame(() => {
      scrollToBottom(true);
    });

    try {
      // =================================================
      // IMAGE CHAT
      // =================================================

      if (
        uploadedFileId &&
        uploadedFileType === "image"
      ) {
        const answer =
          await askUploadedImage(
            cleanMessage
          );

        setIsThinking(false);

        setMessages((prev) => {
          const updated = [...prev];

          updated[updated.length - 1] = {
            role: "assistant",
            content: answer,
          };

          return updated;
        });

        clearSelectedFile();

        if (voiceMode) {
          await speakAnswer(answer);
        }

        setSending(false);

        return;
      }

      // =================================================
      // PDF CHAT
      // =================================================

      if (
        uploadedFileId &&
        uploadedFileType === "pdf"
      ) {
        const res = await api.post(
          "/files/chat-pdf",
          {
            file_id: uploadedFileId,
            question: cleanMessage,
          }
        );

        const answer =
          res.data.answer || "";

        setIsThinking(false);

        setMessages((prev) => {
          const updated = [...prev];

          updated[
            updated.length - 1
          ] = {
            role: "assistant",
            content: answer,
          };

          return updated;
        });

        clearSelectedFile();

        if (voiceMode) {
          await speakAnswer(answer);
        }

        setSending(false);

        return;
      }

      // =================================================
      // NORMAL STREAMING CHAT
      // =================================================

      const token =
        localStorage.getItem("token");

      const response = await fetch(
        "https://nova-ai-five-orpin.vercel.app/api/chat/stream",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            chat_id: chat.id,
            message: cleanMessage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Streaming failed"
        );
      }

      if (!response.body) {
        throw new Error(
          "Streaming response unavailable"
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let aiAnswer = "";

      while (true) {
        const { done, value } =
          await reader.read();

        if (done) break;

        const chunk =
          decoder.decode(value, {
            stream: true,
          });

        if (!chunk) continue;

        setIsThinking(false);

        aiAnswer += chunk;

        setMessages((prev) => {
          const updated = [...prev];

          updated[
            updated.length - 1
          ] = {
            ...updated[
              updated.length - 1
            ],
            content: aiAnswer,
          };

          return updated;
        });

        requestAnimationFrame(() => {
          scrollToBottom(false);
        });
      }

      setIsThinking(false);

      if (voiceMode && aiAnswer) {
        await speakAnswer(aiAnswer);
      }
    } catch (err) {
      console.log(
        "Send message error:",
        err
      );

      setMessages((prev) => {
        const updated = [...prev];

        if (
          updated.length &&
          updated[
            updated.length - 1
          ].role === "assistant"
        ) {
          updated[
            updated.length - 1
          ] = {
            ...updated[
              updated.length - 1
            ],
            content:
              "Sorry, something went wrong. Please try again.",
          };
        }

        return updated;
      });

      toast.error(
        err.response?.data?.detail ||
          err.message ||
          "Message failed"
      );
    } finally {
      setSending(false);
      setIsThinking(false);
    }
  }

  // =====================================================
  // CLEAR SELECTED FILE
  // =====================================================

  function clearSelectedFile() {
    setSelectedFile(null);
    setUploadedFileId(null);
    setUploadedFileType(null);
  }

  // =====================================================
  // TEXT TO SPEECH
  // =====================================================

  async function speakAnswer(answer) {
    if (!answer) return;

    try {
      setIsSpeaking(true);

      const res = await api.post(
        "/files/tts",
        {
          text: answer,
        },
        {
          responseType: "blob",
        }
      );

      const audioURL =
        URL.createObjectURL(res.data);

      const player = new Audio(
        audioURL
      );

      audioRef.current = player;

      return new Promise((resolve) => {
        player.onended = () => {
          setIsSpeaking(false);

          URL.revokeObjectURL(
            audioURL
          );

          audioRef.current = null;

          if (voiceMode) {
            setTimeout(() => {
              startRecording();
            }, 250);
          }

          resolve();
        };

        player.onerror = () => {
          setIsSpeaking(false);

          URL.revokeObjectURL(
            audioURL
          );

          audioRef.current = null;

          resolve();
        };

        player.play().catch(() => {
          setIsSpeaking(false);

          URL.revokeObjectURL(
            audioURL
          );

          audioRef.current = null;

          resolve();
        });
      });
    } catch (err) {
      console.log(
        "TTS error:",
        err
      );

      setIsSpeaking(false);
    }
  }

  // =====================================================
  // STOP SPEAKING
  // =====================================================

  function stopSpeaking() {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.src = "";

    audioRef.current = null;

    setIsSpeaking(false);
  }

  // =====================================================
  // INTERRUPT AI
  // =====================================================

  function interruptAI() {
    if (!isSpeaking) return;

    stopSpeaking();

    if (voiceMode) {
      setTimeout(() => {
        startRecording();
      }, 150);
    }
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-loading-screen">
          <div className="loading-orb">
            N
          </div>

          <div className="loading-text">
            <span>
              Preparing your workspace
            </span>

            <div className="loading-dots">
              <i></i>
              <i></i>
              <i></i>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // NO CHAT
  // =====================================================

  if (!chat) {
    return (
      <div className="chat-container">
        <div className="chat-no-chat">
          <div className="no-chat-icon">
            N
          </div>

          <h2>
            Welcome to Nova AI
          </h2>

          <p>
            Create a new conversation
            to start exploring.
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN JSX
  // =====================================================

  return (
    <div className="chat-container">

      {/* WELCOME */}

      {showWelcome && (
        <div className="nova-welcome-screen">
          <div className="nova-welcome-content">

            <div className="nova-welcome-logo">
              <span>N</span>

              <div className="nova-welcome-ring"></div>

              <div className="nova-welcome-glow"></div>
            </div>

            <div className="nova-welcome-text">

              <span className="nova-welcome-small">
                Welcome back
              </span>

              <h1>
                Hello 👋
              </h1>

              <p>
                Nova AI is ready for you Made by Syed ALi Ahsan
              </p>

            </div>

            <div className="nova-welcome-loader">
              <span></span>
              <span></span>
              <span></span>
            </div>

          </div>
        </div>
      )}

      {/* MESSAGES */}

      <div
        className="messages-area"
        ref={messagesContainerRef}
      >

        {messages.length === 0 &&
          !sending && (

            <div className="chat-empty">

              <div className="welcome-content">

                <div className="welcome-logo">
                  <span>N</span>
                  <div className="logo-ring"></div>
                </div>

                <div className="welcome-badge">
                  <span className="welcome-dot"></span>
                  Nova AI is ready
                </div>

                <h2>
                  How can I help you today?
                </h2>

                <p>
                  Ask questions, explore
                  ideas, upload a PDF,
                  analyze an image,
                  generate an image,
                  or talk with Nova.
                </p>

                <div className="welcome-suggestions">

                  <button
                    type="button"
                    onClick={() =>
                      setText(
                        "Explain something interesting to me"
                      )
                    }
                  >
                    Explain something
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setText(
                        "Help me write something"
                      )
                    }
                  >
                    Help me write
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setText(
                        "Help me solve a problem"
                      )
                    }
                  >
                    Solve a problem
                  </button>

                </div>

              </div>

            </div>
          )}

        <div className="message-list">

          {messages.map(
            (msg, index) => (

              <Message
                key={
                  msg.id ||
                  `${msg.role}-${index}`
                }

                role={msg.role}

                content={msg.content}

                imageUrl={msg.imageUrl}

                isGeneratedImage={
                  msg.isGeneratedImage
                }

                onRegenerate={
                  msg.role === "assistant" &&
                  !msg.imageUrl
                    ? regenerateMessage
                    : undefined
                }

                onEdit={
                  msg.role === "user"
                    ? (newText) =>
                        editMessage(
                          msg.id,
                          newText
                        )
                    : undefined
                }
              />

            )
          )}

        </div>

        {/* THINKING */}

        {isThinking && (
          <div className="nova-thinking">

            <div className="thinking-avatar">
              N
            </div>

            <div className="thinking-content">

              <span className="thinking-name">
                Nova AI
              </span>

              <div className="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>

            </div>

          </div>
        )}

        {sending &&
          !isSpeaking &&
          !isListening &&
          !isThinking && (
            <TypingIndicator />
          )}

        <div ref={bottomRef} />

      </div>

      {/* FILE PREVIEW */}

      {selectedFile && (
        <div className="upload-preview">

          <div className="upload-preview-icon">
            {uploadedFileType === "image" ? (
              <FiImage />
            ) : (
              <FiPaperclip />
            )}
          </div>

          <div className="upload-preview-info">

            <strong>
              {selectedFile.name}
            </strong>

            <span>
              {uploadedFileType === "image"
                ? "Image ready for questions"
                : "PDF ready for questions"}
            </span>

          </div>

          <button
            type="button"
            className="remove-file"
            onClick={clearSelectedFile}
            title="Remove file"
          >
            <FiX />
          </button>

        </div>
      )}

      {/* IMAGE GENERATION MODE */}

      {imageGenerationMode && (
        <div className="nova-image-generation-bar">

          <div className="nova-image-generation-icon">
            <FiImage />
          </div>

          <div>
            <strong>
              Image Generation
            </strong>

            <span>
              Describe the image you want Nova AI to create.
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setImageGenerationMode(false);
              setText("");
            }}
            title="Exit image generation"
          >
            <FiX />
          </button>

        </div>
      )}

      {/* COMPOSER */}

      <div className="chat-composer-wrap">

        <div className="chat-input-area">

          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {

              const file =
                e.target.files?.[0];

              if (file) {
                uploadFile(file);
              }

              e.target.value = "";

            }}
          />

          {/* ATTACH */}

          <button
            type="button"
            className="composer-btn"
            onClick={() =>
              fileInputRef.current?.click()
            }
            title="Attach PDF or image"
            disabled={sending}
          >
            <FiPaperclip />
          </button>

          {/* IMAGE GENERATION */}

          <button
            type="button"
            className={`composer-btn ${
              imageGenerationMode
                ? "image-generation-active"
                : ""
            }`}
            onClick={() => {

              if (imageGenerationMode) {
                setImageGenerationMode(false);
              } else {
                setImageGenerationMode(true);
                setSelectedFile(null);
                setUploadedFileId(null);
                setUploadedFileType(null);
                setText("");
              }

            }}
            title="Generate image"
            disabled={sending}
          >
            <FiImage />
          </button>

          {/* MIC */}

          <button
            type="button"
            className={`composer-btn ${
              recording
                ? "mic-recording"
                : ""
            }`}
            onClick={() => {

              if (isSpeaking) {
                interruptAI();
              } else {
                toggleRecording();
              }

            }}
            title={
              recording
                ? "Stop recording"
                : "Voice input"
            }
            disabled={
              imageGenerationMode ||
              generatingImage
            }
          >

            {recording ? (
              <FiSquare />
            ) : (
              <FiMic />
            )}

          </button>

          {/* VOICE MODE */}

          <button
            type="button"
            className={`composer-btn ${
              voiceMode
                ? "voice-mode-active"
                : ""
            }`}
            onClick={() => {

              const next =
                !voiceMode;

              setVoiceMode(next);
              setShowVoiceModal(true);

            }}
            title="Voice mode"
            disabled={imageGenerationMode}
          >
            <FiHeadphones />
          </button>

          {/* INPUT */}

          <textarea
            className="chat-input"
            value={text}
            placeholder={
              imageGenerationMode
                ? "Describe the image you want..."
                : recording
                ? "Listening..."
                : uploadedFileId
                ? uploadedFileType === "image"
                  ? "Ask anything about this image..."
                  : "Ask anything about this PDF..."
                : "Message Nova AI..."
            }
            rows={1}
            disabled={
              recording ||
              generatingImage
            }
            onChange={(e) => {

              setText(e.target.value);

              e.target.style.height =
                "auto";

              e.target.style.height =
                Math.min(
                  e.target.scrollHeight,
                  160
                ) + "px";

            }}
            onKeyDown={(e) => {

              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {

                e.preventDefault();

                sendMessage();

              }

            }}
          />

          {/* SEND */}

          <button
            type="button"
            className={`send-btn ${
              text.trim()
                ? "send-ready"
                : ""
            } ${
              imageGenerationMode
                ? "image-send-btn"
                : ""
            }`}
            onClick={() =>
              sendMessage()
            }
            disabled={
              sending ||
              !text.trim() ||
              recording
            }
            title={
              imageGenerationMode
                ? "Generate image"
                : "Send message"
            }
          >
            {imageGenerationMode ? (
              <FiImage />
            ) : (
              <FiSend />
            )}
          </button>

        </div>

        {/* FOOTER */}

        <div className="composer-footer">

          <span>
            Nova AI can make mistakes.
            Check important information.
          </span>

          <span className="composer-shortcut">

            <kbd>Enter</kbd>
            {" "}to send

            <span>•</span>

            <kbd>Shift</kbd>
            {" "}+
            <kbd>Enter</kbd>
            {" "}for new line

          </span>

        </div>

      </div>

      {/* VOICE MODAL */}

      <VoiceModal
        open={showVoiceModal}
        onClose={() => {

          stopRecording();
          stopSpeaking();

          setVoiceMode(false);
          setShowVoiceModal(false);

        }}
        onMic={handleMic}
        isListening={isListening}
        isThinking={isThinking}
        isSpeaking={isSpeaking}
        voiceLevel={voiceLevel}
        voiceData={voiceData}
      />

    </div>
  );
}