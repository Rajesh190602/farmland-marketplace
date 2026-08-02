import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MyChats() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);
  const loadConversations = async () => {
  try {
    setLoading(true);

    const response = await api.get("/chat/my-conversations");

    setConversations(response.data);

  } catch (error) {
    console.error(error);

    alert("Failed to load conversations.");

  } finally {
    setLoading(false);
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
        Loading Conversations...
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
        <h1>💬 My Chats</h1>
        <button
          onClick={loadConversations}
          style={{
            marginBottom: "20px",
            background: "#1976D2",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
         🔄 Refresh
        </button>
          


        {conversations.length === 0 ? (
          <div
            style={{
            textAlign: "center",
            marginTop: "60px",
            background: "#fff",
            padding: "40px",
            borderRadius: "12px",
            boxShadow: "0 3px 10px rgba(0,0,0,.1)",
          }}
        >
           <h2>💬 No Conversations Yet</h2>
           <p>Start chatting with a farmer from any land listing.</p>
        </div>
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
              <p
                 style={{                 
                  color: "#555",
                  marginTop: "10px",
                }}
              >
                {chat.last_message || "No messages yet."}                
              </p>
              <p>
                <strong>Land:</strong> {chat.land_title}
              </p>

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