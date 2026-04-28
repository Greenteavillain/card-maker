/* =============================================
   CARD MAKER — APP LOGIC
   ============================================= */

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
};

let blockIdCounter = 0;
function nextId() { return ++blockIdCounter; }

/* ---- DEFAULT BLOCKS ---- */
function initDefaultBlocks() {
  state.blocks = [
    { id: nextId(), type: 'supertitle', text: '2026 유니 작가의 여행드로잉', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'title',      text: '바다 그리기 특강', fontSize: null, color: null, bold: true,  align: 'left' },
    { id: nextId(), type: 'subtitle',   text: '선 과제 스케치 해온 후\n수업에 채색 함께 하기', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'divider',    text: '', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info',       text: '일시\t1차 5월 19일 / 2차 5월 26일 (화요일 낮 2시~4시 30분)', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info',       text: '장소\t꿈지락 (동천로 24, 302호)', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'info',       text: '수강료\t2회 8만원 (각 차시마다 작품 완성)', fontSize: null, color: null, bold: false, align: 'left' },
    { id: nextId(), type: 'body',       text: '강사 유니 @yuni_0010', fontSize: null, color: null, bold: false, align: 'left' },
  ];
}

/* ---- DOM REFS ---- */
const cardContainer  = document.getElementById('cardContainer');
const cardImageArea  = document.getElementById('cardImageArea');
const cardTextArea   = document.getElementById('cardTextArea');
const blocksContainer= document.getElementById('blocksContainer');
const cardImage      = document.getElementById('cardImage');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const rightPanel     = document.getElementById('rightPanel');
const blockEditorContent = document.getElementById('blockEditorContent');

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  renderCard();
  renderBlocks();
  renderBlockEditor();
}

function renderCard() {
  const { cardW, cardH, bgColor, font, imagePos, imageSizePct, accentColor, isDark } = state;

  // size
  cardContainer.style.width  = cardW + 'px';
  cardContainer.style.height = cardH + 'px';

  // bg & font
  cardContainer.style.setProperty('--card-bg', bgColor);
  cardContainer.style.setProperty('--card-font', font);
  cardContainer.style.setProperty('--accent', accentColor);
  cardContainer.style.background = bgColor;
  cardContainer.style.fontFamily = font;

  // dark
  cardContainer.classList.toggle('dark', isDark);

  // layout
  ['layout-left','layout-right','layout-top','layout-bottom','layout-background'].forEach(c => cardContainer.classList.remove(c));
  cardContainer.classList.add('layout-' + imagePos);

  // image area sizing
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

  // text area padding — scales with card size
  const padH = Math.max(20, Math.round(cardH * 0.06));
  const padW = Math.max(20, Math.round(cardW * 0.045));
  cardTextArea.style.padding = `${padH}px ${padW}px`;

  // block gap — scales with card height
  const gap = Math.max(4, Math.round(cardH * 0.013));
  blocksContainer.style.gap = gap + 'px';
}

function renderBlocks() {
  // rebuild DOM
  blocksContainer.innerHTML = '';
  state.blocks.forEach(block => {
    const el = buildBlockEl(block);
    blocksContainer.appendChild(el);
  });
}

