
// admin.js

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

const ratingOptions = ["Excellent", "Good", "Fair", "Poor", "Not Applicable"];

const courseQuestions = [
  "The course content was clearly organized.",
  "The course helped me build useful skills.",
  "Assignments supported the course objectives.",
  "Course materials were helpful.",
  "Overall, I was satisfied with this course."
];

const instructorQuestions = [
  "The instructor communicated clearly.",
  "The instructor was prepared and organized.",
  "The instructor provided helpful feedback.",
  "Overall, I was satisfied with this instructor."
];

const programQuestions = [
  "The program prepared me for my career goals.",
  "The program content was relevant and useful.",
  "The program was well organized.",
  "The program met my expectations.",
  "Overall, I was satisfied with the program."
];

const serviceQuestionsByService = {
  "Student Services": [
    "Student Services staff were helpful.",
    "Student Services communicated clearly.",
    "Student Services responded in a timely manner.",
    "Student Services helped me resolve my need.",
    "Overall, I was satisfied with Student Services."
  ],
  "Financial Aid Services": [
    "Financial Aid information was easy to understand.",
    "Financial Aid staff were helpful.",
    "Financial Aid services were timely.",
    "Financial Aid helped me understand my options.",
    "Overall, I was satisfied with Financial Aid Services."
  ],
  "Services for Students with Disabilities": [
    "Disability services were accessible.",
    "Staff communicated accommodations clearly.",
    "My needs were handled respectfully.",
    "Support was provided in a timely manner.",
    "Overall, I was satisfied with disability services."
  ],
  "Technology and Campus IT": [
    "Technology systems were reliable.",
    "IT support was helpful.",
    "Technology issues were resolved in a timely manner.",
    "Online tools were easy to access.",
    "Overall, I was satisfied with Technology and Campus IT."
  ],
  "Facilities and Safety": [
    "Campus facilities were clean.",
    "Campus facilities were accessible.",
    "I felt safe on campus.",
    "Safety concerns were addressed appropriately.",
    "Overall, I was satisfied with Facilities and Safety."
  ],
  "Veteran Services": [
    "Veteran Services staff were helpful.",
    "Veteran benefits information was clear.",
    "Veteran Services responded in a timely manner.",
    "Veteran Services supported my needs.",
    "Overall, I was satisfied with Veteran Services."
  ]
};

const form = document.getElementById("reviewForm");
const statusMessage = document.getElementById("statusMessage");
const confirmationMessage = document.getElementById("confirmationMessage");
const submitButton = document.getElementById("submitButton");
const nextButton = document.getElementById("nextButton");
const backButton = document.getElementById("backButton");

const programSelect = document.getElementById("program");
const courseSelect = document.getElementById("course");
const isLastCourseSelect = document.getElementById("isLastCourse");
const serviceSelect = document.getElementById("service");

const courseMatrix = document.getElementById("courseMatrix");
const programMatrix = document.getElementById("programMatrix");
const serviceMatrix = document.getElementById("serviceMatrix");
const serviceFeedbackTitle = document.getElementById("serviceFeedbackTitle");

const instructorFeedbackContainer = document.getElementById("instructorFeedbackContainer");
const addInstructorButton = document.getElementById("addInstructorButton");

const steps = Array.from(document.querySelectorAll(".form-step"));
let currentStepIndex = 0;
let instructorBlockCount = 0;

populateDropdown(programSelect, Object.keys(data));
populateDropdown(serviceSelect, services);

renderMatrix(courseMatrix, "course", courseQuestions);
renderMatrix(programMatrix, "program", programQuestions);
addInstructorFeedbackBlock();

programSelect.addEventListener("change", () => {
  const selectedProgram = programSelect.value;

  resetDropdown(courseSelect, "Select a course");
  clearInstructorFeedbackBlocks();

  if (!selectedProgram || !data[selectedProgram]) {
    return;
  }

  courseSelect.disabled = false;
  populateDropdown(courseSelect, Object.keys(data[selectedProgram]));
});

courseSelect.addEventListener("change", () => {
  clearInstructorFeedbackBlocks();
  addInstructorFeedbackBlock();
});

serviceSelect.addEventListener("change", () => {
  const selectedService = serviceSelect.value;

  if (
    selectedService &&
    selectedService !== "Complete the survey without leaving additional feedback"
  ) {
    serviceFeedbackTitle.textContent = `${selectedService} Feedback`;
    renderMatrix(
      serviceMatrix,
      "service",
      serviceQuestionsByService[selectedService] || []
    );
  }
});

addInstructorButton.addEventListener("click", () => {
  addInstructorFeedbackBlock();
});

nextButton.addEventListener("click", () => {
  if (!validateCurrentStep()) {
    return;
  }

  goToNextStep();
});

