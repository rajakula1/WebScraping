import asyncio
import json
import os
from datetime import datetime
from typing import Dict, List, Optional
import aiohttp
import openai
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl, Field
from keywords import KEYWORD_VIDEO_MAP
import re
from fastapi.responses import StreamingResponse
import aiofiles
import logging
import brotli

# Load environment variables
load_dotenv()

# Configure OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize FastAPI app
app = FastAPI(title="AI Web Scraper API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ScrapeRequest(BaseModel):
    url: HttpUrl = Field(description="URL to scrape and analyze")
    instructions: str = Field(
        default="""Please analyze the content and provide:
        1. Main topics or themes
        2. Key points or insights
        3. Any relevant data or statistics
        4. Overall summary
        """,
        description="Instructions for content analysis",
    )
    keywords: Optional[List[str]] = Field(
        default_factory=list, description="List of keywords to search for"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://example.com",
                "instructions": "Analyze this page for medical terms and related 3D animations",
                "keywords": ["heart", "lung", "brain"],
            }
        }


class ScrapeResponse(BaseModel):
    url: str
    timestamp: str
    status: str
    error: Optional[str] = None
    matchedKeywords: List[str] = []
    videoUrls: List[list] = []
    illustrationUrls: List[list] = []
    modelUrls: List[list] = []
    scripts: List[str] = []
    contentSummary: Optional[str] = None
    topics: Optional[List[str]] = None
    insights: Optional[List[str]] = None
    statistics: Optional[List[str]] = None


class BatchScrapeRequest(BaseModel):
    urls: List[HttpUrl]
    instructions: str = """
    Please analyze the content and provide:
    1. Main topics or themes
    2. Key points or insights
    3. Any relevant data or statistics
    4. Overall summary
    """


