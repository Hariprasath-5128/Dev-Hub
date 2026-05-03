import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Shield,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const roles = [
  {
    id: "patient",
    label: "Patient",
    icon: User,
    accent: "#f7a7c0",
    summary: "Personal health records, follow-ups, and care guidance.",
  },
  {
    id: "doctor",
    label: "Doctor",
    icon: Stethoscope,
    accent: "#79b8ff",
    summary: "Clinical monitoring, diagnostics, and treatment workflows.",
  },
  {
    id: "admin",
    label: "Admin",
    icon: Shield,
    accent: "#86d7c3",
    summary: "Operations, compliance, staff access, and platform governance.",
  },
];

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 },
};

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}

function mixRgb(a, b, t) {
  const tt = clamp01(t);
  return [
    Math.round(a[0] + (b[0] - a[0]) * tt),
    Math.round(a[1] + (b[1] - a[1]) * tt),
    Math.round(a[2] + (b[2] - a[2]) * tt),
  ];
}

function rgbToCss(rgb) {
  return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
}

function MetalButton({
  children,
  className,
  accentRgb = [121, 184, 255],
  variant = "primary",
  ...props
}) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const base = accentRgb;
  const hi = mixRgb(base, [255, 255, 255], 0.35);
  const lo = mixRgb(base, [0, 0, 0], 0.25);

  const bg =
    variant === "outline"
      ? "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(236,245,255,0.78))"
      : `linear-gradient(180deg, rgba(${rgbToCss(hi)}, 0.92), rgba(${rgbToCss(base)}, 0.92))`;

  return (
    <button
      {...props}
      className={cn("metal-btn", className)}
      style={{
        "--accent": rgbToCss(base),
        "--bg": bg,
        "--text": variant === "outline" ? "#2f5e89" : "#ffffff",
        transform: pressed ? "translateY(2px) scale(0.992)" : "translateY(0) scale(1)",
        filter: hovered && !pressed ? "brightness(1.05)" : "none",
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        setPressed(false);
        props.onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        setPressed(true);
        props.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        setPressed(false);
        props.onMouseUp?.(e);
      }}
      onTouchStart={(e) => {
        setPressed(true);
        props.onTouchStart?.(e);
      }}
      onTouchEnd={(e) => {
        setPressed(false);
        props.onTouchEnd?.(e);
      }}
      onTouchCancel={(e) => {
        setPressed(false);
        props.onTouchCancel?.(e);
      }}
    >
      <span className="metal-btn__inner" aria-hidden="true" />
      <span className="metal-btn__shine" aria-hidden="true" />
      <span className="metal-btn__content">{children}</span>
    </button>
  );
}

function GlowCard({
  children,
  className = "",
  glowColor = "blue",
  onClick,
  style,
  asButton = false,
}) {
  const cardRef = useRef(null);
  const { base, spread } = glowColorMap[glowColor] || glowColorMap.blue;

  useEffect(() => {
    const syncPointer = (e) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      cardRef.current.style.setProperty("--x", x.toFixed(2));
      cardRef.current.style.setProperty("--y", y.toFixed(2));
    };

    window.addEventListener("pointermove", syncPointer);
    return () => window.removeEventListener("pointermove", syncPointer);
  }, []);

  const Component = asButton ? "button" : "div";

  return (
    <Component
      ref={cardRef}
      type={asButton ? "button" : undefined}
      onClick={onClick}
      data-glow-card
      className={cn("glow-card", className)}
      style={{
        "--base": base,
        "--spread": spread,
        "--radius": 24,
        "--border": 1.6,
        "--size": 200,
        ...style,
      }}
    >
      <div data-glow-inner />
      <div className="glow-content">{children}</div>
    </Component>
  );
}

