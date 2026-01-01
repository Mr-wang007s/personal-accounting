/**
 * 自定义 TabBar 组件
 * 使用 Lucide 风格图标，支持选中高亮效果
 */
Component({
  data: {
    selected: 0,
    tabs: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/assets/icons/tabbar/house.png',
        selectedIconPath: '/assets/icons/tabbar/house-active.png',
      },
      {
        pagePath: '/pages/records/records',
        text: '账单',
        iconPath: '/assets/icons/tabbar/records.png',
        selectedIconPath: '/assets/icons/tabbar/records-active.png',
      },
      {
        pagePath: '/pages/profile/profile',
        text: '我的',
        iconPath: '/assets/icons/tabbar/profile.png',
        selectedIconPath: '/assets/icons/tabbar/profile-active.png',
      },
    ],
  },

  methods: {
    switchTab(e: WechatMiniprogram.TouchEvent) {
      const index = e.currentTarget.dataset.index as number
      const tab = this.data.tabs[index]

      if (index === this.data.selected) return

      wx.switchTab({
        url: tab.pagePath,
      })
    },
  },
})
