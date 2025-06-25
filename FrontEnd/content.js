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
        keywordVideoMap.set(keyword.toLowerCase(), videos[index] || {});
        keywordIllustrationMap.set(keyword.toLowerCase(), illustrations[index] || {});
        keywordModelMap.set(keyword.toLowerCase(), models[index] || {});
    });
    
    console.log('Keyword-Video Map:', Object.fromEntries(keywordVideoMap));
    console.log('Keyword-Illustration Map:', Object.fromEntries(keywordIllustrationMap));
    console.log('Keyword-Model Map:', Object.fromEntries(keywordModelMap));

    // Create a single global tooltip element outside processTextNodes
    let globalTooltip = document.querySelector('.keyword-tooltip');
    if (!globalTooltip) {
        globalTooltip = document.createElement('div');
        globalTooltip.className = 'keyword-tooltip';
        globalTooltip.style.display = 'none';
        globalTooltip.style.position = 'absolute';
        globalTooltip.style.zIndex = '9999';
        document.body.appendChild(globalTooltip);
    }

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
                            
                            // Tooltip content for the three icons
                            const tooltipContent = document.createElement('div');
                            tooltipContent.className = 'keyword-tooltip-content';
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
                            tooltipContent.style.display = 'flex';
                            tooltipContent.style.gap = '20px';
                            // --- Video Icon ---
                            const videoIcon = document.createElement('img');
                            videoIcon.src = chrome.runtime.getURL('icons/Video.png');
                            videoIcon.alt = 'Videos';
                            videoIcon.title = 'Videos';
                            videoIcon.style.width = '32px';
                            videoIcon.style.height = '32px';
                            videoIcon.style.cursor = 'pointer';
                            videoIcon.style.display = 'inline-block';
                            videoIcon.style.marginRight = '8px';
                            videoIcon.style.verticalAlign = 'middle';
                            // Video submenu
                            const videoSubmenu = document.createElement('div');
                            videoSubmenu.className = 'submenu';
                            videoSubmenu.style.position = 'absolute';
                            videoSubmenu.style.left = '40px';
                            videoSubmenu.style.top = '0';
                            videoSubmenu.style.background = '#fff';
                            videoSubmenu.style.border = '1px solid #ccc';
                            videoSubmenu.style.padding = '8px 12px';
                            videoSubmenu.style.zIndex = '1001';
                            videoSubmenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                            videoSubmenu.style.display = 'none';
                            videoSubmenu.style.flexDirection = 'column';
                            videoSubmenu.style.gap = '8px';
                            // Populate video submenu
                            const videoDict = keywordVideoMap.get(keywordLower) || {};
                            Object.entries(videoDict).forEach(([label, url]) => {
                                const videoItem = document.createElement('div');
                                videoItem.className = 'submenu-item';
                                videoItem.textContent = label;
                                videoItem.style.cursor = 'pointer';
                                videoItem.style.color = '#007bff';
                                videoItem.style.padding = '4px 0';
                                videoItem.onclick = (e) => {
                                    e.preventDefault();
                                    if (url && url.startsWith('http')) {
                                        playVideoFromLink(url);
                                    } else if (url) {
                                        playVideoFromLink('https://bcove.video/' + url);
                                    }
                                };
                                videoSubmenu.appendChild(videoItem);
                            });
                            // Show/hide video submenu
                            videoIcon.addEventListener('mouseenter', () => {
                                videoSubmenu.style.display = 'flex';
                            });
                            videoIcon.addEventListener('mouseleave', () => {
                                setTimeout(() => { videoSubmenu.style.display = 'none'; }, 200);
                            });
                            videoSubmenu.addEventListener('mouseenter', () => {
                                videoSubmenu.style.display = 'flex';
                            });
                            videoSubmenu.addEventListener('mouseleave', () => {
                                videoSubmenu.style.display = 'none';
                            });
                            // --- Illustration Icon ---
                            const illustrationIcon = document.createElement('img');
                            illustrationIcon.src = chrome.runtime.getURL('icons/illustration.png');
                            illustrationIcon.alt = 'Illustrations';
                            illustrationIcon.title = 'Illustrations';
                            illustrationIcon.style.width = '32px';
                            illustrationIcon.style.height = '32px';
                            illustrationIcon.style.cursor = 'pointer';
                            illustrationIcon.style.display = 'inline-block';
                            illustrationIcon.style.marginRight = '8px';
                            illustrationIcon.style.verticalAlign = 'middle';
                            // Illustration submenu
                            const illustrationSubmenu = document.createElement('div');
                            illustrationSubmenu.className = 'submenu';
                            illustrationSubmenu.style.position = 'absolute';
                            illustrationSubmenu.style.left = '40px';
                            illustrationSubmenu.style.top = '40px';
                            illustrationSubmenu.style.background = '#fff';
                            illustrationSubmenu.style.border = '1px solid #ccc';
                            illustrationSubmenu.style.padding = '8px 12px';
                            illustrationSubmenu.style.zIndex = '1001';
                            illustrationSubmenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                            illustrationSubmenu.style.display = 'none';
                            illustrationSubmenu.style.flexDirection = 'column';
                            illustrationSubmenu.style.gap = '8px';
                            // Populate illustration submenu
                            const illustrationDict = keywordIllustrationMap.get(keywordLower) || {};
                            Object.entries(illustrationDict).forEach(([label, url]) => {
                                const illustrationItem = document.createElement('div');
                                illustrationItem.className = 'submenu-item';
                                illustrationItem.textContent = label;
                                illustrationItem.style.cursor = 'pointer';
                                illustrationItem.style.color = '#007bff';
                                illustrationItem.style.padding = '4px 0';
                                illustrationItem.onclick = (e) => {
                                    e.preventDefault();
                                    showImageFromLink(url);
                                };
                                illustrationSubmenu.appendChild(illustrationItem);
                            });
                            // Show/hide illustration submenu
                            illustrationIcon.addEventListener('mouseenter', () => {
                                illustrationSubmenu.style.display = 'flex';
                            });
                            illustrationIcon.addEventListener('mouseleave', () => {
                                setTimeout(() => { illustrationSubmenu.style.display = 'none'; }, 200);
                            });
                            illustrationSubmenu.addEventListener('mouseenter', () => {
                                illustrationSubmenu.style.display = 'flex';
                            });
                            illustrationSubmenu.addEventListener('mouseleave', () => {
                                illustrationSubmenu.style.display = 'none';
                            });
                            // --- Model Icon ---
                            const modelIcon = document.createElement('img');
                            modelIcon.src = chrome.runtime.getURL('icons/Model.png');
                            modelIcon.alt = 'Models';
                            modelIcon.title = 'Models';
                            modelIcon.style.width = '32px';
                            modelIcon.style.height = '32px';
                            modelIcon.style.cursor = 'pointer';
                            modelIcon.style.display = 'inline-block';
                            modelIcon.style.marginRight = '8px';
                            modelIcon.style.verticalAlign = 'middle';
                            // Model submenu
                            const modelSubmenu = document.createElement('div');
                            modelSubmenu.className = 'submenu';
                            modelSubmenu.style.position = 'absolute';
                            modelSubmenu.style.left = '40px';
                            modelSubmenu.style.top = '80px';
                            modelSubmenu.style.background = '#fff';
                            modelSubmenu.style.border = '1px solid #ccc';
                            modelSubmenu.style.padding = '8px 12px';
                            modelSubmenu.style.zIndex = '1001';
                            modelSubmenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                            modelSubmenu.style.display = 'none';
                            modelSubmenu.style.flexDirection = 'column';
                            modelSubmenu.style.gap = '8px';
                            // Populate model submenu
                            const modelDict = keywordModelMap.get(keywordLower) || {};
                            Object.entries(modelDict).forEach(([label, url]) => {
                                const modelItem = document.createElement('div');
                                modelItem.className = 'submenu-item';
                                modelItem.textContent = label;
                                modelItem.style.cursor = 'pointer';
                                modelItem.style.color = '#007bff';
                                modelItem.style.padding = '4px 0';
                                modelItem.onclick = (e) => {
                                    e.preventDefault();
                                    window.open(url, '_blank');
                                };
                                modelSubmenu.appendChild(modelItem);
                            });
                            // Show/hide model submenu
                            modelIcon.addEventListener('mouseenter', () => {
                                modelSubmenu.style.display = 'flex';
                            });
                            modelIcon.addEventListener('mouseleave', () => {
                                setTimeout(() => { modelSubmenu.style.display = 'none'; }, 200);
                            });
                            modelSubmenu.addEventListener('mouseenter', () => {
                                modelSubmenu.style.display = 'flex';
                            });
                            modelSubmenu.addEventListener('mouseleave', () => {
                                modelSubmenu.style.display = 'none';
                            });
                            // Add icons and submenus to tooltip
                            tooltipContent.appendChild(videoIcon);
                            tooltipContent.appendChild(videoSubmenu);
                            tooltipContent.appendChild(illustrationIcon);
                            tooltipContent.appendChild(illustrationSubmenu);
                            tooltipContent.appendChild(modelIcon);
                            tooltipContent.appendChild(modelSubmenu);
                            // Tooltip show/hide logic
                            let tooltipHideTimeout = null;
                            const showTooltip = () => {
                                if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
                                tooltipContent.style.display = 'block';
                                tooltipContent.style.visibility = 'visible';
                                tooltipContent.style.opacity = '1';
                                // Position tooltipContent below the keywordSpan
                                const rect = keywordSpan.getBoundingClientRect();
                                tooltipContent.style.left = '0px';
                                tooltipContent.style.top = `${keywordSpan.offsetHeight + 4}px`;
                            };
                            const hideTooltip = () => {
                                tooltipHideTimeout = setTimeout(() => {
                                    tooltipContent.style.opacity = '0';
                                    tooltipContent.style.visibility = 'hidden';
                                    setTimeout(() => {
                                        tooltipContent.style.display = 'none';
                                    }, 200);
                                }, 150);
                            };
                            keywordSpan.addEventListener('mouseenter', (e) => {
                                if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
                                showGlobalTooltip(
                                    keyword,
                                    keywordVideoMap.get(keywordLower) || {},
                                    keywordIllustrationMap.get(keywordLower) || {},
                                    keywordModelMap.get(keywordLower) || {},
                                    keywordSpan.getBoundingClientRect()
                                );
                            });
                            keywordSpan.addEventListener('mouseleave', (e) => {
                                tooltipHideTimeout = setTimeout(hideGlobalTooltip, 350);
                            });
                            globalTooltip.addEventListener('mouseenter', () => {
                                if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
                                globalTooltip.style.display = 'flex';
                            });
                            globalTooltip.addEventListener('mouseleave', () => {
                                tooltipHideTimeout = setTimeout(hideGlobalTooltip, 350);
                            });
                            
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
            background-color: transparent !important;
        }

        #keywordVideoFrame::-webkit-media-controls-panel {
            background-color: transparent !important;
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

