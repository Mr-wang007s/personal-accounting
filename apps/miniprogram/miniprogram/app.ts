/**
 * 小程序入口文件
 * 负责应用初始化、数据加载
 * 
 * 流程：自动登录 → 获取用户信息 → 加载账本 → 加载记录
 * 新用户：后端自动创建默认账本，无需引导页
 * 
 * 所有数据直接来自云端，无本地存储
 */
import { apiClient, CloudLedger, CloudRecord } from './services/apiClient';
import { authService } from './services/auth';
import type { Ledger, Record, UserProfile } from './shared/types';

const LOG_TAG = '[App]';

/**
 * 转换云端账本数据
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
 * 转换云端记录数据
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
  };
}

/**
 * 创建用户配置
 */
function createUserProfile(
  openid: string,
  nickname: string,
  avatar: string,
  currentLedgerId: string
): UserProfile {
  const now = new Date().toISOString();
  return {
    id: openid,
    nickname: nickname || openid.slice(0, 8),
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
   * 自动登录（如果有保存的手机号）→ 加载数据
   * 新用户后端会自动创建默认账本
   */
  async initializeApp() {
    console.log(`${LOG_TAG} 开始初始化...`);
    
    try {
      // 1. 尝试自动登录（使用保存的手机号）
      const loginResult = await authService.autoLogin();

      if (!loginResult.success) {
        // 未登录，需要跳转到登录页
        console.log(`${LOG_TAG} 未保存手机号，需要登录`);
        this.globalData.isInitialized = true;
        return;
      }

      this.globalData.isLoggedIn = true;
      console.log(`${LOG_TAG} 自动登录成功`);

      // 2. 从云端加载所有数据
      await this.loadDataFromCloud(loginResult.user);
      
      console.log(`${LOG_TAG} 初始化完成`);
    } catch (error) {
      console.error(`${LOG_TAG} 初始化失败:`, error);
      this.globalData.isInitialized = true;
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    }
  },

  /**
   * 从云端加载数据
   */
  async loadDataFromCloud(user?: { 
    id?: string;
    openid?: string;
    nickname?: string; 
    avatar?: string 
  }) {
    try {
      console.log(`${LOG_TAG} 从云端加载数据...`);
      
      const restoreResult = await apiClient.getAllData();
      const cloudLedgers = restoreResult.ledgers || [];
      const cloudRecords = restoreResult.records || [];

      console.log(`${LOG_TAG} 获取到 ${cloudLedgers.length} 个账本, ${cloudRecords.length} 条记录`);

      // 转换数据格式
      const ledgers = cloudLedgers.map(transformCloudLedger);
      const records = cloudRecords.map(transformCloudRecord);
      
      // 确定当前账本
      const currentLedger = ledgers.length > 0 ? ledgers[0] : null;
      
      // 创建用户配置
      const userProfile = createUserProfile(
        user?.openid || user?.id || 'unknown',
        user?.nickname || '',
        user?.avatar || '',
        currentLedger?.id || ''
      );

      // 更新全局状态
      this.globalData.userProfile = userProfile;
      this.globalData.ledgers = ledgers;
      this.globalData.currentLedger = currentLedger;
      this.globalData.records = records;
      this.globalData.isInitialized = true;

      console.log(`${LOG_TAG} 数据加载成功`);
    } catch (error) {
      console.error(`${LOG_TAG} 从云端加载数据失败:`, error);
      
      // 即使加载失败，也标记为已初始化，让用户可以重试
      this.globalData.isInitialized = true;
      throw error;
    }
  },

  /**
   * 邮箱登录并加载数据（开发/测试用，无验证码）
   */
  async loginWithPhone(email: string, nickname?: string) {
    console.log(`${LOG_TAG} 邮箱登录（无验证码）...`);
    
    try {
      const loginResult = await authService.phoneLogin(email, nickname);

      if (!loginResult.success) {
        console.error(`${LOG_TAG} 登录失败:`, loginResult.error);
        return { success: false, error: loginResult.error };
      }

      this.globalData.isLoggedIn = true;
      console.log(`${LOG_TAG} 登录成功, isNewUser=${loginResult.isNewUser}`);

      // 从云端加载数据
      await this.loadDataFromCloud(loginResult.user);
      
      return { success: true, isNewUser: loginResult.isNewUser };
    } catch (error) {
      console.error(`${LOG_TAG} 登录失败:`, error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * 邮箱验证码登录并加载数据
   * @param email 邮箱地址
   * @param code 验证码
   * @param nickname 昵称（可选）
   */
  async loginWithEmailCode(email: string, code: string, nickname?: string) {
    console.log(`${LOG_TAG} 邮箱验证码登录...`);
    
    try {
      const loginResult = await authService.emailLogin(email, code, nickname);

      if (!loginResult.success) {
        console.error(`${LOG_TAG} 邮箱验证码登录失败:`, loginResult.error);
        return { success: false, error: loginResult.error };
      }

      this.globalData.isLoggedIn = true;
      console.log(`${LOG_TAG} 邮箱验证码登录成功, isNewUser=${loginResult.isNewUser}`);

      // 从云端加载数据
      await this.loadDataFromCloud(loginResult.user);
      
      return { success: true, isNewUser: loginResult.isNewUser };
    } catch (error) {
      console.error(`${LOG_TAG} 邮箱验证码登录失败:`, error);
      return { success: false, error: (error as Error).message };
    }
  },

  /**
   * 刷新全局数据（从云端重新加载）
   */
  async refreshData() {
    try {
      console.log(`${LOG_TAG} 刷新数据...`);
      
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
      if (this.globalData.userProfile && ledgers.length > 0) {
        const currentLedgerId = this.globalData.userProfile.currentLedgerId;
        this.globalData.currentLedger = ledgers.find(l => l.id === currentLedgerId) || ledgers[0];
        
        // 同步更新 userProfile 的 currentLedgerId
        if (this.globalData.currentLedger) {
          this.globalData.userProfile.currentLedgerId = this.globalData.currentLedger.id;
        }
      }

      console.log(`${LOG_TAG} 刷新数据成功，账本: ${ledgers.length}，记录: ${records.length}`);
    } catch (error) {
      console.error(`${LOG_TAG} 刷新数据失败:`, error);
      throw error;
    }
  },

  /**
   * 更新用户信息（昵称、头像）
   */
  async updateUserProfile(nickname?: string, avatar?: string) {
    if (!this.globalData.userProfile) return;
    
    try {
      // 更新内存状态
      if (nickname) {
        this.globalData.userProfile.nickname = nickname;
      }
      if (avatar) {
        this.globalData.userProfile.avatar = avatar;
      }
      this.globalData.userProfile.updatedAt = new Date().toISOString();
      
      console.log(`${LOG_TAG} 用户信息更新成功`);
    } catch (error) {
      console.error(`${LOG_TAG} 更新用户信息失败:`, error);
      throw error;
    }
  },
});
