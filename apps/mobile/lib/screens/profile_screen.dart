import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:personal_accounting/providers/auth_provider.dart';
import 'package:personal_accounting/providers/ledger_provider.dart';
import 'package:personal_accounting/providers/records_provider.dart';
import 'package:personal_accounting/screens/login_screen.dart';
import 'package:personal_accounting/theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我的'),
      ),
      body: Consumer<AuthProvider>(
        builder: (context, auth, child) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // 用户信息卡片
                _buildUserCard(context, auth),
                
                const SizedBox(height: 24),
                
                // 功能列表
                _buildMenuList(context),
                
                const SizedBox(height: 24),
                
                // 退出登录
                _buildLogoutButton(context),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildUserCard(BuildContext context, AuthProvider auth) {
    final user = auth.user;
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, AppColors.primaryDark],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          // 头像
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: user?.avatar != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image.network(
                      user!.avatar!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Icon(
                        Icons.person,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  )
                : const Icon(
                    Icons.person,
                    color: Colors.white,
                    size: 32,
                  ),
          ),
          const SizedBox(width: 16),
          
          // 用户信息
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user?.nickname ?? '用户',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.phone ?? '',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.8),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          
          // 编辑按钮
          IconButton(
            icon: const Icon(Icons.edit, color: Colors.white),
            onPressed: () {
              // TODO: 编辑个人信息
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMenuList(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          _buildMenuItem(
            context,
            icon: Icons.book_outlined,
            title: '账本管理',
            onTap: () => _showLedgerManagement(context),
          ),
          const Divider(height: 1),
          _buildMenuItem(
            context,
            icon: Icons.cloud_upload_outlined,
            title: '备份数据',
            onTap: () => _backupData(context),
          ),
          const Divider(height: 1),
          _buildMenuItem(
            context,
            icon: Icons.cloud_download_outlined,
            title: '恢复数据',
            onTap: () => _restoreData(context),
          ),
          const Divider(height: 1),
          _buildMenuItem(
            context,
            icon: Icons.settings_outlined,
            title: '设置',
            onTap: () {
              // TODO: 设置页面
            },
          ),
          const Divider(height: 1),
          _buildMenuItem(
            context,
            icon: Icons.info_outline,
            title: '关于',
            onTap: () => _showAbout(context),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(icon, size: 22, color: Colors.grey[700]),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(fontSize: 15),
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey[400]),
          ],
        ),
      ),
    );
  }

  Widget _buildLogoutButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: () => _logout(context),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.expense,
          side: const BorderSide(color: AppColors.expense),
          padding: const EdgeInsets.symmetric(vertical: 14),
        ),
        child: const Text('退出登录'),
      ),
    );
  }

  void _showLedgerManagement(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => const LedgerManagementSheet(),
    );
  }

  Future<void> _backupData(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('备份数据'),
        content: const Text('将本地数据备份到云端，已存在的数据会被更新。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('备份'),
          ),
        ],
      ),
    );
    
    if (confirmed == true && context.mounted) {
      try {
        await context.read<LedgerProvider>().backupToCloud();
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('备份成功')),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('备份失败: $e')),
          );
        }
      }
    }
  }

  Future<void> _restoreData(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('恢复数据'),
        content: const Text('从云端恢复数据，本地数据将被覆盖。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('恢复'),
          ),
        ],
      ),
    );
    
    if (confirmed == true && context.mounted) {
      try {
        await context.read<LedgerProvider>().restoreFromCloud();
        if (context.mounted) {
          // 刷新记录
          await context.read<RecordsProvider>().loadRecords(refresh: true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('恢复成功')),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('恢复失败: $e')),
          );
        }
      }
    }
  }

  void _showAbout(BuildContext context) {
    showAboutDialog(
      context: context,
      applicationName: '个人记账',
      applicationVersion: '1.0.0',
      applicationIcon: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppColors.primary, AppColors.primaryDark],
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(
          Icons.account_balance_wallet,
          color: Colors.white,
          size: 24,
        ),
      ),
      children: [
        const Text('一款简洁的个人记账应用'),
      ],
    );
  }

  Future<void> _logout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('退出登录'),
        content: const Text('确定要退出登录吗？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.expense),
            child: const Text('退出'),
          ),
        ],
      ),
    );
    
    if (confirmed == true && context.mounted) {
      await context.read<AuthProvider>().logout();
      context.read<RecordsProvider>().clear();
      
      if (context.mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }
}

class LedgerManagementSheet extends StatelessWidget {
  const LedgerManagementSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<LedgerProvider>(
      builder: (context, provider, child) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '账本管理',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.add),
                    onPressed: () => _addLedger(context),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              ...provider.ledgers.map((ledger) {
                final isSelected = provider.currentLedger?.id == ledger.id;
                return ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.book,
                      color: AppColors.primary,
                    ),
                  ),
                  title: Text(ledger.name),
                  trailing: isSelected
                      ? const Icon(Icons.check, color: AppColors.primary)
                      : null,
                  onTap: () {
                    provider.setCurrentLedger(ledger);
                    Navigator.pop(context);
                  },
                );
              }),
              
              SizedBox(height: MediaQuery.of(context).padding.bottom),
            ],
          ),
        );
      },
    );
  }

  Future<void> _addLedger(BuildContext context) async {
    final nameController = TextEditingController();
    
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('新建账本'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            hintText: '账本名称',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, nameController.text),
            child: const Text('创建'),
          ),
        ],
      ),
    );
    
    if (name != null && name.isNotEmpty && context.mounted) {
      await context.read<LedgerProvider>().createLedger(name: name);
    }
  }
}
