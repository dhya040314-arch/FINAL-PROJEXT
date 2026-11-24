
import React, { useEffect, useMemo, useState } from "react";

const starterActivities = [
  { id: 1, title: "Go for a walk", description: "Get outside and explore somewhere new.", category: "Outdoor", image: "", favorite: false, completed: 0 },
  { id: 2, title: "Read a book", description: "Spend some time away from your screens.", category: "Creative", image: "", favorite: false, completed: 0 },
  { id: 3, title: "Learn something new", description: "Explore a skill or topic you've never tried.", category: "Learning", image: "", favorite: false, completed: 0 },
];

const THEMES = [
  { id: "cyberpunk", name: "Cyberpunk", tagline: "Neon future", colors: ["#00f5ff", "#ff2bd6", "#9d4edd"] },
  { id: "matrix", name: "Matrix", tagline: "Digital world", colors: ["#39ff14", "#008f39", "#b6ff00"] },
  { id: "arctic", name: "Arctic", tagline: "Ice cold", colors: ["#40cfff", "#b8f3ff", "#647dff"] },
  { id: "sunset", name: "Sunset", tagline: "After hours", colors: ["#ff8a45", "#ff4f91", "#a855f7"] },
];

const XP_PER_ACTIVITY = 20;
const DAILY_XP_CAP = 200;
const ACTIVITY_TIMER_SECONDS = 60;

function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function localDateKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 900 / image.width);

        canvas.width = image.width * scale;
        canvas.height = image.height * scale;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };

      image.onerror = reject;
      image.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getSpotifyEmbed(link) {
  try {
    const url = new URL(link);

    if (url.hostname !== "open.spotify.com") return "";

    const match = url.pathname.match(
      /^\/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/
    );

    if (!match) return "";

    return `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator`;
  } catch {
    return "";
  }
}

