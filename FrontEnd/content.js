// content.js
console.log('Content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'highlightKeywords') {
        console.log('Processing highlight request with keywords:', request.keywords);
        try {
            highlightKeywords(request.keywords, request.videos, request.illustrations, request.models);
            sendResponse({status: 'success', message: 'Keywords highlighted successfully'});
        } catch (error) {
            console.error('Error in highlightKeywords:', error);
            sendResponse({status: 'error', error: error.message});
        }
        return true; // Keep the message channel open for async response
    }
});

function highlightKeywords(keywords, videos, illustrations, models) {
    console.log('Starting highlightKeywords function');
    console.log('Keywords:', keywords);
    console.log('Videos:', videos);
    console.log('Illustrations:', illustrations);
    console.log('Models:', models);

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        console.log('No keywords to highlight');
        return;
    }

    // Create mappings for each type of content
    const keywordVideoMap = new Map();
    const keywordIllustrationMap = new Map();
    const keywordModelMap = new Map();
    
    keywords.forEach((keyword, index) => {
        keywordVideoMap.set(keyword.toLowerCase(), videos[index]);
        keywordIllustrationMap.set(keyword.toLowerCase(), illustrations[index]);
        keywordModelMap.set(keyword.toLowerCase(), models[index]);
    });
    
    console.log('Keyword-Video Map:', Object.fromEntries(keywordVideoMap));
    console.log('Keyword-Illustration Map:', Object.fromEntries(keywordIllustrationMap));
    console.log('Keyword-Model Map:', Object.fromEntries(keywordModelMap));

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
                            
                            // Create the highlighted keyword element
                            const keywordSpan = document.createElement('span');
                            keywordSpan.className = 'highlighted-keyword';
                            keywordSpan.textContent = keyword;
                            keywordSpan.style.background = '#ffff99';
                            keywordSpan.style.cursor = 'pointer';
                            keywordSpan.style.position = 'relative';
                            
                            // Tooltip content for the three links
                            const tooltipContent = document.createElement('div');
                            tooltipContent.className = 'keyword-tooltip-content';
                            // Style the tooltip for better UX
                            tooltipContent.style.position = 'absolute';
                            tooltipContent.style.left = '0';
                            tooltipContent.style.top = '100%';
                            tooltipContent.style.marginTop = '4px';
                            tooltipContent.style.background = '#fff';
                            tooltipContent.style.border = '1px solid #ccc';
                            tooltipContent.style.padding = '8px 12px';
                            tooltipContent.style.zIndex = '1000';
                            tooltipContent.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                            tooltipContent.style.display = 'none';
                            tooltipContent.style.visibility = 'hidden';
                            tooltipContent.style.opacity = '0';
                            tooltipContent.style.transition = 'opacity 0.2s ease-in-out';
                            tooltipContent.style.whiteSpace = 'nowrap';
                            tooltipContent.style.borderRadius = '4px';
                            
                            // 3D Animation Video link
                            const videoLink = document.createElement('a');
                            const videoImg = document.createElement('img');
                            videoImg.src = chrome.runtime.getURL('icons/Video.png');
                            videoImg.alt = '3D Animation Video';
                            videoImg.title = '3D Animation Video';
                            videoImg.style.width = '24px';
                            videoImg.style.height = '24px';
                            videoImg.style.marginRight = '10px';
                            videoImg.style.verticalAlign = 'middle';
                            videoImg.style.display = 'inline-block';
                            videoLink.appendChild(videoImg);
                            const videoUrl = keywordVideoMap.get(keywordLower);
                            videoLink.href = '#';
                            videoLink.style.marginRight = '10px';
                            videoLink.style.color = '#007bff';
                            videoLink.style.textDecoration = 'none';
                            videoLink.style.display = 'inline-block';
                            videoLink.onclick = (e) => {
                                e.preventDefault();
                                if (videoUrl) {
                                    playVideo(videoUrl);
                                }
                            };
                            
                            // Illustration link
                            const illustrationLink = document.createElement('a');
                            const illustrationImg = document.createElement('img');
                            illustrationImg.src = chrome.runtime.getURL('icons/illustration.png');
                            illustrationImg.alt = 'Illustration';
                            illustrationImg.title = 'Illustration';
                            illustrationImg.style.width = '24px';
                            illustrationImg.style.height = '24px';
                            illustrationImg.style.marginRight = '10px';
                            illustrationImg.style.verticalAlign = 'middle';
                            illustrationImg.style.display = 'inline-block';
                            illustrationLink.appendChild(illustrationImg);
                            const illustrationUrl = keywordIllustrationMap.get(keywordLower);
                            illustrationLink.href = '#';
                            illustrationLink.style.marginRight = '10px';
                            illustrationLink.style.color = '#007bff';
                            illustrationLink.style.textDecoration = 'none';
                            illustrationLink.style.display = 'inline-block';
                            illustrationLink.onclick = (e) => {
                                e.preventDefault();
                                if (illustrationUrl) {
                                    openImagePopup(illustrationUrl);
                                }
                            };
                            
                            // Model link
                            const modelLink = document.createElement('a');
                            const modelImg = document.createElement('img');
                            modelImg.src = chrome.runtime.getURL('icons/Model.png');
                            modelImg.alt = 'Model';
                            modelImg.title = 'Model';
                            modelImg.style.width = '24px';
                            modelImg.style.height = '24px';
                            modelImg.style.marginRight = '10px';
                            modelImg.style.verticalAlign = 'middle';
                            modelImg.style.display = 'inline-block';
                            modelLink.appendChild(modelImg);
                            const modelUrl = keywordModelMap.get(keywordLower);
                            modelLink.href = modelUrl || '#';
                            modelLink.target = '_blank';
                            modelLink.rel = 'noopener noreferrer';
                            modelLink.style.color = '#007bff';
                            modelLink.style.textDecoration = 'none';
                            modelLink.style.display = 'inline-block';
                            
                            // Add links to tooltip content
                            tooltipContent.appendChild(videoLink);
                            tooltipContent.appendChild(illustrationLink);
                            tooltipContent.appendChild(modelLink);
                            
                            // Add some spacing between icons
                            tooltipContent.style.display = 'none';
                            tooltipContent.style.gap = '10px';
                            tooltipContent.style.alignItems = 'center';
                            tooltipContent.style.padding = '8px';
                            
                            // Attach tooltip to the keyword span
                            keywordSpan.appendChild(tooltipContent);
                            
                            // Updated tooltip show/hide logic with improved visibility control
                            let tooltipTimeout;
                            
                            const showTooltip = () => {
                                clearTimeout(tooltipTimeout);
                                tooltipContent.style.display = 'flex';
                                tooltipContent.style.visibility = 'visible';
                                tooltipContent.style.opacity = '1';
                            };
                            
                            const hideTooltip = () => {
                                tooltipTimeout = setTimeout(() => {
                                    tooltipContent.style.opacity = '0';
                                    tooltipContent.style.visibility = 'hidden';
                                    setTimeout(() => {
                                        tooltipContent.style.display = 'none';
                                    }, 200);
                                }, 150);
                            };
                            
                            keywordSpan.addEventListener('mouseenter', showTooltip);
                            keywordSpan.addEventListener('mouseleave', hideTooltip);
                            tooltipContent.addEventListener('mouseenter', showTooltip);
                            tooltipContent.addEventListener('mouseleave', hideTooltip);
                            
                            // Insert the highlighted keyword
                            parentNode.insertBefore(keywordSpan, node);
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
function openImagePopup(imageUrl) {
    // Remove any existing image popup and close button
    let imgPopup = document.getElementById('keywordImagePopup');
    if (imgPopup) imgPopup.parentNode.removeChild(imgPopup);
    let closeButton = document.getElementById('closeImage');
    if (closeButton) closeButton.parentNode.removeChild(closeButton);

    // Create image element
    imgPopup = document.createElement('img');
    imgPopup.id = 'keywordImagePopup';
    imgPopup.src = imageUrl;
    imgPopup.style.position = 'fixed';
    imgPopup.style.top = '50%';
    imgPopup.style.left = '50%';
    imgPopup.style.transform = 'translate(-50%, -50%)';
    imgPopup.style.zIndex = '99998';
    imgPopup.style.maxWidth = '90vw';
    imgPopup.style.maxHeight = '90vh';
    imgPopup.style.background = '#fff';
    imgPopup.style.borderRadius = '10px';
    imgPopup.style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)';
    imgPopup.style.padding = '8px';
    document.body.appendChild(imgPopup);

    // Create close button
    closeButton = document.createElement('button');
    closeButton.id = 'closeImage';
    closeButton.innerHTML = '✕';
    closeButton.onclick = () => {
        if (imgPopup) imgPopup.parentNode.removeChild(imgPopup);
        if (closeButton) closeButton.parentNode.removeChild(closeButton);
    };
    closeButton.style.position = 'fixed';
    closeButton.style.top = '24px';
    closeButton.style.right = '24px';
    closeButton.style.zIndex = '99999';
    closeButton.style.fontSize = '2rem';
    closeButton.style.background = '#fff';
    closeButton.style.color = '#000';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '48px';
    closeButton.style.height = '48px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.opacity = '1';
    document.body.appendChild(closeButton);
}

