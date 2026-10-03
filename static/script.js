// ======================================================
// MediEase Pro - Advanced Health Suite
// Main JavaScript
// ======================================================


// ---------------- GLOBAL VARIABLES ----------------

let medicines = [];
let adherenceRecords = [];

let currentLanguage = "en";


// ---------------- TRANSLATIONS ----------------

const translations = {

    en: {
        dashboard: "Analytics Dashboard",
        scheduler: "Medication Scheduler",
        history: "Adherence Log History",
        emergency: "Emergency Center"
    },

    te: {
        dashboard: "విశ్లేషణ డాష్‌బోర్డ్",
        scheduler: "మందుల షెడ్యూలర్",
        history: "మందుల చరిత్ర",
        emergency: "అత్యవసర కేంద్రం"
    },

    hi: {
        dashboard: "एनालिटिक्स डैशबोर्ड",
        scheduler: "दवा शेड्यूलर",
        history: "दवा इतिहास",
        emergency: "आपातकालीन केंद्र"
    }

};


// ======================================================
// PAGE LOAD
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    setupNavigation();

    setupForm();

    setupSearch();

    setupButtons();

    updateDate();

    loadAllData();

    setupLanguage();

});


// ======================================================
// NAVIGATION
// ======================================================

function setupNavigation() {

    const buttons = document.querySelectorAll(".nav-btn");

    buttons.forEach(function (button) {

        button.addEventListener("click", function () {

            const section = button.dataset.section;

            showSection(section);

        });

    });

}


function showSection(sectionId) {

    const sections = document.querySelectorAll(".section");

    sections.forEach(function (section) {

        section.classList.remove("active");

    });


    const selectedSection = document.getElementById(sectionId);

    if (selectedSection) {

        selectedSection.classList.add("active");

    }


    const buttons = document.querySelectorAll(".nav-btn");

    buttons.forEach(function (button) {

        button.classList.remove("active");

        if (button.dataset.section === sectionId) {

            button.classList.add("active");

        }

    });


    const titles = {

        dashboard: "Analytics Dashboard",

        scheduler: "Medication Scheduler",

        history: "Adherence Log History",

        emergency: "Emergency Center"

    };


    document.getElementById("pageTitle").textContent =
        titles[sectionId] || "MediEase Pro";


    if (sectionId === "dashboard") {

        loadAllData();

    }


    if (sectionId === "history") {

        loadHistory();

    }

}


// ======================================================
// LOAD ALL DATA
// ======================================================

async function loadAllData() {

    await loadMedicines();

    await loadAnalytics();

    await loadHistory();

}


// ======================================================
// LOAD MEDICINES
// ======================================================

async function loadMedicines() {

    try {

        const response = await fetch("/api/medicines");

        if (!response.ok) {

            throw new Error("Unable to load medicines");

        }

        medicines = await response.json();

        renderMedicines();

        renderTodayMedicines();

    }

    catch (error) {

        console.error(error);

        showToast("Unable to load medicines.");

    }

}


// ======================================================
// RENDER MEDICINE TABLE
// ======================================================

function renderMedicines(searchText = "") {

    const container =
        document.getElementById("medicineTable");


    let filtered = medicines.filter(function (medicine) {

        return medicine.name
            .toLowerCase()
            .includes(searchText.toLowerCase());

    });


    if (filtered.length === 0) {

        container.innerHTML = `
            <div class="empty">
                No medicines found.
            </div>
        `;

        return;

    }


    let html = `
        <table>

            <thead>

                <tr>

                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Time</th>
                    <th>Frequency</th>
                    <th>Status</th>
                    <th>Actions</th>

                </tr>

            </thead>

            <tbody>
    `;


    filtered.forEach(function (medicine) {

        html += `

            <tr>

                <td>
                    <strong>${escapeHTML(medicine.name)}</strong>
                </td>

                <td>
                    ${escapeHTML(medicine.dosage)}
                </td>

                <td>
                    ${formatTime(medicine.time)}
                </td>

                <td>
                    ${escapeHTML(medicine.frequency)}
                </td>

                <td class="status-active">
                    ${medicine.status}
                </td>

                <td>

                    <div class="action-buttons">

                        <button
                            class="small-btn secondary-btn"
                            onclick="editMedicine(${medicine.id})">

                            Edit

                        </button>

                        <button
                            class="small-btn danger-btn"
                            onclick="deleteMedicine(${medicine.id})">

                            Delete

                        </button>

                    </div>

                </td>

            </tr>

        `;

    });


    html += `
            </tbody>
        </table>
    `;


    container.innerHTML = html;

}


