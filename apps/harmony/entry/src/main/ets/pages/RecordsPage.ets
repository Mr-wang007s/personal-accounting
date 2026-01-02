/**
 * 记录列表页（独立页面，用于路由）
 */
import { RecordsViewModel, LedgerViewModel } from '../viewmodels'
import { AppColors, AppSizes } from '../common/Constants'

@Entry
@Component
struct RecordsPage {
  @State recordsVM: RecordsViewModel = new RecordsViewModel()
  @State ledgerVM: LedgerViewModel = new LedgerViewModel()

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

  build() {
    Column() {
      Text('记录列表')
        .fontSize(AppSizes.FONT_XL)
        .fontWeight(FontWeight.Bold)
        .fontColor(AppColors.TEXT_PRIMARY)
        .padding(AppSizes.PADDING_MD)

      Text(`共 ${this.recordsVM.records.length} 条记录`)
        .fontSize(AppSizes.FONT_MD)
        .fontColor(AppColors.TEXT_SECONDARY)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(AppColors.BACKGROUND)
  }
}
