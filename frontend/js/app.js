// Expense Tracker - frontend logic

// PHASE 2
// Your backend from Phase 1 is already running, with real expenses in the
// database (from schema.sql). Build this page directly against it with
// fetch and async/await - there is no in-memory or localStorage stage
// this time, and no sample data file.
//
// A possible structure (change it if you have a better idea):
//   - async function getExpenses()          fetch(API_URL), return the JSON
//   - async function addExpense(data)       fetch(API_URL, { method: "POST", ... })
//   - async function updateExpense(id,data) fetch(API_URL + "/" + id, { method: "PUT", ... })
//   - async function deleteExpense(id)      fetch(API_URL + "/" + id, { method: "DELETE" })
//   - async function refresh()              get the list, then call renderTable and renderSummary
//   - renderTable(list)                     build the table rows from the array the API returned
//   - renderSummary(list)                   update the summary cards
//   - applyFilter()                         re-render with the list filtered by category
//
// Don't forget:
//   - Show a Bootstrap spinner while a request is in flight.
//   - Wrap every fetch call in try/catch, and show a Bootstrap alert on failure.
//   - After add, edit, or delete, call refresh() so the page always shows
//     what the server actually saved - never update the table by hand.
//   - The API is at http://localhost:3000/api/expenses (see the Roadmap).

const API_URL = "http://localhost:3000/api/expenses";

const CATEGORY_COLORS = {
  Food: "bg-success",
  Transport: "bg-primary",
  Bills: "bg-warning text-dark",
  Entertainment: "bg-info text-dark",
  Other: "bg-secondary",
};

const CATEGORIES = Object.keys(CATEGORY_COLORS);

// ===== Elements =====
const alertBox = document.getElementById("alert");
const spinner = document.getElementById("spinner");
const totalAmountEl = document.getElementById("total-amount");
const expenseCountEl = document.getElementById("expense-count");
const highestExpenseEl = document.getElementById("highest-expense");
const filterSelect = document.getElementById("filter");
const tableBody = document.getElementById("expenses-body");

