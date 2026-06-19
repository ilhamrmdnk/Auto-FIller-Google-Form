console.log("GForm AutoFill Content Script Loaded");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

initAutoLoop();

async function initAutoLoop() {
    const dataStorage = await chrome.storage.local.get(["responses", "currentIndex", "loopActive"]);
    const responses = dataStorage.responses || [];
    const currentIndex = dataStorage.currentIndex || 0;
    const loopActive = dataStorage.loopActive || false;

    if (!loopActive || responses.length === 0) return;

    if (await checkAndHandleSuccessPage(currentIndex, responses.length)) {
        return; 
    }

    const currentData = responses[currentIndex];
    if (currentData) {
    console.log(`[Auto-Loop] Filling data #${currentIndex + 1} on the active page.`);
        await delay(800); 
        await fillAllQuestions(currentData);
        
        await delay(1200); 
        handleFormNavigation();
    }
}

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
            
            await chrome.storage.local.set({ currentIndex: nextIndex });
            console.log(`Moving to the next index: ${nextIndex + 1}`);
            
            await delay(1000);
            link.click();
        } else {
            await chrome.storage.local.set({ loopActive: false });
            alert("Success! All answers submitted.");
        }
        break;
        }
    }
    return successBtnFound;
}

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
            
            if (loopActive) {
                await delay(1500); 
                handleFormNavigation();
            } else {
                console.log("Form filled successfully! Waiting for manual user submission.");
            }
        }
    }
});

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
        
        dropdownTrigger.click(); 
        
        let maxAttempts = 20; 
        let attempt = 0;
        let optionFound = false;

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
            await delay(100); 
            
            const spanOptions = document.querySelectorAll('span.vRMGwf');
            
            for (const span of spanOptions) {
                const optionText = span.textContent.trim().toLowerCase();
                const targetAnswer = answer.toLowerCase().trim();
                
                if (optionText && (optionText === targetAnswer || optionText.includes(targetAnswer) || targetAnswer.includes(optionText))) {
                    
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

        if (!optionFound) {
            console.warn(`[Dropdown] Gagal mendeteksi opsi "${answer}" di layar.`);
            dropdownTrigger.click(); 
        }
        return;
    }
}

function handleFormNavigation() {
    const buttons = document.querySelectorAll('div[role="button"]');
    
    let submitBtn = null;
    let nextBtn = null;

    for (let btn of buttons) {
        const btnText = (btn.innerText || btn.textContent || "").trim().toLowerCase();
        
        if (btnText === 'kirim' || btnText === 'submit') {
            submitBtn = btn;
            break; 
        }
        if (btnText === 'berikutnya' || btnText === 'next') {
            nextBtn = btn;
        }
    }

    if (submitBtn) {
        console.log("[Navigation] Menemukan halaman akhir. Mengirim form (Submit)...");
        submitBtn.click();
    } else if (nextBtn) {
        console.log("[Navigation] Menemukan halaman seksi. Melanjutkan ke halaman berikutnya...");
        nextBtn.click();
    } else {
        const submitContainer = document.querySelector('.appsMaterialWewebAnimateFormbuttonSubmitContainer');
        if (submitContainer) {
            const actualBtn = submitContainer.querySelector('div[role="button"]') || submitContainer;
            actualBtn.click();
        }
    }
}