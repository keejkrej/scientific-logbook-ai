import os
import re
import glob
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
import yaml

class LogbookParser:
    def __init__(self, logbook_dir: str = "logbooks"):
        self.logbook_dir = logbook_dir
        
    def parse_markdown_entry(self, file_path: str) -> Dict[str, Any]:
        """Parse a single markdown logbook entry"""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract frontmatter if it exists
        frontmatter = {}
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1])
                    content = parts[2].strip()
                except yaml.YAMLError:
                    pass
        
        # Extract metadata from frontmatter or filename/content
        author = frontmatter.get('author', self._extract_author_from_path(file_path))
        date = frontmatter.get('date', self._extract_date_from_path(file_path))
        # Ensure date is a string
        if hasattr(date, 'strftime'):
            date = date.strftime('%Y-%m-%d')
        elif not isinstance(date, str):
            date = str(date)
        title = frontmatter.get('title', self._extract_title_from_content(content))
        tags = frontmatter.get('tags', self._extract_tags_from_content(content))
        
        # Extract experiment details
        experiments = self._extract_experiments(content)
        results = self._extract_results(content)
        observations = self._extract_observations(content)
        
        return {
            "file_path": file_path,
            "author": author,
            "date": date,
            "title": title,
            "content": content,
            "tags": tags,
            "experiments": experiments,
            "results": results,
            "observations": observations
        }
    
    def _extract_author_from_path(self, file_path: str) -> str:
        """Extract author from file path convention"""
        path = Path(file_path)
        # Assume format: logbooks/author_name/date_entry.md
        if len(path.parts) >= 2:
            return path.parts[-2].replace('_', ' ').title()
        return "Unknown"
    
    def _extract_date_from_path(self, file_path: str) -> str:
        """Extract date from filename or use file modification time"""
        filename = Path(file_path).stem
        
        # Try to find date pattern in filename (YYYY-MM-DD)
        date_pattern = r'(\d{4}-\d{2}-\d{2})'
        match = re.search(date_pattern, filename)
        if match:
            return match.group(1)
        
        # Fall back to file modification time
        return datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d')
    
    def _extract_title_from_content(self, content: str) -> str:
        """Extract title from first heading or first line"""
        lines = content.strip().split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('# '):
                return line[2:].strip()
            elif line and not line.startswith('#'):
                return line[:50] + "..." if len(line) > 50 else line
        return "Untitled Entry"
    
    def _extract_tags_from_content(self, content: str) -> List[str]:
        """Extract tags from content (hashtags or tag sections)"""
        tags = []
        
        # Find hashtags
        hashtag_pattern = r'#(\w+)'
        hashtags = re.findall(hashtag_pattern, content)
        tags.extend(hashtags)
        
        # Find tag sections
        tag_section_pattern = r'(?:tags?|keywords?):\s*(.+)'
        tag_matches = re.findall(tag_section_pattern, content, re.IGNORECASE)
        for match in tag_matches:
            # Split by comma, semicolon, or space
            section_tags = re.split(r'[,;\s]+', match.strip())
            tags.extend([tag.strip() for tag in section_tags if tag.strip()])
        
        return list(set(tags))  # Remove duplicates
    
    def _extract_experiments(self, content: str) -> List[Dict[str, str]]:
        """Extract experiment descriptions from content"""
        experiments = []
        
        # Look for experiment sections
        exp_pattern = r'(?:## |### )?(?:experiment|exp|procedure|method)(?:\s+\d+)?:?\s*(.+?)(?=\n##|\n#|$)'
        matches = re.findall(exp_pattern, content, re.IGNORECASE | re.DOTALL)
        
        for i, match in enumerate(matches):
            experiments.append({
                "id": f"exp_{i+1}",
                "description": match.strip()
            })
        
        return experiments
    
    def _extract_results(self, content: str) -> List[Dict[str, str]]:
        """Extract results from content"""
        results = []
        
        # Look for results sections
        result_pattern = r'(?:## |### )?(?:results?|findings?|outcome)(?:\s+\d+)?:?\s*(.+?)(?=\n##|\n#|$)'
        matches = re.findall(result_pattern, content, re.IGNORECASE | re.DOTALL)
        
        for i, match in enumerate(matches):
            results.append({
                "id": f"result_{i+1}",
                "description": match.strip()
            })
        
        return results
    
    def _extract_observations(self, content: str) -> List[str]:
        """Extract observations or notes from content"""
        observations = []
        
        # Look for observation sections
        obs_pattern = r'(?:## |### )?(?:observations?|notes?|remarks?)(?:\s+\d+)?:?\s*(.+?)(?=\n##|\n#|$)'
        matches = re.findall(obs_pattern, content, re.IGNORECASE | re.DOTALL)
        
        for match in matches:
            observations.append(match.strip())
        
        return observations
    
    def parse_all_logbooks(self) -> List[Dict[str, Any]]:
        """Parse all markdown files in the logbook directory"""
        entries = []
        
        if not os.path.exists(self.logbook_dir):
            os.makedirs(self.logbook_dir)
            return entries
        
        # Find all markdown files
        pattern = os.path.join(self.logbook_dir, '**', '*.md')
        markdown_files = glob.glob(pattern, recursive=True)
        
        for file_path in markdown_files:
            try:
                entry = self.parse_markdown_entry(file_path)
                entries.append(entry)
            except Exception as e:
                print(f"Error parsing {file_path}: {e}")
                continue
        
        # Sort by date (newest first)
        entries.sort(key=lambda x: x['date'], reverse=True)
        return entries
    
    def save_entry(self, author: str, title: str, content: str, tags: List[str]) -> str:
        """Save a new logbook entry to a markdown file"""
        from datetime import datetime
        import re
        
        # Create author directory if it doesn't exist
        author_dir = os.path.join(self.logbook_dir, author.lower().replace(' ', '_'))
        os.makedirs(author_dir, exist_ok=True)
        
        # Generate filename with current date and sanitized title
        current_date = datetime.now().strftime('%Y-%m-%d')
        sanitized_title = re.sub(r'[^\w\s-]', '', title).strip()
        sanitized_title = re.sub(r'[-\s]+', '-', sanitized_title).lower()
        filename = f"{current_date}-{sanitized_title}.md"
        file_path = os.path.join(author_dir, filename)
        
        # Create YAML frontmatter
        frontmatter = f"""---
author: {author}
date: {current_date}
title: {title}
tags: {tags}
---

"""
        
        # Combine frontmatter and content
        full_content = frontmatter + content
        
        # Write to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(full_content)
        
        return file_path