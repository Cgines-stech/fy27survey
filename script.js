
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

const ratingOptions = ["Excellent", "Good", "Fair", "Poor", "Not Applicable"];

const courseQuestions = [
  "You understand what you are expected to learn",
  "The books, links, and resources are easy to access",
  "The work helps you practice the skills taught",
  "The tests accurately reflect what is covered in class",
  "The amount of homework and in-class work is manageable"
];

const instructorQuestions = [
  "Preparedness",
  "Organization",
  "Responsiveness",
  "Engagement"
];

const programQuestions = [
  "Looking back, rate your total experience",
  "The program delivered what was promised",
  "There was a good mix of lecture, hands-on, and digital work",
  "The tools and machines were in good working order",
  "Rate the physical lab environment"
];

const serviceQuestionsByService = {
  "Student Services": [
    "The enrollment process was intuitive and met my expectations:",
    "I was helped through the enrollment process with appropriate assistance:",
    "Staff members are well-trained about the College and able to assist me:",
    "Staff members are helpful and courteous:",
    "Front desk staff assisted me promptly and routed me appropriately:",
    "The wait time for service was reasonable:",
    "My Academic Counselor helped me set and meet realistic goals:",
    "Hours of operation met my needs:"
  ],
  "Financial Aid Services": [
    "Staff members are courteous:",
    "Staff members are knowledgeable and are able to answer my questions:",
    "Information about financial aid resources is complete, helpful, and easy to find:",
    "Hours of operation met my needs:",
    "Problems or questions about financial aid are handled in an efficient, professional manner:"
  ],
  "Services for Students with Disabilities": [
    "The process for requesting an accommodation was clear to me:",
    "Staff members are courteous:",
    "Staff members are knowledgeable and are able to answer my questions:",
    "Requirements and performance expectations are clear to me:",
    "I have access to resources defined in my Accommodations Letter:"
  ],
  "Technology and Campus IT": [
    "Computers are available and accessible to complete required course work:",
    "Problems with computers are resolved quickly:",
    "Training provided to use the technology required for this course was provided:",
    "Ability to access and use online resources for this course:",
    "Responsiveness and quality of support for online instruction:"
  ],
  "Facilities and Safety": [
    "Campus facilities are maintained:",
    "Campus facilities are clean:",
    "The College maintains a safe environment:",
    "The Health & Safety Plan is available for review and safety is enforced on campus:",
    "Parking is adequate:"
  ],
  "Veteran Services": [
    "Staff members are courteous and knowledgeable about the needs of veterans:",
    "Staff members are knowledgeable about the educational benefits available to veterans:",
    "The school offers resources needed to support my success:",
    "School resources improved my performance and success at the College:",
    "Hours of operation met my needs:"
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

  const servicePositiveFeedback = document.getElementById("servicePositiveFeedback");
  const serviceImprovementFeedback = document.getElementById("serviceImprovementFeedback");

  const requiresServiceFeedback =
    selectedService &&
    selectedService !== "Complete Survey";

  servicePositiveFeedback.required = requiresServiceFeedback;
  serviceImprovementFeedback.required = requiresServiceFeedback;

if (requiresServiceFeedback) {
  serviceFeedbackTitle.textContent = `${selectedService} Feedback`;

  renderMatrix(
    serviceMatrix,
    "service",
    serviceQuestionsByService[selectedService] || []
  );
} else {
  serviceMatrix.innerHTML = "";
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
      courseRatings: getMatrixResponses("course", courseQuestions)
    });

    const instructorResponses = getInstructorResponses();

    for (const instructorResponse of instructorResponses) {
      await addDoc(collection(db, "instructorResponses"), {
        ...baseData,
        linkedCourseResponseId: courseDocRef.id,
        instructorName: instructorResponse.instructorName,
        instructorEmail: instructorEmails[instructorResponse.instructorName] || "missing-instructor-email",
        instructorRatings: instructorResponse.ratings,
        instructorAdditionalFeedback: instructorResponse.additionalFeedback,
        createdAt: serverTimestamp()
      });
    }

    if (isLastCourseSelect.value === "Yes") {
      await addDoc(collection(db, "programCompletionResponses"), {
        ...baseData,
        linkedCourseResponseId: courseDocRef.id,
        programRatings: getMatrixResponses("program", programQuestions),
        programPositiveFeedback: document.getElementById("programPositiveFeedback").value.trim(),
        programImprovementFeedback: document.getElementById("programImprovementFeedback").value.trim(),
        createdAt: serverTimestamp()
      });

      if (
        serviceSelect.value &&
        serviceSelect.value !== "Complete Survey"
      ) {
        await addDoc(collection(db, "serviceResponses"), {
          ...baseData,
          linkedCourseResponseId: courseDocRef.id,
          service: serviceSelect.value,
          serviceRatings: getMatrixResponses(
            "service",
            serviceQuestionsByService[serviceSelect.value] || []
          ),
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
    if (serviceSelect.value === "Complete Survey") {
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
      serviceSelect.value !== "Complete Survey"
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

function getMatrixResponses(groupName, questions) {
  const responses = {};

  questions.forEach((question, questionIndex) => {
    const selected = document.querySelector(
      `input[name="${groupName}_question_${questionIndex}"]:checked`
    );

    responses[question] = selected ? selected.value : "";
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

    instructorQuestions.forEach((question, questionIndex) => {
      const selected = card.querySelector(
        `input[name="${blockId}_question_${questionIndex}"]:checked`
      );

      ratings[question] = selected ? selected.value : "";
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