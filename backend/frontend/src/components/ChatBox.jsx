import { useEffect, useRef, useState } from "react";

import {
  FiCopy,
  FiThumbsUp,
  FiThumbsDown,
  FiRefreshCw,
  FiVolume2,
  FiEdit2,
  FiX,
  FiCheck,
  FiSquare,
  FiPaperclip,
  FiImage,
  FiMic,
  FiHeadphones,
  FiSend,
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
// WELCOME VOICE — DUPLICATE FIXED
// =====================================================

// IMPORTANT:
// Ye global browser-level lock hai.
// React StrictMode / remount / voiceschanged
// ki wajah se welcome voice dobara nahi chalegi.

const NOVA_WELCOME_VOICE_PLAYED =
  "__nova_welcome_voice_played__";

const NOVA_WELCOME_UTTERANCE =
  "__nova_welcome_utterance__";


// =====================================================
// WELCOME
// =====================================================

const [showWelcome, setShowWelcome] =
  useState(true);


// =====================================================
// WELCOME SCREEN TIMER
// =====================================================

useEffect(() => {

  const timer = setTimeout(() => {

    setShowWelcome(false);

  }, 5000);

  return () => {

    clearTimeout(timer);

  };

}, []);


// =====================================================
// WELCOME VOICE
// =====================================================

useEffect(() => {

  if (!showWelcome) {
    return;
  }

  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  const speech =
    window.speechSynthesis;

  let cancelled = false;

  let voicesTimer = null;
  let fallbackTimer = null;
  let speakTimer = null;


  // ===================================================
  // GLOBAL DUPLICATE LOCK
  // ===================================================

  if (
    window[
      NOVA_WELCOME_VOICE_PLAYED
    ] === true
  ) {

    console.log(
      "Nova welcome voice already played."
    );

    return () => {};

  }


  // ===================================================
  // GET BEST VOICE
  // ===================================================

  const getBestVoice = () => {

    const voices =
      speech.getVoices();

    if (!voices.length) {
      return null;
    }

    const preferredNames = [
      "Samantha",
      "Karen",
      "Victoria",
      "Ava",
      "Jenny",
      "Aria",
      "Zira",
      "Susan",
      "Google US English",
      "Microsoft Jenny",
      "Microsoft Aria",
      "Microsoft Zira",
    ];


    // Preferred voices
    for (
      const preferredName of preferredNames
    ) {

      const match =
        voices.find((voice) =>
          voice.name
            ?.toLowerCase()
            .includes(
              preferredName.toLowerCase()
            )
        );

      if (match) {

        return match;

      }

    }


    // Female voice fallback
    const femaleVoice =
      voices.find((voice) =>
        /female|samantha|karen|victoria|ava|jenny|aria|zira|susan/i
          .test(
            voice.name || ""
          )
      );

    if (femaleVoice) {

      return femaleVoice;

    }


    // English voice fallback
    const englishVoice =
      voices.find((voice) =>
        /^en(-|_)/i.test(
          voice.lang || ""
        )
      );

    return (
      englishVoice ||
      voices[0]
    );

  };


  // ===================================================
  // SPEAK WELCOME
  // ===================================================

  const speakWelcome = () => {

    if (cancelled) {
      return;
    }


    // =================================================
    // CHECK GLOBAL LOCK
    // =================================================

    if (
      window[
        NOVA_WELCOME_VOICE_PLAYED
      ] === true
    ) {

      console.log(
        "Duplicate welcome voice blocked."
      );

      return;

    }


    // =================================================
    // DO NOT INTERRUPT OTHER SPEECH
    // =================================================

    if (
      speech.speaking ||
      speech.pending
    ) {

      console.log(
        "Speech engine busy. Welcome voice skipped."
      );

      return;

    }


    // =================================================
    // GET VOICES
    // =================================================

    const voices =
      speech.getVoices();

    if (!voices.length) {

      return;

    }


    // =================================================
    // LOCK BEFORE SPEAK()
    // =================================================

    window[
      NOVA_WELCOME_VOICE_PLAYED
    ] = true;


    // =================================================
    // CREATE UTTERANCE
    // =================================================

    const utterance =
      new SpeechSynthesisUtterance(
        "Welcome back. Nova AI is ready for you. Made by Syed Ali Ahsan."
      );


    // =================================================
    // VOICE SETTINGS
    // =================================================

    utterance.rate =
      1.0;

    utterance.pitch =
      1.05;

    utterance.volume =
      1.0;


    // =================================================
    // SELECT VOICE
    // =================================================

    const selectedVoice =
      getBestVoice();


    if (selectedVoice) {

      utterance.voice =
        selectedVoice;

      console.log(
        "Nova welcome voice:",
        selectedVoice.name,
        selectedVoice.lang
      );

    }


    // =================================================
    // SAVE CURRENT UTTERANCE
    // =================================================

    window[
      NOVA_WELCOME_UTTERANCE
    ] = utterance;


    // =================================================
    // ON START
    // =================================================

    utterance.onstart = () => {

      console.log(
        "Nova welcome voice STARTED"
      );

    };


    // =================================================
    // ON END
    // =================================================

    utterance.onend = () => {

      console.log(
        "Nova welcome voice COMPLETED"
      );


      if (
        window[
          NOVA_WELCOME_UTTERANCE
        ] === utterance
      ) {

        window[
          NOVA_WELCOME_UTTERANCE
        ] = null;

      }


      if (!cancelled) {

        setShowWelcome(false);

      }

    };


    // =================================================
    // ON ERROR
    // =================================================

    utterance.onerror = (event) => {

      console.log(
        "Nova welcome voice error:",
        event
      );


      if (
        window[
          NOVA_WELCOME_UTTERANCE
        ] === utterance
      ) {

        window[
          NOVA_WELCOME_UTTERANCE
        ] = null;

      }


      if (!cancelled) {

        setShowWelcome(false);

      }

    };


    // =================================================
    // START SPEECH
    // =================================================

    speakTimer =
      setTimeout(() => {

        if (cancelled) {
          return;
        }


        // Final duplicate protection
        if (
          window[
            NOVA_WELCOME_VOICE_PLAYED
          ] !== true
        ) {

          return;

        }


        try {

          speech.speak(
            utterance
          );

        } catch (error) {

          console.log(
            "Nova welcome speech start error:",
            error
          );


          if (
            window[
              NOVA_WELCOME_UTTERANCE
            ] === utterance
          ) {

            window[
              NOVA_WELCOME_UTTERANCE
            ] = null;

          }


          setShowWelcome(false);

        }

      }, 150);

  };


  // ===================================================
  // VOICES CHANGED
  // ===================================================

  const handleVoicesChanged = () => {

    if (cancelled) {
      return;
    }


    if (
      window[
        NOVA_WELCOME_VOICE_PLAYED
      ] === true
    ) {

      return;

    }


    if (voicesTimer) {

      clearTimeout(
        voicesTimer
      );

    }


    voicesTimer =
      setTimeout(() => {

        if (
          !cancelled &&
          window[
            NOVA_WELCOME_VOICE_PLAYED
          ] !== true
        ) {

          speakWelcome();

        }

      }, 150);

  };


  // ===================================================
  // ADD LISTENER
  // ===================================================

  speech.addEventListener(
    "voiceschanged",
    handleVoicesChanged
  );


  // ===================================================
  // FIRST ATTEMPT
  // ===================================================

  speakWelcome();


  // ===================================================
  // FALLBACK
  // ===================================================

  fallbackTimer =
    setTimeout(() => {

      if (
        !cancelled &&
        window[
          NOVA_WELCOME_VOICE_PLAYED
        ] !== true
      ) {

        speakWelcome();

      }

    }, 1000);


  // ===================================================
  // CLEANUP
  // ===================================================

  return () => {

    cancelled = true;


    if (voicesTimer) {

      clearTimeout(
        voicesTimer
      );

    }


    if (fallbackTimer) {

      clearTimeout(
        fallbackTimer
      );

    }


    if (speakTimer) {

      clearTimeout(
        speakTimer
      );

    }


    speech.removeEventListener(
      "voiceschanged",
      handleVoicesChanged
    );


    // IMPORTANT:
    // YAHAN speech.cancel() NAHI KARNA.
    //
    // React StrictMode mein cleanup ke waqt
    // speech.cancel() karne se duplicate/race
    // problems aa sakti hain.

  };

}, [showWelcome]);


  // =====================================================
  // CHAT HISTORY
  // =====================================================

  const [chatHistoryEnabled, setChatHistoryEnabled] =
    useState(() => {

      try {

        const saved =
          localStorage.getItem(
            "nova_chat_history_enabled"
          );

        return saved === null
          ? true
          : saved === "true";

      } catch {

        return true;

      }

    });


  useEffect(() => {

    const handleHistoryChange = (event) => {

      const enabled =
        event.detail?.enabled ?? true;

      setChatHistoryEnabled(
        enabled
      );

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

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [uploadedFileId, setUploadedFileId] =
    useState(null);

  const [uploadedFileType, setUploadedFileType] =
    useState(null);


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

  const [recording, setRecording] =
    useState(false);

  const [voiceMode, setVoiceMode] =
    useState(false);

  const [isListening, setIsListening] =
    useState(false);

  const [isThinking, setIsThinking] =
    useState(false);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const [showVoiceModal, setShowVoiceModal] =
    useState(false);

  const [voiceLevel, setVoiceLevel] =
    useState(0);

  const [voiceData, setVoiceData] =
    useState([]);


  // =====================================================
  // REFS
  // =====================================================

  const bottomRef =
    useRef(null);

  const fileInputRef =
    useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const chunksRef =
    useRef([]);

  const audioRef =
    useRef(null);

  const audioUrlRef =
    useRef(null);

  const silenceTimer =
    useRef(null);

  const messagesContainerRef =
    useRef(null);

  const analyserRef =
    useRef(null);

  const audioContextRef =
    useRef(null);

  const animationRef =
    useRef(null);

  const recordingRef =
    useRef(false);

  const speakingRef =
    useRef(false);

  const voiceModeRef =
    useRef(false);

  const sendingRef =
    useRef(false);

  const restartingVoiceRef =
    useRef(false);


  // =====================================================
  // KEEP REFS IN SYNC
  // =====================================================

  useEffect(() => {

    recordingRef.current =
      recording;

  }, [recording]);


  useEffect(() => {

    speakingRef.current =
      isSpeaking;

  }, [isSpeaking]);


  useEffect(() => {

    voiceModeRef.current =
      voiceMode;

  }, [voiceMode]);


  useEffect(() => {

    sendingRef.current =
      sending;

  }, [sending]);


  // =====================================================
  // SCROLL
  // =====================================================

  const scrollToBottom = (
    smooth = false
  ) => {

    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    try {

      container.scrollTo({
        top:
          container.scrollHeight,
        behavior:
          smooth
            ? "smooth"
            : "auto",
      });

    } catch {

      container.scrollTop =
        container.scrollHeight;

    }

  };


  useEffect(() => {

    if (!messages.length) {
      return;
    }

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

      clearSelectedFile();

      setImageGenerationMode(false);

      return;

    }

    loadMessages(chat.id);

  }, [chat]);


  // =====================================================
  // VOICE MODE
  // =====================================================

  useEffect(() => {

    voiceModeRef.current =
      voiceMode;

    if (!voiceMode) {
      return;
    }

    if (
      !recordingRef.current &&
      !speakingRef.current &&
      !isThinking
    ) {

      const timer =
        setTimeout(() => {

          if (
            voiceModeRef.current &&
            !recordingRef.current &&
            !speakingRef.current
          ) {

            startRecording();

          }

        }, 350);

      return () => {
        clearTimeout(timer);
      };

    }

  }, [
    voiceMode,
    isThinking,
  ]);


  // =====================================================
  // CLEANUP
  // =====================================================

  useEffect(() => {

    return () => {

      clearTimeout(
        silenceTimer.current
      );

      cancelAnimationFrame(
        animationRef.current
      );

      try {

        if (
          audioContextRef.current
        ) {

          audioContextRef.current
            .close()
            .catch(() => {});

        }

      } catch {}


      try {

        if (
          audioRef.current
        ) {

          audioRef.current.pause();

          audioRef.current.removeAttribute(
            "src"
          );

          audioRef.current.load();

        }

      } catch {}


      try {

        if (
          mediaRecorderRef.current?.stream
        ) {

          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((track) => {
              track.stop();
            });

        }

      } catch {}


      if (
        audioUrlRef.current
      ) {

        try {

          URL.revokeObjectURL(
            audioUrlRef.current
          );

        } catch {}

      }

    };

  }, []);


  // =====================================================
  // LOAD HISTORY
  // =====================================================

  async function loadMessages(chatId) {

    try {

      const res =
        await api.get(
          `/chat/history/${chatId}`
        );

      setMessages(
        res.data.messages || []
      );

      requestAnimationFrame(() => {
        scrollToBottom(false);
      });

    } catch (err) {

      console.log(
        "Load messages error:",
        err
      );

      toast.error(
        err.response?.data?.detail ||
        "Failed to load conversation"
      );

    }

  }


  // =====================================================
  // FILE UPLOAD
  // =====================================================

  async function uploadFile(file) {

    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      toast.error(
        "Only PDF, JPG, JPEG, PNG and WEBP files are supported."
      );

      return;

    }

    const maxSize =
      20 * 1024 * 1024;

    if (file.size > maxSize) {

      toast.error(
        "File must be smaller than 20MB"
      );

      return;

    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    try {

      setIsThinking(true);

      const res =
        await api.post(
          "/files/upload",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      setSelectedFile(file);

      setUploadedFileId(
        res.data.file_id
      );

      setUploadedFileType(
        res.data.file_category
      );

      if (
        res.data.file_category ===
        "image"
      ) {

        toast.success(
          "Image uploaded successfully"
        );

      } else {

        toast.success(
          "PDF uploaded successfully"
        );

      }

    } catch (err) {

      console.log(
        "File upload error:",
        err
      );

      toast.error(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "File upload failed"
      );

      clearSelectedFile();

    } finally {

      setIsThinking(false);

    }

  }


  // =====================================================
  // ASK IMAGE
  // =====================================================

  async function askUploadedImage(
    question
  ) {

    if (!uploadedFileId) {

      toast.error(
        "Please upload an image first."
      );

      return null;

    }

    const res =
      await api.post(
        "/files/ask-image",
        {
          file_id:
            uploadedFileId,
          question,
        }
      );

    return (
      res.data.answer || ""
    );

  }


  // =====================================================
  // GENERATE IMAGE
  // =====================================================

  async function generateAIImage(
    prompt
  ) {

    const cleanPrompt =
      prompt?.trim();

    if (!cleanPrompt) {

      toast.error(
        "Please enter an image prompt."
      );

      return;

    }

    if (!chat) {

      toast.error(
        "Please create a conversation first."
      );

      return;

    }

    if (
      generatingImage ||
      sending
    ) {
      return;
    }

    try {

      setGeneratingImage(true);
      setSending(true);
      setIsThinking(true);

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

      const res =
        await api.post(
          "/files/generate-image",
          {
            prompt:
              cleanPrompt,
          },
          {
            responseType:
              "blob",
          }
        );

      if (
        !res.data ||
        !res.data.size
      ) {

        throw new Error(
          "No image was returned by the server."
        );

      }

      const imageUrl =
        URL.createObjectURL(
          res.data
        );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          imageUrl,
          isGeneratedImage: true,
        },
      ]);

      toast.success(
        "Image generated successfully!"
      );

    } catch (err) {

      console.log(
        "Image generation error:",
        err
      );

      let message =
        "Image generation failed.";

      if (
        err.response?.data
          instanceof Blob
      ) {

        try {

          const errorText =
            await err.response.data.text();

          const parsed =
            JSON.parse(
              errorText
            );

          message =
            parsed.detail ||
            parsed.message ||
            message;

        } catch {}

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

    clearTimeout(
      silenceTimer.current
    );

    const timeout =
      voiceModeRef.current
        ? 4500
        : 6000;

    silenceTimer.current =
      setTimeout(() => {

        if (
          recordingRef.current
        ) {

          stopRecording();

        }

      }, timeout);

  }


  // =====================================================
  // MICROPHONE
  // =====================================================

  const handleMic = async () => {

    try {

      if (
        recordingRef.current
      ) {

        stopRecording();

      } else {

        await startRecording();

      }

    } catch (err) {

      console.log(
        "Microphone error:",
        err
      );

      toast.error(
        "Microphone access failed"
      );

    }

  };


  // =====================================================
  // START RECORDING
  // =====================================================

  async function startRecording() {

    if (
      recordingRef.current
    ) {
      return;
    }

    if (
      restartingVoiceRef.current
    ) {
      return;
    }

    if (speakingRef.current) {
      stopSpeaking();
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      toast.error(
        "Microphone is not supported on this device."
      );

      return;

    }

    try {

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          "inactive"
      ) {

        try {
          mediaRecorderRef.current.stop();
        } catch {}

      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation:
              true,
            noiseSuppression:
              true,
            autoGainControl:
              true,
          },
        });

      const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContextClass) {

        stream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        toast.error(
          "Audio is not supported on this device."
        );

        return;

      }

      audioContextRef.current =
        new AudioContextClass();

      if (
        audioContextRef.current.state ===
        "suspended"
      ) {

        try {

          await audioContextRef.current.resume();

        } catch {}

      }

      const source =
        audioContextRef.current
          .createMediaStreamSource(
            stream
          );

      analyserRef.current =
        audioContextRef.current
          .createAnalyser();

      analyserRef.current.fftSize =
        256;

      analyserRef.current.smoothingTimeConstant =
        0.75;

      source.connect(
        analyserRef.current
      );

      const dataArray =
        new Uint8Array(
          analyserRef.current
            .frequencyBinCount
        );

      function detectVoice() {

        if (
          !analyserRef.current ||
          !recordingRef.current
        ) {
          return;
        }

        analyserRef.current
          .getByteFrequencyData(
            dataArray
          );

        let sum = 0;

        for (
          let i = 0;
          i < dataArray.length;
          i++
        ) {

          sum += dataArray[i];

        }

        const average =
          dataArray.length
            ? sum /
              dataArray.length
            : 0;

        setVoiceLevel(
          average
        );

        setVoiceData(
          Array.from(
            dataArray
          ).slice(0, 32)
        );

        animationRef.current =
          requestAnimationFrame(
            detectVoice
          );

      }


      // =================================================
      // MEDIA RECORDER
      // =================================================

      let recorder;

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      let selectedMimeType =
        "";

      if (
        typeof MediaRecorder !==
          "undefined" &&
        MediaRecorder.isTypeSupported
      ) {

        selectedMimeType =
          mimeTypes.find(
            (type) =>
              MediaRecorder.isTypeSupported(
                type
              )
          ) || "";

      }

      try {

        recorder =
          selectedMimeType
            ? new MediaRecorder(
                stream,
                {
                  mimeType:
                    selectedMimeType,
                }
              )
            : new MediaRecorder(
                stream
              );

      } catch {

        recorder =
          new MediaRecorder(
            stream
          );

      }

      mediaRecorderRef.current =
        recorder;

      chunksRef.current = [];

      recorder.ondataavailable =
        (event) => {

          if (
            event.data &&
            event.data.size > 0
          ) {

            chunksRef.current.push(
              event.data
            );

          }

        };


      recorder.onstart = () => {

        recordingRef.current =
          true;

        setRecording(true);
        setIsListening(true);
        setIsThinking(false);

        detectVoice();

        resetSilenceTimer();

      };


      recorder.onstop =
        async () => {

          recordingRef.current =
            false;

          cancelAnimationFrame(
            animationRef.current
          );

          setVoiceLevel(0);
          setVoiceData([]);

          clearTimeout(
            silenceTimer.current
          );

          stream
            .getTracks()
            .forEach((track) => {
              track.stop();
            });

          if (
            audioContextRef.current
          ) {

            try {

              await audioContextRef.current.close();

            } catch {}

            audioContextRef.current =
              null;

          }

          setRecording(false);
          setIsListening(false);

          const recordedMimeType =
            recorder.mimeType ||
            selectedMimeType ||
            "audio/webm";

          const blob =
            new Blob(
              chunksRef.current,
              {
                type:
                  recordedMimeType,
              }
            );

          chunksRef.current = [];

          if (!blob.size) {

            setIsThinking(false);

            if (
              voiceModeRef.current
            ) {

              scheduleVoiceRestart();

            }

            return;

          }

          const formData =
            new FormData();

          let extension =
            "webm";

          if (
            recordedMimeType.includes(
              "mp4"
            )
          ) {

            extension = "mp4";

          } else if (
            recordedMimeType.includes(
              "ogg"
            )
          ) {

            extension = "ogg";

          }

          formData.append(
            "file",
            blob,
            `voice.${extension}`
          );

          try {

            setIsThinking(true);

            const res =
              await api.post(
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
              res.data?.text ||
              "";

            if (
              !convertedText.trim()
            ) {

              setIsThinking(false);

              if (
                voiceModeRef.current
              ) {

                scheduleVoiceRestart();

              }

              return;

            }

            setText(
              convertedText
            );

            if (
              !voiceModeRef.current
            ) {

              toast.success(
                "Voice converted!"
              );

            }

            if (
              voiceModeRef.current
            ) {

              await sendMessage(
                convertedText
              );

            } else {

              setIsThinking(false);

            }

          } catch (err) {

            console.log(
              "Speech error:",
              err
            );

            setIsThinking(false);

            toast.error(
              err.response?.data?.detail ||
              err.response?.data?.message ||
              "Speech recognition failed"
            );

            if (
              voiceModeRef.current
            ) {

              scheduleVoiceRestart();

            }

          }

        };


      recorder.onerror = (event) => {

        console.log(
          "MediaRecorder error:",
          event
        );

        recordingRef.current =
          false;

        setRecording(false);
        setIsListening(false);
        setIsThinking(false);

        clearTimeout(
          silenceTimer.current
        );

        toast.error(
          "Recording failed."
        );

        if (
          voiceModeRef.current
        ) {

          scheduleVoiceRestart();

        }

      };


      try {

        recorder.start(250);

      } catch {

        recorder.start();

      }

    } catch (err) {

      console.log(
        "Recording error:",
        err
      );

      recordingRef.current =
        false;

      setRecording(false);
      setIsListening(false);
      setIsThinking(false);

      toast.error(
        "Please allow microphone access"
      );

    }

  }


  // =====================================================
  // VOICE RESTART
  // =====================================================

  function scheduleVoiceRestart() {

    if (
      !voiceModeRef.current
    ) {
      return;
    }

    if (
      restartingVoiceRef.current
    ) {
      return;
    }

    restartingVoiceRef.current =
      true;

    setTimeout(() => {

      restartingVoiceRef.current =
        false;

      if (
        voiceModeRef.current &&
        !recordingRef.current &&
        !speakingRef.current &&
        !sendingRef.current
      ) {

        startRecording();

      }

    }, 500);

  }


  // =====================================================
  // STOP RECORDING
  // =====================================================

  function stopRecording() {

    clearTimeout(
      silenceTimer.current
    );

    recordingRef.current =
      false;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {

      try {

        mediaRecorderRef.current.stop();

      } catch {

        setRecording(false);
        setIsListening(false);

      }

    } else {

      setRecording(false);
      setIsListening(false);

    }

  }


  // =====================================================
  // TOGGLE RECORDING
  // =====================================================

  function toggleRecording() {

    if (
      recordingRef.current
    ) {

      stopRecording();

    } else {

      startRecording();

    }

  }


  // =====================================================
  // REGENERATE
  // =====================================================

  async function regenerateMessage() {

    if (
      !chat ||
      sending
    ) {
      return;
    }

    try {

      setSending(true);
      setIsThinking(true);

      await api.post(
        "/chat/regenerate",
        {
          chat_id:
            chat.id,
        }
      );

      await loadMessages(
        chat.id
      );

      toast.success(
        "Response regenerated"
      );

    } catch (err) {

      console.log(
        "Regenerate error:",
        err
      );

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

    if (
      !chat ||
      sending
    ) {
      return;
    }

    try {

      setSending(true);
      setIsThinking(true);

      const res =
        await api.post(
          "/chat/continue",
          {
            chat_id:
              chat.id,
          }
        );

      const answer =
        res.data?.assistant ||
        "";

      setMessages((prev) => {

        const updated =
          [...prev];

        for (
          let i =
            updated.length - 1;
          i >= 0;
          i--
        ) {

          if (
            updated[i].role ===
            "assistant"
          ) {

            updated[i] = {
              ...updated[i],
              content:
                answer,
            };

            break;

          }

        }

        return updated;

      });

      if (
        voiceModeRef.current &&
        answer
      ) {

        await speakAnswer(
          answer
        );

      }

    } catch (err) {

      console.log(
        "Continue error:",
        err
      );

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

    if (!chat) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to clear this conversation?"
      );

    if (!confirmed) {
      return;
    }

    try {

      await api.delete(
        `/chat/clear/${chat.id}`
      );

      setMessages([]);

      toast.success(
        "Conversation cleared"
      );

    } catch (err) {

      console.log(
        "Clear chat error:",
        err
      );

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
      !newText?.trim() ||
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
          chat_id:
            chat.id,
          message:
            newText.trim(),
        }
      );

      await loadMessages(
        chat.id
      );

      toast.success(
        "Message updated"
      );

    } catch (err) {

      console.log(
        "Edit error:",
        err
      );

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

  async function sendMessage(
    customText = null
  ) {

    const message =
      customText !== null
        ? customText
        : text;

    if (
      !message?.trim() ||
      !chat ||
      sendingRef.current
    ) {
      return;
    }

    const cleanMessage =
      message.trim();

    if (
      imageGenerationMode
    ) {

      await generateAIImage(
        cleanMessage
      );

      return;

    }

    setText("");

    setSending(true);

    sendingRef.current =
      true;

    setIsThinking(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content:
          cleanMessage,
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
        uploadedFileType ===
          "image"
      ) {

        const answer =
          await askUploadedImage(
            cleanMessage
          );

        setIsThinking(false);

        setMessages((prev) => {

          const updated =
            [...prev];

          updated[
            updated.length - 1
          ] = {
            role:
              "assistant",
            content:
              answer,
          };

          return updated;

        });

        clearSelectedFile();

        if (
          voiceModeRef.current &&
          answer
        ) {

          await speakAnswer(
            answer
          );

        }

        return;

      }


      // =================================================
      // PDF CHAT
      // =================================================

      if (
        uploadedFileId &&
        uploadedFileType ===
          "pdf"
      ) {

        const res =
          await api.post(
            "/files/chat-pdf",
            {
              file_id:
                uploadedFileId,
              question:
                cleanMessage,
            }
          );

        const answer =
          res.data?.answer ||
          "";

        setIsThinking(false);

        setMessages((prev) => {

          const updated =
            [...prev];

          updated[
            updated.length - 1
          ] = {
            role:
              "assistant",
            content:
              answer,
          };

          return updated;

        });

        clearSelectedFile();

        if (
          voiceModeRef.current &&
          answer
        ) {

          await speakAnswer(
            answer
          );

        }

        return;

      }


      // =================================================
      // NORMAL STREAMING CHAT
      // =================================================

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {

        throw new Error(
          "Authentication token not found."
        );

      }

      const response =
        await fetch(
          "https://nova-ai-five-orpin.vercel.app/api/chat/stream",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                chat_id:
                  chat.id,
                message:
                  cleanMessage,
              }),
          }
        );

      if (!response.ok) {

        let errorMessage =
          "Streaming failed";

        try {

          const errorData =
            await response.json();

          errorMessage =
            errorData?.detail ||
            errorData?.message ||
            errorMessage;

        } catch {}

        throw new Error(
          errorMessage
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

        const {
          done,
          value,
        } =
          await reader.read();

        if (done) {
          break;
        }

        const chunk =
          decoder.decode(
            value,
            {
              stream: true,
            }
          );

        if (!chunk) {
          continue;
        }

        setIsThinking(false);

        aiAnswer += chunk;

        setMessages((prev) => {

          const updated =
            [...prev];

          const lastIndex =
            updated.length - 1;

          if (
            lastIndex >= 0 &&
            updated[lastIndex]
              .role ===
              "assistant"
          ) {

            updated[
              lastIndex
            ] = {
              ...updated[
                lastIndex
              ],
              content:
                aiAnswer,
            };

          }

          return updated;

        });

        requestAnimationFrame(() => {
          scrollToBottom(false);
        });

      }

      // =================================================
      // REMAINING STREAM DATA
      // =================================================

      const remaining =
        decoder.decode();

      if (remaining) {

        aiAnswer +=
          remaining;

        setMessages((prev) => {

          const updated =
            [...prev];

          const lastIndex =
            updated.length - 1;

          if (
            lastIndex >= 0 &&
            updated[lastIndex]
              .role ===
              "assistant"
          ) {

            updated[
              lastIndex
            ] = {
              ...updated[
                lastIndex
              ],
              content:
                aiAnswer,
            };

          }

          return updated;

        });

      }

      setIsThinking(false);

      // =================================================
      // VOICE MODE TTS
      // =================================================

      if (
        voiceModeRef.current &&
        aiAnswer.trim()
      ) {

        await speakAnswer(
          aiAnswer
        );

      }

    } catch (err) {

      console.log(
        "Send message error:",
        err
      );

      setMessages((prev) => {

        const updated =
          [...prev];

        const lastIndex =
          updated.length - 1;

        if (
          lastIndex >= 0 &&
          updated[lastIndex]
            .role ===
            "assistant"
        ) {

          updated[
            lastIndex
          ] = {
            ...updated[
              lastIndex
            ],
            content:
              "Sorry, something went wrong. Please try again.",
          };

        }

        return updated;

      });

      toast.error(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Message failed"
      );

    } finally {

      setSending(false);

      sendingRef.current =
        false;

      setIsThinking(false);

      if (
        voiceModeRef.current &&
        !speakingRef.current &&
        !recordingRef.current
      ) {

        scheduleVoiceRestart();

      }

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

  async function speakAnswer(
    answer
  ) {

    if (
      !answer?.trim()
    ) {
      return;
    }

    stopSpeaking();

    try {

      speakingRef.current =
        true;

      setIsSpeaking(true);
      setIsThinking(false);

      const res =
        await api.post(
          "/files/tts",
          {
            text:
              answer,
          },
          {
            responseType:
              "blob",
          }
        );

      if (
        !res.data ||
        !res.data.size
      ) {

        throw new Error(
          "No audio returned."
        );

      }

      const audioURL =
        URL.createObjectURL(
          res.data
        );

      audioUrlRef.current =
        audioURL;

      const player =
        document.createElement(
          "audio"
        );

      player.preload =
        "auto";

      player.playsInline =
        true;

      player.setAttribute(
        "playsinline",
        ""
      );

      player.src =
        audioURL;

      audioRef.current =
        player;

      return new Promise(
        (resolve) => {

          let resolved =
            false;

          const finish =
            (restart = true) => {

              if (resolved) {
                return;
              }

              resolved = true;

              speakingRef.current =
                false;

              setIsSpeaking(false);

              try {
                player.pause();
              } catch {}

              try {

                player.removeAttribute(
                  "src"
                );

                player.load();

              } catch {}

              if (
                audioUrlRef.current ===
                audioURL
              ) {

                try {

                  URL.revokeObjectURL(
                    audioURL
                  );

                } catch {}

                audioUrlRef.current =
                  null;

              }

              if (
                audioRef.current ===
                player
              ) {

                audioRef.current =
                  null;

              }

              if (
                restart &&
                voiceModeRef.current
              ) {

                scheduleVoiceRestart();

              }

              resolve();

            };


          player.onended =
            () => {

              console.log(
                "Nova TTS finished"
              );

              finish(true);

            };


          player.onerror =
            (event) => {

              console.log(
                "Nova TTS playback error:",
                event
              );

              finish(true);

            };


          const startPlayback =
            async () => {

              try {

                player.playbackRate =
                  1.0;

                player.defaultPlaybackRate =
                  1.0;

                player.volume =
                  1.0;

                await player.play();

              } catch (playError) {

                console.log(
                  "TTS play error:",
                  playError
                );

                finish(true);

              }

            };


          if (
            player.readyState >= 2
          ) {

            startPlayback();

          } else {

            player.oncanplay =
              () => {

                startPlayback();

              };

          }

        }
      );

    } catch (err) {

      console.log(
        "TTS error:",
        err
      );

      speakingRef.current =
        false;

      setIsSpeaking(false);

      if (
        voiceModeRef.current
      ) {

        scheduleVoiceRestart();

      }

    }

  }


  // =====================================================
  // STOP SPEAKING
  // =====================================================

  function stopSpeaking() {

    speakingRef.current =
      false;

    if (
      audioRef.current
    ) {

      try {

        audioRef.current.pause();

        audioRef.current.currentTime =
          0;

        audioRef.current.removeAttribute(
          "src"
        );

        audioRef.current.load();

      } catch {}

      audioRef.current =
        null;

    }

    if (
      audioUrlRef.current
    ) {

      try {

        URL.revokeObjectURL(
          audioUrlRef.current
        );

      } catch {}

      audioUrlRef.current =
        null;

    }

    setIsSpeaking(false);

  }


  // =====================================================
  // INTERRUPT AI
  // =====================================================

  function interruptAI() {

    if (
      !speakingRef.current
    ) {
      return;
    }

    stopSpeaking();

    if (
      voiceModeRef.current
    ) {

      scheduleVoiceRestart();

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

      {/* =================================================
          WELCOME SCREEN
      ================================================= */}

      {showWelcome && (

        <div className="nova-welcome-screen">

          <div className="nova-welcome-content">

            <div className="nova-welcome-logo">

              <span>
                N
              </span>

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
                Nova AI is ready for you
                <br />
                Made by Syed ALi Ahsan
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


      {/* =================================================
          MESSAGES
      ================================================= */}

      <div
        className="messages-area"
        ref={
          messagesContainerRef
        }
      >

        {messages.length === 0 &&
          !sending && (

            <div className="chat-empty">

              <div className="welcome-content">

                <div className="welcome-logo">

                  <span>
                    N
                  </span>

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

                role={
                  msg.role
                }

                content={
                  msg.content
                }

                imageUrl={
                  msg.imageUrl
                }

                isGeneratedImage={
                  msg.isGeneratedImage
                }

                onRegenerate={
                  msg.role ===
                    "assistant" &&
                  !msg.imageUrl
                    ? regenerateMessage
                    : undefined
                }

                onEdit={
                  msg.role ===
                  "user"
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


        {/* =================================================
            THINKING
        ================================================= */}

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


      {/* =================================================
          FILE PREVIEW
      ================================================= */}

      {selectedFile && (

        <div className="upload-preview">

          <div className="upload-preview-icon">

            {uploadedFileType ===
            "image"

              ? <FiImage />

              : <FiPaperclip />

            }

          </div>

          <div className="upload-preview-info">

            <strong>
              {selectedFile.name}
            </strong>

            <span>

              {uploadedFileType ===
              "image"

                ? "Image ready for questions"

                : "PDF ready for questions"

              }

            </span>

          </div>

          <button
            type="button"
            className="remove-file"
            onClick={
              clearSelectedFile
            }
            title="Remove file"
          >

            <FiX />

          </button>

        </div>

      )}


      {/* =================================================
          IMAGE GENERATION MODE
      ================================================= */}

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
              Describe the image you want
              Nova AI to create.
            </span>

          </div>

          <button
            type="button"
            onClick={() => {

              setImageGenerationMode(
                false
              );

              setText("");

            }}
            title="Exit image generation"
          >

            <FiX />

          </button>

        </div>

      )}


      {/* =================================================
          COMPOSER
      ================================================= */}

      <div className="chat-composer-wrap">

        <div className="chat-input-area">

          {/* FILE INPUT */}

          <input
            ref={fileInputRef}
            type="file"
            className="file-input"
            accept="
              .pdf,
              .jpg,
              .jpeg,
              .png,
              .webp,
              application/pdf,
              image/jpeg,
              image/png,
              image/webp
            "
            onChange={(e) => {

              const file =
                e.target.files?.[0];

              if (file) {
                uploadFile(file);
              }

              e.target.value =
                "";

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
            disabled={
              sending ||
              imageGenerationMode
            }
          >

            <FiPaperclip />

          </button>


          {/* IMAGE GENERATION */}

          <button
            type="button"
            className={`
              composer-btn
              ${
                imageGenerationMode
                  ? "image-generation-active"
                  : ""
              }
            `}
            onClick={() => {

              if (
                imageGenerationMode
              ) {

                setImageGenerationMode(
                  false
                );

              } else {

                setImageGenerationMode(
                  true
                );

                clearSelectedFile();

                setText("");

              }

            }}
            title="Generate image"
            disabled={
              sending
            }
          >

            <FiImage />

          </button>


          {/* MIC */}

          <button
            type="button"
            className={`
              composer-btn
              ${
                recording
                  ? "mic-recording"
                  : ""
              }
            `}
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

            {recording
              ? <FiSquare />
              : <FiMic />
            }

          </button>


          {/* VOICE MODE */}

          <button
            type="button"
            className={`
              composer-btn
              ${
                voiceMode
                  ? "voice-mode-active"
                  : ""
              }
            `}
            onClick={() => {

              const next =
                !voiceMode;

              voiceModeRef.current =
                next;

              setVoiceMode(
                next
              );

              setShowVoiceModal(
                true
              );

              if (!next) {

                stopRecording();
                stopSpeaking();

              }

            }}
            title="Voice mode"
            disabled={
              imageGenerationMode
            }
          >

            <FiHeadphones />

          </button>


          {/* TEXT INPUT */}

          <textarea
            className="chat-input"
            value={text}
            placeholder={
              imageGenerationMode
                ? "Describe the image you want..."
                : recording
                ? "Listening..."
                : uploadedFileId
                ? uploadedFileType ===
                  "image"
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

              setText(
                e.target.value
              );

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
            className={`
              send-btn
              ${
                text.trim()
                  ? "send-ready"
                  : ""
              }
              ${
                imageGenerationMode
                  ? "image-send-btn"
                  : ""
              }
            `}
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

            {imageGenerationMode
              ? <FiImage />
              : <FiSend />
            }

          </button>

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="composer-footer">

          <span>
            Nova AI can make mistakes.
            Check important information.
          </span>

          <span className="composer-shortcut">

            <kbd>
              Enter
            </kbd>

            {" "}to send

            <span>
              •
            </span>

            <kbd>
              Shift
            </kbd>

            {" "}

            +

            <kbd>
              Enter
            </kbd>

            {" "}for new line

          </span>

        </div>

      </div>


      {/* =================================================
          VOICE MODAL
      ================================================= */}

      <VoiceModal
        open={
          showVoiceModal
        }

        onClose={() => {

          stopRecording();
          stopSpeaking();

          voiceModeRef.current =
            false;

          setVoiceMode(
            false
          );

          setShowVoiceModal(
            false
          );

        }}

        onMic={
          handleMic
        }

        isListening={
          isListening
        }

        isThinking={
          isThinking
        }

        isSpeaking={
          isSpeaking
        }

        voiceLevel={
          voiceLevel
        }

        voiceData={
          voiceData
        }
      />

    </div>

  );

}