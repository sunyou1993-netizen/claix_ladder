/**
 * Ghost Leg (사다리 타기) Core Engine
 * Portrait Signage Display - 1080x1920
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE ---
  let playerCount = 5;
  let resultCount = 1;
  let names = ['', '', '', '', ''];
  let results = ['', '', '', '', ''];
  let rungs = []; // Array of { level, fromCol, toCol }
  let tracingInProgress = false;
  let hasStartedEver = false;
  let matches = {}; // Map of playerIndex -> resultIndex

  // UI Colors
  const PRIMARY_COLOR = '#006CFF';
  const LINE_COLOR = '#CBD5E1';
  const TRACE_COLORS = [
    '#FF3B30', // Vibrant Red
    '#006CFF', // Deep Royal Blue
    '#10B981', // Sparkling Emerald Green
    '#F59E0B', // Glowing Amber
    '#8B5CF6', // Vivid Purple
    '#EC4899', // Radiant Pink
    '#06B6D4', // Cool Cyan
    '#F97316', // Bright Orange
    '#6366F1', // Indigo Purple
    '#14B8A6'  // Teal Green
  ];

  // --- SELECTORS ---
  const playerValEl = document.getElementById('player-count-value');
  const decreaseBtn = document.getElementById('btn-decrease-players');
  const increaseBtn = document.getElementById('btn-increase-players');
  const resultValEl = document.getElementById('result-count-value');
  const decreaseResultsBtn = document.getElementById('btn-decrease-results');
  const increaseResultsBtn = document.getElementById('btn-increase-results');
  const ladderArea = document.getElementById('ladder-area');
  
  const bottomResetBtn = document.getElementById('bottom-btn-reset');
  const bottomShowAllBtn = document.getElementById('bottom-btn-show-all');
  const bottomStartBtn = document.getElementById('bottom-btn-start');
  
  // Modals / Overlays
  const resultOverlay = document.getElementById('result-overlay');
  const resultModalTitle = document.getElementById('result-modal-title');
  const resultModalContent = document.getElementById('result-modal-content');
  const resultModalClose = document.getElementById('result-modal-close');
  const topResetBtn = document.getElementById('btn-top-reset');
  const btnHeaderBack = document.getElementById('btn-header-back');
  const btnHeaderClose = document.getElementById('btn-header-close');
 
  // --- INITIALIZATION ---
  initGame();
 
  function initGame() {
    updateStateFromInputs();
    generateLadderRungs();
    renderLadderUI();
    calculatePathMatches();
    setupEventHandlers();
  }
 
  // --- EVENT HANDLERS ---
  function setupEventHandlers() {
    // Stepper Handlers for Players
    decreaseBtn.addEventListener('click', () => {
      if (playerCount > 2) {
        playerCount--;
        adjustResultOptions();
        updateStateFromInputs();
        generateLadderRungs();
        renderLadderUI();
        calculatePathMatches();
      }
    });
 
    increaseBtn.addEventListener('click', () => {
      if (playerCount < 10) {
        playerCount++;
        adjustResultOptions();
        updateStateFromInputs();
        generateLadderRungs();
        renderLadderUI();
        calculatePathMatches();
      }
    });
 
    // Stepper Handlers for Results
    if (decreaseResultsBtn) {
      decreaseResultsBtn.addEventListener('click', () => {
        if (resultCount > 1) {
          resultCount--;
          updateResultsState();
        }
      });
    }
 
    if (increaseResultsBtn) {
      increaseResultsBtn.addEventListener('click', () => {
        if (resultCount < playerCount - 1) {
          resultCount++;
          updateResultsState();
        }
      });
    }
 
    function updateResultsState() {
      if (resultValEl) resultValEl.textContent = resultCount;
      autoPopulateResults();
      renderLadderUI();
      calculatePathMatches();
    }
 
    // Reset All Buttons
    const triggerReset = () => {
      if (tracingInProgress) return;
      hasStartedEver = false;
      names = [];
      results = [];
      for (let i = 0; i < playerCount; i++) {
        names.push("");
        results.push("");
      }
      generateLadderRungs();
      renderLadderUI();
      calculatePathMatches();
    };

    bottomResetBtn.addEventListener('click', triggerReset);
    if (topResetBtn) {
      topResetBtn.addEventListener('click', triggerReset);
    }

    // Show All Results
    bottomShowAllBtn.addEventListener('click', () => {
      showAllPairsModal();
    });

    // Start Game - Sequential Path Tracing
    bottomStartBtn.addEventListener('click', () => {
      if (tracingInProgress) return;

      // Validate empty inputs (names and results)
      const inputs = document.querySelectorAll('#ladder-area input');
      let hasBlank = false;

      // Reset previous error classes and styled properties first
      inputs.forEach(input => {
        input.classList.remove('border-red-500', 'ring-4', 'ring-red-100', 'animate-shake');
        input.style.borderColor = '';
        input.style.borderWidth = '';
        input.style.boxShadow = '';
        input.style.backgroundColor = '';
      });

      for (let i = 0; i < playerCount; i++) {
        const nameVal = (names[i] || '').trim();
        const resultVal = (results[i] || '').trim();

        const nameInputEl = inputs[i];
        const resultInputEl = inputs[playerCount + i];

        if (!nameVal) {
          hasBlank = true;
          if (nameInputEl) {
            nameInputEl.classList.add('border-red-500', 'ring-4', 'ring-red-100');
            nameInputEl.style.borderColor = '#ef4444';
            nameInputEl.classList.add('animate-shake');
            setTimeout(() => {
              nameInputEl.classList.remove('animate-shake');
            }, 500);
          }
        }
        if (!resultVal) {
          hasBlank = true;
          if (resultInputEl) {
            resultInputEl.classList.add('border-red-500', 'ring-4', 'ring-red-100');
            resultInputEl.style.borderColor = '#ef4444';
            resultInputEl.classList.add('animate-shake');
            setTimeout(() => {
              resultInputEl.classList.remove('animate-shake');
            }, 500);
          }
        }
      }

      if (hasBlank) {
        showToast('빈칸을 입력해주세요.');
        return;
      }

      startSequentialTracing();
    });

    // Hide Modal Overlay and stop confetti
    const closeResultModal = () => {
      resultOverlay.classList.remove('active');
      stopConfettiEffect();
    };

    resultModalClose.addEventListener('click', closeResultModal);

    resultOverlay.addEventListener('click', (e) => {
      if (e.target === resultOverlay || e.target.id === 'confetti-canvas') {
        closeResultModal();
      }
    });

    // Header Back & Close interactive responses
    if (btnHeaderBack) {
      btnHeaderBack.addEventListener('click', () => {
        // Soft reset or clear current overlays
        closeResultModal();
        triggerReset();
      });
    }

    if (btnHeaderClose) {
      btnHeaderClose.addEventListener('click', () => {
        // Close modal first if open, else trigger reset feedback
        if (resultOverlay.classList.contains('active')) {
          closeResultModal();
        } else {
          triggerReset();
        }
      });
    }
  }

  // --- LOGIC FUNCTIONS ---
  function adjustResultOptions() {
    // Handle case where resultCount is now invalid
    if (resultCount >= playerCount) {
      resultCount = playerCount - 1;
      if (resultCount < 1) resultCount = 1;
    }
    if (resultValEl) resultValEl.textContent = resultCount;
  }

  function updateStateFromInputs() {
    playerValEl.textContent = playerCount;
    if (resultValEl) resultValEl.textContent = resultCount;
    
    // Scale or fill name lists
    const newNames = [];
    for (let i = 0; i < playerCount; i++) {
      newNames.push(names[i] || "");
    }
    names = newNames;

    autoPopulateResults();
  }

  function autoPopulateResults() {
    // Set 1 or X elements to '당첨' and the remaining to '꽝'
    const newResults = [];
    for (let i = 0; i < playerCount; i++) {
      if (i < resultCount) {
        newResults.push(results[i] || "");
      } else {
        newResults.push(results[i] || "");
      }
    }
    results = newResults;
  }

  // Generate fair, mathematically accurate Ladder rungs
  function generateLadderRungs() {
    rungs = [];
    const tempRungs = [];
    const TOTAL_LEVELS = 6;

    for (let lvl = 0; lvl < TOTAL_LEVELS; lvl++) {
      // Randomly step columns
      for (let col = 0; col < playerCount - 1; col++) {
        // Enforce alternating rule: don't place rung on next column if this level has one directly to the left.
        // This ensures fully valid and single-path logic
        if (Math.random() > 0.45) {
          // Check if previous col has a rung on this exact level
          const hasLeftOverlap = tempRungs.some(r => r.lvl === lvl && r.col === col - 1);
          if (!hasLeftOverlap) {
            tempRungs.push({ lvl, col });
          }
        }
      }
    }

    // Convert levels to actual ratios on vertical spacing (say 0.15 to 0.85)
    rungs = tempRungs.map(tr => {
      const levelRatio = 0.15 + (tr.lvl + 1) * (0.7 / 7);
      return {
        level: levelRatio,
        fromCol: tr.col,
        toCol: tr.col + 1
      };
    });

    // Sort rungs vertically by level so trace operations are reliable
    rungs.sort((a, b) => a.level - b.level);
  }

  // Mathematical single player path routing
  function tracePathForPlayer(playerIndex) {
    const points = [];
    let currCol = playerIndex;
    
    // Width and height details matching SVG container
    const svgWidth = 920; 
    const leftMargin = 80;
    const rightMargin = 80;
    const colInterval = (svgWidth - leftMargin - rightMargin) / (playerCount - 1);
    
    const startY = 112;
    const endY = 708;

    const getX = (col) => leftMargin + col * colInterval;

    // Start coordinate
    points.push({ x: getX(currCol), y: startY });

    // Walk through sorted rungs
    rungs.forEach(rung => {
      const rungY = startY + rung.level * (endY - startY);

      if (rung.fromCol === currCol) {
        // Move down to rung intersection
        points.push({ x: getX(currCol), y: rungY });
        // Travel right
        currCol = rung.toCol;
        points.push({ x: getX(currCol), y: rungY });
      } else if (rung.toCol === currCol) {
        // Move down to rung intersection
        points.push({ x: getX(currCol), y: rungY });
        // Travel left
        currCol = rung.fromCol;
        points.push({ x: getX(currCol), y: rungY });
      }
    });

    // End coordinate
    points.push({ x: getX(currCol), y: endY });

    return {
      points,
      destinationCol: currCol
    };
  }

  function calculatePathMatches() {
    matches = {};
    for (let i = 0; i < playerCount; i++) {
      const pathInfo = tracePathForPlayer(i);
      matches[i] = pathInfo.destinationCol;
    }
  }

  // --- RENDER DYNAMICS ---
  function renderLadderUI() {
    // Width and layout spacing constraints
    const svgWidth = 920; 
    const svgHeight = 820;

    const leftMargin = 80;
    const rightMargin = 80;
    const colInterval = (svgWidth - leftMargin - rightMargin) / (playerCount - 1);

    const getX = (col) => leftMargin + col * colInterval;
    const getXPercent = (col) => (getX(col) / svgWidth) * 100;
    const getYPercent = (yVal) => (yVal / svgHeight) * 100;

    // Clear dynamic container elements
    ladderArea.innerHTML = '';

    // Create wrapper absolute overlay with matching height to support precise input alignment
    const inputsOverlay = document.createElement('div');
    inputsOverlay.className = 'absolute top-0 left-0 w-full h-[820px] pointer-events-none z-10';

    // Adaptively scale pill width and font size to prevent overlapping up to 10 players
    const pillWidth = Math.min(130, Math.floor(colInterval * 0.9));
    const pillWidthPercent = (pillWidth / svgWidth) * 100;
    const fontSize = playerCount > 7 ? '20px' : '24px';
    const paddingX = playerCount > 7 ? '0px' : '8px';

    // Render Input Fields (Names & Results)
    const nameInputs = [];
    const resultInputs = [];

    for (let i = 0; i < playerCount; i++) {
      // Name (Top Input)
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'absolute shadow-xs border border-slate-200 focus:border-blue-500 font-semibold text-center rounded-[28px] pointer-events-auto bg-white transition-all text-slate-800 focus:bg-blue-50 focus:scale-105';
      nameInput.style.width = `${pillWidthPercent}%`;
      nameInput.style.height = '104px';
      nameInput.style.fontSize = fontSize;
      nameInput.style.left = `${getXPercent(i)}%`;
      nameInput.style.top = `${getYPercent(60)}%`;
      nameInput.style.transform = 'translate(-50%, -50%)';
      nameInput.style.padding = `0 ${paddingX}`;
      nameInput.placeholder = '✎';
      nameInput.value = names[i] || '';
      nameInput.dataset.index = i;
      nameInput.addEventListener('input', (e) => {
        names[e.target.dataset.index] = e.target.value;
        if (e.target.value.trim() !== '') {
          e.target.classList.remove('border-red-500', 'ring-4', 'ring-red-100');
          e.target.style.borderColor = '';
        }
      });
      nameInputs.push(nameInput);

      // Result (Bottom Input)
      const resultInput = document.createElement('input');
      resultInput.type = 'text';
      resultInput.className = 'absolute shadow-xs border border-slate-200 focus:border-blue-500 font-semibold text-center rounded-[28px] pointer-events-auto bg-white transition-all text-slate-800 focus:bg-blue-50 focus:scale-105';
      resultInput.style.width = `${pillWidthPercent}%`;
      resultInput.style.height = '104px';
      resultInput.style.fontSize = fontSize;
      resultInput.style.left = `${getXPercent(i)}%`;
      resultInput.style.top = `${getYPercent(760)}%`;
      resultInput.style.transform = 'translate(-50%, -50%)';
      resultInput.style.padding = `0 ${paddingX}`;
      resultInput.placeholder = '✎';
      resultInput.value = results[i] || '';
      resultInput.dataset.index = i;
      resultInput.addEventListener('input', (e) => {
        results[e.target.dataset.index] = e.target.value;
        if (e.target.value.trim() !== '') {
          e.target.classList.remove('border-red-500', 'ring-4', 'ring-red-100');
          e.target.style.borderColor = '';
        }
      });
      resultInputs.push(resultInput);
    }

    // Append all tops first, then all bottoms to maintain consistent DOM order index mapping
    nameInputs.forEach(input => inputsOverlay.appendChild(input));
    resultInputs.forEach(input => inputsOverlay.appendChild(input));

    // Create the Main SVG Area
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'w-full h-[820px] bg-white rounded-2xl');
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.overflow = 'visible';

    // 1. Draw Rungs (Horizontal bridges) grouped together
    const rungsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    rungsGroup.setAttribute('id', 'rungs-group-layer');
    if (!hasStartedEver) {
      rungsGroup.style.display = 'none';
    } else {
      rungsGroup.style.display = 'block';
    }

    rungs.forEach(rung => {
      const fromX = getX(rung.fromCol);
      const toX = getX(rung.toCol);
      const yVal = 112 + rung.level * 596;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fromX);
      line.setAttribute('y1', yVal);
      line.setAttribute('x2', toX);
      line.setAttribute('y2', yVal);
      line.setAttribute('stroke', LINE_COLOR);
      line.setAttribute('stroke-width', '6');
      line.setAttribute('stroke-linecap', 'round');
      rungsGroup.appendChild(line);
    });
    svg.appendChild(rungsGroup);

    // 2. Draw Main Vertical Lines and trace nodes
    for (let col = 0; col < playerCount; col++) {
      const xVal = getX(col);
      
      // Vertical Line
      const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      vLine.setAttribute('x1', xVal);
      vLine.setAttribute('y1', '112');
      vLine.setAttribute('x2', xVal);
      vLine.setAttribute('y2', '708');
      vLine.setAttribute('stroke', '#cbd5e1');
      vLine.setAttribute('stroke-width', '8');
      vLine.setAttribute('stroke-linecap', 'round');
      
      // Add interactive tap target on top of vertical trace to trigger single run path
      vLine.setAttribute('cursor', 'pointer');
      vLine.addEventListener('click', () => {
        if (!tracingInProgress && hasStartedEver) {
          traceSingleRoute(col);
        }
      });
      svg.appendChild(vLine);
    }

    // Dynamic traces container so active path lines live on top
    const traceGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    traceGroup.setAttribute('id', 'trace-group-layers');
    svg.appendChild(traceGroup);

    ladderArea.appendChild(svg);
    ladderArea.appendChild(inputsOverlay);
  }

  // Sequential runner for ALL players (Updated to run all in parallel!)
  async function startSequentialTracing() {
    tracingInProgress = true;
    hasStartedEver = true;
    bottomStartBtn.innerHTML = `
      <div class="flex items-center gap-[12px] animate-pulse">
        <span>결과 분석 중...</span>
      </div>
    `;
    bottomStartBtn.style.opacity = '0.7';

    // Show rungs group immediately
    const rungsGroup = document.getElementById('rungs-group-layer');
    if (rungsGroup) {
      rungsGroup.style.display = 'block';
    }

    // Clear previous traces
    const group = document.getElementById('trace-group-layers');
    if (group) group.innerHTML = '';

    // Animate every single participant sequence in PARALLEL!
    const promises = [];
    for (let i = 0; i < playerCount; i++) {
      promises.push(animateSinglePath(i, TRACE_COLORS[i % TRACE_COLORS.length]));
    }
    await Promise.all(promises);

    // Done sequence
    bottomStartBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline-block mr-[12px]"><polygon points="6 3 20 12 6 21 6 3"/></svg>
      시작하기
    `;
    bottomStartBtn.style.opacity = '1';
    tracingInProgress = false;

    // Show beautiful total summary modal after clean animation finishes
    setTimeout(() => {
      showAllPairsModal();
    }, 1200);
  }

  // Trace one tap target path instantly
  function traceSingleRoute(playerIndex) {
    const group = document.getElementById('trace-group-layers');
    // Clear only this color or just paint it
    animateSinglePath(playerIndex, TRACE_COLORS[playerIndex % TRACE_COLORS.length]).then(() => {
      // Highlight individual matching results in the popup
      const destIndex = matches[playerIndex];
      const pName = names[playerIndex] || `이름 ${playerIndex + 1}`;
      const resItem = results[destIndex] || (destIndex < resultCount ? '당첨' : '꽝');
      
      showHeaderModal(`🎯 ${pName}의 결과`, `
        <div class="text-center p-8 flex flex-col items-center gap-6 animate-fade-in">
          <div class="text-[32px] text-zinc-500 font-medium">사다리 결과</div>
          <div class="text-[72px] font-extrabold text-[#006CFF] tracking-tight bg-blue-50 px-12 py-6 rounded-3xl border-2 border-dashed border-blue-200">
            ${resItem}
          </div>
          <div class="text-[28px] text-zinc-400 mt-2">다른 참가자들의 결과도 계속 확인해 보세요!</div>
        </div>
      `);
    });
  }

  function animateSinglePath(playerIndex, color) {
    return new Promise((resolve) => {
      const pathData = tracePathForPlayer(playerIndex);
      const points = pathData.points;
      
      // Build SVG path string
      let dStr = `M ${points[0].x} ${points[0].y}`;
      for (let k = 1; k < points.length; k++) {
        dStr += ` L ${points[k].x} ${points[k].y}`;
      }

      const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svgPath.setAttribute('d', dStr);
      svgPath.setAttribute('stroke', color);
      svgPath.setAttribute('stroke-width', '10');
      svgPath.setAttribute('fill', 'none');
      svgPath.setAttribute('stroke-linecap', 'round');
      svgPath.setAttribute('stroke-linejoin', 'round');
      svgPath.style.filter = 'drop-shadow(0px 0px 8px ' + color + '88)';

      const group = document.getElementById('trace-group-layers');
      if (group) {
        group.appendChild(svgPath);
      }

      // Calculate the exact pixel path length dynamically to ensure zero alignment caps/gaps!
      const totalLength = svgPath.getTotalLength();
      svgPath.style.strokeDasharray = totalLength;
      svgPath.style.strokeDashoffset = totalLength;

      // Force synchronous layout reflow trigger
      svgPath.getBoundingClientRect();

      // Trigger standard CSS hardware-accelerated transition
      svgPath.style.transition = 'stroke-dashoffset 3.5s cubic-bezier(0.4, 0, 0.2, 1)';
      svgPath.style.strokeDashoffset = '0';

      // Highlight starting input immediately in the unique line color
      const inputs = document.querySelectorAll('#ladder-area input');
      const topInput = inputs[playerIndex];
      if (topInput) {
        topInput.style.borderColor = color;
        topInput.style.borderWidth = '4px';
        topInput.style.boxShadow = `0 4px 12px ${color}22`;
        topInput.style.backgroundColor = `${color}06`; // subtle tint
      }

      // Track target circles on path head
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', points[0].x);
      circle.setAttribute('cy', points[0].y);
      circle.setAttribute('r', '14');
      circle.setAttribute('fill', color);
      if (group) group.appendChild(circle);

      // Animation duration (3.5s)
      setTimeout(() => {
        // Highlight destination circle
        const endPoint = points[points.length - 1];
        const destCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        destCircle.setAttribute('cx', endPoint.x);
        destCircle.setAttribute('cy', endPoint.y);
        destCircle.setAttribute('r', '14');
        destCircle.setAttribute('fill', color);
        if (group) group.appendChild(destCircle);

        // Highlight matching bottom output input box in matching color
        const bottomInput = inputs[playerCount + pathData.destinationCol];

        if (bottomInput) {
          bottomInput.style.borderColor = color;
          bottomInput.style.borderWidth = '4px';
          bottomInput.style.boxShadow = `0 4px 12px ${color}22`;
          bottomInput.style.backgroundColor = `${color}06`; // subtle tint
          bottomInput.classList.add('scale-105');
          
          setTimeout(() => {
            bottomInput.classList.remove('scale-105');
          }, 300);
        }

        resolve();
      }, 3500);
    });
  }

  // --- RESULT VIEW MODAL ---
  function showAllPairsModal() {
    let outputHtml = `
      <div class="grid grid-cols-2 gap-6 max-h-[850px] overflow-y-auto pr-2 custom-scrollbar">
    `;

    for (let i = 0; i < playerCount; i++) {
      const destIndex = matches[i];
      const pName = names[i] || `이름 ${i + 1}`;
      const resVal = results[destIndex] || (destIndex < resultCount ? '당첨' : '꽝');
      const color = TRACE_COLORS[i % TRACE_COLORS.length];

      outputHtml += `
        <div class="bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 flex flex-col justify-between gap-3 text-center transition hover:border-slate-200">
          <div class="flex items-center gap-3 justify-center">
            <span class="w-[16px] h-[16px] rounded-full inline-block" style="background-color: ${color}"></span>
            <span class="text-[32px] font-bold text-zinc-700">${pName}</span>
          </div>
          <div class="text-[44px] font-black py-4 rounded-2xl border-2 border-dashed shadow-sm transition-all" style="color: ${color}; border-color: ${color}cc; background-color: ${color}08;">
            ${resVal}
          </div>
        </div>
      `;
    }

    outputHtml += '</div>';

    showHeaderModal('📋 전체 결과 보기', outputHtml);
  }

  function showHeaderModal(title, bodyHtml) {
    resultModalTitle.textContent = title;
    resultModalContent.innerHTML = bodyHtml;
    resultOverlay.classList.add('active');
    
    // Trigger beautiful interactive fireworks backdrop burst!
    setTimeout(() => {
      triggerConfettiEffect();
    }, 100);
  }

  // --- INTERACTIVE CONFETTI & FIREWORKS ENGINE ---
  let confettiActive = false;
  let confettiAnimationId = null;

  function triggerConfettiEffect() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Dynamic fullscreen dimensions of the parent overlay
    canvas.width = 1080;
    canvas.height = 1920;

    const particles = [];
    const colors = ['#FF2D55', '#FF9500', '#FFCC00', '#34C759', '#006CFF', '#AF52DE', '#FF3B30', '#00C7BE'];

    // Define 5 distinct burst points distributed behind the white card modal
    const width = canvas.width;
    const height = canvas.height;
    const burstOrigins = [
      { x: width * 0.15, y: height * 0.35 },
      { x: width * 0.85, y: height * 0.35 },
      { x: width * 0.20, y: height * 0.65 },
      { x: width * 0.80, y: height * 0.65 },
      { x: width * 0.50, y: height * 0.20 }
    ];

    // Spawn fireworks burst at each location
    burstOrigins.forEach(origin => {
      const particleCount = 25 + Math.floor(Math.random() * 20);
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 5 + Math.random() * 14;
        particles.push({
          x: origin.x,
          y: origin.y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          size: 6 + Math.random() * 10,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.25,
          alpha: 1.0,
          decay: 0.006 + Math.random() * 0.012,
          type: Math.random() > 0.4 ? 'circle' : 'rect'
        });
      }
    });

    // Spawn slow floating confetti flakes descending from the top margin
    for (let i = 0; i < 70; i++) {
      particles.push({
        x: Math.random() * width,
        y: -30 - Math.random() * 150,
        vx: (Math.random() - 0.5) * 5,
        vy: 3 + Math.random() * 7,
        size: 7 + Math.random() * 11,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        alpha: 1.0,
        decay: 0.002,
        type: Math.random() > 0.5 ? 'circle' : 'rect'
      });
    }

    confettiActive = true;
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
    }

    function animateConfettiFrame() {
      if (!confettiActive) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let hasActiveParticles = false;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // Physics update
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14;       // gravity pull down
        p.vx *= 0.97;       // air drag
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay; // fade out Over Time

        if (p.alpha > 0) {
          hasActiveParticles = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;

          if (p.type === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          }
          ctx.restore();
        }
      }

      if (hasActiveParticles && confettiActive) {
        confettiAnimationId = requestAnimationFrame(animateConfettiFrame);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animateConfettiFrame();
  }

  function stopConfettiEffect() {
    confettiActive = false;
    if (confettiAnimationId) {
      cancelAnimationFrame(confettiAnimationId);
      confettiAnimationId = null;
    }
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function showToast(message) {
    const existing = document.getElementById('error-validation-toast');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'error-validation-toast';
    toast.className = 'absolute top-[160px] left-1/2 -translate-x-1/2 bg-red-500 text-white font-extrabold text-[28px] px-[48px] py-[22px] rounded-full shadow-2xl flex items-center gap-[16px] z-[500] transition-all duration-300 transform -translate-y-4 opacity-0 pointer-events-none';
    
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="animate-bounce">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${message}</span>
    `;

    const canvas = document.getElementById('signage-canvas');
    if (canvas) {
      canvas.appendChild(toast);
      toast.offsetHeight; // force reflow

      toast.classList.remove('-translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-4', 'opacity-0');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.remove();
          }
        }, 300);
      }, 3000);
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
});
