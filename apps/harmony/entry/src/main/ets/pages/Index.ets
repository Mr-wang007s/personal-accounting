/**
 * 主页 - 底部导航容器
 */
import { RecordsViewModel, LedgerViewModel } from '../viewmodels'
import { AppColors, AppSizes } from '../common/Constants'

@Entry
@Component
struct Index {
  @State currentIndex: number = 0
  @State ledgerVM: LedgerViewModel = new LedgerViewModel()
  @State recordsVM: RecordsViewModel = new RecordsViewModel()

  private tabController: TabsController = new TabsController()

  aboutToAppear(): void {
    this.initData()
  }

  async initData(): Promise<void> {
    await this.ledgerVM.initialize(getContext(this))
    if (this.ledgerVM.currentLedger) {
      this.recordsVM.setLedgerId(this.ledgerVM.currentLedger.id)
      await this.recordsVM.loadRecords()
      await this.recordsVM.loadStatistics()
    }
  }

  @Builder
  TabBuilder(title: string, targetIndex: number, selectedIcon: Resource, normalIcon: Resource) {
    Column() {
      Image(this.currentIndex === targetIndex ? selectedIcon : normalIcon)
        .width(24)
        .height(24)
        .fillColor(this.currentIndex === targetIndex ? AppColors.PRIMARY : AppColors.TEXT_SECONDARY)

      Text(title)
        .fontSize(AppSizes.FONT_XS)
        .fontColor(this.currentIndex === targetIndex ? AppColors.PRIMARY : AppColors.TEXT_SECONDARY)
        .margin({ top: 4 })
    }
    .width('100%')
    .height(56)
    .justifyContent(FlexAlign.Center)
    .onClick(() => {
      this.currentIndex = targetIndex
      this.tabController.changeIndex(targetIndex)
    })
  }

