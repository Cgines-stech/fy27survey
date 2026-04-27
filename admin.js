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
  doc,
  getDoc,
  getDocs,
  query,
  where,
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const signInButton = document.getElementById("signInButton");
const signOutButton = document.getElementById("signOutButton");
const exportButton = document.getElementById("exportButton");
const adminStatus = document.getElementById("adminStatus");
const summarySection = document.getElementById("summarySection");
const roleSummary = document.getElementById("roleSummary");
const responseCount = document.getElementById("responseCount");

let currentUserProfile = null;
let currentCourseRows = [];
let currentServiceRows = [];

signInButton.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Sign-in error:", error);
    adminStatus.textContent = `Sign-in failed: ${error.code}`;
    adminStatus.style.color = "red";
  }
});

signOutButton.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    resetDashboard();
    return;
  }

  signInButton.style.display = "none";
  signOutButton.style.display = "block";

  try {
    const userProfile = await getUserProfile(user.email);

    if (!userProfile) {
      exportButton.style.display = "none";
      summarySection.style.display = "none";
      adminStatus.textContent = `Access denied. No role found for ${user.email}.`;
      adminStatus.style.color = "red";
      return;
    }

    currentUserProfile = userProfile;

    adminStatus.textContent = `Signed in as ${user.email}.`;
    adminStatus.style.color = "green";

    roleSummary.textContent = getRoleSummary(userProfile);
    summarySection.style.display = "block";

    await loadAllowedResponses(userProfile);

    const totalRows = currentCourseRows.length + currentServiceRows.length;

    exportButton.style.display = totalRows > 0 ? "block" : "none";
    responseCount.textContent =
      `${currentCourseRows.length} course response(s), ${currentServiceRows.length} service response(s) available.`;
  } catch (error) {
    console.error("Dashboard error:", error);
    adminStatus.textContent = "Could not load dashboard. Check Firebase rules, indexes, and user role setup.";
    adminStatus.style.color = "red";
  }
});

exportButton.addEventListener("click", () => {
  if (currentCourseRows.length > 0) {
    downloadCSV(currentCourseRows, "fy27-course-responses.csv");
  }

  if (currentServiceRows.length > 0) {
    downloadCSV(currentServiceRows, "fy27-service-responses.csv");
  }

  adminStatus.textContent =
    `Downloaded ${currentCourseRows.length} course response(s) and ${currentServiceRows.length} service response(s).`;
  adminStatus.style.color = "green";
});

async function getUserProfile(email) {
  const userRef = doc(db, "users", email);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return null;
  }

  return {
    email,
    ...userSnapshot.data()
  };
}

async function loadAllowedResponses(userProfile) {
  currentCourseRows = [];
  currentServiceRows = [];

  if (userProfile.role === "admin") {
    await loadCourseResponses(
      query(collection(db, "anonymousResponses"), orderBy("createdAt", "desc"))
    );

    await loadServiceResponses(
      query(collection(db, "serviceResponses"), orderBy("createdAt", "desc"))
    );
  }

  if (userProfile.role === "director") {
    await loadCourseResponses(
      query(
        collection(db, "anonymousResponses"),
        where("program", "==", userProfile.program),
        orderBy("createdAt", "desc")
      )
    );
  }

  if (userProfile.role === "instructor") {
    await loadCourseResponses(
      query(
        collection(db, "anonymousResponses"),
        where("instructorEmail", "==", userProfile.instructorEmail),
        orderBy("createdAt", "desc")
      )
    );
  }

  if (userProfile.role === "serviceDirector") {
    const allowedServices = Array.isArray(userProfile.services)
      ? userProfile.services
      : [];

    for (const serviceName of allowedServices) {
      await loadServiceResponses(
        query(
          collection(db, "serviceResponses"),
          where("service", "==", serviceName),
          orderBy("createdAt", "desc")
        )
      );
    }
  }
}

async function loadCourseResponses(responsesQuery) {
  const snapshot = await getDocs(responsesQuery);

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();

    currentCourseRows.push({
      id: docSnapshot.id,
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
}

async function loadServiceResponses(responsesQuery) {
  const snapshot = await getDocs(responsesQuery);

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();

    currentServiceRows.push({
      id: docSnapshot.id,
      linkedCourseResponseId: data.linkedCourseResponseId || "",
      submissionDate: data.submissionDate || "",
      program: data.program || "",
      course: data.course || "",
      service: data.service || "",
      serviceReview: data.serviceReview || "",
      additionalInfo: data.additionalInfo || "",
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleString()
        : ""
    });
  });
}

function getRoleSummary(userProfile) {
  if (userProfile.role === "admin") {
    return "Role: Admin — can export all course and service responses.";
  }

  if (userProfile.role === "director") {
    return `Role: Director — can export course responses for ${userProfile.program}.`;
  }

  if (userProfile.role === "instructor") {
    return `Role: Instructor — can export course responses for ${userProfile.instructorEmail}.`;
  }

  if (userProfile.role === "serviceDirector") {
    return `Role: Service Director — can export service responses for ${(userProfile.services || []).join(", ")}.`;
  }

  return "Role: Unknown.";
}

function resetDashboard() {
  currentUserProfile = null;
  currentCourseRows = [];
  currentServiceRows = [];

  signInButton.style.display = "block";
  signOutButton.style.display = "none";
  exportButton.style.display = "none";
  summarySection.style.display = "none";

  adminStatus.textContent = "Not signed in.";
  adminStatus.style.color = "#555";
  responseCount.textContent = "";
  roleSummary.textContent = "";
}

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