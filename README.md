# ResearchMatch — Lecturer Research Collaboration Matchmaker
### FCSIT, Universiti Malaya (UM)
**Course:** WID2001 Knowledge Representation & Reasoning

---

## Quick Start

### 1. Install dependency
`ash
pip install flask
`

### 2. Run the app
`ash
cd research_match
python app.py
`

### 3. Open in browser
`
http://localhost:5000
`

---

## Project Structure

`
research_match/
+-- app.py                        # Flask app + inference engine (rules R01-R10)
+-- knowledge_base/
¦   +-- lecturers.json            # KB — 10 FCSIT lecturer profiles
+-- templates/
¦   +-- index.html                # Welcome / landing page
¦   +-- questionnaire.html        # 4-step interactive form
¦   +-- results.html              # Top-3 ranked match results
+-- static/
¦   +-- css/style.css             # Full dark academic design system
¦   +-- js/main.js                # Particles, step navigation, animations
+-- README.md
`

---

## How the Inference Engine Works

The engine in pp.py uses **forward-chaining** rule-based scoring:

| Rule | Condition | Points |
|------|-----------|--------|
| R01 | Exact primary research area match | +40 |
| R02 | Secondary research area match | +20 |
| R03 | Available supervision slot | +20 |
| R04 | Near full capacity (=80%) | -15 |
| R05 | Accepts student's academic level | +10 |
| R06 | Has industry connections (if needed) | +15 |
| R07 | Has active grants (if needed) | +10 |
| R08 | Expertise level match | +5 to +10 |
| R09 | Light workload preference | +5 |
| R10 | Fallback if all scores < 25 | warning |

**Confidence labels:**
- = 80 ? Strong Match
- = 50 ? Good Match
- = 25 ? Partial Match
- < 25 ? Weak Match

---

## Adding New Lecturers

Edit knowledge_base/lecturers.json and add a new entry following this schema:

`json
{
  "id": "L011",
  "name": "Dr. Full Name",
  "title": "Lecturer | Senior Lecturer | Associate Professor | Professor",
  "email": "email@um.edu.my",
  "profile_url": "https://umexpert.um.edu.my/...",
  "research_areas": ["primary_area", "area2", "area3"],
  "primary_area": "primary_area",
  "expertise_level": "low | medium | high",
  "research_type": ["technical", "applied", "survey"],
  "publications": 0,
  "h_index": 0,
  "active_grants": true,
  "industry_connections": false,
  "current_load": { "fyp": 0, "masters": 0, "phd": 0 },
  "max_capacity":  { "fyp": 4, "masters": 3, "phd": 2 },
  "preferred_student_level": ["undergraduate", "masters", "phd"],
  "collaboration_style": "applied",
  "availability": "available | limited | unavailable",
  "last_updated": "YYYY-MM-DD"
}
`

**Valid research area keys:**
machine_learning, 
lp, computer_vision, cybersecurity,
hci, software_engineering, data_science, cloud_iot,
information_systems, ioinformatics

---

## Features

- Dark academic UI — Playfair Display + Inter fonts, gold/navy palette
- Animated floating particle background (canvas)
- 4-step questionnaire with radio cards, toggles, and slider
- Rule-based forward-chaining inference engine (10 rules)
- Top-3 ranked results with circular score indicator
- Expandable "Why this match?" accordion per result
- Data freshness warning (if last_updated > 60 days)
- Uncertainty notice when confidence < 60%
- Print/PDF export via window.print()
- Fully mobile responsive
- Zero external CSS frameworks
