function parseResponses(text) {
    const responses = [];

    const blocks = text
        .split('---')
        .map(block => block.trim())
        .filter(block => block.length > 0);

    for (const block of blocks) {
        const response = {};

        const lines = block
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        for (const line of lines) {
            const separatorIndex = line.indexOf(':');

            if (separatorIndex === -1) continue;

            const question = line.substring(0, separatorIndex).trim();
            const answer = line.substring(separatorIndex + 1).trim();

            response[question] = answer;
        }

        if (Object.keys(response).length > 0) {
            responses.push(response);
        }
    }

    return responses;
}

window.parseResponses = parseResponses;