// --- ROBUST GLOBAL TOOLTIP LOGIC ---
let globalTooltip = document.querySelector('.keyword-tooltip');
if (!globalTooltip) {
    globalTooltip = document.createElement('div');
    globalTooltip.className = 'keyword-tooltip';
    globalTooltip.style.display = 'none';
    globalTooltip.style.position = 'absolute';
    globalTooltip.style.zIndex = '9999';
    document.body.appendChild(globalTooltip);
}
let tooltipHideTimeout = null;

function createIconWithSubmenu(iconSrc, alt, title, dict, onClick) {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    // Icon
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL(iconSrc);
    icon.alt = alt;
    icon.title = title;
    icon.style.width = '32px';
    icon.style.height = '32px';
    icon.style.cursor = 'pointer';
    icon.style.display = 'inline-block';
    icon.style.marginRight = '8px';
    icon.style.verticalAlign = 'middle';
    // Submenu
    const submenu = document.createElement('div');
    submenu.className = 'submenu';
    submenu.style.position = 'absolute';
    submenu.style.left = '40px';
    submenu.style.top = '0';
    submenu.style.background = '#fff';
    submenu.style.border = '1px solid #ccc';
    submenu.style.padding = '8px 12px';
    submenu.style.zIndex = '1001';
    submenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    submenu.style.display = 'none';
    submenu.style.flexDirection = 'column';
    submenu.style.gap = '8px';
    Object.entries(dict).forEach(([label, url]) => {
        const item = document.createElement('div');
        item.className = 'submenu-item';
        item.textContent = label;
        item.style.cursor = 'pointer';
        item.style.color = '#007bff';
        item.style.padding = '4px 0';
        item.onclick = (e) => {
            e.preventDefault();
            onClick(url);
            hideGlobalTooltip();
        };
        submenu.appendChild(item);
    });
    // Robust submenu show/hide
    let submenuTimeout = null;
    icon.addEventListener('mouseenter', () => {
        if (submenuTimeout) clearTimeout(submenuTimeout);
        submenu.style.display = 'flex';
    });
    icon.addEventListener('mouseleave', () => {
        submenuTimeout = setTimeout(() => { submenu.style.display = 'none'; }, 250);
    });
    submenu.addEventListener('mouseenter', () => {
        if (submenuTimeout) clearTimeout(submenuTimeout);
        submenu.style.display = 'flex';
    });
    submenu.addEventListener('mouseleave', () => {
        submenuTimeout = setTimeout(() => { submenu.style.display = 'none'; }, 250);
    });
    wrapper.appendChild(icon);
    wrapper.appendChild(submenu);
    return wrapper;
}

