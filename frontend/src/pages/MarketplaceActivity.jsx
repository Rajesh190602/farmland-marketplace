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
                            `chat-${item.land_id}`
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
                              `chat-${item.land_id}`
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "700",
                          }}
                        >
                          💬{" "}
                          {actionLoading ===
                          `chat-${item.land_id}`
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
                            `chat-${item.land_id}`
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
                              `chat-${item.land_id}`
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "700",
                          }}
                        >
                          💬{" "}
                          {actionLoading ===
                          `chat-${item.land_id}`
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
                          {new Date(
                            item.requested_date
                          ).toLocaleString()}
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
                            `chat-${item.land_id}`
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
                              `chat-${item.land_id}`
                                ? "not-allowed"
                                : "pointer",
                            fontWeight: "700",
                          }}
                        >
                          💬{" "}
                          {actionLoading ===
                          `chat-${item.land_id}`
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