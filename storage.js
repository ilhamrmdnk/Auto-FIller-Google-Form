async function saveData(responses, currentIndex) {
    await browser.storage.local.set({
        responses,
        currentIndex
    });
}

async function loadData() {
    const data = await browser.storage.local.get([
        "responses",
        "currentIndex"
    ]);

    return {
        responses: data.responses || [],
        currentIndex: data.currentIndex || 0
    };
}

window.saveData = saveData;
window.loadData = loadData;