/* =============================================
   CARD MAKER — APP LOGIC v3
   ============================================= */

const STORAGE_KEY = 'cardmaker_v2';

/* ---- 공통 폰트 목록 ---- */
const FONTS = [
  // 고딕/산스
  { label: '노토 산스',      value: "'Noto Sans KR', sans-serif" },
  { label: 'IBM Plex 산스',  value: "'IBM Plex Sans KR', sans-serif" },
  { label: '나눔고딕',       value: "'Nanum Gothic', sans-serif" },
  { label: '고운 돋움',      value: "'Gowun Dodum', sans-serif" },
  { label: '도현',           value: "'Do Hyeon', sans-serif" },
  { label: '주아',           value: "'Jua', sans-serif" },
  { label: '블랙 한 산스',   value: "'Black Han Sans', sans-serif" },
  { label: '스타일리시',     value: "'Stylish', sans-serif" },
  { label: '해바라기',       value: "'Sunflower', sans-serif" },
  { label: '오빗',           value: "'Orbit', sans-serif" },
  { label: '구기',           value: "'Gugi', sans-serif" },
  // 명조/세리프
  { label: '노토 세리프',    value: "'Noto Serif KR', serif" },
  { label: '나눔명조',       value: "'Nanum Myeongjo', serif" },
  { label: '고운 바탕',      value: "'Gowun Batang', serif" },
  { label: '송명',           value: "'Song Myung', serif" },
  { label: '함렛',           value: "'Hahmlet', serif" },
  // 손글씨/디스플레이
  { label: '개구',           value: "'Gaegu', cursive" },
  { label: '나눔펜',         value: "'Nanum Pen Script', cursive" },
  { label: '나눔붓',         value: "'Nanum Brush Script', cursive" },
  { label: '하이 멜로디',    value: "'Hi Melody', cursive" },
  { label: '감자꽃',         value: "'Gamja Flower', cursive" },
  { label: '푸어 스토리',    value: "'Poor Story', cursive" },
  { label: '귀여운 글씨',    value: "'Cute Font', cursive" },
  { label: '동해 독도',      value: "'East Sea Dokdo', cursive" },
  { label: '독도',           value: "'Dokdo', cursive" },
  { label: '싱글데이',       value: "'Single Day', cursive" },
  { label: '기랑해랑',       value: "'Kirang Haerang', cursive" },
  { label: '제주고딕',       value: "'Jeju Gothic', sans-serif" },
  { label: '제주명조',       value: "'Jeju Myeongjo', serif" },
  { label: '제주한라산',     value: "'Jeju Hallasan', cursive" },
  { label: '부산체',         value: "'Dongle', sans-serif" },
  { label: '온글잎 의연체',  value: "'Grandiflora One', serif" },
];

const state = {
  imagePos: 'left',
  imageSizePct: 50,
  cardW: 720,
  cardH: 470,
  bgColor: '#ffffff',
  accentColor: '#ff6b9d',
  font: "'Noto Sans KR', sans-serif",
  selectedBlockId: null,
  blocks: [],
  isDark: false,
  imageDataUrl: null,
  originalImageDataUrl: null,
  lastCropBox: null,
  infoLabelWidth: 60, // px
  imgPad: { top: 0, right: 0, bottom: 0, left: 0 },
};

/* ============================================================
   INDEXED DB — 이미지 저장 (용량 제한 없음)
   ============================================================ */
const IDB_NAME = 'cardmaker';
const IDB_STORE = 'images';

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

function saveImageToIDB(imageDataUrl, originalImageDataUrl, lastCropBox) {
  openIDB().then(db => {
    const store = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE);
    store.put(imageDataUrl || null, 'imageDataUrl');
    store.put(originalImageDataUrl || null, 'originalImageDataUrl');
    store.put(lastCropBox || null, 'lastCropBox');
  }).catch(() => {});
}

function loadImageFromIDB() {
  return new Promise(resolve => {
    openIDB().then(db => {
      const store = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE);
      const keys = ['imageDataUrl', 'originalImageDataUrl', 'lastCropBox'];
      const results = {};
      let remaining = keys.length;
      keys.forEach(key => {
        const req = store.get(key);
        req.onsuccess = () => { results[key] = req.result || null; if (--remaining === 0) resolve(results); };
        req.onerror = () => { results[key] = null; if (--remaining === 0) resolve(results); };
      });
    }).catch(() => resolve({ imageDataUrl: null, originalImageDataUrl: null, lastCropBox: null }));
  });
}

function clearImageFromIDB() {
  openIDB().then(db => db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).clear()).catch(() => {});
}

/* ============================================================
   LOCAL STORAGE — 자동 저장/불러오기
   ============================================================ */
