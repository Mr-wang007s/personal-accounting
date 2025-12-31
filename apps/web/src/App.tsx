import { useState } from 'react'
import { RecordsProvider, useRecords } from '@/context/RecordsContext'
import { SyncProvider, useSync } from '@/context/SyncContext'
import { LedgerProvider, useLedger } from '@/context/LedgerContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { HomePage } from '@/pages/HomePage'
import { RecordFormPage } from '@/pages/RecordFormPage'
import { RecordsPage } from '@/pages/RecordsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import type { Record } from '@personal-accounting/shared/types'

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home')
  const [editingRecord, setEditingRecord] = useState<Record | null>(null)
  const { refreshData } = useRecords()
  const { syncState } = useSync()
  const { isInitialized, refreshData: refreshLedger } = useLedger()

  const handleNavigate = (page: string) => {
    // 离开编辑页面时清除编辑状态
    if (currentPage === 'edit' && page !== 'edit') {
      setEditingRecord(null)
    }
    setCurrentPage(page)
  }

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record)
    setCurrentPage('edit')
  }

  // 同步成功后刷新数据
  if (syncState === 'success') {
    refreshData()
  }

  // 首次使用引导
  if (!isInitialized) {
    return (
      <OnboardingPage 
        onComplete={() => {
          refreshLedger()
          refreshData()
        }} 
      />
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={handleNavigate} />
      case 'record':
        return <RecordFormPage type="expense" onNavigate={handleNavigate} />
      case 'income':
        return <RecordFormPage type="income" onNavigate={handleNavigate} />
      case 'expense':
        return <RecordFormPage type="expense" onNavigate={handleNavigate} />
      case 'edit':
        return editingRecord ? (
          <RecordFormPage 
            type={editingRecord.type} 
            onNavigate={handleNavigate} 
            editRecord={editingRecord}
          />
        ) : (
          <RecordsPage onNavigate={handleNavigate} onEditRecord={handleEditRecord} />
        )
      case 'records':
        return <RecordsPage onNavigate={handleNavigate} onEditRecord={handleEditRecord} />
      case 'profile':
        return <ProfilePage onNavigate={handleNavigate} />
      default:
        return <HomePage onNavigate={handleNavigate} />
    }
  }

  const showBottomNav = !['income', 'expense', 'edit'].includes(currentPage)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 主内容区域 */}
      {renderPage()}
      
      {showBottomNav && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  )
}

function App() {
  return (
    <LedgerProvider>
      <SyncProvider>
        <RecordsProvider>
          <AppContent />
        </RecordsProvider>
      </SyncProvider>
    </LedgerProvider>
  )
}

export default App
