import 'package:flutter/foundation.dart';
import 'package:personal_accounting/models/ledger.dart';
import 'package:personal_accounting/services/storage_service.dart';
import 'package:personal_accounting/services/sync_service.dart';
import 'package:uuid/uuid.dart';

class LedgerProvider with ChangeNotifier {
  final StorageService _storageService = StorageService();
  final SyncService _syncService = SyncService();
  final Uuid _uuid = const Uuid();
  
  List<Ledger> _ledgers = [];
  Ledger? _currentLedger;
  bool _isLoading = false;
  
  List<Ledger> get ledgers => _ledgers;
  Ledger? get currentLedger => _currentLedger;
  bool get isLoading => _isLoading;
  
  // 初始化账本
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();
    
    // 如果没有账本，创建默认账本
    if (_ledgers.isEmpty) {
      final defaultLedger = Ledger(
        id: _uuid.v4(),
        clientId: _uuid.v4(),
        name: '默认账本',
        icon: 'wallet',
        color: '#6366F1',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      _ledgers = [defaultLedger];
      _currentLedger = defaultLedger;
    }
    
    // 尝试加载上次选择的账本
    final savedLedgerId = await _storageService.getCurrentLedgerId();
    if (savedLedgerId != null) {
      _currentLedger = _ledgers.firstWhere(
        (l) => l.id == savedLedgerId,
        orElse: () => _ledgers.first,
      );
    } else if (_currentLedger == null && _ledgers.isNotEmpty) {
      _currentLedger = _ledgers.first;
    }
    
    _isLoading = false;
    notifyListeners();
  }
  
  // 从云端恢复账本
  Future<void> restoreFromCloud() async {
    _isLoading = true;
    notifyListeners();
    
    try {
      final response = await _syncService.restore();
      if (response.ledgers.isNotEmpty) {
        _ledgers = response.ledgers;
        _currentLedger = _ledgers.first;
        await _storageService.saveCurrentLedgerId(_currentLedger!.id);
      }
    } catch (e) {
      print('恢复账本失败: $e');
    }
    
    _isLoading = false;
    notifyListeners();
  }
  
  // 创建新账本
  Future<Ledger> createLedger({
    required String name,
    String? icon,
    String? color,
  }) async {
    final ledger = Ledger(
      id: _uuid.v4(),
      clientId: _uuid.v4(),
      name: name,
      icon: icon,
      color: color,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    
    _ledgers.add(ledger);
    notifyListeners();
    
    return ledger;
  }
  
  // 更新账本
  Future<void> updateLedger(Ledger ledger) async {
    final index = _ledgers.indexWhere((l) => l.id == ledger.id);
    if (index != -1) {
      _ledgers[index] = ledger.copyWith(updatedAt: DateTime.now());
      if (_currentLedger?.id == ledger.id) {
        _currentLedger = _ledgers[index];
      }
      notifyListeners();
    }
  }
  
  // 删除账本
  Future<void> deleteLedger(String id) async {
    _ledgers.removeWhere((l) => l.id == id);
    
    if (_currentLedger?.id == id) {
      _currentLedger = _ledgers.isNotEmpty ? _ledgers.first : null;
      if (_currentLedger != null) {
        await _storageService.saveCurrentLedgerId(_currentLedger!.id);
      }
    }
    
    notifyListeners();
  }
  
  // 切换当前账本
  Future<void> setCurrentLedger(Ledger ledger) async {
    _currentLedger = ledger;
    await _storageService.saveCurrentLedgerId(ledger.id);
    notifyListeners();
  }
  
  // 备份账本到云端
  Future<void> backupToCloud() async {
    try {
      final ledgersData = _ledgers.map((l) => {
        'clientId': l.clientId ?? l.id,
        'name': l.name,
        'icon': l.icon,
        'color': l.color,
        'createdAt': l.createdAt.toIso8601String(),
      }).toList();
      
      await _syncService.backupLedgers(ledgersData);
    } catch (e) {
      print('备份账本失败: $e');
      rethrow;
    }
  }
  
  // 设置账本列表（从云端恢复时使用）
  void setLedgers(List<Ledger> ledgers) {
    _ledgers = ledgers;
    if (_currentLedger == null && _ledgers.isNotEmpty) {
      _currentLedger = _ledgers.first;
    }
    notifyListeners();
  }
}