function saveToStorage() {
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
    imgPad: state.imgPad,
    infoLabelWidth: state.infoLabelWidth,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) { /* silent */ }
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
    { id: nextId(), type: 'supertitle', text: '2026 김란 작가의 여행드로잉', fontSize: 13, color: null, bold: false, align: 'left', font: "'Poor Story', cursive", marginBottom: -5 },
    { id: nextId(), type: 'title',      text: '바다 그리기 특강', fontSize: 50, color: '#ffaf24', bold: true,  align: 'left', font: "'Jua', sans-serif", marginBottom: -5, fontWeight: '500' },
    { id: nextId(), type: 'subtitle',   text: '선 과제 스케치 해온 후\n수업에 채색 함께 하기', fontSize: 15, color: null, bold: false, align: 'left', font: "'Nanum Myeongjo', serif" },
    { id: nextId(), type: 'divider',    text: '', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info', label: '일시',   value: '1차 5월 19일 / 2차 5월 26일\n화요일 낮 2시~4시 30분', fontSize: 14, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info', label: '장소',   value: '꿈지락 (동천로 24, 302호)', fontSize: 14, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info', label: '수강료', value: '2회 8만원 (각 차시마다 작품 완성)', fontSize: 14, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info', label: '계좌',   value: '카카오 3333-31-7185610', fontSize: 14, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info', label: '문의',   value: '010-0000-0000', fontSize: 14, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'divider',    text: '', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'body',       text: '강사 김란 @sns_address', fontSize: 12, color: null, bold: false, align: 'left' },
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
  requestAnimationFrame(positionHandles);
  requestAnimationFrame(mobileAutoFit);
}

function initFontSelect() {
  const sel = document.getElementById('fontSelect');
  if (sel.options.length > 0) return; // 이미 채워진 경우 스킵
  FONTS.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.value;
    opt.textContent = f.label;
    sel.appendChild(opt);
  });
}

function getCardColors() {
  const seen = new Set();
  const colors = [];
  [state.bgColor, state.accentColor, ...state.blocks.map(b => b.color)].forEach(c => {
    if (c && !seen.has(c.toLowerCase())) { seen.add(c.toLowerCase()); colors.push(c); }
  });
  return colors;
}

function syncPanelUI() {
  initFontSelect();
  const sel = document.getElementById('fontSelect');
  sel.value = state.font;
  document.querySelectorAll('.pos-btn').forEach(b => b.classList.toggle('active', b.dataset.pos === state.imagePos));

  // 카드 크기 배지 & 슬라이더 동기화
  const sizeBadge = document.getElementById('sizeBadge');
  if (sizeBadge) sizeBadge.textContent = `${state.cardW} × ${state.cardH}`;
  const wSlider = document.getElementById('cardWidthSlider');
  const hSlider = document.getElementById('cardHeightSlider');
  const wVal = document.getElementById('cardWidthVal');
  const hVal = document.getElementById('cardHeightVal');
  if (wSlider && document.activeElement !== wSlider) { wSlider.value = state.cardW; if (wVal) wVal.textContent = state.cardW; }
  if (hSlider && document.activeElement !== hSlider) { hSlider.value = state.cardH; if (hVal) hVal.textContent = state.cardH; }

  // hex input
  const bgHexInput = document.getElementById('bgHexInput');
  if (bgHexInput && document.activeElement !== bgHexInput) bgHexInput.value = state.bgColor;

  // 카드 사용 색상
  const container = document.getElementById('cardColorsSwatches');
  if (container) {
    container.innerHTML = '';
    getCardColors().forEach(color => {
      const chip = document.createElement('button');
      chip.className = 'card-color-chip';
      chip.style.background = color;
      chip.title = color;
      chip.addEventListener('click', () => {
        state.bgColor = color;
        state.isDark = isDarkColor(color);
        scheduleSave(); render();
      });
      container.appendChild(chip);
    });
  }
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

  const imgRatio = state.imageNaturalRatio || 1; // w/h

  // 이미지 영역 크기 계산
  const scale = imageSizePct / 50; // 50% = 1배

  if (imagePos === 'left' || imagePos === 'right') {
    // 이미지: 높이=카드높이, 너비=비율×높이×scale
    const imgW = Math.round(cardH * imgRatio * scale);
    const textW = Math.max(150, cardW - imgW);

    cardImageArea.style.width    = imgW + 'px';
    cardImageArea.style.minWidth = imgW + 'px';
    cardImageArea.style.maxWidth = imgW + 'px';
    cardImageArea.style.height   = cardH + 'px';

    cardTextArea.style.width    = textW + 'px';
    cardTextArea.style.minWidth = textW + 'px';
    cardTextArea.style.maxWidth = textW + 'px';

    cardContainer.style.flexDirection = imagePos === 'right' ? 'row-reverse' : 'row';

  } else if (imagePos === 'top' || imagePos === 'bottom') {
    // 이미지: 너비=카드너비, 높이=너비÷비율×scale
    const imgH = Math.round(cardW / imgRatio * scale);
    const textH = Math.max(100, cardH - imgH);

    cardImageArea.style.width    = cardW + 'px';
    cardImageArea.style.minWidth = '';
    cardImageArea.style.maxWidth = '';
    cardImageArea.style.height   = imgH + 'px';

    cardTextArea.style.width    = '';
    cardTextArea.style.minWidth = '';
    cardTextArea.style.maxWidth = '';

    cardContainer.style.flexDirection = imagePos === 'bottom' ? 'column-reverse' : 'column';

  } else if (imagePos === 'background') {
    cardImageArea.style.width    = '100%';
    cardImageArea.style.minWidth = '';
    cardImageArea.style.maxWidth = '';
    cardImageArea.style.height   = '100%';

    cardTextArea.style.width    = '';
    cardTextArea.style.minWidth = '';
    cardTextArea.style.maxWidth = '';

    cardContainer.style.flexDirection = 'row';
  }

  cardTextArea.style.padding = '28px 36px';
  const { top, right, bottom, left } = state.imgPad;
  cardImageArea.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  cardImageArea.style.background = state.bgColor;
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
  const defaults = { supertitle: 13, title: 50, subtitle: 15, body: 13, info: 14 };
  return (defaults[block.type] || 13) + 'px';
}

