/**
 * 个人中心页（独立页面，用于路由）
 */
import router from '@ohos.router'
import promptAction from '@ohos.promptAction'
import { LedgerViewModel } from '../viewmodels'
import { Ledger } from '../models'
import { AppColors, AppSizes } from '../common/Constants'

@Entry
@Component
struct ProfilePage {
  @State ledgerVM: LedgerViewModel = new LedgerViewModel()
  @State showLedgerDialog: boolean = false
  @State newLedgerName: string = ''

  aboutToAppear(): void {
    this.initData()
  }

  async initData(): Promise<void> {
    await this.ledgerVM.initialize(getContext(this))
  }

  build() {
    Scroll() {
      Column() {
        // 标题
        Text('我的')
          .fontSize(AppSizes.FONT_XL)
          .fontWeight(FontWeight.Bold)
          .fontColor(AppColors.TEXT_PRIMARY)
          .width('100%')
          .padding({ left: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })

        // 用户信息卡片
        Row() {
          Image($r('sys.symbol.person_circle'))
            .width(64)
            .height(64)
            .fillColor(AppColors.PRIMARY)

          Column() {
            Text(this.ledgerVM.isLoggedIn
              ? (this.ledgerVM.userProfile?.nickname || this.ledgerVM.userProfile?.phone || '已登录')
              : '未登录')
              .fontSize(AppSizes.FONT_LG)
              .fontWeight(FontWeight.Bold)
              .fontColor(AppColors.TEXT_PRIMARY)

            Text(this.ledgerVM.isLoggedIn ? '已开启云同步' : '登录后可同步数据到云端')
              .fontSize(AppSizes.FONT_SM)
              .fontColor(AppColors.TEXT_SECONDARY)
              .margin({ top: 4 })
          }
          .alignItems(HorizontalAlign.Start)
          .margin({ left: 16 })
          .layoutWeight(1)

          if (!this.ledgerVM.isLoggedIn) {
            Button('登录')
              .fontSize(AppSizes.FONT_SM)
              .fontColor(Color.White)
              .backgroundColor(AppColors.PRIMARY)
              .borderRadius(AppSizes.RADIUS_SM)
              .height(32)
          }
        }
        .width('100%')
        .padding(AppSizes.PADDING_MD)
        .margin({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })
        .backgroundColor(AppColors.CARD_BACKGROUND)
        .borderRadius(AppSizes.RADIUS_MD)

        // 账本管理
        Column() {
          Row() {
            Text('我的账本')
              .fontSize(AppSizes.FONT_MD)
              .fontWeight(FontWeight.Bold)
              .fontColor(AppColors.TEXT_PRIMARY)

            Blank()

            Text('新建')
              .fontSize(AppSizes.FONT_SM)
              .fontColor(AppColors.PRIMARY)
              .onClick(() => {
                this.showLedgerDialog = true
              })
          }
          .width('100%')

          ForEach(this.ledgerVM.ledgers, (ledger: Ledger) => {
            Row() {
              Image($r('sys.symbol.book'))
                .width(24)
                .height(24)
                .fillColor(AppColors.PRIMARY)

              Text(ledger.name)
                .fontSize(AppSizes.FONT_MD)
                .fontColor(AppColors.TEXT_PRIMARY)
                .margin({ left: 12 })
                .layoutWeight(1)

              if (this.ledgerVM.currentLedger?.id === ledger.id) {
                Image($r('sys.symbol.checkmark'))
                  .width(20)
                  .height(20)
                  .fillColor(AppColors.SUCCESS)
              }
            }
            .width('100%')
            .padding({ top: 16, bottom: 16 })
            .onClick(() => {
              this.ledgerVM.switchLedger(ledger.id)
            })
          })
        }
        .width('100%')
        .padding(AppSizes.PADDING_MD)
        .margin({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })
        .backgroundColor(AppColors.CARD_BACKGROUND)
        .borderRadius(AppSizes.RADIUS_MD)
        .alignItems(HorizontalAlign.Start)

        // 功能列表
        Column() {
          this.MenuItem('数据同步', $r('sys.symbol.arrow_triangle_2_circlepath'), () => {
            promptAction.showToast({ message: '同步功能开发中' })
          })

          Divider().color(AppColors.BORDER)

          this.MenuItem('清除数据', $r('sys.symbol.trash'), () => {
            AlertDialog.show({
              title: '确认清除',
              message: '确定要清除所有本地数据吗？此操作不可恢复。',
              primaryButton: {
                value: '取消',
                action: () => {}
              },
              secondaryButton: {
                value: '清除',
                fontColor: AppColors.DANGER,
                action: async () => {
                  // 清除数据逻辑
                  promptAction.showToast({ message: '数据已清除' })
                }
              }
            })
          })

          Divider().color(AppColors.BORDER)

          this.MenuItem('关于', $r('sys.symbol.info_circle'), () => {
            promptAction.showToast({ message: '个人记账 v1.0.0' })
          })
        }
        .width('100%')
        .padding({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD })
        .margin({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })
        .backgroundColor(AppColors.CARD_BACKGROUND)
        .borderRadius(AppSizes.RADIUS_MD)

        // 退出登录
        if (this.ledgerVM.isLoggedIn) {
          Button('退出登录')
            .width('100%')
            .height(48)
            .fontSize(AppSizes.FONT_MD)
            .fontColor(AppColors.DANGER)
            .backgroundColor(AppColors.CARD_BACKGROUND)
            .borderRadius(AppSizes.RADIUS_MD)
            .margin({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })
            .onClick(() => {
              AlertDialog.show({
                title: '确认退出',
                message: '退出后将无法同步数据，确定退出吗？',
                primaryButton: {
                  value: '取消',
                  action: () => {}
                },
                secondaryButton: {
                  value: '退出',
                  fontColor: AppColors.DANGER,
                  action: async () => {
                    await this.ledgerVM.logout()
                    promptAction.showToast({ message: '已退出登录' })
                  }
                }
              })
            })
        }
      }
      .width('100%')
      .padding({ bottom: 100 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(AppColors.BACKGROUND)
    .bindSheet($$this.showLedgerDialog, this.LedgerDialogBuilder(), {
      height: 200,
      showClose: true,
      title: { title: '新建账本' }
    })
  }

  @Builder
  MenuItem(title: string, icon: Resource, onClick: () => void) {
    Row() {
      SymbolGlyph(icon)
        .fontSize(20)
        .fontColor([AppColors.TEXT_PRIMARY])

      Text(title)
        .fontSize(AppSizes.FONT_MD)
        .fontColor(AppColors.TEXT_PRIMARY)
        .margin({ left: 12 })

      Blank()

      Image($r('sys.symbol.chevron_right'))
        .width(16)
        .height(16)
        .fillColor(AppColors.TEXT_SECONDARY)
    }
    .width('100%')
    .padding({ top: 16, bottom: 16 })
    .onClick(onClick)
  }

  @Builder
  LedgerDialogBuilder() {
    Column() {
      TextInput({ placeholder: '请输入账本名称', text: this.newLedgerName })
        .fontSize(AppSizes.FONT_MD)
        .width('100%')
        .onChange((value: string) => {
          this.newLedgerName = value
        })

      Button('创建')
        .width('100%')
        .height(44)
        .fontSize(AppSizes.FONT_MD)
        .fontColor(Color.White)
        .backgroundColor(AppColors.PRIMARY)
        .borderRadius(AppSizes.RADIUS_MD)
        .margin({ top: 16 })
        .onClick(async () => {
          if (!this.newLedgerName.trim()) {
            promptAction.showToast({ message: '请输入账本名称' })
            return
          }
          await this.ledgerVM.createLedger(this.newLedgerName.trim())
          this.newLedgerName = ''
          this.showLedgerDialog = false
          promptAction.showToast({ message: '创建成功' })
        })
    }
    .width('100%')
    .padding(AppSizes.PADDING_MD)
  }
}
