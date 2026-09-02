import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyChats() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [archivedConversations, setArchivedConversations] =
    useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  const navigate = useNavigate();

  // =====================================================
  // LOAD CONVERSATIONS
  // =====================================================

  useEffect(() => {
    loadConversations();
    loadArchivedConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/chat/my-conversations"
      );

      setConversations(response.data || []);
    } catch (error) {
      console.error(
        "Failed to load conversations:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to load conversations."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedConversations = async () => {
    try {
      const response = await api.get(
        "/chat/my-archived-conversations"
      );

      setArchivedConversations(
        response.data || []
      );
    } catch (error) {
      console.error(
        "Failed to load archived conversations:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to load archived conversations."
      );
    }
  };

  // =====================================================
  // OPEN CHAT
  // =====================================================

  const openChat = (conversationId) => {
    navigate(`/chat/${conversationId}`);
  };

  // =====================================================
  // ARCHIVE CONVERSATION
  // =====================================================

  const archiveConversation = async (conversationId) => {
    if (
      !conversationId ||
      archiveLoading === conversationId
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Archive this conversation?\n\n" +
        "The conversation and messages will not be deleted. " +
        "It will simply be removed from your active chats."
    );

    if (!confirmed) {
      return;
    }

    try {
      setArchiveLoading(conversationId);

      await api.post(
        `/chat/archive/${conversationId}`
      );

      setConversations((previous) =>
        previous.filter(
          (conversation) =>
            conversation.conversation_id !==
            conversationId
        )
      );

      await loadArchivedConversations();
    } catch (error) {
      console.error(
        "Failed to archive conversation:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to archive conversation."
      );
    } finally {
      setArchiveLoading(null);
    }
  };

  // =====================================================
  // DELETE CONVERSATION FOR ME
  // =====================================================

  const deleteConversation = async (conversationId) => {
    if (!conversationId || deleteLoading === conversationId) return;

    const confirmed = window.confirm(
      "Delete this conversation for you?\n\n" +
        "It will be permanently removed from your chats. " +
        "The other participant will still have their copy and messages.\n\n" +
        "This action cannot be undone from your account."
    );

    if (!confirmed) return;

    try {
      setDeleteLoading(conversationId);
      await api.delete(`/chat/delete/${conversationId}`);
      setConversations((previous) =>
        previous.filter((conversation) => conversation.conversation_id !== conversationId)
      );
      setArchivedConversations((previous) =>
        previous.filter((conversation) => conversation.conversation_id !== conversationId)
      );
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      alert(error.response?.data?.detail || "Failed to delete conversation.");
    } finally {
      setDeleteLoading(null);
    }
  };

  // =====================================================
  // RESTORE CONVERSATION
  // =====================================================

  const restoreConversation = async (conversationId) => {
    if (
      !conversationId ||
      archiveLoading === conversationId
    ) {
      return;
    }

    try {
      setArchiveLoading(conversationId);

      await api.delete(
        `/chat/archive/${conversationId}`
      );

      setArchivedConversations((previous) =>
        previous.filter(
          (conversation) =>
            conversation.conversation_id !==
            conversationId
        )
      );

      await loadConversations();
    } catch (error) {
      console.error(
        "Failed to restore conversation:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to restore conversation."
      );
    } finally {
      setArchiveLoading(null);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div
          style={{
            textAlign: "center",
            marginTop: "80px",
            fontSize: "24px",
            color: "#2E7D32",
            fontWeight: "bold",
          }}
        >
          Loading Conversations...
        </div>
      </>
    );
  }

  const displayedConversations = showArchived
    ? archivedConversations
    : conversations;

  // =====================================================
  // UI
  // =====================================================

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "800px",
          margin: "30px auto",
          padding: "20px",
        }}
      >
        <h1
          style={{
            color: "#2E7D32",
            marginBottom: "20px",
          }}
        >
          💬 My Chats
        </h1>

        {/* Active / Archived */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => setShowArchived(false)}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              background: showArchived
                ? "#E3F2FD"
                : "#1976D2",
              color: showArchived
                ? "#1976D2"
                : "#fff",
            }}
          >
            💬 Active Chats
          </button>

          <button
            onClick={() => setShowArchived(true)}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              background: showArchived
                ? "#757575"
                : "#EEEEEE",
              color: showArchived
                ? "#fff"
                : "#555",
            }}
          >
            📦 Archived Chats
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={() => {
            loadConversations();
            loadArchivedConversations();
          }}
          style={{
            marginBottom: "25px",
            background: "#1976D2",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          🔄 Refresh
        </button>

        {/* No conversations */}
        {displayedConversations.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              marginTop: "60px",
              background: "#fff",
              padding: "40px",
              borderRadius: "12px",
              boxShadow:
                "0 3px 10px rgba(0,0,0,0.1)",
            }}
          >
            <h2>
              {showArchived
                ? "📦 No Archived Conversations"
                : "💬 No Conversations Yet"}
            </h2>

            <p>
              {showArchived
                ? "Archived conversations will appear here."
                : "Start chatting with a farmer from any land listing."}
            </p>
          </div>
        ) : (
          displayedConversations.map((chat) => (
            <div
              key={chat.conversation_id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "18px",
                background: "white",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.12)",
              }}
            >
              {/* User */}
              <h3
                style={{
                  marginTop: 0,
                  color: "#2E7D32",
                }}
              >
                👤 {chat.other_user}
              </h3>

              {/* Last message */}
              <p
                style={{
                  color: "#555",
                  marginTop: "10px",
                  marginBottom: "8px",
                  fontSize: "16px",
                }}
              >
                {chat.last_message ||
                  "No messages yet."}
              </p>

              {/* Land */}
              <p
                style={{
                  marginBottom: "8px",
                }}
              >
                <strong>🌾 Land:</strong>{" "}
                {chat.land_title}
              </p>

              {/* Date */}
              {chat.last_message_time && (
                <small
                  style={{
                    display: "block",
                    color: "#777",
                    marginBottom: "15px",
                  }}
                >
                  {new Date(
                    chat.last_message_time
                  ).toLocaleString()}
                </small>
              )}

              {/* Open chat */}
              <button
                onClick={() =>
                  openChat(chat.conversation_id)
                }
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#2E7D32",
                  color: "white",
                  border: "none",
                  borderRadius: "7px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                  marginBottom: "10px",
                }}
              >
                💬 Open Chat & Reply
              </button>

              {/* Archive / Restore */}
              {showArchived ? (
                <button
                  onClick={() =>
                    restoreConversation(
                      chat.conversation_id
                    )
                  }
                  disabled={
                    archiveLoading ===
                    chat.conversation_id
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#E8F5E9",
                    color: "#2E7D32",
                    border: "none",
                    borderRadius: "7px",
                    cursor:
                      archiveLoading ===
                      chat.conversation_id
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "15px",
                    fontWeight: "bold",
                  }}
                >
                  ↩️{" "}
                  {archiveLoading ===
                  chat.conversation_id
                    ? "Restoring..."
                    : "Restore Conversation"}
                </button>
              ) : (
                <button
                  onClick={() =>
                    archiveConversation(
                      chat.conversation_id
                    )
                  }
                  disabled={
                    archiveLoading ===
                    chat.conversation_id
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#EEEEEE",
                    color: "#555",
                    border: "none",
                    borderRadius: "7px",
                    cursor:
                      archiveLoading ===
                      chat.conversation_id
                        ? "not-allowed"
                        : "pointer",
                    fontSize: "15px",
                    fontWeight: "bold",
                  }}
                >
                  📦{" "}
                  {archiveLoading ===
                  chat.conversation_id
                    ? "Archiving..."
                    : "Archive Conversation"}
                </button>
              )}

              {/* Delete for me */}
              <button
                onClick={() => deleteConversation(chat.conversation_id)}
                disabled={deleteLoading === chat.conversation_id}
                style={{
                  width: "100%",
                  padding: "10px",
                  marginTop: "10px",
                  background: "#FFEBEE",
                  color: "#C62828",
                  border: "none",
                  borderRadius: "7px",
                  cursor: deleteLoading === chat.conversation_id ? "not-allowed" : "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                }}
              >
                🗑️ {deleteLoading === chat.conversation_id ? "Deleting..." : "Delete for Me"}
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default MyChats;
