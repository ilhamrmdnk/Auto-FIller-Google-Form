let responses = [];
let currentIndex = 0;

const input = document.getElementById("responsesInput");
const importBtn = document.getElementById("importBtn");

const answerView = document.getElementById("answerView");
const counter = document.getElementById("counter");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fillBtn = document.getElementById("fillBtn");
const deleteBtn = document.getElementById("deleteBtn");
const clearBtn = document.getElementById("clearBtn");

function renderCurrentAnswer() {
    // JIKA DATA KOSONG
    if (responses.length === 0) {
        counter.textContent = "No Data";
        answerView.innerHTML = "Belum ada data yang di-import.";
        answerView.classList.add("empty-state"); // Aktifkan gaya teks tengah abu-abu
        return;
    }

    // JIKA ADA DATA
    answerView.classList.remove("empty-state"); // Hapus gaya teks tengah
    
    counter.textContent =
        `Answer ${currentIndex + 1} / ${responses.length}`;

    const answer = responses[currentIndex];
    let html = "";

    for (const key in answer) {
        html += `
            <p>
                <strong>${key}</strong>: ${answer[key]}
            </p>
        `;
    }

    answerView.innerHTML = html;
}

importBtn.addEventListener("click", async () => {
    // Validasi jika input kosong
    if (!input.value.trim()) {
        alert("Silakan paste data jawaban terlebih dahulu!");
        return;
    }

    responses = parseResponses(input.value);

    if (responses.length === 0) {
        alert("Format data tidak dikenali. Pastikan gunakan pemisah '---'");
        return;
    }

    currentIndex = 0;

    await saveData(
        responses,
        currentIndex
    );

    // Kosongkan textarea setelah berhasil import agar rapi
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

    const confirmed = confirm("Hapus semua jawaban?");
    if (!confirmed) return;

    responses = [];
    currentIndex = 0;

    await saveData(responses, currentIndex);
    renderCurrentAnswer();
});

fillBtn.addEventListener("click", async () => {
    if (responses.length === 0) {
        alert("Tidak ada jawaban yang bisa diisikan.");
        return;
    }

    const answer = responses[currentIndex];

    // Ambil tab aktif saat ini
    const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true
    });

    if (!tabs.length) {
        alert("Tab tidak ditemukan.");
        return;
    }

    // Kirim pesan ke content.js
    await browser.tabs.sendMessage(
        tabs[0].id,
        {
            type: "FILL_FORM",
            data: answer
        }
    );
});

async function init() {
    const data = await loadData();
    responses = data.responses;
    currentIndex = data.currentIndex;
    renderCurrentAnswer();
}

// Jalankan inisialisasi data saat popup dibuka
init();