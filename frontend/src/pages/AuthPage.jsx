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
  const [mode, setMode] = useState("signin");

  // Track transition direction: 'forward' (signin -> signup) or 'backward' (signup -> signin)
  const [transitionDirection, setTransitionDirection] = useState("forward");

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    setTransitionDirection(newMode === "signup" ? "forward" : "backward");
    setMode(newMode);
    setErrorMsg("");
    setSuccessMsg("");
  };

  // Sign In state (empty by default for manual entry)
  const [signInMailId, setSignInMailId] = useState("");
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

    const email = signInMailId.trim().toLowerCase();
    const pwd = signInPassword.trim();

    if (!email || !pwd) {
      setErrorMsg("All fields are mandatory. Please enter both your Mail ID and Password.");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMsg("Please enter a valid Mail ID (e.g. manager@store.com).");
      return;
    }

    const users = getRegisteredUsers();
    const matched = users.find(
      (u) =>
        (u.mailId?.toLowerCase() === email ||
          u.userId?.toLowerCase() === email ||
          u.username?.toLowerCase() === email) &&
        u.password === pwd
    );

    if (matched) {
      const sessionUser = {
        userId: matched.userId || matched.mailId || email,
        name: matched.name || "Store Manager",
        shopName: matched.shopName || "ClearCart Retail Store",
        description: matched.description || "Retail & Inventory Store",
        mailId: matched.mailId || email,
      };
      localStorage.setItem("clearcart_auth_user", JSON.stringify(sessionUser));
      setSuccessMsg("Sign in successful! Launching Copilot…");
      setTimeout(() => {
        onLoginSuccess(sessionUser);
      }, 300);
    } else {
      setErrorMsg(
        "Invalid Mail ID or Password. If you do not have an account yet, please register under 'Create Shop Account'."
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

  function handleDemoLogin() {
    const demoUser = {
      userId: "manager@downtownstore.com",
      name: "Store Manager",
      shopName: "Downtown Store #104",
      description: "Retail grocery & essentials supermarket",
      mailId: "manager@downtownstore.com",
    };
    localStorage.setItem("clearcart_auth_user", JSON.stringify(demoUser));
    onLoginSuccess(demoUser);
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center py-10 px-4 sm:px-6 relative overflow-hidden transition-colors duration-300">
      {/* Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden transition-all">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-violet-700 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white flex items-center justify-center mb-3 shadow-lg">
              <IconSpark className="w-10 h-10" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl tracking-tight">
              ClearCart <span className="text-blue-200">Intelligence</span>
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 font-medium mt-1 max-w-sm">
              Grounded AI Decision Copilot for Retail Inventory &amp; Sales
            </p>
          </div>
        </div>

        {/* Demo Quick Access Bar */}
        <div className="px-6 sm:px-8 pt-5">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/60 dark:hover:to-indigo-900/60 border border-blue-200 dark:border-blue-800/80 text-blue-800 dark:text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs group"
          >
            <IconSpark className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
            <span>⚡ Instant Demo Access (Downtown Store #104)</span>
          </button>
        </div>

        {/* Tab Selector with Smooth Sliding Indicator */}
        <div className="relative flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/80 p-1.5 mx-6 sm:mx-8 mt-4 rounded-2xl">
          {/* Animated background pill */}
          <div
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700 transition-all duration-300 ease-out pointer-events-none ${
              mode === "signin" ? "left-1.5" : "left-[calc(50%+0.1875rem)]"
            }`}
          />
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`relative z-10 flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer text-center ${
              mode === "signin"
                ? "text-blue-700 dark:text-blue-400 font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`relative z-10 flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer text-center ${
              mode === "signup"
                ? "text-blue-700 dark:text-blue-400 font-extrabold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Create Shop Account
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {/* Alerts */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-start gap-2.5 animate-slide-right">
              <IconAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-start gap-2.5 animate-slide-right">
              <IconCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>{successMsg}</div>
            </div>
          )}

          {/* Animated Form Container */}
          <div
            key={mode}
            className={
              transitionDirection === "forward"
                ? "animate-slide-right"
                : "animate-slide-left"
            }
          >
            {/* SIGN IN FORM */}
            {mode === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4" autoComplete="off">
                <div className="fade-up stagger-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-heading">
                    Mail ID (Email)
                  </label>
                  <div className="relative flex items-center group">
                    <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                      <IconMail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      name="cc_user_email"
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore
                      required
                      value={signInMailId}
                      onChange={(e) => setSignInMailId(e.target.value)}
                      placeholder="Enter your registered mail ID"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="fade-up stagger-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-heading">
                    Password
                  </label>
                  <div className="relative flex items-center group">
                    <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                      <IconLock className="w-4 h-4" />
                    </span>
                    <input
                      type={showSignInPassword ? "text" : "password"}
                      name="cc_user_password"
                      autoComplete="new-password"
                      data-lpignore="true"
                      data-1p-ignore
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer transition-transform active:scale-95"
                    >
                      {showSignInPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="fade-up stagger-3 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    Sign In to ClearCart Copilot
                  </button>
                </div>
              </form>
            )}

            {/* SIGN UP FORM */}
            {mode === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="fade-up stagger-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 font-heading">
                    Full Name
                  </label>
                  <div className="relative flex items-center group">
                    <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                      <IconUser className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="fade-up stagger-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 font-heading">
                    Shop Name
                  </label>
                  <div className="relative flex items-center group">
                    <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                      <IconStore className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={signUpShopName}
                      onChange={(e) => setSignUpShopName(e.target.value)}
                      placeholder="e.g. Apex Supermarket #102"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="fade-up stagger-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 font-heading">
                    Shop Description
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={signUpDescription}
                    onChange={(e) => setSignUpDescription(e.target.value)}
                    placeholder="e.g. Retail grocery chain carrying produce, dairy, bakery, and dry goods"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all shadow-xs resize-none"
                  />
                </div>

                <div className="fade-up stagger-4">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 font-heading">
                    Mail ID (Email)
                  </label>
                  <div className="relative flex items-center group">
                    <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                      <IconMail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={signUpMailId}
                      onChange={(e) => setSignUpMailId(e.target.value)}
                      placeholder="e.g. manager@store.com"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all shadow-xs"
                    />
                  </div>
                </div>

                <div className="fade-up stagger-5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 font-heading">
                    Password
                  </label>
                  <div className="relative flex items-center group">
                    <span className="absolute left-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                      <IconLock className="w-4 h-4" />
                    </span>
                    <input
                      type={showSignUpPassword ? "text" : "password"}
                      required
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="Create a password (e.g. Retail@2026)"
                      className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer transition-transform active:scale-95"
                    >
                      {showSignUpPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Criteria Checklist */}
                  <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-1">
                    <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Password Requirements:</p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                      <span className={`flex items-center gap-1 ${/[A-Z]/.test(signUpPassword) ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                        {/[A-Z]/.test(signUpPassword) ? "✓" : "○"} 1 Capital Letter (A-Z)
                      </span>
                      <span className={`flex items-center gap-1 ${/[0-9]/.test(signUpPassword) ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                        {/[0-9]/.test(signUpPassword) ? "✓" : "○"} Numbers (0-9)
                      </span>
                      <span className={`flex items-center gap-1 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(signUpPassword) ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                        {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(signUpPassword) ? "✓" : "○"} 1 Special Char (!@#$)
                      </span>
                      <span className={`flex items-center gap-1 ${signUpPassword.length >= 6 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                        {signUpPassword.length >= 6 ? "✓" : "○"} Min 6 Characters
                      </span>
                    </div>
                  </div>
                </div>

                <div className="fade-up stagger-6 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    Register Shop &amp; Launch Copilot
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Switch helper with interactive micro-animation */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            {mode === "signin" ? (
              <p className="text-xs text-slate-500">
                New store manager?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="group inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer ml-1 transition-all"
                >
                  <span>Create Shop Account</span>
                  <span className="transition-transform duration-200 ease-out group-hover:translate-x-1">→</span>
                </button>
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Already have a store account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className="group inline-flex items-center gap-1 font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer ml-1 transition-all"
                >
                  <span className="transition-transform duration-200 ease-out group-hover:-translate-x-1">←</span>
                  <span>Sign In</span>
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