function playVideo(videoUrl) {
    console.log('Playing video:', videoUrl);
    
    // Remove any existing video player
    let videoFrame = document.getElementById('keywordVideoFrame');
    if (videoFrame) {
        videoFrame.parentNode.removeChild(videoFrame);
    }

    // Remove any existing close button
    let closeButton = document.getElementById('closeVideo');
    if (closeButton) {
        closeButton.parentNode.removeChild(closeButton);
    }

    // Create or update video frame
    videoFrame = document.createElement('video');
    videoFrame.id = 'keywordVideoFrame';
    videoFrame.controls = true;
    videoFrame.autoplay = true;
    videoFrame.playsInline = true;
    videoFrame.preload = 'auto';
    videoFrame.crossOrigin = 'anonymous';
    videoFrame.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        width: 1920px;
        height: 1080px;
        max-width: 100vw;
        max-height: 100vh;
        background: transparent;
        object-fit: contain;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        filter: brightness(1.1) contrast(1.05);
        -webkit-filter: brightness(1.1) contrast(1.05);
    `;
    document.body.appendChild(videoFrame);

    // Set video source with quality attributes
    const source = document.createElement('source');
    source.src = videoUrl;
    source.type = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    videoFrame.appendChild(source);

    // Set video quality attributes
    videoFrame.setAttribute('playsinline', '');
    videoFrame.setAttribute('webkit-playsinline', '');
    videoFrame.setAttribute('x5-playsinline', '');
    videoFrame.setAttribute('x5-video-player-type', 'h5');
    videoFrame.setAttribute('x5-video-player-fullscreen', 'true');
    videoFrame.setAttribute('x5-video-orientation', 'portraint');
    videoFrame.setAttribute('preload', 'auto');
    videoFrame.setAttribute('x-webkit-airplay', 'allow');

    // Show video frame with animation
    videoFrame.style.display = 'block';
    videoFrame.style.opacity = '0';
    videoFrame.style.transform = 'translate(-50%, -50%) scale(0.9)';
    setTimeout(() => {
        videoFrame.style.opacity = '1';
        videoFrame.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);

    // Create close button
    closeButton = document.createElement('button');
    closeButton.id = 'closeVideo';
    closeButton.innerHTML = '✕';
    closeButton.onclick = () => {
        if (videoFrame) {
            videoFrame.pause();
            videoFrame.parentNode.removeChild(videoFrame);
        }
        if (closeButton) {
            closeButton.parentNode.removeChild(closeButton);
        }
    };
    closeButton.style.cssText = `
        position: fixed;
        top: 40px;
        right: 40px;
        z-index: 99999;
        font-size: 2rem;
        background: #fff;
        color: #000;
        border: none;
        border-radius: 50%;
        width: 48px;
        height: 48px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 1;
    `;
    document.body.appendChild(closeButton);

    // Error handling
    videoFrame.onerror = (e) => {
        console.error('Error playing video:', e);
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        `;
        errorMessage.textContent = 'Error playing video. Please try again.';
        document.body.appendChild(errorMessage);
        
        setTimeout(() => {
            errorMessage.parentNode.removeChild(errorMessage);
            if (videoFrame) videoFrame.parentNode.removeChild(videoFrame);
            if (closeButton) closeButton.parentNode.removeChild(closeButton);
        }, 3000);
    };
}

