// admin.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIkeABAfs3zDAQliZOeQNErzmCAeU0n3o",
  authDomain: "fy27survey.firebaseapp.com",
  projectId: "fy27survey",
  storageBucket: "fy27survey.firebasestorage.app",
  messagingSenderId: "725559649427",
  appId: "1:725559649427:web:f493f994ff6a1cd5e79966"
};

const ADMIN_EMAIL = "cgines@stech.edu";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const exportButton = document.getElementById("exportButton");
const adminStatus = document.getElementById("adminStatus");

signInButton.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Sign-in error:", error);
    adminStatus.textContent = "Sign-in failed. Please try again.";
    adminStatus.style.color = "red";
  }
});

signOutButton.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInButton.style.display = "block";
    signOutButton.style.display = "none";
    exportButton.style.display = "none";
    adminStatus.textContent = "Not signed in.";
    adminStatus.style.color = "#555";
    return;
  }

  signInButton.style.display = "none";
  signOutButton.style.display = "block";

  if (user.email === ADMIN_EMAIL) {
    exportButton.style.display = "block";
    adminStatus.textContent = `Signed in as ${user.email}.`;
    adminStatus.style.color = "green";
  } else {
    exportButton.style.display = "none";
    adminStatus.textContent = `Access denied for ${user.email}.`;
    adminStatus.style.color = "red";
  }
});

exportButton.addEventListener("click", async () => {
  adminStatus.textContent = "Preparing CSV...";
  adminStatus.style.color = "#555";

  try {
    const responsesQuery = query(
      collection(db, "anonymousResponses"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(responsesQuery);

    const rows = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      rows.push({
        id: doc.id,
        submissionDate: data.submissionDate || "",
        program: data.program || "",
        course: data.course || "",
        instructorName: data.instructorName || "",
        instructorEmail: data.instructorEmail || "",
        instructorReview: data.instructorReview || "",
        courseReview: data.courseReview || "",
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toLocaleString()
          : ""
      });
    });

    if (rows.length === 0) {
      adminStatus.textContent = "No responses found.";
      return;
    }

    downloadCSV(rows, "fy27-survey-responses.csv");

    adminStatus.textContent = `Downloaded ${rows.length} response(s).`;
    adminStatus.style.color = "green";
  } catch (error) {
    console.error("Export error:", error);
    adminStatus.textContent = "Export failed. Check your Firebase rules and sign-in email.";
    adminStatus.style.color = "red";
  }
});

function downloadCSV(rows, filename) {
  const headers = Object.keys(rows[0]);

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeCSV(row[header]))
        .join(",")
    )
  ];

  const csvContent = csvRows.join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function escapeCSV(value) {
  const stringValue = String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}