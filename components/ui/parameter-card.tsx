"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useId } from "react"
import { Label } from "./label"
import { Shuffle } from "lucide-react"

interface ParameterCardProps {
  title: string
  disabled?: boolean
  value: string
  options: string[]
  mode: "hollywood" | "stupid" | "custom"
  onValueChange: (value: string) => void
  onRandomize: () => void
}

export function ParameterCard({ title, value, options, mode, onValueChange, onRandomize, disabled = false }: ParameterCardProps) {
  const fieldId = useId()
  const lowerTitle = title.toLowerCase()
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between px-4 pt-3 pb-2 sm:px-4 sm:pt-3 sm:pb-2">
        <CardTitle className="text-base font-medium"><Label htmlFor={fieldId}>{title}</Label></CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRandomize}
          disabled={disabled || mode === 'custom'}
          aria-label={`Randomize ${lowerTitle}`}
        >
          <Shuffle className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-4 sm:pb-4">
        {mode === 'custom' ? (
          <Input
            id={fieldId}
            disabled={disabled}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={`Enter custom ${lowerTitle}`}
            aria-label={title}
          />
        ) : (
          <Select disabled={disabled} onValueChange={onValueChange} value={value}>
            <SelectTrigger id={fieldId} aria-label={title}>
              <SelectValue placeholder={`Choose ${lowerTitle}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  )
}
