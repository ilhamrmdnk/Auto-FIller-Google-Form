console.log("GForm AutoFill Content Script Loaded");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Jalankan otomatis setiap halaman dimuat (untuk mendeteksi halaman sukses maupun perpindahan seksi)
initAutoLoop();

// ==================== LOGIKA UTAMA PERULANGAN OTOMATIS ====================
async function initAutoLoop() {
    const dataStorage = await chrome.storage.local.get(["responses", "currentIndex", "loopActive"]);
    const responses = dataStorage.responses || [];
    const currentIndex = dataStorage.currentIndex || 0;
    const loopActive = dataStorage.loopActive || false;

    // JIKA MODE OTOMATIS TIDAK AKTIF, JANGAN JALANKAN LOGIKA DI SINI
    if (!loopActive || responses.length === 0) return;

    // 1. CEK HALAMAN SUKSES SUBMIT GFORM (Hanya di sini currentIndex boleh maju +1)
    if (await checkAndHandleSuccessPage(currentIndex, responses.length)) {
        return; 
    }

    // 2. JIKA DI FORM UTAMA (BAIK HALAMAN 1, 2, DST), ISI DATA YANG ADA DI HALAMAN TERSEBUT
    const currentData = responses[currentIndex];
    if (currentData) {
        console.log(`[Auto-Loop] Mengisi data ke-${currentIndex + 1} pada halaman aktif.`);
        await delay(800); 
        await fillAllQuestions(currentData);
        
        // Jalankan navigasi otomatis (Klik "Berikutnya" atau "Kirim") jika di-centang
        await delay(1200); 
        handleFormNavigation();
    }
}

// Fungsi handle halaman sukses (klik "Kirim tanggapan lain")
async function checkAndHandleSuccessPage(currentIndex, totalData) {
    const links = document.querySelectorAll('a');
    let successBtnFound = false;

    for (let link of links) {
        const linkText = link.textContent.trim().toLowerCase();
        
        if (linkText.includes("kirim tanggapan lain") || 
            linkText.includes("submit another response") || 
            linkText.includes("kirim jawaban lain")) {
            
            successBtnFound = true;

            if (currentIndex < totalData - 1) {
                const nextIndex = currentIndex + 1;
                
                // Update indeks data ke storage
                await chrome.storage.local.set({ currentIndex: nextIndex });
                console.log(`Maju ke indeks berikutnya: ${nextIndex + 1}`);
                
                await delay(1000);
                link.click(); // Klik "Kirim jawaban lain"
            } else {
                // Selesai, matikan loop otomatis
                await chrome.storage.local.set({ loopActive: false });
                alert("Selesai! Semua data jawaban berhasil dikirim.");
            }
            break;
        }
    }
    return successBtnFound;
}

// Listener utama ketika tombol 'Fill Form' ditekan dari Popup UI
chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === "FILL_FORM") {
        const dataStorage = await chrome.storage.local.get(["responses", "currentIndex", "loopActive"]);
        const responses = dataStorage.responses || [];
        const currentIndex = dataStorage.currentIndex || 0;
        const loopActive = dataStorage.loopActive || false;

        console.log(`Memicu fill form. Mode Auto-Submit: ${loopActive}`);
        
        const currentData = responses[currentIndex];
        if (currentData) {
            await fillAllQuestions(currentData);
            
            // Jika user MENCENTANG "Automatic Submit", langsung picu navigasi halaman
            if (loopActive) {
                await delay(1500); 
                handleFormNavigation();
            } else {
                console.log("Form berhasil diisi! Menunggu tindakan manual pengguna untuk submit.");
            }
        }
    }
});

// ==================== FUNGSI UTAMA LOOP PERTANYAAN ====================
async function fillAllQuestions(data) {
    for (const [questionText, answerText] of Object.entries(data)) {
        if (!answerText) continue;
        const formItems = document.querySelectorAll('[role="listitem"], [data-item-id]');
        for (const item of formItems) {
            const titleElement = item.querySelector('[role="heading"], .M7eMe'); 
            if (!titleElement) continue;
            const currentQuestionTitle = titleElement.textContent.trim().toLowerCase();
            const targetQuestionTitle = questionText.trim().toLowerCase();

            if (currentQuestionTitle.includes(targetQuestionTitle) || targetQuestionTitle.includes(currentQuestionTitle)) {
                await fillComponent(item, answerText.trim());
                break; 
            }
        }
    }
}

