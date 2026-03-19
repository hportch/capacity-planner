"use client"

import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Save, Loader2 } from 'lucide-react'
import { CSVImport } from '@/components/import/csv-import'

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

const CATEGORIES = [
  { value: 'available', label: 'Available', weight: 1.0 },
  { value: 'partial', label: 'Partial', weight: 0.5 },
  { value: 'unavailable', label: 'Unavailable', weight: 0.0 },
  { value: 'loaned', label: 'Loaned', weight: 0.0 },
]

export default function SettingsPage() {
  const [thresholds, setThresholds] = useState<ThresholdRow[]>([])
  const [statuses, setStatuses] = useState<StatusRow[]>([])
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [savingThresholds, setSavingThresholds] = useState(false)
  const [savingStatuses, setSavingStatuses] = useState(false)
  const [thresholdMessage, setThresholdMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [thresholdsRes, statusesRes, teamsRes] = await Promise.all([
          fetch('/api/thresholds'),
          fetch('/api/statuses'),
          fetch('/api/teams'),
        ])

        if (thresholdsRes.ok) setThresholds(await thresholdsRes.json())
        if (statusesRes.ok) setStatuses(await statusesRes.json())
        if (teamsRes.ok) setTeams(await teamsRes.json())
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // --- Threshold helpers ---
  function updateThreshold(id: number, field: string, value: string) {
    setThresholds((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t
        if (field === 'min_headcount') {
          return { ...t, [field]: value === '' ? null : parseInt(value, 10) }
        }
        // Percentage fields: convert from % display to decimal
        const numValue = parseFloat(value)
        if (isNaN(numValue)) return t
        return { ...t, [field]: numValue / 100 }
      })
    )
  }

  async function saveThresholds() {
    setSavingThresholds(true)
    setThresholdMessage('')
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
      setThresholdMessage(allOk ? 'Saved.' : 'Some failed to save.')
    } catch {
      setThresholdMessage('Failed to save.')
    } finally {
      setSavingThresholds(false)
      setTimeout(() => setThresholdMessage(''), 3000)
    }
  }

  // --- Status helpers ---
  function updateStatus(id: number, field: string, value: string | number) {
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        if (field === 'category') {
          const cat = CATEGORIES.find((c) => c.value === value)
          return { ...s, category: String(value), availability_weight: cat?.weight ?? s.availability_weight }
        }
        if (field === 'availability_weight') {
          return { ...s, [field]: typeof value === 'number' ? value : parseFloat(value) || 0 }
        }
        return { ...s, [field]: value }
      })
    )
  }

  async function saveStatuses() {
    setSavingStatuses(true)
    setStatusMessage('')
    try {
      const results = await Promise.all(
        statuses.map((s) =>
          fetch('/api/statuses', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: s.id,
              name: s.name,
              category: s.category,
              availability_weight: s.availability_weight,
              color: s.color,
            }),
          })
        )
      )
      const allOk = results.every((r) => r.ok)
      setStatusMessage(allOk ? 'Saved.' : 'Some failed to save.')
    } catch {
      setStatusMessage('Failed to save.')
    } finally {
      setSavingStatuses(false)
      setTimeout(() => setStatusMessage(''), 3000)
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
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        {/* Thresholds Tab */}
        <TabsContent value="thresholds">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Capacity Thresholds</span>
                <div className="flex items-center gap-2">
                  {thresholdMessage && (
                    <span className="text-xs text-muted-foreground">{thresholdMessage}</span>
                  )}
                  <Button size="sm" onClick={saveThresholds} disabled={savingThresholds} className="bg-teal-600 hover:bg-teal-700 text-white">
                    {savingThresholds ? (
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="size-3.5 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Set the minimum, ideal, and maximum utilisation thresholds per team. Values are percentages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Team</TableHead>
                    <TableHead className="text-xs">Min Headcount</TableHead>
                    <TableHead className="text-xs">Min %</TableHead>
                    <TableHead className="text-xs">Ideal %</TableHead>
                    <TableHead className="text-xs">Max %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thresholds.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">{t.team_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={t.min_headcount ?? ''}
                          onChange={(e) => updateThreshold(t.id, 'min_headcount', e.target.value)}
                          className="w-16 h-7 text-xs font-mono tabular-nums"
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={Math.round(t.min_utilisation * 100)}
                            onChange={(e) => updateThreshold(t.id, 'min_utilisation', e.target.value)}
                            className="w-16 h-7 text-xs font-mono tabular-nums"
                            min={0}
                            max={200}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={Math.round(t.ideal_utilisation * 100)}
                            onChange={(e) => updateThreshold(t.id, 'ideal_utilisation', e.target.value)}
                            className="w-16 h-7 text-xs font-mono tabular-nums"
                            min={0}
                            max={200}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={Math.round(t.max_utilisation * 100)}
                            onChange={(e) => updateThreshold(t.id, 'max_utilisation', e.target.value)}
                            className="w-16 h-7 text-xs font-mono tabular-nums"
                            min={0}
                            max={200}
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {thresholds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
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
              <CardTitle className="flex items-center justify-between">
                <span>Status Definitions</span>
                <div className="flex items-center gap-2">
                  {statusMessage && (
                    <span className="text-xs text-muted-foreground">{statusMessage}</span>
                  )}
                  <Button size="sm" onClick={saveStatuses} disabled={savingStatuses} className="bg-teal-600 hover:bg-teal-700 text-white">
                    {savingStatuses ? (
                      <Loader2 className="size-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="size-3.5 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Edit status names, categories, and colors. Category determines the utilisation weight.
              </CardDescription>
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
                      <TableCell>
                        <Input
                          value={s.name}
                          onChange={(e) => updateStatus(s.id, 'name', e.target.value)}
                          className="h-7 text-xs font-medium w-36"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={s.category}
                          onValueChange={(val) => updateStatus(s.id, 'category', val ?? s.category)}
                        >
                          <SelectTrigger size="sm" className="w-28 h-7 text-xs">
                            <span data-slot="select-value" className="flex flex-1 text-left text-xs">
                              {CATEGORIES.find((c) => c.value === s.category)?.label ?? s.category}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">
                        <Input
                          type="number"
                          value={s.availability_weight}
                          onChange={(e) => updateStatus(s.id, 'availability_weight', e.target.value)}
                          className="w-16 h-7 text-xs font-mono tabular-nums"
                          step={0.1}
                          min={0}
                          max={1}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={s.color}
                            onChange={(e) => updateStatus(s.id, 'color', e.target.value)}
                            className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5"
                          />
                          <span className="text-[10px] font-mono text-muted-foreground">{s.color}</span>
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
              <CardDescription>
                Team configuration. Contact admin to add or remove teams.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Display Order</TableHead>
                    <TableHead className="text-xs">Staff Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">{t.name}</TableCell>
                      <TableCell className="text-xs font-mono tabular-nums">{t.display_order}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">&mdash;</TableCell>
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
        {/* Import Tab */}
        <TabsContent value="import">
          <CSVImport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
