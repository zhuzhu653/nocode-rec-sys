-- 创建user_follows表（用户关注达人关系表）
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束，防止重复关注
    UNIQUE(user_id, instructor_id)
);

-- 为user_follows表创建索引
CREATE INDEX IF NOT EXISTS idx_user_follows_user_id ON user_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_instructor_id ON user_follows(instructor_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at);

-- 为instructors表添加关注者数量字段（如果不存在）
ALTER TABLE instructors
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- 创建更新关注者数量的函数
CREATE OR REPLACE FUNCTION update_instructor_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE instructors
        SET follower_count = follower_count + 1
        WHERE id = NEW.instructor_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE instructors
        SET follower_count = follower_count - 1
        WHERE id = OLD.instructor_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器来自动更新关注者数量
DROP TRIGGER IF EXISTS trg_user_follows_count ON user_follows;
CREATE TRIGGER trg_user_follows_count
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_instructor_follower_count();

-- 为用户表添加关注数量字段（如果不存在）
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- 创建更新用户关注数量的函数
CREATE OR REPLACE FUNCTION update_user_following_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE user_profiles
        SET following_count = following_count + 1
        WHERE id = NEW.user_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE user_profiles
        SET following_count = following_count - 1
        WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器来自动更新用户关注数量
DROP TRIGGER IF EXISTS trg_user_following_count ON user_follows;
CREATE TRIGGER trg_user_following_count
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_user_following_count();
