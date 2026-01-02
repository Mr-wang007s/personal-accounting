import 'package:personal_accounting/models/record.dart';
import 'package:personal_accounting/services/api_service.dart';

class RecordService {
  final ApiService _api = ApiService();
  
  // 创建记账记录
  Future<AccountRecord> createRecord({
    required String type,
    required double amount,
    required String category,
    required String date,
    required String ledgerId,
    String? note,
    String? clientId,
  }) async {
    final response = await _api.post('/records', data: {
      'type': type,
      'amount': amount,
      'category': category,
      'date': date,
      'ledgerId': ledgerId,
      if (note != null) 'note': note,
      if (clientId != null) 'clientId': clientId,
    });
    
    return AccountRecord.fromJson(response.data);
  }
  
  // 查询记账记录列表
  Future<RecordListResponse> getRecords({
    String? type,
    String? category,
    String? startDate,
    String? endDate,
    String? keyword,
    String sortOrder = 'desc',
    int page = 1,
    int pageSize = 20,
  }) async {
    final response = await _api.get('/records', queryParameters: {
      if (type != null) 'type': type,
      if (category != null) 'category': category,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      if (keyword != null) 'keyword': keyword,
      'sortOrder': sortOrder,
      'page': page,
      'pageSize': pageSize,
    });
    
    return RecordListResponse.fromJson(response.data);
  }
  
  // 获取单条记录
  Future<AccountRecord> getRecord(String id) async {
    final response = await _api.get('/records/$id');
    return AccountRecord.fromJson(response.data);
  }
  
  // 更新记录
  Future<AccountRecord> updateRecord(String id, {
    String? type,
    double? amount,
    String? category,
    String? date,
    String? note,
  }) async {
    final response = await _api.put('/records/$id', data: {
      if (type != null) 'type': type,
      if (amount != null) 'amount': amount,
      if (category != null) 'category': category,
      if (date != null) 'date': date,
      if (note != null) 'note': note,
    });
    
    return AccountRecord.fromJson(response.data);
  }
  
  // 删除记录
  Future<void> deleteRecord(String id) async {
    await _api.delete('/records/$id');
  }
  
  // 批量删除记录
  Future<void> batchDeleteRecords(List<String> ids) async {
    await _api.post('/records/batch-delete', data: {'ids': ids});
  }
  
  // 获取统计数据
  Future<RecordStatistics> getStatistics({
    required String startDate,
    required String endDate,
  }) async {
    final response = await _api.get('/records/statistics', queryParameters: {
      'startDate': startDate,
      'endDate': endDate,
    });
    
    return RecordStatistics.fromJson(response.data);
  }
  
  // 获取月度趋势
  Future<List<MonthlyTrend>> getMonthlyTrend({
    required String startDate,
    required String endDate,
  }) async {
    final response = await _api.get('/records/monthly-trend', queryParameters: {
      'startDate': startDate,
      'endDate': endDate,
    });
    
    return (response.data as List)
        .map((item) => MonthlyTrend.fromJson(item))
        .toList();
  }
  
  // 获取分类统计
  Future<List<CategoryBreakdown>> getCategoryBreakdown({
    required String startDate,
    required String endDate,
    String type = 'expense',
  }) async {
    final response = await _api.get('/records/category-breakdown', queryParameters: {
      'startDate': startDate,
      'endDate': endDate,
      'type': type,
    });
    
    return (response.data as List)
        .map((item) => CategoryBreakdown.fromJson(item))
        .toList();
  }
}

class RecordListResponse {
  final List<AccountRecord> records;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;

  RecordListResponse({
    required this.records,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
  });

  factory RecordListResponse.fromJson(Map<String, dynamic> json) {
    return RecordListResponse(
      records: (json['records'] as List? ?? json['data'] as List? ?? [])
          .map((item) => AccountRecord.fromJson(item))
          .toList(),
      total: json['total'] as int? ?? 0,
      page: json['page'] as int? ?? 1,
      pageSize: json['pageSize'] as int? ?? 20,
      totalPages: json['totalPages'] as int? ?? 1,
    );
  }
}
