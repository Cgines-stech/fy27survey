
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

const filterSection = document.getElementById("filterSection");
const tableSection = document.getElementById("tableSection");

const programFilter = document.getElementById("programFilter");
const courseFilter = document.getElementById("courseFilter");
const instructorFilter = document.getElementById("instructorFilter");
const instructorFilterLabel = document.getElementById("instructorFilterLabel");
const startDateFilter = document.getElementById("startDateFilter");
const endDateFilter = document.getElementById("endDateFilter");
const clearFiltersButton = document.getElementById("clearFiltersButton");

const courseTable = document.getElementById("courseTable");
const instructorTable = document.getElementById("instructorTable");
const programTable = document.getElementById("programTable");
const serviceTable = document.getElementById("serviceTable");
const additionalFeedbackTable = document.getElementById("additionalFeedbackTable");

let filteredCourseRows = [];
let filteredInstructorRows = [];
let filteredProgramRows = [];
let filteredServiceRows = [];
let filteredAdditionalFeedbackRows = [];

let currentUserProfile = null;

let currentCourseRows = [];
let currentInstructorRows = [];
let currentProgramRows = [];
let currentServiceRows = [];
let currentAdditionalFeedbackRows = [];

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

    setupFilters(userProfile);
    applyFiltersAndRenderTables(userProfile);

    filterSection.style.display = "block";
    tableSection.style.display = "block";

    const totalRows =
      currentCourseRows.length +
      currentInstructorRows.length +
      currentProgramRows.length +
      currentServiceRows.length +
      currentAdditionalFeedbackRows.length;

    exportButton.addEventListener("click", () => {
      if (filteredCourseRows.length > 0) {
        downloadCSV(filteredCourseRows, "fy27-filtered-course-responses.csv");
      }

      if (filteredInstructorRows.length > 0) {
        downloadCSV(filteredInstructorRows, "fy27-filtered-instructor-responses.csv");
      }

      if (filteredProgramRows.length > 0) {
        downloadCSV(filteredProgramRows, "fy27-filtered-program-completion-responses.csv");
      }

      if (filteredServiceRows.length > 0) {
        downloadCSV(filteredServiceRows, "fy27-filtered-service-responses.csv");
      }

      if (filteredAdditionalFeedbackRows.length > 0) {
        downloadCSV(filteredAdditionalFeedbackRows, "fy27-filtered-additional-feedback-responses.csv");
      }

      adminStatus.textContent = "Filtered CSV download complete.";
      adminStatus.style.color = "green";
    });

    responseCount.textContent =
      `${currentCourseRows.length} course response(s), ` +
      `${currentInstructorRows.length} instructor response(s), ` +
      `${currentProgramRows.length} program completion response(s), ` +
      `${currentServiceRows.length} service response(s), ` +
      `${currentAdditionalFeedbackRows.length} additional feedback response(s) available.`;
  } catch (error) {
    console.error("Dashboard error:", error);
    adminStatus.textContent =
      "Could not load dashboard. Check Firebase rules, indexes, and user role setup.";
    adminStatus.style.color = "red";
  }
});

