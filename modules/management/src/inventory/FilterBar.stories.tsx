import type { Meta, StoryObj } from "@storybook/react-vite";

import { FilterBar } from "./FilterBar.tsx";
import type { PlantFilters } from "./usePlantFilters.ts";

const defaultFilters: PlantFilters = {
    name: "",
    location: null,
    luminosity: null,
    mistLeaves: null,
    soilType: "",
    wateringFrequency: null,
    wateringType: null,
    dueForWatering: false
};

const meta = {
    title: "Management/Inventory/Components/FilterBar",
    component: FilterBar,
    parameters: {
        chromatic: {
            modes: {
                "light mobile": { theme: "light", viewport: 375 },
                "light tablet": { theme: "light", viewport: 768 },
                "light desktop": { theme: "light", viewport: 1280 },
                "dark mobile": { theme: "dark", viewport: 375 },
                "dark tablet": { theme: "dark", viewport: 768 },
                "dark desktop": { theme: "dark", viewport: 1280 }
            }
        }
    },
    args: {
        onFilterChange: () => {},
        onClear: () => {}
    }
} satisfies Meta<typeof FilterBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        filters: defaultFilters,
        hasActiveFilters: false
    }
};

export const NameFilter: Story = {
    args: {
        filters: { ...defaultFilters, name: "fern" },
        hasActiveFilters: true
    }
};

export const LocationSelected: Story = {
    args: {
        filters: { ...defaultFilters, location: "living-room" },
        hasActiveFilters: true
    }
};

export const DueForWateringToggled: Story = {
    args: {
        filters: { ...defaultFilters, dueForWatering: true },
        hasActiveFilters: true
    }
};

export const MistLeavesToggled: Story = {
    args: {
        filters: { ...defaultFilters, mistLeaves: true },
        hasActiveFilters: true
    }
};

export const SoilTypeFilter: Story = {
    args: {
        filters: { ...defaultFilters, soilType: "peat moss" },
        hasActiveFilters: true
    }
};

export const MultipleFiltersWithChips: Story = {
    args: {
        filters: {
            ...defaultFilters,
            location: "bathroom",
            luminosity: "high",
            wateringFrequency: "1-week"
        },
        hasActiveFilters: true
    }
};

export const AllFiltersActive: Story = {
    args: {
        filters: {
            name: "fern",
            location: "kitchen",
            luminosity: "low",
            mistLeaves: true,
            soilType: "sand",
            wateringFrequency: "2-weeks",
            wateringType: "deep",
            dueForWatering: true
        },
        hasActiveFilters: true
    }
};

export const HideDueForWatering: Story = {
    args: {
        filters: defaultFilters,
        hasActiveFilters: false,
        showDueForWatering: false
    }
};