export default function App() {
  const [activities, setActivities] = useState(() =>
    loadData("unplugged-activities", starterActivities)
  );

  const [xp, setXp] = useState(() => loadData("unplugged-xp", 0));
  const [history, setHistory] = useState(() => loadData("unplugged-history", []));
  const [activeSession, setActiveSession] = useState(() =>
    loadData("unplugged-active-session", null)
  );

  const [theme, setTheme] = useState(() =>
    loadData("unplugged-theme", "cyberpunk")
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState("Explore");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Creative");
  const [image, setImage] = useState("");

  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  const [spotifyInput, setSpotifyInput] = useState(() =>
    loadData("unplugged-spotify", "")
  );

  const [spotifyLink, setSpotifyLink] = useState(() =>
    loadData("unplugged-spotify", "")
  );

  useEffect(() => {
    localStorage.setItem("unplugged-activities", JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem("unplugged-xp", JSON.stringify(xp));
  }, [xp]);

  useEffect(() => {
    localStorage.setItem("unplugged-history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("unplugged-active-session", JSON.stringify(activeSession));
  }, [activeSession]);

  useEffect(() => {
    localStorage.setItem("unplugged-theme", JSON.stringify(theme));

    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("unplugged-spotify", JSON.stringify(spotifyLink));
  }, [spotifyLink]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!message) return;

    const timeout = window.setTimeout(() => setMessage(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const today = localDateKey(now);

  const todaysHistory = useMemo(
    () => history.filter((entry) => entry.date === today),
    [history, today]
  );

  const dailyXp = todaysHistory.reduce(
    (sum, entry) => sum + (entry.xpAwarded || 0),
    0
  );

  const remainingXp = Math.max(0, DAILY_XP_CAP - dailyXp);

  const completedTodayIds = new Set(
    todaysHistory
      .filter((entry) => entry.type === "activity")
      .map((entry) => entry.activityId)
  );

  const distinctActivitiesToday = completedTodayIds.size;

  const challengeComplete = todaysHistory.some(
    (entry) => entry.type === "challenge"
  );

  const level = Math.floor(xp / 100) + 1;
  const currentLevelXp = xp % 100;

  const activeRemaining = activeSession
    ? Math.max(0, Math.ceil((activeSession.endsAt - now) / 1000))
    : 0;

  const activeActivity = activeSession
    ? activities.find((item) => item.id === activeSession.activityId)
    : null;

  const visibleActivities = activities.filter((activity) => {
    if (tab === "My Activities") return activity.id > 3;
    if (tab === "Saved") return activity.favorite;
    return true;
  });

  function startActivity(activityId) {
    if (remainingXp <= 0) {
      setMessage("You've reached today's XP limit. Your activity can still count tomorrow.");
      return;
    }

    if (completedTodayIds.has(activityId)) {
      setMessage("You've already earned XP for this activity today. Try another one!");
      return;
    }

    if (activeSession) {
      setMessage("Finish your current activity timer first.");
      return;
    }

    setActiveSession({
      activityId,
      startedAt: Date.now(),
      endsAt: Date.now() + ACTIVITY_TIMER_SECONDS * 1000,
    });

    setMessage("Activity started. Take your time and enjoy it.");
  }

  function completeActivity(activityId) {
    if (
      !activeSession ||
      activeSession.activityId !== activityId ||
      activeRemaining > 0
    ) {
      setMessage("Start the activity and let its timer finish before completing it.");
      return;
    }

    if (completedTodayIds.has(activityId)) {
      setActiveSession(null);
      setMessage("This activity has already earned XP today.");
      return;
    }

    const baseAward = Math.min(XP_PER_ACTIVITY, remainingXp);

    const activityEntry = {
      id: `${Date.now()}-${activityId}`,
      type: "activity",
      activityId,
      activityTitle:
        activities.find((item) => item.id === activityId)?.title || "Activity",
      date: today,
      completedAt: new Date().toISOString(),
      xpAwarded: baseAward,
    };

    const nextHistory = [...history, activityEntry];

    const nextDistinct = new Set(
      nextHistory
        .filter(
          (entry) => entry.date === today && entry.type === "activity"
        )
        .map((entry) => entry.activityId)
    ).size;

    let challengeAward = 0;

    if (nextDistinct >= 2 && !challengeComplete) {
      challengeAward = Math.min(20, Math.max(0, remainingXp - baseAward));

      if (challengeAward > 0) {
        nextHistory.push({
          id: `challenge-${today}`,
          type: "challenge",
          activityTitle: "Two-activity daily challenge",
          date: today,
          completedAt: new Date().toISOString(),
          xpAwarded: challengeAward,
        });
      }
    }

    setHistory(nextHistory);
    setXp((current) => current + baseAward + challengeAward);

    setActivities((current) =>
      current.map((item) =>
        item.id === activityId
          ? { ...item, completed: (item.completed || 0) + 1 }
          : item
      )
    );

    setActiveSession(null);

    setMessage(
      challengeAward
        ? `Activity complete: +${baseAward} XP. Daily challenge bonus: +${challengeAward} XP!`
        : `Activity complete: +${baseAward} XP.`
    );
  }

  function cancelActivity() {
    setActiveSession(null);
    setMessage("Activity timer cancelled. No XP was awarded.");
  }

  function deleteActivity(id) {
    const activity = activities.find((item) => item.id === id);

    if (!activity) return;

    const confirmed = window.confirm(
      `Delete "${activity.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setActivities((current) =>
      current.filter((item) => item.id !== id)
    );

    if (activeSession?.activityId === id) {
      setActiveSession(null);
    }

    setMessage("Activity deleted.");
  }

  function toggleFavorite(id) {
    setActivities((current) =>
      current.map((activity) =>
        activity.id === id
          ? { ...activity, favorite: !activity.favorite }
          : activity
      )
    );
  }

  async function handleImage(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Choose an image smaller than 8 MB.");
      return;
    }

    try {
      setImage(await compressImage(file));
    } catch {
      setMessage("Couldn't load that image. Try another one.");
    }
  }

  function addActivity(event) {
    event.preventDefault();

    if (!title.trim()) return;

    const newActivity = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim() || "Your own personal activity.",
      category,
      image,
      favorite: false,
      completed: 0,
    };

    setActivities((current) => [newActivity, ...current]);

    setTitle("");
    setDescription("");
    setCategory("Creative");
    setImage("");

    setTab("My Activities");
    setMessage("Activity created!");
  }

  function saveSpotify() {
    if (!getSpotifyEmbed(spotifyInput)) {
      setMessage("Enter a valid Spotify link.");
      return;
    }

    setSpotifyLink(spotifyInput.trim());
    setMessage("Spotify link saved!");
  }

  function changeTheme(nextTheme) {
    setTheme(nextTheme);

    setMessage(
      `${THEMES.find((item) => item.id === nextTheme)?.name || "Theme"} theme applied.`
    );
  }

  return (
    <div className="app" data-theme={theme}>
      <header className="topbar">
        <a className="logo" href="#home">
          UNPLUGGED<span>.</span>
        </a>

        <div className="topbar-actions">
          <div className="top-level">LEVEL {level}</div>

          <button
            className="settings-button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <span aria-hidden="true">⚙</span> SETTINGS
          </button>
        </div>
      </header>

      {settingsOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSettingsOpen(false);
            }
          }}
        >
          <section
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="settings-heading">
              <div>
                <p className="eyebrow">PERSONALISE YOUR SPACE</p>
                <h2 id="settings-title">Settings</h2>
              </div>

              <button
                className="close-button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <p className="settings-copy">
              Choose the visual style for your UNPLUGGED experience.
            </p>

            <div className="theme-grid">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  className={`theme-option ${theme === item.id ? "selected" : ""}`}
                  data-preview-theme={item.id}
                  onClick={() => changeTheme(item.id)}
                  aria-pressed={theme === item.id}
                >
                  <span className="theme-swatches">
                    {item.colors.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>

                  <strong>{item.name}</strong>
                  <small>{item.tagline}</small>

                  {theme === item.id && (
                    <span className="theme-selected">SELECTED</span>
                  )}
                </button>
              ))}
            </div>

            <div className="settings-footer">
              <span>Theme preference is saved automatically.</span>

              <button
                className="primary-button settings-done"
                onClick={() => setSettingsOpen(false)}
              >
                DONE
              </button>
            </div>
          </section>
        </div>
      )}

      <main className="container" id="home">
        <section className="hero">
          <div>
            <p className="eyebrow">YOUR TIME. YOUR LIFE.</p>
            <h1>
              Do more.
              <br />
              <span>Scroll less.</span>
            </h1>
            <p className="hero-description">
              Make time for the things that actually matter.
            </p>
          </div>

          <div className="level-card">
            <div className="level-heading">
              <div>
                <p className="muted">YOUR PROGRESS</p>
                <h2>Level {level}</h2>
              </div>

              <div className="xp-number">{xp} XP</div>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${currentLevelXp}%` }}
              />
            </div>

            <div className="progress-labels">
              <span>{currentLevelXp}/100 XP</span>
              <span>Level {level + 1}</span>
            </div>

            <div className="daily-limit">
              <div className="daily-limit-heading">
                <span>DAILY XP</span>
                <strong>{dailyXp}/{DAILY_XP_CAP}</strong>
              </div>

              <div className="daily-limit-track">
                <div
                  className="daily-limit-fill"
                  style={{
                    width: `${Math.min(100, (dailyXp / DAILY_XP_CAP) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="toast" role="status">
            {message}
          </div>
        )}

        <nav className="navigation">
          {["Explore", "My Activities", "Saved", "Create", "Spotify", "History"].map(
            (item) => (
              <button
                key={item}
                className={tab === item ? "nav-button active" : "nav-button"}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            )
          )}
        </nav>

        {activeSession && (
          <section className="active-session">
            <div>
              <p className="eyebrow">ACTIVITY IN PROGRESS</p>
              <h2>{activeActivity?.title || "Your activity"}</h2>

              <p>
                {activeRemaining > 0
                  ? "Keep going. The completion button unlocks when the timer ends."
                  : "Timer finished. You can now record this activity."}
              </p>
            </div>

            <div className="session-timer">
              {formatTime(activeRemaining)}
            </div>

            <div className="session-actions">
              <button
                className="complete-button"
                disabled={activeRemaining > 0}
                onClick={() => completeActivity(activeSession.activityId)}
              >
                {activeRemaining > 0 ? "IN PROGRESS" : "COMPLETE +20 XP"}
              </button>

              <button className="text-button" onClick={cancelActivity}>
                CANCEL
              </button>
            </div>
          </section>
        )}

        {tab === "Spotify" && (
          <section className="spotify-section">
            <p className="eyebrow">YOUR PERSONAL SOUNDTRACK</p>

            <h2>
              SPOTIFY<span className="neon-dot">.</span>
            </h2>

            <p className="spotify-description">
              Your music. Your atmosphere. Your zone.
            </p>

            <div className="spotify-connect">
              <label htmlFor="spotify-link">Paste your Spotify link</label>

              <div className="spotify-input-row">
                <input
                  id="spotify-link"
                  value={spotifyInput}
                  onChange={(event) => setSpotifyInput(event.target.value)}
                  placeholder="https://open.spotify.com/playlist/..."
                />

                <button onClick={saveSpotify}>SAVE LINK</button>
              </div>

              <p className="spotify-hint">
                Open Spotify → Share → Copy link → Paste it here.
              </p>
            </div>

            {spotifyLink && getSpotifyEmbed(spotifyLink) ? (
              <div className="spotify-player">
                <div className="spotify-player-heading">
                  <span>YOUR SOUNDTRACK</span>
                  <span className="spotify-live">● READY</span>
                </div>

                <iframe
                  title="Spotify Player"
                  src={getSpotifyEmbed(spotifyLink)}
                  width="100%"
                  height="352"
                  style={{ border: 0, borderRadius: "12px" }}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />

                <button
                  className="spotify-remove"
                  onClick={() => {
                    setSpotifyLink("");
                    setSpotifyInput("");
                  }}
                >
                  REMOVE SPOTIFY LINK
                </button>
              </div>
            ) : (
              <div className="spotify-empty">
                <div className="spotify-icon">♫</div>
                <h3>YOUR SOUNDTRACK AWAITS</h3>
                <p>Connect a playlist, album or track to get started.</p>
              </div>
            )}
          </section>
        )}

        {tab === "History" && (
          <section className="history-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR TRACK RECORD</p>
                <h2>Completion history</h2>
              </div>

              <span className="activity-count">
                {history.filter((entry) => entry.type === "activity").length} completions
              </span>
            </div>

            <div className="challenge-card">
              <div>
                <p className="eyebrow">DAILY CHALLENGE</p>
                <h3>Try two different activities today</h3>
                <p>{distinctActivitiesToday}/2 different activities completed</p>
              </div>

              <strong
                className={
                  challengeComplete ? "challenge-status done" : "challenge-status"
                }
              >
                {challengeComplete ? "COMPLETED" : "+20 XP BONUS"}
              </strong>
            </div>

            {history.length === 0 ? (
              <div className="empty-state">
                <h3>No history yet.</h3>
                <p>Complete an activity to start building your history.</p>
              </div>
            ) : (
              <div className="history-list">
                {[...history].reverse().map((entry) => (
                  <article className="history-row" key={entry.id}>
                    <div>
                      <strong>{entry.activityTitle}</strong>
                      <span>
                        {new Date(entry.completedAt).toLocaleString()}
                      </span>
                    </div>

                    <b>+{entry.xpAwarded || 0} XP</b>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "Create" && (
          <section className="create-section">
            <p className="eyebrow">MAKE IT YOURS</p>
            <h2>Create an activity</h2>

            <p className="section-description">
              Add something you want to do in real life.
            </p>

            <form className="create-form" onSubmit={addActivity}>
              <label htmlFor="activity-title">Activity name</label>

              <input
                id="activity-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Learn photography"
                maxLength={60}
                required
              />

              <label htmlFor="activity-description">Description</label>

              <textarea
                id="activity-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What do you want to do?"
                maxLength={180}
              />

              <label htmlFor="activity-category">Category</label>

              <select
                id="activity-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>Creative</option>
                <option>Outdoor</option>
                <option>Learning</option>
                <option>Fitness</option>
                <option>Social</option>
                <option>Other</option>
              </select>

              <label>Add a picture (optional)</label>

              <label className="upload-box">
                {image ? (
                  <img src={image} alt="Activity preview" />
                ) : (
                  <span>+ Choose an image</span>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  hidden
                />
              </label>

              <button className="primary-button" type="submit">
                Create activity
              </button>
            </form>
          </section>
        )}

        {tab !== "Create" && tab !== "Spotify" && tab !== "History" && (
          <section className="activities-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {tab === "Explore" ? "FIND YOUR NEXT MOVE" : "YOUR COLLECTION"}
                </p>
                <h2>{tab}</h2>
              </div>

              <span className="activity-count">
                {visibleActivities.length} activities
              </span>
            </div>

            <div className="challenge-card compact-challenge">
              <div>
                <p className="eyebrow">TODAY'S CHALLENGE</p>
                <h3>Complete two different activities</h3>
                <p>
                  {distinctActivitiesToday}/2 completed · Daily XP cap: {DAILY_XP_CAP}
                </p>
              </div>

              <strong
                className={
                  challengeComplete ? "challenge-status done" : "challenge-status"
                }
              >
                {challengeComplete ? "DONE" : "+20 XP BONUS"}
              </strong>
            </div>

            {visibleActivities.length === 0 ? (
              <div className="empty-state">
                <h3>Nothing here yet.</h3>
                <p>Create an activity or save something from Explore.</p>

                <button
                  className="primary-button"
                  onClick={() => setTab("Create")}
                >
                  Create activity
                </button>
              </div>
            ) : (
              <div className="activity-grid">
                {visibleActivities.map((activity) => {
                  const completedToday = completedTodayIds.has(activity.id);
                  const isActive = activeSession?.activityId === activity.id;
                  const blockedByOther = activeSession && !isActive;

                  return (
                    <article className="activity-card" key={activity.id}>
                      <div className="activity-image">
                        {activity.image ? (
                          <img src={activity.image} alt={activity.title} />
                        ) : (
                          <div
                            className={`image-placeholder category-${activity.category.toLowerCase()}`}
                          >
                            <span>{activity.category}</span>
                          </div>
                        )}

                        <button
                          className={
                            activity.favorite
                              ? "favorite-button selected"
                              : "favorite-button"
                          }
                          onClick={() => toggleFavorite(activity.id)}
                          aria-label="Toggle favourite"
                        >
                          {activity.favorite ? "★" : "☆"}
                        </button>
                      </div>

                      <div className="activity-content">
                        <p className="category-label">{activity.category}</p>

                        <h3>{activity.title}</h3>

                        <p className="activity-description">
                          {activity.description}
                        </p>

                        <div className="activity-footer">
                          <span className="completion-count">
                            Completed {activity.completed || 0} times
                          </span>

                          <span className="xp-reward">
                            +{XP_PER_ACTIVITY} XP
                          </span>
                        </div>

                        {completedToday ? (
                          <button
                            className="complete-button locked-button"
                            disabled
                          >
                            COMPLETED TODAY
                          </button>
                        ) : isActive ? (
                          <button
                            className="complete-button"
                            disabled={activeRemaining > 0}
                            onClick={() => completeActivity(activity.id)}
                          >
                            {activeRemaining > 0
                              ? `IN PROGRESS · ${formatTime(activeRemaining)}`
                              : "COMPLETE ACTIVITY"}
                          </button>
                        ) : (
                          <button
                            className="complete-button"
                            disabled={!!blockedByOther || remainingXp <= 0}
                            onClick={() => startActivity(activity.id)}
                          >
                            {remainingXp <= 0
                              ? "DAILY XP LIMIT REACHED"
                              : blockedByOther
                                ? "FINISH CURRENT ACTIVITY"
                                : "START ACTIVITY"}
                          </button>
                        )}

                        <button
                          className="delete-activity-button"
                          onClick={() => deleteActivity(activity.id)}
                          aria-label={`Delete ${activity.title}`}
                        >
                          DELETE ACTIVITY
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <footer>
          <span>UNPLUGGED.</span>
          <p>Make your offline time count.</p>
        </footer>

        <p className="prototype-note">
          Prototype note: activity timers and XP rules discourage accidental
          repeat clicks, but browser-only data can still be edited. Real
          anti-cheat protection requires server-side verification.
        </p>
      </main>
    </div>
  );
}
