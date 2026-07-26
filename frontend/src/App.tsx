import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ConfirmationResult,
  GoogleAuthProvider,
  RecaptchaVerifier,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

type AuthView = "login" | "signup";
type AuthMethod = "email" | "phone";

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span className="orbit orbit-one" />
      <span className="orbit orbit-two" />
      <span className="star">✦</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4L15.4 17c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.7A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 13.9a6 6 0 0 1 0-3.8V7.4H3.1a10 10 0 0 0 0 9.2l3.4-2.7Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4l3.4 2.7A5.9 5.9 0 0 1 12 6Z" />
    </svg>
  );
}

function friendlyError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already exists for this email.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-phone-number": "Include your country code, for example +91.",
    "auth/missing-phone-number": "Enter your mobile number.",
    "auth/operation-not-allowed":
      "This sign-in method is not enabled in Firebase Authentication.",
    "auth/unauthorized-domain":
      "This website domain is not authorized in Firebase Authentication.",
    "auth/popup-blocked":
      "The browser blocked the Google sign-in popup. Allow popups and try again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/cancelled-popup-request":
      "Another sign-in popup was opened. Please try once more.",
    "auth/network-request-failed":
      "Firebase could not be reached. Check your connection or browser privacy settings.",
    "auth/web-storage-unsupported":
      "This browser is blocking the storage required for Google sign-in.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/code-expired": "That OTP has expired. Request a new code.",
    "auth/invalid-verification-code": "The OTP you entered is incorrect.",
  };

  return messages[code] ??
    `Sign-in failed${code ? ` (${code})` : ""}. Please try again.`;
}

