const LOADER_MIN_DURATION_MS   = 1000;
const LOADER_FRAME_INTERVAL_MS = 50;
const ANIMATION_DELAY_MS       = 10;
const TRANSITION_DURATION_MS   = 300;
const MAX_ANSWERS              = 6;

const TYPE_MULTIPLE  = "multiple";
const TYPE_VRAI_FAUX = "vrai/faux";
const TYPE_OUVERTE   = "ouverte";
const SETTINGS_TYPES = [TYPE_MULTIPLE, TYPE_VRAI_FAUX, TYPE_OUVERTE];

let running              = { value: true };
let seconds_passed       = false;
let pageLoaded           = false;
let loader_sections;
let questionCount;
let currentQuestionIndex = 0;
let notificationTimeout;
let currentEditingId     = null;

const settings_button_status = [false, false, false];
const questionsData          = [];

const loaderStates = [
    ["", "", ""],
    [".", "", ""],
    ["..", "", ""],
    ["...", "", ""],
    ["...", ".", ""],
    ["...", "..", ""],
    ["...", "...", ""],
    ["...", "...", "."],
    ["...", "...", ".."],
    ["...", "...", "..."],
    ["..", "...", "..."],
    [".", "...", "..."],
    ["", "...", "..."],
    ["", "..", "..."],
    ["", ".", "..."],
    ["", "", "..."],
    ["", "", ".."],
    ["", "", "."],
    ["", "", ""]
];

const questionsViewer = document.querySelector("#work_interface #questions_viewer");
const leftColumn      = document.querySelector("#answer_place #left_column");
const rightColumn     = document.querySelector("#answer_place #right_column");
const addObject       = questionsViewer.querySelector(".AddObject");
const questionInput   = document.querySelector(".QuestionInput");
const toolbarTitle    = document.querySelector("#current_question_toolbar p");
const answerPlace     = document.getElementById("answer_place");
const addAnswerButton = document.getElementById("add_answer");
const notification    = document.getElementById("notification");
const confirmModal    = document.getElementById("confirm_modal");


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadQuizzCreator(state) {
    let i = 0;
    while (state.value) {
        const [s1, s2, s3] = loaderStates[i % loaderStates.length];
        loader_sections.l1.textContent = s1;
        loader_sections.l2.textContent = s2;
        loader_sections.l3.textContent = s3;
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

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        notification.style.opacity   = "0";
        notification.style.transform = "translateX(-50%) translateY(20px)";
    }, 2800);
}


function createQuestionData() {
    return { text: "", type: TYPE_MULTIPLE, answers: [], expectedAnswer: "" };
}

function getAllAnswerOptions() {
    return [
        ...Array.from(leftColumn.querySelectorAll(".AnswerOption")),
        ...Array.from(rightColumn.querySelectorAll(".AnswerOption"))
    ];
}

function getCurrentType() {
    const index = settings_button_status.findIndex(s => s);
    return index === -1 ? TYPE_MULTIPLE : SETTINGS_TYPES[index];
}

function saveCurrentQuestion() {
    const q = questionsData[currentQuestionIndex];
    if (!q) return;

    q.text = questionInput.value;
    q.type = getCurrentType();
    q.answers = getAllAnswerOptions().map(option => ({
        text:      option.querySelector(".AnswerInput")?.value || "",
        isCorrect: option.classList.contains("correct")
    }));

    const openInput = document.getElementById("open_answer_input");
    if (openInput) q.expectedAnswer = openInput.value;
}

function loadQuestion(index) {
    const q = questionsData[index];
    if (!q) return;

    questionInput.value = q.text;
    toolbarTitle.textContent = `Question N°${index + 1}`;

    SETTINGS_TYPES.forEach((type, i) => {
        settings_button_status[i] = (type === q.type);
        document.getElementById(String(i)).classList.toggle("active", settings_button_status[i]);
    });

    leftColumn.innerHTML  = "";
    rightColumn.innerHTML = "";

    applyTypeUI(q.type, q.answers, q.expectedAnswer || "");
}

function switchToQuestion(index) {
    saveCurrentQuestion();
    currentQuestionIndex = index;

    questionsViewer.querySelectorAll(".QuestionMini").forEach((m, i) => {
        m.classList.toggle("current", i === index);
    });

    loadQuestion(index);
}


function animateAnswerIn(option) {
    option.style.position  = "relative";
    option.style.flex      = "1";
    option.style.minHeight = "0";
    option.style.overflow  = "hidden";
    option.style.opacity   = "1";
}

