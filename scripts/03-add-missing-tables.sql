-- Create attributes table
CREATE TABLE IF NOT EXISTS attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'text',
  values TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create product_attributes table
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create company_profile table
CREATE TABLE IF NOT EXISTS company_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  website VARCHAR(200),
  tax_number VARCHAR(50),
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add role and permissions to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';

-- Insert default company profile
INSERT INTO company_profile (company_name, address, phone, email)
VALUES ('Your Company Name', 'Your Company Address', '+95 9 123 456 789', 'info@yourcompany.com')
ON CONFLICT DO NOTHING;

-- Insert sample attributes
INSERT INTO attributes (name, type, values) VALUES
('Color', 'select', ARRAY['Red', 'Blue', 'Green', 'Black', 'White']),
('Size', 'select', ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL']),
('Material', 'select', ARRAY['Cotton', 'Polyester', 'Leather', 'Plastic', 'Metal'])
ON CONFLICT DO NOTHING;
