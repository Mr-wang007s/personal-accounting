import 'package:flutter/foundation.dart';
import 'package:personal_accounting/models/ledger.dart';
import 'package:personal_accounting/services/storage_service.dart';
import 'package:personal_accounting/services/sync_service.dart';
import 'package:uuid/uuid.dart';

/// 账本状态管理
/// 重构：移除本地存储，所有数据通过 API 操作
class LedgerProvider with ChangeNotifier {
  final StorageService _storageService = StorageService();
  final SyncService _syncService = SyncService();
  final Uuid _uuid = const Uuid();
  
  List<Ledger> _ledgers = [];
  Ledger? _currentLedger;
  bool _isLoading = false;
  String? _error;
  
  List<Ledger> get ledgers => _ledgers;
  Ledger? get currentLedger => _currentLedger;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  /// 初始化 - 从云端加载账本
  Future<void> initialize() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      // 从云端恢复数据
      final response = await _syncService.restore();
      _ledgers = response.ledgers;
      
      // 如果没有账本，创建默认账本
      if (_ledgers.isEmpty) {
        await _createDefaultLedger();
      }
      
      // 尝试加载上次选择的账本
      final savedLedgerId = await _storageService.getCurrentLedgerId();
      if (savedLedgerId != null && _ledgers.any((l) => l.id == savedLedgerId)) {
        _currentLedger = _ledgers.firstWhere((l) => l.id == savedLedgerId);
      } else if (_ledgers.isNotEmpty) {
        _currentLedger = _ledgers.first;
        await _storageService.saveCurrentLedgerId(_currentLedger!.id);
      }
    } catch (e) {
      _error = '加载账本失败: $e';
      // 如果加载失败，创建本地默认账本
      if (_ledgers.isEmpty) {
        await _createDefaultLedger();
      }
    }
    
    _isLoading = false;
    notifyListeners();
  }
  
  /// 创建默认账本
  Future<void> _createDefaultLedger() async {
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
    
    // 尝试同步到云端
    try {
      await backupToCloud();
    } catch (e) {
      print('同步默认账本失败: $e');
    }
  }
  
  /// 从云端刷新账本列表
  Future<void> refreshFromCloud() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      final response = await _syncService.restore();
      _ledgers = response.ledgers;
      
      // 更新当前账本
      if (_currentLedger != null) {
        final updated = _ledgers.firstWhere(
          (l) => l.id == _currentLedger!.id,
          orElse: () => _ledgers.isNotEmpty ? _ledgers.first : _currentLedger!,
        );
        _currentLedger = updated;
      } else if (_ledgers.isNotEmpty) {
        _currentLedger = _ledgers.first;
      }
    } catch (e) {
      _error = '刷新失败: $e';
    }
    
    _isLoading = false;
    notifyListeners();
  }
  
  /// 创建新账本
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
    
    // 同步到云端
    try {
      await backupToCloud();
    } catch (e) {
      print('同步新账本失败: $e');
    }
    
    return ledger;
  }
  
  /// 更新账本
  Future<void> updateLedger(Ledger ledger) async {
    final index = _ledgers.indexWhere((l) => l.id == ledger.id);
    if (index != -1) {
      _ledgers[index] = ledger.copyWith(updatedAt: DateTime.now());
      if (_currentLedger?.id == ledger.id) {
        _currentLedger = _ledgers[index];
      }
      notifyListeners();
      
      // 同步到云端
      try {
        await backupToCloud();
      } catch (e) {
        print('同步更新账本失败: $e');
      }
    }
  }
  
  /// 删除账本
  Future<void> deleteLedger(String id) async {
    // 至少保留一个账本
    if (_ledgers.length <= 1) return;
    
    _ledgers.removeWhere((l) => l.id == id);
    
    if (_currentLedger?.id == id) {
      _currentLedger = _ledgers.isNotEmpty ? _ledgers.first : null;
      if (_currentLedger != null) {
        await _storageService.saveCurrentLedgerId(_currentLedger!.id);
      }
    }
    
    notifyListeners();
    
    // 同步删除到云端
    try {
      await _syncService.deleteCloudLedger(id);
    } catch (e) {
      print('删除云端账本失败: $e');
    }
  }
  
  /// 切换当前账本
  Future<void> setCurrentLedger(Ledger ledger) async {
    _currentLedger = ledger;
    await _storageService.saveCurrentLedgerId(ledger.id);
    notifyListeners();
  }
  
  /// 备份账本到云端
  Future<void> backupToCloud() async {
    final ledgersData = _ledgers.map((l) => {
      'clientId': l.clientId ?? l.id,
      'name': l.name,
      'icon': l.icon,
      'color': l.color,
      'createdAt': l.createdAt.toIso8601String(),
    }).toList();
    
    await _syncService.backupLedgers(ledgersData);
  }
  
  /// 设置账本列表（从云端恢复时使用）
  void setLedgers(List<Ledger> ledgers) {
    _ledgers = ledgers;
    if (_currentLedger == null && _ledgers.isNotEmpty) {
      _currentLedger = _ledgers.first;
    }
    notifyListeners();
  }
  
  /// 清空数据
  void clear() {
    _ledgers = [];
    _currentLedger = null;
    _error = null;
    notifyListeners();
  }
}
