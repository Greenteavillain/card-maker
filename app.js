/* =============================================
   CARD MAKER — APP LOGIC v3
   ============================================= */

const STORAGE_KEY = 'cardmaker_v1';

const state = {
  imagePos: 'left',
  imageSizePct: 45,
  cardW: 900,
  cardH: 500,
  bgColor: '#ffffff',
  accentColor: '#ff6b9d',
  font: "'Noto Sans KR', sans-serif",
  selectedBlockId: null,
  blocks: [],
  isDark: false,
  imageDataUrl: null, // base64 for localStorage
};

/* ============================================================
   LOCAL STORAGE — 자동 저장/불러오기
   ============================================================ */
function saveToStorage() {
  try {
    const data = {
      imagePos: state.imagePos,
      imageSizePct: state.imageSizePct,
      cardW: state.cardW,
      cardH: state.cardH,
      bgColor: state.bgColor,
      accentColor: state.accentColor,
      font: state.font,
      isDark: state.isDark,
      blocks: state.blocks,
      imageDataUrl: state.imageDataUrl,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) {
    // localStorage full (이미지 too large) — save without image
    try {
      const data = { ...arguments[0], imageDataUrl: null };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e2) { /* silent */ }
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(state, data);
    return true;
  } catch(e) { return false; }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// 자동 저장: state 변경 후 debounce
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToStorage, 600);
}

/* ============================================================
   UNDO HISTORY
   ============================================================ */
const history = [];
let historyIndex = -1;
let suppressHistory = false;

function snapshot() {
  if (suppressHistory) return;
  const snap = JSON.stringify({ blocks: state.blocks, selectedBlockId: state.selectedBlockId });
  history.splice(historyIndex + 1);
  history.push(snap);
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  scheduleSave();
}

function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  suppressHistory = true;
  const snap = JSON.parse(history[historyIndex]);
  state.blocks = snap.blocks;
  state.selectedBlockId = snap.selectedBlockId;
  suppressHistory = false;
  render();
  scheduleSave();
}

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
    e.preventDefault();
    undo();
  }
});

/* ---- ID ---- */
let blockIdCounter = 0;
function nextId() { return ++blockIdCounter; }

function initDefaultBlocks() {
  state.blocks = [
    { id: nextId(), type: 'supertitle', text: '2026 유니 작가의 여행드로잉', fontSize: 13, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'title',      text: '바다 그리기 특강', fontSize: 38, color: null, bold: true,  align: 'left' },
    { id: nextId(), type: 'subtitle',   text: '선 과제 스케치 해온 후\n수업에 채색 함께 하기', fontSize: 15, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'divider',    text: '', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info', label: '일시',   value: '1차 5월 19일 / 2차 5월 26일\n화요일 낮 2시~4시 30분', fontSize: 13, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info', label: '장소',   value: '꿈지락 (동천로 24, 302호)', fontSize: 13, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info', label: '수강료', value: '2회 8만원 (각 차시마다 작품 완성)', fontSize: 13, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'body',       text: '강사 유니 @yuni_0010', fontSize: 12, color: null, bold: false, align: 'left' },
  ];
  snapshot();
}

/* ---- DOM REFS ---- */
const cardContainer     = document.getElementById('cardContainer');
const cardImageArea     = document.getElementById('cardImageArea');
const cardTextArea      = document.getElementById('cardTextArea');
const blocksContainer   = document.getElementById('blocksContainer');
const cardImage         = document.getElementById('cardImage');
const imagePlaceholder  = document.getElementById('imagePlaceholder');
const blockEditorContent= document.getElementById('blockEditorContent');

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  renderCard();
  renderBlocks();
  renderBlockEditor();
  syncPanelUI();
}

function syncPanelUI() {
  // sync font select
  document.getElementById('fontSelect').value = state.font;
  // sync image size slider
  document.getElementById('imageSizeSlider').value = state.imageSizePct;
  document.getElementById('imageSizeVal').textContent = state.imageSizePct + '%';
  // sync card size inputs
  document.getElementById('cardW').value = Math.round(state.cardW);
  document.getElementById('cardH').value = Math.round(state.cardH);
  // sync image pos buttons
  document.querySelectorAll('.pos-btn').forEach(b => b.classList.toggle('active', b.dataset.pos === state.imagePos));
}

