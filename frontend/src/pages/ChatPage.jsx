import { useEffect, useRef,useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function ChatPage() {
  const { conversationId } = useParams();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const loadMessages = async () => {
  try {
    setLoading(true);

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
  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages]);

    const interval = setInterval(loadMessages, 3000);

    return () => clearInterval(interval);
  }, [conversationId]);
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
    <div
      style={{
        textAlign: "center",
        marginTop: "100px",
        fontSize: "24px",
        color: "#2E7D32",
        fontWeight: "bold",
      }}
    >
      Loading Chat...
    </div>
  );
}

  

  return (
    <div style={{ maxWidth: "700px", margin: "20px auto" }}>
      <h2>Chat</h2>

      <div
        style={{
          height: "400px",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "15px",
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} 
             style={{ 
              marginBottom: "15px",
              padding: "10px",
              borderRadius: "10px",
              background: "#F5F5F5",
              border: "1px solid #C8E6C9",
            }}
          >
            <strong>User {msg.sender_id}</strong>
            <p style={{ margin: "8px 0" }}> {msg.message}</p>
            <small style={{ color: "#666" }}>
              {msg.created_at
              ? new Date(msg.created_at).toLocaleString()
               : ""}
              {" • "}  
              {msg.is_read ? "✓ Read" : "✓ Sent"}
            </small>

          </div>
        ))}
        <div ref={messagesEndRef}></div>
      
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage();
          }
        }}
        placeholder="Type your message..."
        style={{ width: "80%", padding: "10px" }}
      />

      <button 
        onClick={sendMessage}
        disabled={sending}
         style={{
          marginLeft: "10px",
          padding: "10px 20px",
          cursor: sending ? "not-allowed" : "pointer",
        }}
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}