import pandas as pd
import json

# Read the Excel file
df = pd.read_excel("mappings/BlausenIt_50Content_2025.xlsx")

print("Columns:", df.columns.tolist())
print("Shape:", df.shape)
print("\nFirst few rows:")
print(df.head())

print("\nColumn data types:")
print(df.dtypes)

print("\nSample data from each column:")
for col in df.columns:
    print(f"\n{col}:")
    print(df[col].head(3).tolist())

# Save as JSON for easier viewing
df.to_json("mappings/excel_data.json", orient="records", indent=2)
print("\nData saved to mappings/excel_data.json")

# Create a mapping of VIDEO ID to Brightcove Permalink for 3D animation videos
video_id_to_url = {}
for _, row in df.iterrows():
    video_id = row.get("VIDEO ID")
    brightcove_url = row.get("Brightcove Permalink")
    if pd.notna(video_id) and pd.notna(brightcove_url):
        video_id_to_url[str(video_id)] = brightcove_url


def get_videos(row):
    videos = []
    seen_titles = set()

    # Main video
    if pd.notna(row.get("Brightcove Permalink")):
        title = row.get("English Title", "")
        if title and title not in seen_titles:
            videos.append({"title": title, "url": row.get("Brightcove Permalink", "")})
            seen_titles.add(title)

    # Related videos (V1-V5)
    for i in range(1, 6):
        v_title = row.get(f"V{i} TITLE")
        v_id = row.get(f"V{i} ID")
        if pd.notna(v_title) and pd.notna(v_id) and v_title not in seen_titles:
            # Check if this is a 3D animation video (has a VIDEO ID)
            if str(v_id) in video_id_to_url:
                url = video_id_to_url[str(v_id)]
            else:
                # If the ID looks like a URL, use as is, else use bcove.video
                if str(v_id).startswith("http"):
                    url = v_id
                else:
                    url = f"https://bcove.video/{v_id}"

            videos.append({"title": v_title, "url": url})
            seen_titles.add(v_title)

    return videos


def get_models(row):
    models = []
    seen_titles = set()
    for i in range(1, 6):
        m_title = row.get(f"M{i} Title")
        m_link = row.get(f"M{i} Link")
        if pd.notna(m_title) and pd.notna(m_link) and m_title not in seen_titles:
            models.append({"title": m_title, "url": m_link})
            seen_titles.add(m_title)
    return models


def get_illustrations(row):
    illustrations = []
    for i in range(1, 6):
        i_title = row.get(f"I{i} TITLE")
        i_link = row.get(f"I{i} AWS Link")
        if pd.notna(i_title) and pd.notna(i_link):
            # Use the title as the key
            illustrations.append({"title": i_title, "url": i_link})
    return illustrations


mapping = {}
for _, row in df.iterrows():
    keyword = row.get("English Title", "").strip()
    if not keyword:
        continue
    mapping[keyword] = {
        "videos": get_videos(row),
        "models": get_models(row),
        "illustrations": get_illustrations(row),
        "script": row.get("English Script", "").strip(),  # Use 'script' as key
    }

# Write to keywords.py
with open("keywords.py", "w", encoding="utf-8") as f:
    f.write("# keywords.py\n")
    f.write("KEYWORD_VIDEO_MAP = ")
    json.dump(mapping, f, indent=4, ensure_ascii=False)
    f.write("\n")

print("keywords.py updated with new mapping structure.")
print(f"Total keywords: {len(mapping)}")
print(f"Video ID to URL mappings: {len(video_id_to_url)}")