function showGlobalTooltip(keyword, videoDict, illustrationDict, modelDict, rect) {
    if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
    globalTooltip.innerHTML = '';
    globalTooltip.style.display = 'flex';
    globalTooltip.style.flexDirection = 'row';
    globalTooltip.style.gap = '20px';
    globalTooltip.style.left = `${rect.left + window.scrollX}px`;
    globalTooltip.style.top = `${rect.bottom + window.scrollY + 4}px`;
    globalTooltip.style.visibility = 'visible';
    globalTooltip.style.opacity = '1';
    // Video icon and submenu
    const videoIcon = createIconWithSubmenu(
        'icons/Video.png',
        'Videos',
        'Videos',
        videoDict,
        (url) => {
            if (url && url.startsWith('http')) {
                playVideoFromLink(url);
            } else if (url) {
                playVideoFromLink('https://bcove.video/' + url);
            }
        }
    );
    // Illustration icon and submenu
    const illustrationIcon = createIconWithSubmenu(
        'icons/illustration.png',
        'Illustrations',
        'Illustrations',
        illustrationDict,
        (url) => showImageFromLink(url)
    );
    // Model icon and submenu
    const modelIcon = createIconWithSubmenu(
        'icons/Model.png',
        'Models',
        'Models',
        modelDict,
        (url) => window.open(url, '_blank')
    );
    globalTooltip.appendChild(videoIcon);
    globalTooltip.appendChild(illustrationIcon);
    globalTooltip.appendChild(modelIcon);
}

