import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import LandMap from "../components/LandMap";
import api from "../services/api";

function LandDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [land, setLand] = useState(null);
  const [deletingImageId, setDeletingImageId] = useState(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // =========================================================
  // PHASE 1 - MARKETPLACE STATE
  // =========================================================

  const [availability, setAvailability] = useState(null);
  const [marketplaceLoading, setMarketplaceLoading] =
    useState(false);

  const [inquiryMessage, setInquiryMessage] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [offerMessage, setOfferMessage] = useState("");

  const [visitDate, setVisitDate] = useState("");
  const [visitMessage, setVisitMessage] = useState("");

  // =========================================================
  // FRONTEND ANTI-SPAM PROTECTION
  // =========================================================
  // Frontend protection improves UX, but the backend remains
  // authoritative. A user can bypass client-side limits by
  // refreshing/devtools, so backend rate limiting is still required.
  const FRONTEND_ACTION_COOLDOWN_SECONDS = 60;
  const BACKEND_RATE_LIMIT_COOLDOWN_SECONDS = 300;

  const [spamCooldowns, setSpamCooldowns] = useState({
    inquiry: 0,
    offer: 0,
    siteVisit: 0,
  });

  // =========================================================
  // PHASE 2 - REPORT LAND STATE
  // =========================================================

  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // =========================================================
  // PHASE 3 - SIMILAR LANDS
  // =========================================================
  const [similarLands, setSimilarLands] = useState([]);
  const [similarLandsLoading, setSimilarLandsLoading] = useState(false);
  // =========================================================
  // PHASE 6 - REVIEWS & RATINGS
  // =========================================================
  const [reviewSummary, setReviewSummary] = useState({
    average_rating: 0,
    total_reviews: 0,
  });
  const [reviews, setReviews] = useState([]);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Logged-in user's information
  const currentUserId = Number(
    sessionStorage.getItem("user_id")
  );

  const currentRole =
    sessionStorage.getItem("role");

  // =========================================================
  // FRONTEND ANTI-SPAM HELPERS
  // =========================================================

  const getSpamStorageKey = (action) =>
    `farmland_marketplace_spam_${currentUserId}_${id}_${action}`;

  const getCooldownRemaining = (action) => {
    try {
      const until = Number(
        localStorage.getItem(getSpamStorageKey(action)) || 0
      );
      return Math.max(0, Math.ceil((until - Date.now()) / 1000));
    } catch {
      return 0;
    }
  };

  const startSpamCooldown = (
    action,
    seconds = FRONTEND_ACTION_COOLDOWN_SECONDS
  ) => {
    const until = Date.now() + seconds * 1000;

    try {
      localStorage.setItem(
        getSpamStorageKey(action),
        String(until)
      );
    } catch {
      // Continue even if browser storage is unavailable.
    }

    setSpamCooldowns((previous) => ({
      ...previous,
      [action]: seconds,
    }));
  };

  const clearExpiredSpamCooldowns = () => {
    setSpamCooldowns({
      inquiry: getCooldownRemaining("inquiry"),
      offer: getCooldownRemaining("offer"),
      siteVisit: getCooldownRemaining("siteVisit"),
    });
  };

  const formatCooldown = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
    }

    return `${remainingSeconds}s`;
  };

  const getRateLimitMessage = (error, actionLabel) => {
    const retryAfterHeader =
      error?.response?.headers?.["retry-after"];

    const retryAfterSeconds = Number(retryAfterHeader);

    const seconds =
      Number.isFinite(retryAfterSeconds) &&
      retryAfterSeconds > 0
        ? Math.min(retryAfterSeconds, BACKEND_RATE_LIMIT_COOLDOWN_SECONDS)
        : BACKEND_RATE_LIMIT_COOLDOWN_SECONDS;

    return {
      seconds,
      message:
        `Too many ${actionLabel} attempts. ` +
        `Please wait ${formatCooldown(seconds)} before trying again.`,
    };
  };

  useEffect(() => {
    clearExpiredSpamCooldowns();

    const timer = window.setInterval(() => {
      setSpamCooldowns((previous) => {
        const next = {
          inquiry: getCooldownRemaining("inquiry"),
          offer: getCooldownRemaining("offer"),
          siteVisit: getCooldownRemaining("siteVisit"),
        };

        if (
          next.inquiry === previous.inquiry &&
          next.offer === previous.offer &&
          next.siteVisit === previous.siteVisit
        ) {
          return previous;
        }

        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [id, currentUserId]);

  // =========================================================
  // LOAD LAND
  // =========================================================

  useEffect(() => {
    fetchLand();
  }, [id]);

  const fetchLand = async () => {
  try {
    const response = await api.get(
      `/lands/${id}`
    );

    setLand(response.data);

    // =====================================================
    // PHASE 6 - LISTING VIEWS
    // Record one unique view for the logged-in user.
    // This request is non-blocking so it cannot break the
    // existing Land Details page.
    // =====================================================
    try {
      const viewResponse = await api.post(
        `/lands/${id}/view`
      );

      if (viewResponse.data?.view_count !== undefined) {
        setLand((previous) =>
          previous
            ? {
                ...previous,
                view_count: Number(
                  viewResponse.data.view_count
                ),
              }
            : previous
        );
      }
    } catch (listingViewError) {
      console.error(
        "Failed to record listing view:",
        listingViewError
      );
    }

    // =====================================================
    // PHASE 3 - RECENTLY VIEWED LANDS
    // Record this land only after it has loaded successfully.
    // Failure here must NOT break the Land Details page.
    // =====================================================
    await checkFavoriteStatus(id);

    // Availability is a Phase 1 marketplace feature.
    // If this request fails, do not break the existing
    // Land Details page.
    await fetchAvailability(id);
    await fetchSimilarLands(response.data);
    await fetchFarmerReviews(
      Number(response.data?.owner_id),
      Number(response.data?.id)
    );
    } catch (error) {
      console.error(
        "Failed to load land:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to load land details."
      );
    }
  };

  // =========================================================
  // PHASE 1 - GET AVAILABILITY
  // =========================================================

  const fetchAvailability = async (landId) => {
    try {
      const response = await api.get(
        `/marketplace/lands/${landId}/availability`
      );

      setAvailability(response.data);
    } catch (error) {
      console.error(
        "Failed to load land availability:",
        error
      );

      // Existing Land Details functionality should
      // continue even if marketplace availability
      // is unavailable.
      setAvailability(null);
    }
  };

  // =========================================================
  // PHASE 3 - LOAD SIMILAR LANDS
  // =========================================================
  // Similar listings are calculated on the frontend so the
  // existing land-search backend and all current functionality
  // remain unchanged.
  const fetchSimilarLands = async (currentLand) => {
    if (!currentLand || currentRole !== "buyer") {
      setSimilarLands([]);
      return;
    }

    try {
      setSimilarLandsLoading(true);

      // Start with the same district because location is the
      // strongest similarity signal for farmland buyers.
      const params = {};
      if (currentLand.district) {
        params.district = currentLand.district;
      }

      let response = await api.get("/lands/search", {
        params,
      });

      let candidates = Array.isArray(response.data)
        ? response.data
        : [];

      // If there are no same-district results, use all searchable
      // marketplace lands as a fallback.
      if (
        candidates.length === 0 &&
        currentLand.district
      ) {
        response = await api.get("/lands/search");
        candidates = Array.isArray(response.data)
          ? response.data
          : [];
      }

      const normalize = (value) =>
        String(value ?? "").trim().toLowerCase();

      const currentId = Number(currentLand.id);
      const currentPrice = Number(currentLand.price);
      const currentArea = Number(currentLand.area);

      const isMeaningfulNumber = (value) =>
        Number.isFinite(value) && value > 0;

      const getSimilarityScore = (candidate) => {
        let score = 0;

        if (
          normalize(candidate.district) &&
          normalize(candidate.district) ===
            normalize(currentLand.district)
        ) {
          score += 5;
        }

        if (
          normalize(candidate.mandal) &&
          normalize(candidate.mandal) ===
            normalize(currentLand.mandal)
        ) {
          score += 4;
        }

        if (
          normalize(candidate.crop_type) &&
          normalize(candidate.crop_type) ===
            normalize(currentLand.crop_type)
        ) {
          score += 4;
        }

        if (
          normalize(candidate.soil_type) &&
          normalize(candidate.soil_type) ===
            normalize(currentLand.soil_type)
        ) {
          score += 3;
        }

        if (
          normalize(candidate.water_source) &&
          normalize(candidate.water_source) ===
            normalize(currentLand.water_source)
        ) {
          score += 2;
        }

        const candidatePrice = Number(candidate.price);
        if (
          isMeaningfulNumber(currentPrice) &&
          isMeaningfulNumber(candidatePrice)
        ) {
          const priceDifference =
            Math.abs(candidatePrice - currentPrice) /
            currentPrice;

          if (priceDifference <= 0.25) {
            score += 2;
          }
        }

        const candidateArea = Number(candidate.area);
        if (
          isMeaningfulNumber(currentArea) &&
          isMeaningfulNumber(candidateArea)
        ) {
          const areaDifference =
            Math.abs(candidateArea - currentArea) /
            currentArea;

          if (areaDifference <= 0.25) {
            score += 2;
          }
        }

        return score;
      };

      const ranked = candidates
        .filter(
          (candidate) =>
            Number(candidate.id) !== currentId &&
            candidate.status === "approved" &&
            candidate.is_published !== false
        )
        .map((candidate) => ({
          ...candidate,
          _similarityScore:
            getSimilarityScore(candidate),
        }))
        .filter(
          (candidate) =>
            candidate._similarityScore > 0
        )
        .sort((a, b) => {
          if (
            b._similarityScore !==
            a._similarityScore
          ) {
            return (
              b._similarityScore -
              a._similarityScore
            );
          }

          return (
            Number(b.id) - Number(a.id)
          );
        })
        .slice(0, 6);

      setSimilarLands(ranked);
    } catch (error) {
      console.error(
        "Failed to load similar lands:",
        error
      );
      setSimilarLands([]);
    } finally {
      setSimilarLandsLoading(false);
    }
  };

  // =========================================================
  // CHECK FAVORITE STATUS
  // =========================================================

  const checkFavoriteStatus = async (landId) => {
    try {
      const response = await api.get(
        `/favorites/check/${landId}`
      );

      setIsFavorite(
        response.data?.is_favorite === true
      );
    } catch (error) {
      console.error(
        "Failed to check favorite status:",
        error
      );

      setIsFavorite(false);
    }
  };

  // =========================================================
  // START CHAT
  // =========================================================

  const startChat = async () => {
    try {
      const response = await api.post(
        "/chat/start",
        {
          land_id: land.id,
        }
      );

      navigate(
        `/chat/${response.data.conversation_id}`
      );
    } catch (error) {
      console.error(
        "Failed to start conversation:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to start conversation."
      );
    }
  };

  // =========================================================
  // ADD / REMOVE FAVORITE
  // =========================================================

  const toggleFavorite = async () => {
    if (favoriteLoading) {
      return;
    }

    try {
      setFavoriteLoading(true);

      if (isFavorite) {
        await api.delete(
          `/favorites/${land.id}`
        );

        setIsFavorite(false);

        alert(
          "Land removed from Favorites."
        );
      } else {
        await api.post(
          `/favorites/${land.id}`
        );

        setIsFavorite(true);

        alert(
          "Land added to Favorites."
        );
      }
    } catch (error) {
      console.error(
        "Favorite update failed:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to update favorite."
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  // =========================================================
  // DELETE INDIVIDUAL LAND IMAGE
  // =========================================================

  const deleteImage = async (imageId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this image?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingImageId(imageId);

      await api.delete(
        `/lands/${land.id}/images/${imageId}`
      );

      alert(
        "Image deleted successfully."
      );

      await fetchLand();
    } catch (error) {
      console.error(
        "Failed to delete image:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to delete image."
      );
    } finally {
      setDeletingImageId(null);
    }
  };

  // =========================================================
  // PHASE 1 - SEND INQUIRY
  // =========================================================

  const sendInquiry = async () => {
    const message = inquiryMessage.trim();

    if (spamCooldowns.inquiry > 0) {
      alert(
        `Please wait ${formatCooldown(
          spamCooldowns.inquiry
        )} before sending another inquiry.`
      );
      return;
    }

    if (!message) {
      alert(
        "Please enter a message before sending the inquiry."
      );
      return;
    }

    if (message.length > 1000) {
      alert(
        "Inquiry message must be 1000 characters or less."
      );
      return;
    }

    try {
      setMarketplaceLoading(true);

      await api.post(
        "/marketplace/inquiries",
        {
          land_id: land.id,
          message,
        }
      );

      startSpamCooldown("inquiry");

      alert(
        "Your inquiry has been sent to the farmer."
      );

      setInquiryMessage("");

      await fetchAvailability(
        land.id
      );
    } catch (error) {
      console.error(
        "Failed to send inquiry:",
        error
      );

      if (error.response?.status === 429) {
        const rateLimit = getRateLimitMessage(
          error,
          "inquiry"
        );

        startSpamCooldown(
          "inquiry",
          rateLimit.seconds
        );

        alert(rateLimit.message);
      } else {
        alert(
          error.response?.data?.detail ||
            "Unable to send inquiry."
        );
      }
    } finally {
      setMarketplaceLoading(false);
    }
  };

  // =========================================================
  // PHASE 1 - MAKE OFFER
  // =========================================================

  const makeOffer = async () => {
    const amount = Number(offerAmount);

    if (spamCooldowns.offer > 0) {
      alert(
        `Please wait ${formatCooldown(
          spamCooldowns.offer
        )} before submitting another offer.`
      );
      return;
    }

    if (!offerAmount || amount <= 0) {
      alert(
        "Please enter a valid offer amount."
      );
      return;
    }

    if (!Number.isFinite(amount)) {
      alert(
        "Please enter a valid offer amount."
      );
      return;
    }

    const message = offerMessage.trim();

    if (message.length > 1000) {
      alert(
        "Offer message must be 1000 characters or less."
      );
      return;
    }

    try {
      setMarketplaceLoading(true);

      await api.post(
        "/marketplace/offers",
        {
          land_id: land.id,
          amount,
          message: message || null,
        }
      );

      startSpamCooldown("offer");

      alert(
        "Your offer has been sent to the farmer."
      );

      setOfferAmount("");
      setOfferMessage("");

      await fetchAvailability(
        land.id
      );
    } catch (error) {
      console.error(
        "Failed to make offer:",
        error
      );

      if (error.response?.status === 429) {
        const rateLimit = getRateLimitMessage(
          error,
          "offer"
        );

        startSpamCooldown(
          "offer",
          rateLimit.seconds
        );

        alert(rateLimit.message);
      } else {
        alert(
          error.response?.data?.detail ||
            "Unable to submit offer."
        );
      }
    } finally {
      setMarketplaceLoading(false);
    }
  };

  // =========================================================
  // PHASE 1 - REQUEST SITE VISIT
  // =========================================================

  const requestSiteVisit = async () => {
    if (spamCooldowns.siteVisit > 0) {
      alert(
        `Please wait ${formatCooldown(
          spamCooldowns.siteVisit
        )} before requesting another site visit.`
      );
      return;
    }

    if (!visitDate) {
      alert(
        "Please select a site visit date and time."
      );
      return;
    }

    const selectedDate =
      new Date(visitDate);

    if (
      Number.isNaN(
        selectedDate.getTime()
      )
    ) {
      alert(
        "Please select a valid date and time."
      );
      return;
    }

    if (
      selectedDate <= new Date()
    ) {
      alert(
        "Site visit date must be in the future."
      );
      return;
    }

    const message = visitMessage.trim();

    if (message.length > 1000) {
      alert(
        "Site visit message must be 1000 characters or less."
      );
      return;
    }

    try {
      setMarketplaceLoading(true);

      await api.post(
        "/marketplace/site-visits",
        {
          land_id: land.id,
          requested_date:
            selectedDate.toISOString(),
          message:
            message || null,
        }
      );

      startSpamCooldown("siteVisit");

      alert(
        "Your site visit request has been sent to the farmer."
      );

      setVisitDate("");
      setVisitMessage("");
    } catch (error) {
      console.error(
        "Failed to request site visit:",
        error
      );

      if (error.response?.status === 429) {
        const rateLimit = getRateLimitMessage(
          error,
          "site visit"
        );

        startSpamCooldown(
          "siteVisit",
          rateLimit.seconds
        );

        alert(rateLimit.message);
      } else {
        alert(
          error.response?.data?.detail ||
            "Unable to request site visit."
        );
      }
    } finally {
      setMarketplaceLoading(false);
    }
  };

  // =========================================================
  // PHASE 2 - REPORT LAND
  // =========================================================

  const reportLand = async () => {
    const reason = reportReason.trim();
    const description =
      reportDescription.trim();

    if (!reason) {
      alert("Please enter a reason for reporting this land.");
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
      "Are you sure you want to report this land listing?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setReportLoading(true);

      await api.post(
        `/marketplace/lands/${land.id}/report`,
        {
          land_id: land.id,
          reason,
          description: description || null,
        }
      );

      alert(
        "Report submitted successfully. Our admin team will review it."
      );

      setReportReason("");
      setReportDescription("");
    } catch (error) {
      console.error(
        "Failed to report land:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to submit land report."
      );
    } finally {
      setReportLoading(false);
    }
  };

  // =========================================================
  // PHASE 6 - REVIEWS & RATINGS
  // =========================================================

  const fetchFarmerReviews = async (ownerId, landId) => {
    if (!ownerId) {
      return;
    }

    try {
      setReviewsLoading(true);
      setReviewError("");

      const [summaryResponse, reviewsResponse] =
        await Promise.all([
          api.get(`/reviews/user/${ownerId}/summary`),
          api.get(`/reviews/user/${ownerId}`),
        ]);

      setReviewSummary({
        average_rating:
          Number(summaryResponse.data?.average_rating) || 0,
        total_reviews:
          Number(summaryResponse.data?.total_reviews) || 0,
      });

      setReviews(
        Array.isArray(reviewsResponse.data)
          ? reviewsResponse.data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load farmer reviews:",
        error
      );
      setReviewSummary({
        average_rating: 0,
        total_reviews: 0,
      });
      setReviews([]);
      setReviewError(
        error.response?.data?.detail ||
          "Unable to load reviews."
      );
    } finally {
      setReviewsLoading(false);
    }

    // Eligibility is only relevant to a logged-in buyer
    // reviewing the farmer who owns this land.
    if (
      currentRole === "buyer" &&
      Number(currentUserId) !== Number(ownerId)
    ) {
      try {
        const eligibilityResponse = await api.get(
          "/reviews/eligibility",
          {
            params: {
              land_id: Number(landId),
              reviewed_user_id: Number(ownerId),
            },
          }
        );

        setReviewEligibility(
          eligibilityResponse.data || null
        );
      } catch (error) {
        console.error(
          "Failed to check review eligibility:",
          error
        );
        setReviewEligibility({
          eligible: false,
          reason:
            error.response?.data?.detail ||
            "Unable to check review eligibility.",
        });
      }
    } else {
      setReviewEligibility(null);
    }
  };

  const submitReview = async () => {
    const comment = reviewComment.trim();

    if (!Number.isInteger(Number(reviewRating))) {
      alert("Please select a rating from 1 to 5.");
      return;
    }

    if (
      Number(reviewRating) < 1 ||
      Number(reviewRating) > 5
    ) {
      alert("Please select a rating from 1 to 5.");
      return;
    }

    if (comment.length > 2000) {
      alert("Review comment must be 2000 characters or less.");
      return;
    }

    if (
      !reviewEligibility?.eligible
    ) {
      alert(
        reviewEligibility?.reason ||
          "You are not eligible to review this farmer yet."
      );
      return;
    }

    try {
      setReviewLoading(true);

      await api.post("/reviews", {
        reviewed_user_id: Number(land.owner_id),
        land_id: Number(land.id),
        rating: Number(reviewRating),
        comment: comment || null,
      });

      alert("Your review has been submitted successfully.");

      setReviewComment("");
      setReviewRating(5);
      setShowReviewForm(false);

      await fetchFarmerReviews(
        Number(land.owner_id),
        Number(land.id)
      );
    } catch (error) {
      console.error(
        "Failed to submit review:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to submit review."
      );

      // Refresh eligibility because a duplicate review or
      // changed marketplace status may have made it ineligible.
      try {
        const eligibilityResponse = await api.get(
          "/reviews/eligibility",
          {
            params: {
              land_id: Number(land.id),
              reviewed_user_id: Number(land.owner_id),
            },
          }
        );
        setReviewEligibility(
          eligibilityResponse.data || null
        );
      } catch {
        // The original error is already shown to the user.
      }
    } finally {
      setReviewLoading(false);
    }
  };

  const renderStars = (rating, size = 20) => {
    const roundedRating = Math.round(Number(rating) || 0);

    return (
      <span
        aria-label={`${rating} out of 5 stars`}
        style={{
          whiteSpace: "nowrap",
          letterSpacing: "2px",
          fontSize: `${size}px`,
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= roundedRating ? "★" : "☆"}
          </span>
        ))}
      </span>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (!land) {
    return (
      <>
        <Navbar />

        <div
          style={{
            minHeight: "100vh",
            background: "#F4F7F8",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "50px",
              borderRadius: "20px",
              boxShadow:
                "0 12px 35px rgba(0,0,0,.15)",
              textAlign: "center",
              width: "360px",
            }}
          >
            <h1
              style={{
                color: "#2E7D32",
                marginBottom: "10px",
              }}
            >
              🌾
            </h1>

            <h2
              style={{
                color: "#2E7D32",
                marginBottom: "10px",
              }}
            >
              🌾 Loading Land Details...
            </h2>

            <p
              style={{
                color: "#666",
                marginBottom: 0,
              }}
            >
              Please wait while we load the
              property.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Only the owner should see image deletion buttons.
  const isLandOwner =
    currentUserId ===
    Number(land.owner_id);

  const isBuyer =
    currentRole === "buyer";

  const isFarmer =
    currentRole === "farmer";

  const isOwnLand =
    isLandOwner;

  const isApproved =
    land.status === "approved";

  const availabilityStatus =
    availability?.status ||
    "available";

  const isAvailable =
    availabilityStatus ===
    "available";

  const isReserved =
    availabilityStatus ===
    "reserved";

  const isSold =
    availabilityStatus ===
    "sold";

  return (
    <>
      <Navbar />

      <div
        style={{
          maxWidth: "1200px",
          margin: "40px auto",
          background: "#fff",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow:
            "0 10px 30px rgba(0,0,0,.15)",
        }}
      >
        {/* =====================================================
            PRIMARY LAND IMAGE
        ====================================================== */}

        {land.image_url && (
          <img
            src={land.image_url}
            alt={land.title}
            style={{
              width: "100%",
              height: "520px",
              objectFit: "cover",
            }}
          />
        )}

        <div
          style={{
            padding: "35px",
            paddingBottom: "10px",
          }}
        >
          {/* =====================================================
              LAND TITLE
          ====================================================== */}

          <h1
            style={{
              margin: 0,
              fontSize: "40px",
              color: "#2E7D32",
            }}
          >
            🌾 {land.title}
          </h1>

          {/* =====================================================
              PHASE 6 - LISTING VIEWS
          ====================================================== */}

          <div
            style={{
              marginTop: "10px",
              color: "#6B7280",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            👁️ {Number(land.view_count || 0)}{" "}
            {Number(land.view_count || 0) === 1
              ? "view"
              : "views"}
          </div>

          {/* =====================================================
              PRICE
          ====================================================== */}

          <div
            style={{
              marginTop: "20px",
              display: "inline-block",
              background: "#E8F5E9",
              color: "#2E7D32",
              padding: "12px 25px",
              borderRadius: "30px",
              fontWeight: "bold",
              fontSize: "30px",
            }}
          >
            💰 ₹ {land.price}
          </div>

          {/* =====================================================
              AVAILABILITY
          ====================================================== */}

          <div
            style={{
              marginTop: "20px",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                ...availabilityBadgeStyle(
                  availabilityStatus
                ),
              }}
            >
              {availabilityStatus ===
                "available" &&
                "🟢 Available"}

              {availabilityStatus ===
                "reserved" &&
                "🟠 Reserved"}

              {availabilityStatus ===
                "sold" &&
                "🔴 Sold"}
            </span>

            {!isApproved && (
              <span
                style={{
                  background: "#FFF3E0",
                  color: "#EF6C00",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                }}
              >
                ⏳ {land.status}
              </span>
            )}
          </div>

          {/* =====================================================
              LAND BADGES
          ====================================================== */}

          <div
            style={{
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
              marginTop: "25px",
              marginBottom: "35px",
            }}
          >
            <span style={badgeStyle}>
              🌱 {land.crop_type}
            </span>

            <span style={badgeStyle}>
              📏 {land.area} Acres
            </span>

            <span style={badgeStyle}>
              🌍 {land.soil_type}
            </span>

            <span style={badgeStyle}>
              💧 {land.water_source}
            </span>
          </div>

          {/* =====================================================
              PHASE 1 - BUYER ACTIONS
          ====================================================== */}

          {isBuyer &&
            !isOwnLand &&
            isApproved &&
            isAvailable && (
              <div
                style={{
                  background:
                    "linear-gradient(135deg,#F1F8E9,#FFFFFF)",
                  padding: "25px",
                  marginTop: "10px",
                  marginBottom: "30px",
                  borderRadius: "16px",
                  border:
                    "1px solid #C8E6C9",
                  boxShadow:
                    "0 5px 18px rgba(0,0,0,.08)",
                }}
              >
                <h2
                  style={{
                    color: "#2E7D32",
                    marginTop: 0,
                    marginBottom: "10px",
                  }}
                >
                  🤝 Interested in this land?
                </h2>

                <p
                  style={{
                    color: "#666",
                    marginBottom: "25px",
                  }}
                >
                  Contact the farmer, send an
                  inquiry, make an offer, or
                  request a site visit.
                </p>

                {/* INQUIRY */}

                <div
                  style={{
                    background: "#fff",
                    padding: "20px",
                    borderRadius: "12px",
                    marginBottom: "18px",
                    border:
                      "1px solid #eee",
                  }}
                >
                  <h3
                    style={{
                      color: "#2E7D32",
                      marginTop: 0,
                    }}
                  >
                    💬 Send Inquiry
                  </h3>

                  <textarea
                    value={inquiryMessage}
                    onChange={(event) =>
                      setInquiryMessage(
                        event.target.value
                      )
                    }
                    placeholder="Write a message to the farmer..."
                    maxLength={1000}
                    rows={4}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "8px",
                      resize: "vertical",
                      fontFamily:
                        "inherit",
                    }}
                  />

                  <button
                    onClick={sendInquiry}
                    disabled={
                      marketplaceLoading ||
                      spamCooldowns.inquiry > 0
                    }
                    style={{
                      marginTop: "12px",
                      background: "#2E7D32",
                      color: "#fff",
                      padding:
                        "11px 22px",
                      border: "none",
                      borderRadius: "8px",
                      cursor:
                        marketplaceLoading
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                      opacity:
                        marketplaceLoading
                          ? 0.7
                          : 1,
                    }}
                  >
                    {marketplaceLoading
                      ? "Sending..."
                      : spamCooldowns.inquiry > 0
                      ? `Wait ${formatCooldown(
                          spamCooldowns.inquiry
                        )}`
                      : "Send Inquiry"}
                  </button>
                </div>

                {/* OFFER */}

                <div
                  style={{
                    background: "#fff",
                    padding: "20px",
                    borderRadius: "12px",
                    marginBottom: "18px",
                    border:
                      "1px solid #eee",
                  }}
                >
                  <h3
                    style={{
                      color: "#1565C0",
                      marginTop: 0,
                    }}
                  >
                    💰 Make an Offer
                  </h3>

                  <input
                    type="number"
                    min="1"
                    value={offerAmount}
                    onChange={(event) =>
                      setOfferAmount(
                        event.target.value
                      )
                    }
                    placeholder="Offer amount (₹)"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "8px",
                      marginBottom: "10px",
                    }}
                  />

                  <textarea
                    value={offerMessage}
                    onChange={(event) =>
                      setOfferMessage(
                        event.target.value
                      )
                    }
                    placeholder="Optional message..."
                    maxLength={1000}
                    rows={3}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "8px",
                      resize: "vertical",
                      fontFamily:
                        "inherit",
                    }}
                  />

                  <button
                    onClick={makeOffer}
                    disabled={
                      marketplaceLoading ||
                      spamCooldowns.offer > 0
                    }
                    style={{
                      marginTop: "12px",
                      background: "#1565C0",
                      color: "#fff",
                      padding:
                        "11px 22px",
                      border: "none",
                      borderRadius: "8px",
                      cursor:
                        marketplaceLoading
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                      opacity:
                        marketplaceLoading
                          ? 0.7
                          : 1,
                    }}
                  >
                    {marketplaceLoading
                      ? "Submitting..."
                      : spamCooldowns.offer > 0
                      ? `Wait ${formatCooldown(
                          spamCooldowns.offer
                        )}`
                      : "Submit Offer"}
                  </button>
                </div>

                {/* SITE VISIT */}

                <div
                  style={{
                    background: "#fff",
                    padding: "20px",
                    borderRadius: "12px",
                    border:
                      "1px solid #eee",
                  }}
                >
                  <h3
                    style={{
                      color: "#EF6C00",
                      marginTop: 0,
                    }}
                  >
                    📅 Request Site Visit
                  </h3>

                  <input
                    type="datetime-local"
                    value={visitDate}
                    onChange={(event) =>
                      setVisitDate(
                        event.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "8px",
                      marginBottom: "10px",
                    }}
                  />

                  <textarea
                    value={visitMessage}
                    onChange={(event) =>
                      setVisitMessage(
                        event.target.value
                      )
                    }
                    placeholder="Optional message..."
                    maxLength={1000}
                    rows={3}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "12px",
                      border:
                        "1px solid #ccc",
                      borderRadius: "8px",
                      resize: "vertical",
                      fontFamily:
                        "inherit",
                    }}
                  />

                  <button
                    onClick={
                      requestSiteVisit
                    }
                    disabled={
                      marketplaceLoading ||
                      spamCooldowns.siteVisit > 0
                    }
                    style={{
                      marginTop: "12px",
                      background: "#EF6C00",
                      color: "#fff",
                      padding:
                        "11px 22px",
                      border: "none",
                      borderRadius: "8px",
                      cursor:
                        marketplaceLoading
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                      opacity:
                        marketplaceLoading
                          ? 0.7
                          : 1,
                    }}
                  >
                    {marketplaceLoading
                      ? "Submitting..."
                      : spamCooldowns.siteVisit > 0
                      ? `Wait ${formatCooldown(
                          spamCooldowns.siteVisit
                        )}`
                      : "Request Site Visit"}
                  </button>
                </div>
              </div>
            )}

          {/* =====================================================
              RESERVED / SOLD MESSAGE FOR BUYER
          ====================================================== */}

          {isBuyer &&
            !isOwnLand &&
            isApproved &&
            (isReserved || isSold) && (
              <div
                style={{
                  background:
                    isSold
                      ? "#FFEBEE"
                      : "#FFF3E0",
                  color:
                    isSold
                      ? "#C62828"
                      : "#EF6C00",
                  padding: "18px 20px",
                  borderRadius: "12px",
                  marginBottom: "30px",
                  fontWeight: "600",
                }}
              >
                {isSold
                  ? "🔴 This land has already been sold."
                  : "🟠 This land is currently reserved."}
              </div>
            )}

          {/* =====================================================
              FARMER - AVAILABILITY CONTROL
          ====================================================== */}

          {isFarmer &&
            isOwnLand &&
            isApproved && (
              <FarmerAvailability
                land={land}
                availabilityStatus={
                  availabilityStatus
                }
                marketplaceLoading={
                  marketplaceLoading
                }
                onUpdated={async () => {
                  await fetchAvailability(
                    land.id
                  );
                }}
                setMarketplaceLoading={
                  setMarketplaceLoading
                }
              />
            )}

          {/* =====================================================
              IMAGE GALLERY
          ====================================================== */}

          {land.images &&
            land.images.length > 0 && (
              <div
                style={{
                  background: "#FFFFFF",
                  padding: "25px",
                  marginTop: "20px",
                  borderRadius: "15px",
                  boxShadow:
                    "0 5px 20px rgba(0,0,0,.08)",
                }}
              >
                <h2
                  style={{
                    color: "#2E7D32",
                    marginBottom: "20px",
                  }}
                >
                  🖼️ Land Image Gallery
                </h2>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {land.images.map(
                    (image) => (
                      <div
                        key={image.id}
                        style={{
                          background:
                            "#f5f5f5",
                          borderRadius:
                            "12px",
                          padding: "10px",
                          boxShadow:
                            "0 3px 10px rgba(0,0,0,0.12)",
                        }}
                      >
                        <img
                          src={
                            image.image_url
                          }
                          alt={`${land.title} ${image.id}`}
                          style={{
                            width: "100%",
                            height: "220px",
                            objectFit: "cover",
                            borderRadius:
                              "8px",
                          }}
                        />

                        {isLandOwner && (
                          <button
                            onClick={() =>
                              deleteImage(
                                image.id
                              )
                            }
                            disabled={
                              deletingImageId ===
                              image.id
                            }
                            style={{
                              width: "100%",
                              marginTop:
                                "10px",
                              padding: "10px",
                              background:
                                deletingImageId ===
                                image.id
                                  ? "#999"
                                  : "#D32F2F",
                              color: "white",
                              border: "none",
                              borderRadius:
                                "6px",
                              cursor:
                                deletingImageId ===
                                image.id
                                  ? "not-allowed"
                                  : "pointer",
                              fontWeight:
                                "bold",
                            }}
                          >
                            {deletingImageId ===
                            image.id
                              ? "Deleting..."
                              : "🗑️ Delete Image"}
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          {/* =====================================================
              PROPERTY INFORMATION
          ====================================================== */}

          <div
            style={{
              background: "#FFFFFF",
              padding: "25px",
              marginTop: "30px",
              borderRadius: "15px",
              boxShadow:
                "0 5px 20px rgba(0,0,0,.08)",
              lineHeight: "30px",
            }}
          >
            <h2
              style={{
                color: "#2E7D32",
                marginBottom: "20px",
              }}
            >
              📋 Property Information
            </h2>

            <p>
              <strong>
                📝 Description:
              </strong>{" "}
              {land.description}
            </p>

            <p>
              <strong>📏 Area:</strong>{" "}
              {land.area} Acres
            </p>

            <p>
              <strong>
                🌱 Crop Type:
              </strong>{" "}
              {land.crop_type}
            </p>

            <p>
              <strong>
                🌍 Soil Type:
              </strong>{" "}
              {land.soil_type}
            </p>

            <p>
              <strong>
                💧 Water Source:
              </strong>{" "}
              {land.water_source}
            </p>

            <hr />

            <p>
              <strong>
                📍 Village:
              </strong>{" "}
              {land.village}
            </p>

            <p>
              <strong>
                🏛 Mandal:
              </strong>{" "}
              {land.mandal}
            </p>

            <p>
              <strong>
                🏙 District:
              </strong>{" "}
              {land.district}
            </p>

            <p>
              <strong>
                🌎 State:
              </strong>{" "}
              {land.state}
            </p>

            <p>
              <strong>
                📮 Pincode:
              </strong>{" "}
              {land.pincode}
            </p>

            <p>
              <strong>
                📑 Survey Number:
              </strong>{" "}
              {land.survey_number}
            </p>
          </div>

          {/* =====================================================
              LAND LOCATION
          ====================================================== */}

          <div
            style={{
              background: "#FFFFFF",
              marginTop: "30px",
              padding: "25px",
              borderRadius: "15px",
              boxShadow:
                "0 5px 20px rgba(0,0,0,.08)",
            }}
          >
            <h2
              style={{
                color: "#2E7D32",
                marginBottom: "20px",
              }}
            >
              📍 Land Location
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "15px",
                marginBottom: "20px",
              }}
            >
              <div>
                <strong>Latitude</strong>
                <br />
                {land.latitude}
              </div>

              <div>
                <strong>Longitude</strong>
                <br />
                {land.longitude}
              </div>
            </div>

            {land.latitude &&
              land.longitude && (
                <>
                  <LandMap
                    latitude={Number(
                      land.latitude
                    )}
                    longitude={Number(
                      land.longitude
                    )}
                    title={land.title}
                  />

                  <div
                    style={{
                      marginTop: "20px",
                    }}
                  >
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${land.latitude},${land.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display:
                          "inline-block",
                        background:
                          "#1976D2",
                        color: "#fff",
                        padding:
                          "12px 24px",
                        borderRadius: "8px",
                        textDecoration:
                          "none",
                        fontWeight:
                          "bold",
                      }}
                    >
                      🧭 Get Directions
                    </a>
                  </div>
                </>
              )}
          </div>

          {/* =====================================================
              SELLER INFORMATION
          ====================================================== */}

          <div
            style={{
              background: "#FFFFFF",
              marginTop: "30px",
              padding: "25px",
              borderRadius: "15px",
              boxShadow:
                "0 5px 20px rgba(0,0,0,.08)",
            }}
          >
            <h2
              style={{
                color: "#2E7D32",
                marginBottom: "20px",
              }}
            >
              👤 Seller Information
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "20px",
                marginBottom: "25px",
              }}
            >
              <div>
                <strong>
                  Seller Name
                </strong>
                <br />
                {land.owner_name}
              </div>

              <div>
                <strong>
                  Mobile Number
                </strong>
                <br />
                {land.owner_mobile}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(160px,1fr))",
                gap: "15px",
              }}
            >
              {/* Call */}

              <a
                href={`tel:${land.owner_mobile}`}
                style={{
                  background: "#2E7D32",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  textDecoration:
                    "none",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                📞 Call
              </a>

              {/* WhatsApp */}

              <a
                href={`https://wa.me/91${land.owner_mobile}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#25D366",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: "8px",
                  textDecoration:
                    "none",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                💬 WhatsApp
              </a>

              {/* Chat */}

              <button
                onClick={startChat}
                style={{
                  background: "#1976D2",
                  color: "#fff",
                  padding: "12px 20px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                💬 Chat
              </button>

              {/* Favorite */}

              <button
                onClick={toggleFavorite}
                disabled={
                  favoriteLoading
                }
                style={{
                  background:
                    isFavorite
                      ? "#757575"
                      : "#E91E63",
                  color: "#fff",
                  padding: "12px 20px",
                  border: "none",
                  borderRadius: "8px",
                  cursor:
                    favoriteLoading
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "bold",
                  opacity:
                    favoriteLoading
                      ? 0.7
                      : 1,
                }}
              >
                {favoriteLoading
                  ? "Updating..."
                  : isFavorite
                  ? "💔 Remove Favorite"
                  : "❤️ Favorite"}
              </button>

              {/* Share */}

              <button
                onClick={() => {
                  if (
                    navigator.share
                  ) {
                    navigator.share({
                      title:
                        land.title,
                      text:
                        land.description,
                      url:
                        window.location
                          .href,
                    });
                  }

                  try {
                    navigator.clipboard.writeText(
                      window.location.href
                    );

                    alert(
                      "Link copied!"
                    );
                  } catch {
                    alert(
                      "Sharing is not supported."
                    );
                  }
                }}
                style={{
                  background: "#FF9800",
                  color: "#fff",
                  padding: "12px 20px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                📤 Share
              </button>
            </div>
          </div>

          {/* =====================================================
              PHASE 6 - REVIEWS & RATINGS
          ====================================================== */}

          {!isOwnLand && (
            <div
              style={{
                marginTop: "30px",
                background: "#FFFFFF",
                padding: "25px",
                borderRadius: "15px",
                boxShadow:
                  "0 5px 20px rgba(0,0,0,.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "15px",
                  flexWrap: "wrap",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2
                    style={{
                      color: "#2E7D32",
                      marginTop: 0,
                      marginBottom: "8px",
                    }}
                  >
                    ⭐ Farmer Ratings & Reviews
                  </h2>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    {renderStars(
                      reviewSummary.average_rating,
                      24
                    )}

                    <strong
                      style={{
                        fontSize: "22px",
                        color: "#333",
                      }}
                    >
                      {reviewSummary.average_rating > 0
                        ? reviewSummary.average_rating.toFixed(1)
                        : "No rating yet"}
                    </strong>

                    <span
                      style={{
                        color: "#666",
                      }}
                    >
                      ({reviewSummary.total_reviews}{" "}
                      {reviewSummary.total_reviews === 1
                        ? "review"
                        : "reviews"})
                    </span>
                  </div>
                </div>

                {currentRole === "buyer" &&
                  Number(currentUserId) !==
                    Number(land.owner_id) &&
                  reviewEligibility?.eligible && (
                    <button
                      type="button"
                      onClick={() =>
                        setShowReviewForm(
                          (previous) => !previous
                        )
                      }
                      style={{
                        background: "#2E7D32",
                        color: "#fff",
                        padding: "11px 20px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      ⭐{" "}
                      {showReviewForm
                        ? "Close Review"
                        : "Write a Review"}
                    </button>
                  )}
              </div>

              {currentRole === "buyer" &&
                Number(currentUserId) !==
                  Number(land.owner_id) &&
                reviewEligibility &&
                !reviewEligibility.eligible && (
                  <div
                    style={{
                      background: "#F5F5F5",
                      color: "#666",
                      padding: "12px 15px",
                      borderRadius: "8px",
                      marginBottom: "18px",
                    }}
                  >
                    ℹ️{" "}
                    {reviewEligibility.reason ||
                      "You can review this farmer after completing a site visit."}
                  </div>
                )}

              {showReviewForm &&
                reviewEligibility?.eligible && (
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg,#F1F8E9,#FFFFFF)",
                      padding: "20px",
                      borderRadius: "12px",
                      border:
                        "1px solid #C8E6C9",
                      marginBottom: "22px",
                    }}
                  >
                    <h3
                      style={{
                        color: "#2E7D32",
                        marginTop: 0,
                      }}
                    >
                      Write Your Review
                    </h3>

                    <p
                      style={{
                        marginBottom: "8px",
                        fontWeight: "600",
                      }}
                    >
                      Your Rating
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: "5px",
                        marginBottom: "18px",
                      }}
                    >
                      {[1, 2, 3, 4, 5].map(
                        (star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setReviewRating(star)
                            }
                            aria-label={`Rate ${star} out of 5`}
                            style={{
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              fontSize: "32px",
                              lineHeight: 1,
                              padding: "2px",
                              color:
                                star <= reviewRating
                                  ? "#F9A825"
                                  : "#BDBDBD",
                            }}
                          >
                            {star <= reviewRating
                              ? "★"
                              : "☆"}
                          </button>
                        )
                      )}
                    </div>

                    <textarea
                      value={reviewComment}
                      onChange={(event) =>
                        setReviewComment(
                          event.target.value
                        )
                      }
                      maxLength={2000}
                      rows={5}
                      placeholder="Share your experience with this farmer..."
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "12px",
                        border:
                          "1px solid #ccc",
                        borderRadius: "8px",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "10px",
                      }}
                    >
                      <span
                        style={{
                          color: "#777",
                          fontSize: "13px",
                        }}
                      >
                        {reviewComment.length}/2000
                      </span>

                      <button
                        type="button"
                        onClick={submitReview}
                        disabled={reviewLoading}
                        style={{
                          background:
                            reviewLoading
                              ? "#999"
                              : "#2E7D32",
                          color: "#fff",
                          padding:
                            "11px 22px",
                          border: "none",
                          borderRadius: "8px",
                          cursor:
                            reviewLoading
                              ? "not-allowed"
                              : "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        {reviewLoading
                          ? "Submitting..."
                          : "⭐ Submit Review"}
                      </button>
                    </div>
                  </div>
                )}

              {reviewError && (
                <div
                  style={{
                    background: "#FFF8F8",
                    color: "#C62828",
                    padding: "12px 15px",
                    borderRadius: "8px",
                    marginBottom: "18px",
                  }}
                >
                  {reviewError}
                </div>
              )}

              {reviewsLoading ? (
                <p
                  style={{
                    color: "#666",
                  }}
                >
                  Loading reviews...
                </p>
              ) : reviews.length === 0 ? (
                <div
                  style={{
                    background: "#F8FBF8",
                    padding: "18px",
                    borderRadius: "10px",
                    color: "#666",
                  }}
                >
                  No published reviews yet. Be the first
                  eligible buyer to review this farmer.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "15px",
                  }}
                >
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      style={{
                        border:
                          "1px solid #E0E0E0",
                        borderRadius: "10px",
                        padding: "18px",
                        background: "#FAFAFA",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "flex-start",
                          gap: "15px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color: "#333",
                            }}
                          >
                            {review.reviewer_name ||
                              "Marketplace User"}
                          </strong>

                          <div
                            style={{
                              marginTop: "5px",
                            }}
                          >
                            {renderStars(
                              review.rating,
                              18
                            )}
                          </div>
                        </div>

                        {review.created_at && (
                          <span
                            style={{
                              color: "#888",
                              fontSize: "13px",
                            }}
                          >
                            {new Date(
                              review.created_at
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </span>
                        )}
                      </div>

                      {review.comment && (
                        <p
                          style={{
                            marginBottom: 0,
                            marginTop: "12px",
                            color: "#555",
                            lineHeight: "24px",
                          }}
                        >
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =====================================================
              PHASE 2 - REPORT LAND
          ====================================================== */}

          {!isOwnLand &&
            isApproved && (
              <div
                style={{
                  marginTop: "30px",
                  background: "#FFF8F8",
                  padding: "25px",
                  borderRadius: "15px",
                  border: "1px solid #FFCDD2",
                  boxShadow:
                    "0 5px 20px rgba(0,0,0,.06)",
                }}
              >
                <h2
                  style={{
                    color: "#C62828",
                    marginTop: 0,
                    marginBottom: "10px",
                  }}
                >
                  🚩 Report This Land
                </h2>

                <p
                  style={{
                    color: "#666",
                    marginBottom: "20px",
                  }}
                >
                  If you believe this listing contains
                  incorrect, misleading, or inappropriate
                  information, you can report it for admin review.
                </p>

                <input
                  type="text"
                  value={reportReason}
                  onChange={(event) =>
                    setReportReason(event.target.value)
                  }
                  maxLength={100}
                  placeholder="Reason for reporting"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    marginBottom: "10px",
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
                  placeholder="Additional details (optional)"
                  rows={4}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />

                <button
                  onClick={reportLand}
                  disabled={reportLoading}
                  style={{
                    marginTop: "12px",
                    background: reportLoading
                      ? "#999"
                      : "#C62828",
                    color: "#fff",
                    padding: "11px 22px",
                    border: "none",
                    borderRadius: "8px",
                    cursor: reportLoading
                      ? "not-allowed"
                      : "pointer",
                    fontWeight: "bold",
                    opacity: reportLoading
                      ? 0.7
                      : 1,
                  }}
                >
                  {reportLoading
                    ? "Submitting..."
                    : "🚩 Submit Report"}
                </button>
              </div>
            )}

          {/* =====================================================
              PHASE 3 - SIMILAR LANDS
          ====================================================== */}

          {isBuyer &&
            isApproved &&
            similarLands.length > 0 && (
              <div
                style={{
                  marginTop: "30px",
                  background: "#F8FBF8",
                  padding: "25px",
                  borderRadius: "15px",
                  border: "1px solid #C8E6C9",
                  boxShadow:
                    "0 5px 20px rgba(0,0,0,.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                    flexWrap: "wrap",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        color: "#2E7D32",
                        marginTop: 0,
                        marginBottom: "6px",
                      }}
                    >
                      🌾 Similar Lands
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color: "#666",
                      }}
                    >
                      Other farmland listings that may
                      be similar to this property.
                    </p>
                  </div>

                  {similarLandsLoading && (
                    <span
                      style={{
                        color: "#2E7D32",
                        fontWeight: "600",
                      }}
                    >
                      Loading...
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "20px",
                  }}
                >
                  {similarLands.map((similarLand) => (
                    <div
                      key={similarLand.id}
                      style={{
                        background: "#fff",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "1px solid #E0E0E0",
                        boxShadow:
                          "0 4px 14px rgba(0,0,0,.08)",
                      }}
                    >
                      {similarLand.image_url ? (
                        <img
                          src={similarLand.image_url}
                          alt={similarLand.title}
                          style={{
                            width: "100%",
                            height: "180px",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "180px",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            background: "#E8F5E9",
                            color: "#2E7D32",
                            fontSize: "48px",
                          }}
                        >
                          🌾
                        </div>
                      )}

                      <div
                        style={{
                          padding: "18px",
                        }}
                      >
                        <h3
                          style={{
                            marginTop: 0,
                            marginBottom: "10px",
                            color: "#2E7D32",
                            fontSize: "20px",
                          }}
                        >
                          {similarLand.title}
                        </h3>

                        <div
                          style={{
                            color: "#333",
                            lineHeight: "26px",
                            fontSize: "14px",
                          }}
                        >
                          <div>
                            <strong>💰 Price:</strong>{" "}
                            ₹
                            {Number(
                              similarLand.price
                            ).toLocaleString("en-IN")}
                          </div>

                          <div>
                            <strong>📏 Area:</strong>{" "}
                            {similarLand.area} Acres
                          </div>

                          <div>
                            <strong>🌱 Crop:</strong>{" "}
                            {similarLand.crop_type}
                          </div>

                          <div>
                            <strong>🌍 Soil:</strong>{" "}
                            {similarLand.soil_type}
                          </div>

                          <div>
                            <strong>📍 Location:</strong>{" "}
                            {similarLand.village},{" "}
                            {similarLand.district}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/land/${similarLand.id}`
                            )
                          }
                          style={{
                            width: "100%",
                            marginTop: "15px",
                            background: "#2E7D32",
                            color: "#fff",
                            padding: "11px 18px",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* =====================================================
              MARKETPLACE ACTIVITY
          ====================================================== */}

          {(isBuyer ||
            isFarmer) && (
            <div
              style={{
                marginTop: "25px",
                display: "flex",
                justifyContent:
                  "center",
              }}
            >
              <button
                onClick={() =>
                  navigate(
                    "/marketplace-activity"
                  )
                }
                style={{
                  background:
                    "#6A1B9A",
                  color: "#fff",
                  padding:
                    "13px 25px",
                  border: "none",
                  borderRadius:
                    "10px",
                  cursor: "pointer",
                  fontWeight:
                    "bold",
                  fontSize: "15px",
                }}
              >
                🤝 View Marketplace Activity
              </button>
            </div>
          )}

          {/* =====================================================
              BACK
          ====================================================== */}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginTop: "35px",
              flexWrap: "wrap",
              gap: "15px",
            }}
          >
            <button
              onClick={() =>
                navigate("/all-lands")
              }
              style={{
                background: "#424242",
                color: "#fff",
                padding: "14px 28px",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              ⬅ Back to Marketplace
            </button>

            <div
              style={{
                color: "#666",
                fontSize: "14px",
              }}
            >
              🌾 Thank you for using
              Farmland Marketplace
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


// =========================================================
// FARMER AVAILABILITY COMPONENT
// =========================================================

function FarmerAvailability({
  land,
  availabilityStatus,
  marketplaceLoading,
  onUpdated,
  setMarketplaceLoading,
}) {
  const updateAvailability = async (
    newStatus
  ) => {
    if (
      availabilityStatus === "reserved" &&
      newStatus === "available"
    ) {
      const confirmed = window.confirm(
        "This land is currently reserved. Are you sure you want to make it available again?"
      );

      if (!confirmed) {
        return;
      }
    }

    if (
      availabilityStatus === "sold" &&
      newStatus !== "sold"
    ) {
      alert(
        "Sold land cannot be reopened directly."
      );
      return;
    }

    try {
      setMarketplaceLoading(true);

      await api.put(
        `/marketplace/lands/${land.id}/availability`,
        {
          land_id: land.id,
          status: newStatus,
        }
      );

      alert(
        `Land marked as ${newStatus}.`
      );

      await onUpdated();
    } catch (error) {
      console.error(
        "Failed to update availability:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Unable to update land availability."
      );
    } finally {
      setMarketplaceLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#F5F7FA",
        padding: "22px",
        marginTop: "10px",
        marginBottom: "30px",
        borderRadius: "15px",
        border: "1px solid #ddd",
      }}
    >
      <h2
        style={{
          color: "#2E7D32",
          marginTop: 0,
        }}
      >
        🏷️ Land Availability
      </h2>

      <p
        style={{
          color: "#666",
        }}
      >
        Current marketplace status:
        {" "}
        <strong>
          {availabilityStatus}
        </strong>
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <button
          disabled={
            marketplaceLoading ||
            availabilityStatus ===
              "available"
          }
          onClick={() =>
            updateAvailability(
              "available"
            )
          }
          style={{
            background: "#2E7D32",
            color: "#fff",
            padding:
              "10px 18px",
            border: "none",
            borderRadius: "8px",
            cursor:
              marketplaceLoading
                ? "not-allowed"
                : "pointer",
            fontWeight: "bold",
            opacity:
              marketplaceLoading ||
              availabilityStatus ===
                "available"
                ? 0.6
                : 1,
          }}
        >
          🟢 Available
        </button>

        <button
          disabled={
            marketplaceLoading ||
            availabilityStatus ===
              "reserved"
          }
          onClick={() =>
            updateAvailability(
              "reserved"
            )
          }
          style={{
            background: "#EF6C00",
            color: "#fff",
            padding:
              "10px 18px",
            border: "none",
            borderRadius: "8px",
            cursor:
              marketplaceLoading
                ? "not-allowed"
                : "pointer",
            fontWeight: "bold",
            opacity:
              marketplaceLoading ||
              availabilityStatus ===
                "reserved"
                ? 0.6
                : 1,
          }}
        >
          🟠 Reserved
        </button>

        <button
          disabled={
            marketplaceLoading ||
            availabilityStatus ===
              "sold"
          }
          onClick={() =>
            updateAvailability(
              "sold"
            )
          }
          style={{
            background: "#C62828",
            color: "#fff",
            padding:
              "10px 18px",
            border: "none",
            borderRadius: "8px",
            cursor:
              marketplaceLoading
                ? "not-allowed"
                : "pointer",
            fontWeight: "bold",
            opacity:
              marketplaceLoading ||
              availabilityStatus ===
                "sold"
                ? 0.6
                : 1,
          }}
        >
          🔴 Sold
        </button>
      </div>

      {availabilityStatus ===
        "sold" && (
        <p
          style={{
            marginBottom: 0,
            marginTop: "15px",
            color: "#C62828",
            fontWeight: "600",
          }}
        >
          A sold listing cannot be
          reopened directly.
        </p>
      )}
    </div>
  );
}


// =========================================================
// STYLES
// =========================================================

const badgeStyle = {
  background: "#E8F5E9",
  color: "#2E7D32",
  padding: "8px 18px",
  borderRadius: "25px",
  fontWeight: "bold",
  fontSize: "16px",
};


const availabilityBadgeStyle = (
  status
) => {
  if (status === "sold") {
    return {
      background: "#FFEBEE",
      color: "#C62828",
      padding: "9px 18px",
      borderRadius: "22px",
      fontWeight: "bold",
    };
  }

  if (status === "reserved") {
    return {
      background: "#FFF3E0",
      color: "#EF6C00",
      padding: "9px 18px",
      borderRadius: "22px",
      fontWeight: "bold",
    };
  }

  return {
    background: "#E8F5E9",
    color: "#2E7D32",
    padding: "9px 18px",
    borderRadius: "22px",
    fontWeight: "bold",
  };
};


export default LandDetails;