function buildBlockEl(block) {
  const wrap = document.createElement('div');
  wrap.className = 'block block-' + block.type;
  wrap.dataset.id = block.id;
  wrap.draggable = true;
  if (block.id === state.selectedBlockId) wrap.classList.add('selected');
  if (block.marginBottom) wrap.style.marginBottom = block.marginBottom + 'px';

  if (block.type === 'divider') {
    const line = document.createElement('div');
    line.className = 'block-text';
    line.style.height = '1px';
    line.style.background = block.color || (state.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)');
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
    if (block.font) grid.style.fontFamily = block.font;
    const infoFw = block.fontWeight || (block.bold ? '700' : null);
    if (infoFw) grid.style.fontWeight = infoFw;
    grid.style.textAlign = block.align || 'left';

    const labelEl = document.createElement('strong');
    labelEl.className = 'info-label';
    labelEl.textContent = block.label || '';
    labelEl.style.width = state.infoLabelWidth + 'px';
    labelEl.style.minWidth = state.infoLabelWidth + 'px';

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
  const fw = block.fontWeight || (block.bold ? '700' : null);
  if (fw) textEl.style.fontWeight = fw;
  if (block.font)  textEl.style.fontFamily = block.font;
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
    div.appendChild(makeEditorField('라벨 너비 (px)', () => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = 30; slider.max = 120;
      slider.value = state.infoLabelWidth;
      slider.style.flex = '1';
      slider.style.accentColor = 'var(--accent)';
      const val = document.createElement('span');
      val.textContent = state.infoLabelWidth + 'px';
      val.style.fontSize = '11px';
      val.style.color = '#aaa';
      val.style.minWidth = '36px';
      slider.addEventListener('input', () => {
        state.infoLabelWidth = parseInt(slider.value);
        val.textContent = state.infoLabelWidth + 'px';
        renderBlocks();
        scheduleSave();
      });
      row.appendChild(slider);
      row.appendChild(val);
      return row;
    }));
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

  if (block.type === 'divider') {
    div.appendChild(makeEditorField('선 색상', () => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;gap:8px;align-items:center';
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.style.cssText = 'width:30px;height:24px;padding:1px;border:1px solid rgba(255,255,255,0.15);border-radius:4px;cursor:pointer;background:none';
      const defaultColor = state.isDark ? '#ffffff' : '#1a1a1a';
      picker.value = block.color || defaultColor;
      const hexInput = document.createElement('input');
      hexInput.type = 'text';
      hexInput.className = 'hex-input';
      hexInput.style.cssText = 'margin-top:0;flex:1';
      hexInput.maxLength = 7;
      hexInput.value = picker.value;
      function applyDividerColor(hex) {
        block.color = hex; picker.value = hex; hexInput.value = hex;
        renderBlocks(); scheduleSave();
      }
      picker.addEventListener('input', () => applyDividerColor(picker.value));
      picker.addEventListener('change', snapshot);
      hexInput.addEventListener('input', () => {
        let val = hexInput.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) applyDividerColor(val);
      });
      hexInput.addEventListener('change', snapshot);
      const resetBtn = document.createElement('button');
      resetBtn.className = 'toggle-btn';
      resetBtn.textContent = '자동';
      resetBtn.addEventListener('click', () => { block.color = null; picker.value = defaultColor; hexInput.value = defaultColor; renderBlocks(); snapshot(); });
      wrap.appendChild(picker); wrap.appendChild(hexInput); wrap.appendChild(resetBtn);
      return wrap;
    }));
  }

  div.appendChild(makeEditorField('글자 크기 (px)', () => {
    const inp = document.createElement('input');
    inp.className = 'editor-input';
    inp.type = 'number'; inp.min = 8; inp.max = 120;
    const defaults = { supertitle:13, title:50, subtitle:15, body:13, info:14, divider:0 };
    inp.value = block.fontSize ?? defaults[block.type] ?? 13;
    inp.addEventListener('input', () => { block.fontSize = parseInt(inp.value) || null; renderBlocks(); scheduleSave(); });
    inp.addEventListener('change', snapshot);
    return inp;
  }));

  // 폰트 선택 (드롭다운 미리보기)
  if (block.type !== 'divider') {
    div.appendChild(makeEditorField('폰트', () => {
      const wrapper = document.createElement('div');
      wrapper.className = 'font-dropdown-wrapper';

      const selected = document.createElement('div');
      selected.className = 'font-dropdown-selected';
      const currentFont = block.font || state.font;
      const currentLabel = FONTS.find(f => f.value === currentFont)?.label || '기본';
      selected.style.fontFamily = currentFont;
      selected.textContent = currentLabel;

      const dropdown = document.createElement('div');
      dropdown.className = 'font-dropdown-list';

      // 기본 옵션
      const defaultOpt = document.createElement('div');
      defaultOpt.className = 'font-dropdown-item' + (!block.font ? ' on' : '');
      defaultOpt.textContent = '기본';
      defaultOpt.addEventListener('click', () => {
        block.font = null;
        selected.textContent = '기본';
        selected.style.fontFamily = state.font;
        dropdown.classList.remove('open');
        renderBlocks(); snapshot();
        dropdown.querySelectorAll('.font-dropdown-item').forEach(el => el.classList.remove('on'));
        defaultOpt.classList.add('on');
      });
      dropdown.appendChild(defaultOpt);

      FONTS.forEach(f => {
        const item = document.createElement('div');
        item.className = 'font-dropdown-item' + (block.font === f.value ? ' on' : '');
        item.style.fontFamily = f.value;
        item.textContent = f.label;
        item.addEventListener('click', () => {
          block.font = f.value;
          selected.textContent = f.label;
          selected.style.fontFamily = f.value;
          dropdown.classList.remove('open');
          renderBlocks(); snapshot();
          dropdown.querySelectorAll('.font-dropdown-item').forEach(el => el.classList.remove('on'));
          item.classList.add('on');
        });
        dropdown.appendChild(item);
      });

      selected.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => dropdown.classList.remove('open'));

      wrapper.appendChild(selected);
      wrapper.appendChild(dropdown);
      return wrapper;
    }));
  }

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
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px';

      const row = document.createElement('div');
      row.className = 'editor-color-row';

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.value = block.color || state.accentColor;

      const hexInput = document.createElement('input');
      hexInput.type = 'text';
      hexInput.className = 'hex-input';
      hexInput.style.cssText = 'margin-top:0;flex:1';
      hexInput.maxLength = 7;
      hexInput.value = picker.value;

      function applyColor(hex) {
        block.color = hex; picker.value = hex; hexInput.value = hex;
        renderBlocks(); scheduleSave();
      }
      picker.addEventListener('input', () => { hexInput.value = picker.value; applyColor(picker.value); });
      picker.addEventListener('change', snapshot);
      hexInput.addEventListener('input', () => {
        let val = hexInput.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) applyColor(val);
      });
      hexInput.addEventListener('change', snapshot);

      const resetBtn = document.createElement('button');
      resetBtn.className = 'toggle-btn';
      resetBtn.textContent = '자동';
      resetBtn.addEventListener('click', () => {
        block.color = null; picker.value = state.accentColor; hexInput.value = state.accentColor;
        renderBlocks(); snapshot();
      });

      row.appendChild(picker);
      row.appendChild(hexInput);
      row.appendChild(resetBtn);
      wrap.appendChild(row);

      // 카드 사용 색상 칩
      const chipRow = document.createElement('div');
      chipRow.className = 'card-colors-swatches';
      getCardColors().forEach(color => {
        const chip = document.createElement('button');
        chip.className = 'card-color-chip';
        chip.style.background = color;
        chip.title = color;
        chip.addEventListener('click', e => { e.preventDefault(); applyColor(color); snapshot(); });
        chipRow.appendChild(chip);
      });
      wrap.appendChild(chipRow);

      return wrap;
    }));
  }

  if (block.type !== 'divider') {
    div.appendChild(makeEditorField('굵기', () => {
      const sel = document.createElement('select');
      sel.className = 'editor-select';
      const weights = [['', '기본'], ['300', '300'], ['400', '400'], ['500', '500'], ['600', '600'], ['700', '700'], ['800', '800'], ['900', '900']];
      const current = block.fontWeight || (block.bold ? '700' : '');
      weights.forEach(([val, label]) => {
        const opt = document.createElement('option');
        opt.value = val; opt.textContent = label;
        if (val === current) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => {
        block.fontWeight = sel.value || null;
        block.bold = sel.value === '700';
        renderBlocks(); snapshot();
      });
      return sel;
    }));
  }

  div.appendChild(makeEditorField('아래 여백 (px)', () => {
    const inp = document.createElement('input');
    inp.className = 'editor-input';
    inp.type = 'number'; inp.min = -60; inp.max = 200;
    inp.value = block.marginBottom ?? 0;
    inp.placeholder = '0 (기본값)';
    inp.addEventListener('input', () => { block.marginBottom = parseInt(inp.value) || 0; renderBlocks(); scheduleSave(); });
    inp.addEventListener('change', snapshot);
    return inp;
  }));

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
  if (window.innerWidth <= 768) {
    const blocksTab = document.querySelector('[data-tab="blocks"]');
    if (blocksTab) blocksTab.click();
  }
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
    font: type === 'title' ? "'Jua', sans-serif" : null,
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

const handleE  = document.querySelector('.resize-e');
const handleS  = document.querySelector('.resize-s');
const handleSE = document.querySelector('.resize-se');

function positionHandles() {
  const inner = document.querySelector('.canvas-inner');
  if (!inner) return;
  const iRect = inner.getBoundingClientRect();
  const cRect = cardContainer.getBoundingClientRect();

  // position relative to canvas-inner
  const left = cRect.left - iRect.left + inner.scrollLeft;
  const top  = cRect.top  - iRect.top  + inner.scrollTop;
  const w = cRect.width;
  const h = cRect.height;

  handleE.style.left   = (left + w + 5) + 'px';
  handleE.style.top    = (top + h * 0.15) + 'px';
  handleE.style.width  = '8px';
  handleE.style.height = (h * 0.7) + 'px';

  handleS.style.left   = (left + w * 0.15) + 'px';
  handleS.style.top    = (top + h + 5) + 'px';
  handleS.style.width  = (w * 0.7) + 'px';
  handleS.style.height = '8px';

  handleSE.style.left = (left + w + 3) + 'px';
  handleSE.style.top  = (top + h + 3) + 'px';
}

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
  if (resizing.dir.includes('e')) state.cardW = Math.max(300, Math.min(1000, resizing.startW + dx));
  if (resizing.dir.includes('s')) state.cardH = Math.max(200, Math.min(800, resizing.startH + dy));
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  const sizeBadge = document.getElementById('sizeBadge');
  if (sizeBadge) sizeBadge.textContent = `${state.cardW} × ${state.cardH}`;
  const wSlider = document.getElementById('cardWidthSlider');
  const hSlider = document.getElementById('cardHeightSlider');
  if (wSlider) { wSlider.value = state.cardW; const v = document.getElementById('cardWidthVal'); if (v) v.textContent = state.cardW; }
  if (hSlider) { hSlider.value = state.cardH; const v = document.getElementById('cardHeightVal'); if (v) v.textContent = state.cardH; }
  renderCard();
  positionHandles();
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
    state.originalImageDataUrl = ev.target.result; // 원본 보존
    state.lastCropBox = null; // 새 이미지 업로드 시 크롭 영역 초기화
    cardImage.src = state.imageDataUrl;
    cardImage.style.display = 'block';
    imagePlaceholder.style.display = 'none';
    const img = new Image();
    img.onload = () => {
      state.imageNaturalRatio = img.naturalWidth / img.naturalHeight;
      saveImageToIDB(state.imageDataUrl, state.originalImageDataUrl, state.lastCropBox);
      scheduleSave();
      renderCard();
      requestAnimationFrame(positionHandles);
    };
    img.src = state.imageDataUrl;
  };
  reader.readAsDataURL(file);
});

