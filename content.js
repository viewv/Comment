function getVideoId(url) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    return urlParams.get('v');
}

async function fetchComments(videoId, apiKey, pageToken = '', allComments = []) {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const comments = data.items.map(item => ({
            authorName: item.snippet.topLevelComment.snippet.authorDisplayName,
            text: item.snippet.topLevelComment.snippet.textDisplay
        }));

        allComments.push(...comments);

        // Limit to 500 comments to avoid hitting API limits and keep analysis focused
        if (data.nextPageToken && allComments.length < 500) {
            return fetchComments(videoId, apiKey, data.nextPageToken, allComments);
        }

        return allComments;
    } catch (error) {
        throw new Error(`Failed to fetch comments: ${error.message}`);
    }
}

async function analyzeWithGemini(comments, prompt, apiKey) {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

    const commentsText = comments.map(c => `${c.authorName}: ${c.text}`).join('\n\n');
    const finalPrompt = prompt.replace('{comments}', commentsText);

    try {
        const response = await fetch(`${url}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: finalPrompt
                    }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        throw new Error(`Gemini API error: ${error.message}`);
    }
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'analyzeComments') {
        const videoId = getVideoId(window.location.href);

        chrome.storage.local.get(['youtubeApiKey', 'geminiApiKey'], async function (result) {
            if (!result.youtubeApiKey || !result.geminiApiKey) {
                alert('Please set both YouTube and Gemini API keys first');
                return;
            }

            try {
                // Fetch comments
                const comments = await fetchComments(videoId, result.youtubeApiKey);

                // Analyze with Gemini
                const analysis = await analyzeWithGemini(
                    comments,
                    request.promptTemplate,
                    result.geminiApiKey
                );

                // Send results back to popup
                chrome.runtime.sendMessage({
                    action: 'analysisComplete',
                    result: analysis
                });
            } catch (error) {
                chrome.runtime.sendMessage({
                    action: 'analysisComplete',
                    result: `Error: ${error.message}`
                });
            }
        });
    }
});