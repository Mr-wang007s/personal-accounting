import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:personal_accounting/models/user.dart';

/// 本地存储服务 - 仅存储认证和配置信息
/// 重构：移除业务数据本地存储，所有业务数据通过 API 操作
class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();
  
  // 存储键（仅保留认证和配置相关）
  static const String _tokenKey = 'access_token';
  static const String _userKey = 'user_info';
  static const String _serverUrlKey = 'server_url';
  static const String _currentLedgerKey = 'current_ledger_id';
  static const String _deviceIdKey = 'device_id';
  
  // ==================== Token 管理 ====================
  
  Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }
  
  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }
  
  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
  
  // ==================== 用户信息管理 ====================
  
  Future<void> saveUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, jsonEncode(user.toJson()));
  }
  
  Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userKey);
    if (userJson != null) {
      return User.fromJson(jsonDecode(userJson));
    }
    return null;
  }
  
  Future<void> clearUser() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_userKey);
  }
  
  // ==================== 服务器地址管理 ====================
  
  Future<void> saveServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverUrlKey, url);
  }
  
  Future<String?> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_serverUrlKey);
  }
  
  // ==================== 当前账本 ID 管理 ====================
  
  Future<void> saveCurrentLedgerId(String ledgerId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_currentLedgerKey, ledgerId);
  }
  
  Future<String?> getCurrentLedgerId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_currentLedgerKey);
  }
  
  // ==================== 设备 ID 管理 ====================
  
  Future<String> getOrCreateDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var deviceId = prefs.getString(_deviceIdKey);
    if (deviceId == null) {
      deviceId = 'mobile_${DateTime.now().millisecondsSinceEpoch}_${_generateRandomString(7)}';
      await prefs.setString(_deviceIdKey, deviceId);
    }
    return deviceId;
  }
  
  String _generateRandomString(int length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = DateTime.now().microsecondsSinceEpoch;
    return List.generate(length, (index) => chars[(random + index) % chars.length]).join();
  }
  
  // ==================== 清除所有数据 ====================
  
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
