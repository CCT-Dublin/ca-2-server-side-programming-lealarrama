// Get the form element by its ID
const form = document.getElementById("myForm");

// Get the paragraph where messages will be shown
const msg = document.getElementById("msg");

// Regular expression to validate first name and second name
// Only letters or numbers, maximum 20 characters
const nameRe = /^[A-Za-zÀ-ÿ0-9]{1,20}$/;

// Regular expression to validate email format
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regular expression to validate phone number (exactly 10 digits)
const phoneRe = /^\d{10}$/;

// Regular expression to validate eircode
// Must start with a number and be 6 alphanumeric characters
const eircodeRe = /^[0-9][A-Za-z0-9]{5}$/;

// Function to show a message on the page
function show(text) {
  msg.textContent = text;
}

// Listen for the form submit event
form.addEventListener("submit", async (e) => {
  // Prevent the default form submission
  e.preventDefault();

  // Get and clean form values
  const first_name = document.getElementById("first_name").value.trim();
  const second_name = document.getElementById("second_name").value.trim();
  const email = document.getElementById("email").value.trim();

  // Remove non-numeric characters from phone number
  const phone_number = document
    .getElementById("phone_number")
    .value.replace(/\D/g, "")
    .trim();

  // Remove spaces from eircode
  const eircode = document
    .getElementById("eircode")
    .value.replace(/\s+/g, "")
    .trim();

  // Array to store validation errors
  const errors = [];

  // Validate each field using regex rules
  if (!nameRe.test(first_name)) errors.push("first_name");
  if (!nameRe.test(second_name)) errors.push("second_name");
  if (!emailRe.test(email)) errors.push("email");
  if (!phoneRe.test(phone_number)) errors.push("phone_number");
  if (!eircodeRe.test(eircode)) errors.push("eircode");

  // If there are validation errors, show them and stop
  if (errors.length > 0) {
    show("Errors: " + errors.join(", "));
    return;
  }

  // Show sending message
  show("Sending...");

  try {
    // Send data to the server using fetch API
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name,
        second_name,
        email,
        phone_number,
        eircode,
      }),
    });

    // Read server response as JSON
    const data = await res.json();

    // If server returns an error, show error message
    if (!res.ok) {
      show(
        "Server error: " +
          (data.details?.join(", ") ||
            data.error ||
            "Validation failed")
      );
      return;
    }

    // Show success message and inserted ID
    show("Saved! ID: " + data.insertId);

    // Clear the form after successful submission
    form.reset();
  } catch (err) {
    // Show error if server cannot be reached
    show("Cannot connect to server. Run: node server.js");
  }
});