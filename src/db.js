import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sökväg till SQLite-databasfilen och SQL-schemat
const dbPath = path.resolve(__dirname, '..', 'products.db');
const schemaPath = path.resolve(__dirname, '..', 'schema.sql');

// Skapa eller öppna databasen
const db = new Database(dbPath);

// Aktivera WAL-mode för bättre prestanda och foreign keys
db.pragma('journal_mode = WAL');

// Kör schema.sql för att initiera tabeller och ev. startdata
try {
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }
} catch (error) {
  console.error('Fel vid initiering av databasschema:', error);
}

/**
 * Hämtar alla produkter från databasen.
 * @returns {Array} Lista med alla produkter
 */
export function getAllProducts() {
  const stmt = db.prepare('SELECT id, name, price, sku, description, created_at FROM products ORDER BY id ASC');
  return stmt.all();
}

/**
 * Hämtar en specifik produkt baserat på ID.
 * @param {number|string} id 
 * @returns {Object|undefined} Produkten eller undefined om den saknas
 */
export function getProductById(id) {
  const stmt = db.prepare('SELECT id, name, price, sku, description, created_at FROM products WHERE id = ?');
  return stmt.get(id);
}

/**
 * Skapar en ny produkt i databasen.
 * @param {Object} productData 
 * @returns {Object} Den nyskapade produkten inklusive dess genererade ID
 */
export function createProduct({ name, price, sku, description }) {
  const stmt = db.prepare(`
    INSERT INTO products (name, price, sku, description)
    VALUES (?, ?, ?, ?)
  `);
  const info = db.transaction(() => {
    return stmt.run(name.trim(), Number(price), sku.trim(), description.trim());
  })();

  return getProductById(info.lastInsertRowid);
}

/**
 * Uppdaterar en befintlig produkt.
 * @param {number|string} id 
 * @param {Object} productData 
 * @returns {Object|null} Den uppdaterade produkten eller null om den inte fanns
 */
export function updateProduct(id, { name, price, sku, description }) {
  const stmt = db.prepare(`
    UPDATE products
    SET name = ?, price = ?, sku = ?, description = ?
    WHERE id = ?
  `);
  const info = stmt.run(name.trim(), Number(price), sku.trim(), description.trim(), id);

  if (info.changes === 0) {
    return null;
  }

  return getProductById(id);
}

/**
 * Raderar en produkt från databasen.
 * @param {number|string} id 
 * @returns {boolean} True om en rad raderades, annars false
 */
export function deleteProduct(id) {
  const stmt = db.prepare('DELETE FROM products WHERE id = ?');
  const info = stmt.run(id);
  return info.changes > 0;
}

export default db;
