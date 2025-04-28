// content.js
console.log('Content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'highlightKeywords') {
        console.log('Processing highlight request with keywords:', request.keywords);
        try {
            highlightKeywords(request.keywords, request.videos);
            sendResponse({status: 'success', message: 'Keywords highlighted successfully'});
        } catch (error) {
            console.error('Error in highlightKeywords:', error);
            sendResponse({status: 'error', error: error.message});
        }
        return true; // Keep the message channel open for async response
    }
});

function highlightKeywords(keywords, videos) {
    console.log('Starting highlightKeywords function');
    console.log('Keywords:', keywords);
    console.log('Videos:', videos);

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        console.log('No keywords to highlight');
        return;
    }

    // Create a mapping of keywords to videos
    const keywordVideoMap = new Map();
    keywords.forEach((keyword, index) => {
        keywordVideoMap.set(keyword.toLowerCase(), videos[index]);
    });
    console.log('Keyword-Video Map:', Object.fromEntries(keywordVideoMap));

    // Create a single tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'keyword-tooltip';
    tooltip.style.display = 'none';
    document.body.appendChild(tooltip);

    // Process all text nodes in the page
    function processTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (!text.trim()) return;

            // Process each keyword
            keywords.forEach(keyword => {
                const keywordLower = keyword.toLowerCase();
                const regex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
                
                if (regex.test(text)) {
                    console.log(`Found keyword "${keyword}" in text: "${text}"`);
                    try {
                        // Split text around the keyword
                        const parts = text.split(regex);
                        let remainingText = parts[0];
                        const parentNode = node.parentNode;
                        
                        // Create a span for each part and keyword
                        for (let i = 0; i < parts.length - 1; i++) {
                            if (remainingText) {
                                const textNode = document.createTextNode(remainingText);
                                parentNode.insertBefore(textNode, node);
                            }
                            
                            // Create the keyword link
                            const link = document.createElement('a');
                            link.className = 'highlighted-keyword';
                            link.textContent = keyword;
                            
                            const videoUrl = keywordVideoMap.get(keywordLower);
                            link.href = '#';
                            
                            // Add click handler to play video
                            link.onclick = (e) => {
                                e.preventDefault();
                                if (videoUrl) {
                                    console.log('Playing video:', videoUrl);
                                    playVideo(videoUrl);
                                }
                            };
                            
                            // Add hover event to show tooltip
                            link.addEventListener('mouseenter', (e) => {
                                tooltip.style.display = 'block';
                                tooltip.style.left = `${e.clientX + 10}px`;
                                tooltip.style.top = `${e.clientY + 10}px`;
                                tooltip.innerHTML = `
                                    <div class="tooltip-content">
                                        <p><strong>Click to play video</strong></p>
                                    </div>
                                `;
                            });
                            
                            link.addEventListener('mouseleave', () => {
                                tooltip.style.display = 'none';
                            });
                            
                            parentNode.insertBefore(link, node);
                            remainingText = parts[i + 1];
                        }
                        
                        // Add the last part
                        if (remainingText) {
                            const textNode = document.createTextNode(remainingText);
                            parentNode.insertBefore(textNode, node);
                        }
                        
                        // Remove the original text node
                        parentNode.removeChild(node);
                    } catch (error) {
                        console.error('Error processing keyword:', error);
                    }
                }
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
    console.log('Starting to process text nodes');
    processTextNodes(document.body);
    console.log('Finished processing text nodes');

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
            margin: 0 2px;
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
            transition: opacity 0.3s ease;
        }

        .tooltip-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .tooltip-content p {
            margin: 0;
            font-size: 14px;
        }

        .tooltip-content strong {
            color: #4CAF50;
        }

        #keywordVideoFrame {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            height: 90%;
            max-width: 1920px;
            max-height: 1080px;
            z-index: 9999;
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            background: transparent;
            transition: all 0.3s ease;
            opacity: 0;
            object-fit: contain;
            -webkit-backface-visibility: hidden;
            -webkit-transform: translateZ(0);
            backface-visibility: hidden;
            transform: translateZ(0);
        }

        #videoOverlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 9998;
            display: none;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(2px);
        }

        #closeVideo {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 68, 68, 0.9);
            color: white;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10000;
            display: none;
            transition: all 0.3s ease;
            font-size: 20px;
            text-align: center;
            line-height: 40px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        #closeVideo:hover {
            background: #cc0000;
            transform: scale(1.1);
        }

        /* Add styles for video controls */
        #keywordVideoFrame::-webkit-media-controls {
            background-color: rgba(0, 0, 0, 0.3);
        }

        #keywordVideoFrame::-webkit-media-controls-panel {
            background-color: rgba(0, 0, 0, 0.3);
        }

        /* Ensure video maintains aspect ratio and quality */
        #keywordVideoFrame video {
            width: 100%;
            height: 100%;
            object-fit: contain;
            -webkit-backface-visibility: hidden;
            -webkit-transform: translateZ(0);
            backface-visibility: hidden;
            transform: translateZ(0);
        }
    `;
    document.head.appendChild(style);
    console.log('Styles added to document');
}

// Add the playVideo function
function playVideo(videoUrl) {
    console.log('Playing video:', videoUrl);
    
    // Create overlay
    let overlay = document.getElementById('videoOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'videoOverlay';
        document.body.appendChild(overlay);
    }
    
    // Create close button
    let closeButton = document.getElementById('closeVideo');
    if (!closeButton) {
        closeButton = document.createElement('button');
        closeButton.id = 'closeVideo';
        closeButton.innerHTML = '✕';
        closeButton.onclick = () => {
            const videoFrame = document.getElementById('keywordVideoFrame');
            if (videoFrame) {
                // Pause the video
                videoFrame.pause();
                // Hide the video player with animation
                videoFrame.style.opacity = '0';
                videoFrame.style.transform = 'translate(-50%, -50%) scale(0.9)';
                setTimeout(() => {
                    videoFrame.style.display = 'none';
                    videoFrame.src = '';
                    // Reset video player styles
                    videoFrame.style.opacity = '1';
                    videoFrame.style.transform = 'translate(-50%, -50%) scale(1)';
                }, 300);
            }
            // Hide overlay with animation
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
                overlay.style.opacity = '1';
            }, 300);
            // Hide close button
            closeButton.style.display = 'none';
        };
        document.body.appendChild(closeButton);
    }
    
    // Create or update video frame
    let videoFrame = document.getElementById('keywordVideoFrame');
    if (!videoFrame) {
        videoFrame = document.createElement('video');
        videoFrame.id = 'keywordVideoFrame';
        videoFrame.controls = true;
        videoFrame.autoplay = true;
        videoFrame.playsInline = true;
        videoFrame.preload = 'auto';
        videoFrame.crossOrigin = 'anonymous';
        document.body.appendChild(videoFrame);
    }
    
    // Show video frame and overlay with animation
    videoFrame.src = videoUrl;
    videoFrame.style.display = 'block';
    videoFrame.style.opacity = '0';
    videoFrame.style.transform = 'translate(-50%, -50%) scale(0.9)';
    setTimeout(() => {
        videoFrame.style.opacity = '1';
        videoFrame.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);
    
    overlay.style.display = 'block';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 50);
    
    // Make sure close button is visible
    closeButton.style.display = 'block';
    closeButton.style.opacity = '1';
    
    // Add error handling
    videoFrame.onerror = (e) => {
        console.error('Error playing video:', e);
        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'white';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.padding = '20px';
        errorMessage.textContent = 'Error playing video. Please try again.';
        videoFrame.parentNode.insertBefore(errorMessage, videoFrame.nextSibling);
    };
}