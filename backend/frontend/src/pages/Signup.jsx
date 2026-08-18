import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  FiMail,
  FiLock,
  FiUser,
  FiEye,
  FiEyeOff,
  FiArrowRight,
} from "react-icons/fi";

import toast from "react-hot-toast";

import api from "../api/api";
import "../styles/auth.css";


export default function Signup() {
  const navigate = useNavigate();

  // =====================================================
  // STATES
  // =====================================================

  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  // =====================================================
  // SIGNUP
  // =====================================================

  async function handleSignup(e) {
    e.preventDefault();

    // -------------------------------------------------
    // Validation
    // -------------------------------------------------

    if (
      !fullname.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      // -------------------------------------------------
      // Signup API
      // -------------------------------------------------

      const res = await api.post("/signup", {
        fullname: fullname.trim(),
        email: email.trim(),
        password,
      });

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      if (res.data.status === "success") {

        // Save email temporarily
        localStorage.setItem(
          "verification_email",
          res.data.email || email.trim()
        );

        toast.success(
          "Verification code sent to your email!"
        );

        // Go to OTP page
        navigate("/verify-otp", {
          state: {
            email: res.data.email || email.trim(),
          },
        });

        return;
      }

      // -------------------------------------------------
      // BACKEND ERROR RESPONSE
      // -------------------------------------------------

      toast.error(
        res.data?.message ||
        res.data?.detail ||
        "Signup failed"
      );

    } catch (err) {
      // -------------------------------------------------
      // API ERROR
      // -------------------------------------------------

      console.log("SIGNUP ERROR:", err);
      console.log("STATUS:", err.response?.status);
      console.log("DATA:", err.response?.data);
      console.log("MESSAGE:", err.message);

      toast.error(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        "Signup failed"
      );

    } finally {
      setLoading(false);
    }
  }


  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="auth-page">

      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="auth-glow glow-one"></div>
      <div className="auth-glow glow-two"></div>

      <div className="auth-orb orb-one"></div>
      <div className="auth-orb orb-two"></div>


      <div className="auth-wrapper">


        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div className="auth-brand">


          {/* BRAND LOGO */}

          <div className="brand-logo">

            <div className="brand-icon">
              N
            </div>

            <span>
              Nova AI
            </span>

          </div>


          {/* BRAND TEXT */}

          <div className="brand-text">

            <h1>
              Build your ideas
              <br />

              <span>
                with intelligence.
              </span>
            </h1>


            <p>
              Create your Nova AI account and
              unlock a smarter way to work,
              learn and create.
            </p>

          </div>


          {/* STATUS */}

          <div className="brand-status">

            <span className="status-dot"></span>

            <span>
              AI workspace ready for you
            </span>

          </div>


        </div>



        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="auth-form-section">


          <div className="auth-card">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="auth-card-header">


              <div className="mobile-logo">

                <div className="brand-icon">
                  N
                </div>

              </div>


              <h2>
                Create your account
              </h2>


              <p>
                Get started with Nova AI today
              </p>


            </div>



            {/* =================================================
                FORM
            ================================================= */}

            <form onSubmit={handleSignup}>


              {/* =================================================
                  FULL NAME
              ================================================= */}

              <div className="form-group">

                <label>
                  Full name
                </label>


                <div className="input-wrapper">

                  <FiUser
                    className="input-icon"
                  />


                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullname}
                    onChange={(e) =>
                      setFullname(
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>



              {/* =================================================
                  EMAIL
              ================================================= */}

              <div className="form-group">

                <label>
                  Email address
                </label>


                <div className="input-wrapper">

                  <FiMail
                    className="input-icon"
                  />


                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>



              {/* =================================================
                  PASSWORD
              ================================================= */}

              <div className="form-group">

                <label>
                  Password
                </label>


                <div className="input-wrapper">

                  <FiLock
                    className="input-icon"
                  />


                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    required
                  />


                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
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



              {/* =================================================
                  CREATE ACCOUNT
              ================================================= */}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading}
              >

                {loading ? (

                  <span className="loading-content">

                    <span className="spinner"></span>

                    Creating account...

                  </span>

                ) : (

                  <>
                    Create account

                    <FiArrowRight />

                  </>

                )}

              </button>


            </form>



            {/* =================================================
                LOGIN
            ================================================= */}

            <div className="auth-switch">

              <span>
                Already have an account?
              </span>


              <Link to="/login">
                Sign in
              </Link>

            </div>



            {/* =================================================
                DIVIDER
            ================================================= */}

            <div className="auth-divider">

              <span></span>

              <small>
                SECURE WORKSPACE
              </small>

              <span></span>

            </div>



            {/* =================================================
                TERMS
            ================================================= */}

            <p className="terms">

              By creating an account, you agree to
              Nova AI's Terms of Service and
              Privacy Policy.

            </p>


          </div>


        </div>


      </div>


    </div>
  );
}