import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Seeding database...');

    // --- Seed User (acts as owner for all seed data) ---
    const seedUser = await prisma.user.upsert({
        where: {
            provider_providerId: {
                provider: 'seed',
                providerId: 'seed-admin-001',
            },
        },
        update: {},
        create: {
            name: 'Seed Admin',
            email: 'admin@example.com',
            provider: 'seed',
            providerId: 'seed-admin-001',
            role: 'ADMIN',
            preferedLanguage: 'en',
            preferedTheme: 'system',
        },
    });

    const regularUser = await prisma.user.upsert({
        where: {
            provider_providerId: {
                provider: 'seed',
                providerId: 'seed-user-001',
            },
        },
        update: {},
        create: {
            name: 'Jane Tester',
            email: 'jane@example.com',
            provider: 'seed',
            providerId: 'seed-user-001',
            role: 'USER',
            preferedLanguage: 'en',
            preferedTheme: 'light',
        },
    });

    console.log(`  Users: ${seedUser.name}, ${regularUser.name}`);

    // --- Tags ---
    const tagNames = [
        'vintage',
        'electronics',
        'rare',
        'office',
        'personal',
        'tools',
        'books',
        'collectible',
    ];
    const tags: Record<string, { id: string }> = {};
    for (const name of tagNames) {
        tags[name] = await prisma.tag.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    console.log(`  Tags: ${tagNames.length} created`);

    // --- Inventory 1: Book Collection ---
    const bookInv = await prisma.inventory.upsert({
        where: { id: 'seed-inv-books' },
        update: {},
        create: {
            id: 'seed-inv-books',
            title: 'Personal Library',
            description:
                'A curated collection of **technical books** and novels.\n\nIncludes first editions and signed copies.',
            category: 'BOOKS',
            isPublic: true,
            createdById: seedUser.id,
            idCounter: 3,
            tags: {
                create: [
                    { tag: { connect: { id: tags['books']!.id } } },
                    { tag: { connect: { id: tags['collectible']!.id } } },
                    { tag: { connect: { id: tags['personal']!.id } } },
                ],
            },
        },
    });

    const bookFields = await Promise.all([
        prisma.customField.upsert({
            where: {
                inventoryId_title: { inventoryId: bookInv.id, title: 'Author' },
            },
            update: {},
            create: {
                inventoryId: bookInv.id,
                fieldType: 'STRING',
                title: 'Author',
                sortOrder: 0,
                showInTable: true,
            },
        }),
        prisma.customField.upsert({
            where: {
                inventoryId_title: {
                    inventoryId: bookInv.id,
                    title: 'Year Published',
                },
            },
            update: {},
            create: {
                inventoryId: bookInv.id,
                fieldType: 'NUMBER',
                title: 'Year Published',
                sortOrder: 1,
                showInTable: true,
            },
        }),
        prisma.customField.upsert({
            where: {
                inventoryId_title: { inventoryId: bookInv.id, title: 'Read' },
            },
            update: {},
            create: {
                inventoryId: bookInv.id,
                fieldType: 'BOOLEAN',
                title: 'Read',
                sortOrder: 2,
                showInTable: true,
            },
        }),
    ]);

    // Custom ID format: BOOK-001, BOOK-002...
    await prisma.customIdElement.deleteMany({
        where: { inventoryId: bookInv.id },
    });
    await prisma.customIdElement.createMany({
        data: [
            {
                inventoryId: bookInv.id,
                elementType: 'FIXED_TEXT',
                config: { text: 'BOOK-' },
                sortOrder: 0,
            },
            {
                inventoryId: bookInv.id,
                elementType: 'SEQUENCE',
                config: { minLength: 3 },
                sortOrder: 1,
            },
        ],
    });

    // Items
    const bookItems = [
        {
            customId: 'BOOK-001',
            author: 'Robert C. Martin',
            year: 2008,
            read: true,
        },
        {
            customId: 'BOOK-002',
            author: 'Martin Kleppmann',
            year: 2017,
            read: true,
        },
        {
            customId: 'BOOK-003',
            author: 'Frank Herbert',
            year: 1965,
            read: false,
        },
    ];

    for (const book of bookItems) {
        const item = await prisma.item.upsert({
            where: {
                inventoryId_customId: {
                    inventoryId: bookInv.id,
                    customId: book.customId,
                },
            },
            update: {},
            create: {
                inventoryId: bookInv.id,
                customId: book.customId,
                createdById: seedUser.id,
                searchText: `${book.author} ${book.year}`,
                fieldValues: {
                    create: [
                        {
                            customFieldId: bookFields[0]!.id,
                            valueString: book.author,
                        },
                        {
                            customFieldId: bookFields[1]!.id,
                            valueNumber: book.year,
                        },
                        {
                            customFieldId: bookFields[2]!.id,
                            valueBoolean: book.read,
                        },
                    ],
                },
            },
        });

        // Add a like from the other user
        await prisma.itemLike.upsert({
            where: {
                userId_itemId: { userId: regularUser.id, itemId: item.id },
            },
            update: {},
            create: { userId: regularUser.id, itemId: item.id },
        });
    }

    console.log(`  Inventory "${bookInv.title}": ${bookItems.length} items`);

    // --- Inventory 2: Office Electronics ---
    const elecInv = await prisma.inventory.upsert({
        where: { id: 'seed-inv-electronics' },
        update: {},
        create: {
            id: 'seed-inv-electronics',
            title: 'Office Equipment',
            description:
                'Tracking office electronics — monitors, keyboards, docking stations.',
            category: 'ELECTRONICS',
            isPublic: true,
            createdById: seedUser.id,
            idCounter: 4,
            tags: {
                create: [
                    { tag: { connect: { id: tags['electronics']!.id } } },
                    { tag: { connect: { id: tags['office']!.id } } },
                ],
            },
        },
    });

    const elecFields = await Promise.all([
        prisma.customField.upsert({
            where: {
                inventoryId_title: { inventoryId: elecInv.id, title: 'Brand' },
            },
            update: {},
            create: {
                inventoryId: elecInv.id,
                fieldType: 'STRING',
                title: 'Brand',
                sortOrder: 0,
                showInTable: true,
            },
        }),
        prisma.customField.upsert({
            where: {
                inventoryId_title: { inventoryId: elecInv.id, title: 'Price' },
            },
            update: {},
            create: {
                inventoryId: elecInv.id,
                fieldType: 'NUMBER',
                title: 'Price',
                sortOrder: 1,
                showInTable: true,
            },
        }),
        prisma.customField.upsert({
            where: {
                inventoryId_title: {
                    inventoryId: elecInv.id,
                    title: 'Manual URL',
                },
            },
            update: {},
            create: {
                inventoryId: elecInv.id,
                fieldType: 'DOCUMENT',
                title: 'Manual URL',
                sortOrder: 2,
                showInTable: false,
            },
        }),
    ]);

    await prisma.customIdElement.deleteMany({
        where: { inventoryId: elecInv.id },
    });
    await prisma.customIdElement.createMany({
        data: [
            {
                inventoryId: elecInv.id,
                elementType: 'FIXED_TEXT',
                config: { text: 'EQ-' },
                sortOrder: 0,
            },
            {
                inventoryId: elecInv.id,
                elementType: 'RANDOM_6DIGIT',
                config: {},
                sortOrder: 1,
            },
        ],
    });

    const elecItems = [
        { customId: 'EQ-100001', brand: 'Dell', price: 349.99 },
        { customId: 'EQ-100002', brand: 'Logitech', price: 79.99 },
        { customId: 'EQ-100003', brand: 'Apple', price: 1299.0 },
        { customId: 'EQ-100004', brand: 'Samsung', price: 449.0 },
    ];

    for (const eq of elecItems) {
        await prisma.item.upsert({
            where: {
                inventoryId_customId: {
                    inventoryId: elecInv.id,
                    customId: eq.customId,
                },
            },
            update: {},
            create: {
                inventoryId: elecInv.id,
                customId: eq.customId,
                createdById: seedUser.id,
                searchText: eq.brand,
                fieldValues: {
                    create: [
                        {
                            customFieldId: elecFields[0]!.id,
                            valueString: eq.brand,
                        },
                        {
                            customFieldId: elecFields[1]!.id,
                            valueNumber: eq.price,
                        },
                    ],
                },
            },
        });
    }

    console.log(`  Inventory "${elecInv.title}": ${elecItems.length} items`);

    // --- Inventory 3: Private tool collection (not public) ---
    const toolInv = await prisma.inventory.upsert({
        where: { id: 'seed-inv-tools' },
        update: {},
        create: {
            id: 'seed-inv-tools',
            title: 'Workshop Tools',
            description: 'Private workshop tool tracking.',
            category: 'TOOLS',
            isPublic: false,
            createdById: regularUser.id,
            idCounter: 2,
            tags: {
                create: [
                    { tag: { connect: { id: tags['tools']!.id } } },
                    { tag: { connect: { id: tags['personal']!.id } } },
                ],
            },
        },
    });

    console.log(
        `  Inventory "${toolInv.title}": private, owned by ${regularUser.name}`,
    );

    // --- Comments on book inventory ---
    const existingComments = await prisma.comment.count({
        where: { inventoryId: bookInv.id },
    });
    if (existingComments === 0) {
        await prisma.comment.createMany({
            data: [
                {
                    inventoryId: bookInv.id,
                    authorId: regularUser.id,
                    content:
                        'Great collection! Have you read **Clean Architecture** by the same author?',
                },
                {
                    inventoryId: bookInv.id,
                    authorId: seedUser.id,
                    content:
                        "Thanks! It's on my list. I'm also looking for a good copy of *The Pragmatic Programmer*.",
                },
                {
                    inventoryId: bookInv.id,
                    authorId: regularUser.id,
                    content:
                        'Dune is a must-read. The worldbuilding is incredible.',
                },
            ],
        });
        console.log('  Comments: 3 on Personal Library');
    }

    // --- Access: give regularUser write access to electronics ---
    await prisma.inventoryAccess.upsert({
        where: {
            inventoryId_userId: {
                inventoryId: elecInv.id,
                userId: regularUser.id,
            },
        },
        update: {},
        create: { inventoryId: elecInv.id, userId: regularUser.id },
    });

    console.log('  Access: Jane Tester → Office Equipment');
    console.log('\nSeed completed successfully!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