// ======================================================
// TODAY MEDICINES
// ======================================================

function renderTodayMedicines() {

    const container =
        document.getElementById("todayMedicines");


    if (medicines.length === 0) {

        container.innerHTML = `
            <div class="empty">
                No medicines added yet.
            </div>
        `;

        return;

    }


    let html = "";


    medicines.forEach(function (medicine) {

        html += `

            <div class="medicine-item">

                <div class="medicine-info">

                    <h4>
                        💊 ${escapeHTML(medicine.name)}
                    </h4>

                    <p>
                        ${escapeHTML(medicine.dosage)}
                        •
                        ${formatTime(medicine.time)}
                        •
                        ${escapeHTML(medicine.frequency)}
                    </p>

                </div>


                <div class="medicine-actions">

                    <button
                        class="small-btn taken-btn"
                        onclick="recordAdherence(
                            ${medicine.id},
                            '${escapeJS(medicine.name)}',
                            'Taken'
                        )">

                        ✓ Taken

                    </button>


                    <button
                        class="small-btn missed-btn"
                        onclick="recordAdherence(
                            ${medicine.id},
                            '${escapeJS(medicine.name)}',
                            'Missed'
                        )">

                        ✕ Missed

                    </button>

                </div>

            </div>

        `;

    });


    container.innerHTML = html;

}


// ======================================================
// FORM SETUP
// ======================================================