function renderCard() {
  const { cardW, cardH, bgColor, font, imagePos, imageSizePct, accentColor, isDark } = state;

  cardContainer.style.width  = cardW + 'px';
  cardContainer.style.height = cardH + 'px';
  cardContainer.style.setProperty('--accent', accentColor);
  cardContainer.style.background = bgColor;
  cardContainer.style.fontFamily = font;
  cardContainer.classList.toggle('dark', isDark);

  ['layout-left','layout-right','layout-top','layout-bottom','layout-background']
    .forEach(c => cardContainer.classList.remove(c));
  cardContainer.classList.add('layout-' + imagePos);

  if (imagePos === 'left' || imagePos === 'right') {
    const imgW = Math.round(cardW * imageSizePct / 100);
    cardImageArea.style.width  = imgW + 'px';
    cardImageArea.style.height = '100%';
    cardContainer.style.flexDirection = imagePos === 'right' ? 'row-reverse' : 'row';
  } else if (imagePos === 'top' || imagePos === 'bottom') {
    const imgH = Math.round(cardH * imageSizePct / 100);
    cardImageArea.style.width  = '100%';
    cardImageArea.style.height = imgH + 'px';
    cardContainer.style.flexDirection = imagePos === 'bottom' ? 'column-reverse' : 'column';
  } else if (imagePos === 'background') {
    cardImageArea.style.width  = '100%';
    cardImageArea.style.height = '100%';
    cardContainer.style.flexDirection = 'row';
  }

  cardTextArea.style.padding = '28px 36px';
  blocksContainer.style.gap = '6px';

  // restore image if stored
  if (state.imageDataUrl) {
    cardImage.src = state.imageDataUrl;
    cardImage.style.display = 'block';
    imagePlaceholder.style.display = 'none';
  }
}

/* ============================================================
   BLOCK RENDERING
   ============================================================ */
function renderBlocks() {
  blocksContainer.innerHTML = '';
  state.blocks.forEach(block => {
    blocksContainer.appendChild(buildBlockEl(block));
  });
  setupDragDrop();
}

function getFontSize(block) {
  if (block.fontSize) return block.fontSize + 'px';
  const defaults = { supertitle: 13, title: 36, subtitle: 15, body: 13, info: 13 };
  return (defaults[block.type] || 13) + 'px';
}

function buildBlockEl(block) {
  const wrap = document.createElement('div');
  wrap.className = 'block block-' + block.type;
  wrap.dataset.id = block.id;
  wrap.draggable = true;
  if (block.id === state.selectedBlockId) wrap.classList.add('selected');

  if (block.type === 'divider') {
    const line = document.createElement('div');
    line.className = 'block-text';
    line.style.height = '1px';
    line.style.background = state.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    line.style.margin = '4px 0';
    wrap.appendChild(line);
    wrap.addEventListener('click', () => selectBlock(block.id));
    addBlockControls(wrap, block);
    return wrap;
  }

  if (block.type === 'info') {
    const grid = document.createElement('div');
    grid.className = 'block-text info-grid';
    grid.style.fontSize = getFontSize(block);
    if (block.color) grid.style.color = block.color;
    grid.style.textAlign = block.align || 'left';

    const labelEl = document.createElement('strong');
    labelEl.className = 'info-label';
    labelEl.textContent = block.label || '';

    const valueEl = document.createElement('span');
    valueEl.className = 'info-value';
    valueEl.style.whiteSpace = 'pre-wrap';
    valueEl.textContent = block.value || '';

    grid.appendChild(labelEl);
    grid.appendChild(valueEl);
    wrap.appendChild(grid);

    labelEl.addEventListener('dblclick', e => { e.stopPropagation(); makeInlineEditable(labelEl, block, 'label'); });
    valueEl.addEventListener('dblclick', e => { e.stopPropagation(); makeInlineEditable(valueEl, block, 'value'); });
    wrap.addEventListener('click', () => selectBlock(block.id));
    addBlockControls(wrap, block);
    return wrap;
  }

  const textEl = document.createElement('div');
  textEl.className = 'block-text';
  textEl.style.fontSize = getFontSize(block);
  textEl.style.whiteSpace = 'pre-wrap';
  if (block.color) textEl.style.color = block.color;
  if (block.bold)  textEl.style.fontWeight = '700';
  textEl.style.textAlign = block.align || 'left';
  textEl.textContent = block.text || '';

  textEl.addEventListener('dblclick', e => { e.stopPropagation(); makeInlineEditable(textEl, block, 'text'); });

  wrap.appendChild(textEl);
  wrap.addEventListener('click', () => selectBlock(block.id));
  addBlockControls(wrap, block);
  return wrap;
}

