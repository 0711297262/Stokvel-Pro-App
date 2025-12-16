// public/js/auth-otp.js
import { supabase } from "./supabase-client.js";

const params = new URLSearchParams(window.location.search);
const phone = params.get("phone") || "";

const phoneText = document.getElementById("phoneText");
const otpInput = document.getElementById("otpInput");
const verifyBtn = document.getElementById("verifyBtn");
const resendBtn = document.getElementById("resendBtn");

if (phoneText) phoneText.textContent = phone || "(unknown)";

// verify OTP
if (verifyBtn) {
  verifyBtn.addEventListener("click", async () => {
    const token = otpInput.value.trim();
    if (!token) { alert("Enter the code"); return; }

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying…";

    try {
      // Supabase JS v2: verifyOtp
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });

      if (error) {
        throw error;
      }

      // data contains session if successful; supabase client stores session automatically
      // Double-check
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user) {
        // success -> go to dashboard
        window.location.href = "dashboard.html";
        return;
      } else {
        // fallback: if no session, but server returned access_token - try setSession
        if (data?.session) {
          await supabase.auth.setSession(data.session);
          window.location.href = "dashboard.html";
          return;
        }
      }

      throw new Error("No active session after verify.");
    } catch (err) {
      console.error("Verify failed:", err);
      alert("Verification failed: " + (err.message || err));
      verifyBtn.disabled = false;
      verifyBtn.textContent = "Verify & Sign in";
    }
  });
}

// resend flow: call Edge Function again
if (resendBtn) {
  resendBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!phone) { alert("No phone available to resend to."); return; }
    resendBtn.disabled = true;
    resendBtn.textContent = "Resending…";
    try {
      const res = await fetch("https://kmujqhvywyykwaiwalys.supabase.co/functions/v1/smart-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (!res.ok) throw new Error("Failed to resend code");
      alert("Code resent. Check your phone.");
    } catch (err) {
      console.error(err);
      alert("Could not resend code: " + (err.message || err));
    } finally {
      resendBtn.disabled = false;
      resendBtn.textContent = "Resend";
    }
  });
}
async function sendOTP() {
  const phone = document.getElementById("phoneInput").value.trim();

  if (!phone) {
    alert("Please enter a phone number");
    return;
  }

  // Disable button while processing
  document.getElementById("sendOtpBtn").disabled = true;

  try {
    const response = await fetch(
      "https://kmujqhvywyykwaiwalys.supabase.co/functions/v1/sms-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      }
    );

    const result = await response.json();

    if (result.success) {
      alert("OTP sent successfully!");
      document.getElementById("otpSection").style.display = "block";
    } else {
      alert("Failed to send OTP");
    }

  } catch (error) {
    console.log(error);
    alert("Error sending OTP");
  }

  // Re-enable button
  document.getElementById("sendOtpBtn").disabled = false;
}
async function verifyOTP() {
  const phone = document.getElementById("phoneInput").value.trim();
  const otp = document.getElementById("otpInput").value.trim();

  if (!otp) {
    alert("Please enter your OTP");
    return;
  }

  try {
    const response = await fetch(
      "https://kmujqhvywyykwaiwalys.supabase.co/functions/v1/verify-otp",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, otp }),
      }
    );

    const result = await response.json();

    if (result.success) {
      alert("OTP verified successfully!");

      // Redirect to dashboard or continue login
      window.location.href = "/dashboard.html";
    } else {
      alert("OTP verification failed: " + result.error);
    }
  } catch (error) {
    console.log(error);
    alert("Error verifying OTP");
  }
}
// Autofill OTP boxes
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("otp-box")) {
    if (e.target.value.length === 1) {
      const next = e.target.nextElementSibling;
      if (next) next.focus();
    }
  }
});