// 카드 이미지 클릭 → 크롭 모달
cardImage.addEventListener('click', () => {
  if (!state.imageDataUrl) return;
  openCropModal(state.originalImageDataUrl || state.imageDataUrl);
});

/* ============================================================
   CROP MODAL
   ============================================================ */
let cropState = {
  imgNatW: 0, imgNatH: 0,
  displayW: 0, displayH: 0,
  scaleX: 1, scaleY: 1,
  box: { x: 0, y: 0, w: 0, h: 0 },
  dragging: false, resizing: null,
  dragStart: null,
};

function openCropModal(src) {
  const modal = document.getElementById('cropModal');
  const canvas = document.getElementById('cropCanvas');
  const wrapper = document.getElementById('cropCanvasWrapper');
  modal.classList.add('open');

  const img = new Image();
  img.onload = () => {
    cropState.imgNatW = img.naturalWidth;
    cropState.imgNatH = img.naturalHeight;

    // 최대 표시 크기 (모바일: 전체화면 기준)
    const isMobile = window.innerWidth <= 768;
    const maxW = isMobile ? window.innerWidth - 16 : Math.min(window.innerWidth * 0.85, 900);
    const maxH = isMobile ? window.innerHeight - 80 : window.innerHeight * 0.7;
    const ratio = img.naturalWidth / img.naturalHeight;

    let dW = maxW;
    let dH = dW / ratio;
    if (dH > maxH) { dH = maxH; dW = dH * ratio; }

    cropState.displayW = dW;
    cropState.displayH = dH;
    cropState.scaleX = img.naturalWidth / dW;
    cropState.scaleY = img.naturalHeight / dH;

    canvas.width = dW;
    canvas.height = dH;
    canvas.style.width = dW + 'px';
    canvas.style.height = dH + 'px';

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, dW, dH);

    // 마지막 크롭 영역 복원, 없으면 전체
    if (state.lastCropBox) {
      cropState.box = {
        x: state.lastCropBox.x * dW,
        y: state.lastCropBox.y * dH,
        w: state.lastCropBox.w * dW,
        h: state.lastCropBox.h * dH,
      };
    } else {
      cropState.box = { x: 0, y: 0, w: dW, h: dH };
    }
    updateCropBox();
  };
  img.src = src;
}