/* ---- INLINE EDITING ---- */
function makeInlineEditable(el, block, field) {
  if (el.contentEditable === 'true') return;
  selectBlock(block.id);
  el.contentEditable = 'true';
  el.style.outline = 'none';
  el.style.cursor = 'text';
  el.focus();
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  function commit() {
    el.contentEditable = 'false';
    el.style.cursor = '';
    block[field] = el.innerText;
    snapshot();
    renderBlockEditor();
  }
  el.addEventListener('blur', commit, { once: true });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') el.blur(); });
}

/* ---- BLOCK CONTROLS ---- */
function addBlockControls(wrap, block) {
  const controls = document.createElement('div');
  controls.className = 'block-controls';
  controls.appendChild(makeCtrlBtn('↑', '위로',   () => { moveBlock(block.id, -1); snapshot(); }));
  controls.appendChild(makeCtrlBtn('↓', '아래로', () => { moveBlock(block.id,  1); snapshot(); }));
  controls.appendChild(makeCtrlBtn('✕', '삭제',   () => { deleteBlock(block.id); snapshot(); }));
  wrap.appendChild(controls);
}

function makeCtrlBtn(text, title, fn) {
  const btn = document.createElement('button');
  btn.className = 'block-ctrl-btn';
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener('click', e => { e.stopPropagation(); fn(); });
  return btn;
}

/* ============================================================
   DRAG & DROP REORDER
   ============================================================ */
let dragSrcId = null;

function setupDragDrop() {
  blocksContainer.querySelectorAll('.block').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragSrcId = parseInt(el.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => el.classList.add('dragging'), 0);
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      blocksContainer.querySelectorAll('.block').forEach(b => b.classList.remove('drag-over'));
    });
    el.addEventListener('dragover', e => {
      e.preventDefault();
      blocksContainer.querySelectorAll('.block').forEach(b => b.classList.remove('drag-over'));
      el.classList.add('drag-over');
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      const targetId = parseInt(el.dataset.id);
      if (dragSrcId === null || dragSrcId === targetId) return;
      const srcIdx = state.blocks.findIndex(b => b.id === dragSrcId);
      const tgtIdx = state.blocks.findIndex(b => b.id === targetId);
      const arr = [...state.blocks];
      const [removed] = arr.splice(srcIdx, 1);
      arr.splice(tgtIdx, 0, removed);
      state.blocks = arr;
      dragSrcId = null;
      snapshot();
      render();
    });
  });
}

/* ============================================================
   RIGHT PANEL — BLOCK EDITOR
   ============================================================ */
