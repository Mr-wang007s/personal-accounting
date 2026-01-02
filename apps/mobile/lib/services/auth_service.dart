import 'package:personal_accounting/models/user.dart';
import 'package:personal_accounting/services/api_service.dart';

class AuthService {
  final ApiService _api = ApiService();
  
  // 手机号登录（开发测试用）
  Future<AuthResponse> loginWithPhone(String phone, {String? nickname}) async {
    final response = await _api.post('/auth/phone/login', data: {
      'phone': phone,
      if (nickname != null) 'nickname': nickname,
    });
    
    final authResponse = AuthResponse.fromJson(response.data);
    _api.setToken(authResponse.accessToken);
    return authResponse;
  }
  
  // 刷新 Token
  Future<AuthResponse> refreshToken() async {
    final response = await _api.post('/auth/refresh');
    final authResponse = AuthResponse.fromJson(response.data);
    _api.setToken(authResponse.accessToken);
    return authResponse;
  }
  
  // 获取当前用户信息
  Future<User> getProfile() async {
    final response = await _api.get('/auth/profile');
    return User.fromJson(response.data);
  }
  
  // 登出
  Future<void> logout() async {
    _api.clearToken();
  }
}