function createAnswerOption(answerNumber, text = "", isCorrect = false, deletable = true, readonly = false) {
    const section  = document.createElement("section");
    const textarea = document.createElement("textarea");
    const p        = document.createElement("p");

    section.className    = "AnswerOption";
    section.id           = `Answer${answerNumber}`;
    p.textContent        = answerNumber;
    textarea.className   = "AnswerInput";
    textarea.maxLength   = 20;
    textarea.placeholder = "Ecrire une réponse...";
    textarea.value       = text;
    textarea.readOnly    = readonly;

    if (readonly) textarea.classList.add("readonly");
    if (isCorrect) section.classList.add("correct");

    section.appendChild(textarea);
    section.appendChild(p);

    if (deletable) {
        const button       = document.createElement("button");
        button.className   = "ExitButton";
        button.textContent = "-";
        section.appendChild(button);
    }

    section.style.position  = "unset";
    section.style.flex      = "unset";
    section.style.minHeight = "0";
    section.style.overflow  = "unset";
    section.style.opacity   = "0";
    section.style.height    = "0";

    return section;
}

function applyTypeUI(type, savedAnswers = [], savedExpectedAnswer = "") {
    answerPlace.style.display  = "";
    leftColumn.style.display   = "";
    rightColumn.style.display  = "";

    const existingWrapper = document.getElementById("open_answer_wrapper");
    if (existingWrapper) existingWrapper.remove();

    if (type === TYPE_OUVERTE) {
        addAnswerButton.disabled = true;
        addAnswerButton.classList.add("disabled");
        leftColumn.style.display  = "none";
        rightColumn.style.display = "none";

        const wrapper = document.createElement("div");
        wrapper.className = "OpenAnswerWrapper";
        wrapper.id        = "open_answer_wrapper";

        const label = document.createElement("p");
        label.textContent = "Réponse attendue";

        const input = document.createElement("input");
        input.type        = "text";
        input.id          = "open_answer_input";
        input.className   = "OpenAnswerInput";
        input.maxLength   = 20;
        input.placeholder = "Un seul mot...";
        input.value       = savedExpectedAnswer;

        input.addEventListener("input", () => {
            input.value = input.value.replace(/\s+/g, "");
        });

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        answerPlace.appendChild(wrapper);
        return;
    }

    if (type === TYPE_VRAI_FAUX) {
        addAnswerButton.disabled = true;
        addAnswerButton.classList.add("disabled");

        const vraiData = savedAnswers[0] || { text: "Vrai", isCorrect: false };
        const fauxData = savedAnswers[1] || { text: "Faux", isCorrect: false };

        const vraiOption = createAnswerOption(1, vraiData.text, vraiData.isCorrect, false, true);
        const fauxOption = createAnswerOption(2, fauxData.text, fauxData.isCorrect, false, true);

        leftColumn.appendChild(vraiOption);
        rightColumn.appendChild(fauxOption);

        setTimeout(() => {
            animateAnswerIn(vraiOption);
            animateAnswerIn(fauxOption);
        }, ANIMATION_DELAY_MS);
        return;
    }

    addAnswerButton.disabled = false;
    addAnswerButton.classList.remove("disabled");

    savedAnswers.forEach((answer, i) => {
        const option       = createAnswerOption(i + 1, answer.text, answer.isCorrect, true, false);
        const targetColumn = (i + 1) % 2 === 1 ? leftColumn : rightColumn;
        targetColumn.appendChild(option);
        setTimeout(() => animateAnswerIn(option), ANIMATION_DELAY_MS);
    });
}

function setQuestionType(type) {
    saveCurrentQuestion();
    const q = questionsData[currentQuestionIndex];
    if (!q) return;
    q.type = type;

    leftColumn.innerHTML  = "";
    rightColumn.innerHTML = "";

    applyTypeUI(type, q.answers, q.expectedAnswer || "");
}

function deleteAnswer(answerOption) {
    answerOption.style.opacity   = "0";
    answerOption.style.flex      = "unset";
    answerOption.style.minHeight = "0";
    answerOption.style.overflow  = "hidden";

    setTimeout(() => {
        answerOption.remove();
        const allOptions = getAllAnswerOptions();
        allOptions.forEach((opt, i) => {
            opt.id               = `Answer${i + 1}`;
            const p              = opt.querySelector("p");
            if (p) p.textContent = i + 1;
        });
    }, TRANSITION_DURATION_MS);
}

function setupAnswerDeletion() {
    [leftColumn, rightColumn].forEach(column => {
        column.addEventListener("click", (event) => {
            const button = event.target.closest(".ExitButton");
            if (!button) return;

            const answerOption = button.closest(".AnswerOption");
            if (!answerOption) return;

            button.classList.add("active");
            deleteAnswer(answerOption);
        });
    });
}

function setupCorrectAnswerToggle() {
    [leftColumn, rightColumn].forEach(column => {
        column.addEventListener("click", (event) => {
            if (event.target.closest(".ExitButton")) return;
            if (event.target.tagName === "TEXTAREA") return;

            const answerOption = event.target.closest(".AnswerOption");
            if (!answerOption) return;

            answerOption.classList.toggle("correct");
        });
    });
}