// ==================== LOGIKA DETEKSI COMPONENT INPUT ====================
async function fillComponent(container, answer) {
    // 1. INPUT TEXT & TEXTAREA
    const inputs = container.querySelectorAll('input[type="text"], textarea');
    const standardInputs = Array.from(inputs).filter(inp => !inp.classList.contains('Hvn33') && inp.getAttribute('role') !== 'combobox');
    if (standardInputs.length > 0) {
        standardInputs.forEach(input => {
            input.value = answer;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("blur", { bubbles: true }));
        });
        return;
    }

    // 2. PILIHAN GANDA (Radio Buttons)
    const radios = container.querySelectorAll('[role="radio"]');
    if (radios.length > 0) {
        let matched = false;
        radios.forEach(radio => {
            const labelText = radio.getAttribute('aria-label') || radio.innerText || radio.nextSibling?.textContent;
            if (labelText && labelText.toLowerCase().trim() === answer.toLowerCase()) {
                radio.click();
                matched = true;
            }
        });
        if (!matched) {
            const otherRadio = radios[radios.length - 1];
            const otherInput = container.querySelector('.Hvn33, input[type="text"]'); 
            if (otherRadio && otherInput) {
                otherRadio.click();
                await delay(150);
                otherInput.value = answer; 
                otherInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        return;
    }

    // 3. KOTAK CENTANG (Checkbox)
    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    if (checkboxes.length > 0) {
        const answersList = answer.split(',').map(a => a.trim().toLowerCase());
        const officialOptions = [];
        checkboxes.forEach(checkbox => {
            const labelText = (checkbox.getAttribute('aria-label') || checkbox.innerText || "").trim();
            if (!labelText) return;
            officialOptions.push(labelText.toLowerCase());
            const isChecked = checkbox.getAttribute('aria-checked') === 'true';
            const shouldBeChecked = answersList.includes(labelText.toLowerCase());
            if (shouldBeChecked !== isChecked) checkbox.click();
        });
        const customAnswers = answersList.filter(ans => !officialOptions.includes(ans));
        if (customAnswers.length > 0) {
            const otherCheckbox = checkboxes[checkboxes.length - 1]; 
            const otherInput = container.querySelector('input[type="text"]');
            if (otherCheckbox && otherInput) {
                if (otherCheckbox.getAttribute('aria-checked') === 'true' === false) otherCheckbox.click();
                await delay(150);
                otherInput.value = customAnswers.join(', ');
                otherInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        return;
    }

    // 4. DROPDOWN (SUPER AGRESIF: FIX TARGET SPAN CLASS VRMGWF & POLLING DETEKSI)
    const dropdownTrigger = container.querySelector('[role="listbox"]');
    if (dropdownTrigger) {
        console.log(`[Dropdown] Menembak dropdown untuk jawaban: ${answer}`);
        
        // Klik untuk membuka menu dropdown kustom Google Form
        dropdownTrigger.click(); 
        
        let maxAttempts = 20; 
        let attempt = 0;
        let optionFound = false;

        // Fungsi simulasi rentetan interaksi kursor manusia penuh (Anti-Block)
        const simulateHumanClick = (element) => {
            const events = ['mousedown', 'mouseup', 'click'];
            events.forEach(eventType => {
                element.dispatchEvent(new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
            });
        };

        while (attempt < maxAttempts && !optionFound) {
            await delay(100); // Polling setiap 100ms menunggu pemuatan list internal Google
            
            // Bidik target teks di dalam tag span dengan class yang di-inspect tadi
            const spanOptions = document.querySelectorAll('span.vRMGwf');
            
            for (const span of spanOptions) {
                const optionText = span.textContent.trim().toLowerCase();
                const targetAnswer = answer.toLowerCase().trim();
                
                if (optionText && (optionText === targetAnswer || optionText.includes(targetAnswer) || targetAnswer.includes(optionText))) {
                    
                    // Temukan container pembungkus opsi ([role="option"])
                    const clickableParent = span.closest('[role="option"]') || span.parentElement;
                    
                    if (clickableParent) {
                        simulateHumanClick(clickableParent);
                        optionFound = true;
                        console.log(`[Dropdown] Sukses milih opsi "${span.textContent}" pada polling ke-${attempt + 1}`);
                        break;
                    }
                }
            }
            attempt++;
        }

        // Pengaman: Jika gagal mendeteksi opsi jawaban, tutup dropdown agar panel tidak menggantung di layar
        if (!optionFound) {
            console.warn(`[Dropdown] Gagal mendeteksi opsi "${answer}" di layar.`);
            dropdownTrigger.click(); 
        }
        return;
    }
}

// ==================== KENDALI NAVIGASI HALAMAN (MULTI-PAGE/SECTION) ====================
function handleFormNavigation() {
    const buttons = document.querySelectorAll('div[role="button"]');
    
    let submitBtn = null;
    let nextBtn = null;

    // Scan semua tombol aksi di halaman aktif saat ini
    for (let btn of buttons) {
        const btnText = (btn.innerText || btn.textContent || "").trim().toLowerCase();
        
        if (btnText === 'kirim' || btnText === 'submit') {
            submitBtn = btn;
            break; // Prioritas utama karena ini halaman final
        }
        if (btnText === 'berikutnya' || btnText === 'next') {
            nextBtn = btn;
        }
    }

    // Eksekusi tombol berdasarkan prioritas penemuan halaman
    if (submitBtn) {
        console.log("[Navigation] Menemukan halaman akhir. Mengirim form (Submit)...");
        submitBtn.click();
    } else if (nextBtn) {
        console.log("[Navigation] Menemukan halaman seksi. Melanjutkan ke halaman berikutnya...");
        nextBtn.click();
    } else {
        // Fallback jika Google menggunakan container animasi material bawaan lama
        const submitContainer = document.querySelector('.appsMaterialWewebAnimateFormbuttonSubmitContainer');
        if (submitContainer) {
            const actualBtn = submitContainer.querySelector('div[role="button"]') || submitContainer;
            actualBtn.click();
        }
    }
}