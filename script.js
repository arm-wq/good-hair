/* ==========================================================================
   good hair — shared script (product.html, order.html, admin.html)
   Each section runs only if its page's elements exist.
   ========================================================================== */

var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMwEO7e07927JqduK4yNuDfEF98xx9FVzRhWSpnhJ_cnPMbhvbRCcjB64RLPNAPanWVA/exec';
var ORDERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIJ-5Z_iIzJExiLcoeFtajnCmSkKzM4LnRFicfQ4yOLI39KMR5CtuZFg1DPsU04456Hm9n1aLLesG9/pub?gid=0&single=true&output=csv';

document.addEventListener('DOMContentLoaded', function () {
  if (document.getElementById('product-list')) initProductPage();
  if (document.getElementById('orderForm')) initOrderPage();
  if (document.querySelector('#ordersTable tbody')) initAdminPage();
});

/* ---------- 1) product.html ---------- */

function initProductPage() {
  var filterBar = document.getElementById('filter-bar');
  var listEl = document.getElementById('product-list');
  var products = [];

  var filters = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'sweet', label: 'Sweet' },
    { value: 'confident', label: 'Confident' }
  ];

  function buildFilterBar(activeMood) {
    if (!filterBar) return;
    filterBar.innerHTML = '';
    filters.forEach(function (f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn' + (f.value === activeMood ? ' is-active' : '');
      btn.textContent = f.label;
      btn.setAttribute('data-mood', f.value);
      btn.setAttribute('aria-pressed', f.value === activeMood ? 'true' : 'false');
      btn.addEventListener('click', function () {
        applyFilter(f.value);
      });
      filterBar.appendChild(btn);
    });
  }

  function applyFilter(mood) {
    buildFilterBar(mood);
    var shown = mood === 'all'
      ? products
      : products.filter(function (p) { return p.mood === mood; });
    renderProducts(shown);
  }

  function renderProducts(items) {
    listEl.innerHTML = '';
    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'text-center';
      empty.textContent = 'ไม่พบสินค้า';
      listEl.appendChild(empty);
      return;
    }
    items.forEach(function (p) {
      listEl.appendChild(createProductCard(p));
    });
  }

  function createProductCard(p) {
    var card = document.createElement('article');
    card.className = 'product-card';

    var imgWrap = document.createElement('div');
    imgWrap.className = 'product-card__image';
    var img = document.createElement('img');
    img.src = p.image;
    img.alt = p.name;
    img.loading = 'lazy';
    imgWrap.appendChild(img);

    var mood = document.createElement('div');
    mood.className = 'product-card__mood';
    var dot = document.createElement('span');
    dot.className = 'mood-dot mood-dot--' + p.mood;
    var moodText = document.createElement('span');
    moodText.textContent = p.mood;
    mood.appendChild(dot);
    mood.appendChild(moodText);

    var title = document.createElement('h3');
    title.className = 'product-card__title';
    title.textContent = p.name;

    var meta = document.createElement('div');
    meta.className = 'product-card__meta';
    var size = document.createElement('span');
    size.className = 'product-card__size';
    size.textContent = p.size;
    var price = document.createElement('span');
    price.className = 'product-card__price';
    price.textContent = Number(p.price).toLocaleString('th-TH') + ' บาท';
    meta.appendChild(size);
    meta.appendChild(price);

    var buy = document.createElement('a');
    buy.className = 'btn btn--accent btn--block';
    buy.textContent = 'สั่งซื้อ';
    buy.href = 'order.html?item=' + encodeURIComponent(p.name) +
      '&price=' + encodeURIComponent(p.price);

    card.appendChild(imgWrap);
    card.appendChild(mood);
    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(buy);
    return card;
  }

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      var param = (new URLSearchParams(window.location.search).get('mood') || '').toLowerCase();
      var valid = filters.some(function (f) { return f.value === param; });
      applyFilter(valid ? param : 'all');
    })
    .catch(function (error) {
      console.error(error);
      listEl.textContent = 'ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง';
    });
}

/* ---------- 2) order.html ---------- */

function initOrderPage() {
  var form = document.getElementById('orderForm');
  var params = new URLSearchParams(window.location.search);

  var item = params.get('item');
  var price = params.get('price');
  if (item !== null) document.getElementById('items').value = item;
  if (price !== null) document.getElementById('total').value = price;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var payload = {
      customerName: document.getElementById('customerName').value,
      contact: document.getElementById('contact').value,
      items: document.getElementById('items').value,
      total: document.getElementById('total').value,
      note: document.getElementById('note').value
    };

    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ---------- 3) admin.html ---------- */

// Minimal CSV parser: handles quoted fields, "" escapes,
// commas/newlines inside quotes, and CRLF or LF line endings.
function parseCSV(text) {
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // last field/row (file without trailing newline)
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');

  function showMessage(msg) {
    tbody.innerHTML = '';
    var tr = document.createElement('tr');
    var td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'text-center';
    td.textContent = msg;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage('กำลังโหลดข้อมูล...');

  fetch(ORDERS_CSV_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ''; });
      });

      // If the first row is a header (its first cell has no digits, unlike a date), drop it
      if (rows.length && !/\d/.test(rows[0][0])) rows.shift();

      // Rows are appended in order, so reversing puts the newest first
      rows.reverse();

      if (!rows.length) {
        showMessage('ยังไม่มีคำสั่งซื้อ');
        return;
      }

      tbody.innerHTML = '';
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        for (var c = 0; c < 6; c++) {
          var td = document.createElement('td');
          td.textContent = r[c] !== undefined ? r[c] : '';
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    });
}