backButton.addEventListener("click", () => {
  goToPreviousStep();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateCurrentStep()) {
    return;
  }

  statusMessage.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Submitting...";

  const submissionGroupId = crypto.randomUUID();
  const baseData = {
    submissionGroupId,
    submissionDate: new Date().toLocaleDateString("en-US"),
    program: programSelect.value,
    course: courseSelect.value,
    isLastCourse: isLastCourseSelect.value,
    createdAt: serverTimestamp()
  };

  try {
    const courseDocRef = await addDoc(collection(db, "courseResponses"), {
      ...baseData,
      courseRatings: getMatrixResponses("course")
    });

    const instructorResponses = getInstructorResponses();

    for (const instructorResponse of instructorResponses) {
      await addDoc(collection(db, "instructorResponses"), {
        ...baseData,
        linkedCourseResponseId: courseDocRef.id,
        instructorName: instructorResponse.instructorName,
        instructorEmail: instructorEmails[instructorResponse.instructorName] || "",
        instructorRatings: instructorResponse.ratings,
        instructorAdditionalFeedback: instructorResponse.additionalFeedback,
        createdAt: serverTimestamp()
      });
    }

    if (isLastCourseSelect.value === "Yes") {
      await addDoc(collection(db, "programCompletionResponses"), {
        ...baseData,
        linkedCourseResponseId: courseDocRef.id,
        programRatings: getMatrixResponses("program"),
        programPositiveFeedback: document.getElementById("programPositiveFeedback").value.trim(),
        programImprovementFeedback: document.getElementById("programImprovementFeedback").value.trim(),
        createdAt: serverTimestamp()
      });

      if (
        serviceSelect.value &&
        serviceSelect.value !== "Complete the survey without leaving additional feedback"
      ) {
        await addDoc(collection(db, "serviceResponses"), {
          ...baseData,
          linkedCourseResponseId: courseDocRef.id,
          service: serviceSelect.value,
          serviceRatings: getMatrixResponses("service"),
          servicePositiveFeedback: document.getElementById("servicePositiveFeedback").value.trim(),
          serviceImprovementFeedback: document.getElementById("serviceImprovementFeedback").value.trim(),
          createdAt: serverTimestamp()
        });
      }
    }

    await addDoc(collection(db, "additionalFeedbackResponses"), {
      ...baseData,
      linkedCourseResponseId: courseDocRef.id,
      additionalFeedback: document.getElementById("additionalFeedback").value.trim(),
      createdAt: serverTimestamp()
    });

    form.style.display = "none";
    confirmationMessage.style.display = "block";
  } catch (error) {
    console.error("Error submitting form:", error);

    statusMessage.textContent = "There was an error submitting the form. Please try again.";
    statusMessage.style.color = "red";

    submitButton.disabled = false;
    submitButton.textContent = "Submit Survey";
  }
});

function goToNextStep() {
  const currentStep = steps[currentStepIndex];

  if (currentStep.id === "programFeedbackStep") {
    showStepById("serviceChoiceStep");
    return;
  }

  if (currentStep.id === "serviceChoiceStep") {
    if (serviceSelect.value === "Complete the survey without leaving additional feedback") {
      showStepById("additionalFeedbackStep");
    } else {
      showStepById("serviceFeedbackStep");
    }
    return;
  }

  if (currentStep.id === "serviceFeedbackStep") {
    showStepById("additionalFeedbackStep");
    return;
  }

  if (isLastCourseSelect.value === "No" && currentStep.contains(isLastCourseSelect)) {
    showStepById("additionalFeedbackStep");
    return;
  }

  if (isLastCourseSelect.value === "Yes" && currentStep.contains(isLastCourseSelect)) {
    showStepById("programFeedbackStep");
    return;
  }

  currentStepIndex++;
  updateStepVisibility();
}

function goToPreviousStep() {
  const currentStep = steps[currentStepIndex];

  if (currentStep.id === "additionalFeedbackStep") {
    if (isLastCourseSelect.value === "No") {
      showStepContainingElement(isLastCourseSelect);
    } else if (
      serviceSelect.value &&
      serviceSelect.value !== "Complete the survey without leaving additional feedback"
    ) {
      showStepById("serviceFeedbackStep");
    } else {
      showStepById("serviceChoiceStep");
    }
    return;
  }

  if (currentStep.id === "serviceFeedbackStep") {
    showStepById("serviceChoiceStep");
    return;
  }

  if (currentStep.id === "serviceChoiceStep") {
    showStepById("programFeedbackStep");
    return;
  }

  if (currentStep.id === "programFeedbackStep") {
    showStepContainingElement(isLastCourseSelect);
    return;
  }

  currentStepIndex--;
  updateStepVisibility();
}

function showStepById(stepId) {
  const stepIndex = steps.findIndex((step) => step.id === stepId);
  if (stepIndex >= 0) {
    currentStepIndex = stepIndex;
    updateStepVisibility();
  }
}

function showStepContainingElement(element) {
  const stepIndex = steps.findIndex((step) => step.contains(element));
  if (stepIndex >= 0) {
    currentStepIndex = stepIndex;
    updateStepVisibility();
  }
}

function updateStepVisibility() {
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === currentStepIndex);
  });

  backButton.style.display = currentStepIndex === 0 ? "none" : "block";

  const currentStep = steps[currentStepIndex];
  const isSubmitStep = currentStep.id === "additionalFeedbackStep";

  nextButton.style.display = isSubmitStep ? "none" : "block";
  submitButton.style.display = isSubmitStep ? "block" : "none";

  statusMessage.textContent = "";
}

