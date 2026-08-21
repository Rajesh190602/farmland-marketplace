import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyChats() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // =====================================================
  // LOAD CONVERSATIONS
  // =====================================================

  useEffect(() => {
    loadConversations();
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

  // =====================================================
  // OPEN CHAT
  // =====================================================

  const openChat = (conversationId) => {
    navigate(`/chat/${conversationId}`);
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

        {/* Refresh */}
        <button
          onClick={loadConversations}
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
        {conversations.length === 0 ? (
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
            <h2>💬 No Conversations Yet</h2>

            <p>
              Start chatting with a farmer from any
              land listing.
            </p>
          </div>
        ) : (
          /* Conversations */
          conversations.map((chat) => (
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

              {/* Open chat button */}
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
                }}
              >
                💬 Open Chat & Reply
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default MyChats;