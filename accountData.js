import { createClient } from 'redis';

console.log("Connecting to Redis");
const redisClient = createClient();

redisClient.on('error', err => console.log('Redis Client Error', err));
await redisClient.connect();
console.log("Connected to Redis");


// creates a new user account with a new username, password, and inputs their name
async function createUserAccount(username, password, name) {
    const userKey = `user:${username}`;

    // Check if the user already exists in Redis
    const userData = await redisClient.hGetAll(userKey);
    if (userData && Object.keys(userData).length > 0) {
        throw new Error('User with this username already exists');
    }

    // Create the user in Redis
    await redisClient.hSet(userKey, 'name', name);
    await redisClient.hSet(userKey, 'username', username);
    await redisClient.hSet(userKey, 'password', password);

    console.log(`User account created successfully for ${username}`);
}


// updates a user accounts password if the password matches with the old password
async function updateAccountPassword(username, password, newPassword) {
    const userKey = `user:${username}`;

    // Check if the user exists in Redis
    const userData = await redisClient.hGetAll(userKey);
    if (!userData || Object.keys(userData).length === 0) {
        throw new Error(`Account called ${username} does not exist`);
    }

    // Checks if the users password is the same as the inputted one
    if (userData.password !== password) {
        throw new Error(`Password does not match for account ${username}`);
    }

    // Update the username in Redis
    await redisClient.hSet(userKey, 'password', newPassword);
    console.log("Password updated successfully");
}


// deletes a user account if the username and password match
async function deleteAccount(username, password) {
    const userKey = `user:${username}`;

    // Check if the user exists in Redis
    const userData = await redisClient.hGetAll(userKey);
    if (!userData || Object.keys(userData).length === 0) {
        throw new Error(`Account called ${username} does not exist in Redis`);
    }

    // Check if the provided password matches the stored password
    if (userData.password !== password) {
        throw new Error(`Password does not match for account ${username}`);
    }

    // Delete the user data from Redis
    await redisClient.del(userKey);

    console.log(`Account ${username} has been successfully deleted from Redis.`);
}


// gets users inventory count
// async function getUserInventoryCount(username) {
//     const userDataArray = await getAllUserData();
//     let inventoryCount = 0;

//     for (const userData of userDataArray) {
//         // checks if userData is the user we are looking for 
//         if (userData.username === username) {
//             const { inventories } = userData; 
//             // Check if inventories is an array
//             if (Array.isArray(inventories)) {
//                 inventoryCount += inventories.length;
//             // Increment count if inventories is not an array but exists
//             } else if (inventories) {
//                 inventoryCount++; 
//             }
//         }
//     }

//     console.log(`${username} has ${inventoryCount} inventories.`);
//     return inventoryCount;
// }


async function getUserInventoryCount(username) {
    const userKey = `user:${username}`;
    const userData = await redisClient.hGetAll(userKey);
    let inventoryCount = 0;

    if (userData.inventories) {
        // If the user has inventories, count them
        inventoryCount = Array.isArray(userData.inventories) ? userData.inventories.length : 1;
    }

    console.log(`${username} has ${inventoryCount} inventories.`);
    return inventoryCount;
}



// creates a new inventory under a username with the inventoryName
// async function createNewInventory(username, inventoryName) {
//     // creates a inventoryId
//     const inventoryId = Math.random().toString(20);
//     await redisClient.sAdd(`username:${username}`, inventoryId);
//     await redisClient.hSet(inventoryId, 'inventoryName', inventoryName);
// }
async function createNewInventory(username, inventoryName) {
    // Generate a unique inventory ID
    const inventoryId = Math.random().toString(20);

    // Add the inventory ID to the set of user inventories
    await redisClient.sAdd(`inventories:${username}`, inventoryId);

    // Store the inventory data
    const inventoryKey = `inventory:${inventoryId}`;
    await redisClient.hSet(inventoryKey, 'inventoryName', inventoryName);
    console.log(`Inventory ${inventoryName} created successfully for user ${username}`);

    return inventoryId;
}