exportButton.addEventListener("click", () => {
  if (currentCourseRows.length > 0) {
    downloadCSV(currentCourseRows, "fy27-course-responses.csv");
  }

  if (currentInstructorRows.length > 0) {
    downloadCSV(currentInstructorRows, "fy27-instructor-responses.csv");
  }

  if (currentProgramRows.length > 0) {
    downloadCSV(currentProgramRows, "fy27-program-completion-responses.csv");
  }

  if (currentServiceRows.length > 0) {
    downloadCSV(currentServiceRows, "fy27-service-responses.csv");
  }

  if (currentAdditionalFeedbackRows.length > 0) {
    downloadCSV(currentAdditionalFeedbackRows, "fy27-additional-feedback-responses.csv");
  }

  adminStatus.textContent = "CSV download complete.";
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
  currentInstructorRows = [];
  currentProgramRows = [];
  currentServiceRows = [];
  currentAdditionalFeedbackRows = [];

  if (userProfile.role === "admin") {
    await loadCourseResponses(
      query(collection(db, "courseResponses"), orderBy("createdAt", "desc"))
    );

    await loadInstructorResponses(
      query(collection(db, "instructorResponses"), orderBy("createdAt", "desc"))
    );

    await loadProgramResponses(
      query(collection(db, "programCompletionResponses"), orderBy("createdAt", "desc"))
    );

    await loadServiceResponses(
      query(collection(db, "serviceResponses"), orderBy("createdAt", "desc"))
    );

    await loadAdditionalFeedbackResponses(
      query(collection(db, "additionalFeedbackResponses"), orderBy("createdAt", "desc"))
    );
  }

if (userProfile.role === "director") {

  const allowedPrograms = Array.isArray(userProfile.programs)
    ? userProfile.programs
    : [];

  for (const programName of allowedPrograms) {

    await loadCourseResponses(
      query(
        collection(db, "courseResponses"),
        where("program", "==", programName),
        orderBy("createdAt", "desc")
      )
    );

    await loadInstructorResponses(
      query(
        collection(db, "instructorResponses"),
        where("program", "==", programName),
        orderBy("createdAt", "desc")
      )
    );

    await loadProgramResponses(
      query(
        collection(db, "programCompletionResponses"),
        where("program", "==", programName),
        orderBy("createdAt", "desc")
      )
    );

    await loadAdditionalFeedbackResponses(
      query(
        collection(db, "additionalFeedbackResponses"),
        where("program", "==", programName),
        orderBy("createdAt", "desc")
      )
    );
  }
}

  if (userProfile.role === "instructor") {
    await loadInstructorResponses(
      query(
        collection(db, "instructorResponses"),
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
      submissionGroupId: data.submissionGroupId || "",
      submissionDate: data.submissionDate || "",
      program: data.program || "",
      course: data.course || "",
      isLastCourse: data.isLastCourse || "",
      ...flattenObject(data.courseRatings || {}, "courseRating"),
      createdAt: formatTimestamp(data.createdAt)
    });
  });
}

async function loadInstructorResponses(responsesQuery) {
  const snapshot = await getDocs(responsesQuery);

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();

    currentInstructorRows.push({
      id: docSnapshot.id,
      submissionGroupId: data.submissionGroupId || "",
      linkedCourseResponseId: data.linkedCourseResponseId || "",
      submissionDate: data.submissionDate || "",
      program: data.program || "",
      course: data.course || "",
      isLastCourse: data.isLastCourse || "",
      instructorName: data.instructorName || "",
      instructorEmail: data.instructorEmail || "",
      ...flattenObject(data.instructorRatings || {}, "instructorRating"),
      instructorAdditionalFeedback: data.instructorAdditionalFeedback || "",
      createdAt: formatTimestamp(data.createdAt)
    });
  });
}

async function loadProgramResponses(responsesQuery) {
  const snapshot = await getDocs(responsesQuery);

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();

    currentProgramRows.push({
      id: docSnapshot.id,
      submissionGroupId: data.submissionGroupId || "",
      linkedCourseResponseId: data.linkedCourseResponseId || "",
      submissionDate: data.submissionDate || "",
      program: data.program || "",
      course: data.course || "",
      ...flattenObject(data.programRatings || {}, "programRating"),
      programPositiveFeedback: data.programPositiveFeedback || "",
      programImprovementFeedback: data.programImprovementFeedback || "",
      createdAt: formatTimestamp(data.createdAt)
    });
  });
}

async function loadServiceResponses(responsesQuery) {
  const snapshot = await getDocs(responsesQuery);

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();

    currentServiceRows.push({
      id: docSnapshot.id,
      submissionGroupId: data.submissionGroupId || "",
      linkedCourseResponseId: data.linkedCourseResponseId || "",
      submissionDate: data.submissionDate || "",
      program: data.program || "",
      course: data.course || "",
      service: data.service || "",
      ...flattenObject(data.serviceRatings || {}, "serviceRating"),
      servicePositiveFeedback: data.servicePositiveFeedback || "",
      serviceImprovementFeedback: data.serviceImprovementFeedback || "",
      createdAt: formatTimestamp(data.createdAt)
    });
  });
}

async function loadAdditionalFeedbackResponses(responsesQuery) {
  const snapshot = await getDocs(responsesQuery);

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();

    currentAdditionalFeedbackRows.push({
      id: docSnapshot.id,
      submissionGroupId: data.submissionGroupId || "",
      linkedCourseResponseId: data.linkedCourseResponseId || "",
      submissionDate: data.submissionDate || "",
      program: data.program || "",
      course: data.course || "",
      isLastCourse: data.isLastCourse || "",
      additionalFeedback: data.additionalFeedback || "",
      createdAt: formatTimestamp(data.createdAt)
    });
  });
}

