export const locations = [
    { id: "basement", label: "Basement" },
    { id: "bathroom", label: "Bathroom" },
    { id: "bedroom", label: "Bedroom" },
    { id: "dining-room", label: "Dining room" },
    { id: "living-room", label: "Living room" },
    { id: "kitchen", label: "Kitchen" }
] as const;

export const luminosities = [
    { id: "low", label: "Low" },
    { id: "medium", label: "Medium" },
    { id: "high", label: "High" }
] as const;

export const wateringFrequencies = [
    { id: "0.5-week", label: "0.5 week" },
    { id: "1-week", label: "1 week" },
    { id: "1.5-weeks", label: "1.5 weeks" },
    { id: "2-weeks", label: "2 weeks" },
    { id: "2.5-weeks", label: "2.5 weeks" }
] as const;

export const wateringTypes = [
    { id: "deep", label: "Deep" },
    { id: "surface", label: "Surface" }
] as const;