function updateCropBox() {
  const box = document.getElementById('cropBox');
  const { x, y, w, h } = cropState.box;
  box.style.left   = x + 'px';
  box.style.top    = y + 'px';
  box.style.width  = w + 'px';
  box.style.height = h + 'px';
}

// 크롭박스 드래그 이동
const cropBox = document.getElementById('cropBox');
const cropOverlay = document.getElementById('cropOverlay');

cropBox.addEventListener('mousedown', e => {
  if (e.target.classList.contains('crop-handle')) return;
  e.preventDefault();
  cropState.dragging = true;
  cropState.dragStart = { mx: e.clientX, my: e.clientY, bx: cropState.box.x, by: cropState.box.y };
});

// 핸들 리사이즈
document.querySelectorAll('.crop-handle').forEach(handle => {
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    cropState.resizing = {
      dir: handle.dataset.dir,
      mx: e.clientX, my: e.clientY,
      box: { ...cropState.box }
    };
  });
});

document.addEventListener('mousemove', e => {
  const { displayW, displayH } = cropState;
  const minSize = 20;

  if (cropState.dragging) {
    const dx = e.clientX - cropState.dragStart.mx;
    const dy = e.clientY - cropState.dragStart.my;
    let nx = cropState.dragStart.bx + dx;
    let ny = cropState.dragStart.by + dy;
    nx = Math.max(0, Math.min(displayW - cropState.box.w, nx));
    ny = Math.max(0, Math.min(displayH - cropState.box.h, ny));
    cropState.box.x = nx;
    cropState.box.y = ny;
    updateCropBox();
  }

  if (cropState.resizing) {
    const { dir, mx, my, box } = cropState.resizing;
    const dx = e.clientX - mx;
    const dy = e.clientY - my;
    let { x, y, w, h } = box;

    if (dir.includes('e')) w = Math.max(minSize, Math.min(displayW - x, w + dx));
    if (dir.includes('s')) h = Math.max(minSize, Math.min(displayH - y, h + dy));
    if (dir.includes('w')) { const nw = Math.max(minSize, w - dx); x = Math.max(0, x + w - nw); w = nw; }
    if (dir.includes('n')) { const nh = Math.max(minSize, h - dy); y = Math.max(0, y + h - nh); h = nh; }

    cropState.box = { x, y, w, h };
    updateCropBox();
  }
});

