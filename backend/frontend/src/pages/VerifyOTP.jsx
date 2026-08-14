import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiMail,
  FiArrowRight,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";

import api from "../api/api";

import "../styles/auth.css";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [timer, setTimer] = useState(60);

  // =====================================================
  // GET EMAIL
  // =====================================================

  useEffect(() => {
    const savedEmail =
      location.state?.email ||
      localStorage.getItem("verification_email");

    if (!savedEmail) {
      toast.error("Verification email not found");
      navigate("/signup");
      return;
    }

    setEmail(savedEmail);
  }, [location, navigate]);

  // =====================================================
  // COUNTDOWN
  // =====================================================

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  // =====================================================
  // OTP INPUT
  // =====================================================

  const handleOtpChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(value);
  };

  // =====================================================
  // VERIFY OTP
  // =====================================================

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email is missing");
      return;
    }

    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/verify-otp", null, {
        params: {
          email: email,
          otp: otp,
        },
      });

      if (res.data.status === "success") {
        toast.success(
          "Email verified successfully!"
        );

        localStorage.removeItem(
          "verification_email"
        );

        setTimeout(() => {
          navigate("/login");
        }, 800);
      }
    } catch (err) {
      console.error("OTP Verification Error:", err);

      toast.error(
        err.response?.data?.detail ||
        "Invalid verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESEND OTP
  // =====================================================

  const handleResend = async () => {
    if (!email || timer > 0 || resending) {
      return;
    }

    setResending(true);

    try {
      const res = await api.post(
        "/resend-otp",
        null,
        {
          params: {
            email: email,
          },
        }
      );

      if (res.data.status === "success") {
        toast.success(
          "New verification code sent!"
        );

        setOtp("");
        setTimer(60);
      }
    } catch (err) {
      console.error("Resend OTP Error:", err);

      toast.error(
        err.response?.data?.detail ||
        "Failed to resend verification code"
      );
    } finally {
      setResending(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="auth-page">

      {/* Background */}
      <div className="auth-circle circle-one"></div>
      <div className="auth-circle circle-two"></div>

      <div className="auth-container">

        {/* =================================================
            LEFT BRAND
        ================================================= */}

        <div className="auth-brand">

          <div className="brand-logo">

            <div className="brand-logo-icon">
              N
            </div>

            <span>
              Nova AI
            </span>

          </div>

          <h1>
            One step
            <br />
            <span>away.</span>
          </h1>

          <p>
            We've sent a verification code
            to your email address. Verify your
            account to start using Nova AI.
          </p>

          <div className="brand-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>

        </div>

        {/* =================================================
            OTP FORM
        ================================================= */}

        <div className="auth-form-wrapper">

          <form
            className="auth-form"
            onSubmit={handleVerify}
          >

            {/* HEADER */}

            <div className="form-heading">

              <div className="otp-icon">
                <FiShield />
              </div>

              <h2>
                Verify your email
              </h2>

              <p>
                Enter the 6-digit code sent to
              </p>

              <strong className="verification-email">
                {email}
              </strong>

            </div>

            {/* OTP */}

            <div className="form-group">

              <label>
                Verification code
              </label>

              <div className="otp-input-wrapper">

                <FiMail className="input-icon" />

                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={handleOtpChange}
                  maxLength={6}
                  autoFocus
                />

              </div>

            </div>

            {/* VERIFY */}

            <button
              type="submit"
              className="auth-submit"
              disabled={
                loading ||
                otp.length !== 6
              }
            >

              {loading ? (
                <span className="loading-content">

                  <span className="spinner"></span>

                  Verifying...

                </span>
              ) : (
                <>
                  Verify email
                  <FiArrowRight />
                </>
              )}

            </button>

            {/* RESEND */}

            <div className="otp-resend">

              <span>
                Didn't receive the code?
              </span>

              {timer > 0 ? (
                <span className="otp-timer">
                  Resend in {timer}s
                </span>
              ) : (
                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleResend}
                  disabled={resending}
                >

                  <FiRefreshCw />

                  {resending
                    ? "Sending..."
                    : "Resend code"}

                </button>
              )}

            </div>

            {/* CHANGE EMAIL */}

            <div className="auth-switch">

              <span>
                Wrong email?
              </span>

              <button
                type="button"
                className="back-signup-btn"
                onClick={() =>
                  navigate("/signup")
                }
              >
                Create account again
              </button>

            </div>

            {/* FOOTER */}

            <div className="auth-footer">

              Your verification code expires
              after 5 minutes.

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}