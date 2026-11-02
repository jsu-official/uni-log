/* =========================================================
   GC LogBook - Shared JavaScript
   Data is saved in this browser using localStorage.
   ========================================================= */

const STORAGE_KEYS = {
    checkins: "gcLogBook_checkins",
    issues: "gcLogBook_issues"
};

const COMPUTER_UNITS = ["PC-01", "PC-02", "PC-03", "PC-04"];

function readData(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved : [];
    } catch (error) {
        console.error("Could not read saved data:", error);
        return [];
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function makeId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(dateValue) {
    return new Date(dateValue).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function setupNavigation() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".main-nav");

    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.textContent = isOpen ? "✕" : "☰";
    });
}

function setCommonPageDetails() {
    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    const date = document.getElementById("today-date");
    if (date) {
        date.textContent = new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    }
}

function setupCheckInForm() {
    const form = document.getElementById("checkinForm");
    if (!form) return;

    const timeInput = document.getElementById("time-in");
    const now = new Date();
    const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString().slice(11, 16);
    timeInput.value = localTime;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const name = document.getElementById("student-name").value.trim();
        const studentId = document.getElementById("student-id").value.trim();
        const pc = document.getElementById("assigned-pc").value;
        const time = timeInput.value;

        const checkins = readData(STORAGE_KEYS.checkins);
        const activeSession = checkins.find((entry) => entry.pc === pc && entry.status === "Active");

        if (activeSession) {
            showToast(`${pc} is already assigned to ${activeSession.name}.`);
            return;
        }

        const entry = {
            id: makeId(),
            name,
            studentId,
            pc,
            time,
            date: new Date().toISOString(),
            status: "Active"
        };

        checkins.unshift(entry);
        saveData(STORAGE_KEYS.checkins, checkins);
        showToast("Student check-in saved successfully.");
        window.setTimeout(() => window.location.href = "index.html", 700);
    });
}

function setupIssueForm() {
    const form = document.getElementById("issueForm");
    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const issue = {
            id: makeId(),
            pc: document.getElementById("unit-id").value,
            type: document.getElementById("issue-type").value,
            description: document.getElementById("description").value.trim(),
            date: new Date().toISOString(),
            status: "Open"
        };

        const issues = readData(STORAGE_KEYS.issues);
        issues.unshift(issue);
        saveData(STORAGE_KEYS.issues, issues);

        showToast("Issue report submitted successfully.");
        window.setTimeout(() => window.location.href = "index.html", 700);
    });
}

function createStatusPill(status) {
    const className = status === "Active" ? "status-active"
        : status === "Open" ? "status-open"
        : status === "Resolved" ? "status-resolved" : "status-closed";

    return `<span class="status-pill ${className}">${escapeText(status)}</span>`;
}

function renderDashboard() {
    const checkins = readData(STORAGE_KEYS.checkins);
    const issues = readData(STORAGE_KEYS.issues);
    const activeSessions = checkins.filter((entry) => entry.status === "Active");
    const openIssues = issues.filter((issue) => issue.status === "Open");
    const todayKey = new Date().toDateString();
    const todaysCheckins = checkins.filter((entry) => new Date(entry.date).toDateString() === todayKey);

    document.getElementById("stat-total").textContent = COMPUTER_UNITS.length;
    document.getElementById("stat-active").textContent = activeSessions.length;
    document.getElementById("stat-checkins").textContent = todaysCheckins.length;
    document.getElementById("stat-issues").textContent = openIssues.length;

    renderComputerGrid(activeSessions, openIssues);
    renderCheckinTable(checkins);
    renderIssueTable(issues);
    setupDashboardActions();
}

function renderComputerGrid(activeSessions, openIssues) {
    const grid = document.getElementById("pc-grid");
    if (!grid) return;

    grid.querySelectorAll("[data-pc]").forEach((card) => {
        const pc = card.dataset.pc;
        const active = activeSessions.find((entry) => entry.pc === pc);
        const issue = openIssues.find((entry) => entry.pc === pc);

        card.classList.remove("is-occupied", "has-issue");
        let status = "Available";

        if (issue) {
            card.classList.add("has-issue");
            status = "Needs attention";
        } else if (active) {
            card.classList.add("is-occupied");
            status = "In use";
        }

        card.querySelector("small").textContent = status;
        card.setAttribute("aria-label", `${pc}: ${status}`);
        card.onclick = () => {
            if (issue) {
                showToast(`${pc} has an open issue report.`);
            } else if (active) {
                showToast(`${pc} is currently used by ${active.name}.`);
            } else {
                showToast(`${pc} is available for check-in.`);
            }
        };
    });
}

function renderCheckinTable(checkins) {
    const body = document.getElementById("checkin-table-body");
    if (!body) return;

    if (checkins.length === 0) {
        body.innerHTML = '<tr><td colspan="5" class="empty-state">No check-ins recorded yet.</td></tr>';
        return;
    }

    body.innerHTML = checkins.slice(0, 7).map((entry) => `
        <tr>
            <td><strong>${escapeText(entry.name)}</strong><br><small>${escapeText(entry.studentId)}</small></td>
            <td>${escapeText(entry.pc)}</td>
            <td>${escapeText(entry.time)}</td>
            <td>${createStatusPill(entry.status)}</td>
            <td>${entry.status === "Active"
                ? `<button class="table-action" type="button" data-checkout="${escapeText(entry.id)}">Check out</button>`
                : '<span class="muted">—</span>'}</td>
        </tr>
    `).join("");

    body.querySelectorAll("[data-checkout]").forEach((button) => {
        button.addEventListener("click", () => checkOutStudent(button.dataset.checkout));
    });
}

