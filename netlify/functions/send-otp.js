async function sendOTP() {
  const phone = document.getElementById("phone").value.trim();
  if (!phone) return alert("Enter phone number");

  const otp = Math.floor(100000 + Math.random() * 900000);
  console.log("Generated OTP:", otp);

  const res = await fetch("https://kmujqhvywyykwaiwalys.supabase.co/functions/v1/send_sms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: phone,
      otp: otp
    })
  });

  const data = await res.json();
  console.log("SMS RESULT:", data);

  if (!res.ok) {
    alert("SMS FAILED: " + data.error);
    return;
  }

  // Store OTP locally for now
  localStorage.setItem("otp", otp);

  alert("OTP sent!");
}
