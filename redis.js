import { createClient } from "redis";


// Redis client initialization
async function initializeRedisClient() {
  const client = await createClient();
  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
  return client;
}

// Create a new user account
async function createUser(username, password, name) {
  const userKey = `user:${username}`;

  const client = await initializeRedisClient();

  // Check if the user already exists in Redis
  const userData = await client.hGetAll(userKey);
  if (userData && Object.keys(userData).length > 0) {
    throw new Error('User with this username already exists');
  }

  // Create the user in Redis
  await client.hSet(userKey, 'name', name);
  await client.hSet(userKey, 'username', username);
  await client.hSet(userKey, 'password', password);

  console.log(`User account created successfully for ${username}`);

  await client.disconnect();
}

// Delete a user account
async function deleteUser(username) {
  const userKey = `user:${username}`;

  const client = await initializeRedisClient();

  // Check if the user exists in Redis
  const userData = await client.hGetAll(userKey);
  if (!userData || Object.keys(userData).length === 0) {
    throw new Error(`Account called ${username} does not exist`);
  }

  // Delete the user data from Redis
  await client.del(userKey);

  console.log(`Account ${username} has been successfully deleted from Redis.`);

  await client.disconnect();
}

// Update user account password
async function updateAccountPassword(username, password, newPassword) {
  const userKey = `user:${username}`;

  const client = await initializeRedisClient();

  // Check if the user exists in Redis
  const userData = await client.hGetAll(userKey);
  if (!userData || Object.keys(userData).length === 0) {
    throw new Error(`Account called ${username} does not exist`);
  }

  // Checks if the user's password matches the inputted one
  if (userData.password !== password) {
    throw new Error(`Password does not match for account ${username}`);
  }

  // Update the username in Redis
  await client.hSet(userKey, 'password', newPassword);
  console.log("Password updated successfully");

  await client.disconnect();
}

// Create a new inventory for a specific account
async function createInventory(username, inventoryName) {
  const inventoryId = Math.random().toString(20);

  const client = await initializeRedisClient();

  // Add the inventory ID to the set of user inventories
  await client.sAdd(`inventories:${username}`, inventoryId);

  // Store the inventory data
  const inventoryKey = `inventory:${inventoryName}`;
  await client.hSet(inventoryKey, 'inventoryName', inventoryName);
  console.log(`Inventory ${inventoryName} created successfully for user ${username}`);

  await client.disconnect();

  return inventoryId;
}

// Add an item to a specific inventory within an account
async function addItem(username, inventoryName, item) {
    const client = await initializeRedisClient();
  
    const inventoryKey = `inventories:${username}:${inventoryName}:items`;
  
    const inventoryExists = await client.exists(inventoryKey);
    if (!inventoryExists) {
      // If the inventory doesn't exist, create a new one
      await createInventory(username, inventoryName);
    }
  
    // Add the item to the inventory
    await client.sAdd(inventoryKey, JSON.stringify(item));
  
    console.log(`Item ${item.name} added successfully to inventory ${inventoryName} for user ${username}`);
  
    await client.disconnect();
}


// Create a reminder for a specific item within an inventory of an account
async function createReminder(username, inventoryName, itemName, reminderData) {
    const client = await initializeRedisClient();

    const inventoryKey = `inventories:${username}:${inventoryName}:items`;

    const itemString = await client.sMembers(inventoryKey);

    // Parse each item string back to an object
    const items = itemString.map(item => JSON.parse(item));

    // Check if the item exists in the inventory
    const item = items.find(item => item.name === itemName);
    if (!item) {
        throw new Error(`Item ${itemName} does not exist in inventory ${inventoryName}`);
    }

    // Add reminder data to the item
    await client.hSet(`reminder:${username}:${inventoryName}:${itemName}`, 'reminder', JSON.stringify(reminderData));
    console.log(`Reminder created successfully for item ${itemName} in inventory ${inventoryName}`);

    await client.disconnect();
}


// Delete a reminder for a specific item within an inventory of an account
async function deleteReminder(username, inventoryName, itemName) {
  const itemKey = `item:${itemName}`;

  const client = await initializeRedisClient();

  // Delete the reminder for the item
  await client.hDel(itemKey, 'reminder');
  console.log(`Reminder deleted successfully for item ${itemName} in inventory ${inventoryName}`);

  await client.disconnect();
}
