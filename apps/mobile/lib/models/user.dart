class User {
  final String id;
  final String phone;
  final String? openid;
  final String? nickname;
  final String? avatar;

  User({
    required this.id,
    required this.phone,
    this.openid,
    this.nickname,
    this.avatar,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      phone: json['phone'] as String,
      openid: json['openid'] as String?,
      nickname: json['nickname'] as String?,
      avatar: json['avatar'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'phone': phone,
      'openid': openid,
      'nickname': nickname,
      'avatar': avatar,
    };
  }
}

class AuthResponse {
  final String accessToken;
  final User user;
  final bool isNewUser;

  AuthResponse({
    required this.accessToken,
    required this.user,
    required this.isNewUser,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['accessToken'] as String,
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      isNewUser: json['isNewUser'] as bool? ?? false,
    );
  }
}
