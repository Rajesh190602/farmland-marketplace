import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyChats() {
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await api.get("/chat/my-conversations");
      setConversations(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load conversations.");
    }
  };

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
        <h1>💬 My Chats</h1>

        {conversations.length === 0 ? (
          <h3>No conversations yet.</h3>
        ) : (
          conversations.map((chat) => (
            <div
              key={chat.conversation_id}
              onClick={() =>
                navigate(`/chat/${chat.conversation_id}`)
              }
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "15px",
                cursor: "pointer",
                background: "white",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <h3>{chat.other_user}</h3>

              <p>
                <strong>Land:</strong> {chat.land_title}
              </p>

              <p>{chat.last_message}</p>

              <small>
                {chat.last_message_time
                  ? new Date(chat.last_message_time).toLocaleString()
                  : ""}
              </small>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default MyChats;