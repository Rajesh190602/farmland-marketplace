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
  const myUserId = Number(sessionStorage.getItem("user_id"));
  const loadMessages = async () => {
    try {
      const res = await api.get(`/chat/messages/${conversationId}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      setSending(true);

      await api.post("/chat/send", {
        conversation_id: Number(conversationId),
        message: text,
      });

      setText("");

      await loadMessages();
    } catch (err) {
      console.error(err);
      alert("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

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
        <h1 style={{ color: "#2E7D32" }}>
          💬 Chat
        </h1>

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
         {messages.map((msg) => {
  const isMine = msg.sender_id === myUserId;

  return (
    <div
      key={msg.id}
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        marginBottom: "15px",
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          background: isMine ? "#DCF8C6" : "#F1F1F1",
          padding: "12px",
          borderRadius: "15px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <strong>
          {isMine ? "You" : `User ${msg.sender_id}`}
        </strong>

        <p style={{ margin: "8px 0" }}>
          {msg.message}
        </p>

        <small style={{ color: "#666" }}>
          {new Date(msg.created_at).toLocaleString()}
          {" • "}
          {msg.is_read ? "✓✓ Read" : "✓ Sent"}
        </small>
      </div>
    </div>
  );
})} 

          <div ref={messagesEndRef}></div>
        </div>

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
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />

          <button
            onClick={sendMessage}
            disabled={sending}
            style={{
              background: "#2E7D32",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 25px",
              cursor: sending ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </>
  );
}