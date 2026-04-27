//script.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIkeABAfs3zDAQliZOeQNErzmCAeU0n3o",
  authDomain: "fy27survey.firebaseapp.com",
  projectId: "fy27survey",
  storageBucket: "fy27survey.firebasestorage.app",
  messagingSenderId: "725559649427",
  appId: "1:725559649427:web:f493f994ff6a1cd5e79966"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("reviewForm");
const statusMessage = document.getElementById("statusMessage");
const submitButton = document.getElementById("submitButton");

const programSelect = document.getElementById("program");
const courseSelect = document.getElementById("course");
const instructorSelect = document.getElementById("instructorName");

const confirmationMessage = document.getElementById("confirmationMessage");

populateDropdown(programSelect, Object.keys(data));

programSelect.addEventListener("change", function () {
  const selectedProgram = programSelect.value;

  resetDropdown(courseSelect, "Select a course");
  resetDropdown(instructorSelect, "Select a course first");

  if (!selectedProgram || !data[selectedProgram]) {
    courseSelect.disabled = true;
    instructorSelect.disabled = true;
    return;
  }

  courseSelect.disabled = false;
  populateDropdown(courseSelect, Object.keys(data[selectedProgram]));
});

courseSelect.addEventListener("change", function () {
  const selectedProgram = programSelect.value;
  const selectedCourse = courseSelect.value;

  resetDropdown(instructorSelect, "Select an instructor");

  if (
    !selectedProgram ||
    !selectedCourse ||
    !data[selectedProgram][selectedCourse]
  ) {
    instructorSelect.disabled = true;
    return;
  }

  instructorSelect.disabled = false;
  populateDropdown(instructorSelect, data[selectedProgram][selectedCourse]);
});

form.addEventListener("submit", async function (event) {
  event.preventDefault();

  statusMessage.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

const formData = {
  submissionDate: new Date().toLocaleDateString("en-US"),
  program: programSelect.value,
  course: courseSelect.value,
  instructorName: instructorSelect.value,
  instructorEmail: instructorEmails[instructorSelect.value] || "",
  instructorReview: document.getElementById("instructorReview").value,
  courseReview: document.getElementById("courseReview").value,
  createdAt: serverTimestamp()
};

try {
  await addDoc(collection(db, "anonymousResponses"), formData);

  statusMessage.textContent = "";
  form.style.display = "none";
  confirmationMessage.style.display = "block";
} catch (error) {
  console.error("Error submitting form:", error);

  statusMessage.textContent = "There was an error submitting the form. Please try again.";
  statusMessage.style.color = "red";
} finally {
  submitButton.disabled = false;
  submitButton.textContent = "Submit Review";
}
});

function populateDropdown(selectElement, options) {
  options.forEach(function (optionText) {
    const option = document.createElement("option");
    option.value = optionText;
    option.textContent = optionText;
    selectElement.appendChild(option);
  });
}

function resetDropdown(selectElement, placeholderText) {
  selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
  selectElement.disabled = true;
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  const [year, month, day] = dateValue.split("-");
  return `${month}/${day}/${year}`;
}