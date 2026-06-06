const LOADER_MIN_DURATION_MS   = 800;
const LOADER_FRAME_INTERVAL_MS = 50;
const TIME_PER_QUESTION_MS     = 60000;
const FEEDBACK_DURATION_MS     = 1200;
const TIMER_TICK_MS            = 100;

const TYPE_MULTIPLE  = "multiple";
const TYPE_VRAI_FAUX = "vrai/faux";
const TYPE_OUVERTE   = "ouverte";

const STORAGE_KEY_PLAY = "quizzap_play_quiz";

const loaderStates = [
    ["","",""],[".",  "",""],["..","",""],["...","",""],
    ["...",".",""],[  "...","..",""],["...","...",""],
    ["...","...","."],[  "...","..",".."],[  "...","...","..."],
    ["..",  "...","..."],[  ".","...","..."],["","...","..."],
    ["","..", "..."],[  "",".",  "..."],["","","..."],
    ["","",".."],["","","."],["","",""]
];

let running        = { value: true };
let seconds_passed = false;
let pageLoaded     = false;
let loaderSections;

let quiz           = null;
let currentIndex   = 0;
let playerAnswers  = [];
let timerInterval  = null;
let timerElapsed   = 0;
let questionLocked = false;
let selectedSet    = new Set();

const notification     = document.getElementById("notification");
const quizTitleDisplay = document.getElementById("quiz_title_display");
const progressBadge    = document.getElementById("progress_badge");
const timerBar         = document.getElementById("timer_bar");
const timerText        = document.getElementById("timer_text");
const questionText     = document.getElementById("question_text");
const answersArea      = document.getElementById("answers_area");
const resultsOverlay   = document.getElementById("results_overlay");
const resultsScore     = document.getElementById("results_score");
const resultsLabel     = document.getElementById("results_label");
const resultsBreakdown = document.getElementById("results_breakdown");


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
    setTimeout(() => {
        notification.style.opacity   = "0";
        notification.style.transform = "translateX(-50%) translateY(20px)";
    }, 2800);
}


function startTimer() {
    timerElapsed = 0;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timerElapsed += TIMER_TICK_MS;
        updateTimerDisplay();

        if (timerElapsed >= TIME_PER_QUESTION_MS) {
            clearInterval(timerInterval);
            handleTimeout();
        }
    }, TIMER_TICK_MS);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateTimerDisplay() {
    const remaining   = Math.max(0, TIME_PER_QUESTION_MS - timerElapsed);
    const fraction    = remaining / TIME_PER_QUESTION_MS;
    const secondsLeft = Math.ceil(remaining / 1000);

    timerBar.style.width  = `${fraction * 100}%`;
    timerText.textContent = secondsLeft;

    if (fraction > 0.5) {
        timerBar.style.backgroundColor = "#00bb44";
    } else if (fraction > 0.25) {
        timerBar.style.backgroundColor = "#ddaa00";
    } else {
        timerBar.style.backgroundColor = "#cc0000";
    }
}

function handleTimeout() {
    if (questionLocked) return;
    questionLocked = true;

    playerAnswers[currentIndex] = { answered: false, correct: false, givenAnswer: null };
    showFeedback(null);
}


function isAnswerCorrectSingle(question, givenAnswer) {
    if (question.type === TYPE_OUVERTE) {
        return givenAnswer.trim().toLowerCase() === question.expectedAnswer.trim().toLowerCase();
    }
    const correctAnswers = question.answers
        .filter(a => a.isCorrect)
        .map(a => a.text.trim().toLowerCase());
    return correctAnswers.includes(givenAnswer.trim().toLowerCase());
}

function isAnswerCorrectMulti(question, selectedValues) {
    const correctSet  = new Set(question.answers.filter(a => a.isCorrect).map(a => a.text.trim().toLowerCase()));
    const selectedNorm = new Set([...selectedValues].map(v => v.trim().toLowerCase()));
    if (correctSet.size !== selectedNorm.size) return false;
    for (const v of correctSet) {
        if (!selectedNorm.has(v)) return false;
    }
    return true;
}

function handleAnswer(givenAnswer) {
    if (questionLocked) return;
    questionLocked = true;
    stopTimer();

    const question = quiz.questions[currentIndex];
    const correct  = isAnswerCorrectSingle(question, givenAnswer);

    playerAnswers[currentIndex] = { answered: true, correct, givenAnswer };
    showFeedback(givenAnswer);
}

