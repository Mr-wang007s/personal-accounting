/**
 * 小程序入口文件
 * 负责应用初始化、数据加载
 * 重构：移除本地存储，所有数据从云端加载
 */
import { LedgerService } from './services/ledger';
import { apiClient, CloudLedger, CloudRecord } from './services/apiClient';
import { authService } from './services/auth';
import type { Ledger, Record, UserProfile } from './shared/types';

const LOG_TAG = '[App]';

/**
 * 云端账本转换为本地账本格式
 */
function transformCloudLedger(cloudLedger: CloudLedger): Ledger {
  return {
    id: cloudLedger.id,
    name: cloudLedger.name,
    icon: cloudLedger.icon,
    color: cloudLedger.color,
    createdAt: cloudLedger.createdAt,
    updatedAt: cloudLedger.updatedAt,
  };
}

/**
 * 云端记录转换为本地记录格式
 */
function transformCloudRecord(cloudRecord: CloudRecord): Record {
  return {
    id: cloudRecord.id,
    type: cloudRecord.type,
    amount: cloudRecord.amount,
    category: cloudRecord.category,
    date: cloudRecord.date,
    note: cloudRecord.note,
    createdAt: cloudRecord.createdAt,
    updatedAt: cloudRecord.updatedAt,
    ledgerId: cloudRecord.ledgerId,
    syncStatus: 'synced' as const,
  };
}

/**
 * 创建默认用户配置
 */
function createUserProfile(nickname: string, avatar: string, currentLedgerId: string): UserProfile {
  const now = new Date().toISOString();
  return {
    id: `user_${Date.now()}`,
    nickname: nickname || '用户',
    avatar: avatar || '',
    currentLedgerId,
    createdAt: now,
    updatedAt: now,
  };
}

App<IAppOption>({
  globalData: {
    userProfile: null,
    currentLedger: null,
    ledgers: [],
    records: [],
    isInitialized: false,
    isLoggedIn: false,
  },

  initPromise: null as Promise<void> | null,

  onLaunch() {
    this.initPromise = this.initializeApp();
  },

  /**
   * 应用初始化入口
   * 尝试自动登录并从云端加载数据
   */
  async initializeApp() {
    try {
      // 尝试自动登录
      const loginResult = await authService.autoLogin();

      if (!loginResult.success) {
        console.log(`${LOG_TAG} 云端登录失败，需要引导`);
        return;
      }

      this.globalData.isLoggedIn = true;
      console.log(`${LOG_TAG} 云端登录成功，加载数据`);

      // 从云端加载所有数据
      await this.loadDataFromCloud(loginResult.user);
    } catch (error) {
      console.error(`${LOG_TAG} 初始化失败:`, error);
    }
  },

  /**
   * 从云端加载数据
   */
  async loadDataFromCloud(user?: { nickname?: string; avatar?: string }) {
    try {
      const restoreResult = await apiClient.getAllData();
      const cloudLedgers = restoreResult.ledgers || [];
      const cloudRecords = restoreResult.records || [];

      if (cloudLedgers.length === 0) {
        console.log(`${LOG_TAG} 云端无账本数据，需要引导`);
        return;
      }

      // 转换数据格式
      const ledgers = cloudLedgers.map(transformCloudLedger);
      const records = cloudRecords.map(transformCloudRecord);
      
      // 创建用户配置
      const userProfile = createUserProfile(
        user?.nickname || '',
        user?.avatar || '',
        ledgers[0].id
      );

      // 更新全局状态
      this.globalData.userProfile = userProfile;
      this.globalData.ledgers = ledgers;
      this.globalData.currentLedger = ledgers[0];
      this.globalData.records = records;
      this.globalData.isInitialized = true;

      console.log(`${LOG_TAG} 从云端加载数据成功，账本: ${ledgers.length}，记录: ${records.length}`);
    } catch (error) {
      console.error(`${LOG_TAG} 从云端加载数据失败:`, error);
    }
  },

  /**
   * 完成引导后初始化用户数据
   */
  async completeOnboarding(nickname: string, ledgerName: string, serverUrl?: string) {
    const result = await LedgerService.initializeUser(nickname, ledgerName, serverUrl);

    this.globalData.userProfile = result.userProfile;
    this.globalData.ledgers = [result.ledger];
    this.globalData.currentLedger = result.ledger;
    this.globalData.records = [];
    this.globalData.isInitialized = true;
    this.globalData.isLoggedIn = result.registered;

    return result;
  },

  /**
   * 刷新全局数据（从云端重新加载）
   */
  async refreshData() {
    try {
      const restoreResult = await apiClient.getAllData();
      const cloudLedgers = restoreResult.ledgers || [];
      const cloudRecords = restoreResult.records || [];

      // 转换数据格式
      const ledgers = cloudLedgers.map(transformCloudLedger);
      const records = cloudRecords.map(transformCloudRecord);

      // 更新全局状态
      this.globalData.ledgers = ledgers;
      this.globalData.records = records;

      // 更新当前账本
      if (this.globalData.userProfile) {
        const currentLedgerId = this.globalData.userProfile.currentLedgerId;
        this.globalData.currentLedger = ledgers.find(l => l.id === currentLedgerId) || ledgers[0];
      }

      console.log(`${LOG_TAG} 刷新数据成功，账本: ${ledgers.length}，记录: ${records.length}`);
    } catch (error) {
      console.error(`${LOG_TAG} 刷新数据失败:`, error);
    }
  },
});
