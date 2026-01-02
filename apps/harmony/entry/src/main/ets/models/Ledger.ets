/**
 * 账本模型
 */

@Observed
export class Ledger {
  id: string = ''
  name: string = ''
  icon?: string
  color?: string
  createdAt: string = ''
  updatedAt: string = ''

  constructor(data?: Partial<Ledger>) {
    if (data) {
      Object.assign(this, data)
    }
  }

  static fromJson(json: object): Ledger {
    const ledger = new Ledger()
    const data = json as Record<string, Object>
    ledger.id = data['id'] as string || ''
    ledger.name = data['name'] as string || ''
    ledger.icon = data['icon'] as string
    ledger.color = data['color'] as string
    ledger.createdAt = data['createdAt'] as string || ''
    ledger.updatedAt = data['updatedAt'] as string || ''
    return ledger
  }

  toJson(): object {
    return {
      id: this.id,
      name: this.name,
      icon: this.icon,
      color: this.color,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  static createDefault(): Ledger {
    const now = new Date().toISOString()
    return new Ledger({
      id: generateId(),
      name: '默认账本',
      createdAt: now,
      updatedAt: now
    })
  }
}

/**
 * 用户信息
 */
@Observed
export class UserProfile {
  phone?: string
  openid?: string
  nickname?: string
  avatar?: string

  constructor(data?: Partial<UserProfile>) {
    if (data) {
      Object.assign(this, data)
    }
  }
}

// 生成唯一 ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}