document.addEventListener('mouseup', () => {
  cropState.dragging = false;
  cropState.resizing = null;
});

/* ---- CROP TOUCH SUPPORT ---- */
function getCropTouchPos(e) {
  const t = e.touches[0] || e.changedTouches[0];
  return { clientX: t.clientX, clientY: t.clientY };
}

cropBox.addEventListener('touchstart', e => {
  if (e.target.classList.contains('crop-handle')) return;
  e.preventDefault();
  const pos = getCropTouchPos(e);
  cropState.dragging = true;
  cropState.dragStart = { mx: pos.clientX, my: pos.clientY, bx: cropState.box.x, by: cropState.box.y };
}, { passive: false });

document.querySelectorAll('.crop-handle').forEach(handle => {
  handle.addEventListener('touchstart', e => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getCropTouchPos(e);
    cropState.resizing = { dir: handle.dataset.dir, mx: pos.clientX, my: pos.clientY, box: { ...cropState.box } };
  }, { passive: false });
});

document.addEventListener('touchmove', e => {
  if (!cropState.dragging && !cropState.resizing) return;
  e.preventDefault();
  const pos = getCropTouchPos(e);
  const { displayW, displayH } = cropState;
  const minSize = 20;

  if (cropState.dragging) {
    const dx = pos.clientX - cropState.dragStart.mx;
    const dy = pos.clientY - cropState.dragStart.my;
    let nx = Math.max(0, Math.min(displayW - cropState.box.w, cropState.dragStart.bx + dx));
    let ny = Math.max(0, Math.min(displayH - cropState.box.h, cropState.dragStart.by + dy));
    cropState.box.x = nx;
    cropState.box.y = ny;
    updateCropBox();
  }

  if (cropState.resizing) {
    const { dir, mx, my, box } = cropState.resizing;
    const dx = pos.clientX - mx;
    const dy = pos.clientY - my;
    let { x, y, w, h } = box;
    if (dir.includes('e')) w = Math.max(minSize, Math.min(displayW - x, w + dx));
    if (dir.includes('s')) h = Math.max(minSize, Math.min(displayH - y, h + dy));
    if (dir.includes('w')) { const nw = Math.max(minSize, w - dx); x = Math.max(0, x + w - nw); w = nw; }
    if (dir.includes('n')) { const nh = Math.max(minSize, h - dy); y = Math.max(0, y + h - nh); h = nh; }
    cropState.box = { x, y, w, h };
    updateCropBox();
  }
}, { passive: false });

document.addEventListener('touchend', () => {
  cropState.dragging = false;
  cropState.resizing = null;
});

document.getElementById('cropCancel').addEventListener('click', () => {
  document.getElementById('cropModal').classList.remove('open');
});

