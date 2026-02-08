import os
import datetime
import re

def slugify(text):
    # Convert to lowercase, remove non-alphanumeric chars, replace spaces with hyphens
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s]+', '-', text)
    return text

def create_project():
    print("=== DEVHUB PROJECT GENERATOR ===")
    
    # 1. Get Inputs
    title = input("Project Title (e.g. Super Nova): ").strip()
    if not title:
        print("Error: Title is required.")
        return

    description = input("Description: ").strip()
    
    print("\nCategory:")
    print("1. Game")
    print("2. Program")
    cat_choice = input("Select (1/2): ").strip()
    category = "game" if cat_choice == "1" else "program"
    
    image_url = input("\nMain Image URL (Optional): ").strip()
    link_url = input("Link/Repo URL (Optional): ").strip()
    
    print("\nContent (Markdown supported, leave empty to finish):")
    lines = []
    while True:
        line = input()
        if not line:
            break
        lines.append(line)
    content = "\n".join(lines)

    # 2. Prepare Data
    date_str = datetime.date.today().isoformat()
    filename = f"{date_str}-{slugify(title)}.md"
    filepath = os.path.join(os.getcwd(), "_projects", filename)
    
    # Handle Images block
    image_block = ""
    if image_url:
        image_block = f'image: "{image_url}"\nimages:\n  - "{image_url}"'

    # 3. Generate Content
    file_content = f"""---
layout: project
title: "{title}"
description: "{description}"
category: {category}
date: {date_str}
{image_block}
link: "{link_url}"
---

{content}
"""

    # 4. Write File
    # Ensure _projects exists
    os.makedirs(os.path.join(os.getcwd(), "_projects"), exist_ok=True)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(file_content)
        
    print(f"\n[SUCCESS] Project created at: {filepath}")
    print("Don't forget to restart Jekyll to see changes!")

if __name__ == "__main__":
    create_project()
