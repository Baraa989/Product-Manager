/**
 * Product Manager - Frontend JavaScript
 * Hanterar CRUD-anrop mot Express Web API och dynamisk DOM-uppdatering.
 */

// DOM-element
const productForm = document.getElementById('product-form');
const nameInput = document.getElementById('name');
const priceInput = document.getElementById('price');
const skuInput = document.getElementById('sku');
const descriptionInput = document.getElementById('description');

const productsTable = document.getElementById('products-table');
const productsTbody = document.getElementById('products-tbody');
const productCountBadge = document.getElementById('product-count');
const loadingSpinner = document.getElementById('loading-spinner');
const emptyState = document.getElementById('empty-state');
const alertBox = document.getElementById('alert-box');
const alertMessage = document.getElementById('alert-message');

// Modal-element för redigering (Update)
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editIdInput = document.getElementById('edit-id');
const editNameInput = document.getElementById('edit-name');
const editPriceInput = document.getElementById('edit-price');
const editSkuInput = document.getElementById('edit-sku');
const editDescInput = document.getElementById('edit-description');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Lokal cache för produkter (så vi snabbt kan öppna beskrivningar i modalen)
const productsCache = new Map();

/**
 * Visar ett fel- eller framgångsmeddelande för användaren.
 * @param {string} message 
 * @param {'error'|'success'} type 
 */
function showAlert(message, type = 'error') {
  alertBox.className = `alert ${type}`;
  alertMessage.textContent = message;
  alertBox.classList.remove('hidden');

  // Rulla upp smidigt om användaren scrollat ner
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Dölj automatiskt efter 5 sekunder
  if (window.alertTimeout) clearTimeout(window.alertTimeout);
  window.alertTimeout = setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 5000);
}

/**
 * Döljer meddelanderutan.
 */
function hideAlert() {
  alertBox.classList.add('hidden');
}

/**
 * Uppdaterar räknaren för antal produkter och tomtillstånd.
 */
function updateProductCount() {
  const rowCount = productsTbody.querySelectorAll('tr').length;
  productCountBadge.textContent = `${rowCount} produkt${rowCount === 1 ? '' : 'er'}`;

  if (rowCount === 0) {
    emptyState.classList.remove('hidden');
    productsTable.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    productsTable.classList.remove('hidden');
  }
}

/**
 * Skapar och returnerar en tabellrad för en produkt.
 * @param {Object} product 
 * @returns {HTMLTableRowElement}
 */
function createProductRow(product) {
  const tr = document.createElement('tr');
  tr.id = `product-row-${product.id}`;
  tr.dataset.id = product.id;

  tr.innerHTML = `
    <td class="product-name-cell">${escapeHtml(product.name)}</td>
    <td class="product-sku-cell">${escapeHtml(product.sku)}</td>
    <td class="product-price-cell">${formatCurrency(product.price)}</td>
    <td class="col-actions">
      <div class="actions-wrapper">
        <button type="button" class="action-btn edit-btn" title="Redigera produkt" aria-label="Redigera ${escapeHtml(product.name)}">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button type="button" class="action-btn delete-btn" title="Radera produkt" aria-label="Radera ${escapeHtml(product.name)}">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </td>
  `;

  // Koppla händelselyssnare för Redigera och Radera
  const editBtn = tr.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => openEditModal(product.id));

  const deleteBtn = tr.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => deleteProduct(product.id, tr));

  return tr;
}

/**
 * Formaterar pris till visning (t.ex. 199 kr).
 * @param {number} price 
 */
function formatCurrency(price) {
  return `${Number(price).toLocaleString('sv-SE')} kr`;
}

