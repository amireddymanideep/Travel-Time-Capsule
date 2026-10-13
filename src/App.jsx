import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("travel_capsule_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Auth States
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  // Data States
  const [capsules, setCapsules] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState({
    totalCapsules: 0,
    unlockedCapsules: 0,
    lockedCapsules: 0,
    totalPhotos: 0,
    totalLocations: 0
  });
  const [loadingCapsules, setLoadingCapsules] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState(null);
  const [activeLightboxImg, setActiveLightboxImg] = useState(null);

  // Filter & Search
  const [filterMode, setFilterMode] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form State
  const [submittingCapsule, setSubmittingCapsule] = useState(false);
  const [createMsg, setCreateMsg] = useState({ type: "", text: "" });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [newCapsule, setNewCapsule] = useState({
    title: "",
    destination: "",
    location: "",
    coordinates: "",
    travelDate: "",
    unlockDate: "",
    companions: "",
    expenses: "",
    description: "",
    note: "",
    videoUrl: "",
    photoUrls: []
  });

  const loadUserData = async (userId) => {
    if (!userId) return;
    setLoadingCapsules(true);
    try {
      const [capsRes, statsRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE}/api/capsules?userId=${userId}`),
        fetch(`${API_BASE}/api/capsules/stats?userId=${userId}`),
        fetch(`${API_BASE}/api/capsules/timeline?userId=${userId}`)
      ]);

      if (capsRes.ok) {
        const data = await capsRes.json();
        setCapsules(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setTimeline(data);
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setLoadingCapsules(false);
    }
  };

  // Save user session
  useEffect(() => {
    if (user) {
      localStorage.setItem("travel_capsule_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("travel_capsule_user");
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      loadUserData(user.id);
    }
  }, [user?.id]);

  // ==============================
  // AUTHENTICATION
  // ==============================
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!loginForm.email || !loginForm.password) {
      setAuthError("Please fill in both email and password");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      setUser(data.user);
      setActiveTab("dashboard");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (!signupForm.name || !signupForm.email || !signupForm.password) {
      setAuthError("All fields are required");
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setAuthSuccess("Account created successfully! You can now log in.");
      setLoginForm({ email: signupForm.email, password: "" });
      setAuthMode("login");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCapsules([]);
    setTimeline([]);
    setSelectedCapsule(null);
    setActiveTab("dashboard");
  };

  // ==============================
  // GEOLOCATION
  // ==============================
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        setNewCapsule((prev) => ({
          ...prev,
          coordinates: coords,
          location: prev.location ? prev.location : `GPS: ${coords}`
        }));
      },
      (err) => {
        alert("Location access denied or unavailable: " + err.message);
      }
    );
  };

  // ==============================
  // PHOTO UPLOADER
  // ==============================
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    const uploadedUrls = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${API_BASE}/api/capsules/upload`, {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.url) {
          uploadedUrls.push(data.url);
        } else {
          console.error("Upload error:", data.message);
        }
      } catch (err) {
        console.error("Network error during photo upload:", err);
      }
    }

    setNewCapsule((prev) => ({
      ...prev,
      photoUrls: [...prev.photoUrls, ...uploadedUrls]
    }));
    setUploadingPhotos(false);
  };

  const removeUploadedPhoto = (indexToRemove) => {
    setNewCapsule((prev) => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // ==============================
  // CREATE CAPSULE
  // ==============================
  const handleCreateCapsule = async (e) => {
    e.preventDefault();
    setCreateMsg({ type: "", text: "" });

    if (!newCapsule.title || !newCapsule.destination || !newCapsule.travelDate || !newCapsule.unlockDate) {
      setCreateMsg({
        type: "error",
        text: "Please provide Trip Title, Destination, Travel Date, and Unlock Date."
      });
      return;
    }

    setSubmittingCapsule(true);
    try {
      const payload = {
        ...newCapsule,
        userId: user.id
      };

      const res = await fetch(`${API_BASE}/api/capsules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create capsule");
      }

      setCreateMsg({
        type: "success",
        text: "🎉 Your travel time capsule was sealed and saved successfully!"
      });

      // Reset form
      setNewCapsule({
        title: "",
        destination: "",
        location: "",
        coordinates: "",
        travelDate: "",
        unlockDate: "",
        companions: "",
        expenses: "",
        description: "",
        note: "",
        videoUrl: "",
        photoUrls: []
      });

      // Reload data
      loadUserData(user.id);
      setTimeout(() => {
        setActiveTab("capsules");
        setCreateMsg({ type: "", text: "" });
      }, 1200);
    } catch (err) {
      setCreateMsg({ type: "error", text: err.message });
    } finally {
      setSubmittingCapsule(false);
    }
  };

  // Helper date preset buttons
  const setUnlockPreset = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const dateStr = d.toISOString().split("T")[0];
    setNewCapsule((prev) => ({ ...prev, unlockDate: dateStr }));
  };

  const setUnlockToday = () => {
    const today = new Date().toISOString().split("T")[0];
    setNewCapsule((prev) => ({ ...prev, unlockDate: today }));
  };

  // Dynamic check for whether a capsule's unlock date/time has arrived
  const isCapsuleUnlocked = (capsule) => {
    if (!capsule) return false;
    if (!capsule.unlockDate || !capsule.unlockDate.trim()) return true;

    try {
      const dateStr = capsule.unlockDate.trim();
      // Date only (YYYY-MM-DD): compare against local today date string
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        return dateStr <= todayStr;
      }

      // Full timestamp or ISO date-time
      const unlockTime = new Date(dateStr).getTime();
      if (isNaN(unlockTime)) {
        return capsule.isUnlocked === true;
      }
      return Date.now() >= unlockTime;
    } catch {
      return capsule.isUnlocked === true;
    }
  };

  // Open detail / memory timeline modal for a capsule
  const handleOpenCapsule = async (capsuleOrId) => {
    let target = null;
    let targetId = null;

    if (typeof capsuleOrId === "object" && capsuleOrId !== null) {
      target = capsuleOrId;
      targetId = capsuleOrId.id;
    } else {
      targetId = capsuleOrId;
      target = capsules.find((c) => c.id === targetId);
    }

    if (!target && !targetId) return;

    // Check unlock condition dynamically
    const unlocked = isCapsuleUnlocked(target);

    // Calculate days remaining if locked
    let daysRemaining = target?.daysRemaining || 0;
    if (!unlocked && target?.unlockDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const unlock = new Date(target.unlockDate.includes("T") ? target.unlockDate : `${target.unlockDate}T00:00:00`);
      unlock.setHours(0, 0, 0, 0);
      const diffTime = unlock - today;
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Set selected capsule immediately so modal opens with no delay
    if (target) {
      setSelectedCapsule({
        ...target,
        isUnlocked: unlocked,
        daysRemaining: !unlocked ? daysRemaining : 0
      });
    }

    // Fetch full capsule data from backend
    if (targetId) {
      try {
        const res = await fetch(`${API_BASE}/api/capsules/${targetId}`);
        if (res.ok) {
          const data = await res.json();
          const finalUnlocked = isCapsuleUnlocked(data);
          setSelectedCapsule({
            ...data,
            isUnlocked: finalUnlocked,
            daysRemaining: !finalUnlocked ? (data.daysRemaining || daysRemaining) : 0
          });
        }
      } catch (err) {
        console.error("Failed to load capsule details:", err);
      }
    }
  };

  // Delete capsule
  const handleDeleteCapsule = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this travel time capsule?")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/capsules/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedCapsule?.id === id) {
          setSelectedCapsule(null);
        }
        loadUserData(user.id);
      }
    } catch (err) {
      alert("Failed to delete capsule: " + err.message);
    }
  };

  // Filtered capsules
  const filteredCapsules = capsules.filter((c) => {
    const unlocked = isCapsuleUnlocked(c);
    if (filterMode === "unlocked" && !unlocked) return false;
    if (filterMode === "locked" && unlocked) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchDest = c.destination?.toLowerCase().includes(q);
      const matchCompanions = c.companions?.toLowerCase().includes(q);
      return matchTitle || matchDest || matchCompanions;
    }
    return true;
  });

  // Unique visited locations
  const visitedLocations = Array.from(
    new Set(
      capsules
        .map((c) => c.destination || c.location)
        .filter(Boolean)
        .map((s) => s.trim())
    )
  ).map((locName) => {
    const matched = capsules.find((c) => (c.destination || c.location)?.trim() === locName);
    return {
      name: locName,
      coordinates: matched?.coordinates || "Not specified",
      capsuleTitle: matched?.title,
      travelDate: matched?.travelDate
    };
  });

  // ==============================
  // AUTH VIEW (WHEN LOGGED OUT)
  // ==============================
  if (!user) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="logo-badge">🧭</div>
          <h1>Travel Time Capsule</h1>
          <p className="subtitle">
            {authMode === "login"
              ? "Unlock and preserve your journeys for the future."
              : "Begin sealing your cherished travel memories."}
          </p>

          {authError && <div className="alert-box alert-error">⚠️ {authError}</div>}
          {authSuccess && <div className="alert-box alert-success">✅ {authSuccess}</div>}

          {authMode === "login" ? (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. manideep@gmail.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={authLoading}>
                {authLoading ? "Signing in..." : "🔓 Login to Your Vault"}
              </button>

              <div className="auth-switch">
                Don't have an account yet?
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                >
                  Create Account
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="auth-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Manideep"
                  value={signupForm.name}
                  onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password (min 6 characters)</label>
                <input
                  type="password"
                  placeholder="Choose a secure password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" disabled={authLoading}>
                {authLoading ? "Creating account..." : "✨ Register Account"}
              </button>

              <div className="auth-switch">
                Already registered?
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ==============================
  // MAIN APP VIEW (LOGGED IN)
  // ==============================
  return (
    <div className="app-layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🧭</span>
          <div className="brand-text">
            <h2>Time Capsule</h2>
            <span>Travel Memory Vault</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span className="nav-icon">🏠</span>
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            <span className="nav-icon">➕</span>
            <span>Create Capsule</span>
          </button>

          <button
            className={`nav-item ${activeTab === "capsules" ? "active" : ""}`}
            onClick={() => setActiveTab("capsules")}
          >
            <span className="nav-icon">📦</span>
            <span>My Capsules</span>
          </button>

          <button
            className={`nav-item ${activeTab === "timeline" ? "active" : ""}`}
            onClick={() => setActiveTab("timeline")}
          >
            <span className="nav-icon">⏳</span>
            <span>Trip Timeline</span>
          </button>

          <button
            className={`nav-item ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            <span className="nav-icon">📍</span>
            <span>Visited Places</span>
          </button>

          <button
            className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <span className="nav-icon">👤</span>
            <span>Profile</span>
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="user-snippet">
            <div className="user-avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="app-main">
        {/* ==============================
            DASHBOARD TAB
        ============================== */}
        {activeTab === "dashboard" && (
          <div>
            <div className="page-header">
              <div className="header-titles">
                <h1>Welcome Back, {user.name} 👋</h1>
                <p>Preserve your adventures today. Re-live them when the time is right.</p>
              </div>
              <button className="btn-primary" onClick={() => setActiveTab("create")}>
                ✨ Create New Capsule
              </button>
            </div>

            <div className="hero-banner">
              <div className="hero-content">
                <span className="hero-tag">Digital Time Lock Mechanism</span>
                <h2>Capture Memories Before They Fade</h2>
                <p>
                  Store visited places, uncompressed travel photos, companions, costs, and secret notes to
                  your future self locked until a future milestone date.
                </p>
                <div className="hero-actions">
                  <button className="btn-primary" onClick={() => setActiveTab("create")}>
                    🔒 Seal a Memory
                  </button>
                  <button className="btn-secondary" onClick={() => setActiveTab("timeline")}>
                    🗺️ Walk the Timeline
                  </button>
                </div>
              </div>
            </div>

            {/* REAL STATS COUNTERS */}
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon total">📦</div>
                <div className="stat-data">
                  <h3>{stats.totalCapsules}</h3>
                  <span>Total Capsules</span>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon unlocked">🔓</div>
                <div className="stat-data">
                  <h3>{stats.unlockedCapsules}</h3>
                  <span>Unlocked Vaults</span>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon locked">🔒</div>
                <div className="stat-data">
                  <h3>{stats.lockedCapsules}</h3>
                  <span>Locked Secrets</span>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon places">📍</div>
                <div className="stat-data">
                  <h3>{stats.totalLocations}</h3>
                  <span>Visited Places</span>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon photos">📸</div>
                <div className="stat-data">
                  <h3>{stats.totalPhotos}</h3>
                  <span>Photos Sealed</span>
                </div>
              </div>
            </div>

            {/* RECENT CAPSULES SECTION */}
            <div className="panel-header">
              <h2>Recent Time Capsules</h2>
              <p>Your latest preserved journeys</p>
            </div>

            {loadingCapsules ? (
              <p>Loading capsules from database...</p>
            ) : capsules.length === 0 ? (
              <div className="content-panel" style={{ textAlign: "center", padding: "40px" }}>
                <span style={{ fontSize: "48px" }}>📭</span>
                <h3 style={{ margin: "12px 0 6px" }}>No Travel Capsules Yet</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>
                  You haven't sealed any memories into your time vault.
                </p>
                <button className="btn-primary" onClick={() => setActiveTab("create")}>
                  ➕ Create Your First Capsule
                </button>
              </div>
            ) : (
              <div className="capsules-grid">
                {capsules.slice(0, 3).map((c) => {
                  const unlocked = isCapsuleUnlocked(c);
                  return (
                    <div className="capsule-card" key={c.id} onClick={() => handleOpenCapsule(c)}>
                      <div className="capsule-thumbnail">
                        {unlocked && c.photos && c.photos.length > 0 ? (
                          <img src={c.photos[0]} alt={c.title} />
                        ) : (
                          <div className="locked-overlay">
                            <span className="lock-big-icon">🔒</span>
                            <span style={{ fontSize: "12px", opacity: 0.85 }}>
                              {unlocked ? "Memory Unlocked" : `Locked for ${c.daysRemaining} days`}
                            </span>
                          </div>
                        )}
                        <span className={`lock-badge-pill ${unlocked ? "badge-unlocked" : "badge-locked"}`}>
                          {unlocked ? "🔓 Unlocked" : "🔒 Locked Vault"}
                        </span>
                      </div>

                      <div className="capsule-body">
                        <h3 className="capsule-title">{c.title}</h3>
                        <div className="capsule-meta">
                          <div className="meta-item">
                            <span>📍</span> {c.destination || c.location}
                          </div>
                          <div className="meta-item">
                            <span>📅</span> Traveled: {c.travelDate}
                          </div>
                          <div className="meta-item">
                            <span>🔐</span> Unlocks: {c.unlockDate}
                          </div>
                        </div>
                        <p className="capsule-desc-preview">
                          {unlocked ? c.description || "No description provided." : "🔒 Hidden in locked vault."}
                        </p>
                        <div className="capsule-footer">
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            📸 {c.photoCount || 0} Photos
                          </span>
                          <button
                            className="btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCapsule(c);
                            }}
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                          >
                            {unlocked ? "Open Memories →" : "Check Lock →"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==============================
            CREATE CAPSULE TAB
        ============================== */}
        {activeTab === "create" && (
          <div className="content-panel">
            <div className="panel-header">
              <h2>✨ Create a New Travel Time Capsule</h2>
              <p>Store your travel experiences, multimedia, companions, and personal notes locked until a future date.</p>
            </div>

            {createMsg.text && (
              <div className={`alert-box ${createMsg.type === "error" ? "alert-error" : "alert-success"}`}>
                {createMsg.type === "error" ? "⚠️" : "✅"} {createMsg.text}
              </div>
            )}

            <form onSubmit={handleCreateCapsule} className="capsule-form-layout">
              <div className="form-grid">
                {/* TITLE */}
                <div className="form-group full-width">
                  <label>Trip / Capsule Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Goa Beach Expedition 2026"
                    value={newCapsule.title}
                    onChange={(e) => setNewCapsule({ ...newCapsule, title: e.target.value })}
                    required
                  />
                </div>

                {/* DESTINATION */}
                <div className="form-group">
                  <label>Destination City / Region *</label>
                  <input
                    type="text"
                    placeholder="e.g. Goa, India"
                    value={newCapsule.destination}
                    onChange={(e) => setNewCapsule({ ...newCapsule, destination: e.target.value })}
                    required
                  />
                </div>

                {/* SPECIFIC LOCATION */}
                <div className="form-group">
                  <label>Specific Visited Spot / Landmark</label>
                  <input
                    type="text"
                    placeholder="e.g. Baga Beach & Fort Aguada"
                    value={newCapsule.location}
                    onChange={(e) => setNewCapsule({ ...newCapsule, location: e.target.value })}
                  />
                </div>

                {/* GEOLOCATION COORDINATES */}
                <div className="form-group full-width">
                  <label>Geographic Coordinates (for interactive Map tracking)</label>
                  <div className="location-input-group">
                    <input
                      type="text"
                      placeholder="Latitude, Longitude (e.g. 15.5553, 73.7517)"
                      value={newCapsule.coordinates}
                      onChange={(e) => setNewCapsule({ ...newCapsule, coordinates: e.target.value })}
                    />
                    <button type="button" className="btn-gps" onClick={getCurrentLocation}>
                      📍 Detect GPS Location
                    </button>
                  </div>
                </div>

                {/* TRAVEL DATE */}
                <div className="form-group">
                  <label>Trip Date (When you traveled) *</label>
                  <input
                    type="date"
                    value={newCapsule.travelDate}
                    onChange={(e) => setNewCapsule({ ...newCapsule, travelDate: e.target.value })}
                    required
                  />
                </div>

                {/* UNLOCK DATE */}
                <div className="form-group">
                  <label>Future Time-Lock Unlock Date *</label>
                  <input
                    type="date"
                    value={newCapsule.unlockDate}
                    onChange={(e) => setNewCapsule({ ...newCapsule, unlockDate: e.target.value })}
                    required
                  />
                  <div className="preset-dates-row">
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Quick presets:</span>
                    <button type="button" className="btn-chip" onClick={() => setUnlockPreset(1)}>+1 Month</button>
                    <button type="button" className="btn-chip" onClick={() => setUnlockPreset(6)}>+6 Months</button>
                    <button type="button" className="btn-chip" onClick={() => setUnlockPreset(12)}>+1 Year</button>
                    <button type="button" className="btn-chip" onClick={() => setUnlockPreset(60)}>+5 Years</button>
                    <button type="button" className="btn-chip" onClick={setUnlockToday}>Unlock Today (Test)</button>
                  </div>
                </div>

                {/* COMPANIONS */}
                <div className="form-group">
                  <label>Travel Companions</label>
                  <input
                    type="text"
                    placeholder="e.g. College Trekking Squad, Rahul, Sneha"
                    value={newCapsule.companions}
                    onChange={(e) => setNewCapsule({ ...newCapsule, companions: e.target.value })}
                  />
                </div>

                {/* EXPENSES */}
                <div className="form-group">
                  <label>Trip Expenses</label>
                  <input
                    type="text"
                    placeholder="e.g. ₹18,500 or $450"
                    value={newCapsule.expenses}
                    onChange={(e) => setNewCapsule({ ...newCapsule, expenses: e.target.value })}
                  />
                </div>

                {/* VIDEO / VLOG URL */}
                <div className="form-group full-width">
                  <label>Video or Travel Vlog Link (Optional)</label>
                  <input
                    type="url"
                    placeholder="e.g. YouTube video URL or cloud video link"
                    value={newCapsule.videoUrl}
                    onChange={(e) => setNewCapsule({ ...newCapsule, videoUrl: e.target.value })}
                  />
                </div>

                {/* DESCRIPTION */}
                <div className="form-group full-width">
                  <label>Trip Description & Highlights</label>
                  <textarea
                    rows={3}
                    placeholder="What did you experience on this trip? Highlights, feelings, favorite food..."
                    value={newCapsule.description}
                    onChange={(e) => setNewCapsule({ ...newCapsule, description: e.target.value })}
                  />
                </div>

                {/* PERSONAL SECRET NOTE */}
                <div className="form-group full-width">
                  <label>💌 Personal Note to Future Self (Sealed until Unlock Date)</label>
                  <textarea
                    rows={3}
                    placeholder="Write a message to your future self that will remain strictly confidential and locked until the unlock date arrives..."
                    value={newCapsule.note}
                    onChange={(e) => setNewCapsule({ ...newCapsule, note: e.target.value })}
                  />
                </div>

                {/* PHOTO UPLOADS */}
                <div className="form-group full-width">
                  <label>Upload Trip Photos</label>
                  <label className="upload-dropzone">
                    <div className="upload-icon">📸</div>
                    <strong>Click to select and upload travel photos</strong>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      PNG, JPG, WEBP. Photos are uploaded and securely attached to your capsule.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  {uploadingPhotos && (
                    <p style={{ marginTop: "8px", fontSize: "13px", color: "var(--accent)" }}>
                      ⏳ Uploading photos to server...
                    </p>
                  )}

                  {newCapsule.photoUrls.length > 0 && (
                    <div className="uploaded-photos-preview">
                      {newCapsule.photoUrls.map((url, idx) => (
                        <div className="photo-preview-item" key={idx}>
                          <img src={url} alt={`Preview ${idx + 1}`} />
                          <button
                            type="button"
                            className="btn-remove-photo"
                            onClick={() => removeUploadedPhoto(idx)}
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "28px", display: "flex", gap: "12px" }}>
                <button type="submit" className="btn-primary" disabled={submittingCapsule || uploadingPhotos}>
                  {submittingCapsule ? "Sealing Capsule..." : "🔒 Seal and Save Capsule"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setActiveTab("capsules")}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ==============================
            MY CAPSULES TAB
        ============================== */}
        {activeTab === "capsules" && (
          <div>
            <div className="page-header">
              <div className="header-titles">
                <h1>My Travel Time Capsules</h1>
                <p>Browse, filter, and inspect your locked and unlocked memories.</p>
              </div>
              <button className="btn-primary" onClick={() => setActiveTab("create")}>
                ➕ Create Capsule
              </button>
            </div>

            <div className="section-toolbar">
              <div className="filter-tabs">
                <button
                  className={`filter-btn ${filterMode === "all" ? "active" : ""}`}
                  onClick={() => setFilterMode("all")}
                >
                  All ({capsules.length})
                </button>
                <button
                  className={`filter-btn ${filterMode === "unlocked" ? "active" : ""}`}
                  onClick={() => setFilterMode("unlocked")}
                >
                  🔓 Unlocked ({stats.unlockedCapsules})
                </button>
                <button
                  className={`filter-btn ${filterMode === "locked" ? "active" : ""}`}
                  onClick={() => setFilterMode("locked")}
                >
                  🔒 Locked ({stats.lockedCapsules})
                </button>
              </div>

              <input
                type="text"
                className="search-input"
                placeholder="🔍 Search destination or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loadingCapsules ? (
              <p>Loading your capsules from database...</p>
            ) : filteredCapsules.length === 0 ? (
              <div className="content-panel" style={{ textAlign: "center", padding: "40px" }}>
                <span style={{ fontSize: "40px" }}>🔍</span>
                <h3 style={{ margin: "12px 0 6px" }}>No capsules found</h3>
                <p style={{ color: "var(--text-muted)" }}>
                  {searchQuery ? "Try a different search term" : "Create a capsule to start storing memories!"}
                </p>
              </div>
            ) : (
              <div className="capsules-grid">
                {filteredCapsules.map((c) => {
                  const unlocked = isCapsuleUnlocked(c);
                  return (
                    <div className="capsule-card" key={c.id} onClick={() => handleOpenCapsule(c)}>
                      <div className="capsule-thumbnail">
                        {unlocked && c.photos && c.photos.length > 0 ? (
                          <img src={c.photos[0]} alt={c.title} />
                        ) : (
                          <div className="locked-overlay">
                            <span className="lock-big-icon">🔒</span>
                            <span style={{ fontSize: "12px", opacity: 0.85 }}>
                              {unlocked ? "Memory Unlocked" : `${c.daysRemaining} days remaining`}
                            </span>
                          </div>
                        )}
                        <span className={`lock-badge-pill ${unlocked ? "badge-unlocked" : "badge-locked"}`}>
                          {unlocked ? "🔓 Unlocked" : "🔒 Locked Vault"}
                        </span>
                      </div>

                      <div className="capsule-body">
                        <h3 className="capsule-title">{c.title}</h3>
                        <div className="capsule-meta">
                          <div className="meta-item">
                            <span>📍</span> {c.destination || c.location}
                          </div>
                          <div className="meta-item">
                            <span>📅</span> Traveled: {c.travelDate}
                          </div>
                          <div className="meta-item">
                            <span>🔐</span> Unlocks: {c.unlockDate}
                          </div>
                          {c.companions && (
                            <div className="meta-item">
                              <span>👥</span> {c.companions}
                            </div>
                          )}
                        </div>

                        <p className="capsule-desc-preview">
                          {unlocked ? c.description || "No description provided." : "🔒 Sealed in time vault."}
                        </p>

                        <div className="capsule-footer">
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            📸 {c.photoCount || 0} Photos
                          </span>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn-danger"
                              onClick={(e) => handleDeleteCapsule(c.id, e)}
                              title="Delete capsule"
                            >
                              🗑️
                            </button>
                            <button
                              className="btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCapsule(c);
                              }}
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              {unlocked ? "Open →" : "🔒 Locked"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==============================
            TIMELINE TAB
        ============================== */}
        {activeTab === "timeline" && (
          <div>
            <div className="page-header">
              <div className="header-titles">
                <h1>Trip Memory Timeline</h1>
                <p>Journey through your travel history chronologically from earliest to latest.</p>
              </div>
            </div>

            {timeline.length === 0 ? (
              <div className="content-panel" style={{ textAlign: "center", padding: "40px" }}>
                <span style={{ fontSize: "40px" }}>⏳</span>
                <h3>No trips on your timeline yet</h3>
                <p style={{ color: "var(--text-muted)", marginTop: "6px" }}>
                  Create capsules to watch your travel journey evolve over time.
                </p>
              </div>
            ) : (
              <div className="timeline-container">
                <div className="timeline-line"></div>
                {timeline.map((c) => {
                  const unlocked = isCapsuleUnlocked(c);
                  return (
                    <div className="timeline-item" key={c.id}>
                      <div className={`timeline-node ${unlocked ? "unlocked" : ""}`}>
                        {unlocked ? "🔓" : "🔒"}
                      </div>
                      <div className="timeline-card" onClick={() => handleOpenCapsule(c)} style={{ cursor: "pointer" }}>
                        <span className="timeline-date-stamp">
                          📅 {c.travelDate}
                        </span>
                        <h3 style={{ color: "var(--primary-deep)", margin: "4px 0 8px" }}>{c.title}</h3>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>
                          📍 {c.destination || c.location} {c.companions ? `• 👥 ${c.companions}` : ""}
                        </p>
                        <p style={{ fontSize: "13px", color: "#475569" }}>
                          {unlocked ? c.description : "🔒 Hidden in locked vault until " + c.unlockDate}
                        </p>
                        <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--primary-light)", fontWeight: 600 }}>
                          {unlocked ? "✨ Click to open full memories →" : `🔐 Locked (${c.daysRemaining} days left)`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==============================
            VISITED PLACES & MAP TAB
        ============================== */}
        {activeTab === "map" && (
          <div>
            <div className="page-header">
              <div className="header-titles">
                <h1>Visited Destinations & Map</h1>
                <p>Explore geographic coordinates and places you have captured across all capsules.</p>
              </div>
            </div>

            <div className="locations-container">
              {/* LIST OF DESTINATIONS */}
              <div className="places-list">
                <h3>Visited Destinations ({visitedLocations.length})</h3>
                {visitedLocations.length === 0 ? (
                  <div className="content-panel" style={{ textAlign: "center", padding: "24px" }}>
                    <p style={{ color: "var(--text-muted)" }}>No visited locations recorded yet.</p>
                  </div>
                ) : (
                  visitedLocations.map((place, idx) => (
                    <div className="place-card" key={idx}>
                      <div className="place-info">
                        <h4>📍 {place.name}</h4>
                        <p>Traveled: {place.travelDate || "Recorded in capsule"}</p>
                        <p style={{ fontSize: "12px", color: "var(--primary-light)" }}>
                          Coordinates: {place.coordinates}
                        </p>
                      </div>
                      {place.coordinates && place.coordinates !== "Not specified" && (
                        <a
                          href={`https://www.google.com/maps?q=${encodeURIComponent(place.coordinates)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                        >
                          🗺️ View on Map
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* INTERACTIVE MAP VISUALIZER */}
              <div className="interactive-map-canvas">
                <div className="map-background-art"></div>
                <div className="map-pin-highlight">📍</div>
                <h3 style={{ color: "var(--primary-deep)", marginBottom: "8px" }}>
                  Travel Footprint
                </h3>
                <p style={{ maxWidth: "340px", color: "#334155", fontSize: "14px", marginBottom: "16px" }}>
                  You have pinned <strong>{visitedLocations.length} destination(s)</strong> across your digital capsules.
                </p>
                {visitedLocations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
                    {visitedLocations.map((p, i) => (
                      <span key={i} className="travel-badge">
                        📍 {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==============================
            PROFILE TAB
        ============================== */}
        {activeTab === "profile" && (
          <div className="profile-card">
            <div className="profile-avatar-large">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ color: "var(--primary-deep)", marginBottom: "4px" }}>{user.name}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>{user.email}</p>

            <div className="profile-badges-row">
              <span className="travel-badge">🎒 Memory Vault Keeper</span>
              <span className="travel-badge">🌍 {stats.totalLocations} Destinations</span>
              <span className="travel-badge">📦 {stats.totalCapsules} Capsules</span>
            </div>

            <div className="stats-grid" style={{ marginTop: "24px", gridTemplateColumns: "1fr 1fr" }}>
              <div className="stat-box" style={{ justifyContent: "center", textAlign: "center" }}>
                <div className="stat-data">
                  <h3>{stats.unlockedCapsules}</h3>
                  <span>Unlocked Trips</span>
                </div>
              </div>
              <div className="stat-box" style={{ justifyContent: "center", textAlign: "center" }}>
                <div className="stat-data">
                  <h3>{stats.lockedCapsules}</h3>
                  <span>Time-Locked Trips</span>
                </div>
              </div>
            </div>

            <button
              className="btn-danger"
              style={{ marginTop: "24px", padding: "10px 24px" }}
              onClick={handleLogout}
            >
              Sign Out from Account
            </button>
          </div>
        )}
      </main>

      {/* ==============================
          CAPSULE DETAIL MODAL
      ============================== */}
      {selectedCapsule && (
        <div className="modal-backdrop" onClick={() => setSelectedCapsule(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedCapsule.title}</h2>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  className="btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                  onClick={() => {
                    setSelectedCapsule(null);
                    setActiveTab("timeline");
                  }}
                  title="View this and other trips on the timeline"
                >
                  ⏳ View on Timeline
                </button>
                <button className="btn-close-modal" onClick={() => setSelectedCapsule(null)}>
                  ✕
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* IF CAPSULE IS LOCKED */}
              {!selectedCapsule.isUnlocked ? (
                <div>
                  <div className="vault-locked-banner">
                    <div className="vault-lock-graphic">🔒</div>
                    <h3 style={{ fontSize: "24px", marginBottom: "8px" }}>Time Capsule Locked</h3>
                    <p style={{ color: "#cbd5e1", maxWidth: "480px", margin: "0 auto" }}>
                      This capsule is sealed until <strong>{selectedCapsule.unlockDate}</strong>.
                      Photos and personal notes remain hidden until that date arrives.
                    </p>

                    <div className="vault-countdown-container">
                      <div className="countdown-unit">
                        <strong>{selectedCapsule.daysRemaining}</strong>
                        <span>Days Left</span>
                      </div>
                    </div>
                  </div>

                  <div className="modal-details-grid" style={{ marginTop: "20px" }}>
                    <div className="detail-bubble">
                      <label>Destination</label>
                      <span>📍 {selectedCapsule.destination || selectedCapsule.location}</span>
                    </div>
                    <div className="detail-bubble">
                      <label>Trip Date</label>
                      <span>📅 {selectedCapsule.travelDate}</span>
                    </div>
                    <div className="detail-bubble">
                      <label>Unlock Date</label>
                      <span>🔐 {selectedCapsule.unlockDate}</span>
                    </div>
                    {selectedCapsule.companions && (
                      <div className="detail-bubble">
                        <label>Companions</label>
                        <span>👥 {selectedCapsule.companions}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", marginTop: "16px" }}>
                    <h4 style={{ color: "var(--primary-deep)", marginBottom: "6px" }}>Trip Overview</h4>
                    <p style={{ color: "#475569", fontSize: "14px" }}>
                      {selectedCapsule.description || "Trip details sealed."}
                    </p>
                  </div>
                </div>
              ) : (
                /* IF CAPSULE IS UNLOCKED */
                <div>
                  <div className="unlocked-banner">
                    <span style={{ fontSize: "20px" }}>🔓</span>
                    <span>{selectedCapsule.lockStateMessage || "Capsule Unlocked! Enjoy your memories."}</span>
                  </div>

                  {/* PERSONAL SECRET NOTE CARD */}
                  {selectedCapsule.note && (
                    <div className="diary-note-card">
                      <h4>📜 Note to Future Self</h4>
                      <p>{selectedCapsule.note}</p>
                    </div>
                  )}

                  <div className="modal-details-grid">
                    <div className="detail-bubble">
                      <label>Destination</label>
                      <span>📍 {selectedCapsule.destination || selectedCapsule.location}</span>
                    </div>
                    <div className="detail-bubble">
                      <label>Trip Date</label>
                      <span>📅 {selectedCapsule.travelDate}</span>
                    </div>
                    <div className="detail-bubble">
                      <label>Unlock Date</label>
                      <span>🔓 {selectedCapsule.unlockDate}</span>
                    </div>
                    {selectedCapsule.companions && (
                      <div className="detail-bubble">
                        <label>Companions</label>
                        <span>👥 {selectedCapsule.companions}</span>
                      </div>
                    )}
                    {selectedCapsule.expenses && (
                      <div className="detail-bubble">
                        <label>Trip Expenses</label>
                        <span>💰 {selectedCapsule.expenses}</span>
                      </div>
                    )}
                    {selectedCapsule.coordinates && (
                      <div className="detail-bubble">
                        <label>Coordinates</label>
                        <span>
                          <a
                            href={`https://www.google.com/maps?q=${encodeURIComponent(selectedCapsule.coordinates)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--primary-light)", textDecoration: "none" }}
                          >
                            🌐 {selectedCapsule.coordinates} (Open Map)
                          </a>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DESCRIPTION */}
                  {selectedCapsule.description && (
                    <div style={{ marginBottom: "20px" }}>
                      <h4 style={{ color: "var(--primary-deep)", marginBottom: "6px" }}>Trip Overview</h4>
                      <p style={{ color: "#334155", fontSize: "14.5px", lineHeight: "1.6" }}>
                        {selectedCapsule.description}
                      </p>
                    </div>
                  )}

                  {/* VIDEO LINK */}
                  {selectedCapsule.videoUrl && (
                    <div style={{ marginBottom: "20px" }}>
                      <h4 style={{ color: "var(--primary-deep)", marginBottom: "6px" }}>Travel Video / Vlog</h4>
                      <a
                        href={selectedCapsule.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                        style={{ fontSize: "13px" }}
                      >
                        ▶️ Watch Travel Video
                      </a>
                    </div>
                  )}

                  {/* PHOTO GALLERY */}
                  <h4 style={{ color: "var(--primary-deep)", marginTop: "24px" }}>
                    Travel Photos ({selectedCapsule.photos ? selectedCapsule.photos.length : 0})
                  </h4>

                  {selectedCapsule.photos && selectedCapsule.photos.length > 0 ? (
                    <div className="modal-photos-gallery">
                      {selectedCapsule.photos.map((imgUrl, i) => (
                        <div
                          className="gallery-thumbnail"
                          key={i}
                          onClick={() => setActiveLightboxImg(imgUrl)}
                        >
                          <img src={imgUrl} alt={`Memory ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px" }}>
                      No photos attached to this capsule.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR FULL PHOTO VIEW */}
      {activeLightboxImg && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1100, background: "rgba(0, 0, 0, 0.9)" }}
          onClick={() => setActiveLightboxImg(null)}
        >
          <div style={{ maxWidth: "90vw", maxHeight: "90vh", position: "relative" }}>
            <img
              src={activeLightboxImg}
              alt="Full view"
              style={{ maxWidth: "100%", maxHeight: "88vh", borderRadius: "10px", display: "block" }}
            />
            <button
              onClick={() => setActiveLightboxImg(null)}
              style={{
                position: "absolute",
                top: "-36px",
                right: "0",
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: "24px",
                cursor: "pointer"
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;