/* ============================================================
   ResearchMatch — main.js
   Handles: particles, step navigation, toggles, slider,
            score animation, accordion, summary population
   ============================================================ */

'use strict';

/* -- 1. PARTICLE CANVAS BACKGROUND ---------------------------- */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];
  const COUNT = 60;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function randomParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1
    };
  }
  for (let i = 0; i < COUNT; i++) particles.push(randomParticle());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245,158,11,' + p.alpha + ')';
      ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        Object.assign(p, randomParticle());
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* -- 2. QUESTIONNAIRE STEP MACHINE ----------------------------- */
(function initQuestionnaire() {
  const form = document.getElementById('match-form');
  if (!form) return;   // not on questionnaire page

  let currentStep = 1;
  const totalSteps = 4;

  const stepPanels  = document.querySelectorAll('.step-panel');
  const stepNodes   = document.querySelectorAll('.step-node');
  const connectors  = document.querySelectorAll('.step-connector');
  const progressFill = document.getElementById('progress-fill');

  /* -- update UI for step change -- */
  function goToStep(n) {
    if (n < 1 || n > totalSteps) return;

    stepPanels.forEach(p => {
      const s = parseInt(p.dataset.step);
      if (s === currentStep) {
        p.classList.add('exit');
        setTimeout(() => { p.classList.remove('active', 'exit'); }, 300);
      }
    });

    setTimeout(() => {
      stepPanels.forEach(p => {
        if (parseInt(p.dataset.step) === n) {
          p.classList.add('active');
        }
      });
      updateIndicator(n);
      if (n === 4) populateSummary();
      currentStep = n;
    }, 310);

    // Progress bar
    if (progressFill) {
      progressFill.style.width = ((n / totalSteps) * 100) + '%';
      progressFill.setAttribute('aria-valuenow', Math.round((n / totalSteps) * 100));
    }
  }

  function updateIndicator(n) {
    stepNodes.forEach(node => {
      const s = parseInt(node.dataset.step);
      if (!s) return;
      node.classList.remove('active', 'completed');
      if (s === n) node.classList.add('active');
      else if (s < n) node.classList.add('completed');
    });
    connectors.forEach((conn, i) => {
      conn.classList.toggle('filled', i < n - 1);
    });
  }

  /* -- next / back buttons -- */
  document.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next);
      if (!validateStep(currentStep)) return;
      console.log('[ResearchMatch] Step ' + currentStep + ' validated ? going to step ' + next);
      goToStep(next);
    });
  });

  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      const prev = parseInt(btn.dataset.prev);
      goToStep(prev);
    });
  });

  /* -- validation -- */
  function validateStep(step) {
    if (step === 1) {
      const area = document.getElementById('research_area');
      if (!area || !area.value) {
        shakeElement(area);
        showFieldError(area, 'Please select a research area.');
        return false;
      }
    }
    if (step === 2) {
      const levelPicked = document.querySelector('input[name="level"]:checked');
      const typePicked  = document.querySelector('input[name="research_type"]:checked');
      if (!levelPicked) { shakeElement(document.getElementById('level-group')); return false; }
      if (!typePicked)  { shakeElement(document.getElementById('rtype-group')); return false; }
    }
    return true;
  }

  function shakeElement(el) {
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => { el.style.animation = ''; }, 400);
  }

  function showFieldError(el, msg) {
    if (!el) return;
    let err = el.parentElement.querySelector('.field-error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field-error';
      err.style.cssText = 'color:#ef4444;font-size:0.78rem;margin-top:0.35rem;';
      el.parentElement.appendChild(err);
    }
    err.textContent = msg;
    setTimeout(() => err.remove(), 3000);
  }

  /* -- form submit with spinner -- */
  form.addEventListener('submit', () => {
    const spinner = document.getElementById('submit-spinner');
    const btnText = document.querySelector('.btn-submit-text');
    const arrow   = document.querySelector('.btn-submit .btn-arrow');
    const btn     = document.getElementById('btn-submit');
    if (spinner) { spinner.classList.add('active'); }
    if (btnText) btnText.textContent = 'Finding matches…';
    if (arrow)   arrow.style.display = 'none';
    if (btn)     btn.disabled = true;
    console.log('[ResearchMatch] Submitting form to inference engine…');
  });

  /* -- character counter for textarea -- */
  const topic = document.getElementById('research_topic');
  const counter = document.getElementById('topic-char-count');
  if (topic && counter) {
    topic.addEventListener('input', () => {
      counter.textContent = topic.value.length;
    });
  }
})();

/* -- 3. TOGGLE SWITCHES ---------------------------------------- */
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const isOn    = btn.getAttribute('aria-checked') === 'true';
    const newVal  = !isOn;
    const field   = btn.dataset.field;
    const labelEl = document.getElementById('label-' + field.replace('needs_', '').replace('prefers_light_load', 'light'));

    btn.setAttribute('aria-checked', String(newVal));
    const hidden = document.getElementById('field-' + field);
    if (hidden) hidden.value = String(newVal);
    if (labelEl) labelEl.textContent = newVal ? 'Yes' : 'No';

    console.log('[ResearchMatch] Toggle ' + field + ' = ' + newVal);
  });
});

