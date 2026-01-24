/**
 * 登录页面 - 手机号登录
 */
import router from '@ohos.router'
import { AppColors, AppSizes } from '../common/Constants'
import { apiService } from '../services'
import { storageService } from '../services/StorageService'

@Entry
@Component
struct LoginPage {
  @State phone: string = ''
  @State isLoading: boolean = false
  @State errorMsg: string = ''
  @State showServerSettings: boolean = false
  @State serverUrl: string = 'https://pa-api-213254-5-1253552496.sh.run.tcloudbase.com/api'

  aboutToAppear(): void {
    // 加载保存的服务器地址
    this.loadServerUrl()
  }

  async loadServerUrl(): Promise<void> {
    const savedUrl = await storageService.getServerUrl()
    if (savedUrl) {
      this.serverUrl = savedUrl
    }
  }

  async handleLogin(): Promise<void> {
    // 验证手机号
    if (!this.phone || !/^1[3-9]\d{9}$/.test(this.phone)) {
      this.errorMsg = '请输入正确的手机号'
      return
    }

    this.isLoading = true
    this.errorMsg = ''

    try {
      // 设置服务器地址
      apiService.setBaseUrl(this.serverUrl)
      await storageService.saveServerUrl(this.serverUrl)

      // 调用登录接口
      const result = await apiService.phoneLogin(this.phone)
      
      // 保存 token
      apiService.setToken(result.accessToken)
      await storageService.saveToken(result.accessToken)
      await storageService.savePhone(this.phone)

      // 跳转到主页
      router.replaceUrl({ url: 'pages/Index' })
    } catch (error) {
      this.errorMsg = (error as Error).message || '登录失败，请重试'
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Column() {
      // 渐变背景
      Stack() {
        // 背景
        Column()
          .width('100%')
          .height('100%')
          .linearGradient({
            angle: 135,
            colors: [
              [0xFF6366F1, 0],
              [0xFF8B5CF6, 0.5],
              [0xFFEC4899, 1]
            ]
          })

        // 内容
        Column() {
          // Logo
          Column() {
            SymbolGlyph($r('sys.symbol.wallet_pass'))
              .fontSize(48)
              .fontColor([Color.White])
          }
          .width(80)
          .height(80)
          .backgroundColor('rgba(255, 255, 255, 0.2)')
          .borderRadius(20)
          .justifyContent(FlexAlign.Center)

          // 标题
          Text('个人记账')
            .fontSize(32)
            .fontWeight(FontWeight.Bold)
            .fontColor(Color.White)
            .margin({ top: 24 })

          Text('简单记录，轻松理财')
            .fontSize(16)
            .fontColor('rgba(255, 255, 255, 0.8)')
            .margin({ top: 8 })

          // 登录卡片
          Column() {
            Text('手机号登录')
              .fontSize(20)
              .fontWeight(FontWeight.Medium)
              .fontColor('#1F2937')
              .margin({ bottom: 32 })

            // 手机号标签
            Text('手机号')
              .fontSize(14)
              .fontWeight(FontWeight.Medium)
              .fontColor('#374151')
              .alignSelf(ItemAlign.Start)
              .margin({ bottom: 8 })

            // 手机号输入
            Row() {
              SymbolGlyph($r('sys.symbol.phone'))
                .fontSize(20)
                .fontColor(['#9CA3AF'])
                .margin({ right: 12 })

              TextInput({ placeholder: '请输入手机号', text: this.phone })
                .type(InputType.PhoneNumber)
                .maxLength(11)
                .layoutWeight(1)
                .backgroundColor(Color.Transparent)
                .onChange((value: string) => {
                  this.phone = value
                  this.errorMsg = ''
                })
            }
            .width('100%')
            .height(48)
            .padding({ left: 16, right: 16 })
            .backgroundColor('#F9FAFB')
            .border({ width: 1, color: '#E5E7EB', radius: 12 })

            // 错误提示
            if (this.errorMsg) {
              Row() {
                Text(this.errorMsg)
                  .fontSize(14)
                  .fontColor('#DC2626')
              }
              .width('100%')
              .padding(12)
              .margin({ top: 16 })
              .backgroundColor('#FEF2F2')
              .borderRadius(8)
            }

            // 服务器设置
            Row() {
              SymbolGlyph(this.showServerSettings ? $r('sys.symbol.chevron_up') : $r('sys.symbol.chevron_down'))
                .fontSize(16)
                .fontColor(['#6B7280'])

              Text('服务器设置')
                .fontSize(14)
                .fontColor('#6B7280')
                .margin({ left: 4 })
            }
            .margin({ top: 16 })
            .onClick(() => {
              this.showServerSettings = !this.showServerSettings
            })

            if (this.showServerSettings) {
              TextInput({ placeholder: '服务器地址', text: this.serverUrl })
                .width('100%')
                .height(48)
                .margin({ top: 12 })
                .padding({ left: 16, right: 16 })
                .backgroundColor('#F9FAFB')
                .border({ width: 1, color: '#E5E7EB', radius: 12 })
                .onChange((value: string) => {
                  this.serverUrl = value
                })
            }

            // 登录按钮
            Button(this.isLoading ? '登录中...' : '开始记账')
              .width('100%')
              .height(48)
              .fontSize(16)
              .fontWeight(FontWeight.Medium)
              .backgroundColor(this.phone.length === 11 ? '#6366F1' : '#C7D2FE')
              .fontColor(Color.White)
              .borderRadius(12)
              .margin({ top: 24 })
              .enabled(!this.isLoading && this.phone.length === 11)
              .onClick(() => this.handleLogin())

            // 提示
            Text('首次登录将自动创建账户')
              .fontSize(14)
              .fontColor('#9CA3AF')
              .margin({ top: 16 })
          }
          .width('100%')
          .padding(32)
          .margin({ top: 48, left: 24, right: 24 })
          .backgroundColor(Color.White)
          .borderRadius(24)
          .shadow({ radius: 20, color: 'rgba(0, 0, 0, 0.1)', offsetY: 10 })

          // 底部信息
          Text('数据安全加密存储')
            .fontSize(12)
            .fontColor('rgba(255, 255, 255, 0.6)')
            .margin({ top: 32 })
        }
        .width('100%')
        .height('100%')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}
