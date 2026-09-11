import React from "react";

/**
 * Step 72B - Reusable verification badge
 *
 * Supported types:
 *   farmer -> Verified Farmer
 *   buyer  -> Verified Buyer
 *   land   -> Verified Land
 *
 * The component is intentionally server-data driven:
 * - farmer/buyer: pass the server-authoritative verification flag
 * - land: pass land.is_land_verified or ownership_verification_status
 *
 * Examples:
 *   <VerifiedBadge type="farmer" verified={user.is_verified_farmer} />
 *   <VerifiedBadge type="buyer" verified={user.is_verified_buyer} />
 *   <VerifiedBadge type="land" verified={land.is_land_verified} />
 */

const BADGE_CONFIG = {
  farmer: {
    label: "Verified Farmer",
    title: "This farmer's identity has been verified.",
  },
  buyer: {
    label: "Verified Buyer",
    title: "This buyer's identity has been verified.",
  },
  land: {
    label: "Verified Land",
    title: "This land has passed ownership verification.",
  },
};

function VerifiedBadge({
  type,
  verified = false,
  compact = false,
  showLabel = true,
  className = "",
  style = {},
}) {
  const config = BADGE_CONFIG[type];

  if (!config || !verified) {
    return null;
  }

  const label = config.label;

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: compact ? "4px" : "6px",
    padding: compact ? "3px 7px" : "5px 9px",
    borderRadius: "999px",
    background: "#E8F5E9",
    color: "#1B5E20",
    border: "1px solid #A5D6A7",
    fontSize: compact ? "11px" : "12px",
    fontWeight: "700",
    lineHeight: "1",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    ...style,
  };

  return (
    <span
      className={className}
      style={badgeStyle}
      title={config.title}
      aria-label={label}
      role="status"
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: compact ? "14px" : "16px",
          height: compact ? "14px" : "16px",
          borderRadius: "50%",
          background: "#2E7D32",
          color: "#fff",
          fontSize: compact ? "9px" : "10px",
          fontWeight: "800",
        }}
      >
        ✓
      </span>

      {showLabel && <span>{label}</span>}
    </span>
  );
}

export default VerifiedBadge;