function buildBlockEl(block) {
  const wrap = document.createElement('div');
  wrap.className = `block block-${block.type}`;
  wrap.dataset.id = block.id;
  if (block.id === state.selectedBlockId) wrap.classList.add('selected');

  const textEl = document.createElement('div');
  textEl.className = 'block-text';

  // apply custom styles
  const { cardH } = state;

  if (block.type === 'title') {
    const base = Math.max(18, Math.round(cardH * 0.075));
    textEl.style.fontSize = block.fontSize ? block.fontSize + 'px' : base + 'px';
  } else if (block.type === 'supertitle') {
    const base = Math.max(10, Math.round(cardH * 0.026));
    textEl.style.fontSize = block.fontSize ? block.fontSize + 'px' : base + 'px';
  } else if (block.type === 'subtitle') {
    const base = Math.max(12, Math.round(cardH * 0.032));
    textEl.style.fontSize = block.fontSize ? block.fontSize + 'px' : base + 'px';
  } else if (block.type === 'body' || block.type === 'info') {
    const base = Math.max(10, Math.round(cardH * 0.027));
    textEl.style.fontSize = block.fontSize ? block.fontSize + 'px' : base + 'px';
  }

  if (block.color) textEl.style.color = block.color;
  if (block.bold)  textEl.style.fontWeight = '700';
  textEl.style.textAlign = block.align || 'left';

  if (block.type === 'divider') {
    textEl.style.height = '1px';
    textEl.style.background = state.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
    textEl.style.margin = '6px 0';
  } else if (block.type === 'info') {
    // render label+value
    const lines = block.text.split('\n');
    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const label = document.createElement('strong');
        label.textContent = parts[0];
        label.style.fontWeight = '700';
        label.style.minWidth = '50px';
        const val = document.createElement('span');
        val.textContent = parts.slice(1).join(' ');
        textEl.appendChild(label);
        textEl.appendChild(val);
      } else {
        const s = document.createElement('span');
        s.style.gridColumn = '1 / -1';
        s.textContent = line;
        textEl.appendChild(s);
      }
    });
  } else {
    textEl.textContent = block.text;
  }

  wrap.appendChild(textEl);

  // controls
  if (block.type !== 'divider') {
    const controls = document.createElement('div');
    controls.className = 'block-controls';

    const upBtn = document.createElement('button');
    upBtn.className = 'block-ctrl-btn';
    upBtn.textContent = '↑';
    upBtn.title = '위로';
    upBtn.addEventListener('click', e => { e.stopPropagation(); moveBlock(block.id, -1); });

    const dnBtn = document.createElement('button');
    dnBtn.className = 'block-ctrl-btn';
    dnBtn.textContent = '↓';
    dnBtn.title = '아래로';
    dnBtn.addEventListener('click', e => { e.stopPropagation(); moveBlock(block.id, 1); });

    const delBtn = document.createElement('button');
    delBtn.className = 'block-ctrl-btn';
    delBtn.textContent = '✕';
    delBtn.title = '삭제';
    delBtn.addEventListener('click', e => { e.stopPropagation(); deleteBlock(block.id); });

    controls.appendChild(upBtn);
    controls.appendChild(dnBtn);
    controls.appendChild(delBtn);
    wrap.appendChild(controls);
  }

  wrap.addEventListener('click', () => selectBlock(block.id));

  return wrap;
}