class AIScraper:
    def __init__(self):
        self.session = None
        self.results_dir = "scraped_results"
        os.makedirs(self.results_dir, exist_ok=True)

    async def init_session(self):
        """Initialize aiohttp session"""
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def close_session(self):
        """Close aiohttp session"""
        if self.session:
            await self.session.close()
            self.session = None

    async def fetch_page(self, url: str) -> Optional[str]:
        """Fetch webpage content with retry logic and better headers"""
        max_retries = 3
        retry_delay = 2  # seconds

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        }

        for attempt in range(max_retries):
            try:
                async with self.session.get(
                    url, headers=headers, timeout=30, raise_for_status=True
                ) as response:
                    if response.status == 200:
                        # Explicitly handle Brotli compression
                        content_encoding = response.headers.get(
                            "content-encoding", ""
                        ).lower()
                        if "br" in content_encoding:
                            return await response.text()
                        return await response.text()
                    elif response.status == 403:
                        print(
                            f"Access forbidden for {url}. Attempt {attempt + 1}/{max_retries}"
                        )
                        if attempt < max_retries - 1:
                            await asyncio.sleep(retry_delay * (attempt + 1))
                            continue
                    else:
                        print(f"Error fetching {url}: Status {response.status}")
                        return None
            except asyncio.TimeoutError:
                print(f"Timeout fetching {url}. Attempt {attempt + 1}/{max_retries}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (attempt + 1))
                    continue
            except Exception as e:
                print(f"Error fetching {url}: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay * (attempt + 1))
                    continue
                return None

        print(f"Failed to fetch {url} after {max_retries} attempts")
        return None

    def parse_content(self, html: str) -> str:
        """Parse HTML content and extract text"""
        soup = BeautifulSoup(html, "html.parser")

        # Remove unwanted elements
        for element in soup(["script", "style", "nav", "footer"]):
            element.decompose()

        # Extract text
        text = soup.get_text(separator="\n")

        # Clean up text
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)

    async def analyze_with_gpt(
        self, content: str, instructions: str, keywords: List[str]
    ) -> Dict:
        """Analyze content using GPT"""
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a web content analyzer. Analyze the provided content according to the instructions and provide matching keywords with associated 3D animations.",
                    },
                    {
                        "role": "user",
                        "content": f"Instructions: {instructions}\n\nContent: {content}\n\nKeywords: {', '.join(keywords)}",
                    },
                ],
                temperature=0.3,
                max_tokens=1000,
            )
            return {
                "status": "success",
                "analysis": response.choices[0].message.content,
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}

    def save_results(self, url: str, results: Dict):
        """Save analysis results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{self.results_dir}/analysis_{timestamp}.json"

        data = {"url": url, "timestamp": timestamp, "results": results}

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"Results saved to {filename}")

    async def process_url(
        self, url: str, instructions: str, keywords: List[str] = []
    ) -> Dict:
        """Process a single URL"""
        print(f"\nProcessing {url}...")
        print(f"Keywords: {keywords}")
        print(f"Instructions: {instructions}")

        try:
            # Fetch and parse content
            html = await self.fetch_page(url)
            if not html:
                print("Error: Failed to fetch content")
                return {
                    "url": url,
                    "status": "error",
                    "error": "Failed to fetch content",
                    "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
                }

            # Match keywords in content
            matched_keywords = []
            video_dicts = []
            illustration_dicts = []
            model_dicts = []
            scripts = []

            if not keywords:
                keywords = list(KEYWORD_VIDEO_MAP.keys())

            for keyword in keywords:
                keyword_lower = keyword.lower()
                if keyword_lower in [k.lower() for k in KEYWORD_VIDEO_MAP.keys()]:
                    original_keyword = next(
                        k
                        for k in KEYWORD_VIDEO_MAP.keys()
                        if k.lower() == keyword_lower
                    )
                    video_dicts.append(
                        KEYWORD_VIDEO_MAP[original_keyword].get("videos", [])
                    )
                    illustration_dicts.append(
                        KEYWORD_VIDEO_MAP[original_keyword].get("illustrations", [])
                    )
                    model_dicts.append(
                        KEYWORD_VIDEO_MAP[original_keyword].get("models", [])
                    )
                    scripts.append(
                        KEYWORD_VIDEO_MAP[original_keyword].get("script", "")
                    )
                    matched_keywords.append(original_keyword)
                else:
                    video_dicts.append([])
                    illustration_dicts.append([])
                    model_dicts.append([])
                    scripts.append("")

            print(f"Matched keywords: {matched_keywords}")
            print(f"Video URLs: {video_dicts}")
            print(f"Illustration URLs: {illustration_dicts}")
            print(f"Model URLs: {model_dicts}")

            # Analyze content
            results = await self.analyze_with_gpt(html, instructions, keywords)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            response = {
                "url": url,
                "timestamp": timestamp,
                "status": "success",
                "matchedKeywords": matched_keywords,
                "videoUrls": video_dicts,
                "illustrationUrls": illustration_dicts,
                "modelUrls": model_dicts,
                "scripts": scripts,
                "contentSummary": results.get("contentSummary"),
                "topics": results.get("topics"),
                "insights": results.get("insights"),
                "statistics": results.get("statistics"),
            }

            print(f"Response: {response}")

            if results["status"] == "success":
                self.save_results(url, results)

            return response

        except Exception as e:
            print(f"Error processing URL {url}: {str(e)}")
            print(f"Error type: {type(e)}")
            return {
                "url": url,
                "status": "error",
                "error": str(e),
                "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
            }


# API Routes
@app.on_event("startup")
async def startup_event():
    """Initialize the scraper on startup"""
    app.state.scraper = AIScraper()
    await app.state.scraper.init_session()


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown"""
    await app.state.scraper.close_session()


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest):
    """
    Scrape and analyze a single URL
    """
    try:
        keywords = (
            request.keywords if request.keywords else list(KEYWORD_VIDEO_MAP.keys())
        )
        result = await app.state.scraper.process_url(
            str(request.url), request.instructions, keywords
        )
        return ScrapeResponse(**result)
    except Exception as e:
        print(f"API Error: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail={"error": str(e), "message": "Failed to process request"},
        )


@app.post("/scrape/batch", response_model=List[ScrapeResponse])
async def scrape_urls(request: BatchScrapeRequest):
    """
    Scrape and analyze multiple URLs concurrently
    """
    try:
        tasks = [
            app.state.scraper.process_url(
                str(url), request.instructions, list(KEYWORD_VIDEO_MAP.keys())
            )
            for url in request.urls
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results and handle any exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"Error processing URL: {str(result)}")
                processed_results.append(
                    {
                        "url": str(request.urls[i]),
                        "status": "error",
                        "error": str(result),
                        "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
                    }
                )
            else:
                processed_results.append(result)

        return processed_results
    except Exception as e:
        print(f"Batch processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
