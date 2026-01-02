import 'package:personal_accounting/models/ledger.dart';
import 'package:personal_accounting/models/record.dart';
import 'package:personal_accounting/services/api_service.dart';

class SyncService {
  final ApiService _api = ApiService();
  
  // 备份账本到云端
  Future<void> backupLedgers(List<Map<String, dynamic>> ledgers) async {
    await _api.post('/sync/backup-ledgers', data: {'ledgers': ledgers});
  }
  
  // 备份记录到云端
  Future<void> backupRecords(List<Map<String, dynamic>> records) async {
    await _api.post('/sync/backup', data: {'records': records});
  }
  
  // 从云端恢复所有数据
  Future<RestoreResponse> restore() async {
    final response = await _api.get('/sync/restore');
    return RestoreResponse.fromJson(response.data);
  }
  
  // 删除云端记录
  Future<void> deleteCloudRecords(List<String> serverIds) async {
    await _api.post('/sync/delete-cloud', data: {'serverIds': serverIds});
  }
  
  // 删除云端账本及其所有记录
  Future<void> deleteCloudLedger(String clientId) async {
    await _api.post('/sync/delete-ledger', data: {'clientId': clientId});
  }
}

class RestoreResponse {
  final List<Ledger> ledgers;
  final List<AccountRecord> records;

  RestoreResponse({
    required this.ledgers,
    required this.records,
  });

  factory RestoreResponse.fromJson(Map<String, dynamic> json) {
    return RestoreResponse(
      ledgers: (json['ledgers'] as List? ?? [])
          .map((item) => Ledger.fromJson(item))
          .toList(),
      records: (json['records'] as List? ?? [])
          .map((item) => AccountRecord.fromJson(item))
          .toList(),
    );
  }
}