function ElegantShape({
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "linear-gradient(135deg, rgba(121,184,255,0.48), rgba(205,232,255,0.34), rgba(255,255,255,0.24))",
  style,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -120, rotate: rotate - 12 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{
        duration: 2,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.1 },
      }}
      style={{ position: "absolute", ...style }}
    >
      <motion.div
        animate={{ y: [0, 16, 0] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        style={{ width, height, position: "relative" }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background: gradient,
            border: "1.5px solid rgba(255,255,255,0.72)",
            boxShadow: "0 34px 90px rgba(121,184,255,0.3)",
            backdropFilter: "blur(10px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.56), rgba(210,232,255,0.18) 42%, transparent 70%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function Input({ icon: Icon, trailing, className, ...props }) {
  return (
    <div style={{ position: "relative" }}>
      <Icon
        size={18}
        style={{
          position: "absolute",
          left: 16,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#6c89a8",
        }}
      />
      <input
        {...props}
        className={cn("login-input metal-field", className)}
        style={{
          width: "100%",
          height: 54,
          borderRadius: 18,
          color: "#22415f",
          padding: trailing ? "0 50px 0 46px" : "0 18px 0 46px",
          fontSize: 15,
          outline: "none",
        }}
      />
      {trailing}
    </div>
  );
}

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [action, setAction] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("doctor");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignUp = action === "signup";
  const activeRole = roles.find((item) => item.id === role) || roles[1];
  const activeAccentRgb = hexToRgb(activeRole.accent) || [121, 184, 255];

  const handleAuthSubmit = async (e) => {
    e?.preventDefault();
    if (!username || !password) return;

    setError("");
    setIsLoading(true);

    try {
      const res = await axios.post("http://localhost:5003/auth", {
        username: username.toLowerCase(),
        password,
        action,
      });

      if (res.data.success) {
        onLogin({ role: res.data.role || role, userId: res.data.userId, username });
        navigate(`/${res.data.role || role}`);
      } else {
        setError(res.data.message || "Credential verification failed.");
      }
    } catch (err) {
      if (err.message === "Network Error") {
        setError("Network unavailable. Switching to guided demo access...");
        setTimeout(() => quickLogin(role), 1000);
      } else {
        setError(err.response?.data?.message || err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = (selectedRole) => {
    setIsLoading(true);
    const mock = {
      patient: "patient1",
      doctor: "doctor1",
      admin: "admin1",
    }[selectedRole];

    setUsername(mock);
    setPassword(mock);

    setTimeout(() => {
      onLogin({ role: selectedRole, userId: `demo-${selectedRole}`, username: mock });
      navigate(`/${selectedRole}`);
      setIsLoading(false);
    }, 900);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(135deg, #cfe5ff 0%, #e7f3ff 34%, #eef7ff 62%, #f9fbff 100%)",
      }}
    >
      <style>{`
        body {
          margin: 0;
          font-family: "Segoe UI", "Trebuchet MS", sans-serif;
          background: #eff8ff;
        }
        * {
          box-sizing: border-box;
        }
        .login-input::placeholder {
          color: #88a0b9;
        }
        .login-input:focus {
          border-color: rgba(121, 184, 255, 0.9);
          box-shadow: 0 0 0 5px rgba(121, 184, 255, 0.14);
        }
        .metal-field {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(238,247,255,0.82));
          border: 1px solid rgba(120, 160, 201, 0.3);
          box-shadow:
            0 10px 18px rgba(79, 123, 163, 0.08),
            inset 0 1px 0 rgba(255,255,255,0.9);
          transition: box-shadow 200ms ease, border-color 200ms ease, filter 200ms ease;
        }
        .metal-field:hover {
          border-color: rgba(121, 184, 255, 0.45);
          box-shadow:
            0 14px 24px rgba(79, 123, 163, 0.12),
            0 0 22px rgba(121, 184, 255, 0.14),
            inset 0 1px 0 rgba(255,255,255,0.95);
        }
        .metal-field:focus {
          border-color: rgba(121, 184, 255, 0.85);
          box-shadow:
            0 16px 28px rgba(79, 123, 163, 0.14),
            0 0 0 5px rgba(121, 184, 255, 0.14),
            0 0 34px rgba(121, 184, 255, 0.16),
            inset 0 1px 0 rgba(255,255,255,0.95);
        }
        textarea.metal-textarea {
          resize: vertical;
          min-height: 120px;
          padding: 14px 16px;
          line-height: 1.5;
        }
        .metal-btn {
          position: relative;
          display: inline-flex;
          width: auto;
          height: auto;
          border-radius: 14px;
          border: 1px solid rgba(var(--accent, 121, 184, 255), 0.45);
          background: var(--bg);
          color: var(--text, #ffffff);
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: transform 200ms ease, filter 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
          box-shadow:
            0 18px 36px rgba(88,156,225,0.28),
            0 0 0 1px rgba(var(--accent, 121, 184, 255), 0.28),
            inset 0 1px 0 rgba(255,255,255,0.38);
          overflow: hidden;
        }
        .metal-btn--block {
          width: 100%;
        }
        .metal-btn--lg {
          height: 56px;
          border-radius: 20px;
        }
        .metal-btn--sm {
          height: 44px;
          border-radius: 14px;
        }
        .metal-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .metal-btn__inner {
          position: absolute;
          inset: 1px;
          border-radius: 19px;
          background:
            radial-gradient(circle at 25% 18%, rgba(255,255,255,0.38), transparent 44%),
            radial-gradient(circle at 75% 60%, rgba(255,255,255,0.22), transparent 52%),
            linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0));
          pointer-events: none;
        }
        .metal-btn__shine {
          position: absolute;
          inset: -120% -60%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.34), transparent);
          transform: rotate(18deg) translateX(-40%);
          opacity: 0;
          transition: opacity 240ms ease, transform 650ms ease;
          pointer-events: none;
        }
        .metal-btn:hover .metal-btn__shine {
          opacity: 1;
          transform: rotate(18deg) translateX(36%);
        }
        .metal-btn__content {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          height: 100%;
          padding: 0 18px;
        }
        .signin-box {
          border: 1px solid rgba(121, 184, 255, 0.28);
          box-shadow: 0 30px 80px rgba(79, 123, 163, 0.2);
          transition: box-shadow 220ms ease, border-color 220ms ease;
        }
        .signin-box:hover {
          border-color: rgba(var(--signin-accent-rgb, 121, 184, 255), 0.88);
          box-shadow:
            0 30px 80px rgba(79, 123, 163, 0.2),
            0 0 0 2px rgba(var(--signin-accent-rgb, 121, 184, 255), 0.52),
            0 0 46px rgba(var(--signin-accent-rgb, 121, 184, 255), 0.38),
            0 0 86px rgba(var(--signin-accent-rgb, 121, 184, 255), 0.22);
        }
        .glow-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background-attachment: fixed;
          border-radius: calc(var(--radius) * 1px);
          border: var(--card-border-width, calc(var(--border) * 1px)) solid
            var(
              --card-border-color,
              hsla(calc(var(--base) + 8), 90%, 70%, 0.42)
            );
          background-image:
            radial-gradient(
              calc(var(--size) * 1px) calc(var(--size) * 1px) at
              calc(var(--x, 50) * 1px) calc(var(--y, 50) * 1px),
              hsla(
                calc(var(--base) + 36),
                92%,
                86%,
                0.26
              ) 0%,
              transparent 64%
            ),
            linear-gradient(180deg, rgba(241, 248, 255, 0.92), rgba(230, 242, 255, 0.88));
          box-shadow:
            0 16px 34px rgba(93, 147, 206, 0.14),
            0 0 0 1px hsla(calc(var(--base) + 8), 90%, 80%, 0.14);
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .glow-card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 22px 44px hsla(calc(var(--base) + 8), 68%, 52%, 0.28),
            0 0 0 2px hsla(calc(var(--base) + 8), 90%, 72%, 0.62),
            0 0 32px hsla(calc(var(--base) + 8), 92%, 72%, 0.52),
            0 0 60px hsla(calc(var(--base) + 8), 92%, 72%, 0.28);
          border-color: hsla(calc(var(--base) + 8), 92%, 68%, 0.82);
        }
        .glow-card::before,
        .glow-card::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: calc(var(--radius) * 1px);
        }
        .glow-card::before {
          border: var(--card-border-width, calc(var(--border) * 1px)) solid transparent;
          background:
            radial-gradient(
              calc(var(--size) * 0.82px) calc(var(--size) * 0.82px) at
              calc(var(--x, 50) * 1px) calc(var(--y, 50) * 1px),
            hsla(calc(var(--base) + 14), 96%, 72%, 0.98) 0%,
            hsla(calc(var(--base) + 32), 94%, 74%, 0.66) 34%,
            transparent 72%
          ) border-box;
          -webkit-mask:
            linear-gradient(#fff 0 0) padding-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask:
            linear-gradient(#fff 0 0) padding-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
          opacity: 0.74;
          transition: opacity 0.25s ease;
        }
        .glow-card::after {
          border: var(--card-border-width, calc(var(--border) * 1px)) solid transparent;
          background:
            radial-gradient(
              calc(var(--size) * 0.52px) calc(var(--size) * 0.52px) at
              calc(var(--x, 50) * 1px) calc(var(--y, 50) * 1px),
              rgba(255, 255, 255, 0.95) 0%,
              rgba(255, 255, 255, 0.22) 38%,
              transparent 68%
            ) border-box;
          -webkit-mask:
            linear-gradient(#fff 0 0) padding-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask:
            linear-gradient(#fff 0 0) padding-box,
            linear-gradient(#fff 0 0);
          mask-composite: exclude;
          opacity: 0.48;
          transition: opacity 0.25s ease;
        }
        .glow-card:hover::before {
          opacity: 1;
        }
        .glow-card:hover::after {
          opacity: 1;
        }
        .glow-card [data-glow-inner] {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          pointer-events: none;
          border: 10px solid transparent;
          filter: blur(14px);
          opacity: 0.38;
          background: radial-gradient(
            calc(var(--size) * 0.9px) calc(var(--size) * 0.9px) at
            calc(var(--x, 50) * 1px) calc(var(--y, 50) * 1px),
            hsla(calc(var(--base) + 24), 92%, 82%, 0.52) 0%,
            transparent 72%
          );
        }
        .glow-card .glow-content {
          position: relative;
          z-index: 2;
        }
        @media (max-width: 960px) {
          .login-shell {
            grid-template-columns: 1fr !important;
          }
          .login-hero {
            min-height: 520px;
          }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top left, rgba(121,184,255,0.56), transparent 34%), radial-gradient(circle at left center, rgba(170,213,255,0.4), transparent 42%), radial-gradient(circle at center center, rgba(166,210,255,0.22), transparent 46%), radial-gradient(circle at top right, rgba(162,207,255,0.22), transparent 34%), radial-gradient(circle at bottom left, rgba(121,184,255,0.24), transparent 32%), radial-gradient(circle at bottom right, rgba(247,167,192,0.2), transparent 26%), radial-gradient(circle at center right, rgba(134,215,195,0.14), transparent 24%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(140,195,255,0.16) 0%, rgba(140,195,255,0.1) 38%, rgba(140,195,255,0.08) 62%, rgba(255,255,255,0.04) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="login-shell"
        style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.1fr 0.9fr" }}
      >
        <section
          className="login-hero"
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "48px 56px 56px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <ElegantShape
              delay={0.2}
              width={620}
              height={138}
              rotate={12}
              gradient="linear-gradient(135deg, rgba(121,184,255,0.56), rgba(194,226,255,0.38), rgba(255,255,255,0.24))"
              style={{ left: "-6%", top: "12%" }}
            />
            <ElegantShape
              delay={0.35}
              width={360}
              height={92}
              rotate={-18}
              gradient="linear-gradient(135deg, rgba(247,167,192,0.36), rgba(255,255,255,0.3))"
              style={{ right: "2%", top: "16%" }}
            />
            <ElegantShape
              delay={0.5}
              width={420}
              height={108}
              rotate={-10}
              gradient="linear-gradient(135deg, rgba(134,215,195,0.34), rgba(214,241,255,0.24), rgba(255,255,255,0.24))"
              style={{ left: "8%", bottom: "16%" }}
            />
            <ElegantShape
              delay={0.65}
              width={240}
              height={70}
              rotate={20}
              gradient="linear-gradient(135deg, rgba(255,255,255,0.38), rgba(121,184,255,0.38), rgba(195,226,255,0.24))"
              style={{ right: "12%", bottom: "12%" }}
            />
          </div>

          <div style={{ position: "relative", zIndex: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #8cc5ff, #cde8ff)",
                  boxShadow: "0 20px 44px rgba(121,184,255,0.22)",
                }}
              >
                <HeartPulse color="#1d5f9e" size={28} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 29,
                    fontWeight: 800,
                    color: "#244564",
                    letterSpacing: "-0.03em",
                  }}
                >
                  VitalsGuard
                </div>
                <div style={{ color: "#7f97ae", fontSize: 14 }}>
                  Pleasant, calm access for connected care teams
                </div>
              </div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.9 }}
              style={{
                margin: "72px 0 20px",
                fontSize: "clamp(3.1rem, 6.2vw, 5.4rem)",
                lineHeight: 1.02,
                fontWeight: 800,
                color: "#173a5e",
                letterSpacing: "-0.05em",
                maxWidth: 820,
              }}
            >
              Gentle digital care
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #4f97eb 0%, #7c95e6 48%, #ef8db5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                for patients and clinicians
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.9 }}
              style={{
                maxWidth: 620,
                fontSize: 18,
                lineHeight: 1.7,
                color: "#587792",
                margin: 0,
              }}
            >
              Secure sign-in for patient journeys, clinical review, and administrative
              coordination with a lighter healthcare-focused visual language.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.9 }}
            style={{
              position: "relative",
              zIndex: 2,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginTop: 40,
            }}
          >
            {roles.map((item) => {
              const Icon = item.icon;
              const glowColor =
                item.id === "doctor" ? "blue" : item.id === "patient" ? "purple" : "green";
              const isSelected = role === item.id;
              return (
                <GlowCard
                  key={item.id}
                  onClick={() => setRole(item.id)}
                  asButton={true}
                  glowColor={glowColor}
                  className="role-glow-card"
                  style={{
                    textAlign: "left",
                    padding: "18px 18px 16px",
                    cursor: "pointer",
                    minHeight: 210,
                    transform: isSelected ? "translateY(-1px)" : undefined,
                    "--card-border-color": isSelected ? item.accent : undefined,
                    "--card-border-width": isSelected ? "2.2px" : "1.6px",
                    boxShadow: isSelected
                      ? "0 22px 44px rgba(85, 144, 209, 0.28), 0 0 22px rgba(121,184,255,0.32)"
                      : "0 16px 34px rgba(93, 147, 206, 0.14)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      background: `linear-gradient(135deg, ${item.accent}, #ffffff)`,
                      display: "grid",
                      placeItems: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Icon size={20} color="#2f5c84" />
                  </div>
                  <div style={{ fontWeight: 800, color: "#254767", fontSize: 16 }}>
                    {item.label}
                  </div>
                  <div style={{ marginTop: 8, color: "#6b89a7", fontSize: 13, lineHeight: 1.55 }}>
                    {item.summary}
                  </div>
                </GlowCard>
              );
            })}
          </motion.div>
        </section>

        <section
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 28px",
            background:
              "linear-gradient(180deg, rgba(219,239,255,0.22), rgba(255,255,255,0.08))",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 25% 20%, rgba(121,184,255,0.18), transparent 28%), radial-gradient(circle at 80% 70%, rgba(121,184,255,0.14), transparent 30%)",
              pointerEvents: "none",
            }}
          />
          <motion.div
            className="signin-box"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.85 }}
            style={{
              width: "100%",
              maxWidth: 470,
              borderRadius: 32,
              "--signin-accent-rgb": activeAccentRgb.join(","),
              background:
                "linear-gradient(180deg, rgba(238,247,255,0.94), rgba(255,246,251,0.86))",
              padding: 34,
              backdropFilter: "blur(16px)",
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 32,
                background:
                  "radial-gradient(circle at top left, rgba(121,184,255,0.18), transparent 30%), radial-gradient(circle at top right, rgba(247,167,192,0.14), transparent 28%), radial-gradient(circle at bottom center, rgba(134,215,195,0.1), transparent 24%)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                borderRadius: 999,
                background:
                  "linear-gradient(135deg, rgba(121,184,255,0.24), rgba(247,167,192,0.18))",
                color: "#557796",
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid rgba(121,184,255,0.16)",
                position: "relative",
                zIndex: 1,
              }}
            >
              <Users size={14} />
              {activeRole.label} portal access
            </div>

            <div style={{ marginTop: 18 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 34,
                  lineHeight: 1.05,
                  color: "#173a5e",
                  letterSpacing: "-0.04em",
                }}
              >
                {isSignUp ? "Create a calm care workspace" : "Login to your care workspace"}
              </h2>
              <p style={{ margin: "12px 0 0", color: "#6b86a1", fontSize: 15, lineHeight: 1.7 }}>
                Continue as <strong style={{ color: "#3d6289" }}>{activeRole.label}</strong> to
                access patient, doctor, and admin experiences from the same platform.
              </p>
            </div>

            {error ? (
              <div
                style={{
                  marginTop: 20,
                  borderRadius: 18,
                  background: "rgba(255, 237, 241, 0.95)",
                  border: "1px solid rgba(244, 168, 193, 0.4)",
                  padding: "14px 16px",
                  color: "#9e4768",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            ) : null}

            <form onSubmit={handleAuthSubmit} style={{ display: "grid", gap: 18, marginTop: 24 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#6683a0",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Username
                </label>
                <Input
                  icon={User}
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="signin-field"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#6683a0",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Password
                </label>
                <Input
                  icon={Lock}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="signin-field"
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      style={{
                        position: "absolute",
                        right: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        border: "none",
                        background: "transparent",
                        color: "#6c89a8",
                        cursor: "pointer",
                        padding: 4,
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  padding: 8,
                  borderRadius: 22,
                  background:
                    "linear-gradient(180deg, rgba(225,239,255,0.88), rgba(241,248,255,0.92))",
                    border: "1px solid rgba(121,184,255,0.22)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                {roles.map((item) => {
                  const Icon = item.icon;
                  const selected = item.id === role;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRole(item.id)}
                      style={{
                        border: "none",
                        borderRadius: 16,
                        minHeight: 82,
                        padding: "12px 10px",
                        cursor: "pointer",
                        background: selected
                          ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(231,243,255,0.96))"
                          : "transparent",
                        boxShadow: selected ? "0 12px 28px rgba(121,184,255,0.18)" : "none",
                        color: selected ? "#20486d" : "#6f8aa5",
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          margin: "0 auto 8px",
                          display: "grid",
                          placeItems: "center",
                          background: selected
                            ? `linear-gradient(135deg, ${item.accent}, #ffffff)`
                            : "rgba(255,255,255,0.7)",
                        }}
                      >
                        <Icon size={17} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>
                        {item.label}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                type="submit"
                disabled={isLoading}
              className="metal-btn metal-btn--block metal-btn--lg"
                style={{ "--accent": rgbToCss(activeAccentRgb), "--text": "#0f2d58" }}
              >
                <span className="metal-btn__inner" aria-hidden="true" />
                <span className="metal-btn__shine" aria-hidden="true" />
                <span className="metal-btn__content">
                  {isLoading ? "Connecting..." : isSignUp ? "Create Account" : "Login"}
                  {!isLoading && <ArrowRight size={18} />}
                </span>
              </button>
            </form>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "nowrap",
              }}
            >
              <button
                type="button"
                onClick={() => setAction(isSignUp ? "login" : "signup")}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#5d7ea0",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {isSignUp ? "Already have an account? Login" : "Need an account? Sign up"}
              </button>

              <MetalButton
                type="button"
                onClick={() => quickLogin(role)}
                accentRgb={activeAccentRgb}
                variant="outline"
                className="metal-btn--sm"
              >
                Quick {activeRole.label} Demo
              </MetalButton>
            </div>

            </motion.div>
        </section>
      </div>
    </div>
  );
}