function handleMultiValidate() {
    if (questionLocked) return;
    if (selectedSet.size === 0) {
        showNotification("Sélectionne au moins une réponse !", "info");
        return;
    }

    questionLocked = true;
    stopTimer();

    const question  = quiz.questions[currentIndex];
    const correct   = isAnswerCorrectMulti(question, selectedSet);
    const givenList = [...selectedSet].join(", ");

    playerAnswers[currentIndex] = { answered: true, correct, givenAnswer: givenList };
    showFeedbackMulti();
}

function showFeedback(givenAnswer) {
    const question = quiz.questions[currentIndex];

    answersArea.querySelectorAll(".PlayerAnswer").forEach(btn => {
        btn.disabled = true;

        if (question.type === TYPE_OUVERTE) return;

        const isCorrectAnswer = question.answers.find(
            a => a.isCorrect && a.text.trim().toLowerCase() === btn.dataset.value?.trim().toLowerCase()
        );
        const isGiven = btn.dataset.value?.trim().toLowerCase() === givenAnswer?.trim().toLowerCase();

        if (isCorrectAnswer) btn.classList.add("feedback_correct");
        if (isGiven && !isCorrectAnswer) btn.classList.add("feedback_wrong");
    });

    if (question.type === TYPE_OUVERTE) {
        const openInput = document.getElementById("open_player_input");
        if (openInput) {
            openInput.disabled = true;
            openInput.classList.add(playerAnswers[currentIndex]?.correct ? "feedback_correct" : "feedback_wrong");
        }
        const confirmBtn = document.getElementById("open_confirm_btn");
        if (confirmBtn) confirmBtn.disabled = true;
    }

    if (!playerAnswers[currentIndex]?.answered) {
        showNotification("Temps écoulé !", "error");
    }

    setTimeout(() => advanceOrFinish(), FEEDBACK_DURATION_MS);
}

function showFeedbackMulti() {
    const question  = quiz.questions[currentIndex];
    const correctSet = new Set(question.answers.filter(a => a.isCorrect).map(a => a.text.trim().toLowerCase()));

    answersArea.querySelectorAll(".PlayerAnswer.answer_btn").forEach(btn => {
        btn.disabled = true;
        const val    = btn.dataset.value?.trim().toLowerCase();
        const isCorrect = correctSet.has(val);
        const isSelected = selectedSet.has(btn.dataset.value);

        if (isCorrect && isSelected)  btn.classList.add("feedback_correct");
        if (isCorrect && !isSelected) btn.classList.add("feedback_missed");
        if (!isCorrect && isSelected) btn.classList.add("feedback_wrong");
    });

    const validateBtn = document.getElementById("multi_validate_btn");
    if (validateBtn) validateBtn.disabled = true;

    setTimeout(() => advanceOrFinish(), FEEDBACK_DURATION_MS);
}

function advanceOrFinish() {
    if (currentIndex < quiz.questions.length - 1) {
        currentIndex++;
        renderQuestion();
    } else {
        showResults();
    }
}


function renderQuestion() {
    const question = quiz.questions[currentIndex];
    questionLocked = false;
    selectedSet    = new Set();

    progressBadge.textContent = `Q ${currentIndex + 1}/${quiz.questions.length}`;
    questionText.textContent  = question.text;

    answersArea.innerHTML = "";
    answersArea.className = "";

    if (question.type === TYPE_MULTIPLE && question.multipleCorrect) {
        renderMultiCorrectQuestion(question);

    } else if (question.type === TYPE_MULTIPLE) {
        answersArea.classList.add("answers_grid");
        question.answers.forEach(ans => {
            const btn         = document.createElement("button");
            btn.className     = "PlayerAnswer";
            btn.textContent   = ans.text;
            btn.dataset.value = ans.text;
            btn.addEventListener("click", () => handleAnswer(ans.text));
            answersArea.appendChild(btn);
        });

    } else if (question.type === TYPE_VRAI_FAUX) {
        answersArea.classList.add("answers_vf");
        question.answers.forEach(ans => {
            const btn         = document.createElement("button");
            btn.className     = `PlayerAnswer vf_btn ${ans.text.toLowerCase()}`;
            btn.textContent   = ans.text;
            btn.dataset.value = ans.text;
            btn.addEventListener("click", () => handleAnswer(ans.text));
            answersArea.appendChild(btn);
        });

    } else if (question.type === TYPE_OUVERTE) {
        answersArea.classList.add("answers_open");

        const input        = document.createElement("input");
        input.type         = "text";
        input.id           = "open_player_input";
        input.className    = "OpenPlayerInput";
        input.maxLength    = 20;
        input.placeholder  = "Votre réponse...";
        input.autocomplete = "off";
        input.addEventListener("input", () => {
            input.value = input.value.replace(/\s+/g, "");
        });
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") confirmOpenAnswer();
        });

        const btn       = document.createElement("button");
        btn.id          = "open_confirm_btn";
        btn.className   = "PlayerAnswer open_confirm";
        btn.textContent = "valider";
        btn.addEventListener("click", confirmOpenAnswer);

        answersArea.appendChild(input);
        answersArea.appendChild(btn);
        setTimeout(() => input.focus(), 50);
    }

    startTimer();
}

