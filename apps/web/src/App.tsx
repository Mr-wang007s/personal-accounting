import { useState } from 'react'
import { SyncProvider, useSync } from '@/context/SyncContext'
import { LedgerProvider } from '@/context/LedgerContext'
import { RecordsProvider } from '@/context/RecordsContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { HomePage } from '@/pages/HomePage'
import { RecordFormPage } from '@/pages/RecordFormPage'
import { RecordsPage } from '@/pages/RecordsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { LoginPage } from '@/pages/LoginPage'
import { Loader2 } from 'lucide-react'
import type { Record } from '@personal-accounting/shared/types'

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home')
  const [editingRecord, setEditingRecord] = useState<Record | null>(null)
  const { isAuthenticated, isLoading, error, login, sendEmailCode, emailLogin } = useSync()

  const handleNavigate = (page: string) => {
    if (currentPage === 'edit' && page !== 'edit') {
      setEditingRecord(null)
    }
    setCurrentPage(page)
  }

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record)
    setCurrentPage('edit')
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录 - 显示登录页
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={() => setCurrentPage('home')}
        error={error}
        onLogin={login}
        onSendEmailCode={sendEmailCode}
        onEmailLogin={emailLogin}
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
      {renderPage()}
      {showBottomNav && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  )
}

function AuthenticatedApp() {
  return (
    <LedgerProvider>
      <RecordsProvider>
        <AppContent />
      </RecordsProvider>
    </LedgerProvider>
  )
}

function App() {
  return (
    <SyncProvider>
      <AuthenticatedApp />
    </SyncProvider>
  )
}

export default App
