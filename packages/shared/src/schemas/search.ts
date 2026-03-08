export interface SearchInventoryDto {
    id: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    category: string;
    rank: number;
}

export interface SearchItemDto {
    id: string;
    customId: string;
    searchText: string | null;
    inventoryId: string;
    inventoryTitle: string;
    rank: number;
}

export interface SearchResponseDto {
    inventories: SearchInventoryDto[];
    items: SearchItemDto[];
}
