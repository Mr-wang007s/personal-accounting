/**
 * 微信小程序基本类型声明
 * 用于 IDE 类型提示，实际类型由微信开发者工具提供
 */

declare const wx: WechatMiniprogram.Wx
declare const console: Console

declare namespace WechatMiniprogram {
  interface Wx {
    getStorageSync<T = any>(key: string): T
    setStorageSync(key: string, data: any): void
    removeStorageSync(key: string): void
    request(options: RequestOption): void
    showToast(options: ShowToastOption): void
    showModal(options: ShowModalOption): void
    setClipboardData(options: SetClipboardDataOption): void
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
}