/* -- 4. EXPERTISE SLIDER --------------------------------------- */
(function initSlider() {
  const slider  = document.getElementById('expertise-slider');
  const display = document.getElementById('expertise-display');
  if (!slider || !display) return;

  const labels = { '1': 'General', '2': 'Moderate Specialisation', '3': 'Highly Specialised' };
  const values = { '1': 'low',     '2': 'medium',                  '3': 'high'               };

  function updateSlider() {
    const v = slider.value;
    display.textContent = labels[v];
    slider.name = 'expertise_needed';
    // Store the text value in the hidden input via name override
    slider.setAttribute('data-mapped', values[v]);
    // Re-map the actual submission value
    slider.value = v; // keep numeric for range input
    // Update gradient fill
    const pct = ((v - 1) / 2) * 100;
    slider.style.background =
      'linear-gradient(90deg, var(--gold) ' + pct + '%, var(--charcoal2) ' + pct + '%)';
    // Override name to send mapped string
    slider.setAttribute('name', 'expertise_needed');
  }

  slider.addEventListener('input', updateSlider);
  // On submit remap value
  const form = document.getElementById('match-form');
  if (form) {
    form.addEventListener('submit', () => {
      const map = { '1': 'low', '2': 'medium', '3': 'high' };
      slider.value = map[slider.value] || 'medium';
    }, { once: false });
  }
  updateSlider();
})();

/* -- 5. SUMMARY POPULATION (Step 4) --------------------------- */
function populateSummary() {
  const areaEl  = document.getElementById('research_area');
  const topicEl = document.getElementById('research_topic');
  const levelEl = document.querySelector('input[name="level"]:checked');
  const rtypeEl = document.querySelector('input[name="research_type"]:checked');

  const AREA_LABELS = {
    machine_learning:     'AI & Machine Learning',
    nlp:                  'Natural Language Processing',
    computer_vision:      'Computer Vision',
    cybersecurity:        'Cybersecurity',
    hci:                  'Human-Computer Interaction',
    software_engineering: 'Software Engineering',
    data_science:         'Data Science & Analytics',
    cloud_iot:            'Cloud Computing & IoT',
    information_systems:  'Information Systems',
    bioinformatics:       'Bioinformatics'
  };
  const LEVEL_LABELS = {
    undergraduate: 'Undergraduate (FYP)',
    masters:       "Master's Student",
    phd:           'PhD Student',
    researcher:    'Junior Researcher'
  };
  const RTYPE_LABELS = {
    technical:   'Pure Technical',
    development: 'System Development',
    survey:      'Survey & Analysis',
    industry:    'Industry Applied'
  };
  const EXPERTISE_LABELS = { '1': 'General', '2': 'Moderate', '3': 'Highly Specialised' };

  set('sum-area',     areaEl ? (AREA_LABELS[areaEl.value] || areaEl.value) : '—');
  set('sum-topic',    topicEl && topicEl.value.trim() ? topicEl.value.trim() : 'Not specified');
  set('sum-level',    levelEl ? (LEVEL_LABELS[levelEl.value] || levelEl.value) : '—');
  set('sum-rtype',    rtypeEl ? (RTYPE_LABELS[rtypeEl.value] || rtypeEl.value) : '—');
  set('sum-industry', getToggleVal('needs_industry'));
  set('sum-funding',  getToggleVal('needs_funding'));
  set('sum-light',    getToggleVal('prefers_light_load'));

  const slider = document.getElementById('expertise-slider');
  set('sum-expertise', slider ? (EXPERTISE_LABELS[slider.value] || slider.value) : '—');
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getToggleVal(field) {
  const hidden = document.getElementById('field-' + field);
  return hidden && hidden.value === 'true' ? 'Yes' : 'No';
}

/* -- 6. RESULTS PAGE ANIMATIONS ------------------------------- */
(function initResults() {
  const cards = document.querySelectorAll('.result-card');
  if (!cards.length) return;

  console.log('[ResearchMatch] Results page loaded — animating ' + cards.length + ' cards');

  // Staggered fade-up for cards
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('visible');
      // Animate score arc
      const arc   = card.querySelector('.score-arc');
      const numEl = card.querySelector('.score-num');
      const score = parseInt(card.dataset.score || '0');
      if (arc && numEl) {
        animateScore(arc, numEl, score);
      }
    }, 200 + i * 220);
  });
})();

function animateScore(arc, numEl, targetScore) {
  const circumference = 201; // 2 * PI * r(32) ˜ 201
  const target = (1 - targetScore / 100) * circumference;

  let current = circumference;
  let count = 0;
  const steps = 60;
  const delay = 16;

  const interval = setInterval(() => {
    count++;
    const progress = count / steps;
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    arc.style.strokeDashoffset = circumference - (circumference - target) * eased;
    numEl.textContent = Math.round(targetScore * eased);
    if (count >= steps) {
      clearInterval(interval);
      arc.style.strokeDashoffset = target;
      numEl.textContent = targetScore;
      console.log('[ResearchMatch] Score animated to ' + targetScore + '%');
    }
  }, delay);
}

/* -- 7. ACCORDION ---------------------------------------------- */
function toggleAccordion(lecId) {
  const body = document.getElementById('accordion-body-' + lecId);
  const btn  = body ? body.previousElementSibling : null;
  if (!body || !btn) return;

  const isOpen = !body.hidden;
  body.hidden = isOpen;
  btn.setAttribute('aria-expanded', String(!isOpen));
  console.log('[ResearchMatch] Accordion ' + lecId + ' ' + (isOpen ? 'closed' : 'opened'));
}

/* -- 8. SHAKE KEYFRAME (injected) ------------------------------- */
(function addShakeKeyframe() {
  const style = document.createElement('style');
  style.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}';
  document.head.appendChild(style);
})();

/* -- 9. EXPERTISE SLIDER SUBMIT FIX --------------------------- */
/* Remap numeric slider value to string before form submit */
(function fixSliderSubmit() {
  const form = document.getElementById('match-form');
  const slider = document.getElementById('expertise-slider');
  if (!form || !slider) return;
  const map = { '1': 'low', '2': 'medium', '3': 'high' };
  form.addEventListener('submit', function() {
    slider.value = map[slider.value] || 'medium';
  });
})();
