import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../services/api";

function AdminSecurity() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [provisioningUri, setProvisioningUri] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const setupMFA = async () => {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await api.post("/users/admin/mfa/setup");

      setMfaEnabled(Boolean(response.data.mfa_enabled));
      setProvisioningUri(response.data.provisioning_uri || "");

      if (response.data.mfa_enabled) {
        setMessage("MFA is already enabled.");
      } else {
        setMessage(
          "Scan the QR code with your authenticator app, then enter the 6-digit code."
        );
      }
    } catch (err) {
      console.error("MFA setup error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to start MFA setup."
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmMFA = async (e) => {
    e.preventDefault();

    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await api.post(
        "/users/admin/mfa/confirm",
        {
          code: trimmedCode,
        }
      );

      setMfaEnabled(Boolean(response.data.mfa_enabled));
      setProvisioningUri("");
      setCode("");

      setMessage(
        "MFA enabled successfully. Your existing admin sessions have been invalidated. Please log in again."
      );
    } catch (err) {
      console.error("MFA confirmation error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to confirm MFA."
      );
    } finally {
      setLoading(false);
    }
  };

  const disableMFA = async () => {
    const trimmedCode = code.trim();

    if (!/^\d{6}$/.test(trimmedCode)) {
      setError(
        "Enter the current 6-digit authenticator code before disabling MFA."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to disable MFA for this administrator account?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await api.post(
        "/users/admin/mfa/disable",
        {
          code: trimmedCode,
        }
      );

      setMfaEnabled(Boolean(response.data.mfa_enabled));
      setProvisioningUri("");
      setCode("");

      setMessage(
        "MFA disabled successfully. Your existing admin sessions have been invalidated. Please log in again."
      );
    } catch (err) {
      console.error("MFA disable error:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to disable MFA."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Admin Security</h1>

      <div
        style={{
          background: "white",
          padding: "24px",
          borderRadius: "12px",
          maxWidth: "700px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h2>Multi-Factor Authentication</h2>

        <p>
          Protect this administrator account with a
          time-based one-time password (TOTP).
        </p>

        <div
          style={{
            padding: "12px",
            marginBottom: "20px",
            borderRadius: "8px",
            background: mfaEnabled
              ? "#e8f5e9"
              : "#fff3e0",
            fontWeight: "700",
          }}
        >
          Status:{" "}
          {mfaEnabled
            ? "MFA Enabled"
            : "MFA Not Enabled"}
        </div>

        {message && (
          <div
            style={{
              padding: "12px",
              marginBottom: "16px",
              background: "#e8f5e9",
              borderRadius: "8px",
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "12px",
              marginBottom: "16px",
              background: "#ffebee",
              color: "#b71c1c",
              borderRadius: "8px",
            }}
          >
            {error}
          </div>
        )}

        {!mfaEnabled && !provisioningUri && (
          <button
            type="button"
            onClick={setupMFA}
            disabled={loading}
            style={{
              padding: "10px 18px",
              border: "none",
              borderRadius: "8px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              fontWeight: "700",
            }}
          >
            {loading
              ? "Starting MFA Setup..."
              : "Set Up MFA"}
          </button>
        )}

        {!mfaEnabled && provisioningUri && (
          <div>
            <h3>1. Scan this QR code</h3>

            <div
              style={{
                display: "inline-block",
                padding: "16px",
                background: "white",
                border: "1px solid #ddd",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <QRCodeSVG
                value={provisioningUri}
                size={220}
                level="M"
              />
            </div>

            <p>
              Open your authenticator app and scan the
              QR code above.
            </p>

            <p
              style={{
                fontSize: "13px",
                color: "#666",
              }}
            >
              If your authenticator app cannot scan the
              QR code, use its manual setup option with
              the provisioning information provided by
              the server.
            </p>

            <h3>2. Enter the 6-digit code</h3>

            <form onSubmit={confirmMFA}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                style={{
                  padding: "10px",
                  width: "180px",
                  fontSize: "18px",
                  letterSpacing: "4px",
                  textAlign: "center",
                  marginRight: "10px",
                }}
              />

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                style={{
                  padding: "10px 18px",
                  fontWeight: "700",
                }}
              >
                {loading
                  ? "Confirming..."
                  : "Enable MFA"}
              </button>
            </form>
          </div>
        )}

        {mfaEnabled && (
          <div>
            <h3>Disable MFA</h3>

            <p>
              Disabling MFA requires your current
              authenticator code.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) =>
                setCode(
                  e.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6)
                )
              }
              style={{
                padding: "10px",
                width: "180px",
                fontSize: "18px",
                letterSpacing: "4px",
                textAlign: "center",
                marginRight: "10px",
              }}
            />

            <button
              type="button"
              onClick={disableMFA}
              disabled={loading || code.length !== 6}
              style={{
                padding: "10px 18px",
                fontWeight: "700",
              }}
            >
              {loading
                ? "Disabling..."
                : "Disable MFA"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminSecurity;