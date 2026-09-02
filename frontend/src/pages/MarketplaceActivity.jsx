import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function MarketplaceActivity() {
  const navigate = useNavigate();

  const userRole = sessionStorage.getItem("role");

  const [inquiries, setInquiries] = useState([]);
  const [offers, setOffers] = useState([]);
  const [siteVisits, setSiteVisits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // =====================================================
  // LOAD MARKETPLACE ACTIVITY
  // =====================================================

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      setLoading(true);

      if (userRole === "farmer") {
        const [
          inquiriesResponse,
          offersResponse,
          visitsResponse,
        ] = await Promise.all([
          api.get("/marketplace/inquiries/received"),
          api.get("/marketplace/offers/received"),
          api.get("/marketplace/site-visits/received"),
        ]);

        setInquiries(inquiriesResponse.data || []);
        setOffers(offersResponse.data || []);
        setSiteVisits(visitsResponse.data || []);
      } else if (userRole === "buyer") {
        const [
          inquiriesResponse,
          offersResponse,
          visitsResponse,
        ] = await Promise.all([
          api.get("/marketplace/inquiries/my"),
          api.get("/marketplace/offers/my"),
          api.get("/marketplace/site-visits/my"),
        ]);

        setInquiries(inquiriesResponse.data || []);
        setOffers(offersResponse.data || []);
        setSiteVisits(visitsResponse.data || []);
      } else {
        setInquiries([]);
        setOffers([]);
        setSiteVisits([]);
      }
    } catch (error) {
      console.error(
        "Failed to load marketplace activity:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to load marketplace activity."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // BUYER ACTIVITY / HISTORY HELPERS
  // =====================================================

  const openLand = (landId) => {
    if (!landId) {
      return;
    }

    navigate(`/lands/${landId}`);
  };

  const formatDate = (value) => {
    if (!value) {
      return "Date unavailable";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getRecentActivity = () => {
    const activity = [
      ...inquiries.map((item) => ({
        type: "Inquiry",
        icon: "💬",
        landId: item.land_id,
        status: item.status,
        message: item.message,
        date: item.created_at,
        id: item.id,
      })),
      ...offers.map((item) => ({
        type: "Offer",
        icon: "💰",
        landId: item.land_id,
        status: item.status,
        message: item.message,
        amount: item.amount,
        date: item.created_at,
        id: item.id,
      })),
      ...siteVisits.map((item) => ({
        type: "Site Visit",
        icon: "📅",
        landId: item.land_id,
        status: item.status,
        message: item.message,
        date: item.created_at || item.requested_date,
        requestedDate: item.requested_date,
        id: item.id,
      })),
    ];

    return activity
      .sort((a, b) => {
        const first = new Date(a.date || 0).getTime();
        const second = new Date(b.date || 0).getTime();
        return second - first;
      })
      .slice(0, 10);
  };

  const getStatusCount = (items, status) =>
    items.filter(
      (item) =>
        String(item.status || "").toLowerCase() === status
    ).length;

  // =====================================================
  // START CHAT
  // =====================================================

  const startChat = async (item) => {
  try {
    setActionLoading(`chat-${item.id}`);

    const requestData = {
      land_id: item.land_id,
    };

    // Farmers reply to the buyer using the existing
    // marketplace activity information.
    if (userRole === "farmer") {
      requestData.buyer_id = item.buyer_id;
    }

    const response = await api.post(
      userRole === "farmer"
        ? "/chat/reply"
        : "/chat/start",
      requestData
    );

    const conversationId =
      response.data?.id ||
      response.data?.conversation_id;

    if (!conversationId) {
      throw new Error(
        "Conversation ID was not returned by the server."
      );
    }

    navigate(`/chat/${conversationId}`);
  } catch (error) {
    console.error(
      "Failed to open chat:",
      error
    );

    alert(
      error.response?.data?.detail ||
        error.message ||
        "Failed to open chat."
    );
  } finally {
    setActionLoading(null);
  }
};

  // =====================================================
  // UPDATE INQUIRY
  // =====================================================

  const updateInquiry = async (id, status) => {
    try {
      setActionLoading(
        `inquiry-${id}-${status}`
      );

      await api.put(
        `/marketplace/inquiries/${id}/status`,
        { status }
      );

      await loadActivity();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to update inquiry."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // UPDATE OFFER
  // =====================================================

  const updateOffer = async (id, status) => {
    try {
      setActionLoading(
        `offer-${id}-${status}`
      );

      await api.put(
        `/marketplace/offers/${id}/status`,
        { status }
      );

      await loadActivity();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to update offer."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // UPDATE SITE VISIT
  // =====================================================

  const updateSiteVisit = async (id, status) => {
    try {
      setActionLoading(
        `visit-${id}-${status}`
      );

      await api.put(
        `/marketplace/site-visits/${id}/status`,
        { status }
      );

      await loadActivity();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to update site visit."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // STATUS STYLE
  // =====================================================

  const statusStyle = (status) => {
    const normalized = String(status || "")
      .toLowerCase();

    if (normalized === "accepted") {
      return {
        background: "#E8F5E9",
        color: "#2E7D32",
      };
    }

    if (normalized === "rejected") {
      return {
        background: "#FFEBEE",
        color: "#C62828",
      };
    }

    if (normalized === "completed") {
      return {
        background: "#E3F2FD",
        color: "#1565C0",
      };
    }

    if (normalized === "cancelled") {
      return {
        background: "#EEEEEE",
        color: "#616161",
      };
    }

    return {
      background: "#FFF8E1",
      color: "#F57F17",
    };
  };

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const StatusBadge = ({ status }) => (
    <span
      style={{
        ...statusStyle(status),
        display: "inline-block",
        padding: "6px 12px",
        borderRadius: "20px",
        fontSize: "13px",
        fontWeight: "700",
        textTransform: "capitalize",
      }}
    >
      {status || "pending"}
    </span>
  );

  // =====================================================
  // CARD
  // =====================================================

  const Card = ({ children }) => (
    <div
      style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "20px",
        boxShadow:
          "0 5px 18px rgba(0,0,0,0.08)",
        border: "1px solid #eee",
      }}
    >
      {children}
    </div>
  );

  // =====================================================
  // INVALID ROLE
  // =====================================================

  if (
    userRole !== "farmer" &&
    userRole !== "buyer"
  ) {
    return (
      <>
        <Navbar />

        <div
          style={{
            minHeight: "100vh",
            background: "#F5F7FA",
            padding: "30px 20px",
          }}
        >
          <div
            style={{
              maxWidth: "700px",
              margin: "70px auto",
              background: "#fff",
              borderRadius: "18px",
              padding: "40px 25px",
              textAlign: "center",
              boxShadow:
                "0 6px 20px rgba(0,0,0,0.08)",
            }}
          >
            <h2>Marketplace Activity</h2>

            <p
              style={{
                color: "#666",
                marginTop: "10px",
              }}
            >
              Marketplace activity is available
              for buyers and farmers.
            </p>

            <button
              onClick={() => navigate("/")}
              style={{
                marginTop: "20px",
                border: "none",
                borderRadius: "10px",
                padding: "12px 22px",
                background: "#2E7D32",
                color: "#fff",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <>
      <Navbar />

      <div
        style={{
          minHeight: "100vh",
          background: "#F5F7FA",
          padding: "25px 20px 50px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            style={{
              background:
                "linear-gradient(135deg,#2E7D32,#43A047)",
              color: "#fff",
              borderRadius: "18px",
              padding: "25px",
              marginBottom: "30px",
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize:
                  "clamp(25px,5vw,36px)",
              }}
            >
              🤝 Marketplace Activity
            </h1>

            <p
              style={{
                margin: "10px 0 0",
                opacity: 0.95,
              }}
            >
              {userRole === "farmer"
                ? "Manage inquiries, offers and site visit requests from buyers."
                : "Track your inquiries, offers and site visit requests."}
            </p>
          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {/* =================================================
              BUYER ACTIVITY / HISTORY SUMMARY
          ================================================= */}

          {userRole === "buyer" && (
            <>
              <section
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(170px,1fr))",
                  gap: "15px",
                  marginBottom: "30px",
                }}
              >
                {[
                  {
                    label: "Total Inquiries",
                    value: inquiries.length,
                    icon: "💬",
                  },
                  {
                    label: "Total Offers",
                    value: offers.length,
                    icon: "💰",
                  },
                  {
                    label: "Site Visits",
                    value: siteVisits.length,
                    icon: "📅",
                  },
                  {
                    label: "Pending",
                    value:
                      getStatusCount(inquiries, "pending") +
                      getStatusCount(offers, "pending") +
                      getStatusCount(siteVisits, "pending"),
                    icon: "⏳",
                  },
                  {
                    label: "Accepted",
                    value:
                      getStatusCount(inquiries, "accepted") +
                      getStatusCount(offers, "accepted") +
                      getStatusCount(siteVisits, "accepted"),
                    icon: "✅",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    style={{
                      background: "#fff",
                      borderRadius: "15px",
                      padding: "20px 16px",
                      boxShadow:
                        "0 5px 18px rgba(0,0,0,0.07)",
                      border: "1px solid #eee",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "27px" }}>
                      {stat.icon}
                    </div>
                    <div
                      style={{
                        fontSize: "28px",
                        fontWeight: "800",
                        color: "#2E7D32",
                        marginTop: "5px",
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        color: "#666",
                        fontSize: "13px",
                        fontWeight: "600",
                        marginTop: "3px",
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </section>

              <section style={{ marginBottom: "40px" }}>
                <h2
                  style={{
                    color: "#6A1B9A",
                    marginBottom: "18px",
                  }}
                >
                  🕘 Recent Activity
                </h2>

                {getRecentActivity().length === 0 ? (
                  <Card>
                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                        textAlign: "center",
                      }}
                    >
                      No marketplace activity yet. When you
                      send an inquiry, make an offer, or request
                      a site visit, it will appear here.
                    </p>
                  </Card>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    {getRecentActivity().map((item) => (
                      <Card key={`${item.type}-${item.id}`}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "15px",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                flexWrap: "wrap",
                              }}
                            >
                              <strong
                                style={{
                                  color: "#333",
                                  fontSize: "16px",
                                }}
                              >
                                {item.icon} {item.type}
                              </strong>

                              <StatusBadge
                                status={item.status}
                              />
                            </div>

                            <p
                              style={{
                                margin: "9px 0 4px",
                                color: "#666",
                                fontSize: "13px",
                              }}
                            >
                              Land ID: {item.landId}
                            </p>

                            <p
                              style={{
                                margin: 0,
                                color: "#888",
                                fontSize: "12px",
                              }}
                            >
                              {formatDate(item.date)}
                            </p>

                            {item.requestedDate && (
                              <p
                                style={{
                                  margin: "7px 0 0",
                                  color: "#555",
                                  fontSize: "13px",
                                }}
                              >
                                <strong>
                                  Requested visit:
                                </strong>{" "}
                                {formatDate(item.requestedDate)}
                              </p>
                            )}

                            {item.amount !== undefined && (
                              <p
                                style={{
                                  margin: "7px 0 0",
                                  color: "#1565C0",
                                  fontWeight: "700",
                                }}
                              >
                                Offer: ₹
                                {Number(
                                  item.amount || 0
                                ).toLocaleString("en-IN")}
                              </p>
                            )}

                            {item.message && (
                              <p
                                style={{
                                  margin: "8px 0 0",
                                  color: "#555",
                                  lineHeight: 1.4,
                                }}
                              >
                                {item.message}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              openLand(item.landId)
                            }
                            style={{
                              border: "none",
                              borderRadius: "9px",
                              padding: "10px 15px",
                              background: "#2E7D32",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: "700",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🌾 View Land
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                background: "#fff",
                borderRadius: "16px",
              }}
            >
              <h3>
                Loading marketplace activity...
              </h3>
            </div>
          ) : (
            <>
              {/* =================================================
                  INQUIRIES
              ================================================= */}

              <section
                style={{
                  marginBottom: "40px",
                }}
              >
                <h2
                  style={{
                    color: "#2E7D32",
                    marginBottom: "18px",
                  }}
                >
                  💬 Land Inquiries
                </h2>

                {inquiries.length === 0 ? (
                  <Card>
                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                      }}
                    >
                      No land inquiries yet.
                    </p>
                  </Card>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(280px,1fr))",
                      gap: "18px",
                    }}
                  >
                    {inquiries.map((item) => (
                      <Card key={item.id}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <strong>
                            Inquiry #{item.id}
                          </strong>

                          <StatusBadge
                            status={item.status}
                          />
                        </div>

                        <p
                          style={{
                            marginTop: "15px",
                            color: "#555",
                            lineHeight: 1.5,
                          }}
                        >
                          {item.message}
                        </p>

                        <p
                          style={{
                            fontSize: "13px",
                            color: "#888",
                          }}
                        >
                          Land ID: {item.land_id}
                        </p>

                        {/* CHAT WITH BUYER */}

                        <button
                          onClick={() =>
                            startChat(item)
                            
                            
                          }
                          disabled={
                            actionLoading ===
                            `chat-${item.id}`
                          }
                          style={{
                            width: "100%",
                            marginTop: "15px",
                            border: "none",
                            borderRadius: "9px",
                            padding: "11px",
                            background:
                              "#1976D2",
                            color: "#fff",
                            cursor:
                              actionLoading ===
                              `chat-${item.id}`
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "700",
                          }}
                        >
                          💬{" "}
                          {actionLoading ===
                          `chat-${item.id}`
                            ? "Opening Chat..."
                            : userRole === "farmer"
                            ? "Reply to Buyer"
                            : "Chat with Farmer"}
                        </button>

                        {/* FARMER ACTIONS */}

                        {userRole === "farmer" &&
                          item.status ===
                            "pending" && (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "10px",
                              }}
                            >
                              <button
                                disabled={
                                  actionLoading ===
                                  `inquiry-${item.id}-accepted`
                                }
                                onClick={() =>
                                  updateInquiry(
                                    item.id,
                                    "accepted"
                                  )
                                }
                                style={{
                                  flex: 1,
                                  border: "none",
                                  borderRadius: "9px",
                                  padding: "10px",
                                  background:
                                    "#2E7D32",
                                  color: "#fff",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                Accept
                              </button>

                              <button
                                disabled={
                                  actionLoading ===
                                  `inquiry-${item.id}-rejected`
                                }
                                onClick={() =>
                                  updateInquiry(
                                    item.id,
                                    "rejected"
                                  )
                                }
                                style={{
                                  flex: 1,
                                  border: "none",
                                  borderRadius: "9px",
                                  padding: "10px",
                                  background:
                                    "#C62828",
                                  color: "#fff",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* =================================================
                  OFFERS
              ================================================= */}

              <section
                style={{
                  marginBottom: "40px",
                }}
              >
                <h2
                  style={{
                    color: "#1565C0",
                    marginBottom: "18px",
                  }}
                >
                  💰 Land Offers
                </h2>

                {offers.length === 0 ? (
                  <Card>
                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                      }}
                    >
                      No land offers yet.
                    </p>
                  </Card>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(280px,1fr))",
                      gap: "18px",
                    }}
                  >
                    {offers.map((item) => (
                      <Card key={item.id}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <strong>
                            Offer #{item.id}
                          </strong>

                          <StatusBadge
                            status={item.status}
                          />
                        </div>

                        <h3
                          style={{
                            margin:
                              "18px 0 8px",
                            color: "#1565C0",
                          }}
                        >
                          ₹
                          {Number(
                            item.amount || 0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </h3>

                        {item.message && (
                          <p
                            style={{
                              color: "#555",
                              lineHeight: 1.5,
                            }}
                          >
                            {item.message}
                          </p>
                        )}

                        <p
                          style={{
                            fontSize: "13px",
                            color: "#888",
                          }}
                        >
                          Land ID: {item.land_id}
                        </p>

                        {/* CHAT */}

                        <button
                          onClick={() =>
                            startChat(item)
                            
                            
                          }
                          disabled={
                            actionLoading ===
                            `chat-${item.id}`
                          }
                          style={{
                            width: "100%",
                            marginTop: "15px",
                            border: "none",
                            borderRadius: "9px",
                            padding: "11px",
                            background:
                              "#1976D2",
                            color: "#fff",
                            cursor:
                              actionLoading ===
                              `chat-${item.id}`
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "700",
                          }}
                        >
                          💬{" "}
                          {actionLoading ===
                          `chat-${item.id}`
                            ? "Opening Chat..."
                            : userRole === "farmer"
                            ? "Reply to Buyer"
                            : "Chat with Farmer"}
                        </button>

                        {/* FARMER ACTIONS */}

                        {userRole === "farmer" &&
                          item.status ===
                            "pending" && (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "10px",
                              }}
                            >
                              <button
                                disabled={
                                  actionLoading ===
                                  `offer-${item.id}-accepted`
                                }
                                onClick={() =>
                                  updateOffer(
                                    item.id,
                                    "accepted"
                                  )
                                }
                                style={{
                                  flex: 1,
                                  border: "none",
                                  borderRadius: "9px",
                                  padding: "10px",
                                  background:
                                    "#2E7D32",
                                  color: "#fff",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                Accept
                              </button>

                              <button
                                disabled={
                                  actionLoading ===
                                  `offer-${item.id}-rejected`
                                }
                                onClick={() =>
                                  updateOffer(
                                    item.id,
                                    "rejected"
                                  )
                                }
                                style={{
                                  flex: 1,
                                  border: "none",
                                  borderRadius: "9px",
                                  padding: "10px",
                                  background:
                                    "#C62828",
                                  color: "#fff",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* =================================================
                  SITE VISITS
              ================================================= */}

              <section>
                <h2
                  style={{
                    color: "#EF6C00",
                    marginBottom: "18px",
                  }}
                >
                  📅 Site Visit Requests
                </h2>

                {siteVisits.length === 0 ? (
                  <Card>
                    <p
                      style={{
                        margin: 0,
                        color: "#777",
                      }}
                    >
                      No site visit requests yet.
                    </p>
                  </Card>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(280px,1fr))",
                      gap: "18px",
                    }}
                  >
                    {siteVisits.map((item) => (
                      <Card key={item.id}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <strong>
                            Visit #{item.id}
                          </strong>

                          <StatusBadge
                            status={item.status}
                          />
                        </div>

                        <p
                          style={{
                            marginTop: "16px",
                          }}
                        >
                          <strong>
                            Requested:
                          </strong>{" "}
                          {formatDate(
                            item.requested_date
                          )}
                        </p>

                        {item.message && (
                          <p
                            style={{
                              color: "#555",
                              lineHeight: 1.5,
                            }}
                          >
                            {item.message}
                          </p>
                        )}

                        <p
                          style={{
                            fontSize: "13px",
                            color: "#888",
                          }}
                        >
                          Land ID: {item.land_id}
                        </p>

                        {/* CHAT */}

                        <button
                          onClick={() =>
                            startChat(item)
                      
                          }
                          disabled={
                            actionLoading ===
                            `chat-${item.id}`
                          }
                          style={{
                            width: "100%",
                            marginTop: "15px",
                            border: "none",
                            borderRadius: "9px",
                            padding: "11px",
                            background:
                              "#1976D2",
                            color: "#fff",
                            cursor:
                              actionLoading ===
                              `chat-${item.id}`
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "700",
                          }}
                        >
                          💬{" "}
                          {actionLoading ===
                          `chat-${item.id}`
                            ? "Opening Chat..."
                            : userRole === "farmer"
                            ? "Reply to Buyer"
                            : "Chat with Farmer"}
                        </button>

                        {/* FARMER ACTIONS */}

                        {userRole === "farmer" &&
                          item.status ===
                            "pending" && (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "1fr 1fr",
                                gap: "10px",
                                marginTop: "10px",
                              }}
                            >
                              <button
                                onClick={() =>
                                  updateSiteVisit(
                                    item.id,
                                    "accepted"
                                  )
                                }
                                style={{
                                  border: "none",
                                  borderRadius: "9px",
                                  padding: "10px",
                                  background:
                                    "#2E7D32",
                                  color: "#fff",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                Accept
                              </button>

                              <button
                                onClick={() =>
                                  updateSiteVisit(
                                    item.id,
                                    "rejected"
                                  )
                                }
                                style={{
                                  border: "none",
                                  borderRadius: "9px",
                                  padding: "10px",
                                  background:
                                    "#C62828",
                                  color: "#fff",
                                  cursor:
                                    "pointer",
                                  fontWeight:
                                    "700",
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          )}

                        {/* MARK COMPLETED */}

                        {userRole === "farmer" &&
                          item.status ===
                            "accepted" && (
                            <button
                              onClick={() =>
                                updateSiteVisit(
                                  item.id,
                                  "completed"
                                )
                              }
                              style={{
                                width: "100%",
                                marginTop: "10px",
                                border: "none",
                                borderRadius: "9px",
                                padding: "10px",
                                background:
                                  "#1565C0",
                                color: "#fff",
                                cursor:
                                  "pointer",
                                fontWeight:
                                  "700",
                              }}
                            >
                              Mark Completed
                            </button>
                          )}
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default MarketplaceActivity;