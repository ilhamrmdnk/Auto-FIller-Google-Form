let responses = [];
let currentIndex = 0;

const input = document.getElementById("responsesInput");
const importBtn = document.getElementById("importBtn");
const answerView = document.getElementById("answerView");
const counter = document.getElementById("counter");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fillBtn = document.getElementById("fillBtn");
const stopBtn = document.getElementById("stopBtn");
const deleteBtn = document.getElementById("deleteBtn");
const clearBtn = document.getElementById("clearBtn");
const donateBtn = document.getElementById("donateBtn");

function renderCurrentAnswer() {
    if (responses.length === 0) {
        counter.textContent = "No Data";
        answerView.innerHTML = "No response data has been imported yet.";
        answerView.classList.add("empty-state");
        return;
    }

    answerView.classList.remove("empty-state");
    counter.textContent = `Answer ${currentIndex + 1} / ${responses.length}`;

    const answer = responses[currentIndex];
    let html = "";

    for (const key in answer) {
        html += `<p><strong>${key}</strong>: ${answer[key]}</p>`;
    }

    answerView.innerHTML = html;
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.currentIndex) {
        currentIndex = changes.currentIndex.newValue;
        renderCurrentAnswer();
    }
    if (area === "local" && changes.loopActive) {
        const autoSubmitCheck = document.getElementById("autoSubmitCheck");
        if (autoSubmitCheck) {
            autoSubmitCheck.checked = changes.loopActive.newValue;
        }
    }
});

importBtn.addEventListener("click", async () => {
    if (!input.value.trim()) {
        alert("Please paste your response data first!");
        return;
    }

    responses = parseResponses(input.value);

    if (responses.length === 0) {
        alert("Data format not recognized. Make sure to use the '---' separator.");
        return;
    }

    currentIndex = 0;
    await saveData(responses, currentIndex);
    input.value = ""; 
    renderCurrentAnswer();
});

prevBtn.addEventListener("click", async () => {
    if (responses.length === 0) return;
    if (currentIndex > 0) {
        currentIndex--;
        await saveData(responses, currentIndex);
        renderCurrentAnswer();
    }
});

nextBtn.addEventListener("click", async () => {
    if (responses.length === 0) return;
    if (currentIndex < responses.length - 1) {
        currentIndex++;
        await saveData(responses, currentIndex);
        renderCurrentAnswer();
    }
});

deleteBtn.addEventListener("click", async () => {
    if (responses.length === 0) return;
    responses.splice(currentIndex, 1);

    if (currentIndex >= responses.length) {
        currentIndex = responses.length - 1;
    }
    if (currentIndex < 0) {
        currentIndex = 0;
    }

    await saveData(responses, currentIndex);
    renderCurrentAnswer();
});

clearBtn.addEventListener("click", async () => {
    if (responses.length === 0) return;
    const confirmed = confirm("Delete all answers?");
    if (!confirmed) return;

    responses = [];
    currentIndex = 0;
    await saveData(responses, currentIndex);
    renderCurrentAnswer();
});

fillBtn.addEventListener("click", async () => {
    if (responses.length === 0) {
        alert("No answers available.");
        return;
    }

    const autoSubmitCheck = document.getElementById("autoSubmitCheck");
    const isAutoSubmitMode = autoSubmitCheck ? autoSubmitCheck.checked : false;
    
    const answer = responses[currentIndex];
    const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tabs.length) {
        alert("Active tab not found.");
        return;
    }

    await chrome.storage.local.set({ 
        loopActive: isAutoSubmitMode,
        currentIndex: currentIndex 
    });

    await chrome.tabs.sendMessage(tabs[0].id, {
        type: "FILL_FORM",
        data: answer
    });
});

stopBtn.addEventListener("click", async () => {
    await chrome.storage.local.set({ loopActive: false });
    
    const autoSubmitCheck = document.getElementById("autoSubmitCheck");
    if (autoSubmitCheck) {
        autoSubmitCheck.checked = false;
    }
    
    console.log("Automation forcefully stopped by user.");
    alert("Automation Stopped! The bot will not continue to the next data entry.");
});

donateBtn.addEventListener("click", () => {
    window.open("https://saweria.co/remdeengg", "_blank");
});

async function init() {
    const data = await loadData();
    responses = data.responses;
    currentIndex = data.currentIndex;
    renderCurrentAnswer();

    const dataStorage = await chrome.storage.local.get("loopActive");
    const autoSubmitCheck = document.getElementById("autoSubmitCheck");
    if (autoSubmitCheck && dataStorage.loopActive !== undefined) {
        autoSubmitCheck.checked = dataStorage.loopActive;
    }
}

init();