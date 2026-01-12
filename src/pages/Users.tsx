import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../context/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { RefreshCw, CheckCircle, XCircle, Users as UsersIcon, Search } from 'lucide-react'

export default function Users() {
    const [users, setUsers] = useState<Profile[]>([])
    const [filteredUsers, setFilteredUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        if (searchTerm) {
            const filtered = users.filter(u =>
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            setFilteredUsers(filtered)
        } else {
            setFilteredUsers(users)
        }
    }, [searchTerm, users])

    async function fetchUsers() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            setUsers(data as Profile[])
            setFilteredUsers(data as Profile[])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function updateUser(id: string, updates: Partial<Profile>) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', id)

            if (error) throw error
            setUsers(users.map(u => u.id === id ? { ...u, ...updates } : u))
        } catch (err: any) {
            alert(err.message)
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto p-6 max-w-7xl">
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        )
    }

    const stats = {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        pending: users.filter(u => u.status === 'pending').length,
        admins: users.filter(u => u.role === 'admin').length,
    }

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-6 animate-in">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <UsersIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <XCircle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Admins</CardTitle>
                        <UsersIcon className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.admins}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>Manage user roles, status, and permissions</CardDescription>
                        </div>
                        <Button onClick={fetchUsers} variant="outline" size="sm">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by email or name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-800 border border-red-200">
                            {error}
                        </div>
                    )}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Full Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-medium">{u.email}</TableCell>
                                    <TableCell>
                                        <Input
                                            defaultValue={u.full_name || ''}
                                            onBlur={(e) => {
                                                if (e.target.value !== u.full_name) {
                                                    updateUser(u.id, { full_name: e.target.value })
                                                }
                                            }}
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            value={u.role}
                                            onChange={(e) => updateUser(u.id, { role: e.target.value as 'admin' | 'employee' })}
                                            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="employee">Employee</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        {u.status === 'active' ? (
                                            <Badge variant="success">Active</Badge>
                                        ) : (
                                            <Badge variant="secondary">Pending</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {u.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => updateUser(u.id, { status: 'active' })}
                                                >
                                                    <CheckCircle className="mr-1 h-3 w-3" />
                                                    Activate
                                                </Button>
                                            )}
                                            {u.status === 'active' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateUser(u.id, { status: 'pending' })}
                                                >
                                                    <XCircle className="mr-1 h-3 w-3" />
                                                    Deactivate
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No users found matching your search.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
