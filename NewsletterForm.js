"use client";
import { useState } from "react";

export default function NewsletterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const response = await fetch("https://api.brevo.com/v3/contacts", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "api-key": "YOUR_NEW_API_KEY_HERE", // ⚠️ Replace with your new key
        },
        body: JSON.stringify({
          email: email,
          attributes: { FIRSTNAME: name },
          listIds: [3],
          updateEnabled: true,
        }),
      });

      if (response.ok || response.status === 204) {
        setStatus("success");
      } else {
        const data = await response.json();
        throw new Error(data.message || "Subscription failed");
      }
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <section style={{
      background: "linear-gradient(135deg, #0B1F3B 0%, #162D50 100%)",
      padding: "60px 20px",
      fontFamily: "Georgia, serif",
      textAlign: "center",
    }}>

      <div style={{ width: 60, height: 4, background: "#C9A227", margin: "0 auto 28px auto", borderRadius: 2 }} />

      <p style={{ color: "#C9A227", fontSize: 12, fontWeight: "bold", letterSpacing: 3, textTransform: "uppercase", margin: "0 0 10px 0" }}>
        📚 Weekly Newsletter
      </p>
      <h2 style={{ color: "#ffffff", fontSize: 28, fontWeight: "bold", margin: "0 0 10px 0", lineHeight: 1.3 }}>
        Join the BOOKAWEEK Series
      </h2>
      <p style={{ color: "#aabbcc", fontSize: 15, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 32px auto" }}>
        Get weekly book nuggets, season progress updates and episode drops — straight to your inbox. Free. Every week. 🔥
      </p>

      {status === "success" ? (
        <div style={{
          background: "#0d2640",
          border: "2px solid #C9A227",
          borderRadius: 10,
          padding: "20px 24px",
          maxWidth: 480,
          margin: "0 auto",
        }}>
          <p style={{ color: "#C9A227", fontSize: 20, margin: "0 0 6px 0" }}>🎉 You're in, BOOKWARRIOR!</p>
          <p style={{ color: "#aabbcc", fontSize: 14, margin: 0 }}>Check your inbox for a welcome email. Your weekly nuggets start now. 📚</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 480, margin: "0 auto" }}>

          <div style={{ marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Your First Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 18px",
                fontSize: 15,
                fontFamily: "Georgia, serif",
                border: "2px solid #1e3a5f",
                borderRadius: 8,
                background: "#0d2640",
                color: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#C9A227"}
              onBlur={e => e.target.style.borderColor = "#1e3a5f"}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <input
              type="email"
              placeholder="Your Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "14px 18px",
                fontSize: 15,
                fontFamily: "Georgia, serif",
                border: "2px solid #1e3a5f",
                borderRadius: 8,
                background: "#0d2640",
                color: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#C9A227"}
              onBlur={e => e.target.style.borderColor = "#1e3a5f"}
            />
          </div>

          {status === "error" && (
            <p style={{ color: "#ff6b6b", fontSize: 14, margin: "0 0 14px 0" }}>{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              width: "100%",
              padding: 16,
              background: status === "loading" ? "#8a6b1a" : "#C9A227",
              color: "#ffffff",
              fontSize: 16,
              fontWeight: "bold",
              fontFamily: "Georgia, serif",
              border: "none",
              borderRadius: 8,
              cursor: status === "loading" ? "not-allowed" : "pointer",
              letterSpacing: 1,
            }}
          >
            {status === "loading" ? "Subscribing..." : "📬 Subscribe — It's Free"}
          </button>

        </form>
      )}

      <p style={{ color: "#556677", fontSize: 11, margin: "20px 0 0 0" }}>
        No spam. Unsubscribe anytime. Read. Reflect. Execute.
      </p>

      <div style={{ width: 60, height: 4, background: "#C9A227", margin: "28px auto 0 auto", borderRadius: 2 }} />

    </section>
  );
}
