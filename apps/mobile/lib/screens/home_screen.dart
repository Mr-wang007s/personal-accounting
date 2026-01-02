import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:personal_accounting/providers/auth_provider.dart';
import 'package:personal_accounting/providers/records_provider.dart';
import 'package:personal_accounting/providers/ledger_provider.dart';
import 'package:personal_accounting/screens/records_screen.dart';
import 'package:personal_accounting/screens/statistics_screen.dart';
import 'package:personal_accounting/screens/profile_screen.dart';
import 'package:personal_accounting/screens/add_record_screen.dart';
import 'package:personal_accounting/theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  
  final List<Widget> _pages = const [
    RecordsScreen(),
    StatisticsScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _initializeData();
  }

  Future<void> _initializeData() async {
    final ledgerProvider = context.read<LedgerProvider>();
    final recordsProvider = context.read<RecordsProvider>();
    
    await ledgerProvider.initialize();
    await recordsProvider.loadRecords(refresh: true);
    await recordsProvider.loadStatistics();
  }

  void _onAddRecord() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const AddRecordScreen(),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() {
              _currentIndex = index;
            });
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined),
              activeIcon: Icon(Icons.receipt_long),
              label: '明细',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.pie_chart_outline),
              activeIcon: Icon(Icons.pie_chart),
              label: '统计',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: '我的',
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _onAddRecord,
        backgroundColor: AppColors.primary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}
