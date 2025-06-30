#!/usr/bin/env python3
"""
Test script to verify the mapping structure and data flow
"""

from keywords import KEYWORD_VIDEO_MAP


def test_mapping_structure():
    """Test the mapping structure to ensure it's correct"""
    print("Testing mapping structure...")

    # Test a few keywords
    test_keywords = ["Stroke", "Diabetes", "Breast Cancer"]

    for keyword in test_keywords:
        if keyword in KEYWORD_VIDEO_MAP:
            data = KEYWORD_VIDEO_MAP[keyword]
            print(f"\nKeyword: {keyword}")
            print(f"  Videos: {len(data.get('videos', []))} items")
            print(f"  Models: {len(data.get('models', []))} items")
            print(f"  Illustrations: {len(data.get('illustrations', []))} items")
            print(f"  Script: {len(data.get('script', ''))} characters")

            # Show first video
            if data.get("videos"):
                first_video = data["videos"][0]
                print(
                    f"  First video: {first_video.get('title', 'No title')} - {first_video.get('url', 'No URL')}"
                )

            # Show first illustration
            if data.get("illustrations"):
                first_illustration = data["illustrations"][0]
                print(
                    f"  First illustration: {first_illustration.get('title', 'No title')} - {first_illustration.get('url', 'No URL')}"
                )
        else:
            print(f"Keyword '{keyword}' not found in mapping")


def test_backend_simulation():
    """Simulate the backend logic to see what data would be returned"""
    print("\n\nSimulating backend response...")

    # Simulate the backend logic
    keywords = ["Stroke", "Diabetes"]
    matched_keywords = []
    video_dicts = []
    illustration_dicts = []
    model_dicts = []
    scripts = []

    for keyword in keywords:
        keyword_lower = keyword.lower()
        if keyword_lower in [k.lower() for k in KEYWORD_VIDEO_MAP.keys()]:
            original_keyword = next(
                k for k in KEYWORD_VIDEO_MAP.keys() if k.lower() == keyword_lower
            )
            video_dicts.append(KEYWORD_VIDEO_MAP[original_keyword].get("videos", []))
            illustration_dicts.append(
                KEYWORD_VIDEO_MAP[original_keyword].get("illustrations", [])
            )
            model_dicts.append(KEYWORD_VIDEO_MAP[original_keyword].get("models", []))
            scripts.append(KEYWORD_VIDEO_MAP[original_keyword].get("script", ""))
            matched_keywords.append(original_keyword)
        else:
            video_dicts.append([])
            illustration_dicts.append([])
            model_dicts.append([])
            scripts.append("")

    print(f"Matched keywords: {matched_keywords}")
    print(f"Video dicts: {video_dicts}")
    print(f"Illustration dicts: {illustration_dicts}")
    print(f"Model dicts: {model_dicts}")
    print(f"Scripts: {[len(s) for s in scripts]}")

    # Show structure of first video dict
    if video_dicts and video_dicts[0]:
        print(f"\nFirst video dict structure:")
        for i, video in enumerate(video_dicts[0]):
            print(f"  Video {i}: {video}")


if __name__ == "__main__":
    test_mapping_structure()
    test_backend_simulation()
