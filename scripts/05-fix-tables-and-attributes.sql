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

-- Create attributes table if it doesn't exist
CREATE TABLE IF NOT EXISTS attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL DEFAULT 'text',
  values TEXT[] DEFAULT '{}',
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_attributes table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, attribute_id)
);

-- Create customer_credits table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  credit_amount DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  remaining_amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing tables
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

-- Update existing records to have is_active = true
UPDATE categories SET is_active = true WHERE is_active IS NULL;
UPDATE brands SET is_active = true WHERE is_active IS NULL;

-- Insert sample attributes if they don't exist
INSERT INTO attributes (name, type, values) VALUES 
  ('Color', 'select', ARRAY['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White', 'Gray', 'Pink', 'Purple', 'Orange'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO attributes (name, type, values) VALUES 
  ('Size', 'select', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO attributes (name, type, values) VALUES 
  ('Material', 'select', ARRAY['Cotton', 'Polyester', 'Wool', 'Silk', 'Leather', 'Denim', 'Linen'])
ON CONFLICT (name) DO NOTHING;

INSERT INTO attributes (name, type, values) VALUES 
  ('Brand', 'text', ARRAY[]::TEXT[])
ON CONFLICT (name) DO NOTHING;

INSERT INTO attributes (name, type, values) VALUES 
  ('Weight', 'number', ARRAY[]::TEXT[])
ON CONFLICT (name) DO NOTHING;

-- Insert sample suppliers if they don't exist
INSERT INTO suppliers (name, contact_person, phone, email, address, city, state, postal_code) VALUES 
  ('ABC Wholesale', 'John Smith', '555-0101', 'john@abcwholesale.com', '123 Main St', 'New York', 'NY', '10001'),
  ('XYZ Distributors', 'Jane Doe', '555-0102', 'jane@xyzdist.com', '456 Oak Ave', 'Los Angeles', 'CA', '90001'),
  ('Global Suppliers Inc', 'Mike Johnson', '555-0103', 'mike@globalsuppliers.com', '789 Pine Rd', 'Chicago', 'IL', '60601')
ON CONFLICT DO NOTHING;
