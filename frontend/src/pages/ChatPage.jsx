import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

export default function ChatPage() {
  const { conversationId } = useParams();

  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [otherUserId, setOtherUserId] = useState(null);
  const [otherUserName, setOtherUserName] =
    useState("User");
  const [isOnline, setIsOnline] = useState(false);

  const myUserId = Number(
    sessionStorage.getItem("user_id")
  );

  // =====================================================
  // LOAD CONVERSATION DETAILS
  // =====================================================

  const loadConversationDetails = async () => {
    try {
      const response = await api.get(
        `/chat/conversation/${conversationId}`
      );

      setOtherUserId(
        response.data.other_user_id
      );

      setOtherUserName(
        response.data.other_user_name ||
          "User"
      );
    } catch (error) {
      console.error(
        "Failed to load conversation details:",
        error
      );
    }
  };

  // =====================================================
  // LOAD MESSAGES
  // =====================================================

  const loadMessages = async () => {
    try {
      const response = await api.get(
        `/chat/messages/${conversationId}`
      );

      setMessages(response.data || []);
    } catch (error) {
      console.error(
        "Failed to load messages:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UPDATE MY PRESENCE
  // =====================================================

  const updateMyPresence = async () => {
    try {
      await api.post("/chat/presence");
    } catch (error) {
      console.error(
        "Failed to update presence:",
        error
      );
    }
  };

  // =====================================================
  // CHECK OTHER USER PRESENCE
  // =====================================================

  const checkOtherUserPresence = async () => {
    if (!otherUserId) {
      return;
    }

    try {
      const response = await api.get(
        `/chat/presence/${otherUserId}`
      );

      setIsOnline(
        response.data.online === true
      );
    } catch (error) {
      console.error(
        "Failed to check online status:",
        error
      );

      setIsOnline(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadConversationDetails();
    loadMessages();
    updateMyPresence();

    const messageInterval = setInterval(() => {
      loadMessages();
    }, 3000);

    const presenceInterval = setInterval(() => {
      updateMyPresence();
    }, 20000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(presenceInterval);
    };
  }, [conversationId]);

  // =====================================================
  // CHECK OTHER USER STATUS
  // =====================================================

  useEffect(() => {
    if (!otherUserId) {
      return;
    }

    checkOtherUserPresence();

    const statusInterval = setInterval(() => {
      checkOtherUserPresence();
    }, 5000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [otherUserId]);

  // =====================================================
  // SCROLL TO BOTTOM
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = async () => {
    if (!text.trim()) {
      return;
    }

    try {
      setSending(true);

      await api.post("/chat/send", {
        conversation_id: Number(
          conversationId
        ),
        message: text.trim(),
      });

      setText("");

      await updateMyPresence();
      await loadMessages();
    } catch (error) {
      console.error(
        "Failed to send message:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to send message."
      );
    } finally {
      setSending(false);
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
          Loading Chat...
        </div>
      </>
    );
  }

  // =====================================================
  // CHAT PAGE
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

        {/* =================================================
            CHAT HEADER
        ================================================= */}

        <div
          style={{
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "15px 20px",
            marginBottom: "15px",
            boxShadow:
              "0 2px 6px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              color: "#2E7D32",
              margin: 0,
              fontSize: "24px",
            }}
          >
            💬 {otherUserName}
          </h1>

          <div
            style={{
              marginTop: "7px",
              fontSize: "15px",
              fontWeight: "bold",
              color: isOnline
                ? "#2E7D32"
                : "#757575",
            }}
          >
            {isOnline ? (
              <>
                🟢 Online
              </>
            ) : (
              <>
                ⚫ Offline
              </>
            )}
          </div>
        </div>

        {/* =================================================
            MESSAGES
        ================================================= */}

        <div
          style={{
            height: "450px",
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "15px",
            background: "#F8F9FA",
            marginBottom: "20px",
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                marginTop: "180px",
                color: "#777",
              }}
            >
              No messages yet.
              <br />
              Start the conversation.
            </div>
          ) : (
            messages.map((msg) => {
              const isMine =
                Number(msg.sender_id) ===
                myUserId;

              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: isMine
                      ? "flex-end"
                      : "flex-start",
                    marginBottom: "15px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      background: isMine
                        ? "#DCF8C6"
                        : "#F1F1F1",
                      padding: "12px",
                      borderRadius: "15px",
                      boxShadow:
                        "0 2px 6px rgba(0,0,0,0.1)",
                    }}
                  >
                    <strong>
                      {isMine
                        ? "You"
                        : otherUserName}
                    </strong>

                    <p
                      style={{
                        margin: "8px 0",
                      }}
                    >
                      {msg.message}
                    </p>

                    <small
                      style={{
                        color: "#666",
                      }}
                    >
                      {new Date(
                        msg.created_at
                      ).toLocaleString()}

                      {" • "}

                      {msg.is_read
                        ? "✓✓ Read"
                        : "✓ Sent"}
                    </small>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* =================================================
            MESSAGE INPUT
        ================================================= */}

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !sending
              ) {
                sendMessage();
              }
            }}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "15px",
            }}
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={
              sending || !text.trim()
            }
            style={{
              background: "#2E7D32",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 25px",
              cursor:
                sending || !text.trim()
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "bold",
              opacity:
                sending || !text.trim()
                  ? 0.6
                  : 1,
            }}
          >
            {sending
              ? "Sending..."
              : "Send"}
          </button>
        </div>

      </div>
    </>
  );
}