async function sendOTP() {
  const phone = document.getElementById("phoneInput").value.trim();

  if (!phone) return alert("Enter phone number");

  document.getElementById("sendOtpBtn").disabled = true;
  document.getElementById("loadingSend").style.display = "block";

  const response = await fetch(
    "https://kmujqhvywyykwaiwalys.supabase.co/functions/v1/sms-otp",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    }
  );

  const result = await response.json();

  document.getElementById("sendOtpBtn").disabled = false;
  document.getElementById("loadingSend").style.display = "none";

  if (result.success) {
    document.querySelector(".login-container").style.display = "none";
    document.getElementById("otpSection").style.display = "block";
  } else {
    alert("Failed to send OTP");
  }
}

async function verifyOTP() {
  const phone = document.getElementById("phoneInput").value.trim();
  const boxes = document.querySelectorAll(".otp-box");

  const otp = [...boxes].map(b => b.value).join("");

  if (otp.length !== 6) return alert("Enter the 6-digit OTP");

  document.getElementById("loadingVerify").style.display = "block";

  const response = await fetch(
    "https://kmujqhvywyykwaiwalys.supabase.co/functions/v1/verify-otp",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp }),
    }
  );

  const result = await response.json();

  document.getElementById("loadingVerify").style.display = "none";

  if (result.success) {
    window.location.href = "/dashboard.html";
  } else {
    alert(result.error || "Invalid OTP");
  }
}
let timer;
let timeLeft = 60; // Countdown in seconds

function startCountdown() {
  const resendBtn = document.getElementById("resendBtn");
  const countdown = document.getElementById("countdown");

  resendBtn.classList.add("disabled");
  resendBtn.style.pointerEvents = "none";

  countdown.style.display = "block";
  countdown.innerText = `You can resend OTP in ${timeLeft}s`;

  timer = setInterval(() => {
    timeLeft--;

    countdown.innerText = `You can resend OTP in ${timeLeft}s`;

    if (timeLeft <= 0) {
      clearInterval(timer);
      countdown.style.display = "none";

      resendBtn.classList.remove("disabled");
      resendBtn.style.pointerEvents = "auto";
      timeLeft = 60; // reset
    }
  }, 1000);
}
if (result.success) {
  document.querySelector(".login-container").style.display = "none";
  document.getElementById("otpSection").style.display = "block";

  startCountdown(); // ← START RESEND TIMER
}
async function resendOTP() {
  const phone = document.getElementById("phoneInput").value.trim();

  if (!phone) {
    alert("Phone number missing");
    return;
  }

  document.getElementById("resendBtn").classList.add("disabled");
  document.getElementById("resendBtn").style.pointerEvents = "none";

  try {
    const response = await fetch(
      "https://kmujqhvywyykwaiwalys.supabase.co/functions/v1/sms-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      }
    );

    const result = await response.json();

    if (result.success) {
      alert("OTP resent!");
      startCountdown(); // Restart countdown
    } else {
      alert("Failed to resend OTP.");
    }
  } catch (error) {
    console.log(error);
    alert("Error sending OTP.");
  }
}
async function autoReadOTP() {
  if (!("OTPCredential" in window)) {
    console.log("Web OTP API not supported");
    return; // iPhone or unsupported browser
  }

  try {
    const otp = await navigator.credentials.get({
      otp: { transport: ["sms"] },
      signal: new AbortController().signal
    });

    if (otp && otp.code) {
      console.log("Auto OTP received:", otp.code);

      // Fill OTP boxes
      const boxes = document.querySelectorAll(".otp-box");
      otp.code.split("").forEach((digit, i) => {
        if (boxes[i]) boxes[i].value = digit;
      });

      // Automatically verify!
      verifyOTP();
    }
  } catch (err) {
    console.log("Web OTP auto-read failed:", err);
  }
}
if (result.success) {
  document.querySelector(".login-container").style.display = "none";
  document.getElementById("otpSection").style.display = "block";

  startCountdown();
  autoReadOTP(); // ← START AUTO READ
}

