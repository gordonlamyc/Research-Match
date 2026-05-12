from flask import Flask, render_template, request, jsonify, session
import json
import os
from datetime import datetime, date

app = Flask(__name__)
app.secret_key = "researchmatch-um-fcsit-2026-secret"

# ─── Load Knowledge Base ────────────────────────────────────────────────────
KB_PATH = os.path.join(os.path.dirname(__file__), "knowledge_base", "lecturers.json")

def load_lecturers():
    """Load all lecturer profiles from the JSON knowledge base."""
    with open(KB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

# ─── Helper Maps ────────────────────────────────────────────────────────────
AREA_LABELS = {
    "machine_learning":     "Artificial Intelligence & Machine Learning",
    "nlp":                  "Natural Language Processing",
    "computer_vision":      "Computer Vision",
    "cybersecurity":        "Cybersecurity & Network Security",
    "hci":                  "Human-Computer Interaction (HCI)",
    "software_engineering": "Software Engineering",
    "data_science":         "Data Science & Analytics",
    "cloud_iot":            "Cloud Computing & IoT",
    "information_systems":  "Information Systems",
    "bioinformatics":       "Bioinformatics & Computational Biology",
}

LEVEL_MAP = {
    "undergraduate": "fyp",
    "masters":       "masters",
    "phd":           "phd",
    "researcher":    "masters",   # Junior researcher maps to masters slot
}

RESEARCH_TYPE_MAP = {
    "technical":  "technical",
    "development":"applied",
    "survey":     "survey",
    "industry":   "applied",
}

# ─── Inference Engine ────────────────────────────────────────────────────────
def run_inference(student: dict) -> list:
    """
    Forward-chaining rule-based scoring engine.
    Applies R01–R09 rules against every lecturer in the KB.
    Returns top-3 scored lecturers with reasons and confidence.
    """
    lecturers = load_lecturers()
    results = []

    # Normalise student inputs
    student_area     = student.get("research_area", "")
    student_level    = student.get("level", "undergraduate")       # undergraduate|masters|phd|researcher
    student_rtype    = student.get("research_type", "technical")   # technical|development|survey|industry
    needs_industry   = student.get("needs_industry", False)
    needs_funding    = student.get("needs_funding", False)
    expertise_needed = student.get("expertise_needed", "medium")   # low|medium|high (from slider)
    prefers_light    = student.get("prefers_light_load", False)

    # Determine the supervision slot key for this student's level
    slot_key = LEVEL_MAP.get(student_level, "fyp")

    print("\n" + "="*60)
    print("RESEARCHMATCH INFERENCE ENGINE — RULES FIRED")
    print("="*60)
    print(f"Student profile: area={student_area}, level={student_level}, "
          f"type={student_rtype}, industry={needs_industry}, "
          f"funding={needs_funding}, expertise={expertise_needed}, "
          f"light_load={prefers_light}")
    print("-"*60)

    for lec in lecturers:
        score = 0
        reasons = []
        fired_rules = []

        # ── R01: Primary area exact match ───────────────────────────────────
        # IF student's research area equals lecturer's primary_area
        # THEN score += 40
        if student_area == lec["primary_area"]:
            score += 40
            reasons.append({"rule": "R01", "text": "Exact primary research area match", "type": "positive"})
            fired_rules.append("R01")
            print(f"[{lec['id']}] R01 FIRED (+40): Primary area match '{student_area}'")

        # ── R02: Secondary area match ────────────────────────────────────────
        # IF student's area is in lecturer's research_areas (but not the primary)
        # THEN score += 20
        elif student_area in lec["research_areas"]:
            score += 20
            reasons.append({"rule": "R02", "text": "Related research area (secondary match)", "type": "positive"})
            fired_rules.append("R02")
            print(f"[{lec['id']}] R02 FIRED (+20): Secondary area match '{student_area}'")

        # ── R03: Availability — has open supervision slot ────────────────────
        # IF current_load[slot] < max_capacity[slot]
        # THEN score += 20
        current_slot = lec["current_load"].get(slot_key, 0)
        max_slot     = lec["max_capacity"].get(slot_key, 1)

        if current_slot < max_slot:
            score += 20
            reasons.append({"rule": "R03", "text": f"Has available {slot_key.upper()} supervision slot", "type": "positive"})
            fired_rules.append("R03")
            print(f"[{lec['id']}] R03 FIRED (+20): Slot available ({current_slot}/{max_slot})")

        # ── R04: Near capacity penalty ───────────────────────────────────────
        # IF current_load >= 80% of max_capacity across ALL student types
        # THEN score -= 15
        total_current = sum(lec["current_load"].values())
        total_max     = sum(lec["max_capacity"].values())
        load_ratio    = total_current / total_max if total_max > 0 else 1.0

        if load_ratio >= 0.8:
            score -= 15
            reasons.append({"rule": "R04", "text": "⚠ Near full capacity (limited availability)", "type": "negative"})
            fired_rules.append("R04")
            print(f"[{lec['id']}] R04 FIRED (-15): Near capacity ({load_ratio:.0%} full)")

        # ── R05: Student level preference ────────────────────────────────────
        # IF student's level is in lecturer's preferred_student_level
        # OR lecturer accepts "all" levels
        # THEN score += 10
        pref_levels = lec.get("preferred_student_level", [])
        if student_level in pref_levels or "all" in pref_levels:
            score += 10
            reasons.append({"rule": "R05", "text": f"Accepts {student_level.capitalize()} students", "type": "positive"})
            fired_rules.append("R05")
            print(f"[{lec['id']}] R05 FIRED (+10): Accepts level '{student_level}'")

        # ── R06: Industry connection ─────────────────────────────────────────
        # IF student needs industry links AND lecturer has industry_connections
        # THEN score += 15
        if needs_industry and lec.get("industry_connections", False):
            score += 15
            reasons.append({"rule": "R06", "text": "Has active industry connections", "type": "positive"})
            fired_rules.append("R06")
            print(f"[{lec['id']}] R06 FIRED (+15): Industry connections match")

        # ── R07: Grant/Funding availability ──────────────────────────────────
        # IF student needs funding AND lecturer has active_grants
        # THEN score += 10
        if needs_funding and lec.get("active_grants", False):
            score += 10
            reasons.append({"rule": "R07", "text": "Has active research grants", "type": "positive"})
            fired_rules.append("R07")
            print(f"[{lec['id']}] R07 FIRED (+10): Active grants match")

        # ── R08: Expertise level match ────────────────────────────────────────
        # IF student needs high expertise AND lecturer has high expertise_level
        # THEN score += 10
        if expertise_needed == "high" and lec.get("expertise_level") == "high":
            score += 10
            reasons.append({"rule": "R08", "text": "High specialisation level match", "type": "positive"})
            fired_rules.append("R08")
            print(f"[{lec['id']}] R08 FIRED (+10): High expertise match")
        elif expertise_needed == "medium" and lec.get("expertise_level") in ["medium", "high"]:
            score += 5
            reasons.append({"rule": "R08", "text": "Adequate specialisation level", "type": "positive"})
            fired_rules.append("R08")
            print(f"[{lec['id']}] R08 FIRED (+5): Medium expertise match")

        # ── R09: Light workload preference ───────────────────────────────────
        # IF student prefers lighter supervision load
        # AND lecturer's total load percentage < 50%
        # THEN score += 5
        if prefers_light and load_ratio < 0.5:
            score += 5
            reasons.append({"rule": "R09", "text": "Relatively light current workload", "type": "positive"})
            fired_rules.append("R09")
            print(f"[{lec['id']}] R09 FIRED (+5): Light load ({load_ratio:.0%})")

        # ── Data freshness check ──────────────────────────────────────────────
        stale_warning = False
        try:
            last_updated = datetime.strptime(lec["last_updated"], "%Y-%m-%d").date()
            days_old = (date.today() - last_updated).days
            if days_old > 60:
                stale_warning = True
        except Exception:
            stale_warning = True

        # ── Confidence label ──────────────────────────────────────────────────
        if score >= 80:
            confidence = "Strong Match"
            confidence_class = "strong"
        elif score >= 50:
            confidence = "Good Match"
            confidence_class = "good"
        elif score >= 25:
            confidence = "Partial Match"
            confidence_class = "partial"
        else:
            confidence = "Weak Match"
            confidence_class = "weak"

        # Clamp score to 0-100
        score = max(0, min(100, score))

        results.append({
            "lecturer":         lec,
            "score":            score,
            "confidence":       confidence,
            "confidence_class": confidence_class,
            "reasons":          reasons,
            "fired_rules":      fired_rules,
            "stale_warning":    stale_warning,
            "load_ratio":       round(load_ratio * 100),
            "slot_used":        current_slot,
            "slot_max":         max_slot,
            "area_label":       AREA_LABELS.get(lec["primary_area"], lec["primary_area"]),
        })

    # Sort by score descending, take top 3
    results.sort(key=lambda x: x["score"], reverse=True)
    top3 = results[:3]

    # ── R10: No strong match fallback ─────────────────────────────────────────
    # IF all top-3 scores < 25 THEN add global warning
    no_strong_match = all(r["score"] < 25 for r in top3)
    if no_strong_match:
        print("R10 FIRED: No strong match found — returning closest options with warning")

    print("="*60)
    for i, r in enumerate(top3, 1):
        print(f"  #{i} {r['lecturer']['name']} — Score: {r['score']} ({r['confidence']})")
    print("="*60 + "\n")

    return top3, no_strong_match


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Welcome / landing page."""
    return render_template("index.html")


@app.route("/match")
def match():
    """Multi-step questionnaire page."""
    areas = [{"key": k, "label": v} for k, v in AREA_LABELS.items()]
    return render_template("questionnaire.html", areas=areas)


@app.route("/results", methods=["POST"])
def results():
    """
    Receive form POST from questionnaire,
    run inference engine, render results page.
    """
    # Parse form inputs
    student = {
        "research_area":     request.form.get("research_area", ""),
        "research_topic":    request.form.get("research_topic", ""),
        "level":             request.form.get("level", "undergraduate"),
        "research_type":     request.form.get("research_type", "technical"),
        "needs_industry":    request.form.get("needs_industry") == "true",
        "needs_funding":     request.form.get("needs_funding") == "true",
        "expertise_needed":  request.form.get("expertise_needed", "medium"),
        "prefers_light_load":request.form.get("prefers_light_load") == "true",
    }

    top3, no_strong_match = run_inference(student)

    # Build human-readable summary of student's choices
    level_labels = {
        "undergraduate": "Undergraduate (FYP)",
        "masters":       "Master's Student",
        "phd":           "PhD Student",
        "researcher":    "Junior Researcher",
    }
    rtype_labels = {
        "technical":   "Pure Technical",
        "development": "System Development",
        "survey":      "Survey & Analysis",
        "industry":    "Industry Applied",
    }

    student_summary = {
        "research_area":  AREA_LABELS.get(student["research_area"], student["research_area"]),
        "research_topic": student["research_topic"] or "Not specified",
        "level":          level_labels.get(student["level"], student["level"]),
        "research_type":  rtype_labels.get(student["research_type"], student["research_type"]),
        "needs_industry": student["needs_industry"],
        "needs_funding":  student["needs_funding"],
        "expertise":      student["expertise_needed"].capitalize(),
        "prefers_light":  student["prefers_light_load"],
    }

    ranks = ["gold", "silver", "bronze"]

    return render_template(
        "results.html",
        results=top3,
        student=student_summary,
        no_strong_match=no_strong_match,
        ranks=ranks,
        area_labels=AREA_LABELS,
    )


@app.route("/explain/<lecturer_id>")
def explain(lecturer_id):
    """
    Return raw JSON explanation for a lecturer by ID.
    Useful for debugging / API access.
    """
    lecturers = load_lecturers()
    lec = next((l for l in lecturers if l["id"] == lecturer_id), None)
    if not lec:
        return jsonify({"error": "Lecturer not found"}), 404
    return jsonify(lec)


if __name__ == "__main__":
    print("\n" + "="*56)
    print("  ResearchMatch -- FCSIT UM Expert System")
    print("="*56 + "\n")
    app.run(host='0.0.0.0', debug=True, port=5000)
