// content.js
console.log('Content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);
    
    if (request.action === 'highlightKeywords') {
        console.log('Processing highlight request with keywords:', request.keywords);
        try {
            highlightKeywords(request.keywords, request.videos, request.illustrations, request.models, request.scripts);
            sendResponse({status: 'success', message: 'Keywords highlighted successfully'});
        } catch (error) {
            console.error('Error in highlightKeywords:', error);
            sendResponse({status: 'error', error: error.message});
        }
        return true; // Keep the message channel open for async response
    }
});

function highlightKeywords(keywords, videos, illustrations, models, scripts) {
    console.log('Starting highlightKeywords function');
    console.log('Keywords:', keywords);
    console.log('Videos:', videos);
    console.log('Illustrations:', illustrations);
    console.log('Models:', models);
    console.log('Scripts:', scripts);

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        console.log('No keywords to highlight');
        return;
    }

    // Create mappings for each type of content
    const keywordVideoMap = new Map();
    const keywordIllustrationMap = new Map();
    const keywordModelMap = new Map();
    const keywordScriptMap = new Map();
    
    keywords.forEach((keyword, index) => {
        const videoData = videos[index] || [];
        const illustrationData = illustrations[index] || [];
        const modelData = models[index] || [];
        const scriptData = scripts[index] || "";
        
        console.log(`Mapping for keyword "${keyword}":`, {
            videoData,
            illustrationData,
            modelData,
            scriptDataLength: scriptData.length
        });
        
        keywordVideoMap.set(keyword.toLowerCase(), videoData);
        keywordIllustrationMap.set(keyword.toLowerCase(), illustrationData);
        keywordModelMap.set(keyword.toLowerCase(), modelData);
        keywordScriptMap.set(keyword.toLowerCase(), scriptData);
    });
    
    console.log('Keyword-Video Map:', Object.fromEntries(keywordVideoMap));
    console.log('Keyword-Illustration Map:', Object.fromEntries(keywordIllustrationMap));
    console.log('Keyword-Model Map:', Object.fromEntries(keywordModelMap));
    console.log('Keyword-Script Map:', Object.fromEntries(keywordScriptMap));

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
                            
                            // Tooltip show/hide logic
                            let tooltipHideTimeout = null;
                            
                            keywordSpan.addEventListener('mouseenter', (e) => {
                                if (tooltipHideTimeout) clearTimeout(tooltipHideTimeout);
                                showGlobalTooltip(
                                    keyword,
                                    keywordVideoMap.get(keywordLower) || [],
                                    keywordIllustrationMap.get(keywordLower) || [],
                                    keywordModelMap.get(keywordLower) || [],
                                    keywordScriptMap.get(keywordLower) || "",
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
            z-index: 1001;
            font-family: Arial, sans-serif;
            max-width: 300px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            transition: opacity 0.3s ease;
            backdrop-filter: blur(4px);
        }

        .tooltip-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .tooltip-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .tooltip-icon {
            width: 16px;
            height: 16px;
        }

        .tooltip-text {
            font-size: 12px;
        }

        .submenu {
            position: absolute;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1002;
            min-width: 200px;
            max-height: 300px;
            overflow-y: auto;
            padding: 8px 0;
        }

        .submenu-item {
            padding: 8px 12px;
            cursor: pointer;
            color: #333;
            border-bottom: 1px solid #eee;
            transition: background-color 0.2s ease;
            font-size: 14px;
            font-weight: 500;
            border-radius: 4px;
            margin: 0 4px;
        }

        .submenu-item:hover {
            background-color: #f0f8ff;
            color: #007bff;
        }

        .submenu-item:last-child {
            border-bottom: none;
        }
        
        .submenu-item:active {
            background-color: #e6f3ff;
            transform: scale(0.98);
        }
        
        /* Ensure submenus are above other elements */
        .submenu * {
            pointer-events: auto;
        }
        
        /* Prevent text selection on submenu items */
        .submenu-item {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        }
    `;
    document.head.appendChild(style);
}

function createIconWithSubmenu(iconSrc, alt, title, itemList, onClick) {
    console.log(`Creating icon for ${title}:`, itemList);
    
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'inline-block';
    
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
    
    const submenu = document.createElement('div');
    submenu.className = 'submenu';
    submenu.style.position = 'absolute';
    submenu.style.left = '40px';
    submenu.style.top = '0';
    submenu.style.background = '#fff';
    submenu.style.border = '1px solid #ccc';
    submenu.style.padding = '8px 12px';
    submenu.style.zIndex = '1002'; // Higher z-index
    submenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    submenu.style.display = 'none';
    submenu.style.flexDirection = 'column';
    submenu.style.gap = '8px';
    submenu.style.minWidth = '200px';
    submenu.style.borderRadius = '4px';
    submenu.style.maxHeight = '300px';
    submenu.style.overflowY = 'auto';
    
    // Function to adjust submenu position if it goes off-screen
    const adjustSubmenuPosition = () => {
        const rect = submenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Check if submenu goes off the right edge
        if (rect.right > viewportWidth - 10) {
            submenu.style.left = '-200px'; // Position to the left of the icon
        }
        
        // Check if submenu goes off the bottom edge
        if (rect.bottom > viewportHeight - 10) {
            submenu.style.top = '-100px'; // Position above the icon
        }
    };
    
    // Populate submenu with items from the array
    if (Array.isArray(itemList) && itemList.length > 0) {
        console.log(`Processing ${itemList.length} items for ${title}:`, itemList);
        itemList.forEach((item, index) => {
            console.log(`Item ${index}:`, item);
            const submenuItem = document.createElement('div');
            submenuItem.className = 'submenu-item';
            const itemTitle = item.title || item.name || 'Untitled';
            submenuItem.textContent = itemTitle;
            console.log(`Setting text content to: ${itemTitle}`);
            submenuItem.style.cursor = 'pointer';
            submenuItem.style.color = '#007bff';
            submenuItem.style.padding = '8px 12px';
            submenuItem.style.borderRadius = '4px';
            submenuItem.style.transition = 'background-color 0.2s ease';
            submenuItem.style.borderBottom = '1px solid #eee';
            submenuItem.style.fontSize = '14px';
            submenuItem.style.fontWeight = '500';
            
            // Hover effect
            submenuItem.addEventListener('mouseenter', () => {
                submenuItem.style.backgroundColor = '#f0f8ff';
            });
            submenuItem.addEventListener('mouseleave', () => {
                submenuItem.style.backgroundColor = 'transparent';
            });
            
            submenuItem.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent event bubbling
                const itemUrl = item.url || item.link || item;
                console.log(`Clicked on ${itemTitle}, URL: ${itemUrl}`);
                onClick(itemUrl);
                // Hide submenu after click
                submenu.style.display = 'none';
            };
            submenu.appendChild(submenuItem);
        });
        
        // Remove border from last item
        const lastItem = submenu.lastElementChild;
        if (lastItem) {
            lastItem.style.borderBottom = 'none';
        }
    } else {
        console.log(`No items available for ${title}`);
        const noItem = document.createElement('div');
        noItem.textContent = 'No items available';
        noItem.style.color = '#999';
        noItem.style.padding = '8px 12px';
        noItem.style.fontStyle = 'italic';
        submenu.appendChild(noItem);
    }
    
    // Improved show/hide logic with better timing
    let submenuTimeout = null;
    
    const showSubmenu = () => {
        if (submenuTimeout) {
            clearTimeout(submenuTimeout);
            submenuTimeout = null;
        }
        submenu.style.display = 'flex';
        submenu.style.opacity = '1';
        
        // Adjust position after showing
        setTimeout(adjustSubmenuPosition, 10);
    };
    
    const hideSubmenu = () => {
        submenuTimeout = setTimeout(() => {
            submenu.style.opacity = '0';
            setTimeout(() => {
                submenu.style.display = 'none';
                submenu.style.opacity = '1';
                // Reset position
                submenu.style.left = '40px';
                submenu.style.top = '0';
            }, 150);
        }, 300); // Increased delay to prevent accidental hiding
    };
    
    // Icon event listeners
    icon.addEventListener('mouseenter', showSubmenu);
    icon.addEventListener('mouseleave', hideSubmenu);
    
    // Submenu event listeners
    submenu.addEventListener('mouseenter', () => {
        if (submenuTimeout) {
            clearTimeout(submenuTimeout);
            submenuTimeout = null;
        }
    });
    submenu.addEventListener('mouseleave', hideSubmenu);
    
    // Prevent submenu from hiding when clicking inside it
    submenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    container.appendChild(icon);
    container.appendChild(submenu);
    return container;
}

function showGlobalTooltip(keyword, videoList, illustrationList, modelList, scriptText, rect) {
    console.log('showGlobalTooltip called with:', {
        keyword,
        videoList,
        illustrationList,
        modelList,
        scriptTextLength: scriptText ? scriptText.length : 0,
        rect
    });
    
    const globalTooltip = document.querySelector('.keyword-tooltip');
    if (!globalTooltip) return;
    
    globalTooltip.innerHTML = '';
    globalTooltip.style.display = 'flex';
    globalTooltip.style.flexDirection = 'row';
    globalTooltip.style.gap = '20px';
    globalTooltip.style.left = `${rect.left + window.scrollX}px`;
    globalTooltip.style.top = `${rect.bottom + window.scrollY + 4}px`;
    globalTooltip.style.visibility = 'visible';
    globalTooltip.style.opacity = '1';
    globalTooltip.style.zIndex = '1001'; // Lower than submenus
    globalTooltip.style.padding = '12px 16px';
    globalTooltip.style.borderRadius = '8px';
    globalTooltip.style.background = 'rgba(0, 0, 0, 0.9)';
    globalTooltip.style.backdropFilter = 'blur(4px)';
    
    // Video icon and submenu
    const videoIcon = createIconWithSubmenu(
        'icons/Video_Img.png',
        'Videos',
        'Videos',
        videoList,
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
        'icons/Illustration_Img.png',
        'Illustrations',
        'Illustrations',
        illustrationList,
        (url) => showImageFromLink(url)
    );
    
    // Model icon and submenu
    const modelIcon = createIconWithSubmenu(
        'icons/Model_Img.png',
        'Models',
        'Models',
        modelList,
        (url) => window.open(url, '_blank')
    );
    
    // Script icon
    const scriptIcon = document.createElement('img');
    scriptIcon.src = chrome.runtime.getURL('icons/Text_Img.png');
    scriptIcon.alt = 'Script';
    scriptIcon.title = 'Show Script';
    scriptIcon.style.width = '32px';
    scriptIcon.style.height = '32px';
    scriptIcon.style.cursor = 'pointer';
    scriptIcon.style.display = 'inline-block';
    scriptIcon.style.marginRight = '8px';
    scriptIcon.style.verticalAlign = 'middle';
    scriptIcon.style.transition = 'transform 0.2s ease';
    
    // Hover effect for script icon
    scriptIcon.addEventListener('mouseenter', () => {
        scriptIcon.style.transform = 'scale(1.1)';
    });
    scriptIcon.addEventListener('mouseleave', () => {
        scriptIcon.style.transform = 'scale(1)';
    });
    
    scriptIcon.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showScriptPopup(scriptText, keyword);
    };
    
    globalTooltip.appendChild(videoIcon);
    globalTooltip.appendChild(illustrationIcon);
    globalTooltip.appendChild(modelIcon);
    globalTooltip.appendChild(scriptIcon);
}

function hideGlobalTooltip() {
    const globalTooltip = document.querySelector('.keyword-tooltip');
    if (globalTooltip) {
        globalTooltip.style.display = 'none';
        globalTooltip.style.visibility = 'hidden';
        globalTooltip.style.opacity = '0';
        globalTooltip.innerHTML = '';
    }
}

function showImageFromLink(imageUrl) {
    console.log('Opening protected image viewer for:', imageUrl);
    
    // Remove any existing image popup and overlay
    const existingPopup = document.getElementById('protected-image-popup');
    const existingOverlay = document.getElementById('protected-image-overlay');
    const existingCloseButton = document.getElementById('protected-image-close-button');
    
    if (existingPopup) existingPopup.remove();
    if (existingOverlay) existingOverlay.remove();
    if (existingCloseButton) existingCloseButton.remove();

    // Create protected image popup container
    const popup = document.createElement('div');
    popup.id = 'protected-image-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.width = '90%';
    popup.style.height = '90%';
    popup.style.zIndex = '10000';
    popup.style.backgroundColor = 'white';
    popup.style.padding = '0';
    popup.style.margin = '0';
    popup.style.display = 'flex';
    popup.style.justifyContent = 'center';
    popup.style.alignItems = 'center';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    popup.style.overflow = 'hidden';

    // Create image container with protection
    const imageContainer = document.createElement('div');
    imageContainer.style.position = 'relative';
    imageContainer.style.width = '100%';
    imageContainer.style.height = '100%';
    imageContainer.style.display = 'flex';
    imageContainer.style.justifyContent = 'center';
    imageContainer.style.alignItems = 'center';
    imageContainer.style.background = 'white';
    imageContainer.style.overflow = 'hidden';

    // Create protected image element
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.style.objectFit = 'contain';
    img.style.backgroundColor = 'white';
    img.style.borderRadius = '8px';
    img.style.pointerEvents = 'none'; // Disable pointer events on image
    img.style.userSelect = 'none';
    img.style.webkitUserSelect = 'none';
    img.style.mozUserSelect = 'none';
    img.style.msUserSelect = 'none';
    
    // Disable right-click context menu
    img.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    // Disable drag and drop
    img.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
    });
    
    // Disable copy
    img.addEventListener('copy', (e) => {
        e.preventDefault();
        return false;
    });

    // Create transparent overlay to prevent interactions
    const protectionOverlay = document.createElement('div');
    protectionOverlay.style.position = 'absolute';
    protectionOverlay.style.top = '0';
    protectionOverlay.style.left = '0';
    protectionOverlay.style.width = '100%';
    protectionOverlay.style.height = '100%';
    protectionOverlay.style.backgroundColor = 'transparent';
    protectionOverlay.style.zIndex = '1';
    protectionOverlay.style.cursor = 'default';
    
    // Disable right-click on overlay
    protectionOverlay.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
    });
    
    // Disable drag and drop on overlay
    protectionOverlay.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
    });
    
    // Disable copy on overlay
    protectionOverlay.addEventListener('copy', (e) => {
        e.preventDefault();
        return false;
    });

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.id = 'protected-image-close-button';
    closeButton.textContent = '×';
    closeButton.style.position = 'fixed';
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.style.background = 'rgba(255, 68, 68, 0.9)';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
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
        closeButton.style.background = '#cc0000';
        closeButton.style.transform = 'scale(1.1)';
    };
    closeButton.onmouseout = () => {
        closeButton.style.background = 'rgba(255, 68, 68, 0.9)';
        closeButton.style.transform = 'scale(1)';
    };

    // Add semi-transparent overlay
    const overlay = document.createElement('div');
    overlay.id = 'protected-image-overlay';
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
    
    // Prevent closing when clicking on the image container
    imageContainer.onclick = (e) => {
        e.stopPropagation();
    };

    // Assemble the popup
    imageContainer.appendChild(img);
    imageContainer.appendChild(protectionOverlay);
    popup.appendChild(imageContainer);
    document.body.appendChild(overlay);
    document.body.appendChild(closeButton);
    document.body.appendChild(popup);
    
    // Add global protection
    const preventDownload = (e) => {
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            return false;
        }
        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            return false;
        }
    };
    
    document.addEventListener('keydown', preventDownload);
    
    // Remove event listener when closing
    const originalCloseEverything = closeEverything;
    closeEverything = () => {
        document.removeEventListener('keydown', preventDownload);
        originalCloseEverything();
    };
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

function showScriptPopup(text, keyword) {
    // Remove existing popup if any
    let existing = document.getElementById('script-popup-modal');
    if (existing) existing.remove();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'script-popup-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    // Content box
    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '32px';
    box.style.borderRadius = '8px';
    box.style.maxWidth = '600px';
    box.style.maxHeight = '80vh';
    box.style.overflowY = 'auto';
    box.style.boxShadow = '0 2px 16px rgba(0,0,0,0.3)';
    
    // Title
    const title = document.createElement('h2');
    title.textContent = keyword + ' - Script';
    title.style.marginTop = '0';
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginBottom = '16px';
    closeBtn.onclick = () => modal.remove();
    
    // Script text
    const textDiv = document.createElement('div');
    textDiv.style.whiteSpace = 'pre-wrap';
    textDiv.style.fontSize = '1.1em';
    textDiv.textContent = text;
    
    // Assemble
    box.appendChild(title);
    box.appendChild(closeBtn);
    box.appendChild(textDiv);
    modal.appendChild(box);
    document.body.appendChild(modal);
}