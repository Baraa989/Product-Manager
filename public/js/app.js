// Hämta referenser till HTML-elementen
const productForm = document.getElementById('product-form');
const productTbody = document.getElementById('product-tbody');
const errorMessage = document.getElementById('error-message');

/**
 * Hjälpfunktion för att visa felmeddelande om ett API-anrop misslyckas.
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

/**
 * Döljer felmeddelandet.
 */
function hideError() {
  errorMessage.style.display = 'none';
  errorMessage.textContent = '';
}

/**
 * Skapar en ny tabellrad (<tr>) för en produkt och lägger till radera-knapp.
 */
function renderProductRow(product) {
  const tr = document.createElement('tr');
  tr.id = `product-${product.id}`;

  tr.innerHTML = `
    <td>${product.name}</td>
    <td>${product.sku}</td>
    <td>${product.price}</td>
    <td class="td-action">
      <button type="button" class="btn-delete" title="Radera produkt">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 3V4H4V6H5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
        </svg>
      </button>
    </td>
  `;

  // Koppla klickhändelse på radera-knappen
  const deleteBtn = tr.querySelector('.btn-delete');
  deleteBtn.addEventListener('click', () => {
    deleteProduct(product.id, tr);
  });

  productTbody.appendChild(tr);
}

/**
 * 1. HÄMTA PRODUKTER (READ)
 * Körs automatiskt när sidan laddas.
 */
async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    
    if (!response.ok) {
      throw new Error('Kunde inte hämta produkter från backend.');
    }

    const products = await response.json();
    productTbody.innerHTML = ''; // Töm tabellen innan rendering

    products.forEach((product) => {
      renderProductRow(product);
    });
  } catch (error) {
    showError(error.message);
  }
}

/**
 * 2. LÄGG TILL PRODUKT (CREATE)
 * Lyssnar på när användaren skickar formuläret.
 */
productForm.addEventListener('submit', async (e) => {
  e.preventDefault(); // Förhindra att webbsidan laddas om
  hideError();

  // Hämta värden från formuläret
  const name = document.getElementById('name').value.trim();
  const price = parseFloat(document.getElementById('price').value);
  const sku = document.getElementById('sku').value.trim();
  const description = document.getElementById('description').value.trim();

  // Kontrollera att alla fält är ifyllda och att priset är positivt
  if (!name || isNaN(price) || price <= 0 || !sku || !description) {
    showError('Alla fält är obligatoriska och priset måste vara större än 0.');
    return;
  }

  const newProductData = { name, price, sku, description };

  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newProductData)
    });

    // Om backend svarar med 201 Created:
    if (response.status === 201) {
      const createdProduct = await response.json();
      
      // Lägg till den nya produkten i tabellen dynamiskt
      renderProductRow(createdProduct);

      // Återställ formuläret och töm alla inmatningsfält
      productForm.reset();
    } else {
      const errorData = await response.json().catch(() => ({}));
      showError(errorData.error || 'Kunde inte spara produkten.');
    }
  } catch (error) {
    showError('Nätverksfel vid sparning av produkt: ' + error.message);
  }
});

/**
 * 3. RADERA PRODUKT (DELETE)
 * Anropas när användaren klickar på papperskorgen i en tabellrad.
 */
async function deleteProduct(id, tableRow) {
  hideError();

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE'
    });

    // Om backend svarar med 204 No Content tas produkten bort från tabellen
    if (response.status === 204) {
      tableRow.remove(); // Ta bort raden från DOM
    } else {
      showError('Kunde inte radera produkten från backend.');
    }
  } catch (error) {
    showError('Nätverksfel vid radering: ' + error.message);
  }
}

// Kör igång och ladda produkter när sidan har laddats i webbläsaren
document.addEventListener('DOMContentLoaded', loadProducts);
