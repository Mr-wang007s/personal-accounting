import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:personal_accounting/models/record.dart';
import 'package:personal_accounting/models/category.dart';
import 'package:personal_accounting/providers/records_provider.dart';
import 'package:personal_accounting/theme/app_theme.dart';

class StatisticsScreen extends StatefulWidget {
  const StatisticsScreen({super.key});

  @override
  State<StatisticsScreen> createState() => _StatisticsScreenState();
}

class _StatisticsScreenState extends State<StatisticsScreen> {
  int _selectedMonthOffset = 0; // 0 表示本月，-1 表示上月
  String _selectedType = 'expense';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final provider = context.read<RecordsProvider>();
    final dateRange = _getDateRange();
    
    await Future.wait([
      provider.loadStatistics(startDate: dateRange.start, endDate: dateRange.end),
      provider.loadCategoryBreakdown(
        startDate: dateRange.start,
        endDate: dateRange.end,
        type: _selectedType,
      ),
      provider.loadMonthlyTrend(),
    ]);
  }

  DateTimeRange _getDateRange() {
    final now = DateTime.now();
    final targetMonth = DateTime(now.year, now.month + _selectedMonthOffset, 1);
    final start = targetMonth;
    final end = DateTime(targetMonth.year, targetMonth.month + 1, 0);
    return DateTimeRange(start: start, end: end);
  }

  void _changeMonth(int offset) {
    setState(() {
      _selectedMonthOffset += offset;
    });
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('统计分析'),
      ),
      body: Consumer<RecordsProvider>(
        builder: (context, provider, child) {
          return RefreshIndicator(
            onRefresh: _loadData,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 月份选择器
                  _buildMonthSelector(),
                  
                  const SizedBox(height: 20),
                  
                  // 收支概览
                  _buildOverviewCard(provider.statistics),
                  
                  const SizedBox(height: 24),
                  
                  // 类型切换
                  _buildTypeSelector(),
                  
                  const SizedBox(height: 16),
                  
                  // 分类饼图
                  _buildPieChart(provider.categoryBreakdown),
                  
                  const SizedBox(height: 24),
                  
                  // 分类列表
                  _buildCategoryList(provider.categoryBreakdown),
                  
                  const SizedBox(height: 24),
                  
                  // 月度趋势
                  const Text(
                    '月度趋势',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildTrendChart(provider.monthlyTrend),
                  
                  const SizedBox(height: 20),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMonthSelector() {
    final dateRange = _getDateRange();
    final monthStr = DateFormat('yyyy年MM月').format(dateRange.start);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () => _changeMonth(-1),
          ),
          Text(
            monthStr,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: _selectedMonthOffset >= 0 ? null : () => _changeMonth(1),
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewCard(RecordStatistics? statistics) {
    final income = statistics?.totalIncome ?? 0;
    final expense = statistics?.totalExpense ?? 0;
    
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            title: '收入',
            amount: income,
            color: AppColors.income,
            icon: Icons.arrow_downward,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            title: '支出',
            amount: expense,
            color: AppColors.expense,
            icon: Icons.arrow_upward,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required double amount,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: color),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '¥${amount.toStringAsFixed(2)}',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypeSelector() {
    return Row(
      children: [
        _buildTypeChip('支出', 'expense'),
        const SizedBox(width: 12),
        _buildTypeChip('收入', 'income'),
      ],
    );
  }

  Widget _buildTypeChip(String label, String value) {
    final isSelected = _selectedType == value;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedType = value;
        });
        _loadData();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.grey[200],
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.grey[700],
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildPieChart(List<CategoryBreakdown> breakdown) {
    if (breakdown.isEmpty) {
      return Container(
        height: 200,
        alignment: Alignment.center,
        child: Text(
          '暂无数据',
          style: TextStyle(color: Colors.grey[500]),
        ),
      );
    }
    
    return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: PieChart(
        PieChartData(
          sectionsSpace: 2,
          centerSpaceRadius: 40,
          sections: breakdown.map((item) {
            final category = CategoryData.getCategoryById(item.category);
            return PieChartSectionData(
              value: item.amount,
              title: '${item.percentage.toStringAsFixed(0)}%',
              color: category?.color ?? Colors.grey,
              radius: 50,
              titleStyle: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildCategoryList(List<CategoryBreakdown> breakdown) {
    if (breakdown.isEmpty) return const SizedBox.shrink();
    
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: breakdown.map((item) {
          final category = CategoryData.getCategoryById(item.category);
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: (category?.color ?? Colors.grey).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    category?.icon ?? Icons.help_outline,
                    color: category?.color ?? Colors.grey,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        category?.name ?? item.category,
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      LinearProgressIndicator(
                        value: item.percentage / 100,
                        backgroundColor: Colors.grey[200],
                        valueColor: AlwaysStoppedAnimation(
                          category?.color ?? Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '¥${item.amount.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      '${item.percentage.toStringAsFixed(1)}%',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTrendChart(List<MonthlyTrend> trend) {
    if (trend.isEmpty) {
      return Container(
        height: 200,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          '暂无数据',
          style: TextStyle(color: Colors.grey[500]),
        ),
      );
    }
    
    final maxY = trend.fold<double>(0, (max, item) {
      final itemMax = item.income > item.expense ? item.income : item.expense;
      return itemMax > max ? itemMax : max;
    });
    
    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxY * 1.2,
          barTouchData: BarTouchData(enabled: false),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  if (value.toInt() >= trend.length) return const SizedBox();
                  final month = trend[value.toInt()].month;
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      month.substring(5), // 只显示月份
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                    ),
                  );
                },
              ),
            ),
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          borderData: FlBorderData(show: false),
          gridData: const FlGridData(show: false),
          barGroups: trend.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return BarChartGroupData(
              x: index,
              barRods: [
                BarChartRodData(
                  toY: item.income,
                  color: AppColors.income,
                  width: 12,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                ),
                BarChartRodData(
                  toY: item.expense,
                  color: AppColors.expense,
                  width: 12,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}