function renderBlockEditor() {
  if (!state.selectedBlockId) {
    blockEditorContent.innerHTML = '<div class="no-selection">블록을 클릭하면<br/>여기서 편집할 수 있어요</div>';
    return;
  }
  const block = state.blocks.find(b => b.id === state.selectedBlockId);
  if (!block) { blockEditorContent.innerHTML = ''; return; }

  const div = document.createElement('div');
  div.className = 'block-editor';

  if (block.type === 'info') {
    div.appendChild(makeEditorField('라벨 (굵게 표시)', () => {
      const inp = document.createElement('input');
      inp.className = 'editor-input';
      inp.value = block.label || '';
      inp.placeholder = '일시, 장소, 수강료...';
      inp.addEventListener('input', () => { block.label = inp.value; renderBlocks(); scheduleSave(); });
      inp.addEventListener('change', snapshot);
      return inp;
    }));
    div.appendChild(makeEditorField('내용', () => {
      const ta = document.createElement('textarea');
      ta.className = 'editor-textarea';
      ta.value = block.value || '';
      ta.rows = 3;
      ta.placeholder = '내용 입력...';
      ta.addEventListener('input', () => { block.value = ta.value; renderBlocks(); scheduleSave(); });
      ta.addEventListener('change', snapshot);
      return ta;
    }));
  } else if (block.type !== 'divider') {
    div.appendChild(makeEditorField('텍스트', () => {
      const ta = document.createElement('textarea');
      ta.className = 'editor-textarea';
      ta.value = block.text || '';
      ta.rows = 3;
      ta.addEventListener('input', () => { block.text = ta.value; renderBlocks(); scheduleSave(); });
      ta.addEventListener('change', snapshot);
      return ta;
    }));
  }

  div.appendChild(makeEditorField('블록 타입', () => {
    const sel = document.createElement('select');
    sel.className = 'editor-select';
    const types = { supertitle:'슈퍼타이틀', title:'제목', subtitle:'부제목', body:'본문', info:'정보행', divider:'구분선' };
    Object.entries(types).forEach(([val, label]) => {
      const opt = document.createElement('option');
      opt.value = val; opt.textContent = label;
      if (val === block.type) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      const prev = block.type;
      block.type = sel.value;
      if (block.type === 'info' && !block.label) { block.label = '항목'; block.value = block.text || ''; }
      if (prev === 'info' && block.type !== 'info') { block.text = block.value || ''; }
      snapshot(); render();
    });
    return sel;
  }));

  div.appendChild(makeEditorField('글자 크기 (px)', () => {
    const inp = document.createElement('input');
    inp.className = 'editor-input';
    inp.type = 'number'; inp.min = 8; inp.max = 120;
    const defaults = { supertitle:13, title:36, subtitle:15, body:13, info:13, divider:0 };
    inp.value = block.fontSize ?? defaults[block.type] ?? 13;
    inp.addEventListener('input', () => { block.fontSize = parseInt(inp.value) || null; renderBlocks(); scheduleSave(); });
    inp.addEventListener('change', snapshot);
    return inp;
  }));

  if (block.type !== 'divider') {
    div.appendChild(makeEditorField('정렬', () => {
      const row = document.createElement('div');
      row.className = 'editor-row';
      ['left','center','right'].forEach(a => {
        const btn = document.createElement('button');
        btn.className = 'toggle-btn' + (block.align === a ? ' on' : '');
        btn.textContent = { left:'좌', center:'중', right:'우' }[a];
        btn.addEventListener('click', () => {
          block.align = a;
          row.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('on'));
          btn.classList.add('on');
          renderBlocks(); snapshot();
        });
        row.appendChild(btn);
      });
      return row;
    }));

    div.appendChild(makeEditorField('색상', () => {
      const row = document.createElement('div');
      row.className = 'editor-color-row';
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.value = block.color || state.accentColor;
      picker.addEventListener('input', () => { block.color = picker.value; renderBlocks(); scheduleSave(); });
      picker.addEventListener('change', snapshot);
      const resetBtn = document.createElement('button');
      resetBtn.className = 'toggle-btn';
      resetBtn.textContent = '자동';
      resetBtn.addEventListener('click', () => { block.color = null; picker.value = state.accentColor; renderBlocks(); snapshot(); });
      row.appendChild(picker);
      row.appendChild(resetBtn);
      return row;
    }));
  }

  if (block.type !== 'divider' && block.type !== 'info') {
    div.appendChild(makeEditorField('굵게', () => {
      const btn = document.createElement('button');
      btn.className = 'toggle-btn' + (block.bold ? ' on' : '');
      btn.textContent = block.bold ? 'ON' : 'OFF';
      btn.addEventListener('click', () => {
        block.bold = !block.bold;
        btn.classList.toggle('on', block.bold);
        btn.textContent = block.bold ? 'ON' : 'OFF';
        renderBlocks(); snapshot();
      });
      return btn;
    }));
  }

  const delBtn = document.createElement('button');
  delBtn.className = 'del-block-btn';
  delBtn.textContent = '이 블록 삭제';
  delBtn.addEventListener('click', () => { deleteBlock(block.id); snapshot(); });
  div.appendChild(delBtn);

  blockEditorContent.innerHTML = '';
  blockEditorContent.appendChild(div);
}

