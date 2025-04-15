class VideoPlayer {
    constructor(videoUrl) {
        this.videoUrl = videoUrl;
        this.videoElement = document.createElement('video');
        this.setupVideoElement();
        this.setupControls();
    }

    setupVideoElement() {
        this.videoElement.setAttribute('controls', true);
        this.videoElement.setAttribute('width', '940');
        this.videoElement.setAttribute('height', '360');
        this.videoElement.src = this.videoUrl;
        this.videoElement.autoplay = false;
        this.videoElement.loop = false;
    }

    setupControls() {
        this.videoElement.addEventListener('play', () => {
            console.log('Video started playing');
        });

        this.videoElement.addEventListener('pause', () => {
            console.log('Video paused');
        });

        this.videoElement.addEventListener('ended', () => {
            console.log('Video ended');
        });

        this.videoElement.addEventListener('error', (event) => {
            console.error('Video error:', event);
        });
    }

    addToDOM(parentElement) {
        parentElement.appendChild(this.videoElement);
    }
}

// Function to highlight keywords in the webpage
async function highlightKeywords(url, keywords) {
    try {
        const response = await fetch('http://localhost:8000/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                keywords: keywords,
                instructions: "Analyze the content and provide matching keywords with associated 3D animations"
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Send the keywords and video URLs to the content script
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'highlightKeywords',
                    keywords: data.matchedKeywords,
                    videos: data.videoUrls
                });
            });
        }
    } catch (error) {
        console.error('Error highlighting keywords:', error);
    }
}

// Handle keyword input and highlighting
document.getElementById('highlightButton').addEventListener('click', async () => {
    const keywordsInput = document.getElementById('keywordsInput').value;
    const keywords = keywordsInput.split(',').map(k => k.trim());
    
    // Get the current tab URL
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const url = tabs[0].url;
        highlightKeywords(url, keywords);
    });
});

// Handle video playback
async function playVideo(videoUrl) {
    const videoContainer = document.getElementById('videoContainer');
    videoContainer.innerHTML = '';
    const videoPlayer = new VideoPlayer(videoUrl);
    videoPlayer.addToDOM(videoContainer);
}

// Fetch available videos from backend
async function fetchAvailableVideos() {
    try {
        const response = await fetch('http://localhost:8000/videos');
        const videos = await response.json();
        
        const videoList = document.getElementById('videoList');
        videoList.innerHTML = '';
        
        videos.forEach(video => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `http://localhost:8000/video/${video}`;
            a.textContent = video;
            a.target = '_blank';
            a.onclick = (e) => {
                e.preventDefault();
                // Create a new video player
                const videoContainer = document.getElementById('videoContainer');
                videoContainer.innerHTML = '';
                const videoPlayer = new VideoPlayer(a.href);
                videoPlayer.addToDOM(videoContainer);
            };
            li.appendChild(a);
            videoList.appendChild(li);
        });
    } catch (error) {
        console.error('Error fetching videos:', error);
        const videoList = document.getElementById('videoList');
        videoList.innerHTML = '<li>Error loading videos</li>';
    }
}

// Load videos when popup opens
window.addEventListener('load', fetchAvailableVideos);