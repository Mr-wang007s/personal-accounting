import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:personal_accounting/providers/auth_provider.dart';
import 'package:personal_accounting/providers/records_provider.dart';
import 'package:personal_accounting/providers/ledger_provider.dart';
import 'package:personal_accounting/screens/splash_screen.dart';
import 'package:personal_accounting/theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => LedgerProvider()),
        ChangeNotifierProvider(create: (_) => RecordsProvider()),
      ],
      child: MaterialApp(
        title: '个人记账',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        home: const SplashScreen(),
      ),
    );
  }
}