function renderMultiCorrectQuestion(question) {
    answersArea.classList.add("answers_grid", "answers_multi");

    const hint     = document.createElement("p");
    hint.className = "MultiHint";
    const count    = question.answers.filter(a => a.isCorrect).length;
    hint.textContent = `Sélectionne les ${count} bonne${count > 1 ? "s" : ""} réponse${count > 1 ? "s" : ""}`;
    answersArea.appendChild(hint);

    question.answers.forEach(ans => {
        const btn         = document.createElement("button");
        btn.className     = "PlayerAnswer answer_btn";
        btn.textContent   = ans.text;
        btn.dataset.value = ans.text;
        btn.addEventListener("click", () => {
            if (questionLocked) return;
            if (selectedSet.has(ans.text)) {
                selectedSet.delete(ans.text);
                btn.classList.remove("selected");
            } else {
                selectedSet.add(ans.text);
                btn.classList.add("selected");
            }
        });
        answersArea.appendChild(btn);
    });

    const validateBtn       = document.createElement("button");
    validateBtn.id          = "multi_validate_btn";
    validateBtn.className   = "PlayerAnswer multi_validate";
    validateBtn.textContent = "valider";
    validateBtn.addEventListener("click", handleMultiValidate);
    answersArea.appendChild(validateBtn);
}

function confirmOpenAnswer() {
    const input = document.getElementById("open_player_input");
    if (!input) return;
    const value = input.value.trim();
    if (value === "") return;
    handleAnswer(value);
}


function getScoreLabel(score, total) {
    const ratio = score / total;
    if (ratio === 1)    return "Parfait.";
    if (ratio >= 0.8)   return "Pas mal du tout.";
    if (ratio >= 0.6)   return "Bien.";
    if (ratio >= 0.4)   return "aie aie aie...";
    if (ratio >= 0.2)   return "Peut mieux faire.";
    return "Skill issues.";
}

function showResults() {
    stopTimer();

    const score = playerAnswers.filter(a => a.correct).length;
    const total = quiz.questions.length;

    resultsScore.textContent = `${score} / ${total}`;
    resultsLabel.textContent = getScoreLabel(score, total);

    resultsBreakdown.innerHTML = "";
    quiz.questions.forEach((q, i) => {
        const entry     = document.createElement("div");
        entry.className = `BreakdownEntry ${playerAnswers[i]?.correct ? "correct" : "wrong"}`;

        const icon   = playerAnswers[i]?.correct ? "✓" : "✗";
        const answer = playerAnswers[i]?.answered
            ? `"${playerAnswers[i].givenAnswer}"`
            : "— temps écoulé";

        entry.innerHTML = `
            <span class="BreakdownIcon">${icon}</span>
            <span class="BreakdownQuestion">${q.text}</span>
            <span class="BreakdownAnswer">${answer}</span>
        `;
        resultsBreakdown.appendChild(entry);
    });

    resultsOverlay.style.opacity       = "1";
    resultsOverlay.style.pointerEvents = "all";
}

function startGame() {
    currentIndex   = 0;
    playerAnswers  = [];
    questionLocked = false;

    resultsOverlay.style.opacity       = "0";
    resultsOverlay.style.pointerEvents = "none";

    quizTitleDisplay.textContent = quiz.name || "Quizz";
    renderQuestion();
}


document.getElementById("quit_button").addEventListener("click", () => {
    stopTimer();
    history.back();
});

document.getElementById("results_back").addEventListener("click", () => {
    stopTimer();
    history.back();
});

document.getElementById("results_replay").addEventListener("click", () => {
    startGame();
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

    const raw = localStorage.getItem(STORAGE_KEY_PLAY);
    if (!raw) {
        showNotification("Aucun quizz chargé", "error");
        setTimeout(() => history.back(), 2000);
        return;
    }

    quiz = JSON.parse(raw);
    startGame();
});