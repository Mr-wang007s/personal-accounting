/**
 * 记账表单页 - 新增/编辑记录
 */
import router from '@ohos.router'
import { AccountRecord, RecordType, Category, getCategoriesByType, getCategoryById } from '../models'
import { recordService, storageService } from '../services'
import { AppColors, AppSizes, formatCurrency, getTodayDate } from '../common/Constants'

@Entry
@Component
struct RecordFormPage {
  @State recordType: RecordType = 'expense'
  @State amount: string = ''
  @State selectedCategory: string = 'food'
  @State selectedDate: string = getTodayDate()
  @State note: string = ''
  @State isEditing: boolean = false
  @State editingRecord: AccountRecord | null = null
  @State isSubmitting: boolean = false

  private ledgerId: string = ''

  aboutToAppear(): void {
    // 获取路由参数
    const params = router.getParams() as Record<string, Object>
    if (params?.record) {
      const record = params.record as AccountRecord
      this.isEditing = true
      this.editingRecord = record
      this.recordType = record.type
      this.amount = record.amount.toString()
      this.selectedCategory = record.category
      this.selectedDate = record.date
      this.note = record.note || ''
    }

    // 获取当前账本 ID
    this.loadLedgerId()
  }

  async loadLedgerId(): Promise<void> {
    this.ledgerId = await storageService.getCurrentLedgerId() || ''
  }

  async handleSubmit(): Promise<void> {
    if (!this.amount || parseFloat(this.amount) <= 0) {
      promptAction.showToast({ message: '请输入金额' })
      return
    }

    if (!this.ledgerId) {
      promptAction.showToast({ message: '账本未初始化' })
      return
    }

    this.isSubmitting = true
    try {
      if (this.isEditing && this.editingRecord) {
        await recordService.updateRecord(this.editingRecord.id, {
          type: this.recordType,
          amount: parseFloat(this.amount),
          category: this.selectedCategory,
          date: this.selectedDate,
          note: this.note || undefined
        })
        promptAction.showToast({ message: '修改成功' })
      } else {
        await recordService.createRecord({
          type: this.recordType,
          amount: parseFloat(this.amount),
          category: this.selectedCategory,
          date: this.selectedDate,
          note: this.note || undefined,
          ledgerId: this.ledgerId
        })
        promptAction.showToast({ message: '记账成功' })
      }
      router.back()
    } catch (e) {
      promptAction.showToast({ message: '操作失败' })
    } finally {
      this.isSubmitting = false
    }
  }