function getRoleSummary(userProfile) {
  if (userProfile.role === "admin") {
    return "Role: Admin — can export all course, instructor, program, service, and additional feedback responses.";
  }

  if (userProfile.role === "director") {
    return `Role: Director — can export responses for ${(userProfile.programs || []).join(", ")}.`;
  }

  if (userProfile.role === "instructor") {
    return `Role: Instructor — can export only instructor feedback assigned to ${userProfile.instructorEmail}.`;
  }

  if (userProfile.role === "serviceDirector") {
    return `Role: Service Director — can export service responses for ${(userProfile.services || []).join(", ")}.`;
  }

  return "Role: Unknown.";
}

function resetDashboard() {
  currentUserProfile = null;

  currentCourseRows = [];
  currentInstructorRows = [];
  currentProgramRows = [];
  currentServiceRows = [];
  currentAdditionalFeedbackRows = [];

  signInButton.style.display = "block";
  signOutButton.style.display = "none";
  exportButton.style.display = "none";
  summarySection.style.display = "none";

  adminStatus.textContent = "Not signed in.";
  adminStatus.style.color = "#555";
  responseCount.textContent = "";
  roleSummary.textContent = "";

  filterSection.style.display = "none";
  tableSection.style.display = "none";

  courseTable.innerHTML = "";
  instructorTable.innerHTML = "";
  programTable.innerHTML = "";
  serviceTable.innerHTML = "";
  additionalFeedbackTable.innerHTML = "";
}

function flattenObject(objectValue, prefix) {
  const flattened = {};

  Object.entries(objectValue).forEach(([key, value]) => {
    flattened[`${prefix}_${key}`] = value;
  });

  return flattened;
}

function formatTimestamp(timestamp) {
  return timestamp?.toDate ? timestamp.toDate().toLocaleString() : "";
}

function downloadCSV(rows, filename) {
  const excludedFields = [
    "id",
    "submissionGroupId",
    "linkedCourseResponseId",
    "createdAt"
  ];

  const headers = getVisibleHeaders(rows).filter(
    (header) => !excludedFields.includes(header)
  );

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

function getAllHeaders(rows) {
  const headers = new Set();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => headers.add(key));
  });

  return Array.from(headers);
}

