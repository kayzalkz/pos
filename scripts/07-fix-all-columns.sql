-- Fix all missing columns in the database

-- Add missing columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to sale_items table  
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0;

-- Update existing records with proper timestamps
UPDATE sales SET created_at = NOW() WHERE created_at IS NULL;
UPDATE sales SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE sale_items SET created_at = NOW() WHERE created_at IS NULL;

-- Update sale_items price from unit_price if it exists
UPDATE sale_items SET price = unit_price WHERE price = 0 AND unit_price IS NOT NULL;

-- Ensure all tables have proper structure
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records
UPDATE categories SET is_active = true WHERE is_active IS NULL;
UPDATE brands SET is_active = true WHERE is_active IS NULL;
UPDATE suppliers SET is_active = true WHERE is_active IS NULL;
UPDATE customers SET is_active = true WHERE is_active IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
