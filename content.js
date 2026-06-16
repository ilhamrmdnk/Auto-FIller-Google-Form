console.log("GForm AutoFill Content Script Loaded");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

browser.runtime.onMessage.addListener(async (message) => {
    if (message.type !== "FILL_FORM") return;

    const data = message.data;
    console.log("Data diterima untuk di-fill:", data);

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
});

async function fillComponent(container, answer) {
    
// 1. INPUT TEXT & TEXTAREA (Short/Long Answer)
    const inputs = container.querySelectorAll('input[type="text"], textarea');
    const standardInputs = Array.from(inputs).filter(inp => !inp.classList.contains('Hvn33') && inp.getAttribute('role') !== 'combobox');

    if (standardInputs.length > 0) {
        standardInputs.forEach(input => {
            input.value = answer;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("blur", { bubbles: true }));
        });
        console.log(`Berhasil mengisi Text/Textarea dengan: ${answer}`);
        return;
    }

//PILIHAN GANDA (Radio Buttons)
    const radios = container.querySelectorAll('[role="radio"]');
    if (radios.length > 0) {
        let matched = false;

        radios.forEach(radio => {
            const labelText = radio.getAttribute('aria-label') || radio.innerText || radio.nextSibling?.textContent;
            if (labelText && labelText.toLowerCase().trim() === answer.toLowerCase()) {
                radio.click();
                matched = true;
                console.log(`Berhasil klik Radio: ${labelText}`);
            }
        });

        if (!matched) {
            const otherRadio = radios[radios.length - 1];
            const otherInput = container.querySelector('.Hvn33, input[type="text"]'); 
            
            if (otherRadio && otherInput) {
                otherRadio.click();
                await delay(100); // Tunggu sebentar sampai input kustom aktif
                otherInput.value = answer; 
                otherInput.dispatchEvent(new Event("input", { bubbles: true }));
                console.log(`Berhasil mengisi opsi Lainnya (Radio) dengan: ${answer}`);
            }
        }
        return;
    }

//KOTAK CENTANG (Checkbox - Mendukung Multi-select & Opsi Lainnya)
    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    if (checkboxes.length > 0) {
        // Pecah jawaban AI berdasarkan koma, lalu bersihkan spasi dan ubah ke lowercase
        // Contoh: "Membaca, Coding" -> ["membaca", "coding"]
        const answersList = answer.split(',').map(a => a.trim().toLowerCase());

        console.log(`Memproses Checkbox untuk jawaban:`, answersList);

        const officialOptions = [];

        checkboxes.forEach(checkbox => {
            const labelText = (checkbox.getAttribute('aria-label') || checkbox.innerText || "").trim();
            if (!labelText) return;

            officialOptions.push(labelText.toLowerCase());

            const isChecked = checkbox.getAttribute('aria-checked') === 'true';
            const shouldBeChecked = answersList.includes(labelText.toLowerCase());

            if (shouldBeChecked !== isChecked) {
                checkbox.click();
            }
        });

        const customAnswers = answersList.filter(ans => !officialOptions.includes(ans));

        if (customAnswers.length > 0) {
            const otherCheckbox = checkboxes[checkboxes.length - 1]; // Biasanya checkbox terakhir
            const otherInput = container.querySelector('input[type="text"]');

            if (otherCheckbox && otherInput) {
                const isOtherChecked = otherCheckbox.getAttribute('aria-checked') === 'true';
                
                // Jika belum dicentang, kita centang dulu
                if (!isOtherChecked) {
                    otherCheckbox.click();
                }

                // Beri jeda sedikit lalu ketikkan jawaban kustomnya (jika lebih dari satu, gabungkan dengan koma)
                await delay(100);
                otherInput.value = customAnswers.join(', ');
                otherInput.dispatchEvent(new Event("input", { bubbles: true }));
                console.log(`Berhasil mengisi opsi Lainnya (Checkbox) dengan: ${otherInput.value}`);
            }
        } else {
            // Jika tidak ada jawaban kustom dari AI, tapi opsi "Lainnya" di form sempat tercentang dari sesi lalu, kita bersihkan
            const otherCheckbox = checkboxes[checkboxes.length - 1];
            const otherInput = container.querySelector('input[type="text"]');
            if (otherCheckbox && otherInput && otherCheckbox.getAttribute('aria-checked') === 'true') {
                otherCheckbox.click();
                otherInput.value = "";
                otherInput.dispatchEvent(new Event("input", { bubbles: true }));
            }
        }
        
        return;
    }

// DROPDOWN (!!!Gabisa otomatis!!!)
    const dropdownTrigger = container.querySelector('[role="listbox"]');
    if (dropdownTrigger) {
        const currentSelected = dropdownTrigger.getAttribute('aria-label') || dropdownTrigger.innerText;
        
        if (currentSelected && currentSelected.toLowerCase().trim() === answer.toLowerCase()) {
            console.log(`Dropdown sudah terisi: ${answer}`);
            return;
        }
        dropdownTrigger.click(); 
        await delay(250); 

        const options = document.querySelectorAll('[role="option"], .v08fGc');
        let optionFound = false;

        for (const option of options) {
            const optionText = (option.innerText || option.textContent || "").trim();

            if (optionText && optionText.toLowerCase() === answer.toLowerCase()) {
                option.click(); // Klik opsi yang sesuai secara otomatis
                optionFound = true;
                console.log(`Berhasil memilih Dropdown otomatis: ${optionText}`);
                break; 
            }
        }
        if (!optionFound) {
            console.log(`Opsi "${answer}" tidak ditemukan di dropdown.`);
            dropdownTrigger.click(); 
        }
        return;
    }
}