function hideGlobalTooltip() {
    globalTooltip.style.display = 'none';
    globalTooltip.style.visibility = 'hidden';
    globalTooltip.style.opacity = '0';
    globalTooltip.innerHTML = '';
}

function openImagePopup(imageUrl) {
    // Remove any existing image popup and overlay
    const existingPopup = document.getElementById('image-popup');
    const existingOverlay = document.getElementById('image-overlay');
    const existingCloseButton = document.getElementById('image-close-button');
    
    if (existingPopup) existingPopup.remove();
    if (existingOverlay) existingOverlay.remove();
    if (existingCloseButton) existingCloseButton.remove();

    // Create image popup container
    const popup = document.createElement('div');
    popup.id = 'image-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.width = '80%';
    popup.style.height = '80%';
    popup.style.zIndex = '10000';
    popup.style.backgroundColor = 'white';
    popup.style.padding = '0';
    popup.style.margin = '0';
    popup.style.display = 'flex';
    popup.style.justifyContent = 'center';
    popup.style.alignItems = 'center';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';

    // Create image element
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.style.backgroundColor = 'white';
    img.style.borderRadius = '8px';

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.id = 'image-close-button';
    closeButton.textContent = '×';
    closeButton.style.position = 'fixed';
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.style.background = 'white';
    closeButton.style.border = '2px solid black';
    closeButton.style.color = 'black';
    closeButton.style.fontSize = '32px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '60px';
    closeButton.style.height = '60px';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.zIndex = '10001';
    closeButton.style.transition = 'all 0.2s ease';
    closeButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    // Add hover effect
    closeButton.onmouseover = () => {
        closeButton.style.background = '#f0f0f0';
        closeButton.style.transform = 'scale(1.1)';
    };
    closeButton.onmouseout = () => {
        closeButton.style.background = 'white';
        closeButton.style.transform = 'scale(1)';
    };

    // Add semi-transparent overlay
    const overlay = document.createElement('div');
    overlay.id = 'image-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '9999';

    // Function to close everything
    const closeEverything = () => {
        popup.remove();
        closeButton.remove();
        overlay.remove();
    };

    // Add click handlers
    closeButton.onclick = closeEverything;
    overlay.onclick = closeEverything;

    // Assemble the popup
    popup.appendChild(img);
    document.body.appendChild(overlay);
    document.body.appendChild(closeButton);
    document.body.appendChild(popup);
}

