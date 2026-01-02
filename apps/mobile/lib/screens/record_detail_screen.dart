import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:personal_accounting/models/record.dart';
import 'package:personal_accounting/models/category.dart';
import 'package:personal_accounting/providers/records_provider.dart';
import 'package:personal_accounting/screens/add_record_screen.dart';
import 'package:personal_accounting/theme/app_theme.dart';

class RecordDetailScreen extends StatelessWidget {
  final AccountRecord record;

  const RecordDetailScreen({super.key, required this.record});

  @override
  Widget build(BuildContext context) {
    final category = CategoryData.getCategoryById(record.category);
    final isExpense = record.type == RecordType.expense;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('记录详情'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => _editRecord(context),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => _deleteRecord(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 金额卡片
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isExpense
                      ? [AppColors.expense, AppColors.expense.withOpacity(0.8)]
                      : [AppColors.income, AppColors.income.withOpacity(0.8)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      category?.icon ?? Icons.help_outline,
                      color: Colors.white,
                      size: 30,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    category?.name ?? record.category,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${isExpense ? '-' : '+'}¥${record.amount.toStringAsFixed(2)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // 详情列表
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _buildDetailItem(
                    context,
                    icon: Icons.category,
                    label: '类型',
                    value: isExpense ? '支出' : '收入',
                  ),
                  const Divider(height: 1),
                  _buildDetailItem(
                    context,
                    icon: Icons.calendar_today,
                    label: '日期',
                    value: DateFormat('yyyy年MM月dd日 EEEE', 'zh_CN').format(record.date),
                  ),
                  const Divider(height: 1),
                  _buildDetailItem(
                    context,
                    icon: Icons.access_time,
                    label: '创建时间',
                    value: DateFormat('yyyy-MM-dd HH:mm').format(record.createdAt),
                  ),
                  if (record.note != null && record.note!.isNotEmpty) ...[
                    const Divider(height: 1),
                    _buildDetailItem(
                      context,
                      icon: Icons.notes,
                      label: '备注',
                      value: record.note!,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Text(
            label,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  void _editRecord(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AddRecordScreen(record: record),
        fullscreenDialog: true,
      ),
    );
  }

  Future<void> _deleteRecord(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除'),
        content: const Text('确定要删除这条记录吗？此操作不可恢复。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.expense),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    
    if (confirmed == true && context.mounted) {
      final success = await context.read<RecordsProvider>().deleteRecord(record.id);
      if (success && context.mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('删除成功')),
        );
      }
    }
  }
}
