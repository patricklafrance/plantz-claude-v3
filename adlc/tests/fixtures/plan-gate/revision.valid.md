# Plan Gate Revision

## Problem

Route conflict between plant list and watering modules.

## Evidence

- Slice 01 defines `/plants` route in plant-list module
- Slice 02 adds `/plants/:id/water` in watering module, but plant-list already owns `/plants/:id`

## Required Changes

Move the detail route to a shared layout in the host, or let watering extend plant-list's existing detail view.
