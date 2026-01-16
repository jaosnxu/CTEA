/**
 * System Health Check Script
 *
 * Comprehensive health check for the CHUTEA system:
 * 1. Database connection test
 * 2. API endpoints test
 * 3. Data integrity check
 * 4. Generate health report
 */

import { getPrismaClient } from "../server/src/db/prisma";
import axios from "axios";

const prisma = getPrismaClient();

interface HealthCheckResult {
  category: string;
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  details?: any;
}

const results: HealthCheckResult[] = [];

async function checkDatabaseConnection(): Promise<void> {
  console.log("🗄️  Database Connection Tests");
  console.log("============================\n");

  try {
    // Test basic connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
    results.push({
      category: "Database",
      test: "Connection",
      status: "PASS",
      message: "Database connection established",
    });

    // Test table access
    const tables = ["organizations", "stores", "products", "users", "orders"];
    for (const table of tables) {
      try {
        const count = await (prisma as any)[table].count();
        console.log(`✅ Table ${table}: ${count} records`);
        results.push({
          category: "Database",
          test: `Table ${table}`,
          status: "PASS",
          message: `${count} records found`,
          details: { count },
        });
      } catch (error) {
        console.log(`❌ Table ${table}: Access failed`);
        results.push({
          category: "Database",
          test: `Table ${table}`,
          status: "FAIL",
          message: "Table access failed",
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  } catch (error) {
    console.log("❌ Database connection failed");
    results.push({
      category: "Database",
      test: "Connection",
      status: "FAIL",
      message: "Database connection failed",
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

async function checkAPIEndpoints(): Promise<void> {
  console.log("\n🌐 API Endpoints Tests");
  console.log("======================\n");

  const baseUrl = process.env.API_URL || "http://localhost:3000";
  const endpoints = [
    { path: "/api/health", method: "GET", name: "Health Check" },
    { path: "/api/products", method: "GET", name: "Products List" },
    { path: "/api/stores", method: "GET", name: "Stores List" },
    { path: "/api/orders", method: "GET", name: "Orders List" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method.toLowerCase() as any,
        url: `${baseUrl}${endpoint.path}`,
        timeout: 5000,
        validateStatus: () => true, // Don't throw on any status
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(
          `✅ ${endpoint.method} ${endpoint.path}: ${response.status} OK`
        );
        results.push({
          category: "API",
          test: endpoint.name,
          status: "PASS",
          message: `HTTP ${response.status}`,
          details: { path: endpoint.path, method: endpoint.method },
        });
      } else if (response.status === 404) {
        console.log(
          `⚠️  ${endpoint.method} ${endpoint.path}: ${response.status} (endpoint may not exist yet)`
        );
        results.push({
          category: "API",
          test: endpoint.name,
          status: "WARN",
          message: `HTTP ${response.status} - Endpoint not found`,
          details: { path: endpoint.path, method: endpoint.method },
        });
      } else {
        console.log(
          `❌ ${endpoint.method} ${endpoint.path}: ${response.status}`
        );
        results.push({
          category: "API",
          test: endpoint.name,
          status: "FAIL",
          message: `HTTP ${response.status}`,
          details: { path: endpoint.path, method: endpoint.method },
        });
      }
    } catch (error: any) {
      if (error.code === "ECONNREFUSED") {
        console.log(
          `⚠️  ${endpoint.method} ${endpoint.path}: Server not running`
        );
        results.push({
          category: "API",
          test: endpoint.name,
          status: "WARN",
          message: "Server not running",
          details: { path: endpoint.path, note: "Start server with: pnpm dev" },
        });
      } else {
        console.log(`❌ ${endpoint.method} ${endpoint.path}: ${error.message}`);
        results.push({
          category: "API",
          test: endpoint.name,
          status: "FAIL",
          message: error.message,
          details: { path: endpoint.path },
        });
      }
    }
  }
}

async function checkDataIntegrity(): Promise<void> {
  console.log("\n🔍 Data Integrity Tests");
  console.log("=======================\n");

  try {
    // Check if we have data
    const orgCount = await prisma.organization.count();
    const storeCount = await prisma.store.count();
    const productCount = await prisma.products.count();
    const userCount = await prisma.users.count();
    const orderCount = await prisma.orders.count();

    // Verify minimum data requirements
    const checks = [
      { name: "Organizations", count: orgCount, min: 1 },
      { name: "Stores", count: storeCount, min: 1 },
      { name: "Products", count: productCount, min: 5 },
      { name: "Users", count: userCount, min: 10 },
      { name: "Orders", count: orderCount, min: 100 },
    ];

    for (const check of checks) {
      if (check.count >= check.min) {
        console.log(`✅ ${check.name}: ${check.count} (min: ${check.min})`);
        results.push({
          category: "Data Integrity",
          test: check.name,
          status: "PASS",
          message: `${check.count} records found`,
          details: { count: check.count, minimum: check.min },
        });
      } else {
        console.log(
          `⚠️  ${check.name}: ${check.count} (min: ${check.min}) - Run setup to create test data`
        );
        results.push({
          category: "Data Integrity",
          test: check.name,
          status: "WARN",
          message: `Only ${check.count} records (minimum: ${check.min})`,
          details: { count: check.count, minimum: check.min },
        });
      }
    }

    // Check order-product relationships
    const ordersWithItems = await prisma.orders.findMany({
      include: {
        orderItems: true,
      },
      take: 100,
    });

    const ordersWithoutItems = ordersWithItems.filter(
      o => o.orderItems.length === 0
    );
    if (ordersWithoutItems.length === 0) {
      console.log("✅ All orders have items");
      results.push({
        category: "Data Integrity",
        test: "Order Items",
        status: "PASS",
        message: "All orders have items",
      });
    } else {
      console.log(`⚠️  ${ordersWithoutItems.length} orders without items`);
      results.push({
        category: "Data Integrity",
        test: "Order Items",
        status: "WARN",
        message: `${ordersWithoutItems.length} orders without items`,
        details: { count: ordersWithoutItems.length },
      });
    }
  } catch (error) {
    console.log("❌ Data integrity check failed");
    results.push({
      category: "Data Integrity",
      test: "General",
      status: "FAIL",
      message: "Data integrity check failed",
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

function generateReport(): void {
  console.log("\n📊 Health Check Summary");
  console.log("=======================\n");

  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.status === "PASS").length;
    const failed = categoryResults.filter(r => r.status === "FAIL").length;
    const warned = categoryResults.filter(r => r.status === "WARN").length;

    console.log(`${category}:`);
    console.log(`  ✅ PASS: ${passed}`);
    console.log(`  ❌ FAIL: ${failed}`);
    console.log(`  ⚠️  WARN: ${warned}`);
    console.log(`  Total: ${categoryResults.length}\n`);
  }

  const totalPassed = results.filter(r => r.status === "PASS").length;
  const totalFailed = results.filter(r => r.status === "FAIL").length;
  const totalWarned = results.filter(r => r.status === "WARN").length;
  const totalTests = results.length;

  console.log("Overall:");
  console.log(`  ✅ PASS: ${totalPassed}/${totalTests}`);
  console.log(`  ❌ FAIL: ${totalFailed}/${totalTests}`);
  console.log(`  ⚠️  WARN: ${totalWarned}/${totalTests}`);

  if (totalFailed === 0) {
    console.log("\n🎉 All critical tests passed!");
    if (totalWarned > 0) {
      console.log("⚠️  Some warnings detected - review the report above");
    }
  } else {
    console.log(
      "\n❌ Some critical tests failed - please fix the issues above"
    );
  }

  // Provide recommendations
  if (totalWarned > 0 || totalFailed > 0) {
    console.log("\n💡 Recommendations:");

    const noData = results.filter(
      r =>
        r.category === "Data Integrity" &&
        (r.status === "WARN" || r.status === "FAIL")
    );
    if (noData.length > 0) {
      console.log("  • Run: pnpm setup (to initialize test data)");
    }

    const apiIssues = results.filter(
      r => r.category === "API" && r.message.includes("Server not running")
    );
    if (apiIssues.length > 0) {
      console.log("  • Run: pnpm dev (to start the server)");
    }

    const dbIssues = results.filter(
      r => r.category === "Database" && r.status === "FAIL"
    );
    if (dbIssues.length > 0) {
      console.log("  • Check database connection in .env file");
      console.log("  • Run: pnpm db:push (to sync database schema)");
    }
  }
}

async function main() {
  console.log("🏥 CHUTEA System Health Check");
  console.log("==============================\n");

  try {
    await checkDatabaseConnection();
    await checkAPIEndpoints();
    await checkDataIntegrity();
    generateReport();
  } catch (error) {
    console.error("\n❌ Health check error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the health check
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
