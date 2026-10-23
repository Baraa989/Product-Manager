import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
// Servera statiska frontend-filer från mappen "public"
app.use(express.static(path.resolve(__dirname, '..', 'public')));

// ==============================================================
// Web API - CRUD Endpoints för Produkter
// ==============================================================

/**
 * READ (ALL) - Hämta alla produkter
 * GET /api/products
 * Statuskod: 200 OK
 */
app.get('/api/products', (req, res) => {
  try {
    const products = getAllProducts();
    res.status(200).json(products);
  } catch (error) {
    console.error('Fel vid hämtning av produkter:', error);
    res.status(500).json({ error: 'Ett internt serverfel uppstod vid hämtning av produkter.' });
  }
});

/**
 * READ (ONE) - Hämta en specifik produkt med ID
 * GET /api/products/:id
 * Statuskod: 200 OK eller 404 Not Found
 */
app.get('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = getProductById(id);

    if (!product) {
      return res.status(404).json({ error: `Produkten med ID ${id} hittades inte.` });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Fel vid hämtning av enskild produkt:', error);
    res.status(500).json({ error: 'Ett internt serverfel uppstod.' });
  }
});

/**
 * CREATE - Skapa en ny produkt
 * POST /api/products
 * Statuskod: 201 Created eller 400 Bad Request
 */
app.post('/api/products', (req, res) => {
  try {
    const { name, price, sku, description } = req.body;

    // Validering: Alla fält är obligatoriska och priset måste vara ett positivt tal (> 0)
    if (!name || price === undefined || price === null || !sku || !description) {
      return res.status(400).json({
        error: 'Samtliga fält är obligatoriska (produktnamn, pris, SKU och beskrivning).'
      });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        error: 'Priset måste vara ett positivt tal större än 0.'
      });
    }

    const newProduct = createProduct({
      name: String(name),
      price: numericPrice,
      sku: String(sku),
      description: String(description)
    });

    // 201 Created enligt specifikationen
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Fel vid skapande av produkt:', error);

    // Hantera eventuellt duplikat av SKU i SQLite (om unique constraint triggas)
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'En produkt med detta SKU-nummer finns redan.' });
    }

    res.status(500).json({ error: 'Ett internt serverfel uppstod vid skapandet av produkten.' });
  }
});

/**
 * UPDATE - Uppdatera en befintlig produkt
 * PUT /api/products/:id
 * Statuskod: 200 OK eller 400 Bad Request / 404 Not Found
 */
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, sku, description } = req.body;

    // Validering
    if (!name || price === undefined || price === null || !sku || !description) {
      return res.status(400).json({
        error: 'Samtliga fält är obligatoriska vid uppdatering.'
      });
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        error: 'Priset måste vara ett positivt tal större än 0.'
      });
    }

    const updated = updateProduct(id, {
      name: String(name),
      price: numericPrice,
      sku: String(sku),
      description: String(description)
    });

    if (!updated) {
      return res.status(404).json({ error: `Produkten med ID ${id} hittades inte.` });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error('Fel vid uppdatering av produkt:', error);

    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'En produkt med detta SKU-nummer finns redan.' });
    }

    res.status(500).json({ error: 'Ett internt serverfel uppstod vid uppdateringen.' });
  }
});

/**
 * DELETE - Ta bort en produkt
 * DELETE /api/products/:id
 * Statuskod: 204 No Content eller 404 Not Found
 */
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteProduct(id);

    if (!deleted) {
      return res.status(404).json({ error: `Produkten med ID ${id} hittades inte.` });
    }

    // 204 No Content enligt specifikationen
    res.status(204).send();
  } catch (error) {
    console.error('Fel vid radering av produkt:', error);
    res.status(500).json({ error: 'Ett internt serverfel uppstod vid radering.' });
  }
});

// Starta servern
app.listen(PORT, () => {
  console.log(`Servern körs på http://localhost:${PORT}`);
});
