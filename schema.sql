-- ==============================================================
-- Schema för Product Manager databas (SQLite)
-- Denna fil skapar tabellen 'products' och lägger till startdata.
-- ==============================================================

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL CHECK(price > 0),
    sku TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initial startdata enligt uppgiftens specifikation
INSERT OR IGNORE INTO products (id, name, price, sku, description) VALUES
(1, 'Svart T-Shirt', 199, 'TSH-001', 'Klassisk svart t-shirt i 100% ekologisk bomull med bekväm passform.'),
(2, 'Vit T-Shirt', 199, 'TSH-002', 'Stilren vit t-shirt i mjuk bomullstrikå.'),
(3, 'Blå Hoodie', 499, 'HOD-001', 'Varm och skön mörkblå huvtröja med känguruficka och borstad insida.');
