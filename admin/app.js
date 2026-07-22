const AdminState = { items: [], catalog: [], selectedIndex: null };

async function loadData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  AdminState.items = data.items;
  AdminState.catalog = data.catalog;
  renderList();
}

function romanFor(birdIndex) {
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return ROMAN[birdIndex] ?? String(birdIndex + 1);
}

function renderList() {
  const list = document.getElementById('item-list');
  list.innerHTML = '';
  let birdIndex = 0;
  AdminState.items.forEach((item, index) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.index = String(index);
    li.className = item.type === 'section' ? 'row row-section' : 'row row-bird';

    const posInput = document.createElement('input');
    posInput.type = 'number';
    posInput.min = '1';
    posInput.value = String(index + 1);
    posInput.className = 'pos-input';
    posInput.addEventListener('change', () => moveItem(index, Number(posInput.value) - 1));

    const label = document.createElement('span');
    label.className = 'row-label';
    label.textContent = item.type === 'section'
      ? `— ${item.title} —`
      : `${item.species}`;
    if (item.type === 'bird') {
      const numTag = document.createElement('span');
      numTag.className = 'row-num';
      numTag.textContent = `No. ${romanFor(birdIndex)}`;
      label.prepend(numTag);
    }

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteItem(index); });

    li.append(posInput, label);
    if (item.type === 'bird') {
      const dupBtn = document.createElement('button');
      dupBtn.textContent = 'Duplicate';
      dupBtn.addEventListener('click', (e) => { e.stopPropagation(); duplicateItem(index); });
      li.append(dupBtn);
    }
    li.append(delBtn);

    li.addEventListener('click', () => selectItem(index));
    li.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', String(index)));
    li.addEventListener('dragover', (e) => e.preventDefault());
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = Number(e.dataTransfer.getData('text/plain'));
      moveItem(from, index);
    });

    list.appendChild(li);
    if (item.type === 'bird') birdIndex += 1;
  });
}

function moveItem(fromIndex, toIndex) {
  const clamped = Math.max(0, Math.min(AdminState.items.length - 1, toIndex));
  const [moved] = AdminState.items.splice(fromIndex, 1);
  AdminState.items.splice(clamped, 0, moved);
  AdminState.selectedIndex = clamped;
  renderList();
  renderEditor();
}

function deleteItem(index) {
  AdminState.items.splice(index, 1);
  AdminState.selectedIndex = null;
  renderList();
  renderEditor();
}

function duplicateItem(index) {
  const copy = JSON.parse(JSON.stringify(AdminState.items[index]));
  AdminState.items.splice(index + 1, 0, copy);
  renderList();
}

function selectItem(index) {
  AdminState.selectedIndex = index;
  renderEditor();
}

document.getElementById('add-bird').addEventListener('click', () => {
  AdminState.items.push({
    type: 'bird', image: null, alt: '', species: 'New Bird',
    binomial: '', remark: '', facts: [],
  });
  AdminState.selectedIndex = AdminState.items.length - 1;
  renderList();
  renderEditor();
});

document.getElementById('add-section').addEventListener('click', () => {
  AdminState.items.push({ type: 'section', title: 'New Section' });
  AdminState.selectedIndex = AdminState.items.length - 1;
  renderList();
  renderEditor();
});

function renderEditor() {
  const pane = document.getElementById('editor-pane');
  pane.innerHTML = '';
  if (AdminState.selectedIndex === null) {
    pane.innerHTML = '<p class="empty-state">Select an item to edit.</p>';
    return;
  }
  const item = AdminState.items[AdminState.selectedIndex];
  if (item.type === 'section') {
    renderSectionEditor(pane, item);
  } else {
    renderBirdEditor(pane, item);
  }
  renderPreview();
}

function field(labelText, value, onInput, tag = 'input') {
  const wrap = document.createElement('label');
  wrap.className = 'field';
  const labelEl = document.createElement('span');
  labelEl.textContent = labelText;
  const inputEl = document.createElement(tag);
  inputEl.value = value || '';
  inputEl.addEventListener('input', () => { onInput(inputEl.value); renderPreview(); });
  wrap.append(labelEl, inputEl);
  return wrap;
}

function renderSectionEditor(pane, item) {
  pane.appendChild(field('Title', item.title, (v) => { item.title = v; syncList(); }));
}

