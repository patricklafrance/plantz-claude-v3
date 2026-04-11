const FREQUENCY_DAYS: Record<string, number> = {
    "0.5-week": 3.5,
    "1-week": 7,
    "1.5-weeks": 10.5,
    "2-weeks": 14,
    "2.5-weeks": 17.5
};

export function getFrequencyDays(frequency: string): number {
    return FREQUENCY_DAYS[frequency] ?? 7;
}
