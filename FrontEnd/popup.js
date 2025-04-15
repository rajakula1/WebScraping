document.addEventListener('DOMContentLoaded', function() {
    // Get the current tab URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const url = tabs[0].url;
        console.log('Processing URL:', url);
        processPage(url);
    });
});

async function processPage(url) {
    try {
        console.log('Sending request to:', 'http://localhost:8000/scrape');
        
        // Create request body with all required fields
        const requestBody = {
            url: url,
            instructions: "Analyze the content and provide matching keywords with associated 3D animations",
            keywords: []
        };
        
        console.log('Request body:', requestBody);
        
        const response = await fetch('http://localhost:8000/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Full API Response:', data);
        
        if (!response.ok) {
            console.error('API Error:', data);
            let errorMessage = 'Failed to process page';
            if (data.detail) {
                const errorDetail = data.detail[0];
                errorMessage = errorDetail.msg || 'Validation error';
            }
            throw new Error(errorMessage);
        }
        
        if (data.status === 'success') {
            if (data.matchedKeywords && data.matchedKeywords.length > 0) {
                console.log('Found keywords:', data.matchedKeywords);
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'highlightKeywords',
                        keywords: data.matchedKeywords,
                        videos: data.videoUrls
                    });
                });
                showSuccessMessage('Keywords found and highlighted!');
            } else {
                console.log('No keywords found');
                showErrorMessage('No matching keywords found on this page.');
            }
        } else {
            console.error('Error response:', data);
            showErrorMessage('Error processing page: ' + (data.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error processing page:', error);
        showErrorMessage('Error processing page: ' + error.message);
    }
}

function showSuccessMessage(message) {
    const messageDiv = document.getElementById('message');
    messageDiv.className = 'success';
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

function showErrorMessage(message) {
    const messageDiv = document.getElementById('message');
    messageDiv.className = 'error';
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}