function setupForm() {

    const form =
        document.getElementById("medicineForm");


    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const id =
            document.getElementById("medicineId").value;


        const medicineData = {

            name:
                document.getElementById("medicineName").value.trim(),

            dosage:
                document.getElementById("dosage").value.trim(),

            time:
                document.getElementById("medicineTime").value,

            frequency:
                document.getElementById("frequency").value,

            notes:
                document.getElementById("notes").value.trim()

        };


        try {

            let response;


            if (id) {

                response = await fetch(
                    `/api/medicines/${id}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(medicineData)
                    }
                );

            }

            else {

                response = await fetch(
                    "/api/medicines",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(medicineData)
                    }
                );

            }


            const result =
                await response.json();


            if (!response.ok) {

                throw new Error(result.message);

            }


            showToast(result.message);

            closeMedicineForm();

            await loadAllData();

        }

        catch (error) {

            console.error(error);

            showToast(
                error.message || "Something went wrong."
            );

        }

    });

}


// ======================================================
// BUTTON SETUP
// ======================================================

function setupButtons() {

    document
        .getElementById("openAddBtn")
        .addEventListener(
            "click",
            openMedicineForm
        );


    document
        .getElementById("cancelForm")
        .addEventListener(
            "click",
            closeMedicineForm
        );


    document
        .getElementById("refreshBtn")
        .addEventListener(
            "click",
            async function () {

                await loadAllData();

                showToast("Data refreshed.");

            }
        );


    document
        .getElementById("voiceBtn")
        .addEventListener(
            "click",
            function () {

                speakText(
                    getVoiceMessage()
                );

            }
        );


    document
        .getElementById("clearHistoryBtn")
        .addEventListener(
            "click",
            clearHistory
        );

}


// ======================================================
// OPEN FORM
// ======================================================

function openMedicineForm() {

    document
        .getElementById("medicineFormCard")
        .classList.remove("hidden");


    document
        .getElementById("formTitle")
        .textContent =
        "Add New Medicine";


    document
        .getElementById("medicineForm")
        .reset();


    document
        .getElementById("medicineId")
        .value = "";

}


// ======================================================
// CLOSE FORM
// ======================================================

function closeMedicineForm() {

    document
        .getElementById("medicineFormCard")
        .classList.add("hidden");

}


// ======================================================
// EDIT MEDICINE
// ======================================================

function editMedicine(id) {

    const medicine =
        medicines.find(function (item) {

            return item.id === id;

        });


    if (!medicine) {

        showToast("Medicine not found.");

        return;

    }


    showSection("scheduler");


    document
        .getElementById("medicineFormCard")
        .classList.remove("hidden");


    document
        .getElementById("formTitle")
        .textContent =
        "Edit Medicine";


    document
        .getElementById("medicineId")
        .value =
        medicine.id;


    document
        .getElementById("medicineName")
        .value =
        medicine.name;


    document
        .getElementById("dosage")
        .value =
        medicine.dosage;


    document
        .getElementById("medicineTime")
        .value =
        medicine.time;


    document
        .getElementById("frequency")
        .value =
        medicine.frequency;


    document
        .getElementById("notes")
        .value =
        medicine.notes || "";

}


// ======================================================
// DELETE MEDICINE
// ======================================================

async function deleteMedicine(id) {

    const medicine =
        medicines.find(
            item => item.id === id
        );


    if (!medicine) {

        return;

    }


    const confirmed =
        confirm(
            `Delete ${medicine.name}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/medicines/${id}`,
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(result.message);

        }


        showToast(result.message);

        await loadAllData();

    }

    catch (error) {

        console.error(error);

        showToast("Unable to delete medicine.");

    }

}


// ======================================================
// ADHERENCE
// ======================================================

async function recordAdherence(
    medicineId,
    medicineName,
    action
) {

    try {

        const response =
            await fetch(
                "/api/adherence",
                {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        medicine_id: medicineId,

                        medicine_name: medicineName,

                        action: action

                    })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(result.message);

        }


        showToast(
            `${medicineName}: ${action}`
        );


        await loadAllData();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Unable to record adherence."
        );

    }

}


// ======================================================
// ANALYTICS
// ======================================================

async function loadAnalytics() {

    try {

        const response =
            await fetch(
                "/api/analytics"
            );


        const data =
            await response.json();


        document
            .getElementById("totalMedicines")
            .textContent =
            data.total_medicines;


        document
            .getElementById("takenCount")
            .textContent =
            data.taken;


        document
            .getElementById("missedCount")
            .textContent =
            data.missed;


        document
            .getElementById("adherenceRate")
            .textContent =
            data.adherence_rate;


        document
            .getElementById("rateText")
            .textContent =
            data.adherence_rate + "%";


        document
            .getElementById("progressBar")
            .style.width =
            data.adherence_rate + "%";

    }

    catch (error) {

        console.error(error);

    }

}


// ======================================================
// HISTORY
// ======================================================

async function loadHistory() {

    try {

        const response =
            await fetch(
                "/api/adherence"
            );


        adherenceRecords =
            await response.json();


        renderHistory();

    }

    catch (error) {

        console.error(error);

        showToast("Unable to load history.");

    }

}


function renderHistory() {

    const container =
        document.getElementById(
            "historyTable"
        );


    if (adherenceRecords.length === 0) {

        container.innerHTML = `
            <div class="empty">
                No adherence records yet.
            </div>
        `;

        return;

    }


    let html = `

        <table>

            <thead>

                <tr>

                    <th>Medicine</th>
                    <th>Action</th>
                    <th>Date & Time</th>

                </tr>

            </thead>

            <tbody>

    `;


    adherenceRecords.forEach(function (record) {

        const actionClass =
            record.action === "Taken"
                ? "status-active"
                : "";


        html += `

            <tr>

                <td>
                    ${escapeHTML(record.medicine_name)}
                </td>

                <td class="${actionClass}">
                    ${record.action}
                </td>

                <td>
                    ${record.date_time}
                </td>

            </tr>

        `;

    });


    html += `

            </tbody>

        </table>

    `;


    container.innerHTML = html;

}


// ======================================================
// SEARCH
// ======================================================

function setupSearch() {

    const search =
        document.getElementById(
            "searchMedicine"
        );


    search.addEventListener(
        "input",
        function () {

            renderMedicines(
                search.value
            );

        }
    );

}


// ======================================================
// CLEAR HISTORY
// ======================================================

async function clearHistory() {

    if (adherenceRecords.length === 0) {

        showToast("History is already empty.");

        return;

    }


    const confirmed =
        confirm(
            "Clear all adherence history?"
        );


    if (!confirmed) {

        return;

    }


    // SQLite doesn't expose DELETE endpoint in this simple version.
    // We use a special endpoint below.

    try {

        const response =
            await fetch(
                "/api/adherence/clear",
                {
                    method: "DELETE"
                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(result.message);

        }


        showToast(result.message);

        await loadAllData();

    }

    catch (error) {

        console.error(error);

        showToast(
            "Unable to clear history."
        );

    }

}


// ======================================================
// DATE
// ======================================================

function updateDate() {

    const date =
        new Date();


    document
        .getElementById("currentDate")
        .textContent =
        date.toLocaleDateString(
            "en-IN",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

}


// ======================================================
// LANGUAGE
// ======================================================

function setupLanguage() {

    const select =
        document.getElementById(
            "languageSelect"
        );


    select.addEventListener(
        "change",
        function () {

            currentLanguage =
                select.value;


            applyLanguage();

        }
    );

}


function applyLanguage() {

    const items =
        document.querySelectorAll(
            "[data-i18n]"
        );


    items.forEach(function (item) {

        const key =
            item.dataset.i18n;


        if (
            translations[currentLanguage] &&
            translations[currentLanguage][key]
        ) {

            item.textContent =
                translations[currentLanguage][key];

        }

    });

}


// ======================================================
// VOICE
// ======================================================

function getVoiceMessage() {

    if (currentLanguage === "te") {

        return "మేడిఈజ్ ప్రోకు స్వాగతం. మీ మందులను సులభంగా నిర్వహించండి మరియు మీ మందుల వినియోగాన్ని ట్రాక్ చేయండి.";

    }


    if (currentLanguage === "hi") {

        return "मेडीईज़ प्रो में आपका स्वागत है। अपनी दवाओं को आसानी से प्रबंधित करें और अपनी दवा लेने की जानकारी ट्रैक करें।";

    }


    return "Welcome to MediEase Pro. Manage your medicines easily and track your medication adherence.";

}


function speakText(text) {

    if (!("speechSynthesis" in window)) {

        showToast(
            "Voice is not supported in this browser."
        );

        return;

    }


    window.speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    if (currentLanguage === "te") {

        speech.lang = "te-IN";

    }

    else if (currentLanguage === "hi") {

        speech.lang = "hi-IN";

    }

    else {

        speech.lang = "en-IN";

    }


    speech.rate = 0.9;

    speech.pitch = 1;


    window.speechSynthesis.speak(
        speech
    );

}


// ======================================================
// EMERGENCY
// ======================================================

function callNumber(number) {

    window.location.href =
        "tel:" + number;

}


function showHospitalMessage() {

    alert(
        "For emergency medical assistance, contact your local emergency service or a qualified healthcare professional."
    );

}


// ======================================================
// TOAST
// ======================================================

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    const text =
        document.getElementById(
            "toastMessage"
        );


    text.textContent =
        message;


    toast.classList.add("show");


    setTimeout(function () {

        toast.classList.remove(
            "show"
        );

    }, 2500);

}


// ======================================================
// SECURITY HELPERS
// ======================================================

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function escapeJS(value) {

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'");
}


// ======================================================
// TIME FORMAT
// ======================================================

function formatTime(time) {

    if (!time) {

        return "";

    }


    const parts =
        time.split(":");


    let hour =
        parseInt(parts[0]);


    const minute =
        parts[1];


    const period =
        hour >= 12 ? "PM" : "AM";


    hour =
        hour % 12;


    if (hour === 0) {

        hour = 12;

    }


    return `${hour}:${minute} ${period}`;

}