/* ---- BLOCK EDITOR ---- */
function renderBlockEditor() {
  if (!state.selectedBlockId) {
    blockEditorContent.innerHTML = '<div class="no-selection">블록을 클릭하면<br/>여기서 편집할 수 있어요</div>';
    return;
  }
  const block = state.blocks.find(b => b.id === state.selectedBlockId);
  if (!block) { blockEditorContent.innerHTML = ''; return; }

  const div = document.createElement('div');
  div.className = 'block-editor';

  // Text field
  if (block.type !== 'divider') {
    const tf = document.createElement('div');
    tf.className = 'editor-field';
    tf.innerHTML = `<div class="editor-label">텍스트</div>`;
    const ta = document.createElement('textarea');
    ta.className = 'editor-textarea';
    ta.value = block.text;
    ta.rows = block.type === 'info' ? 4 : 3;
    ta.placeholder = block.type === 'info' ? '라벨\t내용\n(탭으로 라벨과 내용 구분)' : '내용 입력...';
    ta.addEventListener('input', () => { block.text = ta.value; renderBlocks(); });
    tf.appendChild(ta);
    div.appendChild(tf);
  }

  // Type
  const typeField = document.createElement('div');
  typeField.className = 'editor-field';
  typeField.innerHTML = `<div class="editor-label">블록 타입</div>`;
  const typeSelect = document.createElement('select');
  typeSelect.className = 'editor-select';
  ['supertitle','title','subtitle','body','info','divider'].forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = { supertitle:'슈퍼타이틀', title:'제목', subtitle:'부제목', body:'본문', info:'정보행', divider:'구분선' }[t];
    if (t === block.type) opt.selected = true;
    typeSelect.appendChild(opt);
  });
  typeSelect.addEventListener('change', () => { block.type = typeSelect.value; render(); });
  typeField.appendChild(typeSelect);
  div.appendChild(typeField);

  // Font size
  const fsField = document.createElement('div');
  fsField.className = 'editor-field';
  fsField.innerHTML = `<div class="editor-label">글자 크기 (비워두면 자동)</div>`;
  const fsInput = document.createElement('input');
  fsInput.className = 'editor-input';
  fsInput.type = 'number';
  fsInput.placeholder = '자동';
  fsInput.value = block.fontSize || '';
  fsInput.addEventListener('input', () => {
    block.fontSize = fsInput.value ? parseInt(fsInput.value) : null;
    renderBlocks();
  });
  fsField.appendChild(fsInput);
  div.appendChild(fsField);

  // Align
  const alignField = document.createElement('div');
  alignField.className = 'editor-field';
  alignField.innerHTML = `<div class="editor-label">정렬</div>`;
  const alignRow = document.createElement('div');
  alignRow.className = 'editor-row';
  ['left','center','right'].forEach(a => {
    const btn = document.createElement('button');
    btn.className = 'toggle-btn' + (block.align === a ? ' on' : '');
    btn.textContent = { left:'좌', center:'중', right:'우' }[a];
    btn.addEventListener('click', () => { block.align = a; render(); });
    alignRow.appendChild(btn);
  });
  alignField.appendChild(alignRow);
  div.appendChild(alignField);

  // Color
  const colorField = document.createElement('div');
  colorField.className = 'editor-field';
  colorField.innerHTML = `<div class="editor-label">색상 (비워두면 자동)</div>`;
  const colorRow = document.createElement('div');
  colorRow.className = 'editor-color-row';
  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.value = block.color || state.accentColor;
  colorPicker.addEventListener('input', () => { block.color = colorPicker.value; renderBlocks(); });
  const resetColorBtn = document.createElement('button');
  resetColorBtn.className = 'toggle-btn';
  resetColorBtn.textContent = '자동 색상';
  resetColorBtn.addEventListener('click', () => { block.color = null; colorPicker.value = state.accentColor; renderBlocks(); });
  colorRow.appendChild(colorPicker);
  colorRow.appendChild(resetColorBtn);
  colorField.appendChild(colorRow);
  div.appendChild(colorField);

  // Bold
  const boldRow = document.createElement('div');
  boldRow.className = 'editor-toggle-row';
  boldRow.innerHTML = '<span>굵게</span>';
  const boldBtn = document.createElement('button');
  boldBtn.className = 'toggle-btn' + (block.bold ? ' on' : '');
  boldBtn.textContent = block.bold ? 'ON' : 'OFF';
  boldBtn.addEventListener('click', () => {
    block.bold = !block.bold;
    boldBtn.classList.toggle('on', block.bold);
    boldBtn.textContent = block.bold ? 'ON' : 'OFF';
    renderBlocks();
  });
  boldRow.appendChild(boldBtn);
  div.appendChild(boldRow);

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'del-block-btn';
  delBtn.textContent = '이 블록 삭제';
  delBtn.addEventListener('click', () => deleteBlock(block.id));
  div.appendChild(delBtn);

  blockEditorContent.innerHTML = '';
  blockEditorContent.appendChild(div);
}

/* ============================================================
   BLOCK OPERATIONS
   ============================================================ */
function selectBlock(id) {
  state.selectedBlockId = id;
  render();
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
  const defaults = {
    supertitle: { text: '부가 설명을 입력하세요' },
    title:      { text: '제목을 입력하세요' },
    subtitle:   { text: '부제목을 입력하세요' },
    body:       { text: '본문 내용을 입력하세요' },
    info:       { text: '항목\t내용을 입력하세요' },
    divider:    { text: '' },
  };
  const block = {
    id: nextId(),
    type,
    text: defaults[type]?.text || '',
    fontSize: null,
    color: null,
    bold: false,
    align: 'left',
  };
  state.blocks.push(block);
  state.selectedBlockId = block.id;
  render();
  // scroll to bottom of card text area
  blocksContainer.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
}

/* ============================================================
   RESIZE
   ============================================================ */
let resizing = null;

document.querySelectorAll('.resize-handle').forEach(handle => {
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = state.cardW;
    const startH = state.cardH;
    const dir = handle.dataset.dir;
    resizing = { startX, startY, startW, startH, dir };
  });
});