function validateCurrentStep() {
  const currentStep = steps[currentStepIndex];
  const requiredFields = Array.from(currentStep.querySelectorAll("[required]"));

  for (const field of requiredFields) {
    if (!field.value) {
      field.reportValidity();
      return false;
    }
  }

  if (currentStep.querySelector("#courseMatrix") && !matrixComplete("course", courseQuestions)) {
    showValidationMessage("Please answer all course feedback questions.");
    return false;
  }

  if (currentStep.querySelector("#instructorFeedbackContainer") && !instructorFeedbackComplete()) {
    showValidationMessage("Please complete all instructor feedback questions.");
    return false;
  }

  if (currentStep.id === "programFeedbackStep" && !matrixComplete("program", programQuestions)) {
    showValidationMessage("Please answer all program feedback questions.");
    return false;
  }

  if (currentStep.id === "serviceFeedbackStep") {
    const questions = serviceQuestionsByService[serviceSelect.value] || [];
    if (!matrixComplete("service", questions)) {
      showValidationMessage("Please answer all service feedback questions.");
      return false;
    }
  }

  return true;
}

function showValidationMessage(message) {
  statusMessage.textContent = message;
  statusMessage.style.color = "red";
}

function renderMatrix(container, groupName, questions) {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.className = "matrix-table-wrapper";

  const table = document.createElement("table");
  table.className = "matrix-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Question</th>
        ${ratingOptions.map((option) => `<th>${option}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${questions.map((question, questionIndex) => `
        <tr>
          <td>${question}</td>
          ${ratingOptions.map((option) => `
            <td>
              <input 
                type="radio" 
                name="${groupName}_question_${questionIndex}" 
                value="${option}" 
                aria-label="${question}: ${option}"
              />
            </td>
          `).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

function matrixComplete(groupName, questions) {
  return questions.every((_, questionIndex) => {
    return document.querySelector(`input[name="${groupName}_question_${questionIndex}"]:checked`);
  });
}

function getMatrixResponses(groupName) {
  const responses = {};

  document
    .querySelectorAll(`input[name^="${groupName}_question_"]:checked`)
    .forEach((input) => {
      responses[input.name] = input.value;
    });

  return responses;
}

function addInstructorFeedbackBlock() {
  instructorBlockCount++;

  const blockId = `instructor_${instructorBlockCount}`;
  const selectedProgram = programSelect.value;
  const selectedCourse = courseSelect.value;
  const instructorOptions =
    selectedProgram && selectedCourse && data[selectedProgram]?.[selectedCourse]
      ? data[selectedProgram][selectedCourse]
      : [];

  const card = document.createElement("div");
  card.className = "instructor-feedback-card";
  card.dataset.instructorBlockId = blockId;

  card.innerHTML = `
    <label>
      Instructor's Name
      <select class="instructor-select" required>
        <option value="">Select an instructor</option>
        ${instructorOptions.map((name) => `<option value="${name}">${name}</option>`).join("")}
      </select>
    </label>

    <div class="instructor-matrix" id="${blockId}_matrix"></div>

    <label>
      Additional instructor feedback
      <textarea class="instructor-additional-feedback" rows="4"></textarea>
    </label>

    ${
      instructorBlockCount > 1
        ? `<button type="button" class="remove-instructor-button">Remove This Instructor</button>`
        : ""
    }
  `;

  instructorFeedbackContainer.appendChild(card);
  renderMatrix(card.querySelector(".instructor-matrix"), blockId, instructorQuestions);

  const removeButton = card.querySelector(".remove-instructor-button");
  if (removeButton) {
    removeButton.addEventListener("click", () => {
      card.remove();
    });
  }
}

function clearInstructorFeedbackBlocks() {
  instructorFeedbackContainer.innerHTML = "";
  instructorBlockCount = 0;
}

function instructorFeedbackComplete() {
  const cards = Array.from(document.querySelectorAll(".instructor-feedback-card"));

  return cards.every((card) => {
    const blockId = card.dataset.instructorBlockId;
    const instructorSelect = card.querySelector(".instructor-select");

    if (!instructorSelect.value) {
      return false;
    }

    return instructorQuestions.every((_, questionIndex) => {
      return card.querySelector(`input[name="${blockId}_question_${questionIndex}"]:checked`);
    });
  });
}

function getInstructorResponses() {
  const cards = Array.from(document.querySelectorAll(".instructor-feedback-card"));

  return cards.map((card) => {
    const blockId = card.dataset.instructorBlockId;
    const ratings = {};

    card.querySelectorAll(`input[name^="${blockId}_question_"]:checked`).forEach((input) => {
      ratings[input.name.replace(`${blockId}_`, "")] = input.value;
    });

    return {
      instructorName: card.querySelector(".instructor-select").value,
      ratings,
      additionalFeedback: card.querySelector(".instructor-additional-feedback").value.trim()
    };
  });
}

function populateDropdown(selectElement, options) {
  options.forEach((optionText) => {
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

updateStepVisibility();