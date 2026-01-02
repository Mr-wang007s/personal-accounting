import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:personal_accounting/models/record.dart';
import 'package:personal_accounting/models/category.dart';
import 'package:personal_accounting/providers/records_provider.dart';
import 'package:personal_accounting/providers/ledger_provider.dart';
import 'package:personal_accounting/theme/app_theme.dart';

class AddRecordScreen extends StatefulWidget {
  final AccountRecord? record; // 编辑时传入

  const AddRecordScreen({super.key, this.record});

  @override
  State<AddRecordScreen> createState() => _AddRecordScreenState();
}

class _AddRecordScreenState extends State<AddRecordScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  
  RecordType _type = RecordType.expense;
  String? _selectedCategory;
  DateTime _selectedDate = DateTime.now();
  bool _isSubmitting = false;

  bool get isEditing => widget.record != null;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _type = _tabController.index == 0 ? RecordType.expense : RecordType.income;
          _selectedCategory = null;
        });
      }
    });
    
    // 如果是编辑模式，填充数据
    if (isEditing) {
      final record = widget.record!;
      _type = record.type;
      _tabController.index = _type == RecordType.expense ? 0 : 1;
      _amountController.text = record.amount.toStringAsFixed(2);
      _selectedCategory = record.category;
      _selectedDate = record.date;
      _noteController.text = record.note ?? '';
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_amountController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请输入金额')),
      );
      return;
    }
    
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请输入有效金额')),
      );
      return;
    }
    
    if (_selectedCategory == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请选择分类')),
      );
      return;
    }
    
    setState(() => _isSubmitting = true);
    
    final recordsProvider = context.read<RecordsProvider>();
    final ledgerProvider = context.read<LedgerProvider>();
    
    bool success;
    if (isEditing) {
      success = await recordsProvider.updateRecord(
        widget.record!.id,
        type: _type,
        amount: amount,
        category: _selectedCategory,
        date: _selectedDate,
        note: _noteController.text.isNotEmpty ? _noteController.text : null,
      );
    } else {
      final ledgerId = ledgerProvider.currentLedger?.id ?? '';
      final record = await recordsProvider.createRecord(
        type: _type,
        amount: amount,
        category: _selectedCategory!,
        date: _selectedDate,
        ledgerId: ledgerId,
        note: _noteController.text.isNotEmpty ? _noteController.text : null,
      );
      success = record != null;
    }
    
    setState(() => _isSubmitting = false);
    
    if (success && mounted) {
      // 刷新统计数据
      recordsProvider.loadStatistics();
      Navigator.of(context).pop(true);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(isEditing ? '更新失败' : '添加失败')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = CategoryData.getCategories(_type);
    
    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? '编辑记录' : '记一笔'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          TextButton(
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text('保存'),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '支出'),
            Tab(text: '收入'),
          ],
          indicatorColor: AppColors.primary,
          labelColor: AppColors.primary,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 金额输入
            _buildAmountInput(),
            
            const SizedBox(height: 24),
            
            // 分类选择
            const Text(
              '选择分类',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
            _buildCategoryGrid(categories),
            
            const SizedBox(height: 24),
            
            // 日期选择
            _buildDatePicker(),
            
            const SizedBox(height: 16),
            
            // 备注输入
            _buildNoteInput(),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountInput() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _type == RecordType.expense ? '支出金额' : '收入金额',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '¥',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: _type == RecordType.expense 
                      ? AppColors.expense 
                      : AppColors.income,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                  ],
                  style: TextStyle(
                    fontSize: 40,
                    fontWeight: FontWeight.bold,
                    color: _type == RecordType.expense 
                        ? AppColors.expense 
                        : AppColors.income,
                  ),
                  decoration: const InputDecoration(
                    hintText: '0.00',
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryGrid(List<Category> categories) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 5,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.85,
      ),
      itemCount: categories.length,
      itemBuilder: (context, index) {
        final category = categories[index];
        final isSelected = _selectedCategory == category.id;
        
        return GestureDetector(
          onTap: () {
            setState(() {
              _selectedCategory = category.id;
            });
          },
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: isSelected 
                      ? category.color 
                      : category.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: isSelected 
                      ? Border.all(color: category.color, width: 2) 
                      : null,
                ),
                child: Icon(
                  category.icon,
                  color: isSelected ? Colors.white : category.color,
                  size: 24,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                category.name,
                style: TextStyle(
                  fontSize: 11,
                  color: isSelected ? category.color : Colors.grey[600],
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildDatePicker() {
    return InkWell(
      onTap: _selectDate,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            const Icon(Icons.calendar_today, size: 20),
            const SizedBox(width: 12),
            Text(
              _formatDate(_selectedDate),
              style: const TextStyle(fontSize: 15),
            ),
            const Spacer(),
            Icon(Icons.chevron_right, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  Widget _buildNoteInput() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: TextField(
        controller: _noteController,
        maxLines: 3,
        maxLength: 200,
        decoration: const InputDecoration(
          hintText: '添加备注...',
          border: InputBorder.none,
          contentPadding: EdgeInsets.zero,
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final selectedDay = DateTime(date.year, date.month, date.day);
    
    if (selectedDay == today) {
      return '今天';
    } else if (selectedDay == yesterday) {
      return '昨天';
    } else {
      return DateFormat('yyyy年MM月dd日').format(date);
    }
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    
    if (date != null) {
      setState(() {
        _selectedDate = date;
      });
    }
  }
}
