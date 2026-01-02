import 'package:dio/dio.dart';
import 'package:personal_accounting/services/storage_service.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  
  late Dio _dio;
  String? _accessToken;
  
  // 配置 API 地址
  static const String baseUrl = 'http://localhost:3000/api';
  
  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ));
    
    // 请求拦截器
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_accessToken != null) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Token 过期，清除登录状态
          clearToken();
        }
        return handler.next(error);
      },
    ));
  }
  
  void setToken(String token) {
    _accessToken = token;
    StorageService().saveToken(token);
  }
  
  void clearToken() {
    _accessToken = null;
    StorageService().clearToken();
  }
  
  Future<void> loadToken() async {
    _accessToken = await StorageService().getToken();
  }
  
  bool get isLoggedIn => _accessToken != null;
  
  // 设置服务器地址
  void setBaseUrl(String url) {
    _dio.options.baseUrl = url;
  }
  
  // GET 请求
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }
  
  // POST 请求
  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }
  
  // PUT 请求
  Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }
  
  // DELETE 请求
  Future<Response> delete(String path, {dynamic data}) {
    return _dio.delete(path, data: data);
  }
}