// The last list the server sent us (never edited by hand)
let expenses = [];
//! ==============================================
// ===== Helpers =====
function showAlert(message){
  alertBox.textContent = message;
  alertBox.classList.remove("d-none");
}
//! ==============================================
function hideAlert() {
  alertBox.classList.add("d-none");
}
//! ==============================================
function setLoading(isLoading) {
  if (isLoading) {
    spinner.classList.remove("d-none");
  } else {
    spinner.classList.add("d-none");
  }
}
//! ==============================================
async function request(url, options = {}) {
  setLoading(true);
  try {
    let response;
    try {
      response = await fetch(url, options);
    } catch {
      throw new Error("Can't reach the server. Make sure the backend is running and try again.");
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      // The response has no JSON body, that's fine
    }

    if (!response.ok) {
      throw new Error(data?.message || `Request failed with status ${response.status}`);
    }
    return data;
  }
  finally {
    setLoading(false);
  }
}
//! ==============================================
// ===== Load (refresh) =====
async function loadExpenses() {
  try {
    expenses = await request(API_URL);
    hideAlert();
    render();
  } catch (error) {
    showAlert(error.message);
  }
}
//! ==============================================
// ===== Render =====
function render() {
  renderSummary();
  renderTable();
}
//! ==============================================
function renderSummary() {
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  totalAmountEl.textContent = total.toFixed(2);
  expenseCountEl.textContent = expenses.length;

  if (expenses.length === 0) {
    highestExpenseEl.textContent = "0.00";
    return;
  }

  const highest = expenses.reduce((max, expense) => (expense.amount > max.amount ? expense : max));
  highestExpenseEl.textContent = highest.amount.toFixed(2);

  const highestTitle = document.createElement("small");
  highestTitle.className = "d-block fs-6 fw-normal text-body-secondary";
  highestTitle.textContent = highest.title;
  highestExpenseEl.appendChild(highestTitle);
}
//! ==============================================
function renderTable() {
  const selected = filterSelect.value;
  const visible = selected === "all" ? expenses : expenses.filter((expense) => expense.category === selected);

  tableBody.innerHTML = "";

  if (visible.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "text-center text-body-secondary py-4";
    cell.textContent = "No expenses to show.";
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  visible.forEach((expense) => {
    const row = document.createElement("tr");

    const titleCell = document.createElement("td");
    titleCell.textContent = expense.title;

    const amountCell = document.createElement("td");
    amountCell.className = "text-end";
    amountCell.textContent = expense.amount.toFixed(2);

    const categoryCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${CATEGORY_COLORS[expense.category] || "bg-secondary"}`;
    badge.textContent = expense.category;
    categoryCell.appendChild(badge);

    const dateCell = document.createElement("td");
    dateCell.textContent = expense.date;

    const actionsCell = document.createElement("td");
    actionsCell.className = "text-end text-nowrap";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn btn-sm btn-outline-secondary me-1";
    editButton.textContent = "Edit";
    editButton.dataset.action = "edit";
    editButton.dataset.id = expense.id;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-sm btn-outline-danger";
    deleteButton.textContent = "Delete";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = expense.id;

    actionsCell.append(editButton, deleteButton);
    row.append(titleCell, amountCell, categoryCell, dateCell, actionsCell);
    tableBody.appendChild(row);
  });
}
//! ==============================================
// ===== Forms: read and validate =====
function readForm(fields) {
  return {
    title: fields.title.value.trim(),
    amount: fields.amount.value,
    category: fields.category.value,
    date: fields.date.value,
  };
}
//! ==============================================
function validate(data) {
  const errors = {};

  if (data.title === "") {
    errors.title = "Title is required.";
  } else if (data.title.length > 100) {
    errors.title = "Title must be 100 characters or less.";
  }

  const amount = Number(data.amount);
  if (data.amount === "") {
    errors.amount = "Amount is required.";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Amount must be a number greater than 0.";
  }

  if (!CATEGORIES.includes(data.category)) {
    errors.category = "Please choose a category.";
  }

  if (data.date === "") {
    errors.date = "Date is required.";
  }

  return errors;
}
//! ==============================================
function showErrors(fields, errors) {
  Object.entries(fields).forEach(([name, input]) => {
    const feedback = input.parentElement.querySelector(".invalid-feedback");
    if (errors[name]) {
      input.classList.add("is-invalid");
      feedback.textContent = errors[name];
    } else {
      input.classList.remove("is-invalid");
      feedback.textContent = "";
    }
  });
}
//! ==============================================
function toPayload(data) {
  return { ...data, amount: Number(data.amount) };
}
//! ==============================================
// ===== Add =====
const addForm = document.getElementById("add-form");
const addFields = {
  title: document.getElementById("title"),
  amount: document.getElementById("amount"),
  category: document.getElementById("category"),
  date: document.getElementById("date"),
};

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = readForm(addFields);
  const errors = validate(data);
  showErrors(addFields, errors);
  if (Object.keys(errors).length > 0) {
    return;
  }

  const submitButton = addForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(data)),
    });
    addForm.reset();
    await loadExpenses();
  } catch (error) {
    showAlert(error.message);
  } finally {
    submitButton.disabled = false;
  }
});
//! ==============================================
// ===== Delete =====
async function deleteExpense(id, button) {
  const expense = expenses.find((item) => item.id === id);
  const name = expense ? expense.title : "this expense";

  if (!confirm(`Delete "${name}"?`)) {
    return;
  }

  button.disabled = true;
  try {
    await request(`${API_URL}/${id}`, { method: "DELETE" });
    await loadExpenses();
  } catch (error) {
    showAlert(error.message);
    button.disabled = false;
  }
}
//! ==============================================
// ===== Edit =====
const editModal = new bootstrap.Modal(document.getElementById("edit-modal"));
const editForm = document.getElementById("edit-form");
const editAlert = document.getElementById("edit-alert");
const editFields = {
  title: document.getElementById("edit-title"),
  amount: document.getElementById("edit-amount"),
  category: document.getElementById("edit-category"),
  date: document.getElementById("edit-date"),
};

// Which expense the modal is editing
let editingId = null;

function openEditModal(id) {
  const expense = expenses.find((item) => item.id === id);
  if (!expense) {
    showAlert("Expense not found.");
    return;
  }

  editingId = id;
  editFields.title.value = expense.title;
  editFields.amount.value = expense.amount;
  editFields.category.value = expense.category;
  editFields.date.value = expense.date;

  showErrors(editFields, {});
  editAlert.classList.add("d-none");
  editModal.show();
}

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = readForm(editFields);
  const errors = validate(data);
  showErrors(editFields, errors);
  if (Object.keys(errors).length > 0) {
    return;
  }

  const saveButton = editForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  editAlert.classList.add("d-none");

  try {
    await request(`${API_URL}/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(data)),
    });
    editModal.hide();
    await loadExpenses();
  } catch (error) {
    editAlert.textContent = error.message;
    editAlert.classList.remove("d-none");
  } finally {
    saveButton.disabled = false;
  }
});

// ===== Table buttons (event delegation) =====
tableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const id = Number(button.dataset.id);

  if (button.dataset.action === "delete") {
    await deleteExpense(id, button);
  } else if (button.dataset.action === "edit") {
    openEditModal(id);
  }
});
//! ==============================================
// ===== Filter =====
filterSelect.addEventListener("change", renderTable);
//! ==============================================

// ===== Dark mode =====
const themeToggle = document.getElementById("theme-toggle");

themeToggle.addEventListener("click", () => {
  const html = document.documentElement;
  const isDark = html.getAttribute("data-bs-theme") === "dark";

  html.setAttribute("data-bs-theme", isDark ? "light" : "dark");
  themeToggle.textContent = isDark ? "Dark mode" : "Light mode";
});


//! ==============================================



// ===== Start =====
loadExpenses();