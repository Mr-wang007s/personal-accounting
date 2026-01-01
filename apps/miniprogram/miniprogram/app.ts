/**
 * 小程序入口文件
 * 负责应用初始化、数据加载、云端同步
 */
import { StorageService } from './services/storage';
import { LedgerService } from './services/ledger';
import { apiClient, CloudLedger, CloudRecord } from './services/apiClient';
import { syncService } from './services/sync';
import type { Ledger, Record, UserProfile } from './shared/types';

const LOG_TAG = '[App]';

/**
 * 云端账本转换为本地账本格式
 */
function transformCloudLedger(cloudLedger: CloudLedger): Ledger {
  return {
    id: cloudLedger.clientId,
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
    id: cloudRecord.clientId,
    type: cloudRecord.type,
    amount: cloudRecord.amount,
    category: cloudRecord.category,
    date: cloudRecord.date,
    note: cloudRecord.note,
    createdAt: cloudRecord.createdAt,
    updatedAt: cloudRecord.updatedAt,
    ledgerId: cloudRecord.ledgerId,
    syncStatus: 'synced' as const,
    serverId: cloudRecord.serverId,
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
   * 优先使用本地数据，无本地数据时尝试从云端恢复
   */
  async initializeApp() {
    try {
      const userProfile = StorageService.getUserProfile();
      const ledgers = StorageService.getLedgers();

      if (userProfile && ledgers.length > 0) {
        this.initFromLocalData(userProfile, ledgers);
        this.handleAutoLogin(userProfile);
      } else {
        await this.tryRestoreFromCloud();
      }
    } catch (error) {
      console.error(`${LOG_TAG} 初始化失败:`, error);
    }
  },

  /**
   * 从本地存储初始化数据
   */
  initFromLocalData(userProfile: UserProfile, ledgers: Ledger[]) {
    const currentLedger = ledgers.find(l => l.id === userProfile.currentLedgerId) || ledgers[0];

    this.globalData.userProfile = userProfile;
    this.globalData.ledgers = ledgers;
    this.globalData.currentLedger = currentLedger;
    this.globalData.records = StorageService.getRecords();
    this.globalData.isInitialized = true;
  },

  /**
   * 处理自动登录逻辑
   */
  handleAutoLogin(userProfile: UserProfile) {
    const hasToken = !!apiClient.getToken();

    if (hasToken) {
      this.globalData.isLoggedIn = true;
      return;
    }

    this.tryAutoLogin(userProfile.nickname, userProfile.avatar);
  },

  /**
   * 尝试从云端恢复数据（首次打开或清除缓存后）
   */
  async tryRestoreFromCloud() {
    try {
      const loginResult = await syncService.autoLogin();

      if (!loginResult.success) {
        console.log(`${LOG_TAG} 云端登录失败，需要引导`);
        return;
      }

      this.globalData.isLoggedIn = true;
      console.log(`${LOG_TAG} 云端登录成功，尝试恢复数据`);

      const restoreResult = await apiClient.restore();
      const cloudLedgers = restoreResult.ledgers || [];
      const cloudRecords = restoreResult.records || [];

      if (cloudLedgers.length === 0) {
        console.log(`${LOG_TAG} 云端无账本数据，需要引导`);
        return;
      }

      this.restoreCloudData(cloudLedgers, cloudRecords, loginResult.user);
    } catch (error) {
      console.error(`${LOG_TAG} 从云端恢复数据失败:`, error);
    }
  },

  /**
   * 将云端数据恢复到本地
   */
  restoreCloudData(
    cloudLedgers: CloudLedger[],
    cloudRecords: CloudRecord[],
    user?: { nickname?: string; avatar?: string }
  ) {
    const ledgers = cloudLedgers.map(transformCloudLedger);
    const records = cloudRecords.map(transformCloudRecord);
    const userProfile = createUserProfile(
      user?.nickname || '',
      user?.avatar || '',
      ledgers[0].id
    );

    // 持久化到本地存储
    StorageService.saveUserProfile(userProfile);
    StorageService.saveLedgers(ledgers);
    StorageService.saveRecords(records);

    // 更新全局状态
    this.globalData.userProfile = userProfile;
    this.globalData.ledgers = ledgers;
    this.globalData.currentLedger = ledgers[0];
    this.globalData.records = records;
    this.globalData.isInitialized = true;

    console.log(`${LOG_TAG} 从云端恢复数据成功，账本: ${ledgers.length}，记录: ${records.length}`);
  },

  /**
   * 尝试自动登录（云托管模式）
   */
  async tryAutoLogin(nickname?: string, avatar?: string) {
    try {
      const result = await syncService.autoLogin(nickname, avatar);

      if (!result.success) {
        return;
      }

      this.globalData.isLoggedIn = true;
      console.log(`${LOG_TAG} 自动登录成功`);

      // 登录成功后自动同步
      if (syncService.isAutoSyncEnabled()) {
        syncService.sync();
      }
    } catch (error) {
      console.error(`${LOG_TAG} 自动登录失败:`, error);
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
   * 刷新全局数据（从本地存储重新加载）
   */
  refreshData() {
    const userProfile = StorageService.getUserProfile();
    const records = StorageService.getRecords();
    const ledgers = StorageService.getLedgers();

    this.globalData.userProfile = userProfile;
    this.globalData.records = records;
    this.globalData.ledgers = ledgers;

    if (userProfile) {
      this.globalData.currentLedger = ledgers.find(l => l.id === userProfile.currentLedgerId) || ledgers[0];
    }
  },
});
