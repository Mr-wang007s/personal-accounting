import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:personal_accounting/models/user.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();
  
  static const String _tokenKey = 'access_token';
  static const String _userKey = 'user_info';
  static const String _serverUrlKey = 'server_url';
  static const String _currentLedgerKey = 'current_ledger_id';
  
  // Token 管理
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
  
  // 用户信息管理
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
  
  // 服务器地址管理
  Future<void> saveServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_serverUrlKey, url);
  }
  
  Future<String?> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_serverUrlKey);
  }
  
  // 当前账本管理
  Future<void> saveCurrentLedgerId(String ledgerId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_currentLedgerKey, ledgerId);
  }
  
  Future<String?> getCurrentLedgerId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_currentLedgerKey);
  }
  
  // 清除所有数据
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