function renderIssueTable(issues) {
    const body = document.getElementById("issues-table-body");
    if (!body) return;

    if (issues.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="empty-state">No issues reported. Everything looks good!</td></tr>';
        return;
    }

    body.innerHTML = issues.slice(0, 7).map((issue) => `
        <tr>
            <td><strong>${escapeText(issue.pc)}</strong></td>
            <td>${escapeText(issue.type)}</td>
            <td>${formatDate(issue.date)}</td>
            <td>${issue.status === "Open"
                ? `<button class="table-action" type="button" data-resolve="${escapeText(issue.id)}">Mark resolved</button>`
                : createStatusPill("Resolved")}</td>
        </tr>
    `).join("");

    body.querySelectorAll("[data-resolve]").forEach((button) => {
        button.addEventListener("click", () => resolveIssue(button.dataset.resolve));
    });
}

function checkOutStudent(id) {
    const checkins = readData(STORAGE_KEYS.checkins);
    const entry = checkins.find((item) => item.id === id);
    if (!entry) return;

    entry.status = "Checked out";
    entry.timeOut = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    saveData(STORAGE_KEYS.checkins, checkins);
    renderDashboard();
    showToast(`${entry.name} has been checked out.`);
}

function resolveIssue(id) {
    const issues = readData(STORAGE_KEYS.issues);
    const issue = issues.find((item) => item.id === id);
    if (!issue) return;

    issue.status = "Resolved";
    issue.resolvedAt = new Date().toISOString();
    saveData(STORAGE_KEYS.issues, issues);
    renderDashboard();
    showToast(`${issue.pc} issue marked as resolved.`);
}

function setupDashboardActions() {
    const clearButton = document.getElementById("clear-btn");
    const printButton = document.getElementById("print-btn");
    const exportButton = document.getElementById("export-btn");

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            const confirmed = window.confirm("Delete all check-in records and issue reports from this browser? This action cannot be undone.");
            if (!confirmed) return;

            localStorage.removeItem(STORAGE_KEYS.checkins);
            localStorage.removeItem(STORAGE_KEYS.issues);
            renderDashboard();
            showToast("All logbook data has been cleared.");
        });
    }

    if (printButton) printButton.addEventListener("click", () => window.print());
    if (exportButton) exportButton.addEventListener("click", exportLogbookCSV);
}

function exportLogbookCSV() {
    const checkins = readData(STORAGE_KEYS.checkins);
    const issues = readData(STORAGE_KEYS.issues);
    const rows = [
        ["RECORD TYPE", "DATE", "NAME / PC", "STUDENT ID / ISSUE", "TIME IN", "STATUS", "DETAILS"],
        ...checkins.map((entry) => [
            "Check-in", formatDate(entry.date), entry.name, entry.studentId,
            entry.time, entry.status, entry.timeOut ? `Time out: ${entry.timeOut}` : ""
        ]),
        ...issues.map((issue) => [
            "Issue", formatDate(issue.date), issue.pc, issue.type, "",
            issue.status, issue.description
        ])
    ];

    const csv = rows.map((row) => row.map((value) => {
        const safeValue = String(value ?? "").replace(/"/g, '""');
        return `"${safeValue}"`;
    }).join(",")).join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gc-logbook-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("CSV backup downloaded.");
}

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setCommonPageDetails();
    setupCheckInForm();
    setupIssueForm();

    if (document.body.dataset.page === "dashboard") {
        renderDashboard();
    }
});

function setupCheckInQRCode() {
    // 1. Only run if we are on the check-in page
    const pcSelect = document.getElementById('assigned-pc');
    if (!pcSelect) return;

    // 2. Read ?pc= from the browser URL
    const urlParams = new URLSearchParams(window.location.search);
    const scannedPC = urlParams.get('pc');

    if (!scannedPC) return;

    // 3. Match and auto-select the PC
    const targetPC = scannedPC.trim().toUpperCase();

    for (let i = 0; i < pcSelect.options.length; i++) {
        if (pcSelect.options[i].value.toUpperCase() === targetPC) {
            pcSelect.selectedIndex = i;
            
            // Visual lock indicating QR auto-fill
            pcSelect.style.backgroundColor = '#e9f6ee';
            pcSelect.style.borderColor = '#087a3d';
            pcSelect.style.fontWeight = 'bold';
            pcSelect.style.pointerEvents = 'none'; // Locks dropdown so user can't alter scanned PC
            break;
        }
    }
}

// Execute when the page loads
document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setCommonPageDetails();
    setupCheckInForm();
    setupIssueForm();

    // Check for QR code link on check-in page only
    setupCheckInQRCode();

    if (document.body.dataset.page === "dashboard") {
        renderDashboard();
    }
});