document.getElementById('cropConfirm').addEventListener('click', () => {
  const { box, scaleX, scaleY, imgNatW, imgNatH } = cropState;
  const src = state.originalImageDataUrl || state.imageDataUrl;

  const img = new Image();
  img.onload = () => {
    // 원본 해상도로 크롭
    const natX = Math.round(box.x * scaleX);
    const natY = Math.round(box.y * scaleY);
    const natW = Math.round(box.w * scaleX);
    const natH = Math.round(box.h * scaleY);

    const offscreen = document.createElement('canvas');
    offscreen.width  = natW;
    offscreen.height = natH;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(img, natX, natY, natW, natH, 0, 0, natW, natH);

    const croppedUrl = offscreen.toDataURL('image/png');
    state.imageDataUrl = croppedUrl;
    state.imageNaturalRatio = natW / natH;
    state.lastCropBox = {
      x: box.x / cropState.displayW,
      y: box.y / cropState.displayH,
      w: box.w / cropState.displayW,
      h: box.h / cropState.displayH,
    };

    cardImage.src = croppedUrl;
    cardImage.style.display = 'block';
    imagePlaceholder.style.display = 'none';

    saveImageToIDB(state.imageDataUrl, state.originalImageDataUrl, state.lastCropBox);
    scheduleSave();
    renderCard();
    requestAnimationFrame(positionHandles);
    document.getElementById('cropModal').classList.remove('open');
  };
  img.src = src;
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

/* ============================================================
   IMAGE PADDING
   ============================================================ */
['Top','Right','Bottom','Left'].forEach(dir => {
  document.getElementById('imgPad' + dir).addEventListener('input', e => {
    state.imgPad[dir.toLowerCase()] = parseInt(e.target.value) || 0;
    renderCard();
    scheduleSave();
  });
});

/* ============================================================
   CARD SIZE SLIDERS
   ============================================================ */
document.getElementById('cardWidthSlider').addEventListener('input', e => {
  state.cardW = parseInt(e.target.value);
  document.getElementById('cardWidthVal').textContent = state.cardW;
  const sizeBadge = document.getElementById('sizeBadge');
  if (sizeBadge) sizeBadge.textContent = `${state.cardW} × ${state.cardH}`;
  renderCard();
  requestAnimationFrame(positionHandles);
  requestAnimationFrame(mobileAutoFit);
  scheduleSave();
});
document.getElementById('cardWidthSlider').addEventListener('change', snapshot);

document.getElementById('cardHeightSlider').addEventListener('input', e => {
  state.cardH = parseInt(e.target.value);
  document.getElementById('cardHeightVal').textContent = state.cardH;
  const sizeBadge = document.getElementById('sizeBadge');
  if (sizeBadge) sizeBadge.textContent = `${state.cardW} × ${state.cardH}`;
  renderCard();
  requestAnimationFrame(positionHandles);
  requestAnimationFrame(mobileAutoFit);
  scheduleSave();
});
document.getElementById('cardHeightSlider').addEventListener('change', snapshot);

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
document.getElementById('bgHexInput').addEventListener('input', e => {
  let val = e.target.value.trim();
  if (!val.startsWith('#')) val = '#' + val;
  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
    state.bgColor = val; state.isDark = isDarkColor(val);
    scheduleSave(); render();
  }
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
   EXPORT SCALE & ZOOM
   ============================================================ */
let exportScale = 4;
let zoomLevel = 1;

document.querySelectorAll('.scale-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    exportScale = parseInt(btn.dataset.scale);
  });
});

document.getElementById('zoomSlider').addEventListener('input', e => {
  zoomLevel = parseInt(e.target.value) / 100;
  document.getElementById('zoomVal').textContent = e.target.value + '%';
  document.querySelector('.canvas-inner').style.transform = `scale(${zoomLevel})`;
  document.querySelector('.canvas-inner').style.transformOrigin = 'center center';
});

async function captureCanvas(scale) {
  const prevSel = state.selectedBlockId;
  state.selectedBlockId = null;
  renderBlocks();
  [handleE, handleS, handleSE].forEach(h => h.style.display = 'none');
  document.querySelectorAll('.block-controls').forEach(h => h.style.display = 'none');

  cardContainer.style.boxShadow = 'none';
  cardContainer.style.borderRadius = '0';

  let canvas;
  try {
    canvas = await html2canvas(cardContainer, {
      scale: scale,
      useCORS: true,
      backgroundColor: state.bgColor,
      width: state.cardW,
      height: state.cardH,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: state.cardW,
      windowHeight: state.cardH,
      logging: false,
    });
  } finally {
    cardContainer.style.boxShadow = '';
    cardContainer.style.borderRadius = '';
    [handleE, handleS, handleSE].forEach(h => h.style.display = '');
    state.selectedBlockId = prevSel;
    render();
  }
  return canvas;
}

document.getElementById('exportPng').addEventListener('click', async () => {
  const canvas = await captureCanvas(exportScale);
  const link = document.createElement('a');
  link.download = `card_${exportScale}x.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

document.getElementById('exportJpg').addEventListener('click', async () => {
  const canvas = await captureCanvas(exportScale);
  const link = document.createElement('a');
  link.download = `card_${exportScale}x.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
});

/* ============================================================
   CLEAR / RESET
   ============================================================ */
document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('모든 내용을 초기화할까요?')) return;
  clearStorage();
  clearImageFromIDB();
  state.cardW = 720;
  state.cardH = 470;
  state.imageDataUrl = null;
  state.originalImageDataUrl = null;
  cardImage.src = '';
  cardImage.style.display = 'none';
  blockIdCounter = 0;
  initDefaultBlocks();
  render();
  applyDefaultImage();
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

function initFontSelect() {
  const sel = document.getElementById('fontSelect');
  FONTS.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f.value;
    opt.textContent = f.label;
    opt.style.fontFamily = f.value;
    sel.appendChild(opt);
  });
  sel.value = state.font;
}


