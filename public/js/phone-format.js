// public/js/phone-format.js
export function normalizePhoneForSend(raw) {
  if (!raw) return "";
  let s = raw.replace(/[^\d]/g, ""); // strip non-digits
  // if user entered leading 0 (e.g. 0712345678) remove it
  if (s.startsWith("0")) s = s.substring(1);
  // allow if they included country already (27)
  if (s.startsWith("27")) s = s.substring(2);
  // final: +27XXXXXXXXX (9 digits after 27 is typical SA mobile 9 digits)
  return "+27" + s;
}

// attach to an input element to format visually (optional)
export function attachPhoneFormatter(inputEl) {
  if (!inputEl) return;
  inputEl.addEventListener("input", () => {
    const raw = inputEl.value;
    // remove letters, keep spacing for readability
    const digits = raw.replace(/[^\d]/g, "");
    // show chunked as 7 123 4567 style (simple)
    if (digits.length <= 3) inputEl.value = digits;
    else if (digits.length <= 6) inputEl.value = digits.slice(0,3) + " " + digits.slice(3);
    else inputEl.value = digits.slice(0,3) + " " + digits.slice(3,6) + " " + digits.slice(6, 10);
  });
}
