"use client"

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Save, Loader2 } from 'lucide-react'

interface ThresholdRow {
  id: number
  team_id: number
  team_name: string
  min_headcount: number | null
  min_utilisation: number
  ideal_utilisation: number
  max_utilisation: number
  effective_from: string
  effective_to: string | null
}

interface StatusRow {
  id: number
  name: string
  category: string
  availability_weight: number
  color: string
  display_order: number
}

interface TeamRow {
  id: number
  name: string
  display_order: number
}

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<ThresholdRow[]>([])
  const [statuses, setStatuses] = useState<StatusRow[]>([])
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [thresholdsRes, statusesRes, teamsRes] = await Promise.all([
          fetch('/api/thresholds'),
          fetch('/api/statuses'),
          fetch('/api/teams'),
        ])

        if (thresholdsRes.ok) {
          setThresholds(await thresholdsRes.json())
        }
        if (statusesRes.ok) {
          setStatuses(await statusesRes.json())
        }
        if (teamsRes.ok) {
          setTeams(await teamsRes.json())
        }
      } catch {
        // silently handle - data will just be empty
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  function updateThreshold(id: number, field: string, value: string) {
    setThresholds((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        const numValue = parseFloat(value)
        if (field === 'min_headcount') {
          return { ...t, [field]: value === '' ? null : parseInt(value, 10) }
        }
        return { ...t, [field]: isNaN(numValue) ? t[field as keyof ThresholdRow] : numValue }
      })
    )
  }

  async function saveThresholds() {
    setSaving(true)
    setSaveMessage('')
    try {
      const results = await Promise.all(
        thresholds.map((t) =>
          fetch('/api/thresholds', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: t.id,
              min_headcount: t.min_headcount,
              min_utilisation: t.min_utilisation,
              ideal_utilisation: t.ideal_utilisation,
              max_utilisation: t.max_utilisation,
            }),
          })
        )
      )
      const allOk = results.every((r) => r.ok)
      setSaveMessage(allOk ? 'Thresholds saved successfully.' : 'Some thresholds failed to save.')
    } catch {
      setSaveMessage('Failed to save thresholds.')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" />
        Loading settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="thresholds">
        <TabsList>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="statuses">Statuses</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Capacity Thresholds</span>
                <div className="flex items-center gap-2">
                  {saveMessage && (
                    <span className="text-xs text-muted-foreground">{saveMessage}</span>
                  )}
                  <Button size="sm" onClick={saveThresholds} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                    {saving ? (
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="size-3.5 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Team</TableHead>
                    <TableHead className="text-xs">Min Headcount</TableHead>
                    <TableHead className="text-xs">Min Utilisation</TableHead>
                    <TableHead className="text-xs">Ideal Utilisation</TableHead>
                    <TableHead className="text-xs">Max Utilisation</TableHead>
                    <TableHead className="text-xs">Effective From</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thresholds.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">{t.team_name}</TableCell>
                      <TableCell className="font-mono tabular-nums">
                        <Input
                          type="number"
                          value={t.min_headcount ?? ''}
                          onChange={(e) => updateThreshold(t.id, 'min_headcount', e.target.value)}
                          className="w-20 h-7 text-xs font-mono tabular-nums focus-visible:ring-teal-500"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        <Input
                          type="number"
                          value={t.min_utilisation}
                          onChange={(e) => updateThreshold(t.id, 'min_utilisation', e.target.value)}
                          className="w-20 h-7 text-xs font-mono tabular-nums focus-visible:ring-teal-500"
                          step={0.05}
                          min={0}
                          max={2}
                        />
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        <Input
                          type="number"
                          value={t.ideal_utilisation}
                          onChange={(e) => updateThreshold(t.id, 'ideal_utilisation', e.target.value)}
                          className="w-20 h-7 text-xs font-mono tabular-nums focus-visible:ring-teal-500"
                          step={0.05}
                          min={0}
                          max={2}
                        />
                      </TableCell>
                      <TableCell className="font-mono tabular-nums">
                        <Input
                          type="number"
                          value={t.max_utilisation}
                          onChange={(e) => updateThreshold(t.id, 'max_utilisation', e.target.value)}
                          className="w-20 h-7 text-xs font-mono tabular-nums focus-visible:ring-teal-500"
                          step={0.05}
                          min={0}
                          max={2}
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {t.effective_from}
                      </TableCell>
                    </TableRow>
                  ))}
                  {thresholds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                        No thresholds configured.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statuses Tab */}
        <TabsContent value="statuses">
          <Card>
            <CardHeader>
              <CardTitle>Status Definitions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Weight</TableHead>
                    <TableHead className="text-xs">Color</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-medium">{s.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.category === 'available'
                              ? 'default'
                              : s.category === 'unavailable'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {s.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">
                        {s.availability_weight}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="size-4 rounded-sm border border-border"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-xs font-mono text-muted-foreground">{s.color}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {statuses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-8">
                        No statuses found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams Tab */}
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">ID</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Display Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{t.id}</TableCell>
                      <TableCell className="text-sm font-medium">{t.name}</TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">{t.display_order}</TableCell>
                    </TableRow>
                  ))}
                  {teams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-8">
                        No teams found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
