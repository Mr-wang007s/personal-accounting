import 'package:flutter/foundation.dart';
import 'package:personal_accounting/models/user.dart';
import 'package:personal_accounting/services/api_service.dart';
import 'package:personal_accounting/services/auth_service.dart';
import 'package:personal_accounting/services/storage_service.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  final StorageService _storageService = StorageService();
  final ApiService _apiService = ApiService();
  
  AuthStatus _status = AuthStatus.initial;
  User? _user;
  String? _error;
  
  AuthStatus get status => _status;
  User? get user => _user;
  String? get error => _error;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  
  // 初始化，检查登录状态
  Future<void> initialize() async {
    _status = AuthStatus.loading;
    notifyListeners();
    
    try {
      await _apiService.loadToken();
      
      if (_apiService.isLoggedIn) {
        // 尝试获取用户信息
        _user = await _storageService.getUser();
        if (_user != null) {
          _status = AuthStatus.authenticated;
        } else {
          // Token 存在但用户信息不存在，尝试从服务器获取
          try {
            _user = await _authService.getProfile();
            await _storageService.saveUser(_user!);
            _status = AuthStatus.authenticated;
          } catch (e) {
            _status = AuthStatus.unauthenticated;
          }
        }
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (e) {
      _status = AuthStatus.unauthenticated;
      _error = e.toString();
    }
    
    notifyListeners();
  }
  
  // 手机号登录
  Future<bool> loginWithPhone(String phone, {String? nickname}) async {
    _status = AuthStatus.loading;
    _error = null;
    notifyListeners();
    
    try {
      final response = await _authService.loginWithPhone(phone, nickname: nickname);
      _user = response.user;
      await _storageService.saveUser(_user!);
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } catch (e) {
      _status = AuthStatus.error;
      _error = _parseError(e);
      notifyListeners();
      return false;
    }
  }
  
  // 登出
  Future<void> logout() async {
    await _authService.logout();
    await _storageService.clearAll();
    _user = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }
  
  // 更新用户信息
  void updateUser(User user) {
    _user = user;
    _storageService.saveUser(user);
    notifyListeners();
  }
  
  // 设置服务器地址
  Future<void> setServerUrl(String url) async {
    await _storageService.saveServerUrl(url);
    _apiService.setBaseUrl(url);
  }
  
  // 获取服务器地址
  Future<String?> getServerUrl() async {
    return await _storageService.getServerUrl();
  }
  
  String _parseError(dynamic e) {
    if (e.toString().contains('SocketException')) {
      return '网络连接失败，请检查网络设置';
    }
    if (e.toString().contains('401')) {
      return '登录已过期，请重新登录';
    }
    return '登录失败，请稍后重试';
  }
}
