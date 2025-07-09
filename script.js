// === DOM Elements ===
const form = document.getElementById('grocery-form');
const nameInput = document.getElementById('item-name');
const qtyInput = document.getElementById('item-qty');
const categoryInput = document.getElementById('item-category');
const expiryInput = document.getElementById('item-expiry');
const listEl = document.getElementById('grocery-list');
const sortSelect = document.getElementById('sort-options');
const themeToggle = document.getElementById('theme-toggle');
const shareBtn = document.getElementById('generate-share-link');
const qrBtn = document.getElementById('generate-qr');
const shareOutput = document.getElementById('share-output');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const listSelector = document.getElementById('list-selector');
const createListBtn = document.getElementById('create-list');
const newListInput = document.getElementById('new-list-name');
const exportPdfBtn = document.getElementById('export-pdf');

// === State ===
let allLists = JSON.parse(localStorage.getItem('allLists')) || {};
let currentList = localStorage.getItem('currentList') || 'Default';
let items = allLists[currentList] || [];
let editIndex = null;
let historyStack = [];
let redoStack = [];

// === Save & Load ===
function saveAll() {
  allLists[currentList] = items;
  localStorage.setItem('allLists', JSON.stringify(allLists));
  localStorage.setItem('currentList', currentList);
}

function pushHistory() {
  historyStack.push(JSON.stringify(items));
  if (historyStack.length > 100) historyStack.shift();
  redoStack = [];
}

// === Multiple List Handling ===
function renderListSelector() {
  listSelector.innerHTML = '';
  Object.keys(allLists).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === currentList) opt.selected = true;
    listSelector.appendChild(opt);
  });
}

function switchList(name) {
  currentList = name;
  items = allLists[currentList] || [];
  historyStack = [];
  redoStack = [];
  saveAll();
  renderListSelector();
  renderItems();
  checkExpiryAlerts();
}

function createNewList() {
  const name = newListInput.value.trim();
  if (!name || allLists[name]) return;
  allLists[name] = [];
  newListInput.value = '';
  switchList(name);
}

// === Main Features ===
function renderItems() {
  listEl.innerHTML = '';
  items.forEach((item, index) => {
    const li = document.createElement('li');
    if (item.checked) li.classList.add('checked');

    li.innerHTML = `
      <div>
        <strong>${item.name}</strong> (${item.qty}) – ${item.category || 'General'}
        ${item.expiry ? `– Exp: ${item.expiry}` : ''}
      </div>
      <div>
        <button onclick="toggleCheck(${index})">✔</button>
        <button onclick="editItem(${index})">✏️</button>
        <button onclick="deleteItem(${index})">🗑</button>
      </div>
    `;
    listEl.appendChild(li);
  });
}

function addItem(e) {
  e.preventDefault();
  const item = {
    name: nameInput.value.trim(),
    qty: qtyInput.value || 1,
    category: categoryInput.value.trim(),
    expiry: expiryInput.value,
    checked: false
  };
  if (!item.name) return;

  pushHistory();

  if (editIndex === null) {
    items.push(item);
  } else {
    items[editIndex] = { ...item, checked: items[editIndex].checked };
    editIndex = null;
    form.querySelector('button[type="submit"]').textContent = '➕ Add';
  }

  saveAll();
  renderItems();
  form.reset();
  checkExpiryAlerts();
}

function deleteItem(index) {
  pushHistory();
  items.splice(index, 1);
  saveAll();
  renderItems();
}

function toggleCheck(index) {
  pushHistory();
  items[index].checked = !items[index].checked;
  saveAll();
  renderItems();
}

function editItem(index) {
  const item = items[index];
  nameInput.value = item.name;
  qtyInput.value = item.qty;
  categoryInput.value = item.category;
  expiryInput.value = item.expiry;

  editIndex = index;
  form.querySelector('button[type="submit"]').textContent = '💾 Save';
  nameInput.focus();
}

// === Utilities ===
function sortItems() {
  const type = sortSelect.value;
  if (type === 'name') {
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else if (type === 'category') {
    items.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
  } else if (type === 'expiry') {
    items.sort((a, b) => (a.expiry || '').localeCompare(b.expiry || ''));
  }
  renderItems();
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
  }
}

// === Share & QR ===
function generateShareText() {
  if (items.length === 0) {
    shareOutput.textContent = 'Your list is empty.';
    return;
  }
  const lines = items.map(i => `• ${i.name} (${i.qty}) - ${i.category || 'General'}${i.expiry ? ` - Exp: ${i.expiry}` : ''}`);
  shareOutput.innerHTML = `<pre>${lines.join('\n')}</pre>`;
}

function generateQR() {
  const qrContainer = document.getElementById('qr-code');
  qrContainer.innerHTML = '';

  if (items.length === 0) {
    qrContainer.textContent = 'Nothing to share.';
    return;
  }

  const text = items.map(i => `${i.name} (${i.qty})`).join(', ');

  new QRCode(qrContainer, {
    text,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

// === Export to PDF ===
function exportToPDF() {
  if (items.length === 0) {
    alert("Nothing to export.");
    return;
  }

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`SmartShelf - ${currentList} List`, 10, 20);
  doc.setFontSize(12);

  let y = 30;
  items.forEach((item, i) => {
    const line = `${i + 1}. ${item.name} (${item.qty}) - ${item.category || 'General'}${item.expiry ? ` - Exp: ${item.expiry}` : ''}`;
    doc.text(line, 10, y);
    y += 10;
  });

  doc.save(`${currentList}_SmartShelf.pdf`);
}

// === Expiry Alert ===
function checkExpiryAlerts() {
  const today = new Date().toISOString().split("T")[0];
  const expiring = items.filter(item => item.expiry && item.expiry <= today);

  if (expiring.length > 0) {
    const alertMsg = expiring.map(i => `⚠️ ${i.name} expires on ${i.expiry}`).join("\n");
    alert("Expiry Alert:\n" + alertMsg);
  }
}

// === Undo/Redo ===
function undo() {
  if (historyStack.length === 0) return;
  redoStack.push(JSON.stringify(items));
  const previous = historyStack.pop();
  items = JSON.parse(previous);
  saveAll();
  renderItems();
}

function redo() {
  if (redoStack.length === 0) return;
  historyStack.push(JSON.stringify(items));
  const next = redoStack.pop();
  items = JSON.parse(next);
  saveAll();
  renderItems();
}

// === Event Listeners ===
form.addEventListener('submit', addItem);
sortSelect.addEventListener('change', sortItems);
themeToggle.addEventListener('click', toggleTheme);
shareBtn.addEventListener('click', generateShareText);
qrBtn.addEventListener('click', generateQR);
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
listSelector.addEventListener('change', e => switchList(e.target.value));
createListBtn.addEventListener('click', createNewList);
exportPdfBtn.addEventListener('click', exportToPDF);

// === Init ===
loadTheme();
renderListSelector();
switchList(currentList);