function working_playVideo(videoUrl) {
    console.log('Playing video:', videoUrl);
    
    // Create overlay
   /* let overlay = document.getElementById('videoOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'videoOverlay';
        document.body.appendChild(overlay);
    } */
       
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
    
      
  //working
    videoFrame.style.display = 'block';
    videoFrame.style.opacity = '0';
    videoFrame.style.transform = 'translate(-50%, -50%) scale(0.9)';
    setTimeout(() => {
        videoFrame.style.opacity = '1';
        videoFrame.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);
    
   /*verlay.style.display = 'block';
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 50);*/
    
    // Create close button
   // Remove any existing close button
   let closeButton = document.getElementById('closeVideo');
   if (closeButton) {
       closeButton.parentNode.removeChild(closeButton);
   }
   
   // Create close button
   closeButton = document.createElement('button');
   closeButton.id = 'closeVideo';
   closeButton.innerHTML = '✕';
   closeButton.onclick = () => {
       const videoFrame = document.getElementById('keywordVideoFrame');
       if (videoFrame) {
           videoFrame.pause();
           videoFrame.parentNode.removeChild(videoFrame);
       }
       if (closeButton) {
           closeButton.parentNode.removeChild(closeButton);
       }
   };
   // Place the button in the top-right corner of the viewport for maximum visibility
   closeButton.style.position = 'fixed';
   closeButton.style.top = '40px';
   closeButton.style.right = '40px';
   closeButton.style.zIndex = '99999'; // Very high z-index
   closeButton.style.fontSize = '2rem';
   closeButton.style.background = '#fff';
   closeButton.style.color = '#000';
   closeButton.style.border = 'none';
   closeButton.style.borderRadius = '50%';
   closeButton.style.width = '48px';
   closeButton.style.height = '48px';
   closeButton.style.cursor = 'pointer';
   closeButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
   closeButton.style.display = 'flex';
   closeButton.style.alignItems = 'center';
   closeButton.style.justifyContent = 'center';
   closeButton.style.opacity = '1';
   
   // Append the close button after the video so it is always on top
   document.body.appendChild(closeButton);
    
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

function playVidee(videoUrl) {
    console.log('Playing video:', videoUrl);
    
    // Create overlay
   /* let overlay = document.getElementById('videoOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'videoOverlay';
        document.body.appendChild(overlay);
    } */
    
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
            //closeButton.style.display = 'none';
            closeButton.style.display = 'block';
            closeButton.style.opacity = '1';
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