function Dashboard({ user }: { user: User }) {
  const firstName =
    user.displayName?.split(" ")[0] || user.phoneNumber || "there";
  const [showConsultation, setShowConsultation] = useState(false);
  const [birthDetails, setBirthDetails] = useState({
    date: "",
    time: "",
    place: "",
  });
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${apiUrl}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) return;
        const data = await response.json();
        if (active && data.profile) {
          setBirthDetails({
            date: data.profile.birthDate ?? "",
            time: data.profile.birthTime ?? "",
            place: data.profile.birthPlace ?? "",
          });
        }
      } catch (error) {
        console.error("Could not load saved profile:", error);
      } finally {
        if (active) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, [apiUrl, user]);

  async function askAstroCoach(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setApiError("");
    setAnswer("");

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question.trim(),
          birthDetails,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not complete the consultation.");
      }

      setAnswer(data.answer);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Could not reach AstroCoach. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard">
      <nav className="dashboard-nav">
        <a className="wordmark small" href="/">
          <BrandMark />
          <span>AstroCoach</span>
        </a>
        <button className="text-button" onClick={() => auth && signOut(auth)}>
          Sign out
        </button>
      </nav>

      <section className="welcome-card">
        <span className="eyebrow">YOUR COSMIC SPACE</span>
        <h1>Welcome, {firstName}</h1>
        <p>
          Share your birth details and ask what is on your mind. Your profile
          will be saved securely for future consultations.
        </p>
        <div className={`birth-card ${showConsultation ? "expanded" : ""}`}>
          <span className="birth-icon">☾</span>
          <div>
            <strong>Begin your birth chart</strong>
            <span>
              {birthDetails.date
                ? "Your saved details are ready for another consultation."
                : "Add your birth date, time, and place to get started."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowConsultation((visible) => !visible)}
          >
            {showConsultation ? "Close" : profileLoading ? "Loading…" : "Continue"}
          </button>

          {showConsultation && (
            <form className="consultation-form" onSubmit={askAstroCoach}>
              <div className="birth-fields">
                <label>
                  Birth date
                  <input
                    type="date"
                    value={birthDetails.date}
                    onChange={(event) =>
                      setBirthDetails((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Birth time
                  <input
                    type="time"
                    value={birthDetails.time}
                    onChange={(event) =>
                      setBirthDetails((current) => ({
                        ...current,
                        time: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Birth place
                  <input
                    value={birthDetails.place}
                    onChange={(event) =>
                      setBirthDetails((current) => ({
                        ...current,
                        place: event.target.value,
                      }))
                    }
                    placeholder="City, state, country"
                    autoComplete="address-level2"
                    required
                  />
                </label>
              </div>

              <label>
                What would you like to understand?
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="For example: What does my chart suggest about my career direction?"
                  rows={5}
                  required
                />
              </label>

              {apiError && (
                <div className="error-message" role="alert">
                  {apiError}
                </div>
              )}

              <button
                className="primary-button ask-button"
                disabled={submitting || !question.trim()}
                type="submit"
              >
                {submitting ? "Consulting your chart…" : "Ask AstroCoach"}
              </button>
            </form>
          )}
        </div>

        {answer && (
          <article className="answer-card" aria-live="polite">
            <span className="eyebrow">YOUR READING</span>
            <h2>AstroCoach says</h2>
            <p>{answer}</p>
          </article>
        )}
      </section>
    </main>
  );
}

function AuthScreen() {
  const [view, setView] = useState<AuthView>("login");
  const [method, setMethod] = useState<AuthMethod>("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] =
    useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recaptcha = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    return () => {
      recaptcha.current?.clear();
    };
  }, []);

  function requireAuth() {
    if (!auth || !isFirebaseConfigured) {
      setError("Add your Firebase settings to frontend/.env to enable sign-in.");
      return null;
    }
    return auth;
  }

  async function handleGoogle() {
    const instance = requireAuth();
    if (!instance) return;

    setBusy(true);
    setError("");
    try {
      await signInWithPopup(instance, new GoogleAuthProvider());
    } catch (err) {
      console.error("Firebase Google sign-in failed:", err);
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    const instance = requireAuth();
    if (!instance) return;

    setBusy(true);
    setError("");
    try {
      if (view === "signup") {
        const credential = await createUserWithEmailAndPassword(
          instance,
          email,
          password,
        );
        if (name.trim()) {
          await updateProfile(credential.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(instance, email, password);
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp(event: FormEvent) {
    event.preventDefault();
    const instance = requireAuth();
    if (!instance) return;

    setBusy(true);
    setError("");
    try {
      recaptcha.current?.clear();
      recaptcha.current = new RecaptchaVerifier(instance, "recaptcha", {
        size: "invisible",
      });
      const result = await signInWithPhoneNumber(
        instance,
        phone.replace(/\s/g, ""),
        recaptcha.current,
      );
      setConfirmation(result);
    } catch (err) {
      recaptcha.current?.clear();
      recaptcha.current = null;
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!confirmation) return;
    setBusy(true);
    setError("");
    try {
      await confirmation.confirm(otp);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  function switchView(next: AuthView) {
    setView(next);
    setError("");
    setConfirmation(null);
    setOtp("");
  }

  return (
    <main className="auth-page">
      <section className="story-panel">
        <div className="story-content">
          <a className="wordmark" href="/">
            <BrandMark />
            <span>AstroCoach</span>
          </a>
          <div className="story-copy">
            <span className="eyebrow">VEDIC WISDOM · MODERN CLARITY</span>
            <h1>Your stars have a story to tell.</h1>
            <p>
              Understand your patterns, navigate life&apos;s turning points,
              and move forward with clarity grounded in your birth chart.
            </p>
          </div>
          <figure>
            <blockquote>
              “The stars incline us; they do not bind us.”
            </blockquote>
            <figcaption>Ancient astrological wisdom</figcaption>
          </figure>
        </div>
        <div className="constellation" aria-hidden="true">
          <span className="line line-a" />
          <span className="line line-b" />
          <span className="line line-c" />
          <i className="point p1" />
          <i className="point p2" />
          <i className="point p3" />
          <i className="point p4" />
        </div>
        <div className="sun-disc" aria-hidden="true" />
      </section>

      <section className="form-panel">
        <div className="form-wrap">
          <header>
            <span className="mobile-brand">
              <BrandMark />
              AstroCoach
            </span>
            <h2>{view === "login" ? "Welcome back" : "Create your account"}</h2>
            <p>
              {view === "login"
                ? "Continue your journey of self-understanding."
                : "Begin a more thoughtful relationship with your chart."}
            </p>
          </header>

          <div className="view-tabs" role="tablist" aria-label="Account action">
            <button
              className={view === "login" ? "active" : ""}
              onClick={() => switchView("login")}
              role="tab"
            >
              Sign in
            </button>
            <button
              className={view === "signup" ? "active" : ""}
              onClick={() => switchView("signup")}
              role="tab"
            >
              Create account
            </button>
          </div>

          <button
            className="google-button"
            type="button"
            onClick={handleGoogle}
            disabled={busy}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="separator"><span>or continue with</span></div>

          <div className="method-tabs">
            <button
              className={method === "email" ? "active" : ""}
              onClick={() => {
                setMethod("email");
                setError("");
              }}
              type="button"
            >
              Email
            </button>
            <button
              className={method === "phone" ? "active" : ""}
              onClick={() => {
                setMethod("phone");
                setError("");
              }}
              type="button"
            >
              Mobile OTP
            </button>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}

          {method === "email" ? (
            <form onSubmit={handleEmail}>
              {view === "signup" && (
                <label>
                  Your name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="How should we address you?"
                    autoComplete="name"
                    required
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label>
                <span>
                  Password
                  {view === "login" && <button type="button">Forgot password?</button>}
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={view === "signup" ? "At least 6 characters" : "Enter your password"}
                  autoComplete={view === "signup" ? "new-password" : "current-password"}
                  minLength={6}
                  required
                />
              </label>
              <button className="primary-button" disabled={busy} type="submit">
                {busy
                  ? "Please wait…"
                  : view === "login"
                    ? "Sign in"
                    : "Create my account"}
              </button>
            </form>
          ) : confirmation ? (
            <form onSubmit={verifyOtp}>
              <div className="otp-note">
                We sent a 6-digit code to <strong>{phone}</strong>.
              </div>
              <label>
                Verification code
                <input
                  className="otp-input"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="• • • • • •"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <button className="primary-button" disabled={busy || otp.length !== 6}>
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
              <button
                className="text-button centered"
                type="button"
                onClick={() => setConfirmation(null)}
              >
                Use a different number
              </button>
            </form>
          ) : (
            <form onSubmit={sendOtp}>
              <label>
                Mobile number
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  required
                />
              </label>
              <p className="field-help">
                Include your country code. Standard SMS charges may apply.
              </p>
              <button className="primary-button" disabled={busy} type="submit">
                {busy ? "Sending code…" : "Send verification code"}
              </button>
            </form>
          )}

          <div id="recaptcha" />

          <p className="legal">
            By continuing, you agree to our <a href="#">Terms</a> and{" "}
            <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <BrandMark />
        <span>Reading the sky…</span>
      </div>
    );
  }

  return user ? <Dashboard user={user} /> : <AuthScreen />;
}
