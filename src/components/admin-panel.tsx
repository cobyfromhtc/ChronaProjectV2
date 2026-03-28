'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/use-auth'
import { apiFetch } from '@/lib/api-client'
import { CTagModal } from '@/components/ctag-modal'
import { 
  Shield, Users, Crown, Coins, Flag, TrendingUp, Search, 
  Loader2, ChevronLeft, ChevronRight, UserPlus, UserMinus,
  AlertTriangle, Check, X, Eye, RefreshCw, Copy, Terminal, Send
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { 
  ROLES, getRole, getRoleLabel, getRoleColor, getRoleLevel,
  canAccessAdminPanel, hasHigherRole, isStaff, isExecutive,
  ROLE_GROUPS, getAssignableRoles
} from '@/lib/roles'

// Types
interface AdminStats {
  totalUsers: number
  totalStorylines: number
  totalPersonas: number
  totalMessages: number
  storylineMessages: number
  dmMessages: number
  pendingReports: number
  totalChronosInCirculation: number
  recentUsers: number
  recentTransactions: number
}

interface ChartData {
  newUsersPerDay: { date: string; count: number }[]
  roleDistribution: { role: string; count: number }[]
}

interface AdminUser {
  id: string
  username: string
  email: string | null
  avatarUrl: string | null
  role: string
  chronos: number
  createdAt: string
  updatedAt: string
  _count: {
    personas: number
    storylineMembers: number
    chronosTransactions: number
  }
}

interface Transaction {
  id: string
  userId: string
  amount: number
  balance: number
  type: string
  category: string
  description: string
  createdAt: string
  user: {
    id: string
    username: string
    avatarUrl: string | null
  }
}

interface Report {
  id: string
  reporterId: string
  reportedId: string | null
  type: string
  reason: string
  details: string | null
  status: string
  referenceId: string | null
  reviewedById: string | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  reporter: {
    id: string
    username: string
    avatarUrl: string | null
  } | null
  reportedUser: {
    id: string
    username: string
    avatarUrl: string | null
  } | null
}

export function AdminPanel() {
  const { user: currentUser } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [charts, setCharts] = useState<ChartData | null>(null)
  
  // Check permissions using new role system
  const currentUserRole = currentUser?.role || 'member'
  const canChangeRoles = currentUser && hasHigherRole(currentUserRole, 'head_mod')
  const isExecutiveUser = currentUser && isExecutive(currentUserRole)
  
  // Users
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersSearch, setUsersSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  
  // Chronos
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [transactionsTotal, setTransactionsTotal] = useState(0)
  const [chronoForm, setChronoForm] = useState({ userId: '', amount: '', reason: '' })
  const [resetChronosForm, setResetChronosForm] = useState({ userId: '', reason: '' })
  const [isSubmittingChronos, setIsSubmittingChronos] = useState(false)
  const [isResettingChronos, setIsResettingChronos] = useState(false)
  
  // Reports
  const [reports, setReports] = useState<Report[]>([])
  const [reportsPage, setReportsPage] = useState(1)
  const [reportsTotal, setReportsTotal] = useState(0)
  const [reportStatusFilter, setReportStatusFilter] = useState('pending')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [reportNote, setReportNote] = useState('')
  
  const [activeTab, setActiveTab] = useState('dashboard')
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null)
  
  // Command Prompt
  const [commandInput, setCommandInput] = useState('')
  const [commandHistory, setCommandHistory] = useState<Array<{ type: 'input' | 'output'; content: string; success?: boolean }>>([])
  const [isExecutingCommand, setIsExecutingCommand] = useState(false)
  const commandInputRef = useState<React.RefObject<HTMLInputElement>>(null)
  
  // CTag Modal
  const [ctagModalOpen, setCtagModalOpen] = useState(false)
  const [ctagModalData, setCtagModalData] = useState<{
    user: { id: string; username: string; avatarUrl: string | null; role: string } | null
    activePersona: { id: string; name: string; avatarUrl: string | null; isActive: boolean; customTag: string | null } | null
    personas: { id: string; name: string; avatarUrl: string | null; isActive: boolean; customTag: string | null }[]
  }>({ user: null, activePersona: null, personas: [] })
  
  // Copy user ID to clipboard
  const copyUserId = async (userId: string) => {
    try {
      await navigator.clipboard.writeText(userId)
      setCopiedUserId(userId)
      setTimeout(() => setCopiedUserId(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }
  
  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setCharts(data.charts)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }
  
  // Fetch users
  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: '10',
        search: usersSearch,
        role: roleFilter
      })
      const response = await apiFetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setUsersTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }
  
  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams({
        page: transactionsPage.toString(),
        limit: '10'
      })
      const response = await apiFetch(`/api/admin/chronos?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
        setTransactionsTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }
  
  // Fetch reports
  const fetchReports = async () => {
    try {
      const params = new URLSearchParams({
        page: reportsPage.toString(),
        limit: '10',
        status: reportStatusFilter
      })
      const response = await apiFetch(`/api/admin/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports)
        setReportsTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }
  
  // Change user role
  const changeUserRole = async (userId: string, newRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return
    
    try {
      const response = await apiFetch('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId, role: newRole })
      })
      
      if (response.ok) {
        fetchUsers()
        fetchStats()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Error changing role:', error)
      alert('Failed to update role')
    }
  }
  
  // Modify Chronos
  const modifyChronos = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingChronos(true)
    
    try {
      const response = await apiFetch('/api/admin/chronos', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: chronoForm.userId,
          amount: parseInt(chronoForm.amount),
          reason: chronoForm.reason
        })
      })
      
      if (response.ok) {
        setChronoForm({ userId: '', amount: '', reason: '' })
        fetchTransactions()
        fetchStats()
        alert('Chronos modified successfully!')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to modify Chronos')
      }
    } catch (error) {
      console.error('Error modifying Chronos:', error)
      alert('Failed to modify Chronos')
    } finally {
      setIsSubmittingChronos(false)
    }
  }
  
  // Reset Chronos to 0
  const resetChronos = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirm('Are you sure you want to reset this user\'s Chronos to 0? This cannot be undone.')) return
    
    setIsResettingChronos(true)
    
    try {
      const response = await apiFetch('/api/admin/chronos', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: resetChronosForm.userId,
          amount: 0, // Will be handled specially
          reason: resetChronosForm.reason,
          reset: true
        })
      })
      
      if (response.ok) {
        setResetChronosForm({ userId: '', reason: '' })
        fetchTransactions()
        fetchStats()
        alert('Chronos reset to 0 successfully!')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to reset Chronos')
      }
    } catch (error) {
      console.error('Error resetting Chronos:', error)
      alert('Failed to reset Chronos')
    } finally {
      setIsResettingChronos(false)
    }
  }
  
  // Update report status
  const updateReportStatus = async (status: string) => {
    if (!selectedReport) return
    
    try {
      const response = await apiFetch('/api/admin/reports', {
        method: 'PATCH',
        body: JSON.stringify({
          reportId: selectedReport.id,
          status,
          reviewNote: reportNote
        })
      })
      
      if (response.ok) {
        setSelectedReport(null)
        setReportNote('')
        fetchReports()
        fetchStats()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update report')
      }
    } catch (error) {
      console.error('Error updating report:', error)
      alert('Failed to update report')
    }
  }
  
  // Execute admin command
  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!commandInput.trim() || isExecutingCommand) return
    
    const input = commandInput.trim()
    setCommandInput('')
    setCommandHistory(prev => [...prev, { type: 'input', content: input }])
    setIsExecutingCommand(true)
    
    try {
      const response = await apiFetch('/api/admin/commands', {
        method: 'POST',
        body: JSON.stringify({ command: input })
      })
      
      const data = await response.json()
      
      setCommandHistory(prev => [...prev, { 
        type: 'output', 
        content: data.message || (data.success ? 'Command executed successfully' : 'Command failed'),
        success: data.success
      }])
      
      // Handle CTag modal trigger
      if (data.success && data.data?.action === 'open_ctag_modal') {
        setCtagModalData({
          user: data.data.user,
          activePersona: data.data.activePersona,
          personas: data.data.personas,
        })
        setCtagModalOpen(true)
      }
      
      // Refresh stats if command was successful
      if (data.success) {
        fetchStats()
      }
    } catch (error) {
      console.error('Command error:', error)
      setCommandHistory(prev => [...prev, { 
        type: 'output', 
        content: 'Failed to execute command. Please try again.',
        success: false
      }])
    } finally {
      setIsExecutingCommand(false)
    }
  }
  
  // Handle CTag success
  const handleCTagSuccess = (message: string) => {
    setCommandHistory(prev => [...prev, { 
      type: 'output', 
      content: message,
      success: true
    }])
    fetchStats()
  }
  
  // Initial fetch
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await fetchStats()
      setIsLoading(false)
    }
    init()
  }, [])
  
  // Fetch users when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'users') fetchUsers()
  }, [activeTab, usersPage, usersSearch, roleFilter])
  
  // Fetch transactions when tab changes
  useEffect(() => {
    if (activeTab === 'chronos') fetchTransactions()
  }, [activeTab, transactionsPage])
  
  // Fetch reports when tab changes
  useEffect(() => {
    if (activeTab === 'reports') fetchReports()
  }, [activeTab, reportsPage, reportStatusFilter])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-purple-500/15 bg-gradient-to-r from-purple-900/20 to-fuchsia-900/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              Admin Panel
            </h1>
            <p className="text-sm text-purple-400/60">Manage users, content, and platform settings</p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 pt-4 border-b border-purple-500/15">
            <TabsList className="bg-purple-500/10 border border-purple-500/20">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-purple-500/30">
                <TrendingUp className="w-4 h-4 mr-2" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-purple-500/30">
                <Users className="w-4 h-4 mr-2" /> Users
              </TabsTrigger>
              <TabsTrigger value="chronos" className="data-[state=active]:bg-purple-500/30">
                <Coins className="w-4 h-4 mr-2" /> Chronos
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-purple-500/30">
                <Flag className="w-4 h-4 mr-2" /> Reports
                {stats && stats.pendingReports > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs">
                    {stats.pendingReports}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="commands" className="data-[state=active]:bg-purple-500/30">
                <Terminal className="w-4 h-4 mr-2" /> Commands
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="flex-1 overflow-y-auto p-6">
            {stats && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-100">{stats.totalUsers}</p>
                          <p className="text-xs text-purple-400/60">Total Users</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-fuchsia-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-100">{stats.totalStorylines}</p>
                          <p className="text-xs text-purple-400/60">Storylines</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <Coins className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-100">{stats.totalChronosInCirculation.toLocaleString()}</p>
                          <p className="text-xs text-purple-400/60">Chronos in Circulation</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <Flag className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-100">{stats.pendingReports}</p>
                          <p className="text-xs text-purple-400/60">Pending Reports</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Secondary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-purple-400/60">Messages Sent</p>
                      <p className="text-xl font-semibold text-purple-100">{stats.totalMessages.toLocaleString()}</p>
                      <p className="text-xs text-purple-400/40 mt-1">DM: {stats.dmMessages} • Storyline: {stats.storylineMessages}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-purple-400/60">Total Personas</p>
                      <p className="text-xl font-semibold text-purple-100">{stats.totalPersonas.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-purple-400/60">New Users (7d)</p>
                      <p className="text-xl font-semibold text-purple-100">{stats.recentUsers}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <p className="text-sm text-purple-400/60">Transactions (7d)</p>
                      <p className="text-xl font-semibold text-purple-100">{stats.recentTransactions}</p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Charts */}
                {charts && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* New Users Chart */}
                    <Card className="bg-purple-500/5 border-purple-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-purple-100">New Users (Last 7 Days)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-2 h-32">
                          {charts.newUsersPerDay.map((day, i) => {
                            const maxCount = Math.max(...charts.newUsersPerDay.map(d => d.count), 1)
                            const height = (day.count / maxCount) * 100
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div 
                                  className="w-full bg-gradient-to-t from-purple-500 to-fuchsia-500 rounded-t-sm transition-all"
                                  style={{ height: `${Math.max(height, 4)}%` }}
                                />
                                <span className="text-[10px] text-purple-400/60">
                                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                </span>
                                <span className="text-xs text-purple-300">{day.count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Role Distribution */}
                    <Card className="bg-purple-500/5 border-purple-500/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-purple-100">Role Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {charts.roleDistribution.map((item) => (
                            <div key={item.role} className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(item.role)}`}>
                                {getRoleLabel(item.role)}
                              </span>
                              <div className="flex-1 h-2 bg-purple-500/10 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500"
                                  style={{ width: `${(item.count / stats.totalUsers) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-purple-300">{item.count}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users" className="flex-1 overflow-y-auto p-6">
            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
                <Input
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1) }}
                  className="pl-10 bg-purple-500/5 border-purple-500/20 focus:border-purple-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setUsersPage(1) }}
                className="px-4 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-100 focus:border-purple-500 focus:outline-none"
              >
                <option value="">All Roles</option>
                <optgroup label="Member Roles">
                  <option value="member">Member</option>
                  <option value="notable_member">Notable Member</option>
                  <option value="artist">Artist</option>
                  <option value="verified_creator">Verified Creator</option>
                  <option value="contributor">Contributor</option>
                </optgroup>
                <optgroup label="Moderation">
                  <option value="intern_mod">Intern Moderator</option>
                  <option value="mod">Moderator</option>
                  <option value="senior_mod">Senior Moderator</option>
                  <option value="head_mod">Head Moderator</option>
                </optgroup>
                <optgroup label="Administration">
                  <option value="admin">Administrator</option>
                  <option value="head_staff">Head of Staff</option>
                  <option value="assistant_manager">Assistant Manager</option>
                  <option value="manager">Manager</option>
                </optgroup>
                <optgroup label="Executive">
                  <option value="executive_chairman">Executive Chairman</option>
                  <option value="owner">Managing Director</option>
                </optgroup>
              </select>
            </div>
            
            {/* Users List */}
            <div className="space-y-2">
              {users.map((u) => (
                <div 
                  key={u.id} 
                  className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-purple-500/30">
                      <AvatarImage src={u.avatarUrl || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white font-semibold">
                        {u.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-purple-100">{u.username}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </span>
                      </div>
                      {/* User ID with copy button */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-purple-400/40 font-mono">ID: {u.id}</span>
                        <button
                          onClick={() => copyUserId(u.id)}
                          className="p-1 rounded hover:bg-purple-500/20 transition-colors"
                          title="Copy User ID"
                        >
                          {copiedUserId === u.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-purple-400/60 hover:text-purple-300" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-purple-400/60">
                        <span><Coins className="w-3 h-3 inline mr-1" />{u.chronos} Chronos</span>
                        <span>{u._count.personas} personas</span>
                        <span>{u._count.storylineMembers} storylines</span>
                        <span>Joined {formatDistanceToNow(new Date(u.createdAt))} ago</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Role change dropdown - only for staff with higher role, not for self */}
                      {canChangeRoles && u.id !== currentUser?.id && hasHigherRole(currentUserRole, u.role) ? (
                        <select
                          value={u.role}
                          onChange={(e) => changeUserRole(u.id, e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-100 focus:border-purple-500 focus:outline-none"
                          disabled={u.id === currentUser?.id}
                        >
                          <optgroup label="Member Roles">
                            <option value="member">Member</option>
                            <option value="notable_member">Notable Member</option>
                            <option value="artist">Artist</option>
                            <option value="verified_creator">Verified Creator</option>
                            <option value="contributor">Contributor</option>
                          </optgroup>
                          {/* Moderation roles - only for head_mod+ */}
                          {hasHigherRole(currentUserRole, 'head_mod') && (
                            <optgroup label="Moderation">
                              <option value="intern_mod">Intern Moderator</option>
                              <option value="mod">Moderator</option>
                              <option value="senior_mod">Senior Moderator</option>
                              <option value="head_mod">Head Moderator</option>
                            </optgroup>
                          )}
                          {/* Admin roles - only for admin+ */}
                          {hasHigherRole(currentUserRole, 'admin') && (
                            <optgroup label="Administration">
                              <option value="admin">Administrator</option>
                              <option value="head_staff">Head of Staff</option>
                              <option value="assistant_manager">Assistant Manager</option>
                              <option value="manager">Manager</option>
                            </optgroup>
                          )}
                          {/* Executive roles - only for owner */}
                          {currentUserRole === 'owner' && (
                            <optgroup label="Executive">
                              <option value="executive_chairman">Executive Chairman</option>
                              <option value="owner">Managing Director</option>
                            </optgroup>
                          )}
                        </select>
                      ) : (
                        /* Just show the role badge if can't change */
                        <span className={`px-2 py-0.5 rounded text-xs ${getRoleColor(u.role)}`}>
                          {getRoleLabel(u.role)}
                          {u.id === currentUser?.id && ' (You)'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {users.length === 0 && (
                <div className="text-center py-12 text-purple-400/60">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No users found</p>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {usersTotal > 10 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                  disabled={usersPage === 1}
                  className="text-purple-300"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-purple-400">Page {usersPage} of {Math.ceil(usersTotal / 10)}</span>
                <Button
                  variant="ghost"
                  onClick={() => setUsersPage(p => p + 1)}
                  disabled={usersPage >= Math.ceil(usersTotal / 10)}
                  className="text-purple-300"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Chronos Tab */}
          <TabsContent value="chronos" className="flex-1 overflow-y-auto p-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-100">{stats?.totalChronosInCirculation.toLocaleString() || 0}</p>
                      <p className="text-xs text-amber-400/60">Total in Circulation</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-100">{stats?.recentTransactions || 0}</p>
                      <p className="text-xs text-purple-400/60">Transactions (7d)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-100">{transactions.filter(t => t.amount > 0).length}</p>
                      <p className="text-xs text-purple-400/60">Credits Shown</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-500/5 border-purple-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <UserMinus className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-100">{transactions.filter(t => t.amount < 0).length}</p>
                      <p className="text-xs text-purple-400/60">Deductions Shown</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Modify Chronos Section */}
            {canChangeRoles && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Add Chronos Card */}
                <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-emerald-100 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-emerald-400" />
                      </div>
                      Add Chronos
                    </CardTitle>
                    <CardDescription className="text-emerald-400/60">Credit a user&apos;s account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={modifyChronos} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs text-emerald-400/80 font-medium">User ID</label>
                        <Input
                          placeholder="Enter user ID..."
                          value={chronoForm.userId}
                          onChange={(e) => setChronoForm({ ...chronoForm, userId: e.target.value })}
                          className="bg-emerald-500/5 border-emerald-500/20 focus:border-emerald-500 focus:ring-emerald-500/20"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-emerald-400/80 font-medium">Amount</label>
                        <div className="flex gap-2">
                          {[100, 500, 1000, 5000].map(preset => (
                            <Button
                              key={preset}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setChronoForm({ ...chronoForm, amount: preset.toString() })}
                              className="bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                            >
                              +{preset}
                            </Button>
                          ))}
                        </div>
                        <Input
                          type="number"
                          placeholder="Or enter custom amount..."
                          value={chronoForm.amount}
                          onChange={(e) => setChronoForm({ ...chronoForm, amount: e.target.value })}
                          className="bg-emerald-500/5 border-emerald-500/20 focus:border-emerald-500 focus:ring-emerald-500/20"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-emerald-400/80 font-medium">Reason</label>
                        <Input
                          placeholder="e.g., Event reward, compensation..."
                          value={chronoForm.reason}
                          onChange={(e) => setChronoForm({ ...chronoForm, reason: e.target.value })}
                          className="bg-emerald-500/5 border-emerald-500/20 focus:border-emerald-500 focus:ring-emerald-500/20"
                          required
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={isSubmittingChronos}
                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20"
                      >
                        {isSubmittingChronos ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                        Add Chronos
                      </Button>
                    </form>
                  </CardContent>
                </Card>
                
                {/* Deduct Chronos Card */}
                <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-orange-100 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                        <UserMinus className="w-4 h-4 text-orange-400" />
                      </div>
                      Deduct Chronos
                    </CardTitle>
                    <CardDescription className="text-orange-400/60">Remove Chronos from a user&apos;s account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={(e) => {
                      e.preventDefault()
                      const form = e.target as HTMLFormElement
                      const formData = new FormData(form)
                      const userId = formData.get('deductUserId') as string
                      const amount = formData.get('deductAmount') as string
                      const reason = formData.get('deductReason') as string
                      
                      if (!userId || !amount || !reason) return
                      
                      modifyChronos({
                        ...e,
                        preventDefault: () => {},
                        target: {
                          ...e.target,
                          elements: {
                            userId: { value: userId },
                            amount: { value: `-${Math.abs(parseInt(amount))}` },
                            reason: { value: reason }
                          }
                        }
                      } as any)
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs text-orange-400/80 font-medium">User ID</label>
                        <Input
                          name="deductUserId"
                          placeholder="Enter user ID..."
                          className="bg-orange-500/5 border-orange-500/20 focus:border-orange-500 focus:ring-orange-500/20"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-orange-400/80 font-medium">Amount</label>
                        <div className="flex gap-2">
                          {[-100, -500, -1000, -5000].map(preset => (
                            <Button
                              key={preset}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                const form = (e.target as HTMLButtonElement).closest('form')
                                const input = form?.querySelector('input[name="deductAmount"]') as HTMLInputElement
                                if (input) input.value = Math.abs(preset).toString()
                              }}
                              className="bg-orange-500/10 border-orange-500/20 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200"
                            >
                              {preset}
                            </Button>
                          ))}
                        </div>
                        <Input
                          name="deductAmount"
                          type="number"
                          placeholder="Enter amount to deduct..."
                          className="bg-orange-500/5 border-orange-500/20 focus:border-orange-500 focus:ring-orange-500/20"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs text-orange-400/80 font-medium">Reason</label>
                        <Input
                          name="deductReason"
                          placeholder="e.g., Penalty, refund..."
                          className="bg-orange-500/5 border-orange-500/20 focus:border-orange-500 focus:ring-orange-500/20"
                          required
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        disabled={isSubmittingChronos}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/20"
                      >
                        {isSubmittingChronos ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserMinus className="w-4 h-4 mr-2" />}
                        Deduct Chronos
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Reset Chronos - Warning Card */}
            {canChangeRoles && (
              <Card className="bg-red-500/5 border-red-500/20 mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-red-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                    Reset Chronos Balance
                    <span className="ml-auto px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs font-normal">Danger Zone</span>
                  </CardTitle>
                  <CardDescription className="text-red-400/60">Permanently reset a user&apos;s Chronos balance to 0</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={resetChronos} className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="User ID"
                      value={resetChronosForm.userId}
                      onChange={(e) => setResetChronosForm({ ...resetChronosForm, userId: e.target.value })}
                      className="bg-red-500/5 border-red-500/20 focus:border-red-500 flex-1"
                      required
                    />
                    <Input
                      placeholder="Reason for reset..."
                      value={resetChronosForm.reason}
                      onChange={(e) => setResetChronosForm({ ...resetChronosForm, reason: e.target.value })}
                      className="bg-red-500/5 border-red-500/20 focus:border-red-500 flex-1"
                      required
                    />
                    <Button 
                      type="submit" 
                      disabled={isResettingChronos}
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
                    >
                      {isResettingChronos ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                      Reset to 0
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
            
            {/* Recent Transactions */}
            <Card className="bg-purple-500/5 border-purple-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-purple-100 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-purple-400" />
                    Recent Transactions
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchTransactions()}
                    className="text-purple-400 hover:text-purple-200 hover:bg-purple-500/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div 
                      key={tx.id}
                      className="flex items-center gap-4 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/20 transition-colors"
                    >
                      <Avatar className="w-10 h-10 border-2 border-purple-500/30">
                        <AvatarImage src={tx.user.avatarUrl || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white text-sm font-semibold">
                          {tx.user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-purple-100">{tx.user.username}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                            {tx.category || tx.type}
                          </span>
                        </div>
                        <p className="text-sm text-purple-400/60 truncate">{tx.description}</p>
                      </div>
                      
                      <div className="text-right">
                        <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                        </span>
                        <p className="text-xs text-purple-400/60">
                          Balance: {tx.balance.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="text-xs text-purple-400/40 whitespace-nowrap">
                        {formatDistanceToNow(new Date(tx.createdAt))} ago
                      </div>
                    </div>
                  ))}
                  
                  {transactions.length === 0 && (
                    <div className="text-center py-12">
                      <Coins className="w-12 h-12 mx-auto mb-4 text-purple-500/30" />
                      <p className="text-purple-400/60">No transactions found</p>
                    </div>
                  )}
                </div>
                
                {/* Pagination */}
                {transactionsTotal > 10 && (
                  <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-purple-500/10">
                    <Button
                      variant="ghost"
                      onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                      disabled={transactionsPage === 1}
                      className="text-purple-300 hover:text-purple-100"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <span className="text-purple-400 text-sm">
                      Page {transactionsPage} of {Math.ceil(transactionsTotal / 10)}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => setTransactionsPage(p => p + 1)}
                      disabled={transactionsPage >= Math.ceil(transactionsTotal / 10)}
                      className="text-purple-300 hover:text-purple-100"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Reports Tab */}
          <TabsContent value="reports" className="flex-1 overflow-y-auto p-6">
            {/* Status Filter */}
            <div className="flex gap-2 mb-6">
              {['pending', 'reviewed', 'resolved', 'dismissed'].map((status) => (
                <Button
                  key={status}
                  variant={reportStatusFilter === status ? 'default' : 'ghost'}
                  onClick={() => { setReportStatusFilter(status); setReportsPage(1) }}
                  className={reportStatusFilter === status 
                    ? 'bg-purple-500 hover:bg-purple-600' 
                    : 'text-purple-300 hover:bg-purple-500/10'
                  }
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
            
            {/* Reports List */}
            <div className="space-y-2">
              {reports.map((report) => (
                <div 
                  key={report.id}
                  className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      report.status === 'pending' ? 'bg-amber-500/20' :
                      report.status === 'resolved' ? 'bg-emerald-500/20' :
                      report.status === 'dismissed' ? 'bg-gray-500/20' : 'bg-purple-500/20'
                    }`}>
                      <Flag className={`w-5 h-5 ${
                        report.status === 'pending' ? 'text-amber-400' :
                        report.status === 'resolved' ? 'text-emerald-400' :
                        report.status === 'dismissed' ? 'text-gray-400' : 'text-purple-400'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-purple-100">{report.type.toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          report.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          report.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' :
                          report.status === 'dismissed' ? 'bg-gray-500/20 text-gray-400' : 
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="text-purple-200 mt-1">{report.reason}</p>
                      {report.details && (
                        <p className="text-sm text-purple-400/60 mt-1">{report.details}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-purple-400/50">
                        {report.reporter && (
                          <span>Reported by: {report.reporter.username}</span>
                        )}
                        {report.reportedUser && (
                          <span>Reported user: {report.reportedUser.username}</span>
                        )}
                        <span>{formatDistanceToNow(new Date(report.createdAt))} ago</span>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                      className="text-purple-300 hover:bg-purple-500/10"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Review
                    </Button>
                  </div>
                </div>
              ))}
              
              {reports.length === 0 && (
                <div className="text-center py-12 text-purple-400/60">
                  <Flag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No {reportStatusFilter !== 'all' ? reportStatusFilter : ''} reports</p>
                </div>
              )}
            </div>
            
            {/* Pagination */}
            {reportsTotal > 10 && (
              <div className="flex items-center justify-center gap-4 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => setReportsPage(p => Math.max(1, p - 1))}
                  disabled={reportsPage === 1}
                  className="text-purple-300"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <span className="text-purple-400">Page {reportsPage}</span>
                <Button
                  variant="ghost"
                  onClick={() => setReportsPage(p => p + 1)}
                  disabled={reportsPage >= Math.ceil(reportsTotal / 10)}
                  className="text-purple-300"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </TabsContent>
          
          {/* Commands Tab */}
          <TabsContent value="commands" className="flex-1 overflow-y-auto p-4">
            <Card className="bg-[#0a0510] border-purple-500/20 flex flex-col overflow-hidden min-h-[400px]">
              <CardHeader className="pb-2 border-b border-purple-500/15 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-purple-400" />
                    <CardTitle className="text-lg text-purple-100">Admin Command Prompt</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCommandHistory([])}
                    className="text-purple-400 hover:bg-purple-500/10"
                  >
                    Clear
                  </Button>
                </div>
                <CardDescription>Execute admin commands for quick actions</CardDescription>
              </CardHeader>
              
              <CardContent className="flex flex-col overflow-hidden p-0 min-h-0">
                {/* Terminal Output */}
                <div className="flex-1 overflow-y-auto min-h-0 p-4 max-h-[300px]">
                  <div className="font-mono text-sm space-y-2">
                    {commandHistory.length === 0 && (
                      <div className="text-purple-400/60">
                        <p>Welcome to Admin Command Prompt!</p>
                        <p className="mt-2">Type <span className="text-purple-300">-Help</span> to see available commands.</p>
                        <p className="mt-1 text-xs text-purple-400/40">
                          Example: -CreateAccount TestUser, password123, user
                        </p>
                      </div>
                    )}
                    
                    {commandHistory.map((entry, index) => (
                      <div key={index} className={`${entry.type === 'input' ? 'text-purple-300' : entry.success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.type === 'input' ? (
                          <div className="flex items-start gap-2">
                            <span className="text-purple-500">$</span>
                            <span className="whitespace-pre-wrap break-all">{entry.content}</span>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap break-all ml-4 pl-2 border-l-2 border-purple-500/30">
                            {entry.content}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {isExecutingCommand && (
                      <div className="text-purple-400/60 animate-pulse">
                        Executing...
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Command Input */}
                <form onSubmit={executeCommand} className="p-4 border-t border-purple-500/15 shrink-0">
                  <div className="flex gap-2">
                    <span className="text-purple-500 font-mono py-2">$</span>
                    <Input
                      value={commandInput}
                      onChange={(e) => setCommandInput(e.target.value)}
                      placeholder="Enter command (e.g., -Help)"
                      className="flex-1 bg-purple-500/5 border-purple-500/20 font-mono text-purple-100 placeholder-purple-400/40 focus:border-purple-500"
                      disabled={isExecutingCommand}
                    />
                    <Button 
                      type="submit" 
                      disabled={!commandInput.trim() || isExecutingCommand}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isExecutingCommand ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
            
            {/* Quick Reference */}
            <Card className="mt-4 bg-purple-500/5 border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-200">Quick Reference</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded bg-purple-500/10">
                  <code className="text-purple-300">-CreateAccount Username, Password, Role</code>
                </div>
                <div className="p-2 rounded bg-purple-500/10">
                  <code className="text-purple-300">-ChangeKey Username</code>
                </div>
                <div className="p-2 rounded bg-purple-500/10">
                  <code className="text-purple-300">-GetUserInfo Username</code>
                </div>
                <div className="p-2 rounded bg-purple-500/10">
                  <code className="text-purple-300">-SetRole Username, Role</code>
                </div>
                <div className="p-2 rounded bg-purple-500/10">
                  <code className="text-purple-300">-GiveChronos Username, Amount</code>
                </div>
                <div className="p-2 rounded bg-purple-500/10">
                  <code className="text-purple-300">-Help</code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Report Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-gradient-to-b from-[#150a25] to-[#0a0510] border border-purple-500/20 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-purple-500/15">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Review Report</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelectedReport(null); setReportNote('') }}
                  className="text-purple-400 hover:bg-purple-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-purple-400/60 uppercase tracking-wider">Type</label>
                <p className="text-purple-100">{selectedReport.type.toUpperCase()}</p>
              </div>
              
              <div>
                <label className="text-xs text-purple-400/60 uppercase tracking-wider">Reason</label>
                <p className="text-purple-100">{selectedReport.reason}</p>
              </div>
              
              {selectedReport.details && (
                <div>
                  <label className="text-xs text-purple-400/60 uppercase tracking-wider">Details</label>
                  <p className="text-purple-100">{selectedReport.details}</p>
                </div>
              )}
              
              <div>
                <label className="text-xs text-purple-400/60 uppercase tracking-wider">Note</label>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Add a note about this decision..."
                  className="w-full mt-1 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-100 placeholder-purple-400/40 focus:border-purple-500 focus:outline-none resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => updateReportStatus('dismissed')}
                  variant="ghost"
                  className="flex-1 border border-purple-500/20 text-purple-300 hover:bg-purple-500/10"
                >
                  <X className="w-4 h-4 mr-2" /> Dismiss
                </Button>
                <Button
                  onClick={() => updateReportStatus('resolved')}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:opacity-90"
                >
                  <Check className="w-4 h-4 mr-2" /> Resolve
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CTag Modal */}
      <CTagModal
        open={ctagModalOpen}
        onOpenChange={setCtagModalOpen}
        user={ctagModalData.user}
        activePersona={ctagModalData.activePersona}
        personas={ctagModalData.personas}
        onSuccess={handleCTagSuccess}
      />
    </div>
  )
}
