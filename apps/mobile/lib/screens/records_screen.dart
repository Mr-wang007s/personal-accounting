import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:personal_accounting/models/record.dart';
import 'package:personal_accounting/models/category.dart';
import 'package:personal_accounting/providers/records_provider.dart';
import 'package:personal_accounting/screens/record_detail_screen.dart';
import 'package:personal_accounting/theme/app_theme.dart';
import 'package:personal_accounting/widgets/summary_card.dart';
import 'package:personal_accounting/widgets/record_list_item.dart';

class RecordsScreen extends StatefulWidget {
  const RecordsScreen({super.key});

  @override
  State<RecordsScreen> createState() => _RecordsScreenState();
}

class _RecordsScreenState extends State<RecordsScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= 
        _scrollController.position.maxScrollExtent - 200) {
      context.read<RecordsProvider>().loadMore();
    }
  }

  Future<void> _onRefresh() async {
    final provider = context.read<RecordsProvider>();
    await provider.loadRecords(refresh: true);
    await provider.loadStatistics();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('账单明细'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: Consumer<RecordsProvider>(
        builder: (context, provider, child) {
          return RefreshIndicator(
            onRefresh: _onRefresh,
            child: CustomScrollView(
              controller: _scrollController,
              slivers: [
                // 统计卡片
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: SummaryCard(statistics: provider.statistics),
                  ),
                ),
                
                // 记录列表
                if (provider.records.isEmpty && !provider.isLoading)
                  SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.receipt_long_outlined,
                            size: 64,
                            color: Colors.grey[400],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            '暂无记录',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey[600],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '点击下方按钮添加第一笔记录',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  _buildRecordsList(provider),
                
                // 加载指示器
                if (provider.isLoading)
                  const SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildRecordsList(RecordsProvider provider) {
    final groupedRecords = provider.groupedRecords;
    final sortedDates = groupedRecords.keys.toList()
      ..sort((a, b) => b.compareTo(a));
    
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final dateKey = sortedDates[index];
          final records = groupedRecords[dateKey]!;
          final date = DateTime.parse(dateKey);
          
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 日期标题
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  children: [
                    Text(
                      _formatDateHeader(date),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      _calculateDayTotal(records),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              // 记录列表
              ...records.map((record) => RecordListItem(
                record: record,
                onTap: () => _openRecordDetail(record),
                onDismissed: () => _deleteRecord(record),
              )),
            ],
          );
        },
        childCount: sortedDates.length,
      ),
    );
  }

  String _formatDateHeader(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final recordDate = DateTime(date.year, date.month, date.day);
    
    if (recordDate == today) {
      return '今天';
    } else if (recordDate == yesterday) {
      return '昨天';
    } else if (date.year == now.year) {
      return DateFormat('MM月dd日 EEEE', 'zh_CN').format(date);
    } else {
      return DateFormat('yyyy年MM月dd日', 'zh_CN').format(date);
    }
  }

  String _calculateDayTotal(List<AccountRecord> records) {
    double income = 0;
    double expense = 0;
    
    for (var record in records) {
      if (record.type == RecordType.income) {
        income += record.amount;
      } else {
        expense += record.amount;
      }
    }
    
    final parts = <String>[];
    if (income > 0) parts.add('收入 ¥${income.toStringAsFixed(2)}');
    if (expense > 0) parts.add('支出 ¥${expense.toStringAsFixed(2)}');
    
    return parts.join(' | ');
  }

  void _openRecordDetail(AccountRecord record) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RecordDetailScreen(record: record),
      ),
    );
  }

  Future<void> _deleteRecord(AccountRecord record) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除'),
        content: const Text('确定要删除这条记录吗？'),
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
    
    if (confirmed == true && mounted) {
      final success = await context.read<RecordsProvider>().deleteRecord(record.id);
      if (success && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('删除成功')),
        );
      }
    }
  }

  void _showFilterDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => const FilterBottomSheet(),
    );
  }
}

class FilterBottomSheet extends StatefulWidget {
  const FilterBottomSheet({super.key});

  @override
  State<FilterBottomSheet> createState() => _FilterBottomSheetState();
}

class _FilterBottomSheetState extends State<FilterBottomSheet> {
  String? _selectedType;
  String? _selectedCategory;
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '筛选',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              TextButton(
                onPressed: () {
                  setState(() {
                    _selectedType = null;
                    _selectedCategory = null;
                    _startDate = null;
                    _endDate = null;
                  });
                },
                child: const Text('重置'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // 类型筛选
          const Text('类型', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilterChip(
                label: const Text('全部'),
                selected: _selectedType == null,
                onSelected: (_) => setState(() => _selectedType = null),
              ),
              FilterChip(
                label: const Text('支出'),
                selected: _selectedType == 'expense',
                onSelected: (_) => setState(() => _selectedType = 'expense'),
              ),
              FilterChip(
                label: const Text('收入'),
                selected: _selectedType == 'income',
                onSelected: (_) => setState(() => _selectedType = 'income'),
              ),
            ],
          ),
          
          const SizedBox(height: 20),
          
          // 日期筛选
          const Text('日期范围', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _selectDate(true),
                  child: Text(
                    _startDate != null 
                        ? DateFormat('yyyy-MM-dd').format(_startDate!)
                        : '开始日期',
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 8),
                child: Text('至'),
              ),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _selectDate(false),
                  child: Text(
                    _endDate != null 
                        ? DateFormat('yyyy-MM-dd').format(_endDate!)
                        : '结束日期',
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // 确认按钮
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _applyFilter,
              child: const Text('应用筛选'),
            ),
          ),
          
          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
    );
  }

  Future<void> _selectDate(bool isStart) async {
    final date = await showDatePicker(
      context: context,
      initialDate: isStart ? (_startDate ?? DateTime.now()) : (_endDate ?? DateTime.now()),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    
    if (date != null) {
      setState(() {
        if (isStart) {
          _startDate = date;
        } else {
          _endDate = date;
        }
      });
    }
  }

  void _applyFilter() {
    context.read<RecordsProvider>().setFilter(
      type: _selectedType,
      category: _selectedCategory,
      startDate: _startDate,
      endDate: _endDate,
    );
    Navigator.pop(context);
  }
}