// adds a list of items in a inventory under username 
async function addItems(username, inventoryName, itemsList) {
    const inventoryId = await redisClient.sMembers(`inventories:${username}`);

    if (!inventoryId || inventoryId.length === 0) {
        // If the inventory doesn't exist, create a new one
        await createNewInventory(username, inventoryName);
    }

    for (const item of itemsList) {
        const itemName = item.name;
        const itemKey = `item:${itemName}`;
        await redisClient.hSet(itemKey, 'items', JSON.stringify(item));
    }

    console.log(`Items added successfully to inventory ${inventoryName} for user ${username}`);
}



// creates a new reminder for an item in an inventory under username 
async function createReminder(username, inventoryName, itemName, reminderData) {
    const inventoryId = await redisClient.sMembers(`inventories:${username}`);

    if (!inventoryId || inventoryId.length === 0) {
        throw new Error(`Inventory ${inventoryName} does not exist for user ${username}`);
    }

    const inventoryKey = `inventory:${inventoryId[0]}`;
    const itemKey = `item:${itemName}`;

    // Check if the item exists in the inventory
    const itemExists = await redisClient.exists(itemKey);
    if (!itemExists) {
        throw new Error(`Item ${itemName} does not exist in inventory ${inventoryName}`);
    }

    // Add reminder data to the item
    await redisClient.hSet(itemKey, 'reminder', JSON.stringify(reminderData));
    console.log(`Reminder created successfully for item ${itemName} in inventory ${inventoryName}`);
}


// deletes a reminder for an item in an inventory under username 
async function deleteReminder(username, inventoryName, itemName) {
    const userKey = `user:${username}`;
    const inventoryKey = `inventory:${inventoryName}`;
    const itemKey = `item:${itemName}`;

    // Check if the user exists in Redis
    const userData = await redisClient.hGetAll(userKey);
    if (!userData || Object.keys(userData).length === 0) {
        throw new Error(`User ${username} does not exist`);
    }

    // Check if the inventory exists for the user
    const inventoryExists = await redisClient.exists(inventoryKey);
    if (!inventoryExists) {
        throw new Error(`Inventory ${inventoryName} does not exist for user ${username}`);
    }

    // Check if the item exists in the inventory
    const itemExists = await redisClient.sIsMember(inventoryKey, itemKey);
    if (!itemExists) {
        throw new Error(`Item ${itemName} does not exist in inventory ${inventoryName}`);
    }

    // Delete the reminder for the item
    await redisClient.hDel(itemKey, 'reminder');
    console.log(`Reminder deleted successfully for item ${itemName} in inventory ${inventoryName}`);
}




// sample itemslist
const itemsList = [
    {
        _id: 43,
        name: "Toothpaste",
        usesLeft: 2,
        store: {
            id: 1,
            name: "Supermart",
            address: "123 Main St"
        },
        reminders: {
            id: 1,
            name: "Buy toothpaste",
            daysTillPurchase: 3
        },
        itemType: {
            id: 1,
            consumableType: "personal care",
            daysTillExpiration: 90,
            brandName: "Colgate"
        }
    },
    {
        _id: 93,
        name: "Shampoo",
        usesLeft: 1,
        store: {
            id: 2,
            name: "Cosmo Mart",
            address: "456 Oak St"
        },
        reminders: {
            id: 2,
            name: "Buy shampoo",
            daysTillPurchase: 5
        },
        itemType: {
            id: 2,
            consumableType: "personal care",
            daysTillExpiration: 120,
            brandName: "Head & Shoulders"
        }
    }
];



// await createUserAccount('testerAccount', 'testingPassword', 'Testing');
// await updateAccountPassword('testerAccount', 'testingPassword', 'stongerPassword');

await getUserInventoryCount('testerAccount');

await addItems('testerAccount', 'hygiene', itemsList);

await getUserInventoryCount('testerAccount');

await createReminder('testerAccount', 'hygiene', 'Toothpaste', {name: 'nextBuy', daysTillPurchase: 12});

await deleteReminder('testerAccount', 'hygiene', 'Toothpaste');

await deleteAccount('testerAccount', 'stongerPassword');

await redisClient.disconnect();
console.log("Disconnected from Redis");
