import type { Plant } from "../../entities/plants/types.ts";

const plantSpecies = [
    { name: "Monstera Deliciosa", family: "Araceae" },
    { name: "Fiddle Leaf Fig", family: "Moraceae" },
    { name: "Snake Plant", family: "Asparagaceae" },
    { name: "Pothos", family: "Araceae" },
    { name: "Peace Lily", family: "Araceae" },
    { name: "Spider Plant", family: "Asparagaceae" },
    { name: "Rubber Plant", family: "Moraceae" },
    { name: "ZZ Plant", family: "Araceae" },
    { name: "Aloe Vera", family: "Asphodelaceae" },
    { name: "Bird of Paradise", family: "Strelitziaceae" },
    { name: "Calathea Orbifolia", family: "Marantaceae" },
    { name: "Chinese Evergreen", family: "Araceae" },
    { name: "Dracaena Marginata", family: "Asparagaceae" },
    { name: "English Ivy", family: "Araliaceae" },
    { name: "Fern Boston", family: "Nephrolepidaceae" },
    { name: "Golden Barrel Cactus", family: "Cactaceae" },
    { name: "Hoya Carnosa", family: "Apocynaceae" },
    { name: "Jade Plant", family: "Crassulaceae" },
    { name: "Kentia Palm", family: "Arecaceae" },
    { name: "Lavender", family: "Lamiaceae" },
    { name: "Maidenhair Fern", family: "Pteridaceae" },
    { name: "Neon Pothos", family: "Araceae" },
    { name: "Orchid Phalaenopsis", family: "Orchidaceae" },
    { name: "Parlor Palm", family: "Arecaceae" },
    { name: "Philodendron Brasil", family: "Araceae" },
    { name: "Ponytail Palm", family: "Asparagaceae" },
    { name: "Prayer Plant", family: "Marantaceae" },
    { name: "Rattlesnake Plant", family: "Marantaceae" },
    { name: "String of Pearls", family: "Asteraceae" },
    { name: "Swiss Cheese Plant", family: "Araceae" },
    { name: "Tradescantia Zebrina", family: "Commelinaceae" },
    { name: "Umbrella Plant", family: "Araliaceae" },
    { name: "Venus Fly Trap", family: "Droseraceae" },
    { name: "Wandering Jew", family: "Commelinaceae" },
    { name: "Yucca", family: "Asparagaceae" },
    { name: "Zebra Plant", family: "Acanthaceae" },
    { name: "African Violet", family: "Gesneriaceae" },
    { name: "Begonia Rex", family: "Begoniaceae" },
    { name: "Croton", family: "Euphorbiaceae" },
    { name: "Dieffenbachia", family: "Araceae" },
    { name: "Elephant Ear", family: "Araceae" },
    { name: "Ficus Audrey", family: "Moraceae" },
    { name: "Gardenia", family: "Rubiaceae" },
    { name: "Heartleaf Philodendron", family: "Araceae" },
    { name: "Inch Plant", family: "Commelinaceae" },
    { name: "Japanese Maple Bonsai", family: "Sapindaceae" },
    { name: "Kangaroo Paw Fern", family: "Polypodiaceae" },
    { name: "Lucky Bamboo", family: "Asparagaceae" },
    { name: "Money Tree", family: "Malvaceae" },
    { name: "Norfolk Island Pine", family: "Araucariaceae" },
    { name: "Oxalis Triangularis", family: "Oxalidaceae" },
    { name: "Peperomia Watermelon", family: "Piperaceae" },
    { name: "Queen Anthurium", family: "Araceae" },
    { name: "Rosemary", family: "Lamiaceae" },
    { name: "Sago Palm", family: "Cycadaceae" },
    { name: "Tiger Tooth Aloe", family: "Asphodelaceae" },
    { name: "Urn Plant", family: "Bromeliaceae" },
    { name: "Velvet Calathea", family: "Marantaceae" },
    { name: "Wax Plant", family: "Apocynaceae" },
    { name: "Xerographica", family: "Bromeliaceae" },
    { name: "Yesterday Today Tomorrow", family: "Solanaceae" },
    { name: "Zanzibar Gem", family: "Araceae" },
    { name: "Alocasia Polly", family: "Araceae" },
    { name: "Boston Fern", family: "Nephrolepidaceae" },
    { name: "Cast Iron Plant", family: "Asparagaceae" },
    { name: "Dragon Tree", family: "Asparagaceae" },
    { name: "Echeveria", family: "Crassulaceae" },
    { name: "Flamingo Flower", family: "Araceae" },
    { name: "Gerbera Daisy", family: "Asteraceae" },
    { name: "Haworthia", family: "Asphodelaceae" },
    { name: "Ivy Geranium", family: "Geraniaceae" },
    { name: "Jasmine", family: "Oleaceae" },
    { name: "Kalanchoe", family: "Crassulaceae" },
    { name: "Lipstick Plant", family: "Gesneriaceae" },
    { name: "Majesty Palm", family: "Arecaceae" },
    { name: "Nerve Plant", family: "Acanthaceae" }
] as const;

const soilTypes = ["Potting mix", "Cactus mix", "Orchid bark", "Peat moss", "Sandy loam", "Clay mix", "Perlite blend", "Coconut coir"] as const;

const wateringQuantities = ["50ml", "100ml", "150ml", "200ml", "250ml", "300ml", "400ml", "500ml"] as const;

const locationIds = ["basement", "bathroom", "bedroom", "dining-room", "living-room", "kitchen"] as const;
const luminosityIds = ["low", "medium", "high"] as const;
const wateringFrequencyIds = ["0.5-week", "1-week", "1.5-weeks", "2-weeks", "2.5-weeks"] as const;
const wateringTypeIds = ["deep", "surface"] as const;

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomDate(daysFromNow: number, spread: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow + Math.floor(Math.random() * spread));
    date.setHours(0, 0, 0, 0);

    return date;
}

function generateId(): string {
    // Use crypto.randomUUID when available, fallback for environments without it
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function generatePlants(count?: number, userId?: string): Plant[] {
    const total = count ?? 220 + Math.floor(Math.random() * 60);
    const plants: Plant[] = [];

    for (let i = 0; i < total; i++) {
        const species = pick(plantSpecies);
        const suffix = i >= plantSpecies.length ? ` #${Math.floor(i / plantSpecies.length) + 1}` : "";

        const isDue = Math.random() < 0.2;
        const nextWateringDate = isDue ? randomDate(-7, 7) : randomDate(1, 14);
        const creationDate = randomDate(-90, 60);

        plants.push({
            id: generateId(),
            userId: userId ?? "user-alice",
            name: `${species.name}${suffix}`,
            description: Math.random() > 0.3 ? `A beautiful ${species.name.toLowerCase()} plant.` : undefined,
            family: species.family,
            location: pick(locationIds),
            luminosity: pick(luminosityIds),
            mistLeaves: Math.random() > 0.4,
            soilType: Math.random() > 0.3 ? pick(soilTypes) : undefined,
            wateringFrequency: pick(wateringFrequencyIds),
            wateringQuantity: pick(wateringQuantities),
            wateringType: pick(wateringTypeIds),
            nextWateringDate,
            creationDate,
            lastUpdateDate: new Date()
        });
    }

    return plants;
}

// Pre-generated stable seed data for consistent dev experience
export const defaultSeedPlants: Plant[] = generatePlants(125, "user-alice").concat(generatePlants(125, "user-bob"));
