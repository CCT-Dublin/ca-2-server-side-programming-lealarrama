const form = document.getElementById("myForm");
const msg = document.getElementById("msg");

const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^\d{10}$/;
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

function validate(data) {
  const errors = [];

  const first = String(data.first_name ?? "").trim();
  const second = String(data.second_name ?? "").trim();
  const email = String(data.email ?? "").trim();
  const phone = String(data.phone_number?? "").trim();
  const eircode = String(data.eircode ?? "").trim();

  if (!nameRe.test(first)) errors.push("first_name invalid (letters/numbers, max 20)");
  if (!nameRe.test(second)) errors.push("second_name invalid (letters/numbers, max 20)");
  if (!emailRe.test(email)) errors.push("email invalid");
  if (!phoneRe.test(phone)) errors.push("phone invalid (exactly 10 digits)");
  if (!eircodeRe.test(eircode)) errors.push("eircode invalid (6 chars, starts with number)");

  return errors;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    first_name: document.getElementById("first_name").value,
    second_name: document.getElementById("second_name").value,
    email: document.getElementById("email").value,
    phone_number: document.getElementById("phone_number").value,
    eircode: document.getElementById("eircode").value,
  };

  data.phone_number = data.phone_number.replace(/\D/g, "");


  const errors = validate(data);
  if (errors.length) {
    msg.textContent = "Errors: " + errors.join(" | ");
    return;
  }

  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const out = await res.json();
    if (!res.ok) {
      msg.textContent = "Server error: " + (out.error || "Unknown error");
      return;
    }

    msg.textContent = "Saved OK! Inserted id: " + out.insertId;
    form.reset();
  } catch (err) {
    msg.textContent = "Network error: " + err.message;
  }
});