function makeEditorField(label, buildInput) {
  const wrap = document.createElement('div');
  wrap.className = 'editor-field';
  const lbl = document.createElement('div');
  lbl.className = 'editor-label';
  lbl.textContent = label;
  wrap.appendChild(lbl);
  wrap.appendChild(buildInput());
  return wrap;
}

/* ============================================================
   BLOCK OPERATIONS
   ============================================================ */
function selectBlock(id) {
  state.selectedBlockId = id;
  renderBlocks();
  renderBlockEditor();
}

function deleteBlock(id) {
  state.blocks = state.blocks.filter(b => b.id !== id);
  if (state.selectedBlockId === id) state.selectedBlockId = null;
  render();
}

function moveBlock(id, dir) {
  const idx = state.blocks.findIndex(b => b.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.blocks.length) return;
  const arr = [...state.blocks];
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  state.blocks = arr;
  render();
}

function addBlock(type) {
  const block = {
    id: nextId(), type,
    text: type === 'title' ? '제목' : type === 'supertitle' ? '부가 설명' : type === 'subtitle' ? '부제목' : type === 'body' ? '본문 내용' : '',
    label: type === 'info' ? '항목' : undefined,
    value: type === 'info' ? '내용' : undefined,
    fontSize: null, color: null, bold: false, align: 'left',
  };
  state.blocks.push(block);
  state.selectedBlockId = block.id;
  snapshot();
  render();
}

/* ============================================================
   RESIZE
   ============================================================ */
let resizing = null;

document.querySelectorAll('.resize-handle').forEach(handle => {
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    resizing = { startX: e.clientX, startY: e.clientY, startW: state.cardW, startH: state.cardH, dir: handle.dataset.dir };
  });
});

document.addEventListener('mousemove', e => {
  if (!resizing) return;
  const dx = e.clientX - resizing.startX;
  const dy = e.clientY - resizing.startY;
  if (resizing.dir.includes('e')) state.cardW = Math.max(300, resizing.startW + dx);
  if (resizing.dir.includes('s')) state.cardH = Math.max(200, resizing.startH + dy);
  document.getElementById('cardW').value = Math.round(state.cardW);
  document.getElementById('cardH').value = Math.round(state.cardH);
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  renderCard();
});

document.addEventListener('mouseup', () => {
  if (resizing) { resizing = null; snapshot(); }
});

/* ============================================================
   IMAGE UPLOAD — base64로 저장
   ============================================================ */
document.getElementById('imageUpload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    state.imageDataUrl = ev.target.result;
    cardImage.src = state.imageDataUrl;
    cardImage.style.display = 'block';
    imagePlaceholder.style.display = 'none';
    scheduleSave();
  };
  reader.readAsDataURL(file);
});

/* ============================================================
   IMAGE POSITION
   ============================================================ */
document.getElementById('imagePositionGrid').querySelectorAll('.pos-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.imagePos = btn.dataset.pos;
    scheduleSave();
    render();
  });
});

document.getElementById('imageSizeSlider').addEventListener('input', e => {
  state.imageSizePct = parseInt(e.target.value);
  document.getElementById('imageSizeVal').textContent = state.imageSizePct + '%';
  scheduleSave();
  renderCard();
});

/* ============================================================
   CARD SIZE
   ============================================================ */
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.cardW = parseInt(btn.dataset.w);
    state.cardH = parseInt(btn.dataset.h);
    document.getElementById('cardW').value = state.cardW;
    document.getElementById('cardH').value = state.cardH;
    scheduleSave();
    render();
  });
});

document.getElementById('cardW').addEventListener('change', e => {
  state.cardW = Math.max(300, parseInt(e.target.value)||300);
  scheduleSave(); render();
});
document.getElementById('cardH').addEventListener('change', e => {
  state.cardH = Math.max(200, parseInt(e.target.value)||200);
  scheduleSave(); render();
});

