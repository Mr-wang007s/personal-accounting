import 'package:flutter/foundation.dart';
import 'package:personal_accounting/models/record.dart';
import 'package:personal_accounting/services/record_service.dart';
import 'package:intl/intl.dart';

class RecordsProvider with ChangeNotifier {
  final RecordService _recordService = RecordService();
  
  List<AccountRecord> _records = [];
  RecordStatistics? _statistics;
  List<MonthlyTrend> _monthlyTrend = [];
  List<CategoryBreakdown> _categoryBreakdown = [];
  
  bool _isLoading = false;
  bool _hasMore = true;
  int _currentPage = 1;
  String? _error;
  
  // 筛选条件
  String? _filterType;
  String? _filterCategory;
  DateTime? _filterStartDate;
  DateTime? _filterEndDate;
  
  List<AccountRecord> get records => _records;
  RecordStatistics? get statistics => _statistics;
  List<MonthlyTrend> get monthlyTrend => _monthlyTrend;
  List<CategoryBreakdown> get categoryBreakdown => _categoryBreakdown;
  bool get isLoading => _isLoading;
  bool get hasMore => _hasMore;
  String? get error => _error;
  
  // 获取今日记录
  List<AccountRecord> get todayRecords {
    final today = DateTime.now();
    return _records.where((r) => 
      r.date.year == today.year && 
      r.date.month == today.month && 
      r.date.day == today.day
    ).toList();
  }
  
  // 按日期分组的记录
  Map<String, List<AccountRecord>> get groupedRecords {
    final Map<String, List<AccountRecord>> grouped = {};
    for (var record in _records) {
      final dateKey = DateFormat('yyyy-MM-dd').format(record.date);
      grouped.putIfAbsent(dateKey, () => []);
      grouped[dateKey]!.add(record);
    }
    return grouped;
  }
  
  // 加载记录列表
  Future<void> loadRecords({bool refresh = false}) async {
    if (_isLoading) return;
    
    if (refresh) {
      _currentPage = 1;
      _hasMore = true;
    }
    
    if (!_hasMore && !refresh) return;
    
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      final response = await _recordService.getRecords(
        type: _filterType,
        category: _filterCategory,
        startDate: _filterStartDate != null 
            ? DateFormat('yyyy-MM-dd').format(_filterStartDate!) 
            : null,
        endDate: _filterEndDate != null 
            ? DateFormat('yyyy-MM-dd').format(_filterEndDate!) 
            : null,
        page: _currentPage,
        pageSize: 20,
      );
      
      if (refresh) {
        _records = response.records;
      } else {
        _records.addAll(response.records);
      }
      
      _hasMore = _currentPage < response.totalPages;
      _currentPage++;
    } catch (e) {
      _error = '加载失败: $e';
    }
    
    _isLoading = false;
    notifyListeners();
  }
  
  // 加载更多
  Future<void> loadMore() async {
    if (!_hasMore || _isLoading) return;
    await loadRecords();
  }
  
  // 创建记录
  Future<AccountRecord?> createRecord({
    required RecordType type,
    required double amount,
    required String category,
    required DateTime date,
    required String ledgerId,
    String? note,
  }) async {
    try {
      final record = await _recordService.createRecord(
        type: type == RecordType.income ? 'income' : 'expense',
        amount: amount,
        category: category,
        date: DateFormat('yyyy-MM-dd').format(date),
        ledgerId: ledgerId,
        note: note,
      );
      
      // 插入到列表开头
      _records.insert(0, record);
      notifyListeners();
      
      return record;
    } catch (e) {
      _error = '创建失败: $e';
      notifyListeners();
      return null;
    }
  }
  
  // 更新记录
  Future<bool> updateRecord(String id, {
    RecordType? type,
    double? amount,
    String? category,
    DateTime? date,
    String? note,
  }) async {
    try {
      final record = await _recordService.updateRecord(
        id,
        type: type != null ? (type == RecordType.income ? 'income' : 'expense') : null,
        amount: amount,
        category: category,
        date: date != null ? DateFormat('yyyy-MM-dd').format(date) : null,
        note: note,
      );
      
      final index = _records.indexWhere((r) => r.id == id);
      if (index != -1) {
        _records[index] = record;
        notifyListeners();
      }
      
      return true;
    } catch (e) {
      _error = '更新失败: $e';
      notifyListeners();
      return false;
    }
  }
  
  // 删除记录
  Future<bool> deleteRecord(String id) async {
    try {
      await _recordService.deleteRecord(id);
      _records.removeWhere((r) => r.id == id);
      notifyListeners();
      return true;
    } catch (e) {
      _error = '删除失败: $e';
      notifyListeners();
      return false;
    }
  }
  
  // 加载统计数据
  Future<void> loadStatistics({DateTime? startDate, DateTime? endDate}) async {
    final start = startDate ?? DateTime(DateTime.now().year, DateTime.now().month, 1);
    final end = endDate ?? DateTime.now();
    
    try {
      _statistics = await _recordService.getStatistics(
        startDate: DateFormat('yyyy-MM-dd').format(start),
        endDate: DateFormat('yyyy-MM-dd').format(end),
      );
      notifyListeners();
    } catch (e) {
      print('加载统计数据失败: $e');
    }
  }
  
  // 加载月度趋势
  Future<void> loadMonthlyTrend({int months = 6}) async {
    final now = DateTime.now();
    final start = DateTime(now.year, now.month - months + 1, 1);
    
    try {
      _monthlyTrend = await _recordService.getMonthlyTrend(
        startDate: DateFormat('yyyy-MM-dd').format(start),
        endDate: DateFormat('yyyy-MM-dd').format(now),
      );
      notifyListeners();
    } catch (e) {
      print('加载月度趋势失败: $e');
    }
  }
  
  // 加载分类统计
  Future<void> loadCategoryBreakdown({
    DateTime? startDate,
    DateTime? endDate,
    String type = 'expense',
  }) async {
    final start = startDate ?? DateTime(DateTime.now().year, DateTime.now().month, 1);
    final end = endDate ?? DateTime.now();
    
    try {
      _categoryBreakdown = await _recordService.getCategoryBreakdown(
        startDate: DateFormat('yyyy-MM-dd').format(start),
        endDate: DateFormat('yyyy-MM-dd').format(end),
        type: type,
      );
      notifyListeners();
    } catch (e) {
      print('加载分类统计失败: $e');
    }
  }
  
  // 设置筛选条件
  void setFilter({
    String? type,
    String? category,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    _filterType = type;
    _filterCategory = category;
    _filterStartDate = startDate;
    _filterEndDate = endDate;
    loadRecords(refresh: true);
  }
  
  // 清除筛选
  void clearFilter() {
    _filterType = null;
    _filterCategory = null;
    _filterStartDate = null;
    _filterEndDate = null;
    loadRecords(refresh: true);
  }
  
  // 清空数据
  void clear() {
    _records = [];
    _statistics = null;
    _monthlyTrend = [];
    _categoryBreakdown = [];
    _currentPage = 1;
    _hasMore = true;
    notifyListeners();
  }
}
