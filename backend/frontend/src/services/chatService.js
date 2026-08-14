import api from "../api/api";

// ===============================
// Create New Chat
// ===============================

export async function createChat(title = "New Chat") {
  const response = await api.post("/chat/new", {
    title,
  });

  return response.data;
}


// ===============================
// Get Chat List
// ===============================

export async function getChats() {
  const response = await api.get("/chat/list");

  return response.data;
}


// ===============================
// Get Chat History
// ===============================

export async function getChatHistory(chatId) {
  const response = await api.get(`/chat/history/${chatId}`);

  return response.data;
}


// ===============================
// Send Message
// ===============================

export async function sendMessage(chatId, message) {
  const response = await api.post("/chat/send", {
    chat_id: chatId,
    message,
  });

  return response.data;
}


// ===============================
// Rename Chat
// ===============================

export async function renameChat(chatId, title) {
  const response = await api.put(
    `/chat/rename/${chatId}`,
    {
      title,
    }
  );

  return response.data;
}


// ===============================
// Delete Chat
// ===============================

export async function deleteChat(chatId) {
  const response = await api.delete(
    `/chat/${chatId}`
  );

  return response.data;
}


// ===============================
// Clear Conversation
// ===============================

export async function clearConversation(chatId) {
  const response = await api.delete(
    `/chat/clear/${chatId}`
  );

  return response.data;
}


// ===============================
// Regenerate Response
// ===============================

export async function regenerateResponse(chatId) {
  const response = await api.post(
    "/chat/regenerate",
    {
      chat_id: chatId,
    }
  );

  return response.data;
}


// ===============================
// Continue Response
// ===============================

export async function continueResponse(chatId) {
  const response = await api.post(
    "/chat/continue",
    {
      chat_id: chatId,
    }
  );

  return response.data;
}


// ===============================
// Edit User Message
// ===============================

export async function editMessage(messageId, message) {
  const response = await api.put(
    `/chat/edit-message/${messageId}`,
    {
      message,
    }
  );

  return response.data;
}