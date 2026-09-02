import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(false);

  const [otherUserId, setOtherUserId] = useState(null);
  const [otherUserName, setOtherUserName] = useState("User");

  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // =====================================================
  // PHASE 2 - REPORT USER
  // =====================================================

  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  // =====================================================
// PHASE 2 - BLOCK USER
// =====================================================

  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  // =====================================================
  // PHASE 4 - MUTE CONVERSATION
  // =====================================================

  const [isMuted, setIsMuted] = useState(false);
  const [muteLoading, setMuteLoading] = useState(false);

  // =====================================================
  // PHASE 2 - BLOCK USER
  // =====================================================

  const loadBlockStatus = async (userId) => {
    if (!userId) {
      return;
    }

    try {
      const response = await api.get("/marketplace/users/blocked");
      const blockedUsers = response.data || [];

      const blocked = Array.isArray(blockedUsers)
        ? blockedUsers.some((user) => {
            const blockedId =
              user.blocked_user_id ??
              user.user_id ??
              user.id ??
              user.blockedUserId;

            return Number(blockedId) === Number(userId);
          })
        : false;

      setIsBlocked(blocked);
    } catch (error) {
      console.error("Failed to load block status:", error);
    }
  };

  const blockUser = async () => {
    if (!otherUserId || blockLoading) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to block ${otherUserName || "this user"}? You will not be able to send messages to this user while they are blocked.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setBlockLoading(true);

      await api.post(
        `/marketplace/users/${otherUserId}/block`
      );

      setIsBlocked(true);
      setText("");
      setShowEmoji(false);
      setShowAttachMenu(false);
      setShowReportForm(false);

      alert(`${otherUserName || "User"} has been blocked.`);
    } catch (error) {
      console.error("Failed to block user:", error);

      alert(
        error.response?.data?.detail ||
          "Unable to block this user."
      );
    } finally {
      setBlockLoading(false);
    }
  };

  const unblockUser = async () => {
    if (!otherUserId || blockLoading) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to unblock ${otherUserName || "this user"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setBlockLoading(true);

      await api.delete(
        `/marketplace/users/${otherUserId}/block`
      );

      setIsBlocked(false);

      alert(`${otherUserName || "User"} has been unblocked.`);
    } catch (error) {
      console.error("Failed to unblock user:", error);

      alert(
        error.response?.data?.detail ||
          "Unable to unblock this user."
      );
    } finally {
      setBlockLoading(false);
    }
  };

  // =====================================================
  // PHASE 4 - MUTE CONVERSATION
  // =====================================================

  const loadMuteStatus = async () => {
    if (!conversationId) return;

    try {
      const response = await api.get(
        `/chat/mute/${conversationId}`
      );
      setIsMuted(response.data?.muted === true);
    } catch (error) {
      console.error("Failed to load mute status:", error);
    }
  };

  const toggleMuteConversation = async () => {
    if (!conversationId || muteLoading) return;

    try {
      setMuteLoading(true);

      const response = isMuted
        ? await api.delete(`/chat/mute/${conversationId}`)
        : await api.post(`/chat/mute/${conversationId}`);

      setIsMuted(response.data?.muted === true);
    } catch (error) {
      console.error("Failed to update mute status:", error);
      alert(
        error.response?.data?.detail ||
          "Unable to update conversation mute status."
      );
    } finally {
      setMuteLoading(false);
    }
  };

  // Message whose menu is currently open
  const [openMessageMenu, setOpenMessageMenu] = useState(null);

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

      const data = response.data || {};

      const resolvedOtherUserId =
        data.other_user_id ??
        data.otherUserId ??
        data.other_user?.id ??
        data.otherUser?.id ??
        data.user?.id ??
        null;

      const resolvedOtherUserName =
        data.other_user_name ||
        data.otherUserName ||
        data.other_user?.full_name ||
        data.other_user?.name ||
        data.otherUser?.full_name ||
        data.otherUser?.name ||
        data.user?.full_name ||
        data.user?.name ||
        data.full_name ||
        data.name ||
        "User";

      setOtherUserId(
        resolvedOtherUserId
      );

      setOtherUserName(
        resolvedOtherUserName
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

      const newMessages = response.data || [];
      const container = messagesContainerRef.current;

      if (container) {
        const distanceFromBottom =
          container.scrollHeight -
          container.scrollTop -
          container.clientHeight;

        // Only follow new messages when the user is already near
        // the bottom. If they are reading older messages, preserve
        // their current scroll position.
        shouldScrollToBottomRef.current =
          distanceFromBottom <= 150;
      } else {
        // Initial render: show the newest messages.
        shouldScrollToBottomRef.current = true;
      }

      // If the conversation endpoint does not include the other user's
      // name, use sender metadata from the messages when available.
      const candidate = newMessages.find(
        (message) =>
          Number(message.sender_id) !== myUserId &&
          (
            message.sender_name ||
            message.sender_full_name ||
            message.user_name ||
            message.user?.full_name ||
            message.user?.name
          )
      );

      if (
        (otherUserName === "User" || !otherUserName) &&
        candidate
      ) {
        setOtherUserName(
          candidate.sender_name ||
          candidate.sender_full_name ||
          candidate.user_name ||
          candidate.user?.full_name ||
          candidate.user?.name ||
          "User"
        );
      }

      setMessages(newMessages);
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
  // UPDATE MY ONLINE PRESENCE
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

      setLastSeen(
        response.data.last_seen || null
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
      updateMyPresence();
    }, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateMyPresence();
      }
    };

    const handleWindowFocus = () => {
      updateMyPresence();
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      handleWindowFocus
    );

    return () => {
      clearInterval(messageInterval);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus
      );
    };
  }, [conversationId]);

  // =====================================================
  // PRESENCE CHECK
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
  // BLOCK STATUS CHECK
  // =====================================================

  useEffect(() => {
    if (!otherUserId) {
      return;
    }

    loadBlockStatus(otherUserId);
  }, [otherUserId]);

  // =====================================================
  // MUTE STATUS CHECK
  // =====================================================

  useEffect(() => {
    loadMuteStatus();
  }, [conversationId]);

  // =====================================================
  // SCROLL TO BOTTOM
  // =====================================================

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "auto",
      });

      shouldScrollToBottomRef.current = false;
    });
  }, [messages]);

  // =====================================================
  // SEND TEXT MESSAGE
  // =====================================================

  const sendMessage = async () => {
    if (isBlocked) {
      alert("You have blocked this user. Unblock the user to send messages.");
      return;
    }

    if (!text.trim() || sending) {
      return;
    }

    try {
      setSending(true);

      await api.post("/chat/send", {
        conversation_id: Number(conversationId),
        message: text.trim(),
      });

      setText("");
      setShowEmoji(false);

      await updateMyPresence();

      shouldScrollToBottomRef.current = true;

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
  // DELETE MESSAGE
  // =====================================================

  const deleteMessage = async (messageId) => {
    if (!messageId || deletingMessage) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this message?"
    );

    if (!confirmed) {
      setOpenMessageMenu(null);
      return;
    }

    try {
      setDeletingMessage(true);

      await api.delete(
        `/chat/messages/${messageId}`
      );

      // Immediately remove from screen
      setMessages((previousMessages) =>
        previousMessages.filter(
          (message) => message.id !== messageId
        )
      );

      setOpenMessageMenu(null);
    } catch (error) {
      console.error(
        "Failed to delete message:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to delete message."
      );
    } finally {
      setDeletingMessage(false);
    }
  };

  // =====================================================
  // SELECT FILE
  // =====================================================

  const openFilePicker = () => {
    fileInputRef.current?.click();
    setShowAttachMenu(false);
  };

  // =====================================================
  // UPLOAD FILE
  // =====================================================

  const uploadFile = async (event) => {
    if (isBlocked) {
      alert("You have blocked this user. Unblock the user to send messages or files.");
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "File size must be 10 MB or less."
      );

      event.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append(
        "conversation_id",
        Number(conversationId)
      );

      formData.append(
        "file",
        file
      );

      await api.post(
        "/chat/send-file",
        formData
      );

      await updateMyPresence();

      shouldScrollToBottomRef.current = true;

      await loadMessages();
    } catch (error) {
      console.error(
        "File upload failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to upload file."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  // =====================================================
  // EMOJIS
  // =====================================================

  const emojis = [
    "😀",
    "😂",
    "😍",
    "😊",
    "😎",
    "❤️",
    "👍",
    "🙏",
    "🔥",
    "🎉",
    "🌾",
    "🌱",
    "🏡",
    "💰",
    "📍",
    "🤝",
  ];

  const addEmoji = (emoji) => {
    setText(
      (previous) => previous + emoji
    );
  };

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const getDateLabel = (dateValue) => {
    const date = new Date(dateValue);

    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(
      yesterday.getDate() - 1
    );

    if (
      date.toDateString() ===
      today.toDateString()
    ) {
      return "Today";
    }

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  // =====================================================
  // TIME FORMAT
  // =====================================================

  const getTime = (dateValue) => {
    return new Date(
      dateValue
    ).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  // =====================================================
  // LAST SEEN
  // =====================================================

  const getLastSeenText = () => {
    if (isOnline) {
      return "online";
    }

    if (!lastSeen) {
      return "offline";
    }

    return `last seen ${new Date(
      lastSeen
    ).toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  // =====================================================
  // FILE SIZE
  // =====================================================

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  // =====================================================
  // PHASE 2 - REPORT USER
  // =====================================================

  const reportUser = async () => {
    const reason = reportReason.trim();
    const description = reportDescription.trim();

    if (!otherUserId) {
      alert("Unable to identify the user in this conversation.");
      return;
    }

    if (!reason) {
      alert("Please enter a reason for reporting this user.");
      return;
    }

    if (reason.length > 100) {
      alert("Report reason must be 100 characters or less.");
      return;
    }

    if (description.length > 1000) {
      alert(
        "Report description must be 1000 characters or less."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to report ${otherUserName || "this user"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setReportLoading(true);

      await api.post(
        `/marketplace/users/${otherUserId}/report`,
        {
          reported_user_id: Number(otherUserId),
          reason,
          description: description || null,
        }
      );

      alert(
        "Report submitted successfully. Our admin team will review it."
      );

      setReportReason("");
      setReportDescription("");
      setShowReportForm(false);
    } catch (error) {
      console.error(
        "Failed to report user:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to submit user report."
      );
    } finally {
      setReportLoading(false);
    }
  };

  // =====================================================
  // MESSAGE RENDER
  // =====================================================

  const renderMessage = (msg, index) => {
    const isMine =
      Number(msg.sender_id) ===
      myUserId;

    const previousMessage =
      messages[index - 1];

    const currentDate =
      new Date(
        msg.created_at
      ).toDateString();

    const previousDate =
      previousMessage
        ? new Date(
            previousMessage.created_at
          ).toDateString()
        : null;

    const showDate =
      currentDate !== previousDate;

    return (
      <div key={msg.id}>
        {showDate && (
          <div
            style={{
              textAlign: "center",
              margin: "16px 0",
            }}
          >
            <span
              style={{
                background: "#E2F0D9",
                color: "#555",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.08)",
              }}
            >
              {getDateLabel(
                msg.created_at
              )}
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent:
              isMine
                ? "flex-end"
                : "flex-start",
            marginBottom: "5px",
          }}
        >
          <div
            style={{
              maxWidth:
                "min(75%, 520px)",

              minWidth:
                msg.message_type !== "text" &&
                msg.file_url
                  ? "220px"
                  : "80px",

              background:
                isMine
                  ? "#D9FDD3"
                  : "#FFFFFF",

              borderRadius:
                isMine
                  ? "10px 10px 2px 10px"
                  : "10px 10px 10px 2px",

              padding:
                msg.message_type !== "text"
                  ? "32px 5px 5px"
                  : "32px 10px 8px",

              boxShadow:
                "0 1px 2px rgba(0,0,0,0.15)",

              position: "relative",

              zIndex:
                openMessageMenu === msg.id
                  ? 100
                  : 1,
            }}
          >
            {/* =====================================================
                MESSAGE OPTIONS
            ===================================================== */}

            {isMine && (
              <div
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  zIndex: 200,
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();

                    setOpenMessageMenu(
                      openMessageMenu ===
                        msg.id
                        ? null
                        : msg.id
                    );
                  }}
                  style={{
                    border: "none",
                    background:
                      "rgba(255,255,255,0.8)",
                    borderRadius: "50%",
                    width: "28px",
                    height: "28px",
                    cursor: "pointer",
                    fontSize: "18px",
                    lineHeight: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Message options"
                >
                  ⋮
                </button>

                {openMessageMenu ===
                  msg.id && (
                  <div
                    style={{
                      position: "absolute",
                      top: "32px",
                      right: "0",
                      width: "150px",
                      background: "#FFFFFF",
                      borderRadius: "8px",
                      boxShadow:
                        "0 4px 15px rgba(0,0,0,0.2)",
                      overflow: "hidden",
                      zIndex: 300,
                    }}
                  >
                    <button
                      type="button"
                      disabled={
                        deletingMessage
                      }
                      onClick={() =>
                        deleteMessage(
                          msg.id
                        )
                      }
                      style={{
                        width: "100%",
                        border: "none",
                        background:
                          "#FFFFFF",
                        padding:
                          "12px 15px",
                        textAlign:
                          "left",
                        cursor:
                          deletingMessage
                            ? "not-allowed"
                            : "pointer",
                        color:
                          "#D32F2F",
                        fontSize:
                          "14px",
                      }}
                    >
                      🗑️{" "}
                      {deletingMessage
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* =====================================================
                IMAGE
            ===================================================== */}

            {msg.message_type ===
              "image" &&
              msg.file_url && (
                <div>
                  <a
                    href={
                      msg.file_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={
                        msg.file_url
                      }
                      alt={
                        msg.file_name ||
                        "Image"
                      }
                      style={{
                        width: "100%",
                        maxHeight: "350px",
                        objectFit: "cover",
                        borderRadius: "7px",
                        display: "block",
                        cursor: "pointer",
                      }}
                    />
                  </a>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "8px",
                      padding:
                        "8px 5px 3px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        overflow: "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {msg.file_name}
                    </span>

                    <a
                      href={
                        msg.file_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration:
                          "none",
                        fontSize: "18px",
                      }}
                      title="Download"
                    >
                      ⬇️
                    </a>
                  </div>
                </div>
              )}

            {/* =====================================================
                DOCUMENT
            ===================================================== */}

            {msg.message_type ===
              "file" &&
              msg.file_url && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px",
                    background:
                      isMine
                        ? "#C8F7C2"
                        : "#F0F0F0",
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "8px",
                      background:
                        "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      fontSize: "22px",
                    }}
                  >
                    📄
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontWeight:
                          "600",
                        fontSize:
                          "13px",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {msg.file_name}
                    </div>

                    <div
                      style={{
                        fontSize:
                          "11px",
                        color: "#666",
                        marginTop:
                          "3px",
                      }}
                    >
                      {formatFileSize(
                        msg.file_size
                      )}
                    </div>
                  </div>

                  <a
                    href={
                      msg.file_url
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration:
                        "none",
                      fontSize: "20px",
                    }}
                    title="Download"
                  >
                    ⬇️
                  </a>
                </div>
              )}

            {/* =====================================================
                TEXT
            ===================================================== */}

            {msg.message && (
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: "1.45",
                  whiteSpace:
                    "pre-wrap",
                  wordBreak:
                    "break-word",
                  margin:
                    msg.message_type !==
                    "text"
                      ? "6px 4px 2px"
                      : "0",
                }}
              >
                {msg.message}
              </div>
            )}

            {/* =====================================================
                TIME + READ STATUS
            ===================================================== */}

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                alignItems:
                  "center",
                gap: "4px",
                marginTop: "3px",
                padding: "0 3px",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#667781",
                }}
              >
                {getTime(
                  msg.created_at
                )}
              </span>

              {isMine && (
                <span
                  style={{
                    fontSize: "13px",
                    color:
                      msg.is_read
                        ? "#53BDEB"
                        : "#667781",
                  }}
                >
                  {msg.is_read
                    ? "✓✓"
                    : "✓"}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
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
            marginTop: "100px",
            color: "#2E7D32",
            fontSize: "22px",
            fontWeight: "600",
          }}
        >
          Loading Chat...
        </div>
      </>
    );
  }

  // =====================================================
  // CHAT UI
  // =====================================================

  return (
    <>
      <Navbar />

      <div
        style={{
          minHeight:
            "calc(100vh - 70px)",
          background: "#E5DDD5",
          padding: "0",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1000px",
            height:
              "calc(100vh - 70px)",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            background: "#EFE7DE",
          }}
        >
          {/* =====================================================
              HEADER
          ===================================================== */}

          <div
            style={{
              height: "65px",
              background: "#075E54",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              padding: "0 15px",
              gap: "12px",
              flexShrink: 0,
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.25)",
            }}
          >
            <button
              onClick={() =>
                navigate(-1)
              }
              style={{
                background:
                  "transparent",
                border: "none",
                color: "#fff",
                fontSize: "25px",
                cursor: "pointer",
                padding: "4px",
              }}
              title="Back"
            >
              ←
            </button>

            <div
              style={{
                width: "43px",
                height: "43px",
                borderRadius: "50%",
                background: "#D9FDD3",
                color: "#075E54",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                fontSize: "22px",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {otherUserName
                ? otherUserName
                    .charAt(0)
                    .toUpperCase()
                : "U"}
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: "600",
                  overflow: "hidden",
                  textOverflow:
                    "ellipsis",
                  whiteSpace:
                    "nowrap",
                }}
              >
                {otherUserName}
              </div>

              <div
                style={{
                  fontSize: "12px",
                  marginTop: "2px",
                  color: isOnline
                    ? "#B9FBC0"
                    : "#D7E8E5",
                }}
              >
                {isOnline
                  ? "● online"
                  : getLastSeenText()}
              </div>
            </div>

            {/* =====================================================
                PHASE 2 - BLOCK / UNBLOCK USER
            ===================================================== */}

            <button
              type="button"
              onClick={isBlocked ? unblockUser : blockUser}
              disabled={!otherUserId || blockLoading}
              title={isBlocked ? "Unblock User" : "Block User"}
              style={{
                border: "none",
                background: "transparent",
                color: isBlocked ? "#B9FBC0" : "#fff",
                fontSize: "20px",
                opacity:
                  otherUserId && !blockLoading
                    ? 0.95
                    : 0.5,
                cursor:
                  otherUserId && !blockLoading
                    ? "pointer"
                    : "not-allowed",
                padding: "5px 8px",
              }}
            >
              {blockLoading
                ? "..."
                : isBlocked
                  ? "🔓"
                  : "🚫"}
            </button>

            {/* =====================================================
                PHASE 4 - MUTE / UNMUTE CONVERSATION
            ===================================================== */}

            <button
              type="button"
              onClick={toggleMuteConversation}
              disabled={!conversationId || muteLoading}
              title={
                isMuted
                  ? "Unmute Conversation"
                  : "Mute Conversation"
              }
              style={{
                border: "none",
                background: "transparent",
                color: isMuted ? "#B9FBC0" : "#fff",
                fontSize: "20px",
                opacity: conversationId && !muteLoading ? 0.95 : 0.5,
                cursor: conversationId && !muteLoading ? "pointer" : "not-allowed",
                padding: "5px 8px",
              }}
            >
              {muteLoading ? "..." : isMuted ? "🔔" : "🔇"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowReportForm(
                  (previous) => !previous
                );
                setShowEmoji(false);
                setShowAttachMenu(false);
              }}
              disabled={!otherUserId}
              title="Report User"
              style={{
                border: "none",
                background: "transparent",
                color: "#fff",
                fontSize: "22px",
                opacity: otherUserId ? 0.9 : 0.5,
                cursor: otherUserId
                  ? "pointer"
                  : "not-allowed",
                padding: "5px 8px",
              }}
            >
              ⋮
            </button>
          </div>

          {/* =====================================================
              PHASE 2 - REPORT USER
          ===================================================== */}

          {showReportForm && (
            <div
              style={{
                background: "#FFF8F8",
                borderBottom: "1px solid #FFCDD2",
                padding: "15px",
              }}
            >
              <div
                style={{
                  maxWidth: "700px",
                  margin: "0 auto",
                  background: "#fff",
                  border: "1px solid #FFCDD2",
                  borderRadius: "12px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <strong
                    style={{
                      color: "#C62828",
                      fontSize: "16px",
                    }}
                  >
                    🚩 Report {otherUserName || "User"}
                  </strong>

                  <button
                    type="button"
                    onClick={() =>
                      setShowReportForm(false)
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: "20px",
                      cursor: "pointer",
                      color: "#666",
                    }}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>

                <p
                  style={{
                    margin: "0 0 12px",
                    color: "#666",
                    fontSize: "13px",
                  }}
                >
                  Report this user if you believe they are
                  behaving improperly or violating marketplace rules.
                </p>

                <input
                  type="text"
                  value={reportReason}
                  onChange={(event) =>
                    setReportReason(event.target.value)
                  }
                  maxLength={100}
                  placeholder="Reason for reporting"
                  disabled={reportLoading}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    marginBottom: "8px",
                    fontFamily: "inherit",
                  }}
                />

                <textarea
                  value={reportDescription}
                  onChange={(event) =>
                    setReportDescription(
                      event.target.value
                    )
                  }
                  maxLength={1000}
                  rows={3}
                  placeholder="Additional details (optional)"
                  disabled={reportLoading}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    justifyContent: "flex-end",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setShowReportForm(false)
                    }
                    disabled={reportLoading}
                    style={{
                      border: "1px solid #ccc",
                      background: "#fff",
                      color: "#555",
                      padding: "9px 16px",
                      borderRadius: "8px",
                      cursor: reportLoading
                        ? "not-allowed"
                        : "pointer",
                      fontWeight: "600",
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={reportUser}
                    disabled={reportLoading}
                    style={{
                      border: "none",
                      background: reportLoading
                        ? "#999"
                        : "#C62828",
                      color: "#fff",
                      padding: "9px 16px",
                      borderRadius: "8px",
                      cursor: reportLoading
                        ? "not-allowed"
                        : "pointer",
                      fontWeight: "700",
                    }}
                  >
                    {reportLoading
                      ? "Submitting..."
                      : "🚩 Submit Report"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================
              BLOCKED USER NOTICE
          ===================================================== */}

          {isBlocked && (
            <div
              style={{
                background: "#FFF3E0",
                borderBottom: "1px solid #FFCC80",
                padding: "10px 15px",
                textAlign: "center",
                color: "#8D4A00",
                fontSize: "13px",
              }}
            >
              🚫 You have blocked {otherUserName || "this user"}. You cannot send messages or files.
              <button
                type="button"
                onClick={unblockUser}
                disabled={blockLoading}
                style={{
                  marginLeft: "8px",
                  border: "none",
                  background: "transparent",
                  color: "#1565C0",
                  fontWeight: "700",
                  cursor: blockLoading ? "not-allowed" : "pointer",
                  padding: "0",
                }}
              >
                Unblock
              </button>
            </div>
          )}

          {/* =====================================================
              PHASE 4 - MUTED CONVERSATION NOTICE
          ===================================================== */}

          {isMuted && !isBlocked && (
            <div
              style={{
                background: "#F3F4F6",
                borderBottom: "1px solid #D1D5DB",
                padding: "8px 15px",
                textAlign: "center",
                color: "#555",
                fontSize: "13px",
              }}
            >
              🔇 This conversation is muted. You can still send and receive messages.
            </div>
          )}

          {/* =====================================================
              MESSAGE AREA
          ===================================================== */}

          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "15px 12px",
              backgroundColor:
                "#EFE7DE",
              backgroundImage:
                "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)",
              backgroundSize:
                "20px 20px",
            }}
          >
            {messages.length ===
            0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    background:
                      "#FFF3C4",
                    padding:
                      "12px 18px",
                    borderRadius: "8px",
                    textAlign:
                      "center",
                    color: "#666",
                    fontSize: "13px",
                    boxShadow:
                      "0 1px 2px rgba(0,0,0,0.1)",
                  }}
                >
                  🔒 Messages are end-to-end
                  encrypted in this chat.
                  <br />
                  Start the conversation.
                </div>
              </div>
            ) : (
              messages.map(
                renderMessage
              )
            )}

            {uploading && (
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  margin: "10px 0",
                }}
              >
                <div
                  style={{
                    background:
                      "#D9FDD3",
                    padding:
                      "10px 14px",
                    borderRadius:
                      "10px",
                    fontSize: "13px",
                    color: "#555",
                  }}
                >
                  📤 Uploading file...
                </div>
              </div>
            )}

            <div
              ref={messagesEndRef}
            />
          </div>

          {/* =====================================================
              EMOJI PANEL
          ===================================================== */}

          {showEmoji && (
            <div
              style={{
                background: "#fff",
                padding: "10px",
                borderTop:
                  "1px solid #ddd",
                display: "flex",
                flexWrap:
                  "wrap",
                gap: "8px",
                maxHeight:
                  "130px",
                overflowY: "auto",
              }}
            >
              {emojis.map(
                (emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() =>
                      addEmoji(
                        emoji
                      )
                    }
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      fontSize: "23px",
                      cursor:
                        "pointer",
                      padding: "3px",
                    }}
                  >
                    {emoji}
                  </button>
                )
              )}
            </div>
          )}

          {/* =====================================================
              ATTACHMENT MENU
          ===================================================== */}

          {showAttachMenu && (
            <div
              style={{
                position:
                  "relative",
              }}
            >
              <div
                style={{
                  position:
                    "absolute",
                  bottom: "8px",
                  left: "15px",
                  background:
                    "#fff",
                  borderRadius:
                    "12px",
                  padding: "8px",
                  boxShadow:
                    "0 4px 15px rgba(0,0,0,0.2)",
                  zIndex: 20,
                }}
              >
                <button
                  type="button"
                  onClick={
                    openFilePicker
                  }
                  style={{
                    border: "none",
                    background:
                      "transparent",
                    padding:
                      "10px 14px",
                    cursor:
                      "pointer",
                    fontSize: "14px",
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "8px",
                  }}
                >
                  🖼️ Photo / Document
                </button>
              </div>
            </div>
          )}

          {/* =====================================================
              INPUT AREA
          ===================================================== */}

          <div
            style={{
              background:
                "#F0F2F5",
              padding: "8px",
              display: "flex",
              alignItems:
                "center",
              gap: "7px",
              flexShrink: 0,
              borderTop:
                "1px solid #ddd",
            }}
          >
            {/* EMOJI */}

            <button
              type="button"
              disabled={isBlocked}
              onClick={() => {
                setShowEmoji(
                  !showEmoji
                );
                setShowAttachMenu(
                  false
                );
              }}
              style={{
                border: "none",
                background:
                  "transparent",
                fontSize: "24px",
                cursor:
                  "pointer",
                padding: "5px",
              }}
              title={isBlocked ? "Unblock user to use chat" : "Emoji"}
            >
              😊
            </button>

            {/* ATTACHMENT */}

            <button
              type="button"
              disabled={isBlocked}
              onClick={() => {
                setShowAttachMenu(
                  !showAttachMenu
                );
                setShowEmoji(false);
              }}
              style={{
                border: "none",
                background:
                  "transparent",
                fontSize: "23px",
                cursor:
                  "pointer",
                padding: "5px",
                transform:
                  "rotate(-35deg)",
              }}
              title={isBlocked ? "Unblock user to attach files" : "Attach"}
            >
              📎
            </button>

            {/* HIDDEN FILE INPUT */}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={
                uploadFile
              }
              disabled={isBlocked}
              style={{
                display: "none",
              }}
            />

            {/* TEXT */}

            <input
              type="text"
              placeholder={
                uploading
                  ? "Uploading..."
                  : "Type a message"
              }
              value={text}
              disabled={
                uploading
              }
              onChange={(e) =>
                setText(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background:
                  "#fff",
                borderRadius:
                  "22px",
                padding:
                  "11px 15px",
                fontSize: "14px",
                minWidth: 0,
              }}
            />

            {/* SEND */}

            <button
              type="button"
              onClick={
                sendMessage
              }
              disabled={
                sending ||
                uploading ||
                isBlocked ||
                !text.trim()
              }
              style={{
                width: "44px",
                height: "44px",
                borderRadius:
                  "50%",
                border: "none",
                background:
                  sending ||
                  uploading ||
                  isBlocked ||
                  !text.trim()
                    ? "#A5D6A7"
                    : "#075E54",
                color: "#fff",
                cursor:
                  sending ||
                  uploading ||
                  isBlocked ||
                  !text.trim()
                    ? "not-allowed"
                    : "pointer",
                fontSize: "20px",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexShrink: 0,
              }}
            >
              {sending
                ? "..."
                : "➤"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}