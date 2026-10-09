"""
Split the Markdown fact sheets in backend/knowledge/ into small pieces ("chunks").

Each "## Heading" section becomes one chunk, which keeps the species name,
the section name and the file's source list as metadata. Smaller pieces make
it easier to find exactly the right text for a question.
"""

import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from app import config
from app.invasive_list import load_invasive_list, normalize_name

GENERAL = "GENERAL"  # scientific_name for files that aren't about one species


@dataclass
class Chunk:
    chunk_id: str
    text: str
    scientific_name: str  # the name on the NY list, or GENERAL
    section: str
    sources: list = field(default_factory=list)  # [{"title": ..., "url": ...}]
    file: str = ""
    touch_safe: bool | None = None  # only set when the fact sheet's sources say so


def _listed_name(name):
    """Map any name or synonym to the official NY-list name, so a fact sheet can use either."""
    wanted = normalize_name(name)
    for row in load_invasive_list():
        if wanted in (normalize_name(n) for n in row["all_names"]):
            return row["scientific_name"]
    return name  # not on the list; keep as written


def _split_front_matter(text):
    """Return (header dict, body) for a file that starts with a --- YAML header ---."""
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", text, re.S)
    if not match:
        return {}, text
    return yaml.safe_load(match.group(1)) or {}, match.group(2)


def chunk_file(path):
    """All non-empty sections of one fact sheet, as Chunks."""
    header, body = _split_front_matter(Path(path).read_text())
    name = header.get("scientific_name")
    scientific_name = _listed_name(name) if name else GENERAL
    sources = [{"title": s.get("title", ""), "url": s.get("url", "")}
               for s in header.get("sources") or [] if s.get("url")]
    touch_safe = header.get("touch_safe") if isinstance(header.get("touch_safe"), bool) else None

    chunks = []
    # Split before every "## " heading; the first piece is any text above the first heading.
    for part in re.split(r"^## ", body, flags=re.M)[1:]:
        heading, _, text = part.partition("\n")
        # Drop <!-- notes --> (like the hints in _TEMPLATE.md) so they never reach the app.
        text = re.sub(r"<!--.*?-->", "", text, flags=re.S).strip()
        if not text:
            continue  # empty section = our sources don't cover it
        chunks.append(Chunk(
            chunk_id=f"{Path(path).stem}#{heading.strip().lower().replace(' ', '-')}",
            text=text,
            scientific_name=scientific_name,
            section=heading.strip(),
            sources=sources,
            file=Path(path).name,
            touch_safe=touch_safe,
        ))
    return chunks


def load_chunks(knowledge_dir=None):
    """Chunks from every .md file in knowledge/, skipping files that start with "_" (like _TEMPLATE.md)."""
    folder = Path(knowledge_dir or config.KNOWLEDGE_DIR)
    chunks = []
    for path in sorted(folder.glob("*.md")):
        if not path.name.startswith("_") and path.name.lower() != "readme.md":
            chunks.extend(chunk_file(path))
    return chunks