function createMiniQuestion(questionNumber) {
    const div     = document.createElement("div");
    const section = document.createElement("section");
    const button  = document.createElement("button");
    const title   = document.createElement("p");

    div.className      = "QuestionMini";
    section.className  = "MiniQuestionHeader";
    button.className   = "ExitButton";
    button.textContent = "X";
    title.className    = "QuestionTitle";
    title.textContent  = `Question N°${questionNumber}`;

    section.appendChild(button);
    section.appendChild(title);
    div.appendChild(section);

    div.style.opacity   = "0";
    div.style.height    = "0";
    div.style.transform = "translateX(-80%) translateY(50%)";

    return div;
}

function deleteQuestion(questionMini) {
    const minis        = Array.from(questionsViewer.querySelectorAll(".QuestionMini"));
    const deletedIndex = minis.indexOf(questionMini);

    questionMini.style.opacity   = "0";
    questionMini.style.margin    = "0";
    questionMini.style.padding   = "0";
    questionMini.style.zIndex    = "-1";
    questionMini.style.height    = "0";
    questionMini.style.transform = "translateX(80%) translateY(-50%)";

    setTimeout(() => {
        questionMini.remove();
        questionsData.splice(deletedIndex, 1);

        if (currentQuestionIndex >= questionsData.length) {
            currentQuestionIndex = questionsData.length - 1;
        }

        updateQuestionNumbers();
        loadQuestion(currentQuestionIndex);
    }, TRANSITION_DURATION_MS);
}

function updateQuestionNumbers() {
    const questionMinis = questionsViewer.querySelectorAll(".QuestionMini");
    questionMinis.forEach((qm, index) => {
        const titleElement  = qm.querySelector(".QuestionTitle");
        const expectedLabel = `Question N°${index + 1}`;
        qm.classList.toggle("current", index === currentQuestionIndex);
        if (titleElement && titleElement.textContent !== expectedLabel) {
            titleElement.style.opacity = "0";
            setTimeout(() => {
                titleElement.textContent   = expectedLabel;
                titleElement.style.opacity = "1";
            }, TRANSITION_DURATION_MS);
        }
    });
    questionCount = questionMinis.length + 1;
}

function setupQuestionDeletion() {
    questionsViewer.addEventListener("click", (event) => {
        const exitButton = event.target.closest(".ExitButton");

        if (exitButton) {
            const questionMini = exitButton.closest(".QuestionMini");
            if (!questionMini) return;

            if (questionsData.length <= 1) {
                showNotification("Il faut au moins une question !", "error");
                return;
            }

            exitButton.classList.add("active");
            deleteQuestion(questionMini);
            return;
        }

        const mini = event.target.closest(".QuestionMini");
        if (!mini) return;

        const minis = Array.from(questionsViewer.querySelectorAll(".QuestionMini"));
        const index = minis.indexOf(mini);
        if (index !== -1 && index !== currentQuestionIndex) {
            switchToQuestion(index);
        }
    });
}


document.querySelector(".SmallSettings").addEventListener("click", (event) => {
    const currentSettingsButton = event.target.closest(".SettingsButton");
    if (!currentSettingsButton) return;

    const buttonId = Number(currentSettingsButton.id);
    if (settings_button_status[buttonId]) return;

    settings_button_status.forEach((_, i) => {
        settings_button_status[i] = (i === buttonId);
        document.getElementById(String(i)).classList.toggle("active", i === buttonId);
    });

    setQuestionType(SETTINGS_TYPES[buttonId]);
});

document.getElementById("add_answer").addEventListener("click", () => {
    if (addAnswerButton.disabled) return;

    const totalAnswers = getAllAnswerOptions().length;
    if (totalAnswers >= MAX_ANSWERS) return;

    const nextNumber   = totalAnswers + 1;
    const newAnswer    = createAnswerOption(nextNumber, "", false, true, false);
    const targetColumn = nextNumber % 2 === 1 ? leftColumn : rightColumn;
    targetColumn.appendChild(newAnswer);

    setTimeout(() => animateAnswerIn(newAnswer), ANIMATION_DELAY_MS);
});

document.getElementById("add_question").addEventListener("click", () => {
    saveCurrentQuestion();

    const nextNumber  = questionsViewer.querySelectorAll(".QuestionMini").length + 1;
    const newQuestion = createMiniQuestion(nextNumber);
    questionsData.push(createQuestionData());
    questionsViewer.insertBefore(newQuestion, addObject);
    questionCount = nextNumber + 1;

    const newIndex = questionsData.length - 1;
    setTimeout(() => {
        newQuestion.style.height    = "15%";
        newQuestion.style.opacity   = "1";
        newQuestion.style.transform = "";
        switchToQuestion(newIndex);
    }, ANIMATION_DELAY_MS);
});