/* ============================================================
   FONT & COLORS
   ============================================================ */
document.getElementById('fontSelect').addEventListener('change', e => {
  state.font = e.target.value;
  scheduleSave(); render();
});

document.querySelectorAll('.color-swatches').forEach(group => {
  group.querySelectorAll('button.swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      const isBg = group.previousElementSibling?.textContent.includes('배경');
      group.querySelectorAll('button.swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (isBg) { state.bgColor = btn.dataset.color; state.isDark = isDarkColor(state.bgColor); }
      else state.accentColor = btn.dataset.color;
      scheduleSave(); render();
    });
  });
});

document.getElementById('bgColorPicker').addEventListener('input', e => {
  state.bgColor = e.target.value; state.isDark = isDarkColor(state.bgColor);
  scheduleSave(); render();
});
document.getElementById('accentColorPicker').addEventListener('input', e => {
  state.accentColor = e.target.value;
  scheduleSave(); render();
});

function isDarkColor(hex) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (r*0.299+g*0.587+b*0.114)<128;
}

/* ============================================================
   ADD BLOCK
   ============================================================ */
document.querySelectorAll('.add-block-btn').forEach(btn => {
  btn.addEventListener('click', () => addBlock(btn.dataset.type));
});

/* ============================================================
   EXPORT — PNG / JPG / PDF
   ============================================================ */
async function captureCanvas() {
  const prevSel = state.selectedBlockId;
  state.selectedBlockId = null;
  renderBlocks();
  document.querySelectorAll('.resize-handle').forEach(h => h.style.display='none');
  document.querySelectorAll('.block-controls').forEach(h => h.style.display='none');

  let canvas;
  try {
    canvas = await html2canvas(cardContainer, {
      scale: 2, useCORS: true,
      backgroundColor: state.bgColor,
      width: state.cardW, height: state.cardH,
    });
  } finally {
    document.querySelectorAll('.resize-handle').forEach(h => h.style.display='');
    state.selectedBlockId = prevSel;
    render();
  }
  return canvas;
}

document.getElementById('exportPng').addEventListener('click', async () => {
  const canvas = await captureCanvas();
  const link = document.createElement('a');
  link.download = 'card.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});

document.getElementById('exportJpg').addEventListener('click', async () => {
  const canvas = await captureCanvas();
  const link = document.createElement('a');
  link.download = 'card.jpg';
  link.href = canvas.toDataURL('image/jpeg', 0.92);
  link.click();
});

document.getElementById('exportPdf').addEventListener('click', async () => {
  const canvas = await captureCanvas();
  const { jsPDF } = window.jspdf;
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  // card dimensions in mm (1px = 0.2646mm at 96dpi)
  const mmW = state.cardW * 0.2646;
  const mmH = state.cardH * 0.2646;
  const pdf = new jsPDF({
    orientation: mmW > mmH ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [mmW, mmH],
  });
  pdf.addImage(imgData, 'JPEG', 0, 0, mmW, mmH);
  pdf.save('card.pdf');
});

/* ============================================================
   CLEAR / RESET
   ============================================================ */
document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('모든 내용을 초기화할까요?')) return;
  clearStorage();
  state.imageDataUrl = null;
  cardImage.src = '';
  cardImage.style.display = 'none';
  imagePlaceholder.style.display = 'flex';
  blockIdCounter = 0;
  initDefaultBlocks();
  render();
});

/* ============================================================
   CLICK OUTSIDE TO DESELECT
   ============================================================ */
cardContainer.addEventListener('click', e => {
  if (e.target === cardContainer || e.target === cardTextArea || e.target === blocksContainer) {
    state.selectedBlockId = null;
    renderBlockEditor();
    renderBlocks();
  }
});

/* ============================================================
   INIT — localStorage 불러오기 or 기본값
   ============================================================ */
const loaded = loadFromStorage();
if (!loaded) {
  initDefaultBlocks();
} else {
  // blockIdCounter를 저장된 블록 중 최대 id로 맞추기
  if (state.blocks.length > 0) {
    blockIdCounter = Math.max(...state.blocks.map(b => b.id));
  }
  snapshot();
}
render();
