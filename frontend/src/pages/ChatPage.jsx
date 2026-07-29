import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function ChatPage() {
  const { conversationId } = useParams();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const loadMessages = async () => {
    try {
      const res = await api.get(`/chat/messages/${conversationId}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadMessages();

    const interval = setInterval(loadMessages, 3000);

    return () => clearInterval(interval);
  }, [conversationId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    try {
      await api.post("/chat/send", {
        conversation_id: Number(conversationId),
        message: text,
      });

      setText("");
      loadMessages();
    } catch (err) {
      console.error(err);
    }
  };

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
          <div key={msg.id} style={{ marginBottom: "10px" }}>
            <strong>User {msg.sender_id}</strong>
            <p>{msg.message}</p>
          </div>
        ))}
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
        style={{ width: "80%", padding: "10px" }}
      />

      <button onClick={sendMessage}>
        Send
      </button>
    </div>
  );
}