function renderBirdEditor(pane, item) {
  pane.appendChild(field('Species', item.species, (v) => { item.species = v; syncList(); }));
  pane.appendChild(field('Binomial', item.binomial, (v) => { item.binomial = v; }));
  pane.appendChild(field('Alt text', item.alt, (v) => { item.alt = v; }));
  pane.appendChild(field('Remark (HTML allowed)', item.remark, (v) => { item.remark = v; }, 'textarea'));

  const upload = document.createElement('input');
  upload.type = 'file';
  upload.accept = 'image/*';
  upload.hidden = true;
  upload.addEventListener('change', () => uploadImage(item, upload.files[0]));

  const chooseBtn = document.createElement('button');
  chooseBtn.type = 'button';
  chooseBtn.textContent = 'Choose File';
  // Safari sometimes refuses to open the OS picker for a file input that
  // was just inserted via appendChild/innerHTML; calling click() on it
  // from a real button's click handler always counts as a user gesture.
  chooseBtn.addEventListener('click', () => upload.click());

  pane.append(chooseBtn, upload);

  if (item.image) {
    const preview = document.createElement('img');
    preview.src = item.image;
    preview.alt = '';
    preview.className = 'thumb';
    pane.appendChild(preview);
  }

  pane.appendChild(renderFactsEditor(item));
}

function renderFactsEditor(item) {
  const wrap = document.createElement('div');
  wrap.className = 'facts-editor';
  item.facts.forEach((fact, i) => {
    const row = document.createElement('div');
    row.className = 'fact-row';
    const label = document.createElement('span');
    const catEntry = AdminState.catalog.find((c) => c.key === fact.type);
    label.textContent = catEntry ? catEntry.label : fact.type;
    const valueInput = document.createElement('input');
    valueInput.value = fact.value;
    valueInput.addEventListener('input', () => { fact.value = valueInput.value; renderPreview(); });
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => { item.facts.splice(i, 1); renderEditor(); });
    row.append(label, valueInput, removeBtn);
    wrap.appendChild(row);
  });

  const addRow = document.createElement('div');
  addRow.className = 'add-fact-row';
  const select = document.createElement('select');
  select.innerHTML = '<option value="">-- pick a fact type --</option>' +
    AdminState.catalog.map((c) => `<option value="${c.key}">${c.label}</option>`).join('') +
    '<option value="__custom__">+ New custom fact...</option>';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add fact';
  addBtn.addEventListener('click', () => {
    let key = select.value;
    if (key === '__custom__') {
      const label = prompt('New fact label:');
      if (!label) return;
      key = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      AdminState.catalog.push({ key, label });
    }
    if (!key) return;
    item.facts.push({ type: key, value: '' });
    renderEditor();
  });
  addRow.append(select, addBtn);
  wrap.appendChild(addRow);
  return wrap;
}

async function uploadImage(item, file) {
  if (!file) return;
  const dataBase64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ species: item.species, filename: file.name, dataBase64 }),
  });
  const result = await res.json();
  if (result.ok) {
    item.image = result.path;
    item.alt = item.alt || '';
    renderEditor();
  } else {
    alert('Upload failed: ' + result.error);
  }
}

function syncList() { renderList(); }

async function renderPreview() {
  const pane = document.getElementById('preview-pane');
  if (AdminState.selectedIndex === null) {
    pane.innerHTML = '<p class="empty-state">Preview appears here.</p>';
    return;
  }
  const item = AdminState.items[AdminState.selectedIndex];
  let plateNumber = 'I';
  if (item.type === 'bird') {
    const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const birdsBefore = AdminState.items.slice(0, AdminState.selectedIndex).filter((i) => i.type === 'bird').length;
    plateNumber = ROMAN[birdsBefore] ?? String(birdsBefore + 1);
  }
  const res = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, plateNumber }),
  });
  const result = await res.json();
  pane.innerHTML = result.ok
    ? `<iframe class="preview-frame" srcdoc="${escapeAttr(previewDocument(result.html))}"></iframe>`
    : `<p class="empty-state">Preview error: ${result.error}</p>`;
}

function previewDocument(fragmentHtml) {
  return `<!DOCTYPE html><html><head><link rel="stylesheet" href="/css/site.css">
    <style>.plate{opacity:1 !important;transform:none !important}</style>
    </head>
    <body style="margin:0"><article class="plate"></article></body></html>`
    .replace('<article class="plate"></article>', fragmentHtml);
}

function escapeAttr(html) {
  return html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const status = document.getElementById('status-message');
  status.textContent = 'Saving...';
  const res = await fetch('/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: AdminState.items, catalog: AdminState.catalog }),
  });
  const result = await res.json();
  status.textContent = result.ok ? 'Saved.' : `Save failed: ${result.error}`;
});

document.getElementById('deploy-btn').addEventListener('click', async () => {
  if (!confirm('This will build, version, and deploy the live site via wrangler. Continue?')) return;
  const status = document.getElementById('status-message');
  status.textContent = 'Deploying... (this may take a minute)';
  const res = await fetch('/api/deploy', { method: 'POST' });
  const result = await res.json();
  status.textContent = result.ok ? 'Deployed.' : `Deploy failed at ${result.failedAt}.`;
  console.log(result.output);
  alert(result.output);
});

loadData();
