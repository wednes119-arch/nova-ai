import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

import "../styles/auth.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const formData = new URLSearchParams();

      formData.append("username", email);
      formData.append("password", password);

      const res = await api.post("/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (res.data.status === "error") {
        toast.error(res.data.message);
        return;
      }

      if (!res.data.access_token) {
        toast.error("No access token received.");
        return;
      }

      login(res.data.access_token);

      toast.success("Login Successful");

      navigate("/dashboard");

    } catch (err) {
      console.error("Login Error:", err);

      toast.error(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Login Failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      {/* Background decoration */}
      <div className="auth-circle circle-one"></div>
      <div className="auth-circle circle-two"></div>

      <div className="auth-container">

        {/* =====================================
            LEFT BRAND
        ===================================== */}

        <div className="auth-brand">

          <div className="brand-logo">
            <div className="brand-logo-icon">
              N
            </div>

            <span>Nova AI</span>
          </div>

          <h1>
            Your intelligent
            <br />
            <span>AI workspace.</span>
          </h1>

          <p>
            Ask questions, analyze documents,
            generate ideas and get things done
            with Nova AI.
          </p>

          <div className="brand-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>

        </div>


        {/* =====================================
            RIGHT LOGIN
        ===================================== */}

        <div className="auth-form-wrapper">

          <form
            className="auth-form"
            onSubmit={handleLogin}
          >

            <div className="form-heading">

              <h2>
                Welcome back
              </h2>

              <p>
                Sign in to continue to Nova AI
              </p>

            </div>


            {/* EMAIL */}

            <div className="form-group">

              <label>
                Email
              </label>

              <div className="input-wrapper">

                <FiMail className="input-icon" />

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label>
                Password
              </label>

              <div className="input-wrapper">

                <FiLock className="input-icon" />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>

              </div>

            </div>


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >

              {loading ? (
                <span className="loading-content">
                  <span className="spinner"></span>
                  Signing in...
                </span>
              ) : (
                <>
                  Sign in
                  <FiArrowRight />
                </>
              )}

            </button>


            {/* SIGNUP */}

            <div className="auth-switch">

              <span>
                Don't have an account?
              </span>

              <Link to="/signup">
                Create account
              </Link>

            </div>


            <div className="auth-footer">

              By continuing, you agree to Nova AI's
              Terms of Service and Privacy Policy.

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}