function playVideo(videoUrl) {
    // Remove any existing video popup and overlay
    const existingPopup = document.getElementById('video-popup');
    const existingOverlay = document.getElementById('video-overlay');
    const existingCloseButton = document.getElementById('video-close-button');
    if (existingPopup) existingPopup.remove();
    if (existingOverlay) existingOverlay.remove();
    if (existingCloseButton) existingCloseButton.remove();

    // Create video popup container
    const popup = document.createElement('div');
    popup.id = 'video-popup';
    popup.style.position = 'fixed';
    popup.style.top = '0';
    popup.style.left = '0';
    popup.style.width = '100%';
    popup.style.height = '100%';
    popup.style.zIndex = '10000';
    popup.style.backgroundColor = 'white';
    popup.style.padding = '0';
    popup.style.margin = '0';
    popup.style.display = 'flex';
    popup.style.justifyContent = 'center';
    popup.style.alignItems = 'center';

    // Create video element
    const video = document.createElement('video');
    video.controls = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    video.style.backgroundColor = 'white';

    // Create source element
    const source = document.createElement('source');
    source.src = videoUrl;
    source.type = 'video/mp4';
    video.appendChild(source);

    // Add error handling
    video.onerror = (e) => {
        console.error('Video error:', e);
        const errorMessage = document.createElement('div');
        errorMessage.style.color = 'black';
        errorMessage.style.textAlign = 'center';
        errorMessage.style.padding = '20px';
        errorMessage.textContent = 'Error loading video. Please try again.';
        popup.appendChild(errorMessage);
    };

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.id = 'video-close-button';
    closeButton.textContent = '×';
    closeButton.style.position = 'fixed';
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.style.background = 'white';
    closeButton.style.border = '2px solid black';
    closeButton.style.color = 'black';
    closeButton.style.fontSize = '32px';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '60px';
    closeButton.style.height = '60px';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.zIndex = '10001';
    closeButton.style.transition = 'all 0.2s ease';
    closeButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

    // Add hover effect
    closeButton.onmouseover = () => {
        closeButton.style.background = '#f0f0f0';
        closeButton.style.transform = 'scale(1.1)';
    };
    closeButton.onmouseout = () => {
        closeButton.style.background = 'white';
        closeButton.style.transform = 'scale(1)';
    };

    // Add click handler
    closeButton.onclick = (e) => {
        e.stopPropagation(); // Prevent event from bubbling up
        video.pause();
        popup.remove();
        closeButton.remove();
    };

    // Add click handler to popup for closing
    popup.onclick = () => {
        video.pause();
        popup.remove();
        closeButton.remove();
    };

    // Assemble the popup
    popup.appendChild(video);
    document.body.appendChild(closeButton);
    document.body.appendChild(popup);

    // Start playing the video
    video.play().catch(error => {
        console.error('Error playing video:', error);
    });
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

function playVideoFromLink(videoUrl) {
    console.log('Opening video link:', videoUrl);
    window.open(videoUrl, '_blank');
}

function showImageFromLink(imageUrl) {
    console.log('Opening image link:', imageUrl);
    window.open(imageUrl, '_blank');
}