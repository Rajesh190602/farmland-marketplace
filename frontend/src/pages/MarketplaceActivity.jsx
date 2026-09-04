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
  const [reservations, setReservations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // PHASE 6 - REVIEWS & RATINGS
  const [reviewState, setReviewState] = useState({});
  const [reviewRating, setReviewRating] = useState({});
  const [reviewComment, setReviewComment] = useState({});
  const [reviewLoading, setReviewLoading] = useState(null);
  const [reviewError, setReviewError] = useState({});

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
          api.get("/marketplace/reservations/received"),
        ]);

        setInquiries(inquiriesResponse.data || []);
        setOffers(offersResponse.data || []);
        await loadOfferHistory(offersResponse.data || []);
        setSiteVisits(visitsResponse.data || []);
        setReservations(reservationsResponse.data || []);
        await checkCompletedReviewEligibility(visitsResponse.data || []);
      } else if (userRole === "buyer") {
        const [
          inquiriesResponse,
          offersResponse,
          visitsResponse,
        ] = await Promise.all([
          api.get("/marketplace/inquiries/my"),
          api.get("/marketplace/offers/my"),
          api.get("/marketplace/site-visits/my"),
          api.get("/marketplace/reservations/my"),
        ]);

        setInquiries(inquiriesResponse.data || []);
        setOffers(offersResponse.data || []);
        await loadOfferHistory(offersResponse.data || []);
        setSiteVisits(visitsResponse.data || []);
        setReservations(reservationsResponse.data || []);
        await checkCompletedReviewEligibility(visitsResponse.data || []);
      } else {
        setInquiries([]);
        setOffers([]);
        setSiteVisits([]);
        setReservations([]);
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
  // STEP 50 - OFFER NEGOTIATION
  // =====================================================

  const [offerHistory, setOfferHistory] = useState({});
  const [counterAmount, setCounterAmount] = useState({});
  const [counterMessage, setCounterMessage] = useState({});

  const loadOfferHistory = async (offerItems) => {
    const historyEntries = await Promise.all(
      (offerItems || []).map(async (item) => {
        try {
          const response = await api.get(
            `/marketplace/offers/${item.id}/history`
          );
          return [item.id, response.data || []];
        } catch (error) {
          console.error(`Failed to load history for offer ${item.id}:`, error);
          return [item.id, []];
        }
      })
    );

    setOfferHistory(Object.fromEntries(historyEntries));
  };

  const getOfferTurn = (item) => {
    const history = offerHistory[item.id] || [];
    const latest = history[history.length - 1];

    if (!latest) {
      return userRole === "farmer" ? "Your turn" : "Waiting for farmer";
    }

    if (latest.sender_id === Number(sessionStorage.getItem("user_id"))) {
      return latest.sender_role === "farmer"
        ? "Waiting for buyer"
        : "Waiting for farmer";
    }

    return "Your turn";
  };

  const canActOnOffer = (item) => {
    if (item.status !== "pending") return false;
    const history = offerHistory[item.id] || [];
    const latest = history[history.length - 1];
    if (!latest) return userRole === "farmer";
    return latest.sender_id !== Number(sessionStorage.getItem("user_id"));
  };

  const updateOffer = async (id, status) => {
    try {
      setActionLoading(`offer-${id}-${status}`);
      await api.put(`/marketplace/offers/${id}/status`, { status });
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

  const submitCounterOffer = async (item) => {
    const amount = Number(counterAmount[item.id]);
    const message = String(counterMessage[item.id] || "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Enter a counter-offer amount greater than zero.");
      return;
    }

    try {
      setActionLoading(`counter-${item.id}`);
      await api.post(`/marketplace/offers/${item.id}/counter`, {
        amount,
        message: message || null,
      });
      setCounterAmount((prev) => ({ ...prev, [item.id]: "" }));
      setCounterMessage((prev) => ({ ...prev, [item.id]: "" }));
      await loadActivity();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to send counter-offer."
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // STEP 51 - RESERVATIONS
  // =====================================================

  const updateReservation = async (id, status) => {
    try {
      setActionLoading(`reservation-${id}-${status}`);
      await api.put(`/marketplace/reservations/${id}/status`, { status });
      await loadActivity();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to update reservation."
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
  // PHASE 6 - REVIEW HELPERS
  // =====================================================

  const getReviewKey = (item) => `${item.land_id}-${item.buyer_id}`;

  const getReviewTargetId = async (item) => {
    if (userRole === "farmer") {
      return Number(item.buyer_id || 0);
    }

    try {
      const response = await api.get(`/lands/${Number(item.land_id)}`);
      return Number(response.data?.owner_id || 0);
    } catch (error) {
      console.error("Failed to load farmer for review:", error);
      return 0;
    }
  };

  const checkReviewEligibility = async (item) => {
    if (item.status !== "completed") return;

    const reviewedUserId = await getReviewTargetId(item);
    const key = getReviewKey(item);

    if (!reviewedUserId) {
      setReviewState((prev) => ({
        ...prev,
        [key]: {
          eligible: false,
          reason: "The other user's information is unavailable for this site visit.",
        },
      }));
      return;
    }

    try {
      const response = await api.get("/reviews/eligibility", {
        params: {
          land_id: Number(item.land_id),
          reviewed_user_id: reviewedUserId,
        },
      });

      setReviewState((prev) => ({
        ...prev,
        [key]: {
          ...response.data,
          reviewed_user_id: reviewedUserId,
        },
      }));
    } catch (error) {
      console.error("Failed to check review eligibility:", error);
      setReviewState((prev) => ({
        ...prev,
        [key]: {
          eligible: false,
          reviewed_user_id: reviewedUserId,
          reason:
            error.response?.data?.detail ||
            "Unable to check review eligibility.",
        },
      }));
    }
  };

  const checkCompletedReviewEligibility = async (items) => {
    await Promise.all(
      items
        .filter((item) => item.status === "completed")
        .map((item) => checkReviewEligibility(item))
    );
  };

  const submitActivityReview = async (item) => {
    const key = getReviewKey(item);
    const state = reviewState[key];

    if (!state?.eligible) {
      alert(
        state?.reason ||
          "You are not eligible to submit this review."
      );
      return;
    }

    const rating = Number(reviewRating[key] || 5);
    const comment = String(reviewComment[key] || "").trim();

    if (rating < 1 || rating > 5) {
      alert("Please select a rating from 1 to 5.");
      return;
    }

    if (comment.length > 2000) {
      alert("Review comment must be 2000 characters or less.");
      return;
    }

    try {
      setReviewLoading(key);
      setReviewError((prev) => ({ ...prev, [key]: "" }));

      await api.post("/reviews", {
        reviewed_user_id: Number(state.reviewed_user_id),
        land_id: Number(item.land_id),
        rating,
        comment: comment || null,
      });

      setReviewRating((prev) => ({ ...prev, [key]: 5 }));
      setReviewComment((prev) => ({ ...prev, [key]: "" }));

      await checkReviewEligibility(item);
      alert("Review submitted successfully.");
    } catch (error) {
      console.error("Failed to submit review:", error);
      const message =
        error.response?.data?.detail ||
        "Failed to submit review.";
      setReviewError((prev) => ({ ...prev, [key]: message }));
      alert(message);
    } finally {
      setReviewLoading(null);
    }
  };

  const ReviewCard = ({ item }) => {
    const key = getReviewKey(item);
    const state = reviewState[key];
    const rating = Number(reviewRating[key] || 5);
    const comment = reviewComment[key] || "";
    const targetLabel = userRole === "farmer" ? "Buyer" : "Farmer";
    const isSubmitting = reviewLoading === key;

    if (!state) {
      return (
        <button
          type="button"
          onClick={() => checkReviewEligibility(item)}
          style={{
            width: "100%",
            marginTop: "15px",
            border: "none",
            borderRadius: "9px",
            padding: "10px",
            background: "#6A1B9A",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "700",
          }}
        >
          ⭐ Check Review Eligibility
        </button>
      );
    }

    if (!state.eligible) {
      return (
        <div
          style={{
            marginTop: "15px",
            padding: "10px",
            background: "#F5F5F5",
            borderRadius: "9px",
            color: "#666",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          ⭐ {state.reason || "This review is not available."}
        </div>
      );
    }

    if (state.showForm !== true) {
      return (
        <button
          type="button"
          onClick={() =>
            setReviewState((prev) => ({
              ...prev,
              [key]: { ...prev[key], showForm: true },
            }))
          }
          style={{
            width: "100%",
            marginTop: "15px",
            border: "none",
            borderRadius: "9px",
            padding: "10px",
            background: "#6A1B9A",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "700",
          }}
        >
          ⭐ Rate {targetLabel}
        </button>
      );
    }

    return (
      <div
        style={{
          marginTop: "15px",
          paddingTop: "15px",
          borderTop: "1px solid #eee",
        }}
      >
        <div
          style={{
            fontWeight: "700",
            color: "#6A1B9A",
            marginBottom: "8px",
          }}
        >
          ⭐ Rate {targetLabel}
        </div>

        <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setReviewRating((prev) => ({
                  ...prev,
                  [key]: value,
                }))
              }
              aria-label={`${value} star`}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "28px",
                cursor: "pointer",
                padding: "0 2px",
                opacity: value <= rating ? 1 : 0.3,
              }}
            >
              ⭐
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          maxLength={2000}
          rows={4}
          placeholder={`Write your review about the ${targetLabel.toLowerCase()}...`}
          onChange={(e) =>
            setReviewComment((prev) => ({
              ...prev,
              [key]: e.target.value,
            }))
          }
          style={{
            width: "100%",
            boxSizing: "border-box",
            resize: "vertical",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "9px",
            marginBottom: "6px",
          }}
        />

        <div style={{ fontSize: "12px", color: "#777", marginBottom: "8px" }}>
          {comment.length}/2000 characters
        </div>

        {reviewError[key] && (
          <div style={{ color: "#C62828", fontSize: "13px", marginBottom: "8px" }}>
            {reviewError[key]}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            type="button"
            onClick={() => submitActivityReview(item)}
            disabled={isSubmitting}
            style={{
              border: "none",
              borderRadius: "9px",
              padding: "10px",
              background: "#2E7D32",
              color: "#fff",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontWeight: "700",
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Review"}
          </button>
          <button
            type="button"
            onClick={() =>
              setReviewState((prev) => ({
                ...prev,
                [key]: { ...prev[key], showForm: false },
              }))
            }
            disabled={isSubmitting}
            style={{
              border: "1px solid #aaa",
              borderRadius: "9px",
              padding: "10px",
              background: "#fff",
              color: "#555",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontWeight: "700",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
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
                  OFFERS - STEP 50 NEGOTIATION
              ================================================= */}

              <section style={{ marginBottom: "40px" }}>
                <h2 style={{ color: "#1565C0", marginBottom: "18px" }}>
                  💰 Land Offers & Negotiation
                </h2>

                {offers.length === 0 ? (
                  <Card>
                    <p style={{ margin: 0, color: "#777" }}>
                      No land offers yet.
                    </p>
                  </Card>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
                      gap: "18px",
                    }}
                  >
                    {offers.map((item) => {
                      const history = offerHistory[item.id] || [];
                      const latest = history[history.length - 1];
                      const isMyTurn = canActOnOffer(item);

                      return (
                        <Card key={item.id}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <strong>Offer #{item.id}</strong>
                            <StatusBadge status={item.status} />
                          </div>

                          <h3
                            style={{
                              margin: "18px 0 8px",
                              color: "#1565C0",
                            }}
                          >
                            ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                          </h3>

                          {item.message && (
                            <p style={{ color: "#555", lineHeight: 1.5 }}>
                              {item.message}
                            </p>
                          )}

                          <p style={{ fontSize: "13px", color: "#888" }}>
                            Land ID: {item.land_id}
                          </p>

                          <div
                            style={{
                              marginTop: "12px",
                              padding: "10px 12px",
                              background: "#E3F2FD",
                              borderRadius: "9px",
                              color: "#1565C0",
                              fontWeight: "700",
                              fontSize: "13px",
                            }}
                          >
                            {item.status === "pending"
                              ? `🔔 ${getOfferTurn(item)}`
                              : `Offer ${item.status}`}
                          </div>

                          {/* NEGOTIATION HISTORY */}
                          <div
                            style={{
                              marginTop: "16px",
                              borderTop: "1px solid #eee",
                              paddingTop: "14px",
                            }}
                          >
                            <strong style={{ color: "#444" }}>
                              📜 Negotiation History
                            </strong>

                            {history.length === 0 ? (
                              <p style={{ fontSize: "13px", color: "#888" }}>
                                Loading negotiation history...
                              </p>
                            ) : (
                              <div style={{ marginTop: "10px" }}>
                                {history.map((entry, index) => (
                                  <div
                                    key={`${entry.id}-${index}`}
                                    style={{
                                      padding: "9px 10px",
                                      marginBottom: "7px",
                                      borderRadius: "8px",
                                      background: entry.sender_role === userRole ? "#F1F8E9" : "#F5F5F5",
                                      fontSize: "13px",
                                    }}
                                  >
                                    <div style={{ fontWeight: "700" }}>
                                      {entry.action === "offer"
                                        ? "💰 Offer"
                                        : entry.action === "counter"
                                        ? "🔄 Counter-offer"
                                        : entry.action === "accepted"
                                        ? "✅ Accepted"
                                        : "❌ Rejected"}
                                      {" · "}
                                      {entry.sender_role === "farmer" ? "Farmer" : "Buyer"}
                                    </div>
                                    <div style={{ marginTop: "3px" }}>
                                      ₹{Number(entry.amount || 0).toLocaleString("en-IN")}
                                    </div>
                                    {entry.message && (
                                      <div style={{ color: "#666", marginTop: "3px" }}>
                                        {entry.message}
                                      </div>
                                    )}
                                    {entry.created_at && (
                                      <div style={{ color: "#999", marginTop: "3px", fontSize: "11px" }}>
                                        {new Date(entry.created_at).toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => startChat(item)}
                            disabled={actionLoading === `chat-${item.id}`}
                            style={{
                              width: "100%",
                              marginTop: "15px",
                              border: "none",
                              borderRadius: "9px",
                              padding: "11px",
                              background: "#1976D2",
                              color: "#fff",
                              cursor: actionLoading === `chat-${item.id}` ? "not-allowed" : "pointer",
                              fontWeight: "700",
                            }}
                          >
                            💬 {actionLoading === `chat-${item.id}` ? "Opening Chat..." : userRole === "farmer" ? "Reply to Buyer" : "Chat with Farmer"}
                          </button>

                          {item.status === "pending" && isMyTurn && (
                            <>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "10px",
                                  marginTop: "10px",
                                }}
                              >
                                <button
                                  disabled={actionLoading === `offer-${item.id}-accepted`}
                                  onClick={() => updateOffer(item.id, "accepted")}
                                  style={{
                                    border: "none",
                                    borderRadius: "9px",
                                    padding: "10px",
                                    background: "#2E7D32",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontWeight: "700",
                                  }}
                                >
                                  Accept ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                                </button>
                                <button
                                  disabled={actionLoading === `offer-${item.id}-rejected`}
                                  onClick={() => updateOffer(item.id, "rejected")}
                                  style={{
                                    border: "none",
                                    borderRadius: "9px",
                                    padding: "10px",
                                    background: "#C62828",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontWeight: "700",
                                  }}
                                >
                                  Reject
                                </button>
                              </div>

                              <div
                                style={{
                                  marginTop: "12px",
                                  padding: "12px",
                                  background: "#F8F9FA",
                                  borderRadius: "10px",
                                  border: "1px solid #E0E0E0",
                                }}
                              >
                                <strong style={{ fontSize: "13px", color: "#555" }}>
                                  🔄 Send Counter-Offer
                                </strong>
                                <input
                                  type="number"
                                  min="0.01"
                                  value={counterAmount[item.id] || ""}
                                  onChange={(e) =>
                                    setCounterAmount((prev) => ({ ...prev, [item.id]: e.target.value }))
                                  }
                                  placeholder="Counter amount"
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    marginTop: "8px",
                                    padding: "10px",
                                    border: "1px solid #ccc",
                                    borderRadius: "8px",
                                  }}
                                />
                                <textarea
                                  rows={3}
                                  maxLength={2000}
                                  value={counterMessage[item.id] || ""}
                                  onChange={(e) =>
                                    setCounterMessage((prev) => ({ ...prev, [item.id]: e.target.value }))
                                  }
                                  placeholder="Optional message"
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    marginTop: "8px",
                                    padding: "10px",
                                    border: "1px solid #ccc",
                                    borderRadius: "8px",
                                    resize: "vertical",
                                  }}
                                />
                                <button
                                  onClick={() => submitCounterOffer(item)}
                                  disabled={actionLoading === `counter-${item.id}`}
                                  style={{
                                    width: "100%",
                                    marginTop: "8px",
                                    border: "none",
                                    borderRadius: "9px",
                                    padding: "10px",
                                    background: "#6A1B9A",
                                    color: "#fff",
                                    cursor: actionLoading === `counter-${item.id}` ? "not-allowed" : "pointer",
                                    fontWeight: "700",
                                  }}
                                >
                                  {actionLoading === `counter-${item.id}` ? "Sending..." : "Send Counter-Offer"}
                                </button>
                              </div>
                            </>
                          )}

                          {item.status === "pending" && !isMyTurn && (
                            <p style={{ marginTop: "12px", color: "#777", fontSize: "13px" }}>
                              {latest?.sender_role === userRole ? "Waiting for the other party's response." : "The other party has responded. Refreshing the offer will show your available actions."}
                            </p>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* =================================================
                  STEP 51 - RESERVATIONS
              ================================================= */}

              <section>
                <h2
                  style={{
                    color: "#6A1B9A",
                    marginBottom: "18px",
                  }}
                >
                  📌 Reservations
                </h2>

                {reservations.length === 0 ? (
                  <Card>
                    <p style={{ margin: 0, color: "#777" }}>
                      No reservation requests yet.
                    </p>
                  </Card>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                      gap: "18px",
                    }}
                  >
                    {reservations.map((item) => (
                      <Card key={item.id}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "10px",
                          }}
                        >
                          <strong>Reservation #{item.id}</strong>
                          <StatusBadge status={item.status} />
                        </div>

                        <p style={{ marginTop: "16px" }}>
                          <strong>Land ID:</strong> {item.land_id}
                        </p>
                        <p>
                          <strong>Amount:</strong> ₹{Number(item.amount || 0).toLocaleString("en-IN")}
                        </p>
                        {item.offer_id && (
                          <p>
                            <strong>Linked Offer:</strong> #{item.offer_id}
                          </p>
                        )}
                        {item.message && (
                          <p style={{ color: "#555", lineHeight: 1.5 }}>
                            {item.message}
                          </p>
                        )}
                        <p style={{ fontSize: "13px", color: "#888" }}>
                          Requested: {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                        </p>

                        <button
                          onClick={() => navigate(`/lands/${item.land_id}`)}
                          style={{
                            width: "100%",
                            marginTop: "8px",
                            border: "1px solid #6A1B9A",
                            borderRadius: "9px",
                            padding: "10px",
                            background: "#fff",
                            color: "#6A1B9A",
                            cursor: "pointer",
                            fontWeight: "700",
                          }}
                        >
                          View Land
                        </button>

                        {userRole === "farmer" && item.status === "pending" && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "10px",
                              marginTop: "10px",
                            }}
                          >
                            <button
                              onClick={() => updateReservation(item.id, "confirmed")}
                              disabled={actionLoading === `reservation-${item.id}-confirmed`}
                              style={{
                                border: "none",
                                borderRadius: "9px",
                                padding: "10px",
                                background: "#2E7D32",
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: "700",
                              }}
                            >
                              {actionLoading === `reservation-${item.id}-confirmed` ? "Confirming..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => updateReservation(item.id, "rejected")}
                              disabled={actionLoading === `reservation-${item.id}-rejected`}
                              style={{
                                border: "none",
                                borderRadius: "9px",
                                padding: "10px",
                                background: "#C62828",
                                color: "#fff",
                                cursor: "pointer",
                                fontWeight: "700",
                              }}
                            >
                              {actionLoading === `reservation-${item.id}-rejected` ? "Rejecting..." : "Reject"}
                            </button>
                          </div>
                        )}

                        {item.status === "pending" && userRole === "buyer" && (
                          <button
                            onClick={() => updateReservation(item.id, "cancelled")}
                            disabled={actionLoading === `reservation-${item.id}-cancelled`}
                            style={{
                              width: "100%",
                              marginTop: "10px",
                              border: "none",
                              borderRadius: "9px",
                              padding: "10px",
                              background: "#757575",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: "700",
                            }}
                          >
                            Cancel Request
                          </button>
                        )}

                        {item.status === "confirmed" && (
                          <button
                            onClick={() => updateReservation(item.id, "cancelled")}
                            disabled={actionLoading === `reservation-${item.id}-cancelled`}
                            style={{
                              width: "100%",
                              marginTop: "10px",
                              border: "none",
                              borderRadius: "9px",
                              padding: "10px",
                              background: "#EF6C00",
                              color: "#fff",
                              cursor: "pointer",
                              fontWeight: "700",
                            }}
                          >
                            {actionLoading === `reservation-${item.id}-cancelled` ? "Cancelling..." : "Cancel Reservation"}
                          </button>
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

                        {item.status === "completed" && (
                          <ReviewCard item={item} />
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