  build() {
    Stack({ alignContent: Alignment.Bottom }) {
      Tabs({ barPosition: BarPosition.End, controller: this.tabController }) {
        TabContent() {
          RecordsPage({ recordsVM: this.recordsVM, ledgerVM: this.ledgerVM })
        }
        .tabBar(this.TabBuilder('明细', 0, $r('sys.symbol.doc_text'), $r('sys.symbol.doc_text')))

        TabContent() {
          StatisticsPage({ recordsVM: this.recordsVM })
        }
        .tabBar(this.TabBuilder('统计', 1, $r('sys.symbol.chart_pie'), $r('sys.symbol.chart_pie')))

        TabContent() {
          ProfilePage({ ledgerVM: this.ledgerVM })
        }
        .tabBar(this.TabBuilder('我的', 2, $r('sys.symbol.person'), $r('sys.symbol.person')))
      }
      .scrollable(false)
      .barHeight(56)
      .barBackgroundColor(AppColors.CARD_BACKGROUND)
      .onChange((index: number) => {
        this.currentIndex = index
      })

      // 悬浮记账按钮
      Button() {
        Image($r('sys.symbol.plus'))
          .width(24)
          .height(24)
          .fillColor(Color.White)
      }
      .width(56)
      .height(56)
      .backgroundColor(AppColors.PRIMARY)
      .borderRadius(28)
      .shadow({ radius: 8, color: 'rgba(99, 102, 241, 0.3)', offsetY: 4 })
      .position({ x: '50%', y: '100%' })
      .translate({ x: -28, y: -84 })
      .onClick(() => {
        router.pushUrl({ url: 'pages/RecordFormPage' })
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(AppColors.BACKGROUND)
  }
}

import router from '@ohos.router'

// 记录列表页
@Component
struct RecordsPage {
  @ObjectLink recordsVM: RecordsViewModel
  @ObjectLink ledgerVM: LedgerViewModel

  build() {
    Column() {
      // 顶部栏
      Row() {
        Text(this.ledgerVM.currentLedger?.name || '记账本')
          .fontSize(AppSizes.FONT_LG)
          .fontWeight(FontWeight.Bold)
          .fontColor(AppColors.TEXT_PRIMARY)

        Blank()

        // 月份切换
        Row() {
          Image($r('sys.symbol.chevron_left'))
            .width(20)
            .height(20)
            .fillColor(AppColors.TEXT_SECONDARY)
            .onClick(() => this.recordsVM.previousMonth())

          Text(this.recordsVM.currentMonthDisplay)
            .fontSize(AppSizes.FONT_MD)
            .fontColor(AppColors.TEXT_PRIMARY)
            .margin({ left: 8, right: 8 })

          Image($r('sys.symbol.chevron_right'))
            .width(20)
            .height(20)
            .fillColor(AppColors.TEXT_SECONDARY)
            .onClick(() => this.recordsVM.nextMonth())
        }
      }
      .width('100%')
      .padding({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })

      // 统计卡片
      SummaryCard({ statistics: this.recordsVM.statistics })

      // 记录列表
      if (this.recordsVM.records.length === 0) {
        Column() {
          Image($r('sys.symbol.doc'))
            .width(64)
            .height(64)
            .fillColor(AppColors.TEXT_SECONDARY)
            .opacity(0.5)

          Text('暂无记录')
            .fontSize(AppSizes.FONT_MD)
            .fontColor(AppColors.TEXT_SECONDARY)
            .margin({ top: 16 })

          Text('点击下方按钮开始记账')
            .fontSize(AppSizes.FONT_SM)
            .fontColor(AppColors.TEXT_SECONDARY)
            .margin({ top: 8 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        List() {
          ForEach(Array.from(this.recordsVM.groupedRecords.entries()), (item: [string, object[]]) => {
            ListItemGroup({ header: this.DateHeader(item[0]) }) {
              ForEach(item[1], (record: object) => {
                ListItem() {
                  RecordListItem({ record: record as import('../models').AccountRecord })
                }
              })
            }
          })
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD })
      }
    }
    .width('100%')
    .height('100%')
  }

  @Builder
  DateHeader(date: string) {
    import { formatDate } from '../common/Constants'
    Text(formatDate(date))
      .fontSize(AppSizes.FONT_SM)
      .fontColor(AppColors.TEXT_SECONDARY)
      .padding({ top: 12, bottom: 8 })
  }
}

// 统计卡片组件
@Component
struct SummaryCard {
  @Prop statistics: import('../models').RecordStatistics

  build() {
    import { formatCurrency } from '../common/Constants'
    Row() {
      Column() {
        Text('收入')
          .fontSize(AppSizes.FONT_SM)
          .fontColor(AppColors.TEXT_SECONDARY)
        Text(formatCurrency(this.statistics.totalIncome))
          .fontSize(AppSizes.FONT_LG)
          .fontColor(AppColors.SUCCESS)
          .fontWeight(FontWeight.Bold)
          .margin({ top: 4 })
      }
      .layoutWeight(1)

      Column() {
        Text('支出')
          .fontSize(AppSizes.FONT_SM)
          .fontColor(AppColors.TEXT_SECONDARY)
        Text(formatCurrency(this.statistics.totalExpense))
          .fontSize(AppSizes.FONT_LG)
          .fontColor(AppColors.DANGER)
          .fontWeight(FontWeight.Bold)
          .margin({ top: 4 })
      }
      .layoutWeight(1)

      Column() {
        Text('结余')
          .fontSize(AppSizes.FONT_SM)
          .fontColor(AppColors.TEXT_SECONDARY)
        Text(formatCurrency(this.statistics.balance))
          .fontSize(AppSizes.FONT_LG)
          .fontColor(AppColors.TEXT_PRIMARY)
          .fontWeight(FontWeight.Bold)
          .margin({ top: 4 })
      }
      .layoutWeight(1)
    }
    .width('100%')
    .padding(AppSizes.PADDING_MD)
    .margin({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })
    .backgroundColor(AppColors.CARD_BACKGROUND)
    .borderRadius(AppSizes.RADIUS_MD)
    .shadow({ radius: 4, color: 'rgba(0,0,0,0.05)', offsetY: 2 })
  }
}

// 记录列表项组件
@Component
struct RecordListItem {
  @Prop record: import('../models').AccountRecord

  build() {
    import { formatCurrency } from '../common/Constants'
    import { getCategoryById, CATEGORY_ICONS } from '../models'

    const category = getCategoryById(this.record.category)

    Row() {
      // 分类图标
      Row() {
        SymbolGlyph(CATEGORY_ICONS[this.record.category] || $r('sys.symbol.ellipsis'))
          .fontSize(20)
          .fontColor([category?.color || AppColors.TEXT_SECONDARY])
      }
      .width(40)
      .height(40)
      .backgroundColor(category?.color ? `${category.color}20` : '#F1F5F9')
      .borderRadius(20)
      .justifyContent(FlexAlign.Center)

      // 分类名称和备注
      Column() {
        Text(category?.name || '未知')
          .fontSize(AppSizes.FONT_MD)
          .fontColor(AppColors.TEXT_PRIMARY)

        if (this.record.note) {
          Text(this.record.note)
            .fontSize(AppSizes.FONT_SM)
            .fontColor(AppColors.TEXT_SECONDARY)
            .margin({ top: 2 })
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
      }
      .alignItems(HorizontalAlign.Start)
      .layoutWeight(1)
      .margin({ left: 12 })

      // 金额
      Text((this.record.type === 'expense' ? '-' : '+') + formatCurrency(this.record.amount))
        .fontSize(AppSizes.FONT_MD)
        .fontWeight(FontWeight.Medium)
        .fontColor(this.record.type === 'expense' ? AppColors.DANGER : AppColors.SUCCESS)
    }
    .width('100%')
    .padding({ top: 12, bottom: 12 })
    .onClick(() => {
      router.pushUrl({
        url: 'pages/RecordFormPage',
        params: { record: this.record }
      })
    })
  }
}

// 统计页
@Component
struct StatisticsPage {
  @ObjectLink recordsVM: RecordsViewModel

  build() {
    Column() {
      Text('统计分析')
        .fontSize(AppSizes.FONT_XL)
        .fontWeight(FontWeight.Bold)
        .fontColor(AppColors.TEXT_PRIMARY)
        .padding(AppSizes.PADDING_MD)

      Text('开发中...')
        .fontSize(AppSizes.FONT_MD)
        .fontColor(AppColors.TEXT_SECONDARY)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}

// 个人中心页
@Component
struct ProfilePage {
  @ObjectLink ledgerVM: LedgerViewModel

  build() {
    Column() {
      Text('我的')
        .fontSize(AppSizes.FONT_XL)
        .fontWeight(FontWeight.Bold)
        .fontColor(AppColors.TEXT_PRIMARY)
        .padding(AppSizes.PADDING_MD)

      // 用户信息卡片
      Row() {
        Image($r('sys.symbol.person_circle'))
          .width(56)
          .height(56)
          .fillColor(AppColors.PRIMARY)

        Column() {
          Text(this.ledgerVM.isLoggedIn ? (this.ledgerVM.userProfile?.nickname || '已登录') : '未登录')
            .fontSize(AppSizes.FONT_LG)
            .fontColor(AppColors.TEXT_PRIMARY)

          Text(this.ledgerVM.isLoggedIn ? '已开启云同步' : '登录后可同步数据')
            .fontSize(AppSizes.FONT_SM)
            .fontColor(AppColors.TEXT_SECONDARY)
            .margin({ top: 4 })
        }
        .alignItems(HorizontalAlign.Start)
        .margin({ left: 16 })
      }
      .width('100%')
      .padding(AppSizes.PADDING_MD)
      .margin({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD })
      .backgroundColor(AppColors.CARD_BACKGROUND)
      .borderRadius(AppSizes.RADIUS_MD)

      // 功能列表
      Column() {
        this.MenuItem('账本管理', $r('sys.symbol.book'))
        this.MenuItem('数据同步', $r('sys.symbol.arrow_triangle_2_circlepath'))
        this.MenuItem('关于', $r('sys.symbol.info_circle'))
      }
      .width('100%')
      .margin({ top: AppSizes.PADDING_MD })
      .padding({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD })
      .backgroundColor(AppColors.CARD_BACKGROUND)
      .borderRadius(AppSizes.RADIUS_MD)
    }
    .width('100%')
    .height('100%')
    .alignItems(HorizontalAlign.Start)
  }

  @Builder
  MenuItem(title: string, icon: Resource) {
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
  }
}