const VERSIONS = [
  { tag: 'v2.1',   log: '폰트 피커 초기화 순서 수정\n우측 패널 스크롤 개선' },
  { tag: 'v2.0',   log: '블록별 폰트 선택\n폰트 미리보기 UI\n나눔체/도현 추가' },
  { tag: 'v1.9',   log: '저장 키 초기화 (예시 글 복원)\n상단/하단 이미지 비율 수정' },
  { tag: 'v1.8',   log: '이미지 비율 로직 완전 재설계\n높이=카드높이, 너비=원본비율 자동계산' },
  { tag: 'v1.5',   log: '버전 기록 패널 추가' },
  { tag: 'v1.4.2', log: '카드 크기 조절 시 왼쪽 잘림 수정 시도' },
  { tag: 'v1.4.1', log: '이미지 object-fit cover 적용' },
  { tag: 'v1.4',   log: '버전 표시 추가\n이미지 클리핑 수정\n리사이즈 핸들 개선' },
  { tag: 'v1.3',   log: '자동 저장 (localStorage)\nPNG/JPG/PDF 내보내기\n초기화 버튼' },
  { tag: 'v1.2',   log: '글자 크기 고정\nCmd+Z 실행취소\n정보행 라벨/내용 분리\n드래그 재정렬\n인라인 편집' },
  { tag: 'v1.1',   log: '이미지 위치 선택\n블록 추가/삭제/이동\n폰트/색상 설정' },
  { tag: 'v1.0',   log: '최초 출시' },
];

function initVersionPanel() {
  const badge = document.getElementById('versionBadge');
  const panel = document.getElementById('versionPanel');
  const inner = document.getElementById('versionPanelInner');

  // render entries
  inner.innerHTML = '';
  VERSIONS.forEach(v => {
    const entry = document.createElement('div');
    entry.className = 'version-entry';
    entry.innerHTML = `<span class="version-entry-tag">${v.tag}</span><span class="version-entry-log">${v.log}</span>`;
    inner.appendChild(entry);
  });

  badge.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });
  document.addEventListener('click', () => panel.classList.remove('open'));
  panel.addEventListener('click', e => e.stopPropagation());
}


/* ============================================================
   MOBILE: AUTO-FIT ZOOM
   ============================================================ */
function mobileAutoFit() {
  if (window.innerWidth > 768) return;
  const canvasArea = document.querySelector('.canvas-area');
  const inner = document.querySelector('.canvas-inner');
  if (!canvasArea || !inner) return;
  const padH = 32, padW = 32;
  const availW = canvasArea.clientWidth - padW;
  const availH = canvasArea.clientHeight - padH;
  if (availW <= 0 || availH <= 0) return;
  const scale = Math.min(availW / state.cardW, availH / state.cardH, 1);
  inner.style.transform = `scale(${scale})`;
  inner.style.transformOrigin = 'center center';
}

window.addEventListener('resize', () => {
  requestAnimationFrame(positionHandles);
  mobileAutoFit();
});

/* ============================================================
   MOBILE: TAB SWITCHING
   ============================================================ */
function initMobileTabs() {
  const tabBtns = document.querySelectorAll('.mobile-tab-btn');
  if (!tabBtns.length) return;
  const leftPanel = document.querySelector('.left-panel');
  const rightPanel = document.querySelector('.right-panel');

  function activateTab(tab) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    leftPanel.classList.toggle('mobile-active', tab === 'tools');
    rightPanel.classList.toggle('mobile-active', tab === 'blocks');
  }

  tabBtns.forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));
  activateTab('tools');
}

/* ============================================================
   MOBILE: EXPORT BUTTONS
   ============================================================ */
document.getElementById('mobileExportPng')?.addEventListener('click', async () => {
  const canvas = await captureCanvas(exportScale);
  const link = document.createElement('a');
  link.download = `card_${exportScale}x.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

document.getElementById('mobileExportJpg')?.addEventListener('click', async () => {
  const canvas = await captureCanvas(exportScale);
  const link = document.createElement('a');
  link.download = `card_${exportScale}x.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
});

function applyDefaultImage() {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      state.imageDataUrl = 'default.png';
      state.originalImageDataUrl = 'default.png';
      state.imageNaturalRatio = img.naturalWidth / img.naturalHeight;
      cardImage.src = 'default.png';
      cardImage.style.display = 'block';
      imagePlaceholder.style.display = 'none';
      renderCard();
      requestAnimationFrame(positionHandles);
      resolve();
    };
    img.onerror = resolve;
    img.src = 'default.png';
  });
}

(async () => {
  const loaded = loadFromStorage();
  if (!loaded) {
    initDefaultBlocks();
    await applyDefaultImage();
  } else {
    if (state.blocks.length > 0) {
      blockIdCounter = Math.max(...state.blocks.map(b => b.id));
    }
    snapshot();
  }
  initFontSelect();
  render();
  initVersionPanel();
  initMobileTabs();

  // IDB에서 이미지 복원 (비동기), 없으면 기본 이미지
  if (loaded) {
    const imgData = await loadImageFromIDB();
    if (imgData.imageDataUrl) {
      state.imageDataUrl = imgData.imageDataUrl;
      state.originalImageDataUrl = imgData.originalImageDataUrl;
      state.lastCropBox = imgData.lastCropBox;
      cardImage.src = imgData.imageDataUrl;
      cardImage.style.display = 'block';
      imagePlaceholder.style.display = 'none';
      const img = new Image();
      img.onload = () => {
        state.imageNaturalRatio = img.naturalWidth / img.naturalHeight;
        renderCard();
        requestAnimationFrame(positionHandles);
      };
      img.src = imgData.imageDataUrl;
    } else {
      await applyDefaultImage();
    }
  }
})();