/**
 * Förhindrar XSS vid rendering av text till HTML.
 * @param {string} str 
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==============================================================
// 1. READ: Hämta alla produkter vid sidladdning
// ==============================================================
async function loadProducts() {
  loadingSpinner.classList.remove('hidden');
  emptyState.classList.add('hidden');
  productsTable.classList.add('hidden');

  try {
    const response = await fetch('/api/products');

    if (!response.ok) {
      throw new Error(`Servern svarade med felkod: ${response.status}`);
    }

    const products = await response.json();
    productsTbody.innerHTML = '';
    productsCache.clear();

    products.forEach((product) => {
      productsCache.set(product.id, product);
      const row = createProductRow(product);
      productsTbody.appendChild(row);
    });

    updateProductCount();
  } catch (error) {
    console.error('Kunde inte ladda produkter:', error);
    showAlert(`Kunde inte ladda produkter från servern: ${error.message}`, 'error');
  } finally {
    loadingSpinner.classList.add('hidden');
  }
}

// ==============================================================
// 2. CREATE: Lägg till ny produkt (POST /api/products)
// ==============================================================
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  // Validering med HTML:s formulärvalidering
  const name = nameInput.value.trim();
  const price = parseFloat(priceInput.value);
  const sku = skuInput.value.trim();
  const description = descriptionInput.value.trim();

  // Kontrollera att samtliga fält är ifyllda och att priset är positivt
  if (!name || isNaN(price) || price <= 0 || !sku || !description) {
    showAlert('Samtliga fält är obligatoriska och priset måste vara ett positivt tal större än 0.', 'error');
    
    // Markera felaktiga fält visuellt
    if (!name) nameInput.classList.add('is-invalid');
    if (isNaN(price) || price <= 0) priceInput.classList.add('is-invalid');
    if (!sku) skuInput.classList.add('is-invalid');
    if (!description) descriptionInput.classList.add('is-invalid');
    return;
  }

  // Rensa eventuella invalid-klasser
  [nameInput, priceInput, skuInput, descriptionInput].forEach((el) => el.classList.remove('is-invalid'));

  const payload = { name, price, sku, description };
  const submitBtn = document.getElementById('add-product-btn');
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Enligt krav: När backend svarar med HTTP 201 Created läggs den nya produkten till i tabellen
    if (response.status === 201) {
      const newProduct = await response.json();

      // Spara i cache och lägg till i tabellen dynamiskt utan att ladda om sidan
      productsCache.set(newProduct.id, newProduct);
      const row = createProductRow(newProduct);
      productsTbody.appendChild(row);
      updateProductCount();

      // Återställ formuläret och töm samtliga inmatningsfält
      productForm.reset();
      showAlert(`Produkten "${newProduct.name}" har lagts till!`, 'success');
    } else {
      // Om anropet misslyckas visas felmeddelande från backend
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || `Serverfel (${response.status})`;
      showAlert(`Kunde inte lägga till produkt: ${message}`, 'error');
    }
  } catch (error) {
    console.error('Fel vid POST /api/products:', error);
    showAlert(`Nätverksfel: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

// Ta bort is-invalid när användaren börjar skriva
[nameInput, priceInput, skuInput, descriptionInput].forEach((input) => {
  input.addEventListener('input', () => {
    input.classList.remove('is-invalid');
  });
});

// ==============================================================
// 3. DELETE: Ta bort en produkt (DELETE /api/products/:id)
// ==============================================================
async function deleteProduct(id, rowElement) {
  const product = productsCache.get(id);
  const productName = product ? product.name : 'produkten';

  const confirmed = window.confirm(`Är du säker på att du vill ta bort "${productName}"?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });

    // Enligt krav: När backend svarar med HTTP 204 No Content tas produkten bort från tabellen
    if (response.status === 204) {
      // Ta bort från lokal cache och DOM dynamiskt utan omladdning
      productsCache.delete(id);
      rowElement.remove();
      updateProductCount();
      showAlert(`Produkten "${productName}" har raderats.`, 'success');
    } else {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || `Serverfel (${response.status})`;
      showAlert(`Kunde inte radera produkt: ${message}`, 'error');
    }
  } catch (error) {
    console.error('Fel vid DELETE /api/products/:id:', error);
    showAlert(`Nätverksfel vid radering: ${error.message}`, 'error');
  }
}

// ==============================================================
// 4. UPDATE: Redigera produkt via Modal (PUT /api/products/:id)
// ==============================================================
function openEditModal(id) {
  const product = productsCache.get(id);
  if (!product) return;

  editIdInput.value = product.id;
  editNameInput.value = product.name;
  editPriceInput.value = product.price;
  editSkuInput.value = product.sku;
  editDescInput.value = product.description;

  if (typeof editModal.showModal === 'function') {
    editModal.showModal();
  } else {
    editModal.setAttribute('open', '');
  }
}

function closeEditModal() {
  if (typeof editModal.close === 'function') {
    editModal.close();
  } else {
    editModal.removeAttribute('open');
  }
}

closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// Stäng modal om användaren klickar utanför modal-kortet
editModal.addEventListener('click', (e) => {
  const rect = editModal.getBoundingClientRect();
  const isInDialog = (
    rect.top <= e.clientY &&
    e.clientY <= rect.top + rect.height &&
    rect.left <= e.clientX &&
    e.clientX <= rect.left + rect.width
  );
  if (!isInDialog) {
    closeEditModal();
  }
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editIdInput.value;
  const name = editNameInput.value.trim();
  const price = parseFloat(editPriceInput.value);
  const sku = editSkuInput.value.trim();
  const description = editDescInput.value.trim();

  if (!name || isNaN(price) || price <= 0 || !sku || !description) {
    showAlert('Samtliga fält är obligatoriska och priset måste vara ett positivt tal.', 'error');
    return;
  }

  const payload = { name, price, sku, description };
  const saveBtn = document.getElementById('save-edit-btn');
  saveBtn.disabled = true;

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const updatedProduct = await response.json();
      productsCache.set(updatedProduct.id, updatedProduct);

      // Uppdatera raden i tabellen dynamiskt
      const existingRow = document.getElementById(`product-row-${updatedProduct.id}`);
      if (existingRow) {
        existingRow.querySelector('.product-name-cell').textContent = updatedProduct.name;
        existingRow.querySelector('.product-sku-cell').textContent = updatedProduct.sku;
        existingRow.querySelector('.product-price-cell').textContent = formatCurrency(updatedProduct.price);
      }

      closeEditModal();
      showAlert(`Produkten "${updatedProduct.name}" har uppdaterats!`, 'success');
    } else {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.error || `Serverfel (${response.status})`;
      showAlert(`Kunde inte uppdatera produkten: ${message}`, 'error');
    }
  } catch (error) {
    console.error('Fel vid PUT /api/products/:id:', error);
    showAlert(`Nätverksfel vid uppdatering: ${error.message}`, 'error');
  } finally {
    saveBtn.disabled = false;
  }
});

// ==============================================================
// Initialisering
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
});
