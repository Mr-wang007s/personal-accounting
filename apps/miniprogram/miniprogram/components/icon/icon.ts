// 图标组件
Component({
  properties: {
    name: {
      type: String,
      value: '',
    },
    size: {
      type: Number,
      value: 48,
    },
    color: {
      type: String,
      value: '',
    },
  },

  data: {
    src: '',
    fallback: '?',
  },

  observers: {
    'name': function(name: string) {
      this.updateIcon(name)
    }
  },

  lifetimes: {
    attached() {
      this.updateIcon(this.data.name)
    }
  },

  methods: {
    updateIcon(name: string) {
      if (!name) {
        this.setData({ src: '', fallback: '?' })
        return
      }

      // 图标文件路径
      const src = `/assets/icons/${name}.png`
      
      // Emoji 备选映射
      const fallbackMap: Record<string, string> = {
        'home': '🏠',
        'plus': '+',
        'minus': '-',
        'list': '📋',
        'user': '👤',
        'calendar': '📅',
        'check': '✓',
        'trash': '🗑',
        'download': '⬇',
        'info': 'ℹ',
        'chevron-down': '▼',
        'chevron-left': '◀',
        'chevron-right': '▶',
        'category/food': '🍽',
        'category/transport': '🚗',
        'category/shopping': '🛒',
        'category/entertainment': '🎮',
        'category/housing': '🏠',
        'category/medical': '❤',
        'category/education': '🎓',
        'category/communication': '📱',
        'category/utilities': '⚡',
        'category/other': '•••',
        'category/salary': '💰',
        'category/bonus': '🎁',
        'category/investment': '📈',
        'category/parttime': '💼',
        'category/refund': '↩',
      }

      this.setData({
        src,
        fallback: fallbackMap[name] || '?',
      })
    }
  }
})
