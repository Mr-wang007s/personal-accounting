import 'package:flutter/material.dart';
import 'package:personal_accounting/models/record.dart';

class Category {
  final String id;
  final String name;
  final IconData icon;
  final Color color;
  final RecordType type;

  const Category({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.type,
  });
}

class CategoryData {
  // 支出分类
  static const List<Category> expenseCategories = [
    Category(
      id: 'food',
      name: '餐饮',
      icon: Icons.restaurant,
      color: Color(0xFFEF4444),
      type: RecordType.expense,
    ),
    Category(
      id: 'transport',
      name: '交通',
      icon: Icons.directions_car,
      color: Color(0xFFF97316),
      type: RecordType.expense,
    ),
    Category(
      id: 'shopping',
      name: '购物',
      icon: Icons.shopping_bag,
      color: Color(0xFFEC4899),
      type: RecordType.expense,
    ),
    Category(
      id: 'entertainment',
      name: '娱乐',
      icon: Icons.sports_esports,
      color: Color(0xFF8B5CF6),
      type: RecordType.expense,
    ),
    Category(
      id: 'housing',
      name: '住房',
      icon: Icons.home,
      color: Color(0xFF06B6D4),
      type: RecordType.expense,
    ),
    Category(
      id: 'medical',
      name: '医疗',
      icon: Icons.favorite,
      color: Color(0xFFF43F5E),
      type: RecordType.expense,
    ),
    Category(
      id: 'education',
      name: '教育',
      icon: Icons.school,
      color: Color(0xFF3B82F6),
      type: RecordType.expense,
    ),
    Category(
      id: 'communication',
      name: '通讯',
      icon: Icons.phone_android,
      color: Color(0xFF14B8A6),
      type: RecordType.expense,
    ),
    Category(
      id: 'utilities',
      name: '水电',
      icon: Icons.bolt,
      color: Color(0xFFEAB308),
      type: RecordType.expense,
    ),
    Category(
      id: 'other_expense',
      name: '其他',
      icon: Icons.more_horiz,
      color: Color(0xFF64748B),
      type: RecordType.expense,
    ),
  ];

  // 收入分类
  static const List<Category> incomeCategories = [
    Category(
      id: 'salary',
      name: '工资',
      icon: Icons.account_balance_wallet,
      color: Color(0xFF10B981),
      type: RecordType.income,
    ),
    Category(
      id: 'bonus',
      name: '奖金',
      icon: Icons.card_giftcard,
      color: Color(0xFFF59E0B),
      type: RecordType.income,
    ),
    Category(
      id: 'investment',
      name: '投资',
      icon: Icons.trending_up,
      color: Color(0xFF6366F1),
      type: RecordType.income,
    ),
    Category(
      id: 'parttime',
      name: '兼职',
      icon: Icons.work,
      color: Color(0xFF8B5CF6),
      type: RecordType.income,
    ),
    Category(
      id: 'refund',
      name: '退款',
      icon: Icons.replay,
      color: Color(0xFF06B6D4),
      type: RecordType.income,
    ),
    Category(
      id: 'other_income',
      name: '其他',
      icon: Icons.more_horiz,
      color: Color(0xFF64748B),
      type: RecordType.income,
    ),
  ];

  static List<Category> getCategories(RecordType type) {
    return type == RecordType.expense ? expenseCategories : incomeCategories;
  }

  static Category? getCategoryById(String id) {
    try {
      return [...expenseCategories, ...incomeCategories]
          .firstWhere((c) => c.id == id);
    } catch (e) {
      return null;
    }
  }

  static Category getDefaultCategory(RecordType type) {
    return type == RecordType.expense 
        ? expenseCategories.first 
        : incomeCategories.first;
  }
}