document.getElementById("save_quizz").addEventListener("click", () => {
    saveCurrentQuestion();

    const emptyQuestions = questionsData.filter(q => q.text.trim() === "");
    if (emptyQuestions.length > 0) {
        showNotification(`${emptyQuestions.length} question(s) sans texte !`, "error");
        return;
    }

    const noCorrectAnswer = questionsData.filter(q =>
        q.type === TYPE_MULTIPLE &&
        (q.answers.length === 0 || !q.answers.some(a => a.isCorrect))
    );
    if (noCorrectAnswer.length > 0) {
        showNotification(`${noCorrectAnswer.length} question(s) sans bonne réponse cochée !`, "error");
        return;
    }

    const now        = new Date().toISOString();
    const quizName   = questionsData[0]?.text?.trim() || "Quizz sans titre";
    const storeKey   = (localStorage.getItem("quizzap_edit_source") === "imported") ? "quizzap_quizzes_imported" : "quizzap_quizzes_created";
    const quizzes    = JSON.parse(localStorage.getItem(storeKey) || "[]");

    if (currentEditingId) {
        const idx = quizzes.findIndex(q => q.id === currentEditingId);
        if (idx !== -1) {
            quizzes[idx] = { ...quizzes[idx], name: quizName, modifiedAt: now, questions: questionsData };
        } else {
            quizzes.push({ id: currentEditingId, name: quizName, createdAt: now, modifiedAt: now, questions: questionsData });
        }
    } else {
        currentEditingId = Date.now().toString();
        quizzes.push({ id: currentEditingId, name: quizName, createdAt: now, modifiedAt: now, questions: questionsData });
    }

    localStorage.setItem(storeKey, JSON.stringify(quizzes));
    localStorage.removeItem("quizzap_edit_source");

    const quizzExport = {
        id:        currentEditingId,
        createdAt: now,
        questions: questionsData
    };

    const blob = new Blob([JSON.stringify(quizzExport, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = "quizz.json";
    link.click();
    URL.revokeObjectURL(url);

    showNotification("Enregistrement du quizz...", "success");
});

document.getElementById("abort_quizz").addEventListener("click", () => {
    confirmModal.style.opacity       = "1";
    confirmModal.style.pointerEvents = "all";
});

document.getElementById("confirm_yes").addEventListener("click", () => {
    window.open('/src/index.html', '_self');
});

document.getElementById("confirm_no").addEventListener("click", () => {
    confirmModal.style.opacity       = "0";
    confirmModal.style.pointerEvents = "none";
});


document.addEventListener("DOMContentLoaded", () => {
    loader_sections = {
        l1: document.getElementById("l1"),
        l2: document.getElementById("l2"),
        l3: document.getElementById("l3")
    };
    loadQuizzCreator(running);

    sleep(LOADER_MIN_DURATION_MS).then(() => {
        seconds_passed = true;
        hideLoaderIfReady();
    });
});

window.addEventListener("load", () => {
    pageLoaded = true;
    hideLoaderIfReady();

    const editData = localStorage.getItem("quizzap_edit_quiz");

    if (editData) {
        localStorage.removeItem("quizzap_edit_quiz");
        const editQuiz = JSON.parse(editData);
        currentEditingId = editQuiz.id;

        questionsViewer.querySelectorAll(".QuestionMini").forEach(m => m.remove());
        questionsData.length = 0;

        editQuiz.questions.forEach((q, i) => {
            questionsData.push(q);
            const mini = createMiniQuestion(i + 1);
            questionsViewer.insertBefore(mini, addObject);
            setTimeout(() => {
                mini.style.height    = "15%";
                mini.style.opacity   = "1";
                mini.style.transform = "";
            }, ANIMATION_DELAY_MS + i * 30);
        });

        currentQuestionIndex = 0;
        questionCount        = editQuiz.questions.length + 1;

        setTimeout(() => {
            const firstMini = questionsViewer.querySelector(".QuestionMini");
            if (firstMini) firstMini.classList.add("current");
            loadQuestion(0);
        }, ANIMATION_DELAY_MS + editQuiz.questions.length * 30 + 50);

    } else {
        questionsData.push(createQuestionData());
        questionCount = questionsViewer.querySelectorAll(".QuestionMini").length + 1;

        const firstMini = questionsViewer.querySelector(".QuestionMini");
        if (firstMini) firstMini.classList.add("current");

        settings_button_status[0] = true;
        document.getElementById("0").classList.add("active");
    }

    setupQuestionDeletion();
    setupAnswerDeletion();
    setupCorrectAnswerToggle();
});