// content.js
// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'highlightKeywords') {
        try {
            highlightKeywords(request.keywords, request.videos);
        } catch (error) {
            console.error('Error highlighting keywords:', error);
        }
    }
});

function highlightKeywords(keywords, videos) {
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        console.log('No keywords to highlight');
        return;
    }

    // Create a mapping of keywords to videos
    const keywordVideoMap = new Map();
    keywords.forEach((keyword, index) => {
        keywordVideoMap.set(keyword.toLowerCase(), videos[index]);
    });

    // Create a single tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'keyword-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    // Create a function to wrap text nodes with links
    function wrapTextNodes(node, keyword) {
        const keywordLower = keyword.toLowerCase();
        const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
        
        if (regex.test(node.textContent)) {
            const parts = node.textContent.split(regex);
            let remainingText = parts[0];
            
            // Create a span for each part and keyword
            for (let i = 0; i < parts.length - 1; i++) {
                if (remainingText) {
                    const textNode = document.createTextNode(remainingText);
                    node.parentNode.insertBefore(textNode, node);
                }
                
                // Create the keyword link
                const link = document.createElement('a');
                link.className = 'highlighted-keyword';
                link.textContent = keyword;
                
                const videoUrl = keywordVideoMap.get(keywordLower);
                link.href = videoUrl; // Add href attribute
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                
                // Add hover event to show tooltip
                link.addEventListener('mouseenter', (e) => {
                    tooltip.style.display = 'block';
                    tooltip.style.left = `${e.clientX + 10}px`;
                    tooltip.style.top = `${e.clientY + 10}px`;
                    tooltip.innerHTML = `
                        <div class="tooltip-content">
                            <p><strong>Video URL:</strong> ${videoUrl}</p>
                            <button onclick="playVideo('${videoUrl}')">Play Video</button>
                        </div>
                    `;
                });
                
                link.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });
                
                // Add click handler to play video
                link.onclick = (e) => {
                    e.preventDefault();
                    if (videoUrl) {
                        // Send message to content script to play the video
                        chrome.runtime.sendMessage({
                            action: 'playVideo',
                            videoUrl: videoUrl
                        });
                    }
                };
                
                node.parentNode.insertBefore(link, node);
                remainingText = parts[i + 1];
            }
            
            // Add the last part
            if (remainingText) {
                const textNode = document.createTextNode(remainingText);
                node.parentNode.insertBefore(textNode, node);
            }
            
            // Remove the original text node
            node.parentNode.removeChild(node);
        }
    }

    // Process all text nodes in the page
    function processTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            keywords.forEach(keyword => {
                wrapTextNodes(node, keyword);
            });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Skip certain elements
            if (['SCRIPT', 'STYLE', 'NAV', 'FOOTER', 'HEAD'].includes(node.tagName)) {
                return;
            }
            
            // Process child nodes
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
                processTextNodes(node.childNodes[i]);
            }
        }
    }

    // Start processing from the body
    processTextNodes(document.body);

    // Add styles for highlighted keywords and tooltip
    const style = document.createElement('style');
    style.textContent = `
        .highlighted-keyword {
            background-color: #ffffcc;
            color: #000;
            padding: 2px 4px;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            text-decoration: underline;
            font-weight: bold;
            display: inline-block;
        }
        
        .highlighted-keyword:hover {
            background-color: #ffcc00;
            transform: scale(1.05);
            box-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
        }

        .keyword-tooltip {
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
            pointer-events: none;
            font-family: Arial, sans-serif;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .tooltip-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .tooltip-content button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.3s;
        }

        .tooltip-content button:hover {
            background: #45a049;
        }

        .tooltip-content p {
            margin: 0;
            font-size: 14px;
        }

        .tooltip-content strong {
            color: #4CAF50;
        }
    `;
    document.head.appendChild(style);
}

// Add the playVideo function if it doesn't exist
if (!window.playVideo) {
    window.playVideo = function(videoUrl) {
        // Create or update an iframe for video playback
        let videoFrame = document.getElementById('keywordVideoFrame');
        if (!videoFrame) {
            videoFrame = document.createElement('iframe');
            videoFrame.id = 'keywordVideoFrame';
            videoFrame.style.position = 'fixed';
            videoFrame.style.top = '50%';
            videoFrame.style.left = '50%';
            videoFrame.style.transform = 'translate(-50%, -50%)';
            videoFrame.style.width = '80%';
            videoFrame.style.height = '80%';
            videoFrame.style.zIndex = '9999';
            videoFrame.style.border = 'none';
            videoFrame.style.borderRadius = '10px';
            videoFrame.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
            document.body.appendChild(videoFrame);
        }
        
        // Update the iframe source
        videoFrame.src = videoUrl;
        
        // Show the video frame
        videoFrame.style.display = 'block';
    };
}