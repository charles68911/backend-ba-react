
import { db, pool } from "./index.js";

import { customers, products, sales, transactions, inventory } from "./schema.js";

// Sample customer names
const customerNames = [
  "Juan Dela Cruz",
  "Maria Santos",
  "Pedro Garcia",
  "Ana Reyes",
  "Jose Ramos",
  "Carlo Mendoza",
  "Sofia Cruz",
  "Mark Flores",
  "Angela Torres",
  "Daniel Lopez",
];

// Sample customer locations
const locations = [
  "Cordova",
  "Lapu-Lapu City",
  "Cebu City",
  "Mandaue City",
  "Talisay City",
];

// Types of customers
const customerTypes = [
  "Retail",
  "Wholesale",
  "Restaurant",
  "Reseller",
];

// Sample seafood products
const productNames = [
  "Bangus",
  "Tilapia",
  "Yellowfin Tuna",
  "Squid",
  "Shrimp",
  "Crab",
  "Pampano",
  "Mackerel",
  "Salmon",
  "Blue Marlin",
];

// Categories of seafood products
const productCategories = [
  "Fish",
  "Shellfish",
  "Cephalopod",
];

// Function to generate and insert 50 customers
async function seedCustomers() {
  try {
    const customerData = Array.from({ length: 50 }, (_, index) => ({
      customerName: `${customerNames[index % customerNames.length]} ${index + 1}`,
      customerType: customerTypes[index % customerTypes.length],
      location: locations[index % locations.length],
      contactNumber: `09${String(170000000 + index).padStart(9, "0")}`,
    }));

    const insertedCustomers = await db
      .insert(customers)
      .values(customerData)
      .returning({ id: customers.id });

    console.log(`Successfully added ${insertedCustomers.length} customers!`);

    return insertedCustomers.map((customer) => customer.id);
  } catch (error) {
    console.error("Error seeding customers:", error);
    throw error;
  }
}

// Function to generate and insert 50 products
async function seedProducts() {
  try {
    const productData = Array.from({ length: 50 }, (_, index) => {
      const costPrice = 100 + (index % 10) * 15;
      const unitPrice = costPrice + 30;

      return {
        productName: productNames[index % productNames.length],
        category: productCategories[index % productCategories.length],
        costPrice: costPrice.toFixed(2),
        unitPrice: unitPrice.toFixed(2),
      };
    });

    const insertedProducts = await db
      .insert(products)
      .values(productData)
      .returning({ id: products.id });

    console.log(`Successfully added ${insertedProducts.length} products!`);

    return insertedProducts.map((product) => product.id);
  } catch (error) {
    console.error("Error seeding products:", error);
    throw error;
  }
}

// Function to generate and insert 50 sales records
async function seedSales(
  customerIds: number[],
  productIds: number[],
) {
  try {
    const salesData = Array.from({ length: 50 }, (_, index) => {
      const customerId = customerIds[index % customerIds.length];
      const productId = productIds[index % productIds.length];

      const quantity = (index % 10) + 1;

      const unitPrice = 130 + (index % 10) * 15;
      const totalAmount = quantity * unitPrice;

      const month = String((index % 12) + 1).padStart(2, "0");
      const day = String((index % 28) + 1).padStart(2, "0");

      return {
        customerId,
        productId,
        quantity,
        totalAmount: totalAmount.toFixed(2),
        saleDate: `2026-${month}-${day}`,
      };
    });

    const insertedSales = await db
      .insert(sales)
      .values(salesData)
      .returning({ id: sales.id });

    console.log(`Successfully added ${insertedSales.length} sales records!`);

    return insertedSales.map((sale) => sale.id);
  } catch (error) {
    console.error("Error seeding sales:", error);
    throw error;
  }
}

// Function to generate and insert 50 transaction records
async function seedTransactions(saleIds: number[]) {
  try {
    const paymentMethods = [
      "Cash",
      "GCash",
      "Bank Transfer",
      "Credit Card",
    ];

    const transactionData = Array.from(
      { length: saleIds.length },
      (_, index) => {
        const saleId = saleIds[index];

        const quantity = (index % 10) + 1;
        const unitPrice = 130 + (index % 10) * 15;
        const totalAmount = quantity * unitPrice;

        const paymentStatus = index % 5 === 0 ? "Pending" : "Paid";

        return {
          saleId,
          paymentMethod: paymentMethods[index % paymentMethods.length],
          paymentStatus,
          amountPaid:
            paymentStatus === "Paid" ? totalAmount.toFixed(2) : "0.00",
          transactionDate: new Date(
            2026,
            index % 12,
            (index % 28) + 1,
          ),
        };
      },
    );

    const insertedTransactions = await db
      .insert(transactions)
      .values(transactionData)
      .returning({ id: transactions.id });

    console.log(
      `Successfully added ${insertedTransactions.length} transactions!`,
    );
  } catch (error) {
    console.error("Error seeding transactions:", error);
    throw error;
  }
}

// Function to generate inventory records
async function seedInventory(productIds: number[]) {
  try {
    const inventoryData = productIds.map((productId, index) => ({
      productId,
      currentStock: 10 + (index % 41),
      reorderLevel: 15,
    }));

    const insertedInventory = await db
      .insert(inventory)
      .values(inventoryData)
      .returning({ id: inventory.id });

    console.log(
      `Successfully added ${insertedInventory.length} inventory records!`,
    );
  } catch (error) {
    console.error("Error seeding inventory:", error);
    throw error;
  }
}

// Function to run all database seeding functions
async function seedDatabase() {
  try {
    const customerIds = await seedCustomers();

    const productIds = await seedProducts();

    const saleIds = await seedSales(customerIds, productIds);

    await seedTransactions(saleIds);

    await seedInventory(productIds);

    console.log("All sample data has been inserted successfully!");
  } catch (error) {
    console.error("Database seeding failed:", error);
  } finally {
    await pool.end();
  }
}

// Run the database seeding process
seedDatabase();
