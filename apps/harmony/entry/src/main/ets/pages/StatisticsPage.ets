/**
 * 统计分析页（独立页面，用于路由）
 */
import { RecordsViewModel, LedgerViewModel } from '../viewmodels'
import { RecordType, CategoryBreakdown, getCategoryById, CHART_COLORS } from '../models'
import { AppColors, AppSizes, formatCurrency } from '../common/Constants'

@Entry
@Component
struct StatisticsPage {
  @State recordsVM: RecordsViewModel = new RecordsViewModel()
  @State ledgerVM: LedgerViewModel = new LedgerViewModel()
  @State currentType: RecordType = 'expense'

  aboutToAppear(): void {
    this.initData()
  }

  async initData(): Promise<void> {
    await this.ledgerVM.initialize(getContext(this))
    if (this.ledgerVM.currentLedger) {
      this.recordsVM.setLedgerId(this.ledgerVM.currentLedger.id)
      await this.recordsVM.loadStatistics()
      await this.recordsVM.loadCategoryStats(this.currentType)
      await this.recordsVM.loadMonthlyTrend()
    }
  }

  async switchType(type: RecordType): Promise<void> {
    this.currentType = type
    await this.recordsVM.loadCategoryStats(type)
  }

  build() {
    Scroll() {
      Column() {
        // 标题
        Text('统计分析')
          .fontSize(AppSizes.FONT_XL)
          .fontWeight(FontWeight.Bold)
          .fontColor(AppColors.TEXT_PRIMARY)
          .width('100%')
          .padding({ left: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })

        // 月份和类型切换
        Row() {
          Text(this.recordsVM.currentMonthDisplay)
            .fontSize(AppSizes.FONT_MD)
            .fontColor(AppColors.TEXT_PRIMARY)

          Blank()

          Row() {
            this.TypeButton('支出', 'expense')
            this.TypeButton('收入', 'income')
          }
          .backgroundColor('#F1F5F9')
          .borderRadius(AppSizes.RADIUS_SM)
          .padding(2)
        }
        .width('100%')
        .padding({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })

        // 总额卡片
        Column() {
          Text(this.currentType === 'expense' ? '总支出' : '总收入')
            .fontSize(AppSizes.FONT_SM)
            .fontColor(AppColors.TEXT_SECONDARY)

          Text(formatCurrency(this.currentType === 'expense'
            ? this.recordsVM.statistics.totalExpense
            : this.recordsVM.statistics.totalIncome))
            .fontSize(AppSizes.FONT_2XL)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.currentType === 'expense' ? AppColors.DANGER : AppColors.SUCCESS)
            .margin({ top: 8 })
        }
        .width('100%')
        .padding(AppSizes.PADDING_LG)
        .margin({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })
        .backgroundColor(AppColors.CARD_BACKGROUND)
        .borderRadius(AppSizes.RADIUS_MD)

        // 分类统计
        Column() {
          Text('分类统计')
            .fontSize(AppSizes.FONT_MD)
            .fontWeight(FontWeight.Bold)
            .fontColor(AppColors.TEXT_PRIMARY)
            .width('100%')

          if (this.recordsVM.categoryStats.length === 0) {
            Text('暂无数据')
              .fontSize(AppSizes.FONT_MD)
              .fontColor(AppColors.TEXT_SECONDARY)
              .margin({ top: 32, bottom: 32 })
          } else {
            ForEach(this.recordsVM.categoryStats, (item: CategoryBreakdown, index: number) => {
              this.CategoryStatItem(item, index)
            })
          }
        }
        .width('100%')
        .padding(AppSizes.PADDING_MD)
        .margin({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD, top: AppSizes.PADDING_MD })
        .backgroundColor(AppColors.CARD_BACKGROUND)
        .borderRadius(AppSizes.RADIUS_MD)
        .alignItems(HorizontalAlign.Start)
      }
      .width('100%')
      .padding({ bottom: 100 })
    }
    .width('100%')
    .height('100%')
    .backgroundColor(AppColors.BACKGROUND)
  }

  @Builder
  TypeButton(label: string, type: RecordType) {
    Text(label)
      .fontSize(AppSizes.FONT_SM)
      .fontColor(this.currentType === type ? Color.White : AppColors.TEXT_SECONDARY)
      .padding({ left: 16, right: 16, top: 6, bottom: 6 })
      .backgroundColor(this.currentType === type ? AppColors.PRIMARY : Color.Transparent)
      .borderRadius(AppSizes.RADIUS_SM)
      .onClick(() => this.switchType(type))
  }

  @Builder
  CategoryStatItem(item: CategoryBreakdown, index: number) {
    const category = getCategoryById(item.category)
    const color = CHART_COLORS[index % CHART_COLORS.length]

    Column() {
      Row() {
        // 分类名称
        Row() {
          Circle()
            .width(8)
            .height(8)
            .fill(color)

          Text(category?.name || item.category)
            .fontSize(AppSizes.FONT_MD)
            .fontColor(AppColors.TEXT_PRIMARY)
            .margin({ left: 8 })
        }

        Blank()

        // 金额和占比
        Column() {
          Text(formatCurrency(item.amount))
            .fontSize(AppSizes.FONT_MD)
            .fontColor(AppColors.TEXT_PRIMARY)

          Text(`${item.percentage.toFixed(1)}%`)
            .fontSize(AppSizes.FONT_XS)
            .fontColor(AppColors.TEXT_SECONDARY)
        }
        .alignItems(HorizontalAlign.End)
      }
      .width('100%')

      // 进度条
      Progress({ value: item.percentage, total: 100, type: ProgressType.Linear })
        .width('100%')
        .height(6)
        .color(color)
        .backgroundColor('#F1F5F9')
        .margin({ top: 8 })
    }
    .width('100%')
    .padding({ top: 12, bottom: 12 })
  }
}
