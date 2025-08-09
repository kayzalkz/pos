-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create inventory_adjustments table
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  adjustment_type VARCHAR(20) NOT NULL, -- 'increase' or 'decrease'
  quantity INTEGER NOT NULL,
  reason VARCHAR(200),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('ABC Electronics', 'John Smith', '09111111111', 'john@abc.com', '123 Main St, Yangon'),
('XYZ Fashion', 'Mary Johnson', '09222222222', 'mary@xyz.com', '456 Fashion Ave, Mandalay'),
('Global Tech', 'David Lee', '09333333333', 'david@globaltech.com', '789 Tech Park, Yangon')
ON CONFLICT DO NOTHING;

-- Add supplier_id to products table if not exists
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

-- Update existing products with sample supplier
UPDATE products SET supplier_id = (SELECT id FROM suppliers LIMIT 1) WHERE supplier_id IS NULL;