  async handleDelete(): Promise<void> {
    if (!this.editingRecord) return

    AlertDialog.show({
      title: '确认删除',
      message: '确定要删除这条记录吗？',
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '删除',
        fontColor: AppColors.DANGER,
        action: async () => {
          await recordService.deleteRecord(this.editingRecord!.id)
          promptAction.showToast({ message: '删除成功' })
          router.back()
        }
      }
    })
  }

  build() {
    Column() {
      // 顶部导航栏
      Row() {
        Image($r('sys.symbol.chevron_left'))
          .width(24)
          .height(24)
          .fillColor(AppColors.TEXT_PRIMARY)
          .onClick(() => router.back())

        Text(this.isEditing ? '编辑记录' : '记一笔')
          .fontSize(AppSizes.FONT_LG)
          .fontWeight(FontWeight.Bold)
          .fontColor(AppColors.TEXT_PRIMARY)
          .layoutWeight(1)
          .textAlign(TextAlign.Center)

        if (this.isEditing) {
          Image($r('sys.symbol.trash'))
            .width(24)
            .height(24)
            .fillColor(AppColors.DANGER)
            .onClick(() => this.handleDelete())
        } else {
          Blank().width(24)
        }
      }
      .width('100%')
      .height(56)
      .padding({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD })

      // 类型切换
      Row() {
        this.TypeTab('支出', 'expense')
        this.TypeTab('收入', 'income')
      }
      .width('100%')
      .padding({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD })

      // 金额输入
      Column() {
        Text('金额')
          .fontSize(AppSizes.FONT_SM)
          .fontColor(AppColors.TEXT_SECONDARY)

        Row() {
          Text('¥')
            .fontSize(AppSizes.FONT_3XL)
            .fontColor(this.recordType === 'expense' ? AppColors.DANGER : AppColors.SUCCESS)
            .fontWeight(FontWeight.Bold)

          TextInput({ placeholder: '0.00', text: this.amount })
            .type(InputType.NUMBER_DECIMAL)
            .fontSize(AppSizes.FONT_3XL)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.recordType === 'expense' ? AppColors.DANGER : AppColors.SUCCESS)
            .backgroundColor(Color.Transparent)
            .layoutWeight(1)
            .onChange((value: string) => {
              this.amount = value
            })
        }
        .width('100%')
        .margin({ top: 8 })
      }
      .width('100%')
      .padding(AppSizes.PADDING_MD)
      .margin({ top: AppSizes.PADDING_MD })
      .backgroundColor(AppColors.CARD_BACKGROUND)
      .borderRadius(AppSizes.RADIUS_MD)

      // 分类选择
      Column() {
        Text('分类')
          .fontSize(AppSizes.FONT_SM)
          .fontColor(AppColors.TEXT_SECONDARY)
          .margin({ bottom: 12 })

        Flex({ wrap: FlexWrap.Wrap }) {
          ForEach(getCategoriesByType(this.recordType), (category: Category) => {
            this.CategoryItem(category)
          })
        }
      }
      .width('100%')
      .padding(AppSizes.PADDING_MD)
      .margin({ top: AppSizes.PADDING_MD })
      .backgroundColor(AppColors.CARD_BACKGROUND)
      .borderRadius(AppSizes.RADIUS_MD)
      .alignItems(HorizontalAlign.Start)

      // 日期选择
      Row() {
        Text('日期')
          .fontSize(AppSizes.FONT_MD)
          .fontColor(AppColors.TEXT_PRIMARY)

        Blank()

        Text(this.selectedDate)
          .fontSize(AppSizes.FONT_MD)
          .fontColor(AppColors.TEXT_SECONDARY)

        Image($r('sys.symbol.chevron_right'))
          .width(16)
          .height(16)
          .fillColor(AppColors.TEXT_SECONDARY)
          .margin({ left: 4 })
      }
      .width('100%')
      .padding(AppSizes.PADDING_MD)
      .margin({ top: AppSizes.PADDING_MD })
      .backgroundColor(AppColors.CARD_BACKGROUND)
      .borderRadius(AppSizes.RADIUS_MD)
      .onClick(() => {
        DatePickerDialog.show({
          selected: new Date(this.selectedDate),
          onDateAccept: (value: Date) => {
            const year = value.getFullYear()
            const month = (value.getMonth() + 1).toString().padStart(2, '0')
            const day = value.getDate().toString().padStart(2, '0')
            this.selectedDate = `${year}-${month}-${day}`
          }
        })
      })

      // 备注输入
      Column() {
        Text('备注')
          .fontSize(AppSizes.FONT_SM)
          .fontColor(AppColors.TEXT_SECONDARY)

        TextInput({ placeholder: '添加备注...', text: this.note })
          .fontSize(AppSizes.FONT_MD)
          .backgroundColor(Color.Transparent)
          .margin({ top: 8 })
          .onChange((value: string) => {
            this.note = value
          })
      }
      .width('100%')
      .padding(AppSizes.PADDING_MD)
      .margin({ top: AppSizes.PADDING_MD })
      .backgroundColor(AppColors.CARD_BACKGROUND)
      .borderRadius(AppSizes.RADIUS_MD)
      .alignItems(HorizontalAlign.Start)

      Blank()

      // 提交按钮
      Button(this.isEditing ? '保存修改' : '保存')
        .width('100%')
        .height(48)
        .fontSize(AppSizes.FONT_MD)
        .fontColor(Color.White)
        .backgroundColor(AppColors.PRIMARY)
        .borderRadius(AppSizes.RADIUS_MD)
        .margin({ bottom: AppSizes.PADDING_LG })
        .enabled(!this.isSubmitting)
        .onClick(() => this.handleSubmit())
    }
    .width('100%')
    .height('100%')
    .padding({ left: AppSizes.PADDING_MD, right: AppSizes.PADDING_MD })
    .backgroundColor(AppColors.BACKGROUND)
  }

  @Builder
  TypeTab(label: string, type: RecordType) {
    Column() {
      Text(label)
        .fontSize(AppSizes.FONT_MD)
        .fontColor(this.recordType === type ? AppColors.PRIMARY : AppColors.TEXT_SECONDARY)
        .fontWeight(this.recordType === type ? FontWeight.Bold : FontWeight.Normal)

      Divider()
        .width(40)
        .height(3)
        .backgroundColor(this.recordType === type ? AppColors.PRIMARY : Color.Transparent)
        .borderRadius(2)
        .margin({ top: 8 })
    }
    .layoutWeight(1)
    .padding({ top: 12, bottom: 4 })
    .onClick(() => {
      this.recordType = type
      // 切换类型时重置分类
      const categories = getCategoriesByType(type)
      this.selectedCategory = categories[0].id
    })
  }

  @Builder
  CategoryItem(category: Category) {
    Column() {
      Row() {
        Text(category.name.charAt(0))
          .fontSize(16)
          .fontColor(this.selectedCategory === category.id ? Color.White : category.color)
      }
      .width(44)
      .height(44)
      .backgroundColor(this.selectedCategory === category.id ? category.color : `${category.color}20`)
      .borderRadius(22)
      .justifyContent(FlexAlign.Center)

      Text(category.name)
        .fontSize(AppSizes.FONT_XS)
        .fontColor(this.selectedCategory === category.id ? AppColors.TEXT_PRIMARY : AppColors.TEXT_SECONDARY)
        .margin({ top: 4 })
    }
    .width('20%')
    .padding({ top: 8, bottom: 8 })
    .onClick(() => {
      this.selectedCategory = category.id
    })
  }
}

import promptAction from '@ohos.promptAction'
