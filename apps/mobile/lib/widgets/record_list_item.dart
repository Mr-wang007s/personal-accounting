import 'package:flutter/material.dart';
import 'package:personal_accounting/models/record.dart';
import 'package:personal_accounting/models/category.dart';
import 'package:personal_accounting/theme/app_theme.dart';

class RecordListItem extends StatelessWidget {
  final AccountRecord record;
  final VoidCallback? onTap;
  final VoidCallback? onDismissed;

  const RecordListItem({
    super.key,
    required this.record,
    this.onTap,
    this.onDismissed,
  });

  @override
  Widget build(BuildContext context) {
    final category = CategoryData.getCategoryById(record.category);
    final isExpense = record.type == RecordType.expense;
    
    return Dismissible(
      key: Key(record.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        onDismissed?.call();
        return false; // 让外部处理删除逻辑
      },
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppColors.expense,
        child: const Icon(
          Icons.delete_outline,
          color: Colors.white,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              // 分类图标
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: (category?.color ?? Colors.grey).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  category?.icon ?? Icons.help_outline,
                  color: category?.color ?? Colors.grey,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              
              // 分类名称和备注
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      category?.name ?? record.category,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    if (record.note != null && record.note!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(
                          record.note!,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[600],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
              ),
              
              // 金额
              Text(
                '${isExpense ? '-' : '+'}¥${record.amount.toStringAsFixed(2)}',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: isExpense ? AppColors.expense : AppColors.income,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