function getVisibleHeaders(rows) {
  const excludedFields = [
    "id",
    "submissionGroupId",
    "linkedCourseResponseId",
    "createdAt"
  ];

  return getAllHeaders(rows).filter(
    (header) => !excludedFields.includes(header)
  );
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

function setupFilters(userProfile) {
  populateFilter(programFilter, getUniqueValues([
    ...currentCourseRows,
    ...currentInstructorRows,
    ...currentProgramRows,
    ...currentServiceRows,
    ...currentAdditionalFeedbackRows
  ], "program"), "All Programs");

  populateFilter(courseFilter, getUniqueValues([
    ...currentCourseRows,
    ...currentInstructorRows,
    ...currentProgramRows,
    ...currentServiceRows,
    ...currentAdditionalFeedbackRows
  ], "course"), "All Courses");

  const canFilterByInstructor =
    userProfile.role === "admin" || userProfile.role === "director";

  instructorFilterLabel.style.display = canFilterByInstructor ? "grid" : "none";

  if (canFilterByInstructor) {
    populateFilter(
      instructorFilter,
      getUniqueValues(currentInstructorRows, "instructorName"),
      "All Instructors"
    );
  }

  [
    programFilter,
    courseFilter,
    instructorFilter,
    startDateFilter,
    endDateFilter
  ].forEach((filter) => {
    filter.onchange = () => applyFiltersAndRenderTables(userProfile);
  });

  clearFiltersButton.onclick = () => {
    programFilter.value = "";
    courseFilter.value = "";
    instructorFilter.value = "";
    startDateFilter.value = "";
    endDateFilter.value = "";

    applyFiltersAndRenderTables(userProfile);
  };
}

function applyFiltersAndRenderTables(userProfile) {
  filteredCourseRows = filterRows(currentCourseRows, userProfile);
  filteredInstructorRows = filterRows(currentInstructorRows, userProfile);
  filteredProgramRows = filterRows(currentProgramRows, userProfile);
  filteredServiceRows = filterRows(currentServiceRows, userProfile);
  filteredAdditionalFeedbackRows = filterRows(currentAdditionalFeedbackRows, userProfile);

  renderTable(courseTable, filteredCourseRows);
  renderTable(instructorTable, filteredInstructorRows);
  renderTable(programTable, filteredProgramRows);
  renderServiceCards(
  serviceTable,
  filteredServiceRows
);
  renderTable(additionalFeedbackTable, filteredAdditionalFeedbackRows);

  const totalRows =
    filteredCourseRows.length +
    filteredInstructorRows.length +
    filteredProgramRows.length +
    filteredServiceRows.length +
    filteredAdditionalFeedbackRows.length;

  responseCount.textContent = `${totalRows} filtered response row(s) visible.`;
  exportButton.style.display = totalRows > 0 ? "block" : "none";
}

function filterRows(rows, userProfile) {
  return rows.filter((row) => {
    if (programFilter.value && row.program !== programFilter.value) return false;
    if (courseFilter.value && row.course !== courseFilter.value) return false;

    if (
      (userProfile.role === "admin" || userProfile.role === "director") &&
      instructorFilter.value &&
      row.instructorName !== instructorFilter.value
    ) {
      return false;
    }

    return dateInRange(row.submissionDate);
  });
}

function dateInRange(submissionDate) {
  if (!submissionDate) return true;

  const rowDate = new Date(submissionDate);
  const startDate = startDateFilter.value ? new Date(startDateFilter.value) : null;
  const endDate = endDateFilter.value ? new Date(endDateFilter.value) : null;

  if (startDate && rowDate < startDate) return false;

  if (endDate) {
    endDate.setHours(23, 59, 59, 999);
    if (rowDate > endDate) return false;
  }

  return true;
}

function renderTable(container, rows, hiddenColumns = []) {
  container.innerHTML = "";

  if (!rows.length) {
    container.innerHTML = `<p class="empty-table-message">No responses to display.</p>`;
    return;
  }

  const headers = getVisibleHeaders(rows).filter(
  (header) => !hiddenColumns.includes(header)
);

  const wrapper = document.createElement("div");
  wrapper.className = "table-wrapper";

  const table = document.createElement("table");
  table.className = "dashboard-table";

  table.innerHTML = `
    <thead>
      <tr>${headers.map((header) => `<th>${formatHeader(header)}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>${headers.map((header) => {
  const value = row[header] ?? "";

  let className = "";

  if (value === "Poor") {
    className = "rating-poor";
  } else if (value === "Fair") {
    className = "rating-fair";
  } else if (value === "Excellent") {
    className = "rating-excellent";
  }

  return `<td class="${className}">${escapeHTML(value)}</td>`;
}).join("")}</tr>
      `).join("")}
    </tbody>
  `;

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

function renderServiceCards(container, rows) {
  container.innerHTML = "";

  if (!rows.length) {
    container.innerHTML = `<p class="empty-table-message">No responses to display.</p>`;
    return;
  }

  container.innerHTML = rows.map((row) => {
    const hiddenFields = [
      "id",
      "submissionGroupId",
      "linkedCourseResponseId",
      "createdAt",
      "program",
      "course"
    ];

    const ratingEntries = Object.entries(row).filter(([key]) => {
      return (
        !hiddenFields.includes(key) &&
        key !== "submissionDate" &&
        key !== "service" &&
        key !== "servicePositiveFeedback" &&
        key !== "serviceImprovementFeedback"
      );
    });

    return `
      <div class="response-card">
        <h4>${escapeHTML(row.service || "Service Response")}</h4>

        <p><strong>Submission Date:</strong> ${escapeHTML(row.submissionDate || "")}</p>

        <div class="response-list">
          ${ratingEntries.map(([question, answer]) => `
            <div class="response-item">
              <div class="response-question">${formatHeader(question)}</div>
              <div class="${getRatingClass(answer)}">${escapeHTML(answer ?? "")}</div>
            </div>
          `).join("")}
        </div>

        <p><strong>What went well:</strong><br>${escapeHTML(row.servicePositiveFeedback || "")}</p>
        <p><strong>What could be improved:</strong><br>${escapeHTML(row.serviceImprovementFeedback || "")}</p>
      </div>
    `;
  }).join("");
}

function getRatingClass(value) {
  if (value === "Poor") return "rating-pill rating-poor";
  if (value === "Fair") return "rating-pill rating-fair";
  if (value === "Excellent") return "rating-pill rating-excellent";
  return "rating-pill";
}

function populateFilter(selectElement, values, placeholderText) {
  selectElement.innerHTML = `<option value="">${placeholderText}</option>`;

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
  });
}

function getUniqueValues(rows, key) {
  return Array.from(
    new Set(
      rows
        .map((row) => row[key])
        .filter((value) => value !== undefined && value !== null && value !== "")
    )
  ).sort();
}

function formatHeader(header) {
  return header
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (firstLetter) => firstLetter.toUpperCase());
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}