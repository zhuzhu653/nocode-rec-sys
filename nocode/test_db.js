import { supabase } from './src/integrations/supabase/client.js';

async function testDatabase() {
  console.log('开始测试数据库连接和表结构...\n');

  // 测试user_collections表
  console.log('1. 检查user_collections表:');
  try {
    const { data, error } = await supabase
      .from('user_collections')
      .select('*')
      .limit(1);

    if (error) {
      console.error('  错误:', error.message);
      console.log('  表可能不存在或结构有问题');
    } else {
      console.log('  表存在，示例数据:', data);
    }
  } catch (err) {
    console.error('  异常:', err.message);
  }

  console.log('\n2. 检查orders表:');
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1);

    if (error) {
      console.error('  错误:', error.message);
    } else {
      console.log('  表存在，示例数据:', data);
    }
  } catch (err) {
    console.error('  异常:', err.message);
  }

  console.log('\n3. 检查digital_products表:');
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .select('*')
      .limit(1);

    if (error) {
      console.error('  错误:', error.message);
    } else {
      console.log('  表存在，示例数据:', data);
    }
  } catch (err) {
    console.error('  异常:', err.message);
  }

  console.log('\n测试完成');
}

testDatabase().catch(console.error);
