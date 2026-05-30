-- 首先备份当前数据（可选）
-- 创建临时表备份当前数据
CREATE TABLE temp_city_locations AS SELECT * FROM city_locations WHERE city_id IN (6, 7);
CREATE TABLE temp_city_routes AS SELECT * FROM city_routes WHERE city_id IN (6, 7);
CREATE TABLE temp_city_route_points AS SELECT * FROM city_route_points WHERE route_id IN (SELECT id FROM city_routes WHERE city_id IN (6, 7));

-- 删除关联数据（先删除外键约束相关的数据）
DELETE FROM city_route_points WHERE route_id IN (SELECT id FROM city_routes WHERE city_id IN (6, 7));
DELETE FROM city_routes WHERE city_id IN (6, 7);
DELETE FROM city_locations WHERE city_id IN (6, 7);

-- 更新城市ID
UPDATE cities SET id = 5 WHERE name = '西安';
UPDATE cities SET id = 6 WHERE name = '重庆';

-- 重新插入地点数据（使用正确的城市ID）
INSERT INTO city_locations (name, description, type, category, address, rating, hours, longitude, latitude, vibe, city_id) VALUES
('西安碑林博物馆', '中国最大的碑刻艺术博物馆，收藏了大量历代碑刻和石刻艺术品', 'museum', '博物馆', '碑林区三学街', 4.8, '08:30-18:00', 108.9502, 34.2585, '{"cultural", "inspiring"}', 5),
('大唐不夜城', '重现盛唐风貌的文化商业街区，夜间灯光璀璨，充满唐风古韵', 'cultural', '文化街区', '雁塔区大唐不夜城', 4.7, '全天开放', 108.9682, 34.2185, '{"cultural", "social"}', 5),
('陕西历史博物馆', '中国第一座大型现代化国家级博物馆，馆藏文物丰富', 'museum', '博物馆', '雁塔区小寨东路', 4.9, '09:00-17:30', 108.9572, 34.2235, '{"inspiring", "quiet"}', 5),
('大雁塔文化广场', '以大雁塔为核心的文化休闲广场，定期举办文化活动和表演', 'park', '文化广场', '雁塔区大雁塔南广场', 4.6, '06:00-22:00', 108.9682, 34.2255, '{"cultural", "social"}', 5),
('西安美术馆', '展示当代艺术作品的现代美术馆，定期举办艺术展览', 'gallery', '美术馆', '雁塔区大唐不夜城', 4.5, '10:00-18:00', 108.9672, 34.2175, '{"creative", "inspiring"}', 5),
('回民街文化街区', '西安著名的美食文化街区，汇聚了各种陕西特色小吃', 'cultural', '美食街区', '莲湖区回民街', 4.7, '全天开放', 108.9452, 34.2655, '{"social", "cozy"}', 5),

-- 重庆地点数据
('洪崖洞民俗风貌区', '重庆标志性的吊脚楼建筑群，夜景美丽，充满山城特色', 'cultural', '民俗风貌区', '渝中区嘉滨路', 4.8, '全天开放', 106.5782, 29.5635, '{"cultural", "social"}', 6),
('四川美术学院黄桷坪校区', '中国著名的艺术院校，校园内外充满艺术氛围和涂鸦作品', 'campus', '艺术院校', '九龙坡区黄桷坪正街', 4.7, '08:00-20:00', 106.5402, 29.4885, '{"creative", "inspiring"}', 6),
('重庆中国三峡博物馆', '展示长江三峡历史文化的大型博物馆，建筑气势恢宏', 'museum', '博物馆', '渝中区人民路', 4.6, '09:00-17:00', 106.5532, 29.5635, '{"inspiring", "quiet"}', 6),
('磁器口古镇', '重庆著名的历史文化古镇，保留了大量传统建筑和手工艺', 'historical', '古镇', '沙坪坝区磁器口', 4.5, '全天开放', 106.4482, 29.5785, '{"cultural", "cozy"}', 6),
('重庆当代美术馆', '展示当代艺术作品的现代美术馆，定期举办艺术展览', 'gallery', '美术馆', '九龙坡区黄桷坪', 4.4, '10:00-18:00', 106.5422, 29.4875, '{"creative", "inspiring"}', 6),
('南山一棵树观景台', '重庆最佳的城市观景平台，可以俯瞰整个渝中半岛夜景', 'park', '观景台', '南岸区南山', 4.7, '09:00-22:00', 106.5982, 29.5535, '{"quiet", "inspiring"}', 6);

-- 重新插入路线数据
INSERT INTO city_routes (name, description, city_id) VALUES
('盛唐文化探索之旅', '探索西安的盛唐文化遗产，感受千年古都的历史韵味', 5),
('博物馆艺术之旅', '参观西安的著名博物馆，了解陕西深厚的历史文化', 5),
('山城文化探索之旅', '探索重庆独特的山城文化和历史风貌', 6),
('艺术创意之旅', '参观重庆的艺术院校和创意园区，感受现代艺术氛围', 6);

-- 重新插入路线点位关联数据
INSERT INTO city_route_points (route_id, location_id, order_index)
SELECT
  (SELECT id FROM city_routes WHERE name = '盛唐文化探索之旅' AND city_id = 5) as route_id,
  id as location_id,
  ROW_NUMBER() OVER (ORDER BY id) as order_index
FROM city_locations
WHERE name IN ('大唐不夜城', '大雁塔文化广场', '西安碑林博物馆') AND city_id = 5;

INSERT INTO city_route_points (route_id, location_id, order_index)
SELECT
  (SELECT id FROM city_routes WHERE name = '博物馆艺术之旅' AND city_id = 5) as route_id,
  id as location_id,
  ROW_NUMBER() OVER (ORDER BY id) as order_index
FROM city_locations
WHERE name IN ('陕西历史博物馆', '西安碑林博物馆', '西安美术馆') AND city_id = 5;

INSERT INTO city_route_points (route_id, location_id, order_index)
SELECT
  (SELECT id FROM city_routes WHERE name = '山城文化探索之旅' AND city_id = 6) as route_id,
  id as location_id,
  ROW_NUMBER() OVER (ORDER BY id) as order_index
FROM city_locations
WHERE name IN ('洪崖洞民俗风貌区', '磁器口古镇', '南山一棵树观景台') AND city_id = 6;

INSERT INTO city_route_points (route_id, location_id, order_index)
SELECT
  (SELECT id FROM city_routes WHERE name = '艺术创意之旅' AND city_id = 6) as route_id,
  id as location_id,
  ROW_NUMBER() OVER (ORDER BY id) as order_index
FROM city_locations
WHERE name IN ('四川美术学院黄桷坪校区', '重庆当代美术馆', '洪崖洞民俗风貌区') AND city_id = 6;

-- 清理临时表（如果使用了备份）
-- DROP TABLE IF EXISTS temp_city_locations;
-- DROP TABLE IF EXISTS temp_city_routes;
-- DROP TABLE IF EXISTS temp_city_route_points;
