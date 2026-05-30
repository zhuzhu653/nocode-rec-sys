-- 创建user_collections表（用户收藏/购物车/已购买商品表）
CREATE TABLE IF NOT EXISTS user_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
    collection_type TEXT NOT NULL CHECK (collection_type IN ('cart', 'wishlist', 'owned')),
    quantity INTEGER DEFAULT 1,
    order_id UUID REFERENCES orders(id),
    purchased_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束，防止同一商品重复添加到同一类型的收藏
    UNIQUE(user_id, product_id, collection_type)
);

-- 为user_collections表创建索引
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_product_id ON user_collections(product_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_collection_type ON user_collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_user_collections_created_at ON user_collections(created_at);

-- 创建orders表（订单表）
CREATE TABLE IF NOT EXISTS orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
    paid_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为orders表创建索引
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- 创建order_items表（订单项表）
CREATE TABLE IF NOT EXISTS order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    product_name TEXT NOT NULL,
    product_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为order_items表创建索引
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 创建digital_products表（数字产品表）- 如果不存在
CREATE TABLE IF NOT EXISTS digital_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    thumbnail_url TEXT,
    category TEXT,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 为digital_products表创建索引
CREATE INDEX IF NOT EXISTS idx_digital_products_category ON digital_products(category);
CREATE INDEX IF NOT EXISTS idx_digital_products_price ON digital_products(price);
CREATE INDEX IF NOT EXISTS idx_digital_products_created_at ON digital_products(created_at);

-- 更新updated_at字段的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为user_collections表创建更新触发器
DROP TRIGGER IF EXISTS trg_user_collections_updated_at ON user_collections;
CREATE TRIGGER trg_user_collections_updated_at
    BEFORE UPDATE ON user_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为orders表创建更新触发器
DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 为digital_products表创建更新触发器
DROP TRIGGER IF EXISTS trg_digital_products_updated_at ON digital_products;
CREATE TRIGGER trg_digital_products_updated_at
    BEFORE UPDATE ON digital_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
