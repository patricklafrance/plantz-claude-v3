import type { Meta, StoryObj } from "@storybook/react-vite";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog.tsx";

const meta = {
    title: "Management/Inventory/Components/DeleteConfirmDialog",
    component: DeleteConfirmDialog,
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
        open: true,
        onOpenChange: () => {},
        onConfirm: () => {}
    }
} satisfies Meta<typeof DeleteConfirmDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SinglePlant: Story = {
    args: {
        plantNames: ["Monstera Deliciosa"]
    }
};

export const MultiplePlants: Story = {
    args: {
        plantNames: ["Monstera Deliciosa", "Golden Pothos", "Snake Plant"]
    }
};

export const ManyPlants: Story = {
    args: {
        plantNames: [
            "Monstera Deliciosa",
            "Golden Pothos",
            "Snake Plant",
            "Peace Lily",
            "Fiddle Leaf Fig",
            "Spider Plant",
            "Rubber Plant",
            "Aloe Vera",
            "Bird of Paradise",
            "ZZ Plant",
            "Philodendron",
            "Calathea Orbifolia",
            "String of Pearls",
            "Chinese Money Plant",
            "Boston Fern",
            "Jade Plant",
            "African Violet",
            "Dracaena Marginata",
            "Croton Petra",
            "Anthurium Clarinervium"
        ]
    }
};

export const LongPlantName: Story = {
    args: {
        plantNames: [
            "Philodendron Birkin Variegated Extra Special Limited Edition Tropical Houseplant",
            "Monstera Adansonii Swiss Cheese Variegated Albo Borsigiana Extremely Rare Collector Item",
            "Begonia Maculata Polka Dot Angel Wing Silver Spotted Premium Indoor Collection"
        ]
    }
};

export const EmptyPlantNames: Story = {
    args: {
        plantNames: []
    }
};

export const Closed: Story = {
    args: {
        open: false,
        plantNames: ["Monstera Deliciosa"]
    }
};
