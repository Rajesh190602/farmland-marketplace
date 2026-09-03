import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import api from "../services/api";

function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =========================================================
  // FARMER RATING & REVIEWS
  // =========================================================

  const [ratingSummary, setRatingSummary] = useState({
    average_rating: 0,
    total_reviews: 0,
  });
  const [receivedReviews, setReceivedReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchUserRating = async (userId) => {
    if (!userId) {
      return;
    }

    setReviewsLoading(true);

    try {
      const [summaryResponse, reviewsResponse] = await Promise.all([
        api.get(`/reviews/user/${userId}/summary`),
        api.get(`/reviews/user/${userId}`),
      ]);

      setRatingSummary({
        average_rating: Number(
          summaryResponse.data?.average_rating || 0
        ),
        total_reviews: Number(
          summaryResponse.data?.total_reviews || 0
        ),
      });

      setReceivedReviews(
        Array.isArray(reviewsResponse.data)
          ? reviewsResponse.data
          : []
      );
    } catch (error) {
      console.error("Buyer/Farmer Rating Load Error:", error);

      // Rating data must not prevent the normal profile page
      // from loading or functioning.
      setRatingSummary({
        average_rating: 0,
        total_reviews: 0,
      });
      setReceivedReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const renderRatingStars = (rating) => {
    const roundedRating = Math.round(Number(rating) || 0);

    return (
      <span
        aria-label={`${rating} out of 5 stars`}
        style={styles.ratingStars}
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
  // LOAD PROFILE
  // =========================================================

  const fetchProfile = async () => {
    try {
      const response = await api.get("/users/profile");
      setUser(response.data);

      if (
        response.data?.role === "farmer" ||
        response.data?.role === "buyer"
      ) {
        await fetchUserRating(response.data.id);
      }

      localStorage.setItem(
        "user",
        JSON.stringify(response.data)
      );
    } catch (error) {
      console.error("Profile Load Error:", error);
      setErrorMessage("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UPDATE PROFILE
  // =========================================================

  const updateProfile = async () => {
    setMessage("");
    setErrorMessage("");

    const fullName = user?.full_name?.trim() || "";
    const mobile = user?.mobile?.trim() || "";

    if (!fullName) {
      setErrorMessage("Full Name is required.");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      setErrorMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.put("/users/profile", {
        full_name: fullName,
        mobile: mobile,
      });

      const updatedUser = response.data.user;

      setUser((previous) => ({
        ...previous,
        ...updatedUser,
      }));

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          ...updatedUser,
        })
      );

      setMessage("Profile updated successfully.");
    } catch (error) {
      console.error("Profile Update Error:", error);

      setErrorMessage(
        error.response?.data?.detail ||
          "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // PROFILE PHOTO
  // =========================================================

  const selectPhoto = () => {
    if (!uploadingPhoto && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const uploadProfilePhoto = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    // Frontend validation
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    // 5 MB maximum
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        "Profile photo must be smaller than 5 MB."
      );
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingPhoto(true);

    try {
      const response = await api.post(
        "/users/profile/photo",
        formData
      );

      const profileImage =
        response.data.profile_image;

      setUser((previous) => ({
        ...previous,
        profile_image: profileImage,
      }));

      const updatedUser = {
        ...user,
        profile_image: profileImage,
      };

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setMessage("Profile photo updated successfully.");
    } catch (error) {
      console.error(
        "Profile Photo Upload Error:",
        error
      );

      setErrorMessage(
        error.response?.data?.detail ||
          "Failed to upload profile photo."
      );
    } finally {
      setUploadingPhoto(false);

      // Allow selecting the same file again
      event.target.value = "";
    }
  };

  // =========================================================
  // INITIAL AVATAR
  // =========================================================

  const getInitials = () => {
    const name = user?.full_name?.trim();

    if (!name) {
      return "U";
    }

    const words = name.split(/\s+/);

    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }

    return (
      words[0].charAt(0) +
      words[words.length - 1].charAt(0)
    ).toUpperCase();
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <>
        <Navbar />

        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>
            Loading your profile...
          </p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />

        <div style={styles.loadingContainer}>
          <div style={styles.errorCard}>
            <h3>Unable to load profile</h3>

            <button
              onClick={fetchProfile}
              style={styles.primaryButton}
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main style={styles.page}>
        <div style={styles.container}>

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div style={styles.pageHeader}>
            <div>
              <h1 style={styles.pageTitle}>
                My Profile
              </h1>

              <p style={styles.pageSubtitle}>
                Manage your personal information and
                account settings.
              </p>
            </div>
          </div>

          {/* =================================================
              SUCCESS / ERROR MESSAGE
          ================================================= */}

          {message && (
            <div style={styles.successMessage}>
              ✓ {message}
            </div>
          )}

          {errorMessage && (
            <div style={styles.errorMessage}>
              ⚠ {errorMessage}
            </div>
          )}

          {/* =================================================
              PROFILE HEADER CARD
          ================================================= */}

          <section style={styles.profileCard}>

            <div style={styles.profileHeader}>

              {/* PROFILE PHOTO */}

              <div style={styles.photoSection}>
                <div style={styles.avatarWrapper}>

                  {user.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt="Profile"
                      style={styles.avatarImage}
                    />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {getInitials()}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={selectPhoto}
                    disabled={uploadingPhoto}
                    style={styles.cameraButton}
                    title="Change profile photo"
                  >
                    {uploadingPhoto ? "..." : "📷"}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={uploadProfilePhoto}
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  onClick={selectPhoto}
                  disabled={uploadingPhoto}
                  style={styles.changePhotoButton}
                >
                  {uploadingPhoto
                    ? "Uploading..."
                    : "Change Photo"}
                </button>

                <span style={styles.photoHint}>
                  JPG, PNG or WEBP • Max 5 MB
                </span>
              </div>

              {/* USER SUMMARY */}

              <div style={styles.userSummary}>

                <h2 style={styles.userName}>
                  {user.full_name}
                </h2>

                <div style={styles.roleBadge}>
                  {user.role === "buyer"
                    ? "Buyer"
                    : user.role === "farmer"
                    ? "Farmer"
                    : user.role}
                </div>

                <p style={styles.emailText}>
                  {user.email}
                </p>

              </div>
            </div>
          </section>

          {/* =================================================
              BUYER / FARMER RATING & REVIEWS
              Shown on farmer and buyer profiles.
          ================================================= */}

          {(user.role === "farmer" || user.role === "buyer") && (
            <section style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>
                    ⭐ {user.role === "farmer"
                      ? "Farmer"
                      : "Buyer"} Rating & Reviews
                  </h2>

                  <p style={styles.cardSubtitle}>
                    See how other marketplace users have rated you after
                    completed site visits.
                  </p>
                </div>
              </div>

              {reviewsLoading ? (
                <div style={styles.ratingLoading}>
                  Loading your ratings...
                </div>
              ) : (
                <>
                  <div style={styles.ratingSummaryBox}>
                    <div style={styles.averageRating}>
                      <div style={styles.averageRatingNumber}>
                        {ratingSummary.total_reviews > 0
                          ? ratingSummary.average_rating.toFixed(1)
                          : "0.0"}
                      </div>

                      <div>
                        {renderRatingStars(
                          ratingSummary.average_rating
                        )}

                        <div style={styles.ratingCount}>
                          {ratingSummary.total_reviews}{" "}
                          {ratingSummary.total_reviews === 1
                            ? "review"
                            : "reviews"}
                        </div>
                      </div>
                    </div>

                    <div style={styles.ratingExplanation}>
                      Your rating is based on published reviews
                      from marketplace users who completed a site visit.
                    </div>
                  </div>

                  {receivedReviews.length === 0 ? (
                    <div style={styles.noReviews}>
                      <div style={styles.noReviewsIcon}>⭐</div>
                      <strong>No reviews yet</strong>
                      <p style={styles.noReviewsText}>
                        Your rating will appear here when an eligible
                        marketplace user submits a review.
                      </p>
                    </div>
                  ) : (
                    <div style={styles.reviewList}>
                      {receivedReviews.map((review) => (
                        <div
                          key={review.id}
                          style={styles.reviewItem}
                        >
                          <div style={styles.reviewHeader}>
                            <div>
                              <strong style={styles.reviewerName}>
                                {review.reviewer_name ||
                                  (user.role === "farmer"
                                    ? "Buyer"
                                    : "Farmer")}
                              </strong>

                              <div style={styles.reviewMeta}>
                                {review.land_title
                                  ? `Land: ${review.land_title}`
                                  : "Marketplace review"}
                              </div>
                            </div>

                            <div style={styles.reviewRating}>
                              {renderRatingStars(review.rating)}
                            </div>
                          </div>

                          {review.comment && (
                            <p style={styles.reviewComment}>
                              "{review.comment}"
                            </p>
                          )}

                          {review.created_at && (
                            <div style={styles.reviewDate}>
                              {new Date(
                                review.created_at
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* =================================================
              PERSONAL INFORMATION
          ================================================= */}

          <section style={styles.card}>

            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.cardTitle}>
                  Personal Information
                </h2>

                <p style={styles.cardSubtitle}>
                  Update your basic account information.
                </p>
              </div>
            </div>

            <div style={styles.formGrid}>

              {/* FULL NAME */}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Full Name
                </label>

                <input
                  type="text"
                  value={user.full_name || ""}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      full_name: e.target.value,
                    })
                  }
                  style={styles.input}
                  placeholder="Enter your full name"
                />
              </div>

              {/* MOBILE */}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Mobile Number
                </label>

                <input
                  type="tel"
                  value={user.mobile || ""}
                  onChange={(e) =>
                    setUser({
                      ...user,
                      mobile: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10),
                    })
                  }
                  style={styles.input}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </div>

              {/* EMAIL */}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Email Address
                </label>

                <div style={styles.disabledInputWrapper}>
                  <input
                    type="email"
                    value={user.email || ""}
                    disabled
                    style={{
                      ...styles.input,
                      ...styles.disabledInput,
                    }}
                  />

                  <span style={styles.verifiedBadge}>
                    ✓
                  </span>
                </div>

                <span style={styles.helperText}>
                  Email address cannot be changed here.
                </span>
              </div>

              {/* ROLE */}

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Account Type
                </label>

                <input
                  type="text"
                  value={
                    user.role === "buyer"
                      ? "Buyer"
                      : user.role === "farmer"
                      ? "Farmer"
                      : user.role || ""
                  }
                  disabled
                  style={{
                    ...styles.input,
                    ...styles.disabledInput,
                  }}
                />

                <span style={styles.helperText}>
                  Account type is managed by the system.
                </span>
              </div>
            </div>

            {/* SAVE */}

            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={updateProfile}
                disabled={saving}
                style={{
                  ...styles.primaryButton,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving
                  ? "Saving Changes..."
                  : "Save Changes"}
              </button>
            </div>
          </section>

          {/* =================================================
              SECURITY
          ================================================= */}

          <section style={styles.card}>

            <div style={styles.securityRow}>

              <div style={styles.securityIcon}>
                🔒
              </div>

              <div style={styles.securityContent}>
                <h2 style={styles.securityTitle}>
                  Password & Security
                </h2>

                <p style={styles.cardSubtitle}>
                  Keep your account secure by regularly
                  updating your password.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/change-password")
                }
                style={styles.secondaryButton}
              >
                Change Password
                <span style={styles.arrow}>
                  →
                </span>
              </button>

            </div>
          </section>

          {/* =================================================
              ACCOUNT INFORMATION
          ================================================= */}

          <section style={styles.accountInfo}>
            <span>
              Account ID: #{user.id}
            </span>

            <span style={styles.dot}>
              •
            </span>

            <span>
              {user.role === "buyer"
                ? "Buyer Account"
                : user.role === "farmer"
                ? "Farmer Account"
                : "User Account"}
            </span>
          </section>

        </div>
      </main>
    </>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const styles = {
  page: {
    minHeight: "calc(100vh - 64px)",
    background: "#f5f7fa",
    padding: "40px 20px 60px",
  },

  container: {
    maxWidth: "1050px",
    margin: "0 auto",
  },

  pageHeader: {
    marginBottom: "24px",
  },

  pageTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "700",
    color: "#1f2937",
  },

  pageSubtitle: {
    margin: "7px 0 0",
    color: "#6b7280",
    fontSize: "15px",
  },

  successMessage: {
    background: "#ecfdf3",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "13px 16px",
    marginBottom: "18px",
    fontSize: "14px",
    fontWeight: "500",
  },

  errorMessage: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "13px 16px",
    marginBottom: "18px",
    fontSize: "14px",
    fontWeight: "500",
  },

  profileCard: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    marginBottom: "22px",
    overflow: "hidden",
  },

  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "35px",
    padding: "32px",
  },

  photoSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "180px",
  },

  avatarWrapper: {
    position: "relative",
    width: "132px",
    height: "132px",
  },

  avatarImage: {
    width: "132px",
    height: "132px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #ffffff",
    boxShadow: "0 3px 15px rgba(0,0,0,0.18)",
  },

  avatarPlaceholder: {
    width: "132px",
    height: "132px",
    borderRadius: "50%",
    background: "#2e7d32",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "42px",
    fontWeight: "700",
    border: "4px solid #ffffff",
    boxShadow: "0 3px 15px rgba(0,0,0,0.18)",
  },

  cameraButton: {
    position: "absolute",
    right: "0",
    bottom: "3px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "3px solid #ffffff",
    background: "#1976d2",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "17px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },

  changePhotoButton: {
    marginTop: "12px",
    border: "none",
    background: "transparent",
    color: "#1976d2",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
  },

  photoHint: {
    marginTop: "5px",
    color: "#9ca3af",
    fontSize: "11px",
    textAlign: "center",
  },

  userSummary: {
    flex: 1,
  },

  userName: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#111827",
  },

  roleBadge: {
    display: "inline-block",
    marginTop: "10px",
    padding: "5px 12px",
    borderRadius: "20px",
    background: "#e8f5e9",
    color: "#2e7d32",
    fontSize: "13px",
    fontWeight: "700",
    textTransform: "capitalize",
  },

  emailText: {
    marginTop: "12px",
    color: "#6b7280",
    fontSize: "15px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    padding: "28px",
    marginBottom: "22px",
  },

  cardHeader: {
    marginBottom: "25px",
  },

  cardTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "20px",
    fontWeight: "700",
  },

  cardSubtitle: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: "14px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "22px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
  },

  label: {
    marginBottom: "7px",
    color: "#374151",
    fontSize: "14px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    outline: "none",
    fontSize: "15px",
    color: "#111827",
    background: "#ffffff",
  },

  disabledInput: {
    background: "#f3f4f6",
    color: "#6b7280",
    cursor: "not-allowed",
  },

  disabledInputWrapper: {
    position: "relative",
  },

  verifiedBadge: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#16a34a",
    fontWeight: "700",
  },

  helperText: {
    marginTop: "6px",
    color: "#9ca3af",
    fontSize: "11px",
  },

  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "28px",
    paddingTop: "22px",
    borderTop: "1px solid #f0f0f0",
  },

  primaryButton: {
    border: "none",
    borderRadius: "9px",
    padding: "12px 22px",
    background: "#1976d2",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  },

  secondaryButton: {
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    padding: "11px 17px",
    background: "#ffffff",
    color: "#374151",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  arrow: {
    fontSize: "18px",
  },

  securityRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },

  securityIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#f0fdf4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    flexShrink: 0,
  },

  securityContent: {
    flex: 1,
  },

  securityTitle: {
    margin: 0,
    color: "#111827",
    fontSize: "18px",
    fontWeight: "700",
  },

  accountInfo: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    color: "#9ca3af",
    fontSize: "12px",
    marginTop: "5px",
  },

  dot: {
    color: "#d1d5db",
  },

  // =========================================================
  // BUYER / FARMER RATING STYLES
  // =========================================================

  ratingLoading: {
    padding: "25px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "14px",
  },

  ratingSummaryBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "20px",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "12px",
    marginBottom: "18px",
  },

  averageRating: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexShrink: 0,
  },

  averageRatingNumber: {
    fontSize: "38px",
    fontWeight: "800",
    color: "#92400e",
    lineHeight: 1,
  },

  ratingStars: {
    display: "inline-flex",
    gap: "2px",
    color: "#f59e0b",
    fontSize: "22px",
    letterSpacing: "1px",
  },

  ratingCount: {
    marginTop: "4px",
    color: "#78716c",
    fontSize: "12px",
  },

  ratingExplanation: {
    maxWidth: "430px",
    color: "#78716c",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  noReviews: {
    padding: "25px",
    textAlign: "center",
    background: "#f9fafb",
    borderRadius: "12px",
    border: "1px dashed #d1d5db",
    color: "#4b5563",
  },

  noReviewsIcon: {
    fontSize: "28px",
    marginBottom: "7px",
  },

  noReviewsText: {
    margin: "7px 0 0",
    color: "#9ca3af",
    fontSize: "13px",
  },

  reviewList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  reviewItem: {
    padding: "16px",
    border: "1px solid #e5e7eb",
    borderRadius: "11px",
    background: "#ffffff",
  },

  reviewHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "15px",
  },

  reviewerName: {
    color: "#111827",
    fontSize: "14px",
  },

  reviewMeta: {
    marginTop: "4px",
    color: "#9ca3af",
    fontSize: "12px",
  },

  reviewRating: {
    flexShrink: 0,
  },

  reviewComment: {
    margin: "12px 0 0",
    color: "#4b5563",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  reviewDate: {
    marginTop: "10px",
    color: "#9ca3af",
    fontSize: "11px",
  },

  loadingContainer: {
    minHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },

  spinner: {
    width: "34px",
    height: "34px",
    border: "4px solid #e5e7eb",
    borderTop: "4px solid #1976d2",
    borderRadius: "50%",
    animation: "profileSpin 1s linear infinite",
  },

  loadingText: {
    marginTop: "14px",
    fontSize: "14px",
  },

  errorCard: {
    background: "#ffffff",
    padding: "30px",
    borderRadius: "14px",
    textAlign: "center",
    boxShadow: "0 3px 15px rgba(0,0,0,0.08)",
  },
};

export default Profile;