-- Drop and recreate attributes table with proper structure
DROP TABLE IF EXISTS product_attributes CASCADE;
DROP TABLE IF EXISTS attributes CASCADE;

-- Create attributes table with correct structure
CREATE TABLE attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL DEFAULT 'text',
  values TEXT[] DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_attributes table
CREATE TABLE product_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, attribute_id)
);

-- Add missing columns to existing tables
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records
UPDATE categories SET is_active = true WHERE is_active IS NULL;
UPDATE brands SET is_active = true WHERE is_active IS NULL;

-- Insert sample attributes
INSERT INTO attributes (name, type, values) VALUES 
  ('Color', 'select', ARRAY['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Gray', 'Pink', 'Purple', 'Orange']),
  ('Size', 'select', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL']),
  ('Material', 'select', ARRAY['Cotton', 'Polyester', 'Wool', 'Silk', 'Leather', 'Denim', 'Linen']),
  ('Brand', 'text', ARRAY[]::TEXT[]),
  ('Weight', 'number', ARRAY[]::TEXT[])
ON CONFLICT (name) DO NOTHING;

-- Create suppliers table if it doesn't exist
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'USA',
  tax_id VARCHAR(50),
  payment_terms INTEGER DEFAULT 30,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address, city, state, postal_code) VALUES 
  ('ABC Wholesale', 'John Smith', '555-0101', 'john@abcwholesale.com', '123 Main St', 'New York', 'NY', '10001'),
  ('XYZ Distributors', 'Jane Doe', '555-0102', 'jane@xyzdist.com', '456 Oak Ave', 'Los Angeles', 'CA', '90001'),
  ('Global Suppliers Inc', 'Mike Johnson', '555-0103', 'mike@globalsuppliers.com', '789 Pine Rd', 'Chicago', 'IL', '60601')
ON CONFLICT DO NOTHING;
