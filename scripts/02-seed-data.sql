-- Insert default admin user
INSERT INTO users (username, password, role) 
VALUES ('admin', 'kayzal', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Clothing', 'Apparel and fashion items'),
('Food & Beverages', 'Food and drink products')
ON CONFLICT DO NOTHING;

-- Insert sample brands
INSERT INTO brands (name, description) VALUES
('Samsung', 'Samsung electronics'),
('Nike', 'Nike sportswear'),
('Coca Cola', 'Beverage brand')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, sku, category_id, brand_id, cost_price, selling_price, stock_quantity, min_stock_level)
SELECT 
  'Samsung Galaxy Phone', 'SKU001', c.id, b.id, 800000, 1200000, 5, 3
FROM categories c, brands b 
WHERE c.name = 'Electronics' AND b.name = 'Samsung'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, sku, category_id, brand_id, cost_price, selling_price, stock_quantity, min_stock_level)
SELECT 
  'Nike Air Max', 'SKU002', c.id, b.id, 80000, 150000, 2, 5
FROM categories c, brands b 
WHERE c.name = 'Clothing' AND b.name = 'Nike'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, sku, category_id, brand_id, cost_price, selling_price, stock_quantity, min_stock_level)
SELECT 
  'Coca Cola 500ml', 'SKU003', c.id, b.id, 500, 1000, 50, 20
FROM categories c, brands b 
WHERE c.name = 'Food & Beverages' AND b.name = 'Coca Cola'
ON CONFLICT (sku) DO NOTHING;

-- Insert sample customer
INSERT INTO customers (name, phone, email, credit_balance) VALUES
('John Doe', '09123456789', 'john@example.com', 0)
ON CONFLICT DO NOTHING;
