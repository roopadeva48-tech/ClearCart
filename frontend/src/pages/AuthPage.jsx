import { useState } from "react";
import {
  IconSpark,
  IconUser,
  IconLock,
  IconMail,
  IconStore,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconAlert,
  IconShield,
} from "../components/Icons";

export default function AuthPage({ onLoginSuccess }) {
  // mode: 'signin' | 'signup'
  const [mode, setMode] = useState(() => {
    try {
      const stored = localStorage.getItem("clearcart_registered_users");
      const users = stored ? JSON.parse(stored) : [];
      return users.length > 0 ? "signin" : "signup";
    } catch {
      return "signup";
    }
  });

  // Sign In state
  const [signInUserId, setSignInUserId] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up state
  const [signUpName, setSignUpName] = useState("");
  const [signUpShopName, setSignUpShopName] = useState("");
  const [signUpDescription, setSignUpDescription] = useState("");
  const [signUpMailId, setSignUpMailId] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Helper to load registered users from localStorage
  function getRegisteredUsers() {
    try {
      const stored = localStorage.getItem("clearcart_registered_users");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }

  // Save new user
  function saveUser(userObj) {
    const users = getRegisteredUsers();
    users.push(userObj);
    localStorage.setItem("clearcart_registered_users", JSON.stringify(users));
  }

  // Validation helper: ensure string contains alphabetic letters (not only numbers)
  function containsLetters(val) {
    return /[a-zA-Z]/.test(val.trim());
  }

  // Email format validator
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // Password complexity validator: 1 uppercase, 1 number, 1 special char, min 6 chars
  function validatePassword(pwd) {
    if (!pwd || pwd.length < 6) {
      return "Password must be at least 6 characters long.";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one capital letter (A-Z).";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number (0-9).";
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pwd)) {
      return "Password must contain at least one special character (e.g. !@#$%^&*).";
    }
    return null;
  }

  // Handle Sign In
  function handleSignIn(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const uid = signInUserId.trim();
    const pwd = signInPassword.trim();

    if (!uid || !pwd) {
      setErrorMsg("All fields are mandatory. Please enter both User ID/Email and Password.");
      return;
    }

    const users = getRegisteredUsers();
    const matched = users.find(
      (u) =>
        (u.userId?.toLowerCase() === uid.toLowerCase() ||
          u.username?.toLowerCase() === uid.toLowerCase() ||
          u.mailId?.toLowerCase() === uid.toLowerCase()) &&
        u.password === pwd
    );

    if (matched) {
      const sessionUser = {
        userId: matched.userId || matched.mailId || uid,
        name: matched.name || "Store Manager",
        shopName: matched.shopName || "ClearCart Retail Store",
        description: matched.description || "Retail & Inventory Store",
        mailId: matched.mailId || uid,
      };
      localStorage.setItem("clearcart_auth_user", JSON.stringify(sessionUser));
      setSuccessMsg("Sign in successful! Launching Copilot…");
      setTimeout(() => {
        onLoginSuccess(sessionUser);
      }, 300);
    } else {
      setErrorMsg(
        "Invalid credentials. Please check your User ID / Password, or create a new account in 'Create Shop Account'."
      );
    }
  }

  // Handle Sign Up (Shop Account Registration)
  function handleSignUp(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const name = signUpName.trim();
    const shopName = signUpShopName.trim();
    const description = signUpDescription.trim();
    const mailId = signUpMailId.trim().toLowerCase();
    const password = signUpPassword;

    // 1. Mandatory check for all fields
    if (!name || !shopName || !description || !mailId || !password) {
      setErrorMsg("All fields are mandatory. Please fill out all details on this page.");
      return;
    }

    // 2. Disallow only numbers for Full Name (must contain letters, can contain numbers)
    if (!containsLetters(name)) {
      setErrorMsg("Full Name cannot be numbers only. Please enter a valid name with letters.");
      return;
    }

    // 3. Disallow only numbers for Shop Name (must contain letters, can contain numbers)
    if (!containsLetters(shopName)) {
      setErrorMsg("Shop Name cannot be numbers only. Please enter a shop name with letters (e.g., Apex Store #102).");
      return;
    }

    // 4. Disallow only numbers for Shop Description
    if (!containsLetters(description)) {
      setErrorMsg("Shop Description cannot be numbers only. Please provide a description with words.");
      return;
    }

    // 5. Validate Email format
    if (!isValidEmail(mailId)) {
      setErrorMsg("Please enter a valid Email address (e.g. manager@store.com).");
      return;
    }

    // 6. Password Complexity: One capital letter, numbers, and one special character
    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMsg(passwordError);
      return;
    }

    const users = getRegisteredUsers();
    const alreadyExists = users.some(
      (u) => u.mailId?.toLowerCase() === mailId || u.userId?.toLowerCase() === mailId
    );

    if (alreadyExists) {
      setErrorMsg("An account with this Email already exists. Please Sign In.");
      return;
    }

    const newUser = {
      userId: mailId,
      username: name.toLowerCase().replace(/\s+/g, "_"),
      name,
      shopName,
      description,
      mailId,
      password,
    };

    saveUser(newUser);

    const sessionUser = {
      userId: newUser.userId,
      name: newUser.name,
      shopName: newUser.shopName,
      description: newUser.description,
      mailId: newUser.mailId,
    };

    localStorage.setItem("clearcart_auth_user", JSON.stringify(sessionUser));
    setSuccessMsg("Account registered successfully! Redirecting to Copilot…");
    setTimeout(() => {
      onLoginSuccess(sessionUser);
    }, 400);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Soft Background Accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden transition-all">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white flex items-center justify-center mb-3 shadow-md">
              <IconSpark className="w-10 h-10" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight">
              ClearCart <span className="text-blue-200">Intelligence</span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 font-medium mt-1 max-w-sm">
              AI-Powered Retail Copilot &amp; Inventory Decision Engine
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Sign In (Log In)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-white text-blue-700 shadow-xs border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Create Shop Account (Sign Up)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {/* Alerts */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5">
              <IconAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5">
              <IconCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading">
                  User ID / Email
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400">
                    <IconUser className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={signInUserId}
                    onChange={(e) => setSignInUserId(e.target.value)}
                    placeholder="e.g. manager or manager@clearcart.store"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-heading">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400">
                    <IconLock className="w-4 h-4" />
                  </span>
                  <input
                    type={showSignInPassword ? "text" : "password"}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    {showSignInPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                Sign In to ClearCart Copilot
              </button>
            </form>
          )}

          {/* SIGN UP FORM (Name, Shop Name, Description, Mail ID, Password) */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400">
                    <IconUser className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                  Shop Name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400">
                    <IconStore className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={signUpShopName}
                    onChange={(e) => setSignUpShopName(e.target.value)}
                    placeholder="e.g. Apex Supermarket #102"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                  Shop Description
                </label>
                <textarea
                  required
                  rows={2}
                  value={signUpDescription}
                  onChange={(e) => setSignUpDescription(e.target.value)}
                  placeholder="e.g. Retail grocery chain carrying produce, dairy, bakery, and dry goods"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                  Mail ID (Email)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400">
                    <IconMail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={signUpMailId}
                    onChange={(e) => setSignUpMailId(e.target.value)}
                    placeholder="e.g. manager@store.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 font-heading">
                  Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400">
                    <IconLock className="w-4 h-4" />
                  </span>
                  <input
                    type={showSignUpPassword ? "text" : "password"}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="Create a password (e.g. Retail@2026)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showSignUpPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Criteria Checklist */}
                <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                  <p className="font-semibold text-slate-600 mb-1">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                    <span className={`flex items-center gap-1 ${/[A-Z]/.test(signUpPassword) ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      {/[A-Z]/.test(signUpPassword) ? "✓" : "○"} 1 Capital Letter (A-Z)
                    </span>
                    <span className={`flex items-center gap-1 ${/[0-9]/.test(signUpPassword) ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      {/[0-9]/.test(signUpPassword) ? "✓" : "○"} Numbers (0-9)
                    </span>
                    <span className={`flex items-center gap-1 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(signUpPassword) ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(signUpPassword) ? "✓" : "○"} 1 Special Char (!@#$)
                    </span>
                    <span className={`flex items-center gap-1 ${signUpPassword.length >= 6 ? "text-emerald-600 font-bold" : "text-slate-400"}`}>
                      {signUpPassword.length >= 6 ? "✓" : "○"} Min 6 Characters
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                Register Shop &amp; Launch Copilot
              </button>
            </form>
          )}

          {/* Quick Switch helper */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            {mode === "signin" ? (
              <p className="text-xs text-slate-500">
                New store manager?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer ml-1"
                >
                  Create Shop Account
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already have a store account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
