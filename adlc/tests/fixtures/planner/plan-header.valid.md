# Plan: Plant Tracker

## Objective

Let users manage their houseplants with watering schedules and health tracking.

## Data Model

Plant = { id: string, name: string, species?: string, waterFrequencyDays: number, lastWatered?: Date }
WaterLog = { id: string, plantId: string, timestamp: Date }

## Collection Strategy

- plant-list module: TanStack DB collection for live plant grid
- watering module: fetch+useState for water log history
