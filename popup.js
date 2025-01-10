document.addEventListener('DOMContentLoaded', function () {
    // Tab switching logic
    const tabs = document.querySelectorAll('.tab');
    const contentSections = document.querySelectorAll('.content-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active content
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetTab) {
                    section.classList.add('active');
                }
            });
        });
    });

    // Elements
    const youtubeApiKeyInput = document.getElementById('youtubeApiKey');
    const geminiApiKeyInput = document.getElementById('geminiApiKey');
    const promptTemplateInput = document.getElementById('promptTemplate');
    const saveButton = document.getElementById('saveSettings');
    const clearButton = document.getElementById('clearSettings');
    const analyzeButton = document.getElementById('analyzeComments');
    const statusDiv = document.getElementById('status');
    const analysisResultDiv = document.getElementById('analysisResult');

    // Default prompt template
    const defaultPrompt = `Please analyze these YouTube comments and provide:
  1. Main sentiment and themes
  2. Most discussed topics
  3. Notable feedback or suggestions
  4. Areas of controversy or debate
  
  Comments to analyze:
  {comments}`;

    // Load saved settings
    chrome.storage.local.get(
        ['youtubeApiKey', 'geminiApiKey', 'promptTemplate'],
        function (result) {
            if (result.youtubeApiKey) youtubeApiKeyInput.value = result.youtubeApiKey;
            if (result.geminiApiKey) geminiApiKeyInput.value = result.geminiApiKey;
            if (result.promptTemplate) {
                promptTemplateInput.value = result.promptTemplate;
            } else {
                promptTemplateInput.value = defaultPrompt;
            }
        }
    );

    function showStatus(message, type = 'success') {
        statusDiv.textContent = message;
        statusDiv.className = type;
        setTimeout(() => {
            statusDiv.className = '';
        }, 3000);
    }

    // Save settings
    saveButton.addEventListener('click', function () {
        chrome.storage.local.set({
            youtubeApiKey: youtubeApiKeyInput.value,
            geminiApiKey: geminiApiKeyInput.value,
            promptTemplate: promptTemplateInput.value
        }, function () {
            showStatus('Settings saved successfully!');
        });
    });

    // Clear settings
    clearButton.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all settings?')) {
            chrome.storage.local.clear(function () {
                youtubeApiKeyInput.value = '';
                geminiApiKeyInput.value = '';
                promptTemplateInput.value = defaultPrompt;
                showStatus('Settings cleared successfully!');
            });
        }
    });

    // Analyze comments
    analyzeButton.addEventListener('click', function () {
        // Show loading state
        analysisResultDiv.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        showStatus('Analyzing comments...', 'success');

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const tab = tabs[0];
            if (tab.url.includes('youtube.com/watch')) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'analyzeComments',
                    promptTemplate: promptTemplateInput.value
                });
            } else {
                showStatus('Please navigate to a YouTube video page', 'error');
                analysisResultDiv.innerHTML = '';
            }
        });
    });

    // Listen for analysis results
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action === 'analysisComplete') {
            if (request.result.startsWith('Error:')) {
                showStatus(request.result, 'error');
                analysisResultDiv.innerHTML = '';
            } else {
                showStatus('Analysis complete!');
                analysisResultDiv.textContent = request.result;
            }
        }
    });
});