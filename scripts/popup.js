// Function to get the saved API key from Chrome storage
function getApiKey() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get("API_KEY", (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(result.API_KEY || null);
            }
        });
    });
}

// Function to save the API key to Chrome storage
function saveApiKey(apiKey) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ API_KEY: apiKey }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

// Function to get the video ID from the current tab's URL
function getVideoIdFromUrl(url) {
    const urlParams = new URL(url).searchParams;
    return urlParams.get("v"); // Extract the "v" parameter, which is the video ID
}

// Fetch comments using the YouTube Data API
async function fetchComments(apiKey, videoId) {
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=100`;

    let comments = [];
    let nextPageToken = null;

    try {
        do {
            const response = await fetch(nextPageToken ? `${url}&pageToken=${nextPageToken}` : url);
            const data = await response.json();

            if (data.error) {
                alert(`Error: ${data.error.message}`);
                console.error(data.error);
                return;
            }

            comments = comments.concat(
                data.items.map((item) => item.snippet.topLevelComment.snippet.textDisplay)
            );
            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        displayComments(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        alert("An error occurred while fetching comments. Check the console for details.");
    }
}

// Display fetched comments in the popup
function displayComments(comments) {
    const container = document.getElementById("commentsContainer");
    container.innerHTML = ""; // Clear previous comments

    if (comments.length === 0) {
        container.textContent = "No comments found.";
        return;
    }

    comments.forEach((comment, index) => {
        const commentElement = document.createElement("div");
        commentElement.className = "comment";
        commentElement.textContent = `${index + 1}: ${comment}`;
        container.appendChild(commentElement);
    });
}

// Check if the API key exists; if not, show the setup page
getApiKey().then((apiKey) => {
    if (!apiKey) {
        // Show the setup page
        document.getElementById("setupPage").style.display = "block";
        document.getElementById("commentsPage").style.display = "none";

        // Save the API key when the user inputs it
        document.getElementById("saveApiKey").addEventListener("click", async () => {
            const apiKeyInput = document.getElementById("apiKeyInput").value.trim();
            if (!apiKeyInput) {
                alert("Please enter a valid API Key.");
                return;
            }
            try {
                await saveApiKey(apiKeyInput);
                alert("API Key saved successfully. Reload the extension to start fetching comments.");
                window.location.reload(); // Reload to fetch comments
            } catch (error) {
                console.error("Error saving API key:", error);
                alert("Failed to save API Key. Check the console for details.");
            }
        });
    } else {
        // Show the comments page
        document.getElementById("setupPage").style.display = "none";
        document.getElementById("commentsPage").style.display = "block";

        // Get the current tab's video ID and fetch comments
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const videoId = getVideoIdFromUrl(tabs[0].url);
            if (videoId) {
                fetchComments(apiKey, videoId);
            } else {
                document.getElementById("commentsContainer").textContent = "No video ID found on this page.";
            }
        });
    }
});