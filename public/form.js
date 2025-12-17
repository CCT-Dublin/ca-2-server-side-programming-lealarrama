const form = document.getElementById("myForm");
const msg = document.getElementById("msg");

const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d{10}$/;
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

function show(text) {
  msg.textContent = text;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const first_name = document.getElementById("first_name").value.trim();
  const second_name = document.getElementById("second_name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone_number = document.getElementById("phone_number").value.replace(/\D/g, "").trim();
  const eircode = document.getElementById("eircode").value.replace(/\s+/g, "").trim();

  const errors = [];
  if (!nameRe.test(first_name)) errors.push("first_name");
  if (!nameRe.test(second_name)) errors.push("second_name");
  if (!emailRe.test(email)) errors.push("email");
  if (!phoneRe.test(phone_number)) errors.push("phone_number");
  if (!eircodeRe.test(eircode)) errors.push("eircode");

  if (errors.length > 0) {
    show("Errors: " + errors.join(", "));
    return;
  }

  show("Sending...");

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ first_name, second_name, email, phone_number, eircode }),
    });

    const data = await res.json();

    if (!res.ok) {
      show("Server error: " + (data.details?.join(", ") || data.error || "Validation failed"));
      return;
    }

    show("✅ Saved! ID: " + data.insertId);
    form.reset();
  } catch (err) {
    show("❌ Cannot connect to server. Run: node server.js");
  }
});