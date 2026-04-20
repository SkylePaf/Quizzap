const LOADER_MIN_DURATION_MS   = 800;
const LOADER_FRAME_INTERVAL_MS = 50;

const loaderStates = [
    ["","",""],[".",  "",""],["..","",""],["...","",""],
    ["...",".",""],[  "...","..",""],["...","...",""],
    ["...","...","."],[  "...","..",".."],[  "...","...","..."],
    ["..","...","..."],[  ".","...","..."],["","...","..."],
    ["","..","..."],[  "",".",  "..."],["","","..."],
    ["","",".."],["","","."],["","",""]
];

let running         = { value: true };
let seconds_passed  = false;
let pageLoaded      = false;
let loaderSections;
let notifTimeout;
let pendingDeleteId = null;

const notification   = document.getElementById("notification");
const confirmModal   = document.getElementById("confirm_modal");
const quizGrid       = document.getElementById("quiz_grid");
const emptyState     = document.getElementById("empty_state");
const quizCountBadge = document.getElementById("quiz_count_badge");
const dropZone       = document.getElementById("drop_zone");
const fileInput      = document.getElementById("file_input");

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function runLoader(state) {
    let i = 0;
    while (state.value) {
        const [s1, s2, s3] = loaderStates[i % loaderStates.length];
        loaderSections.l1.textContent = s1;
        loaderSections.l2.textContent = s2;
        loaderSections.l3.textContent = s3;
        i++;
        await sleep(LOADER_FRAME_INTERVAL_MS);
    }
}

function hideLoaderIfReady() {
    if (seconds_passed && pageLoaded) {
        running.value = false;
        const loader = document.getElementById("loader");
        loader.style.opacity       = "0";
        loader.style.pointerEvents = "none";
    }
}

function showNotification(message, type = "info") {
    notification.textContent     = message;
    notification.className       = `Notification ${type}`;
    notification.style.opacity   = "1";
    notification.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => {
        notification.style.opacity   = "0";
        notification.style.transform = "translateX(-50%) translateY(20px)";
    }, 2800);
}

function getQuizzes() {
    return JSON.parse(localStorage.getItem("quizzap_quizzes_imported") || "[]");
}

function saveQuizzes(quizzes) {
    localStorage.setItem("quizzap_quizzes_imported", JSON.stringify(quizzes));
}

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function importFiles(files) {
    let imported = 0;
    let errors   = 0;
    let pending  = files.length;

    Array.from(files).forEach(file => {
        if (!file.name.endsWith(".json")) {
            errors++;
            pending--;
            if (pending === 0) finish();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data     = JSON.parse(e.target.result);
                const quizzes  = getQuizzes();
                const now      = new Date().toISOString();
                const quizName = data.questions?.[0]?.text?.trim() || file.name.replace(".json", "");

                const quiz = {
                    id:         data.id || Date.now().toString() + Math.random().toString(36).slice(2),
                    name:       quizName,
                    createdAt:  data.createdAt || now,
                    modifiedAt: now,
                    questions:  data.questions || []
                };

                const existingIdx = quizzes.findIndex(q => q.id === quiz.id);
                if (existingIdx !== -1) {
                    quizzes[existingIdx] = quiz;
                } else {
                    quizzes.push(quiz);
                }

                saveQuizzes(quizzes);
                imported++;
            } catch {
                errors++;
            }

            pending--;
            if (pending === 0) finish();
        };
        reader.onerror = () => {
            errors++;
            pending--;
            if (pending === 0) finish();
        };
        reader.readAsText(file);
    });

    function finish() {
        renderQuizzes();
        if (imported > 0 && errors === 0) {
            showNotification(`${imported} quizz importé${imported > 1 ? "s" : ""}`, "success");
        } else if (imported > 0) {
            showNotification(`${imported} importé(s), ${errors} erreur(s)`, "info");
        } else {
            showNotification("Fichier(s) invalide(s)", "error");
        }
    }
}

function createCard(quiz, index) {
    const card       = document.createElement("div");
    card.className   = "QuizCard";
    card.dataset.id  = quiz.id;

    const count = quiz.questions?.length || 0;
    const date  = formatDate(quiz.modifiedAt || quiz.createdAt);

    card.innerHTML = `
        <div class="CardHeader">
            <p class="CardTitle">${quiz.name || "Quizz sans titre"}</p>
            <button class="CardDeleteBtn" title="Supprimer">✕</button>
        </div>
        <div class="CardBody">
            <p class="CardMeta"><span>${count}</span> question${count > 1 ? "s" : ""}</p>
            <p class="CardMeta">importé le <span>${date}</span></p>
        </div>
        <div class="CardFooter">
            <button class="CardAction edit">modifier</button>
            <button class="CardAction download">télécharger</button>
        </div>
    `;

    card.querySelector(".CardDeleteBtn").addEventListener("click", (e) => {
        e.stopPropagation();
        pendingDeleteId                  = quiz.id;
        confirmModal.style.opacity       = "1";
        confirmModal.style.pointerEvents = "all";
    });

    card.querySelector(".CardAction.edit").addEventListener("click", (e) => {
        e.stopPropagation();
        localStorage.setItem("quizzap_edit_quiz", JSON.stringify(quiz));
        localStorage.setItem("quizzap_edit_source", "imported");
        window.open("/src/scenes/QuizzCreator/QuizzCreator.html", "_self");
    });

    card.querySelector(".CardAction.download").addEventListener("click", (e) => {
        e.stopPropagation();
        const blob = new Blob([JSON.stringify(quiz, null, 2)], { type: "application/json" });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href     = url;
        link.download = `${quiz.name || "quizz"}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification("Téléchargement...", "success");
    });

    setTimeout(() => card.classList.add("visible"), 10 + index * 40);
    return card;
}

function renderQuizzes() {
    quizGrid.querySelectorAll(".QuizCard").forEach(c => c.remove());

    const quizzes = getQuizzes();
    quizCountBadge.textContent = `${quizzes.length} quizz`;

    if (quizzes.length === 0) {
        emptyState.style.display = "flex";
        return;
    }

    emptyState.style.display = "none";
    quizzes.forEach((quiz, i) => quizGrid.appendChild(createCard(quiz, i)));
}

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag_over");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag_over");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag_over");
    importFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        importFiles(fileInput.files);
        fileInput.value = "";
    }
});

document.getElementById("back_button").addEventListener("click", () => {
    window.open("../../index.html", "_self");
});

document.getElementById("confirm_yes").addEventListener("click", () => {
    if (!pendingDeleteId) return;
    saveQuizzes(getQuizzes().filter(q => q.id !== pendingDeleteId));
    pendingDeleteId                  = null;
    confirmModal.style.opacity       = "0";
    confirmModal.style.pointerEvents = "none";
    renderQuizzes();
    showNotification("Quizz supprimé", "error");
});

document.getElementById("confirm_no").addEventListener("click", () => {
    pendingDeleteId                  = null;
    confirmModal.style.opacity       = "0";
    confirmModal.style.pointerEvents = "none";
});

document.addEventListener("DOMContentLoaded", () => {
    loaderSections = {
        l1: document.getElementById("l1"),
        l2: document.getElementById("l2"),
        l3: document.getElementById("l3")
    };
    runLoader(running);
    sleep(LOADER_MIN_DURATION_MS).then(() => {
        seconds_passed = true;
        hideLoaderIfReady();
    });
});

window.addEventListener("load", () => {
    pageLoaded = true;
    hideLoaderIfReady();
    renderQuizzes();
});