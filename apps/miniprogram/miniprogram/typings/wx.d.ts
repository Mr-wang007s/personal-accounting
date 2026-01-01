/**
 * 微信小程序基本类型声明
 * 用于 IDE 类型提示，实际类型由微信开发者工具提供
 */

declare const wx: WechatMiniprogram.Wx
declare const console: Console

declare namespace WechatMiniprogram {
  // wx.login 相关
  interface LoginOption {
    timeout?: number
    success?: (res: LoginSuccessCallbackResult) => void
    fail?: (res: GeneralCallbackResult) => void
    complete?: () => void
  }

  interface LoginSuccessCallbackResult {
    code: string
    errMsg: string
  }

  // wx.checkSession 相关
  interface CheckSessionOption {
    success?: () => void
    fail?: () => void
    complete?: () => void
  }

  interface Wx {
    getStorageSync<T = any>(key: string): T
    setStorageSync(key: string, data: any): void
    removeStorageSync(key: string): void
    request(options: RequestOption): void
    showToast(options: ShowToastOption): void
    showModal(options: ShowModalOption): void
    setClipboardData(options: SetClipboardDataOption): void
    showLoading(options: ShowLoadingOption): void
    hideLoading(): void
    redirectTo(options: NavigateOption): void
    reLaunch(options: NavigateOption): void
    navigateTo(options: NavigateOption): void
    navigateBack(options?: NavigateBackOption): void
    cloud: Cloud
    // 用户信息
    getUserProfile(options: GetUserProfileOption): void
    // 登录
    login(options: LoginOption): void
    checkSession(options: CheckSessionOption): void
  }

  // 云开发相关类型
  interface Cloud {
    init(options?: CloudInitOptions): void
    callContainer<T = any>(options: CallContainerOptions): void
    callFunction<T = any>(options: CallFunctionOptions): void
  }

  interface CloudInitOptions {
    env?: string
    traceUser?: boolean
  }

  interface CallContainerOptions {
    config?: {
      env: string
    }
    path: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD'
    header?: Record<string, string>
    data?: string | object | ArrayBuffer
    timeout?: number
    success?: (res: CallContainerSuccessResult) => void
    fail?: (res: CallContainerFailResult) => void
    complete?: () => void
  }

  interface CallContainerSuccessResult {
    data: any
    statusCode: number
    header: Record<string, string>
    callID: string
  }

  interface CallContainerFailResult {
    errMsg?: string
    errCode?: number
  }

  interface CallFunctionOptions {
    name: string
    data?: object
    success?: (res: CallFunctionSuccessResult) => void
    fail?: (res: GeneralCallbackResult) => void
    complete?: () => void
  }

  interface CallFunctionSuccessResult {
    result: any
    errMsg: string
  }

  interface ShowLoadingOption {
    title: string
    mask?: boolean
    success?: () => void
    fail?: () => void
    complete?: () => void
  }

  interface NavigateOption {
    url: string
    success?: () => void
    fail?: () => void
    complete?: () => void
  }

  interface NavigateBackOption {
    delta?: number
    success?: () => void
    fail?: () => void
    complete?: () => void
  }

  interface RequestOption {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'CONNECT'
    data?: string | object | ArrayBuffer
    header?: Record<string, string>
    timeout?: number
    success?: (res: RequestSuccessCallbackResult) => void
    fail?: (res: GeneralCallbackResult) => void
    complete?: (res: GeneralCallbackResult) => void
  }

  interface RequestSuccessCallbackResult {
    data: string | object | ArrayBuffer
    statusCode: number
    header: Record<string, string>
  }

  interface GeneralCallbackResult {
    errMsg: string
  }

  interface ShowToastOption {
    title: string
    icon?: 'success' | 'error' | 'loading' | 'none'
    duration?: number
    mask?: boolean
    success?: () => void
    fail?: () => void
    complete?: () => void
  }

  interface ShowModalOption {
    title?: string
    content?: string
    showCancel?: boolean
    cancelText?: string
    cancelColor?: string
    confirmText?: string
    confirmColor?: string
    success?: (res: ShowModalSuccessCallbackResult) => void
    fail?: () => void
    complete?: () => void
  }

  interface ShowModalSuccessCallbackResult {
    confirm: boolean
    cancel: boolean
  }

  interface SetClipboardDataOption {
    data: string
    success?: () => void
    fail?: () => void
    complete?: () => void
  }

  // 用户信息相关
  interface UserInfo {
    nickName: string
    avatarUrl: string
    gender: number
    country: string
    province: string
    city: string
    language: string
  }

  interface GetUserProfileOption {
    desc: string
    success?: (res: GetUserProfileSuccessCallbackResult) => void
    fail?: (res: GeneralCallbackResult) => void
    complete?: () => void
  }

  interface GetUserProfileSuccessCallbackResult {
    userInfo: UserInfo
    rawData: string
    signature: string
    encryptedData: string
    iv: string
  }

  // 选择头像事件
  interface ChooseAvatarEvent {
    detail: {
      avatarUrl: string
    }
  }
}
