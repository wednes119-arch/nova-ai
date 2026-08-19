import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
} from "react-icons/fi";

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


  // =====================================================
  // NOVA AI WELCOME VOICE
  // =====================================================

  const playWelcomeVoice = () => {
    try {
      const audio = new Audio(
        "/audio/nova-welcome.mp3"
      );

      audio.volume = 1;
      audio.preload = "auto";

      audio.play().catch((error) => {
        console.log(
          "Nova welcome audio could not play:",
          error
        );
      });

    } catch (error) {
      console.log(
        "Nova welcome audio error:",
        error
      );
    }
  };


  // =====================================================
  // LOGIN
  // =====================================================

  async function handleLogin(e) {
    e.preventDefault();

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (
      !email.trim() ||
      !password.trim()
    ) {
      toast.error(
        "Please enter email and password"
      );

      return;
    }


    setLoading(true);


    try {

      // -------------------------------------------------
      // FORM DATA
      // -------------------------------------------------

      const formData =
        new URLSearchParams();

      formData.append(
        "username",
        email.trim()
      );

      formData.append(
        "password",
        password
      );


      // -------------------------------------------------
      // LOGIN API
      // -------------------------------------------------

      const res = await api.post(
        "/login",
        formData,
        {
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
        }
      );


      // -------------------------------------------------
      // BACKEND ERROR
      // -------------------------------------------------

      if (
        res.data.status === "error"
      ) {
        toast.error(
          res.data.message ||
          "Login failed"
        );

        return;
      }


      // -------------------------------------------------
      // ACCESS TOKEN CHECK
      // -------------------------------------------------

      if (
        !res.data.access_token
      ) {
        toast.error(
          "No access token received."
        );

        return;
      }


      // -------------------------------------------------
      // SAVE LOGIN
      // -------------------------------------------------

      login(
        res.data.access_token
      );


      // =================================================
      // NOVA AI WELCOME VOICE
      // =================================================

      playWelcomeVoice();


      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      toast.success(
        "Login Successful"
      );


      // -------------------------------------------------
      // DASHBOARD
      // -------------------------------------------------

      navigate(
        "/dashboard"
      );


    } catch (err) {

      console.log(
        "LOGIN ERROR:",
        err
      );

      console.log(
        "STATUS:",
        err.response?.status
      );

      console.log(
        "DATA:",
        err.response?.data
      );

      console.log(
        "MESSAGE:",
        err.message
      );


      toast.error(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Login failed"
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

      <div className="auth-circle circle-one"></div>

      <div className="auth-circle circle-two"></div>



      {/* =================================================
          MAIN CONTAINER
      ================================================= */}

      <div className="auth-container">


        {/* =================================================
            LEFT BRAND
        ================================================= */}

        <div className="auth-brand">


          {/* LOGO */}

          <div className="brand-logo">

            <div className="brand-logo-icon">
              N
            </div>

            <span>
              Nova AI
            </span>

          </div>


          {/* HEADING */}

          <h1>

            Your intelligent

            <br />

            <span>
              AI workspace.
            </span>

          </h1>


          {/* DESCRIPTION */}

          <p>

            Ask questions, analyze documents,
            generate ideas and get things done
            with Nova AI.

          </p>


          {/* DOTS */}

          <div className="brand-dots">

            <span></span>

            <span></span>

            <span></span>

          </div>


        </div>



        {/* =================================================
            LOGIN SECTION
        ================================================= */}

        <div className="auth-form-wrapper">


          <form
            className="auth-form"
            onSubmit={handleLogin}
          >


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="form-heading">


              {/* MOBILE LOGO */}

              <div className="mobile-logo">

                <div className="brand-icon">
                  N
                </div>

              </div>


              <h2>
                Welcome back
              </h2>


              <p>
                Sign in to continue to Nova AI
              </p>


            </div>



            {/* =================================================
                EMAIL
            ================================================= */}

            <div className="form-group">

              <label>
                Email
              </label>


              <div className="input-wrapper">

                <FiMail
                  className="input-icon"
                />


                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  autoComplete="email"
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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  autoComplete="current-password"
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
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
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
                LOGIN BUTTON
            ================================================= */}

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



            {/* =================================================
                SIGNUP
            ================================================= */}

            <div className="auth-switch">

              <span>
                Don't have an account?
              </span>


              <Link to="/signup">
                Create account
              </Link>

            </div>



            {/* =================================================
                FOOTER
            ================================================= */}

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