document.addEventListener('mousemove', e => {
  if (!resizing) return;
  const dx = e.clientX - resizing.startX;
  const dy = e.clientY - resizing.startY;
  if (resizing.dir.includes('e')) state.cardW = Math.max(300, resizing.startW + dx);
  if (resizing.dir.includes('s')) state.cardH = Math.max(200, resizing.startH + dy);
  // sync inputs
  document.getElementById('cardW').value = Math.round(state.cardW);
  document.getElementById('cardH').value = Math.round(state.cardH);
  // deselect preset
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  render();
});

document.addEventListener('mouseup', () => { resizing = null; });

/* ============================================================
   IMAGE UPLOAD
   ============================================================ */
document.getElementById('imageUpload').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  cardImage.src = url;
  cardImage.style.display = 'block';
  imagePlaceholder.style.display = 'none';
});

/* ============================================================
   IMAGE POSITION
   ============================================================ */
document.getElementById('imagePositionGrid').querySelectorAll('.pos-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.imagePos = btn.dataset.pos;
    render();
  });
});

document.getElementById('imageSizeSlider').addEventListener('input', e => {
  state.imageSizePct = parseInt(e.target.value);
  document.getElementById('imageSizeVal').textContent = state.imageSizePct + '%';
  render();
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
    render();
  });
});

document.getElementById('cardW').addEventListener('change', e => {
  state.cardW = Math.max(300, parseInt(e.target.value) || 300);
  render();
});
document.getElementById('cardH').addEventListener('change', e => {
  state.cardH = Math.max(200, parseInt(e.target.value) || 200);
  render();
});

/* ============================================================
   FONT
   ============================================================ */
document.getElementById('fontSelect').addEventListener('change', e => {
  state.font = e.target.value;
  render();
});

/* ============================================================
   COLORS
   ============================================================ */
// BG color swatches
document.querySelectorAll('.color-swatches').forEach(group => {
  // only handle swatch buttons (not custom pickers)
  group.querySelectorAll('button.swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      // determine which group
      const isBg = group.previousElementSibling?.textContent.includes('배경');
      if (isBg) {
        group.querySelectorAll('button.swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.bgColor = btn.dataset.color;
        // detect dark
        state.isDark = isDarkColor(state.bgColor);
      } else {
        group.querySelectorAll('button.swatch').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.accentColor = btn.dataset.color;
      }
      render();
    });
  });
});

document.getElementById('bgColorPicker').addEventListener('input', e => {
  state.bgColor = e.target.value;
  state.isDark = isDarkColor(state.bgColor);
  render();
});
document.getElementById('accentColorPicker').addEventListener('input', e => {
  state.accentColor = e.target.value;
  render();
});

function isDarkColor(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

/* ============================================================
   ADD BLOCK BUTTONS
   ============================================================ */
document.querySelectorAll('.add-block-btn').forEach(btn => {
  btn.addEventListener('click', () => addBlock(btn.dataset.type));
});

/* ============================================================
   EXPORT
   ============================================================ */
document.getElementById('exportBtn').addEventListener('click', async () => {
  // deselect
  const prevSelected = state.selectedBlockId;
  state.selectedBlockId = null;
  renderBlocks();

  // hide resize handles
  document.querySelectorAll('.resize-handle').forEach(h => h.style.display = 'none');
  document.querySelectorAll('.block-controls').forEach(h => h.style.display = 'none');

  try {
    const canvas = await html2canvas(cardContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: state.bgColor,
      width: state.cardW,
      height: state.cardH,
    });
    const link = document.createElement('a');
    link.download = 'card.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch(err) {
    alert('저장 중 오류가 발생했습니다: ' + err.message);
  } finally {
    document.querySelectorAll('.resize-handle').forEach(h => h.style.display = '');
    state.selectedBlockId = prevSelected;
    render();
  }
});

/* ============================================================
   CLICK OUTSIDE TO DESELECT
   ============================================================ */
cardContainer.addEventListener('click', e => {
  if (e.target === cardContainer || e.target === cardTextArea || e.target === blocksContainer) {
    state.selectedBlockId = null;
    render();
  }
});

/* ============================================================
   INIT
   ============================================================ */
initDefaultBlocks();
render();
