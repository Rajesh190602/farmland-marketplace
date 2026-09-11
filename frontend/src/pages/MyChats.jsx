import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";
import VerifiedBadge from "../components/VerifiedBadge";

function MyChats() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [archivedConversations, setArchivedConversations] =
    useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);

  // =====================================================
  // STEP 64 - ADVANCED CHAT LIST
  // =====================================================

  const [searchText, setSearchText] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

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

  const normalizeSearchValue = (value) =>
    String(value ?? "").trim().toLowerCase();

  const displayedConversations = showArchived
    ? archivedConversations
    : conversations;

  const activeUnreadCount = conversations.reduce(
    (total, chat) =>
      total + Number(chat.unread_count || 0),
    0
  );

  const filteredConversations = displayedConversations.filter((chat) => {
    const query = normalizeSearchValue(searchText);

    const matchesSearch =
      !query ||
      normalizeSearchValue(chat.other_user).includes(query) ||
      normalizeSearchValue(chat.land_title).includes(query) ||
      normalizeSearchValue(chat.last_message).includes(query);

    const matchesUnread =
      !showUnreadOnly || Number(chat.unread_count || 0) > 0;

    return matchesSearch && matchesUnread;
  });

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
            💬 Active Chats ({conversations.length})
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
            📦 Archived Chats ({archivedConversations.length})
          </button>
        </div>

        {/* STEP 64 - SEARCH / UNREAD FILTER / SUMMARY */}
        <div
          style={{
            background: "#F5F7F8",
            border: "1px solid #E0E0E0",
            borderRadius: "12px",
            padding: "14px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search chats, users, land or messages..."
              style={{
                flex: "1 1 280px",
                minWidth: "220px",
                padding: "11px 13px",
                border: "1px solid #CCC",
                borderRadius: "8px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={() => setShowUnreadOnly((previous) => !previous)}
              style={{
                padding: "10px 15px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                background: showUnreadOnly ? "#C62828" : "#E3F2FD",
                color: showUnreadOnly ? "#fff" : "#1565C0",
                whiteSpace: "nowrap",
              }}
            >
              {showUnreadOnly ? "✓ Unread Only" : "🔵 Unread Only"}
            </button>

            <button
              type="button"
              onClick={() => {
                loadConversations();
                loadArchivedConversations();
              }}
              style={{
                padding: "10px 15px",
                background: "#1976D2",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}
            >
              🔄 Refresh
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "12px",
              fontSize: "13px",
            }}
          >
            <span
              style={{
                background: "#E8F5E9",
                color: "#2E7D32",
                padding: "6px 10px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              💬 {conversations.length} Active
            </span>

            <span
              style={{
                background: activeUnreadCount > 0 ? "#FFEBEE" : "#F5F5F5",
                color: activeUnreadCount > 0 ? "#C62828" : "#666",
                padding: "6px 10px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              🔵 {activeUnreadCount} Unread
            </span>

            <span
              style={{
                background: "#EEEEEE",
                color: "#555",
                padding: "6px 10px",
                borderRadius: "20px",
                fontWeight: "bold",
              }}
            >
              📦 {archivedConversations.length} Archived
            </span>
          </div>
        </div>

        {/* No conversations */}
        {filteredConversations.length === 0 ? (
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
              {showUnreadOnly
                ? "🔵 No Unread Conversations"
                : searchText.trim()
                  ? "🔎 No Matching Conversations"
                  : showArchived
                    ? "📦 No Archived Conversations"
                    : "💬 No Conversations Yet"}
            </h2>

            <p>
              {showUnreadOnly
                ? "All displayed conversations are currently read."
                : searchText.trim()
                  ? "Try a different user name, land title or message."
                  : showArchived
                    ? "Archived conversations will appear here."
                    : "Start chatting with a farmer from any land listing."}
            </p>
          </div>
        ) : (
          filteredConversations.map((chat) => (
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    marginBottom: 0,
                    color: "#2E7D32",
                  }}
                >
                  👤 {chat.other_user}
                </h3>

                {chat.is_verified_farmer === true && (
                  <VerifiedBadge type="farmer" verified compact />
                )}
                {chat.is_verified_buyer === true && (
                  <VerifiedBadge type="buyer" verified compact />
                )}
                {chat.is_land_verified === true && (
                  <VerifiedBadge type="land" verified compact />
                )}
              </div>

              {!chat.is_land_verified && (
                <div
                  style={{
                    marginTop: "7px",
                    display: "inline-block",
                    fontSize: "11px",
                    color: "#8A4B00",
                    background: "#FFF3E0",
                    border: "1px solid #FFE0B2",
                    borderRadius: "7px",
                    padding: "5px 8px",
                  }}
                >
                  ⚠ Ownership verification {
                    String(chat.ownership_verification_status || "not_submitted").toLowerCase() === "pending"
                      ? "pending"
                      : "not approved"
                  }
                </div>
              )}

              {/* Last message + unread count */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  marginTop: "10px",
                  marginBottom: "8px",
                }}
              >
                <p
                  style={{
                    color: Number(chat.unread_count || 0) > 0
                      ? "#222"
                      : "#555",
                    margin: 0,
                    fontSize: "16px",
                    lineHeight: "1.45",
                    flex: 1,
                    fontWeight:
                      Number(chat.unread_count || 0) > 0
                        ? "600"
                        : "400",
                  }}
                >
                  {chat.last_message || "No messages yet."}
                </p>

                {Number(chat.unread_count || 0) > 0 && (
                  <span
                    title={`${Number(chat.unread_count)} unread message${Number(chat.unread_count) === 1 ? "" : "s"}`}
                    style={{
                      minWidth: "26px",
                      height: "26px",
                      padding: "0 7px",
                      borderRadius: "50%",
                      background: "#25D366",
                      color: "#fff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      boxSizing: "border-box",
                    }}
                  >
                    {Number(chat.unread_count) > 99
                      ? "99+"
                      : Number(chat.unread_count)}
                  </span>
                )}
              </div>

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

              {Number(chat.unread_count || 0) > 0 && (
                <div
                  style={{
                    marginBottom: "10px",
                    color: "#C62828",
                    fontSize: "12px",
                    fontWeight: "600",
                  }}
                >
                  🔵 {Number(chat.unread_count)} unread message
                  {Number(chat.unread_count) === 1 ? "" : "s"}
                </div>
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
